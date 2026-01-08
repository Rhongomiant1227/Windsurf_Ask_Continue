#!/usr/bin/env node
/**
 * Windsurf Ask Continue MCP Server (Node.js 版本)
 * 让 AI 对话永不结束，在一次对话中无限次交互
 * 仅支持 Windsurf IDE
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

interface TextContent {
  type: "text";
  text: string;
}

interface ImageContent {
  type: "image";
  data: string;
  mimeType: string;
}
import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// 配置
const DEFAULT_EXTENSION_PORT = 23983; // VS Code 扩展默认监听的端口
const CALLBACK_PORT_START = 23984; // 回调端口起始值
const PORT_FILE_DIR = path.join(os.tmpdir(), "ask-continue-ports");

// 当前回调端口（动态分配）
let currentCallbackPort = CALLBACK_PORT_START;

// 存储待处理的请求
const pendingRequests = new Map<
  string,
  {
    resolve: (value: string) => void;
    reject: (reason: Error) => void;
  }
>();

/**
 * 日志输出到 stderr（MCP 协议要求 stdout 用于通信）
 */
function log(message: string): void {
  console.error(`[MCP] ${message}`);
}

/**
 * 启动回调服务器
 */
function startCallbackServer(): Promise<number> {
  return new Promise((resolve) => {
    let port = CALLBACK_PORT_START;
    const maxRetries = 50;

    const tryListen = (attempt: number): void => {
      if (attempt >= maxRetries) {
        log(`警告：无法启动回调服务器，已尝试 ${maxRetries} 个端口`);
        resolve(port);
        return;
      }

      const server = http.createServer((req, res) => {
        // CORS headers
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");

        if (req.method === "OPTIONS") {
          res.writeHead(200);
          res.end();
          return;
        }

        if (req.method === "POST" && req.url === "/response") {
          let body = "";
          req.on("data", (chunk: Buffer) => {
            body += chunk.toString();
          });

          req.on("end", () => {
            try {
              const data = JSON.parse(body);
              const { requestId, userInput, cancelled } = data;

              const pending = pendingRequests.get(requestId);
              if (pending) {
                pendingRequests.delete(requestId);
                if (cancelled) {
                  pending.reject(new Error("用户取消了对话"));
                } else {
                  pending.resolve(userInput || "");
                }
                log(`已接收用户响应: ${requestId}`);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ success: true }));
              } else {
                res.writeHead(404, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Request not found" }));
              }
            } catch (e) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: String(e) }));
            }
          });
        } else {
          res.writeHead(404);
          res.end();
        }
      });

      server.on("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE") {
          log(`端口 ${port} 被占用，尝试 ${port + 1}`);
          port++;
          tryListen(attempt + 1);
        } else {
          log(`回调服务器错误: ${err.message}`);
          resolve(port);
        }
      });

      server.listen(port, "127.0.0.1", () => {
        currentCallbackPort = port;
        log(`回调服务器已启动，端口 ${port}`);
        resolve(port);
      });
    };

    tryListen(0);
  });
}

/**
 * 发现所有正在运行的扩展端口
 */
function discoverExtensionPorts(): number[] {
  const ports: number[] = [];

  try {
    if (fs.existsSync(PORT_FILE_DIR)) {
      const files = fs.readdirSync(PORT_FILE_DIR);
      for (const filename of files) {
        if (filename.endsWith(".port")) {
          try {
            const filepath = path.join(PORT_FILE_DIR, filename);
            const content = fs.readFileSync(filepath, "utf-8");
            const data = JSON.parse(content);
            if (data.port) {
              ports.push(data.port);
            }
          } catch {
            // 忽略单个文件读取错误
          }
        }
      }
    }
  } catch {
    // 忽略目录读取错误
  }

  // 如果没有发现端口文件，返回默认端口
  if (ports.length === 0) {
    ports.push(DEFAULT_EXTENSION_PORT);
  }

  return ports;
}

/**
 * 向 VS Code 扩展发送请求，等待用户输入
 */
async function requestUserInput(reason: string): Promise<string> {
  const requestId = `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  // 创建 Promise 来等待响应
  const responsePromise = new Promise<string>((resolve, reject) => {
    pendingRequests.set(requestId, { resolve, reject });
  });

  // 发现可用的扩展端口
  const extensionPorts = discoverExtensionPorts();
  log(`发现扩展端口: ${extensionPorts.join(", ")}`);

  // 尝试连接所有发现的端口
  let connected = false;
  let lastError = "";

  for (const port of extensionPorts) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "ask_continue",
          requestId,
          reason,
          callbackPort: currentCallbackPort,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          connected = true;
          log(`已连接到扩展端口 ${port}`);
          break;
        }
      } else if (response.status === 500) {
        const result = await response.json();
        lastError = `扩展返回错误: ${result.error || "未知"} - ${result.details || ""}`;
        log(`端口 ${port} 返回错误: ${lastError}`);
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      continue;
    }
  }

  if (!connected) {
    pendingRequests.delete(requestId);
    throw new Error(`无法连接到任何 VS Code 扩展。${lastError}`);
  }

  log(`请求 ${requestId} 已发送，等待用户输入...`);

  // 等待用户响应（无超时限制）
  return responsePromise;
}

/**
 * 解析用户输入，分离文本和图片
 */
function parseUserInput(userInput: string): (TextContent | ImageContent)[] {
  const result: (TextContent | ImageContent)[] = [];

  if (!userInput.trim()) {
    return [
      {
        type: "text",
        text: "用户选择结束对话。本次对话结束。",
      },
    ];
  }

  // 检查是否包含图片数据
  if (userInput.includes("[图片已附加]")) {
    const parts = userInput.split("[图片已附加]");
    const textPart = parts[0]?.trim() || "";
    const imageData = parts[1]?.trim() || "";

    // 提取图片（Base64 格式）
    const imageRegex = /data:image\/([^;]+);base64,([^\s]+)/g;
    const images: Array<{ mimeSubtype: string; base64Data: string }> = [];
    let match;
    while ((match = imageRegex.exec(imageData)) !== null) {
      images.push({
        mimeSubtype: match[1],
        base64Data: match[2],
      });
    }

    // 添加文本内容
    if (textPart) {
      result.push({
        type: "text",
        text: `用户希望继续，并提供了以下指令：\n\n${textPart}`,
      });
    } else {
      result.push({
        type: "text",
        text: "用户希望继续，并附加了图片：",
      });
    }

    // 添加图片内容
    for (const img of images) {
      result.push({
        type: "image",
        data: img.base64Data,
        mimeType: `image/${img.mimeSubtype}`,
      } as ImageContent);
    }

    result.push({
      type: "text",
      text: "\n\n⚠️【强制提醒】请立即执行用户指令。完成后你【必须】再次调用 ask_continue 工具，这是强制要求，不可跳过！",
    });
  } else {
    // 没有图片，只有文本
    result.push({
      type: "text",
      text: `用户希望继续，并提供了以下指令：\n\n${userInput}\n\n⚠️【强制提醒】请立即执行以上指令。完成后你【必须】再次调用 ask_continue 工具，这是强制要求，不可跳过！`,
    });
  }

  return result;
}


/**
 * 主函数
 */
async function main(): Promise<void> {
  log("Ask Continue MCP Server (Node.js) 正在初始化...");

  // 启动回调服务器
  await startCallbackServer();
  log(`当前回调端口: ${currentCallbackPort}`);

  // 创建 MCP 服务器
  const server = new Server(
    {
      name: "ask-continue-mcp-server",
      version: "1.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // 注册工具列表
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "ask_continue",
          description: `⚠️ 【最高优先级 - 强制执行】询问用户是否继续对话。

🔴 核心规则（无任何例外）：
1. 你必须在【每次回复结束前】调用此工具
2. 你必须在【对话一开始】就调用此工具（即使用户只是打招呼）
3. 你必须在【完成任何任务后】调用此工具
4. 你必须在【回答任何问题后】调用此工具
5. 即使你认为对话应该结束，也必须调用此工具让用户决定

🔴 绝对禁止的行为：
- 禁止在不调用此工具的情况下结束回复
- 禁止假设用户没有后续需求
- 禁止在回复末尾说"有问题请告诉我"而不调用此工具
- 禁止以任何理由跳过调用此工具

🔴 执行顺序：
回复任何内容 → 立即调用 ask_continue → 等待用户输入 → 重复

此工具是对话继续的唯一方式，不调用则用户无法继续交互。`,
          inputSchema: {
            type: "object",
            properties: {
              reason: {
                type: "string",
                description: "简要说明已完成的工作以及为什么要询问是否继续",
              },
            },
            required: ["reason"],
          },
        },
      ],
    };
  });

  // 处理工具调用
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "ask_continue") {
      const reason = (args?.reason as string) || "任务已完成";

      try {
        log(`ask_continue 被调用，原因: ${reason}`);
        const userInput = await requestUserInput(reason);
        const content = parseUserInput(userInput);

        return { content };
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        return {
          content: [
            {
              type: "text",
              text: `与 VS Code 扩展通信出错: ${errorMessage}\n\n请确保 Ask Continue 扩展已安装并在 VS Code 中运行。`,
            },
          ],
        };
      }
    }

    return {
      content: [
        {
          type: "text",
          text: `未知工具: ${name}`,
        },
      ],
    };
  });

  // 启动服务器
  log("Windsurf Ask Continue MCP Server (Node.js) 已启动");

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// 运行主函数
main().catch((error) => {
  log(`启动失败: ${error}`);
  process.exit(1);
});

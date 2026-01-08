#!/usr/bin/env node
/**
 * MCP 配置安装脚本 (Node.js 版本)
 * 安全合并配置到 mcp_config.json，不会覆盖已有的其他 MCP 配置
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置文件路径
const CONFIG_DIR = path.join(os.homedir(), ".codeium", "windsurf");
const CONFIG_FILE = path.join(CONFIG_DIR, "mcp_config.json");

// 获取 server.js 的绝对路径
const SERVER_PATH = path.join(__dirname, "dist", "server.js");

function main() {
  console.log("[MCP Config] 开始配置 MCP...");

  // 确保配置目录存在
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    console.log(`[MCP Config] 创建目录: ${CONFIG_DIR}`);
  }

  // 读取现有配置（如果存在）
  let config = { mcpServers: {} };
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const content = fs.readFileSync(CONFIG_FILE, "utf-8");
      config = JSON.parse(content);
      if (!config.mcpServers) {
        config.mcpServers = {};
      }
      console.log("[MCP Config] 已读取现有配置");
    } catch (e) {
      console.log("[MCP Config] 现有配置无效，将创建新配置");
      config = { mcpServers: {} };
    }
  }

  // 添加/更新 ask-continue 配置
  config.mcpServers["ask-continue"] = {
    command: "node",
    args: [SERVER_PATH.replace(/\\/g, "/")], // 使用正斜杠
  };

  // 写入配置
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
  console.log(`[MCP Config] 配置已写入: ${CONFIG_FILE}`);
  console.log(`[MCP Config] Server 路径: ${SERVER_PATH}`);
  console.log("[OK] MCP 配置完成");
}

main();

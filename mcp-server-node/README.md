# Ask Continue MCP Server (Node.js 版本)

这是 Python 版本 MCP Server 的 Node.js 移植版本。

## 功能

- 提供 `ask_continue` 工具给 AI 调用
- 支持图片传输（Base64 编码）
- 动态端口发现机制
- 多窗口支持

## 安装

### 方式一：使用安装脚本

在项目根目录运行：

```bash
install-node.bat
```

### 方式二：手动安装

1. 安装依赖：

```bash
cd mcp-server-node
npm install
```

2. 编译 TypeScript：

```bash
npm run build
```

3. 配置 MCP：

```bash
node install_mcp_config.js
```

或手动编辑 `~/.codeium/windsurf/mcp_config.json`：

```json
{
  "mcpServers": {
    "ask-continue": {
      "command": "node",
      "args": ["你的路径/mcp-server-node/dist/server.js"]
    }
  }
}
```

## 开发

```bash
# 开发模式（使用 tsx 直接运行 TypeScript）
npm run dev

# 编译
npm run build

# 运行编译后的版本
npm start
```

## 与 Python 版本的区别

- 使用 Node.js 运行时，无需安装 Python
- 使用 `@modelcontextprotocol/sdk` 官方 SDK
- TypeScript 编写，类型安全

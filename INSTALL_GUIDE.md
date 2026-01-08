# Windsurf Ask Continue 安装指南

本文档详细说明从下载工程到正确安装 `windsurf-ask-continue-1.1.0.vsix` 的完整过程。

---

## 前置要求

- **Windsurf IDE** - 唯一支持的编辑器
- **Node.js 18+** - 用于运行 MCP Server（Node.js 版本）
- 或 **Python 3.10+** - 用于运行 MCP Server（Python 版本）

---

## 方式一：一键安装（推荐）

### Node.js 版本

```bash
# 双击运行
install-node.bat
```

### Python 版本

```bash
# 双击运行
install.bat
```

安装脚本会自动完成以下步骤：
1. 检查运行环境
2. 安装依赖
3. 编译代码（Node.js 版本）
4. 配置 MCP
5. 提示安装 VSIX 扩展
6. 配置全局规则文件

---

## 方式二：手动安装

### 步骤 1：下载工程

```bash
git clone https://github.com/Rhongomiant1227/Windsurf_Ask_Continue.git
cd Windsurf_Ask_Continue
```

### 步骤 2：安装 MCP Server

#### Node.js 版本（推荐）

```bash
cd mcp-server-node
npm install
npm run build
```

#### Python 版本

```bash
cd mcp-server-python
pip install -r requirements.txt
```

### 步骤 3：配置 MCP

#### Node.js 版本

```bash
cd mcp-server-node
node install_mcp_config.js
```

#### Python 版本

```bash
cd mcp-server-python
python install_mcp_config.py
```

或手动编辑配置文件 `C:\Users\你的用户名\.codeium\windsurf\mcp_config.json`：

**Node.js 版本配置：**
```json
{
  "mcpServers": {
    "ask-continue": {
      "command": "node",
      "args": ["你的完整路径/mcp-server-node/dist/server.js"]
    }
  }
}
```

**Python 版本配置：**
```json
{
  "mcpServers": {
    "ask-continue": {
      "command": "python",
      "args": ["你的完整路径/mcp-server-python/server.py"]
    }
  }
}
```

> **注意**：路径使用正斜杠 `/` 或双反斜杠 `\\`

### 步骤 4：安装 Windsurf 扩展

1. 打开 Windsurf IDE
2. 按 `Ctrl+Shift+P` 打开命令面板
3. 输入 `Extensions: Install from VSIX`
4. 选择项目目录下的 `windsurf-ask-continue-1.1.0.vsix` 文件
5. 等待安装完成

### 步骤 5：配置全局规则

复制规则文件到用户目录：

```bash
copy rules\example-windsurfrules.txt %USERPROFILE%\.windsurfrules
```

或手动复制 `rules/example-windsurfrules.txt` 的内容到 `C:\Users\你的用户名\.windsurfrules`

### 步骤 6：重启 Windsurf

**必须重启 Windsurf**，否则配置不会生效。

---

## 验证安装成功

1. 打开 Windsurf
2. 查看右下角状态栏，应该显示 `Ask Continue: 23983`（数字可能不同）
3. 和 AI 对话，让它做一个简单任务
4. 任务完成后应该自动弹出"继续对话？"窗口

---

## 项目结构

```
Windsurf_Ask_Continue/
├── install.bat              # Python 版本一键安装脚本
├── install-node.bat         # Node.js 版本一键安装脚本
├── uninstall.bat            # 卸载脚本
├── mcp-server-python/       # MCP 服务器（Python 版本）
│   ├── server.py
│   ├── requirements.txt
│   └── install_mcp_config.py
├── mcp-server-node/         # MCP 服务器（Node.js 版本）
│   ├── src/server.ts
│   ├── package.json
│   └── install_mcp_config.js
├── vscode-extension/        # Windsurf 扩展源码
├── rules/                   # 规则模板
│   └── example-windsurfrules.txt
└── windsurf-ask-continue-1.1.0.vsix  # 打包好的扩展
```

---

## 常见问题

### Q: 弹窗不出现？

1. 检查状态栏是否显示 `Ask Continue: 23983`
2. 检查 `.windsurfrules` 文件是否存在
3. 重启 Windsurf

### Q: MCP 工具不可用？

1. 检查 `mcp_config.json` 路径是否正确
2. 确认 `server.js` 或 `server.py` 文件存在
3. 重启 Windsurf

### Q: 移动项目文件夹后不工作？

重新运行安装脚本更新 MCP 配置中的路径。

---

## 关键配置文件位置

| 文件 | 路径 |
|------|------|
| MCP 配置 | `C:\Users\你的用户名\.codeium\windsurf\mcp_config.json` |
| 全局规则 | `C:\Users\你的用户名\.windsurfrules` |

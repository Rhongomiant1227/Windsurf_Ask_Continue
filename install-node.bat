@echo off
chcp 65001 >nul
title Ask Continue - 一键安装 (Node.js 版本)

:: 保存用户当前工作目录
set "USER_PROJECT_DIR=%CD%"

echo ============================================
echo    Ask Continue - 继续牛马 MCP 工具
echo    一键安装脚本 (Node.js 版本)
echo ============================================
echo.

:: 检查 Node.js
echo [1/6] 检查 Node.js 环境...
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Node.js，请先安装 Node.js 18+
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js 已安装

:: 安装 Node.js 依赖
echo.
echo [2/6] 安装 MCP Server 依赖...
cd /d "%~dp0mcp-server-node"
call npm install
if errorlevel 1 (
    echo [错误] Node.js 依赖安装失败
    pause
    exit /b 1
)
echo [OK] Node.js 依赖已安装

:: 编译 TypeScript
echo.
echo [3/6] 编译 TypeScript...
call npm run build
if errorlevel 1 (
    echo [错误] TypeScript 编译失败
    pause
    exit /b 1
)
echo [OK] TypeScript 编译完成

:: 配置 MCP
echo.
echo [4/6] 配置 MCP...
node "%~dp0mcp-server-node\install_mcp_config.js"
if errorlevel 1 (
    echo [错误] MCP 配置失败
    pause
    exit /b 1
)

:: 安装 VS Code 扩展
echo.
echo [5/6] 安装 Windsurf 扩展...
set "VSIX_FILE=%~dp0windsurf-ask-continue-1.1.0.vsix"

if not exist "%VSIX_FILE%" (
    echo [警告] VSIX 文件不存在: %VSIX_FILE%
    echo        请确认文件名是否正确
) else (
    echo [提示] 请手动安装扩展:
    echo        1. 按 Ctrl+Shift+P
    echo        2. 输入 Extensions: Install from VSIX
    echo        3. 选择 VSIX 文件
    echo.
    echo 正在打开文件位置...
    explorer /select,"%VSIX_FILE%"
)

:: 复制规则文件到用户全局目录（总是更新）
echo.
echo [6/6] 配置全局规则文件...
set "RULES_SRC=%~dp0rules\example-windsurfrules.txt"
set "RULES_DST=%USERPROFILE%\.windsurfrules"

if not exist "%RULES_SRC%" (
    echo [警告] 规则模板文件不存在: %RULES_SRC%
) else (
    if exist "%RULES_DST%" (
        :: 备份旧文件
        copy "%RULES_DST%" "%RULES_DST%.backup" >nul 2>&1
        echo [备份] 旧规则已备份到: %RULES_DST%.backup
    )
    copy /Y "%RULES_SRC%" "%RULES_DST%" >nul
    echo [OK] 全局规则已更新: %RULES_DST%
)

echo.
echo ============================================
echo    安装完成！(Node.js 版本)
echo ============================================
echo.
echo 下一步:
echo   [1] 重启 Windsurf
echo   [2] 开始对话，AI 完成任务后会自动弹窗
echo.
echo 全局规则: %USERPROFILE%\.windsurfrules
echo MCP 配置: %USERPROFILE%\.codeium\windsurf\mcp_config.json
echo.
pause

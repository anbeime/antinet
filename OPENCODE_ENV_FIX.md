# OpenCode 环境变量问题解决方案

## 问题原因

OpenCode 已成功安装，但因为 Node.js 安装在非标准路径，导致新打开的命令行窗口找不到 `opencode` 命令。

## 解决方案（3种方法）

### 方法1: 使用启动脚本（推荐，最简单）

直接双击运行以下批处理文件：

#### 启动 OpenCode TUI（命令行界面）
```
start_opencode.bat
```

#### 启动 OpenCode Web（浏览器界面）
```
start_opencode_web.bat
```

这些脚本会自动设置环境变量并启动 OpenCode。

---

### 方法2: 永久配置环境变量

1. **运行配置脚本**（以管理员身份）：
   ```powershell
   .\setup_opencode_env.ps1
   ```

2. **关闭所有终端窗口**

3. **重新打开新的 PowerShell/CMD**

4. **验证**：
   ```powershell
   opencode --version
   ```

---

### 方法3: 每次手动设置（临时）

每次打开新的 PowerShell 窗口时运行：

```powershell
$env:PATH = "C:\Users\AI-PC-19\.stepfun\runtimes\node\install_1769405385879_ym8edrbn6xn\node-v22.18.0-win-x64;$env:PATH"
opencode
```

或在 CMD 中：

```cmd
set PATH=C:\Users\AI-PC-19\.stepfun\runtimes\node\install_1769405385879_ym8edrbn6xn\node-v22.18.0-win-x64;%PATH%
opencode
```

---

## 快速开始

### 使用启动脚本（最简单）

1. 双击 `start_opencode.bat` 或 `start_opencode_web.bat`
2. 首次使用输入 `/connect` 配置 AI 模型
3. 开始使用！

### 配置 AI 模型

```
/connect
```

然后选择：
- **智谱 GLM**（推荐，国内访问快）
- **Claude**（需要 API Key）
- **GPT**（需要 API Key）
- **Gemini**（需要 API Key）

### 常用命令

```
/help           - 查看帮助
/models         - 列出可用模型
/agent          - 管理 Agent
/session        - 管理会话
/stats          - 查看统计
```

---

## 文件说明

### 启动脚本
- `start_opencode.bat` - 启动 OpenCode TUI（命令行界面）
- `start_opencode_web.bat` - 启动 OpenCode Web（浏览器界面）

### 配置脚本
- `setup_opencode_env.ps1` - 永久配置环境变量

### 文档
- `opencode_quick_start.md` - 完整使用指南
- `OPENCODE_ENV_FIX.md` - 本文档

---

## 验证安装

运行启动脚本后，应该看到：

```
========================================
  OpenCode 启动脚本
========================================

[INFO] Node.js 路径: C:\Users\AI-PC-19\.stepfun\runtimes\node\...
[INFO] 检查 OpenCode 安装...
[OK] OpenCode 已找到
INFO  2026-01-26T... service=models.dev file={} refreshing
1.1.36

========================================
  启动 OpenCode...
========================================
```

---

## 故障排查

### 问题1: 双击 .bat 文件闪退

**原因**: 脚本执行出错

**解决**:
1. 右键 `.bat` 文件 → 编辑
2. 检查路径是否正确
3. 在 CMD 中手动运行查看错误信息

### 问题2: 提示 "OpenCode 未找到"

**原因**: Node.js 路径不正确

**解决**:
1. 运行 `npm list -g --depth=0` 查看实际安装路径
2. 修改 `.bat` 文件中的 `NODE_PATH` 变量
3. 重新运行

### 问题3: 环境变量配置后仍无效

**原因**: 未重启终端

**解决**:
1. 关闭所有 PowerShell/CMD 窗口
2. 重新打开新窗口
3. 或者直接使用启动脚本

---

## 推荐使用方式

### 日常使用
直接双击 `start_opencode.bat` 或 `start_opencode_web.bat`

### 集成到项目
在项目根目录创建快捷方式指向启动脚本

### IDE 集成
在 VS Code 等 IDE 中配置任务运行启动脚本

---

## 下一步

1. 使用启动脚本打开 OpenCode
2. 配置 AI 模型（`/connect`）
3. 尝试基础功能
4. 探索 Agent 和 MCP 功能

---

**创建时间**: 2026-01-26  
**状态**: 已解决

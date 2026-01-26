# OpenCode 安装完成 - 使用指南

## 安装状态

- **OpenCode**: 1.1.36 ✅
- **Oh-My-OpenCode**: 3.0.1 ✅
- **Node.js**: 22.18.0 ✅
- **安装位置**: `C:\Users\AI-PC-19\.stepfun\runtimes\node\...`

---

## 🚀 如何启动 OpenCode

### 方法1: 使用启动脚本（最简单）⭐

#### 在文件资源管理器中：
1. 打开 `C:\test\antinet` 目录
2. 双击 `start_opencode.bat` 或 `start_opencode_web.bat`

#### 在命令行中：
```cmd
cd C:\test\antinet
start_opencode.bat
```

或启动 Web 界面：
```cmd
start_opencode_web.bat
```

### 方法2: 配置永久环境变量

1. 以管理员身份运行 PowerShell
2. 执行：
   ```powershell
   cd C:\test\antinet
   .\setup_opencode_env.ps1
   ```
3. 关闭所有终端窗口
4. 重新打开新终端
5. 运行 `opencode`

---

## 📁 已创建的文件

### 启动脚本
```
C:\test\antinet\start_opencode.bat          # 启动 TUI 界面
C:\test\antinet\start_opencode_web.bat      # 启动 Web 界面
```

### 配置脚本
```
C:\test\antinet\setup_opencode_env.ps1      # 环境变量配置
```

### 文档
```
C:\test\antinet\OPENCODE_ENV_FIX.md         # 环境变量问题解决方案
C:\test\opencode_quick_start.md             # 完整使用指南
```

---

## 🎯 首次使用步骤

### 1. 启动 OpenCode
双击 `start_opencode.bat`

### 2. 配置 AI 模型
在 OpenCode 中输入：
```
/connect
```

### 3. 选择 AI 提供商
推荐选项：
- **智谱 GLM-4** (国内访问快，性价比高)
  - 官网: https://bigmodel.cn
  - Coding Plan: 200元/年
  
- **Claude** (强大但需要国外 API)
- **GPT** (OpenAI)
- **Gemini** (Google)

### 4. 输入 API Key
根据提示输入你的 API Key

### 5. 开始使用
直接输入问题或任务，例如：
```
帮我分析这个项目的架构
```

---

##  常用命令

### 基础命令
```
/help           查看帮助
/models         列出可用模型
/stats          查看使用统计
/session        管理会话
```

### Agent 相关
```
/agent          管理 Agent
/agent list     列出所有 Agent
```

### MCP 相关
```
/mcp            管理 MCP 服务器
/mcp list       列出 MCP 服务器
```

---

## 🔧 使用场景示例

### 1. 代码开发
```
帮我创建一个 React 组件，实现数据表格展示功能
```

### 2. 代码审查
```
审查 src/components/DataTable.tsx 的代码质量
```

### 3. Bug 修复
```
这段代码报错了，帮我找出问题并修复
```

### 4. 文档生成
```
为这个函数生成 JSDoc 注释
```

### 5. 项目分析
```
分析 C:\test\antinet 项目的完成度
```

---

##  常见问题

### Q1: 双击 .bat 文件后窗口闪退？
**A**: 右键 → 编辑，检查路径是否正确

### Q2: 提示 "OpenCode 未找到"？
**A**: 使用启动脚本，或运行 `setup_opencode_env.ps1`

### Q3: 如何切换 AI 模型？
**A**: 在 OpenCode 中输入 `/connect` 重新配置

### Q4: 如何查看历史会话？
**A**: 输入 `/session list`

### Q5: 如何导出对话记录？
**A**: 输入 `/export <session-id>`

---

## 📚 推荐资源

### 官方文档
- OpenCode 官网: https://opencode.ai
- GitHub: https://github.com/anomalyco/opencode
- Oh-My-OpenCode: https://github.com/code-yeongyu/oh-my-opencode

### AI 模型提供商
- 智谱 GLM: https://bigmodel.cn
- OpenAI: https://platform.openai.com
- Anthropic: https://www.anthropic.com
- Google AI: https://ai.google.dev

### 社区
- Discord: OpenCode 官方社区
- GitHub Discussions: 问题讨论

---

## 🎉 下一步

1. 双击 `start_opencode.bat` 启动
2. 输入 `/connect` 配置 AI 模型
3. 尝试问一个问题
4. 探索 Agent 和 MCP 功能
5. 将 OpenCode 集成到日常开发流程

---

## 📞 获取帮助

### 遇到问题？
1. 查看 `OPENCODE_ENV_FIX.md` 故障排查部分
2. 查看 `opencode_quick_start.md` 完整指南
3. 在 OpenCode 中输入 `/help`
4. 访问官方文档和社区

---

**安装时间**: 2026-01-26  
**版本**: OpenCode 1.1.36 + Oh-My-OpenCode 3.0.1  
**状态**: 完全可用  
**推荐使用**: 双击 `start_opencode.bat` 启动

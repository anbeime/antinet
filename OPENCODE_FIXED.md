# OpenCode 快速启动指南

## 问题已解决

之前的批处理文件出现了**编码问题**和**无限循环**，现已修复。

---

## 🚀 现在如何启动 OpenCode

### 最简单的方法（推荐）⭐

1. 打开文件资源管理器
2. 进入 `C:\test\antinet`
3. 双击以下文件之一：

```
opencode.bat          # 命令行界面
opencode_web.bat      # 浏览器界面
```

---

## 📁 可用的启动文件

| 文件名 | 用途 | 推荐度 |
|--------|------|--------|
| **opencode.bat** | 启动命令行版本 | ⭐⭐⭐⭐⭐ |
| **opencode_web.bat** | 启动浏览器版本 | ⭐⭐⭐⭐⭐ |
| start_opencode.bat | 带检查的启动 | ⭐⭐⭐ |
| start_opencode_web.bat | 带检查的 Web 启动 | ⭐⭐⭐ |

---

##  推荐使用

### 命令行版本
```
双击: opencode.bat
```
- 最简单
- 无编码问题
- 直接启动

### 浏览器版本
```
双击: opencode_web.bat
```
- 图形界面
- 更友好
- 自动打开浏览器

---

## 🎯 首次使用

### 1. 启动
```
双击 opencode.bat
```

### 2. 配置 AI 模型
```
/connect
```

### 3. 选择提供商
- 智谱 GLM（推荐，免费）
- Claude
- GPT
- Gemini

### 4. 输入 API Key

### 5. 开始使用
```
帮我分析这个项目
```

---

##  之前的问题说明

### 问题现象
```
'b' 不是内部或外部命令
'嶄緷璧?PATH' 不是内部或外部命令
无限循环
```

### 问题原因
- 批处理文件编码错误（UTF-8 → 乱码）
- 中文字符显示异常
- 可能的文件损坏

### 解决方案
- 删除旧文件
- 使用 ASCII 编码重建
- 创建简化版本（无中文）
- 使用完整路径（避免 PATH 问题）

---

## 🔧 技术细节

### 新的批处理文件内容

#### opencode.bat
```batch
@echo off
echo Starting OpenCode...
echo.
"C:\Users\AI-PC-19\.stepfun\runtimes\node\...\opencode.cmd"
```

#### opencode_web.bat
```batch
@echo off
echo Starting OpenCode Web...
echo.
"C:\Users\AI-PC-19\.stepfun\runtimes\node\...\opencode.cmd" web
```

### 特点
- ASCII 编码（无乱码）
- 完整路径（无需 PATH）
- 简洁明了
- 不会无限循环

---

##  验证安装

### 测试命令
```cmd
"C:\Users\AI-PC-19\.stepfun\runtimes\node\install_1769405385879_ym8edrbn6xn\node-v22.18.0-win-x64\opencode.cmd" --version
```

### 预期输出
```
INFO  2026-01-26T... service=models.dev file={} refreshing
1.1.36
```

---

## 🎉 立即开始

### 步骤1: 打开文件夹
```
C:\test\antinet
```

### 步骤2: 双击启动
```
opencode.bat
```

### 步骤3: 配置模型
```
/connect
```

### 步骤4: 开始使用
```
你好，OpenCode！
```

---

## 📚 相关文档

- `OPENCODE_LAUNCHER_GUIDE.md` - 详细启动指南
- `OPENCODE_DEV_VS_GLOBAL.md` - 开发模式 vs 全局安装
- `opencode_quick_start.md` - 完整使用指南
- `OPENCODE_README.md` - 总体说明

---

**问题**: 已解决  
**状态**: 可以使用  
**推荐**: 双击 `opencode.bat` 启动

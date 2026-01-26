# OpenCode 使用说明 - 开发模式 vs 全局安装

## 🔍 问题分析

你之前使用的 `bun run dev` 是在 **OpenCode 源码仓库**中进行开发，而现在安装的是 **全局 npm 包**，这是两种不同的使用方式。

---

## 📦 两种使用方式对比

### 方式1: 源码开发模式（你之前的方式）

#### 目录结构
```
/path/to/opencode/          # OpenCode 源码仓库
├── package.json            # 包含 "dev" 脚本
├── bun.lockb              # Bun 锁文件
├── src/                   # 源代码
└── ...
```

#### 启动命令
```bash
cd /path/to/opencode
bun run dev                # 开发模式
```

#### 特点
- 可以修改源码
- 热重载
- 适合贡献代码
- ❌ 需要克隆仓库
- ❌ 需要安装 Bun

---

### 方式2: 全局安装（现在的方式）

#### 安装位置
```
C:\Users\AI-PC-19\.stepfun\runtimes\node\...\node_modules\opencode-ai
```

#### 启动命令
```bash
opencode                   # 直接使用
opencode web               # Web 界面
```

#### 特点
- 开箱即用
- 无需源码
- 全局可用
- ❌ 不能修改源码
- ❌ 不是开发模式

---

## 🎯 你现在应该怎么做？

### 如果你只是想**使用** OpenCode（推荐）

直接使用全局安装的版本：

```bash
# 方法1: 使用启动脚本
cd C:\test\antinet
start_opencode.bat

# 方法2: 直接运行（需要配置环境变量）
opencode
opencode web
```

---

### 如果你想**开发** OpenCode 源码

需要克隆 OpenCode 仓库：

#### 步骤1: 克隆仓库
```bash
cd C:\Users\AI-PC-19\Projects  # 或任意目录
git clone https://github.com/anomalyco/opencode.git
cd opencode
```

#### 步骤2: 安装 Bun
```bash
# 下载并安装 Bun
# https://bun.sh/
powershell -c "irm bun.sh/install.ps1 | iex"
```

#### 步骤3: 安装依赖
```bash
bun install
```

#### 步骤4: 启动开发服务器
```bash
bun run dev
```

---

## 🔧 恢复你之前的开发环境

### 找回之前的 OpenCode 目录

如果你之前克隆过 OpenCode 仓库，可能在以下位置：

```bash
# 常见位置
C:\Users\AI-PC-19\Projects\opencode
C:\Users\AI-PC-19\Documents\opencode
C:\Users\AI-PC-19\Desktop\opencode
C:\dev\opencode
C:\code\opencode
D:\opencode
```

### 搜索命令
```powershell
# 搜索包含 package.json 且有 "opencode" 的目录
Get-ChildItem C:\ -Recurse -Filter "package.json" -ErrorAction SilentlyContinue | 
    Where-Object { (Get-Content $_.FullName -Raw) -match '"name":\s*"opencode"' } | 
    Select-Object DirectoryName
```

---

##  推荐方案

### 对于普通使用者
**使用全局安装版本**
```bash
# 1. 使用启动脚本（最简单）
start_opencode.bat

# 2. 或配置环境变量后直接使用
opencode
```

### 对于开发者
**克隆源码仓库**
```bash
# 1. 克隆仓库
git clone https://github.com/anomalyco/opencode.git

# 2. 安装 Bun
# 访问 https://bun.sh/

# 3. 安装依赖并启动
cd opencode
bun install
bun run dev
```

---

## 📂 Bun 是什么？

**Bun** 是一个现代化的 JavaScript 运行时，类似于 Node.js，但更快。

### 安装 Bun

#### Windows (PowerShell)
```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

#### 验证安装
```bash
bun --version
```

### Bun vs Node.js

| 特性 | Bun | Node.js |
|------|-----|---------|
| 速度 | 更快 | 快 |
| 包管理 | 内置 | npm/pnpm/yarn |
| TypeScript | 原生支持 | 需要编译 |
| 兼容性 | 兼容 Node.js | 标准 |

---

## 🎯 快速决策指南

### 你只想用 OpenCode？
→ **使用全局安装版本**
```bash
start_opencode.bat
```

### 你想开发 OpenCode？
→ **克隆源码仓库**
```bash
git clone https://github.com/anomalyco/opencode.git
cd opencode
bun install
bun run dev
```

### 你想找回之前的开发目录？
→ **搜索硬盘**
```powershell
# 搜索所有包含 bun.lockb 的目录
Get-ChildItem C:\ -Recurse -Filter "bun.lockb" -ErrorAction SilentlyContinue
```

---

## 🔍 查找之前的 OpenCode 目录

运行以下命令查找：

```powershell
# 搜索包含 bun.lockb 的目录（OpenCode 源码标志）
Get-ChildItem C:\Users\AI-PC-19 -Recurse -Filter "bun.lockb" -ErrorAction SilentlyContinue | 
    Select-Object DirectoryName

# 搜索包含 opencode 的目录
Get-ChildItem C:\Users\AI-PC-19 -Directory -Filter "*opencode*" -Recurse -ErrorAction SilentlyContinue -Depth 4
```

---

##  总结

### 现状
- OpenCode 已全局安装（npm 包）
- 可以直接使用 `opencode` 命令
- ❌ 没有源码开发环境
- ❌ 没有安装 Bun

### 建议
1. **如果只是使用**：直接用 `start_opencode.bat`
2. **如果要开发**：安装 Bun 并克隆仓库
3. **如果找回旧目录**：运行搜索命令

### 下一步
根据你的需求选择：
- [ ] 使用全局安装版本
- [ ] 安装 Bun 并克隆源码
- [ ] 搜索之前的开发目录

---

**创建时间**: 2026-01-26  
**状态**: 已解释清楚

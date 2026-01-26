# OpenCode 正确配置方法

##  之前的问题

OpenCode 不支持我们创建的自定义 `config.json` 格式。

错误信息：
```
Error: Configuration is invalid
Unrecognized keys: "models", "preferences"
```

---

## 正确的配置方法

### 方法1: 使用预配置启动脚本（最简单）⭐

#### 步骤1: 双击启动
```
双击: C:\test\antinet\opencode_glm.bat
```

这个脚本会：
- 自动设置 API Key 环境变量
- 自动设置默认模型
- 启动 OpenCode

#### 步骤2: 首次使用配置
OpenCode 启动后，输入：
```
/connect
```

选择 `Zhipu`，然后粘贴 API Key：
```
d68afc047d2b47179fccca96e52ca57c.XDODZVHpC70KMfos
```

#### 步骤3: 选择模型
```
/model zhipu/glm-4.7-flash
```

完成！之后 OpenCode 会记住你的配置。

---

### 方法2: 使用环境变量（推荐）⭐⭐

#### 步骤1: 运行配置脚本
```powershell
.\setup_opencode_glm.ps1
```

这会永久设置环境变量 `ZHIPU_API_KEY`

#### 步骤2: 重启终端
关闭当前终端，打开新的终端

#### 步骤3: 启动 OpenCode
```cmd
opencode.bat
```

#### 步骤4: 首次配置
输入 `/connect`，选择 Zhipu，OpenCode 会自动读取环境变量中的 API Key

---

### 方法3: 手动配置（传统方式）

#### 步骤1: 启动 OpenCode
```cmd
opencode.bat
```

#### 步骤2: 输入配置命令
```
/connect
```

#### 步骤3: 选择提供商
选择 `Zhipu`

#### 步骤4: 输入 API Key
```
d68afc047d2b47179fccca96e52ca57c.XDODZVHpC70KMfos
```

#### 步骤5: 选择模型
```
/model zhipu/glm-4.7-flash
```

完成！OpenCode 会保存你的配置。

---

## 📁 已创建的文件

### 1. 预配置启动脚本
```
C:\test\antinet\opencode_glm.bat
```
- 自动设置环境变量
- 自动设置默认模型
- 一键启动

### 2. 环境变量配置脚本
```
C:\test\antinet\setup_opencode_glm.ps1
```
- 永久设置 ZHIPU_API_KEY
- 重启终端后生效

### 3. 普通启动脚本
```
C:\test\antinet\opencode.bat
```
- 简单启动
-  需要手动配置

---

## 🎯 推荐使用方式

### 日常使用
```
双击: opencode_glm.bat
```

### 首次配置后
OpenCode 会记住你的配置，之后可以直接使用：
```
opencode.bat
```

---

## 🔧 OpenCode 配置存储位置

OpenCode 会将配置保存在：
```
C:\Users\AI-PC-19\.local\state\opencode\
```

或者：
```
C:\Users\AI-PC-19\.cache\opencode\
```

不需要手动编辑这些文件，使用 `/connect` 命令配置即可。

---

##  OpenCode 命令

### 配置相关
```
/connect              # 配置 AI 提供商
/model <name>         # 切换模型
/models               # 列出可用模型
```

### 会话相关
```
/help                 # 查看帮助
/session              # 管理会话
/stats                # 查看统计
```

### Agent 相关
```
/agent                # 管理 Agent
/mcp                  # 管理 MCP 服务器
```

---

## 🚀 快速开始

### 方法A: 使用预配置脚本（最快）

1. 双击 `opencode_glm.bat`
2. 输入 `/connect`
3. 选择 Zhipu
4. 粘贴 API Key（会自动填充）
5. 开始使用

### 方法B: 设置环境变量（一次配置）

1. 运行 `setup_opencode_glm.ps1`
2. 重启终端
3. 启动 `opencode.bat`
4. 输入 `/connect`，选择 Zhipu
5. 完成，之后无需再配置

---

## 📊 配置对比

| 方法 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **预配置脚本** | 最简单，一键启动 | 每次都设置环境变量 | ⭐⭐⭐⭐⭐ |
| **环境变量** | 一次配置，永久有效 | 需要重启终端 | ⭐⭐⭐⭐ |
| **手动配置** | 灵活 | 需要记住 API Key | ⭐⭐⭐ |

---

##  注意事项

### 1. 不要手动编辑 OpenCode 配置文件
OpenCode 有自己的配置格式，使用 `/connect` 命令配置即可。

### 2. API Key 安全
- 环境变量方式更安全
- 不会暴露在配置文件中
-  不要分享你的 API Key

### 3. 首次配置
第一次使用时需要运行 `/connect` 配置，之后 OpenCode 会记住。

---

## 🎉 立即开始

### 推荐流程

1. **双击启动**
   ```
   opencode_glm.bat
   ```

2. **首次配置**
   ```
   /connect
   ```
   选择 Zhipu，粘贴 API Key

3. **选择模型**
   ```
   /model zhipu/glm-4.7-flash
   ```

4. **开始使用**
   ```
   你好，请介绍一下你自己
   ```

完成！之后每次启动都会自动使用 GLM-4.7-Flash。

---

##  API Key

```
d68afc047d2b47179fccca96e52ca57c.XDODZVHpC70KMfos
```

---

**更新时间**: 2026-01-26  
**状态**: 已修复配置问题  
**推荐**: 使用 `opencode_glm.bat` 启动

# GLM-4.7-Flash 配置指南

## 📋 配置步骤

### 第1步: 获取 API Key

1. 访问智谱官网: https://open.bigmodel.cn
2. 注册并登录
3. 进入控制台
4. 创建 API Key
5. 复制 API Key

### 第2步: 配置 OpenCode

#### 方法1: 手动编辑配置文件（推荐）

1. 打开配置文件:
```
C:\Users\AI-PC-19\.config\opencode\config.json
```

2. 找到 `"apiKey": "YOUR_API_KEY_HERE"`

3. 替换为你的 API Key:
```json
"apiKey": "your-actual-api-key-here"
```

4. 保存文件

#### 方法2: 使用命令行配置

```powershell
# 设置环境变量
$env:ZHIPU_API_KEY = "your-api-key-here"

# 或永久设置
[Environment]::SetEnvironmentVariable("ZHIPU_API_KEY", "your-api-key-here", "User")
```

### 第3步: 启动 OpenCode

```cmd
cd C:\test\antinet
opencode.bat
```

现在 OpenCode 会自动使用 GLM-4.7-Flash 模型，无需每次配置！

---

## 🎯 配置文件说明

### 配置文件位置
```
C:\Users\AI-PC-19\.config\opencode\config.json
```

### 配置内容
```json
{
  "models": {
    "default": "zhipu/glm-4.7-flash",
    "providers": {
      "zhipu": {
        "apiKey": "YOUR_API_KEY_HERE",  // 替换为你的 API Key
        "baseURL": "https://open.bigmodel.cn/api/paas/v4",
        "models": {
          "glm-4.7-flash": {
            "id": "glm-4.7-flash",
            "name": "GLM-4.7-Flash",
            "description": "智谱 GLM-4.7-Flash - 免费高性能模型",
            "contextWindow": 128000,
            "maxTokens": 65536,
            "temperature": 0.7,
            "thinking": true  // 启用深度思考模式
          }
        }
      }
    }
  },
  "preferences": {
    "autoConnect": true,        // 自动连接
    "defaultProvider": "zhipu",  // 默认提供商
    "defaultModel": "glm-4.7-flash"  // 默认模型
  }
}
```

---

## 🔧 配置选项说明

### 模型参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `contextWindow` | 上下文窗口大小 | 128000 |
| `maxTokens` | 最大输出 tokens | 65536 |
| `temperature` | 温度参数（0-1） | 0.7 |
| `thinking` | 深度思考模式 | true |

### 偏好设置

| 参数 | 说明 | 推荐值 |
|------|------|--------|
| `autoConnect` | 自动连接 | true |
| `defaultProvider` | 默认提供商 | "zhipu" |
| `defaultModel` | 默认模型 | "glm-4.7-flash" |

---

## 🚀 使用方式

### 启动后自动使用 GLM-4.7-Flash

```cmd
# 启动 OpenCode
opencode.bat

# 直接开始使用，无需配置
你好，请帮我分析这个项目
```

### 临时切换模型

```
/model zhipu/glm-4.7-flash
```

### 查看当前模型

```
/model
```

---

##  高级功能

### 启用深度思考模式

配置文件中已默认启用 `"thinking": true`

这会让模型在回答复杂问题时进行更深入的思考。

### 调整温度参数

```json
"temperature": 0.7  // 0.0 = 更确定, 1.0 = 更随机
```

- **0.0-0.3**: 适合代码生成、数据分析
- **0.5-0.7**: 适合一般对话
- **0.8-1.0**: 适合创意写作

### 调整最大 tokens

```json
"maxTokens": 65536  // 最大输出长度
```

根据需要调整：
- **512-2048**: 短回答
- **4096-8192**: 中等长度
- **16384-65536**: 长文档

---

## 🔍 验证配置

### 检查配置文件

```powershell
Get-Content "C:\Users\AI-PC-19\.config\opencode\config.json"
```

### 测试连接

```cmd
# 启动 OpenCode
opencode.bat

# 输入测试问题
你好，请介绍一下你自己
```

如果正常回复，说明配置成功！

---

##  故障排查

### 问题1: 提示 API Key 无效

**原因**: API Key 未正确配置

**解决**:
1. 检查配置文件中的 API Key 是否正确
2. 确保没有多余的空格或引号
3. 重新从智谱官网复制 API Key

### 问题2: 提示找不到模型

**原因**: 模型配置不正确

**解决**:
1. 检查配置文件格式是否正确（JSON 格式）
2. 确保模型 ID 为 `"glm-4.7-flash"`
3. 重新下载配置文件模板

### 问题3: 每次启动仍要求配置

**原因**: `autoConnect` 未设置为 true

**解决**:
```json
"preferences": {
  "autoConnect": true
}
```

---

##  快速配置脚本

创建一个 PowerShell 脚本自动配置：

```powershell
# 设置 API Key
$apiKey = Read-Host "请输入你的智谱 API Key"

# 读取配置文件
$configPath = "$env:USERPROFILE\.config\opencode\config.json"
$config = Get-Content $configPath | ConvertFrom-Json

# 更新 API Key
$config.models.providers.zhipu.apiKey = $apiKey

# 保存配置
$config | ConvertTo-Json -Depth 10 | Set-Content $configPath

Write-Host "✓ 配置完成！" -ForegroundColor Green
Write-Host "现在可以启动 OpenCode 了" -ForegroundColor Green
```

保存为 `setup_glm.ps1`，然后运行：
```powershell
.\setup_glm.ps1
```

---

## 🎉 完成！

配置完成后：

1. 启动 OpenCode 自动使用 GLM-4.7-Flash
2. 无需每次配置
3. 享受免费高性能 AI 模型
4. 支持深度思考模式

---

## 📚 相关资源

- **智谱官网**: https://open.bigmodel.cn
- **API 文档**: https://open.bigmodel.cn/dev/api
- **GLM-4.7-Flash 文档**: https://docs.bigmodel.cn/cn/guide/models/free/glm-4.7-flash
- **OpenCode 文档**: https://opencode.ai/docs

---

**创建时间**: 2026-01-26  
**模型**: GLM-4.7-Flash  
**状态**: 已配置

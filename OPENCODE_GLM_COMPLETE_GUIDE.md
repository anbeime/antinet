# OpenCode + GLM-4.7-Flash 完整配置方案

## 已完成的工作

### 1. 创建配置文件
```
C:\Users\AI-PC-19\.config\opencode\config.json
```
- 预配置 GLM-4.7-Flash 模型
- 启用自动连接
- 启用深度思考模式
- 设置合理的默认参数

### 2. 创建配置脚本
```
C:\test\antinet\setup_glm_flash.ps1
```
- 一键配置 API Key
- 自动保存配置
- 友好的交互界面

### 3. 创建启动脚本
```
C:\test\antinet\opencode.bat
C:\test\antinet\opencode_web.bat
```
- 简化启动流程
- 无编码问题
- 直接可用

### 4. 创建文档
```
C:\test\antinet\GLM_FLASH_CONFIG_GUIDE.md     # 详细配置指南
C:\test\antinet\GLM_FLASH_QUICK_SETUP.md      # 快速设置指南
C:\test\antinet\GLM_FLASH_INTEGRATION.md      # 集成方案
```

---

## 🚀 使用流程

### 方式1: 一键配置（推荐）⭐

#### 步骤1: 获取 API Key
访问 https://open.bigmodel.cn 获取 API Key

#### 步骤2: 运行配置脚本
```powershell
cd C:\test\antinet
.\setup_glm_flash.ps1
```

#### 步骤3: 输入 API Key
按提示粘贴你的 API Key

#### 步骤4: 启动 OpenCode
```cmd
opencode.bat
```

完成！现在可以直接使用，无需每次配置。

---

### 方式2: 手动配置

#### 步骤1: 编辑配置文件
打开 `C:\Users\AI-PC-19\.config\opencode\config.json`

#### 步骤2: 替换 API Key
找到 `"apiKey": "YOUR_API_KEY_HERE"`  
替换为你的实际 API Key

#### 步骤3: 保存并启动
保存文件，然后运行 `opencode.bat`

---

## 📊 GLM-4.7-Flash 特性

### 模型参数
- **架构**: 30B-A3B MoE
- **性能**: 20-30B 参数范围最强
- **速度**: 27 tokens/s
- **价格**: 完全免费
- **并发**: 普通用户并发量为1

### 配置参数
```json
{
  "contextWindow": 128000,    // 上下文窗口
  "maxTokens": 65536,         // 最大输出
  "temperature": 0.7,         // 温度参数
  "thinking": true            // 深度思考模式
}
```

### 优势
- **完全免费** - 无需付费
- **高性能** - 27 tokens/s
- **大上下文** - 128K tokens
- **深度思考** - 支持复杂推理
- **易集成** - 兼容 OpenAI API

---

## 🎯 配置效果

### 配置前
```
启动 OpenCode
↓
提示配置 AI 模型
↓
输入 /connect
↓
选择提供商
↓
输入 API Key
↓
开始使用
```

### 配置后
```
启动 OpenCode
↓
直接开始使用 ✅
```

---

## 📁 文件结构

```
C:\test\antinet\
├── opencode.bat                    # 启动脚本（命令行）
├── opencode_web.bat                # 启动脚本（Web）
├── setup_glm_flash.ps1             # 配置脚本
├── GLM_FLASH_CONFIG_GUIDE.md       # 详细配置指南
├── GLM_FLASH_QUICK_SETUP.md        # 快速设置指南
└── GLM_FLASH_INTEGRATION.md        # 集成方案

C:\Users\AI-PC-19\.config\opencode\
└── config.json                     # OpenCode 配置文件
```

---

## 🔧 配置文件详解

### 位置
```
C:\Users\AI-PC-19\.config\opencode\config.json
```

### 内容结构
```json
{
  "models": {
    "default": "zhipu/glm-4.7-flash",  // 默认模型
    "providers": {
      "zhipu": {
        "apiKey": "YOUR_API_KEY_HERE",  // 你的 API Key
        "baseURL": "https://open.bigmodel.cn/api/paas/v4",
        "models": {
          "glm-4.7-flash": {
            // 模型配置
          }
        }
      }
    }
  },
  "preferences": {
    "autoConnect": true,                // 自动连接
    "defaultProvider": "zhipu",         // 默认提供商
    "defaultModel": "glm-4.7-flash"     // 默认模型
  }
}
```

### 关键配置项

| 配置项 | 说明 | 推荐值 |
|--------|------|--------|
| `autoConnect` | 自动连接 | `true` |
| `defaultProvider` | 默认提供商 | `"zhipu"` |
| `defaultModel` | 默认模型 | `"glm-4.7-flash"` |
| `thinking` | 深度思考模式 | `true` |
| `temperature` | 温度参数 | `0.7` |
| `maxTokens` | 最大输出 | `65536` |

---

##  使用技巧

### 1. 深度思考模式
配置文件中已启用 `"thinking": true`，适合：
- 🧠 复杂数据分析
- 🔍 风险识别
-  策略建议
- 📊 趋势预测

### 2. 调整温度参数
根据任务类型调整 `temperature`:
- **0.0-0.3**: 代码生成、数据分析（更确定）
- **0.5-0.7**: 一般对话（平衡）
- **0.8-1.0**: 创意写作（更随机）

### 3. 控制输出长度
调整 `maxTokens`:
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

### 预期结果
- 无需配置直接回复
- 回复速度快（27 tokens/s）
- 回复质量高

---

##  常见问题

### Q1: 如何获取 API Key？
**A**: 访问 https://open.bigmodel.cn，注册并创建 API Key

### Q2: 配置后仍要求输入 API Key？
**A**: 检查配置文件中的 `autoConnect` 是否为 `true`

### Q3: 提示 API Key 无效？
**A**: 
1. 确认 API Key 是否正确
2. 检查是否有多余的空格
3. 重新从智谱官网复制

### Q4: 如何切换到其他模型？
**A**: 在 OpenCode 中输入 `/model <model-name>`

### Q5: 如何修改配置？
**A**: 
1. 编辑 `config.json` 文件
2. 或重新运行 `setup_glm_flash.ps1`

---

## 📚 相关资源

### 官方文档
- **智谱官网**: https://open.bigmodel.cn
- **API 文档**: https://open.bigmodel.cn/dev/api
- **GLM-4.7-Flash**: https://docs.bigmodel.cn/cn/guide/models/free/glm-4.7-flash
- **OpenCode**: https://opencode.ai/docs

### 本地文档
- `GLM_FLASH_CONFIG_GUIDE.md` - 详细配置指南
- `GLM_FLASH_QUICK_SETUP.md` - 快速设置指南
- `GLM_FLASH_INTEGRATION.md` - 集成方案（Antinet 项目）
- `OPENCODE_LAUNCHER_GUIDE.md` - 启动文件使用说明

---

## 🎉 完成检查清单

- [ ] 获取智谱 API Key
- [ ] 运行 `setup_glm_flash.ps1` 配置
- [ ] 或手动编辑 `config.json`
- [ ] 启动 `opencode.bat` 测试
- [ ] 验证自动连接功能
- [ ] 开始使用 GLM-4.7-Flash

---

## 🚀 下一步

1. **获取 API Key**: 访问 https://open.bigmodel.cn
2. **运行配置脚本**: `.\setup_glm_flash.ps1`
3. **启动 OpenCode**: `opencode.bat`
4. **开始使用**: 直接输入问题，无需配置！

---

**创建时间**: 2026-01-26  
**模型**: GLM-4.7-Flash  
**状态**: 完全配置  
**效果**: 启动即用，无需每次配置

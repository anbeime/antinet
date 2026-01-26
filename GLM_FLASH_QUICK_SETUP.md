# GLM-4.7-Flash 快速设置

## 🚀 一键配置（最简单）

### 步骤1: 获取 API Key
1. 访问: https://open.bigmodel.cn
2. 注册并登录
3. 创建 API Key
4. 复制 API Key

### 步骤2: 运行配置脚本
```powershell
.\setup_glm_flash.ps1
```

### 步骤3: 输入 API Key
按提示粘贴你的 API Key

### 步骤4: 启动 OpenCode
```cmd
opencode.bat
```

完成！现在 OpenCode 会自动使用 GLM-4.7-Flash，无需每次配置。

---

##  手动配置

如果脚本不工作，可以手动配置：

### 1. 打开配置文件
```
C:\Users\AI-PC-19\.config\opencode\config.json
```

### 2. 找到这一行
```json
"apiKey": "YOUR_API_KEY_HERE"
```

### 3. 替换为你的 API Key
```json
"apiKey": "your-actual-api-key-here"
```

### 4. 保存文件

### 5. 启动 OpenCode
```cmd
opencode.bat
```

---

## 验证配置

启动 OpenCode 后，输入:
```
你好，请介绍一下你自己
```

如果正常回复，说明配置成功！

---

## 🎯 配置效果

配置完成后：
- 启动 OpenCode 自动使用 GLM-4.7-Flash
- 无需每次输入 `/connect`
- 免费使用（普通用户并发量为1）
- 高性能（27 tokens/s）
- 支持深度思考模式

---

## 📁 相关文件

### 配置文件
```
C:\Users\AI-PC-19\.config\opencode\config.json
```

### 配置脚本
```
C:\test\antinet\setup_glm_flash.ps1
```

### 启动脚本
```
C:\test\antinet\opencode.bat
```

### 详细文档
```
C:\test\antinet\GLM_FLASH_CONFIG_GUIDE.md
```

---

## 🔧 故障排查

### 问题: 脚本无法运行

**解决**: 以管理员身份运行 PowerShell
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\setup_glm_flash.ps1
```

### 问题: 配置后仍要求输入 API Key

**解决**: 检查配置文件是否正确保存
```powershell
Get-Content "C:\Users\AI-PC-19\.config\opencode\config.json"
```

### 问题: 提示 API Key 无效

**解决**: 
1. 确认 API Key 是否正确
2. 检查是否有多余的空格
3. 重新从智谱官网复制

---

**创建时间**: 2026-01-26  
**状态**: 已配置  
**推荐**: 运行 `setup_glm_flash.ps1` 一键配置

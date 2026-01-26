# GLM-4.7-Flash 自动配置脚本

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GLM-4.7-Flash 配置工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 配置文件路径
$configPath = "$env:USERPROFILE\.config\opencode\config.json"

Write-Host "[1/3] 检查配置目录..." -ForegroundColor Yellow
$configDir = Split-Path $configPath
if (-not (Test-Path $configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
    Write-Host "  ✓ 已创建配置目录" -ForegroundColor Green
} else {
    Write-Host "  ✓ 配置目录已存在" -ForegroundColor Green
}

Write-Host ""
Write-Host "[2/3] 输入 API Key..." -ForegroundColor Yellow
Write-Host "  请访问 https://open.bigmodel.cn 获取 API Key" -ForegroundColor White
Write-Host ""
$apiKey = Read-Host "  请输入你的智谱 API Key"

if ([string]::IsNullOrWhiteSpace($apiKey)) {
    Write-Host ""
    Write-Host "  ✗ API Key 不能为空" -ForegroundColor Red
    pause
    exit 1
}

Write-Host ""
Write-Host "[3/3] 保存配置..." -ForegroundColor Yellow

# 配置内容
$config = @{
    models = @{
        default = "zhipu/glm-4.7-flash"
        providers = @{
            zhipu = @{
                apiKey = $apiKey
                baseURL = "https://open.bigmodel.cn/api/paas/v4"
                models = @{
                    "glm-4.7-flash" = @{
                        id = "glm-4.7-flash"
                        name = "GLM-4.7-Flash"
                        description = "智谱 GLM-4.7-Flash - 免费高性能模型"
                        contextWindow = 128000
                        maxTokens = 65536
                        temperature = 0.7
                        thinking = $true
                    }
                }
            }
        }
    }
    preferences = @{
        autoConnect = $true
        defaultProvider = "zhipu"
        defaultModel = "glm-4.7-flash"
    }
}

# 保存为 JSON
try {
    $config | ConvertTo-Json -Depth 10 | Set-Content $configPath -Encoding UTF8
    Write-Host "  ✓ 配置已保存到: $configPath" -ForegroundColor Green
} catch {
    Write-Host "  ✗ 保存配置失败: $_" -ForegroundColor Red
    pause
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  配置完成！" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "配置信息:" -ForegroundColor Yellow
Write-Host "  - 模型: GLM-4.7-Flash" -ForegroundColor White
Write-Host "  - 提供商: 智谱 AI" -ForegroundColor White
Write-Host "  - 自动连接: 已启用" -ForegroundColor White
Write-Host "  - 深度思考: 已启用" -ForegroundColor White
Write-Host ""
Write-Host "下一步:" -ForegroundColor Yellow
Write-Host "  1. 双击 opencode.bat 启动 OpenCode" -ForegroundColor White
Write-Host "  2. 直接开始使用，无需再次配置" -ForegroundColor White
Write-Host "  3. 享受免费的 GLM-4.7-Flash 模型！" -ForegroundColor White
Write-Host ""

pause

# NPU 环境验证脚本
# 在远程 AIPC 上运行，自动验证 NPU 功能

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "NPU 环境验证 - 骁龙 X Elite AIPC" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host ""

# 设置脚本路径
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "[1] 检查 Python 环境..." -ForegroundColor Yellow
$pythonVersion = python --version 2>&1
Write-Host "    Python 版本: $pythonVersion" -ForegroundColor White

if ($pythonVersion -match "Python 3\.1[2-9]") {
    Write-Host "    [OK] Python 版本符合要求 (3.12.x)" -ForegroundColor Green
} else {
    Write-Host "    [WARNING] Python 版本不符合要求 (需要 3.12.x)" -ForegroundColor Red
}

Write-Host ""
Write-Host "[2] 检查 QAI AppBuilder..." -ForegroundColor Yellow
$qaiInstalled = pip list 2>&1 | findstr /C:"qai_appbuilder"
if ($qInstalled) {
    Write-Host "    [OK] QAI AppBuilder 已安装" -ForegroundColor Green
    $qaiVersion = pip show qai_appbuilder 2>&1 | findstr /C:"Version"
    Write-Host "    $qaiVersion" -ForegroundColor White
} else {
    Write-Host "    [ERROR] QAI AppBuilder 未安装" -ForegroundColor Red
    Write-Host "    请安装: pip install C:\ai-engine-direct-helper\samples\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "[3] 检查模型文件..." -ForegroundColor Yellow
$modelPath = "C:\model\Qwen2.0-7B-SSD-8380-2.34"
$configPath = Join-Path $modelPath "config.json"

if (Test-Path $modelPath) {
    Write-Host "    [OK] 模型目录存在: $modelPath" -ForegroundColor Green
    $modelFiles = Get-ChildItem $modelPath -File | Measure-Object | Select-Object -ExpandProperty Count
    Write-Host "    文件数量: $modelFiles" -ForegroundColor White
    
    if (Test-Path $configPath) {
        Write-Host "    [OK] 配置文件存在: config.json" -ForegroundColor Green
    } else {
        Write-Host "    [ERROR] 配置文件不存在: config.json" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "    [ERROR] 模型目录不存在: $modelPath" -ForegroundColor Red
    Write-Host "    请检查模型文件是否已解压到 C:\model\" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "[4] 检查 QNN 库文件..." -ForegroundColor Yellow
$libsPath = "C:\ai-engine-direct-helper\samples\qai_libs"
if (Test-Path $libsPath) {
    Write-Host "    [OK] QNN 库目录存在: $libsPath" -ForegroundColor Green
    
    $requiredDlls = @("QnnHtp.dll", "QnnHtpPrepare.dll", "QnnSystem.dll")
    $missingDlls = @()
    
    foreach ($dll in $requiredDlls) {
        $dllPath = Join-Path $libsPath $dll
        if (Test-Path $dllPath) {
            Write-Host "    [OK] $dll 存在" -ForegroundColor Green
        } else {
            Write-Host "    [WARNING] $dll 不存在" -ForegroundColor Yellow
            $missingDlls += $dll
        }
    }
    
    if ($missingDlls.Count -gt 0) {
        Write-Host "    [OK] 所有必需的 DLL 文件存在" -ForegroundColor Green
    }
} else {
    Write-Host "    [WARNING] QNN 库目录不存在" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[5] 运行 NPU 性能测试..." -ForegroundColor Yellow
Write-Host "    (这可能需要 1-2 分钟)" -ForegroundColor Gray

$testFile = "simple_npu_test.py"
if (Test-Path $testFile) {
    Write-Host ""
    Write-Host "    执行: python $testFile" -ForegroundColor Cyan
    Write-Host "------------------------------------------------------------------------------" -ForegroundColor Gray
    
    $output = python $testFile 2>&1
    Write-Host $output
    
    Write-Host "------------------------------------------------------------------------------" -ForegroundColor Gray
    
    # 检查输出是否包含关键信息
    if ($output -match "\[OK\].*模型加载成功") {
        Write-Host "" -ForegroundColor White
        Write-Host "    [OK] 模型加载成功" -ForegroundColor Green
    } else {
        Write-Host "" -ForegroundColor White
        Write-Host "    [ERROR] 模型加载失败" -ForegroundColor Red
    }
    
    if ($output -match "推理完成.*\d+ms") {
        Write-Host "    [OK] 推理完成" -ForegroundColor Green
        # 提取延迟
        if ($output -match "推理完成:\s*(\d+)\.?\d*ms") {
            $latency = $Matches[1]
            Write-Host "    推理延迟: ${latency}ms" -ForegroundColor White
            if ([int]$latency -lt 500) {
                Write-Host "    [OK] 性能达标 (< 500ms)" -ForegroundColor Green
            } else {
                Write-Host "    [WARNING] 性能超标 (>= 500ms)" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "    [WARNING] 无法获取推理延迟" -ForegroundColor Yellow
    }
} else {
    Write-Host "    [ERROR] 测试文件不存在: $testFile" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host "验证完成" -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host ""

# 输出总结
Write-Host "环境检查:" -ForegroundColor Cyan
Write-Host "  - Python: $(if ($pythonVersion -match '3\.1[2-9]') { 'OK' } else { 'WARNING' })" -ForegroundColor White
Write-Host "  - QAI AppBuilder: $(if ($qaiInstalled) { 'OK' } else { 'ERROR' })" -ForegroundColor White
Write-Host "  - 模型文件: $(if (Test-Path $modelPath) { 'OK' } else { 'ERROR' })" -ForegroundColor White
Write-Host "  - QNN 库: $(if (Test-Path $libsPath) { 'OK' } else { 'WARNING' })" -ForegroundColor White
Write-Host ""
Write-Host "下一步:" -ForegroundColor Cyan
Write-Host "  1. 查看详细性能数据: backend/PERFORMANCE_RESULTS.md" -ForegroundColor White
Write-Host "  2. 运行后端服务: cd backend && python main.py" -ForegroundColor White
Write-Host "  3. 测试 API 接口: http://localhost:8000/docs" -ForegroundColor White
Write-Host "  4. 故障排查: 查看 NPU_TROUBLESHOOTING.md" -ForegroundColor White
Write-Host ""
# Complete CodeBuddy Cleanup
# 彻底清除所有 CodeBuddy 残留

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Complete CodeBuddy Cleanup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot

$filesToDelete = @(
    # 后端缓存
    "backend\routes\__pycache__\codebuddy_chat_routes.cpython-312.pyc",
    
    # 前端备份
    "src\services\codebuddyChatService.ts.bak",
    
    # 清理脚本（保留最终版本）
    "cleanup_codebuddy.bat",
    
    # 测试文件
    "test_codebuddy_integration.py"
)

$deletedCount = 0
$skippedCount = 0

Write-Host "Deleting CodeBuddy files..." -ForegroundColor Yellow
Write-Host ""

foreach ($file in $filesToDelete) {
    if (Test-Path $file) {
        try {
            Remove-Item $file -Force
            Write-Host "  OK - Deleted: $file" -ForegroundColor Green
            $deletedCount++
        } catch {
            Write-Host "  SKIP - Cannot delete: $file" -ForegroundColor Yellow
            $skippedCount++
        }
    } else {
        Write-Host "  SKIP - Not found: $file" -ForegroundColor Gray
        $skippedCount++
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cleanup Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Deleted: $deletedCount files" -ForegroundColor Green
Write-Host "Skipped: $skippedCount files" -ForegroundColor Gray
Write-Host ""

# 检查是否还有残留
Write-Host "Checking for remaining CodeBuddy files..." -ForegroundColor Yellow
$remaining = Get-ChildItem -Recurse -Filter "*codebuddy*" -File -ErrorAction SilentlyContinue | 
    Where-Object { $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*venv*" }

if ($remaining) {
    Write-Host ""
    Write-Host "Remaining files (documentation/scripts):" -ForegroundColor Yellow
    $remaining | ForEach-Object {
        Write-Host "  - $($_.Name)" -ForegroundColor Gray
    }
} else {
    Write-Host "OK - No CodeBuddy code files remaining" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CodeBuddy Cleanup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Cleanup Comments Script - Conservative Cleanup
# Remove "# 模拟数据" and "# 简化实现" comments

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Antinet Code Cleanup - Comments Only" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot

# Files to clean
$filesToClean = @(
    "backend\api\knowledge.py",
    "backend\api\cards.py",
    "data-analysis\api\cards.py",
    "data-analysis\api\generate.py",
    "data-analysis\api\knowledge.py",
    "backend\agents\memory.py",
    "backend\agents\taishige.py",
    "backend\agents\messenger.py",
    "data-analysis\agents\memory.py",
    "data-analysis\agents\taishige.py",
    "data-analysis\agents\messenger.py"
)

$totalFiles = $filesToClean.Count
$processedFiles = 0
$modifiedFiles = 0

Write-Host "Found $totalFiles files to check" -ForegroundColor Yellow
Write-Host ""

foreach ($file in $filesToClean) {
    $processedFiles++
    Write-Host "[$processedFiles/$totalFiles] Processing: $file" -ForegroundColor Gray
    
    if (-not (Test-Path $file)) {
        Write-Host "  SKIP - File not found" -ForegroundColor Yellow
        continue
    }
    
    # Read file content
    $content = Get-Content $file -Encoding UTF8 -Raw
    $originalContent = $content
    
    # Remove "# 模拟数据" comments (standalone lines)
    $content = $content -replace '(?m)^\s*#\s*模拟数据\s*$', ''
    
    # Remove "# 简化实现" comments (standalone lines)
    $content = $content -replace '(?m)^\s*#\s*简化实现\s*$', ''
    
    # Remove extra blank lines (max 2 consecutive)
    $content = $content -replace '(?m)(\r?\n){3,}', "`r`n`r`n"
    
    # Check if content changed
    if ($content -ne $originalContent) {
        # Backup original file
        $backupFile = "$file.bak"
        Copy-Item $file $backupFile -Force
        
        # Write cleaned content
        $content | Set-Content $file -Encoding UTF8 -NoNewline
        
        Write-Host "  OK - Cleaned (backup: $backupFile)" -ForegroundColor Green
        $modifiedFiles++
    } else {
        Write-Host "  OK - No changes needed" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cleanup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Processed: $processedFiles files" -ForegroundColor White
Write-Host "Modified: $modifiedFiles files" -ForegroundColor Green
Write-Host "Unchanged: $($processedFiles - $modifiedFiles) files" -ForegroundColor Gray
Write-Host ""
Write-Host "Backup files created with .bak extension" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Review changes: git diff" -ForegroundColor White
Write-Host "2. Test backend: .\quick_start.ps1" -ForegroundColor White
Write-Host "3. If OK, delete .bak files" -ForegroundColor White
Write-Host ""

# Cleanup CodeBuddy SDK - Full Cleanup
# Remove all CodeBuddy related code and rebuild with local knowledge base

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CodeBuddy SDK Full Cleanup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot

$filesModified = 0
$filesDeleted = 0

# Step 1: Delete CodeBuddy service file
Write-Host "[1/4] Deleting CodeBuddy service..." -ForegroundColor Yellow
$codebuddyService = "src\services\codebuddyChatService.ts"
if (Test-Path $codebuddyService) {
    # Backup first
    Copy-Item $codebuddyService "$codebuddyService.bak" -Force
    Remove-Item $codebuddyService -Force
    Write-Host "  OK - Deleted $codebuddyService" -ForegroundColor Green
    $filesDeleted++
} else {
    Write-Host "  SKIP - File not found" -ForegroundColor Gray
}
Write-Host ""

# Step 2: Clean ChatBotModal.tsx
Write-Host "[2/4] Cleaning ChatBotModal.tsx..." -ForegroundColor Yellow
$chatModal = "src\components\ChatBotModal.tsx"
if (Test-Path $chatModal) {
    # Backup first
    Copy-Item $chatModal "$chatModal.bak" -Force
    
    # Read content
    $content = Get-Content $chatModal -Encoding UTF8 -Raw
    
    # Remove CodeBuddy import
    $content = $content -replace "import \{[^}]*codebuddyChatService[^}]*\} from '[^']*codebuddyChatService';\s*", ""
    
    # Remove CodeBuddy state variables
    $content = $content -replace "\s*const \[useCodeBuddy, setUseCodeBuddy\] = useState\([^)]*\);\s*", ""
    $content = $content -replace "\s*const \[sdkAvailable, setSdkAvailable\] = useState\([^)]*\);\s*", ""
    
    # Remove checkSdkAvailability function (multi-line)
    $content = $content -replace "(?s)// 检查 SDK 可用性\s*const checkSdkAvailability = async \(\) => \{[^}]*\};\s*", ""
    
    # Remove SDK check call in useEffect
    $content = $content -replace "\s*// 检查 CodeBuddy SDK 是否可用\s*checkSdkAvailability\(\);\s*", ""
    $content = $content -replace "\s*checkSdkAvailability\(\);\s*", ""
    
    # Simplify message sending logic
    $oldLogic = @"
        let response;
        if \(useCodeBuddy && sdkAvailable\) \{
          response = await codebuddyChatService\.chat\(input, history\);
        \} else \{
          response = await chatService\.query\(input, history\);
        \}
"@
    $newLogic = "        const response = await chatService.query(input, history);"
    $content = $content -replace $oldLogic, $newLogic
    
    # Remove CodeBuddy UI toggle (multi-line, complex pattern)
    $content = $content -replace "(?s)\{sdkAvailable && \([^}]*CodeBuddy[^}]*\}\s*\)\}", ""
    
    # Clean up extra blank lines
    $content = $content -replace "(?m)(\r?\n){3,}", "`r`n`r`n"
    
    # Write cleaned content
    $content | Set-Content $chatModal -Encoding UTF8 -NoNewline
    
    Write-Host "  OK - Cleaned ChatBotModal.tsx" -ForegroundColor Green
    $filesModified++
} else {
    Write-Host "  SKIP - File not found" -ForegroundColor Gray
}
Write-Host ""

# Step 3: Delete backend CodeBuddy route
Write-Host "[3/4] Deleting backend CodeBuddy route..." -ForegroundColor Yellow
$backendRoute = "backend\routes\codebuddy_chat_routes.py.disabled"
if (Test-Path $backendRoute) {
    Remove-Item $backendRoute -Force
    Write-Host "  OK - Deleted $backendRoute" -ForegroundColor Green
    $filesDeleted++
} else {
    Write-Host "  SKIP - File not found" -ForegroundColor Gray
}
Write-Host ""

# Step 4: Clean mock comments
Write-Host "[4/4] Cleaning mock data comments..." -ForegroundColor Yellow
$filesToClean = @(
    "backend\api\knowledge.py",
    "backend\api\cards.py",
    "data-analysis\api\cards.py",
    "data-analysis\api\generate.py",
    "data-analysis\api\knowledge.py"
)

$cleanedComments = 0
foreach ($file in $filesToClean) {
    if (Test-Path $file) {
        $content = Get-Content $file -Encoding UTF8 -Raw
        $originalContent = $content
        
        # Remove "# 模拟数据" comments
        $content = $content -replace '(?m)^\s*#\s*模拟数据\s*$', ''
        
        # Remove extra blank lines
        $content = $content -replace '(?m)(\r?\n){3,}', "`r`n`r`n"
        
        if ($content -ne $originalContent) {
            # Backup
            Copy-Item $file "$file.bak" -Force
            # Write cleaned content
            $content | Set-Content $file -Encoding UTF8 -NoNewline
            $cleanedComments++
        }
    }
}
Write-Host "  OK - Cleaned $cleanedComments files" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cleanup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Files deleted: $filesDeleted" -ForegroundColor Green
Write-Host "Files modified: $($filesModified + $cleanedComments)" -ForegroundColor Green
Write-Host ""
Write-Host "Backup files created with .bak extension" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Rebuild frontend: cd frontend && npm run build" -ForegroundColor White
Write-Host "2. Test backend: .\quick_start.ps1" -ForegroundColor White
Write-Host "3. Test chat: Open http://localhost:3000 and click chat bot" -ForegroundColor White
Write-Host "4. If OK, delete .bak files" -ForegroundColor White
Write-Host ""
Write-Host "Chat will now use local knowledge base (keyword matching)" -ForegroundColor Green
Write-Host "No CodeBuddy SDK dependency!" -ForegroundColor Green
Write-Host ""

# Test Paths
Write-Host "Testing paths..." -ForegroundColor Cyan
Write-Host ""

$projectRoot = $PSScriptRoot
Write-Host "Project Root: $projectRoot" -ForegroundColor Yellow

$pythonPath = "$projectRoot\venv_arm64\Scripts\python.exe"
Write-Host "Python Path: $pythonPath" -ForegroundColor Yellow
Write-Host "Python Exists: $(Test-Path $pythonPath)" -ForegroundColor $(if (Test-Path $pythonPath) { "Green" } else { "Red" })

$backendPath = "$projectRoot\backend"
Write-Host "Backend Path: $backendPath" -ForegroundColor Yellow
Write-Host "Backend Exists: $(Test-Path $backendPath)" -ForegroundColor $(if (Test-Path $backendPath) { "Green" } else { "Red" })

$mainPath = "$backendPath\main.py"
Write-Host "Main.py Path: $mainPath" -ForegroundColor Yellow
Write-Host "Main.py Exists: $(Test-Path $mainPath)" -ForegroundColor $(if (Test-Path $mainPath) { "Green" } else { "Red" })

Write-Host ""
Write-Host "Python Version:" -ForegroundColor Yellow
& $pythonPath --version

Write-Host ""
Write-Host "All paths OK!" -ForegroundColor Green

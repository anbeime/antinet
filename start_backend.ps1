# Antinet Backend Startup Script
# Use virtual environment Python

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Antinet Backend Service Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Change to script directory
Set-Location $PSScriptRoot

# Check virtual environment
Write-Host "[1/4] Checking virtual environment..." -ForegroundColor Yellow
if (-not (Test-Path "venv_arm64\Scripts\python.exe")) {
    Write-Host "[ERROR] Virtual environment not found: venv_arm64" -ForegroundColor Red
    Write-Host "Please run deploy_antinet.bat first" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "OK - Virtual environment exists" -ForegroundColor Green
Write-Host ""

# Disable CodeBuddy routes
Write-Host "[2/4] Cleaning up CodeBuddy dependency..." -ForegroundColor Yellow
$codebuddyFile = "backend\routes\codebuddy_chat_routes.py"
$codebuddyDisabled = "backend\routes\codebuddy_chat_routes.py.disabled"

if (Test-Path $codebuddyFile) {
    if (-not (Test-Path $codebuddyDisabled)) {
        Write-Host "Disabling codebuddy_chat_routes.py..." -ForegroundColor Gray
        Rename-Item $codebuddyFile "codebuddy_chat_routes.py.disabled"
        Write-Host "OK - Disabled" -ForegroundColor Green
    } else {
        Write-Host "OK - Already disabled" -ForegroundColor Green
    }
} else {
    Write-Host "OK - File not found or already disabled" -ForegroundColor Green
}
Write-Host ""

# Check Python version
Write-Host "[3/4] Checking virtual environment Python..." -ForegroundColor Yellow
$venvPython = "venv_arm64\Scripts\python.exe"
& $venvPython --version
Write-Host ""

# Check qai_appbuilder
Write-Host "[4/4] Checking qai_appbuilder..." -ForegroundColor Yellow
$checkCmd = "import qai_appbuilder; print('OK - qai_appbuilder installed')"
$result = & $venvPython -c $checkCmd 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host $result -ForegroundColor Green
} else {
    Write-Host "WARNING - qai_appbuilder not installed" -ForegroundColor Yellow
    Write-Host "Trying to install..." -ForegroundColor Gray
    
    # Find whl file
    $whlPaths = @(
        "C:\ai-engine-direct-helper\samples\qai_appbuilder*.whl",
        "C:\test\qai_appbuilder*.whl"
    )
    
    $whlFile = $null
    foreach ($path in $whlPaths) {
        $found = Get-ChildItem -Path (Split-Path $path) -Filter (Split-Path $path -Leaf) -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) {
            $whlFile = $found
            break
        }
    }
    
    if ($whlFile) {
        Write-Host "Found: $($whlFile.FullName)" -ForegroundColor Gray
        & $venvPython -m pip install $whlFile.FullName
        if ($LASTEXITCODE -eq 0) {
            Write-Host "OK - qai_appbuilder installed successfully" -ForegroundColor Green
        }
    } else {
        Write-Host "WARNING - qai_appbuilder whl file not found" -ForegroundColor Yellow
    }
}
Write-Host ""

# Start backend service
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Antinet Backend Service..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Service URL: http://localhost:8000" -ForegroundColor Green
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop the service" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Change to backend directory and start service
Set-Location "backend"
& "..\venv_arm64\Scripts\python.exe" main.py

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "[ERROR] Backend service failed to start" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check the error messages above" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
}

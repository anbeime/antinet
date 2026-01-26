# Quick Start - Antinet Backend
# Minimal script to start backend with virtual environment

Set-Location $PSScriptRoot

Write-Host "Starting Antinet Backend..." -ForegroundColor Cyan
Write-Host ""

# Disable CodeBuddy if exists
if (Test-Path "backend\routes\codebuddy_chat_routes.py") {
    Rename-Item "backend\routes\codebuddy_chat_routes.py" "codebuddy_chat_routes.py.disabled" -ErrorAction SilentlyContinue
}

# Start service
Write-Host "Service URL: http://localhost:8000" -ForegroundColor Green
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Green
Write-Host ""

Set-Location "backend"
& "..\venv_arm64\Scripts\python.exe" main.py

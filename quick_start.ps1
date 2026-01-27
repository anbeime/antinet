# Quick Start - Antinet Backend
# Minimal script to start backend with virtual environment

Set-Location $PSScriptRoot

Write-Host "Starting Antinet Backend..." -ForegroundColor Cyan
Write-Host ""

# Start service
Write-Host "Service URL: http://localhost:8000" -ForegroundColor Green
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Green
Write-Host ""

$projectRoot = $PSScriptRoot
Set-Location "$projectRoot\backend"
& "$projectRoot\venv_arm64\Scripts\python.exe" main.py

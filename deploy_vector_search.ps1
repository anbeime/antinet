# Antinet Vector Search Deployment Script
# PowerShell version for Windows ARM64

$VENV_PYTHON = "C:\test\antinet\venv_arm64\Scripts\python.exe"
$VENV_PIP = "C:\test\antinet\venv_arm64\Scripts\pip.exe"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Antinet Vector Search Deployment" -ForegroundColor Cyan
Write-Host "Using Lightweight TF-IDF Embeddings (No PyTorch required)" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

Set-Location C:\test\antinet

# Step 1: Check virtual environment
Write-Host "[Step 1/5] Checking virtual environment..." -ForegroundColor Yellow
if (-not (Test-Path $VENV_PYTHON)) {
    Write-Host "ERROR: Virtual environment not found!" -ForegroundColor Red
    exit 1
}
Write-Host "OK Virtual environment found`n" -ForegroundColor Green

# Step 2: Install dependencies
Write-Host "[Step 2/5] Installing dependencies..." -ForegroundColor Yellow
Write-Host "Installing scikit-learn and jieba..."
& $VENV_PIP install scikit-learn jieba
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Installation failed!" -ForegroundColor Red
    exit 1
}
Write-Host "OK Dependencies installed`n" -ForegroundColor Green

# Step 3: Test import
Write-Host "[Step 3/5] Testing imports..." -ForegroundColor Yellow
& $VENV_PYTHON -c "from sklearn.feature_extraction.text import TfidfVectorizer; import jieba; print('OK')"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Import test failed!" -ForegroundColor Red
    exit 1
}
Write-Host "OK Import test passed`n" -ForegroundColor Green

# Step 4: Create vector table
Write-Host "[Step 4/5] Creating vector table..." -ForegroundColor Yellow
& $VENV_PYTHON backend\database_vector.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Vector table creation failed!" -ForegroundColor Red
    exit 1
}
Write-Host "OK Vector table created`n" -ForegroundColor Green

# Step 5: Generate embeddings
Write-Host "[Step 5/5] Generating vector embeddings..." -ForegroundColor Yellow
& $VENV_PYTHON backend\scripts\generate_embeddings.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Embedding generation failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "============================================================`n" -ForegroundColor Cyan

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Modify backend\main.py to enable vector search"
Write-Host "2. Modify backend\routes\chat_routes.py to use hybrid search"
Write-Host "3. Restart backend service"
Write-Host "`nSee DEPLOY_SIMPLE.md for detailed instructions`n"

Read-Host "Press Enter to continue"

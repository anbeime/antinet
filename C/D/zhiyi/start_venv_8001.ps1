$ErrorActionPreference = "Stop"
$python = "C:\D\zhiyi\venv_arm64\Scripts\python.exe"
$workDir = "C:\D\zhiyi\backend"
$port = 8001

try {
    $proc = Start-Process -FilePath $python -ArgumentList "-X","utf8","-m","uvicorn","main:app","--host","0.0.0.0","--port",$port -WorkingDirectory $workDir -PassThru -WindowStyle Hidden
    Write-Host "[OK] Started PID: $($proc.Id)"
} catch {
    Write-Host "[ERROR] $($_.Exception.Message)"
    exit 1
}
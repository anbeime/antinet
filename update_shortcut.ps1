# Update Antinet Desktop Shortcut
$WshShell = New-Object -ComObject WScript.Shell
$Desktop = [System.Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $Desktop "Antinet.lnk"

# Check if shortcut exists, create if not
if (-not (Test-Path $ShortcutPath)) {
    $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
} else {
    $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
}

# Update shortcut properties
$ProjectDir = "C:\test\antinet"
$Shortcut.TargetPath = Join-Path $ProjectDir "start_antinet.bat"
$Shortcut.WorkingDirectory = $ProjectDir
$Shortcut.Description = "Antinet - Start All Services"
$Shortcut.WindowStyle = 1

# Save shortcut
$Shortcut.Save()

Write-Host "Desktop shortcut updated successfully!" -ForegroundColor Green
Write-Host "Location: $ShortcutPath" -ForegroundColor Cyan

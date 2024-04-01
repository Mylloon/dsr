# Enable TLSv1.2 for compatibility with older clients
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

# Download
$releases = "https://git.mylloon.fr/api/v1/repos/Anri/dsr/releases/latest"
$link = (Invoke-WebRequest $releases | ConvertFrom-Json)[0].assets.browser_download_url
$archive = "$env:TEMP\dsr.zip"
Invoke-WebRequest -Uri $link -OutFile $archive
Remove-Item "$env:LOCALAPPDATA\DSR" -Recurse -ErrorAction SilentlyContinue

# Installation
Expand-Archive -Path $archive -DestinationPath "$env:LOCALAPPDATA\DSR" -Force
Move-Item -Path "$env:LOCALAPPDATA\DSR\dsr-win32-x64\*" -Destination "$env:LOCALAPPDATA\DSR" -Force
Remove-Item "$env:LOCALAPPDATA\DSR\dsr-win32-x64"

# Add shortcut
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:APPDATA\Microsoft\Windows\Start Menu\Programs\DSR.lnk")
$Shortcut.TargetPath = "$env:LOCALAPPDATA\DSR\dsr.exe"
$Shortcut.Save()

# Add new app to registry
REG ADD "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\dsr" /f /v DisplayName /t REG_SZ /d "DSR"
REG ADD "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\dsr" /f /v InstallLocation /t REG_SZ /d "$env:LOCALAPPDATA\DSR"

param (
  [switch]$update
)

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

# Ask user to add a shortcut to the desktop
if (-not $update) {
  if ($Host.UI.PromptForChoice(
    "***********************",
    "Add a desktop shortcut?",
    @(
      [System.Management.Automation.Host.ChoiceDescription]::new("&Yes", "Add a shortcut to your desktop.")
      [System.Management.Automation.Host.ChoiceDescription]::new("&No", "Skip the shortcut creation.")
    ), 1) -eq 0) {
    $WshShell = New-Object -comObject WScript.Shell
    $Desktop = [Environment]::GetFolderPath("Desktop")
    $Shortcut = $WshShell.CreateShortcut("$Desktop\DSR.lnk")
    $Shortcut.TargetPath = "$env:LOCALAPPDATA\DSR\dsr.exe"
    $Shortcut.Save()
  }
}

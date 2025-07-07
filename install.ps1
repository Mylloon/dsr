param (
  [switch]$Force
)

# Enable TLSv1.2 for compatibility with older windows versions
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

$path = "$env:LOCALAPPDATA\DSR"
$update = Test-Path -Path $path\*
$iwa = "-UserAgent 'confOS'"

# Download
$releases = "https://git.mylloon.fr/api/v1/repos/Anri/dsr/releases/latest"
$link = (Invoke-WebRequest $iwa $releases | ConvertFrom-Json)[0].assets.browser_download_url
$archive = "$env:TEMP\dsr.zip"
Invoke-WebRequest $iwa -Uri $link -OutFile $archive
Remove-Item "$path" -Recurse -ErrorAction SilentlyContinue

# Close running DSR
Stop-Process -Name "DSR" -Force -ErrorAction SilentlyContinue

# Installation
Expand-Archive -Path $archive -DestinationPath "$path" -Force
Move-Item -Path "$path\dsr-win32-x64\*" -Destination "$path" -Force
Remove-Item "$path\dsr-win32-x64"

# Ask user to add a shortcut to the desktop
if (-not $update -Or $Force) {
  # Add shortcut
  $WshShell = New-Object -comObject WScript.Shell
  $Shortcut = $WshShell.CreateShortcut("$env:APPDATA\Microsoft\Windows\Start Menu\Programs\DSR.lnk")
  $Shortcut.TargetPath = "$path\dsr.exe"
  $Shortcut.Save()

  # Add new app to registry
  REG ADD "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\dsr" /f /v DisplayName /t REG_SZ /d "DSR"
  REG ADD "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\dsr" /f /v InstallLocation /t REG_SZ /d "$path"

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
    $Shortcut.TargetPath = "$path\dsr.exe"
    $Shortcut.Save()
  }
}

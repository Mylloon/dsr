# Discord Video Sharing

Helper for sharing video captured by NVidia Shadowplay in Discord.

## Download/Install

2 choices :

- Manually head to [the release page](https://git.mylloon.fr/Anri/dsr/releases/latest).
- <details>
      <summary>Download it via command lines</summary>

  Copy and paste this snippet into the windows command prompt:

  ```bash
  PowerShell -Command "" ^
    "$releases = 'https://git.mylloon.fr/api/v1/repos/Anri/dsr/releases/latest';" ^
    "$link = (Invoke-WebRequest $releases | ConvertFrom-Json)[0].assets.browser_download_url;" ^
    "$archive = 'dsr.zip';" ^
    "$outfile = Join-Path -Path $env:TEMP -ChildPath $archive;" ^
    "Invoke-WebRequest -Uri $link -OutFile $outfile;" ^
    "cd $env:TEMP;" ^
    "Expand-Archive -Path $archive -DestinationPath '%LOCALAPPDATA%\DSR' -Force;" ^
    "Move-Item -Path '%LOCALAPPDATA%\DSR\dsr-win32-x64\*' -Destination '%LOCALAPPDATA%\DSR' -Force;" ^
    "Remove-Item '%LOCALAPPDATA%\DSR\dsr-win32-x64';'" ^
    "$WshShell = New-Object -comObject WScript.Shell;" ^
    "$Shortcut = $WshShell.CreateShortcut('%APPDATA%\Microsoft\Windows\Start Menu\Programs\DSR.lnk');" ^
    "$Shortcut.TargetPath = '%LOCALAPPDATA%\DSR\dsr.exe';" ^
    "$Shortcut.Save();" ^
    "REG ADD 'HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\dsr' /f /v DisplayName /t REG_SZ /d 'DSR';" ^
    "REG ADD 'HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\dsr' /f /v InstallLocation /t REG_SZ /d '%LOCALAPPDATA%\DSR'"
  ```

  If you have nitro, add `/nitro` flag when running DSR.
  </details>

## More info

- [x] KISS interface
  - [x] Support drag&drop
- [x] Keep the video under 25mb (discord limitation)
  - [x] If already under the limit, the file won't be compressed
  - [x] Nitro suppport via `/nitro` flag
- [x] Merge all audio files into one track, while keeping the original ones (keeping track's title too)
- [x] Support multiples files

## Package the app for Windows

```bash
npm i --platform=win32
npm run make -- --platform=win32
```

It will create a ZIP folder in `./out/make`.

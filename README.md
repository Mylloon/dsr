# Discord Video Sharing ![status-badge](https://git.mylloon.fr/Anri/dsr/badges/workflows/release.yml/badge.svg)

Tool for sharing video to Discord.

> This tool was primarily made for video captured by NVidia Shadowplay.

## Download/Install

2 choices :

- Manually head to [the release page](https://git.mylloon.fr/Anri/dsr/releases/latest).
- Download it via PowerShell:

  ```powershell
  irm https://git.mylloon.fr/Anri/dsr/raw/branch/main/install.ps1 | iex
  ```

> - If you have Discord Nitro: add `/nitro` flag when running DSR.
> - If you have an NVidia GPU with NVenc: add `/nvenc` flag when running DSR.

## More info

- [x] KISS interface
  - [x] Support drag&drop into the icon
- [x] Keep the video under 25mb (discord limitation)
  - [x] NVenc support
  - [x] If already under the limit, the file won't be compressed
  - [x] Nitro suppport via `/nitro` flag
- [x] Merge audio files into one track when recorded with system audio and microphone
      split up, while keeping the original ones (with conveninant metadata)
  - [x] Works also with file with only one audio track
- [x] Support multiples files at once
- [x] Optimize for video streaming

## Package the app for Windows

```bash
npm i --platform=win32
npm run make -- --platform=win32
```

It will create a ZIP folder in `./out/make`.

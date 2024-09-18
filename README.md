# Discord Video Sharing [![status-badge](https://git.mylloon.fr/Anri/dsr/badges/workflows/release.yml/badge.svg)](https://git.mylloon.fr/Anri/dsr/actions?workflow=release.yml)

Tool for sharing video to Discord.

> This tool was primarily made for video captured by NVidia Shadowplay.

## Download/Install/Update

2 choices :

- Manually head to [the release page](https://git.mylloon.fr/Anri/dsr/releases/latest).
- Download it via PowerShell:

  ```powershell
  irm https://git.mylloon.fr/Anri/dsr/raw/branch/main/install.ps1 | iex
  ```

> - If you have Discord Nitro: add `/nitro` flag.
> - If you have Discord Nitro Basic: add `/nitrobasic` flag.

> - If you have an NVidia GPU with NVenc: add `/nvenc` (H.264) or `/nvenc2` (H.265) flag.
> - H.265 encoder is available : add `/h265` flag (slower).

## More info

- [x] KISS interface
  - [x] Support drag&drop into the icon
- [x] Keep the video under discord limitation
  - [x] If already under the limit, the file won't be compressed
  - [x] Basic NVenc support
  - [x] Nitro suppport via flags
- [x] Merge 2 audio files into one track when recorded with system audio and microphone
      split up, while keeping the original ones (with conveniant metadata)
  - [x] Works also with file with only one or more than 2 audio track, by doing
        nothing
- [x] Support multiples files at once
- [x] Always optimize for video streaming

## Package the app for Windows

```bash
npm i --platform=win32
npm run make -- --platform=win32
```

It will create a ZIP folder in `./out/make`.

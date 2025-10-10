# Discord Video Sharing [![status-badge](https://git.mylloon.fr/Anri/dsr/badges/workflows/release.yml/badge.svg)](https://git.mylloon.fr/Anri/dsr/actions?workflow=release.yml)

Tool for sharing video to Discord.

## Download/Install/Update

2 choices :

- Manually head to [the release page](https://git.mylloon.fr/Anri/dsr/releases/latest).
- Download it via PowerShell:

  ```powershell
  irm https://git.mylloon.fr/Anri/dsr/raw/branch/main/install.ps1 | iex
  ```

### Linux

Install from AUR: [dsr](https://aur.archlinux.org/packages/dsr)

## Available flags

You can add thoses flags in the `Target` field of your Windows shortcut.

|                   |                                                        |
| ----------------- | ------------------------------------------------------ |
| `/nitro`          | Increase the file limit to 500Mo                       |
| `/nitrobasic`     | Increase the file limit to 50Mo                        |
|                   |                                                        |
| `/nvenc_h264`     | Enable NVenc with H.264 encoder (for NVidia GPU)       |
| `/nvenc_h265`     | Enable NVenc with H.265 encoder (for NVidia GPU)       |
| `/amd_h264`       | Enable AMF using DX11 with H.264 encoder (for AMD GPU) |
| `/amd_h265`       | Enable AMF using DX11 with H.265 encoder (for AMD GPU) |
| `/h265`           | Enable the H.265 CPU encoder                           |
| `/bitrateratio=1` | Change the ratio for the bitrate, default to 1         |

> NVidia and AMD hardware accelerators are faster than CPU counterparts.

> H.265 means slower compression but usually smaller files

> `bitrateratio` option allows you to change the bitrate, if the file you want to compress
> is either too small or too big.

## More info

- [x] KISS interface
  - [x] Support drag&drop into the icon
- [x] Keep the video under discord limitation
  - [x] Defaults to H.264 CPU encoder
  - [x] If already under the limit, the file won't be compressed
  - [x] NVenc support
  - [x] AMD cards acceleration support
  - [x] Nitro suppport
- [x] Merge 2 audio files into one track when recorded with system audio and microphone
      split up, while keeping the original ones (with conveniant metadata)
  - [x] Works also with file with only one or more than 2 audio track, by doing
        nothing
- [x] Support multiples files at once
- [x] Always optimize for video streaming
- [x] Customizable bitrate

<!--
## Package the app for Windows on Linux

```bash
npm i --platform=win32
npm run make -- --platform=win32
```

It will create a ZIP folder in `./out/make`.
-->

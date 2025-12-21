# Discord Video Sharing [![status-badge](https://git.mylloon.fr/Anri/dsr/badges/workflows/release.yml/badge.svg)](https://git.mylloon.fr/Anri/dsr/actions?workflow=release.yml)

Tool for sharing video to Discord.

## Download/Install/Update

2 choices :

- Manually head to [the release page](https://git.mylloon.fr/Anri/dsr/releases/latest).
- Download it via PowerShell:

  ```powershell
  irm -UserAgent '_' https://git.mylloon.fr/Anri/dsr/raw/branch/main/install.ps1 | iex
  ```

### Linux

Install from AUR: [dsr](https://aur.archlinux.org/packages/dsr)

## Available flags

You can add thoses flags in the `Target` field of your Windows shortcut.

|                   |                                                         |
| ----------------- | ------------------------------------------------------- |
| `/nitro`          | Increase the file limit to 500Mo                        |
| `/nitrobasic`     | Increase the file limit to 50Mo                         |
|                   |                                                         |
| `/nvidia`         | Use you NVidia GPU with NVenc                           |
| `/amd`            | Use your AMD GPU with DX11 on Windows or VAAPI on Linux |
| `/qsv`            | Use your Intel (A\|G)PU with QSV API                    |
| `/vulkan`         | Use your GPU with Vulkan API                            |
|                   |                                                         |
| `/h264`           | Enable the H.265 encoder (default)                      |
| `/h265`           | Enable the H.265 encoder                                |
| `/av1`            | Enable the AV1 encoder                                  |
| `/vp9`            | Enable the VP9 encoder                                  |
|                   |                                                         |
| `/bitrateratio=1` | Change the ratio for the bitrate, defaults to 1         |

> `bitrateratio` option allows you to change the bitrate, if the file you want to compress
> is either too small or too big.

## More info

- [x] KISS interface
  - [x] Support drag&drop into the icon
- [x] Keep the video under discord limitation
  - [x] If already under the limit, the file won't be compressed
  - [x] Defaults to H.264 CPU encoder
  - [x] GPUs support
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

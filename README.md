# Discord Video Sharing

Helper for sharing video captured by NVidia Shadowplay in Discord.

## Download

Head to [the release page](https://git.mylloon.fr/Anri/dsr/releases/latest).

## More info

- [x] KISS interface
  - [x] Support drag&drop
- [x] Keep the video under 25mb (discord limitation)
  - [x] If already under the limit, the file won't be compressed
- [x] Merge all audio files into one track, while keeping the original ones (keeping track's title too)
- [x] Support multiples files

## Package the app for Windows

```bash
npm i --platform=win32
npm run make -- --platform=win32
```

It will create a ZIP folder in `./out/make`.

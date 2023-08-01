# Discord Video Sharing

- [x] Try to keep the video under 25mb
  - [x] If already under the limit, the file won't be compressed
- [x] Merge all audio files into one track, while keeping the original ones

## Package the app for Windows

```bash
npm i --platform=win32
npm run make -- --platform=win32
```

It will create a ZIP folder in `./out/make`.

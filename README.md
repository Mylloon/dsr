# Discord Video Sharing

- [ ] Try to keep the video under 25mb <!-- Use Handbrake preset? -->
  - [ ] If already under the limit, the file won't be compressed
- [ ] Merge all audio files into one track <!-- ffmpeg -i in.mp4 -filter_complex "[0:a]amerge=inputs=2[a]" -ac 1 -map 0:v -map "[a]" -c:v copy out.mp4 -->

## Dev

```bash
npm install --platform=win32
npm run package
```

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { FFmpegArgument, FFmpegBuilder } from "../src/utils/ffmpeg";

describe("FFmpeg builder", () => {
  const binary = "ffmpeg";
  const input = "in";
  const output = "out";

  {
    it("Simple I/O", () => {
      assert.strictEqual(
        new FFmpegBuilder(binary)
          .input(FFmpegArgument.File(input))
          .output(FFmpegArgument.File(output))
          .toString(),
        `"${binary}" -i "${input}" "${output}"`,
      );
    });
  }
  {
    it("Compress video file (CPU)", () => {
      const videoBitrate = 3000;

      assert.strictEqual(
        new FFmpegBuilder(binary)
          .input(FFmpegArgument.File(input))
          .output(FFmpegArgument.File(output, FFmpegArgument.Formats.MP4))
          .videoCodec(FFmpegArgument.Codecs.Video.H264)
          .bitrate(
            FFmpegArgument.Stream.Bitrate(FFmpegArgument.Stream.Type.Video, {
              value: videoBitrate,
              unit: FFmpegArgument.Stream.Unit.Kb,
            }),
          )
          .audioCodec(FFmpegArgument.Codecs.Audio.AAC)
          .tracks(FFmpegArgument.Track.AllVideosMonoInput)
          .tracks(FFmpegArgument.Track.AllAudiosMonoInput)
          .toString(),
        `"${binary}" -i "${input}" -c:v libx264 -b:v ${videoBitrate}k -c:a aac -map 0:v -map 0:a -f mp4 "${output}"`,
      );
    });
  }
  {
    it("Compress video file (CPU/H264 + Two-Pass on Windows)", () => {
      const videoBitrate = 3000;

      assert.strictEqual(
        new FFmpegBuilder(binary)
          .input(FFmpegArgument.File(input))
          .output(FFmpegArgument.File(output, FFmpegArgument.Formats.MP4))
          .videoCodec(FFmpegArgument.Codecs.Video.H264)
          .bitrate(
            FFmpegArgument.Stream.Bitrate(FFmpegArgument.Stream.Type.Video, {
              value: videoBitrate,
              unit: FFmpegArgument.Stream.Unit.Kb,
            }),
          )
          .audioCodec(FFmpegArgument.Codecs.Audio.AAC)
          .tracks(FFmpegArgument.Track.AllVideosMonoInput)
          .tracks(FFmpegArgument.Track.AllAudiosMonoInput)
          .twopass(FFmpegArgument.SystemNULL.Windows)
          .toString(),
        `"${binary}" -i "${input}" -c:v libx264 -b:v ${videoBitrate}k -pass 1 -an -f null NUL && "${binary}" -i "${input}" -c:v libx264 -b:v ${videoBitrate}k -pass 2 -c:a aac -map 0:v -map 0:a -f mp4 "${output}"`,
      );
    });
  }
  {
    it("Compress video file (CPU/H265 + Two-Pass on Windows)", () => {
      const videoBitrate = 3000;

      assert.strictEqual(
        new FFmpegBuilder(binary)
          .input(FFmpegArgument.File(input))
          .output(FFmpegArgument.File(output, FFmpegArgument.Formats.MP4))
          .videoCodec(FFmpegArgument.Codecs.Video.H265)
          .bitrate(
            FFmpegArgument.Stream.Bitrate(FFmpegArgument.Stream.Type.Video, {
              value: videoBitrate,
              unit: FFmpegArgument.Stream.Unit.Kb,
            }),
          )
          .audioCodec(FFmpegArgument.Codecs.Audio.AAC)
          .tracks(FFmpegArgument.Track.AllVideosMonoInput)
          .tracks(FFmpegArgument.Track.AllAudiosMonoInput)
          .twopass(FFmpegArgument.SystemNULL.Windows)
          .toString(),
        `"${binary}" -i "${input}" -c:v libx265 -b:v ${videoBitrate}k -x265-params pass=1 -an -f null NUL && "${binary}" -i "${input}" -c:v libx265 -b:v ${videoBitrate}k -x265-params pass=2 -c:a aac -map 0:v -map 0:a -f mp4 "${output}"`,
      );
    });
  }
  {
    it("Compress video file (CPU/AV1 + Two-Pass on Windows)", () => {
      const videoBitrate = 3000;

      assert.strictEqual(
        new FFmpegBuilder(binary)
          .input(FFmpegArgument.File(input))
          .output(FFmpegArgument.File(output, FFmpegArgument.Formats.MP4))
          .videoCodec(FFmpegArgument.Codecs.Video.AV1)
          .bitrate(
            FFmpegArgument.Stream.Bitrate(FFmpegArgument.Stream.Type.Video, {
              value: videoBitrate,
              unit: FFmpegArgument.Stream.Unit.Kb,
            }),
          )
          .audioCodec(FFmpegArgument.Codecs.Audio.AAC)
          .tracks(FFmpegArgument.Track.AllVideosMonoInput)
          .tracks(FFmpegArgument.Track.AllAudiosMonoInput)
          .twopass(FFmpegArgument.SystemNULL.Windows)
          .toString(),
        `"${binary}" -i "${input}" -c:v libaom-av1 -cpu-used 6 -b:v ${videoBitrate}k -pass 1 -an -f null NUL && "${binary}" -i "${input}" -c:v libaom-av1 -cpu-used 6 -b:v ${videoBitrate}k -pass 2 -c:a aac -map 0:v -map 0:a -f mp4 "${output}"`,
      );
    });
  }
  {
    it("Compress video file (GPU DirectX 11)", () => {
      const videoBitrate = 3000;

      assert.strictEqual(
        new FFmpegBuilder(binary)
          .input(FFmpegArgument.File(input))
          .output(FFmpegArgument.File(output, FFmpegArgument.Formats.MP4))
          .videoCodec(FFmpegArgument.Codecs.Video.H264)
          .bitrate(
            FFmpegArgument.Stream.Bitrate(FFmpegArgument.Stream.Type.Video, {
              value: videoBitrate,
              unit: FFmpegArgument.Stream.Unit.Kb,
            }),
          )
          .audioCodec(FFmpegArgument.Codecs.Audio.AAC)
          .tracks(FFmpegArgument.Track.AllVideosMonoInput)
          .tracks(FFmpegArgument.Track.AllAudiosMonoInput)
          .hardwareAcceleration(FFmpegArgument.HardwareBackend.DirectX11)
          .toString(),
        `"${binary}" -hwaccel d3d11va -hwaccel_output_format d3d11va -i "${input}" -c:v h264_amf -rc vbr_peak -usage transcoding -maxrate ${videoBitrate}k -bufsize ${videoBitrate * 2}k -b:v ${videoBitrate}k -c:a aac -map 0:v -map 0:a -f mp4 "${output}"`,
      );
    });
  }
  {
    it("Compress video file (GPU VAAPI)", () => {
      const videoBitrate = 3000;

      assert.strictEqual(
        new FFmpegBuilder(binary)
          .input(FFmpegArgument.File(input))
          .output(FFmpegArgument.File(output, FFmpegArgument.Formats.MP4))
          .videoCodec(FFmpegArgument.Codecs.Video.H264)
          .bitrate(
            FFmpegArgument.Stream.Bitrate(FFmpegArgument.Stream.Type.Video, {
              value: videoBitrate,
              unit: FFmpegArgument.Stream.Unit.Kb,
            }),
          )
          .audioCodec(FFmpegArgument.Codecs.Audio.AAC)
          .tracks(FFmpegArgument.Track.AllVideosMonoInput)
          .tracks(FFmpegArgument.Track.AllAudiosMonoInput)
          .hardwareAcceleration(FFmpegArgument.HardwareBackend.VAAPI)
          .toString(),
        `"${binary}" -hwaccel vaapi -hwaccel_output_format vaapi -i "${input}" -c:v h264_vaapi -rc_mode VBR -maxrate ${videoBitrate}k -bufsize ${videoBitrate * 2}k -b:v ${videoBitrate}k -c:a aac -map 0:v -map 0:a -f mp4 "${output}"`,
      );
    });
  }
  {
    it("Merge 2 audios", () => {
      const name = "name";
      const filter = `[0:a]amerge=inputs=2[${name}]`;
      assert.strictEqual(
        new FFmpegBuilder(binary)
          .input(FFmpegArgument.File(input))
          .output(FFmpegArgument.File(output))
          .videoCodec(FFmpegArgument.Codecs.Video.Copy)
          .tracks(FFmpegArgument.Track.customTrack(`[${name}]`))
          .tracks(FFmpegArgument.Track.AllVideosMonoInput)
          .filterComplex(filter)
          .toString(),
        `"${binary}" -i "${input}" -c:v copy -filter_complex "${filter}" -map [${name}] -map 0:v "${output}"`,
      );
    });
  }
  {
    it("Add audio track at first position + making it the default", () => {
      const input2 = "in2";
      assert.strictEqual(
        new FFmpegBuilder(binary)
          .input(FFmpegArgument.File(input))
          .input(FFmpegArgument.File(input2))
          .output(FFmpegArgument.File(output))
          .tracks(
            // Copy all from first input
            FFmpegArgument.Track(undefined, undefined, 0),
          )
          .tracks(
            // Copy all audio from second input
            FFmpegArgument.Track(
              FFmpegArgument.Stream.Type.Audio,
              undefined,
              1,
            ),
          )
          .videoCodec(FFmpegArgument.Codecs.Video.Copy)
          .disposition(
            FFmpegArgument.Stream.Disposition(
              FFmpegArgument.Stream.DispositionTarget(
                FFmpegArgument.Stream.Type.Audio,
              ),
              FFmpegArgument.Stream.DispositionAction.Erase,
            ),
          )
          .disposition(
            FFmpegArgument.Stream.Disposition(
              FFmpegArgument.Stream.DispositionTarget(
                FFmpegArgument.Stream.Type.Audio,
                0,
              ),
              FFmpegArgument.Stream.DispositionAction.MakeDefault,
            ),
          )
          .toString(),
        `"${binary}" -i "${input}" -i "${input2}" -c:v copy -map 0 -map 1:a -disposition:a 0 -disposition:a:0 default "${output}"`,
      );
    });
  }
  {
    it("Merge 2 audio tracks then put it as first default audio track", () => {
      const name = "audio_merged";
      const filter = `[0:a:0][0:a:1]amerge=inputs=2[${name}]`;
      assert.strictEqual(
        new FFmpegBuilder(binary)
          .input(FFmpegArgument.File(input))
          .output(FFmpegArgument.File(output))
          .videoCodec(FFmpegArgument.Codecs.Video.Copy)
          .tracks(FFmpegArgument.Track.AllVideosMonoInput)
          .tracks(FFmpegArgument.Track.customTrack(`[${name}]`))
          .tracks(FFmpegArgument.Track.AllAudiosMonoInput)
          .filterComplex(filter)
          .disposition(
            FFmpegArgument.Stream.Disposition(
              FFmpegArgument.Stream.DispositionTarget(
                FFmpegArgument.Stream.Type.Audio,
              ),
              FFmpegArgument.Stream.DispositionAction.Erase,
            ),
          )
          .disposition(
            FFmpegArgument.Stream.Disposition(
              FFmpegArgument.Stream.DispositionTarget(
                FFmpegArgument.Stream.Type.Audio,
                0,
              ),
              FFmpegArgument.Stream.DispositionAction.MakeDefault,
            ),
          )
          .toString(),
        `"${binary}" -i "${input}" -c:v copy -filter_complex "${filter}" -map 0:v -map [${name}] -map 0:a -disposition:a 0 -disposition:a:0 default "${output}"`,
      );
    });
  }
  {
    it("Add audio track titles", () => {
      const metadata = ["First", "Second", "Third"];
      assert.strictEqual(
        new FFmpegBuilder(binary)
          .input(FFmpegArgument.File(input))
          .output(FFmpegArgument.File(output))
          .videoCodec(FFmpegArgument.Codecs.Video.Copy)
          .audioCodec(FFmpegArgument.Codecs.Audio.Copy)
          .tracks(FFmpegArgument.Track.AllVideosMonoInput)
          .tracks(FFmpegArgument.Track.AllAudiosMonoInput)
          .customMetadata(
            FFmpegArgument.Track.Metadata(
              FFmpegArgument.Track.Audio(0),
              metadata[0],
            ),
          )
          .customMetadata(
            FFmpegArgument.Track.Metadata(
              FFmpegArgument.Track.Audio(1),
              metadata[1],
            ),
          )
          .customMetadata(
            FFmpegArgument.Track.Metadata(
              FFmpegArgument.Track.Audio(2),
              metadata[2],
            ),
          )
          .toString(),
        `"${binary}" -i "${input}" -c:v copy -c:a copy -map 0:v -map 0:a -metadata:s:a:0 title="${metadata[0]}" -metadata:s:a:1 title="${metadata[1]}" -metadata:s:a:2 title="${metadata[2]}" "${output}"`,
      );
    });
  }
  {
    it("Optimize video file for streaming", () => {
      assert.strictEqual(
        new FFmpegBuilder(binary)
          .input(FFmpegArgument.File(input))
          .output(FFmpegArgument.File(output))
          .videoCodec(FFmpegArgument.Codecs.Video.Copy)
          .audioCodec(FFmpegArgument.Codecs.Audio.Copy)
          .tracks(FFmpegArgument.Track.AllVideosMonoInput)
          .tracks(FFmpegArgument.Track.AllAudiosMonoInput)
          .streamingOptimization()
          .toString(),
        `"${binary}" -i "${input}" -c:v copy -c:a copy -map 0:v -map 0:a -movflags +faststart "${output}"`,
      );
    });
  }
  {
    it("Hardware acceleration for a codec that don't support any", () => {
      const test_codec = "codec_without_acceleration";
      assert.strictEqual(
        new FFmpegBuilder(binary)
          .input(FFmpegArgument.File(input))
          .output(FFmpegArgument.File(output))
          .videoCodec({ default: test_codec })
          .tracks(FFmpegArgument.Track.AllVideosMonoInput)
          .hardwareAcceleration(FFmpegArgument.HardwareBackend.VAAPI)
          .toString(),
        `"${binary}" -i "${input}" -c:v ${test_codec} -map 0:v "${output}"`,
      );
    });
  }
  {
    it("Testing VAAPI support", () => {
      const input_test = "testsrc";
      const output_test = "-";
      assert.strictEqual(
        new FFmpegBuilder(binary)
          .input(
            FFmpegArgument.File(input_test, FFmpegArgument.Formats.Libavfilter),
          )
          .output(
            FFmpegArgument.File(output_test, FFmpegArgument.Formats.NULL, 0.1),
          )
          .videoCodec(FFmpegArgument.Codecs.Video.H264)
          .hardwareAcceleration(FFmpegArgument.HardwareBackend.VAAPI, true)
          .toString(),
        `"${binary}" -hwaccel vaapi -hwaccel_output_format vaapi -vaapi_device /dev/dri/renderD128 -f lavfi -i "${input_test}" -c:v h264_vaapi -vf format=nv12,hwupload -f null -t 0.1 "${output_test}"`,
      );
    });
  }
});

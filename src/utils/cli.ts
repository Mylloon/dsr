import { FFmpegArgument } from "./ffmpeg";

const codecArgs: Record<string, FFmpegArgument.Codecs.Video> = {
  "/h264": FFmpegArgument.Codecs.Video.H264,
  "/h265": FFmpegArgument.Codecs.Video.H265,
  "/av1": FFmpegArgument.Codecs.Video.AV1,
  "/vp9": FFmpegArgument.Codecs.Video.VP9,
};

const hwArgs: Record<string, FFmpegArgument.HardwareBackend> = {
  "/nvidia": FFmpegArgument.HardwareBackend.Cuda,
  "/amd":
    process.platform === "win32"
      ? FFmpegArgument.HardwareBackend.DirectX11
      : FFmpegArgument.HardwareBackend.VAAPI,
  "/vulkan": FFmpegArgument.HardwareBackend.Vulkan,
  "/qsv": FFmpegArgument.HardwareBackend.QSV,
};

type Args = {
  vCodec: FFmpegArgument.Codecs.Video;
  aCodec: FFmpegArgument.Codecs.Audio;
  hw: FFmpegArgument.HardwareBackend | null;
};

// TODO: Parse the other arguments here

export const parseArgs = (argv: string[]) =>
  argv.reduce<Args>(
    (acc, curr) => {
      if (curr in codecArgs) {
        return { ...acc, vCodec: codecArgs[curr] };
      }
      if (curr in hwArgs) {
        return { ...acc, hw: hwArgs[curr] };
      }
      return acc;
    },
    {
      vCodec: FFmpegArgument.Codecs.Video.H264,
      aCodec: FFmpegArgument.Codecs.Audio.AAC,
      hw: undefined,
    },
  );

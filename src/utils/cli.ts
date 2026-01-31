import { FFmpegArgument } from "./ffmpeg";

const codecArgs: Record<string, FFmpegArgument.Codecs.Video> = {
  h264: FFmpegArgument.Codecs.Video.H264,
  h265: FFmpegArgument.Codecs.Video.H265,
  av1: FFmpegArgument.Codecs.Video.AV1,
  vp9: FFmpegArgument.Codecs.Video.VP9,
};

const backendArgs: Record<string, FFmpegArgument.HardwareBackend | null> = {
  cpu: null,
  nvidia: FFmpegArgument.HardwareBackend.Cuda,
  amd:
    process.platform === "win32"
      ? FFmpegArgument.HardwareBackend.DirectX11
      : FFmpegArgument.HardwareBackend.VAAPI,
  vulkan: FFmpegArgument.HardwareBackend.Vulkan,
  qsv: FFmpegArgument.HardwareBackend.QSV,
};

const nitroArgs: Record<string, number> = {
  nitro: 500,
  nitrobasic: 50,
};

type Args = {
  vCodec: FFmpegArgument.Codecs.Video;
  /**
   * - Backend specified => will use it
   * - `null` => will use CPU
   * - `undefined` => automatically find a compatible GPU backend
   */
  hw: FFmpegArgument.HardwareBackend | null | undefined;
  fileLimit: number;
  bitrateRatio: number;
  speed: number;
};

const parsePositiveNumber = (element: string, defaultOnError: number) => {
  const value = parseFloat(element.split("=")[1]);
  return Number.isFinite(value) && value > 0 ? value : defaultOnError;
};

export const parseArgs = (argv: string[]) =>
  argv
    .flatMap((arg) => {
      const prefix = ["/", "-"].find((p) => arg.startsWith(p));
      return prefix ? [arg.slice(prefix.length)] : [];
    })
    .reduce<Args>(
      (acc, curr) => {
        if (curr in codecArgs) {
          return { ...acc, vCodec: codecArgs[curr] };
        }
        if (curr in backendArgs) {
          return { ...acc, hw: backendArgs[curr] };
        }
        if (curr in nitroArgs) {
          return { ...acc, fileLimit: nitroArgs[curr] };
        }
        if (curr.startsWith("bitrateratio=")) {
          return {
            ...acc,
            bitrateRatio: parsePositiveNumber(curr, acc.bitrateRatio),
          };
        }
        if (curr.startsWith("speed=")) {
          return { ...acc, speed: parsePositiveNumber(curr, acc.speed) };
        }
        return acc;
      },
      {
        vCodec: FFmpegArgument.Codecs.Video.H264,
        hw: undefined,
        fileLimit: 10,
        bitrateRatio: 1,
        speed: 1,
      },
    );

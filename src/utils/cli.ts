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
  forced: boolean;
};

const parsePositiveNumber = (element: string, defaultOnError: number) => {
  const value = parseFloat(element.split("=")[1]);
  return Number.isFinite(value) && value > 0 ? value : defaultOnError;
};

export const parseArgs = (argv: string[]) =>
  argv.reduce<{ args: Args; extra: string[] }>(
    (acc, currRaw) => {
      const prefix = ["/", "-"].find((p) => currRaw.startsWith(p));
      const curr = prefix ? currRaw.slice(prefix.length) : currRaw;
      if (curr in codecArgs) {
        return { ...acc, args: { ...acc.args, vCodec: codecArgs[curr] } };
      }
      if (curr in backendArgs) {
        return { ...acc, args: { ...acc.args, hw: backendArgs[curr] } };
      }
      if (curr in nitroArgs) {
        return { ...acc, args: { ...acc.args, fileLimit: nitroArgs[curr] } };
      }
      if (curr.startsWith("bitrateratio=")) {
        return {
          ...acc,
          args: {
            ...acc.args,
            bitrateRatio: parsePositiveNumber(curr, acc.args.bitrateRatio),
          },
        };
      }
      if (curr.startsWith("speed=")) {
        return {
          ...acc,
          args: { ...acc.args, speed: parsePositiveNumber(curr, acc.args.speed) },
        };
      }
      if (curr.startsWith("force")) {
        return { ...acc, args: { ...acc.args, forced: true } };
      }
      return { ...acc, extra: [...acc.extra, currRaw] };
    },
    {
      args: {
        vCodec: FFmpegArgument.Codecs.Video.H264,
        hw: undefined,
        fileLimit: 10,
        bitrateRatio: 1,
        speed: 1,
        forced: false,
      },
      extra: [],
    },
  );

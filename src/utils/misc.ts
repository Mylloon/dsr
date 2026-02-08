import path = require("path");

import { ChildProcess, exec, execSync } from "child_process";
import { BrowserWindow } from "electron";
import { existsSync, unlink } from "fs";
import { promisify } from "util";

import { FFmpegArgument, FFmpegBuilder } from "./ffmpeg";

import ffprobe = require("ffprobe-static");
const ffprobePath = ffprobe.path.replace("app.asar", "app.asar.unpacked");

export const processes: ChildProcess[] = [];

/** Create a new filename from the OG one */
export const getNewFilename = (ogFile: string, part: string) => {
  const oldFile = path.parse(ogFile);
  return path.join(oldFile.dir, `${part}`.concat(oldFile.base));
};

/** Retrieve various informations about a video file */
export const fetchMetadata = (file: string) => {
  const data = JSON.parse(
    execSync(
      `"${ffprobePath}" -v error \
    -show_entries format=duration \
    -show_entries stream=index,codec_type,bit_rate,pix_fmt,width,height,r_frame_rate \
    -of json "${file}"`,
      { encoding: "utf8" },
    ),
  );

  const duration = parseFloat(data.format.duration);

  const audioBitrates: number[] = data.streams
    .filter((s: any) => s.codec_type === FFmpegArgument.Stream.Type.Audio.type)
    .map((s: any) => Number(s.bit_rate) / 1000);

  const is10bit: boolean = data.streams
    .filter((s: any) => s.codec_type === FFmpegArgument.Stream.Type.Video.type)
    .every((s: any) => s.pix_fmt !== "yuv420p");

  const width: number = data.streams
    .filter((s: any) => s.codec_type === FFmpegArgument.Stream.Type.Video.type)
    .find((s: any) => s.width)?.width;

  const height: number = data.streams
    .filter((s: any) => s.codec_type === FFmpegArgument.Stream.Type.Video.type)
    .find((s: any) => s.height)?.height;

  const framerate: number = (() => {
    const [numerator, denominator] = data.streams
      .find((s: any) => s.codec_type === "video" && s.r_frame_rate)
      .r_frame_rate.split("/")
      .map(Number);

    return denominator ? numerator / denominator : numerator;
  })();

  return {
    duration,
    audioBitrates,
    is10bit,
    width,
    height,
    framerate,
  };
};

/** Print an error to the console and open the dev tool panel */
export const printAndDevTool = (win: BrowserWindow, err: string) => {
  win.webContents.openDevTools();
  win.webContents.send("error", err);
};

/** Run a command asynchronously */
export const execute = (
  command: string,
): Promise<{ stdout: string; stderr: string }> => {
  return new Promise((resolve, reject) => {
    const process = exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });

    processes.push(process);
    process.on("exit", () => {
      processes.splice(processes.indexOf(process), 1);
    });
  });
};

/** Join a filename with a directory */
export const joinPaths = (directory: string, filename: string) => {
  return path.join(directory, filename);
};

/** Delete a file */
export const deleteFile = (file: string) => {
  unlink(file, (err) => {
    if (err) {
      throw err;
    }
  });
};

/** Check if a file exists */
export const doesFileExists = (file: string) => {
  return existsSync(file);
};

/** Assure us that the extension correspond to a type */
export const outputType = (file: string, type: FFmpegArgument.Formats) =>
  path.join(
    path.dirname(file),
    path.basename(file, path.extname(file)) + "." + type,
  );

/** Find a compatible GPU backend
 *
 * @returns `undefined` if no suitable backend has been found
 */
export const findOptimalBackend = async (
  ffmpegPath: string,
  codec: FFmpegArgument.Codecs.Video,
) => {
  const backends = Object.values(FFmpegArgument.HardwareBackend).filter(
    (backend) => codec[backend as keyof typeof codec],
  );

  for (const backend of backends) {
    if (await testBackend(ffmpegPath, backend)) {
      return backend;
    }
  }

  return undefined;
};

/** Test whenever the asked backend is supported */
export const testBackend = async (
  ffmpegBinary: string,
  backend: FFmpegArgument.HardwareBackend,
) => {
  const builder = new FFmpegBuilder(ffmpegBinary)
    .input(FFmpegArgument.File("testsrc", FFmpegArgument.Formats.Libavfilter))
    .output(FFmpegArgument.File("-", FFmpegArgument.Formats.NULL, 0.1))
    .videoCodec(FFmpegArgument.Codecs.Video.H264);

  switch (backend) {
    case FFmpegArgument.HardwareBackend.VAAPI:
    case FFmpegArgument.HardwareBackend.Vulkan: {
      builder.hardwareAcceleration(backend, true);
      break;
    }
    default: {
      builder.hardwareAcceleration(backend);
    }
  }

  return promisify(exec)(builder.toString())
    .then(() => true)
    .catch(() => false);
};

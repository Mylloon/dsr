import child_process = require("child_process");
import path = require("path");

import { existsSync, unlink } from "fs";

import { BrowserWindow } from "electron";
import { FFmpegArgument, FFmpegBuilder } from "./ffmpeg";

import ffprobe = require("ffprobe-static");
const ffprobePath = ffprobe.path.replace("app.asar", "app.asar.unpacked");

export const processes: child_process.ChildProcess[] = [];

/** Create a new filename from the OG one */
export const getNewFilename = (ogFile: string, part: string) => {
  const oldFile = path.parse(ogFile);
  return path.join(oldFile.dir, `${part}`.concat(oldFile.base));
};

/** Return the duration of a video in second */
export const getVideoDuration = (file: string) => {
  const command = `"${ffprobePath}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file}"`;
  const durationString = child_process.execSync(command).toString().trim();
  return parseFloat(durationString);
};

/** Return the number of audio tracks */
export const getNumberOfAudioTracks = (file: string): number[] => {
  const command = `"${ffprobePath}" -v error -show_entries stream=bit_rate -select_streams a -of json "${file}"`;
  const result = child_process.execSync(command, { encoding: "utf8" });
  return JSON.parse(result).streams.map(
    (v: { bit_rate: string }) => Number(v.bit_rate) / 1000,
  );
};

/** Return if the file have 10 bit pixel encoding */
export const is10bit = (file: string): boolean => {
  const command = `"${ffprobePath}" -v error -show_entries stream=pix_fmt -select_streams v -of json "${file}"`;
  const result = child_process.execSync(command, { encoding: "utf8" });
  return JSON.parse(result)
    .streams.map((v: { pix_fmt: string }) => v.pix_fmt === "yuv420p")
    .every((v: boolean) => !v);
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
    const process = child_process.exec(command, (error, stdout, stderr) => {
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

/** Find a compatible GPU backend */
export const findOptimalBackend = (
  ffmpegPath: string,
  codec: FFmpegArgument.Codecs.Video,
) => {
  return (
    Object.values(FFmpegArgument.HardwareBackend)
      // Backend support for selected codec
      .filter((backend) => codec[backend as keyof typeof codec])
      .find((backend) => testBackend(ffmpegPath, backend))
  );
};

/** Test whenever the asked backend is supported */
export const testBackend = (
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

  try {
    child_process.execSync(builder.toString(), { stdio: "ignore" });
    return true;
  } catch (_) {}

  return false;
};

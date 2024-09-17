import child_process = require("child_process");
import path = require("path");
import { BrowserWindow } from "electron";
import { existsSync, unlink } from "fs";

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
    (v: { bit_rate: string }) => Number(v.bit_rate) / 1000
  );
};

/** Print an error to the console and open the dev tool panel */
export const printAndDevTool = (win: BrowserWindow, err: string) => {
  win.webContents.openDevTools();
  win.webContents.send("error", err);
};

/** Run a command asynchronously */
export const execute = (
  command: string
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

/** Delete a file */
export const deleteFile = (file: string) => {
  unlink(file, (err) => {
    if (err) {
      throw err;
    }
  });
};

/** Delete the 2pass files generated by ffmpeg */
export const deleteTwoPassFiles = (directory: string) => {
  const logFile = path.join(directory, "ffmpeg2pass-0.log");

  if (existsSync(logFile)) {
    deleteFile(logFile);
  }

  const mbtreeFile = path.join(directory, "ffmpeg2pass-0.log.mbtree");
  if (existsSync(mbtreeFile)) {
    deleteFile(mbtreeFile);
  }
};

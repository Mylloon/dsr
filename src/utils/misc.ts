import ffprobe = require("ffprobe-static");
import child_process = require("child_process");
import path = require("path");
import { BrowserWindow } from "electron";

/** Create a new filename from the OG one */
export const getNewFilename = (ogFile: string, part: string) => {
  const oldFile = path.parse(ogFile);
  return path.join(oldFile.dir, `${part}`.concat(oldFile.base));
};

/** Return the duration of a video in second */
export const getVideoDuration = (file: string) => {
  const command = `"${ffprobe.path}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file}"`;
  const durationString = child_process.execSync(command).toString().trim();
  return parseFloat(durationString);
};

/** Print an error to the console and open the dev tool panel */
export const printAndDevTool = (win: BrowserWindow, error: string) => {
  console.error(error);
  win.webContents.openDevTools();
};

/** Run a command asynchronously */
export const execute = (command: string) => {
  return new Promise((resolve, reject) => {
    child_process.exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
};

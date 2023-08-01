import ffprobe = require("ffprobe-static");
import child_process = require("child_process");
import path = require("path");

/* Create a new filename from the OG one */
export const getNewFilename = (ogFile: string, part: string) => {
  const oldFile = path.parse(ogFile);
  return path.join(oldFile.dir, `${part}`.concat(oldFile.base));
};

/** Return the duration of a video in second */
export const getVideoDuration = (file: string) => {
  const command = `${ffprobe.path} -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file}"`;
  const durationString = child_process.execSync(command).toString().trim();
  return parseFloat(durationString);
};

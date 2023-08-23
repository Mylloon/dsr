import { BrowserWindow, app, dialog, ipcMain } from "electron";
import { statSync } from "fs";
import {
  deleteFile,
  deleteTwoPassFiles,
  execute,
  getNewFilename,
  getVideoDuration,
  printAndDevTool,
} from "./utils/misc";
import path = require("path");
import ffmpegPath = require("ffmpeg-static");

const moviesFilter = {
  name: "Videos",
  extensions: ["mp4", "mkv"],
};

/** Create a new window */
const createWindow = () => {
  const win = new BrowserWindow({
    width: 600,
    height: 340,
    icon: "./image/icon.ico",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.loadFile(path.join(path.resolve(__dirname, ".."), "pages", "index.html"));

  return win;
};

/* Ready to create the window */
app.whenReady().then(() => {
  const win = createWindow();

  /** Ask user a file */
  const askFile = () => {
    return dialog.showOpenDialogSync(win, {
      filters: [moviesFilter],
      properties: ["openFile", "dontAddToRecent"],
    });
  };

  /** Send confirmation to user */
  const confirmation = async (message: string) => {
    await dialog.showMessageBox(win, { message });
  };

  /** Merge all audios track of a video into one */
  const mergeAudio = async (file: string) => {
    const tmpFile = getNewFilename(file, "TMP_");
    const outFile = getNewFilename(file, "(merged audio) ");

    // Merge 2 audio
    // See: https://trac.ffmpeg.org/wiki/AudioChannelManipulation#a2stereostereo
    await execute(
      `"${ffmpegPath}" -y \
      -i "${file}" \
      -filter_complex "[0:a]amerge=inputs=2[a]" -ac 2 -map 0:v -map "[a]" \
      -c:v copy \
      "${tmpFile}"`
    ).catch((e) => printAndDevTool(win, e));

    // Add merged audio as first position to original video and make it default
    // About disposition: https://ffmpeg.org/ffmpeg.html#Main-options
    await execute(
      `"${ffmpegPath}" -y \
      -i "${tmpFile}" -i "${file}" \
      -map 0 -map 1:a -c:v copy \
      -disposition:a 0 -disposition:a:0 default \
      "${outFile}"`
    ).catch((e) => printAndDevTool(win, e));

    // Delete the temporary video file
    deleteFile(tmpFile);

    const duration = getVideoDuration(outFile);
    const stats = statSync(outFile);

    return { title: outFile, size: stats.size / 1024 / 1024, duration };
  };

  /* Reduce size of a file */
  const reduceSize = async (file: string, bitrate: number) => {
    const audioBitrate = 400; // keep some room
    const videoBitrate = bitrate - audioBitrate;

    const finalFile = getNewFilename(file, "Compressed - ");

    // Trash the output, depends on the platform
    const nul = process.platform === "win32" ? "NUL" : "/dev/null";

    await execute(
      `"${ffmpegPath}" -y \
      -i "${file}" -c:v libx264 -b:v ${videoBitrate}k -pass 1 -an -f mp4 \
      ${nul} \
      && \
      "${ffmpegPath}" -y \
      -i "${file}" -c:v libx264 -b:v ${videoBitrate}k -pass 2 -c:a copy \
      -map 0:0 -map 0:1 -map 0:2 -map 0:3 -f mp4 \
      "${finalFile}"`
    ).catch((e) => printAndDevTool(win, e));

    // Delete the old video file
    deleteFile(file);

    // Delete the 2 pass temporary files
    deleteTwoPassFiles(file);

    return finalFile;
  };

  /* Context bridge */
  ipcMain.handle("argv", () => process.argv);
  ipcMain.handle("allowedExtensions", () => moviesFilter);
  ipcMain.handle("askFile", () => askFile());
  ipcMain.handle("mergeAudio", (_, file: string) => mergeAudio(file));
  ipcMain.handle("reduceSize", (_, file: string, bitrate: number) =>
    reduceSize(file, bitrate)
  );
  ipcMain.handle("exit", () => app.quit());
  ipcMain.handle("confirmation", (_, text: string) => confirmation(text));
});

import { BrowserWindow, app, dialog, ipcMain } from "electron";
import { statSync, unlink } from "fs";
import { execute, getNewFilename, getVideoDuration } from "./utils/misc";
import path = require("path");
import ffmpegPath = require("ffmpeg-static");

const moviesFilter = {
  name: "Videos",
  extensions: ["mp4", "mkv"],
};

/** Create a new window */
const createWindow = () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.loadFile(path.join(path.resolve(__dirname, ".."), "pages", "index.html"));
  win.webContents.openDevTools(); // debug

  return win;
};

/** Merge all audios track of a video into one */
const mergeAudio = async (file: string) => {
  const tmpFile = getNewFilename(file, "TMP_");
  const outFile = getNewFilename(file, "(merged audio) ");

  // Merge 2 audio
  await execute(
    `${ffmpegPath} -y -i "${file}" -filter_complex "[0:a]amerge=inputs=2[a]" -ac 1 -map 0:v -map "[a]" -c:v copy "${tmpFile}"`
  );

  // Add merged audio as first position to original video
  await execute(
    `${ffmpegPath} -y -i "${tmpFile}" -i "${file}" -map 0 -map 1:a -c:v copy "${outFile}"`
  );

  // Delete the temporary file
  unlink(tmpFile, (err) => {
    if (err) {
      throw err;
    }
  });

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
    `${ffmpegPath} -y -i "${file}" -c:v libx264 -b:v ${videoBitrate}k -pass 1 -an -f mp4 ${nul} && \
     ${ffmpegPath} -y -i "${file}" -c:v libx264 -b:v ${videoBitrate}k -pass 2 -c:a copy -map 0:0 -map 0:1 -map 0:2 -map 0:3 -f mp4 "${finalFile}"`
  );

  // Delete the old file
  unlink(file, (err) => {
    if (err) {
      throw err;
    }
  });

  return finalFile;
};

/* Ready to create the window */
app.whenReady().then(() => {
  const win = createWindow();

  /** Ask user a file */
  const askFile = async () => {
    return dialog.showOpenDialogSync(win, {
      filters: [moviesFilter],
      properties: ["openFile", "dontAddToRecent"],
    });
  };

  /** Send confirmation to user */
  const confirmation = async (message: string) => {
    dialog.showMessageBoxSync(win, { message });
  };

  /* Context bridge */
  ipcMain.handle("argv", () => process.argv);
  ipcMain.handle("allowedExtensions", () => moviesFilter);
  ipcMain.handle("askFile", () => askFile());
  ipcMain.handle("mergeAudio", (_, file: string) => mergeAudio(file));
  ipcMain.handle("reduceSize", (_, file: string, bitrate: number) =>
    reduceSize(file, bitrate)
  );
  ipcMain.handle("exit", async () => app.quit());
  ipcMain.handle("confirmation", async (_, text: string) => confirmation(text));
});

import { BrowserWindow, app, dialog, ipcMain } from "electron";
import { unlink, statSync } from "fs";
import path = require("path");
import ffmpegPath = require("ffmpeg-static");
import child_process = require("child_process");
import { getVideoDurationInSeconds } from "get-video-duration";

const moviesFilter = {
  name: "Videos",
  extensions: ["mp4", "mkv"],
};

const isWindows = process.platform === "win32";

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

/* Create a new filename from the OG one */
const getNewFilename = (ogFile: string, part: string) => {
  const oldFile = path.parse(ogFile);
  return path.join(oldFile.dir, `${part}`.concat(oldFile.base));
};

/** Merge all audios track of a video into one */
const mergeAudio = async (file: string) => {
  const tmp_file = getNewFilename(file, "TMP_");
  const outFile = getNewFilename(file, "(merged audio) ");

  // Merge 2 audio
  child_process.execSync(
    `${ffmpegPath} -y -i "${file}" -filter_complex "[0:a]amerge=inputs=2[a]" -ac 1 -map 0:v -map "[a]" -c:v copy "${tmp_file}"`
  );

  // Add merged audio as first position to original video
  child_process.execSync(
    `${ffmpegPath} -y -i "${tmp_file}" -i "${file}" -map 0 -map 1:a -c:v copy "${outFile}"`
  );

  // Delete the temporary file
  unlink(tmp_file, (err) => {
    if (err) {
      throw err;
    }
  });

  const duration = await getVideoDurationInSeconds(outFile);
  const stats = statSync(outFile);

  return { title: outFile, size: stats.size / 1024 / 1024, duration };
};

/* Reduce size of a file */
const reduceSize = (file: string, bitrate: number) => {
  const audioBitrate = 128;
  const videoBitrate = Math.floor(bitrate) - audioBitrate;

  /* Trash the output, depends on the platform */
  const nul = isWindows ? "NUL" : "/dev/null";

  /* AND operator, depends on the platform */
  const and = isWindows ? "^" : "&&";

  const finalFile = getNewFilename(file, "Compressed - ");

  child_process.execSync(
    `${ffmpegPath} -y -i "${file}" -c:v libx264 -b:v ${videoBitrate}k -pass 1 -an -f null ${nul} ${and} \
     ${ffmpegPath} -y -i "${file}" -c:v libx264 -b:v ${videoBitrate}k -pass 2 -c:a aac -b:a ${audioBitrate}k "${finalFile}"`
  );

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

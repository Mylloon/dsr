import { BrowserWindow, app, dialog, ipcMain } from "electron";
import { unlink } from "fs";
import path = require("path");
import ffmpegPath = require("ffmpeg-static");
import child_process = require("child_process");

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

const moviesFilter = {
  name: "Videos",
  extensions: ["mp4", "mkv"],
};

/* Create a new filename from the OG one */
const getNewFilename = (ogFile: string, part: string) => {
  const oldFile = path.parse(ogFile);
  return path.join(oldFile.dir, `${part}`.concat(oldFile.base));
};

/** Merge all audios track of a video into one */
const mergeAudio = (file: string) => {
  const tmp_file = getNewFilename(file, "TMP_");
  const outFile = getNewFilename(file, "(merged audio) ");

  // Merge 2 audio
  child_process.execSync(
    `${ffmpegPath} -i "${file}" -filter_complex "[0:a]amerge=inputs=2[a]" -ac 1 -map 0:v -map "[a]" -c:v copy -y "${tmp_file}"`
  );

  // Add merged audio as first position to original video
  child_process.execSync(
    `${ffmpegPath} -i "${tmp_file}" -i "${file}" -map 0 -map 1:a -c:v copy -y "${outFile}"`
  );

  // Delete the temporary file
  unlink(tmp_file, (err) => {
    if (err) {
      throw err;
    }
  });

  return outFile;
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
  ipcMain.handle("exit", async () => app.quit());
  ipcMain.handle("confirmation", async (_, text: string) => confirmation(text));
});

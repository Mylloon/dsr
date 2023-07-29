import { FileFilter, BrowserWindow, app, dialog, ipcMain } from "electron";
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
};

const moviesFilter = {
  name: "Videos",
  extensions: ["mp4", "mkv"],
} as FileFilter;

/** Ask user a file */
const askFile = async () => {
  return (
    await dialog.showOpenDialog({
      filters: [moviesFilter],
      properties: ["openFile", "dontAddToRecent"],
    })
  ).filePaths;
};

const getNewFilename = (ogFile: string, part: string) => {
  const oldFile = path.parse(ogFile);
  return path.join(oldFile.dir, `${part}`.concat(oldFile.base));
};

/** Merge all audios track of a video into one */
const mergeAudio = (file: string) => {
  const outFile = getNewFilename(file, "(merged audio) ");
  child_process.exec(
    `${ffmpegPath} -i "${file}" -filter_complex "[0:a]amerge=inputs=2[a]" -ac 1 -map 0:v -map "[a]" -c:v copy "${outFile}"`
  );
};

app.whenReady().then(() => {
  /* Context bridge */
  ipcMain.handle("ffmpeg", () => ffmpegPath);
  ipcMain.handle("argv", () => process.argv);
  ipcMain.handle("allowedExtensions", () => moviesFilter);
  ipcMain.handle("askFile", () => askFile());
  ipcMain.handle("mergeAudio", (_, file: string) => mergeAudio(file));
  ipcMain.handle("exit", async () => app.quit());

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

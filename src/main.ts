import { FileFilter, BrowserWindow, app, dialog, ipcMain } from "electron";
import path = require("path");
import ffmpegPath = require("ffmpeg-static");

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

app.whenReady().then(() => {
  /* Context bridge */
  ipcMain.handle("ffmpeg", () => ffmpegPath);
  ipcMain.handle("argv", () => process.argv);
  ipcMain.handle("allowedExtensions", () => moviesFilter);
  ipcMain.handle("askfile", () => askFile());
  ipcMain.handle("exit", () => app.quit());

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

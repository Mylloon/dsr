import { BrowserWindow, app, ipcMain } from "electron";
import path = require("path");
import ffmpegPath = require("ffmpeg-static");

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

app.whenReady().then(() => {
  ipcMain.handle("ffmpeg", () => ffmpegPath);
  ipcMain.handle("argv", () => process.argv);

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

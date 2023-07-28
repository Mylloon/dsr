import { app, BrowserWindow } from "electron";

const pathToFfmpeg = require("ffmpeg-static");

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
  });

  win.loadFile("../index.html");
};

app.whenReady().then(() => {
  /* console.log(pathToFfmpeg); */
  createWindow();
});

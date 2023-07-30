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

  return win;
};

const moviesFilter = {
  name: "Videos",
  extensions: ["mp4", "mkv"],
} as FileFilter;

const getNewFilename = (ogFile: string, part: string) => {
  const oldFile = path.parse(ogFile);
  return path.join(oldFile.dir, `${part}`.concat(oldFile.base));
};

/** Merge all audios track of a video into one */
const mergeAudio = (file: string) => {
  const outFile = getNewFilename(file, "(merged audio) ");
  const child = child_process.exec(
    `${ffmpegPath} -i "${file}" -filter_complex "[0:a]amerge=inputs=2[a]" -ac 1 -map 0:v -map "[a]" -c:v copy "${outFile}"`
  );

  /* debug */
  child.stderr.on("data", (err) => {
    console.log("stderr", err.toString());
  });

  return outFile;
};

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

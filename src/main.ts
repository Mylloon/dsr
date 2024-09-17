import { app, BrowserWindow, dialog, ipcMain, Notification } from "electron";
import { statSync, copyFileSync } from "fs";
import {
  deleteFile,
  deleteTwoPassFiles,
  execute,
  getNewFilename,
  getVideoDuration,
  getNumberOfAudioTracks,
  printAndDevTool,
  processes,
} from "./utils/misc";
import path = require("path");

import ffmpeg = require("ffmpeg-static");
const ffmpegPath = `${ffmpeg}`.replace("app.asar", "app.asar.unpacked");

let error = false;

const moviesFilter = {
  name: "Videos",
  extensions: ["mp4", "mkv"],
};

const metadataAudio = `-metadata:s:a:0 title="System sounds and microphone" \
                       -metadata:s:a:1 title="System sounds" \
                       -metadata:s:a:2 title="Microphone"`;

const shareOpt = "-movflags +faststart";

/** Register a new error  */
const registerError = (win: BrowserWindow, err: string) => {
  error = true;
  printAndDevTool(win, err);
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

// For notification on Windows
if (process.platform === "win32") {
  app.setAppUserModelId(app.name);
}

/* Ready to create the window */
app.whenReady().then(() => {
  const win = createWindow();

  /** Ask user files */
  const askFiles = () => {
    return dialog.showOpenDialogSync(win, {
      filters: [moviesFilter],
      properties: ["openFile", "dontAddToRecent", "multiSelections"],
    });
  };

  /** Send confirmation to user */
  const confirmation = async (message: string) => {
    // Send notification
    new Notification({
      title: "Status",
      body: message,
    }).show();

    // Open dialog
    await dialog.showMessageBox(win, { message });
  };

  /** Get filename of a path */
  const getFilename = (filepath: string) => path.parse(filepath).base;

  /** Merge all audios track of a video into one
   *  In case video doesn't have exactly two audio streams, silently pass */
  const mergeAudio = async (file: string) => {
    const tmpFile = getNewFilename(file, "TMP_");
    let outFile;

    const audioTracks = getNumberOfAudioTracks(file);

    switch (audioTracks.length) {
      case 2:
        // Merge 2 audio
        // See: https://trac.ffmpeg.org/wiki/AudioChannelManipulation#a2stereostereo
        await execute(
          `"${ffmpegPath}" -y \
           -i "${file}" \
           -filter_complex "[0:a]amerge=inputs=2[a]" -ac 2 -map 0:v -map "[a]" \
           -c:v copy \
           "${tmpFile}"`
        );

        outFile = getNewFilename(file, "(merged audio) ");

        // Add merged audio as first position to original video and make it default
        // About disposition: https://ffmpeg.org/ffmpeg.html#Main-options
        // Also rename all tracks accordingly to what they are
        await execute(
          `"${ffmpegPath}" -y \
         -i "${tmpFile}" -i "${file}" \
         -map 0 -map 1:a -c:v copy \
         -disposition:a 0 -disposition:a:0 default \
         ${metadataAudio} \
         "${outFile}"`
        ).catch((e) => registerError(win, e));

        // Delete the temporary video file
        deleteFile(tmpFile);

        break;
      default:
        // Other cases: no merge needed
        outFile = getNewFilename(file, "(nomerge) ");

        // Do a copy
        copyFileSync(file, outFile);
        break;
    }

    const duration = getVideoDuration(outFile);
    const stats = statSync(outFile);

    return {
      title: outFile,
      size: stats.size / 1024 / 1024,
      duration,
      audioTracks,
    };
  };

  /** Reduce size of a file */
  const reduceSize = async (
    file: string,
    bitrate: number,
    audioTracks: number[]
  ) => {
    const audioBitrate = Math.ceil(
      audioTracks.reduce((sum, current) => current + sum, 0)
    );
    let videoBitrate = bitrate - audioBitrate;

    const finalFile = getNewFilename(file, "Compressed - ");

    // Trash the output, depends on the platform
    const nul = process.platform === "win32" ? "NUL" : "/dev/null";

    // Mapping of tracks for FFMPEG, adding 1 for the video stream
    const mappingTracks = Array(audioTracks.length + 1)
      .fill("-map 0:")
      .map((str, index) => {
        return str + index;
      })
      .join(" ");

    let codec = "libx264";
    let hwAcc = "";

    const argv = process.argv;
    if (argv.includes("/nvenc")) {
      // Use NVenc
      codec = "h264_nvenc";
      hwAcc = "-hwaccel cuda";

      // Increase video bitrate
      videoBitrate = Math.floor(videoBitrate);
    }

    // Compress the video
    // Add metadata to audio's track
    await execute(
      `"${ffmpegPath}" -y ${hwAcc} \
       -i "${file}" \
       -c:v ${codec} -b:v ${videoBitrate}k -pass 1 -an -f mp4 \
       ${nul} \
       && \
       "${ffmpegPath}" -y ${hwAcc} \
       -i "${file}" \
       -c:v ${codec} -b:v ${videoBitrate}k -pass 2 -c:a copy \
       ${mappingTracks} -f mp4 \
       ${metadataAudio} \
       ${shareOpt} \
       "${finalFile}"`
    ).catch((e) => registerError(win, e));

    // Delete the old video file
    deleteFile(file);

    // Delete the 2 pass temporary files
    deleteTwoPassFiles(process.cwd());

    return finalFile;
  };

  /** Move metadata at the begenning of the file */
  const moveMetadata = async (file: string) => {
    const finalFile = getNewFilename(file, "Broadcastable - ");

    // Optimize for streaming
    await execute(
      `"${ffmpegPath}" -y \
       -i "${file}" \
       -map 0 -codec copy \
       ${shareOpt} \
       "${finalFile}"`
    ).catch((e) => registerError(win, e));

    // Delete the old video file
    deleteFile(file);

    return finalFile;
  };

  /* Context bridge */
  ipcMain.handle("argv", () => process.argv);
  ipcMain.handle("allowedExtensions", () => moviesFilter);
  ipcMain.handle("getFilename", (_, filepath: string) => getFilename(filepath));
  ipcMain.handle("askFiles", () => askFiles());
  ipcMain.handle("mergeAudio", (_, file: string) => mergeAudio(file));
  ipcMain.handle(
    "reduceSize",
    (_, file: string, bitrate: number, audioTracks: number[]) =>
      reduceSize(file, bitrate, audioTracks)
  );
  ipcMain.handle("moveMetadata", (_, file: string) => moveMetadata(file));
  ipcMain.handle("exit", () => (error ? {} : app.quit()));
  ipcMain.handle("confirmation", (_, text: string) => confirmation(text));
});

app.on("window-all-closed", () => {
  processes.forEach((process) => {
    process.stdin.write("q");
  });

  app.quit();
});

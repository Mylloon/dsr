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

const metadataAudio = `-metadata:s:a:0 title="System sounds and microphone" \
                       -metadata:s:a:1 title="System sounds" \
                       -metadata:s:a:2 title="Microphone"`;

const extraArgs = "-movflags +faststart";

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

  /** Ask user files */
  const askFiles = () => {
    return dialog.showOpenDialogSync(win, {
      filters: [moviesFilter],
      properties: ["openFile", "dontAddToRecent", "multiSelections"],
    });
  };

  /** Send confirmation to user */
  const confirmation = async (message: string) => {
    await dialog.showMessageBox(win, { message });
  };

  /** Get filename of a path */
  const getFilename = (filepath: string) => path.parse(filepath).base;

  /** Merge all audios track of a video into one
   *  In case video have only one track, silently pass */
  const mergeAudio = async (file: string) => {
    const tmpFile = getNewFilename(file, "TMP_");
    let outFile;

    // One track for the video
    let nbTracks = 1;

    // Merge 2 audio
    // See: https://trac.ffmpeg.org/wiki/AudioChannelManipulation#a2stereostereo
    await execute(
      `"${ffmpegPath}" -y \
       -i "${file}" \
       -filter_complex "[0:a]amerge=inputs=2[a]" -ac 2 -map 0:v -map "[a]" \
       -c:v copy \
       "${tmpFile}"`
    )
      .catch(async (e) => {
        if (
          `${e}`.includes(
            "Cannot find a matching stream for unlabeled input pad 1 on filter"
          )
        ) {
          // Only one audio in the file
          outFile = getNewFilename(file, "(processed) ");
          nbTracks += 1;

          // Do a copy
          await execute(`"${ffmpegPath}" -y \
          -i "${file}" \
          -codec copy \
          ${extraArgs} \
          "${outFile}"`).catch((e) => printAndDevTool(win, e));

          // We throw the error since we do not want to merge any audio
          return Promise.resolve("skip");
        } else {
          // Error handling
          printAndDevTool(win, e);
        }
      })
      .then(async (val) => {
        if (val == "skip") {
          return;
        }

        outFile = getNewFilename(file, "(merged audio) ");
        nbTracks += 3;
        // Add merged audio as first position to original video and make it default
        // About disposition: https://ffmpeg.org/ffmpeg.html#Main-options
        // Also rename all tracks accordingly to what they are
        await execute(
          `"${ffmpegPath}" -y \
         -i "${tmpFile}" -i "${file}" \
         -map 0 -map 1:a -c:v copy \
         -disposition:a 0 -disposition:a:0 default \
         ${metadataAudio} \
         ${extraArgs} \
         "${outFile}"`
        ).catch((e) => printAndDevTool(win, e));

        // Delete the temporary video file
        deleteFile(tmpFile);
      });

    const duration = getVideoDuration(outFile);
    const stats = statSync(outFile);

    return {
      title: outFile,
      size: stats.size / 1024 / 1024,
      duration,
      nbTracks,
    };
  };

  /* Reduce size of a file */
  const reduceSize = async (
    file: string,
    bitrate: number,
    nbTracks: number
  ) => {
    const audioBitrate = 400; // keep some room
    let videoBitrate = bitrate - audioBitrate;

    const finalFile = getNewFilename(file, "Compressed - ");

    // Trash the output, depends on the platform
    const nul = process.platform === "win32" ? "NUL" : "/dev/null";

    // Mapping of tracks for FFMPEG
    const mappingTracks = Array(nbTracks)
      .fill("-map 0:")
      .map(function (str, index) {
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
      videoBitrate = Math.floor(videoBitrate * 1.85);
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
       ${extraArgs} \
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
  ipcMain.handle("getFilename", (_, filepath: string) => getFilename(filepath));
  ipcMain.handle("askFiles", () => askFiles());
  ipcMain.handle("mergeAudio", (_, file: string) => mergeAudio(file));
  ipcMain.handle(
    "reduceSize",
    (_, file: string, bitrate: number, nbTracks: number) =>
      reduceSize(file, bitrate, nbTracks)
  );
  ipcMain.handle("exit", () => app.quit());
  ipcMain.handle("confirmation", (_, text: string) => confirmation(text));
});

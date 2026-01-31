import { BrowserWindow, Notification, app, dialog, ipcMain } from "electron";
import { copyFileSync, realpathSync, statSync } from "fs";

import { parseArgs } from "./utils/cli";
import { FFmpegArgument, FFmpegBuilder } from "./utils/ffmpeg";
import {
  deleteFile,
  doesFileExists,
  execute,
  findOptimalBackend,
  getNewFilename,
  getNumberOfAudioTracks,
  getVideoDuration,
  is10bit,
  joinPaths,
  outputType,
  printAndDevTool,
  processes,
  testBackend,
} from "./utils/misc";

import path = require("path");

const ffmpegPath = (() => {
  try {
    const bin = "ffmpeg";
    require("child_process").execSync(`${bin} -version`, {
      stdio: "ignore",
    });
    return bin;
  } catch {
    return `${require("ffmpeg-static")}`.replace(
      "app.asar",
      "app.asar.unpacked",
    );
  }
})();

/** Global error flag */
let error = false;

const moviesFilter = {
  name: "Videos",
  extensions: ["mp4", "mkv"],
};

const metadataTitles = [
  "System sounds and microphone",
  "System sounds",
  "Microphone",
];

/** Register a new error  */
const registerError = (win: BrowserWindow, err: string) => {
  error = true;
  printAndDevTool(win, err);
};

const onWindowsSystem = process.platform === "win32";

/** Create a new window */
const createWindow = () => {
  const win = new BrowserWindow({
    width: 600,
    height: 340,
    icon: "./image/icon." + (onWindowsSystem ? "ico" : "png"),
    title: "Discord Video Sharing v" + app.getVersion(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.loadFile(path.join(path.resolve(__dirname, ".."), "pages", "index.html"));

  return win;
};

// For notification on Windows
if (onWindowsSystem) {
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
    let outFile: string;

    let audioTracks = getNumberOfAudioTracks(file);
    const pixelFmt10bit_check = is10bit(file);

    switch (audioTracks.length) {
      case 2:
        // Merge 2 audio, move result as first default audio track with fancy metadata
        // See: https://trac.ffmpeg.org/wiki/AudioChannelManipulation#a2stereostereo
        const name = "audio_merged";
        const filter = `[0:a:0][0:a:1]amerge=inputs=2[${name}]`;

        outFile = getNewFilename(file, "(merged audio) ");

        const builder = new FFmpegBuilder(ffmpegPath)
          .input(FFmpegArgument.File(file))
          .output(FFmpegArgument.File(outFile))
          .videoCodec(FFmpegArgument.Codecs.Video.Copy)
          .tracks(FFmpegArgument.Track.AllVideosMonoInput)
          .tracks(FFmpegArgument.Track.customTrack(`[${name}]`))
          .tracks(FFmpegArgument.Track.AllAudiosMonoInput)
          .filterComplex(filter)
          .disposition(
            FFmpegArgument.Stream.Disposition(
              FFmpegArgument.Stream.DispositionTarget(
                FFmpegArgument.Stream.Type.Audio,
              ),
              FFmpegArgument.Stream.DispositionAction.Erase,
            ),
          )
          .disposition(
            FFmpegArgument.Stream.Disposition(
              FFmpegArgument.Stream.DispositionTarget(
                FFmpegArgument.Stream.Type.Audio,
                0,
              ),
              FFmpegArgument.Stream.DispositionAction.MakeDefault,
            ),
          );

        metadataTitles.forEach((title, i) => {
          builder.customMetadata(
            FFmpegArgument.Track.Metadata(FFmpegArgument.Track.Audio(i), title),
          );
        });

        await execute(builder.toString()).catch((e) => registerError(win, e));

        audioTracks = getNumberOfAudioTracks(outFile);

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
      is10bit: pixelFmt10bit_check,
    };
  };

  const bitrateKB = (value: number): FFmpegArgument.Stream.Bitrate => {
    return { value, unit: FFmpegArgument.Stream.Unit.Kb };
  };

  /** Returns selected encoder and if we use hardware acceleration */
  const encoderInfo = async (isFile10bit: boolean) => {
    const res = parseArgs(process.argv);

    // No hardware support
    if (isFile10bit) {
      return { ...res, hw: null };
    }

    // User asked for a specific hardware backend
    if (res.hw && !(await testBackend(ffmpegPath, res.hw))) {
      // CPU fallback
      // INFO: We could also reset to `undefined` to automatically research a suitable GPU backend
      res.hw = null;
    }

    // User asked for no specific hardware backend
    if (res.hw === undefined) {
      res.hw = await findOptimalBackend(ffmpegPath, res.vCodec);
    }

    return res;
  };

  /** Export info for frontend */
  const exportEncoderInfo = async (isFile10bit: boolean) => {
    const data = await encoderInfo(isFile10bit);

    return {
      codec: Object.entries(FFmpegArgument.Codecs.Video).find(([, codec]) => {
        return codec === data.vCodec;
      })?.[0],
      hw: !!data.hw,
    };
  };

  /** Get real path, in case of error, return the input */
  const symlinkResolver = (path: string) => {
    try {
      return realpathSync(path);
    } catch {
      return path;
    }
  };

  /** Get real current working directory */
  const cwd = () => symlinkResolver(process.cwd());

  /** Reduce size of a file
   * Returns an empty string in case of failing
   */
  const reduceSize = async (
    file: string,
    bitrate: number,
    audioTracks: number[],
    is10bit: boolean,
    bitrateratio: number = 1,
    speed: number = 1,
  ) => {
    // Calculate audio bitrate
    const audioBitratePerTrack = 128; // kbps
    const mainAudioBitrate = 192; // kbps for the first track
    const audioBitrate =
      mainAudioBitrate + (audioTracks.length - 1) * audioBitratePerTrack;

    // Calculate video bitrate
    const scaledBitrate = Math.round(bitrate * bitrateratio);
    // When speed > 1 : we multiply bitrate by speed
    // When speed < 1 : we still increase bitrate but by a reduced factor
    const bitrateWithSpeed =
      scaledBitrate * (speed >= 1 ? speed : 1 + 0.05 * (1 - speed));
    const videoBitrate = bitrateWithSpeed - audioBitrate;

    const type = FFmpegArgument.Formats.MP4;
    let finalFile;

    // TODO: #31
    // You could use for example:
    // builder
    //   .videoFilter(
    //     FFmpegArgument.VideoFilters.Scaler(
    //       current_width / 1.5,
    //       current_height / 1.5,
    //     ),
    //   )
    //   .videoFilter(
    //     FFmpegArgument.VideoFilters.Framerate(
    //       current_framerate >= 60 ? 30 : current_framerate,
    //     ),
    //   );

    if (videoBitrate > 0) {
      finalFile = outputType(getNewFilename(file, "Compressed - "), type);

      const args = await encoderInfo(is10bit);

      const builder = new FFmpegBuilder(ffmpegPath)
        .yes()
        .input(FFmpegArgument.File(file))
        .output(FFmpegArgument.File(finalFile, type))
        .videoCodec(args.vCodec)
        .bitrate(
          FFmpegArgument.Stream.Bitrate(
            FFmpegArgument.Stream.Type.Video,
            bitrateKB(videoBitrate),
          ),
        )
        .audioCodec(FFmpegArgument.Codecs.Audio.AAC)
        .streamingOptimization();

      // Compress audio and add metadata
      audioTracks.forEach((_, i) => {
        builder.bitrate(
          FFmpegArgument.Stream.Bitrate(
            FFmpegArgument.Stream.Type.Audio,
            bitrateKB(i === 0 ? mainAudioBitrate : audioBitratePerTrack),
            i,
          ),
        );
        i < metadataTitles.length &&
          builder.customMetadata(
            FFmpegArgument.Track.Metadata(
              FFmpegArgument.Track.Audio(i),
              metadataTitles[i],
            ),
          );
      });

      if (speed === 1) {
        builder
          .tracks(FFmpegArgument.Track.AllVideosMonoInput) // all? or only at index 0?
          .tracks(FFmpegArgument.Track.AllAudiosMonoInput, false);
      }
      // Speed up video
      else {
        const video = "v_newspeed";
        const audios = audioTracks.map((_, i) => `a${i}_newspeed`);

        const atempo = ((s) => {
          const filters = [];
          while (s > 2.0) {
            filters.push("atempo=2.0");
            s /= 2.0;
          }
          while (s < 0.5) {
            filters.push("atempo=0.5");
            s *= 2.0;
          }
          filters.push(`atempo=${s}`);
          return filters.join(",");
        })(speed);

        builder
          .filterComplex(
            `[0:v]setpts=${1 / speed}*PTS[${video}];${audios.map((t, i) => `[0:a:${i}]${atempo}[${t}]`)}`,
          )
          .tracks(FFmpegArgument.Track.customTrack(`[${video}]`));

        audios.forEach((audio) =>
          builder.tracks(FFmpegArgument.Track.customTrack(`[${audio}]`)),
        );
      }

      if (args.hw) {
        // Hardware acceleration don't support 2-pass
        builder.hardwareAcceleration(args.hw);
      } else {
        // No hw support
        //  means we use CPU
        //    means we can use 2-pass
        if (is10bit) {
          builder.videoFilter(FFmpegArgument.VideoFilters.PixelFormatYUV420);

          // AV1 have issue using 2-pass with 10 bit videos
          if (args.vCodec !== FFmpegArgument.Codecs.Video.AV1) {
            builder.twopass();
          }
        } else {
          builder.twopass();
        }
      }

      const twopass_logfiles = builder.leftoverFiles();

      // Start compression
      await execute(builder.toString()).catch((e) => registerError(win, e));

      // Delete the 2 pass temporary files
      twopass_logfiles
        .map((f) => joinPaths(cwd(), f))
        .filter(doesFileExists)
        .map(deleteFile);
    } else {
      finalFile = "";
    }

    // Delete the old video file
    deleteFile(file);

    return finalFile;
  };

  /** Move metadata at the begenning of the file */
  const moveMetadata = async (file: string, nbTracks: number) => {
    const finalFile = getNewFilename(file, "Broadcastable - ");

    const builder = new FFmpegBuilder(ffmpegPath)
      .input(FFmpegArgument.File(file))
      .output(FFmpegArgument.File(finalFile))
      .videoCodec(FFmpegArgument.Codecs.Video.Copy)
      .audioCodec(FFmpegArgument.Codecs.Audio.Copy)
      .tracks(FFmpegArgument.Track.AllVideosMonoInput)
      .tracks(FFmpegArgument.Track.AllAudiosMonoInput, false)
      .streamingOptimization();

    if (nbTracks === metadataTitles.length) {
      metadataTitles.forEach((title, i) => {
        builder.customMetadata(
          FFmpegArgument.Track.Metadata(FFmpegArgument.Track.Audio(i), title),
        );
      });
    }

    // Optimize for streaming
    await execute(builder.toString()).catch((e) => registerError(win, e));

    // Delete the old video file
    deleteFile(file);

    return finalFile;
  };

  /* Context bridge */
  ipcMain.handle("argv", () => process.argv);
  ipcMain.handle("cwd", cwd);
  ipcMain.handle("resolveSymlink", (_, path: string) => symlinkResolver(path));
  ipcMain.handle("allowedExtensions", () => moviesFilter);
  ipcMain.handle("getFilename", (_, filepath: string) => getFilename(filepath));
  ipcMain.handle("askFiles", () => askFiles());
  ipcMain.handle("mergeAudio", (_, file: string) => mergeAudio(file));
  ipcMain.handle(
    "reduceSize",
    (
      _,
      file: string,
      bitrate: number,
      audioTracks: number[],
      is10bit: boolean,
      bitrateratio: number,
      speed: number,
    ) => reduceSize(file, bitrate, audioTracks, is10bit, bitrateratio, speed),
  );
  ipcMain.handle("moveMetadata", (_, file: string, nbTracks: number) =>
    moveMetadata(file, nbTracks),
  );
  ipcMain.handle("exit", () => (error ? {} : app.quit()));
  ipcMain.handle("confirmation", (_, text: string) => confirmation(text));
  ipcMain.handle("wantedEncoder", (_, is10Bit: boolean) =>
    exportEncoderInfo(is10Bit),
  );
  ipcMain.handle("getArguments", () => parseArgs(process.argv));
});

app.on("window-all-closed", () => {
  processes.forEach((process) => {
    process.stdin.write("q");
  });

  app.quit();
});

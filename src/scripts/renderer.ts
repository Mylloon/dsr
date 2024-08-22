/** Context bridge types */
let internals: {
  argv: () => Promise<string[]>;
  allowedExtensions: () => Promise<{
    extensions: string[];
  }>;
  getFilename: (filepath: string) => Promise<string>;
  askFiles: () => Promise<string[] | undefined>;
  exit: () => Promise<void>;
  mergeAudio: (filename: string) => Promise<{
    title: string;
    duration: number;
    size: number;
    nbTracks: number;
  }>;
  reduceSize: (
    file: string,
    bitrate: number,
    nbTracks: number
  ) => Promise<string>;
  moveMetadata: (file: string) => Promise<string>;
  confirmation: (text: string) => Promise<void>;
};

/** Search for files */
const getFiles = async () => {
  const allowedExtensions = (await internals.allowedExtensions()).extensions;
  const argvFiles = (await internals.argv())
    .slice(1)
    .filter((element) => !element.startsWith("/"));

  if (argvFiles.length > 0) {
    const files = argvFiles;

    // Exit if a file isn't supported in the list
    if (
      files.filter((file) =>
        allowedExtensions.some((ext) =>
          file.toLowerCase().endsWith(ext.toLowerCase())
        )
      ).length !== files.length
    ) {
      await internals.exit();
    }

    return files;
  }

  const files = await internals.askFiles();
  if (files === undefined || files.length === 0) {
    await internals.exit();
  }
  return files;
};

/** Returns maximum allowed size for files in MB */
const fetchMaxSize = async () => {
  const argv = await internals.argv();
  if (argv.includes("/nitro")) {
    // Nitro user
    return 500;
  }

  // Free user
  return 25;
};

/** Either replace the message, or add some info */
enum Mode {
  Write,
  Append,
}

/** Update the message to the user */
const updateMessage = (
  message: string,
  load: boolean = false,
  mode: Mode = Mode.Write
) => {
  switch (mode) {
    case Mode.Write:
      document.getElementById("message").innerText = message;
      break;

    case Mode.Append:
      document.getElementById("message").innerText += message;
      break;

    default:
      break;
  }
  document.getElementById("load").style.visibility = load
    ? "visible"
    : "hidden";
};

/** Main function */
const main = async () => {
  const maxSizeDiscord = await fetchMaxSize();
  updateMessage("Récupération des fichiers...");
  const files = await getFiles();
  let processedFiles = "";

  // Iterate over all the retrieved files
  for (const [idx, file] of files.entries()) {
    const counter = `${idx + 1}/${files.length}`;
    const filename = await internals.getFilename(file);
    updateMessage(
      `${counter} - Mélange des pistes audios de ${filename}...`,
      true
    );
    const newFile = await internals.mergeAudio(file);
    let finalTitle = newFile.title;
    updateMessage(
      `${counter} - Taille calculée : ~${Math.round(newFile.size)}Mio`
    );

    // Compress video if needed
    if (newFile.size > maxSizeDiscord) {
      const targetSize = maxSizeDiscord - 2; // keep some room

      // https://trac.ffmpeg.org/wiki/Encode/H.264#twopass
      const bitrate = Math.floor((targetSize * 8388.608) / newFile.duration);

      updateMessage(
        `\nFichier trop lourd, compression en cours... (bitrate total = ${bitrate}kbps)`,
        true,
        Mode.Append
      );

      // Compress the video and change the title to the new one
      finalTitle = await internals.reduceSize(
        newFile.title,
        bitrate,
        newFile.nbTracks
      );
    } else {
      updateMessage(`\nPréparation pour le partage...`, true, Mode.Append);

      // Move the metadata to make it playable before everything is downloaded
      finalTitle = await internals.moveMetadata(newFile.title);
    }

    // Append title to the list of processed files
    processedFiles += `\n- ${finalTitle}`;
    updateMessage(`Fichier ${counter} traités.`);
  }

  // Send confirmation to the user that we're done
  await internals.confirmation(
    `${files.length} fichiers traités : ${processedFiles}`
  );
  await internals.exit();
};

main();

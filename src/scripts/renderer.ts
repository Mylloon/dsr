/** Context bridge types */
let internals: {
  argv: () => Promise<string[]>;
  cwd: () => Promise<string>;
  resolveSymlink: (text: string) => Promise<string>;
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
    audioTracks: number[];
    is10bit: boolean;
  }>;
  reduceSize: (
    file: string,
    bitrate: number,
    audioTracks: number[],
    is10bit: boolean,
    bitrateratio?: number,
    speed?: number,
  ) => Promise<string>;
  moveMetadata: (file: string, nbTracks: number) => Promise<string>;
  confirmation: (text: string) => Promise<void>;
  wantedEncoder: (isFile10bit: boolean) => Promise<{
    codec: string;
    hw: boolean;
  }>;
  getArguments: () => Promise<{
    fileLimit: number;
    bitrateRatio: number;
    speed: number;
  }>;
};

/** Search for files */
const getFiles = async () => {
  const allowedExtensions = (await internals.allowedExtensions()).extensions;
  const currentDir = await internals.cwd();
  const argvFiles = (
    await Promise.all(
      (await internals.argv())
        .slice(1)
        .filter((file) => file !== ".")
        .map(internals.resolveSymlink),
    )
  )
    // Remove commands args
    // Assumption: All input files should share the same "currentDirectory"
    .filter((element) => element.startsWith(currentDir))
    .map((element) => element.split("/").pop());

  if (argvFiles.length > 0) {
    const files = argvFiles;

    // Exit if a file isn't supported in the list
    if (
      files.filter((file) =>
        allowedExtensions.some((ext) =>
          file.toLowerCase().endsWith(ext.toLowerCase()),
        ),
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

/** Either replace the message, or add some info */
enum Mode {
  Write,
  Append,
}

/** Update the message to the user */
const updateMessage = (
  message: string,
  load: boolean = false,
  mode: Mode = Mode.Write,
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
  const args = await internals.getArguments();
  updateMessage("Récupération des fichiers...");
  const files = await getFiles();
  let processedFiles = "";
  let numberOfUncompressableFiles = 0;

  // Iterate over all the retrieved files
  for (const [idx, file] of files.entries()) {
    const counter = `${idx + 1}/${files.length}`;
    const filename = await internals.getFilename(file);
    updateMessage(
      `${counter} - Mélange des pistes audios de ${filename}...`,
      true,
    );
    const newFile = await internals.mergeAudio(file);
    let finalTitle = newFile.title;
    const fileSizeMessage = `${counter} - Taille actuelle : ~${Math.round(newFile.size)}Mio`;
    updateMessage(fileSizeMessage);

    // Compress video if needed
    if (newFile.size > args.fileLimit) {
      const targetSize = args.fileLimit - 2; // keep some room

      updateMessage("\nSélection de l'encodeur...", true, Mode.Append);

      const { codec, hw } = await internals.wantedEncoder(newFile.is10bit);

      updateMessage(
        `${fileSizeMessage}\nFichier trop lourd, compression en cours avec ${codec}` +
          (hw ? "/GPU" : "") +
          `... (taille visée : ${args.fileLimit}Mo)`,
        true,
      );

      // https://trac.ffmpeg.org/wiki/Encode/H.264#twopass
      const bitrate = Math.floor((targetSize * 8388.608) / newFile.duration);

      // Compress the video and change the title to the new one
      finalTitle = await internals.reduceSize(
        newFile.title,
        bitrate,
        newFile.audioTracks,
        newFile.is10bit,
        args.bitrateRatio,
        args.speed,
      );
    } else {
      updateMessage(`\nPréparation pour le partage...`, true, Mode.Append);

      // Move the metadata to make it playable before everything is downloaded
      finalTitle = await internals.moveMetadata(
        newFile.title,
        newFile.audioTracks.length,
      );
    }

    // Append title to the list of processed files
    if (finalTitle.length > 0) {
      processedFiles += `\n- ${finalTitle}`;
      updateMessage(`Fichier ${counter} traités.`);
    } else {
      processedFiles += `\n- ${file} [incompressable]`;
      updateMessage(`Fichier ${counter} trop large pour être compressé.`);
      numberOfUncompressableFiles++;
    }
  }

  let errorMessage = "";
  if (numberOfUncompressableFiles > 0) {
    errorMessage += `\nNombre de fichier incompressable : ${numberOfUncompressableFiles}.`;
  }

  // Send confirmation to the user that we're done
  await internals.confirmation(
    `${files.length} fichiers traités : ${processedFiles}` + errorMessage,
  );

  await internals.exit();
};

main();

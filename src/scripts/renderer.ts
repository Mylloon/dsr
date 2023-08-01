/** Context bridge types */
let internals: {
  argv: () => Promise<string[]>;
  allowedExtensions: () => Promise<{
    extensions: string[];
  }>;
  askFile: () => Promise<string[] | undefined>;
  exit: () => Promise<void>;
  mergeAudio: (
    filename: string
  ) => Promise<{ title: string; duration: number; size: number }>;
  reduceSize: (file: string, bitrate: number) => Promise<string>;
  confirmation: (text: string) => Promise<void>;
};

/** Search for a file */
const getFile = async () => {
  const allowedExtensions = (await internals.allowedExtensions()).extensions;
  const argv = await internals.argv();
  if (argv.length === 2) {
    const file = argv.pop();
    if (allowedExtensions.some((ext) => file.endsWith(ext))) {
      return file;
    }
  }

  const file = await internals.askFile();
  if (file === undefined || file.length === 0) {
    await internals.exit();
  }
  return file.join("");
};

enum Mode {
  Write,
  Append,
}

/** Update the message to the user */
const updateMessage = (message: string, mode: Mode = Mode.Write) => {
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
};

/** Main function */
const main = async () => {
  const maxSizeDiscord = 25;
  updateMessage("Récupération du fichier...");
  const file = await getFile();
  updateMessage("Mélange des pistes audios vers la piste 1...");
  const newFile = await internals.mergeAudio(file);
  let finalTitle = newFile.title;
  updateMessage(`Taille calculée : ${Math.round(newFile.size)}Mo`);
  if (newFile.size > maxSizeDiscord) {
    const targetSize = maxSizeDiscord - 2;

    // https://trac.ffmpeg.org/wiki/Encode/H.264#twopass
    const bitrate = Math.floor((targetSize * 8388.608) / newFile.duration);

    updateMessage(
      `\nFichier trop lourd, compression en cours... (bitrate total = ${bitrate})`,
      Mode.Append
    );
    finalTitle = await internals.reduceSize(
      newFile.title,

      bitrate
    );
  }
  updateMessage("Fichier prêt ! :)");
  await internals.confirmation(`File ok @ ${finalTitle}!`);
  await internals.exit();
};
main();

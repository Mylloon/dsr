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

/** Main function */
const main = async () => {
  const maxSizeDiscord = 25;
  const file = await getFile();
  const newFile = await internals.mergeAudio(file);
  let finalTitle = newFile.title;
  if (newFile.size > maxSizeDiscord) {
    const targetSize = maxSizeDiscord - 2;
    finalTitle = await internals.reduceSize(
      newFile.title,
      // https://trac.ffmpeg.org/wiki/Encode/H.264#twopass
      (targetSize * 8388.608) / newFile.duration
    );
  }
  await internals.confirmation(`File ok @ ${finalTitle}!`);
  await internals.exit();
};
main();

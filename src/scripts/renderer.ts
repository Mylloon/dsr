/** Context bridge types */
let internals: {
  argv: () => Promise<string[]>;
  allowedExtensions: () => Promise<{
    extensions: string[];
  }>;
  askFile: () => Promise<string[]>;
  exit: () => Promise<void>;
  mergeAudio: (filename: string) => Promise<string>;
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
  if (file.length === 0) {
    await internals.exit();
  }
  return file.join("");
};

/** Main function */
const main = async () => {
  const file = await getFile();
  const newFile = await internals.mergeAudio(file);
  await internals.confirmation(`File ok @ ${newFile}!`);
  await internals.exit();
};
main();

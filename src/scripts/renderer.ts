/* Context bridge types */
let internals: {
  ffmpeg: () => Promise<string>;
  argv: () => Promise<string[]>;
  allowedExtensions: () => Promise<{
    extensions: string[];
  }>;
  askFile: () => Promise<string[]>;
  exit: () => any;
  mergeAudio: (filename: string) => Promise<void>;
};

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

const main = async () => {
  const file = await getFile();
  document.getElementById("info").innerText = file.concat();
  await internals.mergeAudio(file);
};
main();

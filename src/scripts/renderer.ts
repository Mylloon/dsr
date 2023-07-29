/* Context bridge types */
let internals: {
  ffmpeg: () => Promise<string>;
  argv: () => Promise<string[]>;
  allowedExtensions: () => Promise<{
    extensions: string[];
  }>;
  askFile: () => Promise<string[]>;
  exit: () => any;
};

const get_file = async () => {
  const allowedExtensions = (await internals.allowedExtensions()).extensions;
  console.log(allowedExtensions);
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

get_file().then((file) => (document.getElementById("info").innerText = file));

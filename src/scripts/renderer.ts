/* Context bridge */
let internals: {
  ffmpeg: () => Promise<string>;
  argv: () => Promise<string>;
};

const get_ffmpeg = async () => {
  const response = await internals.ffmpeg();
  console.log(response);
};
get_ffmpeg();

const get_argv = async () => {
  const response = await internals.argv();
  console.log(response);
};
get_argv();

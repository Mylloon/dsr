/* Context bridge */
let internals: {
  ffmpeg: () => Promise<string>;
};

const get_ffmpeg = async () => {
  const response = await internals.ffmpeg();
  console.log(response);
};

get_ffmpeg();

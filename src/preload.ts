import { contextBridge, ipcRenderer } from "electron";

/* Log errors */
ipcRenderer.on("error", (_, err) => {
  console.error(err);
});

/* Context bridge */
contextBridge.exposeInMainWorld("internals", {
  argv: () => ipcRenderer.invoke("argv"),
  cwd: () => ipcRenderer.invoke("cwd"),
  resolveSymlink: (path: string) => ipcRenderer.invoke("resolveSymlink", path),
  allowedExtensions: () => ipcRenderer.invoke("allowedExtensions"),
  getFilename: (filepath: string) =>
    ipcRenderer.invoke("getFilename", filepath),
  askFiles: () => ipcRenderer.invoke("askFiles"),
  mergeAudio: (file: string) => ipcRenderer.invoke("mergeAudio", file),
  reduceSize: (
    file: string,
    bitrate: number,
    audioTracks: number[],
    is10bit: boolean,
    bitrateratio: number,
    speed: number,
  ) =>
    ipcRenderer.invoke(
      "reduceSize",
      file,
      bitrate,
      audioTracks,
      is10bit,
      bitrateratio,
      speed,
    ),
  moveMetadata: (file: string, nbTracks: number) =>
    ipcRenderer.invoke("moveMetadata", file, nbTracks),
  wantedEncoder: (isFile10bit: boolean) =>
    ipcRenderer.invoke("wantedEncoder", isFile10bit),
  exit: () => ipcRenderer.invoke("exit"),
  confirmation: (text: string) => ipcRenderer.invoke("confirmation", text),
  getArguments: () => ipcRenderer.invoke("getArguments"),
});

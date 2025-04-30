import { contextBridge, ipcRenderer } from "electron";

/* Log errors */
ipcRenderer.on("error", (_, err) => {
  console.error(err);
});

/* Context bridge */
contextBridge.exposeInMainWorld("internals", {
  argv: () => ipcRenderer.invoke("argv"),
  allowedExtensions: () => ipcRenderer.invoke("allowedExtensions"),
  getFilename: (filepath: string) => ipcRenderer.invoke("getFilename", filepath),
  askFiles: () => ipcRenderer.invoke("askFiles"),
  mergeAudio: (file: string) => ipcRenderer.invoke("mergeAudio", file),
  reduceSize: (file: string, bitrate: number, audioTracks: number[]) =>
    ipcRenderer.invoke("reduceSize", file, bitrate, audioTracks),
  moveMetadata: (file: string, nbTracks: number) =>
    ipcRenderer.invoke("moveMetadata", file, nbTracks),
  exit: () => ipcRenderer.invoke("exit"),
  confirmation: (text: string) => ipcRenderer.invoke("confirmation", text),
});

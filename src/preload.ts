import { contextBridge, ipcRenderer } from "electron";

/* Log errors */
ipcRenderer.on("error", (_, err) => {
  console.error(err);
});

/* Context bridge */
contextBridge.exposeInMainWorld("internals", {
  argv: () => ipcRenderer.invoke("argv"),
  allowedExtensions: () => ipcRenderer.invoke("allowedExtensions"),
  askFile: () => ipcRenderer.invoke("askFile"),
  mergeAudio: (file: string) => ipcRenderer.invoke("mergeAudio", file),
  reduceSize: (file: string, bitrate: number) =>
    ipcRenderer.invoke("reduceSize", file, bitrate),
  exit: () => ipcRenderer.invoke("exit"),
  confirmation: (text: string) => ipcRenderer.invoke("confirmation", text),
});

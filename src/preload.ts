import { contextBridge, ipcRenderer } from "electron";

/* Context bridge */
contextBridge.exposeInMainWorld("internals", {
  ffmpeg: () => ipcRenderer.invoke("ffmpeg"),
  argv: () => ipcRenderer.invoke("argv"),
  allowedExtensions: () => ipcRenderer.invoke("allowedExtensions"),
  askFile: () => ipcRenderer.invoke("askFile"),
  mergeAudio: (file: string) => ipcRenderer.invoke("mergeAudio", file),
  exit: () => ipcRenderer.invoke("exit"),
});

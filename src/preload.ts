import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("internals", {
  ffmpeg: () => ipcRenderer.invoke("ffmpeg"),
  argv: () => ipcRenderer.invoke("argv"),
});

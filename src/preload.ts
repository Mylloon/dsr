import { contextBridge, ipcRenderer } from "electron";

/* Context bridge */
contextBridge.exposeInMainWorld("internals", {
  argv: () => ipcRenderer.invoke("argv"),
  allowedExtensions: () => ipcRenderer.invoke("allowedExtensions"),
  askFile: () => ipcRenderer.invoke("askFile"),
  mergeAudio: (file: string) => ipcRenderer.invoke("mergeAudio", file),
  exit: () => ipcRenderer.invoke("exit"),
  confirmation: (text: string) => ipcRenderer.invoke("confirmation", text),
});

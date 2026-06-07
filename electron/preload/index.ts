import { contextBridge, ipcRenderer } from 'electron'

const api = {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close')
}

contextBridge.exposeInMainWorld('pingChat', api)

export type PingChatApi = typeof api

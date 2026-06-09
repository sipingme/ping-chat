import { contextBridge, ipcRenderer } from 'electron'
import { join } from 'node:path'

const api = {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  webviewPreloadPath: `file://${join(__dirname, '../webview-preload/index.js')}`,
  setFingerprint: (partition: string, config: any) => ipcRenderer.invoke('fingerprint:set', partition, config),
  getFingerprint: (partition: string) => ipcRenderer.invoke('fingerprint:get', partition),
  setProxy: (partition: string, config: any) => ipcRenderer.invoke('proxy:set', partition, config),
  checkProxy: (config: any) => ipcRenderer.invoke('proxy:check', config),
  setCookies: (partition: string, cookieText: string) => ipcRenderer.invoke('cookie:set', partition, cookieText),
  loadSessions: () => ipcRenderer.invoke('sessions:load'),
  saveSessions: (sessions: any[]) => ipcRenderer.invoke('sessions:save', sessions),
  sendReply: (partition: string, content: string) => ipcRenderer.invoke('chat:reply', partition, content),
  onChatMessage: (callback: (payload: { partition: string; sender: string; content: string; isFromUser: boolean; timestamp: number }) => void) => {
    const handler = (_event: any, payload: any) => callback(payload)
    ipcRenderer.on('chat:message', handler)
    return () => ipcRenderer.removeListener('chat:message', handler)
  },
}

contextBridge.exposeInMainWorld('pingChat', api)

export type PingChatApi = typeof api

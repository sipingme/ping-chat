import { contextBridge, ipcRenderer } from 'electron'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))

const api = {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  webviewPreloadPath: `file://${join(currentDir, 'webview.cjs')}`,
  setFingerprint: (partition: string, config: any) => ipcRenderer.invoke('fingerprint:set', partition, config),
  getFingerprint: (partition: string) => ipcRenderer.invoke('fingerprint:get', partition),
  setProxy: (partition: string, config: any) => ipcRenderer.invoke('proxy:set', partition, config),
  checkProxy: (config: any) => ipcRenderer.invoke('proxy:check', config),
  setCookies: (partition: string, cookieText: string) => ipcRenderer.invoke('cookie:set', partition, cookieText),
  saveCookies: (partition: string) => ipcRenderer.invoke('cookie:save', partition),
  loadCookies: (partition: string) => ipcRenderer.invoke('cookie:load', partition),
  loadSessions: () => ipcRenderer.invoke('sessions:load'),
  saveSessions: (sessions: any[]) => ipcRenderer.invoke('sessions:save', sessions),
  sendReply: (partition: string, content: string, autoSend?: boolean) => ipcRenderer.invoke('chat:reply', partition, content, autoSend),
  selectChat: (partition: string, contactName: string) => ipcRenderer.invoke('chat:select', partition, contactName),
  setMonitorEnabled: (partition: string, enabled: boolean) => ipcRenderer.invoke('chat:monitor', partition, enabled),
  onChatMessage: (callback: (payload: { partition: string; sender: string; content: string; isFromUser: boolean; timestamp: number }) => void) => {
    const handler = (_event: any, payload: any) => callback(payload)
    ipcRenderer.on('chat:message', handler)
    return () => ipcRenderer.removeListener('chat:message', handler)
  },
  onChatStats: (callback: (payload: { partition: string; totalCount: number; groupCount: number; userCount: number; totalUnread: number; contacts: Array<{ name: string; isGroup: boolean; unread: number; avatar: string }>; unreadContacts: Array<{ name: string; isGroup: boolean; unread: number; avatar: string }> }) => void) => {
    const handler = (_event: any, payload: any) => callback(payload)
    ipcRenderer.on('chat:stats', handler)
    return () => ipcRenderer.removeListener('chat:stats', handler)
  },
  onContactClicked: (callback: (payload: { partition: string; name: string; avatar?: string }) => void) => {
    const handler = (_event: any, payload: any) => callback(payload)
    ipcRenderer.on('chat:contact-clicked', handler)
    return () => ipcRenderer.removeListener('chat:contact-clicked', handler)
  },
  onChatHistory: (callback: (payload: { partition: string; history: Array<{ sender: string; content: string; isFromUser: boolean; timestamp: number }> }) => void) => {
    const handler = (_event: any, payload: any) => callback(payload)
    ipcRenderer.on('chat:history', handler)
    return () => ipcRenderer.removeListener('chat:history', handler)
  },
}

contextBridge.exposeInMainWorld('pingChat', api)

export type PingChatApi = typeof api

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
  getConfig: (key: string) => ipcRenderer.invoke('config:get', key),
  setConfig: (key: string, value: any) => ipcRenderer.invoke('config:set', key, value),
  getAllConfig: () => ipcRenderer.invoke('config:getAll'),
  logReply: (entry: any) => ipcRenderer.invoke('reply:log', entry),
  getReplyLogs: (options?: any) => ipcRenderer.invoke('reply:list', options),
  getReplyStats: () => ipcRenderer.invoke('reply:stats'),
  setReplyFeedback: (id: string, feedback: 'up' | 'down') => ipcRenderer.invoke('reply:feedback', id, feedback),
  exportConfig: () => ipcRenderer.invoke('config:export'),
  importConfig: () => ipcRenderer.invoke('config:import'),
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  checkForUpdate: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  onUpdateEvent: (event: string, callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data)
    ipcRenderer.on(event, handler)
    return () => ipcRenderer.removeListener(event, handler)
  },
  onShortcut: (event: 'shortcut:toggle-auto-reply' | 'shortcut:new-session', callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on(event, handler)
    return () => ipcRenderer.removeListener(event, handler)
  },
  setWebviewPartition: (wcId: number, partition: string) => ipcRenderer.send('webview:set-partition', { wcId, partition }),
  sendReply: (partition: string, content: string, autoSend?: boolean) => ipcRenderer.invoke('chat:reply', partition, content, autoSend),
  selectChat: (partition: string, contactName: string) => ipcRenderer.invoke('chat:select', partition, contactName),
  setMonitorEnabled: (partition: string, enabled: boolean) => ipcRenderer.invoke('chat:monitor', partition, enabled),
  getChatHistory: (partition: string, limit?: number) => ipcRenderer.invoke('chat:history:get', partition, limit),
  clearChatHistory: (partition: string) => ipcRenderer.invoke('chat:history:clear', partition),
  searchChatHistory: (partition: string, options: { keyword?: string; sender?: string; startTime?: number; endTime?: number; limit?: number }) => ipcRenderer.invoke('chat:history:search', partition, options),
  exportChatHistory: (partition: string, format: 'json' | 'csv') => ipcRenderer.invoke('chat:history:export', partition, format),
  setWebhook: (url: string, enabled: boolean) => ipcRenderer.invoke('webhook:set', url, enabled),
  getWebhook: () => ipcRenderer.invoke('webhook:get'),
  addScheduledMessage: (partition: string, content: string, delayMs: number, autoSend?: boolean) => ipcRenderer.invoke('scheduler:add', partition, content, delayMs, autoSend),
  cancelScheduledMessage: (id: string) => ipcRenderer.invoke('scheduler:cancel', id),
  listScheduledMessages: (partition?: string) => ipcRenderer.invoke('scheduler:list', partition),
  saveCredential: (key: string, value: string) => ipcRenderer.invoke('credential:save', key, value),
  loadCredential: (key: string) => ipcRenderer.invoke('credential:load', key),
  deleteCredential: (key: string) => ipcRenderer.invoke('credential:delete', key),
  setSensitiveWords: (words: string[]) => ipcRenderer.invoke('sensitive-words:set', words),
  checkSensitiveWords: (text: string) => ipcRenderer.invoke('sensitive-words:check', text),
  setCloudSync: (url: string, apiKey: string, enabled: boolean) => ipcRenderer.invoke('cloud-sync:set', url, apiKey, enabled),
  onScheduledSend: (callback: (payload: { partition: string; content: string; autoSend: boolean }) => void) => {
    const handler = (_event: any, payload: any) => callback(payload)
    ipcRenderer.on('chat:scheduled-send', handler)
    return () => ipcRenderer.removeListener('chat:scheduled-send', handler)
  },
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
  onChatRecall: (callback: (payload: { partition: string; sender: string; content: string; originalContent: string; timestamp: number }) => void) => {
    const handler = (_event: any, payload: any) => callback(payload)
    ipcRenderer.on('chat:recall', handler)
    return () => ipcRenderer.removeListener('chat:recall', handler)
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
  onSessionStatus: (callback: (payload: { partition: string; status: 'login' | 'online' }) => void) => {
    const handler = (_event: any, payload: any) => callback(payload)
    ipcRenderer.on('session:status', handler)
    return () => ipcRenderer.removeListener('session:status', handler)
  },
}

contextBridge.exposeInMainWorld('pingChat', api)

export type PingChatApi = typeof api

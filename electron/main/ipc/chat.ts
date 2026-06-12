import { ipcMain, BrowserWindow } from 'electron'
import type { WebviewRegistry } from '../webview-registry'
import {
  appendChatMessage,
  getChatHistory,
  clearChatHistory,
  searchChatHistory,
  exportChatHistory,
} from '../chat-history-store'
import { sendWebhook } from '../webhook-server'
import { syncData } from '../cloud-sync'

export function registerChatIpc(registry: WebviewRegistry): void {
  ipcMain.handle('chat:register', (event) => {
    const wcId = event.sender.id
    const prefs = (event.sender as any).getWebPreferences?.() || {}
    const partition = prefs.partition || ''
    registry.register(partition, wcId)
    console.log('[Main] chat:register', partition, wcId)
    return partition
  })

  ipcMain.on('chat:message', (event, payload: { partition: string; sender: string; content: string; isFromUser: boolean; timestamp: number }) => {
    const partition = registry.getPartition(event.sender.id) || payload.partition || ''
    const enriched = { ...payload, partition }
    appendChatMessage(partition, enriched)
    void sendWebhook('chat:message', enriched)
    void syncData(partition, enriched)
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.webContents.send('chat:message', enriched)
    }
  })

  ipcMain.on('chat:recall', (event, payload: { partition: string; sender: string; content: string; timestamp: number }) => {
    const partition = registry.getPartition(event.sender.id) || payload.partition || ''
    const enriched = { ...payload, partition }
    void sendWebhook('chat:recall', enriched)
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.webContents.send('chat:recall', enriched)
    }
  })

  ipcMain.handle('chat:history:get', (_event, partition: string, limit?: number) => {
    return getChatHistory(partition, limit ?? 100)
  })

  ipcMain.handle('chat:history:clear', (_event, partition: string) => {
    clearChatHistory(partition)
    return true
  })

  ipcMain.handle('chat:history:search', (_event, partition: string, options: any) => {
    return searchChatHistory(partition, options)
  })

  ipcMain.handle('chat:history:export', (_event, partition: string, format: 'json' | 'csv') => {
    return exportChatHistory(partition, format)
  })

  ipcMain.on('chat:history', (event, payload: { partition: string; history: Array<{ sender: string; content: string; isFromUser: boolean; timestamp: number }> }) => {
    const partition = registry.getPartition(event.sender.id) || payload.partition || ''
    const enriched = { ...payload, partition }
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.webContents.send('chat:history', enriched)
    }
  })

  ipcMain.on('chat:stats', (event, payload: { partition: string; totalCount: number; groupCount: number; userCount: number; totalUnread: number; contacts: Array<{ name: string; isGroup: boolean; unread: number }>; unreadContacts: Array<{ name: string; isGroup: boolean; unread: number }> }) => {
    const partition = registry.getPartition(event.sender.id) || payload.partition || ''
    const enriched = { ...payload, partition }
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.webContents.send('chat:stats', enriched)
    }
  })

  ipcMain.on('chat:contact-clicked', (event, payload: { partition: string; name: string; avatar?: string }) => {
    const partition = registry.getPartition(event.sender.id) || payload.partition || ''
    const enriched = { ...payload, partition }
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.webContents.send('chat:contact-clicked', enriched)
    }
  })

  ipcMain.handle('chat:reply', (_event, partition: string, content: string, autoSend?: boolean) => {
    console.log('[Main] chat:reply received', partition, content.slice(0, 30), 'autoSend:', autoSend)
    const target = registry.resolveTarget(partition)
    if (!target) return false
    target.send('chat:reply', { partition, content, autoSend })
    console.log('[Main] sent chat:reply to webview')
    return true
  })

  ipcMain.handle('chat:select', (_event, partition: string, contactName: string) => {
    const target = registry.resolveTarget(partition)
    if (!target) return false
    target.send('chat:select', { partition, contactName })
    return true
  })

  ipcMain.handle('chat:monitor', (_event, partition: string, enabled: boolean) => {
    const target = registry.resolveTarget(partition)
    if (!target) return false
    target.send('chat:monitor', { partition: '', enabled })
    return true
  })
}

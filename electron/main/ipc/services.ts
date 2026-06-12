import { ipcMain } from 'electron'
import { logReply, getReplyLogs, getReplyStats, updateReplyFeedback } from '../reply-logger'
import { setWebhookConfig, getWebhookConfig } from '../webhook-server'
import { scheduleMessage, cancelScheduledMessage, getScheduledMessages } from '../scheduler'
import { saveCredential, loadCredential, deleteCredential } from '../credential-store'
import { setSensitiveWords, checkSensitiveWords } from '../sensitive-word-filter'
import { setCloudSyncConfig } from '../cloud-sync'

export function registerServicesIpc(): void {
  ipcMain.handle('reply:log', (_event, entry: any) => {
    return logReply(entry)
  })

  ipcMain.handle('reply:list', (_event, options?: any) => {
    return getReplyLogs(options)
  })

  ipcMain.handle('reply:stats', () => {
    return getReplyStats()
  })

  ipcMain.handle('reply:feedback', (_event, id: string, feedback: 'up' | 'down') => {
    return updateReplyFeedback(id, feedback)
  })

  ipcMain.handle('webhook:set', (_event, url: string, enabled: boolean) => {
    setWebhookConfig(url, enabled)
    return true
  })

  ipcMain.handle('webhook:get', () => {
    return getWebhookConfig()
  })

  ipcMain.handle('scheduler:add', (_event, partition: string, content: string, delayMs: number, autoSend?: boolean) => {
    return scheduleMessage(partition, content, delayMs, autoSend ?? true)
  })

  ipcMain.handle('scheduler:cancel', (_event, id: string) => {
    return cancelScheduledMessage(id)
  })

  ipcMain.handle('scheduler:list', (_event, partition?: string) => {
    return getScheduledMessages(partition)
  })

  ipcMain.handle('credential:save', (_event, key: string, value: string) => {
    return saveCredential(key, value)
  })

  ipcMain.handle('credential:load', (_event, key: string) => {
    return loadCredential(key)
  })

  ipcMain.handle('credential:delete', (_event, key: string) => {
    deleteCredential(key)
    return true
  })

  ipcMain.handle('sensitive-words:set', (_event, words: string[]) => {
    setSensitiveWords(words)
    return true
  })

  ipcMain.handle('sensitive-words:check', (_event, text: string) => {
    return checkSensitiveWords(text)
  })

  ipcMain.handle('cloud-sync:set', (_event, url: string, apiKey: string, enabled: boolean) => {
    setCloudSyncConfig(url, apiKey, enabled)
    return true
  })
}

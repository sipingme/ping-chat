import { autoUpdater } from 'electron-updater'
import { BrowserWindow, ipcMain } from 'electron'
import { log } from 'node:console'

autoUpdater.logger = {
  info: (message: string) => log('[AutoUpdater]', message),
  warn: (message: string) => log('[AutoUpdater] warn:', message),
  error: (message: string) => log('[AutoUpdater] error:', message),
  debug: (message: string) => log('[AutoUpdater] debug:', message),
} as any

autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

export function initAutoUpdater(): void {
  autoUpdater.on('checking-for-update', () => {
    log('[AutoUpdater] checking for update...')
    notifyRenderer('update:checking', null)
  })

  autoUpdater.on('update-available', (info) => {
    log('[AutoUpdater] update available:', info.version)
    notifyRenderer('update:available', info)
  })

  autoUpdater.on('update-not-available', () => {
    log('[AutoUpdater] no update available')
    notifyRenderer('update:not-available', null)
  })

  autoUpdater.on('download-progress', (progress) => {
    notifyRenderer('update:progress', progress)
  })

  autoUpdater.on('update-downloaded', (info) => {
    log('[AutoUpdater] update downloaded:', info.version)
    notifyRenderer('update:downloaded', info)
  })

  autoUpdater.on('error', (err) => {
    log('[AutoUpdater] error:', err.message)
    notifyRenderer('update:error', { message: err.message })
  })

  // IPC handlers
  ipcMain.handle('update:check', () => {
    return autoUpdater.checkForUpdates().catch((err) => ({ error: err.message }))
  })

  ipcMain.handle('update:download', () => {
    return autoUpdater.downloadUpdate().catch((err) => ({ error: err.message }))
  })

  ipcMain.handle('update:install', () => {
    autoUpdater.quitAndInstall()
    return true
  })

  // Check on startup (after 30s to avoid startup overhead)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {
      // silently ignore network errors on startup
    })
  }, 30000)
}

function notifyRenderer(channel: string, data: any): void {
  const win = BrowserWindow.getAllWindows()[0]
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, data)
  }
}

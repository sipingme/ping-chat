import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { initLogger } from './reply-logger'
import { initAutoUpdater } from './auto-updater'
import { runScheduler } from './scheduler'
import { WebviewRegistry } from './webview-registry'
import { ensureDataDir, COOKIE_DIR, DATA_DIR } from './data-store'
import { registerChatIpc } from './ipc/chat'
import { registerSessionIpc } from './ipc/session'
import { registerSystemIpc } from './ipc/system'
import { registerServicesIpc } from './ipc/services'

for (const stream of [process.stdout, process.stderr]) {
  stream.on('error', (err: any) => {
    if (err.code === 'EPIPE') return
    throw err
  })
}

process.on('uncaughtException', (err) => {
  console.error('[Main] uncaughtException:', err)
})
process.on('unhandledRejection', (reason) => {
  console.error('[Main] unhandledRejection:', reason)
})

const registry = new WebviewRegistry()

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#101112',
    trafficLightPosition: { x: 12, y: 10 },
    webPreferences: {
      preload: existsSync(join(__dirname, '../preload/index.mjs'))
        ? join(__dirname, '../preload/index.mjs')
        : existsSync(join(__dirname, '../preload/index.cjs'))
          ? join(__dirname, '../preload/index.cjs')
          : join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    if (process.env.NODE_ENV !== 'production') mainWindow.webContents.openDevTools({ mode: 'detach' })
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[Main] did-fail-load:', errorCode, errorDescription)
  })
  mainWindow.webContents.on('console-message', (_event, level, message) => {
    const prefix = ['info', 'warn', 'error', 'debug'][level] || 'log'
    console.log(`[Renderer ${prefix}]`, message)
  })

  mainWindow.webContents.on('did-attach-webview', (_event, webContents) => {
    const prefs = (webContents as any).getWebPreferences?.() || {}
    const partition = prefs.partition || ''
    registry.register(partition, webContents.id)
    console.log('[Main] webview attached, partition:', partition, 'id:', webContents.id)
    webContents.openDevTools({ mode: 'detach' })

    webContents.on('render-process-gone', (_event, details) => {
      console.error('[Main] webview render-process-gone:', details.reason, details.exitCode)
      setTimeout(() => {
        if (!webContents.isDestroyed()) {
          console.log('[Main] reloading crashed webview')
          webContents.reload()
        }
      }, 2000)
    })

    webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (!isMainFrame) return
      if (errorCode === -3 || errorCode === -1) return
      console.error('[Main] webview did-fail-load:', errorCode, errorDescription, validatedURL)
      setTimeout(() => {
        if (!webContents.isDestroyed()) {
          console.log('[Main] reloading webview after failed load')
          webContents.reload()
        }
      }, 3000)
    })
  })

  globalShortcut.register('F12', () => {
    const focused = BrowserWindow.getFocusedWindow()
    if (focused) {
      focused.webContents.isDevToolsOpened()
        ? focused.webContents.closeDevTools()
        : focused.webContents.openDevTools({ mode: 'detach' })
    }
  })

  globalShortcut.register('CommandOrControl+Shift+R', () => {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.webContents.send('shortcut:toggle-auto-reply')
    }
  })

  globalShortcut.register('CommandOrControl+Shift+N', () => {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.webContents.send('shortcut:new-session')
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    console.log('[Main] Loading dev URL:', process.env.ELECTRON_RENDERER_URL)
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  ensureDataDir()
  initLogger(DATA_DIR)
  initAutoUpdater()
  initScheduler()
  electronApp.setAppUserModelId('com.ping.chat')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerSystemIpc()
  registerSessionIpc()
  registerChatIpc(registry)
  registerServicesIpc()

  ipcMain.on('webview:set-partition', (_event, { wcId, partition }: { wcId: number; partition: string }) => {
    registry.register(partition, wcId)
    console.log('[Main] webview partition set by renderer:', partition, 'wcId:', wcId)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

function initScheduler(): void {
  runScheduler((partition, content, autoSend) => {
    const target = registry.resolveTarget(partition)
    if (target && !target.isDestroyed()) {
      target.send('chat:scheduled-send', { partition, content, autoSend })
    }
  })
}

app.on('before-quit', async () => {
  const { writeFileSync, existsSync, mkdirSync } = await import('node:fs')
  const { join } = await import('node:path')
  const { session, webContents } = await import('electron')
  const partitions = [...registry.keys()].filter(Boolean)
  console.log('[Cookie] auto-save on quit for partitions:', partitions)
  for (const partition of partitions) {
    try {
      const sess = session.fromPartition(partition)
      const cookies = await sess.cookies.get({})
      if (!existsSync(COOKIE_DIR)) mkdirSync(COOKIE_DIR, { recursive: true })
      const cookieFile = join(COOKIE_DIR, `${partition}.json`)
      writeFileSync(cookieFile, JSON.stringify(cookies, null, 2))
      console.log('[Cookie] auto-saved', cookies.length, 'cookies for', partition)
    } catch (e) {
      console.error('[Cookie] auto-save failed for', partition, e)
    }
  }
  for (const [partition, webContentsId] of registry.entries()) {
    if (!partition) continue
    const target = webContents.fromId(webContentsId)
    if (target) {
      target.send('localstorage:dump-request', { partition })
      console.log('[localStorage] requested dump for', partition)
    }
  }
})

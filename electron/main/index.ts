import { app, BrowserWindow, ipcMain, session, net, globalShortcut } from 'electron'
import { join } from 'node:path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { initLogger, logReply, getReplyLogs, getReplyStats, updateReplyFeedback } from './reply-logger'
import { appendChatMessage, getChatHistory, clearChatHistory, searchChatHistory, exportChatHistory } from './chat-history-store'
import { exportConfig, importConfig } from './config-transfer'
import { initAutoUpdater } from './auto-updater'
import { setWebhookConfig, getWebhookConfig, sendWebhook } from './webhook-server'
import { scheduleMessage, cancelScheduledMessage, getScheduledMessages, runScheduler } from './scheduler'
import { saveCredential, loadCredential, deleteCredential } from './credential-store'
import { setSensitiveWords, checkSensitiveWords } from './sensitive-word-filter'
import { syncData, setCloudSyncConfig } from './cloud-sync'

// swallow EPIPE from broken dev-server pipes
for (const stream of [process.stdout, process.stderr]) {
  stream.on('error', (err: any) => {
    if (err.code === 'EPIPE') return
    throw err
  })
}

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('[Main] uncaughtException:', err)
})
process.on('unhandledRejection', (reason) => {
  console.error('[Main] unhandledRejection:', reason)
})

// 各 partition 的指纹配置
const fingerprintStore = new Map<string, any>()

const DATA_DIR = join(app.getPath('userData'), 'ping-chat-data')
const SESSIONS_FILE = join(DATA_DIR, 'sessions.json')
const CONFIG_FILE = join(DATA_DIR, 'config.json')
const COOKIE_DIR = join(DATA_DIR, 'cookies')
const LOCALSTORAGE_DIR = join(DATA_DIR, 'localstorage')
const webviewRegistry = new Map<string, number>() // partition -> webContentsId

function getPlatformFromPartition(partition: string): string | null {
  if (!partition) return null
  const match = partition.match(/^persist:([^/-]+)/)
  return match ? match[1] : null
}

function getPlatformBaseUrl(platform: string | null): string {
  switch (platform) {
    case 'wechat':
      return 'https://web.wechat.com'
    case 'xiaohongshu':
      return 'https://sxt.xiaohongshu.com'
    default:
      return 'https://xiaohongshu.com'
  }
}

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
}

function loadSessions(): any[] {
  ensureDataDir()
  try {
    if (existsSync(SESSIONS_FILE)) {
      const raw = readFileSync(SESSIONS_FILE, 'utf-8')
      return JSON.parse(raw)
    }
  } catch (e) {
    console.error('[SessionStore] load error:', e)
  }
  return []
}

function saveSessions(sessions: any[]): void {
  ensureDataDir()
  try {
    writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2))
  } catch (e) {
    console.error('[SessionStore] save error:', e)
  }
}

function loadConfig(): Record<string, any> {
  ensureDataDir()
  try {
    if (existsSync(CONFIG_FILE)) {
      return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'))
    }
  } catch (e) {
    console.error('[ConfigStore] load error:', e)
  }
  return {}
}

function saveConfig(config: Record<string, any>): void {
  ensureDataDir()
  try {
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
  } catch (e) {
    console.error('[ConfigStore] save error:', e)
  }
}

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
    webContents.openDevTools({ mode: 'detach' })

    // Crash recovery
    webContents.on('render-process-gone', (_event, details) => {
      console.error('[Main] webview render-process-gone:', details.reason, details.exitCode)
      setTimeout(() => {
        if (!webContents.isDestroyed()) {
          console.log('[Main] reloading crashed webview')
          webContents.reload()
        }
      }, 2000)
    })

    // Network error recovery
    webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (!isMainFrame) return
      // Ignore abort and redirect errors
      if (errorCode === -3 || errorCode === -1) return // -3 = ABORTED, -1 = CANCELED (redirects)
      console.error('[Main] webview did-fail-load:', errorCode, errorDescription, validatedURL)
      setTimeout(() => {
        if (!webContents.isDestroyed()) {
          console.log('[Main] reloading webview after failed load')
          webContents.reload()
        }
      }, 3000)
    })
  })

  // F12 toggles DevTools for the focused BrowserWindow
  globalShortcut.register('F12', () => {
    const focused = BrowserWindow.getFocusedWindow()
    if (focused) {
      focused.webContents.isDevToolsOpened()
        ? focused.webContents.closeDevTools()
        : focused.webContents.openDevTools({ mode: 'detach' })
    }
  })

  // Global shortcuts
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

  ipcMain.handle('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  ipcMain.handle('window:maximize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return
    if (window.isMaximized()) {
      window.unmaximize()
    } else {
      window.maximize()
    }
  })

  ipcMain.handle('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })

  /* ── Fingerprint / Proxy / Cookie IPC ── */
  ipcMain.handle('fingerprint:set', (_event, partition: string, config: any) => {
    fingerprintStore.set(partition, config)
    return true
  })

  ipcMain.handle('fingerprint:get', (_event, partition: string) => {
    return fingerprintStore.get(partition) ?? null
  })

  ipcMain.handle('proxy:set', async (_event, partition: string, config: any) => {
    const sess = session.fromPartition(partition)
    let proxyRules = 'direct://'
    if (config && config.protocol && config.protocol !== 'no-proxy' && config.host && config.port) {
      const auth = config.username ? `${encodeURIComponent(config.username)}:${encodeURIComponent(config.password)}@` : ''
      proxyRules = `${config.protocol}://${auth}${config.host}:${config.port}`
    }
    await sess.setProxy({ proxyRules })
    return true
  })

  ipcMain.handle('proxy:check', async (_event, config: any) => {
    const { protocol, host, port, username, password } = config || {}
    if (!protocol || protocol === 'no-proxy' || !host || !port) {
      return { ok: false, error: '代理配置不完整' }
    }
    const proxyUrl = username
      ? `${protocol}://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}`
      : `${protocol}://${host}:${port}`

    const tempPartition = `proxy-test-${Date.now()}`
    const tempSession = session.fromPartition(tempPartition)
    await tempSession.setProxy({ proxyRules: proxyUrl })

    const start = Date.now()
    return new Promise((resolve) => {
      const req = net.request({
        url: 'http://httpbin.org/ip',
        session: tempSession
      })
      req.on('response', (response) => {
        let data = ''
        response.on('data', (chunk) => { data += chunk })
        response.on('end', () => {
          try {
            const json = JSON.parse(data)
            resolve({ ok: true, ip: json.origin, latency: Date.now() - start })
          } catch {
            resolve({ ok: false, error: '响应解析失败' })
          }
        })
      })
      req.on('error', (err: any) => {
        resolve({ ok: false, error: err.message || '连接失败' })
      })
      req.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
      req.end()
      setTimeout(() => {
        req.abort()
        resolve({ ok: false, error: '请求超时 (10s)' })
      }, 10000)
    })
  })

  ipcMain.handle('cookie:set', async (_event, partition: string, cookieText: string) => {
    const sess = session.fromPartition(partition)
    const entries = cookieText.split(/;\s*/).map((s) => s.trim()).filter(Boolean)
    const platform = getPlatformFromPartition(partition)
    const url = getPlatformBaseUrl(platform)
    for (const entry of entries) {
      const eq = entry.indexOf('=')
      if (eq === -1) continue
      const name = entry.slice(0, eq).trim()
      const value = entry.slice(eq + 1).trim()
      if (!name) continue
      try {
        await sess.cookies.set({ url, name, value, path: '/' })
      } catch (e) {
        console.error('[Cookie] set failed:', name, e)
      }
    }
    return true
  })

  ipcMain.handle('cookie:save', async (_event, partition: string) => {
    const sess = session.fromPartition(partition)
    const cookies = await sess.cookies.get({})
    if (!existsSync(COOKIE_DIR)) mkdirSync(COOKIE_DIR, { recursive: true })
    const cookieFile = join(COOKIE_DIR, `${partition}.json`)
    writeFileSync(cookieFile, JSON.stringify(cookies, null, 2))
    console.log('[Cookie] saved', cookies.length, 'cookies for', partition)
    return { ok: true, count: cookies.length }
  })

  ipcMain.handle('cookie:load', async (_event, partition: string) => {
    const cookieFile = join(COOKIE_DIR, `${partition}.json`)
    if (!existsSync(cookieFile)) return { ok: false, error: 'no saved cookies', count: 0 }
    const raw = readFileSync(cookieFile, 'utf-8')
    const cookies = JSON.parse(raw)
    const sess = session.fromPartition(partition)
    let success = 0
    for (const c of cookies) {
      const domain = (c.domain || '').replace(/^\./, '')
      const urlsToTry = domain
        ? [`https://${domain}`, `http://${domain}`]
        : ['https://sxt.xiaohongshu.com', 'https://xiaohongshu.com', 'https://web.wechat.com']
      let set = false
      for (const url of urlsToTry) {
        try {
          await sess.cookies.set({
            url,
            name: c.name,
            value: c.value,
            domain: c.domain,
            path: c.path || '/',
            secure: c.secure,
            httpOnly: c.httpOnly,
            sameSite: c.sameSite,
            expirationDate: c.expirationDate,
          })
          set = true
          success++
          break
        } catch (e) {
          // try next url
        }
      }
      if (!set) {
        console.error('[Cookie] load failed for:', c.name, 'domain:', c.domain)
      }
    }
    console.log('[Cookie] loaded', success, '/', cookies.length, 'cookies for', partition)
    return { ok: true, count: success }
  })

  // ── localStorage persistence ──
  ipcMain.on('localstorage:dump', (_event, payload: { partition: string; data: Record<string, string> }) => {
    try {
      if (!existsSync(LOCALSTORAGE_DIR)) mkdirSync(LOCALSTORAGE_DIR, { recursive: true })
      const file = join(LOCALSTORAGE_DIR, `${payload.partition}.json`)
      writeFileSync(file, JSON.stringify(payload.data, null, 2))
      console.log('[localStorage] saved', Object.keys(payload.data).length, 'items for', payload.partition)
    } catch (e) {
      console.error('[localStorage] save failed:', e)
    }
  })

  ipcMain.on('localstorage:request-restore', (event, payload: { partition: string }) => {
    try {
      const file = join(LOCALSTORAGE_DIR, `${payload.partition}.json`)
      if (!existsSync(file)) return
      const data = JSON.parse(readFileSync(file, 'utf-8'))
      event.sender.send('localstorage:restore', { partition: payload.partition, data })
      console.log('[localStorage] sent restore for', payload.partition, Object.keys(data).length, 'items')
    } catch (e) {
      console.error('[localStorage] restore failed:', e)
    }
  })

  ipcMain.handle('sessions:load', () => loadSessions())
  ipcMain.handle('sessions:save', (_event, sessions: any[]) => {
    saveSessions(sessions)
    return true
  })

  ipcMain.handle('config:get', (_event, key: string) => {
    const config = loadConfig()
    return config[key] ?? null
  })

  ipcMain.handle('config:set', (_event, key: string, value: any) => {
    const config = loadConfig()
    config[key] = value
    saveConfig(config)
    return true
  })

  ipcMain.handle('config:getAll', () => {
    return loadConfig()
  })

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

  ipcMain.handle('config:export', () => exportConfig(DATA_DIR))
  ipcMain.handle('config:import', () => importConfig(DATA_DIR))

  /* ── Auto Reply IPC relay ── */
  ipcMain.handle('chat:register', (event, partition: string) => {
    webviewRegistry.set(partition, event.sender.id)
  })

  ipcMain.on('chat:message', (event, payload: { partition: string; sender: string; content: string; isFromUser: boolean; timestamp: number }) => {
    // Persist message to store
    appendChatMessage(payload.partition, payload)
    // Send webhook
    void sendWebhook('chat:message', payload)
    // Cloud sync
    void syncData(payload.partition, payload)
    // Forward to main renderer window
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.webContents.send('chat:message', payload)
    }
  })

  ipcMain.on('chat:recall', (event, payload: { partition: string; sender: string; content: string; timestamp: number }) => {
    void sendWebhook('chat:recall', payload)
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.webContents.send('chat:recall', payload)
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

  ipcMain.on('chat:history', (_event, payload: { partition: string; history: Array<{ sender: string; content: string; isFromUser: boolean; timestamp: number }> }) => {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.webContents.send('chat:history', payload)
    }
  })

  ipcMain.on('chat:stats', (_event, payload: { partition: string; totalCount: number; groupCount: number; userCount: number; totalUnread: number; contacts: Array<{ name: string; isGroup: boolean; unread: number }>; unreadContacts: Array<{ name: string; isGroup: boolean; unread: number }> }) => {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.webContents.send('chat:stats', payload)
    }
  })

  ipcMain.on('chat:contact-clicked', (_event, payload: { partition: string; name: string; avatar?: string }) => {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.webContents.send('chat:contact-clicked', payload)
    }
  })

  ipcMain.handle('chat:reply', (_event, partition: string, content: string, autoSend?: boolean) => {
    console.log('[Main] chat:reply received', partition, content.slice(0, 30), 'autoSend:', autoSend)
    let webContentsId = webviewRegistry.get(partition)
    if (!webContentsId) webContentsId = webviewRegistry.get('') // guest page partition fallback
    console.log('[Main] target webContentsId:', webContentsId, 'registry keys:', [...webviewRegistry.keys()])
    if (!webContentsId) return false
    const target = require('electron').webContents.fromId(webContentsId)
    if (!target) return false
    target.send('chat:reply', { partition, content, autoSend })
    console.log('[Main] sent chat:reply to webview')
    return true
  })

  ipcMain.handle('chat:select', (_event, partition: string, contactName: string) => {
    let webContentsId = webviewRegistry.get(partition)
    if (!webContentsId) webContentsId = webviewRegistry.get('')
    if (!webContentsId) return false
    const target = require('electron').webContents.fromId(webContentsId)
    if (!target) return false
    target.send('chat:select', { partition, contactName })
    return true
  })

  ipcMain.handle('chat:monitor', (_event, partition: string, enabled: boolean) => {
    let webContentsId = webviewRegistry.get(partition)
    if (!webContentsId) webContentsId = webviewRegistry.get('')
    if (!webContentsId) return false
    const target = require('electron').webContents.fromId(webContentsId)
    if (!target) return false
    target.send('chat:monitor', { partition: '', enabled })
    return true
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
    const webviewId = webviewRegistry.get(partition)
    if (webviewId) {
      const wc = BrowserWindow.fromId(webviewId)?.webContents
      wc?.send('chat:scheduled-send', { partition, content, autoSend })
    }
  })
}

// IPC handlers for webhook and scheduler
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

// Credential store IPC handlers
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

ipcMain.handle('app:get-version', () => app.getVersion())

// Auto-save cookies + localStorage for all active webview partitions before quit
app.on('before-quit', async () => {
  const partitions = [...webviewRegistry.keys()].filter(Boolean)
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
  // Request localStorage dump from each webview before quitting
  for (const [partition, webContentsId] of webviewRegistry.entries()) {
    if (!partition) continue
    const target = require('electron').webContents.fromId(webContentsId)
    if (target) {
      target.send('localstorage:dump-request', { partition })
      console.log('[localStorage] requested dump for', partition)
    }
  }
})

import { app, BrowserWindow, ipcMain, session, net } from 'electron'
import { join } from 'node:path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'

// 各 partition 的指纹配置
const fingerprintStore = new Map<string, any>()

const DATA_DIR = join(app.getPath('userData'), 'ping-chat-data')
const SESSIONS_FILE = join(DATA_DIR, 'sessions.json')

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
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
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
    const url = `https://xiaohongshu.com` // generic fallback
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

  ipcMain.handle('sessions:load', () => loadSessions())
  ipcMain.handle('sessions:save', (_event, sessions: any[]) => {
    saveSessions(sessions)
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

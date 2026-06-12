import { ipcMain, session } from 'electron'
import { join } from 'node:path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { getPlatformBaseUrl, getPlatformIdFromPartition } from '../../../src/shared/platforms'
import {
  DATA_DIR,
  COOKIE_DIR,
  LOCALSTORAGE_DIR,
  loadSessions,
  saveSessions,
  loadConfig,
  saveConfig,
} from '../data-store'

const fingerprintStore = new Map<string, any>()

export function registerSessionIpc(): void {
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

  ipcMain.handle('cookie:set', async (_event, partition: string, cookieText: string) => {
    const sess = session.fromPartition(partition)
    const entries = cookieText.split(/;\s*/).map((s) => s.trim()).filter(Boolean)
    const platform = getPlatformIdFromPartition(partition)
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
        } catch {
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

  ipcMain.handle('config:export', () => {
    const { exportConfig } = require('../config-transfer')
    return exportConfig(DATA_DIR)
  })

  ipcMain.handle('config:import', () => {
    const { importConfig } = require('../config-transfer')
    return importConfig(DATA_DIR)
  })
}

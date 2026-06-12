import { dialog, BrowserWindow } from 'electron'
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

export async function exportConfig(dataDir: string): Promise<{ ok: boolean; path?: string; error?: string }> {
  const win = BrowserWindow.getFocusedWindow()
  if (!win) return { ok: false, error: 'no window' }

  const { filePath } = await dialog.showSaveDialog(win, {
    defaultPath: `ping-chat-config-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  })
  if (!filePath) return { ok: false, error: 'cancelled' }

  try {
    const config: Record<string, any> = {}

    // sessions
    const sessionsFile = join(dataDir, 'sessions.json')
    if (existsSync(sessionsFile)) {
      config.sessions = JSON.parse(readFileSync(sessionsFile, 'utf-8'))
    }

    // general config
    const configFile = join(dataDir, 'config.json')
    if (existsSync(configFile)) {
      config.settings = JSON.parse(readFileSync(configFile, 'utf-8'))
    }

    // cookies
    const cookieDir = join(dataDir, 'cookies')
    if (existsSync(cookieDir)) {
      config.cookies = {}
      for (const file of readdirSync(cookieDir)) {
        if (file.endsWith('.json')) {
          config.cookies[file.replace('.json', '')] = JSON.parse(readFileSync(join(cookieDir, file), 'utf-8'))
        }
      }
    }

    // localstorage
    const lsDir = join(dataDir, 'localstorage')
    if (existsSync(lsDir)) {
      config.localstorage = {}
      for (const file of readdirSync(lsDir)) {
        if (file.endsWith('.json')) {
          config.localstorage[file.replace('.json', '')] = JSON.parse(readFileSync(join(lsDir, file), 'utf-8'))
        }
      }
    }

    writeFileSync(filePath, JSON.stringify(config, null, 2))
    return { ok: true, path: filePath }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

export async function importConfig(dataDir: string): Promise<{ ok: boolean; error?: string }> {
  const win = BrowserWindow.getFocusedWindow()
  if (!win) return { ok: false, error: 'no window' }

  const { filePaths } = await dialog.showOpenDialog(win, {
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  })
  if (!filePaths || filePaths.length === 0) return { ok: false, error: 'cancelled' }

  try {
    const raw = readFileSync(filePaths[0], 'utf-8')
    const config = JSON.parse(raw)

    if (config.sessions) {
      writeFileSync(join(dataDir, 'sessions.json'), JSON.stringify(config.sessions, null, 2))
    }
    if (config.settings) {
      writeFileSync(join(dataDir, 'config.json'), JSON.stringify(config.settings, null, 2))
    }
    if (config.cookies) {
      const cookieDir = join(dataDir, 'cookies')
      if (!existsSync(cookieDir)) mkdirSync(cookieDir, { recursive: true })
      for (const [partition, cookies] of Object.entries(config.cookies)) {
        writeFileSync(join(cookieDir, `${partition}.json`), JSON.stringify(cookies, null, 2))
      }
    }
    if (config.localstorage) {
      const lsDir = join(dataDir, 'localstorage')
      if (!existsSync(lsDir)) mkdirSync(lsDir, { recursive: true })
      for (const [partition, data] of Object.entries(config.localstorage)) {
        writeFileSync(join(lsDir, `${partition}.json`), JSON.stringify(data, null, 2))
      }
    }

    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

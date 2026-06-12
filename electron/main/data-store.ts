import { join } from 'node:path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { app } from 'electron'

export const DATA_DIR = join(app.getPath('userData'), 'ping-chat-data')
export const SESSIONS_FILE = join(DATA_DIR, 'sessions.json')
export const CONFIG_FILE = join(DATA_DIR, 'config.json')
export const COOKIE_DIR = join(DATA_DIR, 'cookies')
export const LOCALSTORAGE_DIR = join(DATA_DIR, 'localstorage')

export function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
}

export function loadSessions(): any[] {
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

export function saveSessions(sessions: any[]): void {
  ensureDataDir()
  try {
    writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2))
  } catch (e) {
    console.error('[SessionStore] save error:', e)
  }
}

export function loadConfig(): Record<string, any> {
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

export function saveConfig(config: Record<string, any>): void {
  ensureDataDir()
  try {
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
  } catch (e) {
    console.error('[ConfigStore] save error:', e)
  }
}

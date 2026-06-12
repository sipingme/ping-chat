import { safeStorage } from 'electron'
import { join } from 'node:path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { app } from 'electron'

const CREDENTIALS_DIR = join(app.getPath('userData'), 'credentials')

function ensureDir(): void {
  if (!existsSync(CREDENTIALS_DIR)) {
    mkdirSync(CREDENTIALS_DIR, { recursive: true })
  }
}

function getPath(key: string): string {
  return join(CREDENTIALS_DIR, `${key}.enc`)
}

export function saveCredential(key: string, plainText: string): boolean {
  if (!safeStorage.isEncryptionAvailable()) {
    console.warn('[CredentialStore] Encryption not available, falling back to plain text')
    ensureDir()
    writeFileSync(getPath(key), plainText, 'utf-8')
    return false
  }
  ensureDir()
  const encrypted = safeStorage.encryptString(plainText)
  writeFileSync(getPath(key), encrypted)
  return true
}

export function loadCredential(key: string): string | null {
  const path = getPath(key)
  if (!existsSync(path)) return null
  const data = readFileSync(path)
  if (!safeStorage.isEncryptionAvailable()) {
    return data.toString('utf-8')
  }
  try {
    return safeStorage.decryptString(data)
  } catch (err) {
    console.error('[CredentialStore] Decrypt failed:', err)
    return null
  }
}

export function deleteCredential(key: string): void {
  const path = getPath(key)
  if (existsSync(path)) {
    const { unlinkSync } = require('node:fs')
    unlinkSync(path)
  }
}

import { join } from 'node:path'
import { appendFileSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'

export interface ReplyLogEntry {
  id: string
  timestamp: number
  partition: string
  platform: string
  contact: string
  content: string
  type: 'ai' | 'manual' | 'keyword' | 'quick'
  success: boolean
  error?: string
  model?: string
  latencyMs?: number
  feedback?: 'up' | 'down'
}

let logFilePath = ''
let statsFilePath = ''

export function initLogger(dataDir: string): void {
  logFilePath = join(dataDir, 'reply-log.jsonl')
  statsFilePath = join(dataDir, 'reply-stats.json')
}

export function logReply(entry: Omit<ReplyLogEntry, 'id'>): ReplyLogEntry {
  const fullEntry: ReplyLogEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  }
  const line = JSON.stringify(fullEntry) + '\n'
  try {
    appendFileSync(logFilePath, line)
  } catch (e) {
    console.error('[ReplyLogger] failed to write log:', e)
  }
  updateStats(fullEntry)
  return fullEntry
}

interface DailyStats {
  date: string
  total: number
  success: number
  failed: number
  ai: number
  manual: number
  keyword: number
  quick: number
  byPlatform: Record<string, number>
  byContact: Record<string, number>
}

interface StatsData {
  lastUpdated: number
  daily: DailyStats[]
  allTime: {
    total: number
    success: number
    failed: number
    ai: number
    manual: number
    keyword: number
    quick: number
  }
}

function updateStats(entry: ReplyLogEntry): void {
  let stats: StatsData = {
    lastUpdated: Date.now(),
    daily: [],
    allTime: { total: 0, success: 0, failed: 0, ai: 0, manual: 0, keyword: 0, quick: 0 },
  }
  if (existsSync(statsFilePath)) {
    try {
      stats = JSON.parse(readFileSync(statsFilePath, 'utf-8')) as StatsData
    } catch {
      // ignore corrupt stats
    }
  }

  const date = new Date(entry.timestamp).toISOString().slice(0, 10)
  let day = stats.daily.find((d) => d.date === date)
  if (!day) {
    day = {
      date,
      total: 0,
      success: 0,
      failed: 0,
      ai: 0,
      manual: 0,
      keyword: 0,
      quick: 0,
      byPlatform: {},
      byContact: {},
    }
    stats.daily.push(day)
  }

  day.total++
  if (entry.success) day.success++
  else day.failed++
  day[entry.type]++
  day.byPlatform[entry.platform] = (day.byPlatform[entry.platform] || 0) + 1
  day.byContact[entry.contact] = (day.byContact[entry.contact] || 0) + 1

  stats.allTime.total++
  if (entry.success) stats.allTime.success++
  else stats.allTime.failed++
  stats.allTime[entry.type]++
  stats.lastUpdated = Date.now()

  try {
    writeFileSync(statsFilePath, JSON.stringify(stats, null, 2))
  } catch (e) {
    console.error('[ReplyLogger] failed to write stats:', e)
  }
}

export function getReplyLogs(options?: { limit?: number; since?: number; partition?: string }): ReplyLogEntry[] {
  if (!existsSync(logFilePath)) return []
  try {
    const lines = readFileSync(logFilePath, 'utf-8').split('\n').filter(Boolean)
    const entries = lines.map((line) => JSON.parse(line) as ReplyLogEntry)
    let filtered = entries
    if (options?.since) {
      filtered = filtered.filter((e) => e.timestamp >= options.since!)
    }
    if (options?.partition) {
      filtered = filtered.filter((e) => e.partition === options.partition)
    }
    if (options?.limit) {
      filtered = filtered.slice(-options.limit)
    }
    return filtered
  } catch (e) {
    console.error('[ReplyLogger] failed to read logs:', e)
    return []
  }
}

export function updateReplyFeedback(id: string, feedback: 'up' | 'down'): boolean {
  if (!existsSync(logFilePath)) return false
  try {
    const lines = readFileSync(logFilePath, 'utf-8').split('\n').filter(Boolean)
    let found = false
    const updated = lines.map((line) => {
      const entry = JSON.parse(line) as ReplyLogEntry
      if (entry.id === id) {
        found = true
        entry.feedback = feedback
      }
      return JSON.stringify(entry)
    })
    if (found) {
      writeFileSync(logFilePath, updated.join('\n') + '\n')
    }
    return found
  } catch (e) {
    console.error('[ReplyLogger] failed to update feedback:', e)
    return false
  }
}

export function getReplyStats(): StatsData | null {
  if (!existsSync(statsFilePath)) return null
  try {
    return JSON.parse(readFileSync(statsFilePath, 'utf-8')) as StatsData
  } catch {
    return null
  }
}

/**
 * Structured logger with timestamp + level + module tagging.
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: number
  level: LogLevel
  module: string
  message: string
  data?: unknown
}

function formatEntry(entry: LogEntry): string {
  const iso = new Date(entry.timestamp).toISOString()
  return `[${iso}] [${entry.level.toUpperCase()}] [${entry.module}] ${entry.message}`
}

function createLogger(module: string) {
  function log(level: LogLevel, message: string, data?: unknown): void {
    const entry: LogEntry = { timestamp: Date.now(), level, module, message, data }
    const formatted = formatEntry(entry)
    switch (level) {
      case 'debug':
        console.debug(formatted, data ?? '')
        break
      case 'info':
        console.log(formatted, data ?? '')
        break
      case 'warn':
        console.warn(formatted, data ?? '')
        break
      case 'error':
        console.error(formatted, data ?? '')
        break
    }
  }

  return {
    debug: (msg: string, data?: unknown) => log('debug', msg, data),
    info: (msg: string, data?: unknown) => log('info', msg, data),
    warn: (msg: string, data?: unknown) => log('warn', msg, data),
    error: (msg: string, data?: unknown) => log('error', msg, data),
  }
}

export { createLogger }
export type { LogLevel, LogEntry }

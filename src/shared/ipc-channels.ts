import type { ChatSession, AutoReplyConfig, ChatStats } from '../renderer/src/types'

/**
 * Type-safe IPC channel definitions.
 *
 * Each entry maps a channel name to { payload, response } or { payload } for events.
 * 'handle' channels: invoke → handle (request-response)
 * 'event' channels: send → on (fire-and-forget, renderer listens)
 * 'main-event' channels: main process sends to renderer (renderer listens)
 */

export interface ChatMessagePayload {
  partition: string
  sender: string
  content: string
  isFromUser: boolean
  timestamp: number
  isGroup?: boolean
}

export interface ChatHistoryEntry {
  sender: string
  content: string
  isFromUser: boolean
  timestamp: number
  isGroup?: boolean
}

export interface ReplyLogEntry {
  timestamp: number
  partition: string
  platform: string
  contact: string
  content: string
  type: 'ai' | 'keyword' | 'manual'
  success: boolean
  error?: string
  model?: string
}

export interface FingerprintConfig {
  userAgent?: string
  os?: string
  geolocation?: 'ask' | 'allow' | 'disable'
  webrtc?: 'replace' | 'allow' | 'disable'
  canvas?: boolean
  audioContext?: boolean
  hardwareConcurrency?: string
  deviceMemory?: string
  resolution?: string
  timezone?: string
  proxyHost?: string
  proxyPort?: string
  hideWebdriver?: boolean
  enableChromeObj?: boolean
  fakePlugins?: boolean
  fakeOuterSize?: boolean
}

export interface ProxyConfig {
  protocol: 'no-proxy' | 'http' | 'https' | 'socks5'
  host: string
  port: string
  username: string
  password: string
}

/* ── Handle channels (invoke → handle) ── */
export interface HandleChannels {
  /* Window */
  'window:minimize': { payload: void; response: void }
  'window:maximize': { payload: void; response: void }
  'window:close': { payload: void; response: void }

  /* Fingerprint */
  'fingerprint:set': { payload: { partition: string; config: FingerprintConfig }; response: boolean }
  'fingerprint:get': { payload: { partition: string }; response: FingerprintConfig | null }

  /* Proxy */
  'proxy:set': { payload: { partition: string; config: ProxyConfig }; response: boolean }
  'proxy:check': { payload: { config: ProxyConfig }; response: { ok: boolean; error?: string; ip?: string; latency?: number } }

  /* Cookie */
  'cookie:set': { payload: { partition: string; cookieText: string }; response: boolean }
  'cookie:save': { payload: { partition: string }; response: { ok: boolean; count: number } }
  'cookie:load': { payload: { partition: string }; response: { ok: boolean; count: number; error?: string } }

  /* Sessions */
  'sessions:load': { payload: void; response: ChatSession[] }
  'sessions:save': { payload: { sessions: ChatSession[] }; response: boolean }

  /* Config */
  'config:get': { payload: { key: string }; response: unknown }
  'config:set': { payload: { key: string; value: unknown }; response: boolean }
  'config:getAll': { payload: void; response: Record<string, unknown> }
  'config:export': { payload: void; response: string | null }
  'config:import': { payload: void; response: boolean }

  /* Reply */
  'reply:log': { payload: ReplyLogEntry; response: { id: string } | null }
  'reply:list': { payload: { limit?: number; partition?: string } | undefined; response: Array<ReplyLogEntry & { id: string }> }
  'reply:stats': { payload: void; response: { total: number; success: number; failed: number; today: number } }
  'reply:feedback': { payload: { id: string; feedback: 'up' | 'down' }; response: boolean }

  /* Update */
  'update:check': { payload: void; response: { hasUpdate: boolean; version?: string } }
  'update:download': { payload: void; response: boolean }
  'update:install': { payload: void; response: void }

  /* App */
  'app:get-version': { payload: void; response: string }

  /* Chat */
  'chat:register': { payload: void; response: string }
  'chat:reply': { payload: { partition: string; content: string; autoSend?: boolean }; response: boolean }
  'chat:select': { payload: { partition: string; contactName: string }; response: boolean }
  'chat:monitor': { payload: { partition: string; enabled: boolean }; response: boolean }
  'chat:history:get': { payload: { partition: string; limit?: number }; response: ChatHistoryEntry[] }
  'chat:history:clear': { payload: { partition: string }; response: boolean }
  'chat:history:search': { payload: { partition: string; options: { keyword?: string; sender?: string; startTime?: number; endTime?: number; limit?: number } }; response: ChatHistoryEntry[] }
  'chat:history:export': { payload: { partition: string; format: 'json' | 'csv' }; response: string }

  /* Scheduler */
  'scheduler:add': { payload: { partition: string; content: string; delayMs: number; autoSend?: boolean }; response: { id: string } }
  'scheduler:cancel': { payload: { id: string }; response: boolean }
  'scheduler:list': { payload: { partition?: string } | undefined; response: Array<{ id: string; partition: string; content: string; autoSend: boolean; triggerAt: number }> }

  /* Credential */
  'credential:save': { payload: { key: string; value: string }; response: boolean }
  'credential:load': { payload: { key: string }; response: string | null }
  'credential:delete': { payload: { key: string }; response: boolean }

  /* Sensitive Words */
  'sensitive-words:set': { payload: { words: string[] }; response: boolean }
  'sensitive-words:check': { payload: { text: string }; response: { blocked: boolean; word?: string } }

  /* Cloud Sync */
  'cloud-sync:set': { payload: { url: string; apiKey: string; enabled: boolean }; response: boolean }

  /* Webhook */
  'webhook:set': { payload: { url: string; enabled: boolean }; response: boolean }
  'webhook:get': { payload: void; response: { url: string; enabled: boolean } }
}

/* ── Event channels (send → on / main → renderer) ── */
export interface EventChannels {
  'chat:message': ChatMessagePayload
  'chat:stats': ChatStats
  'chat:recall': { partition: string; sender: string; content: string; originalContent: string; timestamp: number }
  'chat:history': { partition: string; history: ChatHistoryEntry[] }
  'chat:contact-clicked': { partition: string; name: string; avatar?: string }
  'chat:scheduled-send': { partition: string; content: string; autoSend: boolean }

  'webview:set-partition': { wcId: number; partition: string }

  'shortcut:toggle-auto-reply': void
  'shortcut:new-session': void

  'localstorage:dump': { partition: string; data: Record<string, string> }
  'localstorage:request-restore': { partition: string }
  'localstorage:restore': { partition: string; data: Record<string, string> }
  'localstorage:dump-request': { partition: string }

  'update:available': { version: string }
  'update:downloaded': { version: string }
  'update:error': { message: string }
  'update:progress': { percent: number }
}

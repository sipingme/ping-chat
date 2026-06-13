import { ipcRenderer } from 'electron'
import type { PlatformAdapter, ChatMessagePayload } from './adapter'
import { wechatAdapter } from './wechat-adapter'
import { xiaohongshuAdapter } from './xiaohongshu-adapter'

const adapters = [wechatAdapter, xiaohongshuAdapter]

export function startAutoReplyScraper(partition: string): void {
  let monitoringEnabled = false
  try {
    const adapter: PlatformAdapter | undefined = adapters.find((a) => a.detect())
    if (!adapter) {
      console.log('[ChatStats] no platform adapter matched for', window.location.hostname)
      return
    }
    console.log('[ChatStats] using adapter:', adapter.name)

    monitoringEnabled = true
    void adapter.extractChatListStats(partition).then((stats: any) => {
      console.log('[ChatStats] initial scan', stats)
      if (stats) {
        ipcRenderer.send('chat:stats', stats)
      }
    })

    /* ── localStorage persistence ──────────────────────── */
    function dumpLocalStorage(): void {
      const data: Record<string, string> = {}
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i)
        if (key) data[key] = window.localStorage.getItem(key) || ''
      }
      ipcRenderer.send('localstorage:dump', { partition, data })
    }

    ipcRenderer.send('localstorage:request-restore', { partition })

    ipcRenderer.on('localstorage:restore', (_event, payload: { partition: string; data: Record<string, string> }) => {
      if (payload.partition !== partition) return
      Object.entries(payload.data).forEach(([key, value]) => {
        window.localStorage.setItem(key, value)
      })
      console.log('[localStorage] restored', Object.keys(payload.data).length, 'items')
    })

    ipcRenderer.on('localstorage:dump-request', (_event, payload: { partition: string }) => {
      if (payload.partition !== partition) return
      dumpLocalStorage()
    })

    /* ── Unified polling scheduler ───────────────────── */
    let pollTick = 0
    const POLL_INTERVAL_MS = 5000
    const LS_DUMP_INTERVAL_TICKS = 6 // 6 × 5s = 30s

    const pollTimer = setInterval(() => {
      pollTick++

      // Chat history extraction (every tick)
      const history = adapter.extractAllMessages(partition)
      ipcRenderer.send('chat:history', { partition, history })

      // Chat list stats (every tick, only when monitoring is enabled)
      if (monitoringEnabled) {
        void adapter.extractChatListStats(partition).then((stats: any) => {
          if (stats) ipcRenderer.send('chat:stats', stats)
        })
      }

      // localStorage dump (every 6 ticks = 30s)
      if (pollTick % LS_DUMP_INTERVAL_TICKS === 0) {
        dumpLocalStorage()
      }
    }, POLL_INTERVAL_MS)

    adapter.onPageReady?.()

    /* ── Contact click tracking ────────────────────────── */
    let suppressProgrammaticClick = false
    let suppressClickTimeout: ReturnType<typeof setTimeout> | null = null

    document.addEventListener('click', (e) => {
      if (suppressProgrammaticClick) {
        suppressProgrammaticClick = false
        console.log('[ChatStats] suppressed programmatic click for', e.target)
        return
      }
      if (!e.isTrusted) {
        console.log('[ChatStats] ignored non-trusted click for', e.target)
        return
      }
      const target = e.target as HTMLElement
      let chatItem: Element | null = target?.closest?.(adapter.chatItemSelector) ?? null
      if (!chatItem) {
        let el: Element | null = target
        while (el && el !== document.body) {
          const contact = adapter.extractContactFromElement(el)
          if (contact) { chatItem = el; break }
          el = el.parentElement
        }
      }
      if (!chatItem) return

      const contact = adapter.extractContactFromElement(chatItem)
      if (!contact) return

      const { name, avatarUrl } = contact
      console.log('[ChatStats] click on:', name, 'avatarUrl:', avatarUrl?.slice(0, 80))

      if (avatarUrl) {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas')
            canvas.width = img.naturalWidth || 64
            canvas.height = img.naturalHeight || 64
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.drawImage(img, 0, 0)
              const base64 = canvas.toDataURL('image/png')
              ipcRenderer.send('chat:contact-clicked', { partition, name, avatar: base64 })
            }
          } catch (err) {
            ipcRenderer.send('chat:contact-clicked', { partition, name, avatar: avatarUrl })
          }
        }
        img.onerror = () => {
          ipcRenderer.send('chat:contact-clicked', { partition, name, avatar: avatarUrl })
        }
        img.src = avatarUrl
      } else {
        ipcRenderer.send('chat:contact-clicked', { partition, name, avatar: '' })
      }
    })

    /* ── IPC listeners delegated to adapter ───────────── */
    ipcRenderer.on('chat:select', (_event, payload: { partition: string; contactName: string }) => {
      console.log('[ChatStats] selectChat request for:', payload.contactName)
      suppressProgrammaticClick = true
      if (suppressClickTimeout) clearTimeout(suppressClickTimeout)
      suppressClickTimeout = setTimeout(() => { suppressProgrammaticClick = false }, 5000)
      const result = adapter.selectChat(payload.contactName)
      if (result && typeof (result as any).finally === 'function') {
        (result as Promise<boolean>).finally(() => {
          if (suppressClickTimeout) clearTimeout(suppressClickTimeout)
          suppressClickTimeout = setTimeout(() => { suppressProgrammaticClick = false }, 500)
        })
      } else {
        if (suppressClickTimeout) clearTimeout(suppressClickTimeout)
        suppressClickTimeout = setTimeout(() => { suppressProgrammaticClick = false }, 500)
      }
    })

    ipcRenderer.on('chat:reply', (_event, payload: { partition: string; content: string; autoSend?: boolean }) => {
      adapter.sendReply(payload.content, payload.autoSend !== false)
    })

    /* ── Message monitoring ────────────────────────────── */
    setTimeout(() => {
      const msgs = adapter.extractMessages(partition)
      msgs.forEach((m) => ipcRenderer.send('chat:message', m))
    }, 3000)

    const messageCache = new Map<string, { sender: string; content: string; timestamp: number }>()
    function getCacheKey(sender: string, content: string): string {
      return `${sender}:${content}`
    }

    const observer = new MutationObserver((mutations) => {
      const addedNodes: Node[] = []
      for (const mut of mutations) {
        if (mut.type === 'childList') {
          mut.addedNodes.forEach((node) => addedNodes.push(node))
        }
      }

      let newMsgs: ChatMessagePayload[] = []
      if (adapter.extractMessagesFromNodes) {
        newMsgs = adapter.extractMessagesFromNodes(partition, addedNodes)
      }
      if (newMsgs.length === 0 && addedNodes.length > 0) {
        newMsgs = adapter.extractMessages(partition)
      }
      newMsgs.forEach((m) => {
        ipcRenderer.send('chat:message', m)
        messageCache.set(getCacheKey(m.sender, m.content), { sender: m.sender, content: m.content, timestamp: m.timestamp })
      })

      for (const mut of mutations) {
        if (mut.type === 'childList') continue
        const target = mut.target as HTMLElement | null
        if (!target) continue
        const text = target.textContent || ''
        if (text.includes('撤回') || text.includes('recalled') || text.includes('已撤回')) {
          const msgEl = target.closest('.message, .im-msg-item, .msg')
          if (msgEl) {
            const name = msgEl.querySelector('.nickname, .nickname_text, .user-name')?.textContent || 'unknown'
            let originalContent = ''
            for (const [key, value] of messageCache) {
              if (key.startsWith(`${name}:`)) {
                originalContent = value.content
                break
              }
            }
            ipcRenderer.send('chat:recall', { partition, sender: name, content: text, originalContent, timestamp: Date.now() })
          }
        }
      }
    })
    const msgContainer = document.querySelector(adapter.messageContainerSelector) || document.body
    observer.observe(msgContainer, { childList: true, subtree: true, characterData: true })

    /* ── Chat list stats scraper ──────────────────────── */
    ipcRenderer.on('chat:monitor', (_event, payload: { partition: string; enabled: boolean }) => {
      monitoringEnabled = payload.enabled
      console.log('[ChatStats] monitoring enabled =', monitoringEnabled)
      if (monitoringEnabled) {
        void adapter.extractChatListStats(partition).then((stats: any) => {
          console.log('[ChatStats] immediate scan', stats)
          if (stats) {
            ipcRenderer.send('chat:stats', stats)
          }
        })
      }
    })
  } catch (e) {
    console.error('[AutoReply] scraper init error:', e)
  }
}

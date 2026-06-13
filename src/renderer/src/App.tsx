import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { PLATFORMS } from '../../shared/platforms'
import type {
  ChatMessage,
  ChatSession,
  FingerprintSettings,
  Platform,
  ProxyConfig,
} from './types'
import { buildSystemPrompt, generateRandomFingerprint, interpolateTemplateVars } from './config/defaults'
import { initLocale, setLocale, t } from './i18n'
import { useTranslation } from './i18n/useTranslation'
import { useSensitiveWords } from './hooks/useSensitiveWords'
import { handleCommand } from './utils/commandHandler'
import { pluginManager } from './utils/pluginManager'
import { translateText } from './utils/translate'
import { useAppStore } from './store/appStore'
import { TitleBar } from './components/TitleBar'
import { PlatformSidebar } from './components/PlatformSidebar'
import { ConversationSidebar } from './components/ConversationSidebar'
import { MainPanel } from './components/MainPanel'
import { RightToolBar } from './components/RightToolBar'
import { ErrorBoundary } from './components/ErrorBoundary'

const ProxyEnvironmentPanel = lazy(() => import('./panels/ProxyEnvironmentPanel').then(m => ({ default: m.ProxyEnvironmentPanel })))
const AutoReplyPanel = lazy(() => import('./panels/AutoReplyPanel').then(m => ({ default: m.AutoReplyPanel })))
const UpdatePanel = lazy(() => import('./panels/UpdatePanel').then(m => ({ default: m.UpdatePanel })))

function XhsIcon(): JSX.Element {
  return <span className="text-icon xhs">红</span>
}

const platformIcons: Record<string, JSX.Element> = {
  xiaohongshu: <span className="text-icon xhs">红</span>,
  wechat: <MessageCircle size={17} />,
}

const platforms: Platform[] = PLATFORMS.map((p) => ({
  id: p.id,
  name: p.name,
  shortName: p.shortName,
  icon: platformIcons[p.id] ?? <span className="text-icon">{p.shortName}</span>,
  accent: p.accent,
}))

initLocale()

export function App(): JSX.Element {
  const activePlatformId = useAppStore((s) => s.activePlatformId)
  const setActivePlatformId = useAppStore((s) => s.setActivePlatformId)
  const sessions = useAppStore((s) => s.sessions)
  const setSessions = useAppStore((s) => s.setSessions)
  const updateSession = useAppStore((s) => s.updateSession)
  const activeSessionId = useAppStore((s) => s.activeSessionId)
  const setActiveSessionId = useAppStore((s) => s.setActiveSessionId)
  const loaded = useAppStore((s) => s.loaded)
  const setLoaded = useAppStore((s) => s.setLoaded)
  const setChatStats = useAppStore((s) => s.setChatStats)
  const getChatStats = useAppStore((s) => s.getChatStats)
  const getChatMessages = useAppStore((s) => s.getChatMessages)
  const appendChatMessage = useAppStore((s) => s.appendChatMessage)
  const clearChatMessages = useAppStore((s) => s.clearChatMessages)
  const setAutoReplyGlobalGenerating = useAppStore((s) => s.setAutoReplyGlobalGenerating)
  const setAutoReplyGlobalError = useAppStore((s) => s.setAutoReplyGlobalError)

  const [activeRightTool, setActiveRightTool] = useState('')
  const [webviewReloadKey, setWebviewReloadKey] = useState(0)
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>(() => {
    const saved = localStorage.getItem('ping-chat-theme') as 'dark' | 'light' | 'system' | null
    return saved ?? 'dark'
  })
  const [locale, setLocaleState] = useState<'zh' | 'en'>(() => {
    const saved = localStorage.getItem('ping-chat-locale') as 'zh' | 'en' | null
    return saved ?? 'zh'
  })
  const { t } = useTranslation()

  const handleToggleTheme = (): void => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : prev === 'light' ? 'system' : 'dark'
      return next
    })
  }

  const handleToggleLocale = (): void => {
    const next = locale === 'zh' ? 'en' : 'zh'
    setLocaleState(next)
    setLocale(next)
  }

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('theme-dark', 'theme-light')
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.add(prefersDark ? 'theme-dark' : 'theme-light')
    } else {
      root.classList.add(`theme-${theme}`)
    }
    localStorage.setItem('ping-chat-theme', theme)
  }, [theme])

  /* ── Auto Reply State ── */
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false)
  const [autoReplyMode, setAutoReplyMode] = useState<'global' | 'single'>('global')
  const [monitoringEnabled, setMonitoringEnabled] = useState(true)
  const [autoReplyMessages, setAutoReplyMessages] = useState<ChatMessage[]>([])
  const [autoReplyProcessing, setAutoReplyProcessing] = useState(false)
  const [replyFeedbackMap, setReplyFeedbackMap] = useState<Record<string, 'up' | 'down'>>({})
  const [recentReplyLogs, setRecentReplyLogs] = useState<Array<{ id: string; type: string; content: string; contact: string }>>([])
  const [autoReplyTarget, setAutoReplyTarget] = useState('')
  const [autoReplyConfig, setAutoReplyConfig] = useState({
    apiKey: 'sk-cp-eEhluB-WZIP6LV2qAJO_TYawZIIiwtcCd7CnA73soACxZygFWJx2JycyO7l_100a5FnOh6O0-FPojZzbibf02yw6SAF9jAQg6PGtyew3IDvMKJpJ14QZKwY',
    endpoint: 'https://api.minimaxi.com/v1/chat/completions',
    model: 'MiniMax-M2.7',
    systemPrompt: '你是一个热情友好的客服助手，善于用活泼亲切的语气与用户沟通。',
    tone: '热情',
    length: '简短',
    salutation: '亲',
    allowEmoji: true,
    templates: [] as Array<{ title: string; content: string }>,
    delaySeconds: 15,
    role: '客服专员',
    blacklist: [] as string[],
    keywords: [] as string[],
    keywordResponse: '已收到您的问题，我们会尽快安排人工客服为您服务。',
    groupWhitelist: [] as string[],
    groupBlacklist: [] as string[],
    mentionOnly: false,
    myNickname: '',
    sensitiveWords: [] as string[],
    enableTranslation: false,
    targetLanguage: 'zh',
    enableCommands: true,
    enablePlugins: false,
    pluginRules: [] as Array<{ id: string; type: 'message' | 'reply'; match: 'contains' | 'equals' | 'regex' | 'startswith'; pattern: string; action: 'reply' | 'replace' | 'block'; value: string; enabled: boolean }>,
    enableFriendRequestAutoAccept: false,
    friendRequestWelcomeMessage: '你好，很高兴认识你！',
    enableCloudSync: false,
    cloudSyncUrl: '',
    cloudSyncApiKey: '',
    temperature: 0.7,
    maxTokens: 0,
    contextRounds: 10,
    topP: 1.0,
    frequencyPenalty: 0,
    presencePenalty: 0,
    autoSend: true,
  })

  const activePlatform = useMemo(
    () => platforms.find((platform) => platform.id === activePlatformId) ?? platforms[0],
    [activePlatformId]
  )

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId),
    [activeSessionId, sessions]
  )

  useEffect(() => {
    const unsub = window.pingChat.onChatMessage((payload) => {
      setAutoReplyMessages((prev) => [...prev, payload])
      appendChatMessage(payload.partition, payload)
    })
    return unsub
  }, [])

  useEffect(() => {
    const unsub = window.pingChat.onChatStats((payload) => {
      console.log('[Renderer ChatStats]', payload)
      const partition = payload.partition || activeSession?.partition || ''
      if (partition) {
        setChatStats(partition, { ...payload, partition })
      }
    })
    return unsub
  }, [activeSession?.partition])

  const [recalledMessages, setRecalledMessages] = useState<Array<{ partition: string; sender: string; content: string; originalContent: string; timestamp: number }>>([])

  useEffect(() => {
    const unsub = window.pingChat.onChatRecall((payload) => {
      console.log('[Renderer Recall]', payload)
      setRecalledMessages((prev) => [payload, ...prev.slice(0, 49)])
    })
    return unsub
  }, [])

  // Auto-login: restore saved sessions and cookies on startup
  useEffect(() => {
    void (async () => {
      try {
        const savedSessions = await window.pingChat.loadSessions()
        if (savedSessions && savedSessions.length > 0) {
          setSessions(savedSessions)
          if (savedSessions[0]) {
            setActivePlatformId(savedSessions[0].platformId)
            setActiveSessionId(savedSessions[0].id)
          }
          for (const session of savedSessions) {
            if (session.partition) {
              void window.pingChat.loadCookies(session.partition)
            }
          }
        }
        setLoaded(true)
      } catch (e) {
        console.error('[AutoLogin] failed to restore sessions:', e)
        setLoaded(true)
      }
    })()
  }, [])

  // Auto-reply: generate AI reply when new user message arrives
  const autoReplyConfigRef = useRef(autoReplyConfig)
  autoReplyConfigRef.current = autoReplyConfig
  const autoReplyEnabledRef = useRef(autoReplyEnabled)
  autoReplyEnabledRef.current = autoReplyEnabled
  const autoReplyModeRef = useRef(autoReplyMode)
  autoReplyModeRef.current = autoReplyMode
  const autoReplyTargetRef = useRef(autoReplyTarget)
  autoReplyTargetRef.current = autoReplyTarget
  const processedReplyKeys = useRef(new Set<string>())
  const [processedCount, setProcessedCount] = useState(0)
  const globalPendingPartitionRef = useRef<string | null>(null)
  const autoReplyMessagesRef = useRef<ChatMessage[]>([])
  autoReplyMessagesRef.current = autoReplyMessages
  const pendingQueueRef = useRef<ChatMessage[]>([])
  const isProcessingQueueRef = useRef(false)
  const sessionsRef = useRef(sessions)
  sessionsRef.current = sessions
  const isPollingRef = useRef(false)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const processedContactsRef = useRef<Set<string>>(new Set())

  const handleReplyFeedback = (id: string, feedback: 'up' | 'down'): void => {
    void window.pingChat.setReplyFeedback(id, feedback)
    setReplyFeedbackMap((prev) => ({ ...prev, [id]: feedback }))
  }

  const clearJsMemory = (): void => {
    setAutoReplyMessages([])
    processedReplyKeys.current.clear()
    setRecentReplyLogs([])
    clearChatMessages()
    setProcessedCount(0)
    pendingQueueRef.current.length = 0
    console.log('[Memory] cleared')
  }

  const handleQueuedMessage = async (message: ChatMessage): Promise<void> => {
    const config = autoReplyConfigRef.current
    if (!config?.apiKey) return

    if (config.blacklist.length > 0 && config.blacklist.some((b) => message.sender.includes(b))) {
      return
    }

    // Plugin hook: onMessage
    if (config.enablePlugins && config.pluginRules.length > 0) {
      pluginManager.loadRules(config.pluginRules)
      const pluginReply = pluginManager.onMessage({ sender: message.sender, content: message.content, isFromUser: message.isFromUser })
      if (pluginReply) {
        await window.pingChat.sendReply(message.partition, pluginReply, config.autoSend)
        return
      }
    }

    // Command handler
    if (config.enableCommands) {
      const cmdResult = handleCommand(message.content, {
        autoReplyEnabled: autoReplyEnabledRef.current,
        processedCount: processedCount,
        platform: message.partition.split(':')[1]?.split('-')[0] || 'unknown',
      })
      if (cmdResult.handled && cmdResult.reply) {
        await window.pingChat.sendReply(message.partition, cmdResult.reply, config.autoSend)
        return
      }
    }

    if (config.keywords.length > 0 && config.keywords.some((k) => message.content.includes(k))) {
      const keywordReply = interpolateTemplateVars(config.keywordResponse, { contactName: message.sender, partition: message.partition })
      await window.pingChat.sendReply(message.partition, keywordReply, config.autoSend)
      window.pingChat.logReply({
        timestamp: Date.now(),
        partition: message.partition,
        platform: message.partition.split(':')[1]?.split('-')[0] || 'unknown',
        contact: message.sender,
        content: keywordReply,
        type: 'keyword',
        success: true,
      }).then((entry: any) => {
        if (entry?.id) {
          setRecentReplyLogs((prev) => [{ id: entry.id, type: 'keyword', content: keywordReply, contact: message.sender }, ...prev.slice(0, 19)])
        }
      })
      return
    }

    if (config.delaySeconds > 0) {
      await new Promise((resolve) => setTimeout(resolve, config.delaySeconds * 1000))
    }

    let history = autoReplyMessagesRef.current.filter((m) => m.partition === message.partition)
    if (config.contextRounds > 0) {
      history = history.slice(-config.contextRounds * 2)
    }
    const fullSystem = buildSystemPrompt(config)

    const msgs = [
      { role: 'system', content: fullSystem },
      ...history.map((m) => ({ role: m.isFromUser ? 'user' : 'assistant' as const, content: m.content })),
    ]

    try {
      const res = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: msgs,
          temperature: config.temperature,
          ...(config.maxTokens > 0 ? { max_tokens: config.maxTokens } : {}),
          ...(config.topP < 1 ? { top_p: config.topP } : {}),
          ...(config.frequencyPenalty !== 0 ? { frequency_penalty: config.frequencyPenalty } : {}),
          ...(config.presencePenalty !== 0 ? { presence_penalty: config.presencePenalty } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || `请求失败 (${res.status})`)
      }
      let reply = data.choices?.[0]?.message?.content
      if (reply) {
        reply = reply.replace(/<think(?:ing)?>.*?<\/think(?:ing)?>/gs, '')
        reply = reply.replace(/<reason(?:ing)?>.*?<\/reason(?:ing)?>/gs, '')
        reply = reply.trim()
        if (config.autoSend) {
          const interpolatedReply = interpolateTemplateVars(reply, { contactName: message.sender, partition: message.partition })
          await window.pingChat.selectChat(message.partition, message.sender)
          await new Promise((resolve) => setTimeout(resolve, 500))
          await window.pingChat.sendReply(message.partition, interpolatedReply, config.autoSend)
          window.pingChat.logReply({
            timestamp: Date.now(),
            partition: message.partition,
            platform: message.partition.split(':')[1]?.split('-')[0] || 'unknown',
            contact: message.sender,
            content: reply,
            type: 'ai',
            success: true,
            model: config.model,
          }).then((entry: any) => {
            if (entry?.id) {
              setRecentReplyLogs((prev) => [{ id: entry.id, type: 'ai', content: reply, contact: message.sender }, ...prev.slice(0, 19)])
            }
          })
        } else {
          globalPendingPartitionRef.current = message.partition
        }
      }
    } catch (err: any) {
      console.error('[AutoReply] AI generation failed:', err)
      window.pingChat.logReply({
        timestamp: Date.now(),
        partition: message.partition,
        platform: message.partition.split(':')[1]?.split('-')[0] || 'unknown',
        contact: message.sender,
        content: '',
        type: 'ai',
        success: false,
        error: err?.message || String(err),
        model: config.model,
      }).then((entry: any) => {
        if (entry?.id) {
          setRecentReplyLogs((prev) => [{ id: entry.id, type: 'ai', content: '', contact: message.sender }, ...prev.slice(0, 19)])
        }
      })
    }
  }

  const startQueueProcessing = (): void => {
    if (isProcessingQueueRef.current) return
    isProcessingQueueRef.current = true
    setAutoReplyProcessing(true)
    void (async () => {
      try {
        while (pendingQueueRef.current.length > 0) {
          if (!autoReplyEnabledRef.current) {
            pendingQueueRef.current.length = 0
            break
          }
          const nextMessage = pendingQueueRef.current.shift()
          if (!nextMessage) continue
          await handleQueuedMessage(nextMessage)
        }
      } finally {
        isProcessingQueueRef.current = false
        setAutoReplyProcessing(false)
        if (pendingQueueRef.current.length > 0) {
          startQueueProcessing()
        }
      }
    })()
  }

  const enqueueAutoReplyMessage = (message?: ChatMessage): void => {
    if (!autoReplyEnabledRef.current) return
    if (!message) return
    if (globalPendingPartitionRef.current && !message.isFromUser && message.partition === globalPendingPartitionRef.current) {
      globalPendingPartitionRef.current = null
      return
    }
    if (!message.isFromUser) return

    const key = `${message.partition}:${message.sender}:${message.content}`
    if (processedReplyKeys.current.has(key)) return

    const stats = getChatStats(message.partition)
    const contact = stats?.contacts?.find((c: { name: string }) => c.name === message.sender)
    if (contact?.isGroup) {
      const config = autoReplyConfigRef.current
      if (config?.groupWhitelist?.length) {
        if (!config.groupWhitelist.some((w) => message.sender.includes(w))) return
      } else if (config?.groupBlacklist?.length) {
        if (config.groupBlacklist.some((b) => message.sender.includes(b))) return
      } else {
        // default: ignore group messages unless explicitly configured
        return
      }
      if (config?.mentionOnly) {
        const mentionPattern = config.myNickname ? new RegExp(`@${config.myNickname}|@所有人|@all`, 'i') : /@所有人|@all/i
        if (!mentionPattern.test(message.content)) return
      }
    }
    if (autoReplyModeRef.current === 'single') return
    // Global mode is handled by pollUnreadContacts based on unread contact list
    if (autoReplyModeRef.current === 'global') return

    processedReplyKeys.current.add(key)
    setProcessedCount((count) => count + 1)
    pendingQueueRef.current.push(message)
    startQueueProcessing()
  }

  const pollUnreadContacts = async (): Promise<void> => {
    if (!autoReplyEnabledRef.current || autoReplyModeRef.current !== 'global' || isPollingRef.current) return
    isPollingRef.current = true
    setAutoReplyGlobalGenerating(true)
    setAutoReplyGlobalError(null)
    try {
      for (const session of sessionsRef.current) {
        if (!session.partition) continue
        const stats = getChatStats(session.partition)
        if (!stats?.unreadContacts?.length) continue
        const unreadUsers = stats.unreadContacts
          .filter((c: any) => !c.isGroup && c.unread > 0)
          .sort((a: any, b: any) => b.unread - a.unread)
        for (const contact of unreadUsers) {
          if (!autoReplyEnabledRef.current || autoReplyModeRef.current !== 'global') break
          const key = `${session.partition}:${contact.name}`
          if (processedContactsRef.current.has(key)) continue
          await window.pingChat.selectChat(session.partition, contact.name)
          await new Promise((r) => setTimeout(r, 800))
          const msgs = getChatMessages(session.partition) || []
          const userMsgs = msgs.filter((m: ChatMessage) => m.sender === contact.name && m.isFromUser)
          const lastMsg = userMsgs[userMsgs.length - 1]
          if (!lastMsg) continue
          const msgKey = `${lastMsg.partition}:${lastMsg.sender}:${lastMsg.content}`
          if (processedReplyKeys.current.has(msgKey)) continue
          processedReplyKeys.current.add(msgKey)
          processedContactsRef.current.add(key)
          setProcessedCount((count) => count + 1)
          try {
            await handleQueuedMessage(lastMsg)
          } catch (e: any) {
            console.error('[AutoReply] global mode error:', e)
            setAutoReplyGlobalError(e?.message || '自动回复处理失败')
          }
          processedContactsRef.current.delete(key)
          await new Promise((r) => setTimeout(r, 1000))
        }
      }
    } finally {
      isPollingRef.current = false
      setAutoReplyGlobalGenerating(false)
    }
  }

  useEffect(() => {
    if (!autoReplyEnabled) return
    const lastMsg = autoReplyMessages[autoReplyMessages.length - 1]
    enqueueAutoReplyMessage(lastMsg)
  }, [autoReplyMessages, autoReplyEnabled])

  useEffect(() => {
    if (!autoReplyEnabled || autoReplyMode !== 'global') {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
      return
    }
    void pollUnreadContacts()
    pollTimerRef.current = setInterval(() => {
      void pollUnreadContacts()
    }, 3000)
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }
  }, [autoReplyEnabled, autoReplyMode])

  useEffect(() => {
    if (autoReplyEnabled) return
    pendingQueueRef.current.length = 0
    if (isProcessingQueueRef.current) {
      isProcessingQueueRef.current = false
      setAutoReplyProcessing(false)
    }
  }, [autoReplyEnabled])

  useEffect(() => {
    if (!loaded) return
    void window.pingChat.saveSessions(sessions)
  }, [sessions, loaded])

  // Load auto-reply config from persistent store on startup
  useEffect(() => {
    if (!loaded) return
    void (async () => {
      try {
        const saved = await window.pingChat.getConfig('autoReplyConfig')
        if (saved) {
          const encryptedKey = await window.pingChat.loadCredential('apiKey')
          setAutoReplyConfig((prev) => ({ ...prev, ...saved, apiKey: encryptedKey || '', model: saved.model || prev.model || 'MiniMax-M2.7' }))
        }
        const savedEnabled = await window.pingChat.getConfig('autoReplyEnabled')
        if (typeof savedEnabled === 'boolean') setAutoReplyEnabled(savedEnabled)
      } catch (e) {
        console.error('[App] load config failed:', e)
      }
    })()
  }, [loaded])

  // Persist auto-reply config changes (apiKey stored separately encrypted)
  useEffect(() => {
    if (!loaded) return
    void (async () => {
      if (autoReplyConfig.apiKey) {
        await window.pingChat.saveCredential('apiKey', autoReplyConfig.apiKey)
      }
      await window.pingChat.setSensitiveWords(autoReplyConfig.sensitiveWords)
      await window.pingChat.setCloudSync(autoReplyConfig.cloudSyncUrl, autoReplyConfig.cloudSyncApiKey, autoReplyConfig.enableCloudSync)
      const { apiKey: _, sensitiveWords: __, cloudSyncUrl: ___, cloudSyncApiKey: ____, ...safeConfig } = autoReplyConfig
      await window.pingChat.setConfig('autoReplyConfig', safeConfig)
    })()
  }, [autoReplyConfig, loaded])

  useEffect(() => {
    if (!loaded) return
    void window.pingChat.setConfig('autoReplyEnabled', autoReplyEnabled)
  }, [autoReplyEnabled, loaded])

  useEffect(() => {
    if (!activeSession) {
      setActiveRightTool('')
    }
  }, [activeSession])

  useEffect(() => {
    if (activeSession && monitoringEnabled) {
      void window.pingChat.setMonitorEnabled(activeSession.partition, true)
    }
  }, [activeSession?.id, monitoringEnabled])

  const visibleSessions = useMemo(
    () => sessions.filter((session) => session.platformId === activePlatformId),
    [activePlatformId, sessions]
  )

  const createSession = (): void => {
    const id = `${activePlatformId}-${Date.now()}`
    const platformSessionCount = sessions.filter((session) => session.platformId === activePlatformId).length
    const nextSession: ChatSession = {
      id,
      platformId: activePlatformId,
      name: `${activePlatform.name} ${platformSessionCount + 1}`,
      status: 'login',
      partition: `persist:${activePlatformId}-${id}`,
      fingerprint: generateRandomFingerprint(),
      proxy: { protocol: 'no-proxy', host: '', port: '', username: '', password: '' },
    }
    setSessions((current) => [nextSession, ...current])
    setActiveSessionId(id)
    setActiveRightTool('environment')
  }

  useEffect(() => {
    const unsub1 = window.pingChat.onShortcut('shortcut:toggle-auto-reply', () => {
      setAutoReplyEnabled((prev) => !prev)
    })
    const unsub2 = window.pingChat.onShortcut('shortcut:new-session', () => {
      if (activeSession) createSession()
    })
    return () => { unsub1(); unsub2() }
  }, [activeSession, createSession])

  const closeSession = (id: string): void => {
    const nextSessions = sessions.filter((session) => session.id !== id)
    setSessions(nextSessions)
    if (activeSessionId === id) {
      const nextSession = nextSessions.find((session) => session.platformId === activePlatformId)
      setActiveSessionId(nextSession?.id ?? '')
    }
  }

  const refreshSession = (): void => {
    setWebviewReloadKey((k) => k + 1)
  }

  const selectPlatform = (id: string): void => {
    setActivePlatformId(id)
    const firstSession = sessions.find((session) => session.platformId === id)
    setActiveSessionId(firstSession?.id ?? '')
  }

  const updateSessionFingerprint = (sessionId: string, fingerprint: FingerprintSettings): void => {
    setSessions((current) =>
      current.map((session) =>
        session.id === sessionId ? { ...session, fingerprint } : session
      )
    )
  }

  const updateSessionProxy = (sessionId: string, proxy: ProxyConfig): void => {
    setSessions((current) =>
      current.map((session) =>
        session.id === sessionId ? { ...session, proxy } : session
      )
    )
  }

  const onlineCount = sessions.filter((s) => s.status === 'online').length
  const offlineCount = sessions.length - onlineCount

  return (
    <TooltipPrimitive.Provider delayDuration={0}>
      <div className="app-shell">
        <TitleBar onlineCount={onlineCount} offlineCount={offlineCount} onRefresh={refreshSession} />
        <div className={`workspace ${activeRightTool === 'environment' || activeRightTool === 'reply' || activeRightTool === 'about' ? '' : 'no-proxy-panel'}`}>
          <PlatformSidebar activePlatformId={activePlatformId} onSelectPlatform={selectPlatform} platforms={platforms} theme={theme} onToggleTheme={handleToggleTheme} locale={locale} onToggleLocale={handleToggleLocale} />
          <ConversationSidebar
            platform={activePlatform}
            sessions={visibleSessions}
            activeSessionId={activeSessionId}
            onCreateSession={createSession}
            onSelectSession={setActiveSessionId}
            onCloseSession={closeSession}
            onRefreshSession={refreshSession}
            onRenameSession={(id: string, name: string) => updateSession(id, (s: ChatSession) => ({ ...s, name }))}
          />
          <MainPanel sessions={sessions} activeSession={activeSession} platform={activePlatform} reloadTrigger={webviewReloadKey} />
          {activeRightTool === 'environment' && (
            <ErrorBoundary>
              <Suspense fallback={<div style={{ width: 320, padding: 24, color: '#8c96a1' }}>加载中...</div>}>
                <ProxyEnvironmentPanel
                  session={activeSession}
                  onUpdateFingerprint={updateSessionFingerprint}
                  onUpdateProxy={updateSessionProxy}
                  onClose={() => setActiveRightTool('')}
                />
              </Suspense>
            </ErrorBoundary>
          )}
          {activeRightTool === 'reply' && (
            <ErrorBoundary>
              <Suspense fallback={<div style={{ width: 320, padding: 24, color: '#8c96a1' }}>加载中...</div>}>
                <AutoReplyPanel
                  session={activeSession}
                  onClose={() => setActiveRightTool('')}
                  enabled={autoReplyEnabled}
                  onToggleEnabled={setAutoReplyEnabled}
                  monitoringEnabled={monitoringEnabled}
                  onToggleMonitoring={(v: boolean) => { setMonitoringEnabled(v); if (activeSession) void window.pingChat.setMonitorEnabled(activeSession.partition, v) }}
                  processing={autoReplyProcessing}
                  processedCount={processedCount}
                  messages={autoReplyMessages}
                  config={autoReplyConfig}
                  onUpdateConfig={(updates: any) => setAutoReplyConfig((prev) => ({ ...prev, ...updates }))}
                  onSendReply={async (partition: string, content: string, autoSend?: boolean) => {
                    const result = await window.pingChat.checkSensitiveWords(content)
                    if (result.blocked) {
                      console.warn('[Sensitive] blocked word:', result.word)
                      return
                    }
                    const modified = pluginManager.onReply(content)
                    void window.pingChat.sendReply(partition, modified ?? content, autoSend)
                  }}
                  chatStats={getChatStats(activeSession?.partition ?? '') ?? null}
                  autoReplyTarget={autoReplyTarget}
                  setAutoReplyTarget={setAutoReplyTarget}
                  autoReplyMode={autoReplyMode}
                  setAutoReplyMode={setAutoReplyMode}
                  recentReplyLogs={recentReplyLogs}
                  replyFeedbackMap={replyFeedbackMap}
                  onReplyFeedback={handleReplyFeedback}
                  onClearMemory={clearJsMemory}
                />
              </Suspense>
            </ErrorBoundary>
          )}
          {activeRightTool === 'about' && (
            <ErrorBoundary>
              <Suspense fallback={<div style={{ width: 320, padding: 24, color: '#8c96a1' }}>加载中...</div>}>
                <UpdatePanel onClose={() => setActiveRightTool('')} />
              </Suspense>
            </ErrorBoundary>
          )}
          <RightToolBar activeTool={activeRightTool} onSelectTool={setActiveRightTool} disabled={!activeSession} autoReplyProcessing={autoReplyProcessing} />
        </div>
      </div>
    </TooltipPrimitive.Provider>
  )
}

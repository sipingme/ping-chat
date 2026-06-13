import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
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
import { generateRandomFingerprint } from './config/defaults'
import { useAutoReplyEngine } from './hooks/useAutoReplyEngine'
import { initLocale, setLocale, t } from './i18n'
import { useTranslation } from './i18n/useTranslation'
import { useSensitiveWords } from './hooks/useSensitiveWords'
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
  const [replyFeedbackMap, setReplyFeedbackMap] = useState<Record<string, 'up' | 'down'>>({})
  const [autoReplyTarget, setAutoReplyTarget] = useState('')
  const [autoReplyConfig, setAutoReplyConfig] = useState({
    apiKey: '',
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
      if (!partition) {
        console.warn('[Renderer ChatStats] dropping message with empty partition')
        return
      }
      setChatStats(partition, { ...payload, partition })
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

  const {
    autoReplyProcessing,
    processedCount,
    recentReplyLogs,
    replyCountdown,
    clearJsMemory,
  } = useAutoReplyEngine({
    autoReplyConfig,
    autoReplyEnabled,
    autoReplyMode,
    autoReplyTarget,
    sessions,
    autoReplyMessages,
    setAutoReplyMessages,
    getChatStats,
    getChatMessages,
    clearChatMessages,
    setAutoReplyGlobalGenerating,
    setAutoReplyGlobalError,
  })

  const handleReplyFeedback = (id: string, feedback: 'up' | 'down'): void => {
    void window.pingChat.setReplyFeedback(id, feedback)
    setReplyFeedbackMap((prev) => ({ ...prev, [id]: feedback }))
  }

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
                  replyCountdown={replyCountdown}
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

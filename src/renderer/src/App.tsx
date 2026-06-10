import { type CSSProperties, type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Bot,
  ChevronDown,
  Copy,
  Disc3,
  ExternalLink,
  Facebook,
  FileImage,
  Globe2,
  Headphones,
  Image,
  Instagram,
  Languages,
  Linkedin,
  Lock,
  MessageCircle,
  MessageSquare,
  MessagesSquare,
  PanelLeft,
  Phone,
  Plus,
  Puzzle,
  RefreshCw,
  RotateCw,
  Search,
  Send,
  Server,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
  Zap,
  CircleHelp,
  Eraser,
  Loader2,
} from 'lucide-react'
import * as SelectPrimitive from '@radix-ui/react-select'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'

type Platform = {
  id: string
  name: string
  shortName: string
  icon: JSX.Element
  accent: string
}

type FingerprintSettings = {
  browserVersion: string
  os: string
  userAgent: string
  geolocation: string
  resolution: string
  webrtc: string
  canvas: boolean
  audioContext: boolean
  hardwareConcurrency: string
  deviceMemory: string
  timezone: string
  hideWebdriver: boolean
  enableChromeObj: boolean
  fakePlugins: boolean
  fakeOuterSize: boolean
}

type ChatMessage = {
  partition: string
  sender: string
  content: string
  isFromUser: boolean
  timestamp: number
}

type ProxyConfig = {
  protocol: 'no-proxy' | 'http' | 'https' | 'socks5'
  host: string
  port: string
  username: string
  password: string
}

type ChatSession = {
  id: string
  platformId: string
  name: string
  status: 'login' | 'online'
  partition: string
  fingerprint: FingerprintSettings
  proxy: ProxyConfig
}

const WECHAT_WEB_URL = 'https://web.wechat.com/'
const XIAOHONGSHU_WEB_URL = 'https://sxt.xiaohongshu.com/im/login'

const BROWSER_VERSIONS = [
  'Chrome 135', 'Chrome 134', 'Chrome 133', 'Chrome 132', 'Chrome 131', 'Chrome 130',
  'Chrome 129', 'Chrome 128', 'Chrome 127', 'Chrome 126', 'Chrome 125', 'Chrome 124',
  'Chrome 123', 'Chrome 122', 'Chrome 121', 'Chrome 120',
  'Firefox 135', 'Firefox 134', 'Firefox 133', 'Firefox 132', 'Firefox 131', 'Firefox 130',
  'Firefox 129', 'Firefox 128', 'Firefox 127', 'Firefox 126', 'Firefox 125', 'Firefox 124',
  'Safari 18.3', 'Safari 18.2', 'Safari 18.1', 'Safari 18.0',
  'Safari 17.6', 'Safari 17.5', 'Safari 17.4', 'Safari 17.3', 'Safari 17.2', 'Safari 17.1', 'Safari 17.0', 'Safari 16.6',
  'Edge 135', 'Edge 134', 'Edge 133', 'Edge 132', 'Edge 131', 'Edge 130',
  'Edge 129', 'Edge 128', 'Edge 127', 'Edge 126', 'Edge 125', 'Edge 124',
  'Edge 123', 'Edge 122', 'Edge 121', 'Edge 120',
]

function getUserAgentForVersion(os: string, version: string): string {
  const [type, verStr] = version.split(' ')
  const ver = verStr ?? ''

  if (type === 'Firefox') {
    if (os === 'MacOS') {
      return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:${ver}.0) Gecko/20100101 Firefox/${ver}.0`
    }
    return `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${ver}.0) Gecko/20100101 Firefox/${ver}.0`
  }

  if (type === 'Safari') {
    if (os === 'MacOS') {
      return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${ver} Safari/605.1.15`
    }
    return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${ver} Safari/605.1.15`
  }

  if (type === 'Edge') {
    if (os === 'MacOS') {
      return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ver}.0.0.0 Safari/537.36 Edg/${ver}.0.0.0`
    }
    return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ver}.0.0.0 Safari/537.36 Edg/${ver}.0.0.0`
  }

  // Chrome
  if (os === 'MacOS') {
    return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ver}.0.0.0 Safari/537.36`
  }
  return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ver}.0.0.0 Safari/537.36`
}

function generateRandomFingerprint(): FingerprintSettings {
  const osOptions = ['Windows', 'MacOS']
  const resolutionPresets = ['跟随系统', '1920x1080', '1366x768', '1440x900', '1536x864', '1280x720', '2560x1440', '3840x2160']
  const webrtcOptions = ['替换', '允许', '禁用']
  const geolocationOptions = ['询问', '允许', '禁用']
  const hardwareOptions = ['2核', '4核', '8核', '16核', '32核']
  const memoryOptions = ['2GB', '4GB', '6GB', '8GB', '16GB', '32GB']
  const timezoneOptions = ['跟随系统', 'Asia/Shanghai', 'Asia/Tokyo', 'America/New_York', 'Europe/London', 'UTC']

  const selectedOs = osOptions[Math.floor(Math.random() * osOptions.length)]
  const selectedBrowser = BROWSER_VERSIONS[Math.floor(Math.random() * BROWSER_VERSIONS.length)]
  const selectedUserAgent = getUserAgentForVersion(selectedOs, selectedBrowser)

  return {
    browserVersion: selectedBrowser,
    os: selectedOs,
    userAgent: selectedUserAgent,
    geolocation: geolocationOptions[Math.floor(Math.random() * geolocationOptions.length)],
    resolution: resolutionPresets[Math.floor(Math.random() * resolutionPresets.length)],
    webrtc: webrtcOptions[Math.floor(Math.random() * webrtcOptions.length)],
    canvas: Math.random() > 0.3,
    audioContext: Math.random() > 0.3,
    hardwareConcurrency: hardwareOptions[Math.floor(Math.random() * hardwareOptions.length)],
    deviceMemory: memoryOptions[Math.floor(Math.random() * memoryOptions.length)],
    timezone: timezoneOptions[Math.floor(Math.random() * timezoneOptions.length)],
    hideWebdriver: true,
    enableChromeObj: true,
    fakePlugins: true,
    fakeOuterSize: true,
  }
}

const platforms: Platform[] = [
  { id: 'xiaohongshu', name: '小红书', shortName: '红', icon: <XhsIcon />, accent: '#ff2442' },
  { id: 'wechat', name: '微信', shortName: 'W', icon: <MessageCircle size={17} />, accent: '#07c160' }
]

function SendIcon(): JSX.Element {
  return <span className="text-icon">T</span>
}

function MusicIcon(): JSX.Element {
  return <span className="text-icon music">♪</span>
}

function VkIcon(): JSX.Element {
  return <span className="text-icon vk">VK</span>
}

function UsersIcon(): JSX.Element {
  return <span className="text-icon">M</span>
}

function XhsIcon(): JSX.Element {
  return <span className="text-icon xhs">红</span>
}

const timezoneOptions = ['跟随系统', 'Asia/Shanghai', 'Asia/Tokyo', 'America/New_York', 'Europe/London', 'UTC']

export function App(): JSX.Element {
  const [activePlatformId, setActivePlatformId] = useState('xiaohongshu')
  const [activeRightTool, setActiveRightTool] = useState('')
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [webviewReloadKey, setWebviewReloadKey] = useState(0)

  /* ── Auto Reply State ── */
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false)
  const [monitoringEnabled, setMonitoringEnabled] = useState(false)
  const [autoReplyMessages, setAutoReplyMessages] = useState<ChatMessage[]>([])
  const [autoReplyProcessing, setAutoReplyProcessing] = useState(false)
  const [chatStats, setChatStats] = useState<{ partition: string; totalCount: number; groupCount: number; userCount: number; totalUnread: number; contacts: Array<{ name: string; isGroup: boolean; unread: number; avatar: string }>; unreadContacts: Array<{ name: string; isGroup: boolean; unread: number; avatar: string }> } | null>(null)
  const [autoReplyConfig, setAutoReplyConfig] = useState({
    apiKey: '',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'abab6',
    systemPrompt: '你是一个友好的客服助手。',
    tone: '热情',
    length: '简短',
    salutation: '亲',
    allowEmoji: true,
    templates: [] as Array<{ title: string; content: string }>,
    delaySeconds: 0,
    role: '客服专员',
    blacklist: [] as string[],
    keywords: [] as string[],
    keywordResponse: '已收到您的问题，我们会尽快安排人工客服为您服务。',
    temperature: 0.7,
    maxTokens: 0,
    contextRounds: 10,
  })

  useEffect(() => {
    const unsub = window.pingChat.onChatMessage((payload) => {
      setAutoReplyMessages((prev) => [...prev, payload])
    })
    return unsub
  }, [])

  useEffect(() => {
    const unsub = window.pingChat.onChatStats((payload) => {
      console.log('[Renderer ChatStats]', payload)
      setChatStats(payload)
    })
    return unsub
  }, [])

  // Auto-reply: generate AI reply when new user message arrives
  const autoReplyConfigRef = useRef(autoReplyConfig)
  autoReplyConfigRef.current = autoReplyConfig
  const autoReplyEnabledRef = useRef(autoReplyEnabled)
  autoReplyEnabledRef.current = autoReplyEnabled
  const processedReplyKeys = useRef(new Set<string>())
  const [processedCount, setProcessedCount] = useState(0)

  useEffect(() => {
    if (!autoReplyEnabled) return
    const lastMsg = autoReplyMessages[autoReplyMessages.length - 1]
    if (!lastMsg || !lastMsg.isFromUser) return
    const key = `${lastMsg.partition}:${lastMsg.sender}:${lastMsg.content}`
    if (processedReplyKeys.current.has(key)) return
    processedReplyKeys.current.add(key)
    setProcessedCount((c) => c + 1)

    setAutoReplyProcessing(true)
    void (async () => {
      const config = autoReplyConfigRef.current
      if (!config.apiKey) return
      // Blacklist check
      if (config.blacklist.length > 0 && config.blacklist.some((b) => lastMsg.sender.includes(b))) {
        setAutoReplyProcessing(false)
        return
      }
      // Keyword interception
      if (config.keywords.length > 0 && config.keywords.some((k) => lastMsg.content.includes(k))) {
        await window.pingChat.sendReply(lastMsg.partition, config.keywordResponse)
        setAutoReplyProcessing(false)
        return
      }
      if (config.delaySeconds > 0) {
        await new Promise((r) => setTimeout(r, config.delaySeconds * 1000))
      }
      let history = autoReplyMessages.filter((m) => m.sender === lastMsg.sender)
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
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
          body: JSON.stringify({ model: config.model, messages: msgs, temperature: config.temperature, ...(config.maxTokens > 0 ? { max_tokens: config.maxTokens } : {}) }),
        })
        const data = await res.json()
        const reply = data.choices?.[0]?.message?.content
        if (reply) {
          await window.pingChat.sendReply(lastMsg.partition, reply)
        }
      } catch (e) {
        console.error('[AutoReply] AI generation failed:', e)
      } finally {
        setAutoReplyProcessing(false)
      }
    })()
  }, [autoReplyMessages, autoReplyEnabled])

  useEffect(() => {
    void (async () => {
      try {
        const stored = await window.pingChat.loadSessions()
        if (stored && stored.length > 0) {
          setSessions(stored)
          setActiveSessionId(stored[0].id)
          setActivePlatformId(stored[0].platformId)
        }
      } catch (e) {
        console.error('[App] load sessions failed:', e)
      }
      setLoaded(true)
    })()
  }, [])

  useEffect(() => {
    if (!loaded) return
    void window.pingChat.saveSessions(sessions)
  }, [sessions, loaded])

  const activePlatform = useMemo(
    () => platforms.find((platform) => platform.id === activePlatformId) ?? platforms[0],
    [activePlatformId]
  )

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId),
    [activeSessionId, sessions]
  )

  useEffect(() => {
    if (!activeSession) {
      setActiveRightTool('')
    }
  }, [activeSession])

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
      name: activePlatformId === 'wechat' ? `微信 ${platformSessionCount + 1}` : `${activePlatform.name} ${platformSessionCount + 1}`,
      status: 'login',
      partition: `persist:${activePlatformId}-${id}`,
      fingerprint: generateRandomFingerprint(),
      proxy: { protocol: 'no-proxy', host: '', port: '', username: '', password: '' }
    }
    setSessions((current) => [nextSession, ...current])
    setActiveSessionId(id)
    setActiveRightTool('environment')
  }

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
        <TitleBar onlineCount={onlineCount} offlineCount={offlineCount} />
        <div className={`workspace ${activeRightTool === 'environment' || activeRightTool === 'reply' ? '' : 'no-proxy-panel'}`}>
          <PlatformSidebar activePlatformId={activePlatformId} onSelectPlatform={selectPlatform} />
          <ConversationSidebar
            platform={activePlatform}
            sessions={visibleSessions}
            activeSessionId={activeSessionId}
            onCreateSession={createSession}
            onSelectSession={setActiveSessionId}
            onCloseSession={closeSession}
            onRefreshSession={refreshSession}
          />
          <MainPanel session={activeSession} platform={activePlatform} reloadTrigger={webviewReloadKey} />
          {activeRightTool === 'environment' && (
            <ProxyEnvironmentPanel
              session={activeSession}
              onUpdateFingerprint={updateSessionFingerprint}
              onUpdateProxy={updateSessionProxy}
              onClose={() => setActiveRightTool('')}
            />
          )}
          {activeRightTool === 'reply' && (
            <AutoReplyPanel
              session={activeSession}
              onClose={() => setActiveRightTool('')}
              enabled={autoReplyEnabled}
              onToggleEnabled={setAutoReplyEnabled}
              monitoringEnabled={monitoringEnabled}
              onToggleMonitoring={(v) => { setMonitoringEnabled(v); if (activeSession) void window.pingChat.setMonitorEnabled(activeSession.partition, v) }}
              processing={autoReplyProcessing}
              processedCount={processedCount}
              messages={autoReplyMessages}
              onClearMessages={() => setAutoReplyMessages([])}
              config={autoReplyConfig}
              onUpdateConfig={(updates) => setAutoReplyConfig((prev) => ({ ...prev, ...updates }))}
              onSendReply={(partition, content) => void window.pingChat.sendReply(partition, content)}
              chatStats={chatStats}
            />
          )}
          <RightToolBar activeTool={activeRightTool} onSelectTool={setActiveRightTool} disabled={!activeSession} autoReplyProcessing={autoReplyProcessing} />
        </div>
      </div>
    </TooltipPrimitive.Provider>
  )
}

function TitleBar({ onlineCount, offlineCount }: { onlineCount: number; offlineCount: number }): JSX.Element {
  return (
    <header className="title-bar">
      <div className="traffic-lights">
        <button className="traffic close" onClick={() => window.pingChat?.close()} />
        <button className="traffic minimize" onClick={() => window.pingChat?.minimize()} />
        <button className="traffic maximize" onClick={() => window.pingChat?.maximize()} />
      </div>
      <div className="brand-block">
        <span className="brand-name">PingChat 0.2.0</span>
        <span>在线: <b className="green">{onlineCount}</b></span>
        <span>离线: <b className="red">{offlineCount}</b></span>
        <span className="route-pill">全球专线 <b>409ms</b></span>
        <button className="tiny-icon"><RefreshCw size={12} /></button>
      </div>
      <div className="title-spacer" />
      <div className="top-actions">
        <span className="secure"><span className="status-dot" />已连接安全加密线路</span>
        <button className="link-button">24小时客服</button>
        <button className="recharge">到后台管理</button>
      </div>
    </header>
  )
}

function PlatformSidebar({
  activePlatformId,
  onSelectPlatform
}: {
  activePlatformId: string
  onSelectPlatform: (id: string) => void
}): JSX.Element {
  return (
    <aside className="platform-sidebar">
      <div className="app-mark"><X size={24} strokeWidth={3.2} /></div>
      <div className="platform-list">
        {platforms.map((platform) => {
          const active = platform.id === activePlatformId
          return (
            <button
              key={platform.id}
              className={`platform-item ${active ? 'active' : ''}`}
              style={{ '--accent': platform.accent } as CSSProperties}
              onClick={() => onSelectPlatform(platform.id)}
              title={platform.name}
            >
              {platform.icon}
            </button>
          )
        })}
      </div>
      <div className="platform-footer">
        <button className="utility-icon"><Lock size={16} /></button>
        <button className="utility-icon active"><Settings size={16} /></button>
      </div>
    </aside>
  )
}

function ConversationSidebar({
  platform,
  sessions,
  activeSessionId,
  onCreateSession,
  onSelectSession,
  onCloseSession,
  onRefreshSession,
}: {
  platform: Platform
  sessions: ChatSession[]
  activeSessionId: string
  onCreateSession: () => void
  onSelectSession: (id: string) => void
  onCloseSession: (id: string) => void
  onRefreshSession?: () => void
}): JSX.Element {
  return (
    <aside className="conversation-sidebar">
      <section className="conversation-top">
        <div className="panel-heading">
          <h1>{platform.name}</h1>
          <div className="panel-actions">
            <button><Search size={16} /></button>
            <button><Copy size={16} /></button>
            <button><PanelLeft size={16} /></button>
          </div>
        </div>
        <button className="create-button" onClick={onCreateSession}><Plus size={14} />创建会话</button>
        <div className="search-box">
          <Search size={13} />
          <input placeholder="群聊/手机号/备注" />
        </div>
      </section>
      <section className="session-list">
        {sessions.length === 0 ? (
          <div className="ghost-card">
            <Disc3 size={18} />
            <span>暂无会话</span>
          </div>
        ) : (
          sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              active={session.id === activeSessionId}
              accent={platform.accent}
              onSelect={() => onSelectSession(session.id)}
              onClose={() => onCloseSession(session.id)}
              onRefresh={onRefreshSession}
            />
          ))
        )}
      </section>
      <div className="platform-meta">
        <ShieldCheck size={13} />
        <span>当前平台</span>
        <b style={{ color: platform.accent }}>{platform.name}</b>
        <ChevronDown size={13} />
        <ExternalLink size={13} />
      </div>
    </aside>
  )
}

function SessionCard({
  session,
  active,
  accent,
  onSelect,
  onClose,
  onRefresh,
}: {
  session: ChatSession
  active: boolean
  accent: string
  onSelect: () => void
  onClose: () => void
  onRefresh?: () => void
}): JSX.Element {
  const [spinning, setSpinning] = useState(false)
  const handleRefresh = (event: React.MouseEvent): void => {
    event.stopPropagation()
    setSpinning(true)
    onRefresh?.()
  }
  return (
    <section
      role="button"
      tabIndex={0}
      className={`session-card ${active ? 'active' : ''}`}
      style={{ '--accent': accent } as CSSProperties}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect() } }}
    >
      <div className="session-content">
        <div className="session-title-row">
          <strong>{session.name}</strong>
        </div>
      </div>
      <div className="session-card-actions">
        <button
          className={spinning ? 'spinning' : ''}
          onClick={handleRefresh}
          onAnimationEnd={() => setSpinning(false)}
        >
          <RotateCw size={13} />
        </button>
        <button onClick={(event) => { event.stopPropagation(); onClose() }}><X size={14} /></button>
      </div>
    </section>
  )
}

function MainPanel({ session, platform, reloadTrigger }: { session?: ChatSession; platform: Platform; reloadTrigger?: number }): JSX.Element {
  const hasWebviewPlatform = Boolean(session && (session.platformId === 'wechat' || session.platformId === 'xiaohongshu'))
  const webviewUrl = session?.platformId === 'wechat' ? WECHAT_WEB_URL : XIAOHONGSHU_WEB_URL

  useEffect(() => {
    if (!session) return
    void window.pingChat.setFingerprint(session.partition, session.fingerprint)
    void window.pingChat.setProxy(session.partition, session.proxy)
  }, [session?.id, session?.fingerprint, session?.proxy])

  return (
    <main className={`main-panel ${session ? 'with-webview' : ''}`}>
      {hasWebviewPlatform ? (
        <div className="webview-stage">
          <webview
            key={`${session?.id}-${reloadTrigger ?? 0}`}
            className="platform-webview"
            src={webviewUrl}
            partition={session?.partition}
            allowpopups="true"
            preload={window.pingChat?.webviewPreloadPath}
          />
        </div>
      ) : session ? (
        <div className="empty-state">
          <Sparkles size={72} strokeWidth={1.7} />
          <span>{platform.name} 网页容器已预留</span>
        </div>
      ) : (
        <div className="empty-state">
          <Zap size={48} strokeWidth={1.5} />
          <span>暂无会话</span>
          <span style={{ fontSize: 12, marginTop: 4, opacity: 0.5 }}>点击左侧「创建会话」开始</span>
        </div>
      )}
    </main>
  )
}

function TranslationSettingsPanel(): JSX.Element {
  return (
    <aside className="translation-panel">
      <div className="translation-header">
        <div className="translation-title">
          <span>翻译设置</span>
          <RefreshCw size={12} />
        </div>
        <button className="translation-menu"><SlidersHorizontal size={14} /></button>
      </div>

      <div className="translation-body">
        <FormRow label="翻译线路">
          <SelectLike value="GPT4o-mini" />
        </FormRow>

        <SettingsGroup title="接收翻译设置" enabled>
          <FormRow label="源语言">
            <SelectLike value="自动检测" />
          </FormRow>
          <FormRow label="目标语言">
            <SelectLike value="中文（简体）" />
          </FormRow>
        </SettingsGroup>

        <SettingsGroup title="发送翻译设置" enabled>
          <FormRow label="源语言">
            <SelectLike value="自动检测" />
          </FormRow>
          <FormRow label="目标语言">
            <SelectLike value="英语" />
          </FormRow>
        </SettingsGroup>

        <ToggleRow label="群组自动翻译" enabled={false} />
        <ToggleRow label="禁发中文" enabled />
        <PlainOption label="AI提示语" suffix="↗" />
        <PlainOption label="发送预览" suffix="◎" />
      </div>

      <div className="translation-help">
        <strong>翻译说明</strong>
        <span>1. 按下Enter键 翻译并发送</span>
        <span>2. 按下Control+下键 直接发送</span>
        <span>3. 按下Control+下键 只翻译不发送 Control+G回显</span>
        <span>4. 按下Control+Shift+A键 截图翻译</span>
      </div>
    </aside>
  )
}

function SettingsGroup({
  title,
  enabled,
  children
}: {
  title: string
  enabled: boolean
  children: ReactNode
}): JSX.Element {
  return (
    <section className="settings-group">
      <div className="group-heading">
        <span>{title}</span>
        <Switch enabled={enabled} />
      </div>
      {children}
    </section>
  )
}

function FormRow({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <label className="form-row">
      <span>{label}</span>
      {children}
    </label>
  )
}

function SelectLike({ value }: { value: string }): JSX.Element {
  return (
    <button className="select-like">
      <span>{value}</span>
      <ChevronDown size={12} />
    </button>
  )
}

function ToggleRow({ label, enabled }: { label: string; enabled: boolean }): JSX.Element {
  return (
    <div className="toggle-row">
      <span>{label}</span>
      <Switch enabled={enabled} />
    </div>
  )
}

function PlainOption({ label, suffix }: { label: string; suffix: string }): JSX.Element {
  return (
    <div className="plain-option">
      <span>{label}</span>
      <b>{suffix}</b>
    </div>
  )
}

function Switch({ enabled, onChange }: { enabled: boolean; onChange?: (enabled: boolean) => void }): JSX.Element {
  return <span className={`switch ${enabled ? 'enabled' : ''}`} onClick={() => onChange?.(!enabled)}><i /></span>
}

function ProxyEnvironmentPanel({
  session,
  onUpdateFingerprint,
  onUpdateProxy,
  onClose,
}: {
  session?: ChatSession
  onUpdateFingerprint?: (sessionId: string, fingerprint: FingerprintSettings) => void
  onUpdateProxy?: (sessionId: string, proxy: ProxyConfig) => void
  onClose?: () => void
}): JSX.Element {
  const proxyBodyRef = useRef<HTMLDivElement>(null)
  const proxyTabsRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<'proxy' | 'fingerprint' | 'cookie'>('proxy')
  const [draftFingerprint, setDraftFingerprint] = useState<FingerprintSettings | undefined>(session?.fingerprint)
  const [draftProxy, setDraftProxy] = useState<ProxyConfig | undefined>(session?.proxy)
  const [draftCookie, setDraftCookie] = useState('')
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })

  useEffect(() => {
    setDraftFingerprint(session?.fingerprint ? {
      ...session.fingerprint,
      hideWebdriver: session.fingerprint.hideWebdriver ?? true,
      enableChromeObj: session.fingerprint.enableChromeObj ?? true,
      fakePlugins: session.fingerprint.fakePlugins ?? true,
      fakeOuterSize: session.fingerprint.fakeOuterSize ?? true,
    } : undefined)
    setDraftProxy(session?.proxy)
    setDraftCookie('')
  }, [session?.id])

  useLayoutEffect(() => {
    const activeBtn = proxyTabsRef.current?.querySelector('.proxy-tabs button.active')
    if (activeBtn && proxyTabsRef.current) {
      const el = activeBtn as HTMLElement
      setIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth })
    }
  }, [activeTab])

  const handleScrollTo = (id: string): void => {
    setActiveTab(id.replace('-section', '') as 'proxy' | 'fingerprint' | 'cookie')
    if (!proxyBodyRef.current) return
    if (id === 'proxy-section') {
      proxyBodyRef.current.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const el = document.getElementById(id)
    if (el) {
      const offset = id === 'fingerprint-section' ? 130 : 0
      proxyBodyRef.current.scrollTo({ top: el.offsetTop - offset, behavior: 'smooth' })
    }
  }

  const handleGenerateRandom = (): void => {
    const newFingerprint = generateRandomFingerprint()
    setDraftFingerprint(newFingerprint)
  }

  const handleApply = async (): Promise<void> => {
    if (!session) return
    if (draftFingerprint && onUpdateFingerprint) {
      const fpWithProxy = {
        ...draftFingerprint,
        proxyHost: draftProxy?.host,
        proxyPort: draftProxy?.port,
      }
      onUpdateFingerprint(session.id, draftFingerprint)
      await window.pingChat.setFingerprint(session.partition, fpWithProxy)
    }
    if (draftProxy && onUpdateProxy) {
      onUpdateProxy(session.id, draftProxy)
      await window.pingChat.setProxy(session.partition, draftProxy)
    }
    if (draftCookie.trim()) {
      await window.pingChat.setCookies(session.partition, draftCookie.trim())
    }
  }

  return (
    <aside className="translation-panel proxy-panel">
      <div className="translation-header">
        <div className="translation-title">
          <span>代理环境</span>
        </div>
        <button className="translation-menu" onClick={() => onClose?.()}><SlidersHorizontal size={14} /></button>
      </div>

      {!session ? (
        <div className="empty-state" style={{ padding: '48px 20px', opacity: 0.7 }}>
          <Zap size={48} strokeWidth={1.5} />
          <span>暂无会话</span>
          <span style={{ fontSize: 12, marginTop: 4 }}>点击左侧「创建会话」开始</span>
        </div>
      ) : (
        <>
          <div className="proxy-tabs" ref={proxyTabsRef}>
            <button className={activeTab === 'proxy' ? 'active' : ''} onClick={() => handleScrollTo('proxy-section')}>代理设置</button>
            <button className={activeTab === 'fingerprint' ? 'active' : ''} onClick={() => handleScrollTo('fingerprint-section')}>指纹设置</button>
            <button className={activeTab === 'cookie' ? 'active' : ''} onClick={() => handleScrollTo('cookie-section')}>Cookie</button>
            <span className="tab-indicator" style={{ left: indicatorStyle.left, width: indicatorStyle.width }} />
          </div>

          <div className="translation-body proxy-body" ref={proxyBodyRef}>
            <ProxySettingsTab
              fingerprint={draftFingerprint}
              proxy={draftProxy}
              cookieText={draftCookie}
              onChangeFingerprint={setDraftFingerprint}
              onChangeProxy={setDraftProxy}
              onChangeCookie={setDraftCookie}
            />
          </div>

          <div className="proxy-footer">
            <button className="secondary-action wide" onClick={handleGenerateRandom}>一键生成随机指纹</button>
            <button className="apply-action" onClick={() => void handleApply()}>应用</button>
          </div>
        </>
      )}
    </aside>
  )
}

function CustomSelect({
  options,
  placeholder,
  value,
  className,
  onChange,
}: {
  options: { value: string; label: string }[]
  placeholder?: string
  value?: string
  className?: string
  onChange?: (value: string) => void
}): JSX.Element {
  const [selected, setSelected] = useState(value ?? '')
  useEffect(() => {
    setSelected(value ?? '')
  }, [value])
  const handleValueChange = (val: string): void => {
    setSelected(val)
    onChange?.(val)
  }
  return (
    <SelectPrimitive.Root value={selected} onValueChange={handleValueChange}>
      <SelectPrimitive.Trigger className={`custom-select-trigger ${className ?? ''}`}>
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon className="custom-select-icon">
          <ChevronDown size={12} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content className="custom-select-content" position="popper" sideOffset={4}>
          <SelectPrimitive.Viewport className="custom-select-viewport">
            {options.map((opt) => (
              <SelectPrimitive.Item key={opt.value} value={opt.value} className="custom-select-item">
                <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}

function CustomTooltip({ children, content }: { children: ReactNode; content: ReactNode }): JSX.Element {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content className="custom-tooltip" side="right" sideOffset={8}>
          {content}
          <TooltipPrimitive.Arrow className="custom-tooltip-arrow" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

function ProxySettingsTab({
  fingerprint,
  proxy,
  cookieText,
  onChangeFingerprint,
  onChangeProxy,
  onChangeCookie,
}: {
  fingerprint?: FingerprintSettings
  proxy?: ProxyConfig
  cookieText?: string
  onChangeFingerprint?: (fp: FingerprintSettings) => void
  onChangeProxy?: (p: ProxyConfig) => void
  onChangeCookie?: (text: string) => void
}): JSX.Element {
  const [checkStatus, setCheckStatus] = useState<{ type: 'idle' | 'checking' | 'ok' | 'error'; message?: string }>({ type: 'idle' })

  if (!fingerprint || !proxy) {
    return (
      <section className="proxy-section">
        <h3>代理环境</h3>
        <div className="proxy-note">请先选择一个会话</div>
      </section>
    )
  }

  const handleFp = (updates: Partial<FingerprintSettings>) => {
    onChangeFingerprint?.({ ...fingerprint, ...updates })
  }

  const handleProxy = (key: keyof ProxyConfig, value: string) => {
    onChangeProxy?.({ ...proxy, [key]: value })
  }

  const handleCheckProxy = async () => {
    setCheckStatus({ type: 'checking' })
    try {
      const result = await window.pingChat.checkProxy(proxy)
      if (result.ok && result.ip) {
        setCheckStatus({ type: 'ok', message: `代理可用 IP:${result.ip} 延迟:${result.latency}ms` })
      } else {
        setCheckStatus({ type: 'error', message: result.error || '检查失败' })
      }
    } catch (e: any) {
      setCheckStatus({ type: 'error', message: e.message || '检查失败' })
    }
  }

  return (
    <section className="proxy-section">
      <h3 className="proxy-section-title" id="proxy-section">代理设置</h3>
      <ProxyField
        className="proxy-field--top"
        label={
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            智能填写
            <CustomTooltip
              content={
                <div style={{ whiteSpace: 'pre-line', fontSize: '11px' }}>
                  {'支持以下格式\n1. protocol://username:password@host:port\n2. protocol://host:port:username:password\n3. host:port:protocol\n4. host:port:username:password:protocol'}
                </div>
              }
            >
              <CircleHelp size={14} style={{ cursor: 'help', opacity: 0.6 }} />
            </CustomTooltip>
          </span>
        }
      >
        <textarea className="proxy-textarea" rows={1} />
      </ProxyField>
      <ProxyField label="选择代理">
        <CustomSelect
          className="proxy-select"
          placeholder="请选择"
          options={[{ value: 'default', label: '默认' }]}
        />
      </ProxyField>
      <ProxyField label="协议">
        <CustomSelect
          className="proxy-select"
          value={proxy.protocol}
          options={[
            { value: 'no-proxy', label: 'No Proxy' },
            { value: 'http', label: 'HTTP' },
            { value: 'https', label: 'HTTPS' },
            { value: 'socks5', label: 'SOCKS5' }
          ]}
          onChange={(v) => handleProxy('protocol', v)}
        />
      </ProxyField>
      <ProxyField label="主机 : 端口">
        <div className="host-port">
          <input placeholder="主机" value={proxy.host} onChange={(e) => handleProxy('host', e.target.value)} />
          <span>:</span>
          <input placeholder="端口" value={proxy.port} onChange={(e) => handleProxy('port', e.target.value)} />
        </div>
      </ProxyField>
      <ProxyField label="用户名">
        <input className="proxy-input" placeholder="用户名" value={proxy.username} onChange={(e) => handleProxy('username', e.target.value)} />
      </ProxyField>
      <ProxyField label="密码">
        <div className="password-check">
          <input className="proxy-input" type="password" placeholder="密码" value={proxy.password} onChange={(e) => handleProxy('password', e.target.value)} />
          <button className="proxy-check-btn" onClick={() => void handleCheckProxy()} disabled={checkStatus.type === 'checking'}>
            {checkStatus.type === 'checking' ? '检查中…' : '检查代理服务器'}
          </button>
        </div>
        {checkStatus.type !== 'idle' && (
          <div className={`proxy-note ${checkStatus.type === 'ok' ? 'proxy-note--ok' : checkStatus.type === 'error' ? 'proxy-note--error' : ''}`}>
            {checkStatus.message}
          </div>
        )}
      </ProxyField>
      <h3 className="proxy-section-title" id="fingerprint-section">指纹设置</h3>
      <ProxyField label="浏览器版本">
        <CustomSelect
          className="proxy-select"
          value={fingerprint.browserVersion}
          options={[
            { value: 'random', label: '随机版本' },
            ...BROWSER_VERSIONS.map((v) => ({ value: v, label: v })),
          ]}
          onChange={(v) => {
            if (v === 'random') {
              const randomFp = generateRandomFingerprint()
              handleFp({ browserVersion: randomFp.browserVersion, userAgent: randomFp.userAgent })
            } else {
              handleFp({ browserVersion: v, userAgent: getUserAgentForVersion(fingerprint.os, v) })
            }
          }}
        />
      </ProxyField>
      <ProxyField label="操作系统">
        <SegmentedControl values={['Windows', 'MacOS']} active={fingerprint.os} onChange={(v) => {
          handleFp({ os: v, userAgent: getUserAgentForVersion(v, fingerprint.browserVersion) })
        }} />
      </ProxyField>
      <div className="proxy-note">建议您使用与本地操作相匹配的User Agent</div>
      <ProxyField label="User Agent" className="proxy-field--top">
        <textarea
          className="proxy-textarea user-agent"
          value={fingerprint.userAgent}
          onChange={(e) => handleFp({ userAgent: e.target.value })}
        />
      </ProxyField>
      <ProxyField label="地理位置">
        <SegmentedControl values={['询问', '允许', '禁用']} active={fingerprint.geolocation} onChange={(v) => handleFp({ geolocation: v })} />
      </ProxyField>
      {fingerprint.geolocation === '询问' && (
        <div className="proxy-note">网站会显示获取您当前位置的询问提示，您可以允许或禁止，与普通浏览器的提示一样</div>
      )}
      {fingerprint.geolocation === '允许' && (
        <div className="proxy-note">网站请求获取您当前位置时，始终被允许</div>
      )}
      {fingerprint.geolocation === '禁用' && (
        <div className="proxy-note">网站请求获取您当前位置时，始终被禁止</div>
      )}
      <ProxyField label="分辨率">
        <CustomSelect
          className="proxy-select"
          value={fingerprint.resolution}
          options={[
            { value: '跟随系统', label: '跟随系统' },
            { value: '1920x1080', label: '1920 x 1080' },
            { value: '1366x768', label: '1366 x 768' },
            { value: '1440x900', label: '1440 x 900' },
            { value: '1536x864', label: '1536 x 864' },
            { value: '1280x720', label: '1280 x 720' },
            { value: '2560x1440', label: '2560 x 1440' },
            { value: '3840x2160', label: '3840 x 2160' },
          ]}
          onChange={(v) => handleFp({ resolution: v })}
        />
      </ProxyField>
      <ProxyField label="WebRTC">
        <SegmentedControl values={['替换', '允许', '禁用']} active={fingerprint.webrtc} onChange={(v) => handleFp({ webrtc: v })} />
      </ProxyField>
      {fingerprint.webrtc === '替换' && (
        <div className="proxy-note">开启WebRTC，将公网IP替换为代理IP</div>
      )}
      {fingerprint.webrtc === '允许' && (
        <div className="proxy-note">开启WebRTC，将使用当前电脑的真实IP</div>
      )}
      {fingerprint.webrtc === '禁用' && (
        <div className="proxy-note">WebRTC被关闭，网站会检测到您关闭了WebRTC</div>
      )}
      <ProxyField label="Canvas">
        <Switch enabled={fingerprint.canvas} onChange={(v) => handleFp({ canvas: v })} />
      </ProxyField>
      <div className="proxy-note">启用噪音，掩盖真实Canvas</div>
      <ProxyField label="AudioContext">
        <Switch enabled={fingerprint.audioContext} onChange={(v) => handleFp({ audioContext: v })} />
      </ProxyField>
      <div className="proxy-note">启用噪音，掩盖真实AudioContext</div>
      <ProxyField label="硬件并发数">
        <CustomSelect
          className="proxy-select"
          value={fingerprint.hardwareConcurrency}
          options={[
            { value: '2核', label: '2核' },
            { value: '4核', label: '4核' },
            { value: '6核', label: '6核' },
            { value: '8核', label: '8核' },
            { value: '12核', label: '12核' },
            { value: '16核', label: '16核' },
            { value: '20核', label: '20核' },
            { value: '24核', label: '24核' },
            { value: '32核', label: '32核' },
          ]}
          onChange={(v) => handleFp({ hardwareConcurrency: v })}
        />
      </ProxyField>
      <div className="proxy-note">设置当前浏览器环境的CPU核心数</div>
      <ProxyField label="设备内存">
        <CustomSelect
          className="proxy-select"
          value={fingerprint.deviceMemory}
          options={[
            { value: '2GB', label: '2GB' },
            { value: '4GB', label: '4GB' },
            { value: '6GB', label: '6GB' },
            { value: '8GB', label: '8GB' },
            { value: '16GB', label: '16GB' },
            { value: '32GB', label: '32GB' },
            { value: '64GB', label: '64GB' },
            { value: '128GB', label: '128GB' },
          ]}
          onChange={(v) => handleFp({ deviceMemory: v })}
        />
      </ProxyField>
      <div className="proxy-note">设置当前浏览器环境模拟机器内存</div>
      <ProxyField label="时区">
        <CustomSelect
          className="proxy-select"
          value={fingerprint.timezone}
          options={timezoneOptions.map((tz) => ({ value: tz, label: tz }))}
          onChange={(v) => handleFp({ timezone: v })}
        />
      </ProxyField>
      <div className="proxy-note">设置浏览器环境时区，匹配目标地区时间偏好</div>
      <ProxyField label="WebDriver 隐藏">
        <Switch enabled={fingerprint.hideWebdriver} onChange={(v) => handleFp({ hideWebdriver: v })} />
      </ProxyField>
      <div className="proxy-note">彻底隐藏 webdriver 检测标记，深度模拟真实用户行为特征</div>
      <ProxyField label="Chrome 对象">
        <Switch enabled={fingerprint.enableChromeObj} onChange={(v) => handleFp({ enableChromeObj: v })} />
      </ProxyField>
      <div className="proxy-note">注入 window.chrome，还原真实浏览器</div>
      <ProxyField label="插件伪装">
        <Switch enabled={fingerprint.fakePlugins} onChange={(v) => handleFp({ fakePlugins: v })} />
      </ProxyField>
      <div className="proxy-note">伪造插件列表，避免空列表暴露真实环境</div>
      <ProxyField label="窗口尺寸">
        <Switch enabled={fingerprint.fakeOuterSize} onChange={(v) => handleFp({ fakeOuterSize: v })} />
      </ProxyField>
      <div className="proxy-note">伪装窗口尺寸，匹配分辨率数据避免被检测</div>
      <h3 className="proxy-section-title" id="cookie-section">Cookie</h3>
      <ProxyField label="Cookie" className="proxy-field--top">
        <textarea
          className="proxy-textarea"
          placeholder="name=value; name2=value2..."
          value={cookieText ?? ''}
          onChange={(e) => onChangeCookie?.(e.target.value)}
        />
      </ProxyField>
      <div className="proxy-note">用于登录会话使用，点击底部应用后生效</div>
    </section>
  )
}

function FingerprintSettingsTab({ fingerprint, onChange }: { fingerprint?: FingerprintSettings; onChange?: (fp: FingerprintSettings) => void }): JSX.Element {
  const handleChange = (key: keyof FingerprintSettings, value: any): void => {
    if (fingerprint && onChange) {
      onChange({ ...fingerprint, [key]: value })
    }
  }

  if (!fingerprint) {
    return (
      <section className="proxy-section">
        <h3>指纹设置</h3>
        <div className="proxy-note">请先选择一个会话</div>
      </section>
    )
  }

  return (
    <section className="proxy-section">
      <h3>指纹设置</h3>
      <ProxyField label="浏览器版本">
        <SelectLike value={fingerprint.browserVersion} />
      </ProxyField>
      <ProxyField label="操作系统">
        <SegmentedControl values={['Windows', 'MacOS']} active={fingerprint.os} />
      </ProxyField>
      <div className="proxy-note">建议使用与本站控件相匹配的User-Agent</div>
      <ProxyField label="User Agent" className="proxy-field--top">
        <div className="user-agent-stack">
          <textarea className="proxy-textarea user-agent" value={fingerprint.userAgent} onChange={(e) => handleChange('userAgent', e.target.value)} />
          <div className="user-agent-actions">
            <button className="secondary-action" onClick={() => handleChange('userAgent', generateRandomFingerprint().userAgent)}>换一换</button>
            <button className="secondary-action wide">缓一缓</button>
          </div>
        </div>
      </ProxyField>
      <ProxyField label="地理位置">
        <SegmentedControl values={['询问', '允许', '禁用']} active={fingerprint.geolocation} />
      </ProxyField>
      <div className="proxy-note">网站会显示获取当地的位置的询问框，您可以允许或禁止，与普通浏览器的提示一样</div>
      <ProxyField label="分辨率">
        <SegmentedControl values={['跟随系统', '自定义', '随机']} active={fingerprint.resolution} />
      </ProxyField>
      <ProxyField label="WebRTC">
        <SegmentedControl values={['替换', '允许', '禁用']} active={fingerprint.webrtc} />
      </ProxyField>
      <div className="proxy-note">开启WebRTC，将公网IP替换为代理IP</div>
      <ProxyField label="Canvas">
        <Switch enabled={fingerprint.canvas} />
      </ProxyField>
      <div className="proxy-note">启用噪音，将鉴别真实Canvas</div>
      <ProxyField label="AudioContext">
        <Switch enabled={fingerprint.audioContext} />
      </ProxyField>
      <div className="proxy-note">启用噪音，将鉴别真实AudioContext</div>
      <ProxyField label="硬件并发数">
        <SelectLike value={fingerprint.hardwareConcurrency} />
      </ProxyField>
      <div className="proxy-note">设置当前浏览器环境的CPU核心数</div>
      <ProxyField label="设备内存">
        <SelectLike value={fingerprint.deviceMemory} />
      </ProxyField>
      <div className="proxy-note">设置当前浏览器环境模拟机器内存</div>
    </section>
  )
}

function CookieSettingsTab(): JSX.Element {
  return (
    <section className="proxy-section cookie-empty">
      <textarea className="proxy-textarea cookie-box" placeholder="可在这里粘贴 Cookie 配置" />
    </section>
  )
}

function ProxyField({ label, children, className }: { label?: string | ReactNode; children: ReactNode; className?: string }): JSX.Element {
  return (
    <label className={`proxy-field ${className ?? ''}`} style={label === '' || label == null ? { gridTemplateColumns: '1fr' } : undefined}>
      {label !== '' && label != null && <span>{label}</span>}
      {children}
    </label>
  )
}

function SegmentedControl({ values, active, onChange }: { values: string[]; active: string; onChange?: (value: string) => void }): JSX.Element {
  return (
    <div className="segmented-control">
      {values.map((value) => (
        <button key={value} className={value === active ? 'active' : ''} onClick={() => onChange?.(value)}>{value}</button>
      ))}
    </div>
  )
}

function buildSystemPrompt(config: { systemPrompt: string; role: string; tone: string; length: string; salutation: string; allowEmoji: boolean }): string {
  const ruleParts: string[] = []
  const roleMap: Record<string, string> = {
    客服专员: '你是一位专业的客服专员',
    销售顾问: '你是一位善于沟通的销售顾问',
    技术支持: '你是一位耐心细致的技术支持工程师',
    运营助手: '你是一位活跃的社交媒体运营助手',
    自定义: config.systemPrompt,
  }
  if (roleMap[config.role] && config.role !== '自定义') {
    ruleParts.push(roleMap[config.role])
  }
  const toneMap: Record<string, string> = {
    热情: '语气要热情活泼',
    随意: '语气要轻松随意',
    正式: '语气要正式专业',
    幽默: '语气要幽默风趣',
    冷静: '语气要冷静理性',
    专业: '语气要专业严谨',
  }
  if (toneMap[config.tone]) ruleParts.push(toneMap[config.tone])
  const lenMap: Record<string, string> = {
    简短: '回复尽量简短，控制在50字以内',
    适中: '回复长度适中，控制在100字左右',
    详细: '回复可以详细一些，200字以内',
  }
  if (lenMap[config.length]) ruleParts.push(lenMap[config.length])
  const salMap: Record<string, string> = {
    您: "称呼用户为'您'",
    亲: "称呼用户为'亲'",
    老板: "称呼用户为'老板'",
    不称呼: '不要加称呼',
  }
  if (salMap[config.salutation]) ruleParts.push(salMap[config.salutation])
  ruleParts.push(config.allowEmoji ? '可以适当使用表情符号' : '不要使用表情符号')
  return config.systemPrompt + (ruleParts.length ? '\n\n要求：' + ruleParts.join('，') + '。' : '')
}

function AutoReplyPanel({
  session,
  onClose,
  enabled,
  onToggleEnabled,
  monitoringEnabled,
  onToggleMonitoring,
  processing,
  processedCount,
  messages,
  onClearMessages,
  config,
  onUpdateConfig,
  onSendReply,
  chatStats,
}: {
  session?: ChatSession
  onClose?: () => void
  enabled: boolean
  onToggleEnabled: (v: boolean) => void
  monitoringEnabled: boolean
  onToggleMonitoring: (v: boolean) => void
  processing: boolean
  processedCount: number
  messages: ChatMessage[]
  onClearMessages: () => void
  config: { apiKey: string; endpoint: string; model: string; systemPrompt: string; tone: string; length: string; salutation: string; allowEmoji: boolean; templates: Array<{ title: string; content: string }>; delaySeconds: number; role: string; blacklist: string[]; keywords: string[]; keywordResponse: string; temperature: number; maxTokens: number; contextRounds: number }
  onUpdateConfig: (updates: Partial<typeof config>) => void
  onSendReply: (partition: string, content: string) => void
  chatStats: { partition: string; totalCount: number; groupCount: number; userCount: number; totalUnread: number; contacts: Array<{ name: string; isGroup: boolean; unread: number; avatar: string }>; unreadContacts: Array<{ name: string; isGroup: boolean; unread: number; avatar: string }> } | null
}): JSX.Element {
  const [activeTab, setActiveTab] = useState<'monitor' | 'overview' | 'reply' | 'model'>('monitor')
  const [generating, setGenerating] = useState(false)
  const [manualReply, setManualReply] = useState('')
  const [replyTarget, setReplyTarget] = useState('')
  const [autoReplyTarget, setAutoReplyTarget] = useState('')
  const [showUserList, setShowUserList] = useState(false)
  const [showGroupList, setShowGroupList] = useState(false)
  const tabsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setReplyTarget('')
    setAutoReplyTarget('')
    setManualReply('')
  }, [session?.id])

  useEffect(() => {
    if (!window.pingChat.onContactClicked) return
    const unlisten = window.pingChat.onContactClicked((payload) => {
      if (!session) return
      if (payload.partition !== session.partition && payload.partition !== '') return
      setReplyTarget(payload.name)
      handleScrollTo('overview')
    })
    return () => { unlisten() }
  }, [session?.partition])

  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })

  const grouped = useMemo(() => {
    const map: Record<string, ChatMessage[]> = {}
    messages.forEach((m) => {
      if (!map[m.sender]) map[m.sender] = []
      map[m.sender].push(m)
    })
    return map
  }, [messages])
  const senders = Object.keys(grouped)

  useLayoutEffect(() => {
    const activeBtn = tabsRef.current?.querySelector('.proxy-tabs button.active')
    if (activeBtn && tabsRef.current) {
      const el = activeBtn as HTMLElement
      setIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth })
    }
  }, [activeTab])

  const handleScrollTo = (tab: 'monitor' | 'overview' | 'reply' | 'model'): void => {
    setActiveTab(tab)
  }

  const handleGenerate = async (targetSender: string) => {
    if (!config.apiKey || generating) return
    setGenerating(true)
    try {
      let history = grouped[targetSender] || []
      if (config.contextRounds > 0) {
        history = history.slice(-config.contextRounds * 2)
      }
      const fullSystem = buildSystemPrompt(config)

      const msgs = [
        { role: 'system', content: fullSystem },
        ...history.map((m) => ({ role: m.isFromUser ? 'user' : 'assistant' as const, content: m.content })),
      ]
      const res = await fetch(config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({ model: config.model, messages: msgs, temperature: config.temperature, ...(config.maxTokens > 0 ? { max_tokens: config.maxTokens } : {}) }),
      })
      const data = await res.json()
      const reply = data.choices?.[0]?.message?.content
      if (reply && session) {
        onSendReply(session.partition, reply)
      }
    } catch (e) {
      console.error('Generate reply failed:', e)
    }
    setGenerating(false)
  }

  const handleManualSend = () => {
    if (!manualReply.trim() || !session) return
    onSendReply(session.partition, manualReply.trim())
    setManualReply('')
  }

  return (
    <aside className="translation-panel proxy-panel">
      <div className="translation-header">
        <div className="translation-title"><span>自动回复</span>{enabled && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: '#19d973', marginLeft: 6 }} />}</div>
        <button className="translation-menu" onClick={() => onClose?.()}><SlidersHorizontal size={14} /></button>
      </div>

      <div className="proxy-tabs" ref={tabsRef}>
        <button className={activeTab === 'monitor' ? 'active' : ''} onClick={() => handleScrollTo('monitor')}>监控面板</button>
        <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => handleScrollTo('overview')}>快捷回复</button>
        <button className={activeTab === 'reply' ? 'active' : ''} onClick={() => handleScrollTo('reply')}>自动回复</button>
        <button className={activeTab === 'model' ? 'active' : ''} onClick={() => handleScrollTo('model')}>大模型设置</button>
        <span className="tab-indicator" style={{ left: indicatorStyle.left, width: indicatorStyle.width }} />
      </div>

      <div className="translation-body proxy-body">
        {activeTab === 'monitor' && (<>
        <h3 className="proxy-section-title">监控面板</h3>
        <ProxyField label="监控状态">
          <Switch enabled={monitoringEnabled} onChange={onToggleMonitoring} />
        </ProxyField>
        <div className="proxy-note">开启后，每 5 秒自动扫描并上报聊天列表状态</div>
        <div style={{ borderTop: '1px solid #2c3135', margin: '16px 0' }} />
        {monitoringEnabled && (
          <>
            <h3 className="proxy-section-title" id="reply-users-section">用户信息</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <button
                className="secondary-action"
                style={{ padding: '10px 12px', borderRadius: 6, background: '#252a2e', border: '1px solid #2c3135', textAlign: 'left', cursor: 'pointer' }}
                onClick={() => { setShowUserList((v) => !v); setShowGroupList(false) }}
              >
                <div style={{ fontSize: 11, color: '#8c96a1', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>用户数量</span>
                  <ChevronDown size={12} style={{ transform: showUserList ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', color: '#8c96a1' }} />
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#f3f5f7' }}>{chatStats?.userCount ?? 0}<span style={{ fontSize: 11, fontWeight: 400, color: '#8c96a1', marginLeft: 4 }}>个</span></div>
              </button>
              <button
                className="secondary-action"
                style={{ padding: '10px 12px', borderRadius: 6, background: '#252a2e', border: '1px solid #2c3135', textAlign: 'left', cursor: 'pointer' }}
                onClick={() => { setShowGroupList((v) => !v); setShowUserList(false) }}
              >
                <div style={{ fontSize: 11, color: '#8c96a1', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>群聊数量</span>
                  <ChevronDown size={12} style={{ transform: showGroupList ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', color: '#8c96a1' }} />
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#f3f5f7' }}>{chatStats?.groupCount ?? 0}<span style={{ fontSize: 11, fontWeight: 400, color: '#8c96a1', marginLeft: 4 }}>个</span></div>
              </button>
            </div>
            {showUserList && (
              <div style={{ marginBottom: 12, maxHeight: 300, overflow: 'auto' }}>
                {(chatStats?.contacts ?? []).filter((c) => !c.isGroup).map((c, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: 4, background: '#252a2e', border: '1px solid #2c3135', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {c.avatar ? (
                        <img src={c.avatar} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#3a4147', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#8c96a1' }}>{c.name.charAt(0)}</div>
                      )}
                      <span style={{ fontSize: 12, color: '#f3f5f7' }}>{c.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 2 }}>
                      <button className="icon-action" style={{ height: 22, width: 22, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="快捷回复" onClick={() => { setReplyTarget(c.name); handleScrollTo('overview'); if (session) void window.pingChat.selectChat(session.partition, c.name) }}><Send size={12} /></button>
                      <button className="icon-action" style={{ height: 22, width: 22, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="自动回复" onClick={() => { setAutoReplyTarget(c.name); handleScrollTo('reply'); if (session) void window.pingChat.selectChat(session.partition, c.name) }}><Zap size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {showGroupList && (
              <div style={{ marginBottom: 12, maxHeight: 300, overflow: 'auto' }}>
                {(chatStats?.contacts ?? []).filter((c) => c.isGroup).map((c, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: 4, background: '#252a2e', border: '1px solid #2c3135', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {c.avatar ? (
                        <img src={c.avatar} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#3a4147', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#8c96a1' }}>{c.name.charAt(0)}</div>
                      )}
                      <span style={{ fontSize: 12, color: '#f3f5f7' }}>{c.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 2 }}>
                      <button className="icon-action" style={{ height: 22, width: 22, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="快捷回复" onClick={() => { setReplyTarget(c.name); handleScrollTo('overview'); if (session) void window.pingChat.selectChat(session.partition, c.name) }}><Send size={12} /></button>
                      <button className="icon-action" style={{ height: 22, width: 22, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="自动回复" onClick={() => { setAutoReplyTarget(c.name); handleScrollTo('reply'); if (session) void window.pingChat.selectChat(session.partition, c.name) }}><Zap size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {monitoringEnabled && (<>
        <h3 className="proxy-section-title" id="reply-messages-section" style={{ marginTop: 30 }}>消息监控</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <div style={{ padding: '10px 12px', borderRadius: 6, background: '#252a2e', border: '1px solid #2c3135' }}>
            <div style={{ fontSize: 11, color: '#8c96a1', marginBottom: 4 }}>未处理</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#ff9b6a' }}>{chatStats?.totalUnread ?? messages.length - processedCount}<span style={{ fontSize: 11, fontWeight: 400, color: '#8c96a1', marginLeft: 4 }}>个</span></div>
          </div>
          <div style={{ padding: '10px 12px', borderRadius: 6, background: '#252a2e', border: '1px solid #2c3135' }}>
            <div style={{ fontSize: 11, color: '#8c96a1', marginBottom: 4 }}>已处理</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#19d973' }}>{processedCount}<span style={{ fontSize: 11, fontWeight: 400, color: '#8c96a1', marginLeft: 4 }}>个</span></div>
          </div>
        </div>

        {chatStats && chatStats.unreadContacts.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            {chatStats.unreadContacts.filter((c) => !c.isGroup).length > 0 && (
              <div style={{ marginBottom: 8, fontSize: 12, color: '#8c96a1', fontWeight: 600 }}>用户</div>
            )}
            {chatStats.unreadContacts.filter((c) => !c.isGroup).map((c, i) => (
              <div key={`u-${i}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: 4, background: '#252a2e', border: '1px solid #2c3135', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {c.avatar ? (
                    <img src={c.avatar} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#3a4147', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#8c96a1' }}>{c.name.charAt(0)}</div>
                  )}
                  <span style={{ fontSize: 12, color: '#f3f5f7' }}>{c.name}</span>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button style={{ height: 22, width: 22, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: '#8c96a1' }} title="快捷回复" onClick={() => { setReplyTarget(c.name); handleScrollTo('overview'); if (session) void window.pingChat.selectChat(session.partition, c.name) }}><Send size={12} /></button>
                  <button style={{ height: 22, width: 22, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: '#8c96a1' }} title="自动回复" onClick={() => { setAutoReplyTarget(c.name); handleScrollTo('reply'); if (session) void window.pingChat.selectChat(session.partition, c.name) }}><Zap size={12} /></button>
                </div>
              </div>
            ))}
            {chatStats.unreadContacts.filter((c) => c.isGroup).length > 0 && (
              <div style={{ marginTop: 8, marginBottom: 8, fontSize: 12, color: '#8c96a1', fontWeight: 600 }}>群聊</div>
            )}
            {chatStats.unreadContacts.filter((c) => c.isGroup).map((c, i) => (
              <div key={`g-${i}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: 4, background: '#252a2e', border: '1px solid #2c3135', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {c.avatar ? (
                    <img src={c.avatar} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#3a4147', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#8c96a1' }}>{c.name.charAt(0)}</div>
                  )}
                  <span style={{ fontSize: 12, color: '#f3f5f7' }}>{c.name}</span>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button style={{ height: 22, width: 22, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: '#8c96a1' }} title="快捷回复" onClick={() => { setReplyTarget(c.name); handleScrollTo('overview'); if (session) void window.pingChat.selectChat(session.partition, c.name) }}><Send size={12} /></button>
                  <button style={{ height: 22, width: 22, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: '#8c96a1' }} title="自动回复" onClick={() => { setAutoReplyTarget(c.name); handleScrollTo('reply'); if (session) void window.pingChat.selectChat(session.partition, c.name) }}><Zap size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {senders.length > 0 && (
          <button className="secondary-action wide" style={{ marginBottom: 12 }} onClick={onClearMessages}>清空消息</button>
        )}
        {senders.map((sender) => {
          const msgs = grouped[sender]
          const last = msgs[msgs.length - 1]
          return (
            <div key={sender} className="session-card" style={{ marginBottom: 8, padding: '8px 10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 12, color: '#f3f5f7' }}>{sender}</strong>
                <span style={{ fontSize: 10, color: '#8c96a1' }}>{msgs.length} 条</span>
              </div>
              <div style={{ marginTop: 4, fontSize: 11, color: '#a8afb7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {last.content}
              </div>
              <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                <button className="secondary-action" style={{ flex: 1, height: 26, fontSize: 11 }} onClick={() => handleGenerate(sender)} disabled={generating || !config.apiKey}>
                  {generating ? '生成中…' : 'AI 回复'}
                </button>
                <button className="secondary-action" style={{ flex: 1, height: 26, fontSize: 11 }} onClick={() => { setReplyTarget(sender); handleScrollTo('overview') }}>
                  手动回复
                </button>
              </div>
            </div>
          )
        })}
        </>)}

        </>)} {activeTab === 'overview' && (<>
        {replyTarget && (
          <div style={{ marginTop: 20, marginBottom: 12, padding: '10px 12px', borderRadius: 6, border: '1px dashed #ff8c42', borderWidth: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#ff8c42' }}>正在回复: {replyTarget}</span>
            <button style={{ height: 22, width: 22, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: '#ff8c42', border: 'none', cursor: 'pointer' }} onClick={() => { setReplyTarget(''); setManualReply(''); handleScrollTo('monitor') }}><X size={14} /></button>
          </div>
        )}
        <h3 className="proxy-section-title" id="reply-overview-section">快捷回复</h3>
        {replyTarget && manualReply && (
          <div style={{ marginTop: 12 }}>
            <textarea className="proxy-textarea" rows={3} placeholder="输入回复内容…" value={manualReply} onChange={(e) => setManualReply(e.target.value)} />
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button className="apply-action" style={{ flex: 1, height: 28, fontSize: 11 }} onClick={handleManualSend}>发送</button>
              <button className="secondary-action" style={{ flex: 1, height: 28, fontSize: 11 }} onClick={() => { setReplyTarget(''); setManualReply('') }}>取消</button>
            </div>
          </div>
        )}

        <ProxyField label="" className="proxy-field--top">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
            <input
              id="template-title-quick"
              placeholder="模板标题"
              style={{ height: 32, padding: '0 8px', borderRadius: 4, border: '1px solid #33373d', background: '#151719', color: '#d8dde3', fontSize: 13, outline: 'none' }}
            />
            <textarea
              id="template-input-quick"
              className="proxy-textarea"
              rows={3}
              placeholder="输入常用回复内容…"
              style={{ resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="create-button"
                style={{ height: 32, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', flex: 1, opacity: replyTarget ? 1 : 0.5, cursor: replyTarget ? 'pointer' : 'not-allowed' }}
                disabled={!replyTarget}
                onClick={() => {
                  const contentInput = document.getElementById('template-input-quick') as HTMLInputElement
                  const content = contentInput?.value.trim()
                  if (!content || !replyTarget) return
                  setManualReply(content)
                  if (session) onSendReply(session.partition, content)
                  setManualReply('')
                  contentInput.value = ''
                }}
              >
                <Send size={12} />
                发送
              </button>
              <button
                className="secondary-action"
                style={{ height: 32, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', flex: 1 }}
                onClick={() => {
                  const titleInput = document.getElementById('template-title-quick') as HTMLInputElement
                  const contentInput = document.getElementById('template-input-quick') as HTMLInputElement
                  const title = titleInput?.value.trim() || '未命名'
                  const content = contentInput?.value.trim()
                  if (!content) return
                  onUpdateConfig({ templates: [...config.templates, { title, content }] })
                  titleInput.value = ''
                  contentInput.value = ''
                }}
              >
                <Plus size={12} />
                添加
              </button>
              <button
                className="secondary-action"
                style={{ height: 32, padding: '0 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', flex: 1 }}
                onClick={() => {
                  const titleInput = document.getElementById('template-title-quick') as HTMLInputElement
                  const contentInput = document.getElementById('template-input-quick') as HTMLInputElement
                  if (titleInput) titleInput.value = ''
                  if (contentInput) contentInput.value = ''
                }}
              >
                <Eraser size={12} />
                清空
              </button>
            </div>
          </div>
        </ProxyField>
        <div style={{ borderTop: '1px solid #2c3135', margin: '16px 0' }} />

        <h3 className="proxy-section-title" id="reply-template-list-section">快捷模版</h3>
        {config.templates.length === 0 ? (
          <div className="proxy-note" style={{ margin: '0 0 15px 0', padding: '43px 10px', border: '1px dashed #3a4147', borderRadius: 6, textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>暂无模板，请在上方的快捷模板区域添加</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {config.templates.map((t, i) => {
              const canSend = !!replyTarget
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    padding: '12px 14px',
                    borderRadius: 8,
                    background: '#252a2e',
                    border: '1px solid #2c3135',
                    opacity: canSend ? 1 : 0.45,
                    transition: 'opacity 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MessageSquare size={14} style={{ color: '#04c768', flexShrink: 0 }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#f3f5f7', wordBreak: 'break-word' }}>{t.title}</span>
                  </div>
                  <span style={{ fontSize: 13, color: '#a8afb7', wordBreak: 'break-word', lineHeight: 1.5, paddingLeft: 22 }}>{t.content}</span>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                    <button
                      className="create-button"
                      style={{ height: 28, minWidth: 80, maxWidth: 80, padding: 0, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, opacity: canSend ? 1 : 0.5, cursor: canSend ? 'pointer' : 'not-allowed' }}
                      disabled={!canSend}
                      onClick={() => {
                        setManualReply(t.content)
                        handleManualSend()
                      }}
                    >
                      <Send size={12} />
                      发送
                    </button>
                    <button
                      className="secondary-action"
                      style={{ height: 28, minWidth: 80, maxWidth: 80, padding: 0, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                      onClick={() => {
                        const next = config.templates.filter((_, idx) => idx !== i)
                        onUpdateConfig({ templates: next })
                      }}
                    >
                      <Trash2 size={12} />
                      删除
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        </>)} {activeTab === 'reply' && (<>
        <h3 className="proxy-section-title" id="reply-reply-section">自动回复</h3>
        <ProxyField label="自动处理消息">
          <Switch enabled={enabled} onChange={onToggleEnabled} />
        </ProxyField>
        <div className="proxy-note">开启后，收到新消息将自动调用 AI 来生成回复</div>
        {autoReplyTarget && (
          <div style={{ marginTop: 12, padding: '8px 10px', borderRadius: 4, background: '#252a2e', border: '1px solid #2c3135', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: '#f3f5f7' }}>正在自动回复: {autoReplyTarget}</span>
            <button style={{ height: 22, width: 22, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: '#f3f5f7', border: 'none', cursor: 'pointer' }} onClick={() => setAutoReplyTarget('')}><X size={14} /></button>
          </div>
        )}

        <div style={{ borderTop: '1px solid #2c3135', margin: '16px 0' }} />
        <h4 style={{ fontSize: 16, margin: '0 0 20px', fontWeight: 700 }}>回复风格</h4>
        <ProxyField label="角色设定">
          <CustomSelect
            placeholder="选择角色"
            value={config.role}
            options={[
              { value: '客服专员', label: '客服专员' },
              { value: '销售顾问', label: '销售顾问' },
              { value: '技术支持', label: '技术支持' },
              { value: '运营助手', label: '运营助手' },
              { value: '自定义', label: '自定义' },
            ]}
            onChange={(val) => onUpdateConfig({ role: val })}
          />
        </ProxyField>
        <div className="proxy-note">AI 助手的身份角色，影响回复定位</div>

        <ProxyField label="系统提示词" className="proxy-field--top">
          <textarea className="proxy-textarea" rows={4} value={config.systemPrompt} onChange={(e) => onUpdateConfig({ systemPrompt: e.target.value })} />
        </ProxyField>
        <div className="proxy-note">定义 AI 助手的角色和风格，规则自动追加</div>

        <ProxyField label="语气">
          <CustomSelect
            placeholder="选择语气"
            value={config.tone}
            options={[
              { value: '热情', label: '热情' },
              { value: '随意', label: '随意' },
              { value: '正式', label: '正式' },
              { value: '幽默', label: '幽默' },
              { value: '冷静', label: '冷静' },
              { value: '专业', label: '专业' },
            ]}
            onChange={(val) => onUpdateConfig({ tone: val })}
          />
        </ProxyField>
        <div className="proxy-note">AI 回复用户的整体语气风格</div>

        <ProxyField label="回复长度">
          <CustomSelect
            placeholder="选择长度"
            value={config.length}
            options={[
              { value: '简短', label: '简短（50字内）' },
              { value: '适中', label: '适中（100字左右）' },
              { value: '详细', label: '详细（200字内）' },
            ]}
            onChange={(val) => onUpdateConfig({ length: val })}
          />
        </ProxyField>
        <div className="proxy-note">限制 AI 回复的字数范围</div>

        <ProxyField label="称呼习惯">
          <CustomSelect
            placeholder="选择称呼"
            value={config.salutation}
            options={[
              { value: '您', label: '您' },
              { value: '亲', label: '亲' },
              { value: '老板', label: '老板' },
              { value: '不称呼', label: '不称呼' },
            ]}
            onChange={(val) => onUpdateConfig({ salutation: val })}
          />
        </ProxyField>
        <div className="proxy-note">AI 如何称呼用户</div>

        <ProxyField label="表情符号">
          <Switch enabled={config.allowEmoji} onChange={(v) => onUpdateConfig({ allowEmoji: v })} />
        </ProxyField>
        <div className="proxy-note">允许 AI 在回复中使用表情符号</div>

        <div style={{ borderTop: '1px solid #2c3135', margin: '16px 0' }} />
        <h4 style={{ fontSize: 16, margin: '16px 0 20px', fontWeight: 700 }}>触发策略</h4>
        <ProxyField label="延迟回复">
          <CustomSelect
            placeholder="选择延迟"
            value={String(config.delaySeconds)}
            options={[
              { value: '0', label: '立即回复' },
              { value: '2', label: '延迟 2 秒' },
              { value: '5', label: '延迟 5 秒' },
              { value: '10', label: '延迟 10 秒' },
            ]}
            onChange={(val) => onUpdateConfig({ delaySeconds: Number(val) })}
          />
        </ProxyField>
        <div className="proxy-note">收到消息后延迟一段时间再自动回复</div>

        <ProxyField label="快捷模板" className="proxy-field--top">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                <input
                  id="template-title"
                  placeholder="模板标题"
                  style={{ height: 28, padding: '0 8px', borderRadius: 4, border: '1px solid #2c3135', background: '#1c2024', color: '#f3f5f7', fontSize: 12, outline: 'none' }}
                />
                <textarea
                  id="template-input"
                  className="proxy-textarea"
                  rows={3}
                  placeholder="输入常用回复内容…"
                  style={{ flex: 1, resize: 'vertical' }}
                />
              </div>
              <button
                className="secondary-action"
                style={{ height: 28, padding: '0 10px', fontSize: 11, alignSelf: 'flex-start' }}
                onClick={() => {
                  const titleInput = document.getElementById('template-title') as HTMLInputElement
                  const contentInput = document.getElementById('template-input') as HTMLInputElement
                  const title = titleInput?.value.trim() || '未命名'
                  const content = contentInput?.value.trim()
                  if (!content) return
                  onUpdateConfig({ templates: [...config.templates, { title, content }] })
                  titleInput.value = ''
                  contentInput.value = ''
                }}
              >
                添加
              </button>
            </div>
            {config.templates.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {config.templates.map((t, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '3px 8px',
                      borderRadius: 4,
                      background: '#2c3135',
                      fontSize: 11,
                      color: '#a8afb7',
                      cursor: 'pointer',
                    }}
                    onClick={() => { setManualReply(t.content); handleScrollTo('overview') }}
                    title={t.content}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{t.title}</span>
                    <span
                      style={{ color: '#8c96a1', fontSize: 12, lineHeight: 1 }}
                      onClick={(e) => {
                        e.stopPropagation()
                        const next = config.templates.filter((_, idx) => idx !== i)
                        onUpdateConfig({ templates: next })
                      }}
                    >
                      ×
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ProxyField>
        <div className="proxy-note">点击模板可快速填入手动回复框，点 × 删除</div>

        <ProxyField label="黑名单" className="proxy-field--top">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                id="blacklist-input"
                className="proxy-input"
                placeholder="输入用户名关键词…"
                style={{ flex: 1 }}
              />
              <button
                className="secondary-action"
                style={{ height: 28, padding: '0 10px', fontSize: 11 }}
                onClick={() => {
                  const input = document.getElementById('blacklist-input') as HTMLInputElement
                  const text = input?.value.trim()
                  if (!text) return
                  onUpdateConfig({ blacklist: [...config.blacklist, text] })
                  input.value = ''
                }}
              >
                添加
              </button>
            </div>
            {config.blacklist.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {config.blacklist.map((b, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '3px 8px',
                      borderRadius: 4,
                      background: '#2c3135',
                      fontSize: 11,
                      color: '#a8afb7',
                    }}
                  >
                    <span>{b}</span>
                    <span
                      style={{ color: '#8c96a1', fontSize: 12, lineHeight: 1, cursor: 'pointer' }}
                      onClick={() => {
                        const next = config.blacklist.filter((_, idx) => idx !== i)
                        onUpdateConfig({ blacklist: next })
                      }}
                    >
                      ×
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ProxyField>
        <div className="proxy-note">黑名单中的用户不会触发自动回复</div>

        <ProxyField label="关键词拦截" className="proxy-field--top">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                id="keyword-input"
                className="proxy-input"
                placeholder="输入拦截关键词…"
                style={{ flex: 1 }}
              />
              <button
                className="secondary-action"
                style={{ height: 28, padding: '0 10px', fontSize: 11 }}
                onClick={() => {
                  const input = document.getElementById('keyword-input') as HTMLInputElement
                  const text = input?.value.trim()
                  if (!text) return
                  onUpdateConfig({ keywords: [...config.keywords, text] })
                  input.value = ''
                }}
              >
                添加
              </button>
            </div>
            {config.keywords.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {config.keywords.map((k, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '3px 8px',
                      borderRadius: 4,
                      background: '#2c3135',
                      fontSize: 11,
                      color: '#a8afb7',
                    }}
                  >
                    <span>{k}</span>
                    <span
                      style={{ color: '#8c96a1', fontSize: 12, lineHeight: 1, cursor: 'pointer' }}
                      onClick={() => {
                        const next = config.keywords.filter((_, idx) => idx !== i)
                        onUpdateConfig({ keywords: next })
                      }}
                    >
                      ×
                    </span>
                  </div>
                ))}
              </div>
            )}
            <textarea
              className="proxy-textarea"
              rows={4}
              placeholder="触发关键词时的固定回复内容…"
              value={config.keywordResponse}
              onChange={(e) => onUpdateConfig({ keywordResponse: e.target.value })}
            />
          </div>
        </ProxyField>
        <div className="proxy-note">收到含关键词的消息时，发送回复不调用 AI</div>

        <div style={{ borderTop: '1px solid #2c3135', margin: '16px 0' }} />
        <h4 style={{ fontSize: 16, margin: '16px 0 20px', fontWeight: 700 }}>模型参数</h4>
        <ProxyField label="Temperature">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(config.temperature * 100)}
              onChange={(e) => onUpdateConfig({ temperature: Number(e.target.value) / 100 })}
              style={{ flex: 1, accentColor: '#19d973' }}
            />
            <span style={{ fontSize: 12, color: '#a8afb7', width: 40, textAlign: 'right' }}>{config.temperature.toFixed(1)}</span>
          </div>
        </ProxyField>
        <div className="proxy-note">控制创意程度，越低越保守（0.0 ~ 1.0）</div>

        <ProxyField label="最大字数">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
            <input
              type="range"
              min={0}
              max={500}
              step={50}
              value={config.maxTokens}
              onChange={(e) => onUpdateConfig({ maxTokens: Number(e.target.value) })}
              style={{ flex: 1, accentColor: '#19d973' }}
            />
            <span style={{ fontSize: 12, color: '#a8afb7', width: 40, textAlign: 'right' }}>{config.maxTokens || '无'}</span>
          </div>
        </ProxyField>
        <div className="proxy-note">限制回复的最大 token 数，0 表示不限制</div>

        <ProxyField label="上下文轮数">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
            <input
              type="range"
              min={0}
              max={20}
              value={config.contextRounds}
              onChange={(e) => onUpdateConfig({ contextRounds: Number(e.target.value) })}
              style={{ flex: 1, accentColor: '#19d973' }}
            />
            <span style={{ fontSize: 12, color: '#a8afb7', width: 40, textAlign: 'right' }}>{config.contextRounds || '无'}</span>
          </div>
        </ProxyField>
        <div className="proxy-note">AI 记忆多少轮对话历史，0 表示不限制</div>

        </>)} {activeTab === 'model' && (<>
        <h3 className="proxy-section-title" id="reply-model-section">大模型设置</h3>
        <ProxyField label="模型" className="proxy-field--top">
          <CustomSelect
            placeholder="选择模型"
            value={config.model}
            options={[
              { value: 'gpt-4o', label: 'GPT-4o' },
              { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
              { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
              { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
              { value: 'claude-3-opus', label: 'Claude 3 Opus' },
              { value: 'deepseek-chat', label: 'DeepSeek Chat' },
              { value: 'qwen-max', label: '通义千问 Max' },
              { value: 'doubao-pro', label: '豆包 Pro' },
              { value: 'moonshot-v1-8k', label: 'Kimi K1' },
              { value: 'glm-4', label: 'GLM-4' },
              { value: 'abab6', label: 'MiniMax' },
            ]}
            onChange={(val) => onUpdateConfig({ model: val })}
          />
        </ProxyField>
        <div className="proxy-note">选择常用大模型，或输入自定义模型名称</div>

        <ProxyField label="API 地址">
          <input className="proxy-input" placeholder="https://api.openai.com/v1/chat/completions" value={config.endpoint} onChange={(e) => onUpdateConfig({ endpoint: e.target.value })} />
        </ProxyField>
        <div className="proxy-note">OpenAI 兼容格式的 API 地址</div>

        <ProxyField label="API 密钥">
          <input className="proxy-input" type="password" placeholder="sk-..." value={config.apiKey} onChange={(e) => onUpdateConfig({ apiKey: e.target.value })} />
        </ProxyField>
        <div className="proxy-note">大模型服务的 API 密钥</div>
      </>)} </div>
    </aside>
  )
}

function RightToolBar({
  activeTool,
  onSelectTool,
  disabled = false,
  autoReplyProcessing = false,
}: {
  activeTool: string
  onSelectTool: (id: string) => void
  disabled?: boolean
  autoReplyProcessing?: boolean
}): JSX.Element {
  const handleClick = (id: string) => {
    if (disabled) return
    if (activeTool === id) {
      onSelectTool('')
    } else {
      onSelectTool(id)
    }
  }
  const topTools = [
    { id: 'environment', label: '代理环境', icon: <Server size={18} /> },
    { id: 'reply', label: '自动回复', icon: autoReplyProcessing ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', color: '#19d973' }} /> : <MessagesSquare size={18} /> }
  ]

  const bottomTools = [
    { id: 'support', label: '联系客服', icon: <Headphones size={18} /> }
  ]

  return (
    <aside className="right-toolbar">
      <div className="right-tool-group">
        {topTools.map((tool) => (
          <button
            key={tool.id}
            className={`right-tool ${activeTool === tool.id ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
            onClick={() => handleClick(tool.id)}
          >
            {tool.icon}
            <span>{tool.label}</span>
          </button>
        ))}
      </div>
      <div className="right-tool-group bottom">
        {bottomTools.map((tool) => (
          <button
            key={tool.id}
            className={`right-tool ${activeTool === tool.id ? 'active' : ''}`}
            onClick={() => handleClick(tool.id)}
          >
            {tool.icon}
            <span>{tool.label}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}

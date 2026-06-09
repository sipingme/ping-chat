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
  X,
  Zap,
  CircleHelp,
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
  const [autoReplyMessages, setAutoReplyMessages] = useState<ChatMessage[]>([])
  const [autoReplyProcessing, setAutoReplyProcessing] = useState(false)
  const [autoReplyConfig, setAutoReplyConfig] = useState({
    apiKey: '',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'abab6',
    systemPrompt: '你是一个友好的客服助手，请用简短的中文回复用户。',
  })

  useEffect(() => {
    const unsub = window.pingChat.onChatMessage((payload) => {
      setAutoReplyMessages((prev) => [...prev, payload])
    })
    return unsub
  }, [])

  // Auto-reply: generate AI reply when new user message arrives
  const autoReplyConfigRef = useRef(autoReplyConfig)
  autoReplyConfigRef.current = autoReplyConfig
  const autoReplyEnabledRef = useRef(autoReplyEnabled)
  autoReplyEnabledRef.current = autoReplyEnabled
  const processedReplyKeys = useRef(new Set<string>())

  useEffect(() => {
    if (!autoReplyEnabled) return
    const lastMsg = autoReplyMessages[autoReplyMessages.length - 1]
    if (!lastMsg || !lastMsg.isFromUser) return
    const key = `${lastMsg.partition}:${lastMsg.sender}:${lastMsg.content}`
    if (processedReplyKeys.current.has(key)) return
    processedReplyKeys.current.add(key)

    setAutoReplyProcessing(true)
    void (async () => {
      const config = autoReplyConfigRef.current
      if (!config.apiKey) return
      const history = autoReplyMessages.filter((m) => m.sender === lastMsg.sender)
      const msgs = [
        { role: 'system', content: config.systemPrompt },
        ...history.map((m) => ({ role: m.isFromUser ? 'user' : 'assistant' as const, content: m.content })),
      ]
      try {
        const res = await fetch(config.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
          body: JSON.stringify({ model: config.model, messages: msgs, temperature: 0.7 }),
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
              processing={autoReplyProcessing}
              messages={autoReplyMessages}
              onClearMessages={() => setAutoReplyMessages([])}
              config={autoReplyConfig}
              onUpdateConfig={(updates) => setAutoReplyConfig((prev) => ({ ...prev, ...updates }))}
              onSendReply={(partition, content) => void window.pingChat.sendReply(partition, content)}
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
    <button
      className={`session-card ${active ? 'active' : ''}`}
      style={{ '--accent': accent } as CSSProperties}
      onClick={onSelect}
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
    </button>
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

function ProxyField({ label, children, className }: { label: string | ReactNode; children: ReactNode; className?: string }): JSX.Element {
  return (
    <label className={`proxy-field ${className ?? ''}`}>
      <span>{label}</span>
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

function AutoReplyPanel({
  session,
  onClose,
  enabled,
  onToggleEnabled,
  processing,
  messages,
  onClearMessages,
  config,
  onUpdateConfig,
  onSendReply,
}: {
  session?: ChatSession
  onClose?: () => void
  enabled: boolean
  onToggleEnabled: (v: boolean) => void
  processing: boolean
  messages: ChatMessage[]
  onClearMessages: () => void
  config: { apiKey: string; endpoint: string; model: string; systemPrompt: string }
  onUpdateConfig: (updates: Partial<typeof config>) => void
  onSendReply: (partition: string, content: string) => void
}): JSX.Element {
  const [activeTab, setActiveTab] = useState<'overview' | 'reply' | 'model'>('overview')
  const [generating, setGenerating] = useState(false)
  const [manualReply, setManualReply] = useState('')
  const [replyTarget, setReplyTarget] = useState('')
  const tabsRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
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

  // Scroll listener to sync active tab with scroll position
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const onScroll = () => {
      const top = el.scrollTop
      const overviewEl = document.getElementById('reply-overview-section')
      const settingsEl = document.getElementById('reply-settings-section')
      const modelEl = document.getElementById('reply-model-section')
      const thresholds = [
        { id: 'overview' as const, offset: overviewEl ? overviewEl.offsetTop : 0 },
        { id: 'reply' as const, offset: settingsEl ? settingsEl.offsetTop : 99999 },
        { id: 'model' as const, offset: modelEl ? modelEl.offsetTop : 99999 },
      ]
      let current: 'overview' | 'reply' | 'model' = 'overview'
      for (let i = thresholds.length - 1; i >= 0; i--) {
        if (top >= thresholds[i].offset - 30) {
          current = thresholds[i].id
          break
        }
      }
      setActiveTab(current)
    }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const handleScrollTo = (id: string): void => {
    setActiveTab(id.replace('reply-', '').replace('-section', '') as 'overview' | 'reply' | 'model')
    if (!bodyRef.current) return
    if (id === 'reply-overview-section') {
      bodyRef.current.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const el = document.getElementById(id)
    if (el) {
      bodyRef.current.scrollTo({ top: el.offsetTop - 10, behavior: 'smooth' })
    }
  }

  const handleGenerate = async (targetSender: string) => {
    if (!config.apiKey || generating) return
    setGenerating(true)
    try {
      const history = grouped[targetSender] || []
      const msgs = [
        { role: 'system', content: config.systemPrompt },
        ...history.map((m) => ({ role: m.isFromUser ? 'user' : 'assistant' as const, content: m.content })),
      ]
      const res = await fetch(config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({ model: config.model, messages: msgs, temperature: 0.7 }),
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
    setReplyTarget('')
  }

  return (
    <aside className="translation-panel proxy-panel">
      <div className="translation-header">
        <div className="translation-title"><span>自动回复</span></div>
        <button className="translation-menu" onClick={() => onClose?.()}><SlidersHorizontal size={14} /></button>
      </div>

      <div className="proxy-tabs" ref={tabsRef}>
        <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => handleScrollTo('reply-overview-section')}>状态概览</button>
        <button className={activeTab === 'reply' ? 'active' : ''} onClick={() => handleScrollTo('reply-settings-section')}>回复设置</button>
        <button className={activeTab === 'model' ? 'active' : ''} onClick={() => handleScrollTo('reply-model-section')}>大模型设置</button>
        <span className="tab-indicator" style={{ left: indicatorStyle.left, width: indicatorStyle.width }} />
      </div>

      <div className="translation-body proxy-body" ref={bodyRef}>
        <h3 className="proxy-section-title" id="reply-overview-section">状态概览</h3>
        <ProxyField label="自动回复">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Switch enabled={enabled} onChange={onToggleEnabled} />
            {enabled && <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', color: '#19d973' }} />}
          </div>
        </ProxyField>
        <div className="proxy-note">开启后，收到新消息将自动调用 AI 来生成回复</div>

        <h3 className="proxy-section-title" id="reply-messages-section">消息监控</h3>
        <div className="proxy-note" style={{ marginBottom: 8 }}>已捕获 {messages.length} 条消息，来自 {senders.length} 个用户</div>
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
                <button className="secondary-action" style={{ flex: 1, height: 26, fontSize: 11 }} onClick={() => { setReplyTarget(sender); handleScrollTo('reply-settings-section') }}>
                  手动回复
                </button>
              </div>
            </div>
          )
        })}

        <h3 className="proxy-section-title" id="reply-settings-section">回复设置</h3>
        <ProxyField label="系统提示词" className="proxy-field--top">
          <textarea className="proxy-textarea" rows={5} value={config.systemPrompt} onChange={(e) => onUpdateConfig({ systemPrompt: e.target.value })} />
        </ProxyField>
        <div className="proxy-note">定义 AI 助手的角色和回复风格</div>

        {replyTarget && (
          <div style={{ marginTop: 12 }}>
            <div className="proxy-note">正在回复: {replyTarget}</div>
            <textarea className="proxy-textarea" rows={3} placeholder="输入回复内容…" value={manualReply} onChange={(e) => setManualReply(e.target.value)} />
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button className="apply-action" style={{ flex: 1, height: 28, fontSize: 11 }} onClick={handleManualSend}>发送</button>
              <button className="secondary-action" style={{ flex: 1, height: 28, fontSize: 11 }} onClick={() => setReplyTarget('')}>取消</button>
            </div>
          </div>
        )}

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
      </div>
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

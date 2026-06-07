import { type CSSProperties, type ReactNode, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Bot,
  ChevronDown,
  Copy,
  Disc3,
  ExternalLink,
  Facebook,
  FileImage,
  Globe2,
  Grid2X2,
  Headphones,
  Image,
  Instagram,
  Languages,
  Linkedin,
  Lock,
  Maximize2,
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
  Smartphone,
  Sparkles,
  X,
  Zap,
  CircleHelp,
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
}

type ChatSession = {
  id: string
  platformId: string
  name: string
  status: 'login' | 'online'
  partition: string
  fingerprint: FingerprintSettings
}

const WECHAT_WEB_URL = 'https://web.wechat.com/'
const XIAOHONGSHU_WEB_URL = 'https://sxt.xiaohongshu.com/im/login'

function generateRandomFingerprint(): FingerprintSettings {
  const browserVersions = ['Chrome 120', 'Chrome 121', 'Chrome 122', 'Chrome 123', 'Chrome 124', 'Chrome 125', 'Chrome 126', 'Chrome 127', 'Chrome 128', 'Chrome 129', 'Chrome 130', 'Chrome 131', 'Chrome 132', 'Chrome 133', 'Chrome 134', 'Chrome 135']
  const osOptions = ['Windows', 'MacOS']
  const resolutions = ['跟随系统', '自定义', '随机']
  const webrtcOptions = ['替换', '允许', '禁用']
  const geolocationOptions = ['询问', '允许', '禁用']
  const hardwareOptions = ['2核', '4核', '8核', '16核', '32核']
  const memoryOptions = ['2GB', '4GB', '6GB', '8GB', '16GB', '32GB']

  const selectedOs = osOptions[Math.floor(Math.random() * osOptions.length)]
  const selectedBrowser = browserVersions[Math.floor(Math.random() * browserVersions.length)]
  
  const userAgents: Record<string, string[]> = {
    'Windows': [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
    ],
    'MacOS': [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
    ]
  }

  const osUserAgents = userAgents[selectedOs]
  const selectedUserAgent = osUserAgents[Math.floor(Math.random() * osUserAgents.length)]

  return {
    browserVersion: selectedBrowser,
    os: selectedOs,
    userAgent: selectedUserAgent,
    geolocation: geolocationOptions[Math.floor(Math.random() * geolocationOptions.length)],
    resolution: resolutions[Math.floor(Math.random() * resolutions.length)],
    webrtc: webrtcOptions[Math.floor(Math.random() * webrtcOptions.length)],
    canvas: Math.random() > 0.3,
    audioContext: Math.random() > 0.3,
    hardwareConcurrency: hardwareOptions[Math.floor(Math.random() * hardwareOptions.length)],
    deviceMemory: memoryOptions[Math.floor(Math.random() * memoryOptions.length)]
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

export function App(): JSX.Element {
  const [activePlatformId, setActivePlatformId] = useState('xiaohongshu')
  const [activeRightTool, setActiveRightTool] = useState('environment')
  const [sessions, setSessions] = useState<ChatSession[]>([
    {
      id: 'xiaohongshu-demo',
      platformId: 'xiaohongshu',
      name: '小红书 1',
      status: 'login',
      partition: 'persist:xiaohongshu-demo',
      fingerprint: generateRandomFingerprint()
    }
  ])
  const [activeSessionId, setActiveSessionId] = useState('xiaohongshu-demo')

  const activePlatform = useMemo(
    () => platforms.find((platform) => platform.id === activePlatformId) ?? platforms[0],
    [activePlatformId]
  )

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId),
    [activeSessionId, sessions]
  )

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
      fingerprint: generateRandomFingerprint()
    }
    setSessions((current) => [nextSession, ...current])
    setActiveSessionId(id)
  }

  const closeSession = (id: string): void => {
    const nextSessions = sessions.filter((session) => session.id !== id)
    setSessions(nextSessions)
    if (activeSessionId === id) {
      const nextSession = nextSessions.find((session) => session.platformId === activePlatformId)
      setActiveSessionId(nextSession?.id ?? '')
    }
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

  return (
    <TooltipPrimitive.Provider delayDuration={0}>
      <div className="app-shell">
        <TitleBar />
        <div className="workspace">
          <PlatformSidebar activePlatformId={activePlatformId} onSelectPlatform={selectPlatform} />
          <ConversationSidebar
            platform={activePlatform}
            sessions={visibleSessions}
            activeSessionId={activeSessionId}
            onCreateSession={createSession}
            onSelectSession={setActiveSessionId}
            onCloseSession={closeSession}
          />
          <MainPanel session={activeSession} platform={activePlatform} />
          {activeRightTool === 'environment' && <ProxyEnvironmentPanel session={activeSession} onUpdateFingerprint={updateSessionFingerprint} />}
          <RightToolBar activeTool={activeRightTool} onSelectTool={setActiveRightTool} />
        </div>
      </div>
    </TooltipPrimitive.Provider>
  )
}

function TitleBar(): JSX.Element {
  return (
    <header className="title-bar">
      <div className="traffic-lights">
        <button className="traffic close" onClick={() => window.pingChat?.close()} />
        <button className="traffic minimize" onClick={() => window.pingChat?.minimize()} />
        <button className="traffic maximize" onClick={() => window.pingChat?.maximize()} />
      </div>
      <div className="brand-block">
        <span className="brand-name">PingChat 0.2.0</span>
        <span>在线: <b className="green">1</b></span>
        <span>离线: <b className="red">0</b></span>
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
  onCloseSession
}: {
  platform: Platform
  sessions: ChatSession[]
  activeSessionId: string
  onCreateSession: () => void
  onSelectSession: (id: string) => void
  onCloseSession: (id: string) => void
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
            />
          ))
        )}
      </section>
      <section className="conversation-bottom">
        <button className="mobile-chat"><Smartphone size={14} />全屏手机群聊</button>
        <button className="corner-icon"><Grid2X2 size={14} /></button>
        <button className="corner-icon"><Maximize2 size={14} /></button>
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
  onClose
}: {
  session: ChatSession
  active: boolean
  accent: string
  onSelect: () => void
  onClose: () => void
}): JSX.Element {
  return (
    <button
      className={`session-card ${active ? 'active' : ''}`}
      style={{ '--accent': accent } as CSSProperties}
      onClick={onSelect}
    >
      <div className="avatar-wrap">
        <div className="avatar">P</div>
        <span className="avatar-dot" />
      </div>
      <div className="session-content">
        <div className="session-title-row">
          <strong>{session.name}</strong>
          <span className={`session-state ${session.status}`}>{session.status === 'login' ? '待登录' : '在线'}</span>
        </div>
        <div className="session-actions-row">
          <span><MessageCircle size={12} />网页会话</span>
          <span><Server size={12} />独立环境</span>
        </div>
      </div>
      <div className="session-card-actions">
        <RotateCw size={13} />
        <X
          size={14}
          onClick={(event) => {
            event.stopPropagation()
            onClose()
          }}
        />
      </div>
    </button>
  )
}

function MainPanel({ session, platform }: { session?: ChatSession; platform: Platform }): JSX.Element {
  const hasWebviewPlatform = Boolean(session && (session.platformId === 'wechat' || session.platformId === 'xiaohongshu'))
  const webviewUrl = session?.platformId === 'wechat' ? WECHAT_WEB_URL : XIAOHONGSHU_WEB_URL

  return (
    <main className={`main-panel ${session ? 'with-webview' : ''}`}>
      {hasWebviewPlatform ? (
        <div className="webview-stage">
          <webview
            key={session?.id}
            className="platform-webview"
            src={webviewUrl}
            partition={session?.partition}
            allowpopups="true"
          />
        </div>
      ) : session ? (
        <div className="empty-state">
          <Sparkles size={72} strokeWidth={1.7} />
          <span>{platform.name} 网页容器已预留</span>
        </div>
      ) : (
        <div className="empty-state">
          <Zap size={76} strokeWidth={1.7} />
          <span>未打开会话</span>
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

function ProxyEnvironmentPanel({ session, onUpdateFingerprint }: { session?: ChatSession; onUpdateFingerprint?: (sessionId: string, fingerprint: FingerprintSettings) => void }): JSX.Element {
  const proxyBodyRef = useRef<HTMLDivElement>(null)
  const proxyTabsRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<'proxy' | 'fingerprint' | 'cookie'>('proxy')
  const [localFingerprint, setLocalFingerprint] = useState<FingerprintSettings | undefined>(session?.fingerprint)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })

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
    setLocalFingerprint(newFingerprint)
  }

  const handleApply = (): void => {
    if (localFingerprint && session && onUpdateFingerprint) {
      onUpdateFingerprint(session.id, localFingerprint)
    }
  }

  return (
    <aside className="translation-panel proxy-panel">
      <div className="translation-header">
        <div className="translation-title">
          <span>代理环境</span>
        </div>
        <button className="translation-menu"><SlidersHorizontal size={14} /></button>
      </div>

      <div className="proxy-tabs" ref={proxyTabsRef}>
        <button className={activeTab === 'proxy' ? 'active' : ''} onClick={() => handleScrollTo('proxy-section')}>代理设置</button>
        <button className={activeTab === 'fingerprint' ? 'active' : ''} onClick={() => handleScrollTo('fingerprint-section')}>指纹设置</button>
        <button className={activeTab === 'cookie' ? 'active' : ''} onClick={() => handleScrollTo('cookie-section')}>Cookie</button>
        <span className="tab-indicator" style={{ left: indicatorStyle.left, width: indicatorStyle.width }} />
      </div>

      <div className="translation-body proxy-body" ref={proxyBodyRef}>
        <ProxySettingsTab />
      </div>

      <div className="proxy-footer">
        <button className="secondary-action wide" onClick={handleGenerateRandom}>一键生成随机指纹</button>
        <button className="apply-action" onClick={handleApply}>应用</button>
      </div>
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

function ProxySettingsTab(): JSX.Element {
  const [geolocation, setGeolocation] = useState('询问')
  const [webrtc, setWebrtc] = useState('替换')
  const [canvas, setCanvas] = useState(true)
  const [audioContext, setAudioContext] = useState(true)
  const [hardwareConcurrency, setHardwareConcurrency] = useState('16核')
  const [deviceMemory, setDeviceMemory] = useState('8GB')
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
          value="no-proxy"
          options={[
            { value: 'no-proxy', label: 'No Proxy' },
            { value: 'http', label: 'HTTP' },
            { value: 'https', label: 'HTTPS' },
            { value: 'socks5', label: 'SOCKS5' }
          ]}
        />
      </ProxyField>
      <ProxyField label="主机 : 端口">
        <div className="host-port">
          <input placeholder="主机" />
          <span>:</span>
          <input placeholder="端口" />
        </div>
      </ProxyField>
      <ProxyField label="用户名">
        <input className="proxy-input" placeholder="用户名" />
      </ProxyField>
      <ProxyField label="密码">
        <div className="password-check">
          <input className="proxy-input" type="password" placeholder="密码" />
          <button className="proxy-check-btn">检查代理服务器</button>
        </div>
      </ProxyField>
      <h3 className="proxy-section-title" id="fingerprint-section">指纹设置</h3>
      <ProxyField label="浏览器版本">
        <CustomSelect
          className="proxy-select"
          value="random"
          options={[
            { value: 'random', label: '随机版本' }
          ]}
        />
      </ProxyField>
      <ProxyField label="操作系统">
        <SegmentedControl values={['Windows', 'MacOS']} active="Windows" />
      </ProxyField>
      <div className="proxy-note">建议您使用与本地操作相匹配的User Agent</div>
      <ProxyField label="User Agent" className="proxy-field--top">
        <textarea className="proxy-textarea" placeholder="Mozilla/5.0..." />
      </ProxyField>
      <ProxyField label="地理位置">
        <SegmentedControl values={['询问', '允许', '禁用']} active={geolocation} onChange={setGeolocation} />
      </ProxyField>
      {geolocation === '询问' && (
        <div className="proxy-note">网站会显示获取您当前位置的询问提示，您可以允许或禁止，与普通浏览器的提示一样</div>
      )}
      {geolocation === '允许' && (
        <div className="proxy-note">网站请求获取您当前位置时，始终被允许</div>
      )}
      {geolocation === '禁用' && (
        <div className="proxy-note">网站请求获取您当前位置时，始终被禁止</div>
      )}
      <ProxyField label="WebRTC">
        <SegmentedControl values={['替换', '允许', '禁用']} active={webrtc} onChange={setWebrtc} />
      </ProxyField>
      {webrtc === '替换' && (
        <div className="proxy-note">开启WebRTC，将公网IP替换为代理IP</div>
      )}
      {webrtc === '允许' && (
        <div className="proxy-note">开启WebRTC，将使用当前电脑的真实IP</div>
      )}
      {webrtc === '禁用' && (
        <div className="proxy-note">WebRTC被关闭，网站会检测到您关闭了WebRTC</div>
      )}
      <ProxyField label="Canvas">
        <Switch enabled={canvas} onChange={setCanvas} />
      </ProxyField>
      <div className="proxy-note">启用噪音，掩盖真实Canvas</div>
      <ProxyField label="AudioContext">
        <Switch enabled={audioContext} onChange={setAudioContext} />
      </ProxyField>
      <div className="proxy-note">启用噪音，掩盖真实AudioContext</div>
      <ProxyField label="硬件并发数">
        <CustomSelect
          className="proxy-select"
          value={hardwareConcurrency}
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
          onChange={setHardwareConcurrency}
        />
      </ProxyField>
      <div className="proxy-note">设置当前浏览器环境的CPU核心数</div>
      <ProxyField label="设备内存">
        <CustomSelect
          className="proxy-select"
          value={deviceMemory}
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
          onChange={setDeviceMemory}
        />
      </ProxyField>
      <div className="proxy-note">设置当前浏览器环境模拟机器内存</div>
      <h3 className="proxy-section-title" id="cookie-section">Cookie</h3>
      <ProxyField label="Cookie" className="proxy-field--top">
        <textarea className="proxy-textarea" placeholder="name=value; name2=value2..." />
      </ProxyField>
      <div className="proxy-note">用于登录会话使用</div>
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

function RightToolBar({
  activeTool,
  onSelectTool
}: {
  activeTool: string
  onSelectTool: (id: string) => void
}): JSX.Element {
  const topTools = [
    { id: 'environment', label: '代理环境', icon: <Server size={18} /> },
    { id: 'reply', label: '快捷回复', icon: <MessagesSquare size={18} /> }
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
            className={`right-tool ${activeTool === tool.id ? 'active' : ''}`}
            onClick={() => onSelectTool(tool.id)}
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
            onClick={() => onSelectTool(tool.id)}
          >
            {tool.icon}
            <span>{tool.label}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}

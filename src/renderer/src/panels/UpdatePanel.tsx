import { useEffect, useRef, useState } from 'react'
import { Bot, Download, MessageCircle, RefreshCw, RotateCcw, ShieldCheck, Sparkles, Wifi, X } from 'lucide-react'

type UpdateState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available'; version: string; releaseDate?: string; releaseNotes?: string }
  | { status: 'not-available' }
  | { status: 'downloading'; percent: number }
  | { status: 'downloaded'; version: string }
  | { status: 'error'; message: string }

export function UpdatePanel({ onClose }: { onClose?: () => void }): JSX.Element {
  const [currentVersion, setCurrentVersion] = useState<string>('')
  const [updateState, setUpdateState] = useState<UpdateState>({ status: 'idle' })
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearCheckTimeout = () => {
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current)
      checkTimeoutRef.current = null
    }
  }

  const startCheckTimeout = () => {
    clearCheckTimeout()
    checkTimeoutRef.current = setTimeout(() => {
      setUpdateState({ status: 'error', message: '检测超时，请检查网络连接后重试' })
    }, 10000)
  }

  useEffect(() => {
    void window.pingChat.getAppVersion().then((v) => setCurrentVersion(v))

    const unsubs = [
      window.pingChat.onUpdateEvent('update:checking', () => {
        clearCheckTimeout()
        setUpdateState({ status: 'checking' })
        startCheckTimeout()
      }),
      window.pingChat.onUpdateEvent('update:available', (info) => {
        clearCheckTimeout()
        setUpdateState({ status: 'available', version: info.version, releaseDate: info.releaseDate, releaseNotes: info.releaseNotes })
      }),
      window.pingChat.onUpdateEvent('update:not-available', () => {
        clearCheckTimeout()
        setUpdateState({ status: 'not-available' })
      }),
      window.pingChat.onUpdateEvent('update:progress', (progress) => {
        clearCheckTimeout()
        setUpdateState({ status: 'downloading', percent: Math.round(progress.percent || 0) })
      }),
      window.pingChat.onUpdateEvent('update:downloaded', (info) => {
        clearCheckTimeout()
        setUpdateState({ status: 'downloaded', version: info.version })
      }),
      window.pingChat.onUpdateEvent('update:error', (err) => {
        clearCheckTimeout()
        setUpdateState({ status: 'error', message: err.message || '检测更新失败' })
      }),
    ]

    return () => {
      clearCheckTimeout()
      unsubs.forEach((u) => u())
    }
  }, [])

  const handleCheck = () => {
    setUpdateState({ status: 'checking' })
    startCheckTimeout()
    void window.pingChat.checkForUpdate()
  }

  const handleDownload = () => {
    setUpdateState({ status: 'downloading', percent: 0 })
    void window.pingChat.downloadUpdate()
  }

  const handleInstall = () => {
    void window.pingChat.installUpdate()
  }

  const statusColor = (status: UpdateState['status']) => {
    switch (status) {
      case 'available':
      case 'downloaded':
        return '#19d973'
      case 'error':
        return '#ef4444'
      case 'checking':
      case 'downloading':
        return '#f59e0b'
      default:
        return '#8c96a1'
    }
  }

  const isChecking = updateState.status === 'checking'

  return (
    <aside className="translation-panel proxy-panel">
      <div className="translation-header">
        <div className="translation-title">
          <span>关于我们 / 更新</span>
        </div>
        <button className="translation-menu" onClick={() => onClose?.()}>
          <X size={14} />
        </button>
      </div>

      <div className="translation-body" style={{ padding: '20px 16px' }}>
        {/* Current version */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <ShieldCheck size={28} color="#19d973" />
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#f3f5f7' }}>PingChat</div>
            <div style={{ fontSize: 13, color: '#8c96a1', marginTop: 6 }}>当前版本 {currentVersion || '—'}</div>
          </div>
        </div>

        <div style={{ fontSize: 14, color: '#f3f5f7', lineHeight: 1.8, marginBottom: 16 }}>
          <p style={{ margin: 0 }}>PingChat 是一款面向商家与客服团队的专业级多平台社交聚合工具，深度整合微信、小红书等主流社交媒体渠道，提供一站式会话管理与智能运营解决方案。内置 AI 智能客服助手，支持基于大模型的自动回复、敏感词过滤与个性化话术定制。</p>
          <p style={{ margin: '12px 0 0 0' }}>同时配备浏览器指纹伪装与代理环境配置能力，实现多账号安全隔离管理。强大的客服工作台可实时监控全渠道消息动态，智能分配客户对话，自动追踪高意向用户，全方位提升客服响应效率、降低运营成本并驱动业务转化增长。</p>
        </div>

        {/* Features */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[
            { icon: <MessageCircle size={16} />, text: '多平台聚合' },
            { icon: <Bot size={16} />, text: 'AI 自动回复' },
            { icon: <Wifi size={16} />, text: '代理环境管理' },
            { icon: <Sparkles size={16} />, text: '浏览器指纹伪装' },
          ].map((f, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 6,
                background: '#252a2e',
                border: '1px solid #2c3135',
                fontSize: 13,
                color: '#f3f5f7',
                fontWeight: 500,
                transition: 'all 0.2s ease',
                cursor: 'default',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget
                el.style.borderColor = '#19d973'
                el.style.background = '#1f2823'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget
                el.style.borderColor = '#2c3135'
                el.style.background = '#252a2e'
              }}
            >
              <span style={{ color: '#19d973', flexShrink: 0, display: 'flex', alignItems: 'center' }}>{f.icon}</span>
              {f.text}
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid #2c3135', margin: '16px 0' }} />

        {/* Update status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <div style={{ width: 3, height: 14, borderRadius: 2, background: '#19d973' }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#f3f5f7' }}>版本更新</span>
        </div>

        <div
          style={{
            padding: '14px 16px',
            borderRadius: 6,
            background: '#1a1f23',
            border: '1px solid #2c3135',
            marginBottom: 12,
          }}
        >
          {/* Status row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: statusColor(updateState.status),
                  flexShrink: 0,
                  boxShadow: `0 0 6px ${statusColor(updateState.status)}40`,
                }}
              />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#f3f5f7' }}>
                {updateState.status === 'idle' && '等待检测'}
                {updateState.status === 'checking' && '正在检测…'}
                {updateState.status === 'available' && `发现新版本 ${updateState.version}`}
                {updateState.status === 'not-available' && '已是最新版本'}
                {updateState.status === 'downloading' && '正在下载…'}
                {updateState.status === 'downloaded' && `新版本 ${updateState.version} 已就绪`}
                {updateState.status === 'error' && '检测失败'}
              </span>
            </div>
          </div>

          {updateState.status === 'available' && (
            <>
              {updateState.releaseNotes && (
                <div style={{ fontSize: 13, color: '#8c96a1', marginBottom: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap', padding: '8px 0' }}>
                  {updateState.releaseNotes}
                </div>
              )}
              <button
                onClick={handleDownload}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#19d973',
                  color: '#0a0e10',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'opacity 0.2s ease',
                }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = '0.85' }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = '1' }}
              >
                <Download size={16} />
                下载更新
              </button>
            </>
          )}

          {updateState.status === 'downloading' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: '#8c96a1' }}>下载进度</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#f3f5f7' }}>{updateState.percent}%</span>
              </div>
              <div style={{ width: '100%', height: 5, borderRadius: 3, background: '#252a2e', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${updateState.percent}%`,
                    height: '100%',
                    background: '#19d973',
                    borderRadius: 3,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </>
          )}

          {updateState.status === 'downloaded' && (
            <button
              onClick={handleInstall}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 6,
                border: 'none',
                background: '#19d973',
                color: '#0a0e10',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'opacity 0.2s ease',
              }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = '0.85' }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = '1' }}
            >
              <RotateCcw size={16} />
              重启并安装
            </button>
          )}

          {/* Check button — always shown except when downloading/downloaded/available */}
          {(updateState.status === 'idle' ||
            updateState.status === 'checking' ||
            updateState.status === 'not-available' ||
            updateState.status === 'error') && (
            <button
              disabled={isChecking}
              onClick={handleCheck}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #19d973',
                background: isChecking ? '#0f1a12' : 'transparent',
                color: isChecking ? '#f3f5f7' : '#19d973',
                fontSize: 12,
                fontWeight: 600,
                cursor: isChecking ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!isChecking) {
                  const el = e.currentTarget
                  el.style.background = '#19d973'
                  el.style.color = '#0a0e10'
                }
              }}
              onMouseLeave={(e) => {
                if (!isChecking) {
                  const el = e.currentTarget
                  el.style.background = 'transparent'
                  el.style.color = '#19d973'
                }
              }}
            >
              <RefreshCw
                size={15}
                style={isChecking ? { animation: 'spin 1s linear infinite' } : undefined}
              />
              {isChecking ? '正在检测…' : '检测更新'}
            </button>
          )}

          {updateState.status === 'error' && (
            <div style={{ fontSize: 12, color: '#ef4444', marginTop: 8, lineHeight: 1.4, textAlign: 'center' }}>
              {updateState.message}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

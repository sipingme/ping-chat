import { useEffect, useState } from 'react'
import { Download, RefreshCw, RotateCcw, ShieldCheck, X } from 'lucide-react'

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

  useEffect(() => {
    void window.pingChat.getAppVersion().then((v) => setCurrentVersion(v))

    const unsubs = [
      window.pingChat.onUpdateEvent('update:checking', () => setUpdateState({ status: 'checking' })),
      window.pingChat.onUpdateEvent('update:available', (info) =>
        setUpdateState({ status: 'available', version: info.version, releaseDate: info.releaseDate, releaseNotes: info.releaseNotes })
      ),
      window.pingChat.onUpdateEvent('update:not-available', () => setUpdateState({ status: 'not-available' })),
      window.pingChat.onUpdateEvent('update:progress', (progress) =>
        setUpdateState({ status: 'downloading', percent: Math.round(progress.percent || 0) })
      ),
      window.pingChat.onUpdateEvent('update:downloaded', (info) =>
        setUpdateState({ status: 'downloaded', version: info.version })
      ),
      window.pingChat.onUpdateEvent('update:error', (err) =>
        setUpdateState({ status: 'error', message: err.message || '检测更新失败' })
      ),
    ]

    // Auto-check on mount (startup check may have already fired)
    void window.pingChat.checkForUpdate()

    return () => {
      unsubs.forEach((u) => u())
    }
  }, [])

  const handleCheck = () => {
    setUpdateState({ status: 'checking' })
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
          <span>关于 / 更新</span>
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
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f3f5f7' }}>Ping Chat</div>
            <div style={{ fontSize: 12, color: '#8c96a1' }}>当前版本 {currentVersion || '—'}</div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #2c3135', margin: '16px 0' }} />

        {/* Update status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <div style={{ width: 3, height: 14, borderRadius: 2, background: '#19d973' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#f3f5f7' }}>版本更新</span>
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
              <span style={{ fontSize: 13, fontWeight: 600, color: '#f3f5f7' }}>
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
                <div style={{ fontSize: 12, color: '#8c96a1', marginBottom: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap', padding: '8px 0' }}>
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
                  fontSize: 13,
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
                <Download size={15} />
                下载更新
              </button>
            </>
          )}

          {updateState.status === 'downloading' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#8c96a1' }}>下载进度</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#f3f5f7' }}>{updateState.percent}%</span>
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
                fontSize: 13,
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
              <RotateCcw size={15} />
              重启并安装
            </button>
          )}

          {updateState.status === 'error' && (
            <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 10, lineHeight: 1.4 }}>
              {updateState.message}
            </div>
          )}

          {/* Check button — always shown except when downloading/downloaded/available */}
          {(updateState.status === 'idle' ||
            updateState.status === 'not-available' ||
            updateState.status === 'error') && (
            <button
              disabled={isChecking}
              onClick={handleCheck}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 6,
                border: isChecking ? '1px solid #1f2528' : '1px solid #19d973',
                background: isChecking ? '#14181b' : 'transparent',
                color: isChecking ? '#5a6269' : '#19d973',
                fontSize: 13,
                fontWeight: 700,
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
        </div>
      </div>
    </aside>
  )
}

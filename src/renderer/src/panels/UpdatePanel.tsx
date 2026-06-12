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
            padding: '12px 14px',
            borderRadius: 4,
            background: '#252a2e',
            border: '1px solid #2c3135',
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: statusColor(updateState.status),
                  flexShrink: 0,
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
                <div style={{ fontSize: 12, color: '#8c96a1', marginBottom: 10, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {updateState.releaseNotes}
                </div>
              )}
              <button className="apply-action" style={{ width: '100%' }} onClick={handleDownload}>
                <Download size={14} style={{ marginRight: 6 }} />
                下载更新
              </button>
            </>
          )}

          {updateState.status === 'downloading' && (
            <>
              <div style={{ fontSize: 12, color: '#8c96a1', marginBottom: 6 }}>{updateState.percent}%</div>
              <div style={{ width: '100%', height: 4, borderRadius: 2, background: '#1a1f23', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${updateState.percent}%`,
                    height: '100%',
                    background: '#19d973',
                    borderRadius: 2,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </>
          )}

          {updateState.status === 'downloaded' && (
            <button className="apply-action" style={{ width: '100%' }} onClick={handleInstall}>
              <RotateCcw size={14} style={{ marginRight: 6 }} />
              重启并安装
            </button>
          )}

          {updateState.status === 'error' && (
            <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 8 }}>{updateState.message}</div>
          )}

          {(updateState.status === 'idle' ||
            updateState.status === 'not-available' ||
            updateState.status === 'error') && (
            <button className="secondary-action wide" onClick={handleCheck}>
              <RefreshCw size={14} style={{ marginRight: 6 }} />
              检测更新
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}

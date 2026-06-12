import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

export function TitleBar({ onlineCount, offlineCount, onRefresh }: { onlineCount: number; offlineCount: number; onRefresh?: () => void }): JSX.Element {
  const [spinning, setSpinning] = useState(false)
  const [version, setVersion] = useState<string>('')
  useEffect(() => {
    void window.pingChat.getAppVersion().then((v) => setVersion(v))
  }, [])
  const handleRefresh = (): void => {
    setSpinning(true)
    onRefresh?.()
  }
  return (
    <header className="title-bar">
      <div className="traffic-lights">
        <button className="traffic close" onClick={() => window.pingChat?.close()} />
        <button className="traffic minimize" onClick={() => window.pingChat?.minimize()} />
        <button className="traffic maximize" onClick={() => window.pingChat?.maximize()} />
      </div>
      <div className="brand-block">
        <span className="brand-name">PingChat {version || '—'}</span>
        <span>在线: <b className="green">{onlineCount}</b></span>
        <span>离线: <b className="red">0</b></span>
        <button className={`tiny-icon${spinning ? ' spinning' : ''}`} onClick={handleRefresh} onAnimationEnd={() => setSpinning(false)}><RefreshCw size={12} /></button>
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

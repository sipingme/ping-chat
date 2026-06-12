import { useEffect } from 'react'
import { Sparkles, Zap } from 'lucide-react'
import type { Platform, ChatSession } from '../types'
import { WECHAT_WEB_URL, XIAOHONGSHU_WEB_URL } from '../config/defaults'

export function MainPanel({ session, platform, reloadTrigger }: { session?: ChatSession; platform: Platform; reloadTrigger?: number }): JSX.Element {
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

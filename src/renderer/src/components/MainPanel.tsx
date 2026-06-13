import { useEffect, useMemo } from 'react'
import { Sparkles, Zap } from 'lucide-react'
import type { Platform, ChatSession } from '../types'
import { getPlatformById } from '../../../shared/platforms'

export function MainPanel({ sessions, activeSession, platform, reloadTrigger }: { sessions: ChatSession[]; activeSession?: ChatSession; platform: Platform; reloadTrigger?: number }): JSX.Element {
  const activePlatformInfo = activeSession ? getPlatformById(activeSession.platformId) : undefined
  const hasWebviewPlatform = Boolean(activePlatformInfo?.hasWebview)

  useEffect(() => {
    if (!activeSession) return
    void window.pingChat.setFingerprint(activeSession.partition, activeSession.fingerprint)
    void window.pingChat.setProxy(activeSession.partition, activeSession.proxy)
  }, [activeSession?.id, activeSession?.fingerprint, activeSession?.proxy])

  const webviewSessions = useMemo(() => sessions?.filter((s) => getPlatformById(s.platformId)?.hasWebview) ?? [], [sessions])

  useEffect(() => {
    const handlers: Array<{ el: Element; fn: () => void }> = []
    const setup = () => {
      const webviews = document.querySelectorAll('webview')
      for (const wv of webviews) {
        const el = wv as any
        const fn = () => {
          try {
            const wcId = el.getWebContentsId?.()
            const partition = el.getAttribute('partition') || ''
            if (wcId && partition) {
              console.log('[Renderer] webview dom-ready, reporting partition:', partition, 'wcId:', wcId)
              window.pingChat.setWebviewPartition(wcId, partition)
            }
          } catch (e) {
            console.error('[Renderer] webview dom-ready error:', e)
          }
        }
        el.addEventListener('dom-ready', fn)
        handlers.push({ el, fn })
        if (el.readyState === 'complete') fn()
      }
    }
    const timeout = setTimeout(setup, 500)
    return () => {
      clearTimeout(timeout)
      for (const { el, fn } of handlers) {
        el.removeEventListener('dom-ready', fn)
      }
    }
  }, [webviewSessions])

  return (
    <main className={`main-panel ${activeSession ? 'with-webview' : ''}`}>
      {hasWebviewPlatform ? (
        <div className="webview-stage">
          {webviewSessions
            .filter((session) => session.id === activeSession?.id)
            .map((session) => {
            const platformInfo = getPlatformById(session.platformId)
            return (
              <webview
                key={`${session.id}-${reloadTrigger ?? 0}`}
                className="platform-webview"
                src={platformInfo?.webUrl ?? ''}
                partition={session.partition}
                allowpopups="true"
                preload={window.pingChat?.webviewPreloadPath}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                }}
              />
            )
          })}
        </div>
      ) : activeSession ? (
        <div className="empty-state">
          <Sparkles size={72} strokeWidth={1.7} />
          <span>{activePlatformInfo?.name ?? platform.name} 网页容器已预留</span>
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

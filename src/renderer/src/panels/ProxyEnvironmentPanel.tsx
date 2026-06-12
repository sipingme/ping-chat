import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ChevronDown, CircleHelp, Eraser, MessageSquare, Plus, Send, SlidersHorizontal, Trash2, Zap } from 'lucide-react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import type { ChatSession, FingerprintSettings, ProxyConfig } from '../types'
import { CustomSelect, SegmentedControl, Switch, ProxyField } from '../components/ui/BaseUI'
import { ProxySettingsTab } from './ProxySettingsTab'
import { generateRandomFingerprint, BROWSER_VERSIONS, getUserAgentForVersion, timezoneOptions } from '../config/defaults'

export function ProxyEnvironmentPanel({
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
  const [activeTab, setActiveTab] = useState<'proxy' | 'fingerprint'>('proxy')
  const [draftFingerprint, setDraftFingerprint] = useState<FingerprintSettings | undefined>(session?.fingerprint)
  const [draftProxy, setDraftProxy] = useState<ProxyConfig | undefined>(session?.proxy)
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
  }, [session?.id])

  useLayoutEffect(() => {
    const activeBtn = proxyTabsRef.current?.querySelector('.proxy-tabs button.active')
    if (activeBtn && proxyTabsRef.current) {
      const el = activeBtn as HTMLElement
      setIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth })
    }
  }, [activeTab])

  const handleScrollTo = (id: string): void => {
    setActiveTab(id.replace('-section', '') as 'proxy' | 'fingerprint')
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
            <span className="tab-indicator" style={{ left: indicatorStyle.left, width: indicatorStyle.width }} />
          </div>

          <div className="translation-body proxy-body" ref={proxyBodyRef}>
            <ProxySettingsTab
              session={session}
              fingerprint={draftFingerprint}
              proxy={draftProxy}
              onChangeFingerprint={setDraftFingerprint}
              onChangeProxy={setDraftProxy}
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

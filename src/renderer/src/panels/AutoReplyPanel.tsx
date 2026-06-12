import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Eraser, Loader2, MessageSquare, Plus, Send, Sparkles, Trash2, X, Zap } from 'lucide-react'
import type { ChatSession, ChatMessage, AutoReplyConfig, ChatStats } from '../types'
import { CustomSelect, Switch, ProxyField } from '../components/ui/BaseUI'
import { MonitorPanel } from '../components/MonitorPanel'
import { buildSystemPrompt, interpolateTemplateVars } from '../config/defaults'
import { ModelSwitcher } from './ModelSwitcher'

export function AutoReplyPanel({
  session,
  onClose,
  enabled,
  onToggleEnabled,
  monitoringEnabled,
  onToggleMonitoring,
  processing,
  processedCount,
  messages,
  config,
  onUpdateConfig,
  onSendReply,
  chatStats,
  autoReplyTarget,
  setAutoReplyTarget,
  autoReplyMode,
  setAutoReplyMode,
  recentReplyLogs,
  replyFeedbackMap,
  onReplyFeedback,
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
  config: AutoReplyConfig
  onUpdateConfig: (updates: Partial<AutoReplyConfig>) => void
  onSendReply: (partition: string, content: string, autoSend?: boolean) => void
  chatStats: { partition: string; totalCount: number; groupCount: number; userCount: number; totalUnread: number; contacts: Array<{ name: string; isGroup: boolean; unread: number; avatar: string }>; unreadContacts: Array<{ name: string; isGroup: boolean; unread: number; avatar: string }> } | null
  autoReplyTarget: string
  setAutoReplyTarget: (v: string) => void
  autoReplyMode: 'global' | 'single'
  setAutoReplyMode: (v: 'global' | 'single') => void
  recentReplyLogs?: Array<{ id: string; type: string; content: string; contact: string }>
  replyFeedbackMap?: Record<string, 'up' | 'down'>
  onReplyFeedback?: (id: string, feedback: 'up' | 'down') => void
}): JSX.Element {
  const [activeTab, setActiveTab] = useState<'monitor' | 'overview' | 'reply' | 'model'>('monitor')
  const [generating, setGenerating] = useState(false)
  const [manualReply, setManualReply] = useState('')
  const [replyTarget, setReplyTarget] = useState('')
  const [generatedReply, setGeneratedReply] = useState('')
  const [workbenchGenerating, setWorkbenchGenerating] = useState(false)
  const [workbenchPrompt, setWorkbenchPrompt] = useState('')
  const [workbenchError, setWorkbenchError] = useState('')
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [contactAvatarMap, setContactAvatarMap] = useState<Record<string, string>>({})
  const tabsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const unsub = window.pingChat.onChatHistory((payload) => {
      console.log('[Renderer] chat:history received', payload.history.length, 'msgs, partition:', payload.partition, 'session partition:', session?.partition)
      if (!session || payload.partition === session.partition || !payload.partition) {
        console.log('[Renderer] updating chatHistory with', payload.history.length, 'messages')
        setChatHistory(payload.history.map((m) => ({ ...m, partition: payload.partition })))
      } else {
        console.log('[Renderer] chat:history ignored, partition mismatch')
      }
    })
    return unsub
  }, [session?.partition])

  useEffect(() => {
    setReplyTarget('')
    setAutoReplyTarget('')
    setManualReply('')
    setContactAvatarMap({})
  }, [session?.id])

  // Auto-clear autoReplyTarget if it points to a blocked group chat
  useEffect(() => {
    if (!autoReplyTarget || !chatStats) return
    const contact = chatStats.contacts.find((c) => c.name === autoReplyTarget)
    if (contact?.isGroup) {
      if (config.groupWhitelist.length && !config.groupWhitelist.some((w) => autoReplyTarget.includes(w))) {
        setAutoReplyTarget('')
      } else if (config.groupBlacklist.length && config.groupBlacklist.some((b) => autoReplyTarget.includes(b))) {
        setAutoReplyTarget('')
      } else if (!config.groupWhitelist.length && !config.groupBlacklist.length) {
        setAutoReplyTarget('')
      }
    }
  }, [chatStats, autoReplyTarget, config.groupWhitelist, config.groupBlacklist])

  useEffect(() => {
    if (!window.pingChat.onContactClicked) return
    const unlisten = window.pingChat.onContactClicked((payload) => {
      if (!session) return
      if (payload.partition !== session.partition && payload.partition !== '') return
      setReplyTarget(payload.name)
      if (payload.avatar) {
        setContactAvatarMap((prev) => ({ ...prev, [payload.name]: payload.avatar ?? '' }))
      }
      // When already on auto-reply tab, also update auto-reply target so the banner changes
      if (activeTab === 'reply') {
        setAutoReplyTarget(payload.name)
      }
      // Only switch to overview if not currently on the reply tab
      if (activeTab !== 'reply') {
        handleScrollTo('overview')
      }
    })
    return () => { unlisten() }
  }, [session?.partition, activeTab])

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

  const workbenchTarget = useMemo(() => {
    if (autoReplyTarget) return autoReplyTarget
    const lastUserMsg = [...chatHistory].reverse().find((m) => m.isFromUser)
    return lastUserMsg?.sender || ''
  }, [autoReplyTarget, chatHistory])

  const pendingConversation = useMemo<ChatMessage[]>(() => {
    if (!workbenchTarget || chatHistory.length === 0) return []
    // Find index of my last reply
    let myLastReplyIndex = -1
    for (let i = chatHistory.length - 1; i >= 0; i--) {
      if (!chatHistory[i].isFromUser) {
        myLastReplyIndex = i
        break
      }
    }
    // Find last user message (chatHistory is from current chat window)
    let lastUserMsgIndex = -1
    for (let i = chatHistory.length - 1; i >= 0; i--) {
      if (chatHistory[i].isFromUser) {
        lastUserMsgIndex = i
        break
      }
    }
    // No pending messages if no user message or already replied
    if (lastUserMsgIndex === -1 || lastUserMsgIndex <= myLastReplyIndex) return []
    // Trace back to after my last reply
    let startIndex = 0
    for (let i = lastUserMsgIndex - 1; i >= 0; i--) {
      if (!chatHistory[i].isFromUser) {
        startIndex = i + 1
        break
      }
    }
    return chatHistory.slice(startIndex, lastUserMsgIndex + 1)
  }, [chatHistory, workbenchTarget])

  const hadPendingRef = useRef(false)
  useEffect(() => {
    if (hadPendingRef.current && pendingConversation.length === 0) {
      setWorkbenchPrompt('')
    }
    hadPendingRef.current = pendingConversation.length > 0
  }, [pendingConversation.length])

  // Single-mode auto-reply: when new pending messages arrive, auto-generate and send
  const singleAutoReplyKeyRef = useRef('')
  const isAutoSendingRef = useRef(false)
  const prevPendingLenRef = useRef(0)
  useEffect(() => {
    const hasNewPending = pendingConversation.length > 0 && prevPendingLenRef.current === 0
    prevPendingLenRef.current = pendingConversation.length
    if (!hasNewPending) return
    if (!enabled || autoReplyMode !== 'single' || !autoReplyTarget || !session) return
    if (workbenchGenerating || isAutoSendingRef.current) return

    const key = pendingConversation.map((m) => m.sender + ':' + m.content + ':' + m.timestamp).join('|')
    if (singleAutoReplyKeyRef.current === key) return
    singleAutoReplyKeyRef.current = key

    isAutoSendingRef.current = true
    void (async () => {
      try {
        const reply = await handleWorkbenchGenerate(autoReplyTarget, pendingConversation)
        if (!reply || !session) return
        if (config.autoSend) {
          if (config.delaySeconds > 0) {
            await new Promise((r) => setTimeout(r, config.delaySeconds * 1000))
          }
          onSendReply(session.partition, reply, config.autoSend)
          setWorkbenchPrompt('')
        }
        // When autoSend is false, reply is already set in workbenchPrompt by handleWorkbenchGenerate
      } finally {
        isAutoSendingRef.current = false
      }
    })()
  }, [pendingConversation.length, enabled, autoReplyMode, autoReplyTarget, session, config.delaySeconds, config.autoSend, onSendReply])

  useLayoutEffect(() => {
    const activeBtn = tabsRef.current?.querySelector('.proxy-tabs button.active')
    if (activeBtn && tabsRef.current) {
      const el = activeBtn as HTMLElement
      setIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth })
    }
  }, [activeTab])

  const handleScrollTo = (tab: 'monitor' | 'overview' | 'reply' | 'model'): void => {
    setActiveTab(tab)
    // When switching to auto-reply in single mode, auto-set target from quick-reply target if available
    if (tab === 'reply' && autoReplyMode === 'single' && !autoReplyTarget && replyTarget) {
      setAutoReplyTarget(replyTarget)
    }
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
        body: JSON.stringify({
              model: config.model,
              messages: msgs,
              temperature: config.temperature,
              ...(config.maxTokens > 0 ? { max_tokens: config.maxTokens } : {}),
              ...(config.topP < 1 ? { top_p: config.topP } : {}),
              ...(config.frequencyPenalty !== 0 ? { frequency_penalty: config.frequencyPenalty } : {}),
              ...(config.presencePenalty !== 0 ? { presence_penalty: config.presencePenalty } : {}),
            }),
      })
      const data = await res.json()
      const reply = data.choices?.[0]?.message?.content
      if (reply && session) {
        onSendReply(session.partition, reply, config.autoSend)
      }
    } catch (e) {
      console.error('Generate reply failed:', e)
    }
    setGenerating(false)
  }

  const handleWorkbenchGenerate = async (targetSender: string, customHistory?: ChatMessage[]): Promise<string | null> => {
    if (workbenchGenerating) return null
    if (!config.apiKey) {
      setWorkbenchError('请先在大模型设置中配置 API 密钥')
      return null
    }
    setWorkbenchGenerating(true)
    setWorkbenchError('')
    try {
      let history = customHistory ?? grouped[targetSender] ?? []
      if (config.contextRounds > 0) {
        history = history.slice(-config.contextRounds * 2)
      }
      const fullSystem = buildSystemPrompt(config) + (workbenchPrompt.trim() ? '\n\n额外要求：' + workbenchPrompt.trim() : '')

      const msgs = [
        { role: 'system', content: fullSystem },
        ...history.map((m) => ({ role: m.isFromUser ? 'user' : 'assistant' as const, content: m.content })),
      ]
      if (history.length === 0) {
        msgs.push({ role: 'user', content: '请直接输出一段打招呼的开场白，不要输出任何思考过程或分析。' })
      }
      const res = await fetch(config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({
              model: config.model,
              messages: msgs,
              temperature: config.temperature,
              ...(config.maxTokens > 0 ? { max_tokens: config.maxTokens } : {}),
              ...(config.topP < 1 ? { top_p: config.topP } : {}),
              ...(config.frequencyPenalty !== 0 ? { frequency_penalty: config.frequencyPenalty } : {}),
              ...(config.presencePenalty !== 0 ? { presence_penalty: config.presencePenalty } : {}),
            }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || `请求失败 (${res.status})`)
      }
      let reply = data.choices?.[0]?.message?.content
      if (reply) {
        // Strip reasoning/thinking tags and their content
        reply = reply.replace(/<think(?:ing)?>.*?<\/think(?:ing)?>/gs, '')
        reply = reply.replace(/<reason(?:ing)?>.*?<\/reason(?:ing)?>/gs, '')
        reply = reply.trim()
        setWorkbenchPrompt(reply)
        return reply
      } else {
        throw new Error('API 未返回有效回复内容')
      }
    } catch (e) {
      console.error('[Workbench] AI generation failed:', e)
      setWorkbenchError(e instanceof Error ? e.message : '生成失败，请检查网络或 API 配置')
      return null
    } finally {
      setWorkbenchGenerating(false)
    }
  }

  const handleManualSend = () => {
    if (!manualReply.trim() || !session) return
    const interpolated = interpolateTemplateVars(manualReply.trim(), { contactName: replyTarget || session.partition, partition: session.partition })
    onSendReply(session.partition, interpolated)
    setManualReply('')
  }

  return (
    <aside className="translation-panel proxy-panel">
      <div className="translation-header">
        <div className="translation-title"><span>自动回复</span>{enabled && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: '#19d973', marginLeft: 6 }} />}</div>
        <button className="translation-menu" onClick={() => onClose?.()}><X size={14} /></button>
      </div>

      <div className="proxy-tabs" ref={tabsRef}>
        <button className={activeTab === 'monitor' ? 'active' : ''} onClick={() => handleScrollTo('monitor')}>监控面板</button>
        <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => handleScrollTo('overview')}>快捷回复</button>
        <button className={activeTab === 'reply' ? 'active' : ''} onClick={() => handleScrollTo('reply')}>自动回复</button>
        <button className={activeTab === 'model' ? 'active' : ''} onClick={() => handleScrollTo('model')}>大模型设置</button>
        <span className="tab-indicator" style={{ left: indicatorStyle.left, width: indicatorStyle.width }} />
      </div>

      <div className="translation-body proxy-body">
        {activeTab === 'monitor' && (
          <MonitorPanel
            session={session}
            monitoringEnabled={monitoringEnabled}
            onToggleMonitoring={onToggleMonitoring}
            chatStats={chatStats}
            setReplyTarget={setReplyTarget}
            handleScrollTo={handleScrollTo}
            setAutoReplyMode={setAutoReplyMode}
            setAutoReplyTarget={setAutoReplyTarget}
            messages={messages}
            processedCount={processedCount}
            recentReplyLogs={recentReplyLogs}
            replyFeedbackMap={replyFeedbackMap}
            onReplyFeedback={onReplyFeedback}
          />
        )}

        {activeTab === 'overview' && (<>
        {replyTarget && (
          <div style={{ marginTop: 12, padding: '8px 10px', borderRadius: 4, background: '#143324', border: '1px solid #04c768', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {(() => {
                const contact = chatStats?.contacts.find((c) => c.name === replyTarget)
                const avatar = contact?.avatar || contactAvatarMap[replyTarget]
                if (avatar) {
                  return (
                    <>
                      <img src={avatar} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; const el = (e.target as HTMLImageElement).parentElement?.querySelector('.avatar-fallback') as HTMLElement | null; if (el) el.style.display = 'flex' }} />
                      <div className="avatar-fallback" style={{ width: 20, height: 20, borderRadius: '50%', background: '#3a4147', flexShrink: 0, display: 'none', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#8c96a1' }}>{replyTarget.charAt(0)}</div>
                    </>
                  )
                }
                return <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#3a4147', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#8c96a1' }}>{replyTarget.charAt(0)}</div>
              })()}
              <span style={{ fontSize: 12, color: '#04c768', fontWeight: 600 }}>正在回复: {replyTarget}</span>
            </div>
            <button style={{ height: 22, width: 22, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: '#04c768', border: 'none', cursor: 'pointer' }} onClick={() => { setReplyTarget(''); setManualReply(''); handleScrollTo('monitor') }}><X size={14} /></button>
          </div>
        )}
        {!replyTarget && (
          <div style={{ marginTop: 12, padding: '8px 10px', borderRadius: 4, background: '#1a1f23', border: '1px dashed #3a4147', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#8c96a1' }}>请从监控面板的用户列表中选择要快捷回复的目标用户</span>
          </div>
        )}
        <div style={{ borderTop: '1px solid #2c3135', margin: '16px 0' }} />
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
                  if (!content || !replyTarget || !session) return
                  const interpolated = interpolateTemplateVars(content, { contactName: replyTarget, partition: session.partition })
                  setManualReply(interpolated)
                  onSendReply(session.partition, interpolated)
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
                        if (!session || !replyTarget) return
                        const interpolated = interpolateTemplateVars(t.content, { contactName: replyTarget, partition: session.partition })
                        setManualReply(interpolated)
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
        {autoReplyMode === 'single' && autoReplyTarget && (() => {
          const contact = chatStats?.contacts.find((c) => c.name === autoReplyTarget)
          if (!contact?.isGroup) return true
          if (config.groupWhitelist.length) return config.groupWhitelist.some((w: string) => autoReplyTarget.includes(w))
          if (config.groupBlacklist.length) return !config.groupBlacklist.some((b: string) => autoReplyTarget.includes(b))
          return false
        })() && (
          <div style={{ marginTop: 12, padding: '8px 10px', borderRadius: 4, background: '#143324', border: '1px solid #04c768', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {(() => {
                const contact = chatStats?.contacts.find((c) => c.name === autoReplyTarget)
                const avatar = contact?.avatar || contactAvatarMap[autoReplyTarget]
                if (avatar) {
                  return (
                    <>
                      <img src={avatar} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; const el = (e.target as HTMLImageElement).parentElement?.querySelector('.avatar-fallback') as HTMLElement | null; if (el) el.style.display = 'flex' }} />
                      <div className="avatar-fallback" style={{ width: 20, height: 20, borderRadius: '50%', background: '#3a4147', flexShrink: 0, display: 'none', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#8c96a1' }}>{autoReplyTarget.charAt(0)}</div>
                    </>
                  )
                }
                return <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#3a4147', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#8c96a1' }}>{autoReplyTarget.charAt(0)}</div>
              })()}
              <span style={{ fontSize: 12, color: '#04c768', fontWeight: 600 }}>正在自动回复: {autoReplyTarget}</span>
            </div>
            <button style={{ height: 22, width: 22, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: '#04c768', border: 'none', cursor: 'pointer' }} onClick={() => setAutoReplyTarget('')}><X size={14} /></button>
          </div>
        )}
        {autoReplyMode === 'single' && !autoReplyTarget && (
          <div style={{ marginTop: 12, padding: '8px 10px', borderRadius: 4, background: '#1a1f23', border: '1px dashed #3a4147', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#8c96a1' }}>请从监控面板的用户列表中选择要自动回复的目标用户</span>
          </div>
        )}
        {/* ── 回复工作台 ── */}
        {enabled && (
          <>
            {autoReplyMode === 'single' && <div style={{ borderTop: '1px solid #2c3135', margin: '16px 0' }} />}
            <h4 style={{ fontSize: 16, margin: autoReplyMode === 'single' ? '0 0 12px' : '20px 0 12px', fontWeight: 700 }}>回复工作台</h4>
            <div style={{ borderRadius: 8, border: '1px solid #2c3135', background: '#1a1c1e', padding: 12 }}>

            {pendingConversation.length > 0 && (
              <>
                {/* 聊天记录 —— 微信网页版 body 样式 */}
                <div style={{ maxHeight: 420, overflow: 'auto', padding: '8px', background: '#151719', borderRadius: 6, marginBottom: 12 }}>
                  {pendingConversation.map((m, i) => {
                    const avatarSrc = chatStats?.contacts.find((c) => c.name === m.sender)?.avatar || contactAvatarMap[m.sender]
                    const isSelf = !m.isFromUser
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: isSelf ? 'flex-end' : 'flex-start', marginBottom: 14, gap: 10, alignItems: 'center' }}>
                        {!isSelf && (
                          <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: '#3a4147' }}>
                            {avatarSrc ? (
                              <img src={avatarSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#8c96a1' }}>{m.sender.charAt(0)}</div>
                            )}
                          </div>
                        )}
                        <div style={{ maxWidth: '70%', display: 'flex', flexDirection: 'column', alignItems: isSelf ? 'flex-end' : 'flex-start' }}>
                          <span style={{ color: '#f3f5f7', fontSize: 13, lineHeight: 1.6, wordBreak: 'break-all' }}>
                            {m.content}
                          </span>
                        </div>
                        {isSelf && (
                          <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: '#07c160', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#ffffff', fontWeight: 700 }}>
                            我
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {pendingConversation.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 0', marginBottom: 12, gap: 6 }}>
                <MessageSquare size={18} style={{ color: '#3a4147' }} />
                <span style={{ fontSize: 12, color: '#5c6670' }}>正在监控新消息…</span>
              </div>
            )}

            {/* 生成回复按钮 */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="apply-action"
                style={{ flex: 1, height: 32, fontSize: 12, fontWeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                onClick={() => handleWorkbenchGenerate(workbenchTarget)}
                disabled={workbenchGenerating}
              >
                {workbenchGenerating ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={12} />}
                {workbenchGenerating ? '生成中…' : '生成回复'}
              </button>
              <button
                className="secondary-action"
                style={{ flex: 1, height: 32, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, borderColor: '#04c768', color: '#04c768' }}
                onClick={() => {
                  if (!session) return
                  const content = workbenchPrompt.trim()
                  if (!content) return
                  onSendReply(session.partition, content)
                  setWorkbenchPrompt('')
                }}
                disabled={!session || !workbenchPrompt.trim()}
              >
                <Zap size={12} />
                直接发送
              </button>
            </div>
            {workbenchError && (
              <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 4, background: '#2a1515', border: '1px solid #5c2a2a', fontSize: 12, color: '#e07a7a', lineHeight: 1.5 }}>
                {workbenchError}
              </div>
            )}
            </div>
          </>
        )}
        {autoReplyMode === 'single' && !autoReplyTarget && (
          <div style={{ borderTop: '1px solid #2c3135', margin: '16px 0' }} />
        )}

        <h3 className="proxy-section-title" id="reply-reply-section">自动回复</h3>
        <ProxyField label="自动处理消息">
          <Switch enabled={enabled} onChange={onToggleEnabled} />
        </ProxyField>
        <div className="proxy-note">开启后，收到新消息自动调用 AI 生成回复</div>
        <ProxyField label="回复范围">
          <CustomSelect
            placeholder="选择范围"
            value={autoReplyMode}
            options={[
              { value: 'global', label: '全局（所有用户）' },
              { value: 'single', label: '单用户（指定用户）' },
            ]}
            onChange={(val) => {
              setAutoReplyMode(val as 'global' | 'single')
              if (val === 'single' && replyTarget && !autoReplyTarget) {
                setAutoReplyTarget(replyTarget)
              }
            }}
          />
        </ProxyField>
        <ProxyField label="自动发送">
          <Switch enabled={config.autoSend} onChange={(v) => onUpdateConfig({ autoSend: v })} />
        </ProxyField>
        <div className="proxy-note">开启自动发送，关闭仅填输入框</div>

        <div style={{ borderTop: '1px solid #2c3135', margin: '16px 0' }} />
        <h4 style={{ fontSize: 16, margin: '16px 0 20px', fontWeight: 700 }}>触发策略</h4>
        <ProxyField label="延迟回复">
          <CustomSelect
            placeholder="选择延迟"
            value={String(config.delaySeconds)}
            options={[
              { value: '0', label: '立即回复' },
              { value: '5', label: '延迟 5 秒' },
              { value: '15', label: '延迟 15 秒' },
              { value: '30', label: '延迟 30 秒' },
              { value: '45', label: '延迟 45 秒' },
              { value: '60', label: '延迟 60 秒' },
            ]}
            onChange={(val) => onUpdateConfig({ delaySeconds: Number(val) })}
          />
        </ProxyField>
        <div className="proxy-note">收到消息后延迟一段时间再自动回复</div>

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
                style={{ height: 32, padding: '0 10px', fontSize: 11 }}
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
              { value: 'MiniMax-M2.7', label: 'MiniMax M2.7' },
            ]}
            onChange={(val) => onUpdateConfig({ model: val })}
          />
        </ProxyField>
        <div className="proxy-note">选择常用大模型，或输入自定义模型名称</div>

        <ProxyField label="API 地址">
          <input className="proxy-input" placeholder="https://api.minimaxi.com/v1/chat/completions" value={config.endpoint} onChange={(e) => onUpdateConfig({ endpoint: e.target.value })} />
        </ProxyField>
        <div className="proxy-note">OpenAI 兼容格式的 API 地址</div>

        <ProxyField label="API 密钥">
          <input className="proxy-input" type="password" placeholder="sk-..." value={config.apiKey} onChange={(e) => onUpdateConfig({ apiKey: e.target.value })} />
        </ProxyField>
        <div className="proxy-note">大模型服务的 API 密钥</div>

        <div style={{ borderTop: '1px solid #2c3135', margin: '16px 0' }} />
        <h4 style={{ fontSize: 16, margin: '16px 0 20px', fontWeight: 700 }}>回复风格</h4>
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
        <h4 style={{ fontSize: 16, margin: '16px 0 20px', fontWeight: 700 }}>模型参数</h4>

        <ProxyField label="创意程度">
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
        <div className="proxy-note">创意程度，越低越保守（0.0 ~ 1.0）</div>

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
        <div className="proxy-note">限制最大 token 数，0 表示不限制</div>

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
        <div className="proxy-note">对话轮数，0 表示不参考上下文</div>

        <ProxyField label="Top P">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(config.topP * 100)}
              onChange={(e) => onUpdateConfig({ topP: Number(e.target.value) / 100 })}
              style={{ flex: 1, accentColor: '#19d973' }}
            />
            <span style={{ fontSize: 12, color: '#a8afb7', width: 40, textAlign: 'right' }}>{config.topP.toFixed(2)}</span>
          </div>
        </ProxyField>
        <div className="proxy-note">越小输出越稳定（0.0 ~ 1.0）</div>

        <ProxyField label="频率惩罚">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
            <input
              type="range"
              min={-20}
              max={20}
              value={Math.round(config.frequencyPenalty * 10)}
              onChange={(e) => onUpdateConfig({ frequencyPenalty: Number(e.target.value) / 10 })}
              style={{ flex: 1, accentColor: '#19d973' }}
            />
            <span style={{ fontSize: 12, color: '#a8afb7', width: 40, textAlign: 'right' }}>{config.frequencyPenalty.toFixed(1)}</span>
          </div>
        </ProxyField>
        <div className="proxy-note">越高重复越少（-2.0 ~ 2.0）</div>

        <ProxyField label="存在惩罚">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
            <input
              type="range"
              min={-20}
              max={20}
              value={Math.round(config.presencePenalty * 10)}
              onChange={(e) => onUpdateConfig({ presencePenalty: Number(e.target.value) / 10 })}
              style={{ flex: 1, accentColor: '#19d973' }}
            />
            <span style={{ fontSize: 12, color: '#a8afb7', width: 40, textAlign: 'right' }}>{config.presencePenalty.toFixed(1)}</span>
          </div>
        </ProxyField>
        <div className="proxy-note">越高话题越新（-2.0 ~ 2.0）</div>
      </>)}
      {activeTab === 'model' && (<>
        <ModelSwitcher currentModel={config.model} onChange={(model: string) => onUpdateConfig({ model })} />
        <div style={{ borderTop: '1px solid #2c3135', margin: '16px 0' }} />
      </>)}
      </div>
    </aside>
  )
}

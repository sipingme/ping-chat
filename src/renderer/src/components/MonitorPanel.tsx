import { useState } from 'react'
import { ChevronDown, Send, Zap } from 'lucide-react'
import type { ChatMessage, ChatSession } from '../types'
import { ProxyField, Switch } from '../components/ui/BaseUI'
import { usePerformance } from '../hooks/usePerformance'

export function MonitorPanel({ session, monitoringEnabled, onToggleMonitoring, chatStats, setReplyTarget, handleScrollTo, setAutoReplyMode, setAutoReplyTarget, messages, processedCount, recentReplyLogs, replyFeedbackMap, onReplyFeedback }: { session?: ChatSession; monitoringEnabled: boolean; onToggleMonitoring: (v: boolean) => void; chatStats: any; setReplyTarget: (v: string) => void; handleScrollTo: (tab: 'monitor' | 'overview' | 'reply' | 'model') => void; setAutoReplyMode: (v: 'global' | 'single') => void; setAutoReplyTarget: (v: string) => void; messages: ChatMessage[]; processedCount: number; recentReplyLogs?: Array<{ id: string; type: string; content: string; contact: string }>; replyFeedbackMap?: Record<string, 'up' | 'down'>; onReplyFeedback?: (id: string, feedback: 'up' | 'down') => void }): JSX.Element {
  const [showUserList, setShowUserList] = useState(false)
  const [showGroupList, setShowGroupList] = useState(false)
  const isWechat = session?.platformId === 'wechat'
  const perf = usePerformance(5000)

  return (
    <>
      <h3 className="proxy-section-title">监控面板</h3>
      <ProxyField label="监控状态"><Switch enabled={monitoringEnabled} onChange={onToggleMonitoring} /></ProxyField>
      <div className="proxy-note">开启后，每 5 秒自动扫描并上报聊天列表状态</div>
      <div style={{ borderTop: '1px solid #2c3135', margin: '16px 0' }} />
      {perf && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <div style={{ padding: '8px 10px', borderRadius: 4, background: '#252a2e', border: '1px solid #2c3135' }}>
            <div style={{ fontSize: 10, color: '#8c96a1', marginBottom: 2 }}>JS 内存</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f3f5f7' }}>{perf.memoryUsedMB} / {perf.memoryTotalMB} MB</div>
          </div>
          <div style={{ padding: '8px 10px', borderRadius: 4, background: '#252a2e', border: '1px solid #2c3135' }}>
            <div style={{ fontSize: 10, color: '#8c96a1', marginBottom: 2 }}>DOM 节点</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f3f5f7' }}>{perf.domNodes}</div>
          </div>
        </div>
      )}
      {monitoringEnabled && (
        <>
          <h3 className="proxy-section-title" id="reply-users-section">用户信息</h3>
          <div style={{ display: 'grid', gridTemplateColumns: isWechat ? '1fr 1fr' : '1fr', gap: 8, marginBottom: 12 }}>
            <button className="secondary-action" style={{ padding: '10px 12px', borderRadius: 6, background: '#252a2e', border: '1px solid #2c3135', textAlign: 'left', cursor: 'pointer' }} onClick={() => { setShowUserList((v) => !v); setShowGroupList(false) }}>
              <div style={{ fontSize: 11, color: '#8c96a1', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>用户数量</span>
                <ChevronDown size={12} style={{ transform: showUserList ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', color: '#8c96a1' }} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#f3f5f7' }}>{chatStats?.userCount ?? 0}<span style={{ fontSize: 11, fontWeight: 400, color: '#8c96a1', marginLeft: 4 }}>个</span></div>
            </button>
            {isWechat && (
              <button className="secondary-action" style={{ padding: '10px 12px', borderRadius: 6, background: '#252a2e', border: '1px solid #2c3135', textAlign: 'left', cursor: 'pointer' }} onClick={() => { setShowGroupList((v) => !v); setShowUserList(false) }}>
                <div style={{ fontSize: 11, color: '#8c96a1', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>群聊数量</span>
                  <ChevronDown size={12} style={{ transform: showGroupList ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', color: '#8c96a1' }} />
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#f3f5f7' }}>{chatStats?.groupCount ?? 0}<span style={{ fontSize: 11, fontWeight: 400, color: '#8c96a1', marginLeft: 4 }}>个</span></div>
              </button>
            )}
          </div>
          {showUserList && (
            <div style={{ marginBottom: 12, maxHeight: 300, overflow: 'auto' }}>
              {(chatStats?.contacts ?? []).filter((c: any) => !c.isGroup).map((c: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: 4, background: '#252a2e', border: '1px solid #2c3135', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {c.avatar ? <img src={c.avatar} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#3a4147', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#8c96a1' }}>{c.name.charAt(0)}</div>}
                    <span style={{ fontSize: 12, color: '#f3f5f7' }}>{c.name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <button className="icon-action" style={{ height: 22, width: 22, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="快捷回复" onClick={() => { setReplyTarget(c.name); handleScrollTo('overview'); if (session) void window.pingChat.selectChat(session.partition, c.name) }}><Send size={12} /></button>
                    <button className="icon-action" style={{ height: 22, width: 22, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="自动回复" onClick={() => { setAutoReplyMode('single'); setAutoReplyTarget(c.name); handleScrollTo('reply'); if (session) void window.pingChat.selectChat(session.partition, c.name) }}><Zap size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {isWechat && showGroupList && (
            <div style={{ marginBottom: 12, maxHeight: 300, overflow: 'auto' }}>
              {(chatStats?.contacts ?? []).filter((c: any) => c.isGroup).map((c: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: 4, background: '#252a2e', border: '1px solid #2c3135', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {c.avatar ? <img src={c.avatar} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#3a4147', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#8c96a1' }}>{c.name.charAt(0)}</div>}
                    <span style={{ fontSize: 12, color: '#f3f5f7' }}>{c.name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <button className="icon-action" style={{ height: 22, width: 22, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="快捷回复" onClick={() => { setReplyTarget(c.name); handleScrollTo('overview'); if (session) void window.pingChat.selectChat(session.partition, c.name) }}><Send size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {monitoringEnabled && (<>
        <h3 className="proxy-section-title" id="reply-messages-section" style={{ marginTop: 30 }}>消息监控</h3>
        {(!chatStats || (chatStats.totalCount === 0 && messages.length === 0)) ? (
          <div style={{ padding: '16px 12px', borderRadius: 6, background: '#1a1f23', border: '1px dashed #3a4147', textAlign: 'center' }}>
            <span style={{ fontSize: 12, color: '#8c96a1' }}>暂无监控数据，请确保{isWechat ? '微信' : '小红书'}已正常登录</span>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div style={{ padding: '10px 12px', borderRadius: 6, background: '#252a2e', border: '1px solid #2c3135' }}>
                <div style={{ fontSize: 11, color: '#8c96a1', marginBottom: 4 }}>未处理</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#ff9b6a' }}>{chatStats?.totalUnread ?? messages.length - processedCount}<span style={{ fontSize: 11, fontWeight: 400, color: '#8c96a1', marginLeft: 4 }}>个</span></div>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 6, background: '#252a2e', border: '1px solid #2c3135' }}>
                <div style={{ fontSize: 11, color: '#8c96a1', marginBottom: 4 }}>已处理</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#19d973' }}>{processedCount}<span style={{ fontSize: 11, fontWeight: 400, color: '#8c96a1', marginLeft: 4 }}>个</span></div>
              </div>
            </div>

            {chatStats && chatStats.unreadContacts.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {chatStats.unreadContacts.filter((c: any) => !c.isGroup).length > 0 && <div style={{ marginBottom: 8, fontSize: 12, color: '#8c96a1', fontWeight: 600 }}>用户</div>}
                {chatStats.unreadContacts.filter((c: any) => !c.isGroup).map((c: any, i: number) => (
                  <div key={`u-${i}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: 4, background: '#252a2e', border: '1px solid #2c3135', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {c.avatar ? <img src={c.avatar} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#3a4147', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#8c96a1' }}>{c.name.charAt(0)}</div>}
                      <span style={{ fontSize: 12, color: '#f3f5f7' }}>{c.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button style={{ height: 22, width: 22, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: '#8c96a1' }} title="快捷回复" onClick={() => { setReplyTarget(c.name); handleScrollTo('overview'); if (session) void window.pingChat.selectChat(session.partition, c.name) }}><Send size={12} /></button>
                    </div>
                  </div>
                ))}
                {isWechat && chatStats.unreadContacts.filter((c: any) => c.isGroup).length > 0 && <div style={{ marginTop: 8, marginBottom: 8, fontSize: 12, color: '#8c96a1', fontWeight: 600 }}>群聊</div>}
                {isWechat && chatStats.unreadContacts.filter((c: any) => c.isGroup).map((c: any, i: number) => (
                  <div key={`g-${i}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: 4, background: '#252a2e', border: '1px solid #2c3135', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {c.avatar ? <img src={c.avatar} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#3a4147', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#8c96a1' }}>{c.name.charAt(0)}</div>}
                      <span style={{ fontSize: 12, color: '#f3f5f7' }}>{c.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button style={{ height: 22, width: 22, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: '#8c96a1' }} title="快捷回复" onClick={() => { setReplyTarget(c.name); handleScrollTo('overview'); if (session) void window.pingChat.selectChat(session.partition, c.name) }}><Send size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* message sender cards removed */}

            {recentReplyLogs && recentReplyLogs.length > 0 && (
              <>
                <div style={{ borderTop: '1px solid #2c3135', margin: '16px 0' }} />
                <h3 className="proxy-section-title">回复质量反馈</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {recentReplyLogs.slice(0, 5).map((log) => (
                    <div key={log.id} style={{ padding: '8px 10px', borderRadius: 4, background: '#252a2e', border: '1px solid #2c3135' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: '#8c96a1' }}>{log.contact}</span>
                        <span style={{ fontSize: 10, color: '#8c96a1' }}>{log.type === 'ai' ? 'AI' : '关键词'}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#f3f5f7', marginBottom: 6, wordBreak: 'break-word', lineHeight: 1.5 }}>{log.content || '（无内容）'}</div>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          style={{ padding: '2px 8px', borderRadius: 4, border: 'none', fontSize: 12, cursor: 'pointer', background: replyFeedbackMap?.[log.id] === 'up' ? '#19d973' : '#3a4147', color: '#f3f5f7' }}
                          onClick={() => onReplyFeedback?.(log.id, 'up')}
                        >
                          👍
                        </button>
                        <button
                          style={{ padding: '2px 8px', borderRadius: 4, border: 'none', fontSize: 12, cursor: 'pointer', background: replyFeedbackMap?.[log.id] === 'down' ? '#ff6b6b' : '#3a4147', color: '#f3f5f7' }}
                          onClick={() => onReplyFeedback?.(log.id, 'down')}
                        >
                          👎
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </>)}
    </>
  )
}

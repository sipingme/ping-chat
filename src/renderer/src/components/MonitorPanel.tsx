import { useState } from 'react'
import { ChevronDown, Send, Zap } from 'lucide-react'
import type { ChatMessage, ChatSession } from '../types'
import { Switch } from '../components/ui/BaseUI'
import { usePerformance } from '../hooks/usePerformance'

export function MonitorPanel({ session, monitoringEnabled, onToggleMonitoring, chatStats, setReplyTarget, handleScrollTo, setAutoReplyMode, setAutoReplyTarget, messages, processedCount, recentReplyLogs, replyFeedbackMap, onReplyFeedback }: { session?: ChatSession; monitoringEnabled: boolean; onToggleMonitoring: (v: boolean) => void; chatStats: any; setReplyTarget: (v: string) => void; handleScrollTo: (tab: 'monitor' | 'overview' | 'reply' | 'model') => void; setAutoReplyMode: (v: 'global' | 'single') => void; setAutoReplyTarget: (v: string) => void; messages: ChatMessage[]; processedCount: number; recentReplyLogs?: Array<{ id: string; type: string; content: string; contact: string }>; replyFeedbackMap?: Record<string, 'up' | 'down'>; onReplyFeedback?: (id: string, feedback: 'up' | 'down') => void }): JSX.Element {
  const [showUserList, setShowUserList] = useState(false)
  const [showGroupList, setShowGroupList] = useState(false)
  const isWechat = session?.platformId === 'wechat'
  const perf = usePerformance()

  return (
    <>
      <h3 className="proxy-section-title">性能指标</h3>
      {perf && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12, marginTop: 8 }}>
          <div style={{ padding: '8px 10px', borderRadius: 4, background: '#252a2e', border: '1px solid #2c3135' }}>
            <div style={{ fontSize: 11, color: '#f3f5f7', marginBottom: 3, fontWeight: 600 }}>JS 内存</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: perf.usagePercent >= 90 ? '#ef4444' : perf.usagePercent >= 80 ? '#f59e0b' : '#19d973' }}>
              {perf.memoryUsedMB} MB ({perf.usagePercent}%)
            </div>
            <div style={{ fontSize: 9, color: '#6c7680', marginTop: 2 }}>JavaScript 引擎占用的内存</div>
          </div>
          <div style={{ padding: '8px 10px', borderRadius: 4, background: '#252a2e', border: '1px solid #2c3135' }}>
            <div style={{ fontSize: 11, color: '#f3f5f7', marginBottom: 3, fontWeight: 600 }}>FPS 帧率</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: perf.fps >= 55 ? '#19d973' : perf.fps >= 30 ? '#f59e0b' : '#ef4444' }}>
              {perf.fps}
            </div>
            <div style={{ fontSize: 9, color: '#6c7680', marginTop: 2 }}>{'>'}55 流畅，{'<'}30 卡顿</div>
          </div>
          <div style={{ padding: '8px 10px', borderRadius: 4, background: '#252a2e', border: '1px solid #2c3135' }}>
            <div style={{ fontSize: 11, color: '#f3f5f7', marginBottom: 3, fontWeight: 600 }}>DOM 节点</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f3f5f7' }}>{perf.domNodes}</div>
            <div style={{ fontSize: 9, color: '#6c7680', marginTop: 2 }}>HTML 元素总数，{'>'}10000 可能卡顿</div>
          </div>
          <div style={{ padding: '8px 10px', borderRadius: 4, background: '#252a2e', border: '1px solid #2c3135' }}>
            <div style={{ fontSize: 11, color: '#f3f5f7', marginBottom: 3, fontWeight: 600 }}>响应延迟</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: perf.responseMs <= 5 ? '#19d973' : perf.responseMs <= 20 ? '#f59e0b' : '#ef4444' }}>
              {perf.responseMs} ms
            </div>
            <div style={{ fontSize: 9, color: '#6c7680', marginTop: 2 }}>Event Loop 响应时间</div>
          </div>
          <div style={{ padding: '8px 10px', borderRadius: 4, background: '#252a2e', border: '1px solid #2c3135' }}>
            <div style={{ fontSize: 11, color: '#f3f5f7', marginBottom: 3, fontWeight: 600 }}>Webview 数量</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: perf.webviewCount <= 3 ? '#19d973' : perf.webviewCount <= 6 ? '#f59e0b' : '#ef4444' }}>
              {perf.webviewCount}
            </div>
            <div style={{ fontSize: 9, color: '#6c7680', marginTop: 2 }}>打开的标签页数量</div>
          </div>
          <div style={{ padding: '8px 10px', borderRadius: 4, background: '#252a2e', border: '1px solid #2c3135' }}>
            <div style={{ fontSize: 11, color: '#f3f5f7', marginBottom: 3, fontWeight: 600 }}>长任务数量</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: perf.longTasks === 0 ? '#19d973' : perf.longTasks <= 3 ? '#f59e0b' : '#ef4444' }}>
              {perf.longTasks}
            </div>
            <div style={{ fontSize: 9, color: '#6c7680', marginTop: 2 }}>{'>'}50ms 阻塞主线程的任务数</div>
          </div>
        </div>
      )}
      <div style={{ borderTop: '1px solid #2c3135', margin: '16px 0' }} />
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <h3 className="proxy-section-title" style={{ margin: 0, marginRight: 10 }}>监控状态</h3>
        <Switch enabled={monitoringEnabled} onChange={onToggleMonitoring} />
      </div>
      <div className="proxy-note" style={{ marginLeft: 0, textAlign: 'left' }}>开启后，每 5 秒自动扫描并上报聊天列表状态</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '20px 0 12px' }}>
        <div style={{ width: 3, height: 14, borderRadius: 2, background: '#19d973' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#f3f5f7' }}>用户信息列表</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isWechat ? '1fr 1fr' : '1fr', gap: 8, marginBottom: 12 }}>
        <button className="secondary-action" style={{ padding: '10px 12px', borderRadius: 4, background: '#252a2e', border: '1px solid #2c3135', textAlign: 'left', cursor: monitoringEnabled ? 'pointer' : 'default' }} onClick={() => { if (monitoringEnabled) { setShowUserList((v) => !v); setShowGroupList(false) } }}>
          <div style={{ fontSize: 11, color: '#8c96a1', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>用户数量</span>
            {monitoringEnabled && <ChevronDown size={12} style={{ transform: showUserList ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', color: '#8c96a1' }} />}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#f3f5f7' }}>{chatStats?.userCount ?? 0}<span style={{ fontSize: 11, fontWeight: 400, color: '#8c96a1', marginLeft: 4 }}>个</span></div>
        </button>
        {isWechat && (
          <button className="secondary-action" style={{ padding: '10px 12px', borderRadius: 4, background: '#252a2e', border: '1px solid #2c3135', textAlign: 'left', cursor: monitoringEnabled ? 'pointer' : 'default' }} onClick={() => { if (monitoringEnabled) { setShowGroupList((v) => !v); setShowUserList(false) } }}>
            <div style={{ fontSize: 11, color: '#8c96a1', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>群聊数量</span>
              {monitoringEnabled && <ChevronDown size={12} style={{ transform: showGroupList ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', color: '#8c96a1' }} />}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#f3f5f7' }}>{chatStats?.groupCount ?? 0}<span style={{ fontSize: 11, fontWeight: 400, color: '#8c96a1', marginLeft: 4 }}>个</span></div>
          </button>
        )}
      </div>
      {monitoringEnabled && showUserList && (
        <div style={{ marginBottom: 12, maxHeight: 300, overflow: 'auto' }}>
          {(chatStats?.contacts ?? []).filter((c: any) => !c.isGroup).length === 0 ? (
            <div style={{ padding: '16px 12px', borderRadius: 4, background: '#1a1f23', border: '1px dashed #3a4147', textAlign: 'center' }}>
              <span style={{ fontSize: 12, color: '#8c96a1' }}>暂无用户数据，请确保{isWechat ? '微信' : '小红书'}已正常登录</span>
            </div>
          ) : (
            (chatStats?.contacts ?? []).filter((c: any) => !c.isGroup).map((c: any, i: number) => (
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
            ))
          )}
        </div>
      )}
      {monitoringEnabled && isWechat && showGroupList && (
        <div style={{ marginBottom: 12, maxHeight: 300, overflow: 'auto' }}>
          {(chatStats?.contacts ?? []).filter((c: any) => c.isGroup).length === 0 ? (
            <div style={{ padding: '16px 12px', borderRadius: 4, background: '#1a1f23', border: '1px dashed #3a4147', textAlign: 'center' }}>
              <span style={{ fontSize: 12, color: '#8c96a1' }}>暂无群聊数据，请确保微信已正常登录</span>
            </div>
          ) : (
            (chatStats?.contacts ?? []).filter((c: any) => c.isGroup).map((c: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: 4, background: '#252a2e', border: '1px solid #2c3135', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {c.avatar ? <img src={c.avatar} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#3a4147', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#8c96a1' }}>{c.name.charAt(0)}</div>}
                  <span style={{ fontSize: 12, color: '#f3f5f7' }}>{c.name}</span>
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  <button className="icon-action" style={{ height: 22, width: 22, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="快捷回复" onClick={() => { setReplyTarget(c.name); handleScrollTo('overview'); if (session) void window.pingChat.selectChat(session.partition, c.name) }}><Send size={12} /></button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '20px 0 12px' }}>
        <div style={{ width: 3, height: 14, borderRadius: 2, background: '#19d973' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#f3f5f7' }}>用户消息监控</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div style={{ padding: '10px 12px', borderRadius: 4, background: '#252a2e', border: '1px solid #2c3135' }}>
          <div style={{ fontSize: 11, color: '#8c96a1', marginBottom: 4 }}>未处理</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#ff9b6a' }}>{monitoringEnabled ? (chatStats?.totalUnread ?? messages.length - processedCount) : 0}<span style={{ fontSize: 11, fontWeight: 400, color: '#8c96a1', marginLeft: 4 }}>个</span></div>
        </div>
        <div style={{ padding: '10px 12px', borderRadius: 4, background: '#252a2e', border: '1px solid #2c3135' }}>
          <div style={{ fontSize: 11, color: '#8c96a1', marginBottom: 4 }}>已处理</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#19d973' }}>{monitoringEnabled ? processedCount : 0}<span style={{ fontSize: 11, fontWeight: 400, color: '#8c96a1', marginLeft: 4 }}>个</span></div>
        </div>
      </div>

      {monitoringEnabled && (<>
        {(!chatStats || (chatStats.totalCount === 0 && messages.length === 0)) ? (
          <div style={{ padding: '16px 12px', borderRadius: 6, background: '#1a1f23', border: '1px dashed #3a4147', textAlign: 'center' }}>
            <span style={{ fontSize: 12, color: '#8c96a1' }}>暂无监控数据，请确保{isWechat ? '微信' : '小红书'}已正常登录</span>
          </div>
        ) : (
          <>
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

import { useState } from 'react'
import {
  ChevronDown, Copy, Disc3, ExternalLink, PanelLeft, Plus, RotateCw,
  Search, ShieldCheck, X,
} from 'lucide-react'
import type { Platform, ChatSession } from '../types'

function SessionCard({
  session, active, accent, onSelect, onClose, onRefresh, onRename,
}: {
  session: ChatSession
  active: boolean
  accent: string
  onSelect: () => void
  onClose: () => void
  onRefresh?: () => void
  onRename?: (name: string) => void
}): JSX.Element {
  const [spinning, setSpinning] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(session.name)
  const handleRefresh = (event: React.MouseEvent): void => {
    event.stopPropagation()
    setSpinning(true)
    onRefresh?.()
  }
  return (
    <section
      role="button"
      tabIndex={0}
      className={`session-card ${active ? 'active' : ''}`}
      style={{ '--accent': accent } as React.CSSProperties}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect() } }}
    >
      <div className="session-content">
        <div className="session-title-row" onDoubleClick={() => { if (onRename) { setEditing(true); setEditName(session.name); } }}>
          {editing ? (
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={() => { setEditing(false); if (onRename && editName.trim() && editName !== session.name) onRename(editName.trim()) }}
              onKeyDown={(e) => { if (e.key === 'Enter') { setEditing(false); if (onRename && editName.trim() && editName !== session.name) onRename(editName.trim()) } if (e.key === 'Escape') { setEditing(false); setEditName(session.name) } }}
              autoFocus
              style={{ fontSize: 13, fontWeight: 700, background: '#1a1f23', border: '1px solid ' + accent, color: '#f3f5f7', borderRadius: 3, padding: '2px 4px', outline: 'none', width: '100%' }}
            />
          ) : (
            <strong style={{ cursor: onRename ? 'text' : 'default', userSelect: 'none' }}>{session.name}</strong>
          )}
        </div>
      </div>
      <div className="session-card-actions">
        <button
          className={spinning ? 'spinning' : ''}
          onClick={handleRefresh}
          onAnimationEnd={() => setSpinning(false)}
        >
          <RotateCw size={13} />
        </button>
        <button onClick={(event) => { event.stopPropagation(); onClose() }}><X size={14} /></button>
      </div>
    </section>
  )
}

export function ConversationSidebar({
  platform,
  sessions,
  activeSessionId,
  onCreateSession,
  onSelectSession,
  onCloseSession,
  onRefreshSession,
  onRenameSession,
}: {
  platform: Platform
  sessions: ChatSession[]
  activeSessionId: string
  onCreateSession: () => void
  onSelectSession: (id: string) => void
  onCloseSession: (id: string) => void
  onRefreshSession?: () => void
  onRenameSession?: (id: string, name: string) => void
}): JSX.Element {
  return (
    <aside className="conversation-sidebar">
      <section className="conversation-top">
        <div className="panel-heading">
          <h1>{platform.name}</h1>
          <div className="panel-actions">
            <button><Search size={16} /></button>
            <button><Copy size={16} /></button>
            <button><PanelLeft size={16} /></button>
          </div>
        </div>
        <button className="create-button" onClick={onCreateSession}><Plus size={14} />创建会话</button>
        <div className="search-box">
          <Search size={13} />
          <input placeholder="群聊/手机号/备注" />
        </div>
      </section>
      <section className="session-list">
        {sessions.length === 0 ? (
          <div className="ghost-card">
            <Disc3 size={18} />
            <span>暂无会话</span>
          </div>
        ) : (
          sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              active={session.id === activeSessionId}
              accent={platform.accent}
              onSelect={() => onSelectSession(session.id)}
              onClose={() => onCloseSession(session.id)}
              onRefresh={onRefreshSession}
              onRename={onRenameSession ? (name) => onRenameSession(session.id, name) : undefined}
            />
          ))
        )}
      </section>
      <div className="platform-meta">
        <ShieldCheck size={13} />
        <span>当前平台</span>
        <b style={{ color: platform.accent }}>{platform.name}</b>
        <ChevronDown size={13} />
        <ExternalLink size={13} />
      </div>
    </aside>
  )
}

import { AlertTriangle } from 'lucide-react'

export function RecallMessagesPanel({
  recalls,
}: {
  recalls: Array<{ partition: string; sender: string; content: string; originalContent: string; timestamp: number }>
}): JSX.Element {
  if (recalls.length === 0) {
    return <div className="proxy-note" style={{ padding: 12 }}>暂无撤回记录</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <h3 className="proxy-section-title">撤回消息</h3>
      <div style={{ maxHeight: 200, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {recalls.map((r, i) => (
          <div key={i} style={{ padding: 8, borderRadius: 4, background: '#2c3135', borderLeft: '3px solid #ef4444' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <AlertTriangle size={12} color="#ef4444" />
              <span style={{ fontSize: 11, color: '#a8afb7' }}>{r.sender}</span>
              <span style={{ fontSize: 10, color: '#6c7680', marginLeft: 'auto' }}>
                {new Date(r.timestamp).toLocaleTimeString()}
              </span>
            </div>
            {r.originalContent && (
              <div style={{ fontSize: 12, color: '#f3f5f7', marginBottom: 2 }}>{r.originalContent}</div>
            )}
            <div style={{ fontSize: 10, color: '#ef4444' }}>{r.content}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

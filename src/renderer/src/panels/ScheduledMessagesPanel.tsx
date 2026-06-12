import { useEffect, useState } from 'react'
import { Clock, Trash2, X } from 'lucide-react'

interface ScheduledTask {
  id: string
  partition: string
  content: string
  executeAt: number
  autoSend: boolean
  cancelled: boolean
}

export function ScheduledMessagesPanel({ partition }: { partition?: string }): JSX.Element {
  const [tasks, setTasks] = useState<ScheduledTask[]>([])
  const [content, setContent] = useState('')
  const [delayMinutes, setDelayMinutes] = useState(5)
  const [loading, setLoading] = useState(false)

  const refresh = async (): Promise<void> => {
    if (!partition) return
    const list = await window.pingChat.listScheduledMessages(partition)
    setTasks(list)
  }

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [partition])

  const handleAdd = async (): Promise<void> => {
    if (!partition || !content.trim()) return
    setLoading(true)
    await window.pingChat.addScheduledMessage(partition, content.trim(), delayMinutes * 60 * 1000)
    setContent('')
    await refresh()
    setLoading(false)
  }

  const handleCancel = async (id: string): Promise<void> => {
    await window.pingChat.cancelScheduledMessage(id)
    await refresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h3 className="proxy-section-title">定时发送</h3>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          className="proxy-textarea"
          style={{ flex: 1, height: 28, padding: '0 8px' }}
          placeholder="消息内容"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <input
          className="proxy-textarea"
          style={{ width: 60, height: 28, padding: '0 8px' }}
          type="number"
          min={1}
          value={delayMinutes}
          onChange={(e) => setDelayMinutes(Number(e.target.value))}
        />
        <span style={{ fontSize: 12, color: '#8c96a1', alignSelf: 'center' }}>分钟后</span>
        <button className="create-button" style={{ height: 28, padding: '0 12px', fontSize: 11 }} onClick={handleAdd} disabled={loading}>
          <Clock size={12} style={{ marginRight: 4 }} /> 添加
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflow: 'auto' }}>
        {tasks.map((t) => (
          <div key={t.id} style={{ padding: '6px 8px', borderRadius: 4, background: '#252a2e', border: '1px solid #2c3135', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: '#f3f5f7', wordBreak: 'break-word' }}>{t.content}</div>
              <div style={{ fontSize: 10, color: '#8c96a1' }}>{new Date(t.executeAt).toLocaleString()}</div>
            </div>
            <button className="secondary-action" style={{ height: 22, width: 22, padding: 0, marginLeft: 8 }} onClick={() => handleCancel(t.id)}>
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        {tasks.length === 0 && <div style={{ fontSize: 12, color: '#8c96a1', textAlign: 'center', padding: 12 }}>暂无定时任务</div>}
      </div>
    </div>
  )
}

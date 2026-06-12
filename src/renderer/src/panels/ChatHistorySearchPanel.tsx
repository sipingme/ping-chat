import { useState } from 'react'
import { Download, Search, X } from 'lucide-react'

interface HistoryEntry {
  partition: string
  sender: string
  content: string
  isFromUser: boolean
  timestamp: number
}

export function ChatHistorySearchPanel({ partition }: { partition?: string }): JSX.Element {
  const [keyword, setKeyword] = useState('')
  const [sender, setSender] = useState('')
  const [results, setResults] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(false)

  const handleSearch = async (): Promise<void> => {
    if (!partition) return
    setLoading(true)
    try {
      const res = await window.pingChat.searchChatHistory(partition, {
        keyword: keyword || undefined,
        sender: sender || undefined,
        limit: 50,
      })
      setResults(res)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'json' | 'csv'): Promise<void> => {
    if (!partition) return
    const data = await window.pingChat.exportChatHistory(partition, format)
    const blob = new Blob([data], { type: format === 'csv' ? 'text/csv' : 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-history-${partition}-${new Date().toISOString().slice(0, 10)}.${format}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h3 className="proxy-section-title">消息搜索</h3>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <input
          className="proxy-textarea"
          style={{ flex: 1, minWidth: 100, height: 28, padding: '0 8px' }}
          placeholder="关键词"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <input
          className="proxy-textarea"
          style={{ flex: 1, minWidth: 100, height: 28, padding: '0 8px' }}
          placeholder="发送人"
          value={sender}
          onChange={(e) => setSender(e.target.value)}
        />
        <button className="create-button" style={{ height: 28, padding: '0 12px', fontSize: 11 }} onClick={handleSearch}>
          <Search size={12} style={{ marginRight: 4 }} /> 搜索
        </button>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="secondary-action" style={{ height: 24, padding: '0 8px', fontSize: 11 }} onClick={() => handleExport('json')}>
          <Download size={11} style={{ marginRight: 4 }} /> JSON
        </button>
        <button className="secondary-action" style={{ height: 24, padding: '0 8px', fontSize: 11 }} onClick={() => handleExport('csv')}>
          <Download size={11} style={{ marginRight: 4 }} /> CSV
        </button>
      </div>
      {loading && <div style={{ fontSize: 12, color: '#8c96a1' }}>搜索中...</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflow: 'auto' }}>
        {results.map((m, i) => (
          <div key={i} style={{ padding: '6px 8px', borderRadius: 4, background: '#252a2e', border: '1px solid #2c3135' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#8c96a1', marginBottom: 2 }}>
              <span>{m.sender}</span>
              <span>{new Date(m.timestamp).toLocaleString()}</span>
            </div>
            <div style={{ fontSize: 12, color: '#f3f5f7', wordBreak: 'break-word' }}>{m.content}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

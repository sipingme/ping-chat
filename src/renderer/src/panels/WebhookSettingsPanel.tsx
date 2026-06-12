import { useEffect, useState } from 'react'
import { Globe, Save } from 'lucide-react'

export function WebhookSettingsPanel(): JSX.Element {
  const [url, setUrl] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const config = await window.pingChat.getWebhook()
        setUrl(config.url)
        setEnabled(config.enabled)
      } catch {
        // ignore
      }
    })()
  }, [])

  const handleSave = async (): Promise<void> => {
    await window.pingChat.setWebhook(url, enabled)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h3 className="proxy-section-title">Webhook 集成</h3>
      <div className="proxy-note">配置 HTTP Webhook URL，聊天事件将自动 POST 到该地址</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          className="proxy-textarea"
          style={{ flex: 1, height: 28, padding: '0 8px' }}
          placeholder="https://your-webhook.com/api/events"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#f3f5f7', cursor: 'pointer' }}>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          启用
        </label>
      </div>
      <button className="create-button" style={{ height: 28, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }} onClick={handleSave}>
        <Save size={12} /> {saved ? '已保存' : '保存'}
      </button>
    </div>
  )
}

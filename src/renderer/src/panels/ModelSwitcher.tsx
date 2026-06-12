import { Cpu } from 'lucide-react'

const POPULAR_MODELS = [
  'MiniMax-M2.7',
  'MiniMax-Text-01',
  'gpt-4o',
  'gpt-4o-mini',
  'claude-3-5-sonnet',
  'claude-3-haiku',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
]

export function ModelSwitcher({ currentModel, onChange }: { currentModel: string; onChange: (model: string) => void }): JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <h3 className="proxy-section-title">快捷模型切换</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {POPULAR_MODELS.map((m) => (
          <button
            key={m}
            className={m === currentModel ? 'create-button' : 'secondary-action'}
            style={{ height: 26, padding: '0 10px', fontSize: 11, borderRadius: 4 }}
            onClick={() => onChange(m)}
          >
            <Cpu size={11} style={{ marginRight: 4 }} />
            {m}
          </button>
        ))}
      </div>
    </div>
  )
}

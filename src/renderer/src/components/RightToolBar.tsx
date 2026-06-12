import { Headphones, Info, Loader2, MessagesSquare, Server } from 'lucide-react'

export function RightToolBar({
  activeTool,
  onSelectTool,
  disabled = false,
  autoReplyProcessing = false,
}: {
  activeTool: string
  onSelectTool: (id: string) => void
  disabled?: boolean
  autoReplyProcessing?: boolean
}): JSX.Element {
  const handleClick = (id: string, isBottom = false) => {
    if (disabled && !isBottom) return
    if (activeTool === id) {
      onSelectTool('')
    } else {
      onSelectTool(id)
    }
  }
  const topTools = [
    { id: 'environment', label: '代理环境', icon: <Server size={18} /> },
    { id: 'reply', label: '自动回复', icon: autoReplyProcessing ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', color: '#19d973' }} /> : <MessagesSquare size={18} /> }
  ]

  const bottomTools = [
    { id: 'about', label: '关于', icon: <Info size={18} /> },
    { id: 'support', label: '联系客服', icon: <Headphones size={18} /> },
  ]

  return (
    <aside className="right-toolbar">
      <div className="right-tool-group">
        {topTools.map((tool) => (
          <button
            key={tool.id}
            className={`right-tool ${activeTool === tool.id ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
            onClick={() => handleClick(tool.id)}
          >
            {tool.icon}
            <span>{tool.label}</span>
          </button>
        ))}
      </div>
      <div className="right-tool-group bottom">
        {bottomTools.map((tool) => (
          <button
            key={tool.id}
            className={`right-tool ${activeTool === tool.id ? 'active' : ''}`}
            onClick={() => handleClick(tool.id, true)}
          >
            {tool.icon}
            <span>{tool.label}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}

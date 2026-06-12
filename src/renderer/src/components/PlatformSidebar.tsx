import { type CSSProperties } from 'react'
import { Lock, Monitor, Moon, Sun, X } from 'lucide-react'
import type { Platform } from '../types'

export function PlatformSidebar({
  activePlatformId,
  onSelectPlatform,
  platforms,
  theme,
  onToggleTheme,
  locale,
  onToggleLocale,
}: {
  activePlatformId: string
  onSelectPlatform: (id: string) => void
  platforms: Platform[]
  theme?: 'dark' | 'light' | 'system'
  onToggleTheme?: () => void
  locale?: 'zh' | 'en'
  onToggleLocale?: () => void
}): JSX.Element {
  return (
    <aside className="platform-sidebar">
      <div className="app-mark"><X size={24} strokeWidth={3.2} /></div>
      <div className="platform-list">
        {platforms.map((platform) => {
          const active = platform.id === activePlatformId
          return (
            <button
              key={platform.id}
              className={`platform-item ${active ? 'active' : ''}`}
              style={{ '--accent': platform.accent } as CSSProperties}
              onClick={() => onSelectPlatform(platform.id)}
              title={platform.name}
            >
              {platform.icon}
            </button>
          )
        })}
      </div>
      <div className="platform-footer">
        <button className="utility-icon" title={locale === 'zh' ? 'English' : '中文'} onClick={onToggleLocale}>{locale === 'zh' ? 'EN' : '中'}</button>
        <button className="utility-icon" title="切换主题" onClick={onToggleTheme}>
          {theme === 'light' ? <Sun size={16} /> : theme === 'dark' ? <Moon size={16} /> : <Monitor size={16} />}
        </button>
      </div>
    </aside>
  )
}

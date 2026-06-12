import { useMemo, useState } from 'react'
import { Tag, X } from 'lucide-react'

interface ContactTag {
  name: string
  tags: string[]
}

export function ContactTagsPanel({
  contacts,
  tagMap,
  onUpdateTagMap,
}: {
  contacts: Array<{ name: string; isGroup: boolean; unread: number; avatar: string }>
  tagMap: Record<string, string[]>
  onUpdateTagMap: (map: Record<string, string[]>) => void
}): JSX.Element {
  const [selectedContact, setSelectedContact] = useState('')
  const [newTag, setNewTag] = useState('')

  const allTags = useMemo(() => {
    const set = new Set<string>()
    Object.values(tagMap).forEach((tags) => tags.forEach((t) => set.add(t)))
    return Array.from(set)
  }, [tagMap])

  const handleAddTag = (contactName: string, tag: string): void => {
    const current = tagMap[contactName] || []
    if (current.includes(tag)) return
    onUpdateTagMap({ ...tagMap, [contactName]: [...current, tag] })
  }

  const handleRemoveTag = (contactName: string, tag: string): void => {
    const current = tagMap[contactName] || []
    onUpdateTagMap({ ...tagMap, [contactName]: current.filter((t) => t !== tag) })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h3 className="proxy-section-title">联系人标签</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
        {allTags.map((tag) => (
          <button
            key={tag}
            className="secondary-action"
            style={{ height: 22, padding: '0 8px', fontSize: 10, borderRadius: 11, display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => setSelectedContact('')}
          >
            <Tag size={10} /> {tag}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 250, overflow: 'auto' }}>
        {contacts.map((c) => (
          <div key={c.name} style={{ padding: '6px 8px', borderRadius: 4, background: '#252a2e', border: '1px solid #2c3135' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: '#f3f5f7' }}>{c.name}</span>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <input
                  className="proxy-textarea"
                  style={{ width: 80, height: 22, padding: '0 6px', fontSize: 10 }}
                  placeholder="新标签"
                  value={selectedContact === c.name ? newTag : ''}
                  onChange={(e) => { setSelectedContact(c.name); setNewTag(e.target.value) }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newTag.trim()) {
                      handleAddTag(c.name, newTag.trim())
                      setNewTag('')
                    }
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {(tagMap[c.name] || []).map((tag) => (
                <span
                  key={tag}
                  style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: '#3a4147', color: '#f3f5f7', display: 'flex', alignItems: 'center', gap: 2 }}
                >
                  {tag}
                  <button style={{ background: 'transparent', border: 'none', color: '#8c96a1', cursor: 'pointer', padding: 0, display: 'flex' }} onClick={() => handleRemoveTag(c.name, tag)}>
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

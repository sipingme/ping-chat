import { useState } from 'react'
import { Cloud, Code, Languages, MessageCircle, Shield, UserPlus } from 'lucide-react'
import { ProxyField, Switch } from '../components/ui/BaseUI'
import type { AutoReplyConfig } from '../types'

export function P7SettingsPanel({
  config,
  onUpdateConfig,
}: {
  config: AutoReplyConfig
  onUpdateConfig: (updates: Partial<AutoReplyConfig>) => void
}): JSX.Element {
  const [activeSection, setActiveSection] = useState('sensitive')

  const sections = [
    { id: 'sensitive', label: '敏感词', icon: <Shield size={14} /> },
    { id: 'mention', label: '@回复', icon: <MessageCircle size={14} /> },
    { id: 'translation', label: '翻译', icon: <Languages size={14} /> },
    { id: 'plugin', label: '插件', icon: <Code size={14} /> },
    { id: 'friend', label: '好友申请', icon: <UserPlus size={14} /> },
    { id: 'cloud', label: '云端同步', icon: <Cloud size={14} /> },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {sections.map((s) => (
          <button
            key={s.id}
            className={activeSection === s.id ? 'create-button' : 'secondary-action'}
            style={{ height: 26, padding: '0 10px', fontSize: 11, borderRadius: 4 }}
            onClick={() => setActiveSection(s.id)}
          >
            {s.icon} <span style={{ marginLeft: 4 }}>{s.label}</span>
          </button>
        ))}
      </div>

      {activeSection === 'sensitive' && (
        <>
          <ProxyField label="敏感词列表">
            <input
              className="proxy-textarea"
              style={{ height: 28, padding: '0 8px', flex: 1 }}
              placeholder="用逗号分隔"
              value={config.sensitiveWords.join(',')}
              onChange={(e) => onUpdateConfig({ sensitiveWords: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
            />
          </ProxyField>
          <div className="proxy-note">发送含敏感词的消息将被拦截</div>
        </>
      )}

      {activeSection === 'mention' && (
        <>
          <ProxyField label="仅@时回复"><Switch enabled={config.mentionOnly} onChange={(v) => onUpdateConfig({ mentionOnly: v })} /></ProxyField>
          <ProxyField label="我的昵称">
            <input
              className="proxy-textarea"
              style={{ height: 28, padding: '0 8px', flex: 1 }}
              placeholder="输入你在群里的昵称"
              value={config.myNickname}
              onChange={(e) => onUpdateConfig({ myNickname: e.target.value })}
            />
          </ProxyField>
        </>
      )}

      {activeSection === 'translation' && (
        <>
          <ProxyField label="自动翻译"><Switch enabled={config.enableTranslation} onChange={(v) => onUpdateConfig({ enableTranslation: v })} /></ProxyField>
          <ProxyField label="目标语言">
            <input
              className="proxy-textarea"
              style={{ height: 28, padding: '0 8px', flex: 1 }}
              value={config.targetLanguage}
              onChange={(e) => onUpdateConfig({ targetLanguage: e.target.value })}
            />
          </ProxyField>
        </>
      )}

      {activeSection === 'plugin' && (
        <>
          <ProxyField label="启用插件"><Switch enabled={config.enablePlugins} onChange={(v) => onUpdateConfig({ enablePlugins: v })} /></ProxyField>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflow: 'auto' }}>
            {(config.pluginRules || []).map((rule, i) => (
              <div key={rule.id || i} style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 11 }}>
                <select className="proxy-textarea" style={{ height: 24, width: 70 }} value={rule.type} onChange={(e) => {
                  const rules = [...(config.pluginRules || [])]
                  rules[i] = { ...rule, type: e.target.value as 'message' | 'reply' }
                  onUpdateConfig({ pluginRules: rules })
                }}>
                  <option value="message">消息</option>
                  <option value="reply">回复</option>
                </select>
                <select className="proxy-textarea" style={{ height: 24, width: 70 }} value={rule.match} onChange={(e) => {
                  const rules = [...(config.pluginRules || [])]
                  rules[i] = { ...rule, match: e.target.value as any }
                  onUpdateConfig({ pluginRules: rules })
                }}>
                  <option value="contains">包含</option>
                  <option value="equals">等于</option>
                  <option value="startswith">开头</option>
                  <option value="regex">正则</option>
                </select>
                <input className="proxy-textarea" style={{ height: 24, flex: 1, padding: '0 6px' }} placeholder="匹配" value={rule.pattern} onChange={(e) => {
                  const rules = [...(config.pluginRules || [])]
                  rules[i] = { ...rule, pattern: e.target.value }
                  onUpdateConfig({ pluginRules: rules })
                }} />
                <select className="proxy-textarea" style={{ height: 24, width: 60 }} value={rule.action} onChange={(e) => {
                  const rules = [...(config.pluginRules || [])]
                  rules[i] = { ...rule, action: e.target.value as any }
                  onUpdateConfig({ pluginRules: rules })
                }}>
                  <option value="reply">回复</option>
                  <option value="replace">替换</option>
                  <option value="block">拦截</option>
                </select>
                <input className="proxy-textarea" style={{ height: 24, flex: 1, padding: '0 6px' }} placeholder="值" value={rule.value} onChange={(e) => {
                  const rules = [...(config.pluginRules || [])]
                  rules[i] = { ...rule, value: e.target.value }
                  onUpdateConfig({ pluginRules: rules })
                }} />
                <button className="secondary-action" style={{ height: 22, padding: '0 6px', fontSize: 10 }} onClick={() => {
                  onUpdateConfig({ pluginRules: (config.pluginRules || []).filter((_, idx) => idx !== i) })
                }}>删除</button>
              </div>
            ))}
          </div>
          <button className="secondary-action" style={{ height: 26, marginTop: 6 }} onClick={() => {
            onUpdateConfig({ pluginRules: [...(config.pluginRules || []), { id: String(Date.now()), type: 'message', match: 'contains', pattern: '', action: 'reply', value: '', enabled: true }] })
          }}>添加规则</button>
          <div className="proxy-note">规则引擎：匹配消息或回复，执行回复/替换/拦截操作</div>
        </>
      )}

      {activeSection === 'friend' && (
        <>
          <ProxyField label="自动通过好友"><Switch enabled={config.enableFriendRequestAutoAccept} onChange={(v) => onUpdateConfig({ enableFriendRequestAutoAccept: v })} /></ProxyField>
          <ProxyField label="欢迎语">
            <input
              className="proxy-textarea"
              style={{ height: 28, padding: '0 8px', flex: 1 }}
              value={config.friendRequestWelcomeMessage}
              onChange={(e) => onUpdateConfig({ friendRequestWelcomeMessage: e.target.value })}
            />
          </ProxyField>
        </>
      )}

      {activeSection === 'cloud' && (
        <>
          <ProxyField label="云端同步"><Switch enabled={config.enableCloudSync} onChange={(v) => onUpdateConfig({ enableCloudSync: v })} /></ProxyField>
          <ProxyField label="同步地址">
            <input
              className="proxy-textarea"
              style={{ height: 28, padding: '0 8px', flex: 1 }}
              placeholder="https://api.example.com/sync"
              value={config.cloudSyncUrl}
              onChange={(e) => onUpdateConfig({ cloudSyncUrl: e.target.value })}
            />
          </ProxyField>
          <ProxyField label="API Key">
            <input
              className="proxy-textarea"
              style={{ height: 28, padding: '0 8px', flex: 1 }}
              type="password"
              value={config.cloudSyncApiKey}
              onChange={(e) => onUpdateConfig({ cloudSyncApiKey: e.target.value })}
            />
          </ProxyField>
        </>
      )}
    </div>
  )
}

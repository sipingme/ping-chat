import { describe, it, expect, beforeEach } from 'vitest'
import { pluginManager } from './pluginManager'

describe('pluginManager', () => {
  beforeEach(() => {
    pluginManager.unloadAll()
  })

  it('returns undefined when no rules match', () => {
    pluginManager.loadRules([])
    const result = pluginManager.onMessage({ sender: 'test', content: 'hi', isFromUser: false })
    expect(result).toBeUndefined()
  })

  it('replies on message contains match', () => {
    pluginManager.loadRules([{ id: '1', type: 'message', match: 'contains', pattern: 'hello', action: 'reply', value: 'world', enabled: true }])
    const result = pluginManager.onMessage({ sender: 'test', content: 'say hello', isFromUser: false })
    expect(result).toBe('world')
  })

  it('blocks on message equals match', () => {
    pluginManager.loadRules([{ id: '1', type: 'message', match: 'equals', pattern: 'stop', action: 'block', value: '', enabled: true }])
    const result = pluginManager.onMessage({ sender: 'test', content: 'stop', isFromUser: false })
    expect(result).toBe('')
  })

  it('replaces in reply using regex', () => {
    pluginManager.loadRules([{ id: '1', type: 'reply', match: 'regex', pattern: 'bad', action: 'replace', value: 'good', enabled: true }])
    const result = pluginManager.onReply('this is bad')
    expect(result).toBe('this is good')
  })

  it('ignores disabled rules', () => {
    pluginManager.loadRules([{ id: '1', type: 'message', match: 'contains', pattern: 'hi', action: 'reply', value: 'bye', enabled: false }])
    const result = pluginManager.onMessage({ sender: 'test', content: 'hi', isFromUser: false })
    expect(result).toBeUndefined()
  })
})

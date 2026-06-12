import { describe, it, expect } from 'vitest'
import { handleCommand } from './commandHandler'

describe('commandHandler', () => {
  const context = { autoReplyEnabled: true, processedCount: 5, platform: 'wechat' }

  it('ignores non-command messages', () => {
    const result = handleCommand('hello world', context)
    expect(result.handled).toBe(false)
  })

  it('handles /help command', () => {
    const result = handleCommand('/help', context)
    expect(result.handled).toBe(true)
    expect(result.reply).toContain('可用指令')
  })

  it('handles /status command', () => {
    const result = handleCommand('/status', context)
    expect(result.handled).toBe(true)
    expect(result.reply).toContain('自动回复: 开启')
    expect(result.reply).toContain('已处理: 5 条')
  })

  it('handles /ping command', () => {
    const result = handleCommand('/ping', context)
    expect(result.handled).toBe(true)
    expect(result.reply).toBe('pong!')
  })

  it('handles Chinese /帮助 command', () => {
    const result = handleCommand('/帮助', context)
    expect(result.handled).toBe(true)
    expect(result.reply).toContain('可用指令')
  })

  it('ignores unknown commands', () => {
    const result = handleCommand('/unknown', context)
    expect(result.handled).toBe(false)
  })
})

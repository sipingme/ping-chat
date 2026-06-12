export interface CommandResult {
  handled: boolean
  reply?: string
}

export function handleCommand(content: string, context: {
  autoReplyEnabled: boolean
  processedCount: number
  platform: string
}): CommandResult {
  const trimmed = content.trim()
  if (!trimmed.startsWith('/')) return { handled: false }

  const parts = trimmed.slice(1).split(/\s+/)
  const cmd = parts[0].toLowerCase()

  switch (cmd) {
    case 'help':
    case '帮助':
      return {
        handled: true,
        reply: '可用指令:\n/help - 帮助\n/status - 状态\n/ping - 测试',
      }
    case 'status':
    case '状态':
      return {
        handled: true,
        reply: `自动回复: ${context.autoReplyEnabled ? '开启' : '关闭'}\n已处理: ${context.processedCount} 条\n平台: ${context.platform}`,
      }
    case 'ping':
      return {
        handled: true,
        reply: 'pong!',
      }
    default:
      return { handled: false }
  }
}

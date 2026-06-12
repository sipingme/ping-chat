export interface PluginRule {
  id: string
  type: 'message' | 'reply'
  match: 'contains' | 'equals' | 'regex' | 'startswith'
  pattern: string
  action: 'reply' | 'replace' | 'block'
  value: string
  enabled: boolean
}

class PluginManagerClass {
  private rules: PluginRule[] = []

  loadRules(rules: PluginRule[]): boolean {
    this.rules = rules.filter((r) => r.enabled)
    return true
  }

  private matches(rule: PluginRule, text: string): boolean {
    switch (rule.match) {
      case 'contains':
        return text.includes(rule.pattern)
      case 'equals':
        return text === rule.pattern
      case 'startswith':
        return text.startsWith(rule.pattern)
      case 'regex': {
        try {
          return new RegExp(rule.pattern, 'i').test(text)
        } catch {
          return false
        }
      }
      default:
        return false
    }
  }

  onMessage(msg: { sender: string; content: string; isFromUser: boolean }): string | undefined {
    for (const rule of this.rules) {
      if (rule.type !== 'message') continue
      if (this.matches(rule, msg.content)) {
        if (rule.action === 'reply') return rule.value
        if (rule.action === 'block') return ''
      }
    }
    return undefined
  }

  onReply(reply: string): string {
    let modified = reply
    for (const rule of this.rules) {
      if (rule.type !== 'reply') continue
      if (this.matches(rule, modified)) {
        if (rule.action === 'replace') {
          try {
            modified = modified.replace(new RegExp(rule.pattern, 'g'), rule.value)
          } catch {
            // ignore invalid regex
          }
        }
      }
    }
    return modified
  }

  unloadAll(): void {
    this.rules = []
  }
}

export const pluginManager = new PluginManagerClass()

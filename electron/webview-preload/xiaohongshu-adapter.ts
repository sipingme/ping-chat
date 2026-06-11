/**
 * 小红书商家版 (Xiaohongshu Seller) adapter
 * DOM structure: vue-recycle-scroller virtual list
 */

export interface ChatMessagePayload {
  partition: string
  sender: string
  content: string
  isFromUser: boolean
  timestamp: number
}

function getText(el: Element | null, selector: string): string {
  const target = el?.querySelector(selector)
  if (!target) return ''
  // handle text nodes in <span> with comment nodes
  return Array.from(target.childNodes)
    .filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => n.textContent)
    .join('')
    .trim()
}

export const xiaohongshuAdapter = {
  name: 'xiaohongshu' as const,

  detect(): boolean {
    return window.location.hostname.includes('xiaohongshu') || window.location.hostname.includes('sxt')
  },

  extractContactFromElement(el: Element): {
    name: string
    avatarUrl: string
    lastMessage: string
    time: string
    isUnread: boolean
    isOverdue: boolean
    userId: string
    tags: string[]
  } | null {
    if (!el.classList.contains('sx-contact-item')) return null

    const name = getText(el, '.nick-name')
    if (!name) return null

    const img = el.querySelector('.item-avatar img') as HTMLImageElement | null
    const avatarUrl = img?.src || ''

    const lastMessage = getText(el, '.content')
    const time = getText(el, '.time')

    // unread badge dot
    const isUnread = el.querySelector('.d-badge-dot') !== null

    // [超时未回复] label
    const isOverdue = Array.from(el.querySelectorAll('.item-main-center .d-text'))
      .some((t) => (t.textContent || '').includes('超时未回复'))

    // user id from data-key
    const userId = (el.getAttribute('data-key') || '').replace('Active-', '')

    // lead tags like "留客资"
    const tags = Array.from(el.querySelectorAll('.leads-tag .d-tag-content'))
      .map((t) => t.textContent?.trim() || '')
      .filter(Boolean)

    return { name, avatarUrl, lastMessage, time, isUnread, isOverdue, userId, tags }
  },

  selectChat(contactName: string): boolean {
    const scroller = document.querySelector('.vue-recycle-scroller') as HTMLElement | null
    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
      const items = document.querySelectorAll('.sx-contact-item')
      for (const item of Array.from(items)) {
        const name = getText(item, '.nick-name')
        if (name === contactName) {
          ;(item as HTMLElement).click()
          console.log('[XHS] selectChat: clicked', contactName)
          return true
        }
      }
      // scroll to find more items
      if (scroller) {
        scroller.scrollTop += 200
        // wait a tick for Vue to render
        const start = Date.now()
        while (Date.now() - start < 300) { /* busy wait for render */ }
      } else {
        break
      }
      attempts++
    }
    console.log('[XHS] selectChat: not found after scroll', contactName)
    return false
  },

  extractMessages(partition: string): ChatMessagePayload[] {
    const msgs: ChatMessagePayload[] = []

    // XHS messages live inside vue-recycle-scroller; top-level message item is .im-msg-item
    const items = document.querySelectorAll('.im-msg-item')
    if (!items.length) {
      console.log('[XHS] extractMessages: no .im-msg-item found')
      return msgs
    }
    console.log('[XHS] extractMessages: found', items.length, '.im-msg-item(s)')

    items.forEach((el) => {
      if ((el as HTMLElement).offsetParent === null) return

      // Direction is determined by the inner msg div class: left = user, right = self, center = system
      const msgDiv = el.querySelector('.left, .right, .center') as HTMLElement | null
      if (!msgDiv) return

      const msgClass = msgDiv.className || ''
      if (msgClass.includes('center')) return // skip system hints

      const isFromUser = msgClass.includes('left')

      // Try to get sender name from the header row
      let sender = isFromUser ? '用户' : '我'
      const headerText = el.querySelector('[style*="margin-bottom: 4px"][style*="font-size: 12px"]')?.textContent || ''
      const nameMatch = headerText.match(/^([^\d\s][^\d]{0,20})\s+\d{4}/)
      if (nameMatch) sender = nameMatch[1].trim()

      // Text content
      const textEl = msgDiv.querySelector('.text-message') as HTMLElement | null
      let content = textEl?.innerText?.trim() || ''
      // Fallback for cards / other types
      if (!content) {
        content = msgDiv.innerText?.trim() || ''
      }
      if (!content) return

      msgs.push({
        partition,
        sender,
        content,
        isFromUser,
        timestamp: Date.now(),
      })
    })
    return msgs
  },

  extractAllMessages(partition: string): ChatMessagePayload[] {
    return this.extractMessages(partition)
  },

  async extractChatListStats(partition: string) {
    const items = document.querySelectorAll('.sx-contact-item')
    const contacts: Array<{
      name: string
      isGroup: boolean
      unread: number
      avatar: string
      lastMessage: string
      time: string
      isOverdue: boolean
      userId: string
      tags: string[]
    }> = []
    const unreadContacts: typeof contacts = []

    let totalUnread = 0

    for (const el of Array.from(items)) {
      const contact = this.extractContactFromElement(el)
      if (!contact) continue

      const unread = contact.isUnread ? 1 : 0
      const c = {
        name: contact.name,
        isGroup: false, // 小红书私信目前无群聊概念
        unread,
        avatar: contact.avatarUrl,
        lastMessage: contact.lastMessage,
        time: contact.time,
        isOverdue: contact.isOverdue,
        userId: contact.userId,
        tags: contact.tags,
      }
      contacts.push(c)
      if (unread > 0) {
        totalUnread += unread
        unreadContacts.push(c)
      }
    }

    return {
      partition,
      totalCount: contacts.length,
      groupCount: 0,
      userCount: contacts.length,
      totalUnread,
      contacts,
      unreadContacts,
    }
  },

  switchToAllSessions(): boolean {
    // 小红书商家版：点击"全部会话" tab，确保获取完整联系人列表
    const xpath = "//div[contains(text(), '全部会话')]|//span[contains(text(), '全部会话')]|//button[contains(text(), '全部会话')]"
    const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
    const node = result.singleNodeValue as HTMLElement | null
    if (node) {
      node.click()
      console.log('[XHS] switched to all sessions')
      return true
    }
    console.log('[XHS] all sessions tab not found')
    return false
  },

  sendReply(content: string, autoSend: boolean = true): boolean {
    // 小红书商家版输入框 - 优先 textarea.reply-textarea
    const inputSelectors = [
      'textarea.reply-textarea',
      '.base-reply-box textarea',
      '#replyBox textarea',
      'div[contenteditable="true"]',
      '[class*="editor"] [contenteditable]',
      '[class*="input"] [contenteditable]',
      'textarea',
    ]
    let input: HTMLElement | null = null
    for (const sel of inputSelectors) {
      const found = document.querySelector(sel) as HTMLElement | null
      if (found && (found as any).offsetParent !== null) {
        input = found
        console.log('[XHS] sendReply: found input with selector', sel)
        break
      }
    }
    if (!input) {
      console.log('[XHS] sendReply: no input found, tried:', inputSelectors)
      return false
    }

    // Set content appropriately
    if (input.tagName === 'TEXTAREA') {
      const ta = input as HTMLTextAreaElement
      ta.value = content
      ta.dispatchEvent(new Event('input', { bubbles: true }))
      ta.dispatchEvent(new Event('change', { bubbles: true }))
    } else {
      input.innerHTML = `<p>${content.replace(/\n/g, '<br>')}</p>`
      input.dispatchEvent(new InputEvent('input', { bubbles: true }))
    }

    if (!autoSend) {
      console.log('[XHS] sendReply: content filled, autoSend skipped')
      return true
    }

    // Try to find and click send button
    const sendSelectors = [
      '[class*="send"]',
      'button[class*="submit"]',
      'button:has-text("发送")',
      '[class*="btn"][class*="send"]',
    ]
    for (const sel of sendSelectors) {
      const btn = document.querySelector(sel) as HTMLElement | null
      if (btn && (btn as any).offsetParent !== null) {
        console.log('[XHS] sendReply: clicking send with selector', sel)
        btn.click()
        return true
      }
    }

    // fallback: Enter key
    console.log('[XHS] sendReply: no send button, using Enter key')
    input.focus()
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }))
    return true
  },
}

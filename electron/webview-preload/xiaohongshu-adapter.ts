/**
 * 小红书商家版 (Xiaohongshu Seller) adapter
 * DOM structure: vue-recycle-scroller virtual list
 */

import type { ChatMessagePayload } from './adapter'
import { defineAdapter } from './adapter'

export type { ChatMessagePayload } from './adapter'

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

export const xiaohongshuAdapter = defineAdapter({
  name: 'xiaohongshu' as const,

  chatItemSelector: '.sx-contact-item' as const,

  messageContainerSelector: '.vue-recycle-scroller' as const,

  onPageReady(): void {
    // 页面加载后自动切换到“全部会话”，确保获取完整联系人列表；
    // 再尝试一次，以防首次加载时 tab 还没渲染
    setTimeout(() => this.switchToAllSessions(), 3000)
    setTimeout(() => this.switchToAllSessions(), 6000)
  },

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

  async selectChat(contactName: string): Promise<boolean> {
    const scroller = document.querySelector('.vue-recycle-scroller') as HTMLElement | null
    let attempts = 0
    const maxAttempts = 10

    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

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
      if (scroller) {
        scroller.scrollTop += 200
        await wait(300)
      } else {
        break
      }
      attempts++
    }
    console.log('[XHS] selectChat: not found after scroll', contactName)
    return false
  },

  parseMessageElement(el: Element, partition: string): ChatMessagePayload | null {
    const msgDiv = el.querySelector('.left, .right, .center') as HTMLElement | null
    if (!msgDiv) return null

    const msgClass = msgDiv.className || ''
    if (msgClass.includes('center')) return null

    const isFromUser = msgClass.includes('left')

    let sender = isFromUser ? '用户' : '我'
    const headerText = el.querySelector('[style*="margin-bottom: 4px"][style*="font-size: 12px"]')?.textContent || ''
    const nameMatch = headerText.match(/^([^\d\s][^\d]{0,20})\s+\d{4}/)
    if (nameMatch) sender = nameMatch[1].trim()

    const textEl = msgDiv.querySelector('.text-message') as HTMLElement | null
    let content = textEl?.textContent?.trim() || ''
    if (!content) {
      content = msgDiv.textContent?.trim() || ''
    }
    if (!content) return null

    return {
      partition,
      sender,
      content,
      isFromUser,
      timestamp: Date.now(),
      isGroup: false,
    }
  },

  extractMessages(partition: string): ChatMessagePayload[] {
    const msgs: ChatMessagePayload[] = []
    const items = document.querySelectorAll('.im-msg-item')
    if (!items.length) {
      console.log('[XHS] extractMessages: no .im-msg-item found')
      return msgs
    }
    console.log('[XHS] extractMessages: found', items.length, '.im-msg-item(s)')

    items.forEach((el) => {
      if ((el as HTMLElement).offsetParent === null) return
      const msg = this.parseMessageElement(el, partition)
      if (msg) msgs.push(msg)
    })
    return msgs
  },

  extractMessagesFromNodes(partition: string, nodes: Node[]): ChatMessagePayload[] {
    const msgs: ChatMessagePayload[] = []
    const seen = new Set<string>()

    for (const node of nodes) {
      if (!(node instanceof HTMLElement)) continue
      const items: Element[] = []
      if (node.matches && node.matches('.im-msg-item')) {
        items.push(node)
      }
      if (node.querySelectorAll) {
        items.push(...Array.from(node.querySelectorAll('.im-msg-item')))
      }
      for (const el of items) {
        const msg = this.parseMessageElement(el, partition)
        if (msg) {
          const key = `${msg.sender}:${msg.content}`
          if (seen.has(key)) continue
          seen.add(key)
          msgs.push(msg)
        }
      }
    }

    if (msgs.length > 0) {
      console.log('[XHS] extractMessagesFromNodes: found', msgs.length, 'new msg(s) from', nodes.length, 'added node(s)')
    }
    return msgs
  },

  extractAllMessages(partition: string): ChatMessagePayload[] {
    return this.extractMessages(partition)
  },

  /**
   * Extract recent messages from the target user, starting from the newest (top)
   * and stopping when a self message is encountered.
   * The DOM is reverse chronological: top = newest.
   */
  extractRecentUserMessages(partition: string, targetUser?: string): ChatMessagePayload[] {
    const msgs: ChatMessagePayload[] = []
    const items = document.querySelectorAll('.im-msg-item')
    if (!items.length) return msgs

    for (const el of Array.from(items)) {
      const msgDiv = el.querySelector('.left, .right, .center') as HTMLElement | null
      if (!msgDiv) continue
      const msgClass = msgDiv.className || ''
      if (msgClass.includes('center')) continue

      const isFromUser = msgClass.includes('left')
      if (!isFromUser) break // stop at self message

      // Extract sender name
      const headerText = el.querySelector('[style*="margin-bottom: 4px"][style*="font-size: 12px"]')?.textContent || ''
      const nameMatch = headerText.match(/^([^\d\s][^\d]{0,20})\s+\d{4}/)
      const sender = nameMatch ? nameMatch[1].trim() : '用户'

      // If targetUser specified, only collect messages from that user
      if (targetUser && sender !== targetUser) continue

      const textEl = msgDiv.querySelector('.text-message') as HTMLElement | null
      let content = textEl?.textContent?.trim() || ''
      if (!content) {
        content = msgDiv.textContent?.trim() || ''
      }
      if (!content) continue

      msgs.push({
        partition,
        sender,
        content,
        isFromUser: true,
        timestamp: Date.now(),
      })
    }

    return msgs
  },

  async extractChatListStats(partition: string) {
    // Ensure we are on "全部会话" tab so we get the complete contact list
    this.switchToAllSessions()
    // Wait briefly for the tab switch to render
    await new Promise((r) => setTimeout(r, 500))

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
    const seenNames = new Set<string>()

    let totalUnread = 0

    for (const el of Array.from(items)) {
      // Skip elements in hidden/inactive tab panels
      if ((el as HTMLElement).offsetParent === null) continue

      const contact = this.extractContactFromElement(el)
      if (!contact) continue
      // Deduplicate by name
      if (seenNames.has(contact.name)) continue
      seenNames.add(contact.name)

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
      groups: [],
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
})

/**
 * WeChat Web IM adapter for DOM scraping
 */

export interface ChatMessagePayload {
  partition: string
  sender: string
  content: string
  isFromUser: boolean
  timestamp: number
}

const seen = new Set<string>()

export const wechatAdapter = {
  name: 'wechat' as const,

  detect(): boolean {
    return window.location.hostname.includes('wechat') || window.location.hostname.includes('web.wechat')
  },

  extractContactFromElement(el: Element): { name: string; avatarUrl: string } | null {
    const nameEl = el.querySelector('.nickname_text') as HTMLElement | null
    const name = nameEl?.textContent?.trim()
    if (!name) return null

    let avatarEl = el.querySelector('img.img, img.avatar, .avatar img, .user-avatar img') as HTMLImageElement | null
    if (!avatarEl) {
      avatarEl = el.querySelector('img') as HTMLImageElement | null
    }
    let avatarUrl = avatarEl?.getAttribute('data-src')
      || avatarEl?.getAttribute('data-original')
      || avatarEl?.getAttribute('src')
      || avatarEl?.src
      || ''

    if (avatarUrl && !avatarUrl.startsWith('http') && !avatarUrl.startsWith('//')) {
      const origin = window.location.origin
      avatarUrl = origin + (avatarUrl.startsWith('/') ? avatarUrl : '/' + avatarUrl)
    }

    return { name, avatarUrl }
  },

  selectChat(contactName: string): boolean {
    const items = document.querySelectorAll('.chat_item')
    for (const el of Array.from(items)) {
      const nameEl = el.querySelector('.nickname_text') as HTMLElement | null
      const name = nameEl?.innerText?.trim() || ''
      if (name === contactName) {
        const target = el as HTMLElement
        target.scrollIntoView({ behavior: 'auto', block: 'center' })
        target.focus()

        const rect = target.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2
        const opts = { bubbles: true, cancelable: true, clientX: cx, clientY: cy, screenX: cx, screenY: cy, detail: 1 }

        // Try Angular scope click if accessible
        try {
          const angular = (window as any).angular
          if (angular) {
            const scope = angular.element(target).scope?.()
            if (scope?.itemClick) {
              scope.itemClick(scope.chatContact || scope.chat)
              scope.$apply?.()
              return true
            }
            if (scope?.selectChat) {
              scope.selectChat(scope.chatContact || scope.chat)
              scope.$apply?.()
              return true
            }
          }
        } catch {
          // ignore
        }

        // Fallback: dispatch realistic mouse events
        const clickables = [
          el.querySelector('[ng-click]') as HTMLElement | null,
          el.querySelector('.info') as HTMLElement | null,
          el.querySelector('.chat_item') as HTMLElement | null,
          target
        ].filter(Boolean) as HTMLElement[]

        for (const clickable of clickables) {
          clickable.dispatchEvent(new MouseEvent('mousedown', opts))
          clickable.dispatchEvent(new MouseEvent('mouseup', opts))
          clickable.dispatchEvent(new MouseEvent('click', opts))
          try { (clickable as any).click() } catch {}
        }
        return true
      }
    }
    return false
  },

  parseMessageElement(el: Element, partition: string): ChatMessagePayload | null {
    if (el.classList.contains('message_system')) return null

    let text = (el.querySelector('.js_message_plain') as HTMLElement | null)?.textContent?.trim()
    if (!text) {
      text = (el.querySelector('.plain pre') as HTMLElement | null)?.textContent?.trim()
    }
    if (!text) {
      text = (el as HTMLElement).textContent?.trim()
    }
    if (!text) return null

    const avatarImg = el.querySelector('img.avatar') as HTMLImageElement | null
    const name = avatarImg?.getAttribute('title') || '对方'
    const isSelf = el.classList.contains('me')

    return {
      partition,
      sender: isSelf ? '我' : name,
      content: text,
      isFromUser: !isSelf,
      timestamp: Date.now(),
    }
  },

  extractMessages(partition: string): ChatMessagePayload[] {
    const msgs: ChatMessagePayload[] = []
    const msgEls = document.querySelectorAll('.message')
    msgEls.forEach((el) => {
      const msg = this.parseMessageElement(el, partition)
      if (msg) {
        const key = `${msg.sender}:${msg.content}`
        if (seen.has(key)) return
        seen.add(key)
        msgs.push(msg)
      }
    })
    return msgs
  },

  extractMessagesFromNodes(partition: string, nodes: Node[]): ChatMessagePayload[] {
    const msgs: ChatMessagePayload[] = []
    const localSeen = new Set<string>()

    for (const node of nodes) {
      if (!(node instanceof HTMLElement)) continue
      const items: Element[] = []
      if (node.matches && node.matches('.message')) {
        items.push(node)
      }
      if (node.querySelectorAll) {
        items.push(...Array.from(node.querySelectorAll('.message')))
      }
      for (const el of items) {
        const msg = this.parseMessageElement(el, partition)
        if (msg) {
          const key = `${msg.sender}:${msg.content}`
          if (seen.has(key)) continue
          if (localSeen.has(key)) continue
          seen.add(key)
          localSeen.add(key)
          msgs.push(msg)
        }
      }
    }

    if (msgs.length > 0) {
      console.log('[WeChat] extractMessagesFromNodes: found', msgs.length, 'new msg(s) from', nodes.length, 'added node(s)')
    }
    return msgs
  },

  extractAllMessages(partition: string): ChatMessagePayload[] {
    const msgs: ChatMessagePayload[] = []
    const msgEls = document.querySelectorAll('.message')
    msgEls.forEach((el, i) => {
      const msg = this.parseMessageElement(el, partition)
      if (msg) {
        if (i < 3) console.log('[ChatStats] msg', i, 'sender:', msg.sender, 'isSelf:', !msg.isFromUser, 'text:', msg.content.slice(0, 30))
        msgs.push(msg)
      }
    })
    console.log('[ChatStats] extractAllMessages returning', msgs.length, 'messages')
    return msgs
  },

  async extractChatListStats(partition: string) {
    const items = document.querySelectorAll('.chat_item')
    let groupCount = 0
    let totalUnread = 0
    const contacts: Array<{ name: string; isGroup: boolean; unread: number; avatar: string }> = []
    const unreadContacts: Array<{ name: string; isGroup: boolean; unread: number; avatar: string }> = []

    for (const el of Array.from(items)) {
      const username = el.getAttribute('data-username') || ''
      const isGroup = username.startsWith('@@')

      const nameEl = el.querySelector('.nickname_text') as HTMLElement | null
      const name = nameEl?.innerText?.trim() || username

      let avatarEl = el.querySelector('img.img, img.avatar, .avatar img, .user-avatar img') as HTMLImageElement | null
      if (!avatarEl) {
        avatarEl = el.querySelector('img') as HTMLImageElement | null
      }
      let avatarUrl = avatarEl?.getAttribute('src') || avatarEl?.src || ''

      if (name === '文件传输助手' || name === 'File Transfer') continue

      if (isGroup) {
        groupCount++
      }

      // Try Angular scope for unread count
      let unread = 0
      let angularFound = false
      try {
        const angular = (window as any).angular
        if (angular) {
          let scope = angular.element(el).scope?.()
          if (!scope?.chatContact) {
            const childScopeEl = el.querySelector('.ng-scope')
            if (childScopeEl) {
              scope = angular.element(childScopeEl).scope?.()
            }
          }
          if (!scope?.chatContact && scope?.$parent) {
            scope = scope.$parent
          }
          if (scope?.chatContact?.NoticeCount != null) {
            unread = Number(scope.chatContact.NoticeCount) || 0
            angularFound = true
          }
        }
      } catch (e) {
        console.error('[ChatStats] angular scope error:', name, e)
      }

      // DOM fallback: detect unread badges / red dots
      if (unread === 0) {
        const badgeNew = el.querySelector('.web_wechat_reddot_bignew, [class*="reddot_big"]')
        const badgeDot = el.querySelector('.web_wechat_reddot, [class*="reddot"]')
        if (badgeNew) {
          const text = badgeNew.textContent?.trim() || ''
          unread = text ? parseInt(text, 10) || 1 : 1
        } else if (badgeDot) {
          unread = 1
        }
      }

      if (unread > 0) {
        console.log('[ChatStats] unread:', name, unread, angularFound ? 'angular' : 'dom')
      }

      // Convert avatar URL to base64 data URL using webview session cookies
      let avatar = ''
      if (avatarUrl && !avatarUrl.startsWith('data:')) {
        try {
          const res = await fetch(avatarUrl)
          if (res.ok) {
            const blob = await res.blob()
            avatar = await new Promise<string>((resolve) => {
              const reader = new FileReader()
              reader.onloadend = () => resolve(reader.result as string)
              reader.readAsDataURL(blob)
            })
          }
        } catch (e) {
          console.log('[ChatStats] avatar fetch failed for', name, e)
        }
      } else {
        avatar = avatarUrl
      }

      contacts.push({ name, isGroup, unread, avatar })

      if (unread > 0) {
        totalUnread += unread
        unreadContacts.push({ name, isGroup, unread, avatar })
      }
    }

    return {
      partition,
      totalCount: contacts.length,
      groupCount,
      userCount: contacts.length - groupCount,
      totalUnread,
      contacts,
      unreadContacts,
    }
  },

  sendReply(content: string, autoSend: boolean = true): boolean {
    // WeChat Web specific selectors first, then generic fallbacks
    let input: HTMLElement | null = document.querySelector('#editArea[contenteditable="true"]') as HTMLElement | null
    if (!input) input = document.querySelector('.edit_area [contenteditable="true"]') as HTMLElement | null
    if (!input) {
      input = document.querySelector('textarea[placeholder*="输入"], textarea[placeholder*="message"], textarea[placeholder*="reply"], .editor textarea, .chat-input textarea, [contenteditable="true"]') as HTMLElement | null
    }

    if (!input) {
      console.log('[ChatStats] reply: no input found')
      return false
    }

    console.log('[ChatStats] reply: input found', input.tagName, input.className, input.id)

    if (input.tagName === 'TEXTAREA') {
      const ta = input as HTMLTextAreaElement
      ta.value = content
      ta.dispatchEvent(new Event('input', { bubbles: true }))
      ta.dispatchEvent(new Event('change', { bubbles: true }))
    } else if (input.isContentEditable) {
      input.focus()
      document.execCommand('selectAll', false, undefined)
      document.execCommand('insertText', false, content)
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    }

    if (!autoSend) {
      console.log('[ChatStats] reply: content filled, autoSend skipped')
      return true
    }

    setTimeout(() => {
      let sendBtn: HTMLElement | null =
        document.querySelector('a.btn_send, a[class*="send"], .btn_send, button[class*="send"], button[class*="submit"], .send-btn, [class*="send-message"]') as HTMLElement | null
      if (!sendBtn) {
        sendBtn = input?.closest('form')?.querySelector('button, a[class*="send"]') as HTMLElement | null
      }

      if (sendBtn) {
        sendBtn.click()
        console.log('[ChatStats] reply: clicked send button')
        return
      }

      // Fallback: simulate Enter key
      input!.focus()
      const keyOptions = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }
      input!.dispatchEvent(new KeyboardEvent('keydown', keyOptions))
      input!.dispatchEvent(new KeyboardEvent('keypress', keyOptions))
      input!.dispatchEvent(new KeyboardEvent('keyup', keyOptions))
      console.log('[ChatStats] reply: triggered Enter key')
    }, 300)

    return true
  },
}

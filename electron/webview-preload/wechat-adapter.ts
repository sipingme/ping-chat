/**
 * WeChat Web IM adapter for DOM scraping
 */

import type { ChatMessagePayload } from './adapter'
import { defineAdapter } from './adapter'
import { fetchAvatarBase64 } from './avatar-cache'

export type { ChatMessagePayload } from './adapter'

const processedElements = new WeakSet<Element>()

export const wechatAdapter = defineAdapter({
  name: 'wechat' as const,

  chatItemSelector: '.chat_item' as const,

  messageContainerSelector: '.chat_bd' as const,

  detect(): boolean {
    const h = window.location.hostname
    return h.includes('wechat') || h.includes('wx2.qq.com')
  },

  isLoginPage(): boolean {
    // Already logged in: chat list exists
    if (document.querySelectorAll('.chat_item').length > 0) return false
    // Login page indicators (QR code, login box, etc.)
    const loginSelectors = ['.login', '.qrcode', '.web_login', '#login_container', '.login_box', '.login-panel']
    return loginSelectors.some((sel) => !!document.querySelector(sel))
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
    const htmlEl = el as HTMLElement

    // Return cached result if this element was already parsed
    if (htmlEl.dataset.pingTs) {
      return {
        partition,
        sender: htmlEl.dataset.pingSender || '',
        content: htmlEl.dataset.pingContent || '',
        isFromUser: !el.classList.contains('me'),
        timestamp: Number(htmlEl.dataset.pingTs),
        isGroup: htmlEl.dataset.pingIsGroup === 'true',
      }
    }

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

    /* Detect group chat: three indicators, ordered by reliability */

    // 1. Message-internal: group messages render a sender nickname span
    let isGroupChat = false
    if (!isSelf) {
      const nicknameEl = el.querySelector('.nickname, .nickname_text, .group-member-name, [data-username]')
      if (nicknameEl) {
        isGroupChat = true
      }
    }

    // 2. Title bar: group chats typically show group name / member count
    if (!isGroupChat) {
      const titleEl = document.querySelector('.header .title_name, .chat_title, .title_bar .title')
      if (titleEl) {
        const titleText = titleEl.textContent || ''
        if (/群聊|群组|\([\d]+人\)/.test(titleText)) {
          isGroupChat = true
        }
      }
    }

    // 3. Sidebar active item (fallback, may be stale)
    if (!isGroupChat) {
      const activeItem = document.querySelector('.chat_item.active')
      const activeUsername = activeItem?.getAttribute('data-username') || ''
      isGroupChat = activeUsername.startsWith('@@')
    }

    const ts = Date.now()

    // Cache result on the DOM element so re-parsing yields the same payload
    htmlEl.dataset.pingTs = String(ts)
    htmlEl.dataset.pingSender = isSelf ? '我' : name
    htmlEl.dataset.pingContent = text
    htmlEl.dataset.pingIsGroup = String(isGroupChat)

    return {
      partition,
      sender: isSelf ? '我' : name,
      content: text,
      isFromUser: !isSelf,
      timestamp: ts,
      isGroup: isGroupChat,
    }
  },

  extractMessages(partition: string): ChatMessagePayload[] {
    const msgs: ChatMessagePayload[] = []
    const msgEls = document.querySelectorAll('.message')
    msgEls.forEach((el) => {
      if (processedElements.has(el)) return
      const msg = this.parseMessageElement(el, partition)
      if (msg) {
        processedElements.add(el)
        msgs.push(msg)
      }
    })
    return msgs
  },

  extractMessagesFromNodes(partition: string, nodes: Node[]): ChatMessagePayload[] {
    const msgs: ChatMessagePayload[] = []

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
        if (processedElements.has(el)) continue
        const msg = this.parseMessageElement(el, partition)
        if (msg) {
          processedElements.add(el)
          msgs.push(msg)
        }
      }
    }

    // Second defense: dedup by sender+content within 2s (WeChat may re-render into a new DOM element)
    const deduped: ChatMessagePayload[] = []
    const seen = new Map<string, number>() // sender:content -> last timestamp
    for (const msg of msgs) {
      const key = `${msg.sender}:${msg.content}`
      const lastTs = seen.get(key)
      if (lastTs && Math.abs(msg.timestamp - lastTs) < 2000) {
        console.log('%c[WeChat]', 'color: #2196f3; font-weight: bold', 'deduping re-rendered msg:', msg.sender, msg.content.slice(0, 30))
        continue
      }
      seen.set(key, msg.timestamp)
      deduped.push(msg)
    }

    if (deduped.length > 0) {
      // Infer current chat type from sidebar active item
      const activeItem = document.querySelector('.chat_item.active')
      const activeUsername = activeItem?.getAttribute('data-username') || ''
      const chatType = activeUsername.startsWith('@@') ? 'group' : activeUsername.startsWith('@') ? 'user' : 'official/other'

      const msgDetails = deduped.map((m) => {
        const dir = m.isFromUser ? 'them' : 'self'
        const type = m.isGroup ? 'group' : chatType
        return `${m.sender}[${type},${dir}]="${m.content.slice(0, 30)}"`
      }).join(' | ')
      console.log(
        '%c[WeChat]%c extractMessagesFromNodes: found %c' + deduped.length + '%c msg(s) from %c' + nodes.length + '%c node(s) → %c' + msgDetails,
        'color: #2196f3; font-weight: bold',
        'color: #888',
        'color: #4caf50; font-weight: bold',
        'color: #888',
        'color: #ff9800; font-weight: bold',
        'color: #888',
        'color: #ddd'
      )
    }
    return deduped
  },

  extractAllMessages(partition: string): ChatMessagePayload[] {
    const msgs: ChatMessagePayload[] = []
    const msgEls = document.querySelectorAll('.message')
    const seenTs = new Set<number>() // dedup by exact timestamp (DOM cache ensures same ts for same element)
    msgEls.forEach((el) => {
      const msg = this.parseMessageElement(el, partition)
      if (msg) {
        if (seenTs.has(msg.timestamp)) {
          console.log('[ChatStats] skipping re-scanned DOM element in extractAllMessages:', msg.sender, msg.content.slice(0, 30))
          return
        }
        seenTs.add(msg.timestamp)
        msgs.push(msg)
      }
    })
    msgs.forEach((msg, i) => {
      console.log('[ChatStats] msg', i, 'sender:', msg.sender, 'isSelf:', !msg.isFromUser, 'text:', msg.content.slice(0, 30))
    })
    console.log('[ChatStats] extractAllMessages returning', msgs.length, 'messages')
    return msgs
  },

  async extractChatListStats(partition: string) {
    const items = document.querySelectorAll('.chat_item')
    console.log('[ChatStats] found', items.length, 'chat items:')
    items.forEach((el, i) => {
      const username = el.getAttribute('data-username') || ''
      const nameEl = el.querySelector('.nickname_text') as HTMLElement | null
      const name = nameEl?.innerText?.trim() || username
      if (name === '文件传输助手' || name === 'File Transfer') return
      const isGroup = username.startsWith('@@')
      const isUser = username.startsWith('@') && !isGroup
      const typeLabel = isGroup ? '(group)' : isUser ? '(user)' : '(official/other)'
      const color = isGroup ? '#9c27b0' : isUser ? '#4caf50' : '#ff9800'
      console.log(`%c  [${i}]`, `color: ${color}; font-weight: bold`, name, typeLabel, 'username=' + username, 'prefix=' + username.slice(0, 2))
    })
    let groupCount = 0
    let totalUnread = 0
    const contacts: Array<{ name: string; isGroup: boolean; unread: number; avatar: string }> = []
    const unreadContacts: Array<{ name: string; isGroup: boolean; unread: number; avatar: string }> = []
    const groups: Array<{ name: string; isGroup: boolean; unread: number; avatar: string }> = []

    for (const el of Array.from(items)) {
      const username = el.getAttribute('data-username') || ''
      const isGroup = username.startsWith('@@')
      const isUser = username.startsWith('@') && !isGroup

      const nameEl = el.querySelector('.nickname_text') as HTMLElement | null
      const name = nameEl?.innerText?.trim() || username

      let avatarEl = el.querySelector('img.img, img.avatar, .avatar img, .user-avatar img') as HTMLImageElement | null
      if (!avatarEl) {
        avatarEl = el.querySelector('img') as HTMLImageElement | null
      }
      let avatarUrl = avatarEl?.getAttribute('src') || avatarEl?.src || ''

      if (name === '文件传输助手' || name === 'File Transfer') continue

      // Skip official accounts and other non-user/non-group contacts
      if (!isGroup && !isUser) {
        console.log('%c[ChatStats]', 'color: #ff9800; font-weight: bold', 'skipping non-user/non-group contact:', name, 'username=' + username, 'prefix=' + username.slice(0, 2))
        continue
      }

      if (isGroup) {
        groupCount++
        let groupAvatar = ''
        if (avatarUrl && !avatarUrl.startsWith('data:')) {
          try {
            groupAvatar = await fetchAvatarBase64(avatarUrl)
          } catch (e) {
            console.error('[ChatStats] group avatar fetch failed for', name, e)
          }
        } else {
          groupAvatar = avatarUrl
        }
        groups.push({ name, isGroup, unread: 0, avatar: groupAvatar })
        continue
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

      // Always prefer DOM badge over Angular scope (more reliable)
      // Badge is typically inside .avatar div with classes like web_wechat_reddot_middle
      let domUnread = 0

      // First search inside .avatar specifically (WeChat Web structure)
      const avatarContainer = el.querySelector('.avatar')
      if (avatarContainer) {
        const avatarBadgeSelectors = [
          '.web_wechat_reddot_bignew',
          '.web_wechat_reddot_middle',
          '.web_wechat_reddot',
          '[class*="reddot"]',
          '[class*="badge"]',
          '.dot'
        ]
        for (const selector of avatarBadgeSelectors) {
          const badges = avatarContainer.querySelectorAll(selector)
          for (const badge of badges) {
            const text = badge.textContent?.trim() || ''
            const num = text ? parseInt(text, 10) : 0
            if (num > domUnread) domUnread = num
            if (num === 0 && text === '' && (badge as HTMLElement).offsetWidth > 0) {
              if (domUnread === 0) domUnread = 1
            }
          }
        }
      }

      // Fallback: search entire chat item
      if (domUnread === 0) {
        const generalSelectors = [
          '.web_wechat_reddot_bignew',
          '.web_wechat_reddot_middle',
          '.web_wechat_reddot',
          '[class*="reddot"]',
          '[class*="badge"]',
          '.dot',
          '[class*="unread"]'
        ]
        for (const selector of generalSelectors) {
          const badges = el.querySelectorAll(selector)
          for (const badge of badges) {
            const text = badge.textContent?.trim() || ''
            const num = text ? parseInt(text, 10) : 0
            if (num > domUnread) domUnread = num
            if (num === 0 && text === '' && (badge as HTMLElement).offsetWidth > 0) {
              if (domUnread === 0) domUnread = 1
            }
          }
        }
      }

      if (domUnread > 0) {
        unread = domUnread
        angularFound = false
      } else if (unread === 0) {
        // Fallback: if Angular said 0 and DOM shows nothing, keep 0
        // If Angular said >0 and DOM shows nothing, keep Angular value
      }

      if (domUnread > 0 || unread > 0) {
        console.log('[ChatStats] unread debug:', name, 'angular=', angularFound ? 'N/A' : unread, 'dom=', domUnread, 'final=', unread)
      }

      if (unread > 0) {
        console.log('[ChatStats] unread:', name, unread, angularFound ? 'angular' : 'dom')
      }

      // Convert avatar URL to base64 (LRU-cached to avoid redundant fetches)
      let avatar = ''
      if (avatarUrl && !avatarUrl.startsWith('data:')) {
        try {
          avatar = await fetchAvatarBase64(avatarUrl)
        } catch (e) {
          console.error('[ChatStats] avatar fetch failed for', name, e)
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
      totalCount: contacts.length + groupCount,
      groupCount,
      userCount: contacts.length,
      totalUnread,
      contacts,
      unreadContacts,
      groups,
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
})

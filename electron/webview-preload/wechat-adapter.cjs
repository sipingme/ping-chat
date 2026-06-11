/**
 * WeChat Web IM adapter for DOM scraping (CommonJS)
 */

const seen = new Set()

const wechatAdapter = {
  name: 'wechat',

  detect() {
    return window.location.hostname.includes('wechat') || window.location.hostname.includes('web.wechat')
  },

  extractContactFromElement(el) {
    const nameEl = el.querySelector('.nickname_text')
    const name = nameEl?.innerText?.trim()
    if (!name) return null

    let avatarEl = el.querySelector('img.img, img.avatar, .avatar img, .user-avatar img')
    if (!avatarEl) {
      avatarEl = el.querySelector('img')
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

  selectChat(contactName) {
    const items = document.querySelectorAll('.chat_item')
    for (const el of Array.from(items)) {
      const nameEl = el.querySelector('.nickname_text')
      const name = nameEl?.innerText?.trim() || ''
      if (name === contactName) {
        const target = el
        target.scrollIntoView({ behavior: 'auto', block: 'center' })
        target.focus()

        const rect = target.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2
        const opts = { bubbles: true, cancelable: true, clientX: cx, clientY: cy, screenX: cx, screenY: cy, detail: 1 }

        // Try Angular scope click if accessible
        try {
          const angular = window.angular
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
          el.querySelector('[ng-click]'),
          el.querySelector('.info'),
          el.querySelector('.chat_item'),
          target
        ].filter(Boolean)

        for (const clickable of clickables) {
          clickable.dispatchEvent(new MouseEvent('mousedown', opts))
          clickable.dispatchEvent(new MouseEvent('mouseup', opts))
          clickable.dispatchEvent(new MouseEvent('click', opts))
          try { clickable.click() } catch {}
        }
        return true
      }
    }
    return false
  },

  extractMessages(partition) {
    const msgs = []
    const msgEls = document.querySelectorAll('.message')
    msgEls.forEach((el) => {
      let text = el.querySelector('.js_message_plain')?.innerText?.trim()
      if (!text) {
        text = el.querySelector('.plain pre')?.innerText?.trim()
      }
      if (!text) {
        text = el.innerText?.trim()
      }
      if (!text) return

      const avatarImg = el.querySelector('img.avatar')
      const name = avatarImg?.getAttribute('title') || '对方'
      const isSelf = el.classList.contains('me')

      const key = `${name}:${text}`
      if (seen.has(key)) return
      seen.add(key)

      msgs.push({
        partition,
        sender: isSelf ? '我' : name,
        content: text,
        isFromUser: !isSelf,
        timestamp: Date.now(),
      })
    })
    return msgs
  },

  extractAllMessages(partition) {
    const msgs = []
    const msgEls = document.querySelectorAll('.message')
    msgEls.forEach((el, i) => {
      if (el.classList.contains('message_system')) return

      let text = el.querySelector('.js_message_plain')?.innerText?.trim()
      if (!text) {
        text = el.querySelector('.plain pre')?.innerText?.trim()
      }
      if (!text) {
        text = el.innerText?.trim()
      }
      if (!text) {
        if (i < 3) console.log('[ChatStats] msg', i, 'no text, classes:', el.className)
        return
      }

      const avatarImg = el.querySelector('img.avatar')
      const name = avatarImg?.getAttribute('title') || '对方'
      const isSelf = el.classList.contains('me')

      if (i < 3) console.log('[ChatStats] msg', i, 'sender:', name, 'isSelf:', isSelf, 'text:', text.slice(0, 30))

      msgs.push({
        partition,
        sender: isSelf ? '我' : name,
        content: text,
        isFromUser: !isSelf,
        timestamp: Date.now(),
      })
    })
    console.log('[ChatStats] extractAllMessages returning', msgs.length, 'messages')
    return msgs
  },

  async extractChatListStats(partition) {
    const items = document.querySelectorAll('.chat_item')
    let groupCount = 0
    let totalUnread = 0
    const contacts = []
    const unreadContacts = []

    for (const el of Array.from(items)) {
      const username = el.getAttribute('data-username') || ''
      const isGroup = username.startsWith('@@')

      const nameEl = el.querySelector('.nickname_text')
      const name = nameEl?.innerText?.trim() || username

      let avatarEl = el.querySelector('img.img, img.avatar, .avatar img, .user-avatar img')
      if (!avatarEl) {
        avatarEl = el.querySelector('img')
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
        const angular = window.angular
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
            avatar = await new Promise((resolve) => {
              const reader = new FileReader()
              reader.onloadend = () => resolve(reader.result)
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

  sendReply(content) {
    // WeChat Web specific selectors first, then generic fallbacks
    let input = document.querySelector('#editArea[contenteditable="true"]')
    if (!input) input = document.querySelector('.edit_area [contenteditable="true"]')
    if (!input) {
      input = document.querySelector('textarea[placeholder*="输入"], textarea[placeholder*="message"], textarea[placeholder*="reply"], .editor textarea, .chat-input textarea, [contenteditable="true"]')
    }

    if (!input) {
      console.log('[ChatStats] reply: no input found')
      return false
    }

    console.log('[ChatStats] reply: input found', input.tagName, input.className, input.id)

    if (input.tagName === 'TEXTAREA') {
      input.value = content
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    } else if (input.isContentEditable) {
      input.focus()
      document.execCommand('selectAll', false, undefined)
      document.execCommand('insertText', false, content)
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    }

    setTimeout(() => {
      let sendBtn =
        document.querySelector('a.btn_send, a[class*="send"], .btn_send, button[class*="send"], button[class*="submit"], .send-btn, [class*="send-message"]')
      if (!sendBtn) {
        sendBtn = input?.closest('form')?.querySelector('button, a[class*="send"]')
      }

      if (sendBtn) {
        sendBtn.click()
        console.log('[ChatStats] reply: clicked send button')
        return
      }

      // Fallback: simulate Enter key
      input.focus()
      const keyOptions = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }
      input.dispatchEvent(new KeyboardEvent('keydown', keyOptions))
      input.dispatchEvent(new KeyboardEvent('keypress', keyOptions))
      input.dispatchEvent(new KeyboardEvent('keyup', keyOptions))
      console.log('[ChatStats] reply: triggered Enter key')
    }, 300)

    return true
  },
}

module.exports = { wechatAdapter }

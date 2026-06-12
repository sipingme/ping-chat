import { describe, it, expect, beforeEach, vi } from 'vitest'
import { xiaohongshuAdapter } from '../xiaohongshu-adapter'

describe('xiaohongshuAdapter', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  describe('detect', () => {
    it('detects xiaohongshu hostname', () => {
      vi.stubGlobal('location', { hostname: 'sxt.xiaohongshu.com' })
      expect(xiaohongshuAdapter.detect()).toBe(true)
      vi.unstubAllGlobals()
    })

    it('does not detect other hostnames', () => {
      vi.stubGlobal('location', { hostname: 'web.wechat.com' })
      expect(xiaohongshuAdapter.detect()).toBe(false)
      vi.unstubAllGlobals()
    })
  })

  describe('extractContactFromElement', () => {
    it('returns null for non-contact element', () => {
      const el = document.createElement('div')
      expect(xiaohongshuAdapter.extractContactFromElement(el)).toBeNull()
    })

    it('extracts contact info correctly', () => {
      const el = document.createElement('div')
      el.className = 'sx-contact-item'
      el.innerHTML = `
        <div class="nick-name">TestUser</div>
        <div class="item-avatar"><img src="https://avatar.jpg" /></div>
        <div class="content">Hello there</div>
        <div class="time">10:30</div>
        <div class="d-badge-dot"></div>
        <div class="leads-tag"><span class="d-tag-content">New</span></div>
      `
      const contact = xiaohongshuAdapter.extractContactFromElement(el)
      expect(contact).not.toBeNull()
      expect(contact!.name).toBe('TestUser')
      expect(contact!.avatarUrl.replace(/\/$/, '')).toBe('https://avatar.jpg')
      expect(contact!.lastMessage).toBe('Hello there')
      expect(contact!.time).toBe('10:30')
      expect(contact!.isUnread).toBe(true)
      expect(contact!.tags).toContain('New')
    })
  })

  describe('parseMessageElement', () => {
    it('returns null for system message', () => {
      const el = document.createElement('div')
      el.className = 'im-msg-item'
      el.innerHTML = '<div class="center">系统提示</div>'
      document.body.appendChild(el)
      expect(xiaohongshuAdapter.parseMessageElement(el, 'p1')).toBeNull()
      document.body.removeChild(el)
    })

    it('parses user message correctly', () => {
      const el = document.createElement('div')
      el.className = 'im-msg-item'
      el.innerHTML = `
        <div class="left">
          <div class="text-message">Hello world</div>
        </div>
      `
      document.body.appendChild(el)
      const msg = xiaohongshuAdapter.parseMessageElement(el, 'p1')
      document.body.removeChild(el)
      expect(msg).not.toBeNull()
      expect(msg!.sender).toBe('用户')
      expect(msg!.content).toBe('Hello world')
      expect(msg!.isFromUser).toBe(true)
      expect(msg!.partition).toBe('p1')
    })

    it('parses self message correctly', () => {
      const el = document.createElement('div')
      el.className = 'im-msg-item'
      el.innerHTML = `
        <div class="right">
          <div class="text-message">Reply text</div>
        </div>
      `
      document.body.appendChild(el)
      const msg = xiaohongshuAdapter.parseMessageElement(el, 'p1')
      document.body.removeChild(el)
      expect(msg).not.toBeNull()
      expect(msg!.sender).toBe('我')
      expect(msg!.content).toBe('Reply text')
      expect(msg!.isFromUser).toBe(false)
    })

    it('extracts sender name from header', () => {
      const el = document.createElement('div')
      el.className = 'im-msg-item'
      el.innerHTML = `
        <div style="margin-bottom: 4px; font-size: 12px;">Alice 2024-01-01</div>
        <div class="left">
          <div class="text-message">Hi</div>
        </div>
      `
      document.body.appendChild(el)
      const msg = xiaohongshuAdapter.parseMessageElement(el, 'p1')
      document.body.removeChild(el)
      expect(msg).not.toBeNull()
      expect(msg!.sender).toBe('Alice')
    })
  })

  describe('extractMessagesFromNodes', () => {
    it('extracts messages from added nodes', () => {
      const container = document.createElement('div')
      container.innerHTML = `
        <div class="im-msg-item">
          <div class="left"><div class="text-message">Msg 1</div></div>
        </div>
        <div class="im-msg-item">
          <div class="left"><div class="text-message">Msg 2</div></div>
        </div>
      `
      document.body.appendChild(container)
      const nodes: Node[] = [container]
      const msgs = xiaohongshuAdapter.extractMessagesFromNodes('p1', nodes)
      document.body.removeChild(container)
      expect(msgs.length).toBe(2)
      expect(msgs[0].content).toBe('Msg 1')
      expect(msgs[1].content).toBe('Msg 2')
    })

    it('deduplicates duplicate messages', () => {
      const el = document.createElement('div')
      el.className = 'im-msg-item'
      el.innerHTML = '<div class="left"><div class="text-message">Same</div></div>'
      document.body.appendChild(el)
      const clone = el.cloneNode(true) as HTMLElement
      document.body.appendChild(clone)
      const msgs = xiaohongshuAdapter.extractMessagesFromNodes('p1', [el, clone])
      document.body.removeChild(el)
      document.body.removeChild(clone)
      expect(msgs.length).toBe(1)
    })
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { wechatAdapter } from '../wechat-adapter'

describe('wechatAdapter', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  describe('detect', () => {
    it('detects wechat hostname', () => {
      vi.stubGlobal('location', { hostname: 'web.wechat.com' })
      expect(wechatAdapter.detect()).toBe(true)
      vi.unstubAllGlobals()
    })

    it('does not detect other hostnames', () => {
      vi.stubGlobal('location', { hostname: 'sxt.xiaohongshu.com' })
      expect(wechatAdapter.detect()).toBe(false)
      vi.unstubAllGlobals()
    })
  })

  describe('extractContactFromElement', () => {
    it('returns null when no name found', () => {
      const el = document.createElement('div')
      expect(wechatAdapter.extractContactFromElement(el)).toBeNull()
    })

    it('extracts contact with avatar', () => {
      const el = document.createElement('div')
      el.innerHTML = `
        <div class="nickname_text">TestUser</div>
        <img class="avatar" src="https://avatar.jpg" title="TestUser" />
      `
      const contact = wechatAdapter.extractContactFromElement(el)
      expect(contact).not.toBeNull()
      expect(contact!.name).toBe('TestUser')
      expect(contact!.avatarUrl).toBe('https://avatar.jpg')
    })

    it('extracts contact without explicit avatar', () => {
      const el = document.createElement('div')
      el.innerHTML = `
        <div class="nickname_text">NoAvatarUser</div>
      `
      const contact = wechatAdapter.extractContactFromElement(el)
      expect(contact).not.toBeNull()
      expect(contact!.name).toBe('NoAvatarUser')
      expect(contact!.avatarUrl).toBe('')
    })
  })

  describe('parseMessageElement', () => {
    it('returns null for system message', () => {
      const el = document.createElement('div')
      el.className = 'message message_system'
      document.body.appendChild(el)
      expect(wechatAdapter.parseMessageElement(el, 'p1')).toBeNull()
      document.body.removeChild(el)
    })

    it('parses user message with js_message_plain', () => {
      const el = document.createElement('div')
      el.className = 'message'
      el.innerHTML = `
        <img class="avatar" title="Alice" />
        <div class="js_message_plain">Hello world</div>
      `
      document.body.appendChild(el)
      const msg = wechatAdapter.parseMessageElement(el, 'p1')
      document.body.removeChild(el)
      expect(msg).not.toBeNull()
      expect(msg!.sender).toBe('Alice')
      expect(msg!.content).toBe('Hello world')
      expect(msg!.isFromUser).toBe(true)
      expect(msg!.partition).toBe('p1')
    })

    it('parses self message', () => {
      const el = document.createElement('div')
      el.className = 'message me'
      el.innerHTML = `
        <img class="avatar" title="我" />
        <div class="js_message_plain">My reply</div>
      `
      document.body.appendChild(el)
      const msg = wechatAdapter.parseMessageElement(el, 'p1')
      document.body.removeChild(el)
      expect(msg).not.toBeNull()
      expect(msg!.sender).toBe('我')
      expect(msg!.isFromUser).toBe(false)
    })

    it('falls back to plain pre selector', () => {
      const el = document.createElement('div')
      el.className = 'message'
      el.innerHTML = `
        <img class="avatar" title="Bob" />
        <div class="plain"><pre>Code block</pre></div>
      `
      document.body.appendChild(el)
      const msg = wechatAdapter.parseMessageElement(el, 'p1')
      document.body.removeChild(el)
      expect(msg).not.toBeNull()
      expect(msg!.content).toBe('Code block')
    })
  })

  describe('extractMessagesFromNodes', () => {
    it('extracts messages from added nodes', () => {
      const container = document.createElement('div')
      container.innerHTML = `
        <div class="message"><img class="avatar" title="A" /><div class="js_message_plain">M1</div></div>
        <div class="message"><img class="avatar" title="B" /><div class="js_message_plain">M2</div></div>
      `
      document.body.appendChild(container)
      const nodes: Node[] = [container]
      const msgs = wechatAdapter.extractMessagesFromNodes('p1', nodes)
      document.body.removeChild(container)
      expect(msgs.length).toBe(2)
      expect(msgs[0].content).toBe('M1')
      expect(msgs[1].content).toBe('M2')
    })

    it('deduplicates using global seen set', () => {
      const el = document.createElement('div')
      el.className = 'message'
      el.innerHTML = '<img class="avatar" title="A" /><div class="js_message_plain">Dup</div>'
      document.body.appendChild(el)
      const clone = el.cloneNode(true) as HTMLElement
      document.body.appendChild(clone)
      const msgs = wechatAdapter.extractMessagesFromNodes('p1', [el, clone])
      document.body.removeChild(el)
      document.body.removeChild(clone)
      expect(msgs.length).toBe(1)
    })
  })
})

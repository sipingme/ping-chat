/**
 * 小红书商家版 (Xiaohongshu Seller) adapter stub
 * TODO: implement actual DOM selectors after inspecting sxt.xiaohongshu.com/im
 */

export interface ChatMessagePayload {
  partition: string
  sender: string
  content: string
  isFromUser: boolean
  timestamp: number
}

export const xiaohongshuAdapter = {
  name: 'xiaohongshu' as const,

  detect(): boolean {
    return window.location.hostname.includes('xiaohongshu') || window.location.hostname.includes('sxt')
  },

  extractContactFromElement(_el: Element): { name: string; avatarUrl: string } | null {
    console.log('[XHS] extractContactFromElement not implemented')
    return null
  },

  selectChat(_contactName: string): boolean {
    console.log('[XHS] selectChat not implemented')
    return false
  },

  extractMessages(_partition: string): ChatMessagePayload[] {
    console.log('[XHS] extractMessages not implemented')
    return []
  },

  extractAllMessages(_partition: string): ChatMessagePayload[] {
    console.log('[XHS] extractAllMessages not implemented')
    return []
  },

  async extractChatListStats(_partition: string) {
    console.log('[XHS] extractChatListStats not implemented')
    return {
      partition: _partition,
      totalCount: 0,
      groupCount: 0,
      userCount: 0,
      totalUnread: 0,
      contacts: [] as Array<{ name: string; isGroup: boolean; unread: number; avatar: string }>,
      unreadContacts: [] as Array<{ name: string; isGroup: boolean; unread: number; avatar: string }>,
    }
  },

  sendReply(_content: string): boolean {
    console.log('[XHS] sendReply not implemented')
    return false
  },
}

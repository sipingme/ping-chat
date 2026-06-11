/**
 * 小红书商家版 (Xiaohongshu Seller) adapter stub (CommonJS)
 */

const xiaohongshuAdapter = {
  name: 'xiaohongshu',

  detect() {
    return window.location.hostname.includes('xiaohongshu') || window.location.hostname.includes('sxt')
  },

  extractContactFromElement(_el) {
    console.log('[XHS] extractContactFromElement not implemented')
    return null
  },

  selectChat(_contactName) {
    console.log('[XHS] selectChat not implemented')
    return false
  },

  extractMessages(_partition) {
    console.log('[XHS] extractMessages not implemented')
    return []
  },

  extractAllMessages(_partition) {
    console.log('[XHS] extractAllMessages not implemented')
    return []
  },

  async extractChatListStats(_partition) {
    console.log('[XHS] extractChatListStats not implemented')
    return {
      partition: _partition,
      totalCount: 0,
      groupCount: 0,
      userCount: 0,
      totalUnread: 0,
      contacts: [],
      unreadContacts: [],
    }
  },

  sendReply(_content) {
    console.log('[XHS] sendReply not implemented')
    return false
  },
}

module.exports = { xiaohongshuAdapter }

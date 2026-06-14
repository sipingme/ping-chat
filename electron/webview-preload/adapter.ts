/**
 * 平台适配器统一接口
 * 新增平台时实现此接口，并在 index.ts 的 adapters 数组中注册即可。
 */

export interface ChatMessagePayload {
  partition: string
  sender: string
  content: string
  isFromUser: boolean
  timestamp: number
  isGroup?: boolean
}

export interface ChatContact {
  name: string
  isGroup: boolean
  unread: number
  avatar: string
}

export interface ChatStats {
  partition: string
  totalCount: number
  groupCount: number
  userCount: number
  totalUnread: number
  contacts: ChatContact[]
  unreadContacts: ChatContact[]
  groups: ChatContact[]
}

export interface PlatformAdapter {
  /** 平台 id，与平台注册表中的 id 一致 */
  readonly name: string
  /** 聊天列表项的 CSS 选择器（用于点击事件归属判断） */
  readonly chatItemSelector: string
  /** 聊天消息容器的 CSS 选择器（用于 MutationObserver 精确监听，缩小范围提升性能） */
  readonly messageContainerSelector: string
  /** 根据当前页面 hostname 判断是否匹配本平台 */
  detect(): boolean
  /** 从聊天列表项 DOM 元素中提取联系人信息 */
  extractContactFromElement(el: Element): { name: string; avatarUrl: string; lastMessage?: string; time?: string; isUnread?: boolean; isOverdue?: boolean; userId?: string; tags?: string[] } | null
  /** 按联系人名称选中会话 */
  selectChat(contactName: string): boolean | Promise<boolean>
  /** 提取当前会话的新消息 */
  extractMessages(partition: string): ChatMessagePayload[]
  /** 提取当前会话的全部消息（用于回复工作台） */
  extractAllMessages(partition: string): ChatMessagePayload[]
  /** 抓取聊天列表统计（联系人、未读数等） */
  extractChatListStats(partition: string): Promise<ChatStats | null>
  /** 向输入框写入回复，autoSend 为 true 时自动发送 */
  sendReply(content: string, autoSend?: boolean): boolean
  /** 可选：从 MutationObserver 新增节点中增量提取消息 */
  extractMessagesFromNodes?(partition: string, nodes: Node[]): ChatMessagePayload[]
  /** 可选：页面就绪后的平台初始化钩子（如切换 tab） */
  onPageReady?(): void
}

/**
 * 适配器工厂：编译期校验是否实现 PlatformAdapter 接口，
 * 同时保留适配器自身的额外内部方法类型（如 parseMessageElement）。
 */
export function defineAdapter<T extends PlatformAdapter>(adapter: T): T {
  return adapter
}

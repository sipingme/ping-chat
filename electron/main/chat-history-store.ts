import Store from 'electron-store'
import type { ChatMessagePayload } from '../webview-preload/xiaohongshu-adapter'

interface ChatHistoryEntry {
  partition: string
  sender: string
  content: string
  isFromUser: boolean
  timestamp: number
}

interface HistoryStore {
  [partition: string]: ChatHistoryEntry[]
}

const store = new Store<HistoryStore>({
  name: 'chat-history',
  clearInvalidConfig: true,
})

const MAX_MESSAGES_PER_PARTITION = 2000

export function appendChatMessage(partition: string, message: ChatHistoryEntry): void {
  const key = `history.${partition}`
  const history: ChatHistoryEntry[] = (store.get(key) as ChatHistoryEntry[]) || []
  history.push(message)
  if (history.length > MAX_MESSAGES_PER_PARTITION) {
    history.splice(0, history.length - MAX_MESSAGES_PER_PARTITION)
  }
  store.set(key, history)
}

export function getChatHistory(partition: string, limit = 100): ChatHistoryEntry[] {
  const key = `history.${partition}`
  const history: ChatHistoryEntry[] = (store.get(key) as ChatHistoryEntry[]) || []
  return history.slice(-limit)
}

export function clearChatHistory(partition: string): void {
  const key = `history.${partition}`
  store.delete(key as any)
}

export function getAllPartitions(): string[] {
  const keys = Object.keys(store.store)
  return keys.map((k) => k.replace(/^history\./, ''))
}

export function searchChatHistory(
  partition: string,
  options: { keyword?: string; sender?: string; startTime?: number; endTime?: number; limit?: number }
): ChatHistoryEntry[] {
  const key = `history.${partition}`
  let history: ChatHistoryEntry[] = (store.get(key) as ChatHistoryEntry[]) || []
  if (options.keyword) {
    history = history.filter((m) => m.content.includes(options.keyword!))
  }
  if (options.sender) {
    history = history.filter((m) => m.sender.includes(options.sender!))
  }
  if (options.startTime) {
    history = history.filter((m) => m.timestamp >= options.startTime!)
  }
  if (options.endTime) {
    history = history.filter((m) => m.timestamp <= options.endTime!)
  }
  const limit = options.limit ?? 100
  return history.slice(-limit)
}

export function exportChatHistory(partition: string, format: 'json' | 'csv'): string {
  const key = `history.${partition}`
  const history: ChatHistoryEntry[] = (store.get(key) as ChatHistoryEntry[]) || []
  if (format === 'csv') {
    const header = 'timestamp,sender,content,isFromUser\n'
    const rows = history.map((m) => `${new Date(m.timestamp).toISOString()},"${m.sender}","${m.content.replace(/"/g, '""')}",${m.isFromUser}`).join('\n')
    return header + rows
  }
  return JSON.stringify(history, null, 2)
}

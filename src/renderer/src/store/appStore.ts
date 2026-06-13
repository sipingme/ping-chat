import { create } from 'zustand'
import type { ChatSession, ChatMessage } from '../types'

const MAX_MESSAGES_PER_PARTITION = 500

export interface ChatStats {
  partition: string
  totalCount: number
  groupCount: number
  userCount: number
  totalUnread: number
  contacts: Array<{ name: string; isGroup: boolean; unread: number; avatar: string }>
  unreadContacts: Array<{ name: string; isGroup: boolean; unread: number; avatar: string }>
}

interface AppState {
  sessions: ChatSession[]
  activeSessionId: string
  activePlatformId: string
  loaded: boolean
  monitoringEnabled: boolean
  chatStatsMap: Record<string, ChatStats>
  chatMessagesMap: Record<string, ChatMessage[]>
  autoReplyGlobalGenerating: boolean
  autoReplyGlobalError: string | null

  setSessions: (updater: ChatSession[] | ((prev: ChatSession[]) => ChatSession[])) => void
  setActiveSessionId: (id: string) => void
  setActivePlatformId: (id: string) => void
  setLoaded: (v: boolean) => void
  setMonitoringEnabled: (v: boolean) => void
  setChatStats: (partition: string, stats: ChatStats) => void
  getChatStats: (partition: string) => ChatStats | undefined
  appendChatMessage: (partition: string, message: ChatMessage) => void
  getChatMessages: (partition: string) => ChatMessage[]
  clearChatMessages: () => void
  setAutoReplyGlobalGenerating: (v: boolean) => void
  setAutoReplyGlobalError: (v: string | null) => void
  createSession: (session: ChatSession) => void
  closeSession: (id: string) => void
  updateSession: (id: string, updater: (s: ChatSession) => ChatSession) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  sessions: [],
  activeSessionId: '',
  activePlatformId: 'xiaohongshu',
  loaded: false,
  monitoringEnabled: false,
  chatStatsMap: {},
  chatMessagesMap: {},
  autoReplyGlobalGenerating: false,
  autoReplyGlobalError: null,

  setSessions: (updater) =>
    set((state) => ({
      sessions: typeof updater === 'function' ? updater(state.sessions) : updater,
    })),

  setActiveSessionId: (id) => set({ activeSessionId: id }),
  setActivePlatformId: (id) => set({ activePlatformId: id }),
  setLoaded: (v) => set({ loaded: v }),
  setMonitoringEnabled: (v) => set({ monitoringEnabled: v }),

  setChatStats: (partition, stats) =>
    set((state) => ({
      chatStatsMap: { ...state.chatStatsMap, [partition]: stats },
    })),

  getChatStats: (partition) => get().chatStatsMap[partition],

  appendChatMessage: (partition, message) =>
    set((state) => {
      const prev = state.chatMessagesMap[partition] ?? []
      const next = [...prev, message]
      if (next.length > MAX_MESSAGES_PER_PARTITION) {
        next.splice(0, next.length - MAX_MESSAGES_PER_PARTITION)
      }
      return {
        chatMessagesMap: { ...state.chatMessagesMap, [partition]: next },
      }
    }),

  getChatMessages: (partition) => get().chatMessagesMap[partition] ?? [],

  clearChatMessages: () => set({ chatMessagesMap: {} }),

  setAutoReplyGlobalGenerating: (v) => set({ autoReplyGlobalGenerating: v }),
  setAutoReplyGlobalError: (v) => set({ autoReplyGlobalError: v }),

  createSession: (session) =>
    set((state) => ({
      sessions: [session, ...state.sessions],
      activeSessionId: session.id,
    })),

  closeSession: (id) =>
    set((state) => {
      const next = state.sessions.filter((s) => s.id !== id)
      const nextActive =
        state.activeSessionId === id
          ? next.find((s) => s.platformId === state.activePlatformId)?.id ?? ''
          : state.activeSessionId
      return { sessions: next, activeSessionId: nextActive }
    }),

  updateSession: (id, updater) =>
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === id ? updater(s) : s)),
    })),
}))

import { create } from 'zustand'
import type { ChatMessage, ChatSession, Platform, ProxyConfig } from '../types'

interface AppState {
  // Sessions
  sessions: ChatSession[]
  activePlatformId: string
  activeSessionId: string
  setSessions: (sessions: ChatSession[]) => void
  setActivePlatformId: (id: string) => void
  setActiveSessionId: (id: string) => void
  createSession: (platformId: string, name: string, proxy: ProxyConfig) => ChatSession
  deleteSession: (id: string) => void

  // Messages
  autoReplyMessages: ChatMessage[]
  addAutoReplyMessage: (msg: ChatMessage) => void
  clearAutoReplyMessages: () => void

  // UI
  loaded: boolean
  setLoaded: (v: boolean) => void
  activeRightTool: string
  setActiveRightTool: (tool: string) => void

  // Stats
  chatStats: { partition: string; totalCount: number; groupCount: number; userCount: number; totalUnread: number; contacts: Array<{ name: string; isGroup: boolean; unread: number; avatar: string }>; unreadContacts: Array<{ name: string; isGroup: boolean; unread: number; avatar: string }> } | null
  setChatStats: (stats: AppState['chatStats']) => void

  // Recalls
  recalledMessages: Array<{ partition: string; sender: string; content: string; originalContent: string; timestamp: number }>
  addRecalledMessage: (msg: AppState['recalledMessages'][0]) => void

  // Reply logs
  recentReplyLogs: Array<{ id: string; type: string; content: string; contact: string }>
  addReplyLog: (log: AppState['recentReplyLogs'][0]) => void
  replyFeedbackMap: Record<string, 'up' | 'down'>
  setReplyFeedback: (id: string, feedback: 'up' | 'down') => void
}

export const useAppStore = create<AppState>((set, get) => ({
  sessions: [],
  activePlatformId: 'xiaohongshu',
  activeSessionId: '',
  setSessions: (sessions) => set({ sessions }),
  setActivePlatformId: (id) => set({ activePlatformId: id }),
  setActiveSessionId: (id) => set({ activeSessionId: id }),
  createSession: (platformId, name, proxy) => {
    const id = `${platformId}-${Date.now()}`
    const partition = `persist:${id}`
    const newSession: ChatSession = {
      id,
      platformId,
      name,
      status: 'login',
      partition,
      fingerprint: {} as any,
      proxy,
    }
    set((state) => ({ sessions: [...state.sessions, newSession] }))
    return newSession
  },
  deleteSession: (id) => {
    set((state) => {
      const next = state.sessions.filter((s) => s.id !== id)
      const nextActive = next[0]?.id || ''
      return { sessions: next, activeSessionId: nextActive }
    })
  },

  autoReplyMessages: [],
  addAutoReplyMessage: (msg) => set((state) => ({ autoReplyMessages: [...state.autoReplyMessages, msg] })),
  clearAutoReplyMessages: () => set({ autoReplyMessages: [] }),

  loaded: false,
  setLoaded: (v) => set({ loaded: v }),
  activeRightTool: '',
  setActiveRightTool: (tool) => set({ activeRightTool: tool }),

  chatStats: null,
  setChatStats: (stats) => set({ chatStats: stats }),

  recalledMessages: [],
  addRecalledMessage: (msg) => set((state) => ({ recalledMessages: [msg, ...state.recalledMessages.slice(0, 49)] })),

  recentReplyLogs: [],
  addReplyLog: (log) => set((state) => ({ recentReplyLogs: [log, ...state.recentReplyLogs.slice(0, 19)] })),
  replyFeedbackMap: {},
  setReplyFeedback: (id, feedback) => set((state) => ({ replyFeedbackMap: { ...state.replyFeedbackMap, [id]: feedback } })),
}))

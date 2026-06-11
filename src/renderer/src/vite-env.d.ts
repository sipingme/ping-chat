/// <reference types="vite/client" />

interface Window {
  pingChat: {
    minimize: () => Promise<void>
    maximize: () => Promise<void>
    close: () => Promise<void>
    webviewPreloadPath: string
    setFingerprint: (partition: string, config: any) => Promise<boolean>
    getFingerprint: (partition: string) => Promise<any>
    setProxy: (partition: string, config: any) => Promise<boolean>
    checkProxy: (config: any) => Promise<{ ok: boolean; ip?: string; latency?: number; error?: string }>
    setCookies: (partition: string, cookieText: string) => Promise<boolean>
    loadSessions: () => Promise<any[]>
    saveSessions: (sessions: any[]) => Promise<boolean>
    sendReply: (partition: string, content: string) => Promise<boolean>
    selectChat: (partition: string, contactName: string) => Promise<boolean>
    setMonitorEnabled: (partition: string, enabled: boolean) => Promise<boolean>
    onChatMessage: (
      callback: (payload: { partition: string; sender: string; content: string; isFromUser: boolean; timestamp: number }) => void
    ) => () => void
    onChatStats: (
      callback: (payload: { partition: string; totalCount: number; groupCount: number; userCount: number; totalUnread: number; contacts: Array<{ name: string; isGroup: boolean; unread: number; avatar: string }>; unreadContacts: Array<{ name: string; isGroup: boolean; unread: number; avatar: string }> }) => void
    ) => () => void
    onContactClicked: (
      callback: (payload: { partition: string; name: string; avatar?: string }) => void
    ) => () => void
    onChatHistory: (
      callback: (payload: { partition: string; history: Array<{ sender: string; content: string; isFromUser: boolean; timestamp: number }> }) => void
    ) => () => void
  }
}

declare namespace JSX {
  interface IntrinsicElements {
    webview: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      src?: string
      partition?: string
      allowpopups?: string
      preload?: string
    }
  }
}

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
    saveCookies: (partition: string) => Promise<{ ok: boolean; count?: number; error?: string }>
    loadCookies: (partition: string) => Promise<{ ok: boolean; count?: number; error?: string }>
    loadSessions: () => Promise<any[]>
    saveSessions: (sessions: any[]) => Promise<boolean>
    getConfig: (key: string) => Promise<any>
    setConfig: (key: string, value: any) => Promise<boolean>
    getAllConfig: () => Promise<Record<string, any>>
    logReply: (entry: any) => Promise<any>
    getReplyLogs: (options?: any) => Promise<any[]>
    getReplyStats: () => Promise<any>
    setReplyFeedback: (id: string, feedback: 'up' | 'down') => Promise<boolean>
    exportConfig: () => Promise<{ ok: boolean; path?: string; error?: string }>
    importConfig: () => Promise<{ ok: boolean; error?: string }>
    getAppVersion: () => Promise<string>
    checkForUpdate: () => Promise<any>
    downloadUpdate: () => Promise<any>
    installUpdate: () => Promise<boolean>
    onUpdateEvent: (event: 'update:checking' | 'update:available' | 'update:not-available' | 'update:progress' | 'update:downloaded' | 'update:error', callback: (data: any) => void) => () => void
    onShortcut: (event: 'shortcut:toggle-auto-reply' | 'shortcut:new-session', callback: () => void) => () => void
    sendReply: (partition: string, content: string, autoSend?: boolean) => Promise<boolean>
    selectChat: (partition: string, contactName: string) => Promise<boolean>
    setMonitorEnabled: (partition: string, enabled: boolean) => Promise<boolean>
    getChatHistory: (partition: string, limit?: number) => Promise<Array<{ partition: string; sender: string; content: string; isFromUser: boolean; timestamp: number }>>
    clearChatHistory: (partition: string) => Promise<boolean>
    searchChatHistory: (partition: string, options: { keyword?: string; sender?: string; startTime?: number; endTime?: number; limit?: number }) => Promise<Array<{ partition: string; sender: string; content: string; isFromUser: boolean; timestamp: number }>>
    exportChatHistory: (partition: string, format: 'json' | 'csv') => Promise<string>
    setWebhook: (url: string, enabled: boolean) => Promise<boolean>
    getWebhook: () => Promise<{ url: string; enabled: boolean }>
    addScheduledMessage: (partition: string, content: string, delayMs: number, autoSend?: boolean) => Promise<string>
    cancelScheduledMessage: (id: string) => Promise<boolean>
    listScheduledMessages: (partition?: string) => Promise<Array<{ id: string; partition: string; content: string; executeAt: number; autoSend: boolean; cancelled: boolean }>>
    saveCredential: (key: string, value: string) => Promise<boolean>
    loadCredential: (key: string) => Promise<string | null>
    deleteCredential: (key: string) => Promise<boolean>
    setSensitiveWords: (words: string[]) => Promise<boolean>
    checkSensitiveWords: (text: string) => Promise<{ blocked: boolean; word?: string }>
    setCloudSync: (url: string, apiKey: string, enabled: boolean) => Promise<boolean>
    onScheduledSend: (callback: (payload: { partition: string; content: string; autoSend: boolean }) => void) => () => void
    onChatMessage: (
      callback: (payload: { partition: string; sender: string; content: string; isFromUser: boolean; timestamp: number }) => void
    ) => () => void
    onChatStats: (
      callback: (payload: { partition: string; totalCount: number; groupCount: number; userCount: number; totalUnread: number; contacts: Array<{ name: string; isGroup: boolean; unread: number; avatar: string }>; unreadContacts: Array<{ name: string; isGroup: boolean; unread: number; avatar: string }> }) => void
    ) => () => void
    onChatRecall: (callback: (payload: { partition: string; sender: string; content: string; originalContent: string; timestamp: number }) => void) => () => void
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

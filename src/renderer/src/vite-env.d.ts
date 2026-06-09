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

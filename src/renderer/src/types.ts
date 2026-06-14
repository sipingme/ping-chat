export type Platform = {
  id: string
  name: string
  shortName: string
  icon: JSX.Element
  accent: string
}

export type FingerprintSettings = {
  browserVersion: string
  os: string
  userAgent: string
  geolocation: string
  resolution: string
  webrtc: string
  canvas: boolean
  audioContext: boolean
  hardwareConcurrency: string
  deviceMemory: string
  timezone: string
  hideWebdriver: boolean
  enableChromeObj: boolean
  fakePlugins: boolean
  fakeOuterSize: boolean
}

export type ChatMessage = {
  partition: string
  sender: string
  content: string
  isFromUser: boolean
  timestamp: number
  isGroup?: boolean
  /** True when scraped during chat switch / initial load — do not trigger auto-reply */
  historical?: boolean
}

export type ProxyConfig = {
  protocol: 'no-proxy' | 'http' | 'https' | 'socks5'
  host: string
  port: string
  username: string
  password: string
}

export type ChatSession = {
  id: string
  platformId: string
  name: string
  status: 'login' | 'online'
  partition: string
  fingerprint: FingerprintSettings
  proxy: ProxyConfig
}

export type AutoReplyConfig = {
  apiKey: string
  endpoint: string
  model: string
  systemPrompt: string
  tone: string
  length: string
  salutation: string
  allowEmoji: boolean
  templates: Array<{ title: string; content: string }>
  delaySeconds: number
  role: string
  blacklist: string[]
  keywords: string[]
  keywordResponse: string
  groupWhitelist: string[]
  groupBlacklist: string[]
  mentionOnly: boolean
  myNickname: string
  sensitiveWords: string[]
  enableTranslation: boolean
  targetLanguage: string
  enableCommands: boolean
  enablePlugins: boolean
  pluginRules: Array<{ id: string; type: 'message' | 'reply'; match: 'contains' | 'equals' | 'regex' | 'startswith'; pattern: string; action: 'reply' | 'replace' | 'block'; value: string; enabled: boolean }>
  enableFriendRequestAutoAccept: boolean
  friendRequestWelcomeMessage: string
  enableCloudSync: boolean
  cloudSyncUrl: string
  cloudSyncApiKey: string
  temperature: number
  maxTokens: number
  contextRounds: number
  topP: number
  frequencyPenalty: number
  presencePenalty: number
  autoSend: boolean
}

export type ChatStats = {
  partition: string
  totalCount: number
  groupCount: number
  userCount: number
  totalUnread: number
  contacts: Array<{ name: string; isGroup: boolean; unread: number; avatar: string }>
  unreadContacts: Array<{ name: string; isGroup: boolean; unread: number; avatar: string }>
  groups: Array<{ name: string; isGroup: boolean; unread: number; avatar: string }>
}

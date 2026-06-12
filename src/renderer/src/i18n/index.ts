export type Locale = 'zh' | 'en'

const translations: Record<Locale, Record<string, string>> = {
  zh: {
    appName: 'Ping Chat',
    platform_xiaohongshu: '小红书',
    platform_wechat: '微信',
    autoReply: '自动回复',
    quickReply: '快捷回复',
    monitor: '监控面板',
    settings: '设置',
    modelSettings: '大模型设置',
    online: '在线',
    offline: '离线',
    newSession: '新建会话',
    refresh: '刷新',
    close: '关闭',
    send: '发送',
    cancel: '取消',
    generating: '生成中…',
    feedback: '回复质量反馈',
    toggleAutoReply: '切换自动回复',
    theme: '主题',
    themeDark: '暗色',
    themeLight: '亮色',
    themeSystem: '跟随系统',
    performance: '性能监控',
    memory: '内存',
    sessions: '会话',
    status_online: '在线',
    status_login: '登录',
    all: '全部',
  },
  en: {
    appName: 'Ping Chat',
    platform_xiaohongshu: 'Xiaohongshu',
    platform_wechat: 'WeChat',
    autoReply: 'Auto Reply',
    quickReply: 'Quick Reply',
    monitor: 'Monitor',
    settings: 'Settings',
    modelSettings: 'Model Settings',
    online: 'Online',
    offline: 'Offline',
    newSession: 'New Session',
    refresh: 'Refresh',
    close: 'Close',
    send: 'Send',
    cancel: 'Cancel',
    generating: 'Generating…',
    feedback: 'Reply Feedback',
    toggleAutoReply: 'Toggle Auto Reply',
    theme: 'Theme',
    themeDark: 'Dark',
    themeLight: 'Light',
    themeSystem: 'System',
    performance: 'Performance',
    memory: 'Memory',
    sessions: 'Sessions',
    status_online: 'Online',
    status_login: 'Login',
    all: 'All',
  },
}

let currentLocale: Locale = 'zh'

export function setLocale(locale: Locale): void {
  currentLocale = locale
  localStorage.setItem('ping-chat-locale', locale)
  window.dispatchEvent(new Event('locale-change'))
}

export function getLocale(): Locale {
  return currentLocale
}

export function initLocale(): void {
  const saved = localStorage.getItem('ping-chat-locale') as Locale | null
  if (saved && saved in translations) {
    currentLocale = saved
  }
}

export function t(key: string): string {
  return translations[currentLocale][key] ?? translations['en'][key] ?? key
}

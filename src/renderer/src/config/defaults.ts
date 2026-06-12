import type { Platform, FingerprintSettings, AutoReplyConfig } from '../types'

export const WECHAT_WEB_URL = 'https://web.wechat.com/'
export const XIAOHONGSHU_WEB_URL = 'https://sxt.xiaohongshu.com/im/login'

export const BROWSER_VERSIONS = [
  'Chrome 135', 'Chrome 134', 'Chrome 133', 'Chrome 132', 'Chrome 131', 'Chrome 130',
  'Chrome 129', 'Chrome 128', 'Chrome 127', 'Chrome 126', 'Chrome 125', 'Chrome 124',
  'Chrome 123', 'Chrome 122', 'Chrome 121', 'Chrome 120',
  'Firefox 135', 'Firefox 134', 'Firefox 133', 'Firefox 132', 'Firefox 131', 'Firefox 130',
  'Firefox 129', 'Firefox 128', 'Firefox 127', 'Firefox 126', 'Firefox 125', 'Firefox 124',
  'Safari 18.3', 'Safari 18.2', 'Safari 18.1', 'Safari 18.0',
  'Safari 17.6', 'Safari 17.5', 'Safari 17.4', 'Safari 17.3', 'Safari 17.2', 'Safari 17.1', 'Safari 17.0', 'Safari 16.6',
  'Edge 135', 'Edge 134', 'Edge 133', 'Edge 132', 'Edge 131', 'Edge 130',
  'Edge 129', 'Edge 128', 'Edge 127', 'Edge 126', 'Edge 125', 'Edge 124',
  'Edge 123', 'Edge 122', 'Edge 121', 'Edge 120',
]

export const timezoneOptions = ['跟随系统', 'Asia/Shanghai', 'Asia/Tokyo', 'America/New_York', 'Europe/London', 'UTC']

export function getUserAgentForVersion(os: string, version: string): string {
  const [type, verStr] = version.split(' ')
  const ver = verStr ?? ''

  if (type === 'Firefox') {
    if (os === 'MacOS') {
      return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:${ver}.0) Gecko/20100101 Firefox/${ver}.0`
    }
    return `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${ver}.0) Gecko/20100101 Firefox/${ver}.0`
  }

  if (type === 'Safari') {
    if (os === 'MacOS') {
      return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${ver} Safari/605.1.15`
    }
    return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${ver} Safari/605.1.15`
  }

  if (type === 'Edge') {
    if (os === 'MacOS') {
      return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ver}.0.0.0 Safari/537.36 Edg/${ver}.0.0.0`
    }
    return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ver}.0.0.0 Safari/537.36 Edg/${ver}.0.0.0`
  }

  if (os === 'MacOS') {
    return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ver}.0.0.0 Safari/537.36`
  }
  return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ver}.0.0.0 Safari/537.36`
}

export function generateRandomFingerprint(): FingerprintSettings {
  const osOptions = ['Windows', 'MacOS']
  const resolutionPresets = ['跟随系统', '1920x1080', '1366x768', '1440x900', '1536x864', '1280x720', '2560x1440', '3840x2160']
  const webrtcOptions = ['替换', '允许', '禁用']
  const geolocationOptions = ['询问', '允许', '禁用']
  const hardwareOptions = ['2核', '4核', '8核', '16核', '32核']
  const memoryOptions = ['2GB', '4GB', '6GB', '8GB', '16GB', '32GB']

  const selectedOs = osOptions[Math.floor(Math.random() * osOptions.length)]
  const selectedBrowser = BROWSER_VERSIONS[Math.floor(Math.random() * BROWSER_VERSIONS.length)]
  const selectedUserAgent = getUserAgentForVersion(selectedOs, selectedBrowser)

  return {
    browserVersion: selectedBrowser,
    os: selectedOs,
    userAgent: selectedUserAgent,
    geolocation: geolocationOptions[Math.floor(Math.random() * geolocationOptions.length)],
    resolution: resolutionPresets[Math.floor(Math.random() * resolutionPresets.length)],
    webrtc: webrtcOptions[Math.floor(Math.random() * webrtcOptions.length)],
    canvas: Math.random() > 0.3,
    audioContext: Math.random() > 0.3,
    hardwareConcurrency: hardwareOptions[Math.floor(Math.random() * hardwareOptions.length)],
    deviceMemory: memoryOptions[Math.floor(Math.random() * memoryOptions.length)],
    timezone: timezoneOptions[Math.floor(Math.random() * timezoneOptions.length)],
    hideWebdriver: true,
    enableChromeObj: true,
    fakePlugins: true,
    fakeOuterSize: true,
  }
}

export function buildSystemPrompt(config: Pick<AutoReplyConfig, 'systemPrompt' | 'role' | 'tone' | 'length' | 'salutation' | 'allowEmoji'>): string {
  const ruleParts: string[] = []
  const roleMap: Record<string, string> = {
    客服专员: '你是一位专业的客服专员',
    销售顾问: '你是一位善于沟通的销售顾问',
    技术支持: '你是一位耐心细致的技术支持工程师',
    运营助手: '你是一位活跃的社交媒体运营助手',
    自定义: config.systemPrompt,
  }
  if (roleMap[config.role] && config.role !== '自定义') {
    ruleParts.push(roleMap[config.role])
  }
  const toneMap: Record<string, string> = {
    热情: '语气要热情活泼',
    随意: '语气要轻松随意',
    正式: '语气要正式专业',
    幽默: '语气要幽默风趣',
    冷静: '语气要冷静理性',
    专业: '语气要专业严谨',
  }
  if (toneMap[config.tone]) ruleParts.push(toneMap[config.tone])
  const lenMap: Record<string, string> = {
    简短: '回复尽量简短，控制在50字以内',
    适中: '回复长度适中，控制在100字左右',
    详细: '回复可以详细一些，200字以内',
  }
  if (lenMap[config.length]) ruleParts.push(lenMap[config.length])
  const salMap: Record<string, string> = {
    您: "称呼用户为'您'",
    亲: "称呼用户为'亲'",
    老板: "称呼用户为'老板'",
    不称呼: '不要加称呼',
  }
  if (salMap[config.salutation]) ruleParts.push(salMap[config.salutation])
  ruleParts.push(config.allowEmoji ? '可以适当使用表情符号' : '不要使用表情符号')
  ruleParts.push('直接输出回复内容，不要输出任何思考过程、分析、推理，不要输出任何 <thinking>、<reasoning> 等标签')
  return config.systemPrompt + (ruleParts.length ? '\n\n要求：' + ruleParts.join('，') + '。' : '')
}

export const defaultAutoReplyConfig: AutoReplyConfig = {
  apiKey: '',
  endpoint: 'https://api.minimaxi.com/v1/chat/completions',
  model: 'MiniMax-M2.7',
  systemPrompt: '你是一个热情友好的客服助手，善于用活泼亲切的语气与用户沟通。',
  tone: '热情',
  length: '简短',
  salutation: '亲',
  allowEmoji: true,
  templates: [],
  delaySeconds: 15,
  role: '客服专员',
  blacklist: [],
  keywords: [],
  keywordResponse: '已收到您的问题，我们会尽快安排人工客服为您服务。',
  groupWhitelist: [] as string[],
  groupBlacklist: [] as string[],
  mentionOnly: false,
  myNickname: '',
  sensitiveWords: [] as string[],
  enableTranslation: false,
  targetLanguage: 'zh',
  enableCommands: true,
  enablePlugins: false,
  pluginRules: [] as Array<{ id: string; type: 'message' | 'reply'; match: 'contains' | 'equals' | 'regex' | 'startswith'; pattern: string; action: 'reply' | 'replace' | 'block'; value: string; enabled: boolean }>,
  enableFriendRequestAutoAccept: false,
  friendRequestWelcomeMessage: '你好，很高兴认识你！',
  enableCloudSync: false,
  cloudSyncUrl: '',
  cloudSyncApiKey: '',
  temperature: 0.7,
  maxTokens: 0,
  contextRounds: 10,
  topP: 1.0,
  frequencyPenalty: 0,
  presencePenalty: 0,
  autoSend: true,
}

export function interpolateTemplateVars(
  content: string,
  vars: {
    contactName?: string
    platform?: string
    partition?: string
  }
): string {
  const now = new Date()
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  const dateStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`

  const platform = vars.platform || (vars.partition?.includes('wechat') ? '微信' : vars.partition?.includes('xiaohongshu') ? '小红书' : '')

  return content
    .replace(/\{\{用户名\}\}/g, vars.contactName || '用户')
    .replace(/\{\{联系人\}\}/g, vars.contactName || '用户')
    .replace(/\{\{时间\}\}/g, timeStr)
    .replace(/\{\{日期\}\}/g, dateStr)
    .replace(/\{\{平台\}\}/g, platform)
    .replace(/\{\{partition\}\}/g, vars.partition || '')
}

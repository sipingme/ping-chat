/**
 * 平台注册表（单一事实来源）
 * 主进程、渲染层、webview preload 均从此处读取平台元数据。
 * 新增平台：在 PLATFORMS 中加一行，并在 electron/webview-preload 下新增对应 adapter。
 */
export interface PlatformDescriptor {
  /** 平台 id，同时作为 partition 前缀（persist:<id>-xxx） */
  id: string
  /** 显示名称 */
  name: string
  /** 侧边栏短名 */
  shortName: string
  /** 主题色 */
  accent: string
  /** webview 加载的登录/工作台页面 */
  webUrl: string
  /** cookie 域 base url */
  baseUrl: string
  /** 是否已支持 webview 容器 */
  hasWebview: boolean
}

export const PLATFORMS: PlatformDescriptor[] = [
  {
    id: 'xiaohongshu',
    name: '小红书',
    shortName: '红',
    accent: '#ff2442',
    webUrl: 'https://sxt.xiaohongshu.com/im/login',
    baseUrl: 'https://sxt.xiaohongshu.com',
    hasWebview: true,
  },
  {
    id: 'wechat',
    name: '微信',
    shortName: 'W',
    accent: '#07c160',
    webUrl: 'https://web.wechat.com/',
    baseUrl: 'https://web.wechat.com',
    hasWebview: true,
  },
]

export function getPlatformById(id: string | null | undefined): PlatformDescriptor | undefined {
  if (!id) return undefined
  return PLATFORMS.find((p) => p.id === id)
}

/** 从 partition（persist:wechat-xxx）解析平台 id */
export function getPlatformIdFromPartition(partition: string): string | null {
  if (!partition) return null
  const match = partition.match(/^persist:([^/-]+)/)
  return match ? match[1] : null
}

export function getPlatformBaseUrl(platformId: string | null): string {
  return getPlatformById(platformId)?.baseUrl ?? PLATFORMS[0].baseUrl
}

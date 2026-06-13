export type FpConfig = {
  userAgent?: string
  os?: string
  geolocation?: 'ask' | 'allow' | 'disable'
  webrtc?: 'replace' | 'allow' | 'disable'
  canvas?: boolean
  audioContext?: boolean
  hardwareConcurrency?: string
  deviceMemory?: string
  resolution?: string
  timezone?: string
  proxyHost?: string
  proxyPort?: string
  hideWebdriver?: boolean
  enableChromeObj?: boolean
  fakePlugins?: boolean
  fakeOuterSize?: boolean
}

function parseNum(val?: string): number {
  if (!val) return 0
  const m = val.match(/\d+/)
  return m ? parseInt(m[0], 10) : 0
}

export function injectNavigator(config: FpConfig): void {
  const nav = window.navigator as any
  const proto = Navigator.prototype

  const rewrite = (key: string, getter: () => any) => {
    try {
      Object.defineProperty(nav, key, { get: getter, configurable: true })
    } catch {
      try {
        Object.defineProperty(proto, key, { get: getter, configurable: true })
      } catch {
        // ignore
      }
    }
  }

  if (config.userAgent) rewrite('userAgent', () => config.userAgent)

  const platform = config.os === 'MacOS' ? 'MacIntel' : 'Win32'
  rewrite('platform', () => platform)

  const hc = parseNum(config.hardwareConcurrency) || 4
  rewrite('hardwareConcurrency', () => hc)

  const dm = parseNum(config.deviceMemory) || 8
  rewrite('deviceMemory', () => dm)

  rewrite('language', () => 'zh-CN')
  rewrite('languages', () => ['zh-CN', 'zh', 'en'])
  rewrite('vendor', () => 'Google Inc.')
  rewrite('product', () => 'Gecko')
  rewrite('productSub', () => '20030107')
  rewrite('maxTouchPoints', () => 0)

  const oscpu = config.os === 'MacOS' ? 'Intel Mac OS X 10.15' : 'Windows NT 10.0; Win64; x64'
  rewrite('oscpu', () => oscpu)
}

export function injectScreen(config: FpConfig): void {
  if (!config.resolution || config.resolution === '跟随系统') return
  let width = 1920
  let height = 1080
  const m = config.resolution.match(/(\d+)\s*x\s*(\d+)/i)
  if (m) {
    width = parseInt(m[1], 10)
    height = parseInt(m[2], 10)
  }
  Object.defineProperty(window.screen, 'width', { get: () => width })
  Object.defineProperty(window.screen, 'height', { get: () => height })
  Object.defineProperty(window.screen, 'availWidth', { get: () => width })
  Object.defineProperty(window.screen, 'availHeight', { get: () => height - 40 })
  Object.defineProperty(window.screen, 'colorDepth', { get: () => 24 })
  Object.defineProperty(window.screen, 'pixelDepth', { get: () => 24 })
}

export function injectCanvasNoise(enabled: boolean): void {
  if (!enabled) return
  const proto = CanvasRenderingContext2D.prototype
  const origGetImageData = proto.getImageData
  const origToDataURL = HTMLCanvasElement.prototype.toDataURL
  const origToBlob = HTMLCanvasElement.prototype.toBlob
  const noise = () => Math.floor(Math.random() * 6) - 3

  proto.getImageData = function (sx, sy, sw, sh) {
    const data = origGetImageData.call(this, sx, sy, sw, sh)
    for (let i = 0; i < data.data.length; i += 4) {
      data.data[i] = Math.max(0, Math.min(255, data.data[i] + noise()))
    }
    return data
  }

  HTMLCanvasElement.prototype.toDataURL = function (...args: any[]) {
    const ctx = this.getContext('2d')
    if (ctx) ctx.getImageData(0, 0, 1, 1)
    return origToDataURL.apply(this, args as any)
  }

  HTMLCanvasElement.prototype.toBlob = function (callback, ...args: any[]) {
    const self = this
    return origToBlob.call(
      this,
      function (blob: Blob | null) {
        const ctx = self.getContext('2d')
        if (ctx) ctx.getImageData(0, 0, 1, 1)
        if (callback) callback(blob)
      } as any,
      ...args
    )
  }
}

export function injectWebRTC(config: FpConfig): void {
  const mode = config.webrtc || 'allow'
  if (mode === 'allow') return
  const RTCP = (window as any).RTCPeerConnection || (window as any).webkitRTCPeerConnection
  if (!RTCP) return

  if (mode === 'disable') {
    try {
      ;(window as any).RTCPeerConnection = undefined
      ;(window as any).webkitRTCPeerConnection = undefined
    } catch {
      // ignore
    }
    return
  }

  const fakeIP = config.proxyHost || '203.0.113.1'
  const ipRegex = /\d+\.\d+\.\d+\.\d+/g

  ;(window as any).RTCPeerConnection = function (...args: any[]) {
    const pc = new RTCP(...args)

    const origAddIce = pc.addIceCandidate.bind(pc)
    pc.addIceCandidate = async (candidate: any) => {
      if (candidate && typeof candidate.candidate === 'string') {
        if (candidate.candidate.includes('typ host')) {
          candidate.candidate = candidate.candidate.replace(ipRegex, fakeIP)
        }
      }
      return origAddIce(candidate)
    }

    const patchSdp = (sdp: string) => sdp.replace(ipRegex, fakeIP)
    const origCreateOffer = pc.createOffer.bind(pc)
    pc.createOffer = async (...offerArgs: any[]) => {
      const offer = await origCreateOffer(...offerArgs)
      if (offer && offer.sdp) offer.sdp = patchSdp(offer.sdp)
      return offer
    }
    const origCreateAnswer = pc.createAnswer.bind(pc)
    pc.createAnswer = async (...answerArgs: any[]) => {
      const answer = await origCreateAnswer(...answerArgs)
      if (answer && answer.sdp) answer.sdp = patchSdp(answer.sdp)
      return answer
    }

    const origSetLocal = pc.setLocalDescription.bind(pc)
    pc.setLocalDescription = async (desc: any) => {
      if (desc && desc.sdp) desc.sdp = patchSdp(desc.sdp)
      return origSetLocal(desc)
    }

    return pc
  }
}

export function injectAudioNoise(enabled: boolean): void {
  if (!enabled) return
  if (typeof AudioBuffer === 'undefined') return
  const orig = AudioBuffer.prototype.copyFromChannel
  if (!orig) return
  AudioBuffer.prototype.copyFromChannel = function (destination, channelNumber, startInChannel?) {
    orig.call(this, destination, channelNumber, startInChannel ?? 0)
    for (let i = 0; i < destination.length; i++) {
      destination[i] += (Math.random() - 0.5) * 0.001
    }
  }
}

export function injectGeolocation(mode: 'ask' | 'allow' | 'disable'): void {
  if (!navigator.geolocation) return
  if (mode === 'allow') return
  const geo = navigator.geolocation as any

  const denied = (cb?: PositionErrorCallback) => {
    if (cb) {
      cb({
        code: 1,
        message: 'User denied Geolocation',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError)
    }
  }

  geo.getCurrentPosition = function (_success: any, error: any, _options: any) {
    denied(error)
  }
  if (mode === 'disable') {
    geo.watchPosition = function (_success: any, error: any, _options: any) {
      denied(error)
      return 0
    }
    if (geo.clearWatch) geo.clearWatch = () => {}
  }
}

export function injectWebGL(config: FpConfig): void {
  const gl = WebGLRenderingContext.prototype
  const getParam = gl.getParameter.bind(gl)
  const isWin = config.os === 'Windows'
  const vendor = isWin ? 'Google Inc. (NVIDIA)' : 'Apple Inc.'
  const renderer = isWin
    ? 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 Direct3D11 vs_5_0 ps_5_0, D3D11)'
    : 'Apple GPU'

  const CONSTANTS: Record<number, any> = {
    0x9245: vendor,
    0x9246: renderer,
    0x0b00: new Float32Array([1, 1]),
    0x846d: new Float32Array([1, 2047]),
    0x0c33: 16384,
    0x0c22: new Int32Array([0, 0, 16384, 16384]),
    0x9248: 'WebGL GLSL ES 1.0 (OpenGL ES)',
    0x1f02: 'WebGL 1.0 (OpenGL ES 2.0 ' + (isWin ? 'NVIDIA 546.17' : 'Apple') + ')',
  }

  gl.getParameter = function (p) {
    if (p in CONSTANTS) return CONSTANTS[p]
    return getParam(p)
  }

  const origExtensions = gl.getSupportedExtensions.bind(gl)
  gl.getSupportedExtensions = function () {
    const base = origExtensions() || []
    const fake = [
      'WEBGL_debug_renderer_info',
      'WEBGL_lose_context',
      'EXT_texture_filter_anisotropic',
      'EXT_disjoint_timer_query',
      'OES_texture_float_linear',
      'OES_element_index_uint',
      'WEBGL_compressed_texture_s3tc',
      'WEBGL_compressed_texture_astc',
    ]
    return Array.from(new Set([...fake, ...base]))
  }

  const origAttrs = gl.getContextAttributes.bind(gl)
  gl.getContextAttributes = function () {
    const attrs = origAttrs() || {}
    return { alpha: true, antialias: true, depth: true, failIfMajorPerformanceCaveat: false, powerPreference: 'high-performance', premultipliedAlpha: true, preserveDrawingBuffer: false, stencil: false, ...attrs }
  }
}

export function injectPlugins(config: FpConfig): void {
  if (config.fakePlugins === false) return
  try {
    const isFirefox = config.userAgent?.toLowerCase().includes('firefox')
    if (isFirefox) {
      Object.defineProperty(navigator, 'plugins', { get: () => undefined, configurable: true })
      Object.defineProperty(navigator, 'mimeTypes', { get: () => undefined, configurable: true })
      return
    }
    const pdfPlugin = {
      name: 'Chrome PDF Viewer',
      filename: 'internal-pdf-viewer',
      description: 'Portable Document Format',
      length: 1,
      item: (idx: number) => idx === 0 ? pdfPlugin : null,
      namedItem: () => null,
      refresh: () => {},
      [Symbol.iterator]: function* () { yield pdfPlugin },
    }
    const plugins = {
      length: 1,
      item: (idx: number) => idx === 0 ? pdfPlugin : null,
      namedItem: () => null,
      refresh: () => {},
      [Symbol.iterator]: function* () { yield pdfPlugin },
    }
    Object.defineProperty(navigator, 'plugins', { get: () => plugins, configurable: true })
    Object.defineProperty(navigator, 'mimeTypes', { get: () => ({ length: 0, item: () => null, namedItem: () => null }), configurable: true })
  } catch {
    // ignore
  }
}

export function injectTimezone(config: FpConfig): void {
  const tz = config.timezone
  if (!tz || tz === '跟随系统') return
  try {
    const orig = Intl.DateTimeFormat.prototype.resolvedOptions
    Intl.DateTimeFormat.prototype.resolvedOptions = function () {
      const opts = orig.call(this)
      opts.timeZone = tz
      return opts
    }
    const origToString = Date.prototype.toString
    Date.prototype.toString = function () {
      return origToString.call(this).replace(/\(.*\)/, `(${tz})`)
    }
  } catch {
    // ignore
  }
}

export function injectFonts(): void {
  try {
    const fonts = [
      'Arial', 'Courier New', 'Georgia', 'Times New Roman', 'Verdana',
      'Helvetica', 'Tahoma', 'Trebuchet MS', 'Impact', 'Comic Sans MS',
      'Microsoft YaHei', 'SimSun', 'SimHei', 'PingFang SC', 'Hiragino Sans GB',
    ]
    if ((window as any).queryLocalFonts) {
      ;(window as any).queryLocalFonts = async () =>
        fonts.map((family) => ({ family, fullName: family, postscriptName: family, style: 'Regular' }))
    }
    if ((document as any).fonts && (document as any).fonts.check) {
      const origCheck = (document as any).fonts.check.bind((document as any).fonts)
      ;(document as any).fonts.check = (font: string, text?: string) => origCheck(font, text)
    }
  } catch {
    // ignore
  }
}

export function injectWindowProps(): void {
  try {
    Object.defineProperty(window, 'devicePixelRatio', { get: () => 1 })
  } catch {
    // ignore
  }
}

export function injectPermissions(): void {
  try {
    const origQuery = navigator.permissions.query.bind(navigator.permissions)
    navigator.permissions.query = async (descriptor: any) => {
      const name = descriptor?.name
      const denied = [
        'camera', 'microphone', 'geolocation', 'notifications',
        'persistent-storage', 'background-sync', 'bluetooth', 'usb', 'nfc',
        ' midi', 'clipboard-read', 'clipboard-write', 'payment-handler',
        'idle-detection', 'wake-lock',
      ]
      if (denied.includes(name)) {
        return { state: 'denied', onchange: null, addEventListener: () => {}, removeEventListener: () => {} } as any
      }
      return origQuery(descriptor)
    }
  } catch {
    // ignore
  }
}

export function injectConnection(): void {
  try {
    const connection = {
      effectiveType: '4g', downlink: 10, downlinkMax: Infinity,
      rtt: 50, saveData: false, type: 'wifi',
      addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
    }
    Object.defineProperty(navigator, 'connection', { get: () => connection })
    Object.defineProperty(navigator, 'mozConnection', { get: () => connection })
    Object.defineProperty(navigator, 'webkitConnection', { get: () => connection })
  } catch {
    // ignore
  }
}

export function disableWorkersAndChannels(): void {
  try {
    if ((window as any).ServiceWorkerContainer) {
      ;(window as any).ServiceWorkerContainer.prototype.register = () => Promise.reject(new Error('ServiceWorker disabled'))
      ;(window as any).ServiceWorkerContainer.prototype.ready = new Promise(() => {})
    }
  } catch {
    // ignore
  }
  try {
    if ((window as any).BroadcastChannel) {
      ;(window as any).BroadcastChannel.prototype.postMessage = () => {}
      ;(window as any).BroadcastChannel.prototype.addEventListener = () => {}
    }
  } catch {
    // ignore
  }
}

export function injectNotification(): void {
  try {
    const origRequestPermission = Notification.requestPermission.bind(Notification)
    Notification.requestPermission = async () => 'denied'
    Object.defineProperty(Notification, 'permission', { get: () => 'denied' })
  } catch {
    // ignore
  }
}

export function disableSensitiveApis(): void {
  const apis = [
    'bluetooth', 'usb', 'nfc', 'serial', 'hid',
    'wakeLock', 'contacts', 'keyboard', 'mediaCapabilities',
    'presentation', 'scheduling', 'storage', 'webkitTemporaryStorage',
  ] as const
  for (const key of apis) {
    try {
      if ((navigator as any)[key]) {
        Object.defineProperty(navigator, key, { get: () => undefined })
      }
    } catch {
      // ignore
    }
  }
  try {
    if (navigator.clipboard && (navigator.clipboard as any).readText) {
      ;(navigator.clipboard as any).readText = () => Promise.reject(new DOMException('No user activation', 'NotAllowedError'))
    }
  } catch {
    // ignore
  }
}

export function injectHistory(): void {
  try {
    Object.defineProperty(history, 'length', { get: () => 2 })
  } catch {
    // ignore
  }
}

export function isolateStorage(partition: string): void {
  try {
    const prefix = '__fp_' + partition.replace(/[^a-zA-Z0-9]/g, '_') + '_'
    const origSetItem = localStorage.setItem.bind(localStorage)
    const origGetItem = localStorage.getItem.bind(localStorage)
    const origRemoveItem = localStorage.removeItem.bind(localStorage)
    const origKey = localStorage.key.bind(localStorage)
    const origClear = localStorage.clear.bind(localStorage)

    localStorage.setItem = (key: string, value: string) => origSetItem(prefix + key, value)
    localStorage.getItem = (key: string) => origGetItem(prefix + key)
    localStorage.removeItem = (key: string) => origRemoveItem(prefix + key)
    localStorage.key = (index: number) => {
      const raw = origKey(index)
      return raw && raw.startsWith(prefix) ? raw.slice(prefix.length) : null
    }
    localStorage.clear = () => {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = origKey(i)
        if (k && k.startsWith(prefix)) origRemoveItem(k)
      }
    }
  } catch {
    // ignore
  }
}

export function injectDoNotTrack(): void {
  try {
    Object.defineProperty(navigator, 'doNotTrack', { get: () => '1' })
    Object.defineProperty(window, 'doNotTrack', { get: () => '1' })
  } catch {
    // ignore
  }
}

export function resetWindowName(): void {
  try {
    Object.defineProperty(window, 'name', { get: () => '', set: () => {} })
  } catch {
    // ignore
  }
}

export function injectPerformanceMemory(): void {
  try {
    if ((window.performance as any).memory) {
      Object.defineProperty((window as any).performance, 'memory', {
        get: () => ({
          usedJSHeapSize: 12000000,
          totalJSHeapSize: 22000000,
          jsHeapSizeLimit: 2190000000,
        }),
      })
    }
  } catch {
    // ignore
  }
  try {
    if ((console as any).memory) {
      Object.defineProperty(console, 'memory', {
        get: () => ({
          usedJSHeapSize: 12000000,
          totalJSHeapSize: 22000000,
          jsHeapSizeLimit: 2190000000,
        }),
      })
    }
  } catch {
    // ignore
  }
}

export function injectWebdriver(enabled?: boolean): void {
  if (enabled === false) return
  try {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined, configurable: true })
    if ('webdriver' in navigator) {
      try { delete (navigator as any).webdriver } catch {}
    }
  } catch {
    // ignore
  }
}

export function injectChrome(enabled?: boolean, os?: string): void {
  if (enabled === false) return
  try {
    const chromeObj: any = {
      loadTimes: () => ({
        commitLoadTime: Date.now() / 1000, connectionInfo: 'h2',
        finishDocumentLoadTime: 0, firstPaintAfterLoadTime: 0, firstPaintTime: 0,
        navigationType: 'Other', npnNegotiatedProtocol: 'h2',
        requestTime: Date.now() / 1000, startLoadTime: Date.now() / 1000,
        wasAlternateProtocolAvailable: false, wasFetchedViaSpdy: true, wasNpnNegotiated: true,
      }),
      csi: () => ({ startE: Date.now(), onloadT: Date.now(), pageT: 1 }),
      app: {
        isInstalled: false,
        InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
        RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' },
        getDetails: () => null, getIsInstalled: () => false,
      },
      runtime: {
        OnInstalledReason: { CHROME_UPDATE: 'chrome_update', INSTALL: 'install', SHARED_MODULE_UPDATE: 'shared_module_update', UPDATE: 'update' },
        OnRestartRequiredReason: { APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic' },
        PlatformArch: { ARM: 'arm', ARM64: 'arm64', X86_32: 'x86-32', X86_64: 'x86-64' },
        PlatformNaclArch: { ARM: 'arm', X86_32: 'x86-32', X86_64: 'x86-64' },
        PlatformOs: { ANDROID: 'android', CROS: 'cros', LINUX: 'linux', MAC: 'mac', OPENBSD: 'openbsd', WIN: 'win' },
        RequestUpdateCheckStatus: { NO_UPDATE: 'no_update', THROTTLED: 'throttled', UPDATE_AVAILABLE: 'update_available' },
        getManifest: () => ({}),
        getPlatformInfo: () => ({ arch: 'x86-64', nacl_arch: 'x86-64', os: os === 'MacOS' ? 'mac' : 'win' }),
        getURL: () => '', id: undefined,
        connect: () => ({ disconnect: () => {}, onDisconnect: { addListener: () => {}, dispatch: () => {} }, onMessage: { addListener: () => {}, dispatch: () => {} }, postMessage: () => {}, name: '' }),
        sendMessage: () => {},
      },
    }
    Object.defineProperty(window, 'chrome', { get: () => chromeObj, configurable: true })
  } catch {
    // ignore
  }
}

export function injectOuterDimensions(config: FpConfig): void {
  if (config.fakeOuterSize === false) return
  if (!config.resolution || config.resolution === '跟随系统') return
  const m = config.resolution.match(/(\d+)\s*x\s*(\d+)/i)
  if (!m) return
  const innerW = parseInt(m[1], 10)
  const innerH = parseInt(m[2], 10)
  try {
    Object.defineProperty(window, 'outerWidth', { get: () => innerW + 16, configurable: true })
    Object.defineProperty(window, 'outerHeight', { get: () => innerH + 88, configurable: true })
  } catch {
    // ignore
  }
}

export function cleanElectronGlobals(): void {
  try { delete (window as any).process } catch {}
  try { delete (window as any).Buffer } catch {}
  try { delete (window as any).ELECTRON } catch {}
  try { delete (window as any).require } catch {}
}

export function cleanPhantomGlobals(): void {
  try { delete (window as any).callPhantom } catch {}
  try { delete (window as any)._phantom } catch {}
  try { delete (window as any).__phantomas } catch {}
}

export function injectMediaQueries(): void {
  try {
    const origMatchMedia = window.matchMedia.bind(window)
    window.matchMedia = (query: string) => {
      const mql = origMatchMedia(query)
      if (query.includes('prefers-color-scheme')) {
        Object.defineProperty(mql, 'matches', { get: () => query.includes('light') })
      }
      if (query.includes('prefers-reduced-motion')) {
        Object.defineProperty(mql, 'matches', { get: () => query.includes('no-preference') || query.includes('reduce') === false })
      }
      if (query.includes('hover')) {
        Object.defineProperty(mql, 'matches', { get: () => query.includes('hover') && !query.includes('none') })
      }
      if (query.includes('pointer')) {
        Object.defineProperty(mql, 'matches', { get: () => query.includes('fine') || query.includes('coarse') })
      }
      return mql
    }
  } catch {
    // ignore
  }
}

export function stubBatteryAndSpeech(): void {
  try {
    if ((navigator as any).getBattery) {
      ;(navigator as any).getBattery = () =>
        Promise.resolve({
          charging: true, chargingTime: 0, dischargingTime: Infinity, level: 1,
          addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
        })
    }
  } catch {
    // ignore
  }
  try {
    if (window.speechSynthesis) {
      const origGetVoices = window.speechSynthesis.getVoices.bind(window.speechSynthesis)
      window.speechSynthesis.getVoices = () => [
        { voiceURI: 'Google US English', name: 'Google US English', lang: 'en-US', localService: false, default: true } as any,
        { voiceURI: 'Microsoft Yaoyao', name: 'Microsoft Yaoyao', lang: 'zh-CN', localService: false, default: false } as any,
      ]
    }
  } catch {
    // ignore
  }
}

export function applyAllFingerprints(config: FpConfig, partition: string): void {
  injectNavigator(config)
  injectScreen(config)
  injectCanvasNoise(config.canvas === true)
  injectAudioNoise(config.audioContext === true)
  injectWebRTC(config)
  injectGeolocation(config.geolocation || 'ask')
  injectWebGL(config)
  injectPlugins(config)
  injectWebdriver(config.hideWebdriver)
  injectChrome(config.enableChromeObj, config.os)
  injectOuterDimensions(config)
  cleanElectronGlobals()
  cleanPhantomGlobals()
  injectTimezone(config)
  injectFonts()
  injectWindowProps()
  injectPermissions()
  injectConnection()
  disableWorkersAndChannels()
  injectNotification()
  disableSensitiveApis()
  resetWindowName()
  injectPerformanceMemory()
  injectMediaQueries()
  stubBatteryAndSpeech()
  injectHistory()
  isolateStorage(partition)
  injectDoNotTrack()
}

import { ipcRenderer } from 'electron'
import type { PlatformAdapter, ChatMessagePayload } from './adapter'
import { wechatAdapter } from './wechat-adapter'
import { xiaohongshuAdapter } from './xiaohongshu-adapter'

type FpConfig = {
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

/* ── 1. 基础指纹 ─────────────────────────────────── */
function injectNavigator(config: FpConfig) {
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

  // oscpu is Firefox-only but some fingerprint scripts check it
  const oscpu = config.os === 'MacOS' ? 'Intel Mac OS X 10.15' : 'Windows NT 10.0; Win64; x64'
  rewrite('oscpu', () => oscpu)
}

/* ── 2. Screen / Window ──────────────────────────── */
function injectScreen(config: FpConfig) {
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
  Object.defineProperty(window.screen, 'availHeight', { get: () => height - 40 }) // taskbar
  Object.defineProperty(window.screen, 'colorDepth', { get: () => 24 })
  Object.defineProperty(window.screen, 'pixelDepth', { get: () => 24 })
}

/* ── 3. Canvas 噪音 ───────────────────────────────── */
function injectCanvasNoise(enabled: boolean) {
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
    if (ctx) ctx.getImageData(0, 0, 1, 1) // trigger noise injection once
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

/* ── 4. WebRTC ───────────────────────────────────── */
function injectWebRTC(config: FpConfig) {
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

  // replace mode: substitute real IP with proxy/virtual IP
  const fakeIP = config.proxyHost || '203.0.113.1'
  const ipRegex = /\d+\.\d+\.\d+\.\d+/g

  ;(window as any).RTCPeerConnection = function (...args: any[]) {
    const pc = new RTCP(...args)

    // Patch addIceCandidate to replace IP in host candidates
    const origAddIce = pc.addIceCandidate.bind(pc)
    pc.addIceCandidate = async (candidate: any) => {
      if (candidate && typeof candidate.candidate === 'string') {
        if (candidate.candidate.includes('typ host')) {
          candidate.candidate = candidate.candidate.replace(ipRegex, fakeIP)
        }
      }
      return origAddIce(candidate)
    }

    // Patch createOffer / createAnswer SDP
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

    // Patch setLocalDescription to mutate SDP before applying
    const origSetLocal = pc.setLocalDescription.bind(pc)
    pc.setLocalDescription = async (desc: any) => {
      if (desc && desc.sdp) desc.sdp = patchSdp(desc.sdp)
      return origSetLocal(desc)
    }

    return pc
  }
}

/* ── 5. AudioContext 噪音 ─────────────────────────── */
function injectAudioNoise(enabled: boolean) {
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

/* ── 6. Geolocation ──────────────────────────────── */
function injectGeolocation(mode: 'ask' | 'allow' | 'disable') {
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

/* ── 7. WebGL vendor / renderer / extensions ──────── */
function injectWebGL(config: FpConfig) {
  const gl = WebGLRenderingContext.prototype
  const getParam = gl.getParameter.bind(gl)
  const isWin = config.os === 'Windows'
  const vendor = isWin ? 'Google Inc. (NVIDIA)' : 'Apple Inc.'
  const renderer = isWin
    ? 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 Direct3D11 vs_5_0 ps_5_0, D3D11)'
    : 'Apple GPU'

  const CONSTANTS: Record<number, any> = {
    0x9245: vendor,           // UNMASKED_VENDOR_WEBGL
    0x9246: renderer,        // UNMASKED_RENDERER_WEBGL
    0x0b00: new Float32Array([1, 1]),      // ALIASED_LINE_WIDTH_RANGE
    0x846d: new Float32Array([1, 2047]),   // ALIASED_POINT_SIZE_RANGE
    0x0c33: 16384,           // MAX_TEXTURE_SIZE
    0x0c22: new Int32Array([0, 0, 16384, 16384]), // MAX_VIEWPORT_DIMS
    0x9248: 'WebGL GLSL ES 1.0 (OpenGL ES)', // SHADING_LANGUAGE_VERSION
    0x1f02: 'WebGL 1.0 (OpenGL ES 2.0 ' + (isWin ? 'NVIDIA 546.17' : 'Apple') + ')', // VERSION
  }

  gl.getParameter = function (p) {
    if (p in CONSTANTS) return CONSTANTS[p]
    return getParam(p)
  }

  // Spoof getSupportedExtensions
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

  // Spoof getContextAttributes
  const origAttrs = gl.getContextAttributes.bind(gl)
  gl.getContextAttributes = function () {
    const attrs = origAttrs() || {}
    return { alpha: true, antialias: true, depth: true, failIfMajorPerformanceCaveat: false, powerPreference: 'high-performance', premultipliedAlpha: true, preserveDrawingBuffer: false, stencil: false, ...attrs }
  }
}

/* ── 8. Plugin spoofing (browser-aware) ──────────── */
function injectPlugins(config: FpConfig) {
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

/* ── 9. Timezone ──────────────────────────────────── */
function injectTimezone(config: FpConfig) {
  const tz = config.timezone
  if (!tz || tz === '跟随系统') return
  try {
    const fmt = new Intl.DateTimeFormat('en', { timeZone: tz })
    // Override resolvedOptions
    const orig = Intl.DateTimeFormat.prototype.resolvedOptions
    Intl.DateTimeFormat.prototype.resolvedOptions = function () {
      const opts = orig.call(this)
      opts.timeZone = tz
      return opts
    }
    // Also override Date methods for consistency
    const origToString = Date.prototype.toString
    Date.prototype.toString = function () {
      return origToString.call(this).replace(/\(.*\)/, `(${tz})`)
    }
  } catch {
    // ignore
  }
}

/* ── 10. Font list spoofing ──────────────────────── */
function injectFonts() {
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

/* ── 11. Window / Device properties ──────────────── */
function injectWindowProps() {
  try {
    Object.defineProperty(window, 'devicePixelRatio', { get: () => 1 })
  } catch {
    // ignore
  }
}

/* ── 11b. Permissions API ─────────────────────────── */
function injectPermissions() {
  try {
    const origQuery = navigator.permissions.query.bind(navigator.permissions)
    navigator.permissions.query = async (descriptor: any) => {
      const name = descriptor?.name
      // Consistently deny sensitive permissions
      const denied = [
        'camera',
        'microphone',
        'geolocation',
        'notifications',
        'persistent-storage',
        'background-sync',
        'bluetooth',
        'usb',
        'nfc',
        ' midi',
        'clipboard-read',
        'clipboard-write',
        'payment-handler',
        'idle-detection',
        'wake-lock',
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

/* ── 11c. Navigator.connection spoofing ───────────── */
function injectConnection() {
  try {
    const connection = {
      effectiveType: '4g',
      downlink: 10,
      downlinkMax: Infinity,
      rtt: 50,
      saveData: false,
      type: 'wifi',
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }
    Object.defineProperty(navigator, 'connection', { get: () => connection })
    Object.defineProperty(navigator, 'mozConnection', { get: () => connection })
    Object.defineProperty(navigator, 'webkitConnection', { get: () => connection })
  } catch {
    // ignore
  }
}

/* ── 11d. Disable ServiceWorker & BroadcastChannel ─ */
function disableWorkersAndChannels() {
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

/* ── 11e. Notification API stub ──────────────────── */
function injectNotification() {
  try {
    const origRequestPermission = Notification.requestPermission.bind(Notification)
    Notification.requestPermission = async () => 'denied'
    Object.defineProperty(Notification, 'permission', { get: () => 'denied' })
  } catch {
    // ignore
  }
}

/* ── 12. Disable sensitive hardware APIs ──────────── */
function disableSensitiveApis() {
  const apis = [
    'bluetooth',
    'usb',
    'nfc',
    'serial',
    'hid',
    'wakeLock',
    'contacts',
    'keyboard',
    'mediaCapabilities',
    'presentation',
    'scheduling',
    'storage',
    'webkitTemporaryStorage',
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
  // Also stub clipboard.readText to require user gesture
  try {
    if (navigator.clipboard && (navigator.clipboard as any).readText) {
      ;(navigator.clipboard as any).readText = () => Promise.reject(new DOMException('No user activation', 'NotAllowedError'))
    }
  } catch {
    // ignore
  }
}

/* ── 12b. History.length spoof ────────────────────── */
function injectHistory() {
  try {
    Object.defineProperty(history, 'length', { get: () => 2 })
  } catch {
    // ignore
  }
}

/* ── 12c. IndexedDB / LocalStorage isolation ───────── */
function isolateStorage(partition: string) {
  try {
    // Prefix localStorage keys with partition hash so sites can't cross-read
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

/* ── 12d. doNotTrack ──────────────────────────────── */
function injectDoNotTrack() {
  try {
    Object.defineProperty(navigator, 'doNotTrack', { get: () => '1' })
    Object.defineProperty(window, 'doNotTrack', { get: () => '1' })
  } catch {
    // ignore
  }
}

/* ── 13. Window.name reset & window.open ──────────── */
function resetWindowName() {
  try {
    Object.defineProperty(window, 'name', { get: () => '', set: () => {} })
  } catch {
    // ignore
  }
}

/* ── 14. Performance.memory spoof ──────────────────── */
function injectPerformanceMemory() {
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

/* ── 14b. WebDriver hiding ───────────────────────── */
function injectWebdriver(enabled?: boolean) {
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

/* ── 14c. Chrome object spoofing ─────────────────── */
function injectChrome(enabled?: boolean, os?: string) {
  if (enabled === false) return
  try {
    const chromeObj: any = {
      loadTimes: () => ({
        commitLoadTime: Date.now() / 1000,
        connectionInfo: 'h2',
        finishDocumentLoadTime: 0,
        firstPaintAfterLoadTime: 0,
        firstPaintTime: 0,
        navigationType: 'Other',
        npnNegotiatedProtocol: 'h2',
        requestTime: Date.now() / 1000,
        startLoadTime: Date.now() / 1000,
        wasAlternateProtocolAvailable: false,
        wasFetchedViaSpdy: true,
        wasNpnNegotiated: true,
      }),
      csi: () => ({ startE: Date.now(), onloadT: Date.now(), pageT: 1 }),
      app: {
        isInstalled: false,
        InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
        RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' },
        getDetails: () => null,
        getIsInstalled: () => false,
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
        getURL: () => '',
        id: undefined,
        connect: () => ({ disconnect: () => {}, onDisconnect: { addListener: () => {}, dispatch: () => {} }, onMessage: { addListener: () => {}, dispatch: () => {} }, postMessage: () => {}, name: '' }),
        sendMessage: () => {},
      },
    }
    Object.defineProperty(window, 'chrome', { get: () => chromeObj, configurable: true })
  } catch {
    // ignore
  }
}

/* ── 14d. Outer dimensions spoofing ───────────────── */
function injectOuterDimensions(config: FpConfig) {
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

/* ── 14e. Clean Electron globals ─────────────────── */
function cleanElectronGlobals() {
  try { delete (window as any).process } catch {}
  try { delete (window as any).Buffer } catch {}
  try { delete (window as any).ELECTRON } catch {}
  try { delete (window as any).require } catch {}
}

/* ── 14f. Clean PhantomJS globals ───────────────── */
function cleanPhantomGlobals() {
  try { delete (window as any).callPhantom } catch {}
  try { delete (window as any)._phantom } catch {}
  try { delete (window as any).__phantomas } catch {}
}

/* ── 15. CSS Media query spoofing ──────────────────── */
function injectMediaQueries() {
  try {
    const origMatchMedia = window.matchMedia.bind(window)
    window.matchMedia = (query: string) => {
      const mql = origMatchMedia(query)
      // Spoof prefers-color-scheme to light
      if (query.includes('prefers-color-scheme')) {
        Object.defineProperty(mql, 'matches', { get: () => query.includes('light') })
      }
      // Spoof prefers-reduced-motion to no-preference
      if (query.includes('prefers-reduced-motion')) {
        Object.defineProperty(mql, 'matches', { get: () => query.includes('no-preference') || query.includes('reduce') === false })
      }
      // Spoof hover capability
      if (query.includes('hover')) {
        Object.defineProperty(mql, 'matches', { get: () => query.includes('hover') && !query.includes('none') })
      }
      // Spoof pointer
      if (query.includes('pointer')) {
        Object.defineProperty(mql, 'matches', { get: () => query.includes('fine') || query.includes('coarse') })
      }
      return mql
    }
  } catch {
    // ignore
  }
}

/* ── 16. Battery & speechSynthesis stubs ───────────── */
function stubBatteryAndSpeech() {
  try {
    if ((navigator as any).getBattery) {
      ;(navigator as any).getBattery = () =>
        Promise.resolve({
          charging: true,
          chargingTime: 0,
          dischargingTime: Infinity,
          level: 1,
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
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

/* ── 主入口 ───────────────────────────────────────── */
async function init() {
  try {
    // 先从主进程获取正确的 partition（guest page 无法通过 DOM 获取 webview 属性）
    const partition = await ipcRenderer.invoke('chat:register')

    // 启动聊天抓取
    startAutoReplyScraper(partition)

    const config: FpConfig | null = await ipcRenderer.invoke('fingerprint:get', partition)
    if (!config) return

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
  } catch (e) {
    console.error('[FingerprintPreload] init error:', e)
  }
}

/* ── Auto Reply: message scraper + injector ─────────── */

function startAutoReplyScraper(partition: string) {
  let monitoringEnabled = false
  try {
    // Detect platform and pick adapter
    const adapters = [wechatAdapter, xiaohongshuAdapter]
    const adapter: PlatformAdapter | undefined = adapters.find((a) => a.detect())
    if (!adapter) {
      console.log('[ChatStats] no platform adapter matched for', window.location.hostname)
      return
    }
    console.log('[ChatStats] using adapter:', adapter.name)

    // Auto-enable monitoring on startup and send initial stats
    monitoringEnabled = true
    void adapter.extractChatListStats(partition).then((stats: any) => {
      console.log('[ChatStats] initial scan', stats)
      if (stats) {
        ipcRenderer.send('chat:stats', stats)
      }
    })

    // ── localStorage persistence ────────────────────────
    function dumpLocalStorage(): void {
      const data: Record<string, string> = {}
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i)
        if (key) data[key] = window.localStorage.getItem(key) || ''
      }
      ipcRenderer.send('localstorage:dump', { partition, data })
    }

    // Request restore on startup
    ipcRenderer.send('localstorage:request-restore', { partition })

    // Listen for restore from main
    ipcRenderer.on('localstorage:restore', (_event, payload: { partition: string; data: Record<string, string> }) => {
      if (payload.partition !== partition) return
      Object.entries(payload.data).forEach(([key, value]) => {
        window.localStorage.setItem(key, value)
      })
      console.log('[localStorage] restored', Object.keys(payload.data).length, 'items')
    })

    // Listen for dump request from main (before quit)
    ipcRenderer.on('localstorage:dump-request', (_event, payload: { partition: string }) => {
      if (payload.partition !== partition) return
      dumpLocalStorage()
    })

    // Periodic auto-save
    setInterval(dumpLocalStorage, 30000)

    // 平台自定义初始化钩子（如小红书切换到"全部会话"）
    adapter.onPageReady?.()

    // ── Contact click tracking ──────────────────────────
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      // Try to find the closest chat list item via adapter
      // First try adapter-specific selector
      let chatItem: Element | null = target?.closest?.(adapter.chatItemSelector) ?? null
      // Fallback: walk up DOM and check each element with adapter
      if (!chatItem) {
        let el: Element | null = target
        while (el && el !== document.body) {
          const contact = adapter.extractContactFromElement(el)
          if (contact) {
            chatItem = el
            break
          }
          el = el.parentElement
        }
      }
      if (!chatItem) return

      const contact = adapter.extractContactFromElement(chatItem)
      if (!contact) return

      const { name, avatarUrl } = contact
      console.log('[ChatStats] click on:', name, 'avatarUrl:', avatarUrl?.slice(0, 80))

      // Async avatar base64 conversion
      if (avatarUrl) {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas')
            canvas.width = img.naturalWidth || 64
            canvas.height = img.naturalHeight || 64
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.drawImage(img, 0, 0)
              const base64 = canvas.toDataURL('image/png')
              console.log('[ChatStats] base64 success, length:', base64.length)
              ipcRenderer.send('chat:contact-clicked', { partition, name, avatar: base64 })
            }
          } catch (err) {
            console.log('[ChatStats] canvas error:', err)
            ipcRenderer.send('chat:contact-clicked', { partition, name, avatar: avatarUrl })
          }
        }
        img.onerror = () => {
          console.log('[ChatStats] crossOrigin image load failed, sending URL')
          ipcRenderer.send('chat:contact-clicked', { partition, name, avatar: avatarUrl })
        }
        img.src = avatarUrl
      } else {
        ipcRenderer.send('chat:contact-clicked', { partition, name, avatar: '' })
      }
    })

    // ── IPC listeners delegated to adapter ─────────────
    ipcRenderer.on('chat:select', (_event, payload: { partition: string; contactName: string }) => {
      console.log('[ChatStats] selectChat request for:', payload.contactName)
      void adapter.selectChat(payload.contactName)
    })

    ipcRenderer.on('chat:reply', (_event, payload: { partition: string; content: string; autoSend?: boolean }) => {
      adapter.sendReply(payload.content, payload.autoSend !== false)
    })

    // ── Message monitoring ──────────────────────────────
    // Initial scrape after page settles
    setTimeout(() => {
      const msgs = adapter.extractMessages(partition)
      msgs.forEach((m) => ipcRenderer.send('chat:message', m))
    }, 3000)

    // Anti-recall: cache all messages by content hash
    const messageCache = new Map<string, { sender: string; content: string; timestamp: number }>()
    function getCacheKey(sender: string, content: string): string {
      return `${sender}:${content}`
    }

    // Observe for new messages and recalls
    const observer = new MutationObserver((mutations) => {
      const addedNodes: Node[] = []
      for (const mut of mutations) {
        if (mut.type === 'childList') {
          mut.addedNodes.forEach((node) => addedNodes.push(node))
        }
      }

      let newMsgs: ChatMessagePayload[] = []
      if (adapter.extractMessagesFromNodes) {
        newMsgs = adapter.extractMessagesFromNodes(partition, addedNodes)
      }
      if (newMsgs.length === 0 && addedNodes.length > 0) {
        newMsgs = adapter.extractMessages(partition)
      }
      newMsgs.forEach((m) => {
        ipcRenderer.send('chat:message', m)
        messageCache.set(getCacheKey(m.sender, m.content), { sender: m.sender, content: m.content, timestamp: m.timestamp })
      })

      // Detect message recalls
      for (const mut of mutations) {
        if (mut.type === 'childList') continue
        const target = mut.target as HTMLElement | null
        if (!target) continue
        const text = target.textContent || ''
        if (text.includes('撤回') || text.includes('recalled') || text.includes('已撤回')) {
          const msgEl = target.closest('.message, .im-msg-item, .msg')
          if (msgEl) {
            const name = msgEl.querySelector('.nickname, .nickname_text, .user-name')?.textContent || 'unknown'
            // Try to find original content from cache
            let originalContent = ''
            for (const [key, value] of messageCache) {
              if (key.startsWith(`${name}:`)) {
                originalContent = value.content
                break
              }
            }
            ipcRenderer.send('chat:recall', { partition, sender: name, content: text, originalContent, timestamp: Date.now() })
          }
        }
      }
    })
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })

    // Send full conversation history every 5s for the reply workbench
    setInterval(() => {
      const history = adapter.extractAllMessages(partition)
      console.log('[ChatStats] sending chat:history with', history.length, 'msgs, partition:', partition)
      ipcRenderer.send('chat:history', { partition, history })
    }, 5000)

    // ── Chat list stats scraper ────────────────────────
    ipcRenderer.on('chat:monitor', (_event, payload: { partition: string; enabled: boolean }) => {
      monitoringEnabled = payload.enabled
      console.log('[ChatStats] monitoring enabled =', monitoringEnabled)
      if (monitoringEnabled) {
        void adapter.extractChatListStats(partition).then((stats: any) => {
          console.log('[ChatStats] immediate scan', stats)
          if (stats) {
            ipcRenderer.send('chat:stats', stats)
          }
        })
      }
    })

    setInterval(async () => {
      if (!monitoringEnabled) return
      const stats = await adapter.extractChatListStats(partition)
      console.log('[ChatStats]', stats)
      if (stats) {
        ipcRenderer.send('chat:stats', stats)
      }
    }, 5000)
  } catch (e) {
    console.error('[AutoReply] scraper init error:', e)
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

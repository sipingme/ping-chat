import { type ReactNode, useState } from 'react'
import { ChevronDown, CircleHelp } from 'lucide-react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import type { ChatSession, FingerprintSettings, ProxyConfig } from '../types'
import { CustomSelect, SegmentedControl, Switch, ProxyField } from '../components/ui/BaseUI'
import { generateRandomFingerprint, BROWSER_VERSIONS, getUserAgentForVersion, timezoneOptions } from '../config/defaults'

function CustomTooltip({ children, content }: { children: ReactNode; content: ReactNode }): JSX.Element {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content className="custom-tooltip" side="right" sideOffset={8}>
          {content}
          <TooltipPrimitive.Arrow className="custom-tooltip-arrow" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

export function ProxySettingsTab({
  session,
  fingerprint,
  proxy,
  cookieText,
  onChangeFingerprint,
  onChangeProxy,
  onChangeCookie,
}: {
  session?: ChatSession
  fingerprint?: FingerprintSettings
  proxy?: ProxyConfig
  cookieText?: string
  onChangeFingerprint?: (fp: FingerprintSettings) => void
  onChangeProxy?: (p: ProxyConfig) => void
  onChangeCookie?: (text: string) => void
}): JSX.Element {
  const [checkStatus, setCheckStatus] = useState<{ type: 'idle' | 'checking' | 'ok' | 'error'; message?: string }>({ type: 'idle' })

  if (!fingerprint || !proxy) {
    return (
      <section className="proxy-section">
        <h3>代理环境</h3>
        <div className="proxy-note">请先选择一个会话</div>
      </section>
    )
  }

  const handleFp = (updates: Partial<FingerprintSettings>) => {
    onChangeFingerprint?.({ ...fingerprint, ...updates })
  }

  const handleProxy = (key: keyof ProxyConfig, value: string) => {
    onChangeProxy?.({ ...proxy, [key]: value })
  }

  const handleCheckProxy = async () => {
    setCheckStatus({ type: 'checking' })
    try {
      const result = await window.pingChat.checkProxy(proxy)
      if (result.ok && result.ip) {
        setCheckStatus({ type: 'ok', message: `代理可用 IP:${result.ip} 延迟:${result.latency}ms` })
      } else {
        setCheckStatus({ type: 'error', message: result.error || '检查失败' })
      }
    } catch (e: any) {
      setCheckStatus({ type: 'error', message: e.message || '检查失败' })
    }
  }

  return (
    <section className="proxy-section">
      <h3 className="proxy-section-title" id="proxy-section">代理设置</h3>
      <ProxyField
        className="proxy-field--top"
        label={
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            智能填写
            <CustomTooltip
              content={
                <div style={{ whiteSpace: 'pre-line', fontSize: '11px' }}>
                  {'支持以下格式\n1. protocol://username:password@host:port\n2. protocol://host:port:username:password\n3. host:port:protocol\n4. host:port:username:password:protocol'}
                </div>
              }
            >
              <CircleHelp size={14} style={{ cursor: 'help', opacity: 0.6 }} />
            </CustomTooltip>
          </span>
        }
      >
        <textarea className="proxy-textarea" rows={1} />
      </ProxyField>
      <ProxyField label="选择代理">
        <CustomSelect
          className="proxy-select"
          placeholder="请选择"
          options={[{ value: 'default', label: '默认' }]}
        />
      </ProxyField>
      <ProxyField label="协议">
        <CustomSelect
          className="proxy-select"
          value={proxy.protocol}
          options={[
            { value: 'no-proxy', label: 'No Proxy' },
            { value: 'http', label: 'HTTP' },
            { value: 'https', label: 'HTTPS' },
            { value: 'socks5', label: 'SOCKS5' }
          ]}
          onChange={(v) => handleProxy('protocol', v)}
        />
      </ProxyField>
      <ProxyField label="主机 : 端口">
        <div className="host-port">
          <input placeholder="主机" value={proxy.host} onChange={(e) => handleProxy('host', e.target.value)} />
          <span>:</span>
          <input placeholder="端口" value={proxy.port} onChange={(e) => handleProxy('port', e.target.value)} />
        </div>
      </ProxyField>
      <ProxyField label="用户名">
        <input className="proxy-input" placeholder="用户名" value={proxy.username} onChange={(e) => handleProxy('username', e.target.value)} />
      </ProxyField>
      <ProxyField label="密码">
        <div className="password-check">
          <input className="proxy-input" type="password" placeholder="密码" value={proxy.password} onChange={(e) => handleProxy('password', e.target.value)} />
          <button className="proxy-check-btn" onClick={() => void handleCheckProxy()} disabled={checkStatus.type === 'checking'}>
            {checkStatus.type === 'checking' ? '检查中…' : '检查代理服务器'}
          </button>
        </div>
        {checkStatus.type !== 'idle' && (
          <div className={`proxy-note ${checkStatus.type === 'ok' ? 'proxy-note--ok' : checkStatus.type === 'error' ? 'proxy-note--error' : ''}`}>
            {checkStatus.message}
          </div>
        )}
      </ProxyField>
      <h3 className="proxy-section-title" id="fingerprint-section">指纹设置</h3>
      <ProxyField label="浏览器版本">
        <CustomSelect
          className="proxy-select"
          value={fingerprint.browserVersion}
          options={[
            { value: 'random', label: '随机版本' },
            ...BROWSER_VERSIONS.map((v) => ({ value: v, label: v })),
          ]}
          onChange={(v) => {
            if (v === 'random') {
              const randomFp = generateRandomFingerprint()
              handleFp({ browserVersion: randomFp.browserVersion, userAgent: randomFp.userAgent })
            } else {
              handleFp({ browserVersion: v, userAgent: getUserAgentForVersion(fingerprint.os, v) })
            }
          }}
        />
      </ProxyField>
      <ProxyField label="操作系统">
        <SegmentedControl values={['Windows', 'MacOS']} active={fingerprint.os} onChange={(v) => {
          handleFp({ os: v, userAgent: getUserAgentForVersion(v, fingerprint.browserVersion) })
        }} />
      </ProxyField>
      <div className="proxy-note">建议您使用与本地操作相匹配的User Agent</div>
      <ProxyField label="User Agent" className="proxy-field--top">
        <textarea
          className="proxy-textarea user-agent"
          value={fingerprint.userAgent}
          onChange={(e) => handleFp({ userAgent: e.target.value })}
        />
      </ProxyField>
      <ProxyField label="地理位置">
        <SegmentedControl values={['询问', '允许', '禁用']} active={fingerprint.geolocation} onChange={(v) => handleFp({ geolocation: v })} />
      </ProxyField>
      {fingerprint.geolocation === '询问' && (
        <div className="proxy-note">网站会显示获取您当前位置的询问提示，您可以允许或禁止，与普通浏览器的提示一样</div>
      )}
      {fingerprint.geolocation === '允许' && (
        <div className="proxy-note">网站请求获取您当前位置时，始终被允许</div>
      )}
      {fingerprint.geolocation === '禁用' && (
        <div className="proxy-note">网站请求获取您当前位置时，始终被禁止</div>
      )}
      <ProxyField label="分辨率">
        <CustomSelect
          className="proxy-select"
          value={fingerprint.resolution}
          options={[
            { value: '跟随系统', label: '跟随系统' },
            { value: '1920x1080', label: '1920 x 1080' },
            { value: '1366x768', label: '1366 x 768' },
            { value: '1440x900', label: '1440 x 900' },
            { value: '1536x864', label: '1536 x 864' },
            { value: '1280x720', label: '1280 x 720' },
            { value: '2560x1440', label: '2560 x 1440' },
            { value: '3840x2160', label: '3840 x 2160' },
          ]}
          onChange={(v) => handleFp({ resolution: v })}
        />
      </ProxyField>
      <ProxyField label="WebRTC">
        <SegmentedControl values={['替换', '允许', '禁用']} active={fingerprint.webrtc} onChange={(v) => handleFp({ webrtc: v })} />
      </ProxyField>
      {fingerprint.webrtc === '替换' && (
        <div className="proxy-note">开启WebRTC，将公网IP替换为代理IP</div>
      )}
      {fingerprint.webrtc === '允许' && (
        <div className="proxy-note">开启WebRTC，将使用当前电脑的真实IP</div>
      )}
      {fingerprint.webrtc === '禁用' && (
        <div className="proxy-note">WebRTC被关闭，网站会检测到您关闭了WebRTC</div>
      )}
      <ProxyField label="Canvas">
        <Switch enabled={fingerprint.canvas} onChange={(v) => handleFp({ canvas: v })} />
      </ProxyField>
      <div className="proxy-note">启用噪音，掩盖真实Canvas</div>
      <ProxyField label="AudioContext">
        <Switch enabled={fingerprint.audioContext} onChange={(v) => handleFp({ audioContext: v })} />
      </ProxyField>
      <div className="proxy-note">启用噪音，掩盖真实AudioContext</div>
      <ProxyField label="硬件并发数">
        <CustomSelect
          className="proxy-select"
          value={fingerprint.hardwareConcurrency}
          options={[
            { value: '2核', label: '2核' },
            { value: '4核', label: '4核' },
            { value: '6核', label: '6核' },
            { value: '8核', label: '8核' },
            { value: '12核', label: '12核' },
            { value: '16核', label: '16核' },
            { value: '20核', label: '20核' },
            { value: '24核', label: '24核' },
            { value: '32核', label: '32核' },
          ]}
          onChange={(v) => handleFp({ hardwareConcurrency: v })}
        />
      </ProxyField>
      <div className="proxy-note">设置当前浏览器环境的CPU核心数</div>
      <ProxyField label="设备内存">
        <CustomSelect
          className="proxy-select"
          value={fingerprint.deviceMemory}
          options={[
            { value: '2GB', label: '2GB' },
            { value: '4GB', label: '4GB' },
            { value: '6GB', label: '6GB' },
            { value: '8GB', label: '8GB' },
            { value: '16GB', label: '16GB' },
            { value: '32GB', label: '32GB' },
            { value: '64GB', label: '64GB' },
            { value: '128GB', label: '128GB' },
          ]}
          onChange={(v) => handleFp({ deviceMemory: v })}
        />
      </ProxyField>
      <div className="proxy-note">设置当前浏览器环境模拟机器内存</div>
      <ProxyField label="时区">
        <CustomSelect
          className="proxy-select"
          value={fingerprint.timezone}
          options={timezoneOptions.map((tz) => ({ value: tz, label: tz }))}
          onChange={(v) => handleFp({ timezone: v })}
        />
      </ProxyField>
      <div className="proxy-note">设置浏览器环境时区，匹配目标地区时间偏好</div>
      <ProxyField label="WebDriver 隐藏">
        <Switch enabled={fingerprint.hideWebdriver} onChange={(v) => handleFp({ hideWebdriver: v })} />
      </ProxyField>
      <div className="proxy-note">彻底隐藏 webdriver 检测标记，深度模拟真实用户行为特征</div>
      <ProxyField label="Chrome 对象">
        <Switch enabled={fingerprint.enableChromeObj} onChange={(v) => handleFp({ enableChromeObj: v })} />
      </ProxyField>
      <div className="proxy-note">注入 window.chrome，还原真实浏览器</div>
      <ProxyField label="插件伪装">
        <Switch enabled={fingerprint.fakePlugins} onChange={(v) => handleFp({ fakePlugins: v })} />
      </ProxyField>
      <div className="proxy-note">伪造插件列表，避免空列表暴露真实环境</div>
      <ProxyField label="窗口尺寸">
        <Switch enabled={fingerprint.fakeOuterSize} onChange={(v) => handleFp({ fakeOuterSize: v })} />
      </ProxyField>
      <div className="proxy-note">伪装窗口尺寸，匹配分辨率数据避免被检测</div>
      <h3 className="proxy-section-title" id="cookie-section">Cookie</h3>
      <ProxyField label="Cookie" className="proxy-field--top">
        <textarea
          className="proxy-textarea"
          placeholder="name=value; name2=value2..."
          value={cookieText ?? ''}
          onChange={(e) => onChangeCookie?.(e.target.value)}
        />
      </ProxyField>
      <div className="proxy-note">用于登录会话使用，点击底部应用后生效</div>
    </section>
  )
}

import { ipcMain, BrowserWindow, app, net, session } from 'electron'

export function registerSystemIpc(): void {
  ipcMain.handle('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  ipcMain.handle('window:maximize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return
    if (window.isMaximized()) {
      window.unmaximize()
    } else {
      window.maximize()
    }
  })

  ipcMain.handle('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })

  ipcMain.handle('proxy:check', async (_event, config: any) => {
    const { protocol, host, port, username, password } = config || {}
    if (!protocol || protocol === 'no-proxy' || !host || !port) {
      return { ok: false, error: '代理配置不完整' }
    }
    const proxyUrl = username
      ? `${protocol}://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}`
      : `${protocol}://${host}:${port}`

    const tempPartition = `proxy-test-${Date.now()}`
    const tempSession = session.fromPartition(tempPartition)
    await tempSession.setProxy({ proxyRules: proxyUrl })

    const start = Date.now()
    return new Promise((resolve) => {
      const req = net.request({
        url: 'http://httpbin.org/ip',
        session: tempSession,
      })
      req.on('response', (response) => {
        let data = ''
        response.on('data', (chunk) => { data += chunk })
        response.on('end', () => {
          try {
            const json = JSON.parse(data)
            resolve({ ok: true, ip: json.origin, latency: Date.now() - start })
          } catch {
            resolve({ ok: false, error: '响应解析失败' })
          }
        })
      })
      req.on('error', (err: any) => {
        resolve({ ok: false, error: err.message || '连接失败' })
      })
      req.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
      req.end()
      setTimeout(() => {
        req.abort()
        resolve({ ok: false, error: '请求超时 (10s)' })
      }, 10000)
    })
  })

  ipcMain.handle('app:get-version', () => app.getVersion())
}

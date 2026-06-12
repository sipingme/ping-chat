import { net } from 'electron'

let webhookUrl = ''
let webhookEnabled = false

export function setWebhookConfig(url: string, enabled: boolean): void {
  webhookUrl = url
  webhookEnabled = enabled
}

export function getWebhookConfig(): { url: string; enabled: boolean } {
  return { url: webhookUrl, enabled: webhookEnabled }
}

export async function sendWebhook(event: string, payload: any): Promise<void> {
  if (!webhookEnabled || !webhookUrl) return
  try {
    const request = net.request({
      method: 'POST',
      url: webhookUrl,
      headers: { 'Content-Type': 'application/json' },
    })
    request.write(JSON.stringify({ event, data: payload, timestamp: Date.now() }))
    request.end()
  } catch (e) {
    console.error('[Webhook] send failed:', e)
  }
}

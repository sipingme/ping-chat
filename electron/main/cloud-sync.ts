import { net } from 'electron'

let syncUrl = ''
let syncEnabled = false
let syncApiKey = ''

export function setCloudSyncConfig(url: string, apiKey: string, enabled: boolean): void {
  syncUrl = url
  syncApiKey = apiKey
  syncEnabled = enabled
}

export function getCloudSyncConfig(): { url: string; apiKey: string; enabled: boolean } {
  return { url: syncUrl, apiKey: syncApiKey, enabled: syncEnabled }
}

export async function syncData(partition: string, data: any): Promise<boolean> {
  if (!syncEnabled || !syncUrl) return false
  try {
    const request = net.request({
      method: 'POST',
      url: syncUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(syncApiKey ? { 'X-API-Key': syncApiKey } : {}),
      },
    })
    return new Promise((resolve) => {
      request.on('response', (response) => {
        resolve(response.statusCode === 200)
      })
      request.on('error', () => resolve(false))
      request.write(JSON.stringify({ partition, data, timestamp: Date.now() }))
      request.end()
    })
  } catch {
    return false
  }
}

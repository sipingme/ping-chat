import { ipcRenderer } from 'electron'
import { applyAllFingerprints, type FpConfig } from './fingerprint'
import { startAutoReplyScraper } from './scraper'

async function init(): Promise<void> {
  try {
    let partition = await ipcRenderer.invoke('chat:register')
    let retries = 0
    while (!partition && retries < 5) {
      retries++
      console.warn(`[ChatStats] chat:register returned empty, retrying ${retries}/5 in 1000ms...`)
      await new Promise((r) => setTimeout(r, 1000))
      partition = await ipcRenderer.invoke('chat:register')
    }
    if (!partition) {
      console.warn('[ChatStats] partition still empty after initial retries, will poll until available')
      const pollTimer = setInterval(async () => {
        const p = await ipcRenderer.invoke('chat:register')
        if (p) {
          clearInterval(pollTimer)
          console.log('[ChatStats] partition became available:', p)
          startAutoReplyScraper(p)
          const config: FpConfig | null = await ipcRenderer.invoke('fingerprint:get', p)
          if (config) applyAllFingerprints(config, p)
        }
      }, 3000)
      return
    }

    startAutoReplyScraper(partition)

    const config: FpConfig | null = await ipcRenderer.invoke('fingerprint:get', partition)
    if (!config) return

    applyAllFingerprints(config, partition)
  } catch (e) {
    console.error('[FingerprintPreload] init error:', e)
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

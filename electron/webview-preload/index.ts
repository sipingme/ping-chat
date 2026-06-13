import { ipcRenderer } from 'electron'
import { applyAllFingerprints, type FpConfig } from './fingerprint'
import { startAutoReplyScraper } from './scraper'

async function init(): Promise<void> {
  try {
    let partition = await ipcRenderer.invoke('chat:register')
    if (!partition) {
      console.warn('[ChatStats] chat:register returned empty, retrying in 800ms...')
      await new Promise((r) => setTimeout(r, 800))
      partition = await ipcRenderer.invoke('chat:register')
    }
    if (!partition) {
      console.error('[ChatStats] partition is empty after retry, aborting scraper')
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

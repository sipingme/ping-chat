import { webContents } from 'electron'

/**
 * Manages the mapping between webview partitions and their webContents IDs.
 * Cleans up entries when webContents are destroyed to prevent leaks.
 */
export class WebviewRegistry {
  private registry = new Map<string, number>() // partition -> webContentsId
  private partitionMap = new Map<number, string>() // webContentsId -> partition

  register(partition: string, webContentsId: number): void {
    this.registry.set(partition, webContentsId)
    this.partitionMap.set(webContentsId, partition)
    const wc = webContents.fromId(webContentsId)
    if (wc && !wc.isDestroyed()) {
      wc.once('destroyed', () => {
        this.remove(webContentsId)
      })
    }
  }

  remove(webContentsId: number): void {
    const partition = this.partitionMap.get(webContentsId)
    if (partition) {
      this.registry.delete(partition)
      this.partitionMap.delete(webContentsId)
    }
  }

  get(partition: string): number | undefined {
    return this.registry.get(partition)
  }

  getPartition(webContentsId: number): string | undefined {
    return this.partitionMap.get(webContentsId)
  }

  keys(): IterableIterator<string> {
    return this.registry.keys()
  }

  entries(): IterableIterator<[string, number]> {
    return this.registry.entries()
  }

  resolveTarget(partition: string): Electron.WebContents | undefined {
    let id = this.get(partition)
    if (!id) id = this.get('') // guest page fallback
    if (!id) return undefined
    return webContents.fromId(id) ?? undefined
  }
}

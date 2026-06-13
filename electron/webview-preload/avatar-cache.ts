/**
 * LRU cache for avatar base64 data URLs.
 * Prevents redundant fetch+blob+FileReader cycles across polling intervals.
 */
const MAX_CACHE_SIZE = 100
const cache = new Map<string, string>()

export function getCachedAvatar(url: string): string | undefined {
  return cache.get(url)
}

export function setCachedAvatar(url: string, base64: string): void {
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value as string
    cache.delete(firstKey)
  }
  cache.set(url, base64)
}

export async function fetchAvatarBase64(avatarUrl: string): Promise<string> {
  const cached = cache.get(avatarUrl)
  if (cached) return cached

  const res = await fetch(avatarUrl)
  if (!res.ok) {
    throw new Error(`Avatar fetch failed: ${res.status}`)
  }
  const blob = await res.blob()
  const base64 = await new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.readAsDataURL(blob)
  })

  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value as string
    cache.delete(firstKey)
  }
  cache.set(avatarUrl, base64)
  return base64
}

export function clearAvatarCache(): void {
  cache.clear()
}

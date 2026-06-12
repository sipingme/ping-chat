import { useEffect, useRef, useState } from 'react'

interface PerformanceData {
  memoryUsedMB: number
  memoryTotalMB: number
  usagePercent: number
  domNodes: number
  fps: number
  responseMs: number
  webviewCount: number
  longTasks: number
  timestamp: number
}

function measureResponseTime(): Promise<number> {
  return new Promise((resolve) => {
    const start = performance.now()
    setTimeout(() => {
      const end = performance.now()
      resolve(Math.round(end - start - 16)) // subtract expected 16ms frame
    }, 0)
  })
}

export function usePerformance(interval = 30000): PerformanceData | null {
  const [data, setData] = useState<PerformanceData | null>(null)
  const lastDataRef = useRef<PerformanceData | null>(null)
  const fpsRef = useRef(0)
  const frameCountRef = useRef(0)
  const longTaskCountRef = useRef(0)

  useEffect(() => {
    // FPS counter via requestAnimationFrame
    let lastFpsTime = performance.now()
    let rafId = 0
    const countFrame = () => {
      frameCountRef.current++
      const now = performance.now()
      if (now - lastFpsTime >= 1000) {
        fpsRef.current = frameCountRef.current
        frameCountRef.current = 0
        lastFpsTime = now
      }
      rafId = requestAnimationFrame(countFrame)
    }
    rafId = requestAnimationFrame(countFrame)

    // Long task observer (>50ms blocks main thread)
    let longTaskObserver: PerformanceObserver | null = null
    if ('PerformanceObserver' in window) {
      try {
        longTaskObserver = new PerformanceObserver((list) => {
          longTaskCountRef.current += list.getEntries().length
        })
        longTaskObserver.observe({ entryTypes: ['longtask'] })
      } catch {
        // browser may not support longtask
      }
    }

    const update = async () => {
      const perf = (performance as any).memory
      const memoryUsedMB = perf ? Math.round(perf.usedJSHeapSize / 1024 / 1024) : 0
      const memoryTotalMB = perf ? Math.round(perf.totalJSHeapSize / 1024 / 1024) : 0
      const usagePercent = Math.round((memoryUsedMB / 100) * 100)
      const domNodes = document.querySelectorAll('*').length
      const responseMs = await measureResponseTime()
      const webviewCount = document.querySelectorAll('webview, iframe').length
      const longTasks = longTaskCountRef.current

      const next: PerformanceData = {
        memoryUsedMB,
        memoryTotalMB,
        usagePercent,
        domNodes,
        fps: fpsRef.current,
        responseMs,
        webviewCount,
        longTasks,
        timestamp: Date.now(),
      }

      const last = lastDataRef.current
      if (!last ||
          last.memoryUsedMB !== next.memoryUsedMB ||
          last.memoryTotalMB !== next.memoryTotalMB ||
          last.domNodes !== next.domNodes ||
          last.fps !== next.fps ||
          last.responseMs !== next.responseMs ||
          last.webviewCount !== next.webviewCount ||
          last.longTasks !== next.longTasks) {
        lastDataRef.current = next
        setData(next)
      }
    }
    update()
    const id = setInterval(update, interval)
    return () => {
      clearInterval(id)
      cancelAnimationFrame(rafId)
      longTaskObserver?.disconnect()
    }
  }, [interval])

  return data
}

import { useEffect, useState } from 'react'

interface PerformanceData {
  memoryUsedMB: number
  memoryTotalMB: number
  domNodes: number
  eventListeners: number
  timestamp: number
}

export function usePerformance(interval = 5000): PerformanceData | null {
  const [data, setData] = useState<PerformanceData | null>(null)

  useEffect(() => {
    const update = () => {
      const perf = (performance as any).memory
      setData({
        memoryUsedMB: perf ? Math.round(perf.usedJSHeapSize / 1024 / 1024) : 0,
        memoryTotalMB: perf ? Math.round(perf.totalJSHeapSize / 1024 / 1024) : 0,
        domNodes: document.querySelectorAll('*').length,
        eventListeners: 0,
        timestamp: Date.now(),
      })
    }
    update()
    const id = setInterval(update, interval)
    return () => clearInterval(id)
  }, [interval])

  return data
}

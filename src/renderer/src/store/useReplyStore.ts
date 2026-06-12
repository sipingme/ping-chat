import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AutoReplyConfig } from '../types'
import { defaultAutoReplyConfig } from '../config/defaults'

interface ReplyState {
  enabled: boolean
  setEnabled: (v: boolean) => void
  monitoringEnabled: boolean
  setMonitoringEnabled: (v: boolean) => void
  processing: boolean
  setProcessing: (v: boolean) => void
  processedCount: number
  incrementProcessedCount: () => void
  target: string
  setTarget: (v: string) => void
  mode: 'global' | 'single'
  setMode: (v: 'global' | 'single') => void
  config: AutoReplyConfig
  updateConfig: (updates: Partial<AutoReplyConfig>) => void
}

export const useReplyStore = create<ReplyState>()(
  persist(
    (set) => ({
      enabled: false,
      setEnabled: (v) => set({ enabled: v }),
      monitoringEnabled: false,
      setMonitoringEnabled: (v) => set({ monitoringEnabled: v }),
      processing: false,
      setProcessing: (v) => set({ processing: v }),
      processedCount: 0,
      incrementProcessedCount: () => set((state) => ({ processedCount: state.processedCount + 1 })),
      target: '',
      setTarget: (v) => set({ target: v }),
      mode: 'global',
      setMode: (v) => set({ mode: v }),
      config: defaultAutoReplyConfig,
      updateConfig: (updates) => set((state) => ({ config: { ...state.config, ...updates } })),
    }),
    {
      name: 'reply-store',
      partialize: (state) => ({
        enabled: state.enabled,
        monitoringEnabled: state.monitoringEnabled,
        target: state.target,
        mode: state.mode,
        config: state.config,
      }),
    }
  )
)

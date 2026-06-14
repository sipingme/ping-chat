import { useCallback, useEffect, useRef, useState } from 'react'
import type { AutoReplyConfig, ChatMessage, ChatSession, ChatStats } from '../types'
import { interpolateTemplateVars } from '../config/defaults'
import { handleCommand } from '../utils/commandHandler'
import { pluginManager } from '../utils/pluginManager'
import { LLMService, buildMessages } from '../services/llmService'
import { useAppStore } from '../store/appStore'
import {
  getConversationForLLM,
  getPendingUserMessages,
  isMessagePending,
  makeSelfReply,
  messageKey,
  seedProcessedKeys,
} from '../utils/conversationUtils'

interface AutoReplyEngineDeps {
  autoReplyConfig: AutoReplyConfig
  autoReplyEnabled: boolean
  autoReplyMode: 'global' | 'single'
  autoReplyTarget: string
  setAutoReplyTarget: (v: string) => void
  sessions: ChatSession[]
  autoReplyMessages: ChatMessage[]
  setAutoReplyMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  getChatStats: (partition: string) => ChatStats | undefined
  getChatMessages: (partition: string) => ChatMessage[]
  clearChatMessages: () => void
  setAutoReplyGlobalGenerating: (v: boolean) => void
  setAutoReplyGlobalError: (v: string | null) => void
}

interface AutoReplyEngine {
  autoReplyProcessing: boolean
  processedCount: number
  recentReplyLogs: Array<{ id: string; type: string; content: string; contact: string }>
  replyCountdown: number | null
  enqueueAutoReplyMessage: (message?: ChatMessage) => void
  pollUnreadContacts: () => Promise<void>
  clearJsMemory: () => void
}

export function useAutoReplyEngine(deps: AutoReplyEngineDeps): AutoReplyEngine {
  const {
    autoReplyConfig,
    autoReplyEnabled,
    autoReplyMode,
    autoReplyTarget,
    setAutoReplyTarget,
    sessions,
    autoReplyMessages,
    setAutoReplyMessages,
    getChatStats,
    getChatMessages,
    clearChatMessages,
    setAutoReplyGlobalGenerating,
    setAutoReplyGlobalError,
  } = deps

  /* ── Refs (keep latest values accessible in async closures) ── */
  const configRef = useRef(autoReplyConfig)
  configRef.current = autoReplyConfig
  const enabledRef = useRef(autoReplyEnabled)
  enabledRef.current = autoReplyEnabled
  const modeRef = useRef(autoReplyMode)
  modeRef.current = autoReplyMode
  const targetRef = useRef(autoReplyTarget)
  targetRef.current = autoReplyTarget
  const setTargetRef = useRef(setAutoReplyTarget)
  setTargetRef.current = setAutoReplyTarget
  const sessionsRef = useRef(sessions)
  sessionsRef.current = sessions
  const messagesRef = useRef(autoReplyMessages)
  messagesRef.current = autoReplyMessages

  /* ── Queue state ── */
  const pendingQueueRef = useRef<ChatMessage[]>([])
  const isProcessingRef = useRef(false)
  const isHandlingRef = useRef(false)
  const isPollingRef = useRef(false)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastEnqueuedIndexRef = useRef(-1)
  const processedKeysRef = useRef(new Set<string>())
  const processedContactsRef = useRef<Set<string>>(new Set())
  const globalDelayStartRef = useRef(Date.now())
  const globalPendingPartitionRef = useRef<string | null>(null)
  const llmServiceRef = useRef(new LLMService(autoReplyConfig))

  const [autoReplyProcessing, setAutoReplyProcessing] = useState(false)
  const [processedCount, setProcessedCount] = useState(0)
  const [recentReplyLogs, setRecentReplyLogs] = useState<Array<{ id: string; type: string; content: string; contact: string }>>([])
  const [replyCountdown, setReplyCountdown] = useState<number | null>(null)

  const processedCountRef = useRef(processedCount)
  processedCountRef.current = processedCount

  // Keep LLM config in sync
  llmServiceRef.current.updateConfig(autoReplyConfig)

  const recordSelfReply = (partition: string, content: string): void => {
    useAppStore.getState().appendChatMessage(partition, makeSelfReply(partition, content))
  }

  /* ── Core message handler (plain fn, reads state via refs) ── */
  const handleQueuedMessage = async (message: ChatMessage): Promise<void> => {
    if (isHandlingRef.current) return
    isHandlingRef.current = true
    const messageKeyStr = messageKey(message)
    try {
      const config = configRef.current
      if (!config?.apiKey) return

      if (message.isGroup) {
        console.log('[AutoReply] ignoring group message from', message.sender)
        return
      }

      // Gatekeeper: reject if sender is not in chat stats (e.g. official account or stats not ready)
      const stats = getChatStats(message.partition)
      if (!stats) {
        console.log('%c[AutoReply]', 'color: #ff9800; font-weight: bold', 'stats not ready, skipping message from:', message.sender)
        return
      }
      const contact = stats.contacts?.find((c: any) => c.name === message.sender)
      const group = stats.groups?.find((g: any) => g.name === message.sender)
      if (!contact && !group) {
        console.log('%c[AutoReply]', 'color: #ff9800; font-weight: bold', 'skipping unknown contact (likely official account):', message.sender,
          'stats contacts=', stats.contacts?.map((c: any) => c.name),
          'stats groups=', stats.groups?.map((g: any) => g.name))
        return
      }
      if (contact?.isGroup) {
        console.log('[AutoReply] ignoring group contact (via stats):', message.sender)
        return
      }

      try {
        await window.pingChat.selectChat(message.partition, message.sender)
        // Sync target so single mode shows the currently selected user
        setTargetRef.current(message.sender)
      } catch (selectErr) {
        console.error('[AutoReply] selectChat failed, re-queuing message:', selectErr)
        // Re-queue: push back to front so it gets retried
        pendingQueueRef.current.unshift(message)
        processedKeysRef.current.delete(messageKeyStr)
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 500))

      if (config.blacklist.length > 0 && config.blacklist.some((b) => message.sender.includes(b))) {
        return
      }

      if (config.enablePlugins && config.pluginRules.length > 0) {
        pluginManager.loadRules(config.pluginRules)
        const pluginReply = pluginManager.onMessage({ sender: message.sender, content: message.content, isFromUser: message.isFromUser })
        if (pluginReply) {
          try {
            await window.pingChat.sendReply(message.partition, pluginReply, config.autoSend)
            if (config.autoSend) recordSelfReply(message.partition, pluginReply)
          } catch (e) {
            console.error('[AutoReply] plugin sendReply failed:', e)
          }
          return
        }
      }

      if (config.enableCommands) {
        const cmdResult = handleCommand(message.content, {
          autoReplyEnabled: enabledRef.current,
          processedCount: processedCountRef.current,
          platform: message.partition.split(':')[1]?.split('-')[0] || 'unknown',
        })
        if (cmdResult.handled && cmdResult.reply) {
          try {
            await window.pingChat.sendReply(message.partition, cmdResult.reply, config.autoSend)
            recordSelfReply(message.partition, cmdResult.reply)
          } catch (e) {
            console.error('[AutoReply] command sendReply failed:', e)
          }
          return
        }
      }

      if (config.keywords.length > 0 && config.keywords.some((k) => message.content.includes(k))) {
        const keywordReply = interpolateTemplateVars(config.keywordResponse, { contactName: message.sender, partition: message.partition })
        try {
          await window.pingChat.sendReply(message.partition, keywordReply, config.autoSend)
          if (config.autoSend) recordSelfReply(message.partition, keywordReply)
        } catch (e) {
          console.error('[AutoReply] keyword sendReply failed:', e)
        }
        window.pingChat.logReply({
          timestamp: Date.now(),
          partition: message.partition,
          platform: message.partition.split(':')[1]?.split('-')[0] || 'unknown',
          contact: message.sender,
          content: keywordReply,
          type: 'keyword',
          success: true,
        }).then((entry: any) => {
          if (entry?.id) {
            setRecentReplyLogs((prev) => [{ id: entry.id, type: 'keyword', content: keywordReply, contact: message.sender }, ...prev.slice(0, 19)])
          }
        })
        return
      }

      // Start LLM generation — notify UI
      setAutoReplyGlobalGenerating(true)

      const history = getConversationForLLM(
        getChatMessages(message.partition) || [],
        message.sender,
        message.partition
      )
      const msgs = buildMessages(history, config)

      try {
        const reply = await llmServiceRef.current.generateReply(msgs)
        if (reply) {
          if (config.autoSend) {
            const interpolatedReply = interpolateTemplateVars(reply, { contactName: message.sender, partition: message.partition })
            try {
              await window.pingChat.sendReply(message.partition, interpolatedReply, config.autoSend)
              recordSelfReply(message.partition, interpolatedReply)
            } catch (e) {
              console.error('[AutoReply] AI sendReply failed:', e)
            }
            window.pingChat.logReply({
              timestamp: Date.now(),
              partition: message.partition,
              platform: message.partition.split(':')[1]?.split('-')[0] || 'unknown',
              contact: message.sender,
              content: reply,
              type: 'ai',
              success: true,
              model: config.model,
            }).then((entry: any) => {
              if (entry?.id) {
                setRecentReplyLogs((prev) => [{ id: entry.id, type: 'ai', content: reply, contact: message.sender }, ...prev.slice(0, 19)])
              }
            })
          } else {
            globalPendingPartitionRef.current = message.partition
          }
        }
      } catch (err: any) {
        console.error('[AutoReply] AI generation failed:', err)
        window.pingChat.logReply({
          timestamp: Date.now(),
          partition: message.partition,
          platform: message.partition.split(':')[1]?.split('-')[0] || 'unknown',
          contact: message.sender,
          content: '',
          type: 'ai',
          success: false,
          error: err?.message || String(err),
          model: config.model,
        }).then((entry: any) => {
          if (entry?.id) {
            setRecentReplyLogs((prev) => [{ id: entry.id, type: 'ai', content: '', contact: message.sender }, ...prev.slice(0, 19)])
          }
        })
      }
    } finally {
      isHandlingRef.current = false
      setAutoReplyGlobalGenerating(false)
      // Mark this message as handled so pollUnreadContacts won't re-process it
      processedKeysRef.current.add(messageKeyStr)
    }
  }

  /* ── Queue processing (plain fns, read/write via refs) ── */
  const processSingleMessage = async (): Promise<void> => {
    const config = configRef.current
    if (config?.delaySeconds > 0) {
      const delayMs = config.delaySeconds * 1000
      await new Promise<void>((resolve) => {
        const timer = setInterval(() => {
          const elapsed = Date.now() - globalDelayStartRef.current
          const remaining = Math.max(0, Math.ceil((delayMs - elapsed) / 1000))
          setReplyCountdown(remaining)
          if (elapsed >= delayMs || !enabledRef.current) {
            clearInterval(timer)
            setReplyCountdown(null)
            resolve()
          }
        }, 200)
      })
    }
    if (!enabledRef.current) return
    const nextMessage = pendingQueueRef.current.shift()
    if (!nextMessage) return

    // Batch: remove subsequent messages from same sender in queue
    // to avoid duplicate LLM requests. The messages remain in chat history.
    for (let i = pendingQueueRef.current.length - 1; i >= 0; i--) {
      const m = pendingQueueRef.current[i]
      if (m.sender === nextMessage.sender && m.partition === nextMessage.partition) {
        console.log('[AutoReply] batching msg for', m.sender, ':', m.content.slice(0, 30), '(still in history, skipping duplicate LLM request)')
        pendingQueueRef.current.splice(i, 1)
      }
    }

    await handleQueuedMessage(nextMessage)
  }

  const startQueueProcessing = (): void => {
    if (isProcessingRef.current) return
    isProcessingRef.current = true
    setAutoReplyProcessing(true)
    void (async () => {
      try {
        while (enabledRef.current && pendingQueueRef.current.length > 0) {
          await processSingleMessage()
        }
        if (!enabledRef.current) {
          pendingQueueRef.current.length = 0
        }
      } finally {
        isProcessingRef.current = false
        setAutoReplyProcessing(false)
        if (pendingQueueRef.current.length > 0 && enabledRef.current) {
          startQueueProcessing()
        }
      }
    })()
  }

  const enqueueAutoReplyMessage = (message?: ChatMessage): void => {
    if (!enabledRef.current) return
    if (modeRef.current !== 'global') return
    if (!message) return
    if (message.historical) return
    if (globalPendingPartitionRef.current && !message.isFromUser && message.partition === globalPendingPartitionRef.current) {
      globalPendingPartitionRef.current = null
      return
    }
    if (!message.isFromUser) return

    const key = messageKey(message)
    if (processedKeysRef.current.has(key)) return

    const storeMsgs = getChatMessages(message.partition) || []
    if (!isMessagePending(storeMsgs, message)) {
      processedKeysRef.current.add(key)
      console.log('[AutoReply] skipping already-replied message from', message.sender, message.content.slice(0, 30))
      return
    }

    if (message.isGroup) {
      console.log('[AutoReply] ignoring group message from', message.sender)
      return
    }

    // Gatekeeper: reject if sender is not in chat stats (e.g. official account or stats not ready)
    const statsCheck = getChatStats(message.partition)
    if (!statsCheck) {
      console.log('%c[AutoReply]', 'color: #ff9800; font-weight: bold', 'stats not ready, deferring message:', message.sender)
      return
    }
    const contactCheck = statsCheck.contacts?.find((c: any) => c.name === message.sender)
    const groupCheck = statsCheck.groups?.find((g: any) => g.name === message.sender)
    if (!contactCheck && !groupCheck) {
      console.log('%c[AutoReply]', 'color: #ff9800; font-weight: bold', 'ignoring unknown contact (likely official account):', message.sender,
        'stats contacts=', statsCheck.contacts?.map((c: any) => c.name),
        'stats groups=', statsCheck.groups?.map((g: any) => g.name))
      return
    }
    if (contactCheck?.isGroup) {
      console.log('[AutoReply] ignoring group contact (via stats enqueue):', message.sender)
      return
    }

    processedKeysRef.current.add(key)
    setProcessedCount((count) => count + 1)
    pendingQueueRef.current.push(message)
    globalDelayStartRef.current = Date.now()
    startQueueProcessing()
  }

  /* ── Global polling ── */
  const pollUnreadContacts = useCallback(async (): Promise<void> => {
    if (!enabledRef.current || modeRef.current !== 'global' || isPollingRef.current) return
    isPollingRef.current = true
    setAutoReplyGlobalError(null)
    try {
      for (const session of sessionsRef.current) {
        if (!session.partition) continue

        // Collect contacts to process: from stats (unread > 0) and from message store (unreplied user messages)
        const contactsToProcess: Array<{ name: string; isGroup: boolean }> = []
        const stats = getChatStats(session.partition)
        if (stats?.unreadContacts?.length) {
          for (const c of stats.unreadContacts) {
            if (!c.isGroup && c.unread > 0 && !contactsToProcess.some((p) => p.name === c.name)) {
              contactsToProcess.push(c)
            }
          }
        }

        // Fallback: check store for contacts with unreplied user messages
        const storeMsgs = getChatMessages(session.partition) || []
        if (stats?.contacts?.length) {
          for (const c of stats.contacts) {
            if (c.isGroup) continue
            if (contactsToProcess.some((p) => p.name === c.name)) continue
            const pending = getPendingUserMessages(storeMsgs, c.name)
            if (pending.length > 0) {
              contactsToProcess.push({ name: c.name, isGroup: false })
            }
          }
        }

        if (contactsToProcess.length === 0) continue

        for (const contact of contactsToProcess) {
          if (!enabledRef.current || modeRef.current !== 'global') break
          const key = `${session.partition}:${contact.name}`
          if (processedContactsRef.current.has(key)) continue

          await window.pingChat.selectChat(session.partition, contact.name)
          setTargetRef.current(contact.name)
          processedContactsRef.current.add(key)
          await new Promise((r) => setTimeout(r, 800))
          const msgs = getChatMessages(session.partition) || []
          const pending = getPendingUserMessages(msgs, contact.name)
          if (pending.length === 0) continue
          const lastMsg = pending[pending.length - 1]
          const msgKey = messageKey(lastMsg)
          if (processedKeysRef.current.has(msgKey)) {
            console.log('[AutoReply] msg already handled, skipping LLM for', contact.name)
            continue
          }
          processedKeysRef.current.add(msgKey)
          setProcessedCount((count) => count + 1)
          const config = configRef.current
          if (config?.delaySeconds > 0) {
            globalDelayStartRef.current = Date.now()
            const delayMs = config.delaySeconds * 1000
            await new Promise<void>((resolve) => {
              const timer = setInterval(() => {
                const elapsed = Date.now() - globalDelayStartRef.current
                const remaining = Math.max(0, Math.ceil((delayMs - elapsed) / 1000))
                setReplyCountdown(remaining)
                if (elapsed >= delayMs || !enabledRef.current) {
                  clearInterval(timer)
                  setReplyCountdown(null)
                  resolve()
                }
              }, 200)
            })
          }
          try {
            await handleQueuedMessage(lastMsg)
          } catch (e: any) {
            console.error('[AutoReply] global mode error:', e)
            setAutoReplyGlobalError(e?.message || '自动回复处理失败')
          }
          await new Promise((r) => setTimeout(r, 1000))
        }
      }
    } finally {
      isPollingRef.current = false
      // Reset per-cycle contact dedup so future polls can re-select contacts with new messages
      processedContactsRef.current.clear()
    }
  }, [getChatStats, getChatMessages, setAutoReplyGlobalGenerating, setAutoReplyGlobalError])

  /* ── Memory cleanup ── */
  const clearJsMemory = useCallback((): void => {
    setAutoReplyMessages([])
    lastEnqueuedIndexRef.current = -1
    processedKeysRef.current.clear()
    processedContactsRef.current.clear()
    setRecentReplyLogs([])
    clearChatMessages()
    setProcessedCount(0)
    pendingQueueRef.current.length = 0
    console.log('[Memory] cleared')
  }, [setAutoReplyMessages, clearChatMessages])

  /* ── Side effects ── */
  const seedAllContacts = useCallback((): void => {
    for (const session of sessionsRef.current) {
      if (!session.partition) continue
      const stats = getChatStats(session.partition)
      const msgs = getChatMessages(session.partition) || []
      const contactNames = (stats?.contacts ?? [])
        .filter((c: { isGroup: boolean }) => !c.isGroup)
        .map((c: { name: string }) => c.name)
      if (contactNames.length > 0) {
        seedProcessedKeys(processedKeysRef.current, msgs, contactNames)
      }
    }
  }, [getChatStats, getChatMessages])

  // On enable: seed processed keys from store (covers toggle off → on)
  useEffect(() => {
    if (!autoReplyEnabled) return
    seedAllContacts()
  }, [autoReplyEnabled, seedAllContacts])

  useEffect(() => {
    if (!autoReplyEnabled) return
    const start = lastEnqueuedIndexRef.current + 1
    for (let i = start; i < autoReplyMessages.length; i++) {
      enqueueAutoReplyMessage(autoReplyMessages[i])
    }
    lastEnqueuedIndexRef.current = autoReplyMessages.length - 1
  }, [autoReplyMessages, autoReplyEnabled])

  useEffect(() => {
    if (!autoReplyEnabled || autoReplyMode !== 'global') {
      isPollingRef.current = false
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
      return
    }
    // Reset enqueue index so messages that arrived during single mode get re-processed
    lastEnqueuedIndexRef.current = -1
    const start = lastEnqueuedIndexRef.current + 1
    for (let i = start; i < autoReplyMessages.length; i++) {
      enqueueAutoReplyMessage(autoReplyMessages[i])
    }
    lastEnqueuedIndexRef.current = autoReplyMessages.length - 1
    void pollUnreadContacts()
    pollTimerRef.current = setInterval(() => {
      void pollUnreadContacts()
    }, 3000)
    return () => {
      isPollingRef.current = false
      processedContactsRef.current.clear()
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }
  }, [autoReplyEnabled, autoReplyMode, pollUnreadContacts])

  useEffect(() => {
    if (autoReplyEnabled) return
    pendingQueueRef.current.length = 0
    if (isProcessingRef.current) {
      isProcessingRef.current = false
      setAutoReplyProcessing(false)
    }
  }, [autoReplyEnabled])

  return {
    autoReplyProcessing,
    processedCount,
    recentReplyLogs,
    replyCountdown,
    enqueueAutoReplyMessage,
    pollUnreadContacts,
    clearJsMemory,
  }
}

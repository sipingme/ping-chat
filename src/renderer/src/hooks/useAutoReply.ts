import { useRef, useCallback } from 'react'
import type { ChatMessage, AutoReplyConfig } from '../types'
import { handleCommand } from '../utils/commandHandler'
import { pluginManager } from '../utils/pluginManager'
import { interpolateTemplateVars } from '../config/defaults'

export function useAutoReplyQueue({
  onSendReply,
  onLogReply,
  onProcessed,
}: {
  onSendReply: (partition: string, content: string, autoSend?: boolean) => void
  onLogReply: (entry: any) => Promise<any>
  onProcessed: () => void
}) {
  const pendingQueueRef = useRef<ChatMessage[]>([])
  const isProcessingQueueRef = useRef(false)
  const processedReplyKeys = useRef(new Set<string>())

  const processQueue = useCallback(async (config: AutoReplyConfig, context: { enabled: boolean; mode: 'global' | 'single'; target: string; processedCount: number; contact?: { isGroup: boolean } }) => {
    if (isProcessingQueueRef.current) return
    if (!config.apiKey) return
    isProcessingQueueRef.current = true
    try {
      while (pendingQueueRef.current.length > 0) {
        const message = pendingQueueRef.current[0]
        if (!message) break

        const key = `${message.partition}:${message.sender}:${message.content}:${message.timestamp}`
        if (processedReplyKeys.current.has(key)) {
          pendingQueueRef.current.shift()
          continue
        }

        // Blacklist check
        if (config.blacklist.length > 0 && config.blacklist.some((b) => message.sender.includes(b))) {
          pendingQueueRef.current.shift()
          continue
        }

        // Plugin hook
        if (config.enablePlugins && config.pluginRules.length > 0) {
          pluginManager.loadRules(config.pluginRules)
          const pluginReply = pluginManager.onMessage({ sender: message.sender, content: message.content, isFromUser: message.isFromUser })
          if (pluginReply) {
            onSendReply(message.partition, pluginReply, config.autoSend)
            pendingQueueRef.current.shift()
            continue
          }
        }

        // Command handler
        if (config.enableCommands) {
          const cmdResult = handleCommand(message.content, {
            autoReplyEnabled: context.enabled,
            processedCount: context.processedCount,
            platform: message.partition.split(':')[1]?.split('-')[0] || 'unknown',
          })
          if (cmdResult.handled && cmdResult.reply) {
            onSendReply(message.partition, cmdResult.reply, config.autoSend)
            pendingQueueRef.current.shift()
            continue
          }
        }

        // Keywords
        if (config.keywords.length > 0 && config.keywords.some((k) => message.content.includes(k))) {
          const keywordReply = interpolateTemplateVars(config.keywordResponse, { contactName: message.sender, partition: message.partition })
          onSendReply(message.partition, keywordReply, config.autoSend)
          onLogReply({
            timestamp: Date.now(),
            partition: message.partition,
            platform: message.partition.split(':')[1]?.split('-')[0] || 'unknown',
            contact: message.sender,
            content: keywordReply,
            type: 'keyword',
            success: true,
          })
          pendingQueueRef.current.shift()
          onProcessed()
          processedReplyKeys.current.add(key)
          continue
        }

        // AI reply (placeholder — caller should provide AI generation)
        pendingQueueRef.current.shift()
        processedReplyKeys.current.add(key)
        onProcessed()
      }
    } finally {
      isProcessingQueueRef.current = false
    }
  }, [onSendReply, onLogReply, onProcessed])

  const enqueue = useCallback((message: ChatMessage, config: AutoReplyConfig, context: { enabled: boolean; mode: 'global' | 'single'; target: string; processedCount: number; contact?: { isGroup: boolean } }) => {
    if (!config.apiKey) return

    // Group checks
    if (context.contact?.isGroup) {
      if (config.groupWhitelist.length) {
        if (!config.groupWhitelist.some((w) => message.sender.includes(w))) return
      } else if (config.groupBlacklist.length) {
        if (config.groupBlacklist.some((b) => message.sender.includes(b))) return
      } else {
        return
      }
      if (config.mentionOnly) {
        const mentionPattern = config.myNickname ? new RegExp(`@${config.myNickname}|@所有人|@all`, 'i') : /@所有人|@all/i
        if (!mentionPattern.test(message.content)) return
      }
    }

    if (context.mode === 'single') return

    const key = `${message.partition}:${message.sender}:${message.content}:${message.timestamp}`
    if (processedReplyKeys.current.has(key)) return
    processedReplyKeys.current.add(key)
    pendingQueueRef.current.push(message)
    processQueue(config, context)
  }, [processQueue])

  return { enqueue, processQueue, pendingQueueRef, processedReplyKeys }
}

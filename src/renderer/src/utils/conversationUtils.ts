import type { ChatMessage } from '../types'

export function messageKey(m: Pick<ChatMessage, 'partition' | 'sender' | 'content' | 'timestamp'>): string {
  return `${m.partition}:${m.sender}:${m.content}:${m.timestamp}`
}

type TimelineEntry = { msg: ChatMessage; idx: number }

/** Sort by timestamp; tie-break with store append order (critical for bulk DOM parse). */
function sortTimeline(messages: ChatMessage[]): TimelineEntry[] {
  return messages
    .map((msg, idx) => ({ msg, idx }))
    .sort((a, b) => a.msg.timestamp - b.msg.timestamp || a.idx - b.idx)
}

/** Dedup user messages from the same contact (absorb Date.now() jitter on DOM re-parse). */
export function dedupeUserMessages(messages: ChatMessage[], contactName: string): ChatMessage[] {
  const seen = new Set<string>()
  const result: ChatMessage[] = []
  for (const { msg } of sortTimeline(messages)) {
    if (msg.sender !== contactName || !msg.isFromUser) continue
    const bucket = Math.floor(msg.timestamp / 30000)
    const key = `${msg.sender}:${msg.content}:${bucket}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push(msg)
  }
  return result
}

/**
 * User messages from contactName that still need a reply.
 * Uses timeline order (timestamp + append index), not timestamp alone.
 */
export function getPendingUserMessages(allMsgs: ChatMessage[], contactName: string): ChatMessage[] {
  const timeline = sortTimeline(allMsgs)

  let lastUserIdx = -1
  for (let i = timeline.length - 1; i >= 0; i--) {
    const { msg } = timeline[i]
    if (msg.sender === contactName && msg.isFromUser && !msg.isGroup) {
      lastUserIdx = i
      break
    }
  }
  if (lastUserIdx === -1) return []

  // Already replied if any self message appears after the last user message in timeline
  for (let i = lastUserIdx + 1; i < timeline.length; i++) {
    if (!timeline[i].msg.isFromUser) return []
  }

  // Pending block starts after the last self reply before lastUserIdx
  let startIdx = lastUserIdx
  for (let i = lastUserIdx - 1; i >= 0; i--) {
    const { msg } = timeline[i]
    if (!msg.isFromUser) {
      startIdx = i + 1
      break
    }
    if (msg.sender === contactName && msg.isFromUser) {
      startIdx = i
    }
  }

  const pending: ChatMessage[] = []
  const seen = new Set<string>()
  for (let i = startIdx; i <= lastUserIdx; i++) {
    const { msg } = timeline[i]
    if (msg.sender !== contactName || !msg.isFromUser) continue
    const bucket = Math.floor(msg.timestamp / 30000)
    const key = `${msg.sender}:${msg.content}:${bucket}`
    if (seen.has(key)) continue
    seen.add(key)
    pending.push(msg)
  }
  return pending
}

/** Interleaved user + self messages for LLM context (since last reply before pending block). */
export function getConversationForLLM(
  allMsgs: ChatMessage[],
  contactName: string,
  partition: string
): ChatMessage[] {
  const partitionMsgs = allMsgs.filter((m) => m.partition === partition && !m.isGroup)
  const timeline = sortTimeline(partitionMsgs)
  const pending = getPendingUserMessages(partitionMsgs, contactName)

  if (timeline.length === 0) return []

  let firstPendingIdx: number
  if (pending.length > 0) {
    const first = pending[0]
    firstPendingIdx = timeline.findIndex(
      (e) =>
        e.msg.sender === first.sender &&
        e.msg.content === first.content &&
        e.msg.timestamp === first.timestamp
    )
    if (firstPendingIdx === -1) firstPendingIdx = timeline.length - 1
  } else {
    // Manual generate: anchor at last user message from contact
    firstPendingIdx = -1
    for (let i = timeline.length - 1; i >= 0; i--) {
      if (timeline[i].msg.sender === contactName && timeline[i].msg.isFromUser) {
        firstPendingIdx = i
        break
      }
    }
    if (firstPendingIdx === -1) return []
  }

  let cutoffIdx = -1
  for (let i = firstPendingIdx - 1; i >= 0; i--) {
    if (!timeline[i].msg.isFromUser) {
      cutoffIdx = i
      break
    }
  }

  return timeline
    .slice(cutoffIdx + 1)
    .map((e) => e.msg)
    .filter((m) => m.sender === contactName || !m.isFromUser)
}

/** Whether a user message is in the current pending list for its sender. */
export function isMessagePending(allMsgs: ChatMessage[], message: ChatMessage): boolean {
  if (!message.isFromUser) return false
  const pending = getPendingUserMessages(allMsgs, message.sender)
  const key = messageKey(message)
  return pending.some((p) => messageKey(p) === key)
}

/** Append a self reply to the store (manual/auto send from app). */
export function makeSelfReply(partition: string, content: string): ChatMessage {
  return {
    partition,
    sender: '我',
    content,
    isFromUser: false,
    timestamp: Date.now(),
  }
}

/** Mark all non-pending user messages as processed (used when enabling auto-reply). */
export function seedProcessedKeys(
  processedKeys: Set<string>,
  allMsgs: ChatMessage[],
  contactNames: string[]
): void {
  for (const contactName of contactNames) {
    const pending = getPendingUserMessages(allMsgs, contactName)
    const pendingKeys = new Set(pending.map((m) => messageKey(m)))
    for (const m of allMsgs) {
      if (m.sender !== contactName || !m.isFromUser) continue
      const key = messageKey(m)
      if (!pendingKeys.has(key)) {
        processedKeys.add(key)
      }
    }
  }
}

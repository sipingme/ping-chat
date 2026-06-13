import type { AutoReplyConfig, ChatMessage } from '../types'
import { buildSystemPrompt } from '../config/defaults'
import { createLogger } from '../../../shared/logger'

const log = createLogger('LLM')

export interface LLMRequestConfig {
  apiKey: string
  endpoint: string
  model: string
  systemPrompt: string
  role: string
  tone: string
  length: string
  salutation: string
  allowEmoji: boolean
  temperature: number
  maxTokens: number
  topP: number
  frequencyPenalty: number
  presencePenalty: number
  contextRounds: number
}

export interface LLMServiceOptions {
  /** 额外追加到 system prompt 后的指令 */
  extraPrompt?: string
  /** 无历史时追加的引导消息 */
  fallbackMessage?: string
}

/** Retryable HTTP status codes */
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504])

/** Maximum retry attempts including initial call */
const MAX_RETRIES = 3

/** Base delay in ms for exponential backoff */
const BASE_RETRY_DELAY_MS = 1000

/** Max delay cap in ms */
const MAX_RETRY_DELAY_MS = 10000

/** Default request timeout in ms */
const DEFAULT_TIMEOUT_MS = 30000

function buildBody(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  config: LLMRequestConfig,
): string {
  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    temperature: config.temperature,
  }
  if (config.maxTokens > 0) body.max_tokens = config.maxTokens
  if (config.topP < 1) body.top_p = config.topP
  if (config.frequencyPenalty !== 0) body.frequency_penalty = config.frequencyPenalty
  if (config.presencePenalty !== 0) body.presence_penalty = config.presencePenalty
  return JSON.stringify(body)
}

export function sanitizeReply(raw: string): string {
  return raw
    .replace(/<think(?:ing)?>.*?<\/think(?:ing)?>/gs, '')
    .replace(/<reason(?:ing)?>.*?<\/reason(?:ing)?>/gs, '')
    .trim()
}

export function buildMessages(
  history: ChatMessage[],
  config: LLMRequestConfig,
  opts?: LLMServiceOptions,
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const systemContent = buildSystemPrompt(config) + (opts?.extraPrompt ?? '')
  const msgs: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemContent },
  ]

  let trimmed = history
  if (config.contextRounds > 0) {
    trimmed = history.slice(-config.contextRounds * 2)
  }

  for (const m of trimmed) {
    msgs.push({ role: m.isFromUser ? 'user' : 'assistant', content: m.content })
  }

  if (msgs.length <= 1 && opts?.fallbackMessage) {
    msgs.push({ role: 'user', content: opts.fallbackMessage })
  }

  return msgs
}

function isRetryableError(status: number, error: Error): boolean {
  if (error.name === 'AbortError') return false
  if (RETRYABLE_STATUS_CODES.has(status)) return true
  if (error.message?.includes('Failed to fetch') || error.message?.includes('network')) return true
  return false
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function calculateBackoff(attempt: number): number {
  return Math.min(BASE_RETRY_DELAY_MS * Math.pow(2, attempt), MAX_RETRY_DELAY_MS)
}

export class LLMService {
  private lastAbortController: AbortController | null = null

  constructor(private config: LLMRequestConfig) {}

  updateConfig(partial: Partial<LLMRequestConfig>): void {
    Object.assign(this.config, partial)
  }

  /** Cancel any in-flight request from this service */
  abort(): void {
    if (this.lastAbortController) {
      this.lastAbortController.abort()
      this.lastAbortController = null
    }
  }

  private async singleAttempt(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    signal: AbortSignal,
  ): Promise<string> {
    const res = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: buildBody(messages, this.config),
      signal,
    })

    const data = await res.json()
    if (!res.ok) {
      throw new APIError(data.error?.message || `请求失败 (${res.status})`, res.status)
    }

    const raw: string | undefined = data.choices?.[0]?.message?.content
    if (!raw) throw new Error('API 未返回有效回复内容')

    return sanitizeReply(raw)
  }

  async generateReply(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  ): Promise<string> {
    // Cancel any previous in-flight request
    this.abort()

    let lastError: unknown

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const controller = new AbortController()
      this.lastAbortController = controller

      // Per-attempt timeout
      const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

      try {
        const result = await this.singleAttempt(messages, controller.signal)
        clearTimeout(timeoutId)
        this.lastAbortController = null
        return result
      } catch (err: unknown) {
        clearTimeout(timeoutId)
        lastError = err

        // Don't retry abort errors (cancelled by new request or timeout)
        if (err instanceof DOMException && err.name === 'AbortError') {
          this.lastAbortController = null
          throw new Error('请求已取消')
        }

        // Don't retry if we exhausted attempts
        if (attempt >= MAX_RETRIES - 1) break

        // Check if retryable
        const status = err instanceof APIError ? err.status : 0
        const errorObj = err instanceof Error ? err : new Error(String(err))
        if (!isRetryableError(status, errorObj)) break

        log.warn(`attempt ${attempt + 1}/${MAX_RETRIES} failed, retrying in ${calculateBackoff(attempt)}ms`, { error: errorObj.message })
        await delay(calculateBackoff(attempt))
      }
    }

    this.lastAbortController = null
    throw lastError instanceof Error ? lastError : new Error(String(lastError))
  }
}

export class APIError extends Error {
  constructor(message: string, public status: number) {
    super(message)
    this.name = 'APIError'
  }
}

export function createLLMService(config: LLMRequestConfig): LLMService {
  return new LLMService(config)
}

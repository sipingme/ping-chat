import { describe, it, expect } from 'vitest'
import { useSensitiveWords } from './useSensitiveWords'

describe('useSensitiveWords', () => {
  it('detects default sensitive words', () => {
    const { check } = useSensitiveWords()
    expect(check('contains 赌博 content').blocked).toBe(true)
    expect(check('contains 毒品 content').blocked).toBe(true)
    expect(check('normal message').blocked).toBe(false)
  })

  it('detects custom sensitive words', () => {
    const { check } = useSensitiveWords(['customBad'])
    expect(check('has customBad word').blocked).toBe(true)
    expect(check('clean text').blocked).toBe(false)
  })

  it('returns the matched word', () => {
    const { check } = useSensitiveWords(['badword'])
    const result = check('this has badword inside')
    expect(result.blocked).toBe(true)
    expect(result.word).toBe('badword')
  })
})

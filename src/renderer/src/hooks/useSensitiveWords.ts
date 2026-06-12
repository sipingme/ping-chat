const DEFAULT_SENSITIVE_WORDS = ['暴力', '赌博', '毒品', '色情', '诈骗', '传销']

function buildWords(customWords: string[]): string[] {
  const set = new Set([...DEFAULT_SENSITIVE_WORDS, ...customWords])
  return Array.from(set).filter(Boolean)
}

export function useSensitiveWords(customWords: string[] = []): {
  check: (text: string) => { blocked: boolean; word?: string }
  words: string[]
} {
  const words = buildWords(customWords)

  const check = (text: string): { blocked: boolean; word?: string } => {
    for (const word of words) {
      if (text.includes(word)) {
        return { blocked: true, word }
      }
    }
    return { blocked: false }
  }

  return { check, words }
}

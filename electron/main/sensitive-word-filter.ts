const DEFAULT_SENSITIVE_WORDS = ['暴力', '赌博', '毒品', '色情', '诈骗', '传销']

let customWords: string[] = []

export function setSensitiveWords(words: string[]): void {
  customWords = words.filter(Boolean)
}

export function getSensitiveWords(): string[] {
  return [...DEFAULT_SENSITIVE_WORDS, ...customWords]
}

export function checkSensitiveWords(text: string): { blocked: boolean; word?: string } {
  const words = getSensitiveWords()
  for (const word of words) {
    if (text.includes(word)) {
      return { blocked: true, word }
    }
  }
  return { blocked: false }
}

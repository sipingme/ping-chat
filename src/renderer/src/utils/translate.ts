export async function translateText(text: string, targetLang = 'zh'): Promise<string> {
  try {
    const res = await fetch('https://libretranslate.de/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source: 'auto', target: targetLang, format: 'text' }),
    })
    const data = await res.json()
    return data.translatedText || text
  } catch {
    return text
  }
}

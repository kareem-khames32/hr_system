import type { ReactNode } from 'react'

// B-ADD.16: مطابقة فورية في الصفحة بنفس قواعد البحث الدقيق في الخادم (api/src/mailbox/search.ts):
// من غير فرق حروف كبيرة وصغيرة، والتشكيل والتطويل متجاهلين، وأ/إ/آ = ا، وى = ي، وة = ه.

const SKIP = /[ً-ْٰـ]/
const MAP: Record<string, string> = { أ: 'ا', إ: 'ا', آ: 'ا', ى: 'ي', ة: 'ه' }

/** النص بعد التطبيع، ولكل حرف منه مكانه في الأصل */
function fold(s: string): { text: string; at: number[] } {
  let text = ''
  const at: number[] = []
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (SKIP.test(ch)) continue
    text += (MAP[ch] ?? ch).toLowerCase()
    at.push(i)
  }
  return { text, at }
}

export const normalize = (s: string) => fold(s).text

/** كلمات خانة البحث؛ «اللي بين علامتين» عبارة واحدة، وبادئات from:/to:/subject: بتتشال */
export function searchTerms(q: string): string[] {
  const out: string[] = []
  for (const m of q.matchAll(/(?:\S+?:)?(?:"([^"]+)"|(\S+))/g)) {
    const t = normalize((m[1] ?? m[2] ?? '').trim())
    if (t) out.push(t)
  }
  return out
}

/** كل كلمة في حتة من الخانات (كل الكلمات لازم تطابق) */
export function matchesAll(fields: string[], terms: string[]): boolean {
  if (!terms.length) return true
  const hay = normalize(fields.join(' \u0000 '))
  return terms.every((t) => hay.includes(t))
}

/** النص وكلمات البحث المطابقة معلّمة فيه — عناصر React (نص بس، من غير HTML) */
export function highlight(text: string, terms: string[]): ReactNode {
  if (!terms.length || !text) return text
  const { text: norm, at } = fold(text)
  const marks: [number, number][] = []
  for (const t of terms) {
    let from = 0
    for (;;) {
      const i = norm.indexOf(t, from)
      if (i < 0) break
      marks.push([at[i], at[i + t.length - 1] + 1])
      from = i + t.length
    }
  }
  if (!marks.length) return text
  marks.sort((a, b) => a[0] - b[0])
  const out: ReactNode[] = []
  let pos = 0
  for (const [s, e] of marks) {
    if (e <= pos) continue
    const start = Math.max(s, pos)
    if (start > pos) out.push(text.slice(pos, start))
    out.push(
      <mark key={start} className="bg-amber-200 text-inherit rounded px-0.5">
        {text.slice(start, e)}
      </mark>,
    )
    pos = e
  }
  if (pos < text.length) out.push(text.slice(pos))
  return out
}

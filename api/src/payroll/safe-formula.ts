// ============================================================
// مُقيّم معادلات آمن (Safe Formula Evaluator) — صمّام أمان محرك الرواتب
// parser تنازلي يدوي (لا eval / Function / أي تنفيذ كود). يدعم:
//   أرقام · متغيّرات مُسمّاة · + - * / % · أقواس · سالب أحادي
//   دوال بيضاء: min max abs floor ceil round(x[,d]) clamp(x,lo,hi)
// أي رمز/دالة/متغيّر خارج القائمة البيضاء → خطأ (لا يُقيَّم).
// ============================================================

const MAX_LEN = 500

const FUNCS: Record<string, { arity: number | [number, number]; fn: (a: number[]) => number }> = {
  min: { arity: [1, 99], fn: (a) => Math.min(...a) },
  max: { arity: [1, 99], fn: (a) => Math.max(...a) },
  abs: { arity: 1, fn: (a) => Math.abs(a[0]) },
  floor: { arity: 1, fn: (a) => Math.floor(a[0]) },
  ceil: { arity: 1, fn: (a) => Math.ceil(a[0]) },
  round: {
    arity: [1, 2],
    fn: (a) => {
      const d = a[1] ?? 0
      const f = Math.pow(10, d)
      return Math.round(a[0] * f) / f
    },
  },
  clamp: { arity: 3, fn: (a) => Math.min(Math.max(a[0], a[1]), a[2]) },
}

type TokType = 'num' | 'id' | 'op' | 'lp' | 'rp' | 'comma'
interface Tok {
  t: TokType
  v: string
}

function tokenize(src: string): Tok[] {
  const toks: Tok[] = []
  let i = 0
  const s = src
  while (i < s.length) {
    const c = s[i]
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      i++
      continue
    }
    if (c >= '0' && c <= '9') {
      let j = i + 1
      let dot = c === '.'
      while (j < s.length && ((s[j] >= '0' && s[j] <= '9') || (s[j] === '.' && !dot))) {
        if (s[j] === '.') dot = true
        j++
      }
      toks.push({ t: 'num', v: s.slice(i, j) })
      i = j
      continue
    }
    if (c === '.') {
      // رقم يبدأ بنقطة (.5)
      let j = i + 1
      while (j < s.length && s[j] >= '0' && s[j] <= '9') j++
      if (j === i + 1) throw new Error('صيغة غير صحيحة: نقطة معزولة')
      toks.push({ t: 'num', v: s.slice(i, j) })
      i = j
      continue
    }
    if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_') {
      let j = i + 1
      while (
        j < s.length &&
        ((s[j] >= 'a' && s[j] <= 'z') ||
          (s[j] >= 'A' && s[j] <= 'Z') ||
          (s[j] >= '0' && s[j] <= '9') ||
          s[j] === '_')
      )
        j++
      toks.push({ t: 'id', v: s.slice(i, j) })
      i = j
      continue
    }
    if (c === '+' || c === '-' || c === '*' || c === '/' || c === '%') {
      toks.push({ t: 'op', v: c })
      i++
      continue
    }
    if (c === '(') {
      toks.push({ t: 'lp', v: c })
      i++
      continue
    }
    if (c === ')') {
      toks.push({ t: 'rp', v: c })
      i++
      continue
    }
    if (c === ',') {
      toks.push({ t: 'comma', v: c })
      i++
      continue
    }
    throw new Error(`رمز غير مسموح في المعادلة: «${c}»`)
  }
  return toks
}

// parser تنازلي: expr → term (('+'|'-') term)* ؛ term → factor (('*'|'/'|'%') factor)*
class Parser {
  private pos = 0
  constructor(
    private toks: Tok[],
    private vars: Record<string, number>
  ) {}

  private peek(): Tok | undefined {
    return this.toks[this.pos]
  }
  private next(): Tok {
    const t = this.toks[this.pos]
    if (!t) throw new Error('نهاية غير متوقعة للمعادلة')
    this.pos++
    return t
  }

  parse(): number {
    const v = this.expr()
    if (this.pos !== this.toks.length) {
      throw new Error('رموز زائدة بعد نهاية المعادلة')
    }
    return v
  }

  private expr(): number {
    let v = this.term()
    while (this.peek()?.t === 'op' && (this.peek()!.v === '+' || this.peek()!.v === '-')) {
      const op = this.next().v
      const r = this.term()
      v = op === '+' ? v + r : v - r
    }
    return v
  }

  private term(): number {
    let v = this.factor()
    while (
      this.peek()?.t === 'op' &&
      (this.peek()!.v === '*' || this.peek()!.v === '/' || this.peek()!.v === '%')
    ) {
      const op = this.next().v
      const r = this.factor()
      if (op === '*') v = v * r
      else if (op === '/') v = r === 0 ? 0 : v / r // قسمة على صفر → 0 (لا تكسر المسير)
      else v = r === 0 ? 0 : v % r
    }
    return v
  }

  private factor(): number {
    const t = this.peek()
    if (t?.t === 'op' && t.v === '-') {
      this.next()
      return -this.factor()
    }
    if (t?.t === 'op' && t.v === '+') {
      this.next()
      return this.factor()
    }
    return this.primary()
  }

  private primary(): number {
    const t = this.next()
    if (t.t === 'num') return Number(t.v)
    if (t.t === 'lp') {
      const v = this.expr()
      const rp = this.next()
      if (rp.t !== 'rp') throw new Error('قوس إغلاق مفقود')
      return v
    }
    if (t.t === 'id') {
      // دالة؟
      if (this.peek()?.t === 'lp') {
        const name = t.v.toLowerCase()
        const def = FUNCS[name]
        if (!def) throw new Error(`دالة غير مسموحة: «${t.v}»`)
        this.next() // '('
        const args: number[] = []
        if (this.peek()?.t !== 'rp') {
          args.push(this.expr())
          while (this.peek()?.t === 'comma') {
            this.next()
            args.push(this.expr())
          }
        }
        const close = this.next()
        if (close.t !== 'rp') throw new Error('قوس دالة غير مغلق')
        const [lo, hi] = Array.isArray(def.arity) ? def.arity : [def.arity, def.arity]
        if (args.length < lo || args.length > hi) {
          throw new Error(`عدد وسائط «${name}» غير صحيح`)
        }
        return def.fn(args)
      }
      // متغيّر
      if (!(t.v in this.vars)) {
        throw new Error(`متغيّر غير معروف: «${t.v}»`)
      }
      const val = Number(this.vars[t.v])
      return Number.isFinite(val) ? val : 0
    }
    throw new Error('رمز غير متوقّع في المعادلة')
  }
}

// يقيّم المعادلة مقابل قيم المتغيّرات — يرمي عند أي خطأ/رمز غير مسموح
export function evalFormula(expr: string, vars: Record<string, number>): number {
  if (typeof expr !== 'string') throw new Error('المعادلة نصية')
  if (expr.length > MAX_LEN) throw new Error('المعادلة أطول من الحد المسموح')
  const toks = tokenize(expr)
  if (toks.length === 0) throw new Error('معادلة فارغة')
  const v = new Parser(toks, vars).parse()
  if (!Number.isFinite(v)) return 0
  return v
}

// تحقّق دون تقييم: الصيغة سليمة وكل متغيّراتها ضمن القائمة المسموحة
export function validateFormula(
  expr: string,
  allowedVars: string[]
): { ok: boolean; error?: string } {
  try {
    const zero: Record<string, number> = {}
    for (const v of allowedVars) zero[v] = 1 // قيم وهمية لإثبات التحليل والأسماء
    evalFormula(expr, zero)
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'خطأ في المعادلة' }
  }
}

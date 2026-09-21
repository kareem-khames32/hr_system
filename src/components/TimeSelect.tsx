// حقل وقت عادي: <input type="time"> بتاع المتصفح — المستخدم بيكتب/يختار الساعة والدقيقة وص/م بنفسه،
// من غير قائمة ربع ساعة ولا تقريب للقيمة. القيمة الداخلة والخارجة 'HH:MM' زي ما هي (فاضي = '').
// الحقل dir="ltr" عشان يتقري من الشمال لليمين جوه صفحة عربية، وتحته تلميح حيّ بقراءة ص/م
// عشان غلطة الصبح/بالليل تبان وقت الكتابة.

export interface TimeOption {
  value: string
  label: string
}

const pad = (n: number) => String(n).padStart(2, '0')

/** وقت 'HH:MM' صالح (00:00 → 23:59) — غير كده null. */
export function normalizeTime(value?: string | null): string | null {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(value ?? '').trim())
  if (!m) return null
  const h = Number(m[1]), min = Number(m[2])
  if (h > 23 || min > 59) return null
  return `${pad(h)}:${pad(min)}`
}

/** المدة بالدقائق بين وقتين؛ النهاية قبل البداية = بيعدّي نص الليل (23:30 → 00:30 = 60). وقت غير صالح = null. */
export function timeSpanMinutes(from?: string | null, to?: string | null): number | null {
  const a = normalizeTime(from), b = normalizeTime(to)
  if (!a || !b) return null
  const m = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
  return m(b) >= m(a) ? m(b) - m(a) : m(b) + 1440 - m(a)
}

/** نص قراءة الوقت: 13:30 — 1:30 م */
export function timeLabel(value: string): string {
  const h = Number(value.slice(0, 2))
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${value} — ${h12}:${value.slice(3, 5)} ${h < 12 ? 'ص' : 'م'}`
}

/** أوقات اليوم كل step دقيقة (الافتراضي ربع ساعة). الحقل نفسه مابقاش بيبنيها، بس فاضلة
 *  مُصدّرة لأن كود واختبارات تانية بتستوردها. قيمة خارج الشبكة (09:07) بتفضل في مكانها. */
export function timeOptions(stepMinutes = 15, current?: string | null): TimeOption[] {
  const step = Number.isInteger(stepMinutes) && stepMinutes > 0 && stepMinutes <= 60 ? stepMinutes : 15
  const values: string[] = []
  for (let m = 0; m < 24 * 60; m += step) values.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`)
  const extra = normalizeTime(current)
  if (extra && !values.includes(extra)) values.push(extra)
  return values.sort().map(value => ({ value, label: timeLabel(value) }))
}

interface TimeSelectProps {
  value: string
  onChange: (value: string) => void
  id?: string
  className?: string
  disabled?: boolean
  placeholder?: string
  stepMinutes?: number
  'aria-label'?: string
}

export default function TimeSelect({ value, onChange, id, className = 'input w-full', disabled, placeholder = '— اختر الوقت —',
  stepMinutes = 15, 'aria-label': ariaLabel }: TimeSelectProps) {
  const current = normalizeTime(value) ?? ''
  const step = Number.isInteger(stepMinutes) && stepMinutes > 0 && stepMinutes <= 60 ? stepMinutes : 15
  // step بالثواني زي ما الـHTML عايزها. لو القيمة المحفوظة برّه الشبكة (09:07 مع ربع ساعة)
  // بنرجّع الخطوة لدقيقة عشان المتصفح ما يعتبرهاش غلط ولا يقرّبها — الكتابة الحرة هي الأصل.
  const offGrid = current !== '' && (Number(current.slice(0, 2)) * 60 + Number(current.slice(3, 5))) % step !== 0
  return (
    <div>
      <input
        type="time"
        id={id}
        className={className}
        value={current}
        disabled={disabled}
        placeholder={placeholder}
        step={(offGrid ? 1 : step) * 60}
        dir="ltr"
        style={{ textAlign: 'left' }}
        aria-label={ariaLabel}
        // المتصفح ممكن يرجّع 'HH:MM:SS' — بنحوّلها لـ'HH:MM'، والمسح بيرجّع ''
        onChange={(e) => onChange(normalizeTime(e.target.value) ?? '')}
      />
      {current !== '' && (
        <p className="mt-1 text-xs text-gray-500" dir="ltr" style={{ textAlign: 'left' }}>{timeLabel(current)}</p>
      )}
    </div>
  )
}

import type { ApiTerminationReason, TerminationReason } from './api'

// أسباب إنهاء الخدمة بالعربي — مصدر واحد لنموذج الإنهاء وصفحة ملف إنهاء الخدمة
// (مرآتها في الخادم TERMINATION_REASON_DISPLAY_LABELS في api/src/offboarding/termination-reasons.ts)
export const TERMINATION_REASON_LABELS: Record<TerminationReason, string> = {
  resignation: 'استقالة موثقة', termination: 'إنهاء من صاحب العمل', dismissal: 'فصل تأديبي',
  contract_end: 'انتهاء مدة العقد', retirement: 'تقاعد', death: 'وفاة', disability: 'عجز صحي', force_majeure: 'قوة قاهرة',
}

// الأساسي بمسماه هنا زي ما هو، والمخصص من الإعدادات بالمسمى اللي راجع مع الملف (terminationReasonLabel)،
// والكود المش معروف بيظهر زي ما هو
// (الأساسي بخاصية مملوكة بس — كود زي constructor مايرجّعش دالة موروثة)
export const terminationReasonLabel = (code?: string | null, serverLabel?: string | null) =>
  !code ? '—'
    : Object.prototype.hasOwnProperty.call(TERMINATION_REASON_LABELS, code) ? (TERMINATION_REASON_LABELS as Record<string, string>)[code]
      : (serverLabel?.trim() || code)

// قرار المالك 27 سبتمبر: أسباب مخصصة من «سياسات النظام» — معالج الإنهاء بيعرض المفعّل منها بعد الثمانية الأساسية
export const activeCustomTerminationReasons = (reasons: ApiTerminationReason[] = []) =>
  reasons.filter((reason) => !reason.builtin && reason.active)

export const TERMINATION_REASON_FACTOR_HINT = 'النسبة من مكافأة نهاية الخدمة: 0 = بلا مكافأة، 1 = كاملة، أو كسر زي 1/3'

// مرآة تحقق الخادم لشاشة الإعدادات (الخادم هو الحكم): النسبة عشري من 0 لـ 1 أو كسر زي 1/3
export const eosFactorValid = (text: string) => {
  const s = String(text ?? '').replace(/\s+/g, '')
  const frac = /^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/.exec(s)
  const n = frac ? Number(frac[1]) / Number(frac[2]) : /^\d+(?:\.\d+)?$/.test(s) ? Number(s) : NaN
  return s.length <= 12 && Number.isFinite(n) && n >= 0 && n <= 1
}

export const normalizeReasonLabel = (label: string) => String(label ?? '').replace(/\s+/g, ' ').trim()
const labelKey = (label: string) => normalizeReasonLabel(label).normalize('NFKC').toLowerCase().replace(/\s+/g, '')

// أول مشكلة في قائمة الأسباب المخصصة قبل الحفظ (null = سليمة): المسمى من 2 لـ 60 حرف ومايتكررش مع سبب أساسي
// ولا مع سبب تاني، والنسبة صالحة
export function customTerminationReasonsIssue(rows: Array<{ label: string; eosFactor: string }>): string | null {
  const taken = new Set(Object.values(TERMINATION_REASON_LABELS).map(labelKey))
  for (const [index, row] of rows.entries()) {
    const label = normalizeReasonLabel(row.label)
    if (label.length < 2 || label.length > 60) {
      return label ? `مسمى السبب «${label}» لازم يكون من 2 لـ 60 حرف` : `مسمى السبب رقم ${index + 1} فاضي — اكتب من 2 لـ 60 حرف`
    }
    if (taken.has(labelKey(label))) return `المسمى «${label}» مستخدم لسبب تاني — كل سبب بمسمى مختلف`
    taken.add(labelKey(label))
    if (!eosFactorValid(row.eosFactor)) return `نسبة المكافأة لـ«${label}» مش صالحة — رقم من 0 لـ 1 أو كسر زي 1/3`
  }
  return null
}

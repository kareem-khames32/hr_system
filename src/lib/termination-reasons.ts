import type { TerminationReason } from './api'

// أسباب إنهاء الخدمة بالعربي — مصدر واحد لنموذج الإنهاء وصفحة ملف إنهاء الخدمة
export const TERMINATION_REASON_LABELS: Record<TerminationReason, string> = {
  resignation: 'استقالة موثقة', termination: 'إنهاء من صاحب العمل', dismissal: 'فصل تأديبي',
  contract_end: 'انتهاء مدة العقد', retirement: 'تقاعد', death: 'وفاة', disability: 'عجز صحي', force_majeure: 'قوة قاهرة',
}

export const terminationReasonLabel = (code?: string | null) =>
  !code ? '—' : (TERMINATION_REASON_LABELS as Record<string, string>)[code] ?? code

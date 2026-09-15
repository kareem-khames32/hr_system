// حدود النصوص الحرة كما تقبلها أعمدة قاعدة البيانات والـDTO — تُفحص في الواجهة قبل الإرسال برسالة عربية.

// employees.archiveReason nvarchar(300)
export const ARCHIVE_REASON_MAX = 300
// custody_assignments.condition nvarchar(100) — ملاحظة النقل ووصف حالة الشطب وحالة الإرجاع
export const CUSTODY_TEXT_MAX = 100
// AddLineDto / UpdateLineDto: اسم بند التصفية من 2 إلى 200 حرف
export const SETTLEMENT_LABEL_MIN = 2
export const SETTLEMENT_LABEL_MAX = 200

export function archiveReasonIssue(reason: string): string | null {
  const length = (reason ?? '').trim().length
  return length > ARCHIVE_REASON_MAX ? `سبب الأرشفة بحد أقصى ${ARCHIVE_REASON_MAX} حرف (المكتوب ${length} حرفاً)` : null
}

export function custodyTextIssue(label: string, value: string): string | null {
  const length = (value ?? '').trim().length
  return length > CUSTODY_TEXT_MAX ? `${label} بحد أقصى ${CUSTODY_TEXT_MAX} حرف (المكتوب ${length} حرفاً)` : null
}

export function settlementLabelIssue(label: string): string | null {
  const length = (label ?? '').trim().length
  if (length < SETTLEMENT_LABEL_MIN) return `اسم البند ${SETTLEMENT_LABEL_MIN} حرفان على الأقل`
  if (length > SETTLEMENT_LABEL_MAX) return `اسم البند بحد أقصى ${SETTLEMENT_LABEL_MAX} حرف`
  return null
}

import { roundPayrollMoney } from './payroll-money'

// اللي اتصرف فعلًا مقابل اللي المفروض يتصرف (تدقيق 24 سبتمبر — N02):
// أول ما الصرف يتسجل لبند، كل الشاشات لازم تقول نفس التقسيم المسجل — شاشة الصرف وكشف البنوك والتقرير المالي.
// تغيير طريقة الصرف في ملف الموظف بعد الصرف مايرجعش يكتب واقعة صرف حصلت خلاص (كانت بتنقل 1,000.00 من النقدي للبنك في الكشف والدفتر).
//
// القاعدة (مصدر واحد للتلات شاشات):
//   ١) علامة «تم الصرف» على البند ⇒ المبلغ وتقسيمه وطريقة الصرف المثبتين وقت العلامة (دليل اللي اتصرف).
//   ٢) علامة «لم يتم» ⇒ لسه ماتصرفلوش: ملف الموظف الحالي (هو اللي هيتصرف بيه لما يتصرف فعلًا).
//   ٣) مسير مصروف بلا علامات (اتصرف كله مرة واحدة) ⇒ طريقة الصرف وتقسيمها المثبتين على البند وقت الصرف (ترحيل 067).
//   ٤) غير كده (مسير لسه ما اتصرفش) ⇒ ملف الموظف الحالي زي ما هو — السلوك القديم بالحرف.
//
// تكملة القاعدة ٣ (مراجعة مستقلة 24 سبتمبر): قبل ترحيل 067 كان الصف المصروف جماعيًا بيرجع لطريقة الصرف المحفوظة وقت
// «الحساب»، وده كان بيعمل حاجتين ثبتوا حيًّا:
//   أ) موظف اتحسب نقدي ثم بقى «تحويل بنكي» قبل الصرف: الكشف يقول بنك 1,000 قبل الصرف وينقلب نقدي 1,000 بمجرد الصرف.
//   ب) صرف «نقدي + بنك» مثبت 300/700 يتحول لـ800/200 بمجرد تعديل مبلغ التحويل في ملف الموظف بعد الصرف — لأن مبلغ
//      البنك ما كانش بيتثبّت في أي مكان، والتقسيم كان بيعاد حسابه من الملف الحالي.
// دلوقتي الصرف بيثبّت على البند طريقته وتقسيمه (paidPayMethod/paidBankAmount/paidCashAmount)، فاللحظة اللي الفلوس
// اتحركت فيها هي اللي بتتقال دايمًا. بند مصروف قديم (الأعمدة فاضية) بياخد السلوك القديم عشان التاريخ ما يتغيّرش رجعيًا.

/** علامة صرف بند كما هي في payroll_item_disbursements (أو نفس أعمدتها من استعلام التقرير). */
export interface DisbursementMarkInput {
  status?: string | null
  payMethod?: string | null
  amount?: unknown
  bankAmount?: unknown
  cashAmount?: unknown
}

export interface RecordedDisbursement {
  /** طريقة الصرف المسجلة (مش الحالية في الملف) */
  payMethod: string
  /** المبالغ المثبتة وقت العلامة، أو null ⇒ التقسيم يتحسب من الطريقة المسجلة زي أي صف */
  amounts: { bank: number; cash: number } | null
}

/** التقسيم المسجل للبند، أو null لو مفيش صرف مسجل (وقتها ملف الموظف الحالي هو المصدر). */
export function recordedDisbursement(input: {
  runStatus?: string | null
  /** طريقة الصرف المحفوظة على بند المسير وقت الحساب (payroll_items.payMethod) */
  itemPayMethod?: string | null
  /** اللي اتثبت على البند وقت الصرف (payroll_items.paidPayMethod/paidBankAmount/paidCashAmount — ترحيل 067) */
  itemPaid?: { payMethod?: string | null; bankAmount?: unknown; cashAmount?: unknown } | null
  mark?: DisbursementMarkInput | null
}): RecordedDisbursement | null {
  const status = input.mark?.status ?? null
  if (status === 'PAID') {
    return {
      payMethod: input.mark?.payMethod || input.itemPayMethod || 'transfer',
      amounts: { bank: roundPayrollMoney(Number(input.mark?.bankAmount) || 0), cash: roundPayrollMoney(Number(input.mark?.cashAmount) || 0) },
    }
  }
  // التثبيت وقت الصرف يغلب علامة «لم يتم» قديمة: البند المثبت معناه إن الصرف نفسه سجّله مصروفًا، والعلامة اتخطّت.
  // (بتحصل لما حد يعلّم موظف «تم الصرف» ثم يلغي علامته وهو معتمد، وبعدها المسير يتصرف كله مرة واحدة —
  //  وقتها الصرف الجماعي صرف للكل، والعلامة القديمة بقيت كلام متجاوز. سجلها محفوظ في أحداث DISBURSEMENT_MARKED.)
  const paidMethod = input.runStatus === 'PAID' ? input.itemPaid?.payMethod || null : null
  if (paidMethod) {
    return {
      payMethod: paidMethod,
      amounts: { bank: roundPayrollMoney(Number(input.itemPaid?.bankAmount) || 0), cash: roundPayrollMoney(Number(input.itemPaid?.cashAmount) || 0) },
    }
  }
  // «لم يتم» علامة صريحة إن البند ده ماتصرفش (ومفيش تثبيت) — حتى لو المسير نفسه اتقفل بسبب مكتوب
  if (status) return null
  if (input.runStatus !== 'PAID') return null
  // بند مصروف قبل الترحيل: لقطة وقت الحساب زي ما هي (تاريخ ما بيتغيّرش رجعيًا)
  if (!input.itemPayMethod) return null
  return { payMethod: input.itemPayMethod, amounts: null }
}

/** علامات الصرف بالبند: خرائط جاهزة للدوال الصافية، وأي صف بلا رقم بند بيتجاهل. */
export function disbursementMarksByItem(marks: ReadonlyArray<DisbursementMarkInput & { itemId?: unknown }> | undefined | null) {
  const byItem = new Map<number, DisbursementMarkInput>()
  for (const mark of marks ?? []) {
    const itemId = Number(mark?.itemId)
    if (Number.isSafeInteger(itemId) && itemId > 0) byItem.set(itemId, mark)
  }
  return byItem
}

import { LOAN_DEFERRAL_HANDLER } from './loan-installment-requests'

// CR28-B01 (مراجعة Codex الجولة 28): حركة السلفة من طلب (إنشاء وتأجيل قسط وسداد مبكر) بتتنفذ على فرع الموظف وقت تقديم الطلب بس —
// نفس حارس طلب الأجر: اتنقل بعده = يتقدم من جديد من فرعه الحالي. القفل المالي للموظف (اللي النقل بياخده) بيتاخد قبل صف الطلب
// (lockFinancialRequestPrelude) والفرع بيتقرا تحته وقت التنفيذ. باقي طلبات الفلوس (بدل ومصروفات وتسوية) بتفضل في سلسلة الفرع اللي
// اتقدمت فيه وبتتنفذ مرة واحدة حتى بعد النقل — ده الترتيب اللي اتراجع في مراجعة Codex الجولة 6 (CR6، قيد واحد بعد النقل).
export const REQUESTER_BRANCH_HANDLERS: ReadonlySet<string> = new Set(['loans_installments', 'loan_early_settlement', LOAN_DEFERRAL_HANDLER])

export const REQUESTER_BRANCH_CHANGED = 'تغير فرع الموظف منذ إنشاء الطلب؛ أعد تقديمه من الفرع الحالي'

// PL-04: هذا تعريف ثابت للغة SRS، ولا يقرأ رواتب أو بصمات أو إعدادات حية.
export const PAYROLL_SRS_CATALOG_VERSION = 'SRS_V1_20260913' as const

export interface PayrollSrsVariable {
  readonly code: string
  readonly nameAr: string
  readonly unit: 'currency' | 'days' | 'hours' | 'minutes' | 'count' | 'months' | 'flag' | 'currency_per_day' | 'currency_per_hour' | 'currency_per_minute'
  readonly description: string
  readonly sourceAvailability: 'INPUT_SNAPSHOT_REQUIRED'
}

const variable = (code: string, nameAr: string, unit: PayrollSrsVariable['unit'], description: string): PayrollSrsVariable =>
  Object.freeze({ code, nameAr, unit, description, sourceAvailability: 'INPUT_SNAPSHOT_REQUIRED' })

// لا تعني عضوية الكتالوج وجود مُزوّد بيانات؛ كل قيمة تحتاج مدخلاً صريحًا ضمن لقطة موثقة.
export const PAYROLL_SRS_VARIABLES: readonly PayrollSrsVariable[] = Object.freeze([
  variable('BASE_SALARY', 'الراتب الأساسي', 'currency', 'قيمة الراتب الأساسي المعتمدة لشهر المسير كله، وشهره المرجعي هو شهر نهاية الدورة؛ لا يقسم بين أيام بالراتب القديم والجديد، ولا يُستنتج من الراتب الحالي. تناسب أيام الخدمة مستقل.'),
  variable('ALLOWANCES_TOTAL', 'إجمالي البدلات الدائمة', 'currency', 'مجموع البدلات الدائمة المفعلة والمستحقة في الفترة بعد تناسبها بأيام التغطية.'),
  variable('GROSS_SALARY', 'إجمالي الراتب الثابت', 'currency', 'الراتب الأساسي مع إجمالي البدلات الدائمة؛ لا يشمل الإضافي أو المكافآت المتغيرة.'),
  variable('BASE_DAYS_BASIS', 'أساس قسمة الأيام', 'days', 'مقام احتساب اليوم من لقطة السياسة، ثابت عند 30 يومًا وفق قرار المالك.'),
  variable('PERIOD_DAYS', 'أيام الفترة', 'days', 'عدد الأيام من بداية فترة المسير إلى نهايتها شاملًا الطرفين.'),
  variable('COVERED_DAYS', 'أيام التغطية', 'days', 'أيام تقاطع فترة المسير مع تاريخ التعيين والانفكاك شاملًا الطرفين؛ التغطية الكاملة تساوي أيام الفترة.'),
  variable('DAY_RATE', 'سعر اليوم', 'currency_per_day', 'أساس الأجر المحدد في لقطة السياسة، الأساسي أو الإجمالي، مقسومًا على أساس أيام الاحتساب.'),
  variable('STANDARD_DAY_HOURS', 'ساعات اليوم القياسية', 'hours', 'ساعات اليوم المثبتة في لقطة السياسة؛ لا تُستبدل ضمنيًا بإعداد حي أو وردية حالية.'),
  variable('HOUR_RATE', 'سعر الساعة', 'currency_per_hour', 'سعر اليوم مقسومًا على ساعات اليوم القياسية.'),
  variable('MINUTE_RATE', 'سعر الدقيقة', 'currency_per_minute', 'سعر الساعة مقسومًا على 60 دقيقة.'),
  variable('LATE_MINUTES', 'دقائق التأخير', 'minutes', 'التأخير غير المعذور بعد قواعد الدوام والمرونة وقبل سماح سياسة الشرائح؛ بعد نافذة المرونة يُقاس من بداية الدوام الرسمية.'),
  variable('LATE_INCIDENTS', 'وقائع التأخير', 'count', 'عدد أيام الفترة التي سُجل بها تأخير محتسب أكبر من صفر.'),
  variable('SHORT_MINUTES', 'دقائق نقص العمل', 'minutes', 'مجموع النقص الموجب بين زمن العمل المطلوب والمنفذ لكل يوم حضور، مستقلًا عن التأخير.'),
  variable('ABSENCE_DAYS', 'أيام الغياب دون إذن', 'days', 'أيام العمل المجدولة بلا حضور أو إجازة أو إذن معتمد داخل التغطية.'),
  variable('EXCUSED_ABSENCE_DAYS', 'أيام الغياب بإذن', 'days', 'أيام الغياب المرتبطة بإذن معتمد داخل فترة المسير.'),
  variable('UNPAID_LEAVE_DAYS', 'أيام الإجازة بلا أجر', 'days', 'أيام الإجازات المعتمدة بلا أجر داخل الفترة؛ إعفاء جزاءات الحضور لا يسقطها تلقائيًا.'),
  variable('PAID_LEAVE_DAYS', 'أيام الإجازة المدفوعة', 'days', 'أيام الإجازات المعتمدة مدفوعة الأجر داخل الفترة.'),
  variable('PRESENT_DAYS', 'أيام الحضور الفعلي', 'days', 'عدد الأيام ذات حضور محتسب في لقطة حضور الفترة.'),
  variable('WORKED_MINUTES', 'دقائق العمل المنفذة', 'minutes', 'مجموع زمن العمل المنفذ المحتسب خلال الفترة من لقطة الحضور.'),
  variable('REQUIRED_MINUTES', 'دقائق العمل المطلوبة', 'minutes', 'مجموع زمن العمل المقرر للأيام المجدولة داخل تغطية الموظف.'),
  variable('OT_HOURS_REGULAR', 'ساعات الإضافي العادي', 'hours', 'ساعات الإضافي المعتمدة في أيام العمل العادية من اللقطات المعتمدة.'),
  variable('OT_HOURS_RESTDAY', 'ساعات إضافي الراحة', 'hours', 'ساعات الإضافي المعتمدة في أيام الراحة من اللقطات المعتمدة.'),
  variable('OT_HOURS_HOLIDAY', 'ساعات إضافي العطل', 'hours', 'ساعات الإضافي المعتمدة في العطل الرسمية من اللقطات المعتمدة.'),
  variable('OT_HOURS_NIGHT', 'ساعات الإضافي الليلي', 'hours', 'ساعات إضافي مصنفة ومعتمدة ليلًا؛ تحتاج مصدرًا موثقًا لهذا التصنيف، ولا تُستنتج من بصمة حية أو ساعات نوع آخر.'),
  variable('OT_HOURS_TOTAL', 'مجموع ساعات الإضافي', 'hours', 'مجموع ساعات الإضافي المعتمدة بأنواعها العادي والراحة والعطل والليلي دون تكرار.'),
  variable('OT_AMOUNT', 'مبلغ الإضافي المعتمد', 'currency', 'مجموع مبالغ الإضافي المعتمدة والمجمدة في لقطاتها؛ يُستهلك كما اعتُمد ولا تعيد السياسة تسعيره من ساعات أو رواتب حالية.'),
  variable('BONUS_TOTAL', 'إجمالي المكافآت', 'currency', 'مجموع المكافآت الفردية المعتمدة والمسندة لفترة المسير.'),
  variable('TYPED_DEDUCTIONS_TOTAL', 'إجمالي الخصومات المصنفة', 'currency', 'مجموع الخصومات المصنفة التي اكتمل اعتمادها وأُسندت للفترة بعد استبعاد الإعفاءات الفردية المعتمدة.'),
  variable('ADVANCE_BALANCE', 'رصيد السلف القائم', 'currency', 'رصيد السلف المفتوح في دفتر المستحقات والمديونيات عند بداية الفترة.'),
  variable('ADVANCE_DUE_THIS_PERIOD', 'أقساط السلف المستحقة', 'currency', 'مجموع أقساط السلف المجدولة المستحقة داخل الفترة.'),
  variable('DEBT_DUE_THIS_PERIOD', 'المديونيات الأخرى المستحقة', 'currency', 'المديونيات المستحقة في الفترة من الدفتر بخلاف السلف.'),
  variable('IS_ATTENDANCE_EXEMPT', 'مستثنى من جزاءات الحضور', 'flag', 'راية 0 أو 1 من لقطة تصنيف الموظف؛ عند 1 تُصفّر دقائق التأخير والنقص وأيام الغياب دون إذن ووقائع التأخير قبل التقييم.'),
  variable('SENIORITY_MONTHS', 'أقدمية الخدمة بالأشهر', 'months', 'أقدمية الخدمة بالأشهر من تاريخ التعيين حتى نهاية فترة المسير.'),
])

export const PAYROLL_SRS_VARIABLE_CODES: readonly string[] = Object.freeze(PAYROLL_SRS_VARIABLES.map(item => item.code))
export const PAYROLL_SRS_FUNCTION_CODES = Object.freeze(['MIN', 'MAX', 'ABS', 'ROUND', 'FLOOR', 'CEIL', 'CLAMP', 'IF'] as const)
export const PAYROLL_SRS_LOGICAL_KEYWORDS = Object.freeze(['AND', 'OR', 'NOT'] as const)
export const PAYROLL_SRS_REFERENCE_NAMESPACES = Object.freeze([
  Object.freeze({ code: 'COMP', nameAr: 'ناتج بند سابق', unit: 'component_unit', description: 'COMP[CODE] يشير إلى ناتج بند سابق في نفس السياسة، مع تحقق ترتيب الاعتماد.' }),
  Object.freeze({ code: 'PARAM', nameAr: 'معامل السياسة', unit: 'parameter_unit', description: 'PARAM[NAME] يشير إلى معامل رقمي معرّف ومثبت في لقطة السياسة.' }),
  Object.freeze({ code: 'TYPED_DEDUCTION', nameAr: 'خصم مصنف معتمد', unit: 'currency', description: 'TYPED_DEDUCTION[CODE] يشير إلى الخصومات المعتمدة من النوع المحدد بعد الإعفاءات، وليس متغيرًا عدديًا بلا كود.' }),
])

export const PAYROLL_FORMULA_SYMBOL_PATTERN = /^[A-Z][A-Z0-9_]{0,39}$/
const reserved = new Set<string>([...PAYROLL_SRS_VARIABLE_CODES, ...PAYROLL_SRS_FUNCTION_CODES,
  ...PAYROLL_SRS_LOGICAL_KEYWORDS, ...PAYROLL_SRS_REFERENCE_NAMESPACES.map(item => item.code)])

export interface PayrollFormulaSymbols { components?: string[]; parameters?: string[]; typedDeductions?: string[] }

export function validatePayrollFormulaSymbols(symbols: PayrollFormulaSymbols = {}): void {
  if (symbols === null || typeof symbols !== 'object' || Array.isArray(symbols)) throw new Error('تعريف رموز المعادلة يجب أن يكون كائنًا')
  const groups = ['components', 'parameters', 'typedDeductions'] as const
  const prototype = Object.getPrototypeOf(symbols)
  if (prototype !== Object.prototype && prototype !== null) throw new Error('تعريف رموز المعادلة لا يقبل مجموعات موروثة')
  for (const group of Reflect.ownKeys(symbols)) {
    if (typeof group !== 'string' || !groups.some(allowed => allowed === group)) throw new Error(`مجموعة رموز غير معرّفة: ${String(group)}`)
  }
  const seenByGroup = new Map<string, Set<string>>()
  for (const group of groups) {
    const ownValue = Object.prototype.hasOwnProperty.call(symbols, group) ? symbols[group] : undefined
    const codes = ownValue === undefined ? [] : ownValue
    if (!Array.isArray(codes)) throw new Error(`${group}: قائمة الرموز غير صالحة`)
    if (codes.length > 200) throw new Error(`${group}: عدد الرموز يتجاوز الحد التقني 200`)
    const seen = new Set<string>()
    for (const code of codes) {
      if (typeof code !== 'string' || !PAYROLL_FORMULA_SYMBOL_PATTERN.test(code)) throw new Error(`${group}: كود غير صالح «${String(code)}»؛ حروف إنجليزية كبيرة وأرقام وشرطة سفلية، يبدأ بحرف وبحد أقصى 40 محرفًا`)
      if (reserved.has(code) || (code === 'NET' && group !== 'components')) throw new Error(`${group}: الرمز «${code}» محجوز للنظام أو لغة المعادلات`)
      if (seen.has(code)) throw new Error(`${group}: الرمز «${code}» مكرر`)
      seen.add(code)
    }
    seenByGroup.set(group, seen)
  }
  for (const code of seenByGroup.get('parameters')!) {
    if (seenByGroup.get('components')!.has(code)) throw new Error(`الرمز «${code}» مستخدم كبند ومعامل؛ يجب أن تكون أكوادهما مختلفة`)
  }
}

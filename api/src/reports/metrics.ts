// B2.13: قاموس المؤشرات — تعريف واحد لكل مؤشر، تقرا منه اللوحة والتقارير والتصدير.
// ملف صرف (من غير Nest ولا TypeORM): الخادم بيحسب بقواعده، والواجهة بتعرض التعريف المكتوب.

export type MetricKey = 'headcount' | 'active_employees' | 'turnover' | 'absence' | 'overtime' | 'employee_cost'
export type MetricUnit = 'count' | 'percent' | 'hours' | 'money'

export interface MetricDefinition {
  key: MetricKey
  label: string
  unit: MetricUnit
  /** التعريف زي ما بيتعرض للمستخدم جنب الرقم */
  definition: string
  /** المؤشر محسوب لفترة (شهر الرواتب)، مش للحظة دلوقتي */
  period: boolean
  /** موديولات لازم تكون مفعّلة للقارئ عشان المؤشر يظهر */
  modules: readonly string[]
  /** صلاحية فوق reports.view */
  perm?: string
}

export const METRICS: ReadonlyArray<MetricDefinition> = [
  { key: 'headcount', label: 'عدد الموظفين', unit: 'count', period: false, modules: [],
    definition: 'الموظفون الحاليون النهارده: ملف مفعّل وحالته مش «منتهي الخدمة» ولا «مؤرشف».' },
  { key: 'active_employees', label: 'الموظفون النشطون', unit: 'count', period: false, modules: [],
    definition: 'موظف حالي حالته النهارده «نشط»: مش تحت التجربة، ولا في فترة إشعار، ولا موقوف.' },
  { key: 'turnover', label: 'دوران العمالة', unit: 'percent', period: true, modules: [],
    definition: 'اللي خرجوا في الفترة ÷ متوسط عدد الموظفين أول الفترة وآخرها × 100.' },
  { key: 'absence', label: 'نسبة الغياب', unit: 'percent', period: true, modules: ['attendance'],
    definition: 'أيام الغياب ÷ أيام العمل المطلوبة (حضور + تأخير + انصراف مبكر + غياب) × 100، من غير أيام قبل المباشرة أو بعد آخر يوم عمل.' },
  { key: 'overtime', label: 'ساعات الإضافي', unit: 'hours', period: true, modules: ['overtime'],
    definition: 'الساعات المستحقة في سجلات الإضافي المعتمدة والمصروفة في الفترة.' },
  { key: 'employee_cost', label: 'تكلفة الموظف', unit: 'money', period: true, modules: ['payroll'], perm: 'payroll.view',
    definition: 'تكلفة الشركة (إجمالي المستحق + حصة صاحب العمل في التأمينات) في مسيرات الشهر المعتمدة والمصروفة ÷ عدد الموظفين فيها، لكل عملة لوحدها.' },
]

export const metricOf = (key: MetricKey): MetricDefinition => METRICS.find(metric => metric.key === key)!

// ===== الموظف الحالي والموظف النشط =====

/** حالات اللي خرج من العدد */
export const LEFT_STATUSES: readonly string[] = ['archived', 'terminated']
/** حالات الإضافي اللي بتتحسب في المؤشر */
export const OVERTIME_COUNTED_STATUSES: readonly string[] = ['APPROVED', 'PAID']

const truthy = (value: unknown): boolean => value === true || value === 1 || value === '1'

/** الموظف الحالي (العدد): ملف مفعّل وحالته المحفوظة مش منتهي الخدمة ولا مؤرشف — شرط كارت «إجمالي الموظفين» في اللوحة بالحرف. */
export const isCurrentEmployee = (row: { status: string; isActive: unknown }): boolean =>
  truthy(row.isActive) && !LEFT_STATUSES.includes(row.status)

/** نفس الشرط في SQL (alias بنقطته، مثلًا 'e.') */
export const currentEmployeeSql = (alias = ''): string =>
  `${alias}isActive = 1 AND ${alias}status NOT IN (${LEFT_STATUSES.map(status => `'${status}'`).join(', ')})`

/** الموظف النشط: موظف حالي حالته المعروضة النهارده «نشط» (الموقوف بفترة مش نشط). */
export const isActiveEmployee = (row: { status: string; isActive: unknown }, displayStatus: string): boolean =>
  isCurrentEmployee(row) && displayStatus === 'active'

// ===== النسب =====

/** نسبة مئوية بخانتين، أو null لو المقام صفر (مفيش رقم يتقال) */
export const percent = (part: number, whole: number): number | null =>
  whole > 0 ? Math.round((part * 10000) / whole) / 100 : null

/** الدوران: اللي خرجوا ÷ متوسط العدد أول الفترة وآخرها */
export const turnoverRate = (leavers: number, atStart: number, atEnd: number): number | null =>
  percent(leavers, (atStart + atEnd) / 2)

/** الغياب: أيام الغياب ÷ أيام العمل المطلوبة */
export const absenceRate = (absentDays: number, requiredDays: number): number | null => percent(absentDays, requiredDays)

// ===== شروط SQL المشتركة =====

/** بداية فترة الخدمة الحالية للموظف (e = alias جدول الموظفين) */
export const serviceStartSql = (e: string): string => `COALESCE(${e}.actualStartDate, ${e}.joinDate, '1900-01-01')`

/**
 * يوم غياب برّه فترة الخدمة (مش غياب): قبل المباشرة، أو بعد آخر يوم عمل (ملف إنهاء خدمة غير ملغي بعد التعيين)، أو بعد تاريخ
 * الأرشفة لو مفيش ملف كده. a = alias أيام الحضور، e = alias الموظفين. نفس شرط تقرير الحضور بالحرف (employmentWindowOf).
 */
export const absenceOutsideServiceSql = (a: string, e: string): string => `(
           ${a}.date < ${serviceStartSql(e)}
           OR EXISTS (
             SELECT 1 FROM offboarding_cases oc
              WHERE oc.employeeId = ${a}.employeeId AND oc.status <> 'CANCELLED'
                AND oc.lastWorkingDay < ${a}.date
                AND oc.lastWorkingDay >= ${serviceStartSql(e)})
           OR (${e}.archivedAt IS NOT NULL AND CAST(${e}.archivedAt AS date) < ${a}.date AND NOT EXISTS (
             SELECT 1 FROM offboarding_cases ob
              WHERE ob.employeeId = ${a}.employeeId AND ob.status <> 'CANCELLED'
                AND ob.lastWorkingDay >= ${serviceStartSql(e)})))`

/**
 * آخر يوم في فترة الخدمة الحالية لموظف خرج (منتهي الخدمة أو مؤرشف): آخر يوم عمل في ملف الإنهاء غير الملغي بعد التعيين، وإلا
 * تاريخ الأرشفة. null للموظف الحالي، ولموظف خرج من غير تاريخ معروف.
 */
export const serviceEndSql = (e: string): string => `CASE WHEN ${e}.status IN (${LEFT_STATUSES.map(status => `'${status}'`).join(', ')}) THEN COALESCE(
             (SELECT MAX(oc.lastWorkingDay) FROM offboarding_cases oc
               WHERE oc.employeeId = ${e}.id AND oc.status <> 'CANCELLED' AND oc.lastWorkingDay >= ${serviceStartSql(e)}),
             CAST(${e}.archivedAt AS date)) END`

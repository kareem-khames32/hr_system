// B-ADD.20 (طلب المالك 12 أكتوبر 2026): حسابات اللوحة الإحصائية الصافية — من غير React ولا نداءات، عشان تتختبر لوحدها.
// كل حاجة هنا مبنية على نفس الأرقام اللي الخادم بعتها للحساب (بصلاحيته ونطاقه): مفيش رقم جديد ولا اسم جديد، ومفيش ذكاء اصطناعي —
// «محتاج انتباهك» قواعد ثابتة مكتوبة تحت بحدودها.
import type {
  AttendanceCard, BucketCounts, DashboardCardKey, LeavesCard, ModulesStrip, OvertimeCard, PayrollCard, RequestsCard, TasksCard, TrendsCard, WorkforceCard,
  WorkforceInsights,
} from './dashboard-api'

/** أقصى كروت أشخاص في اللوحة الجانبية — الباقي في الشاشة التفصيلية */
export const PEOPLE_PANEL_LIMIT = 50

const pad = (value: number) => String(value).padStart(2, '0')
const n = (value: number) => Number(value ?? 0).toLocaleString('en-US')
/** رقم بكسر واحد من غير صفر زايد: 2 · 2.5 */
const short = (value: number) => String(Math.round(Math.abs(value) * 10) / 10)

/** يوم بعد (أو قبل، بالسالب) n يوم — منتصف النهار، من غير انزلاق مع التوقيت الصيفي */
export function shiftDay(date: string, days: number): string {
  const at = new Date(`${date}T12:00:00`)
  at.setDate(at.getDate() + days)
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`
}

const requiredOf = (counts: BucketCounts) => counts.present + counts.late + counts.absent
const pct = (part: number, whole: number): number | null => (whole > 0 ? Math.round((part * 1000) / whole) / 10 : null)

/** نسبة حضور يوم من خاناته: (حاضر + متأخر) ÷ (حاضر + متأخر + غايب) — null لو مفيش حد مطلوب منه الحضور */
export const attendanceRateOf = (counts: BucketCounts | null | undefined): number | null =>
  (counts ? pct(counts.present + counts.late, requiredOf(counts)) : null)
export const absenceRateOf = (counts: BucketCounts | null | undefined): number | null => (counts ? pct(counts.absent, requiredOf(counts)) : null)

// ===== المقارنة بالفترة اللي قبلها =====
export interface Delta {
  /** الفرق (الحالي − السابق) */
  diff: number
  direction: 'up' | 'down' | 'flat'
  /** الحركة دي كويسة؟ null = مالهاش حكم (عدد الموظفين مثلًا) */
  good: boolean | null
}

/** فرق قيمة عن اللي قبلها؛ higherIsBetter بيحدد الحكم (الغياب: الأقل أحسن). فرق أقل من نص = «زي ما هو». null لو واحدة من القيمتين مش موجودة. */
export function deltaOf(current: number | null | undefined, previous: number | null | undefined, higherIsBetter: boolean | null): Delta | null {
  if (current === null || current === undefined || previous === null || previous === undefined) return null
  const diff = Math.round((current - previous) * 10) / 10
  const direction = Math.abs(diff) < 0.5 ? 'flat' : diff > 0 ? 'up' : 'down'
  return { diff, direction, good: direction === 'flat' || higherIsBetter === null ? null : (direction === 'up') === higherIsBetter }
}

// ===== نمط أيام الأسبوع =====
// السبت أول الأسبوع
const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5]
const WEEKDAY_NAMES = ['الأحد', 'الاتنين', 'التلات', 'الأربع', 'الخميس', 'الجمعة', 'السبت']

export interface WeekdayRate { weekday: number; label: string; required: number; absence: number | null; late: number | null }

/** متوسط الغياب والتأخير لكل يوم من أيام الأسبوع جوه نافذة الاتجاه — موزون بعدد المطلوب منهم الحضور في كل يوم */
export function weekdayPattern(days: TrendsCard['days']): WeekdayRate[] {
  const cells = WEEKDAY_NAMES.map(() => ({ required: 0, absent: 0, late: 0 }))
  for (const day of days) {
    if (!day.required) continue
    const cell = cells[new Date(`${day.date}T12:00:00`).getDay()]
    cell.required += day.required
    cell.absent += ((day.absence ?? 0) * day.required) / 100
    cell.late += ((day.late ?? 0) * day.required) / 100
  }
  return WEEK_ORDER.map((weekday) => ({
    weekday, label: WEEKDAY_NAMES[weekday], required: cells[weekday].required,
    absence: pct(cells[weekday].absent, cells[weekday].required), late: pct(cells[weekday].late, cells[weekday].required),
  }))
}

// ===== «محتاج انتباهك» =====
/** حدود القواعد — ثابتة (مش إعدادات) */
export const ATTENTION = {
  /** وحدة أقل من كده مطلوب منهم الحضور مابتتقارنش بمتوسطها (موظف واحد غايب = 100%) */
  unitMinRequired: 3,
  unitMinAbsent: 2,
  /** غياب اليوم قد متوسط الوحدة كام مرة، وزيادة عنه بكام نقطة على الأقل */
  unitSpikeFactor: 2,
  unitSpikePoints: 10,
  /** أقصى وحدات في القاعدة دي */
  maxUnits: 3,
  /** غياب الفترة أعلى من الفترة اللي قبلها بكام نقطة */
  periodRisePoints: 3,
  /** أقصى جمل معروضة */
  maxItems: 8,
} as const

export interface AttentionItem { key: string; tone: 'red' | 'yellow'; text: string; href: string | null }

export interface AttentionInput {
  /** شاشة كل كارت زي ما الخادم بعتها (الكارت اللي الحساب مايشوفوش مش موجود) */
  hrefs: Partial<Record<DashboardCardKey, string>>
  attendance?: AttendanceCard | null
  trends?: TrendsCard | null
  previous?: TrendsCard | null
  requests?: RequestsCard | null
  tasks?: TasksCard | null
  overtime?: OvertimeCard | null
  workforce?: WorkforceCard | null
  payroll?: PayrollCard | null
  modules?: ModulesStrip | null
}

/**
 * جمل «محتاج انتباهك»: كل جملة قاعدة ثابتة على رقم راجع للحساب أصلًا، ومعاها الشاشة اللي بتتعالج فيها. الأحمر الأول ثم الأصفر،
 * وبترتيب القواعد. القسم اللي الحساب مايشوفوش مش مبعوت، فمفيش جملة منه.
 */
export function attentionItems(input: AttentionInput): AttentionItem[] {
  const items: AttentionItem[] = []
  const add = (key: string, tone: 'red' | 'yellow', text: string, href: string | null | undefined) => items.push({ key, tone, text, href: href ?? null })
  const { hrefs, attendance, trends, previous, requests, tasks, overtime, workforce, payroll, modules } = input

  // 1) وحدة غيابها في اليوم المختار أعلى بوضوح من متوسطها هي في الفترة
  if (attendance && trends) {
    const average = new Map(trends.units.map((unit) => [unit.group, unit.absence]))
    const spikes = attendance.rows.map((row) => ({ row, required: requiredOf(row.counts), today: absenceRateOf(row.counts), usual: average.get(row.group) ?? null }))
      .filter((item): item is typeof item & { today: number; usual: number } => item.today !== null && item.usual !== null
        && item.required >= ATTENTION.unitMinRequired && item.row.counts.absent >= ATTENTION.unitMinAbsent
        && item.today >= item.usual * ATTENTION.unitSpikeFactor && item.today - item.usual >= ATTENTION.unitSpikePoints)
      .sort((a, b) => (b.today - b.usual) - (a.today - a.usual))
      .slice(0, ATTENTION.maxUnits)
    for (const { row, today, usual } of spikes) {
      add(`absence:${row.group}`, 'red', `${row.name}: غياب ${attendance.isToday ? 'النهارده' : 'اليوم المختار'} ${short(today)}% (${n(row.counts.absent)} موظف) — متوسطه في الفترة ${short(usual)}%`, hrefs.attendance)
    }
  }

  // 2) الطلبات
  if (requests) {
    if (requests.overdue > 0) add('requests:overdue', 'red', `${n(requests.overdue)} طلب عدّى مهلة خطوته الحالية`, hrefs.requests)
    const old = requests.byAge.find((band) => band.key === 'older')?.count ?? 0
    if (old > 0) add('requests:old', 'yellow', `${n(old)} طلب معلّق بقاله أكتر من أسبوع — أقدمهم من ${n(requests.oldestDays)} يوم`, hrefs.requests)
    if (requests.approvedNotExecuted > 0) add('requests:execution', 'yellow', `${n(requests.approvedNotExecuted)} طلب معتمد ولسه مااتنفذش`, hrefs.requests)
  }

  // 3) المهام والإضافي
  if (tasks && tasks.available !== false && tasks.overdue > 0) add('tasks:overdue', 'red', `${n(tasks.overdue)} مهمة فات ميعادها`, hrefs.tasks)
  if (overtime && overtime.pendingEntries > 0) add('overtime:pending', 'yellow', `${n(overtime.pendingEntries)} حركة إضافي مستنية اعتماد`, hrefs.overtime)

  // 4) العقود والتجربة والمستندات
  if (workforce) {
    if (workforce.contractsEnding.expired > 0) add('contracts:expired', 'red', `${n(workforce.contractsEnding.expired)} موظف عقده انتهى ولسه على رأس العمل`, hrefs.workforce)
    if (workforce.contractsEnding.count > 0) add('contracts:ending', 'yellow', `${n(workforce.contractsEnding.count)} عقد هينتهي خلال ${workforce.windowDays} يوم`, hrefs.workforce)
    if (workforce.probationEnding.count > 0) add('probation:ending', 'yellow', `${n(workforce.probationEnding.count)} موظف فترة تجربته هتنتهي خلال ${workforce.windowDays} يوم`, hrefs.workforce)
    if (workforce.documentsEnding && workforce.documentsEnding.expired > 0) add('documents:expired', 'red', `${n(workforce.documentsEnding.expired)} مستند موظف منتهي`, '/employees/documents')
  }

  // 5) تنبيهات الرواتب قبل الاعتماد (الكارت نفسه لصاحب صلاحية الرواتب بس)
  if (payroll) payroll.alerts.forEach((alert, index) => add(`payroll:${index}`, alert.tone, `${alert.text} (${n(alert.count)})`, hrefs.payroll))

  // 6) غياب الفترة أعلى من الفترة اللي قبلها
  if (trends && previous && trends.summary.absence !== null && previous.summary.absence !== null
    && trends.summary.absence - previous.summary.absence >= ATTENTION.periodRisePoints) {
    add('absence:period', 'yellow', `نسبة الغياب في آخر ${trends.window} يوم ${short(trends.summary.absence)}% — أعلى من الفترة اللي قبلها (${short(previous.summary.absence)}%)`, hrefs.trends)
  }

  // 7) باقي الموديولات: الرقم اللي الخادم لوّنه أحمر (زي «إقرارات فات ميعادها»)
  for (const tile of modules?.modules ?? []) {
    for (const stat of tile.stats) if (stat.tone === 'red' && stat.value > 0) add(`module:${tile.key}:${stat.label}`, 'red', `${tile.title}: ${n(stat.value)} ${stat.label}`, tile.href)
  }

  return [...items.filter((item) => item.tone === 'red'), ...items.filter((item) => item.tone === 'yellow')]
}

// ===== سطر الخلاصة تحت عنوان كل قسم =====
export function attendanceTakeaway(trends: TrendsCard | null | undefined, previous: TrendsCard | null | undefined): string {
  if (!trends || trends.summary.attendance === null) return 'مفيش أيام حضور محسوبة في الفترة دي.'
  const base = `نسبة الحضور في آخر ${trends.window} يوم ${short(trends.summary.attendance)}% والغياب ${short(trends.summary.absence ?? 0)}%`
  const delta = deltaOf(trends.summary.attendance, previous?.summary.attendance, true)
  if (!delta) return `${base}.`
  if (delta.direction === 'flat') return `${base} — زي الفترة اللي قبلها تقريبًا.`
  return `${base} — ${delta.direction === 'up' ? 'أحسن من' : 'أقل من'} الفترة اللي قبلها بـ${short(delta.diff)} نقطة.`
}

export function workforceTakeaway(workforce: WorkforceCard | null | undefined, insights: WorkforceInsights | null | undefined): string {
  if (!workforce) return ''
  const head = `${n(workforce.headcount)} موظف، منهم ${n(workforce.onProbation)} تحت التجربة`
  if (!insights) return `${head}.`
  const joiners = insights.months.reduce((sum, month) => sum + month.joiners, 0)
  const turnover = insights.turnover.rate === null ? '' : `، والدوران ${short(insights.turnover.rate)}%`
  return `${head} — في آخر ${insights.months.length} شهر ${n(joiners)} تعيين و${n(insights.turnover.leavers)} خروج${turnover}.`
}

export function leavesTakeaway(leaves: LeavesCard | null | undefined): string {
  if (!leaves) return ''
  const top = leaves.topUnits[0]
  return `${n(leaves.today.onLeave)} في إجازة ${leaves.isToday ? 'النهارده' : 'في اليوم المختار'} و${n(leaves.nextWeek.employees)} في الأسبوع اللي بعده${top ? ` — أكتر قسم: ${top.name}` : ''}.`
}

export function requestsTakeaway(requests: RequestsCard | null | undefined): string {
  if (!requests) return ''
  if (!requests.pending) return requests.approvedNotExecuted ? `مفيش طلبات معلّقة — و${n(requests.approvedNotExecuted)} معتمد ولسه مااتنفذش.` : 'مفيش طلبات معلّقة.'
  return `${n(requests.pending)} طلب معلّق${requests.overdue ? `، منهم ${n(requests.overdue)} عدّى مهلته` : ' وكلهم جوه مهلتهم'} — أقدمهم من ${n(requests.oldestDays)} يوم.`
}

export function tasksTakeaway(tasks: TasksCard | null | undefined): string {
  if (!tasks || tasks.available === false) return ''
  if (!tasks.open) return 'مفيش مهام مفتوحة.'
  return `${n(tasks.open)} مهمة مفتوحة${tasks.overdue ? `، منهم ${n(tasks.overdue)} فات ميعادها` : ' ومفيش متأخر'}.`
}

export function overtimeTakeaway(overtime: OvertimeCard | null | undefined): string {
  if (!overtime) return ''
  return `${n(Math.round(overtime.hours * 10) / 10)} ساعة إضافي معتمدة في شهر الرواتب${overtime.pendingEntries ? `، و${n(overtime.pendingEntries)} حركة مستنية اعتماد` : ''}.`
}

export function payrollTakeaway(payroll: PayrollCard | null | undefined): string {
  if (!payroll) return ''
  const alerts = payroll.alerts.reduce((sum, alert) => sum + alert.count, 0)
  return `${n(payroll.runs.length)} مسير في شهر الرواتب الجاري${alerts ? `، و${n(alerts)} تنبيه قبل الاعتماد` : ' ومن غير تنبيهات'}.`
}

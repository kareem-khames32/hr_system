// B-ADD.3: كروت لوحة الإدارة — ملف صرف (من غير Nest ولا TypeORM): سجل الكروت بصلاحياتها وموديولاتها، وتصنيف يوم الحضور لخانات
// الكارت، وتجميع «إدارة ← قسم ← فريق». الخادم بيحسب بيه، والاختبارات بتقراه لوحده.
// القاعدة: كل كارت ليه صلاحية فوق «لوحة التحكم الإدارية»، وكل رقم جوه نطاق فروع الحساب، ومفيش مبلغ من غير «عرض مسيرات الرواتب».

export type DashboardCardKey =
  | 'attendance' | 'absentLate' | 'leaves' | 'workforce' | 'requests' | 'tasks' | 'overtime' | 'payroll' | 'trends'

export interface DashboardCardDef {
  key: DashboardCardKey
  title: string
  /** صلاحية الكارت (يكفي واحدة) — نفس صلاحية الشاشة الكاملة اللي «شوف الكل» بيودّي لها */
  perms: readonly string[]
  /** موديولات لازم تكون مفعّلة للحساب عشان الكارت يظهر */
  modules: readonly string[]
  /** الشاشة الكاملة */
  href: string
}

export const DASHBOARD_CARDS: ReadonlyArray<DashboardCardDef> = [
  { key: 'attendance', title: 'حضور النهارده', perms: ['attendance.view_all'], modules: ['attendance'], href: '/attendance' },
  { key: 'absentLate', title: 'الغايبين والمتأخرين', perms: ['attendance.view_all'], modules: ['attendance'], href: '/attendance' },
  { key: 'leaves', title: 'الإجازات', perms: ['leaves.view_all'], modules: ['leave'], href: '/leaves' },
  { key: 'workforce', title: 'القوى العاملة', perms: ['employees.view'], modules: [], href: '/employees' },
  { key: 'requests', title: 'الطلبات', perms: ['requests.view_all'], modules: ['requests'], href: '/requests-console' },
  { key: 'tasks', title: 'المهام', perms: ['tasks.view_all'], modules: ['tasks'], href: '/tasks' },
  { key: 'overtime', title: 'الإضافي', perms: ['attendance.view_all', 'overtime.confirm'], modules: ['overtime'], href: '/attendance/overtime' },
  { key: 'payroll', title: 'الرواتب', perms: ['payroll.view'], modules: ['payroll'], href: '/payroll' },
  { key: 'trends', title: 'اتجاهات الحضور', perms: ['attendance.view_all'], modules: ['attendance'], href: '/reports' },
]

export const dashboardCardOf = (key: DashboardCardKey): DashboardCardDef => DASHBOARD_CARDS.find(card => card.key === key)!

/** صلاحية أي مبلغ في اللوحة (كارت الرواتب كله، ومبلغ الإضافي) */
export const DASHBOARD_MONEY_PERM = 'payroll.view'
/** صلاحية رقم تليفون الموظف في كارت الغايبين: نفس صلاحية شاشة الموظفين اللي التليفون ظاهر فيها */
export const DASHBOARD_CONTACT_PERM = 'employees.view'

// ===== خانات حضور اليوم =====

export type AttendanceBucket = 'present' | 'late' | 'absent' | 'leave' | 'mission' | 'pending' | 'rest' | 'other'

/** الترتيب المعروض: حاضر، متأخر، غايب، إجازة، مأمورية أو عن بعد، لسه مابصمش، راحة، ثم اللي برّه السبعة */
export const ATTENDANCE_BUCKETS: ReadonlyArray<{ key: AttendanceBucket; label: string; tone: 'green' | 'yellow' | 'red' | 'blue' | 'gray' }> = [
  { key: 'present', label: 'حاضر', tone: 'green' },
  { key: 'late', label: 'متأخر', tone: 'yellow' },
  { key: 'absent', label: 'غايب', tone: 'red' },
  { key: 'leave', label: 'إجازة', tone: 'blue' },
  { key: 'mission', label: 'مأمورية أو عن بعد', tone: 'blue' },
  { key: 'pending', label: 'لسه مابصمش', tone: 'gray' },
  { key: 'rest', label: 'راحة', tone: 'gray' },
  { key: 'other', label: 'أخرى', tone: 'gray' },
]

export const isAttendanceBucket = (value: unknown): value is AttendanceBucket =>
  typeof value === 'string' && ATTENDANCE_BUCKETS.some(bucket => bucket.key === value)

export type BucketCounts = Record<AttendanceBucket, number>
export const emptyBucketCounts = (): BucketCounts =>
  ({ present: 0, late: 0, absent: 0, leave: 0, mission: 0, pending: 0, rest: 0, other: 0 })

const punched = (row: { checkIn?: unknown; checkOut?: unknown }): boolean =>
  (row.checkIn !== null && row.checkIn !== undefined && row.checkIn !== '') ||
  (row.checkOut !== null && row.checkOut !== undefined && row.checkOut !== '')

/**
 * خانة صف يوم محسوب (attendance_days.status — تصنيف محرك الحضور نفسه اللي بتعرضه شاشة الحضور وتقريرها). القاعدة هي قاعدة كروت
 * اللوحة القديمة بالحرف: «حضر فعلًا» = في الموعد + متأخر + منصرف بدري، وأي صف تاني ببصمة غير الإجازة والغياب؛ والمتأخر خانة لوحده.
 * العطلة من غير بصمة = راحة، ونص يوم إجازة من غير بصمة = إجازة.
 */
export function attendanceBucketOfDay(row: { status: string; checkIn?: unknown; checkOut?: unknown }): AttendanceBucket {
  switch (row.status) {
    case 'late': return 'late'
    case 'absent': return 'absent'
    case 'leave': return 'leave'
    case 'mission':
    case 'remote': return 'mission'
    case 'present':
    case 'early_leave': return 'present'
    case 'holiday': return punched(row) ? 'present' : 'rest'
    case 'partial_leave': return punched(row) ? 'present' : 'leave'
    case 'missing_punch': return 'present'
    default: return punched(row) ? 'present' : 'other'
  }
}

/** لون نسبة: أخضر/أصفر/أحمر بحدّين (النسبة الأعلى أسوأ) */
export const toneOfRate = (rate: number | null, warn: number, bad: number): 'green' | 'yellow' | 'red' | 'gray' =>
  rate === null ? 'gray' : rate >= bad ? 'red' : rate >= warn ? 'yellow' : 'green'

// ===== «إدارة ← قسم ← فريق» =====

export interface CardUnit { id: number; name: string; branchId: number; parentId: number | null; unitType: 'ADMINISTRATION' | 'DEPARTMENT' }
export interface CardTeam { id: number; name: string; departmentId: number }
export interface CardPlacement { branchId: number | null; departmentId: number | null; teamId: number | null }

/** المجموعة المطلوب فتحها: وحدة بأقسامها الفرعية، أو فريق، أو «من غير فريق» جوه وحدة، أو «من غير قسم» */
export type CardGroup =
  | { kind: 'unit'; id: number }
  | { kind: 'team'; id: number }
  | { kind: 'direct'; id: number }
  | { kind: 'none' }

/** قراءة group من الاستعلام: unit:12 · team:5 · direct:12 · none — null لقيمة غلط */
export function parseCardGroup(raw: unknown): CardGroup | null {
  if (raw === 'none') return { kind: 'none' }
  const match = typeof raw === 'string' ? /^(unit|team|direct):([1-9]\d{0,9})$/.exec(raw) : null
  return match ? { kind: match[1] as 'unit' | 'team' | 'direct', id: Number(match[2]) } : null
}

export interface CardTree {
  units: Map<number, CardUnit>
  teams: Map<number, CardTeam>
  childrenOf: (unitId: number | null) => CardUnit[]
  /** الوحدة وكل اللي تحتها */
  subtreeOf: (unitId: number) => Set<number>
  /** الفرق اللي في الوحدة نفسها */
  teamsOf: (unitId: number) => CardTeam[]
}

/** شجرة نطاق الحساب (وحدات وفرق GET /org/filter-context): الأب اللي مش ظاهر للحساب null من الخادم، فالوحدة بتبقى جذر. */
export function cardTree(units: readonly CardUnit[], teams: readonly CardTeam[]): CardTree {
  const unitById = new Map(units.map(unit => [unit.id, unit]))
  const teamById = new Map(teams.map(team => [team.id, team]))
  const children = new Map<number | null, CardUnit[]>()
  for (const unit of units) {
    const parent = unit.parentId !== null && unitById.has(unit.parentId) && unit.parentId !== unit.id ? unit.parentId : null
    const list = children.get(parent)
    if (list) list.push(unit)
    else children.set(parent, [unit])
  }
  const teamsByUnit = new Map<number, CardTeam[]>()
  for (const team of teams) {
    const list = teamsByUnit.get(team.departmentId)
    if (list) list.push(team)
    else teamsByUnit.set(team.departmentId, [team])
  }
  const subtrees = new Map<number, Set<number>>()
  const subtreeOf = (unitId: number): Set<number> => {
    const known = subtrees.get(unitId)
    if (known) return known
    const out = new Set<number>([unitId])
    // حارس الدايرة: الوحدة اللي اتزارت مابتتزارش تاني
    for (const queue = [unitId]; queue.length;) {
      for (const child of children.get(queue.pop()!) ?? []) if (!out.has(child.id)) { out.add(child.id); queue.push(child.id) }
    }
    subtrees.set(unitId, out)
    return out
  }
  return {
    units: unitById, teams: teamById,
    childrenOf: unitId => children.get(unitId) ?? [],
    subtreeOf,
    teamsOf: unitId => teamsByUnit.get(unitId) ?? [],
  }
}

/** مكان الموظف زي ما الشجرة شايفاه: قسم أو فريق مش ظاهر (مقفول أو من فرع تاني) = من غير */
export function visiblePlacement(tree: CardTree, row: CardPlacement): { unitId: number | null; teamId: number | null } {
  const unitId = row.departmentId !== null && tree.units.has(Number(row.departmentId)) ? Number(row.departmentId) : null
  const team = row.teamId !== null ? tree.teams.get(Number(row.teamId)) : undefined
  return { unitId, teamId: unitId !== null && team && team.departmentId === unitId ? team.id : null }
}

/** الموظف ده جوه المجموعة؟ */
export function inCardGroup(tree: CardTree, group: CardGroup, row: CardPlacement): boolean {
  const place = visiblePlacement(tree, row)
  switch (group.kind) {
    case 'none': return place.unitId === null
    case 'unit': return place.unitId !== null && tree.subtreeOf(group.id).has(place.unitId)
    case 'direct': return place.unitId === group.id && place.teamId === null
    case 'team': return place.teamId === group.id
  }
}

export interface CardGroupRow {
  /** المفتاح اللي بيتبعت في group لفتح الصف ده */
  group: string
  kind: CardGroup['kind']
  id: number | null
  name: string
  /** «إدارة» أو «قسم» أو «فريق» — فاضي لصفوف «من غير» */
  level: string
  branchId: number | null
  /** تحته مستوى تاني (أقسام أو فرق)؟ غير كده الضغط بيفتح الأسماء */
  expandable: boolean
}

const unitRow = (tree: CardTree, unit: CardUnit): CardGroupRow => ({
  group: `unit:${unit.id}`, kind: 'unit', id: unit.id, name: unit.name, level: unit.unitType === 'ADMINISTRATION' ? 'إدارة' : 'قسم',
  branchId: unit.branchId, expandable: tree.childrenOf(unit.id).length > 0 || tree.teamsOf(unit.id).length > 0,
})

/**
 * صفوف المستوى اللي تحت المجموعة: فوق خالص = الوحدات الجذر (الإدارات) و«من غير قسم»؛ تحت وحدة = أقسامها الفرعية وفرقها و«من غير
 * فريق»؛ الفريق و«من غير» مالهمش تحت (أسماء بس).
 */
export function cardGroupChildren(tree: CardTree, group: CardGroup | null): CardGroupRow[] {
  if (group === null) {
    return [...tree.childrenOf(null).map(unit => unitRow(tree, unit)),
      { group: 'none', kind: 'none', id: null, name: 'من غير قسم', level: '', branchId: null, expandable: false }]
  }
  if (group.kind !== 'unit') return []
  const unit = tree.units.get(group.id)
  if (!unit) return []
  const below = tree.childrenOf(unit.id).map(child => unitRow(tree, child))
  const teams: CardGroupRow[] = tree.teamsOf(unit.id).map(team => ({
    group: `team:${team.id}`, kind: 'team', id: team.id, name: team.name, level: 'فريق', branchId: unit.branchId, expandable: false,
  }))
  if (!below.length && !teams.length) return []
  return [...below, ...teams,
    { group: `direct:${unit.id}`, kind: 'direct', id: unit.id, name: `${unit.name} — من غير فريق`, level: '', branchId: unit.branchId, expandable: false }]
}

/**
 * المجموعة اللي الكارت بيبدأ منها لما الفلتر الموحد مختار وحدة أو فريق: الفريق المختار، أو جذر الوحدات المختارة لو واحد (الإدارة أو
 * القسم المختار) — عشان الكارت يفتح على اللي تحته مباشرة بدل صف واحد.
 */
export function startGroupOf(tree: CardTree, filter: { departmentIds: number[] | null; teamId: number | null }): CardGroup | null {
  if (filter.teamId !== null) return tree.teams.has(filter.teamId) ? { kind: 'team', id: filter.teamId } : null
  if (filter.departmentIds === null) return null
  const chosen = new Set(filter.departmentIds)
  const roots = filter.departmentIds.filter(id => {
    const unit = tree.units.get(id)
    return unit && (unit.parentId === null || !chosen.has(unit.parentId))
  })
  return roots.length === 1 ? { kind: 'unit', id: roots[0] } : null
}

// ===== الأعمار والمدد =====

/** عمر بالأيام من تاريخ (YYYY-MM-DD أو Date) لحد يوم (YYYY-MM-DD) — سالب = صفر */
export function ageInDays(from: string | Date | null | undefined, today: string): number {
  if (!from) return 0
  const start = from instanceof Date ? from : new Date(`${String(from).slice(0, 10)}T12:00:00`)
  const end = new Date(`${today}T12:00:00`)
  const days = Math.floor((end.getTime() - start.getTime()) / 86_400_000)
  return Number.isFinite(days) && days > 0 ? days : 0
}

/** شرايح عمر المعلّق: النهارده، 1–3 أيام، 4–7، أكتر من أسبوع */
export const AGE_BANDS: ReadonlyArray<{ key: string; label: string; min: number; max: number; tone: 'green' | 'yellow' | 'red' }> = [
  { key: 'today', label: 'النهارده', min: 0, max: 0, tone: 'green' },
  { key: 'd1_3', label: '1–3 أيام', min: 1, max: 3, tone: 'green' },
  { key: 'd4_7', label: '4–7 أيام', min: 4, max: 7, tone: 'yellow' },
  { key: 'older', label: 'أكتر من أسبوع', min: 8, max: Number.MAX_SAFE_INTEGER, tone: 'red' },
]
export const ageBandOf = (days: number) => AGE_BANDS.find(band => days >= band.min && days <= band.max) ?? AGE_BANDS[AGE_BANDS.length - 1]

const pad = (value: number) => String(value).padStart(2, '0')
/** يوم بعد n يوم (منتصف النهار — من غير انزلاق مع التوقيت الصيفي) */
export function dayAfter(date: string, days: number): string {
  const at = new Date(`${date}T12:00:00`)
  at.setDate(at.getDate() + days)
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`
}

export const YMD = /^\d{4}-\d{2}-\d{2}$/
/** تاريخ فعلي بصيغة YYYY-MM-DD؟ (2026-02-31 لأ) */
export const isDay = (value: unknown): value is string =>
  typeof value === 'string' && YMD.test(value) && dayAfter(value, 0) === value

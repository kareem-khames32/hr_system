// شجرة الأقسام في الواجهة (طلب المالك 27 سبتمبر: «الإدارة التنفيذية فوق كل الفروع») — مرآة api/src/org/department-tree.ts
// وقواعد org.service: القسم وأبوه في نفس الفرع، إلا «الإدارة التنفيذية» (قسم واحد، مديرها الرئيس التنفيذي): الأب الوحيد المسموح
// من فرع تاني. في العرض (شجرة الأقسام والهيكل التنظيمي) أقسام الفروع بتبان تحتها وجنبها فرعها؛ لكن أي توسعة لقسم بأقسامه
// الفرعية (نطاق المسير مثلًا) بتقف عند حد الفرع — نفس الخادم بالحرف. الخادم هو اللي بيفرض القاعدة، هنا عرض واختيار بس.
// «الإدارة ← القسم ← الفريق» (قرار المالك 27 سبتمبر): الإدارة نوع وحدة على نفس الشجرة (unitType) — رئيسية أو تحت الإدارة التنفيذية
// بس، والقسم تحت إدارة من فرعه أو الإدارة التنفيذية أو قسم من فرعه. «الإدارة» في العرض = أقرب إدارة صعودًا (orgPlacement).

export interface TreeDepartment {
  id: number
  name?: string
  branchId: number
  parentId?: number | null
  isExecutive?: boolean
  // «إدارة» أو «قسم» (قرار المالك 27 سبتمبر: «الإدارة ← القسم ← الفريق») — ترحيل 072
  unitType?: string | null
}

export type UnitType = 'ADMINISTRATION' | 'DEPARTMENT'
export const UNIT_TYPE_LABELS: Record<UnitType, string> = { ADMINISTRATION: 'إدارة', DEPARTMENT: 'قسم' }
// اسم عام للإدارة التنفيذية لما تكون أب مش ظاهر للحساب (فرع برّه نطاقه) — من غير اسمها المسجّل
export const EXECUTIVE_ADMINISTRATION_LABEL = 'الإدارة التنفيذية'

/** نوع الوحدة: المسجّل، ومن غيره (بيانات قبل ترحيل 072) الإدارة التنفيذية إدارة والباقي قسم. */
export function unitTypeOf(d: Pick<TreeDepartment, 'unitType' | 'isExecutive'>): UnitType {
  return d.unitType === 'ADMINISTRATION' || d.unitType === 'DEPARTMENT' ? d.unitType : d.isExecutive ? 'ADMINISTRATION' : 'DEPARTMENT'
}

export const isAdministration = (d: Pick<TreeDepartment, 'unitType' | 'isExecutive'>) => unitTypeOf(d) === 'ADMINISTRATION'

/** أبو القسم في الحسابات: الأب لو من نفس فرعه، وإلا null (الإدارة التنفيذية فوق الفروع مابتتحسبش أب لأقسام فرع تاني). */
export function branchLocalParentOf(departments: TreeDepartment[]): (id: number) => number | null {
  const byId = new Map(departments.map((d) => [d.id, d]))
  return (id: number) => {
    const dept = byId.get(id)
    const parent = dept?.parentId != null ? byId.get(dept.parentId) : undefined
    return dept && parent && parent.branchId === dept.branchId ? parent.id : null
  }
}

/** الأقسام المختارة بأقسامها الفرعية جوه فرع كل قسم — نفس توسعة الخادم (payrollDepartmentSet). */
export function branchLocalSubtree(departments: TreeDepartment[], ids: number[]): Set<number> {
  const parentOf = branchLocalParentOf(departments)
  const result = new Set(ids)
  for (let grew = true; grew; ) {
    grew = false
    for (const d of departments) {
      if (result.has(d.id)) continue
      const parent = parentOf(d.id)
      if (parent !== null && result.has(parent)) {
        result.add(d.id)
        grew = true
      }
    }
  }
  return result
}

/** أبو القسم مش ظاهر للحساب: حساب الفرع مايشوفش «الإدارة التنفيذية» (في فرع برّه نطاقه) اللي فوق أقسام فرعه. */
export function hasHiddenParent(dept: TreeDepartment, departments: TreeDepartment[]): boolean {
  return dept.parentId != null && !departments.some((d) => d.id === dept.parentId)
}

/** جذور شجرة الأقسام: بلا أب، أو أبوه مش ظاهر — فأقسام الفرع اللي تحت الإدارة التنفيذية تبان جذور بدل ما تختفي. */
export function departmentTreeRoots<T extends TreeDepartment>(departments: T[]): T[] {
  return departments.filter((d) => d.parentId == null || hasHiddenParent(d, departments))
}

/** أقسام من فروع تانية تحت القسم ده (للإدارة التنفيذية بس) — شيل تعليمها مرفوض طول ما هي موجودة. */
export function foreignChildrenOf<T extends TreeDepartment>(dept: TreeDepartment, departments: T[]): T[] {
  return departments.filter((d) => d.parentId === dept.id && d.branchId !== dept.branchId)
}

/** القسم تحت أب ظاهر من فرع تاني (= تحت الإدارة التنفيذية فوق الفروع) — الشجرة بتعرض فرعه جنبه. */
export function isCrossBranchChild(dept: TreeDepartment, departments: TreeDepartment[]): boolean {
  const parent = dept.parentId != null ? departments.find((d) => d.id === dept.parentId) : undefined
  return !!parent && parent.branchId !== dept.branchId
}

export const EXECUTIVE_PARENT_LABEL = 'الإدارة التنفيذية — فوق كل الفروع'

/** اسم خيار الإدارة التنفيذية في «القسم الأب»: «الإدارة التنفيذية — فوق كل الفروع» أو «اسمها (الإدارة التنفيذية) — فوق كل الفروع». */
export function executiveParentLabel(dept?: { name?: string } | null): string {
  const name = dept?.name?.trim()
  return !name || name === 'الإدارة التنفيذية' ? EXECUTIVE_PARENT_LABEL : `${name} (الإدارة التنفيذية) — فوق كل الفروع`
}

export interface ParentOption {
  id: number
  label: string
  executive: boolean
  // إدارة (مجموعة «الإدارات» في الاختيار) ولا قسم (الوحدة تبقى قسم فرعي تحته)
  administration: boolean
}

/**
 * الأب يصلح للوحدة؟ نفس قواعد org.service (قرار المالك 27 سبتمبر): الإدارة التنفيذية فوق كل الوحدات فمالهاش أب؛ الإدارة رئيسية أو
 * تحت الإدارة التنفيذية بس (من أي فرع)؛ القسم تحت الإدارة التنفيذية من أي فرع، أو إدارة أو قسم من فرعه (من غير فرع مختار: أي وحدة).
 */
export function parentAllowed(
  parent: TreeDepartment,
  unit: { branchId: number | null; unitType?: UnitType; makingExecutive?: boolean }
): boolean {
  if (unit.makingExecutive) return false
  if (unit.unitType === 'ADMINISTRATION') return !!parent.isExecutive
  return unit.branchId == null || parent.branchId === unit.branchId || !!parent.isExecutive
}

/**
 * اختيارات الأب في نموذج الإدارة/القسم بقواعد parentAllowed — عدا الوحدة نفسها والوحدات التابعة لها (دايرة). الإدارة التنفيذية
 * أول اختيار باسم «فوق كل الفروع»؛ والوحدة اللي هتبقى الإدارة التنفيذية مالهاش اختيارات (من غير أب).
 */
export function parentOptionsFor(
  departments: TreeDepartment[],
  opts: { branchId: number | null; editingId?: number | null; blocked?: Set<number>; makingExecutive?: boolean; unitType?: UnitType }
): ParentOption[] {
  const unit = { branchId: opts.branchId, unitType: opts.unitType ?? 'DEPARTMENT', makingExecutive: !!opts.makingExecutive }
  const usable = departments.filter((d) => d.id !== opts.editingId && !opts.blocked?.has(d.id) && parentAllowed(d, unit))
  const executive = usable.find((d) => d.isExecutive)
  const options: ParentOption[] = executive
    ? [{ id: executive.id, label: executiveParentLabel(executive), executive: true, administration: true }]
    : []
  for (const d of usable) {
    if (d.id !== executive?.id) options.push({ id: d.id, label: d.name ?? `قسم #${d.id}`, executive: false, administration: isAdministration(d) })
  }
  return options
}

/**
 * الأب بعد تغيير فرع الوحدة أو تعليمها إدارة تنفيذية (أو نوعها — unitType) في النموذج بقواعد parentAllowed: الإدارة التنفيذية تفضل
 * أب لأي فرع، وأب مايصلحش يتشال — مايفضلش أب غلط مستخبي والخادم يرفض الحفظ. dropped = اسم الأب اللي اتشال (للتنبيه). أب مش ظاهر
 * للحساب (الإدارة التنفيذية في فرع برّه نطاقه) بيفضل زي ما هو.
 */
export function parentAfterBranchChange(
  departments: TreeDepartment[],
  parentId: string,
  branchId: string,
  makingExecutive = false,
  unitType: UnitType = 'DEPARTMENT'
): { parentId: string; dropped: string | null } {
  if (!parentId) return { parentId, dropped: null }
  const parent = departments.find((d) => d.id === Number(parentId))
  if (!parent) return { parentId, dropped: null }
  const valid = parentAllowed(parent, { branchId: branchId ? Number(branchId) : null, unitType, makingExecutive })
  return valid ? { parentId, dropped: null } : { parentId: '', dropped: parent.name ?? `قسم #${parent.id}` }
}

/** إدارات تحت الوحدة (للإدارة التنفيذية) — شيل تعليمها أو تحويلها «قسم» مرفوض طول ما هي موجودة. */
export function childAdministrationsOf<T extends TreeDepartment>(dept: TreeDepartment, departments: T[]): T[] {
  return departments.filter((d) => d.parentId === dept.id && isAdministration(d))
}

export interface OrgPlacement<T extends TreeDepartment> {
  // أقرب إدارة من الوحدة لفوق (بادئة بيها) من الوحدات الظاهرة — null لو مفيش أو لو هي أب مش ظاهر
  administration: T | null
  // اسمها للعرض: اسمها، أو «الإدارة التنفيذية» العام لو الصعود وقف عند أب مش ظاهر للحساب (الإدارة التنفيذية في فرع برّه نطاقه)
  administrationName: string | null
  // الأقسام من تحت الإدارة لحد الوحدة (من فوق لتحت) — فاضية لو الوحدة نفسها إدارة
  departments: T[]
}

/**
 * مكان الوحدة في «الإدارة ← القسم ← الفريق»: صعودًا بـparentId (بحارس دايرة) لحد أول إدارة — نفس صعود «مدير الإدارة» وبطاقة صاحب
 * الطلب في الخادم، ومنه رابط الإدارة التنفيذية لفرع تاني. أب مش ظاهر للحساب مايبقاش غير الإدارة التنفيذية (الأب الوحيد المسموح من فرع
 * تاني)، فبيتعرض باسمها العام.
 */
export function orgPlacement<T extends TreeDepartment>(id: number | null | undefined, departments: T[]): OrgPlacement<T> {
  const byId = new Map(departments.map((d) => [d.id, d]))
  const chain: T[] = []
  const seen = new Set<number>()
  let hiddenParent = false
  for (let current = id ?? null; current != null && !seen.has(current); ) {
    seen.add(current)
    const unit = byId.get(current)
    if (!unit) {
      hiddenParent = chain.length > 0
      break
    }
    if (isAdministration(unit)) return { administration: unit, administrationName: unit.name ?? null, departments: chain.reverse() }
    chain.push(unit)
    current = unit.parentId ?? null
  }
  return { administration: null, administrationName: hiddenParent ? EXECUTIVE_ADMINISTRATION_LABEL : null, departments: chain.reverse() }
}

/** «الإدارة ← القسم ← القسم الفرعي» للوحدة — الإدارة نفسها باسمها بس، والقسم من غير إدارة بمساره من أعلى قسم. */
export function unitPathLabel(id: number | null | undefined, departments: TreeDepartment[]): string {
  const placement = orgPlacement(id, departments)
  return [placement.administrationName, ...placement.departments.map((d) => d.name ?? `قسم #${d.id}`)].filter(Boolean).join(' ← ')
}

export interface DepartmentChoice {
  id: number
  label: string
  administration: boolean
}
export interface DepartmentChoiceGroup {
  key: string
  label: string
  options: DepartmentChoice[]
}

/**
 * اختيارات القسم مجمّعة بالإدارة (نموذج الموظف وفلتر قائمة الموظفين): كل مجموعة إدارة، أولها الإدارة نفسها باختيار مباشر («الإدارة
 * نفسها» = موظفوها المباشرين — أو اللي يتبعت في administrationSuffix)، وبعدها أقسامها بالمسار «الإدارة ← القسم ← القسم الفرعي»، وفي
 * الآخر «أقسام من غير إدارة». branchId = وحدات الفرع ده بس؛ إدارتها ممكن تكون في فرع تاني (الإدارة التنفيذية فوق أقسام الفروع) فبتبان
 * اسم مجموعة بس.
 */
export function departmentChoiceGroups(
  departments: TreeDepartment[],
  opts: { branchId?: number | null; administrationSuffix?: string } = {}
): DepartmentChoiceGroup[] {
  const suffix = opts.administrationSuffix ?? 'الإدارة نفسها'
  const groups = new Map<string, DepartmentChoiceGroup>()
  const standalone: DepartmentChoiceGroup = { key: 'none', label: 'أقسام من غير إدارة', options: [] }
  for (const d of departments) {
    if (opts.branchId != null && d.branchId !== opts.branchId) continue
    const placement = orgPlacement(d.id, departments)
    const key = placement.administration ? `a${placement.administration.id}` : placement.administrationName ? 'x' : 'none'
    let group = key === 'none' ? standalone : groups.get(key)
    if (!group) {
      group = { key, label: placement.administrationName ?? '', options: [] }
      groups.set(key, group)
    }
    const name = d.name ?? `قسم #${d.id}`
    group.options.push(
      placement.administration?.id === d.id
        ? { id: d.id, label: `${name} (${suffix})`, administration: true }
        : { id: d.id, label: unitPathLabel(d.id, departments), administration: false }
    )
  }
  const byLabel = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label, 'ar')
  const ordered = [...groups.values()].sort(byLabel)
  if (standalone.options.length) ordered.push(standalone)
  for (const group of ordered) {
    group.options.sort((a, b) => Number(b.administration) - Number(a.administration) || byLabel(a, b))
  }
  return ordered
}

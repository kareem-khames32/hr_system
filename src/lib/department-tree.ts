// شجرة الأقسام في الواجهة (طلب المالك 27 سبتمبر: «الإدارة التنفيذية فوق كل الفروع») — مرآة api/src/org/department-tree.ts
// وقواعد org.service: القسم وأبوه في نفس الفرع، إلا «الإدارة التنفيذية» (قسم واحد، مديرها الرئيس التنفيذي): الأب الوحيد المسموح
// من فرع تاني. في العرض (شجرة الأقسام والهيكل التنظيمي) أقسام الفروع بتبان تحتها وجنبها فرعها؛ لكن أي توسعة لقسم بأقسامه
// الفرعية (نطاق المسير مثلًا) بتقف عند حد الفرع — نفس الخادم بالحرف. الخادم هو اللي بيفرض القاعدة، هنا عرض واختيار بس.

export interface TreeDepartment {
  id: number
  name?: string
  branchId: number
  parentId?: number | null
  isExecutive?: boolean
}

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
}

/**
 * اختيارات «القسم الأب» في نموذج القسم: الإدارة التنفيذية لأي فرع (فوق كل الفروع)، وباقي الأقسام من فرع القسم بس (من غير فرع
 * مختار: كل الأقسام) — عدا القسم نفسه والأقسام التابعة له (دايرة). القسم اللي هيتعلّم إدارة تنفيذية بياخد أب من فرعه بس
 * (الإدارة التنفيذية الحالية هيتشال منها التعليم — الخادم بيرفض غير كده).
 */
export function parentOptionsFor(
  departments: TreeDepartment[],
  opts: { branchId: number | null; editingId?: number | null; blocked?: Set<number>; makingExecutive?: boolean }
): ParentOption[] {
  const usable = departments.filter((d) => d.id !== opts.editingId && !opts.blocked?.has(d.id))
  const sameBranch = (d: TreeDepartment) => opts.branchId == null || d.branchId === opts.branchId
  const executive = opts.makingExecutive ? undefined : usable.find((d) => d.isExecutive)
  const options: ParentOption[] = executive ? [{ id: executive.id, label: executiveParentLabel(executive), executive: true }] : []
  for (const d of usable) {
    if (d.id !== executive?.id && sameBranch(d)) options.push({ id: d.id, label: d.name ?? `قسم #${d.id}`, executive: false })
  }
  return options
}

/**
 * الأب بعد تغيير فرع القسم (أو تعليمه إدارة تنفيذية) في النموذج: الإدارة التنفيذية تفضل أب لأي فرع، وأب من فرع تاني يتشال —
 * مايفضلش أب غلط مستخبي والخادم يرفض الحفظ. dropped = اسم الأب اللي اتشال (للتنبيه). أب مش ظاهر للحساب بيفضل زي ما هو.
 */
export function parentAfterBranchChange(
  departments: TreeDepartment[],
  parentId: string,
  branchId: string,
  makingExecutive = false
): { parentId: string; dropped: string | null } {
  if (!parentId) return { parentId, dropped: null }
  const parent = departments.find((d) => d.id === Number(parentId))
  if (!parent) return { parentId, dropped: null }
  const valid = !branchId || parent.branchId === Number(branchId) || (!!parent.isExecutive && !makingExecutive)
  return valid ? { parentId, dropped: null } : { parentId: '', dropped: parent.name ?? `قسم #${parent.id}` }
}

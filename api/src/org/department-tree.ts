// شجرة الأقسام في الحسابات والتصفية والصلاحيات (طلب المالك 27 سبتمبر: «الإدارة التنفيذية فوق كل الفروع»).
// القسم وأبوه في نفس الفرع دايمًا، إلا «الإدارة التنفيذية» (قسم واحد في الشركة، مديرها الرئيس التنفيذي): هي الأب الوحيد
// المسموح من فرع تاني (org.service). الرابط ده تنظيمي — بيبان في الهيكل التنظيمي وشجرة الأقسام — لكن أي توسعة لقسم بأقسامه
// الفرعية أو صعود لأقسامه الأعلى بيقف عند حد الفرع: عطلة أقسام أو مسير أو خصم/مكافأة جماعي على «الإدارة التنفيذية» مايوصلش
// لأقسام فرع تاني تحتها، ومدير قسم من فرع تاني تحتها مايتصعّدش لرئيسها التنفيذي، ومدير الإدارة التنفيذية مايكسبش سلطة
// «مدير قسم» على أقسام الفروع التانية. يعني كل حساب بيمشي في الشجرة بالظبط زي ما كان قبل ما الرابط ده يتسمح.

export type DepartmentLookup = (id: number) => number | null | undefined

export interface DepartmentTreeRow {
  id: number
  parentId?: number | null
  branchId?: number | null
}

const known = (value: number | null | undefined): value is number => value !== null && value !== undefined

/** أبو القسم في الحسابات: الأب لو في نفس فرع القسم، وإلا null (أب من فرع تاني = الإدارة التنفيذية فوق الفروع، أو مرجع ناقص). */
export function branchLocalParentOf(parentOf: DepartmentLookup, branchOf: DepartmentLookup): (id: number) => number | null {
  return (id: number) => {
    const parent = parentOf(id)
    if (!known(parent)) return null
    const branch = branchOf(id)
    return known(branch) && branch === branchOf(parent) ? parent : null
  }
}

/** نفس branchLocalParentOf من صفوف الأقسام (id وparentId وbranchId). */
export function branchLocalParentOfRows(rows: Iterable<DepartmentTreeRow>): (id: number) => number | null {
  const byId = new Map<number, DepartmentTreeRow>()
  for (const row of rows) byId.set(Number(row.id), row)
  const num = (value: unknown) => (value === null || value === undefined ? null : Number(value))
  return branchLocalParentOf(id => num(byId.get(id)?.parentId), id => num(byId.get(id)?.branchId))
}

/** الأقسام المختارة وكل أقسامها الفرعية جوه فرع كل قسم (ids = كل الأقسام المعروفة). */
export function branchLocalSubtree(roots: Iterable<number>, ids: Iterable<number>, parentOf: (id: number) => number | null): Set<number> {
  const result = new Set(roots)
  const all = [...ids]
  for (let grew = true; grew;) {
    grew = false
    for (const id of all) {
      if (result.has(id)) continue
      const parent = parentOf(id)
      if (parent !== null && result.has(parent)) { result.add(id); grew = true }
    }
  }
  return result
}

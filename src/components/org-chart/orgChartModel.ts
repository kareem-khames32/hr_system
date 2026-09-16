// نموذج الهيكل التنظيمي (بلا واجهة — يتختبر لوحده):
// «الإدارة التنفيذية» فوق: الرئيس التنفيذي (مدير القسم المعلَّم «إدارة تنفيذية») ومعاه السكرتير التنفيذي جنبه بس،
// وتحته الإدارات الرئيسية بترتيب أبوّة الأقسام (parentId)، وتحت كل قسم أقسامه الفرعية وفرقه.
// البيانات جاية من /branches و/departments و/teams و/employees، وكلها متقيدة بفرع الحساب من الخادم.

// الهيكل لمن على رأس العمل فقط — المنتهية خدمته والمؤرشف خارجه (أعضاءً ومدراء)
export const ORG_STATUSES = ['active', 'probation', 'notice_period', 'suspended']

export interface OrgBranchInput {
  id: number
  name: string
  isActive?: boolean
  isHeadquarters?: boolean
  managerEmployeeId?: number | null
}
export interface OrgDepartmentInput {
  id: number
  name: string
  branchId: number
  parentId?: number | null
  managerEmployeeId?: number | null
  isActive?: boolean
  isExecutive?: boolean
  executiveSecretaryEmployeeId?: number | null
}
export interface OrgTeamInput {
  id: number
  name: string
  departmentId: number
  leaderEmployeeId?: number | null
  isActive?: boolean
}
export interface OrgEmployeeInput {
  id: number
  fullName: string
  jobTitle?: string | null
  branchId: number
  departmentId?: number | null
  teamId?: number | null
  status: string
  photoFileId?: number | null
  email?: string | null
  phone?: string | null
}

export type OrgUnitKind = 'executive' | 'branch' | 'administration' | 'department' | 'team' | 'unassigned'

export interface OrgPerson {
  id: number
  name: string
  jobTitle: string
  initials: string
  photoFileId: number | null
  email: string
  phone: string
}

export interface OrgUnit {
  key: string // x = التنفيذية، b12 فرع، d12 قسم، t5 فريق، u12 بدون قسم
  kind: OrgUnitKind
  name: string
  branchName: string
  head: OrgPerson | null
  headLabel: string
  headcount: number // كل من تحت الوحدة (بفروعها)
  members: OrgPerson[] // المسندون للوحدة مباشرة (من غير رئيسها)
  children: OrgUnit[]
}

export interface OrgChart {
  root: OrgUnit
  secretary: OrgPerson | null
  // الإدارة التنفيذية متحددة من إعدادات الأقسام (true) أو مستنتجة من المسمى الوظيفي (false)
  executiveConfigured: boolean
  stats: { employees: number; departments: number; teams: number; managers: number }
}

export const UNIT_KIND_LABELS: Record<OrgUnitKind, string> = {
  executive: 'الإدارة التنفيذية',
  branch: 'فرع',
  administration: 'إدارة',
  department: 'قسم',
  team: 'فريق',
  unassigned: 'بدون قسم',
}

// تطبيع البحث بالعربي: الهمزات والتاء المربوطة والألف المقصورة والتشكيل
export function normalizeOrgText(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىئ]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/\s+/g, ' ')
    .trim()
}

const CEO_TITLE = /الرئيس التنفيذي|رئيس تنفيذي|\bceo\b|chief executive/i
const SECRETARY_TITLE = /سكرتير(ة)? (ال)?تنفيذي|السكرتير(ة)? التنفيذي|executive secretary|executive assistant/i

export function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'م'
  return parts.length === 1 ? parts[0].charAt(0) : `${parts[0].charAt(0)} ${parts[1].charAt(0)}`
}

export function buildOrgChart(input: {
  branches: OrgBranchInput[]
  departments: OrgDepartmentInput[]
  teams: OrgTeamInput[]
  employees: OrgEmployeeInput[]
  branchId?: number | null // فلتر الفرع (null = كل الفروع المتاحة للحساب)
}): OrgChart {
  const branchFilter = input.branchId ?? null
  const branches = input.branches.filter((b) => b.isActive !== false)
  const branchName = new Map(input.branches.map((b) => [b.id, b.name]))
  const inBranch = (id: number) => branchFilter == null || id === branchFilter

  const allActive = input.employees.filter((e) => ORG_STATUSES.includes(e.status))
  const empById = new Map(allActive.map((e) => [e.id, e]))
  const person = (id: number | null | undefined): OrgPerson | null => {
    const e = id ? empById.get(id) : undefined
    if (!e) return null
    return {
      id: e.id,
      name: e.fullName,
      jobTitle: e.jobTitle?.trim() || 'موظف',
      initials: initialsOf(e.fullName),
      photoFileId: e.photoFileId ?? null,
      email: e.email ?? '',
      phone: e.phone ?? '',
    }
  }

  const allDepts = input.departments.filter((d) => d.isActive !== false)
  const execDept = allDepts.find((d) => d.isExecutive) ?? null
  const depts = allDepts.filter((d) => inBranch(d.branchId))
  const deptById = new Map(depts.map((d) => [d.id, d]))
  const teams = input.teams.filter((t) => t.isActive !== false && deptById.has(t.departmentId))
  const teamById = new Map(teams.map((t) => [t.id, t]))
  const active = allActive.filter((e) => inBranch(e.branchId))

  // قسم الموظف الفعلي: قسمه، ولو في فريق يبقى قسم فريقه
  const deptOf = (e: OrgEmployeeInput): number | null => {
    const team = e.teamId ? teamById.get(e.teamId) : undefined
    if (team) return team.departmentId
    return e.departmentId && deptById.has(e.departmentId) ? e.departmentId : null
  }

  // الرئيس التنفيذي والسكرتير: من الإعداد، وإلا من المسمى الوظيفي
  const ceo = execDept ? person(execDept.managerEmployeeId) : person(allActive.find((e) => CEO_TITLE.test(e.jobTitle ?? ''))?.id)
  let secretary = execDept ? person(execDept.executiveSecretaryEmployeeId) : null
  if (!secretary && ceo) secretary = person(allActive.find((e) => e.id !== ceo.id && SECRETARY_TITLE.test(e.jobTitle ?? ''))?.id)

  const childrenOf = new Map<number | null, OrgDepartmentInput[]>()
  for (const d of depts) {
    if (execDept && d.id === execDept.id) continue
    const parent = d.parentId && deptById.has(d.parentId) ? d.parentId : null
    const list = childrenOf.get(parent) ?? []
    list.push(d)
    childrenOf.set(parent, list)
  }
  const byName = <T extends { name: string }>(list: T[]) => [...list].sort((a, b) => a.name.localeCompare(b.name, 'ar'))
  const memberList = (list: OrgEmployeeInput[], ...skip: (number | null | undefined)[]) =>
    byName(list.map((e) => ({ ...e, name: e.fullName })))
      .filter((e) => !skip.includes(e.id))
      .map((e) => person(e.id) as OrgPerson)

  const teamUnit = (t: OrgTeamInput, bName: string): OrgUnit => {
    const members = active.filter((e) => e.teamId === t.id)
    return {
      key: `t${t.id}`,
      kind: 'team',
      name: t.name,
      branchName: bName,
      head: person(t.leaderEmployeeId),
      headLabel: 'قائد الفريق',
      headcount: members.length,
      members: memberList(members, t.leaderEmployeeId),
      children: [],
    }
  }

  const seen = new Set<number>()
  const deptUnit = (d: OrgDepartmentInput, top: boolean): OrgUnit => {
    seen.add(d.id)
    const bName = branchName.get(d.branchId) ?? ''
    const subDepts = byName(childrenOf.get(d.id) ?? []).filter((c) => !seen.has(c.id)).map((c) => deptUnit(c, false))
    const teamUnits = byName(teams.filter((t) => t.departmentId === d.id)).map((t) => teamUnit(t, bName))
    const direct = active.filter((e) => deptOf(e) === d.id && !(e.teamId && teamById.has(e.teamId)))
    const inTeams = teamUnits.reduce((s, t) => s + t.headcount, 0)
    return {
      key: `d${d.id}`,
      kind: top ? 'administration' : 'department',
      name: d.name,
      branchName: bName,
      head: person(d.managerEmployeeId),
      headLabel: top ? 'مدير الإدارة' : 'مدير القسم',
      headcount: direct.length + inTeams + subDepts.reduce((s, c) => s + c.headcount, 0),
      members: memberList(direct, d.managerEmployeeId),
      children: [...subDepts, ...teamUnits],
    }
  }

  const topUnits: OrgUnit[] = []
  // الأقسام التابعة للإدارة التنفيذية نفسها تبقى تحت الرئيس التنفيذي مباشرة
  if (execDept && deptById.has(execDept.id)) {
    for (const c of byName(childrenOf.get(execDept.id) ?? [])) topUnits.push(deptUnit(c, true))
  }
  for (const d of byName(childrenOf.get(null) ?? [])) topUnits.push(deptUnit(d, true))
  const execTeams =
    execDept && deptById.has(execDept.id)
      ? byName(teams.filter((t) => t.departmentId === execDept.id)).map((t) => teamUnit(t, branchName.get(execDept.branchId) ?? ''))
      : []

  const unassigned = active.filter((e) => deptOf(e) == null)
  const unassignedUnits: OrgUnit[] = []
  for (const b of branches.filter((bb) => inBranch(bb.id))) {
    const list = unassigned.filter((e) => e.branchId === b.id)
    const members = memberList(list)
    if (members.length === 0) continue
    unassignedUnits.push({
      key: `u${b.id}`,
      kind: 'unassigned',
      name: branches.length > 1 && branchFilter == null ? `بدون قسم — ${b.name}` : 'موظفون بدون قسم',
      branchName: b.name,
      head: null,
      headLabel: '',
      headcount: members.length,
      members,
      children: [],
    })
  }

  const execDirect =
    execDept && deptById.has(execDept.id)
      ? active.filter((e) => deptOf(e) === execDept.id && !(e.teamId && teamById.has(e.teamId)))
      : []
  const visibleBranches = branches.filter((b) => inBranch(b.id))
  const singleBranch = visibleBranches.length === 1 ? visibleBranches[0] : null

  let root: OrgUnit
  if (ceo || !singleBranch) {
    root = {
      key: 'x',
      kind: 'executive',
      name: execDept?.name ?? UNIT_KIND_LABELS.executive,
      branchName: execDept ? branchName.get(execDept.branchId) ?? '' : '',
      head: ceo,
      headLabel: 'الرئيس التنفيذي',
      headcount: active.length,
      members: memberList(execDirect, ceo?.id, secretary?.id),
      children: [...topUnits, ...execTeams, ...unassignedUnits],
    }
  } else {
    // حساب فرع أو فلتر فرع بدون رئيس تنفيذي ظاهر: الفرع نفسه على القمة
    root = {
      key: `b${singleBranch.id}`,
      kind: 'branch',
      name: singleBranch.name,
      branchName: singleBranch.name,
      head: person(singleBranch.managerEmployeeId),
      headLabel: 'مدير الفرع',
      headcount: active.length,
      members: [],
      children: [...topUnits, ...execTeams, ...unassignedUnits],
    }
  }

  const managerIds = new Set<number>()
  for (const d of depts) if (d.managerEmployeeId && empById.has(d.managerEmployeeId)) managerIds.add(d.managerEmployeeId)
  for (const t of teams) if (t.leaderEmployeeId && empById.has(t.leaderEmployeeId)) managerIds.add(t.leaderEmployeeId)
  if (ceo) managerIds.add(ceo.id)

  return {
    root,
    secretary: root.kind === 'executive' ? secretary : null,
    executiveConfigured: execDept != null,
    stats: { employees: active.length, departments: depts.length, teams: teams.length, managers: managerIds.size },
  }
}

// كل مفاتيح الوحدات (لتوسيع الكل)
export function allUnitKeys(unit: OrgUnit, out: string[] = []): string[] {
  out.push(unit.key)
  unit.children.forEach((c) => allUnitKeys(c, out))
  return out
}

export interface OrgSearchResult {
  units: Set<string> // وحدات مطابقة (اسمها أو رئيسها)
  people: Set<number> // أشخاص مطابقون
  expand: Set<string> // الوحدات اللي لازم تتفتح عشان توصل للنتيجة
  membersOpen: Set<string> // وحدات تتفتح قائمة أعضائها (المطابق عضو فيها)
  first: string | null
  count: number
}

// البحث: يعلِّم الوحدة أو الشخص ويفتح الطريق له من القمة
export function searchOrgChart(chart: OrgChart, query: string): OrgSearchResult {
  const result: OrgSearchResult = { units: new Set(), people: new Set(), expand: new Set(), membersOpen: new Set(), first: null, count: 0 }
  const q = normalizeOrgText(query)
  if (!q) return result
  const hit = (s: string | null | undefined) => normalizeOrgText(s).includes(q)
  const personHit = (p: OrgPerson | null) => !!p && (hit(p.name) || hit(p.jobTitle))
  const walk = (unit: OrgUnit, path: string[]) => {
    let matched = false
    if (hit(unit.name) || personHit(unit.head)) {
      result.units.add(unit.key)
      if (unit.head && personHit(unit.head)) result.people.add(unit.head.id)
      matched = true
    }
    const memberHits = unit.members.filter(personHit)
    if (memberHits.length) {
      memberHits.forEach((m) => result.people.add(m.id))
      result.membersOpen.add(unit.key)
      result.units.add(unit.key)
      matched = true
    }
    if (matched) {
      path.forEach((k) => result.expand.add(k))
      result.first = result.first ?? unit.key
      result.count += memberHits.length + (hit(unit.name) || personHit(unit.head) ? 1 : 0)
    }
    unit.children.forEach((c) => walk(c, [...path, unit.key]))
  }
  walk(chart.root, [])
  if (personHit(chart.secretary)) {
    result.people.add(chart.secretary!.id)
    result.units.add('secretary')
    result.first = result.first ?? 'secretary'
    result.count += 1
  }
  return result
}

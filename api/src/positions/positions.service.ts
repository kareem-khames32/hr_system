import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { DataSource, EntityManager, In } from 'typeorm'
import { CostCenter, Grade, JobTitle } from '../assets/assets.entities'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, inBranchScope, userHasPerm, type BranchScope } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { ModulesService } from '../modules-registry/modules.service'
import { Branch } from '../org/entities/branch.entity'
import { Department } from '../org/entities/department.entity'
import { Team } from '../org/entities/team.entity'
import { RecruitmentJob } from '../recruitment/recruitment-job.entity'
import { RECRUITMENT_OPENINGS_MAX, jobCode, recruitmentJobsReady } from '../recruitment/recruitment-rules'
import { ApprovedPosition, PositionHolder, type PositionStatus } from './position.entities'
import {
  cleanBudget, cleanHeadcount, cleanNewPosition, generationKey, inPositionUnit, isPositionStatus, lockPositionCreation, normalTitle, occupiesSeat, positionCode, positionsReady, seatCounts, seatVerdict,
  POSITION_STATUS_LABELS, POSITIONS_ENFORCE_FEATURE, POSITIONS_MIGRATION_MISSING, POSITION_REQUIRED, POSITION_UNIT_MOVED, SEAT_FREEING_STATUSES,
  type EmployeeUnit, type PositionInput, type SeatVerdict,
} from './position-rules'

// B2.11: الوظائف المعتمدة (موديول positions، اختياري ومقفول افتراضيًا).
//  الوظيفة تبع فرع (وقسم وفريق اختياريين) بعدد معتمد؛ والقراءة والكتابة بنطاق فروع الحساب (برّه النطاق = «غير موجودة»).
//  «المشغول» محسوب مش متخزّن: المربوط بالوظيفة (position_holders)، وخدمته ماانتهتش، ولسه في وحدتها — فانتهاء الخدمة والنقل بيحرّروا المقعد
//  لوحدهم من غير ما مساراتهم تتلمس.
//  عند التعيين (EmployeesService.create) والربط من الشاشة: الحكم وصف الوظيفة مقفول، فتعيينين على آخر مقعد واحد بس بيعدّي. ووحدة الوظيفة
//  بتتحكم دلوقتي تحت القفل (قسمها لسه تبع فرعها): وحدة اتنقلت مابتاخدش إسناد جديد.
//  ترتيب الأقفال في كل المسارات: صف الوظيفة ← صف القسم ← صف الفريق ← صف الموظف (قفل إنشاء الوظائف قبلهم كلهم في التوليد والاعتماد).
//  قبل ترحيل 097: الشاشة بتقول إن الترحيل ناقص، والتعيين زي ما هو — إلا والإنفاذ مفعّل: مرفوض برسالة الترحيل.

const FREEING_SQL = SEAT_FREEING_STATUSES.map(status => `N'${status}'`).join(', ')
/** الموظف [e] شاغل مقعد وظيفته [p]: خدمته ماانتهتش، ولسه في وحدتها */
const SEATED_SQL = `([e].[status] IS NULL OR [e].[status] NOT IN (${FREEING_SQL})) AND [e].[branchId] = [p].[branchId]
  AND ([p].[departmentId] IS NULL OR [e].[departmentId] = [p].[departmentId]) AND ([p].[teamId] IS NULL OR [e].[teamId] = [p].[teamId])`
const GENERATE_LIMIT = 500
// B-ADD.12: اقتراح التوظيف من الشاغر
const HIRING_NO_RECRUITMENT = 'موديول التوظيف مقفول أو جداوله ناقصة — فعّله الأول'
const HIRING_NEEDS_RECRUITER = 'فتح وظيفة شاغرة محتاج صلاحية «إدارة التوظيف»'
const HIRING_COVERED = 'شواغر الوظيفة دي كلها ليها وظايف مفتوحة في التوظيف — مفيش حاجة تتفتح'
const HIRING_NOT_ACTIVE = 'الوظيفة المعتمدة مش نشطة — مفيش شاغر يتفتح له توظيف'
/** مفتاح مطابقة الوظيفة المعتمدة بوظايف التوظيف المفتوحة: نفس الفرع والقسم والمسمى (التوظيف مالوش فريق) */
const hiringKey = (branchId: number, departmentId: number | null, title: string) => `${branchId}:${departmentId ?? 0}:${normalTitle(title)}`
/**
 * قسم مسجّل على وظيفة أو على موظفين وهو مش تبع فرعهم (قسم اتنقل لفرع تاني وهم فضلوا): مابيتسمّاش — اسمه بتاع فرع تاني — وبيتكتب مكانه
 * النص ده، ومفيش وظيفة بتتولّد عليه (الوظيفة قسمها لازم تبع فرعها، زي الإنشاء من الشاشة).
 */
const FOREIGN_UNIT = 'قسم برّه الفرع'
const FOREIGN_TEAM = 'فريق برّه الفرع'
const FOREIGN_UNIT_REASON = 'قسمهم مش تبع فرعهم — صحّح القسم أو الفرع على ملفاتهم الأول'
/**
 * هوية وحدة (قسم وفريق) في رد لقارئ فرع، بفرع الوحدة **دلوقتي** (Codex CRP3A-B01): القسم بيتعرض — رقمه واسمه — طول ما هو تبع الفرع،
 * والفريق طول ما قسمه الحالي تبع الفرع. غير كده (اتنقل لفرع تاني، أو اتمسح) **الرقم بيتحجب مع الاسم** والاسم بيتكتب مكانه نص ثابت،
 * فالوحدة المحجوبة مابتبانش «على مستوى الفرع». القسم المحجوب فريقه من غير اسم (نص القسم كفاية).
 */
function unitIdentity(branchId: number, departmentId: number | null, teamId: number | null, departments: Map<number, Department>, teams: Map<number, Team>) {
  const department = departmentId == null ? undefined : departments.get(departmentId)
  const departmentShown = !!department && department.branchId === branchId
  const team = teamId == null ? undefined : teams.get(teamId)
  const teamShown = departmentShown && !!team && departments.get(team.departmentId)?.branchId === branchId
  return {
    departmentId: departmentShown ? departmentId : null,
    departmentName: departmentId == null ? null : departmentShown ? department!.name : FOREIGN_UNIT,
    teamId: teamShown ? teamId : null,
    teamName: teamId == null || !departmentShown ? null : teamShown ? team!.name : FOREIGN_TEAM,
    /** وحدة الوظيفة (قسمها أو فريقها) مش تبع فرعها دلوقتي */
    unitHidden: (departmentId != null && !departmentShown) || (teamId != null && !teamShown),
  }
}

/** مقعد اتحجز لموظف لسه بيتعمل (جوه معاملة الإنشاء) */
export interface HireSeat { positionId: number }
/** حالة التعيين على الوظائف، مقروءة قبل المعاملة: الموديول مفعّل؟ والإنفاذ؟ */
export interface HiringMode { active: boolean; enforce: boolean }
export interface PositionPatch { jobTitleId?: unknown; gradeId?: unknown; costCenterId?: unknown; headcount?: unknown; status?: unknown; budget?: unknown
  branchId?: unknown; departmentId?: unknown; teamId?: unknown }

const idOf = (value: unknown): number | null => Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : null
const idChunks = (ids: number[], size = 1000): number[][] => { const out: number[][] = []; for (let at = 0; at < ids.length; at += size) out.push(ids.slice(at, at + size)); return out }
const fail = (verdict: SeatVerdict) => verdict.status === 409 ? new ConflictException(verdict.message) : new BadRequestException(verdict.message)
/** عمود decimal بييجي من المشغّل رقم أو نص: نص بخانتين دايمًا */
const budgetText = (value: unknown): string | null => value == null ? null : Number(value).toFixed(2)

@Injectable()
export class PositionsService {
  constructor(private readonly ds: DataSource, private readonly modules: ModulesService) {}

  private canManage(user: JwtPayload) { return userHasPerm(user, 'positions.manage') }

  /** عدد شاغلي كل وظيفة دلوقتي (من غير موظف معيّن لو اتبعت) */
  private async occupiedOf(em: EntityManager, positionIds: number[], exceptEmployeeId: number | null = null): Promise<Map<number, number>> {
    const counts = new Map<number, number>()
    for (const part of idChunks(positionIds)) {
      const rows: Array<{ positionId: number; n: number }> = await em.query(
        `SELECT [h].[positionId] AS [positionId], COUNT(*) AS [n]
         FROM [position_holders] [h] INNER JOIN [positions] [p] ON [p].[id] = [h].[positionId] INNER JOIN [employees] [e] ON [e].[id] = [h].[employeeId]
         WHERE [h].[positionId] IN (${part.map(Number).join(', ')}) AND ${SEATED_SQL}${exceptEmployeeId ? ` AND [e].[id] <> ${Number(exceptEmployeeId)}` : ''}
         GROUP BY [h].[positionId]`)
      for (const row of rows) counts.set(Number(row.positionId), Number(row.n))
    }
    return counts
  }

  // ===== عند التعيين (جوه معاملة إنشاء الموظف) =====

  /**
   * حالة التعيين على الوظائف (الموديول مفعّل؟ والإنفاذ؟). بتتقري **قبل** معاملة الإنشاء أو الربط مش جواها: القراءة من مخزن خدمة الموديولات
   * (كاشها بيفضى كل كام ثانية) محتاجة اتصال تاني، والمعاملة ماسكة اتصالها — معاملات كتير مع كاش فاضي بيستنفدوا المخزن (Codex CRP2Y-B02).
   */
  async hiringMode(): Promise<HiringMode> {
    const active = await this.modules.isEnabled('positions')
    return { active, enforce: active && await this.modules.isFeatureEnabled(POSITIONS_ENFORCE_FEATURE) }
  }

  /**
   * قبل ما صف الموظف الجديد يتعمل: الموديول مقفول = null والتعيين زي ما هو (الخانة بتتجاهل)، وقبل الترحيل كمان إلا والإنفاذ مفعّل (مرفوض). غير كده صف الوظيفة بيتقفل
   * لآخر المعاملة وبيتحكم: في فرع الموظف وقسمه وفريقه، ونشطة، وفيها شاغر لو الإنفاذ مفعّل؛ ومن غير وظيفة والإنفاذ مفعّل مرفوض.
   * mode: من hiringMode() قبل المعاملة.
   */
  async seatForHire(em: EntityManager, mode: HiringMode, positionId: unknown, unit: EmployeeUnit): Promise<HireSeat | null> {
    if (!mode.active) return null
    if (!(await positionsReady(em))) {
      // قبل الترحيل ومن غير الإنفاذ: التعيين زي ما هو (الخانة بتتجاهل). والإنفاذ مفعّل والجدولين مش موجودين: مرفوض برسالة الترحيل —
      // حالة مش معروفة بتقفل، مش تعيين بيعدّي من غير الإنفاذ اللي مدير النظام فعّله
      if (mode.enforce) throw new BadRequestException(POSITIONS_MIGRATION_MISSING)
      return null
    }
    const enforce = mode.enforce
    if (positionId === undefined || positionId === null) {
      if (enforce) throw new BadRequestException(POSITION_REQUIRED)
      return null
    }
    const id = idOf(positionId)
    const position = id ? await em.getRepository(ApprovedPosition).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } }) : null
    // وحدة الوظيفة بتتحكم دلوقتي (بعد أي انتظار على صفها) وصفوفها مقفولة لحد ما الموظف يتحفظ. وظيفة فرع تاني (أو مش موجودة) بترد
    // بنفس ردها من غير ما وحدتها تتلمس
    if (position && unit.branchId != null && Number(unit.branchId) === position.branchId && !(await this.unitStillValid(em, position))) throw new BadRequestException(POSITION_UNIT_MOVED)
    const occupied = position ? (await this.occupiedOf(em, [position.id])).get(position.id) ?? 0 : 0
    const verdict = seatVerdict(position, unit, occupied, enforce)
    if (verdict) throw fail(verdict)
    return { positionId: position!.id }
  }

  /**
   * وحدة الوظيفة لسه صالحة لإسناد جديد (تعيين أو ربط)؟ قسمها لازم يكون لسه تبع فرعها، وفريقها لسه تبع قسمها. بقاء الروابط القديمة بعد
   * نقل الوحدة مابيجيزش إسناد جديد عليها (Codex CRP3B-B01). صف القسم ثم صف الفريق بيتقفلوا لآخر المعاملة: نقل بيبدأ بعد الحكم بيستنى.
   * بتتنادى وصف الوظيفة مقفول.
   */
  private async unitStillValid(em: EntityManager, position: Pick<ApprovedPosition, 'branchId' | 'departmentId' | 'teamId'>): Promise<boolean> {
    if (position.departmentId != null) {
      const department = await em.getRepository(Department).findOne({ where: { id: position.departmentId }, lock: { mode: 'pessimistic_write' } })
      if (!department || department.branchId !== position.branchId) return false
    }
    if (position.teamId != null) {
      const team = await em.getRepository(Team).findOne({ where: { id: position.teamId }, lock: { mode: 'pessimistic_write' } })
      if (!team || team.departmentId !== position.departmentId) return false
    }
    return true
  }

  /** بعد ما صف الموظف اتعمل، في نفس المعاملة: ربطه بالمقعد المحجوز */
  async seatHired(em: EntityManager, seat: HireSeat, employeeId: number, actorUserId: number): Promise<void> {
    await em.getRepository(PositionHolder).insert({ employeeId, positionId: seat.positionId, assignedByUserId: actorUserId, assignedAt: new Date() })
  }

  // ===== القراءة =====

  private async names(em: EntityManager, positions: ApprovedPosition[]) {
    const ids = (pick: (row: ApprovedPosition) => number | null) => [...new Set(positions.map(pick).filter((id): id is number => id != null))]
    const load = async <T extends { id: number }>(entity: new () => T, wanted: number[]): Promise<Map<number, T>> => {
      const map = new Map<number, T>()
      for (const part of idChunks(wanted)) for (const row of await em.getRepository(entity).find({ where: { id: In(part) } as never })) map.set(row.id, row)
      return map
    }
    const [titles, grades, branches, departments, teams, centers] = await Promise.all([
      load(JobTitle, ids(row => row.jobTitleId)), load(Grade, ids(row => row.gradeId)), load(Branch, ids(row => row.branchId)),
      load(Department, ids(row => row.departmentId)), load(Team, ids(row => row.teamId)), load(CostCenter, ids(row => row.costCenterId)),
    ])
    // قسم كل فريق دلوقتي (الفريق ممكن يكون اتنقل من قسم الوظيفة): هويته بتتحكم بفرع قسمه الحالي
    for (const [id, row] of await load(Department, [...new Set([...teams.values()].map(team => team.departmentId))].filter(id => !departments.has(id)))) departments.set(id, row)
    return { titles, grades, branches, departments, teams, centers }
  }

  private async views(em: EntityManager, positions: ApprovedPosition[]) {
    const [names, occupied] = await Promise.all([this.names(em, positions), this.occupiedOf(em, positions.map(row => row.id))])
    return positions.map(row => ({
      id: row.id, code: positionCode(row.id),
      jobTitleId: row.jobTitleId, title: names.titles.get(row.jobTitleId)?.title ?? '—',
      gradeId: row.gradeId, gradeName: row.gradeId ? names.grades.get(row.gradeId)?.name ?? null : null,
      branchId: row.branchId, branchName: names.branches.get(row.branchId)?.name ?? null,
      ...unitIdentity(row.branchId, row.departmentId, row.teamId, names.departments, names.teams),
      costCenterId: row.costCenterId, costCenterName: row.costCenterId ? names.centers.get(row.costCenterId)?.name ?? null : null,
      headcount: row.headcount, status: row.status, statusLabel: POSITION_STATUS_LABELS[row.status] ?? row.status, budget: budgetText(row.budget),
      ...seatCounts(row, occupied.get(row.id) ?? 0), createdAt: row.createdAt,
    }))
  }

  private scoped(em: EntityManager, scope: BranchScope) {
    const qb = em.getRepository(ApprovedPosition).createQueryBuilder('p').where('1 = 1')
    if (scope !== null) qb.andWhere('p.branchId IN (:...scope)', { scope: scope.length ? scope : [-1] })
    return qb
  }

  /** موظفين شاغلين (خدمتهم ماانتهتش) من غير مقعد في وحدتهم، لكل (فرع، قسم) في النطاق */
  private async unassigned(em: EntityManager, scope: BranchScope): Promise<Array<{ branchId: number; departmentId: number | null; n: number }>> {
    const inScope = scope === null ? '' : ` AND [e].[branchId] IN (${(scope.length ? scope : [-1]).map(Number).join(', ')})`
    const rows: Array<{ branchId: number; departmentId: number | null; n: number }> = await em.query(
      `SELECT [e].[branchId] AS [branchId], [e].[departmentId] AS [departmentId], COUNT(*) AS [n]
       FROM [employees] [e]
       WHERE ([e].[status] IS NULL OR [e].[status] NOT IN (${FREEING_SQL})) AND [e].[branchId] IS NOT NULL${inScope}
         AND NOT EXISTS (SELECT 1 FROM [position_holders] [h] INNER JOIN [positions] [p] ON [p].[id] = [h].[positionId] WHERE [h].[employeeId] = [e].[id] AND ${SEATED_SQL})
       GROUP BY [e].[branchId], [e].[departmentId]`)
    return rows.map(row => ({ branchId: Number(row.branchId), departmentId: row.departmentId == null ? null : Number(row.departmentId), n: Number(row.n) }))
  }

  /** القايمة وتقرير «معتمد / مشغول / شاغر / زيادة» لكل قسم — في نطاق فروع الحساب */
  async list(user: JwtPayload) {
    const em = this.ds.manager, canManage = this.canManage(user)
    if (!(await positionsReady(em))) return { available: false, message: POSITIONS_MIGRATION_MISSING, canManage, enforce: false, positions: [], summary: [] }
    const scope = branchScopeOf(user)
    const rows = await this.scoped(em, scope).orderBy('p.branchId', 'ASC').addOrderBy('p.departmentId', 'ASC').addOrderBy('p.id', 'ASC').getMany()
    const [positions, loose] = await Promise.all([this.views(em, rows), this.unassigned(em, scope)])
    type Line = { branchId: number; branchName: string | null; departmentId: number | null; departmentName: string | null
      approved: number; occupied: number; vacant: number; over: number; unassigned: number }
    const lines = new Map<string, Line>()
    // hidden = قسم مش تبع الفرع دلوقتي: سطره من غير رقم وباسم ثابت (كل الأقسام اللي كده في سطر واحد للفرع)
    const lineOf = (branchId: number, departmentId: number | null, departmentName: string | null, hidden: boolean): Line => {
      const key = `${branchId}:${hidden ? 'x' : departmentId ?? 0}`
      let line = lines.get(key)
      if (!line) {
        line = { branchId, branchName: null, departmentId: hidden ? null : departmentId, departmentName: hidden ? FOREIGN_UNIT : departmentName, approved: 0, occupied: 0, vacant: 0, over: 0, unassigned: 0 }
        lines.set(key, line)
      }
      return line
    }
    for (const row of positions) {
      const line = lineOf(row.branchId, row.departmentId, row.departmentName, row.departmentId == null && row.departmentName === FOREIGN_UNIT)
      line.approved += row.approved; line.occupied += row.occupied; line.vacant += row.vacant; line.over += row.over
    }
    // موظفين من غير مقعد: قسم الموظف بيتحكم بفرعه دلوقتي زي قسم الوظيفة
    const homes = new Map<number, Department>()
    for (const part of idChunks([...new Set(loose.map(row => row.departmentId).filter((id): id is number => id != null))])) {
      for (const row of await em.getRepository(Department).find({ where: { id: In(part) } })) homes.set(row.id, row)
    }
    for (const row of loose) {
      const unit = unitIdentity(row.branchId, row.departmentId, null, homes, new Map())
      lineOf(row.branchId, unit.departmentId, unit.departmentName, unit.unitHidden).unassigned += row.n
    }
    const branchNames = new Map<number, string>()
    for (const part of idChunks([...new Set([...lines.values()].map(line => line.branchId))])) {
      for (const row of await em.getRepository(Branch).find({ where: { id: In(part) } })) branchNames.set(row.id, row.name)
    }
    for (const line of lines.values()) line.branchName = branchNames.get(line.branchId) ?? null
    // مستوى الفرع أول سطر، وأقسام برّه الفرع آخر سطر
    const rank = (line: Line) => line.departmentId == null && line.departmentName === FOREIGN_UNIT ? Number.MAX_SAFE_INTEGER : line.departmentId ?? 0
    const summary = [...lines.values()].sort((a, b) => a.branchId - b.branchId || rank(a) - rank(b))
    return { available: true, canManage, enforce: await this.modules.isFeatureEnabled(POSITIONS_ENFORCE_FEATURE), positions, summary }
  }

  // ===== B-ADD.12: اقتراح التوظيف من الشاغر =====

  /** فتحات وظايف التوظيف اللي لسه ماتقفلتش (مسودة/منشورة/موقوفة) لكل (فرع، قسم، مسمى) في الفروع دي. hold: بيمسك الصفوف لآخر المعاملة */
  private async openJobOpenings(em: EntityManager, branchIds: number[], hold = false): Promise<Map<string, number>> {
    const out = new Map<string, number>()
    for (const part of idChunks([...new Set(branchIds)])) {
      const rows: Array<{ branchId: number; departmentId: number | null; title: string; openings: number }> = await em.query(
        `SELECT [branchId], [departmentId], [title], [openings] FROM [recruitment_jobs]${hold ? ' WITH (UPDLOCK, HOLDLOCK)' : ''} WHERE [status] <> N'CLOSED' AND [branchId] IN (${part.map(Number).join(', ')})`)
      for (const row of rows) {
        const key = hiringKey(Number(row.branchId), row.departmentId == null ? null : Number(row.departmentId), row.title)
        out.set(key, (out.get(key) ?? 0) + Number(row.openings))
      }
    }
    return out
  }

  /**
   * «اقتراحات التوظيف»: كل وظيفة معتمدة نشطة فيها شاغر **مالوش وظيفة مفتوحة في التوظيف** — الشاغر ناقص فتحات وظايف التوظيف اللي لسه
   * ماتقفلتش لنفس الفرع والقسم والمسمى (الفتحات بتتوزّع على وظايف نفس المفتاح بترتيب رقمها). بنطاق فروع الحساب، ووحدة برّه فرعها مابتتقترحش.
   * لما موظف يخرج أو يتنقل الشاغر بيزيد لوحده (المشغول محسوب)، فالاقتراح بيظهر من غير أي حدث.
   */
  async hiringSuggestions(user: JwtPayload) {
    const em = this.ds.manager
    if (!(await positionsReady(em))) return { available: false, recruitment: false, canOpen: false, suggestions: [] }
    const recruitment = (await this.modules.isEnabled('recruitment')) && (await recruitmentJobsReady(em))
    const rows = await this.scoped(em, branchScopeOf(user)).andWhere('p.status = :status', { status: 'ACTIVE' }).orderBy('p.id', 'ASC').getMany()
    const views = (await this.views(em, rows)).filter(row => !row.unitHidden && row.vacant > 0)
    const open = recruitment && views.length ? await this.openJobOpenings(em, views.map(row => row.branchId)) : new Map<string, number>()
    const suggestions = views.map(row => {
      const key = hiringKey(row.branchId, row.departmentId, row.title), left = open.get(key) ?? 0, covered = Math.min(row.vacant, left)
      open.set(key, left - covered)
      return { positionId: row.id, code: row.code, title: row.title, branchId: row.branchId, branchName: row.branchName, departmentId: row.departmentId, departmentName: row.departmentName,
        teamName: row.teamName, headcount: row.headcount, occupied: row.occupied, vacant: row.vacant, openJobs: covered, uncovered: row.vacant - covered }
    }).filter(row => row.uncovered > 0)
    return { available: true, recruitment, canOpen: recruitment && userHasPerm(user, 'candidates.manage'), suggestions }
  }

  /**
   * فتح وظيفة شاغرة «مسودة» في التوظيف من شاغر وظيفة معتمدة — من غير طلب احتياج (العدد معتمد أصلًا). حالة موديول التوظيف بتتقري قبل
   * المعاملة؛ وجواها: صف الوظيفة مقفول، وصفوف وظايف التوظيف المفتوحة لفرعها ممسوكة، والشاغر اللي من غير وظيفة مفتوحة بيتحسب دلوقتي —
   * فطلبين مع بعض مايفتحوش أكتر من الشاغر.
   */
  async openJob(user: JwtPayload, id: number, rawOpenings: unknown) {
    if (!userHasPerm(user, 'candidates.manage')) throw new ForbiddenException(HIRING_NEEDS_RECRUITER)
    if (!(await this.modules.isEnabled('recruitment'))) throw new BadRequestException(HIRING_NO_RECRUITMENT)
    return this.ds.transaction(async em => {
      if (!(await recruitmentJobsReady(em))) throw new BadRequestException(HIRING_NO_RECRUITMENT)
      const position = await this.loadScoped(em, user, id, true)
      if (position.status !== 'ACTIVE') throw new BadRequestException(HIRING_NOT_ACTIVE)
      const [view] = await this.views(em, [position])
      if (view.unitHidden) throw new BadRequestException(POSITION_UNIT_MOVED)
      const title = await em.getRepository(JobTitle).findOne({ where: { id: position.jobTitleId } })
      if (!title || title.isActive !== true) throw new BadRequestException('مسمى الوظيفة المعتمدة مش نشط في كتالوج المسميات — فعّله الأول')
      // وظايف نفس المفتاح اللي قبلها في الرقم بتاخد نصيبها من الفتحات المفتوحة الأول (نفس توزيع الاقتراحات)
      const open = await this.openJobOpenings(em, [position.branchId], true)
      const key = hiringKey(position.branchId, position.departmentId, title.title)
      const siblings = (await this.views(em, await em.getRepository(ApprovedPosition).find({ where: { branchId: position.branchId, jobTitleId: position.jobTitleId, status: 'ACTIVE' }, order: { id: 'ASC' } })))
        .filter(row => !row.unitHidden && hiringKey(row.branchId, row.departmentId, row.title) === key)
      let left = open.get(key) ?? 0, uncovered = 0
      for (const row of siblings) {
        const covered = Math.min(row.vacant, left)
        left -= covered
        if (row.id === position.id) uncovered = row.vacant - covered
      }
      if (uncovered <= 0) throw new ConflictException(HIRING_COVERED)
      const openings = rawOpenings === undefined || rawOpenings === null ? Math.min(uncovered, RECRUITMENT_OPENINGS_MAX) : rawOpenings
      if (typeof openings !== 'number' || !Number.isSafeInteger(openings) || openings < 1 || openings > Math.min(uncovered, RECRUITMENT_OPENINGS_MAX)) {
        throw new BadRequestException(`العدد من 1 لحد ${Math.min(uncovered, RECRUITMENT_OPENINGS_MAX)} (الشاغر اللي مالوش وظيفة مفتوحة)`)
      }
      const jobs = em.getRepository(RecruitmentJob)
      const job = await jobs.save(jobs.create({
        title: title.title, branchId: position.branchId, departmentId: position.departmentId, openings,
        reason: `شاغر في الوظيفة المعتمدة ${positionCode(position.id)} (معتمد ${view.headcount}، مشغول ${view.occupied})`, salaryFrom: null, salaryTo: null, startDate: null,
        description: null, requirements: null, status: 'DRAFT', internal: true, external: false, requestId: null, createdByUserId: user.sub, publishedAt: null, closedAt: null, createdAt: new Date(),
      }))
      await recordAudit(em, { category: 'SETTINGS', action: 'RECRUITMENT_JOB_CREATED', entityType: 'recruitment_job', entityId: job.id, actorUserId: user.sub, branchId: job.branchId,
        summary: `وظيفة شاغرة جديدة ${jobCode(job.id)} (${job.title}) بعدد ${job.openings} من شاغر الوظيفة المعتمدة ${positionCode(position.id)}`,
        after: { title: job.title, branchId: job.branchId, departmentId: job.departmentId, openings: job.openings, positionId: position.id } })
      return { jobId: job.id, jobCode: jobCode(job.id), openings: job.openings }
    })
  }

  /** وظائف فرع للاختيار في نموذج التعيين: النشطة بس واللي وحدتها تبع الفرع دلوقتي، بأرقامها. فرع برّه النطاق = قايمة فاضية */
  async options(user: JwtPayload, branchId: unknown) {
    const em = this.ds.manager
    if (!(await positionsReady(em))) return { available: false, enforce: false, positions: [] }
    const enforce = await this.modules.isFeatureEnabled(POSITIONS_ENFORCE_FEATURE)
    const branch = idOf(Number(branchId))
    if (!branch || !inBranchScope(branchScopeOf(user), branch)) return { available: true, enforce, positions: [] }
    const rows = await em.getRepository(ApprovedPosition).find({ where: { branchId: branch, status: 'ACTIVE' }, order: { departmentId: 'ASC', id: 'ASC' } })
    const positions = (await this.views(em, rows)).filter(row => !row.unitHidden).map(row => ({ id: row.id, code: row.code, title: row.title, gradeName: row.gradeName, departmentId: row.departmentId,
      departmentName: row.departmentName, teamId: row.teamId, teamName: row.teamName, headcount: row.headcount, occupied: row.occupied, vacant: row.vacant }))
    return { available: true, enforce, positions }
  }

  /** بيانات نموذج الوظيفة: فروع نطاق الحساب بأقسامها وفرقها، والمسميات والدرجات ومراكز التكلفة النشطة — عشان الشاشة تشتغل بصلاحيتها هي */
  async formData(user: JwtPayload) {
    const em = this.ds.manager, scope = branchScopeOf(user)
    const branches = await em.getRepository(Branch).find({ where: scope === null ? { isActive: true } : { id: In(scope.length ? scope : [-1]), isActive: true }, order: { name: 'ASC' } })
    const branchIds = branches.map(row => row.id)
    const departments = branchIds.length ? await em.getRepository(Department).find({ where: { branchId: In(branchIds), isActive: true }, order: { name: 'ASC' } }) : []
    const departmentIds = departments.map(row => row.id)
    const teams = departmentIds.length ? await em.getRepository(Team).find({ where: { departmentId: In(departmentIds), isActive: true }, order: { name: 'ASC' } }) : []
    const [titles, grades, centers] = await Promise.all([
      em.getRepository(JobTitle).find({ where: { isActive: true }, order: { title: 'ASC' } }),
      em.getRepository(Grade).find({ where: { isActive: true }, order: { name: 'ASC' } }),
      em.getRepository(CostCenter).find({ where: { isActive: true }, order: { name: 'ASC' } }),
    ])
    return {
      branches: branches.map(row => ({ id: row.id, name: row.name })),
      departments: departments.map(row => ({ id: row.id, name: row.name, branchId: row.branchId })),
      teams: teams.map(row => ({ id: row.id, name: row.name, departmentId: row.departmentId })),
      jobTitles: titles.map(row => ({ id: row.id, title: row.title })),
      grades: grades.map(row => ({ id: row.id, name: row.name })),
      costCenters: centers.map(row => ({ id: row.id, name: row.name, code: row.code })),
    }
  }

  private async loadScoped(em: EntityManager, user: JwtPayload, id: number, lock = false): Promise<ApprovedPosition> {
    if (!(await positionsReady(em))) throw new BadRequestException(POSITIONS_MIGRATION_MISSING)
    const position = await em.getRepository(ApprovedPosition).findOne({ where: { id }, ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}) })
    if (!position || !inBranchScope(branchScopeOf(user), position.branchId)) throw new NotFoundException('الوظيفة المعتمدة غير موجودة')
    return position
  }

  /** وظيفة بشاغليها. الشاغل بيتسمّى لو فرعه دلوقتي في نطاق القارئ (اللي اتنقل برّه النطاق مابيظهرش)؛ واللي خدمته انتهت أو خرج من الوحدة بيظهر بحالته */
  async detail(user: JwtPayload, id: number) {
    const em = this.ds.manager, scope = branchScopeOf(user)
    const position = await this.loadScoped(em, user, id)
    const [view] = await this.views(em, [position])
    const links = await em.getRepository(PositionHolder).find({ where: { positionId: id }, order: { employeeId: 'ASC' } })
    const people = new Map<number, Employee>()
    for (const part of idChunks(links.map(row => row.employeeId))) {
      for (const row of await em.getRepository(Employee).find({ where: { id: In(part) }, select: { id: true, fullName: true, employeeCode: true, jobTitle: true, status: true, branchId: true, departmentId: true, teamId: true } })) people.set(row.id, row)
    }
    const holders = links.flatMap(link => {
      const person = people.get(link.employeeId)
      if (!person || !inBranchScope(scope, person.branchId)) return []
      const seated = occupiesSeat(person.status) && inPositionUnit(position, person)
      return [{ employeeId: person.id, fullName: person.fullName, employeeCode: person.employeeCode, jobTitle: person.jobTitle ?? null, seated,
        note: seated ? null : !occupiesSeat(person.status) ? 'خدمته انتهت' : 'اتنقل من وحدة الوظيفة', assignedAt: link.assignedAt }]
    })
    // اللي ينفع يتربطوا: موظفين وحدة الوظيفة الشاغلين اللي مش عليها (لصاحب الإدارة بس)
    let linkable: Array<{ id: number; fullName: string; employeeCode: string; jobTitle: string | null }> = []
    if (this.canManage(user) && !view.unitHidden) {
      const qb = em.getRepository(Employee).createQueryBuilder('e').select(['e.id', 'e.fullName', 'e.employeeCode', 'e.jobTitle'])
        .where('e.branchId = :branchId', { branchId: position.branchId })
        .andWhere(`(e.status IS NULL OR e.status NOT IN (:...freeing))`, { freeing: [...SEAT_FREEING_STATUSES] })
        .andWhere('NOT EXISTS (SELECT 1 FROM [position_holders] [h] WHERE [h].[employeeId] = e.id AND [h].[positionId] = :positionId)', { positionId: id })
      if (position.departmentId != null) qb.andWhere('e.departmentId = :departmentId', { departmentId: position.departmentId })
      if (position.teamId != null) qb.andWhere('e.teamId = :teamId', { teamId: position.teamId })
      linkable = (await qb.orderBy('e.fullName', 'ASC').take(GENERATE_LIMIT).getMany()).map(row => ({ id: row.id, fullName: row.fullName, employeeCode: row.employeeCode, jobTitle: row.jobTitle ?? null }))
    }
    return { ...view, canManage: this.canManage(user), holders, linkable }
  }

  // ===== الكتابة (positions.manage) =====

  private async assertCatalog(em: EntityManager, value: { jobTitleId?: number; gradeId?: number | null; costCenterId?: number | null }) {
    if (value.jobTitleId !== undefined && !(await em.getRepository(JobTitle).findOne({ where: { id: value.jobTitleId, isActive: true } }))) {
      throw new BadRequestException('المسمى الوظيفي غير موجود في كتالوج المسميات')
    }
    if (value.gradeId != null && !(await em.getRepository(Grade).findOne({ where: { id: value.gradeId, isActive: true } }))) throw new BadRequestException('الدرجة غير موجودة')
    if (value.costCenterId != null && !(await em.getRepository(CostCenter).findOne({ where: { id: value.costCenterId, isActive: true } }))) throw new BadRequestException('مركز التكلفة غير موجود')
  }

  private snapshot(row: ApprovedPosition) {
    return { jobTitleId: row.jobTitleId, gradeId: row.gradeId, branchId: row.branchId, departmentId: row.departmentId, teamId: row.teamId, costCenterId: row.costCenterId,
      headcount: row.headcount, status: row.status, budget: budgetText(row.budget) }
  }

  async create(user: JwtPayload, input: PositionInput) {
    const cleaned = cleanNewPosition(input)
    if ('error' in cleaned) throw new BadRequestException(cleaned.error)
    const value = cleaned.value
    const saved = await this.ds.transaction(async em => {
      if (!(await positionsReady(em))) throw new BadRequestException(POSITIONS_MIGRATION_MISSING)
      // الفرع برّه نطاق الحساب زي الفرع اللي مش موجود
      const branch = inBranchScope(branchScopeOf(user), value.branchId) ? await em.getRepository(Branch).findOne({ where: { id: value.branchId } }) : null
      if (!branch) throw new NotFoundException('الفرع غير موجود')
      await this.assertCatalog(em, value)
      // وظيفة على مستوى الفرع مالهاش صف قسم يتقفل: قفل إنشاء الوظائف هو اللي بينسّقها مع التوليد (على قسم: صف القسم اللي التوليد بيقفله
      // قبل ما يراجع «فيه وظيفة قايمة؟» — Codex CRP3B-B02)
      if (value.departmentId == null && !(await lockPositionCreation(em))) throw new ConflictException('إنشاء الوظائف المعتمدة شغال دلوقتي من حد تاني؛ جرّب تاني بعد شوية')
      // صف القسم (ثم الفريق) مقفول لآخر المعاملة: نقله لفرع تاني (تعديل الهيكل) يا اتثبّت قبلنا فنشوفه ونرفض، يا بيستنى لحد ما الوظيفة تتحفظ
      // (Codex CRP3A-B02: فحص من غير قفل بيتقادم قبل الكتابة)
      if (value.departmentId != null) {
        const department = await em.getRepository(Department).findOne({ where: { id: value.departmentId }, lock: { mode: 'pessimistic_write' } })
        if (!department || department.branchId !== value.branchId) throw new BadRequestException('القسم مش تبع الفرع ده')
      }
      if (value.teamId != null) {
        const team = await em.getRepository(Team).findOne({ where: { id: value.teamId }, lock: { mode: 'pessimistic_write' } })
        if (!team || team.departmentId !== value.departmentId) throw new BadRequestException('الفريق مش تبع القسم ده')
      }
      const row = await em.getRepository(ApprovedPosition).save(em.getRepository(ApprovedPosition).create({ ...value, createdAt: new Date() }))
      await recordAudit(em, { category: 'SETTINGS', action: 'POSITION_CREATED', entityType: 'position', entityId: row.id, actorUserId: user.sub, branchId: row.branchId,
        summary: `وظيفة معتمدة جديدة ${positionCode(row.id)} بعدد ${row.headcount}`, after: this.snapshot(row) })
      return row
    })
    return (await this.views(this.ds.manager, [saved]))[0]
  }

  /** تعديل المسمى والدرجة ومركز التكلفة والعدد والحالة والميزانية. وحدة الوظيفة (الفرع والقسم والفريق) مابتتغيّرش */
  async update(user: JwtPayload, id: number, input: PositionPatch) {
    const saved = await this.ds.transaction(async em => {
      const row = await this.loadScoped(em, user, id, true)
      const before = this.snapshot(row)
      // الوحدة مابتتغيّرش. والمبعوت بيتقارن باللي القارئ شايفه في الرد (وحدة محجوبة = من غير رقم): رقم قسم أو فريق محجوب مايتخمّنش
      // من فرق الرد بين «نفس الوحدة» و«وحدة تانية» (Codex CRP3A-B01)
      const names = await this.names(em, [row])
      const unit = unitIdentity(row.branchId, row.departmentId, row.teamId, names.departments, names.teams)
      const shown = { branchId: row.branchId, departmentId: unit.departmentId, teamId: unit.teamId }
      for (const key of ['branchId', 'departmentId', 'teamId'] as const) {
        if (input[key] !== undefined && (input[key] ?? null) !== shown[key]) throw new BadRequestException('وحدة الوظيفة (الفرع والقسم والفريق) مابتتغيّرش: الغي الوظيفة واعمل واحدة جديدة')
      }
      const changes: Partial<ApprovedPosition> = {}
      if (input.jobTitleId !== undefined) {
        const jobTitleId = idOf(input.jobTitleId)
        if (!jobTitleId) throw new BadRequestException('اختار المسمى الوظيفي من الكتالوج')
        if (jobTitleId !== row.jobTitleId) { await this.assertCatalog(em, { jobTitleId }); changes.jobTitleId = jobTitleId }
      }
      if (input.gradeId !== undefined) {
        const gradeId = input.gradeId === null ? null : idOf(input.gradeId)
        if (input.gradeId !== null && !gradeId) throw new BadRequestException('رقم الدرجة مش صحيح')
        if (gradeId !== (row.gradeId ?? null)) { await this.assertCatalog(em, { gradeId }); changes.gradeId = gradeId }
      }
      if (input.costCenterId !== undefined) {
        const costCenterId = input.costCenterId === null ? null : idOf(input.costCenterId)
        if (input.costCenterId !== null && !costCenterId) throw new BadRequestException('رقم مركز التكلفة مش صحيح')
        if (costCenterId !== (row.costCenterId ?? null)) { await this.assertCatalog(em, { costCenterId }); changes.costCenterId = costCenterId }
      }
      if (input.headcount !== undefined) {
        const headcount = cleanHeadcount(input.headcount)
        if (!headcount) throw new BadRequestException('العدد المعتمد رقم صحيح من 1 لـ10000')
        if (headcount !== row.headcount) changes.headcount = headcount
      }
      if (input.status !== undefined) {
        if (!isPositionStatus(input.status)) throw new BadRequestException('حالة الوظيفة: نشطة أو مجمّدة أو ملغية')
        if (input.status !== row.status) changes.status = input.status as PositionStatus
      }
      if (input.budget !== undefined) {
        const budget = cleanBudget(input.budget)
        if (!budget.ok) throw new BadRequestException('الميزانية رقم مش سالب بخانتين عشريتين بالكتير')
        if (budget.value !== budgetText(row.budget)) changes.budget = budget.value
      }
      if (!Object.keys(changes).length) return row
      // أعمدة التغيير بس (مش حفظ الكيان كله): الصف مقفول، بس كده مفيش عمود بيتكتب بقيمة اتقرت قبل كده من غير داعي
      await em.getRepository(ApprovedPosition).update({ id: row.id }, changes)
      Object.assign(row, changes)
      await recordAudit(em, { category: 'SETTINGS', action: 'POSITION_UPDATED', entityType: 'position', entityId: row.id, actorUserId: user.sub, branchId: row.branchId,
        summary: `تعديل الوظيفة المعتمدة ${positionCode(row.id)}${changes.headcount !== undefined ? `: العدد من ${before.headcount} لـ${row.headcount}` : ''}`, before, after: this.snapshot(row) })
      return row
    })
    return (await this.views(this.ds.manager, [saved]))[0]
  }

  /** ربط موظف قايم بالوظيفة (ولو كان على وظيفة تانية بيتنقل منها). نفس حكم التعيين، والأقفال: صف الوظيفة ← وحدتها ← صف الموظف */
  async addHolder(user: JwtPayload, id: number, employeeId: unknown) {
    const wanted = idOf(employeeId)
    if (!wanted) throw new BadRequestException('اختار الموظف')
    // الإنفاذ بيتقري قبل المعاملة (نفس سبب hiringMode)
    const { enforce } = await this.hiringMode()
    await this.ds.transaction(async em => {
      const position = await this.loadScoped(em, user, id, true)
      // وحدة اتنقلت في الهيكل مابتاخدش ربط جديد (نفس حكم التعيين)، وصفوفها مقفولة لحد ما الربط يتحفظ
      if (!(await this.unitStillValid(em, position))) throw new BadRequestException(POSITION_UNIT_MOVED)
      const person = await em.getRepository(Employee).findOne({ where: { id: wanted }, lock: { mode: 'pessimistic_write' } })
      if (!person || !inBranchScope(branchScopeOf(user), person.branchId)) throw new NotFoundException('الموظف غير موجود')
      if (!occupiesSeat(person.status)) throw new BadRequestException('الموظف خدمته انتهت: مايتربطش بوظيفة')
      const occupied = (await this.occupiedOf(em, [position.id], person.id)).get(position.id) ?? 0
      const verdict = seatVerdict(position, person, occupied, enforce)
      if (verdict) throw fail(verdict)
      const holders = em.getRepository(PositionHolder)
      const previous = await holders.findOne({ where: { employeeId: person.id } })
      if (previous?.positionId === position.id) return
      if (previous) await holders.delete({ employeeId: person.id })
      await holders.insert({ employeeId: person.id, positionId: position.id, assignedByUserId: user.sub, assignedAt: new Date() })
      await recordAudit(em, { category: 'SETTINGS', action: 'POSITION_HOLDER_SET', entityType: 'position', entityId: position.id, actorUserId: user.sub, branchId: position.branchId,
        summary: `ربط موظف بالوظيفة المعتمدة ${positionCode(position.id)}`, before: { employeeId: person.id, positionId: previous?.positionId ?? null }, after: { employeeId: person.id, positionId: position.id } })
    })
    return this.detail(user, id)
  }

  /** فكّ موظف من الوظيفة. الرابط القديم (موظف خدمته انتهت أو اتنقل) بيتفكّ برضه لو الموظف لسه في نطاق الحساب */
  async removeHolder(user: JwtPayload, id: number, employeeId: number) {
    await this.ds.transaction(async em => {
      const position = await this.loadScoped(em, user, id, true)
      const link = await em.getRepository(PositionHolder).findOne({ where: { employeeId, positionId: position.id } })
      const person = link ? await em.getRepository(Employee).findOne({ where: { id: employeeId }, select: { id: true, branchId: true } }) : null
      // رابط لموظف اتنقل برّه نطاق الحساب مابيظهرش له، فزيه زي اللي مش موجود
      if (!link || !person || !inBranchScope(branchScopeOf(user), person.branchId)) throw new NotFoundException('الموظف مش مربوط بالوظيفة دي')
      await em.getRepository(PositionHolder).delete({ employeeId, positionId: position.id })
      await recordAudit(em, { category: 'SETTINGS', action: 'POSITION_HOLDER_REMOVED', entityType: 'position', entityId: position.id, actorUserId: user.sub, branchId: position.branchId,
        summary: `فكّ موظف من الوظيفة المعتمدة ${positionCode(position.id)}`, before: { employeeId, positionId: position.id } })
    })
    return this.detail(user, id)
  }

  // ===== التوليد من الموجود =====

  /**
   * خطة التوليد: مجموعة لكل (مسمى × قسم × فرع) من الموظفين الشاغلين اللي من غير مقعد في وحدتهم، في نطاق الحساب.
   * المسمى اللي مش في الكتالوج بيتخطّى، واللي له وظيفة معتمدة قايمة في نفس القسم بيتخطّى (يتربطوا بيها من الشاشة).
   */
  private async generationPlan(em: EntityManager, scope: BranchScope) {
    const inScope = scope === null ? '' : ` AND [e].[branchId] IN (${(scope.length ? scope : [-1]).map(Number).join(', ')})`
    const people: Array<{ id: number; branchId: number; departmentId: number | null; jobTitle: string | null }> = await em.query(
      `SELECT [e].[id] AS [id], [e].[branchId] AS [branchId], [e].[departmentId] AS [departmentId], [e].[jobTitle] AS [jobTitle]
       FROM [employees] [e]
       WHERE ([e].[status] IS NULL OR [e].[status] NOT IN (${FREEING_SQL})) AND [e].[branchId] IS NOT NULL${inScope}
         AND NOT EXISTS (SELECT 1 FROM [position_holders] [h] INNER JOIN [positions] [p] ON [p].[id] = [h].[positionId] WHERE [h].[employeeId] = [e].[id] AND ${SEATED_SQL})
       ORDER BY [e].[id]`)
    const catalog = new Map<string, number>()
    for (const row of await em.getRepository(JobTitle).find({ where: { isActive: true }, order: { id: 'ASC' } })) {
      const key = normalTitle(row.title)
      if (key && !catalog.has(key)) catalog.set(key, row.id)
    }
    type Group = { branchId: number; departmentId: number | null; title: string; jobTitleId: number | null; employeeIds: number[] }
    const groups = new Map<string, Group>()
    for (const row of people) {
      const title = normalTitle(row.jobTitle), branchId = Number(row.branchId), departmentId = row.departmentId == null ? null : Number(row.departmentId)
      const key = generationKey(branchId, departmentId, title)
      let group = groups.get(key)
      if (!group) { group = { branchId, departmentId, title, jobTitleId: title ? catalog.get(title) ?? null : null, employeeIds: [] }; groups.set(key, group) }
      group.employeeIds.push(Number(row.id))
    }
    const list = [...groups.values()]
    // قسم المجموعة لازم يكون تبع فرعها
    const own = new Set<string>()
    for (const part of idChunks([...new Set(list.map(group => group.departmentId).filter((id): id is number => id != null))])) {
      for (const row of await em.getRepository(Department).find({ where: { id: In(part) } })) own.add(`${row.branchId}:${row.id}`)
    }
    // وظيفة قايمة (مش ملغية) بنفس المسمى على مستوى نفس القسم
    const existing = new Set<string>()
    const titled = [...new Set(list.map(group => group.jobTitleId).filter((id): id is number => id != null))]
    for (const part of idChunks(titled)) {
      for (const row of await this.scoped(em, scope).andWhere('p.jobTitleId IN (:...part)', { part }).andWhere(`p.status <> 'CANCELLED'`).andWhere('p.teamId IS NULL').getMany()) {
        existing.add(`${row.branchId}:${row.departmentId ?? 0}:${row.jobTitleId}`)
      }
    }
    return list.map(group => {
      const reason = !group.title ? 'من غير مسمى وظيفي على الملف' : group.jobTitleId == null ? 'المسمى مش في كتالوج المسميات'
        : group.departmentId != null && !own.has(`${group.branchId}:${group.departmentId}`) ? FOREIGN_UNIT_REASON
        : existing.has(`${group.branchId}:${group.departmentId ?? 0}:${group.jobTitleId}`) ? 'فيه وظيفة معتمدة بنفس المسمى في نفس الوحدة — اربطهم بيها من الشاشة' : null
      return { ...group, action: reason ? 'skip' as const : 'create' as const, reason }
    })
  }

  private async generationView(em: EntityManager, plan: Awaited<ReturnType<PositionsService['generationPlan']>>) {
    const branchIds = [...new Set(plan.map(group => group.branchId))]
    const branches = branchIds.length ? await em.getRepository(Branch).find({ where: { id: In(branchIds) } }) : []
    const wanted = [...new Set(plan.map(group => group.departmentId).filter((id): id is number => id != null))]
    const departments = wanted.length ? await em.getRepository(Department).find({ where: { id: In(wanted) } }) : []
    const homes = new Map(departments.map(row => [row.id, row]))
    const groups = plan.slice(0, GENERATE_LIMIT).map(group => {
      const unit = unitIdentity(group.branchId, group.departmentId, null, homes, new Map())
      return { branchId: group.branchId, branchName: branches.find(row => row.id === group.branchId)?.name ?? null, departmentId: unit.departmentId, departmentName: unit.departmentName,
        title: group.title || null, employees: group.employeeIds.length, action: group.action, reason: group.reason }
    })
    const creating = plan.filter(group => group.action === 'create')
    return { groups, truncated: plan.length > GENERATE_LIMIT,
      totals: { create: creating.length, createEmployees: creating.reduce((sum, group) => sum + group.employeeIds.length, 0),
        skip: plan.length - creating.length, skipEmployees: plan.filter(group => group.action === 'skip').reduce((sum, group) => sum + group.employeeIds.length, 0) } }
  }

  /** الموظف شاغل مقعد في وحدته دلوقتي؟ (نفس حكم «المشغول») */
  private async seatedNow(em: EntityManager, employeeId: number): Promise<boolean> {
    const rows: unknown[] = await em.query(
      `SELECT TOP 1 1 AS [seated]
       FROM [position_holders] [h] INNER JOIN [positions] [p] ON [p].[id] = [h].[positionId] INNER JOIN [employees] [e] ON [e].[id] = [h].[employeeId]
       WHERE [h].[employeeId] = ${Number(employeeId)} AND ${SEATED_SQL}`)
    return rows.length > 0
  }

  /** معاينة التوليد من الموجود (من غير أي كتابة) */
  async generationPreview(user: JwtPayload) {
    const em = this.ds.manager
    if (!(await positionsReady(em))) throw new BadRequestException(POSITIONS_MIGRATION_MISSING)
    return this.generationView(em, await this.generationPlan(em, branchScopeOf(user)))
  }

  /**
   * تطبيق التوليد: وظيفة نشطة لكل مجموعة «تتعمل» بعدد موظفيها وربطهم بيها. الخطة بتتحسب تاني جوه المعاملة (توليدة واحدة في المرة)،
   * وبعدها الحكم كله بيتعاد تحت الأقفال قبل أي كتابة (Codex CRP3A وCRP3B): المسمى لسه نشط، وقسم المجموعة بيتقفل صفه ويتأكد إنه لسه تبع
   * فرعها، ومفيش وظيفة قايمة بنفس المسمى على الوحدة اتعملت بعد الخطة؛ وكل موظف بيتقفل
   * صفه ويتأكد إنه لسه في المجموعة (شاغل، ونفس الفرع والقسم والمسمى) **ولسه من غير مقعد في وحدته** — اللي اتربط بوظيفة بعد ما الخطة
   * اتقرت (من الشاشة أو بتعيين) بيتساب على وظيفته.
   */
  async generate(user: JwtPayload) {
    return this.ds.transaction(async em => {
      if (!(await positionsReady(em))) throw new BadRequestException(POSITIONS_MIGRATION_MISSING)
      if (!(await lockPositionCreation(em))) throw new ConflictException('توليد الوظائف شغال دلوقتي من حد تاني؛ جرّب تاني بعد شوية')
      const plan = await this.generationPlan(em, branchScopeOf(user))
      const holders = em.getRepository(PositionHolder), positions = em.getRepository(ApprovedPosition)
      let created = 0, linked = 0
      for (const group of plan) {
        if (group.action !== 'create' || group.jobTitleId == null) continue
        // كل اللي الخطة حكمت بيه بيتعاد تحت الأقفال قبل أي كتابة (Codex CRP3B-B02 وN01):
        //  المسمى لسه نشط في الكتالوج (صفه مقفول)
        const title = await em.getRepository(JobTitle).findOne({ where: { id: group.jobTitleId }, lock: { mode: 'pessimistic_write' } })
        if (!title || !title.isActive) continue
        //  والقسم لسه تبع فرع المجموعة (صفه مقفول — والإنشاء من الشاشة بيقفل نفس الصف، وعلى مستوى الفرع بياخد قفل الإنشاء اللي معانا)
        if (group.departmentId != null) {
          const department = await em.getRepository(Department).findOne({ where: { id: group.departmentId }, lock: { mode: 'pessimistic_write' } })
          if (!department || department.branchId !== group.branchId) continue
        }
        //  ومفيش وظيفة قايمة (مش ملغية) بنفس المسمى على نفس الوحدة اتعملت بعد ما الخطة اتقرت
        const taken = await positions.createQueryBuilder('p').where('p.jobTitleId = :jobTitleId', { jobTitleId: group.jobTitleId }).andWhere('p.branchId = :branchId', { branchId: group.branchId })
          .andWhere(group.departmentId == null ? 'p.departmentId IS NULL' : 'p.departmentId = :departmentId', { departmentId: group.departmentId })
          .andWhere('p.teamId IS NULL').andWhere(`p.status <> 'CANCELLED'`).getCount()
        if (taken) continue
        const members: number[] = []
        for (const employeeId of group.employeeIds) {
          const person = await em.getRepository(Employee).findOne({ where: { id: employeeId }, lock: { mode: 'pessimistic_write' } })
          if (!person || !occupiesSeat(person.status) || Number(person.branchId) !== group.branchId || (person.departmentId ?? null) !== group.departmentId
            || normalTitle(person.jobTitle) !== group.title) continue
          // لسه من غير مقعد في وحدته؟ (ربط الموظف من الشاشة بيقفل صفه برضه، فالحكم هنا مابيتقادمش)
          if (await this.seatedNow(em, person.id)) continue
          members.push(person.id)
        }
        if (!members.length) continue
        const row = await positions.save(positions.create({ jobTitleId: group.jobTitleId, gradeId: null, branchId: group.branchId, departmentId: group.departmentId, teamId: null,
          costCenterId: null, headcount: members.length, status: 'ACTIVE', budget: null, createdAt: new Date() }))
        for (const part of idChunks(members)) await holders.delete({ employeeId: In(part) })
        const now = new Date()
        for (const part of idChunks(members, 200)) await holders.insert(part.map(employeeId => ({ employeeId, positionId: row.id, assignedByUserId: user.sub, assignedAt: now })))
        created += 1; linked += members.length
      }
      if (created) {
        await recordAudit(em, { category: 'SETTINGS', action: 'POSITIONS_GENERATED', entityType: 'position', actorUserId: user.sub,
          summary: `توليد وظائف معتمدة من الموجود: ${created} وظيفة و${linked} موظف`, after: { positions: created, employees: linked } })
      }
      return { created, linked }
    })
  }
}

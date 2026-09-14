import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Not, Repository } from 'typeorm'
import { CostCenter } from '../assets/assets.entities'
import { AttendanceService } from '../attendance/attendance.service'
import { normalizeWeekendDays, weekendDaysError } from '../attendance/weekend-days'
import { beginCalendarChange, finishCalendarChange, readCalendarSource } from '../attendance/attendance-calendar-history'
import { attendanceRuleToday, lockAttendanceRuleMutation } from '../attendance/attendance-rule-history'
import { Employee } from '../employees/employee.entity'
import { Branch } from './entities/branch.entity'
import { Department } from './entities/department.entity'
import { Team } from './entities/team.entity'
import {
  CreateBranchDto,
  CreateDepartmentDto,
  CreateTeamDto,
  UpdateBranchDto,
  UpdateDepartmentDto,
  UpdateTeamDto,
} from './org.dto'

@Injectable()
export class OrgService {
  private readonly logger = new Logger(OrgService.name)

  constructor(
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    @InjectRepository(Department) private readonly departments: Repository<Department>,
    @InjectRepository(Team) private readonly teams: Repository<Team>,
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
    @InjectRepository(CostCenter) private readonly costCenters: Repository<CostCenter>,
    private readonly attendance: AttendanceService
  ) {}

  // scope: نطاق المنفّذ (null = كل الفروع) — المدير من فرع خارج النطاق مرفوض
  private async assertManagerExists(
    managerEmployeeId?: number,
    scope: number | null = null
  ) {
    if (!managerEmployeeId) return
    const mgr = await this.employees.findOne({
      where: { id: managerEmployeeId },
    })
    if (!mgr) throw new BadRequestException('الموظف المدير غير موجود')
    if (scope != null && mgr.branchId !== scope) {
      throw new ForbiddenException('الموظف المدير خارج نطاق فرعك')
    }
  }

  // SET-13: عطلة الفرع الأسبوعية (تجاوز attendance.weekend_days — null يمسحه) تُحفظ
  // مطبَّعة، ومركز التكلفة كود من كتالوج مراكز التكلفة (كان نصاً حراً فيُحفظ كود غير
  // موجود). مركز التكلفة القائم لا يُفحص إلا عند تغييره — لا يمنع تعديل باقي الحقول
  private async normalizeBranchRefs(
    dto: { weekendDays?: string | null; costCenter?: string | null },
    current: Branch | null
  ) {
    if (dto.weekendDays != null) {
      const err = weekendDaysError(dto.weekendDays)
      if (err) throw new BadRequestException(err)
      dto.weekendDays = normalizeWeekendDays(dto.weekendDays)
    }
    if (dto.costCenter !== undefined) {
      const code = dto.costCenter?.trim() || null
      dto.costCenter = code
      if (code && code !== (current?.costCenter ?? null)) {
        const cc = await this.costCenters.findOne({ where: { code } })
        if (!cc) {
          throw new BadRequestException(`مركز التكلفة ${code} غير موجود في كتالوج مراكز التكلفة`)
        }
        if (!cc.isActive) throw new BadRequestException(`مركز التكلفة ${cc.code} معطّل`)
        dto.costCenter = cc.code
      }
    }
  }

  // ===== الفروع =====
  // branchScope = null → كل الفروع (super_admin) — غير كده فرع المستخدم فقط
  findBranches(branchScope: number | null) {
    if (branchScope == null) return this.branches.find({ order: { id: 'ASC' } })
    return this.branches.find({ where: { id: branchScope } })
  }

  // scope في كل الكتابات = branchScopeOf(المنفّذ): null لمدير النظام، وإلا فرعه فقط
  async createBranch(dto: CreateBranchDto, scope: number | null, actorId?: number) {
    // الفرع الجديد خارج نطاق أي مستخدم مقيَّد بفرعه — لمدير النظام فقط
    if (scope != null) {
      throw new ForbiddenException('إنشاء فرع جديد متاح لمدير النظام فقط')
    }
    const dup = await this.branches.findOne({ where: { code: dto.code } })
    if (dup) {
      throw new ConflictException(`كود الفرع ${dto.code} مستخدم بالفعل`)
    }
    await this.assertManagerExists(dto.managerEmployeeId)
    await this.normalizeBranchRefs(dto, null)
    return this.branches.manager.transaction(async em => {
      await lockAttendanceRuleMutation(em)
      const saved = await em.save(Branch, em.create(Branch, dto as Partial<Branch>))
      const before = await readCalendarSource(em, 'BRANCH', saved.id)
      await finishCalendarChange(em, before, { effectiveFrom: attendanceRuleToday(), reason: 'إنشاء الفرع وتسجيل تقويمه من تاريخ الإنشاء',
        expectedRevision: before.revision, expectedCurrentSourceHash: before.currentSourceHash }, actorId!)
      return saved
    })
  }

  async updateBranch(id: number, dto: UpdateBranchDto, scope: number | null, actorId?: number) {
    const branch = await this.branches.findOne({ where: { id } })
    // فرع خارج النطاق = غير موجود (زي القراءة)
    if (!branch || (scope != null && branch.id !== scope)) {
      throw new NotFoundException('الفرع غير موجود')
    }
    if (dto.code) {
      const dup = await this.branches.findOne({
        where: { code: dto.code, id: Not(id) },
      })
      if (dup) throw new ConflictException(`كود الفرع ${dto.code} مستخدم بالفعل`)
    }
    // نطاق المدير يُفحص عند تغييره فقط — القيمة القائمة لا تمنع تعديل باقي الحقول
    await this.assertManagerExists(
      dto.managerEmployeeId,
      dto.managerEmployeeId !== branch.managerEmployeeId ? scope : null
    )
    await this.normalizeBranchRefs(dto, branch)
    const { calendarChange, ...fields } = dto
    const saved = await this.branches.manager.transaction(async em => {
      await lockAttendanceRuleMutation(em)
      const fresh = await em.findOneByOrFail(Branch, { id })
      const calendarTouched = (fields.country !== undefined && (fields.country?.toUpperCase() ?? null) !== (fresh.country?.toUpperCase() ?? null))
        || (fields.weekendDays !== undefined && (fields.weekendDays ?? null) !== (fresh.weekendDays ?? null))
      const before = calendarTouched || calendarChange ? await beginCalendarChange(em, 'BRANCH', id, calendarChange, actorId!) : null
      const updates = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined))
      if (Object.keys(updates).length) await em.update(Branch, { id }, updates)
      if (before) await finishCalendarChange(em, before, calendarChange, actorId!)
      return em.findOneByOrFail(Branch, { id })
    })
    // دولة الفرع تحدد عطلاته الرسمية: أيام العطلات التي تغيّر سريانها تُعاد (عطلة لم
    // تعد تسري ← يوم عمل ويُجسَّد غياب من لم يبصم، والعكس) — كانت تبقى بحساب الدولة
    // القديمة. أفضل جهد: الفشل لا يُفشل حفظ الفرع لكنه يُسجَّل
    if (dto.country !== undefined) {
      try {
        const r = await this.attendance.recomputeForBranchCountry(
          saved.id,
          branch.country ?? null,
          saved.country
        )
        if (r.failed) {
          this.logger.warn(`تعذر إعادة حساب ${r.failed} يوم/موظف بعد تغيير دولة الفرع ${saved.id}`)
        }
      } catch (e) {
        this.logger.warn(
          `تعذر إعادة حساب حضور الفرع ${saved.id} بعد تغيير دولته: ${(e as Error).message}`
        )
      }
    }
    return saved
  }

  // ===== الأقسام =====
  findDepartments(branchScope: number | null) {
    if (branchScope == null)
      return this.departments.find({ order: { id: 'ASC' } })
    return this.departments.find({ where: { branchId: branchScope } })
  }

  async createDepartment(dto: CreateDepartmentDto, scope: number | null) {
    if (scope != null && dto.branchId !== scope) {
      throw new ForbiddenException('لا يمكنك إسناد فرع خارج نطاق فرعك')
    }
    const branch = await this.branches.findOne({ where: { id: dto.branchId } })
    if (!branch) throw new BadRequestException('الفرع غير موجود')
    if (dto.parentId) {
      const parent = await this.departments.findOne({
        where: { id: dto.parentId },
      })
      if (!parent) throw new BadRequestException('القسم الأب غير موجود')
      if (parent.branchId !== dto.branchId) {
        throw new BadRequestException('القسم الأب في فرع مختلف')
      }
    }
    await this.assertManagerExists(dto.managerEmployeeId, scope)
    return this.departments.save(
      this.departments.create(dto as Partial<Department>)
    )
  }

  async updateDepartment(
    id: number,
    dto: UpdateDepartmentDto,
    scope: number | null
  ) {
    const dept = await this.departments.findOne({ where: { id } })
    // قسم خارج النطاق = غير موجود (زي القراءة)
    if (!dept || (scope != null && dept.branchId !== scope)) {
      throw new NotFoundException('القسم غير موجود')
    }
    if (dto.branchId) {
      if (scope != null && dto.branchId !== scope) {
        throw new ForbiddenException('لا يمكنك إسناد فرع خارج نطاق فرعك')
      }
      const branch = await this.branches.findOne({
        where: { id: dto.branchId },
      })
      if (!branch) throw new BadRequestException('الفرع غير موجود')
    }
    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('القسم لا يكون أباً لنفسه')
      }
      const parent = await this.departments.findOne({
        where: { id: dto.parentId },
      })
      if (!parent) throw new BadRequestException('القسم الأب غير موجود')
      if (
        scope != null &&
        dto.parentId !== dept.parentId &&
        parent.branchId !== scope
      ) {
        throw new ForbiddenException('القسم الأب خارج نطاق فرعك')
      }
    }
    await this.assertDepartmentTree(id, dept, dto)
    await this.assertManagerExists(
      dto.managerEmployeeId,
      dto.managerEmployeeId !== dept.managerEmployeeId ? scope : null
    )
    Object.assign(dept, dto)
    return this.departments.save(dept)
  }

  // SET-14: الهيكل بعد تعديل القسم — الأب (الجديد أو القائم) في نفس فرع القسم كما
  // يفحص الإنشاء، ولا يكون من الأقسام التابعة له (A أبوه B وB أبوه A كانت تُحفظ فيلفّ
  // الهيكل وتحليل المعتمد)، ونقل القسم لفرع آخر لا يترك أقسامه الفرعية في فرعها.
  // يُفحص عند تغيّر الأب أو الفرع فقط — الهيكل القائم لا يمنع تعديل باقي الحقول
  private async assertDepartmentTree(
    id: number,
    dept: Department,
    dto: UpdateDepartmentDto
  ) {
    const branchId = dto.branchId ?? dept.branchId
    const parentId = dto.parentId !== undefined ? dto.parentId : dept.parentId
    const branchChanged = branchId !== dept.branchId
    if (!branchChanged && (parentId ?? null) === (dept.parentId ?? null)) return
    if (parentId) {
      const parent = await this.departments.findOne({ where: { id: parentId } })
      if (!parent) throw new BadRequestException('القسم الأب غير موجود')
      if (parent.branchId !== branchId) {
        throw new BadRequestException('القسم الأب في فرع مختلف — اختر أباً من فرع القسم نفسه')
      }
      // صعوداً من الأب حتى الجذر: المرور بالقسم نفسه = دائرة
      const seen = new Set<number>()
      for (let cur: number | null = parentId; cur; ) {
        if (cur === id) {
          throw new BadRequestException(
            'القسم الأب المختار تابع لهذا القسم — لا يكون الهيكل دائرياً'
          )
        }
        if (seen.has(cur)) {
          throw new BadRequestException('سلسلة أقسام الأب المختار دائرية — صحّح أبوّتها أولاً')
        }
        seen.add(cur)
        const node: Department | null = await this.departments.findOne({ where: { id: cur } })
        cur = node?.parentId ?? null
      }
    }
    if (branchChanged) {
      const child = await this.departments.findOne({
        where: { parentId: id, branchId: Not(branchId) },
      })
      if (child) {
        throw new BadRequestException(
          `للقسم أقسام فرعية في فرعه الحالي (مثل «${child.name}») — انقلها أو غيّر أبها قبل نقله لفرع آخر`
        )
      }
    }
  }

  // ===== الفرق =====
  findTeams(branchScope: number | null) {
    if (branchScope == null)
      return this.teams.find({ relations: { department: true } })
    return this.teams.find({
      relations: { department: true },
      where: { department: { branchId: branchScope } },
    })
  }

  async createTeam(dto: CreateTeamDto, scope: number | null) {
    const dept = await this.departments.findOne({
      where: { id: dto.departmentId },
    })
    if (!dept) throw new BadRequestException('القسم غير موجود')
    if (scope != null && dept.branchId !== scope) {
      throw new ForbiddenException('القسم خارج نطاق فرعك')
    }
    await this.assertManagerExists(dto.leaderEmployeeId, scope)
    return this.teams.save(this.teams.create(dto as Partial<Team>))
  }

  async updateTeam(id: number, dto: UpdateTeamDto, scope: number | null) {
    const team = await this.teams.findOne({ where: { id } })
    // نطاق الفريق = فرع قسمه (يُحمَّل منفصلاً حتى لا تطغى العلاقة على departmentId عند الحفظ)
    const current = team
      ? await this.departments.findOne({ where: { id: team.departmentId } })
      : null
    if (!team || (scope != null && current?.branchId !== scope)) {
      throw new NotFoundException('الفريق غير موجود')
    }
    if (dto.departmentId) {
      const dept = await this.departments.findOne({
        where: { id: dto.departmentId },
      })
      if (!dept) throw new BadRequestException('القسم غير موجود')
      if (scope != null && dept.branchId !== scope) {
        throw new ForbiddenException('القسم خارج نطاق فرعك')
      }
    }
    await this.assertManagerExists(
      dto.leaderEmployeeId,
      dto.leaderEmployeeId !== team.leaderEmployeeId ? scope : null
    )
    Object.assign(team, dto)
    return this.teams.save(team)
  }
}

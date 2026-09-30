import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, In, Not, Repository } from 'typeorm'
import { branchIdIn, inBranchScope, isEmptyBranchScope, scopeWord } from '../auth/guards'
import type { BranchScope } from '../auth/guards'
import { CostCenter } from '../assets/assets.entities'
import { AttendanceService } from '../attendance/attendance.service'
import { normalizeWeekendDays, weekendDaysError } from '../attendance/weekend-days'
import { beginCalendarChange, finishCalendarChange, readCalendarSource } from '../attendance/attendance-calendar-history'
import { attendanceRuleToday, lockAttendanceRuleMutation } from '../attendance/attendance-rule-history'
import { Employee } from '../employees/employee.entity'
import { branchCountryOf, branchInsuranceIssue, normalizeBranchCountry } from './branch-currency'
import { Branch } from './entities/branch.entity'
import { Department, DEPARTMENT_UNIT_TYPES, UNIT_TYPE_MESSAGE } from './entities/department.entity'
import type { DepartmentUnitType } from './entities/department.entity'
import { Team } from './entities/team.entity'
import {
  CreateBranchDto,
  CreateDepartmentDto,
  CreateTeamDto,
  UpdateBranchDto,
  UpdateDepartmentDto,
  UpdateTeamDto,
} from './org.dto'

// قسم هيتعلّم «الإدارة التنفيذية» وأبوه من فرع تاني: الأب ده هو الإدارة التنفيذية الحالية (غيرها مرفوض أصلًا)، والتعليم
// هيتشال منها بالحفظ فتبقى قسم عادي فوق قسم من فرع تاني
const NEW_EXECUTIVE_UNDER_FOREIGN_PARENT =
  'القسم الأب في فرع مختلف — والقسم ده هيبقى «الإدارة التنفيذية» بدل أبوه، والإدارة التنفيذية مايبقاش أبوها من فرع تاني: اختر أباً من فرعه أو خليه قسم رئيسي'

// «الإدارة ← القسم ← الفريق» (قرار المالك 27 سبتمبر): الإدارة مابتتحطش غير تحت الإدارة التنفيذية، والإدارة التنفيذية نفسها «إدارة»
// فمالهاش أب (مابتبقاش تحت نفسها، والإدارة التنفيذية الحالية بيتشال تعليمها لما وحدة تانية تتعلّم)
const EXECUTIVE_HAS_NO_PARENT = '«الإدارة التنفيذية» فوق كل الإدارات والأقسام، فمالهاش أب — خليها إدارة رئيسية (من غير أب)'
const EXECUTIVE_IS_ADMINISTRATION = '«الإدارة التنفيذية» نوعها «إدارة» دايمًا — مينفعش تتحول «قسم»'
const MOVE_ADMINISTRATIONS = 'خلّي الإدارات دي رئيسية (من غير أب) الأول'
const unitWord = (unit: Pick<Department, 'unitType'>) => (unit.unitType === 'ADMINISTRATION' ? 'إدارة' : 'قسم')

// رد GET /org/filter-context — شجرة نطاق الحساب ومكان كل موظف فيها (أرقام بس، من غير أسماء موظفين ولا بيانات شخصية)
export interface OrgFilterContext {
  branches: Array<{ id: number; name: string }>
  units: Array<{ id: number; name: string; branchId: number; parentId: number | null; unitType: DepartmentUnitType; isExecutive: boolean }>
  teams: Array<{ id: number; name: string; departmentId: number; branchId: number }>
  employees: Array<{ id: number; branchId: number | null; departmentId: number | null; teamId: number | null }>
}

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
    scope: BranchScope = null
  ) {
    if (!managerEmployeeId) return
    const mgr = await this.employees.findOne({
      where: { id: managerEmployeeId },
    })
    if (!mgr) throw new BadRequestException('الموظف المدير غير موجود')
    if (!inBranchScope(scope, mgr.branchId)) {
      throw new ForbiddenException(`الموظف المدير خارج نطاق ${scopeWord(scope)}`)
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

  // دولة الفرع (قرار المالك 30 سبتمبر): مصر أو السعودية — منها عملة الفرع كله ونظام تأميناته. الفاضي مسموح للفروع القديمة،
  // ورمز قديم تاني (غير مصر والسعودية) يفضل زي ما هو طول ما ماتغيّرش. الرمز بيتحفظ بحروف كبيرة (كان بيتحفظ زي ما اتبعت)
  private normalizeBranchCountryField(dto: { country?: string | null }, current: Branch | null) {
    if (dto.country === undefined) return
    const code = normalizeBranchCountry(dto.country)
    if (code !== null && !branchCountryOf(code) && code !== normalizeBranchCountry(current?.country)) {
      throw new BadRequestException('دولة الفرع يا مصر (EG) يا السعودية (SA) — اختارها من القايمة')
    }
    dto.country = code
  }

  // ===== الفروع =====
  // branchScope = null → كل الفروع (super_admin) — غير كده فروع المستخدم فقط
  findBranches(branchScope: BranchScope) {
    if (branchScope == null) return this.branches.find({ order: { id: 'ASC' } })
    return this.branches.find({ where: { id: branchIdIn(branchScope) }, order: { id: 'ASC' } })
  }

  // scope في كل الكتابات = branchScopeOf(المنفّذ): null لمدير النظام، وإلا فروعه فقط
  async createBranch(dto: CreateBranchDto, scope: BranchScope, actorId?: number) {
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
    this.normalizeBranchCountryField(dto, null)
    // نظام التأمينات لازم يمشي مع دولة الفرع: فرع مصري بدون/المصرية، وفرع سعودي بدون/السعودية
    const insuranceIssue = branchInsuranceIssue(dto.country, dto.insuranceSystem)
    if (insuranceIssue) throw new BadRequestException(insuranceIssue)
    return this.branches.manager.transaction(async em => {
      await lockAttendanceRuleMutation(em)
      const saved = await em.save(Branch, em.create(Branch, dto as Partial<Branch>))
      const before = await readCalendarSource(em, 'BRANCH', saved.id)
      await finishCalendarChange(em, before, { effectiveFrom: attendanceRuleToday(), reason: 'إنشاء الفرع وتسجيل تقويمه من تاريخ الإنشاء',
        expectedRevision: before.revision, expectedCurrentSourceHash: before.currentSourceHash }, actorId!)
      return saved
    })
  }

  async updateBranch(id: number, dto: UpdateBranchDto, scope: BranchScope, actorId?: number) {
    const branch = await this.branches.findOne({ where: { id } })
    // فرع خارج النطاق = غير موجود (زي القراءة)
    if (!branch || !inBranchScope(scope, branch.id)) {
      throw new NotFoundException('الفرع غير موجود')
    }
    // نظام التأمينات بيغيّر خصم المسير — إعداد شركة، مش بيتغير من حساب فرع
    if (scope != null && dto.insuranceSystem !== undefined && dto.insuranceSystem !== (branch.insuranceSystem ?? 'NONE')) {
      throw new ForbiddenException('نظام التأمينات للفرع بيتغير من حساب على مستوى الشركة بس')
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
    this.normalizeBranchCountryField(dto, branch)
    const { calendarChange, ...fields } = dto
    const saved = await this.branches.manager.transaction(async em => {
      await lockAttendanceRuleMutation(em)
      const fresh = await em.findOneByOrFail(Branch, { id })
      // نظام التأمينات يمشي مع دولة الفرع بعد الحفظ — يتفحص لما الدولة أو نظام التأمينات بيتغيروا بس (على الصف المقفول)، ومفيش
      // تغيير تلقائي لنظام تأمينات فرع قائم أبدًا لأنه بيحرك فلوس: فرع قديم مختلف بيحفظ باقي حقوله وشاشة الفروع بتنبّه عليه
      const countryChanged = fields.country !== undefined && normalizeBranchCountry(fields.country) !== normalizeBranchCountry(fresh.country)
      const insuranceChanged = fields.insuranceSystem !== undefined && fields.insuranceSystem !== (fresh.insuranceSystem ?? 'NONE')
      if (countryChanged || insuranceChanged) {
        const insuranceIssue = branchInsuranceIssue(fields.country !== undefined ? fields.country : fresh.country,
          fields.insuranceSystem !== undefined ? fields.insuranceSystem : fresh.insuranceSystem)
        if (insuranceIssue) throw new BadRequestException(insuranceIssue)
      }
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
  findDepartments(branchScope: BranchScope) {
    if (branchScope == null)
      return this.departments.find({ order: { id: 'ASC' } })
    return this.departments.find({ where: { branchId: branchIdIn(branchScope) } })
  }

  // قفل واحد لتعديلات شجرة الأقسام: فحص الأب والدائرة وقاعدة «الإدارة التنفيذية فوق كل الفروع» والحفظ في معاملة واحدة، فتعديلين
  // متزامنين مايكسروش الهيكل (مثلًا قسم فرع بيتحط تحت الإدارة التنفيذية وفي نفس اللحظة قسم تاني بيتعلّم إدارة تنفيذية)
  private async lockDepartmentTree(em: EntityManager) {
    if (em.connection.options.type !== 'mssql') return
    const rows = await em.query(`DECLARE @result int;
      EXEC @result = sys.sp_getapplock @Resource = 'hr:org:department-tree', @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000;
      SELECT @result AS lockResult;`)
    if (!rows.length || Number(rows[0].lockResult) < 0) {
      throw new ConflictException('هيكل الأقسام بيتعدل دلوقتي من حد تاني؛ جرّب تاني بعد شوية')
    }
  }

  // «الإدارة التنفيذية فوق كل الفروع» (طلب المالك 27 سبتمبر): الأب من فرع تاني مسموح لو هو الإدارة التنفيذية بس، وربط قسم
  // تحتها لحساب نطاقه يغطي فرعها (زي تغيير الأب في التعديل). أي أب تاني من فرع مختلف مرفوض بنفس الرسالة القديمة.
  // نوع الوحدة («إدارة» أو «قسم») وأبوها بقواعد assertUnitParent — من غير نوع: قسم، والإدارة التنفيذية إدارة
  async createDepartment(dto: CreateDepartmentDto, scope: BranchScope) {
    if (!inBranchScope(scope, dto.branchId)) {
      throw new ForbiddenException(`لا يمكنك إسناد فرع خارج نطاق ${scopeWord(scope)}`)
    }
    const branch = await this.branches.findOne({ where: { id: dto.branchId } })
    if (!branch) throw new BadRequestException('الفرع غير موجود')
    return this.departments.manager.transaction(async (em) => {
      await this.lockDepartmentTree(em)
      const repo = em.getRepository(Department)
      let foreignParent = false
      let parent: Department | null = null
      if (dto.parentId) {
        parent = await repo.findOne({ where: { id: dto.parentId } })
        if (!parent) throw new BadRequestException('القسم الأب غير موجود')
        if (parent.branchId !== dto.branchId) {
          if (!parent.isExecutive) throw new BadRequestException('القسم الأب في فرع مختلف')
          if (!inBranchScope(scope, parent.branchId)) {
            throw new ForbiddenException(`القسم الأب خارج نطاق ${scopeWord(scope)}`)
          }
          foreignParent = true
        }
      }
      await this.assertManagerExists(dto.managerEmployeeId, scope)
      const makesExecutive = await this.prepareExecutiveFields(dto, null, scope)
      if (makesExecutive && foreignParent) throw new BadRequestException(NEW_EXECUTIVE_UNDER_FOREIGN_PARENT)
      const unitType = this.unitTypeAfter(dto, null, makesExecutive, makesExecutive)
      this.assertUnitParent(unitType, makesExecutive, parent)
      if (makesExecutive) await this.assertExecutivesReleasable(em, null)
      return this.saveDepartment(em, repo.create({ ...dto, unitType } as Partial<Department>), makesExecutive)
    })
  }

  // نوع الوحدة بعد الحفظ: المبعوت، وإلا تعليمها «الإدارة التنفيذية» بيخلّيها «إدارة» تلقائي (بيتحط في dto للحفظ)، وإلا نوعها
  // الحالي (الجديدة: «قسم»). القيمة بتتفحص هنا كمان مش في الـDTO بس، والإدارة التنفيذية بعد الحفظ مابتتحولش «قسم»
  private unitTypeAfter(dto: { unitType?: DepartmentUnitType }, current: Department | null, makesExecutive: boolean,
    executiveAfter: boolean): DepartmentUnitType {
    if (dto.unitType !== undefined && !DEPARTMENT_UNIT_TYPES.includes(dto.unitType)) {
      throw new BadRequestException(UNIT_TYPE_MESSAGE)
    }
    if (dto.unitType === 'DEPARTMENT' && executiveAfter) throw new BadRequestException(EXECUTIVE_IS_ADMINISTRATION)
    if (makesExecutive) dto.unitType = 'ADMINISTRATION'
    return dto.unitType ?? current?.unitType ?? 'DEPARTMENT'
  }

  // «الإدارة ← القسم ← الفريق» (قرار المالك 27 سبتمبر) — أبو الوحدة بعد الحفظ حسب نوعها:
  // - الإدارة: رئيسية، أو تحت «الإدارة التنفيذية» (من أي فرع، بقاعدة الفروع القائمة) — مش تحت قسم ولا تحت إدارة تانية مش تنفيذية.
  //   والإدارة التنفيذية نفسها مالهاش أب: مابتبقاش تحت نفسها، والإدارة التنفيذية الحالية هيتشال تعليمها لو وحدة تانية اتعلّمت.
  // - القسم: رئيسي، أو تحت إدارة من فرعه، أو الإدارة التنفيذية من أي فرع، أو قسم من فرعه (قسم فرعي) — قاعدة الفروع القائمة لوحدها.
  // parent = الأب بعد الحفظ (null = من غير أب)، executiveAfter = الوحدة هتبقى الإدارة التنفيذية بعد الحفظ
  private assertUnitParent(typeAfter: DepartmentUnitType, executiveAfter: boolean, parent: Department | null) {
    if (typeAfter !== 'ADMINISTRATION' || !parent) return
    if (executiveAfter) throw new BadRequestException(EXECUTIVE_HAS_NO_PARENT)
    if (!parent.isExecutive) {
      throw new BadRequestException(
        `الإدارة مابتتحطش تحت «${parent.name}» (${unitWord(parent)}) — الإدارة بتبقى رئيسية (من غير أب) أو تحت «الإدارة التنفيذية» بس`
      )
    }
  }

  // الهيكل التنظيمي: «الإدارة التنفيذية» قسم واحد في الشركة (مديره الرئيس التنفيذي) ومعاه السكرتير التنفيذي.
  // إعداد لكل الشركة: حساب الفرع مايغيّرهوش (نفس القيمة المبعوتة تاني بتتجاهل عادي).
  // بيرجّع true لو القسم هيبقى الإدارة التنفيذية (عشان يتشال التعليم من أي قسم تاني).
  private async prepareExecutiveFields(
    dto: { isExecutive?: boolean; executiveSecretaryEmployeeId?: number | null; managerEmployeeId?: number | null },
    current: Department | null,
    scope: BranchScope
  ): Promise<boolean> {
    const wasExecutive = !!current?.isExecutive
    const currentSecretary = current?.executiveSecretaryEmployeeId ?? null
    const flagChanged = dto.isExecutive !== undefined && !!dto.isExecutive !== wasExecutive
    const secretaryChanged =
      dto.executiveSecretaryEmployeeId !== undefined && (dto.executiveSecretaryEmployeeId ?? null) !== currentSecretary
    if (!flagChanged && !secretaryChanged) {
      delete dto.isExecutive
      delete dto.executiveSecretaryEmployeeId
      return false
    }
    if (scope != null) {
      throw new ForbiddenException('الإدارة التنفيذية والسكرتير التنفيذي إعداد لكل الشركة، ومش بيتعدل من حساب فرع — يعدّله حساب على مستوى الشركة')
    }
    const isExecutive = dto.isExecutive ?? wasExecutive
    const secretaryId = dto.executiveSecretaryEmployeeId !== undefined ? dto.executiveSecretaryEmployeeId ?? null : currentSecretary
    if (!isExecutive) {
      if (secretaryChanged && secretaryId != null) {
        throw new BadRequestException('السكرتير التنفيذي بيتحدد للإدارة التنفيذية بس — علِّم القسم «الإدارة التنفيذية» الأول')
      }
      dto.executiveSecretaryEmployeeId = null
      return false
    }
    if (secretaryId != null && secretaryChanged) {
      const secretary = await this.employees.findOne({ where: { id: secretaryId } })
      if (!secretary) throw new BadRequestException('موظف السكرتير التنفيذي غير موجود')
      const ceoId = dto.managerEmployeeId !== undefined ? dto.managerEmployeeId : current?.managerEmployeeId
      if (ceoId && ceoId === secretaryId) {
        throw new BadRequestException('السكرتير التنفيذي مايبقاش هو نفسه الرئيس التنفيذي (مدير الإدارة التنفيذية)')
      }
    }
    return flagChanged
  }

  // الحفظ جوه معاملة الشجرة؛ تعليم قسم «الإدارة التنفيذية» بيشيل التعليم والسكرتير من أي قسم تاني
  private async saveDepartment(em: EntityManager, dept: Department, makesExecutive: boolean) {
    const repo = em.getRepository(Department)
    const saved = await repo.save(dept)
    if (makesExecutive) {
      await repo.update({ isExecutive: true, id: Not(saved.id) }, { isExecutive: false, executiveSecretaryEmployeeId: null })
    }
    return saved
  }

  async updateDepartment(
    id: number,
    dto: UpdateDepartmentDto,
    scope: BranchScope
  ) {
    return this.departments.manager.transaction(async (em) => {
      await this.lockDepartmentTree(em)
      const repo = em.getRepository(Department)
      const dept = await repo.findOne({ where: { id } })
      // قسم خارج النطاق = غير موجود (زي القراءة)
      if (!dept || !inBranchScope(scope, dept.branchId)) {
        throw new NotFoundException('القسم غير موجود')
      }
      if (dto.branchId) {
        if (!inBranchScope(scope, dto.branchId)) {
          throw new ForbiddenException(`لا يمكنك إسناد فرع خارج نطاق ${scopeWord(scope)}`)
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
        const parent = await repo.findOne({
          where: { id: dto.parentId },
        })
        if (!parent) throw new BadRequestException('القسم الأب غير موجود')
        // تغيير الأب لقسم برّه نطاق الحساب مرفوض — ومنه ربط قسم تحت «الإدارة التنفيذية» من حساب مايغطيش فرعها
        if (
          dto.parentId !== dept.parentId &&
          !inBranchScope(scope, parent.branchId)
        ) {
          throw new ForbiddenException(`القسم الأب خارج نطاق ${scopeWord(scope)}`)
        }
      }
      // التعليم بعد الحفظ أولًا (حساب الفرع اللي بيغيّره بيترفض هنا)، عشان فحص الهيكل بيحكم على الشكل بعد الحفظ
      const makesExecutive = await this.prepareExecutiveFields(dto, dept, scope)
      await this.assertDepartmentTree(em, id, dept, dto, makesExecutive)
      await this.assertManagerExists(
        dto.managerEmployeeId,
        dto.managerEmployeeId !== dept.managerEmployeeId ? scope : null
      )
      Object.assign(dept, dto)
      return this.saveDepartment(em, dept, makesExecutive)
    })
  }

  // SET-14 + «الإدارة التنفيذية فوق كل الفروع» (طلب المالك 27 سبتمبر): الهيكل بعد تعديل القسم —
  // - الأب (الجديد أو القائم) في نفس فرع القسم كما يفحص الإنشاء، إلا «الإدارة التنفيذية»: أب مسموح من أي فرع. والقسم اللي
  //   هيتعلّم إدارة تنفيذية مايبقاش تحت الإدارة التنفيذية الحالية من فرع تاني (التعليم هيتشال منها فتبقى قسم عادي فوقه).
  // - الأب مايكونش من الأقسام التابعة للقسم (A أبوه B وB أبوه A كانت تُحفظ فيلفّ الهيكل وتحليل المعتمد).
  // - نقل قسم عادي لفرع آخر لا يترك أقسامه الفرعية في فرعها؛ الإدارة التنفيذية تتنقل عادي وأقسامها في أي فرع.
  // - القسم العادي عمره ما يبقى أب لقسم من فرع تاني: شيل تعليم الإدارة التنفيذية — صريح (isExecutive: false) أو ضمني (تعليم
  //   قسم تاني) — مرفوض طول ما تحتها أقسام من فروع تانية.
  // - نوع الوحدة (قرار المالك 27 سبتمبر): أبوها بعد الحفظ بقواعد assertUnitParent — ومنه تحويل قسم لإدارة (أبوه لازم يصلح أب
  //   لإدارة). تحويل إدارة لقسم مسموح وأقسامها بتبقى أقسام فرعية، إلا الإدارة التنفيذية. والإدارة مابتفضلش تحت وحدة مابقتش
  //   الإدارة التنفيذية: شيل التعليم أو تحويلها «قسم» مرفوض طول ما تحتها إدارات.
  // يُفحص عند تغيّر الأب أو الفرع أو التعليم أو النوع فقط — الهيكل القائم لا يمنع تعديل باقي الحقول
  private async assertDepartmentTree(
    em: EntityManager,
    id: number,
    dept: Department,
    dto: UpdateDepartmentDto,
    makesExecutive: boolean
  ) {
    const repo = em.getRepository(Department)
    const branchId = dto.branchId ?? dept.branchId
    const parentId = dto.parentId !== undefined ? dto.parentId : dept.parentId
    // prepareExecutiveFields بيشيل isExecutive من dto لو ماتغيّرش
    const executiveAfter = dto.isExecutive !== undefined ? !!dto.isExecutive : !!dept.isExecutive
    // النوع قبل خروج «الهيكل ماتغيّرش»: تحويل الإدارة التنفيذية لقسم مرفوض حتى لو مفيش حاجة تانية بتتغير
    const typeAfter = this.unitTypeAfter(dto, dept, makesExecutive, executiveAfter)
    const branchChanged = branchId !== dept.branchId
    const parentChanged = (parentId ?? null) !== (dept.parentId ?? null)
    const typeChanged = typeAfter !== (dept.unitType ?? 'DEPARTMENT')
    if (!branchChanged && !parentChanged && executiveAfter === !!dept.isExecutive && !typeChanged) return
    let parent: Department | null = null
    if (parentId) {
      parent = await repo.findOne({ where: { id: parentId } })
      if (!parent) throw new BadRequestException('القسم الأب غير موجود')
      if (parent.branchId !== branchId) {
        if (!parent.isExecutive) {
          throw new BadRequestException('القسم الأب في فرع مختلف — اختر أباً من فرع القسم نفسه')
        }
        if (makesExecutive) throw new BadRequestException(NEW_EXECUTIVE_UNDER_FOREIGN_PARENT)
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
        const node: Department | null = await repo.findOne({ where: { id: cur } })
        cur = node?.parentId ?? null
      }
    }
    this.assertUnitParent(typeAfter, executiveAfter, parent)
    if (dept.isExecutive && !executiveAfter) {
      await this.assertNoChildAdministrations(em, dept, null, 'explicit')
      await this.assertNoForeignChildren(em, dept, branchId, null, 'explicit')
    } else if (typeChanged && typeAfter === 'DEPARTMENT') {
      // إدارة بتتحول «قسم»: أقسامها بتبقى أقسام فرعية عادي، بس إدارات تحتها (بيانات قديمة بس بالقواعد دي) مابتتحطش تحت قسم
      await this.assertNoChildAdministrations(em, dept, null, 'type')
    }
    if (branchChanged && !executiveAfter && !dept.isExecutive) {
      const child = await repo.findOne({
        where: { parentId: id, branchId: Not(branchId) },
      })
      if (child) {
        throw new BadRequestException(
          `للقسم أقسام فرعية في فرعه الحالي (مثل «${child.name}») — انقلها أو غيّر أبها قبل نقله لفرع آخر`
        )
      }
    }
    if (makesExecutive) await this.assertExecutivesReleasable(em, id)
  }

  // تعليم قسم «الإدارة التنفيذية» بيشيل التعليم من الإدارة التنفيذية الحالية (saveDepartment) — مرفوض طول ما تحتها إدارات
  // أو أقسام من فروع تانية. newExecutiveId = القسم اللي هيتعلّم (أبوّته نفسه اتفحصت في assertDepartmentTree)، null = قسم جديد
  private async assertExecutivesReleasable(em: EntityManager, newExecutiveId: number | null) {
    const current = await em.getRepository(Department).find({
      where: { isExecutive: true, ...(newExecutiveId ? { id: Not(newExecutiveId) } : {}) },
      order: { id: 'ASC' },
    })
    for (const executive of current) {
      await this.assertNoChildAdministrations(em, executive, newExecutiveId, 'implicit')
      await this.assertNoForeignChildren(em, executive, executive.branchId, newExecutiveId, 'implicit')
    }
  }

  // الإدارة مابتتحطش غير تحت «الإدارة التنفيذية» (قرار المالك 27 سبتمبر): وحدة هيتشال منها تعليم الإدارة التنفيذية (صريح أو
  // ضمني) أو هتتحول «قسم» مايتسابش تحتها إدارات — الرسالة بتسمّي إدارة منهم وبتقول خلّيها رئيسية الأول
  private async assertNoChildAdministrations(em: EntityManager, unit: Department, skipId: number | null,
    mode: 'explicit' | 'implicit' | 'type') {
    const child = await em.getRepository(Department).findOne({
      where: { parentId: unit.id, unitType: 'ADMINISTRATION', ...(skipId ? { id: Not(skipId) } : {}) },
      order: { id: 'ASC' },
    })
    if (!child) return
    throw new BadRequestException(mode === 'explicit'
      ? `مينفعش تشيل «الإدارة التنفيذية» من «${unit.name}» وتحتها إدارات زي «${child.name}» — الإدارة مابتتحطش غير تحت «الإدارة التنفيذية»: ${MOVE_ADMINISTRATIONS}`
      : mode === 'implicit'
        ? `مينفعش تعلّم قسم تاني «إدارة تنفيذية» و«${unit.name}» (الإدارة التنفيذية الحالية) تحتها إدارات زي «${child.name}» — ${MOVE_ADMINISTRATIONS}`
        : `مينفعش «${unit.name}» تتحول «قسم» وتحتها إدارات زي «${child.name}» — الإدارة مابتتحطش تحت قسم: ${MOVE_ADMINISTRATIONS}`)
  }

  // القسم العادي عمره ما يبقى أب لقسم من فرع تاني: executive بعد شيل تعليمه (في فرعه branchId بعد الحفظ) مايتسابش فوق أقسام
  // من فروع تانية — الرسالة بتسمّي قسم منهم وبتقول انقلهم الأول
  private async assertNoForeignChildren(em: EntityManager, executive: Department, branchId: number,
    skipId: number | null, mode: 'explicit' | 'implicit') {
    const child = await em.getRepository(Department).findOne({
      where: { parentId: executive.id, branchId: Not(branchId), ...(skipId ? { id: Not(skipId) } : {}) },
      order: { id: 'ASC' },
    })
    if (!child) return
    const branch = await em.getRepository(Branch).findOne({ where: { id: child.branchId } })
    const where = !branch ? `فرع #${child.branchId}` : branch.name.startsWith('فرع') ? branch.name : `فرع ${branch.name}`
    const move = 'انقل الأقسام دي الأول (تحت قسم من فرعها أو خليها أقسام رئيسية)'
    throw new BadRequestException(mode === 'explicit'
      ? `مينفعش تشيل «الإدارة التنفيذية» من «${executive.name}» وتحتها أقسام من فروع تانية زي «${child.name}» (${where}) — ${move}`
      : `مينفعش تعلّم قسم تاني «إدارة تنفيذية» و«${executive.name}» (الإدارة التنفيذية الحالية) تحتها أقسام من فروع تانية زي «${child.name}» (${where}) — ${move}`)
  }

  // ===== فلتر «الفرع ← الإدارة ← القسم ← الفريق» الموحد (طلب المالك 30 سبتمبر) =====
  // كل شاشة فيها موظفين بتفلتر بالشجرة دي ومكان كل موظف فيها — بنطاق فروع الحساب بس. الوحدات والفرق المفعّلة في الفروع المفعّلة جوه
  // النطاق، والموظفين بكل حالاتهم (المنتهية خدمتهم والمؤرشفين كمان عشان الصفوف القديمة تتفلتر) برقمهم ومكانهم بس — من غير أسماء ولا
  // أي بيانات شخصية. أي رقم برّه اللي راجع ما بيطلعش: أب الوحدة لو مش ظاهر (زي «الإدارة التنفيذية» في فرع برّه النطاق) بيبقى null،
  // وقسم/فريق الموظف لو مش ظاهر بيبقى null — فمفيش اسم ولا رقم من فرع برّه النطاق.
  async filterContext(scope: BranchScope): Promise<OrgFilterContext> {
    if (isEmptyBranchScope(scope)) return { branches: [], units: [], teams: [], employees: [] }
    const branches = await this.branches.find({
      where: scope === null ? { isActive: true } : { isActive: true, id: branchIdIn(scope) },
      select: { id: true, name: true },
      order: { id: 'ASC' },
    })
    const branchIds = branches.map((b) => b.id)
    const units = branchIds.length
      ? await this.departments.find({
          where: { isActive: true, branchId: In(branchIds) },
          select: { id: true, name: true, branchId: true, parentId: true, unitType: true, isExecutive: true },
          order: { id: 'ASC' },
        })
      : []
    const unitById = new Map(units.map((u) => [u.id, u]))
    const teams = units.length
      ? await this.teams.find({
          where: { isActive: true, departmentId: In([...unitById.keys()]) },
          select: { id: true, name: true, departmentId: true },
          order: { id: 'ASC' },
        })
      : []
    const teamIds = new Set(teams.map((t) => t.id))
    const employees = await this.employees.find({
      where: scope === null ? {} : { branchId: branchIdIn(scope) },
      select: { id: true, branchId: true, departmentId: true, teamId: true },
      order: { id: 'ASC' },
    })
    const visible = (id: number | null | undefined, set: { has(id: number): boolean }) =>
      id != null && set.has(Number(id)) ? Number(id) : null
    return {
      branches: branches.map((b) => ({ id: b.id, name: b.name })),
      units: units.map((u) => ({
        id: u.id,
        name: u.name,
        branchId: u.branchId,
        parentId: visible(u.parentId, unitById),
        unitType: u.unitType === 'ADMINISTRATION' || u.unitType === 'DEPARTMENT' ? u.unitType : u.isExecutive ? 'ADMINISTRATION' : 'DEPARTMENT',
        isExecutive: u.isExecutive === true,
      })),
      teams: teams.map((t) => ({ id: t.id, name: t.name, departmentId: t.departmentId, branchId: unitById.get(t.departmentId)!.branchId })),
      employees: employees.map((e) => ({
        id: e.id,
        branchId: e.branchId ?? null,
        departmentId: visible(e.departmentId, unitById),
        teamId: visible(e.teamId, teamIds),
      })),
    }
  }

  // ===== الفرق =====
  findTeams(branchScope: BranchScope) {
    if (branchScope == null)
      return this.teams.find({ relations: { department: true } })
    return this.teams.find({
      relations: { department: true },
      where: { department: { branchId: branchIdIn(branchScope) } },
    })
  }

  async createTeam(dto: CreateTeamDto, scope: BranchScope) {
    const dept = await this.departments.findOne({
      where: { id: dto.departmentId },
    })
    if (!dept) throw new BadRequestException('القسم غير موجود')
    if (!inBranchScope(scope, dept.branchId)) {
      throw new ForbiddenException(`القسم خارج نطاق ${scopeWord(scope)}`)
    }
    await this.assertManagerExists(dto.leaderEmployeeId, scope)
    return this.teams.save(this.teams.create(dto as Partial<Team>))
  }

  async updateTeam(id: number, dto: UpdateTeamDto, scope: BranchScope) {
    const team = await this.teams.findOne({ where: { id } })
    // نطاق الفريق = فرع قسمه (يُحمَّل منفصلاً حتى لا تطغى العلاقة على departmentId عند الحفظ)
    const current = team
      ? await this.departments.findOne({ where: { id: team.departmentId } })
      : null
    if (!team || !inBranchScope(scope, current?.branchId)) {
      throw new NotFoundException('الفريق غير موجود')
    }
    if (dto.departmentId) {
      const dept = await this.departments.findOne({
        where: { id: dto.departmentId },
      })
      if (!dept) throw new BadRequestException('القسم غير موجود')
      if (!inBranchScope(scope, dept.branchId)) {
        throw new ForbiddenException(`القسم خارج نطاق ${scopeWord(scope)}`)
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

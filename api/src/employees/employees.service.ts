import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Not, Repository } from 'typeorm'
import { User } from '../auth/user.entity'
import { Branch } from '../org/entities/branch.entity'
import { Department } from '../org/entities/department.entity'
import { Team } from '../org/entities/team.entity'
import { EmployeeStatusHistory } from '../requests/entities/employment.entities'
import { LeaveBalance } from '../requests/entities/leave.entities'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { Employee } from './employee.entity'
import { CreateEmployeeDto, UpdateEmployeeDto } from './employees.dto'

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
    @InjectRepository(Branch)
    private readonly branches: Repository<Branch>,
    @InjectRepository(Department)
    private readonly departments: Repository<Department>,
    @InjectRepository(Team)
    private readonly teams: Repository<Team>,
    @InjectRepository(LeaveBalance)
    private readonly balances: Repository<LeaveBalance>,
    @InjectRepository(RequestsConfig)
    private readonly config: Repository<RequestsConfig>,
    @InjectRepository(EmployeeStatusHistory)
    private readonly history: Repository<EmployeeStatusHistory>,
    @InjectRepository(User)
    private readonly users: Repository<User>
  ) {}

  // العزل بالفرع: branchScope = null → الكل (super_admin فقط)
  findAll(branchScope: number | null) {
    if (branchScope == null)
      return this.employees.find({ order: { id: 'ASC' } })
    return this.employees.find({
      where: { branchId: branchScope },
      order: { id: 'ASC' },
    })
  }

  async findOne(id: number, branchScope: number | null) {
    const emp = await this.employees.findOne({ where: { id } })
    if (!emp) throw new NotFoundException('الموظف غير موجود')
    // منع الوصول عبر الفروع
    if (branchScope != null && emp.branchId !== branchScope) {
      throw new NotFoundException('الموظف غير موجود')
    }
    return emp
  }

  // ===== فحوصات التفرد — كود البصمة/البريد/الرقم القومي =====
  private async assertUnique(data: {
    employeeCode?: string
    email?: string
    nationalId?: string
    excludeId?: number
  }) {
    const notSelf = data.excludeId ? { id: Not(data.excludeId) } : {}
    if (data.employeeCode) {
      const dup = await this.employees.findOne({
        where: { employeeCode: data.employeeCode, ...notSelf },
      })
      if (dup) {
        throw new ConflictException(
          `كود الموظف ${data.employeeCode} مستخدم بالفعل (${dup.fullName}) — الكود هو مفتاح البصمة ولا يتكرر`
        )
      }
    }
    if (data.email) {
      const dup = await this.employees.findOne({
        where: { email: data.email, ...notSelf },
      })
      if (dup) {
        throw new ConflictException(`البريد ${data.email} مسجل لموظف آخر`)
      }
    }
    if (data.nationalId) {
      const dup = await this.employees.findOne({
        where: { nationalId: data.nationalId, ...notSelf },
      })
      if (dup) {
        throw new ConflictException('الرقم القومي مسجل لموظف آخر')
      }
    }
  }

  // ===== فحص العلاقات: الفرع موجود، القسم تابع للفرع، الفريق تابع للقسم =====
  private async assertRelations(data: {
    branchId?: number
    departmentId?: number | null
    teamId?: number | null
    managerEmployeeId?: number | null
  }) {
    let branch: Branch | null = null
    if (data.branchId !== undefined) {
      branch = await this.branches.findOne({ where: { id: data.branchId } })
      if (!branch) throw new BadRequestException('الفرع غير موجود')
    }
    let dept: Department | null = null
    if (data.departmentId) {
      dept = await this.departments.findOne({
        where: { id: data.departmentId },
      })
      if (!dept) throw new BadRequestException('القسم غير موجود')
      if (branch && dept.branchId !== branch.id) {
        throw new BadRequestException(
          `القسم «${dept.name}» لا يتبع الفرع المحدد`
        )
      }
    }
    if (data.teamId) {
      const team = await this.teams.findOne({ where: { id: data.teamId } })
      if (!team) throw new BadRequestException('الفريق غير موجود')
      if (data.departmentId && team.departmentId !== data.departmentId) {
        throw new BadRequestException(
          `الفريق «${team.name}» لا يتبع القسم المحدد`
        )
      }
    }
    if (data.managerEmployeeId) {
      const mgr = await this.employees.findOne({
        where: { id: data.managerEmployeeId },
      })
      if (!mgr) throw new BadRequestException('المدير المباشر غير موجود')
    }
  }

  // نهاية العقد لا تسبق بدايته
  private assertContractDates(dto: {
    contractStart?: string
    contractEnd?: string
  }) {
    if (dto.contractStart && dto.contractEnd && dto.contractEnd < dto.contractStart) {
      throw new BadRequestException('نهاية العقد قبل بدايته')
    }
  }

  async create(dto: CreateEmployeeDto) {
    await this.assertUnique(dto)
    await this.assertRelations(dto)
    this.assertContractDates(dto)
    // الرصيد الافتتاحي حقلا حمولة فقط (ليسا عمودَي موظف) — يُطبَّقان على الرصيد
    const { openingBalanceDays, openingBalanceExpiry, ...empDto } =
      dto as CreateEmployeeDto & {
        openingBalanceDays?: number
        openingBalanceExpiry?: string | null
      }
    const emp = await this.employees.save(
      this.employees.create(empDto as Partial<Employee>)
    )
    // رصيد السنة الحالية تلقائياً — الاستحقاق من الإعدادات
    await this.ensureCurrentYearBalances(emp.id)
    // رصيد افتتاحي مُرحّل (اختياري) — طبقة opening على رصيد السنوي
    await this.applyOpeningBalance(emp.id, openingBalanceDays, openingBalanceExpiry)
    return emp
  }

  // يطبّق الرصيد الافتتاحي المُرحّل كطبقة opening على رصيد السنوي للسنة الحالية
  // (يُستخدم عند التعيين وعند التعديل لموظف قائم انتقل من نظام سابق)
  private async applyOpeningBalance(
    employeeId: number,
    days?: number,
    expiry?: string | null
  ) {
    if (!days || Number(days) <= 0) return
    await this.ensureCurrentYearBalances(employeeId)
    const period = String(new Date().getFullYear())
    const annual = await this.balances.findOne({
      where: { employeeId, balanceType: 'annual', period },
    })
    if (annual) {
      annual.openingDays = Number(days)
      annual.openingTaken = 0
      annual.openingExpiry = (expiry ?? null) as any
      await this.balances.save(annual)
    }
  }

  // الاستحقاق السنوي العام من الإعدادات (يوم/سنة)
  private async configAnnualEntitled(): Promise<number> {
    return Number(
      (await this.config.findOne({ where: { key: 'leave.annual_entitled' } }))
        ?.value ?? '21'
    )
  }

  // يزامن استحقاق السنوي على الرصيد: مقفول = 0، مفتوح = القيمة العامة
  private async applyAnnualEntitlement(employeeId: number, entitled: boolean) {
    const period = String(new Date().getFullYear())
    const annual = await this.balances.findOne({
      where: { employeeId, balanceType: 'annual', period },
    })
    if (!annual) return
    annual.entitled = entitled ? await this.configAnnualEntitled() : 0
    await this.balances.save(annual)
  }

  // ينشئ أرصدة السنة الحالية (سنوي/مرضي) إن لم توجد — يُستدعى عند التعيين
  private async ensureCurrentYearBalances(employeeId: number) {
    const period = String(new Date().getFullYear())
    const emp = await this.employees.findOne({ where: { id: employeeId } })
    // غير مستحق للسنوي → استحقاق 0 (لا يتراكم له رصيد)
    const annualEntitled =
      emp?.annualLeaveEntitled === false ? 0 : await this.configAnnualEntitled()
    for (const [balanceType, entitled] of [
      ['annual', annualEntitled],
      ['sick', 180],
    ] as const) {
      const existing = await this.balances.findOne({
        where: { employeeId, balanceType, period },
      })
      if (!existing) {
        await this.balances.save(
          this.balances.create({
            employeeId,
            balanceType,
            entitled,
            taken: 0,
            period,
          })
        )
      }
    }
  }

  async update(id: number, dto: UpdateEmployeeDto, branchScope: number | null) {
    const emp = await this.findOne(id, branchScope)
    await this.assertUnique({ ...dto, excludeId: id })
    this.assertContractDates({
      contractStart: dto.contractStart ?? emp.contractStart,
      contractEnd: dto.contractEnd ?? emp.contractEnd,
    })
    await this.assertRelations({
      branchId: dto.branchId ?? emp.branchId,
      departmentId: dto.departmentId,
      teamId: dto.teamId,
      managerEmployeeId: dto.managerEmployeeId,
    })
    // الموظف لا يكون مدير نفسه
    if (dto.managerEmployeeId === id) {
      throw new BadRequestException('الموظف لا يكون مديراً مباشراً لنفسه')
    }
    // الرصيد الافتتاحي حقلا حمولة فقط — يُطبَّقان على الرصيد لا على الموظف
    const { openingBalanceDays, openingBalanceExpiry, ...empDto } =
      dto as UpdateEmployeeDto & {
        openingBalanceDays?: number
        openingBalanceExpiry?: string | null
      }
    Object.assign(emp, empDto)
    const saved = await this.employees.save(emp)
    // تبديل استحقاق السنوي → مزامنة رصيد السنوي (0 أو القيمة العامة)
    if (dto.annualLeaveEntitled !== undefined) {
      await this.applyAnnualEntitlement(id, dto.annualLeaveEntitled)
    }
    // تعديل رصيد افتتاحي مُرحّل لموظف قائم (انتقل من نظام سابق)
    await this.applyOpeningBalance(id, openingBalanceDays, openingBalanceExpiry)
    return saved
  }

  // الأرشفة بدل الحذف — التاريخ الوظيفي لا يُمسح (بسبب موثّق)
  async archive(id: number, branchScope: number | null, reason?: string) {
    const emp = await this.findOne(id, branchScope)
    emp.status = 'archived'
    emp.isActive = false
    emp.archivedAt = new Date()
    emp.archiveReason = reason?.trim() || 'أرشفة يدوية'
    const saved = await this.employees.save(emp)
    // عطّل حساب الدخول المرتبط — المؤرشف لا يسجّل دخولاً بعد الآن
    await this.users.update({ employeeId: emp.id }, { isActive: false })
    return saved
  }

  // العودة على رأس العمل: مؤرشف أو منتهي الخدمة يرجع نشطاً
  // بنفس ملفه وتاريخه — والحركة تتوثق في السجل الوظيفي
  async reactivate(id: number, branchScope: number | null) {
    const emp = await this.findOne(id, branchScope)
    if (emp.status !== 'archived' && emp.status !== 'terminated') {
      throw new BadRequestException('الموظف ليس مؤرشفاً ولا منتهي الخدمة')
    }
    const old = emp.status
    emp.status = 'active'
    emp.isActive = true
    emp.archivedAt = null as any
    emp.archiveReason = null as any
    await this.employees.save(emp)
    // أعِد تفعيل حساب الدخول المرتبط — العائد على رأس العمل يسجّل دخولاً
    await this.users.update({ employeeId: emp.id }, { isActive: true })
    await this.history.save({
      employeeId: emp.id,
      oldStatus: old,
      newStatus: 'active',
      reason:
        old === 'terminated'
          ? 'عودة على رأس العمل بعد انتهاء خدمة'
          : 'إعادة تفعيل من الأرشيف',
    })
    return emp
  }
}

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Between, EntityManager, In, IsNull, LessThanOrEqual, MoreThanOrEqual, Not, Raw, Repository } from 'typeorm'
import { branchIdIn, branchScopeQb, inBranchScope, scopeWord } from '../auth/guards'
import type { BranchScope } from '../auth/guards'
import { OffboardingCase } from '../offboarding/offboarding.entities'
import { OPEN_CASE_STATUSES } from '../offboarding/offboarding-open'
import { AttendanceService } from '../attendance/attendance.service'
import { beginCalendarChange, finishCalendarChange, readCalendarSource } from '../attendance/attendance-calendar-history'
import { assertAttendanceRulePeriodOpen, assertEmployeeSchedulesFitBranch, attendanceRuleChange, attendanceRuleToday, employeeAttendanceFallback, lockAttendanceRuleMutation,
  pickAttendanceRule, resolveAttendanceRule, saveEmployeeAttendanceRule } from '../attendance/attendance-rule-history'
import { lockPayrollEmployees } from '../payroll/payroll-settlement-boundary'
// تراكم المسير يومًا بيوم: الإيقاف بيغيّر أيام — نعلّمها «متسخة» فالجار الليلي يعيدها
import { markPayrollRangeDirty } from '../payroll/payroll-daily-accrual'
import { isLeaveRequest } from '../common/leave-contract'
import { AttendanceRuleVersion, EmployeeAttendanceRuleSnapshot } from '../attendance/attendance-rule.entities'
import { User } from '../auth/user.entity'
// حساب الدخول من المجال للموظف الجديد — نفس خدمة المزامنة الجماعية، مفيش روتين إنشاء تاني
import { DomainSyncService, type DomainProvisionResult } from '../auth/domain-sync.service'
import { EmployeeDocument, Grade } from '../assets/assets.entities'
import { assertDocTypes } from '../assets/doc-types'
import { Branch } from '../org/entities/branch.entity'
import { readBranchCurrency } from '../org/branch-currency-db'
import { Department } from '../org/entities/department.entity'
import { Team } from '../org/entities/team.entity'
import { EmployeeStatusHistory } from '../requests/entities/employment.entities'
import { recordEmployeeChange } from './employee-change-log'
import { normalizeGosiFirstRegistered, readGosiFirstRegistered, saveGosiFirstRegistered } from './employee-gosi-registration'
import { generateEmployeeCode } from './employee-code'
import { employeePayMethodIssue } from '../payroll/pay-split'
import { assertArchiveReason, identityKeySql, nextOpeningBalance } from './employee-input-rules'
import { Leave, LeaveBalance } from '../requests/entities/leave.entities'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { Request } from '../requests/entities/request.entity'
import { Employee } from './employee.entity'
import { CreateEmployeeDto, RenewEmployeeContractDto, UpdateEmployeeDto } from './employees.dto'
import { linkEmployeeFiles } from '../files/link-employee-files'
import { applyEmployeeSalaryChange, documentInitialEmployeeSalary, employeeSalaryStartContext, readSalaryCycleStartDay } from '../payroll/payroll-salary-change'
import { payrollPeriodBounds, payrollPeriodOfDate } from '../payroll/payroll-period'
import { localDateOf } from '../attendance/attendance.service'
import { readSalaryHistory, readSalaryHistoryCurrent, SALARY_HISTORY_MONEY_KEYS,
  salaryHistoryMoney, salaryHistorySchemaMissing } from '../payroll/payroll-salary-history'
import { AttendanceDay } from '../attendance/attendance.entities'
import { arabicFullNameIssue, birthDateIssue, employeeIdentityIssues, employeeRequiredIssues, identityValue, normalizeIdentityNumber,
  type EmployeeIdentityValues, type EmployeeRequiredValues } from './employee-required-fields'
import { addDays, currentSuspension, displayEmployeeStatus, overlappingLeave, overlappingSuspension, SUSPENDABLE_STATUSES,
  SUSPENSION_CLOSED_PAYROLL_MESSAGE, SUSPENSION_LEAVE_OVERLAP_MESSAGE, suspensionEndPlan, suspensionFreedRange, suspensionInputIssue,
  upcomingSuspension } from './employee-suspension-rules'
import { EmployeeSuspension } from './employee-suspension.entity'
// B1.7: سجل تغييرات الصرف وضوابط الشخص الواحد (مقفولة افتراضيًا)
import { recordEmployeePaymentChanges } from './employee-payment-changes'
import { BANK_SECURE_FIELDS, onePersonControlEnabled } from '../payroll/one-person-controls'
import { CustodyAssignment } from '../requests/entities/custody.entities'
import { openCustodyStatuses } from '../requests/employment-destinations'
import { readEmployeeSuspensions, readOpenSuspensions, suspensionTableReady, suspensionView } from './employee-suspensions'
import type { CreateEmployeeSuspensionDto, EndEmployeeSuspensionDto } from './employees.dto'
import { recordOutboxEvent } from '../queue/outbox'
import { recordAudit } from '../audit/audit'
import { EmploymentPeriod } from './employment-period.entity'
import { EMPLOYMENT_PERIODS_MIGRATION_MISSING, REHIRE_REASON_MAX, REHIRE_REASON_MIN, employmentPeriodsReady, frozenBalanceKey, isoDay, reasonWithLabel, rehireGate, rehireStartIssue } from './employment-periods'

// حقول إجبارية عند الإضافة (قرار المالك 16 سبتمبر): في التعديل الغائب بلا تغيير، والمرسل فاضي = مسح مرفوض.
// رقم الهوية / الجواز مش هنا: مسح واحد منهم مسموح لو التاني فاضل (employeeIdentityIssues في update)
const REQUIRED_ON_EDIT: Record<string, string> = {
  nationality: 'الجنسية مطلوبة ولا يمكن مسحها', gender: 'الجنس مطلوب ولا يمكن مسحه', birthDate: 'تاريخ الميلاد مطلوب ولا يمكن مسحه',
  phone: 'رقم الجوال مطلوب ولا يمكن مسحه', joinDate: 'تاريخ التعيين مطلوب ولا يمكن مسحه',
  departmentId: 'القسم مطلوب ولا يمكن مسحه', jobTitle: 'المسمى الوظيفي مطلوب ولا يمكن مسحه', fingerprintCode: 'رقم البصمة مطلوب ولا يمكن مسحه',
}

/** « (الاسم)» لرسائل التكرار لو صاحب القيمة في نطاق المستخدم (مدير النظام أو فرع من فروعه)، وإلا فاضي. */
export function employeeNameInScope(dup: Pick<Employee, 'fullName' | 'branchId'>, branchScope: BranchScope): string {
  return inBranchScope(branchScope, dup.branchId) ? ` (${dup.fullName})` : ''
}

/** أول مشكلة في الحقول الإجبارية عند إنشاء موظف (أي مسار: الإضافة أو التعيين من مرشح)، أو null. */
export function employeeCreateIssue(dto: object, today: string): string | null {
  return employeeRequiredIssues(dto as EmployeeRequiredValues, { mode: 'add', today })[0]?.message ?? null
}

/** رقم الهوية / الجواز بالشكل المحفوظ على أي مسار (الـDTO بيطبّعهم، والمسارات الداخلية كمان): الفاضي = null. */
function normalizeIdentityFields(dto: EmployeeIdentityValues) {
  for (const key of ['nationalId', 'passportNo'] as const) {
    const value = identityValue(dto[key])
    if (value !== undefined) dto[key] = value
  }
}

/** مقارنة رقم هوية / جواز محفوظ بالقيمة المطبّعة — المحفوظ القديم بمسافات أو حروف صغيرة أو أرقام عربية بيتطابق كمان. */
const sameIdentity = (value: string) => Raw(alias => `${identityKeySql(alias)} = :identity`, { identity: value })

// B2.10a: الإرجاع من منتهي أو مؤرشف لموظف ملفه مُصفّى محتاج سبب مكتوب — الواجهة بتعرف الرد ده بكوده
export const SETTLED_RETURN_REASON_REQUIRED = 'SETTLED_RETURN_REASON_REQUIRED'
export const SETTLED_RETURN_MESSAGE = 'الموظف ده خدمته انتهت وملفه اتصفّى. الإرجاع بيكمّل مدة خدمته ورصيد إجازاته من تاريخ تعيينه القديم — اكتب سبب الإرجاع (5 حروف على الأقل)'

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name)

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
    private readonly users: Repository<User>,
    @InjectRepository(EmployeeDocument)
    private readonly docs: Repository<EmployeeDocument>,
    private readonly attendance: AttendanceService,
    // اختيارية وفي الآخر عن قصد: الاختبارات اللي بتعمل الخدمة بإيدها بترسل عشر حقن،
    // وغياب الخدمة معناه إن التزويد بيتخطّى بصمت — إضافة الموظف مش بتتعطّل أبدًا
    @Optional() private readonly domainSync?: DomainSyncService
  ) {}

  // مرفق العقد → مستند نوعه «عقد» مربوط بالموظف (يظهر في مستنداته)
  private async saveContractDocument(
    employeeId: number,
    dto: { contractFileRef?: string; contractNumber?: string; contractStart?: string; contractEnd?: string },
    em: EntityManager
  ) {
    if (!dto.contractFileRef) return
    await em.save(EmployeeDocument,
      em.create(EmployeeDocument, {
        employeeId,
        docType: 'contract',
        number: dto.contractNumber ?? undefined,
        issueDate: dto.contractStart ?? undefined,
        expiryDate: dto.contractEnd ?? undefined,
        fileRef: dto.contractFileRef,
      } as Partial<EmployeeDocument>)
    )
  }

  // مرفقات الملف (هوية/جواز/مؤهل/سيرة/خبرة/صورة) → مستند لكل مرجع ملف مربوط بالموظف
  private async saveDocuments(
    employeeId: number,
    refs: { docType: string; fileRef: string; number?: string }[] | undefined,
    em: EntityManager
  ) {
    if (!Array.isArray(refs) || refs.length === 0) return
    for (const ref of refs) {
      if (!ref?.docType || !ref?.fileRef) continue
      await em.save(EmployeeDocument,
        em.create(EmployeeDocument, {
          employeeId,
          docType: ref.docType,
          number: ref.number ?? undefined,
          fileRef: ref.fileRef,
        } as Partial<EmployeeDocument>)
      )
    }
  }

  // العزل بالفرع: branchScope = null → الكل (نطاق كل الفروع)، مصفوفة = الفروع دي بس
  async findAll(branchScope: BranchScope) {
    const rows = await this.employees.find({
      where: branchScope == null ? {} : { branchId: branchIdIn(branchScope) },
      order: { id: 'ASC' },
    })
    // HRC-09: نسخ قواعد حضور موظفي النطاق كلها باستعلام واحد بدل استعلام لكل موظف —
    // عدد الاستعلامات ثابت مهما زاد الموظفون، والاختيار نفس قاعدة صفحة التفاصيل
    const versions = this.employees.manager.getRepository(AttendanceRuleVersion).createQueryBuilder('v')
      .where('v.sourceType = :sourceType', { sourceType: 'EMPLOYEE' })
    if (branchScope != null) {
      const [inScope, params] = branchScopeQb('e.branchId', branchScope)
      versions.andWhere(`v.sourceId IN (SELECT e.id FROM employees e WHERE ${inScope})`, params)
    }
    const byEmployee = new Map<number, AttendanceRuleVersion[]>()
    for (const version of await versions.getMany()) {
      const list = byEmployee.get(version.sourceId)
      if (list) list.push(version)
      else byEmployee.set(version.sourceId, [version])
    }
    const today = attendanceRuleToday()
    // الإيقاف عن العمل: الحالة المعروضة «موقوف» مشتقة من التواريخ باستعلام واحد للكل
    const suspensions = await readOpenSuspensions(this.employees.manager, localDateOf(new Date()))
    return rows.map(row => this.withSuspension(this.withAttendanceRule(row,
      pickAttendanceRule(byEmployee.get(row.id) ?? [], today, employeeAttendanceFallback(row))), suspensions.get(row.id) ?? []))
  }

  // الحالة المحفوظة تبقى في storedStatus؛ status = «suspended» طول فترة الإيقاف وترجع لوحدها بعدها
  private withSuspension<T extends Employee>(employee: T, periods: EmployeeSuspension[], history?: EmployeeSuspension[]) {
    const today = localDateOf(new Date())
    const current = currentSuspension(periods, today) ?? upcomingSuspension(periods, today)
    return Object.assign(employee, {
      storedStatus: employee.status,
      status: displayEmployeeStatus(employee.status, periods, today) as Employee['status'],
      suspension: current ? suspensionView(current, today) : null,
      ...(history ? { suspensions: history.map(row => suspensionView(row, today)) } : {}),
    })
  }

  // دليل مختصر للنشطين في النطاق — المعرّف والاسم والكود فقط (بلا راتب/هوية/بنك)
  directory(branchScope: BranchScope) {
    return this.employees.find({
      select: { id: true, fullName: true, employeeCode: true },
      where: {
        isActive: true,
        ...(branchScope != null ? { branchId: branchIdIn(branchScope) } : {}),
      },
      order: { fullName: 'ASC' },
    })
  }

  async findOne(id: number, branchScope: BranchScope) {
    const emp = await this.employees.findOne({ where: { id } })
    if (!emp) throw new NotFoundException('الموظف غير موجود')
    // منع الوصول عبر الفروع
    if (!inBranchScope(branchScope, emp.branchId)) {
      throw new NotFoundException('الموظف غير موجود')
    }
    return this.attendanceView(emp)
  }

  private async attendanceView(employee: Employee) {
    const resolved = await resolveAttendanceRule(this.employees.manager, 'EMPLOYEE', employee.id,
      attendanceRuleToday(), employeeAttendanceFallback(employee))
    const history = await readEmployeeSuspensions(this.employees.manager, employee.id, undefined, { includeCancelled: true })
    // B1.5: «تاريخ أول تسجيل في التأمينات» برّه الكيان (ترحيل 080) — قبل الترحيل = فاضي
    employee.gosiFirstRegisteredAt = (await readGosiFirstRegistered(this.employees.manager, [employee.id])).get(employee.id) ?? null
    return this.withSuspension(this.withAttendanceRule(employee, resolved), history.filter(row => row.status !== 'CANCELLED'), history)
  }

  private withAttendanceRule(employee: Employee, resolved: ReturnType<typeof pickAttendanceRule<EmployeeAttendanceRuleSnapshot>>) {
    return Object.assign(employee, { workScheduleId: resolved.snapshot.workScheduleId,
      flexOverrideMode: resolved.snapshot.flexOverrideMode, attendanceRuleVersion: resolved.version,
      attendanceRuleEffectiveFrom: resolved.effectiveFrom, attendanceRuleLegacy: resolved.legacyBaseline })
  }

  // ===== فحوصات التفرد — كود البصمة/البريد/رقم الهوية/رقم الجواز =====
  // البحث على مستوى الشركة كلها، لكن اسم صاحب القيمة يظهر بس لو في نطاق المستخدم (عزل الفروع):
  // حساب فرع ياخد رسالة عامة لو الموظف التاني في فرع تاني.
  // رقم الهوية والجواز بيتقارنوا بعد التطبيع؛ وفي التعديل (current = الملف المحفوظ) الرقم اللي ماتغيرش مايتفحصش —
  // ملف قديم بقيمة مكررة من قبل القرار يحفظ باقي حقوله
  // em = معاملة الحفظ (بعد lockEmployeeIdentities): الفحص بيشوف اللي اتحفظ قبله تحت نفس القفل
  private async assertUnique(data: {
    fingerprintCode?: string
    email?: string
    nationalId?: string | null
    passportNo?: string | null
    excludeId?: number
  }, branchScope: BranchScope, current?: EmployeeIdentityValues, em?: EntityManager) {
    const employees = em ? em.getRepository(Employee) : this.employees
    const notSelf = data.excludeId ? { id: Not(data.excludeId) } : {}
    const whose = (dup: Employee) => employeeNameInScope(dup, branchScope)
    const changedIdentity = (key: 'nationalId' | 'passportNo') => {
      const value = normalizeIdentityNumber(data[key])
      return value && !(current && value === normalizeIdentityNumber(current[key])) ? value : null
    }
    // كود الموظف يولّده النظام (فريد بفهرس) — مش مدخل ومش مفتاح بصمة؛ رقم البصمة وحده يربط البصمات
    if (data.fingerprintCode) {
      const dup = await employees.findOne({ where: { fingerprintCode: data.fingerprintCode, ...notSelf } })
      if (dup) {
        throw new ConflictException(`رقم البصمة ${data.fingerprintCode} مستخدم بالفعل${whose(dup)} — لا يتكرر`)
      }
    }
    if (data.email) {
      const dup = await employees.findOne({
        where: { email: data.email, ...notSelf },
      })
      if (dup) {
        throw new ConflictException(`البريد ${data.email} مسجل لموظف آخر`)
      }
    }
    const nationalId = changedIdentity('nationalId')
    if (nationalId) {
      const dup = await employees.findOne({
        where: { nationalId: sameIdentity(nationalId), ...notSelf },
      })
      if (dup) {
        throw new ConflictException(`رقم الهوية / الإقامة ${nationalId} مسجل لموظف آخر${whose(dup)}`)
      }
    }
    const passportNo = changedIdentity('passportNo')
    if (passportNo) {
      const dup = await employees.findOne({
        where: { passportNo: sameIdentity(passportNo), ...notSelf },
      })
      if (dup) {
        throw new ConflictException(`رقم الجواز ${passportNo} مسجل لموظف آخر${whose(dup)}`)
      }
    }
  }

  // تفرد البصمة والبريد والهوية والجواز تحت التزامن (مراجعة Codex الجولة 17، CR17-B01): حفظين متزامنين لنفس الرقم لموظفين
  // مختلفين كانوا بيعدّوا الاتنين لأن الفحص كان قبل معاملة الحفظ. دلوقتي الفحص بيتعاد جوه المعاملة بعد القفل ده، فالتاني
  // بيستنى الأول يخلص ويشوف رقمه المحفوظ. الفحص المبكر قبل المعاملة فاضل للرد السريع بس
  private async lockEmployeeIdentities(em: EntityManager) {
    if (em.connection.options.type !== 'mssql') return
    const rows = await em.query(`DECLARE @result int;
      EXEC @result = sys.sp_getapplock @Resource = 'hr:employees:identity', @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 15000;
      SELECT @result AS lockResult;`)
    if (!rows.length || Number(rows[0].lockResult) < 0) {
      throw new ConflictException('بيانات الموظفين بتتحفظ دلوقتي من حد تاني؛ جرّب تاني بعد شوية')
    }
  }

  // ===== فحص العلاقات: الفرع موجود، القسم تابع للفرع، الفريق تابع للقسم =====
  private async assertRelations(data: {
    branchId?: number
    departmentId?: number | null
    teamId?: number | null
    managerEmployeeId?: number | null
    gradeId?: number | null
    // الدرجة الحالية للتعديل: درجة معطّلة لم تتغير لا تمنع حفظ باقي الملف
    currentGradeId?: number | null
  }) {
    // HRC-08: الدرجة الوظيفية مرجع لكتالوج الدرجات — رقم غير موجود يُرفض بـ400
    // بدل حفظ مرجع يتيم يظهر فارغًا في الملف والتقارير
    if (data.gradeId != null) {
      const grade = await this.employees.manager.findOneBy(Grade, { id: data.gradeId })
      if (!grade) throw new BadRequestException('الدرجة الوظيفية غير موجودة')
      if (!grade.isActive && data.gradeId !== data.currentGradeId) {
        throw new BadRequestException(`الدرجة الوظيفية «${grade.name}» معطّلة — اختر درجة فعّالة`)
      }
    }
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
      if (!data.departmentId || team.departmentId !== data.departmentId) {
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

  // بداية استحقاق الراتب لا تسبق بدء العمل — الأيام قبل التعيين لا تُدفع أصلاً
  private assertSalaryEntitlementStart(value?: string | null, hireDate?: string | null) {
    if (!value || !hireDate) return
    if (String(value).slice(0, 10) < String(hireDate).slice(0, 10)) {
      throw new BadRequestException('بداية استحقاق الراتب لا تسبق تاريخ التعيين')
    }
  }

  async renewContract(id: number, dto: RenewEmployeeContractDto, branchScope: BranchScope, actorId: number) {
    const validDate = (value: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false
      const date = new Date(`${value}T12:00:00Z`)
      return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
    }
    if (!validDate(dto.contractStart) || !validDate(dto.contractEnd)) throw new BadRequestException('تواريخ العقد غير صالحة')
    if (dto.contractEnd < dto.contractStart) throw new BadRequestException('نهاية العقد قبل بدايته')
    const reason = dto.reason?.trim()
    if (!reason || reason.length < 3 || reason.length > 250) throw new BadRequestException('سبب التجديد من 3 إلى 250 حرفاً')
    if (dto.contractFileRef != null && !/^file:[1-9]\d*$/.test(dto.contractFileRef)) throw new BadRequestException('مرجع ملف العقد غير صالح')
    return this.employees.manager.transaction(async em => {
      const employee = await em.findOne(Employee, { where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!employee || !inBranchScope(branchScope, employee.branchId)) throw new NotFoundException('الموظف غير موجود')
      if (['archived', 'terminated', 'resigned', 'retired'].includes(employee.status)) throw new BadRequestException('لا يمكن تجديد عقد موظف انتهت خدمته أو أُرشف')
      if (employee.contractType === 'permanent') throw new BadRequestException('العقد الدائم لا يحتاج تجديد مدة')
      if (employee.contractEnd && dto.contractStart <= employee.contractEnd) throw new ConflictException('يجب أن يبدأ التجديد بعد نهاية العقد الحالي')
      if (employee.joinDate && dto.contractStart < employee.joinDate) throw new BadRequestException('بداية العقد تسبق تاريخ التحاق الموظف')
      const pending = await em.findOne(Request, { where: { requesterId: id,
        typeCode: In(['CONTRACT_RENEWAL', 'CONTRACT_TYPE_CHANGE']),
        status: In(['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'IN_EXECUTION']),
      } })
      if (pending) throw new ConflictException('يوجد طلب تغيير عقد قيد المعالجة لهذا الموظف')
      const oldDates = `${employee.contractStart ?? '—'} → ${employee.contractEnd ?? '—'}`
      await linkEmployeeFiles(em, id, [dto.contractFileRef], actorId)
      employee.contractStart = dto.contractStart
      employee.contractEnd = dto.contractEnd
      // Dates are authoritative; do not carry an old duration into a renewed contract.
      employee.contractDurationMonths = null as any
      await em.save(Employee, employee)
      await this.saveContractDocument(id, {
        contractFileRef: dto.contractFileRef, contractNumber: employee.contractNumber,
        contractStart: dto.contractStart, contractEnd: dto.contractEnd,
      }, em)
      await recordEmployeeChange(em, {
        employeeId: id, fieldName: 'contract', oldValue: oldDates,
        newValue: `${dto.contractStart} → ${dto.contractEnd}`, changedByUserId: actorId,
        reason: `تجديد العقد — المستخدم #${actorId} — ${reason}${dto.contractFileRef ? ` — المستند ${dto.contractFileRef}` : ''}`,
      })
      return employee
    })
  }

  // قرار المالك 16 سبتمبر: الاسم بالعربي وتاريخ ميلاد قبل النهارده. الإلزام نفسه في CreateEmployeeDto؛ هنا شكل
  // القيم المكتوبة (يسري على كل مسار إنشاء). رقم الهوية / الجواز قاعدته في employeeIdentityIssues (قرار 28 سبتمبر)
  private assertIdentity(values: { fullName?: string | null; birthDate?: string | null }) {
    const issue = arabicFullNameIssue(values.fullName) ?? birthDateIssue(values.birthDate, localDateOf(new Date()))
    if (issue) throw new BadRequestException(issue)
  }

  async create(dto: CreateEmployeeDto, actorId: number, branchScope: BranchScope) {
    // العملة تبع الفرع (قرار المالك 30 سبتمبر): أي عملة مبعوتة بتتجاهل، والخادم بيحط عملة الفرع جوه المعاملة (من دولته أو عملة النظام)
    delete (dto as { currency?: unknown }).currency
    normalizeIdentityFields(dto)
    // الحقول الإجبارية وشكلها (الاسم بالعربي، رقم الهوية أو الجواز، الميلاد…) على كل مسار إنشاء — مش الـDTO بس
    const requiredIssue = employeeCreateIssue(dto, localDateOf(new Date()))
    if (requiredIssue) throw new BadRequestException(requiredIssue)
    this.assertIdentity(dto)
    await this.assertUnique(dto, branchScope)
    await this.assertRelations(dto)
    this.assertContractDates(dto)
    this.assertSalaryEntitlementStart(dto.salaryEntitlementStart, dto.actualStartDate || dto.joinDate)
    // طريقة الصرف: «نقدي + بنك» بمبلغ بنك > 0، والبنك والآيبان مطلوبان لما البنك داخل في الصرف
    // (مسار لم يرسل طريقة صرف يبقى على الافتراضي كما كان)
    const payIssue = dto.payMethod !== undefined || dto.bankTransferAmount != null ? employeePayMethodIssue(dto) : null
    if (payIssue) throw new BadRequestException(payIssue)
    if ((dto.payMethod ?? 'transfer') !== 'mixed') dto.bankTransferAmount = null
    // الكود يولّده النظام داخل المعاملة — أي كود مرسل (حتى من مسار تعيين مرشح) يُتجاهل
    delete (dto as { employeeCode?: unknown }).employeeCode
    // أنواع مرفقات الملف من كتالوج أنواع المستندات (لا نص حر) — قبل أي حفظ
    await assertDocTypes(this.docs.manager, (dto.documentRefs ?? []).map((r) => r?.docType))
    // B1.5: تاريخ أول تسجيل في التأمينات بيتكتب بـSQL صريح بعد الحفظ (العمود برّه الكيان)
    const gosiFirstRegisteredAt = normalizeGosiFirstRegistered(dto.gosiFirstRegisteredAt, localDateOf(new Date()))
    delete (dto as { gosiFirstRegisteredAt?: unknown }).gosiFirstRegisteredAt
    // الرصيد الافتتاحي حقلا حمولة فقط (ليسا عمودَي موظف) — يُطبَّقان على الرصيد
    // openingBalance* و contractFileRef و documentRefs حقول حمولة فقط (ليست أعمدة موظف)
    const {
      openingBalanceDays,
      openingBalanceExpiry,
      contractFileRef,
      documentRefs,
      flexOverrideMode,
      attendanceEffectiveFrom,
      attendanceChangeReason,
      salaryEffectivePayrollPeriod,
      salaryEvidenceReference,
      ...empDto
    } = dto as CreateEmployeeDto & {
      openingBalanceDays?: number
      openingBalanceExpiry?: string | null
    }
    const emp = await this.employees.manager.transaction(async em => {
      await lockAttendanceRuleMutation(em)
      // التفرد جوه المعاملة تحت القفل (CR17-B01)
      await this.lockEmployeeIdentities(em)
      await this.assertUnique(dto, branchScope, undefined, em)
      const employeeCode = await generateEmployeeCode(em)
      const currency = await readBranchCurrency(em, dto.branchId)
      const result = await em.save(Employee, em.create(Employee, { ...(empDto as Partial<Employee>), employeeCode, currency }))
      {
        const change = attendanceRuleChange({ effectiveFrom: attendanceEffectiveFrom, changeReason: attendanceChangeReason }, true)
        // المصدر قبل إنشاء الموظف لا يحمل إسنادًا سابقًا؛ لا ننسب الدوام الحالي للماضي.
        const assigned = result.workScheduleId
        result.workScheduleId = null as any
        await saveEmployeeAttendanceRule(em, result, { workScheduleId: assigned ?? null, flexOverrideMode,
          ...change, actorUserId: actorId })
        await em.save(Employee, result)
      }
      const orgBefore = await readCalendarSource(em, 'EMPLOYEE', result.id)
      await finishCalendarChange(em, orgBefore, { effectiveFrom: attendanceEffectiveFrom ?? attendanceRuleToday(), reason: attendanceChangeReason ?? 'تسجيل فرع الموظف من تاريخ إنشاء الملف',
        expectedRevision: orgBefore.revision, expectedCurrentSourceHash: orgBefore.currentSourceHash }, actorId!)
      await linkEmployeeFiles(em, result.id, [contractFileRef, ...(documentRefs ?? []).map(r => r.fileRef),
        dto.photoFileId ? `file:${dto.photoFileId}` : undefined], actorId)
      await this.saveContractDocument(result.id, { contractFileRef, contractNumber: dto.contractNumber, contractStart: dto.contractStart, contractEnd: dto.contractEnd }, em)
      await this.saveDocuments(result.id, documentRefs, em)
      await recordEmployeePaymentChanges(em, { employeeId: result.id, before: null, after: result, actorUserId: actorId, source: 'CREATE' })
      if (gosiFirstRegisteredAt) await saveGosiFirstRegistered(em, result.id, gosiFirstRegisteredAt)
      // الخطوة 13: أجر التعيين يُوثَّق «يسري من راتب شهر» في المعاملة نفسها؛ بدونه يُستبعد الموظف الجديد من أول مسير
      // (NO_SALARY_DEFINED) حتى توثيق منفصل. فشل التوثيق (عملة غير مدعومة، شهر خارج المدى) يرجّع الإنشاء كله.
      await documentInitialEmployeeSalary(em, { employeeId: result.id, actorUserId: actorId, hireDate: result.actualStartDate || result.joinDate || null,
        effectivePayrollPeriod: salaryEffectivePayrollPeriod, evidenceReference: salaryEvidenceReference?.trim() || (dto.contractNumber?.trim() ? `عقد ${dto.contractNumber.trim()}` : undefined) })
      // B2.3: «تم التعيين» في نفس معاملة الإنشاء (الشاشة والتعيين من المرشح بيعدّوا من هنا)
      await recordOutboxEvent(em, { type: 'EMPLOYEE_HIRED', entityType: 'employee', entityId: result.id,
        payload: { employeeId: result.id, branchId: result.branchId ?? null, joinDate: result.joinDate ?? null } })
      return result
    })
    await this.employees.manager.transaction(async em => {
      // رصيد السنة الحالية تلقائياً — الاستحقاق من الإعدادات
      await this.currentYearBalancesIn(em, emp.id)
      // رصيد افتتاحي مُرحّل (اختياري) — طبقة opening على رصيد السنوي، لموظف يستحق السنوي فقط
      if (dto.annualLeaveEntitled !== false) {
        await this.openingBalanceIn(em, emp.id, openingBalanceDays, openingBalanceExpiry)
      }
    })
    // بصمات وصلت بكوده/رقم بصمته قبل تسجيله تُربط به
    await this.relinkPunches(emp)
    // حساب الدخول من الدومين في لحظته (قرار المالك 22 سبتمبر بالليل) — **بعد** ما المعاملة اتثبّتت
    // وبأفضل جهد. النتيجة حقل إضافي في الرد عشان الشاشة تقول اللي حصل بالنص
    const domainProvision = await this.provisionDomainUser(emp)
    return Object.assign(await this.attendanceView(emp), { domainProvision })
  }

  /**
   * حساب الدخول من الدومين للموظف اللي لسه اتعمل — أفضل جهد بالكامل:
   *   • الدليل واقف أو مش مضبوط أو بطيء، أو مفيش موظف مطابق، أو المفتاح مقفول = الموظف اتحفظ
   *     والطلب ناجح، والسبب بيرجع في الرد (ولا استثناء بيطلع من هنا خالص).
   *   • مفيش روتين إنشاء تاني: كله بيمر على DomainSyncService.provisionOnHire (نفس المطابقة ونفس
   *     أسباب المزامنة الجماعية بالحرف، والإنشاء/الربط في DomainLoginService).
   * null = الخدمة مش محقونة (اختبار بيعمل الخدمة بإيده) → مفيش تزويد ومفيش كلام.
   */
  private async provisionDomainUser(emp: Employee): Promise<DomainProvisionResult | null> {
    if (!this.domainSync) return null
    try {
      return await this.domainSync.provisionOnHire(emp.id)
    } catch (e) {
      // provisionOnHire بيلمّ كل حاجة جوّاه؛ دي شبكة تانية عشان إنشاء الموظف مايرجعش أبدًا
      this.logger.warn(`تعذر تزويد حساب دخول للموظف ${emp.id}: ${(e as Error).message}`)
      return null
    }
  }

  // ربط البصمات اليتيمة بكود الموظف/رقم بصمته بأثر رجعي — أفضل جهد: فشله لا
  // يُفشل حفظ الموظف (البصمات تبقى ظاهرة في لوحة «أكواد غير مربوطة»)
  private async relinkPunches(emp: Employee) {
    try {
      const r = await this.attendance.relinkUnmatchedPunches(emp)
      if (r.relinked > 0) {
        this.logger.log(`رُبطت ${r.relinked} بصمة سابقة بالموظف ${emp.id} (${r.days} يوم)`)
      }
    } catch (e) {
      this.logger.warn(`تعذر ربط البصمات السابقة بالموظف ${emp.id}: ${(e as Error).message}`)
    }
  }

  // CRP2W-B01 (مراجعة Codex P2W): أثر ملف الموظف على رصيد الإجازات (صفوف السنة الحالية، والرصيد الافتتاحي، واستحقاق السنوي) بيتكتب جوه
  // معاملة المنادي وتحت صف الموظف (نفس القفل اللي إعادة التعيين وباقي كتّاب الرصيد بياخدوه). في تعديل الملف المعاملة دي هي معاملة التعديل
  // نفسها (ماسكة قفل مالية الموظف اللي إعادة التعيين بتاخده الأول)، فالتعديل كله يا إما قبل إعادة تعيين يا إما بعدها: رصيد افتتاحي من
  // الخدمة القديمة مابيتكتبش على صف الفترة الجديدة بعد التجميد
  private async lockBalanceOwner(em: EntityManager, employeeId: number) {
    await em.query(`SELECT [id] FROM dbo.employees WITH (UPDLOCK, ROWLOCK) WHERE [id] = @0`, [employeeId])
  }

  // يطبّق الرصيد الافتتاحي المُرحّل كطبقة opening على رصيد السنوي للسنة الحالية
  // (يُستخدم عند التعيين وعند التعديل لموظف قائم انتقل من نظام سابق)
  private async openingBalanceIn(
    em: EntityManager,
    employeeId: number,
    days?: number,
    expiry?: string | null
  ) {
    if (!days || Number(days) <= 0) return
    await this.lockBalanceOwner(em, employeeId)
    await this.currentYearBalancesIn(em, employeeId)
    const period = String(new Date().getFullYear())
    const balances = em.getRepository(LeaveBalance)
    const annual = await balances.findOne({
      where: { employeeId, balanceType: 'annual', period },
    })
    if (annual) {
      // نفس الأيام والصلاحية = لا تغيير؛ والمستخدم من الطبقة يبقى (محدودًا بالأيام الجديدة)
      // بدل تصفيره، وإلا عادت أيام مستهلكة للرصيد وحُمّلت على الاستحقاق بعد انتهاء الطبقة
      const next = nextOpeningBalance(annual, Number(days), expiry)
      if (!next) return
      annual.openingDays = next.openingDays
      annual.openingTaken = next.openingTaken
      annual.openingExpiry = next.openingExpiry as any
      await balances.save(annual)
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
  private async annualEntitlementIn(em: EntityManager, employeeId: number, entitled: boolean) {
    await this.lockBalanceOwner(em, employeeId)
    const period = String(new Date().getFullYear())
    const balances = em.getRepository(LeaveBalance)
    const annual = await balances.findOne({
      where: { employeeId, balanceType: 'annual', period },
    })
    if (!annual) return
    annual.entitled = entitled ? await this.configAnnualEntitled() : 0
    await balances.save(annual)
  }

  // استحقاق الإجازة المرضية العام من الإعدادات (يوم/سنة) — افتراضياً 180
  private async configSickEntitled(): Promise<number> {
    return Number(
      (await this.config.findOne({ where: { key: 'leave.sick_entitled' } }))
        ?.value ?? '180'
    )
  }

  // ينشئ أرصدة السنة الحالية (سنوي/مرضي) إن لم توجد — يُستدعى عند التعيين.
  // الاستحقاقان من سياسة الإجازات — لا أرقام ثابتة في الكود
  private async currentYearBalancesIn(em: EntityManager, employeeId: number) {
    await this.lockBalanceOwner(em, employeeId)
    const period = String(new Date().getFullYear())
    const emp = await em.getRepository(Employee).findOne({ where: { id: employeeId } })
    // غير مستحق للسنوي → استحقاق 0 (لا يتراكم له رصيد)
    const annualEntitled =
      emp?.annualLeaveEntitled === false ? 0 : await this.configAnnualEntitled()
    const sickEntitled = await this.configSickEntitled()
    const balances = em.getRepository(LeaveBalance)
    for (const [balanceType, entitled] of [
      ['annual', annualEntitled],
      ['sick', sickEntitled],
    ] as const) {
      const existing = await balances.findOne({
        where: { employeeId, balanceType, period },
      })
      if (!existing) {
        await balances.save(
          balances.create({
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

  // الخطوة 13: حدود «يسري من راتب شهر» لأجر التعيين في نموذج الإنشاء (قراءة فقط، بلا بيانات موظف).
  async salaryStartContext(hireDate?: string) {
    const value = typeof hireDate === 'string' && hireDate.trim() ? hireDate.trim() : null
    if (value !== null && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException({ code: 'EMPLOYEE_SALARY_START_DATE_INVALID', message: 'تاريخ التعيين بصيغة YYYY-MM-DD' })
    }
    const cycleStartDay = await readSalaryCycleStartDay(this.employees.manager)
    return employeeSalaryStartContext({ cycleStartDay, today: localDateOf(new Date()), hireDate: value })
  }

  async salaryChangeContext(id: number, branchScope: BranchScope) {
    try {
      return await this.employees.manager.transaction('SERIALIZABLE', async em => {
        const rows = await em.query(`DECLARE @result int;
          EXEC @result = sys.sp_getapplock @Resource = @0, @LockMode = 'Shared',
            @LockOwner = 'Transaction', @LockTimeout = 10000;
          SELECT @result AS lockResult;`, [`hr:employee-finance:${id}`])
        if (!rows.length || Number(rows[0].lockResult) < 0) throw new ConflictException('توجد عملية مالية جارية للموظف؛ حاول مجددًا')
        const source = await readSalaryHistoryCurrent(em, id)
        if (!source || !inBranchScope(branchScope, source.employee.branchId)) throw new NotFoundException('الموظف غير موجود')
        const history = await readSalaryHistory(em, id)
        // قاعدة المالك: التغيير يسري من راتب شهر؛ الشاشة تعرض شهر المسير الجاري ودورته ولا تقبل شهرًا لاحقًا.
        const cycleStartDay = await readSalaryCycleStartDay(em)
        const currentPayrollPeriod = payrollPeriodOfDate(localDateOf(new Date()), cycleStartDay)
        return { employeeId: id, current: source.current, historyRevision: history.revision,
          currentSourceHash: source.currentSourceHash, cycleStartDay, currentPayrollPeriod,
          currentPayrollPeriodBounds: payrollPeriodBounds(currentPayrollPeriod, cycleStartDay),
          historyContract: history.version ? (history.version.contractVersion ? 'MONTHLY' : 'DAILY') : 'NONE' }
      })
    } catch (error) {
      if (salaryHistorySchemaMissing(error)) throw new ConflictException({ code: 'SALARY_HISTORY_SCHEMA_MISSING',
        message: 'ترحيل سجل الأجر المؤرخ غير مطبق على قاعدة البيانات الحالية' })
      throw error
    }
  }

  // audit (اختياري — التحديث الجماعي من ملف): سبب سجل التغييرات وحقول إضافية تتسجل في نفس المعاملة
  async update(id: number, dto: UpdateEmployeeDto, branchScope: BranchScope, actorId?: number,
    audit?: { reason: string; fields?: ReadonlyArray<keyof Employee>; source?: 'PROFILE' | 'EXCEL' }) {
    const emp = await this.findOne(id, branchScope)
    // العملة تبع الفرع (قرار المالك 30 سبتمبر): العملة المبعوتة بتتجاهل. التعديل العادي مابيعيدش كتابة عملة الملف (جزء من الأجر
    // الموثق)، والنقل لفرع عملته مختلفة بيغيّرها تحت، وتغيير الأجر بيتسجل بعملة الفرع
    delete (dto as { currency?: unknown }).currency
    // الحالة المحفوظة — المعروضة قد تكون «موقوف» مشتقة من فترة إيقاف مؤرخة
    const storedStatus = (emp as Employee & { storedStatus?: Employee['status'] }).storedStatus ?? emp.status
    // حساب الفروع ينقل الموظف بين فروعه بس — مش لفرع برّه نطاقه
    if (dto.branchId !== undefined && !inBranchScope(branchScope, dto.branchId)) {
      throw new ForbiddenException(`لا يمكنك نقل الموظف خارج نطاق ${scopeWord(branchScope)}`)
    }
    if (dto.status !== undefined && !['active', 'probation', 'suspended'].includes(dto.status)) {
      throw new BadRequestException('إنهاء الخدمة والأرشفة لهما مسارات مستقلة')
    }
    // الإيقاف بقى مؤرخًا (من/إلى/سبب): «موقوف» المعروضة ترجع كما هي = بلا تغيير، والإيقاف الجديد له مساره
    if (dto.status === 'suspended' && storedStatus !== 'suspended') {
      if (emp.status !== 'suspended') throw new BadRequestException('الإيقاف عن العمل يتسجل من «إيقاف مؤقت» بتاريخ من وإلى وسبب')
      delete dto.status
    }
    if (dto.status !== undefined && dto.status !== storedStatus &&
        ['archived', 'terminated', 'notice_period'].includes(storedStatus)) {
      throw new BadRequestException('استخدم مسار إعادة التفعيل أو إلغاء إنهاء الخدمة لتغيير هذه الحالة')
    }
    for (const field of ['branchId', 'employeeCode', 'fullName', 'status', 'basicSalary', 'isActive']) {
      if ((dto as any)[field] === null) throw new BadRequestException('لا يجوز مسح الحقل ' + field)
    }
    // الحقول الإجبارية: تُفحص في التعديل لما تتبعت بس — ملف قديم ناقص يحفظ باقي حقوله
    for (const [field, message] of Object.entries(REQUIRED_ON_EDIT)) {
      const value = (dto as Record<string, unknown>)[field]
      if (value === null || (typeof value === 'string' && !value.trim())) throw new BadRequestException(message)
    }
    // رقم الهوية / الجواز (قرار المالك 28 سبتمبر): أي صيغة؛ مسح واحد مسموح لو التاني فاضل بعد الحفظ ومسح الاتنين مرفوض،
    // وملف قديم من غير الاتنين يحفظ باقي حقوله. الشكل للرقم اللي اتغير بس — نفس القاعدة المشتركة للشاشة والملف
    normalizeIdentityFields(dto)
    const identityIssue = employeeIdentityIssues({
      nationalId: dto.nationalId !== undefined ? dto.nationalId : emp.nationalId,
      passportNo: dto.passportNo !== undefined ? dto.passportNo : emp.passportNo,
    }, { mode: 'edit', initial: emp })[0]
    if (identityIssue) throw new BadRequestException(identityIssue.message)
    this.assertIdentity({
      fullName: dto.fullName !== undefined && dto.fullName !== emp.fullName ? dto.fullName : null,
      birthDate: dto.birthDate !== undefined && dto.birthDate !== String(emp.birthDate ?? '').slice(0, 10) ? dto.birthDate : null,
    })
    await this.assertUnique({ ...dto, excludeId: id }, branchScope, emp)
    // كود الموظف لا يُعدّل من أحد
    delete (dto as { employeeCode?: unknown }).employeeCode
    // طريقة الصرف على الحالة بعد الحفظ — تُفحص لما التعديل يمسّها؛ ملف قديم ناقص البنك يحفظ باقي حقوله
    if (dto.payMethod !== undefined || dto.bankTransferAmount !== undefined || dto.bankName !== undefined || dto.iban !== undefined) {
      const pick = <K extends 'payMethod' | 'bankTransferAmount' | 'bankName' | 'iban'>(key: K) => dto[key] !== undefined ? dto[key] : emp[key]
      const payIssue = employeePayMethodIssue({ payMethod: pick('payMethod'), bankTransferAmount: pick('bankTransferAmount'),
        bankName: pick('bankName'), iban: pick('iban') }, emp)
      if (payIssue) throw new BadRequestException(payIssue)
      if ((pick('payMethod') ?? 'transfer') !== 'mixed' && (emp.bankTransferAmount != null || dto.bankTransferAmount != null)) dto.bankTransferAmount = null
    }
    // B1.7 (D08 / Q-002 الخيار ج، إعداد مقفول): تغيير الآيبان أو البنك بطلب «تغيير حساب بنكي» بس (HR ثم المالية) — التعديل وExcel مايغيّروهمش
    if (BANK_SECURE_FIELDS.some(field => dto[field] !== undefined && String(dto[field] ?? '').trim() !== String(emp[field] ?? '').trim())
      && await onePersonControlEnabled(this.employees.manager, 'bankSecurePathAlways')) {
      throw new BadRequestException('تغيير الآيبان أو البنك بقى بطلب «تغيير حساب بنكي» بس (المسار الأمني: الموارد البشرية ثم المالية) — اعمل الطلب للموظف')
    }
    this.assertContractDates({
      contractStart: dto.contractStart !== undefined ? dto.contractStart : emp.contractStart,
      contractEnd: dto.contractEnd !== undefined ? dto.contractEnd : emp.contractEnd,
    })
    // تُراجَع مع كل تعديل يمسّ الاستحقاق أو تاريخ التعيين — تأخير تاريخ التعيين وحده
    // كان يترك استحقاقاً أقدم محفوظاً فيُدفع للموظف قبل مباشرته
    if (dto.salaryEntitlementStart !== undefined || dto.actualStartDate !== undefined || dto.joinDate !== undefined) {
      this.assertSalaryEntitlementStart(
        dto.salaryEntitlementStart !== undefined ? dto.salaryEntitlementStart : emp.salaryEntitlementStart,
        (dto.actualStartDate !== undefined ? dto.actualStartDate : emp.actualStartDate) ||
        (dto.joinDate !== undefined ? dto.joinDate : emp.joinDate))
    }
    await this.assertRelations({
      branchId: dto.branchId ?? emp.branchId,
      departmentId: dto.departmentId !== undefined ? dto.departmentId : emp.departmentId,
      teamId: dto.teamId !== undefined ? dto.teamId : emp.teamId,
      managerEmployeeId: dto.managerEmployeeId !== undefined ? dto.managerEmployeeId : emp.managerEmployeeId,
      gradeId: dto.gradeId,
      currentGradeId: emp.gradeId ?? null,
    })
    // الموظف لا يكون مدير نفسه
    if (dto.managerEmployeeId === id) {
      throw new BadRequestException('الموظف لا يكون مديراً مباشراً لنفسه')
    }
    // أنواع مرفقات الملف من كتالوج أنواع المستندات (لا نص حر) — قبل أي حفظ
    await assertDocTypes(this.docs.manager, (dto.documentRefs ?? []).map((r) => r?.docType))
    // openingBalance* و contractFileRef و documentRefs حقول حمولة فقط — ليست أعمدة موظف
    const {
      openingBalanceDays,
      openingBalanceExpiry,
      contractFileRef,
      documentRefs,
      ...empDto
    } = dto as UpdateEmployeeDto & {
      openingBalanceDays?: number
      openingBalanceExpiry?: string | null
    }
    const prevCodes = emp.fingerprintCode ?? ''
    const { flexOverrideMode, attendanceEffectiveFrom, attendanceChangeReason, salaryChange, calendarChange, gosiFirstRegisteredAt: gosiDateSent, ...employeeFields } = empDto
    // B1.5: undefined = ماتتغيرش؛ بيتكتب بـSQL صريح جوه المعاملة (العمود برّه الكيان) ولو اتغير بس
    const gosiFirstRegisteredAt = normalizeGosiFirstRegistered(gosiDateSent, localDateOf(new Date()))
    const legacySalaryKeys = [...SALARY_HISTORY_MONEY_KEYS, 'currency'] as const
    const legacySalary = Object.fromEntries(legacySalaryKeys.filter(key => employeeFields[key] !== undefined)
      .map(key => [key, employeeFields[key]]))
    for (const key of legacySalaryKeys) delete employeeFields[key]
    if (salaryChange !== undefined && (salaryChange === null || Object.keys(legacySalary).length)) {
      throw new BadRequestException('أرسل تغيير الأجر وبيانات سريانه في salaryChange فقط، دون تكرار مكونات الأجر خارجها')
    }
    const attendanceTouched = dto.workScheduleId !== undefined || flexOverrideMode !== undefined || attendanceEffectiveFrom !== undefined
    const saved = await this.employees.manager.transaction(async em => {
      await lockAttendanceRuleMutation(em, [id])
      const fresh = await em.findOneBy(Employee, { id })
      if (!fresh || !inBranchScope(branchScope, fresh.branchId)) throw new NotFoundException('الموظف غير موجود')
      // التفرد جوه المعاملة تحت القفل لو التعديل بيلمس بصمة أو بريد أو هوية أو جواز (CR17-B01)؛ «ماتغيرش» على المحفوظ دلوقتي
      if ([dto.fingerprintCode, dto.email, dto.nationalId, dto.passportNo].some(value => value !== undefined)) {
        await this.lockEmployeeIdentities(em)
        // «واحد منهم على الأقل» وشكل الرقم المتغير على المحفوظ دلوقتي تحت القفل (مراجعة Codex الجولة 18، CR18-B01): تعديلين
        // متزامنين واحد بيمسح الهوية والتاني الجواز كانوا بيعدّوا الاتنين لأن الفحص فوق كان على الملف قبل المعاملة. القراءة بعد
        // القفل الحصري، فالتاني بيشوف اللي الأول حفظه
        const locked = await em.findOne(Employee, { where: { id }, select: { id: true, nationalId: true, passportNo: true, fingerprintCode: true, email: true } })
        const lockedIdentityIssue = employeeIdentityIssues({
          nationalId: dto.nationalId !== undefined ? dto.nationalId : locked?.nationalId,
          passportNo: dto.passportNo !== undefined ? dto.passportNo : locked?.passportNo,
        }, { mode: 'edit', initial: locked ?? fresh })[0]
        if (lockedIdentityIssue) throw new BadRequestException(lockedIdentityIssue.message)
        await this.assertUnique({ ...dto, excludeId: id }, branchScope, locked ?? fresh, em)
      }
      const beforeChange = { ...fresh }
      const oldStatus = fresh.status
      const branchChanged = dto.branchId !== undefined && dto.branchId !== fresh.branchId
      const orgTouched = branchChanged || calendarChange !== undefined
      // فحص فرع جدول العمل يكون على الفرع بعد الحفظ؛ fresh نفسه (مش نسخة) لأن حفظ الدوام بيحدّث workScheduleId عليه،
      // وfresh مش بيتحفظ غير عبر updates تحت
      if (branchChanged) fresh.branchId = dto.branchId!
      if (orgTouched && calendarChange?.effectiveFrom && calendarChange.effectiveFrom > attendanceRuleToday()) {
        throw new BadRequestException('النقل المستقبلي يُسجل بطلب نقل؛ تعديل فرع الملف يسري اليوم أو في تاريخ سابق مفتوح')
      }
      const orgBefore = orgTouched ? await beginCalendarChange(em, 'EMPLOYEE', id, calendarChange, actorId!) : null
      if (Object.keys(legacySalary).length) {
        const source = await readSalaryHistoryCurrent(em, id)
        for (const [key, value] of Object.entries(legacySalary)) {
          const normalized = key === 'currency' || value === null ? value : salaryHistoryMoney(String(value), true)
          if (!source || normalized !== source.current[key as keyof typeof source.current]) throw new BadRequestException({
            code: 'SALARY_CHANGE_EFFECTIVE_DATE_REQUIRED',
            message: 'تعديل الأجر يحتاج «يسري من راتب شهر» والسبب ومرجع القرار؛ حدّث الشاشة وسجّل التغيير من البيانات المالية',
          })
        }
      }
      if (attendanceTouched) {
        const current = await resolveAttendanceRule(em, 'EMPLOYEE', id, attendanceEffectiveFrom ?? attendanceRuleToday(), employeeAttendanceFallback(fresh))
        const changes = (dto.workScheduleId !== undefined && (dto.workScheduleId ?? null) !== current.snapshot.workScheduleId)
          || (flexOverrideMode !== undefined && flexOverrideMode !== current.snapshot.flexOverrideMode)
        if (changes || (attendanceEffectiveFrom !== undefined && current.legacyBaseline)) {
          const meta = attendanceRuleChange({ effectiveFrom: attendanceEffectiveFrom, changeReason: attendanceChangeReason })
          await saveEmployeeAttendanceRule(em, fresh, { workScheduleId: dto.workScheduleId, flexOverrideMode, ...meta, actorUserId: actorId })
        }
      }
      // نقل لفرع تاني والجدول الساري (أو المؤرخ بعد النقل) خاص بفرع غيره → يترفض لحد ما يتختار جدول للفرع الجديد أو لكل الشركة
      if (branchChanged) await assertEmployeeSchedulesFitBranch(em, fresh, dto.branchId!, calendarChange?.effectiveFrom ?? attendanceRuleToday())
      // B1.7 (Q-009 الخيار ج، إعداد مقفول): النقل لفرع تاني من التعديل أو Excel بنفس فحوص طلب النقل — العهدة المفتوحة والمدير المباشر.
      // مين يقدر ينقل زي ما هو (نطاق الفروع)
      if (branchChanged && await onePersonControlEnabled(em, 'transferChecks')) {
        const custody = await em.getRepository(CustodyAssignment).count({ where: { employeeId: id, status: In(openCustodyStatuses) } })
        if (custody) throw new BadRequestException(`على الموظف ${custody} عهدة مفتوحة — لازم ترجع أو تتنقل قبل نقله لفرع تاني`)
        const managerId = dto.managerEmployeeId !== undefined ? dto.managerEmployeeId : fresh.managerEmployeeId
        const manager = managerId ? await em.getRepository(Employee).findOne({ where: { id: managerId }, select: { id: true, branchId: true } }) : null
        if (manager && manager.branchId !== dto.branchId) throw new BadRequestException('المدير المباشر في فرع تاني — اختار مدير من الفرع الجديد أو شيل المدير قبل النقل')
      }
      // العملة تبع الفرع (قرار المالك 30 سبتمبر): تغيير الأجر بيتسجل دايمًا بعملة فرع الموظف بعد الحفظ (العملة المبعوتة بتتجاهل)، والنقل
      // لفرع عملته غير عملة الفرع القديم بيغيّر عملة الملف (تحت، بعد تغيير الأجر لو معاه). النقل بين فرعين بنفس العملة مابيلمسهاش
      let branchCurrencyChange: string | null = null
      if (branchChanged) {
        const before = await readBranchCurrency(em, beforeChange.branchId), after = await readBranchCurrency(em, dto.branchId)
        if (before !== after && beforeChange.currency !== after) branchCurrencyChange = after
      }
      if (salaryChange) salaryChange.salary.currency = await readBranchCurrency(em, fresh.branchId)
      // workScheduleId يُحفظ عبر نسخته أعلاه، وبقية الحقول المرسلة وحدها تُدمج في
      // الصف المعاد قراءته داخل القفل كي لا تدهس إسنادًا أو بيانات حفظت بالتزامن.
      const { workScheduleId: _workScheduleId, ...otherFields } = employeeFields
      const updates = Object.fromEntries(Object.entries(otherFields).filter(([, value]) => value !== undefined))
      if (fresh.workScheduleId !== beforeChange.workScheduleId) updates.workScheduleId = fresh.workScheduleId
      if (dto.status !== undefined) updates.isActive = dto.status !== 'suspended'
      // لا نعيد حفظ المبالغ المقروءة كـNumber عند تعديل الهاتف أو القسم؛ الكاتب المالي
      // وحده يكتب أعمدة الأجر من نصوص SQL الدقيقة داخل نفس المعاملة.
      if (Object.keys(updates).length) await em.update(Employee, { id }, updates)
      if (orgBefore) await finishCalendarChange(em, orgBefore, calendarChange, actorId!)
      if (salaryChange) {
        if (!Number.isInteger(actorId) || !actorId) throw new BadRequestException('هوية المستخدم المنفذ مطلوبة لتغيير الأجر')
        await applyEmployeeSalaryChange(em, { ...salaryChange, employeeId: id, actorUserId: actorId })
      }
      // عملة الفرع الجديد لو تغيير الأجر (لو كان معاه) ماكتبهاش: تسمية بس، والمبالغ زي ما هي من غير تحويل — وسجل الأجر القديم بعملته
      // بيتراجع ويتثبّت بالعملة الجديدة قبل أي تغيير أجر تاني (رسالة تغيير الأجر بتقول كده)
      if (branchCurrencyChange) {
        const stored = await em.findOne(Employee, { where: { id }, select: { id: true, currency: true } })
        if (stored && stored.currency !== branchCurrencyChange) {
          await em.update(Employee, { id }, { currency: branchCurrencyChange })
          await recordEmployeeChange(em, { employeeId: id, fieldName: 'currency', oldValue: stored.currency, newValue: branchCurrencyChange,
            changedByUserId: actorId, reason: `${audit?.reason ?? 'تعديل من ملف الموظف'} — عملة الفرع الجديد (تسمية بس من غير تحويل مبالغ)` })
        }
      }
      if (gosiFirstRegisteredAt !== undefined) {
        const gosi = await saveGosiFirstRegistered(em, id, gosiFirstRegisteredAt)
        if (gosi.changed) await recordEmployeeChange(em, { employeeId: id, fieldName: 'gosiFirstRegisteredAt', oldValue: gosi.before, newValue: gosiFirstRegisteredAt,
          changedByUserId: actorId, reason: audit?.reason ?? 'تعديل من ملف الموظف' })
      }
      const result = await em.findOneByOrFail(Employee, { id })
      // B1.7: سجل تغييرات الصرف (ترحيل 081) — المصدر الملف أو Excel، واللي غيّر
      await recordEmployeePaymentChanges(em, { employeeId: id, before: beforeChange, after: result, actorUserId: actorId, source: audit?.source ?? 'PROFILE' })
      await linkEmployeeFiles(em, id, [contractFileRef, ...(documentRefs ?? []).map(r => r.fileRef),
        dto.photoFileId ? `file:${dto.photoFileId}` : undefined], actorId)
      await this.saveContractDocument(id, {
        contractFileRef, contractNumber: dto.contractNumber ?? result.contractNumber,
        contractStart: dto.contractStart ?? result.contractStart, contractEnd: dto.contractEnd ?? result.contractEnd,
      }, em)
      await this.saveDocuments(id, documentRefs, em)
      const trackedFields = ['teamId', 'branchId', 'departmentId', 'managerEmployeeId', 'jobTitle',
        'iban', 'bankName', 'bankBranch', 'payMethod', 'bankTransferAmount', 'salaryCycle', 'gosiBaseSalary', 'workType',
        'contractType', 'contractStart', 'contractEnd', 'contractNumber'] as const
      for (const fieldName of new Set<keyof Employee>([...trackedFields, ...(audit?.fields ?? [])])) {
        if ((beforeChange[fieldName] ?? null) !== (result[fieldName] ?? null)) await recordEmployeeChange(em, {
          employeeId: id, fieldName, oldValue: beforeChange[fieldName], newValue: result[fieldName],
          changedByUserId: actorId, reason: audit?.reason ?? 'تعديل من ملف الموظف',
        })
      }
      if (result.status !== oldStatus) {
        await recordEmployeeChange(em, { employeeId: id, fieldName: 'status', oldValue: oldStatus,
          newValue: result.status, changedByUserId: actorId, reason: 'تغيير الحالة من ملف الموظف' })
      }
      if (result.status !== oldStatus || result.branchId !== beforeChange.branchId) {
        await em.update(User, { employeeId: id }, { ...(result.status !== oldStatus ? { isActive: result.isActive } : {}),
          ...(result.branchId !== beforeChange.branchId ? { branchId: result.branchId } : {}), tokenVersion: () => 'tokenVersion + 1' })
      }
      // CRP2W-B01: أثر التعديل على رصيد الإجازات جوه المعاملة نفسها (كان بعدها، فإعادة تعيين كانت بتعدّي بين الاتنين):
      // تبديل استحقاق السنوي → مزامنة رصيد السنوي (0 أو القيمة العامة)
      if (dto.annualLeaveEntitled !== undefined) await this.annualEntitlementIn(em, id, dto.annualLeaveEntitled)
      // تعديل رصيد افتتاحي مُرحّل لموظف قائم (انتقل من نظام سابق) — لا يُطبَّق مع «لا يستحق»
      if (dto.annualLeaveEntitled !== false) await this.openingBalanceIn(em, id, openingBalanceDays, openingBalanceExpiry)
      return result
    })
    // تغيّر رقم البصمة → بصماته اليتيمة السابقة بالرقم الجديد تُربط به
    if ((saved.fingerprintCode ?? '') !== prevCodes) {
      await this.relinkPunches(saved)
    }
    return this.attendanceView(saved)
  }

  // الأرشفة بدل الحذف — التاريخ الوظيفي لا يُمسح (بسبب موثّق)
  async archive(id: number, branchScope: BranchScope, reason?: string, actorId?: number) {
    // حد عمود archiveReason (300) قبل أي قراءة أو كتابة — كان 450 فيفشل الحفظ بـ500
    assertArchiveReason(reason)
    await this.findOne(id, branchScope)
    return this.employees.manager.transaction(async em => {
      const emp = await em.findOneOrFail(Employee, { where: { id }, lock: { mode: 'pessimistic_write' } })
      if (emp.status === 'archived') throw new BadRequestException('الموظف مؤرشف بالفعل')
      if (await em.findOneBy(OffboardingCase, { employeeId: id, status: In(OPEN_CASE_STATUSES) })) {
        throw new BadRequestException('أكمل أو ألغ ملف إنهاء الخدمة قبل الأرشفة')
      }
      const oldStatus = emp.status
      emp.status = 'archived'
      emp.isActive = false
      emp.archivedAt = new Date()
      emp.archiveReason = reason?.trim() || 'أرشفة يدوية'
      const saved = await em.save(Employee, emp)
      await em.update(User, { employeeId: id }, { isActive: false, tokenVersion: () => 'tokenVersion + 1' })
      await recordEmployeeChange(em, { employeeId: id, fieldName: 'status', oldValue: oldStatus, newValue: 'archived',
        changedByUserId: actorId, reason: emp.archiveReason })
      return saved
    })
  }

  async reactivate(id: number, branchScope: BranchScope, actorId?: number, reason?: unknown) {
    await this.findOne(id, branchScope)
    return this.employees.manager.transaction(async em => {
      const emp = await em.findOneOrFail(Employee, { where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!['archived', 'terminated'].includes(emp.status)) throw new BadRequestException('الموظف ليس مؤرشفاً ولا منتهي الخدمة')
      // B2.10a: موظف ملفه اتصفّى (مكافأته وبدل رصيده اتحسبوا) بيرجع بنفس تاريخ تعيينه — لازم سبب مكتوب، وبيتسجّل في سجله.
      // الحكم وصف الموظف مقفول، فتصفية بتتقفل في نفس اللحظة مابتعدّيش من غير سبب
      const note = typeof reason === 'string' ? reason.trim() : ''
      if (note.length > 500) throw new BadRequestException('سبب الإرجاع بحد أقصى 500 حرف')
      const settled = await em.findOne(OffboardingCase, { where: { employeeId: id, status: In(['SETTLED', 'CLOSED']) }, select: { id: true } })
      if (settled && note.length < 5) throw new BadRequestException({ code: SETTLED_RETURN_REASON_REQUIRED, message: SETTLED_RETURN_MESSAGE })
      const oldStatus = emp.status
      emp.status = 'active'
      emp.isActive = true
      emp.archivedAt = null as any
      emp.archiveReason = null as any
      await em.save(Employee, emp)
      await em.update(User, { employeeId: id }, { isActive: true, tokenVersion: () => 'tokenVersion + 1' })
      const base = oldStatus === 'terminated' ? 'عودة على رأس العمل بعد انتهاء خدمة' : 'إعادة تفعيل من الأرشيف'
      await recordEmployeeChange(em, { employeeId: id, fieldName: 'status', oldValue: oldStatus, newValue: 'active',
        changedByUserId: actorId, reason: reasonWithLabel(base, note) })
      return emp
    })
  }

  // ===== B2.10: فترات الخدمة وإعادة التعيين =====
  // الفترة المفتوحة هي صف الموظف (تاريخ تعيينه)، والجدول فيه الفترات المقفولة. القراءة لملف الموظف ولنافذة «إعادة تعيين»:
  // حالة الإتاحة هنا استشارية — التنفيذ بيعيد الحكم جوه معاملته
  async employmentPeriods(id: number, branchScope: BranchScope) {
    const emp = await this.findOne(id, branchScope)
    const em = this.employees.manager
    const day = (value: unknown) => value == null ? null : String(value).slice(0, 10)
    if (!(await employmentPeriodsReady(em))) return { ready: false, periods: [], current: { periodNo: 1, startDate: day(emp.joinDate) }, rehire: null }
    const periods = await em.find(EmploymentPeriod, { where: { employeeId: id }, order: { periodNo: 'ASC' } })
    const status = (emp as Employee & { storedStatus?: Employee['status'] }).storedStatus ?? emp.status
    const gate = ['terminated', 'archived'].includes(status)
      ? await rehireGate(em, { id, status, joinDate: emp.joinDate, createdAt: emp.createdAt }, localDateOf(new Date()), branchScope) : null
    return {
      ready: true,
      periods: periods.map(period => ({ periodNo: period.periodNo, startDate: day(period.startDate), endDate: day(period.endDate), exitReason: period.exitReason ?? null,
        rehireReason: period.rehireReason, rehiredAt: period.createdAt })),
      current: { periodNo: (periods[periods.length - 1]?.periodNo ?? 0) + 1, startDate: day(emp.joinDate) },
      rehire: gate ? { available: !gate.blocked, code: gate.blocked?.code ?? null, blocked: gate.blocked?.message ?? null,
        lastWorkingDay: gate.lastWorkingDay, minStartDate: gate.minStartDate, maxStartDate: gate.maxStartDate } : null,
    }
  }

  // إعادة تعيين موظف خدمته انتهت بملف إنهاء مقفول ومتصفّي: فترة خدمة جديدة من تاريخ مباشرة جديد، بنفس الملف والكود.
  // نهاية الخدمة ورصيد الإجازات والمسير والحضور بيقروا تاريخ التعيين، فتحريكه هو اللي بيخلّيهم يبدأوا من الفترة الجديدة؛
  // والفترة القديمة محفوظة في employment_periods، وصفوف رصيدها متجمّدة بمفتاحها
  async rehire(id: number, dto: { startDate?: unknown; reason?: unknown } | undefined, branchScope: BranchScope, actorId: number) {
    const startDate = isoDay(dto?.startDate)
    if (!startDate) throw new BadRequestException('تاريخ المباشرة الجديد مطلوب (يوم صحيح بصيغة YYYY-MM-DD)')
    const reason = typeof dto?.reason === 'string' ? dto.reason.trim() : ''
    if (reason.length < REHIRE_REASON_MIN || reason.length > REHIRE_REASON_MAX) {
      throw new BadRequestException(`سبب إعادة التعيين مطلوب (من ${REHIRE_REASON_MIN} لـ${REHIRE_REASON_MAX} حرف)`)
    }
    const saved = await this.employees.manager.transaction(async em => {
      if (!(await employmentPeriodsReady(em))) throw new ConflictException({ code: 'EMPLOYMENT_PERIODS_MIGRATION_MISSING', message: EMPLOYMENT_PERIODS_MIGRATION_MISSING })
      // القفل المالي المشترك مع حساب المسير والتصفية قبل قفل صف الموظف (نفس ترتيب الإيقاف والأجر): الحكم تحت على حالة مثبتة.
      // النطاق بيتحكم على الصف المقفول نفسه (برّه النطاق = «غير موجود» زي الموظف اللي مش موجود)
      await lockPayrollEmployees(em, [id])
      const emp = await this.scopedEmployee(em, id, branchScope, true)
      const gate = await rehireGate(em, emp, localDateOf(new Date()), branchScope)
      const issue = gate.blocked ?? rehireStartIssue(startDate, gate)
      if (issue) throw new BadRequestException(issue)
      await em.insert(EmploymentPeriod, { employeeId: id, periodNo: gate.periodNo, startDate: gate.currentStart!, endDate: gate.lastWorkingDay!,
        exitReason: gate.exitReason, offboardingCaseId: gate.caseId, rehireReason: reason, rehiredByUserId: actorId, createdAt: new Date() })
      // رصيد الفترة المقفولة (وسجل تعديلاته) بيتجمّد بمفتاح الفترة: مأخوذها ومُرحّلها وتعديلاتها مايدخلوش في رصيد الفترة الجديدة
      for (const table of ['leave_balances', 'leave_balance_adjustments']) {
        await em.query(`UPDATE dbo.[${table}] SET [period] = CONCAT(@1, [period]) WHERE [employeeId] = @0 AND [period] NOT LIKE N'P%:%'`, [id, frozenBalanceKey(gate.periodNo, '')])
      }
      const next = { joinDate: startDate, actualStartDate: null, salaryEntitlementStart: null, probationEndDate: null,
        contractStart: null, contractEnd: null, contractNumber: null, contractDurationMonths: null } as const
      const note = reasonWithLabel(`إعادة تعيين — فترة خدمة رقم ${gate.periodNo + 1} من ${startDate} (السابقة ${gate.currentStart} → ${gate.lastWorkingDay})`, reason)
      for (const fieldName of Object.keys(next) as Array<keyof typeof next>) {
        const stored = emp[fieldName] as unknown
        const oldValue = stored == null ? null : fieldName === 'contractNumber' || fieldName === 'contractDurationMonths' ? stored : String(stored).slice(0, 10)
        if (oldValue !== next[fieldName]) await recordEmployeeChange(em, { employeeId: id, fieldName, oldValue, newValue: next[fieldName], changedByUserId: actorId, reason: note })
      }
      await recordEmployeeChange(em, { employeeId: id, fieldName: 'status', oldValue: emp.status, newValue: 'active', changedByUserId: actorId, reason: note })
      await em.update(Employee, { id }, { ...(next as unknown as Partial<Employee>), status: 'active', isActive: true, archivedAt: null as any, archiveReason: null as any })
      // حساب الدخول بيرجع يشتغل (والجلسات القديمة بتتلغى) — بسطر تدقيق بالحالة قبل وبعد
      const accounts: Array<{ id: number; email: string | null; wasActive: boolean | number | null }> = await em.query(
        `DECLARE @changed TABLE ([id] int NOT NULL, [wasActive] bit NULL)
         UPDATE [users] SET [isActive] = 1, [tokenVersion] = COALESCE([tokenVersion], 0) + 1
           OUTPUT inserted.[id], deleted.[isActive] INTO @changed WHERE [employeeId] = @0
         SELECT c.[id], c.[wasActive], u.[email] FROM @changed c INNER JOIN [users] u ON u.[id] = c.[id] ORDER BY c.[id]`, [id])
      for (const account of accounts) {
        if (account.wasActive === true || account.wasActive === 1) continue
        await recordAudit(em, { category: 'PERMISSIONS', action: 'USER_UPDATED', entityType: 'user', entityId: account.id, branchId: emp.branchId,
          actorUserId: actorId, summary: `تعديل الحساب ${account.email ?? ''}`, before: { isActive: false }, after: { isActive: true } })
      }
      // «تم التعيين» في نفس المعاملة (مرة واحدة لكل فترة) — نفس حدث إنشاء الموظف
      await recordOutboxEvent(em, { type: 'EMPLOYEE_HIRED', entityType: 'employee', entityId: id, key: `employee-rehired:${id}:${gate.periodNo + 1}`,
        payload: { employeeId: id, branchId: emp.branchId ?? null, joinDate: startDate, rehire: true } })
      return em.findOneByOrFail(Employee, { id })
    })
    // رصيد السنة الحالية للفترة الجديدة — زي الموظف الجديد
    await this.employees.manager.transaction(em => this.currentYearBalancesIn(em, id))
    return saved
  }

  // ===== الإيقاف عن العمل لفترة (قرار المالك 16 سبتمبر) =====
  // من/إلى/سبب. الحالة «موقوف» مشتقة من التواريخ، فلا تُكتب على employees.status ولا تقفل isActive؛
  // أيام الإيقاف ليست غيابًا (تجسيد الغياب يتخطاها) وتُخصم في المسير يومًا بيوم مثل الإجازة بدون راتب.

  private async assertSuspensionSchema() {
    if (!(await suspensionTableReady(this.employees.manager))) {
      throw new ConflictException({ code: 'EMPLOYEE_SUSPENSION_SCHEMA_MISSING', message: 'ترحيل الإيقاف عن العمل (20260916_044) غير مطبق على قاعدة البيانات بعد' })
    }
  }

  private async scopedEmployee(em: EntityManager, id: number, branchScope: BranchScope, lock = false) {
    const employee = await em.findOne(Employee, { where: { id }, ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}) })
    if (!employee || !inBranchScope(branchScope, employee.branchId)) throw new NotFoundException('الموظف غير موجود')
    return employee
  }

  // الإيقاف مايتسجلش فوق إجازة معتمدة أو طلب إجازة لسه في المسار (الإجازة بدون راتب كمان — أبسط وأوضح)
  private async assertNoLeaveOverlap(em: EntityManager, employeeId: number, fromDate: string, toDate: string) {
    const approved = await em.find(Leave, { where: { employeeId, status: 'APPROVED', fromDate: LessThanOrEqual(toDate), toDate: MoreThanOrEqual(fromDate) },
      order: { fromDate: 'ASC' } })
    const leave = overlappingLeave(approved, fromDate, toDate)
    if (leave) throw new ConflictException(SUSPENSION_LEAVE_OVERLAP_MESSAGE(leave, false))
    const live = await em.find(Request, { where: { requesterId: employeeId,
      status: In(['SUBMITTED', 'UNDER_REVIEW', 'RETURNED_FOR_INFO', 'APPROVED', 'IN_EXECUTION']) }, order: { id: 'ASC' } })
    const pending = overlappingLeave(live.filter(isLeaveRequest).flatMap(request => {
      try {
        const payload = JSON.parse(request.payload ?? '{}')
        // طلب إلغاء/تعديل إجازة (leaveId) مش إجازة جديدة
        return payload.leaveId == null && payload.fromDate && payload.toDate ? [{ fromDate: String(payload.fromDate), toDate: String(payload.toDate) }] : []
      } catch { return [] }
    }), fromDate, toDate)
    if (pending) throw new ConflictException(SUSPENSION_LEAVE_OVERLAP_MESSAGE(pending, true))
  }

  async listSuspensions(id: number, branchScope: BranchScope) {
    await this.scopedEmployee(this.employees.manager, id, branchScope)
    const today = localDateOf(new Date())
    return (await readEmployeeSuspensions(this.employees.manager, id, undefined, { includeCancelled: true })).map(row => suspensionView(row, today))
  }

  async createSuspension(id: number, dto: CreateEmployeeSuspensionDto, branchScope: BranchScope, actorId: number) {
    const issue = suspensionInputIssue(dto)
    if (issue) throw new BadRequestException(issue)
    await this.assertSuspensionSchema()
    const today = localDateOf(new Date())
    const saved = await this.employees.manager.transaction(async em => {
      // القفل المالي المشترك مع اعتماد المسير قبل قفل صف الموظف (نفس ترتيب الحضور والأجر)
      await lockPayrollEmployees(em, [id])
      const employee = await this.scopedEmployee(em, id, branchScope, true)
      if (!SUSPENDABLE_STATUSES.includes(employee.status)) {
        throw new BadRequestException('الإيقاف عن العمل لموظف على رأس العمل بس (مش منتهي الخدمة ولا مؤرشف ولا موقوف بالنظام القديم)')
      }
      const hireDate = String(employee.actualStartDate || employee.joinDate || '').slice(0, 10)
      if (hireDate && dto.fromDate < hireDate) throw new BadRequestException(`بداية الإيقاف قبل تاريخ بدء عمل الموظف (${hireDate})`)
      const existing = await em.find(EmployeeSuspension, { where: { employeeId: id, status: Not('CANCELLED') as any } })
      const overlap = overlappingSuspension(existing.map(row => ({ ...row, fromDate: String(row.fromDate).slice(0, 10), toDate: String(row.toDate).slice(0, 10) })), dto.fromDate, dto.toDate)
      if (overlap) throw new ConflictException(`يوجد إيقاف تاني متداخل من ${overlap.fromDate} إلى ${overlap.toDate}`)
      // فترة رواتب مقفولة (مسير معتمد أو مصروف) لا يُسجَّل عليها إيقاف، ولا تُمسح صفوف غيابها اللي اتخصمت
      await assertAttendanceRulePeriodOpen(em, [id], dto.fromDate, dto.toDate, SUSPENSION_CLOSED_PAYROLL_MESSAGE)
      // إجازة على نفس الأيام: الراتب يتخصم والرصيد يفضل مستهلك — HR يلغي الإجازة أو يقصّرها الأول
      await this.assertNoLeaveOverlap(em, id, dto.fromDate, dto.toDate)
      const row = await em.save(EmployeeSuspension, em.create(EmployeeSuspension, {
        employeeId: id, fromDate: dto.fromDate, toDate: dto.toDate, plannedToDate: dto.toDate, reason: dto.reason.trim(),
        status: 'ACTIVE', createdByUserId: actorId ?? null,
      }))
      // أيام فاتت اتسجلت غياب قبل الإيقاف: صف الغياب بلا بصمة تصنيف مؤقت يُشال (اليوم إيقاف مش غياب)
      const lastPast = dto.toDate < today ? dto.toDate : today
      if (dto.fromDate <= lastPast) {
        await em.delete(AttendanceDay, { employeeId: id, date: Between(dto.fromDate, lastPast), status: 'absent', checkIn: IsNull(), checkOut: IsNull() })
      }
      await recordEmployeeChange(em, { employeeId: id, fieldName: 'suspension', oldValue: null,
        newValue: `إيقاف عن العمل ${dto.fromDate} → ${dto.toDate}`, changedByUserId: actorId, reason: dto.reason.trim() })
      // تراكم المسير: أيام الإيقاف تتحسب من جديد (يوم إيقاف مش غياب ولا تأخير)
      await markPayrollRangeDirty(em, id, dto.fromDate, dto.toDate, 'تسجيل إيقاف عن العمل')
      return row
    })
    return suspensionView(saved, today)
  }

  // إنهاء بدري: يرجع للعمل من returnDate (الافتراضي النهارده). الرجوع في يوم البداية أو قبله = إلغاء
  async endSuspension(id: number, suspensionId: number, dto: EndEmployeeSuspensionDto, branchScope: BranchScope, actorId: number) {
    await this.assertSuspensionSchema()
    const today = localDateOf(new Date())
    const returnDate = dto.returnDate ?? today
    const reason = dto.reason?.trim() || null
    const { saved, freedFrom, freedTo } = await this.employees.manager.transaction(async em => {
      await lockPayrollEmployees(em, [id])
      await this.scopedEmployee(em, id, branchScope, true)
      const row = await em.findOne(EmployeeSuspension, { where: { id: suspensionId, employeeId: id } })
      if (!row) throw new NotFoundException('الإيقاف غير موجود')
      const period = { ...row, fromDate: String(row.fromDate).slice(0, 10), toDate: String(row.toDate).slice(0, 10) }
      const plan = suspensionEndPlan(period, returnDate, today)
      if (!plan.ok) throw new BadRequestException(plan.message)
      // الأيام اللي هترجع أيام عمل: لو داخل مسير معتمد أو مصروف اتخصمت خلاص — التعديل أو الإلغاء مرفوض (التصحيح بتسوية)
      const freed = suspensionFreedRange(period, plan, returnDate)
      await assertAttendanceRulePeriodOpen(em, [id], freed.from, freed.to, SUSPENSION_CLOSED_PAYROLL_MESSAGE)
      const oldTo = period.toDate
      row.status = plan.status
      row.toDate = plan.toDate
      row.endReason = reason
      row.endedAt = new Date()
      row.endedByUserId = actorId ?? null
      const result = await em.save(EmployeeSuspension, row)
      await recordEmployeeChange(em, { employeeId: id, fieldName: 'suspension', oldValue: `إيقاف عن العمل ${period.fromDate} → ${oldTo}`,
        newValue: plan.status === 'CANCELLED' ? 'إلغاء الإيقاف' : `إنهاء الإيقاف بدري — رجوع للعمل ${returnDate}`, changedByUserId: actorId,
        reason: reason ?? (plan.status === 'CANCELLED' ? 'إلغاء الإيقاف' : 'إنهاء الإيقاف قبل موعده') })
      // تراكم المسير: الأيام اللي رجعت أيام عمل تتحسب من جديد
      await markPayrollRangeDirty(em, id, freed.from, freed.to, 'إنهاء أو إلغاء إيقاف عن العمل')
      return { saved: result, freedFrom: freed.from, freedTo: freed.to }
    })
    // الأيام اللي رجعت أيام عمل وفاتت: تُجسَّد (بصمة = حضور، بلا بصمة = غياب) — أفضل جهد لا يُفشل الإنهاء
    const yesterday = addDays(today, -1)
    if (freedFrom <= yesterday) {
      try { await this.attendance.materializeAbsences(id, freedFrom, freedTo < yesterday ? freedTo : yesterday) }
      catch (error) { this.logger.warn(`تعذر تجسيد أيام ما بعد إنهاء إيقاف الموظف ${id}: ${(error as Error).message}`) }
    }
    return suspensionView(saved, today)
  }
}

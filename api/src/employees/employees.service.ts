import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Between, EntityManager, In, IsNull, LessThanOrEqual, MoreThanOrEqual, Not, Repository } from 'typeorm'
import { OffboardingCase } from '../offboarding/offboarding.entities'
import { OPEN_CASE_STATUSES } from '../offboarding/offboarding-open'
import { AttendanceService } from '../attendance/attendance.service'
import { beginCalendarChange, finishCalendarChange, readCalendarSource } from '../attendance/attendance-calendar-history'
import { assertAttendanceRulePeriodOpen, assertEmployeeSchedulesFitBranch, attendanceRuleChange, attendanceRuleToday, employeeAttendanceFallback, lockAttendanceRuleMutation,
  pickAttendanceRule, resolveAttendanceRule, saveEmployeeAttendanceRule } from '../attendance/attendance-rule-history'
import { lockPayrollEmployees } from '../payroll/payroll-settlement-boundary'
import { isLeaveRequest } from '../common/leave-contract'
import { AttendanceRuleVersion, EmployeeAttendanceRuleSnapshot } from '../attendance/attendance-rule.entities'
import { User } from '../auth/user.entity'
import { EmployeeDocument, Grade } from '../assets/assets.entities'
import { assertDocTypes } from '../assets/doc-types'
import { Branch } from '../org/entities/branch.entity'
import { Department } from '../org/entities/department.entity'
import { Team } from '../org/entities/team.entity'
import { EmployeeStatusHistory } from '../requests/entities/employment.entities'
import { recordEmployeeChange } from './employee-change-log'
import { assertArchiveReason, nextOpeningBalance } from './employee-input-rules'
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
import { arabicFullNameIssue, birthDateIssue, employeeRequiredIssues, nationalIdIssue, type EmployeeRequiredValues } from './employee-required-fields'
import { addDays, currentSuspension, displayEmployeeStatus, overlappingLeave, overlappingSuspension, SUSPENDABLE_STATUSES,
  SUSPENSION_CLOSED_PAYROLL_MESSAGE, SUSPENSION_LEAVE_OVERLAP_MESSAGE, suspensionEndPlan, suspensionFreedRange, suspensionInputIssue,
  upcomingSuspension } from './employee-suspension-rules'
import { EmployeeSuspension } from './employee-suspension.entity'
import { readEmployeeSuspensions, readOpenSuspensions, suspensionTableReady, suspensionView } from './employee-suspensions'
import type { CreateEmployeeSuspensionDto, EndEmployeeSuspensionDto } from './employees.dto'

// حقول إجبارية عند الإضافة (قرار المالك 16 سبتمبر): في التعديل الغائب بلا تغيير، والمرسل فاضي = مسح مرفوض
const REQUIRED_ON_EDIT: Record<string, string> = {
  nationality: 'الجنسية مطلوبة ولا يمكن مسحها', gender: 'الجنس مطلوب ولا يمكن مسحه', birthDate: 'تاريخ الميلاد مطلوب ولا يمكن مسحه',
  phone: 'رقم الجوال مطلوب ولا يمكن مسحه', nationalId: 'رقم الهوية / الإقامة مطلوب ولا يمكن مسحه', joinDate: 'تاريخ التعيين مطلوب ولا يمكن مسحه',
  departmentId: 'القسم مطلوب ولا يمكن مسحه', jobTitle: 'المسمى الوظيفي مطلوب ولا يمكن مسحه', fingerprintCode: 'رقم البصمة مطلوب ولا يمكن مسحه',
}

/** « (الاسم)» لرسائل التكرار لو صاحب القيمة في نطاق المستخدم (مدير النظام أو نفس الفرع)، وإلا فاضي. */
export function employeeNameInScope(dup: Pick<Employee, 'fullName' | 'branchId'>, branchScope: number | null): string {
  return branchScope === null || Number(dup.branchId) === Number(branchScope) ? ` (${dup.fullName})` : ''
}

/** أول مشكلة في الحقول الإجبارية عند إنشاء موظف (أي مسار: الإضافة أو التعيين من مرشح)، أو null. */
export function employeeCreateIssue(dto: object, today: string): string | null {
  return employeeRequiredIssues(dto as EmployeeRequiredValues, { mode: 'add', today })[0]?.message ?? null
}

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
    private readonly attendance: AttendanceService
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

  // العزل بالفرع: branchScope = null → الكل (super_admin فقط)
  async findAll(branchScope: number | null) {
    const rows = await this.employees.find({
      where: branchScope == null ? {} : { branchId: branchScope },
      order: { id: 'ASC' },
    })
    // HRC-09: نسخ قواعد حضور موظفي النطاق كلها باستعلام واحد بدل استعلام لكل موظف —
    // عدد الاستعلامات ثابت مهما زاد الموظفون، والاختيار نفس قاعدة صفحة التفاصيل
    const versions = this.employees.manager.getRepository(AttendanceRuleVersion).createQueryBuilder('v')
      .where('v.sourceType = :sourceType', { sourceType: 'EMPLOYEE' })
    if (branchScope != null) {
      versions.andWhere('v.sourceId IN (SELECT e.id FROM employees e WHERE e.branchId = :branchId)', { branchId: branchScope })
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
  directory(branchScope: number | null) {
    return this.employees.find({
      select: { id: true, fullName: true, employeeCode: true },
      where: {
        isActive: true,
        ...(branchScope != null ? { branchId: branchScope } : {}),
      },
      order: { fullName: 'ASC' },
    })
  }

  async findOne(id: number, branchScope: number | null) {
    const emp = await this.employees.findOne({ where: { id } })
    if (!emp) throw new NotFoundException('الموظف غير موجود')
    // منع الوصول عبر الفروع
    if (branchScope != null && emp.branchId !== branchScope) {
      throw new NotFoundException('الموظف غير موجود')
    }
    return this.attendanceView(emp)
  }

  private async attendanceView(employee: Employee) {
    const resolved = await resolveAttendanceRule(this.employees.manager, 'EMPLOYEE', employee.id,
      attendanceRuleToday(), employeeAttendanceFallback(employee))
    const history = await readEmployeeSuspensions(this.employees.manager, employee.id, undefined, { includeCancelled: true })
    return this.withSuspension(this.withAttendanceRule(employee, resolved), history.filter(row => row.status !== 'CANCELLED'), history)
  }

  private withAttendanceRule(employee: Employee, resolved: ReturnType<typeof pickAttendanceRule<EmployeeAttendanceRuleSnapshot>>) {
    return Object.assign(employee, { workScheduleId: resolved.snapshot.workScheduleId,
      flexOverrideMode: resolved.snapshot.flexOverrideMode, attendanceRuleVersion: resolved.version,
      attendanceRuleEffectiveFrom: resolved.effectiveFrom, attendanceRuleLegacy: resolved.legacyBaseline })
  }

  // ===== فحوصات التفرد — كود البصمة/البريد/الرقم القومي =====
  // البحث على مستوى الشركة كلها، لكن اسم صاحب القيمة يظهر بس لو في نطاق المستخدم (عزل الفروع):
  // حساب فرع ياخد رسالة عامة لو الموظف التاني في فرع تاني
  private async assertUnique(data: {
    employeeCode?: string
    fingerprintCode?: string
    email?: string
    nationalId?: string
    excludeId?: number
  }, branchScope: number | null) {
    const notSelf = data.excludeId ? { id: Not(data.excludeId) } : {}
    const whose = (dup: Employee) => employeeNameInScope(dup, branchScope)
    if (data.employeeCode) {
      // ولا يطابق رقم بصمة موظف آخر (المطابقة برقم البصمة أولاً)
      const dup = await this.employees.findOne({
        where: [
          { employeeCode: data.employeeCode, ...notSelf },
          { fingerprintCode: data.employeeCode, ...notSelf },
        ],
      })
      if (dup) {
        throw new ConflictException(
          `كود الموظف ${data.employeeCode} مستخدم بالفعل${whose(dup)} — الكود هو مفتاح البصمة ولا يتكرر`
        )
      }
    }
    if (data.fingerprintCode) {
      // رقم البصمة يُطابَق أولاً — تكراره أو مطابقته لكود موظف آخر ينسب بصماته لغيره
      const dup = await this.employees.findOne({
        where: [
          { fingerprintCode: data.fingerprintCode, ...notSelf },
          { employeeCode: data.fingerprintCode, ...notSelf },
        ],
      })
      if (dup) {
        throw new ConflictException(
          `رقم البصمة ${data.fingerprintCode} مستخدم بالفعل${whose(dup)} — لا يتكرر ولا يطابق كود موظف آخر`
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
        throw new ConflictException(`رقم الهوية / الإقامة ${data.nationalId} مسجل لموظف آخر${whose(dup)}`)
      }
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

  async renewContract(id: number, dto: RenewEmployeeContractDto, branchScope: number | null, actorId: number) {
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
      if (!employee || (branchScope !== null && employee.branchId !== branchScope)) throw new NotFoundException('الموظف غير موجود')
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

  // قرار المالك 16 سبتمبر: الاسم بالعربي، رقم الهوية / الإقامة بطول الجنسية، وتاريخ ميلاد قبل النهارده.
  // الإلزام نفسه في CreateEmployeeDto؛ هنا شكل القيم المكتوبة (يسري على كل مسار إنشاء)
  private assertIdentity(values: { fullName?: string | null; nationalId?: string | null; nationality?: string | null; birthDate?: string | null }) {
    const issue = arabicFullNameIssue(values.fullName) ?? nationalIdIssue(values.nationalId, values.nationality)
      ?? birthDateIssue(values.birthDate, localDateOf(new Date()))
    if (issue) throw new BadRequestException(issue)
  }

  async create(dto: CreateEmployeeDto, actorId: number, branchScope: number | null) {
    // الحقول الإجبارية وشكلها (الاسم بالعربي، الهوية بطول الجنسية، الميلاد…) على كل مسار إنشاء — مش الـDTO بس
    const requiredIssue = employeeCreateIssue(dto, localDateOf(new Date()))
    if (requiredIssue) throw new BadRequestException(requiredIssue)
    this.assertIdentity(dto)
    await this.assertUnique(dto, branchScope)
    await this.assertRelations(dto)
    this.assertContractDates(dto)
    this.assertSalaryEntitlementStart(dto.salaryEntitlementStart, dto.actualStartDate || dto.joinDate)
    // أنواع مرفقات الملف من كتالوج أنواع المستندات (لا نص حر) — قبل أي حفظ
    await assertDocTypes(this.docs.manager, (dto.documentRefs ?? []).map((r) => r?.docType))
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
      const result = await em.save(Employee, em.create(Employee, empDto as Partial<Employee>))
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
      // الخطوة 13: أجر التعيين يُوثَّق «يسري من راتب شهر» في المعاملة نفسها؛ بدونه يُستبعد الموظف الجديد من أول مسير
      // (NO_SALARY_DEFINED) حتى توثيق منفصل. فشل التوثيق (عملة غير مدعومة، شهر خارج المدى) يرجّع الإنشاء كله.
      await documentInitialEmployeeSalary(em, { employeeId: result.id, actorUserId: actorId, hireDate: result.actualStartDate || result.joinDate || null,
        effectivePayrollPeriod: salaryEffectivePayrollPeriod, evidenceReference: salaryEvidenceReference?.trim() || (dto.contractNumber?.trim() ? `عقد ${dto.contractNumber.trim()}` : undefined) })
      return result
    })
    // رصيد السنة الحالية تلقائياً — الاستحقاق من الإعدادات
    await this.ensureCurrentYearBalances(emp.id)
    // رصيد افتتاحي مُرحّل (اختياري) — طبقة opening على رصيد السنوي، لموظف يستحق السنوي فقط
    if (dto.annualLeaveEntitled !== false) {
      await this.applyOpeningBalance(emp.id, openingBalanceDays, openingBalanceExpiry)
    }
    // بصمات وصلت بكوده/رقم بصمته قبل تسجيله تُربط به
    await this.relinkPunches(emp)
    return this.attendanceView(emp)
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
      // نفس الأيام والصلاحية = لا تغيير؛ والمستخدم من الطبقة يبقى (محدودًا بالأيام الجديدة)
      // بدل تصفيره، وإلا عادت أيام مستهلكة للرصيد وحُمّلت على الاستحقاق بعد انتهاء الطبقة
      const next = nextOpeningBalance(annual, Number(days), expiry)
      if (!next) return
      annual.openingDays = next.openingDays
      annual.openingTaken = next.openingTaken
      annual.openingExpiry = next.openingExpiry as any
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

  // استحقاق الإجازة المرضية العام من الإعدادات (يوم/سنة) — افتراضياً 180
  private async configSickEntitled(): Promise<number> {
    return Number(
      (await this.config.findOne({ where: { key: 'leave.sick_entitled' } }))
        ?.value ?? '180'
    )
  }

  // ينشئ أرصدة السنة الحالية (سنوي/مرضي) إن لم توجد — يُستدعى عند التعيين.
  // الاستحقاقان من سياسة الإجازات — لا أرقام ثابتة في الكود
  private async ensureCurrentYearBalances(employeeId: number) {
    const period = String(new Date().getFullYear())
    const emp = await this.employees.findOne({ where: { id: employeeId } })
    // غير مستحق للسنوي → استحقاق 0 (لا يتراكم له رصيد)
    const annualEntitled =
      emp?.annualLeaveEntitled === false ? 0 : await this.configAnnualEntitled()
    const sickEntitled = await this.configSickEntitled()
    for (const [balanceType, entitled] of [
      ['annual', annualEntitled],
      ['sick', sickEntitled],
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

  // الخطوة 13: حدود «يسري من راتب شهر» لأجر التعيين في نموذج الإنشاء (قراءة فقط، بلا بيانات موظف).
  async salaryStartContext(hireDate?: string) {
    const value = typeof hireDate === 'string' && hireDate.trim() ? hireDate.trim() : null
    if (value !== null && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException({ code: 'EMPLOYEE_SALARY_START_DATE_INVALID', message: 'تاريخ التعيين بصيغة YYYY-MM-DD' })
    }
    const cycleStartDay = await readSalaryCycleStartDay(this.employees.manager)
    return employeeSalaryStartContext({ cycleStartDay, today: localDateOf(new Date()), hireDate: value })
  }

  async salaryChangeContext(id: number, branchScope: number | null) {
    try {
      return await this.employees.manager.transaction('SERIALIZABLE', async em => {
        const rows = await em.query(`DECLARE @result int;
          EXEC @result = sys.sp_getapplock @Resource = @0, @LockMode = 'Shared',
            @LockOwner = 'Transaction', @LockTimeout = 10000;
          SELECT @result AS lockResult;`, [`hr:employee-finance:${id}`])
        if (!rows.length || Number(rows[0].lockResult) < 0) throw new ConflictException('توجد عملية مالية جارية للموظف؛ حاول مجددًا')
        const source = await readSalaryHistoryCurrent(em, id)
        if (!source || (branchScope !== null && source.employee.branchId !== branchScope)) throw new NotFoundException('الموظف غير موجود')
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

  async update(id: number, dto: UpdateEmployeeDto, branchScope: number | null, actorId?: number) {
    const emp = await this.findOne(id, branchScope)
    // الحالة المحفوظة — المعروضة قد تكون «موقوف» مشتقة من فترة إيقاف مؤرخة
    const storedStatus = (emp as Employee & { storedStatus?: Employee['status'] }).storedStatus ?? emp.status
    if (branchScope != null && dto.branchId !== undefined && dto.branchId !== branchScope) {
      throw new ForbiddenException('لا يمكنك نقل الموظف خارج نطاق فرعك')
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
    const nextNationalId = dto.nationalId !== undefined ? dto.nationalId : emp.nationalId
    const nextNationality = dto.nationality !== undefined ? dto.nationality : emp.nationality
    this.assertIdentity({
      fullName: dto.fullName !== undefined && dto.fullName !== emp.fullName ? dto.fullName : null,
      // رقم الهوية يُعاد فحصه لو اتغير هو أو الجنسية؛ المحفوظ القديم كما هو لا يمنع الحفظ
      nationalId: (dto.nationalId !== undefined && dto.nationalId !== emp.nationalId)
        || (dto.nationality !== undefined && dto.nationality !== emp.nationality) ? nextNationalId : null,
      nationality: nextNationality,
      birthDate: dto.birthDate !== undefined && dto.birthDate !== String(emp.birthDate ?? '').slice(0, 10) ? dto.birthDate : null,
    })
    await this.assertUnique({ ...dto, excludeId: id }, branchScope)
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
    const prevCodes = `${emp.employeeCode}|${emp.fingerprintCode ?? ''}`
    const { flexOverrideMode, attendanceEffectiveFrom, attendanceChangeReason, salaryChange, calendarChange, ...employeeFields } = empDto
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
      if (!fresh || (branchScope !== null && fresh.branchId !== branchScope)) throw new NotFoundException('الموظف غير موجود')
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
      const result = await em.findOneByOrFail(Employee, { id })
      await linkEmployeeFiles(em, id, [contractFileRef, ...(documentRefs ?? []).map(r => r.fileRef),
        dto.photoFileId ? `file:${dto.photoFileId}` : undefined], actorId)
      await this.saveContractDocument(id, {
        contractFileRef, contractNumber: dto.contractNumber ?? result.contractNumber,
        contractStart: dto.contractStart ?? result.contractStart, contractEnd: dto.contractEnd ?? result.contractEnd,
      }, em)
      await this.saveDocuments(id, documentRefs, em)
      const trackedFields = ['teamId', 'branchId', 'departmentId', 'managerEmployeeId', 'jobTitle',
        'iban', 'bankName', 'bankBranch', 'payMethod', 'salaryCycle', 'gosiBaseSalary', 'workType',
        'contractType', 'contractStart', 'contractEnd', 'contractNumber'] as const
      for (const fieldName of trackedFields) {
        if ((beforeChange[fieldName] ?? null) !== (result[fieldName] ?? null)) await recordEmployeeChange(em, {
          employeeId: id, fieldName, oldValue: beforeChange[fieldName], newValue: result[fieldName],
          changedByUserId: actorId, reason: 'تعديل من ملف الموظف',
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
      return result
    })
    // تغيّر رقم البصمة/الكود → بصماته اليتيمة السابقة بالكود الجديد تُربط به
    if (`${saved.employeeCode}|${saved.fingerprintCode ?? ''}` !== prevCodes) {
      await this.relinkPunches(saved)
    }
    // تبديل استحقاق السنوي → مزامنة رصيد السنوي (0 أو القيمة العامة)
    if (dto.annualLeaveEntitled !== undefined) {
      await this.applyAnnualEntitlement(id, dto.annualLeaveEntitled)
    }
    // تعديل رصيد افتتاحي مُرحّل لموظف قائم (انتقل من نظام سابق) — لا يُطبَّق مع «لا يستحق»
    if (dto.annualLeaveEntitled !== false) {
      await this.applyOpeningBalance(id, openingBalanceDays, openingBalanceExpiry)
    }
    return this.attendanceView(saved)
  }

  // الأرشفة بدل الحذف — التاريخ الوظيفي لا يُمسح (بسبب موثّق)
  async archive(id: number, branchScope: number | null, reason?: string, actorId?: number) {
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

  async reactivate(id: number, branchScope: number | null, actorId?: number) {
    await this.findOne(id, branchScope)
    return this.employees.manager.transaction(async em => {
      const emp = await em.findOneOrFail(Employee, { where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!['archived', 'terminated'].includes(emp.status)) throw new BadRequestException('الموظف ليس مؤرشفاً ولا منتهي الخدمة')
      const oldStatus = emp.status
      emp.status = 'active'
      emp.isActive = true
      emp.archivedAt = null as any
      emp.archiveReason = null as any
      await em.save(Employee, emp)
      await em.update(User, { employeeId: id }, { isActive: true, tokenVersion: () => 'tokenVersion + 1' })
      await recordEmployeeChange(em, { employeeId: id, fieldName: 'status', oldValue: oldStatus, newValue: 'active',
        changedByUserId: actorId, reason: oldStatus === 'terminated' ? 'عودة على رأس العمل بعد انتهاء خدمة' : 'إعادة تفعيل من الأرشيف' })
      return emp
    })
  }

  // ===== الإيقاف عن العمل لفترة (قرار المالك 16 سبتمبر) =====
  // من/إلى/سبب. الحالة «موقوف» مشتقة من التواريخ، فلا تُكتب على employees.status ولا تقفل isActive؛
  // أيام الإيقاف ليست غيابًا (تجسيد الغياب يتخطاها) وتُخصم في المسير يومًا بيوم مثل الإجازة بدون راتب.

  private async assertSuspensionSchema() {
    if (!(await suspensionTableReady(this.employees.manager))) {
      throw new ConflictException({ code: 'EMPLOYEE_SUSPENSION_SCHEMA_MISSING', message: 'ترحيل الإيقاف عن العمل (20260916_044) غير مطبق على قاعدة البيانات بعد' })
    }
  }

  private async scopedEmployee(em: EntityManager, id: number, branchScope: number | null, lock = false) {
    const employee = await em.findOne(Employee, { where: { id }, ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}) })
    if (!employee || (branchScope !== null && employee.branchId !== branchScope)) throw new NotFoundException('الموظف غير موجود')
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

  async listSuspensions(id: number, branchScope: number | null) {
    await this.scopedEmployee(this.employees.manager, id, branchScope)
    const today = localDateOf(new Date())
    return (await readEmployeeSuspensions(this.employees.manager, id, undefined, { includeCancelled: true })).map(row => suspensionView(row, today))
  }

  async createSuspension(id: number, dto: CreateEmployeeSuspensionDto, branchScope: number | null, actorId: number) {
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
      return row
    })
    return suspensionView(saved, today)
  }

  // إنهاء بدري: يرجع للعمل من returnDate (الافتراضي النهارده). الرجوع في يوم البداية أو قبله = إلغاء
  async endSuspension(id: number, suspensionId: number, dto: EndEmployeeSuspensionDto, branchScope: number | null, actorId: number) {
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

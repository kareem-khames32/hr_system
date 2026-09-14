import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, Repository } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, userHasPerm } from '../auth/guards'
import { EmployeeSalaryHistoryVersion } from './payroll-salary-history.entities'
import { ReplacePayrollMonthlySalaryHistoryDto, ReplacePayrollSalaryHistoryDto } from './payroll-salary-history.dto'
import { appendMonthlySalaryHistoryRevision, appendSalaryHistoryRevision, normalizeSalaryHistorySegments, readSalaryHistory, readSalaryHistoryCurrent, salaryHistorySchemaMissing, salaryHistoryText } from './payroll-salary-history'
import { lockPayrollEmployees } from './payroll-settlement-boundary'
import { normalizeMonthlySalaryPeriods, PayrollPeriodSalaryError } from './payroll-period-salary'
import { assertMonthlySalaryHistoryKeepsClosedPeriods } from './payroll-salary-change'

@Injectable()
export class PayrollSalaryHistoryService {
  constructor(@InjectRepository(EmployeeSalaryHistoryVersion) private readonly versions: Repository<EmployeeSalaryHistoryVersion>) {}

  private permitted(user: JwtPayload, employeeId: number, write = false) {
    if (!userHasPerm(user, write ? 'payroll.approve' : 'payroll.view')) throw new ForbiddenException('لا تملك صلاحية قراءة أو إثبات سجل الأجر')
    if (!Number.isInteger(employeeId) || employeeId < 1 || employeeId > 2147483647) throw new BadRequestException('معرّف الموظف غير صالح')
    if (branchScopeOf(user) === -1) throw new ForbiddenException('الحساب غير مسند إلى فرع صالح')
    if (write && (!Number.isInteger(user.sub) || user.sub < 1 || user.sub > 2147483647)) throw new ForbiddenException('هوية المستخدم الذي يثبت الأجر غير صالحة')
  }

  private async current(em: EntityManager, user: JwtPayload, employeeId: number) {
    const result = await readSalaryHistoryCurrent(em, employeeId)
    if (!result) throw new NotFoundException('الموظف غير موجود')
    const scope = branchScopeOf(user)
    if (scope !== null && result.employee.branchId !== scope) throw new ForbiddenException('الموظف خارج نطاق الفرع المسموح')
    return result
  }

  private async sharedLock(em: EntityManager, employeeId: number) {
    const rows = await em.query(`DECLARE @result int; EXEC @result = sys.sp_getapplock @Resource = @0, @LockMode = 'Shared', @LockOwner = 'Transaction', @LockTimeout = 10000; SELECT @result AS lockResult;`, [`hr:employee-finance:${employeeId}`])
    if (!rows.length || Number(rows[0].lockResult) < 0) throw new ConflictException('توجد عملية مالية جارية للموظف؛ حاول مجددًا')
  }

  private schema(error: unknown): never {
    if (error instanceof PayrollPeriodSalaryError) throw new BadRequestException({ code: error.code, message: error.message })
    if (salaryHistorySchemaMissing(error)) throw new ConflictException({ code: 'SALARY_HISTORY_SCHEMA_MISSING', message: 'ترحيل سجل الأجر المؤرخ غير مطبق على قاعدة البيانات الحالية' })
    throw error
  }

  async detail(user: JwtPayload, employeeId: number) {
    this.permitted(user, employeeId)
    try {
      return await this.versions.manager.transaction('SERIALIZABLE', async em => {
        await this.sharedLock(em, employeeId)
        const current = await this.current(em, user, employeeId), history = await readSalaryHistory(em, employeeId)
        return { ...current, ...history, capabilities: { canEdit: userHasPerm(user, 'payroll.approve') } }
      })
    } catch (error) { this.schema(error) }
  }

  async replace(user: JwtPayload, employeeId: number, dto: ReplacePayrollSalaryHistoryDto) {
    this.permitted(user, employeeId, true)
    if (!Number.isInteger(dto.expectedRevision) || dto.expectedRevision < 0 || dto.expectedRevision > 2147483646 || typeof dto.expectedCurrentSourceHash !== 'string' || !/^[a-f0-9]{64}$/.test(dto.expectedCurrentSourceHash)) throw new BadRequestException('مراجعة سجل الأجر وبصمة المصدر الحالي مطلوبتان')
    const segments = normalizeSalaryHistorySegments(dto.segments), reason = salaryHistoryText(dto.reason, 500, 'سبب إثبات الأجر'), evidenceReference = salaryHistoryText(dto.evidenceReference, 200, 'مرجع مستند الأجر')
    try {
      return await this.versions.manager.transaction('SERIALIZABLE', async em => {
        await lockPayrollEmployees(em, [employeeId])
        const current = await this.current(em, user, employeeId), previous = await readSalaryHistory(em, employeeId)
        if (previous.revision !== dto.expectedRevision) throw new ConflictException({ code: 'SALARY_HISTORY_REVISION_CONFLICT', message: 'تغير سجل الأجر منذ فتحه؛ حدّث البيانات قبل الحفظ', currentRevision: previous.revision })
        if (current.currentSourceHash !== dto.expectedCurrentSourceHash) throw new ConflictException({ code: 'SALARY_HISTORY_CURRENT_SOURCE_CHANGED', message: 'تغير الأجر الحالي في ملف الموظف؛ حدّث البيانات وراجع السجل قبل إثباته' })
        const history = await appendSalaryHistoryRevision(em, { employeeId, reason, evidenceReference, currentSourceHash: current.currentSourceHash, segments, createdBy: user.sub })
        return { ...current, ...history, capabilities: { canEdit: true }, payrollChanged: false, retroAdjustmentsCreated: false }
      })
    } catch (error) { this.schema(error) }
  }

  async replaceMonthly(user: JwtPayload, employeeId: number, dto: ReplacePayrollMonthlySalaryHistoryDto) {
    this.permitted(user, employeeId, true)
    if (!Number.isInteger(dto.expectedRevision) || dto.expectedRevision < 0 || dto.expectedRevision > 2147483646 || typeof dto.expectedCurrentSourceHash !== 'string' || !/^[a-f0-9]{64}$/.test(dto.expectedCurrentSourceHash)) throw new BadRequestException('مراجعة سجل الأجر وبصمة المصدر الحالي مطلوبتان')
    const reason = salaryHistoryText(dto.reason, 500, 'سبب إثبات الأجر'), evidenceReference = salaryHistoryText(dto.evidenceReference, 200, 'مرجع مستند الأجر')
    try {
      return await this.versions.manager.transaction('SERIALIZABLE', async em => {
        await lockPayrollEmployees(em, [employeeId])
        const current = await this.current(em, user, employeeId), previous = await readSalaryHistory(em, employeeId)
        if (previous.revision !== dto.expectedRevision) throw new ConflictException({ code: 'SALARY_HISTORY_REVISION_CONFLICT', message: 'تغير سجل الأجر منذ فتحه؛ حدّث البيانات قبل الحفظ', currentRevision: previous.revision })
        if (current.currentSourceHash !== dto.expectedCurrentSourceHash) throw new ConflictException({ code: 'SALARY_HISTORY_CURRENT_SOURCE_CHANGED', message: 'تغير الأجر الحالي في ملف الموظف؛ حدّث البيانات وراجع السجل قبل إثباته' })
        // نثبت إعداد الدورة المقروء داخل المعاملة للحدود المشتقة فقط، ولا نستخدمه لاختيار الراتب.
        const config = await em.query('SELECT [value] FROM dbo.requests_config WHERE [key]=@0', ['payroll.cycle_start_day'])
        if (config.length !== 1 || typeof config[0].value !== 'string' || !/^(?:[1-9]|[12][0-9]|3[01])$/.test(config[0].value)) throw new ConflictException({ code: 'SALARY_PAYROLL_CYCLE_INVALID', message: 'إعداد بداية دورة الرواتب غير مثبت أو غير صالح؛ راجعه قبل إثبات التاريخ الشهري' })
        const periods = Array.isArray(dto.periods) ? dto.periods.map(row => ({ ...row })) : dto.periods
        // راتب شهر دخل مسيرًا معتمدًا أو مصروفًا لا يُعدَّل من السجل (قاعدة: لا إعادة حساب لمصروف).
        await assertMonthlySalaryHistoryKeepsClosedPeriods(em, employeeId, previous, normalizeMonthlySalaryPeriods(periods, Number(config[0].value)))
        const history = await appendMonthlySalaryHistoryRevision(em, { employeeId, reason, evidenceReference, currentSourceHash: current.currentSourceHash,
          periods, cycleStartDay: Number(config[0].value), createdBy: user.sub })
        return { ...current, ...history, capabilities: { canEdit: true }, compatibilityDatesDerived: true, payrollChanged: false, retroAdjustmentsCreated: false }
      })
    } catch (error) { this.schema(error) }
  }
}

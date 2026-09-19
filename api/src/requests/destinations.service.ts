import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common'
import { overtimeFinancialValue } from '../payroll/overtime-financial'
import { payrollPeriodOfDate } from '../payroll/payroll-period'
import { salaryPayrollPeriodBounds } from '../payroll/payroll-period-salary'
import { deferLoanInstallment, repayLoanEarly } from '../payroll/payroll-installment-ledger'
import { readApprovedLoanRequest, readEarlySettlementPayload } from '../loans/loan-request-caps'
import { readLoanInstallmentPositions } from '../payroll/payroll-installment-balances'
import { LOAN_DEFERRAL_HANDLER, LOAN_DEFERRAL_TYPE, assertLoanReferenceId, loanScheduleAmounts, readStoredLoanDeferralPayload } from './loan-installment-requests'
import { claimOvertimeDay } from './overtime-day-claims'
import { recordHolidayWorkRequest } from '../attendance/holiday-work'
import {
  EntityManager,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  Not,
} from 'typeorm'
import { OffboardingCase } from '../offboarding/offboarding.entities'
import { isValidYmd } from '../offboarding/eos'
import {
  OPEN_CASE_STATUSES,
  openOffboardingCase,
} from '../offboarding/offboarding-open'
import { LeaveBalancesService } from './leave-balances.service'
import { leaveCodeOf } from '../common/leave-contract'
import { Request } from './entities/request.entity'
import { RequestApproval } from './entities/request-approval.entity'
import { RequestType } from './entities/request-type.entity'
import { Leave, LeaveType } from './entities/leave.entities'
import { initialLeaveAttachment } from './leave-attachment-rules'
import {
  AttendanceCorrection,
  OvertimeEntry,
} from './entities/attendance.entities'
import {
  EmployeeObligation,
  Loan,
  ObligationType,
} from './entities/financial.entities'
import {
  EmployeeStatusHistory,
  Promotion,
  Transfer,
} from './entities/employment.entities'
import { recordEmployeeChange } from '../employees/employee-change-log'
import { Asset, CustodyAssignment } from './entities/custody.entities'
import { RequestsConfig } from './entities/requests-config.entity'
import { LettersService } from '../letters/letters.service'
import { Employee } from '../employees/employee.entity'
import { User } from '../auth/user.entity'
import { localDateOf } from '../attendance/attendance.service'
import {
  assertEmploymentValues, employmentEffectiveDate, executeContract, executeShiftSwap,
  recordEmploymentChanges, supportsEmploymentType, validateEmploymentRequest, validateTransfer,
} from './employment-destinations'
import { startCustodyTransfer } from './custody-execution'
import { executeSalaryChangeRequest } from './salary-change-requests'
import { lockPayrollEmployees } from '../payroll/payroll-settlement-boundary'
import { appendEmployeeOrgCalendar } from '../attendance/attendance-calendar-history'
import { assertEmployeeSchedulesFitBranch } from '../attendance/attendance-rule-history'
import { assertLeaveOutsideSuspension } from '../employees/employee-suspension-overlap'
import { DATA_PLACEHOLDER_REJECTED, isDataPlaceholder } from '../common/data-placeholders'

// ناتج تنفيذ الوجهة: المرجع الدائم + هل اكتمل فوراً أم ينتظر (سريان/تأكيد استلام)
export interface DestinationResult {
  ref: string
  completed: boolean
  note?: string
}

type Handler = (
  em: EntityManager,
  req: Request,
  type: RequestType,
  payload: Record<string, any>
) => Promise<DestinationResult>

const refOf = (prefix: string, id: number): string =>
  `${prefix}-${new Date().getFullYear()}-${String(id).padStart(6, '0')}`

// «تحديث بيانات الموظف»: مفتاح الحمولة → عمود الموظف، لكل معالج على حدة (SEC-REQ-2).
// البنك (bankName/iban) خارجها نهائياً — يتغيّر من المسار الأمني payroll_bank_secure وحده
export const RECORD_UPDATE_FIELDS: Record<string, Record<string, keyof Employee>> = {
  employee_record: { phone: 'phone', phoneAlt: 'phoneAlt', address: 'address', maritalStatus: 'maritalStatus' },
  // جهة اتصال الطوارئ (تنفيذ آلي بلا معتمد): حقول الطوارئ فقط — لا تمس بيانات الموظف نفسه
  employee_record_auto: {
    name: 'emergencyContactName',
    phone: 'emergencyContactPhone',
    relation: 'emergencyRelation',
    phoneAlt: 'emergencyPhoneAlt',
  },
}

// قيمة حقل «تحديث البيانات»: نص/رقم بعد القص، والنص الفارغ أو غير النصي = null (لا تغيير)
export const recordValue = (raw: unknown): string | null => {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null
  const value = String(raw).trim()
  return value === '' ? null : value
}

// مبلغ قيد الدفتر من طلب مالي: رقم موجب (يُقرَّب لقرشين) وضمن decimal(18,2) — وإلا رفض صريح
export const obligationAmount = (raw: unknown): number => {
  const text = typeof raw === 'number' ? String(raw) : typeof raw === 'string' ? raw.trim() : ''
  const amount = text !== '' && Number.isFinite(Number(text)) ? Math.trunc(Number((Number(text) * 100).toFixed(6))) / 100 : NaN
  if (!(amount > 0) || amount > 999_999_999) {
    throw new BadRequestException('المبلغ مطلوب رقمًا موجبًا (حتى 999,999,999) — أرجع الطلب لتصحيح المبلغ')
  }
  return amount
}

// وجهات «الطلب نفسه هو السجل» يقرؤها محرك الحضور بكود النوع (الاستئذان والعمل عن
// بُعد والمأمورية): منفّذة لهذه الأنواع وحدها، ولا تُختار لنوع آخر فيكتمل بلا أثر (REQ-3)
export const ENGINE_RECORD_HANDLERS: Record<string, { labelAr: string; typeCodes: string[] }> = {
  attendance_log: {
    labelAr: 'سجل الحضور — يقرؤه محرك الحضور (استئذان/عمل عن بُعد)',
    typeCodes: ['PERMISSION', 'REMOTE_WORK'],
  },
  attendance_trips: {
    labelAr: 'سجل المأموريات — يقرؤه محرك الحضور',
    typeCodes: ['BUSINESS_TRIP'],
  },
}

// ===== D12 (قرار 14 سبتمبر): الأنواع الستة عشر التي لا معالج حقيقي لها =====
// القرار لكل نوع: «تسجيل فقط» — الطلب المعتمد نفسه هو السجل الدائم، بلا أثر آلي على
// الملف أو الراتب أو العهدة (الإجراء الفعلي يتم يدويًا أو بطلب منفصل مذكور في الملاحظة).
// لا نوع منها معطّل. التظلم والإبلاغ والاعتراض على جزاء تسجيل سري (isConfidential).
// ترحيل 20260914_016_r1 يحوّل وجهاتها القديمة غير المبنية إلى «none» في البيانات؛ الخريطة
// هنا تُبقي القاعدة غير المرحّلة (وجهة قديمة) تعمل بنفس القرار بدل أن تختفي الأنواع (REQ-3).
export type RequestTypeDecision = 'RECORD_ONLY' | 'DISABLED'
export const RECORD_ONLY_LABEL = 'تسجيل فقط'
export const RECORD_ONLY_REQUEST_TYPES: Record<string, { legacyHandler: string; decision: RequestTypeDecision; confidential: boolean; noteAr: string }> = {
  ACCESS_REQUEST: { legacyHandler: 'access_register', decision: 'RECORD_ONLY', confidential: false, noteAr: 'تمنح تقنية المعلومات الصلاحية يدويًا بعد الاعتماد' },
  APPRAISAL_OBJECTION: { legacyHandler: 'appraisal_register', decision: 'RECORD_ONLY', confidential: false, noteAr: 'لا يوجد موديول تقييم أداء — الاعتراض سجل للمراجعة' },
  CERT_REIMBURSEMENT: { legacyHandler: 'training_expense', decision: 'RECORD_ONLY', confidential: false, noteAr: 'لا صرف آلي — أي مبلغ يُصرف بقيد مالي منفصل بعد الاعتماد' },
  CONFERENCE: { legacyHandler: 'training_register', decision: 'RECORD_ONLY', confidential: false, noteAr: 'سجل حضور مؤتمر للمتابعة — لا موديول تدريب' },
  DEPENDENTS_UPDATE: { legacyHandler: 'employee_dependents', decision: 'RECORD_ONLY', confidential: false, noteAr: 'لا جدول معالين — تحدّث الموارد البشرية الملف يدويًا' },
  DOCUMENT_RENEWAL: { legacyHandler: 'document_vault', decision: 'RECORD_ONLY', confidential: false, noteAr: 'المستند يُرفع ويُربط من ملف الموظف بعد الاعتماد' },
  EDUCATION_ASSISTANCE: { legacyHandler: 'training_register', decision: 'RECORD_ONLY', confidential: false, noteAr: 'لا صرف آلي — أي مبلغ يُصرف بقيد مالي منفصل' },
  FACILITY_CARD: { legacyHandler: 'facilities_register', decision: 'RECORD_ONLY', confidential: false, noteAr: 'تصدر الإدارة الكارت يدويًا بعد الاعتماد' },
  GRIEVANCE: { legacyHandler: 'er_case', decision: 'RECORD_ONLY', confidential: true, noteAr: 'تسجيل سري — لا يطّلع عليه غير أطرافه' },
  HR_MEETING: { legacyHandler: 'meetings_register', decision: 'RECORD_ONLY', confidential: false, noteAr: 'يُحدَّد الموعد مع الموارد البشرية خارج النظام' },
  IT_EQUIPMENT: { legacyHandler: 'it_assets', decision: 'RECORD_ONLY', confidential: false, noteAr: 'الجهاز يُسلَّم بطلب عهدة منفصل' },
  PENALTY_OBJECTION: { legacyHandler: 'er_case', decision: 'RECORD_ONLY', confidential: true, noteAr: 'تسجيل سري للمراجعة — لا يلغي الجزاء آليًا' },
  SECONDMENT: { legacyHandler: 'assignments_register', decision: 'RECORD_ONLY', confidential: false, noteAr: 'لا تغيير آلي على الفرع أو الفريق — النقل بطلب نقل منفصل' },
  SUGGESTION: { legacyHandler: 'suggestions_register', decision: 'RECORD_ONLY', confidential: false, noteAr: 'سجل اقتراحات للمتابعة' },
  TRAINING_REQUEST: { legacyHandler: 'training_register', decision: 'RECORD_ONLY', confidential: false, noteAr: 'سجل تدريب — لا موديول تدريب' },
  WHISTLEBLOWING: { legacyHandler: 'er_case_anonymous', decision: 'RECORD_ONLY', confidential: true, noteAr: 'تسجيل سري — لا يطّلع عليه غير أطرافه' },
}

// نمط تنفيذ النوع للواجهة: تسجيل فقط (none أو قرار D12) / تنفيذ فعلي / وجهة غير مبنية
export type RequestExecutionMode = 'RECORD_ONLY' | 'EXECUTES' | 'UNSUPPORTED'
const isLegacyRecordOnly = (type: Pick<RequestType, 'code' | 'destinationHandler'>) => {
  const decision = RECORD_ONLY_REQUEST_TYPES[type.code]
  return !!decision && decision.decision === 'RECORD_ONLY' && decision.legacyHandler === type.destinationHandler
}

// SEC-EMP-2: قيم تُكتب في ملف الموظف وتُطبع في المستندات — تحقق واحد يستخدمه
// التقديم (requests.service) والتنفيذ (المعالج)، ويعيد القيمة المنظّفة
export const assertIban = (raw: unknown): string => {
  // نفس regex الـDTO (employees.dto.ts) — بعد حذف المسافات وتكبير الحروف
  const iban = String(raw ?? '').replace(/\s+/g, '').toUpperCase()
  if (!/^[A-Z]{2}[A-Z0-9]{13,32}$/.test(iban)) {
    throw new BadRequestException('IBAN غير صالح (يبدأ برمز الدولة ثم أرقام/حروف)')
  }
  return iban
}
// المسمى بطول عمود jobTitle (100) وبلا محارف HTML/تحكم
export const assertJobTitle = (raw: unknown): string => {
  const title = String(raw ?? '').trim()
  if (title.length < 2 || title.length > 100 || /[<>\x00-\x1f]/.test(title)) {
    throw new BadRequestException(
      'المسمى الوظيفي الجديد غير صالح — من 2 إلى 100 حرف بدون < أو >'
    )
  }
  // الخطوة 9 (مسار R2): القيمة المؤقتة ليست مسمى حقيقيًا
  if (isDataPlaceholder(title)) throw new BadRequestException(DATA_PLACEHOLDER_REJECTED)
  return title
}
// اسم البنك (اختياري في الطلب) بطول عمود bankName (100) وبلا محارف HTML/تحكم
export const assertBankName = (raw: unknown): string => {
  const name = String(raw ?? '').trim()
  if (name.length < 2 || name.length > 100 || /[<>\x00-\x1f]/.test(name)) {
    throw new BadRequestException('اسم البنك غير صالح — من 2 إلى 100 حرف بدون < أو >')
  }
  return name
}

@Injectable()
export class DestinationsService {
  private readonly logger = new Logger(DestinationsService.name)

  constructor(private readonly leaveBalances: LeaveBalancesService, private readonly letters: LettersService) {}

  // مفاتيح الوجهات المنفّذة فعلياً — مصدر قائمة بانِي الطلبات وتحققه (settings)
  handlerKeys(): string[] {
    // Keep old persisted keys executable; offer explicit names for new configuration.
    const legacy = new Set(['leave_calendar_balance', 'leave_calendar', 'leave_calendar_payroll', 'leave_calendar_once', 'custody_assignments'])
    return Object.keys(this.handlers).filter(key => !legacy.has(key))
  }

  // هل للنوع تنفيذ فعلي بعد الاعتماد؟ «بدون تنفيذ آلي» اختيار صريح (سجل فقط)؛
  // الوجهة اللي لسه متبنّتش لا تُفعَّل ولا تُقدَّم ولا تُنفَّذ (REQ-3)
  supports(type: Pick<RequestType, 'code' | 'destinationHandler'>): boolean {
    const key = type.destinationHandler
    if (type.code === LOAN_DEFERRAL_TYPE || key === LOAN_DEFERRAL_HANDLER) return type.code === LOAN_DEFERRAL_TYPE && key === LOAN_DEFERRAL_HANDLER
    if (!supportsEmploymentType(type)) return false
    if (key === 'none' || Object.prototype.hasOwnProperty.call(this.handlers, key)) {
      return true
    }
    // D12: وجهة قديمة غير مبنية لنوع قراره «تسجيل فقط» (قاعدة لم تُرحَّل بعد)
    if (isLegacyRecordOnly(type)) return true
    return ENGINE_RECORD_HANDLERS[key]?.typeCodes?.includes(type.code) ?? false
  }

  // نمط التنفيذ للكتالوج وبانِي الطلبات: «تسجيل فقط» صريح بدل إخفاء النوع (D12)
  executionModeOf(type: Pick<RequestType, 'code' | 'destinationHandler'>): RequestExecutionMode {
    if (!this.supports(type)) return 'UNSUPPORTED'
    return type.destinationHandler === 'none' || isLegacyRecordOnly(type) ? 'RECORD_ONLY' : 'EXECUTES'
  }

  executionLabelOf(type: Pick<RequestType, 'code' | 'destinationHandler'>): string | null {
    return this.executionModeOf(type) === 'RECORD_ONLY' ? RECORD_ONLY_LABEL : null
  }

  // رسالة واحدة للنوع اللي وجهته غير مبنية — للتقديم والتفعيل والتنفيذ
  unsupportedMessage(type: Pick<RequestType, 'nameAr' | 'destinationHandler'>): string {
    return (
      `نوع «${type.nameAr}» ليس له تنفيذ بعد الاعتماد (الوجهة «${type.destinationHandler}» لم تُبنَ) — ` +
      `لا يُقبل عليه طلب حتى تختار الموارد البشرية وجهة منفّذة أو «سجل فقط» من «بانِي الطلبات»`
    )
  }

  // ===== القاعدة الذهبية: كل طلب معتمد يُكتب في سجل دائم =====
  async execute(
    em: EntityManager,
    req: Request,
    type: RequestType
  ): Promise<DestinationResult> {
    if ((type.code === LOAN_DEFERRAL_TYPE || type.destinationHandler === LOAN_DEFERRAL_HANDLER) && !this.supports(type)) {
      throw new BadRequestException('طلب تأجيل القسط يجب أن يستخدم وجهة تأجيل القسط المخصصة')
    }
    const payload = req.payload ? JSON.parse(req.payload) : {}
    assertEmploymentValues(type, payload)
    // «بدون تنفيذ آلي» (سجل فقط): اختيار صريح من المالك — الطلب نفسه هو السجل الدائم.
    // وقرار D12 لوجهة قديمة غير مبنية (قاعدة لم تُرحَّل) له نفس الأثر
    if (type.destinationHandler === 'none' || isLegacyRecordOnly(type)) {
      return { ref: refOf('REQ', req.id), completed: true }
    }
    // الطلب نفسه سجل يقرؤه محرك الحضور (لأنواعه فقط) — أيامه يُعاد حسابها بعد التنفيذ
    if (ENGINE_RECORD_HANDLERS[type.destinationHandler]?.typeCodes?.includes(type.code)) {
      return { ref: refOf('REQ', req.id), completed: true }
    }
    // وجهة لسه متبنّتش: ممنوع «مكتمل» بصمت (REQ-3) — الخطأ يرجّع معاملة الاعتماد كلها
    if (!Object.prototype.hasOwnProperty.call(this.handlers, type.destinationHandler)) {
      this.logger.warn(`لا يوجد handler لـ ${type.destinationHandler} — رُفض تنفيذ الطلب #${req.id}`)
      throw new BadRequestException(this.unsupportedMessage(type))
    }
    return this.handlers[type.destinationHandler](em, req, type, payload)
  }

  // ========== الإجازات ==========

  private leaveHandler =
    (deductBalance: boolean): Handler =>
    async (em, req, _type, payload) => {
      const leaveTypeCode = leaveCodeOf(payload, _type.code)
      // نصف اليوم: MORNING/EVENING — والدفع من تعريف نوع الإجازة
      const period = ['MORNING', 'EVENING'].includes(String(payload.period))
        ? (String(payload.period) as 'MORNING' | 'EVENING')
        : 'FULL'
      const ltDef = await em.getRepository(LeaveType).findOne({
        where: { code: leaveTypeCode },
      })
      // الحارس الحاسم: امنع خصماً مضاعفاً لو اعتُمدت إجازة متداخلة قبل هذه
      // (سباق طلبين متداخلين — الثاني عند تنفيذه يجد إجازة الأول المعتمدة)
      const overlap = await em.getRepository(Leave).findOne({
        where: {
          employeeId: req.requesterId,
          status: 'APPROVED',
          fromDate: LessThanOrEqual(String(payload.toDate)),
          toDate: MoreThanOrEqual(String(payload.fromDate)),
        },
      })
      if (overlap) {
        throw new BadRequestException(
          `للموظف إجازة معتمدة متداخلة (${overlap.fromDate} → ${overlap.toDate}) — لا خصم مضاعف لنفس الأيام`
        )
      }
      // الحارس الأخير قبل الكتابة: تواريخ صحيحة وأيام موجبة (LEV-4) — التقديم
      // بيحسبها على السيرفر، فده بيصد بس طلبات اتقدّمت قبل الإصلاح
      const leaveDays = Number(payload.days)
      if (
        !(leaveDays > 0) ||
        !payload.fromDate ||
        !payload.toDate ||
        String(payload.toDate) < String(payload.fromDate)
      ) {
        throw new BadRequestException(
          'بيانات الإجازة غير صالحة (التواريخ أو عدد الأيام) — ارفض الطلب واطلب تقديمه من جديد'
        )
      }
      // إيقاف عن العمل اتسجل بعد تقديم الطلب على نفس الأيام: الاعتماد يترفض قبل كتابة الإجازة أو خصم الرصيد
      await assertLeaveOutsideSuspension(em, req.requesterId, String(payload.fromDate), String(payload.toDate))
      const leave = await em.getRepository(Leave).save({
        requestId: req.id,
        employeeId: req.requesterId,
        leaveTypeCode,
        fromDate: String(payload.fromDate),
        toDate: String(payload.toDate),
        days: leaveDays,
        period,
        isUnpaid: ltDef ? !ltDef.isPaid : false,
        status: 'APPROVED',
        // مرفق «بعد الرجوع» المطلوب بقاعدة النوع: PENDING حتى toDate + المهلة (أو UPLOADED لو أُرفق مع الطلب)
        ...(initialLeaveAttachment(ltDef, { toDate: String(payload.toDate), days: leaveDays }, payload.attachmentUrl) ?? {}),
      })

      if (deductBalance) {
        const lt = await em.getRepository(LeaveType).findOne({
          where: { code: leave.leaveTypeCode },
        })
        const balanceType = lt?.balanceType ?? 'annual'
        if (balanceType !== 'none') {
          // خصم بالطبقات لكل سنة بأيامها (الإجازة اللي بتعدّي السنة — LEV-2):
          // الافتتاحي الساري أولاً ثم استحقاق السنة
          const byYear = this.leaveBalances.splitByYear(
            payload,
            leave.fromDate,
            leaveDays
          )
          for (const [year, d] of Object.entries(byYear)) {
            // نفس تاريخ بوابة الاعتماد (assertLeaveBalance) — وإلا نصيب السنة الجاية
            // يُفحص على 01-01 برصيد متراكم صفر ويفشل التنفيذ بعد نجاح البوابة
            await this.leaveBalances.deduct(
              em,
              req.requesterId,
              balanceType,
              d,
              this.leaveBalances.balanceGateDate(year, leave.fromDate),
              this.leaveBalances.leaveYearStart(year, leave.fromDate)
            )
          }
        }
      }
      return { ref: refOf('LV', leave.id), completed: true }
    }

  // إلغاء إجازة: يلغي الإجازة الأصلية ويرجّع الرصيد — مرة واحدة بس (LEV-7)
  private leaveRestoreHandler: Handler = async (em, req, _type, payload) => {
    const originalLeaveId = Number(payload.leaveId)
    const leave = await em.getRepository(Leave).findOne({
      where: { id: originalLeaveId, employeeId: req.requesterId },
      lock: { mode: 'pessimistic_write' },
    })
    if (!leave) {
      return {
        ref: refOf('LVX', req.id),
        completed: true,
        note: 'الإجازة الأصلية غير موجودة',
      }
    }
    // إجازة اتلغت أو اتسحبت قبل كده: رصيدها رجع وقتها — مايرجعش مرتين
    if (leave.status !== 'APPROVED') {
      return {
        ref: refOf('LVX', leave.id),
        completed: true,
        note: 'الإجازة ملغاة من قبل — الرصيد رجع وقتها',
      }
    }
    leave.status = 'CANCELLED'
    await em.getRepository(Leave).save(leave)

    const lt = await em.getRepository(LeaveType).findOne({
      where: { code: leave.leaveTypeCode },
    })
    const balanceType = lt?.balanceType ?? 'annual'
    if (balanceType !== 'none') {
      // بنفس تقسيم السنين اللي اتخصم بيه
      await this.leaveBalances.restoreLeave(em, leave, balanceType)
    }
    return { ref: refOf('LVX', leave.id), completed: true }
  }

  // ========== الحضور والأوفرتايم ==========

  private overtimeHandler: Handler = async (em, req, _type, payload) => {
    const entries = await em.getRepository(OvertimeEntry).find({ where: { requestId: req.id } })
    const entry = entries.length === 1 ? entries[0] : null
    let steps: Array<{ action?: string; actedAt?: string }> = []
    try { steps = JSON.parse(req.resolvedSteps || '[]') } catch { /* التاريخ التالف لا يُعتمد ضمنياً. */ }
    const stepsComplete = Array.isArray(steps) && steps.length > 0 && steps.every(step => step.action === 'APPROVED' && !!step.actedAt)
    // طلب الفترة المقفولة اللي اتحسب إضافيه وقت الاعتماد = 0: الطلب بيكمل بنتيجة صفر من غير قيمة مالية ولا حجز يوم.
    const zero = entry?.calculationSnapshot?.approvalResult
    if (entry && entry.employeeId === req.requesterId && entry.date === String(payload.date) && ['APPROVED', 'COMPLETED'].includes(req.status) &&
      entry.status === 'CANCELLED' && !entry.calculationSnapshot?.approval && zero?.computedAtApproval === true && zero.approvedMinutes === 0 && stepsComplete) {
      return { ref: refOf('OT', entry.id), completed: true, note: String(zero.message ?? 'الإضافي المحسوب من البصمات = 0 دقيقة') }
    }
    if (!entry || entry.employeeId !== req.requesterId || entry.date !== String(payload.date) ||
      !['APPROVED', 'COMPLETED'].includes(req.status) || entry.status !== 'APPROVED' || !entry.calculationSnapshot?.approval ||
      !Array.isArray(steps) || !steps.length || steps.some(step => step.action !== 'APPROVED' || !step.actedAt)) {
      throw new ConflictException('لا يمكن تنفيذ الإضافي دون سجل واحد ولقطة مالية وخطوات اعتماد مكتملة؛ راجع الطلب القديم قبل المتابعة')
    }
    // وجهة التنفيذ تؤكد نتيجة نفس السجل فقط؛ التسعير والاعتماد حدثا داخل المعاملة الأخيرة.
    overtimeFinancialValue(entry, 0)
    await claimOvertimeDay(em, entry)
    return { ref: refOf('OT', entry.id), completed: true }
  }

  // اعتماد الأوفرتايم المكتشف بالبصمة (بعد مرور طلبه في السلسلة):
  // الإدخال الموجود (BIOMETRIC_DETECTED) يُعتمد بالساعات الفعلية
  private overtimeAutoHandler: Handler = async (em, req, _type, payload) => {
    return this.overtimeHandler(em, req, _type, payload)
  }

  // «دوام يوم عطلة» المعتمد: الأيام تتسجل كأمر لصاحب الطلب (مضاعف الإعداد وقت الاعتماد)، والحساب نفسه
  // من البصمة في مسير الفترة كـ«بدل دوام أيام العطلات» — نفس حساب أوامر الموارد البشرية بالظبط
  private holidayWorkHandler: Handler = async (em, req, _t, payload) => {
    const grant = await recordHolidayWorkRequest(em, req, payload)
    return { ref: refOf('HW', grant.id), completed: true,
      note: `${grant.dates.length} يوم عطلة معتمد — ساعاته بتتحسب من البصمة في المسير كبدل دوام أيام العطلات` }
  }

  private punchCorrectionHandler: Handler = async (em, req, _t, payload) => {
    // نوع البصمة (حضور/انصراف) + وقتها — يُطبَّق فعلياً على حساب اليوم
    const type = String(payload.punchType ?? '').toUpperCase() // IN | OUT
    const time = String(payload.time ?? payload.in ?? payload.out ?? '').trim()
    const corrected =
      type === 'IN'
        ? { in: time || null, out: null }
        : type === 'OUT'
          ? { in: null, out: time || null }
          : { in: payload.in ?? null, out: payload.out ?? null } // توافق قديم
    // تصحيح بلا يوم صالح أو بلا وقت HH:MM كان يُحفظ ويكتمل الطلب بلا أي أثر على اليوم
    // (محرك الحضور يتجاهل التالف) — يُرفض ليبقى في الصندوق للإرجاع
    const hhmm = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/
    if (!isValidYmd(String(payload.date ?? '')) || String(payload.date) > localDateOf(new Date())) {
      throw new BadRequestException('تاريخ البصمة المطلوب تصحيحها غير صالح أو في المستقبل')
    }
    if (![corrected.in, corrected.out].some(value => value != null) ||
      [corrected.in, corrected.out].some(value => value != null && !hhmm.test(String(value)))) {
      throw new BadRequestException('نوع البصمة (حضور/انصراف) ووقتها بصيغة HH:MM مطلوبان')
    }
    const row = await em.getRepository(AttendanceCorrection).save({
      requestId: req.id,
      employeeId: req.requesterId,
      date: String(payload.date),
      reason: String(payload.reason ?? '').slice(0, 500),
      correctedPunch: JSON.stringify(corrected),
    })
    return { ref: refOf('AC', row.id), completed: true }
  }

  // ========== المالية ==========

  private async loanRequestActor(em: EntityManager, req: Request): Promise<number | null> {
    if (!em.queryRunner?.isTransactionActive || req.status !== 'APPROVED') throw new BadRequestException('تنفيذ حركة السلفة يتطلب طلبًا معتمدًا داخل معاملته')
    // المعتمد من سجل القرار الحقيقي؛ حمولة الطلب لا تحدد هوية المعتمد أو صلاحياته.
    const decision = await em.getRepository(RequestApproval).findOne({ where: { requestId: req.id, action: 'APPROVED' }, order: { id: 'DESC' } })
    return decision?.approverId ?? null
  }

  private loanDeferralHandler: Handler = async (em, req, type, payload) => {
    if (req.typeCode !== LOAN_DEFERRAL_TYPE || type.code !== LOAN_DEFERRAL_TYPE) throw new BadRequestException('نوع طلب تأجيل القسط غير صحيح')
    const actorId = await this.loanRequestActor(em, req)
    const staged = readStoredLoanDeferralPayload(payload, true)
    const evidence = staged.deferralEvidence!
    const result = await deferLoanInstallment(em, { employeeId: req.requesterId, loanId: evidence.loanId,
      installmentId: evidence.installmentId, expectedRevision: evidence.sourceRevision, expectedAmount: evidence.amount, toPeriod: evidence.toPeriod,
      requestId: req.id, actorId, reason: staged.reason! })
    return { ref: refOf('LDEFER', result.eventId), completed: true }
  }

  private loanHandler: Handler = async (em, req, _t, payload) => {
    const actorId = await this.loanRequestActor(em, req)
    if (req.typeCode === 'EARLY_LOAN_SETTLEMENT' || _t.destinationHandler === 'loan_early_settlement') {
      // AD-14 (C6): المبلغ الفارغ = سداد كلي؛ الجزئي بمبلغ ومرجع وطريقة (تقصير المدة أو تخفيض القسط).
      const early = readEarlySettlementPayload(payload, req.id)
      await repayLoanEarly(em, { employeeId: req.requesterId, loanId: early.loanId, amount: early.amount, reference: early.reference!,
        method: early.method, mode: early.mode, requestId: req.id, actorId, reason: String(payload.reason ?? 'سداد سلفة مبكر معتمد').trim() })
      return { ref: refOf('LN', early.loanId), completed: true }
    }
    // إعادة تنفيذ الطلب لا تعيد تشكيل مبلغ أو جدول سلفة أنشئت بالفعل.
    const existing = await em.getRepository(Loan).find({ where: { requestId: req.id }, select: { id: true, employeeId: true } })
    if (existing.length > 1 || existing.some(loan => loan.employeeId !== req.requesterId)) throw new ConflictException('مرجع طلب السلفة مرتبط بسجل مالي غير متسق')
    if (existing.length) return { ref: refOf('LN', existing[0].id), completed: true }
    // AD-07/09 (C6): المبلغ المعتمد (قد يكون مخفّضًا عن المطلوب) وشهر أول قسط ولقطة السقوف والاستثناء.
    const schedule = readApprovedLoanRequest(payload)
    const open = (await readLoanInstallmentPositions(em, req.requesterId)).filter(row => row.financialStatus === 'DUE' && row.remainingAmount !== '0.00')
    if (open.length + schedule.months > 1000) throw new BadRequestException('إجمالي الأقساط المفتوحة بعد السلفة يتجاوز الحد التقني1000؛ قلل المدة أو أغلق الأقساط القائمة أولًا')
    const start = new Date()
    // الافتراضي كما كان: أول قسط في الشهر التالي للاعتماد؛ الموارد البشرية تحدد شهرًا آخر.
    const [firstYear, firstMonth] = schedule.firstInstallmentPeriod
      ? [Number(schedule.firstInstallmentPeriod.slice(0, 4)), Number(schedule.firstInstallmentPeriod.slice(5, 7)) - 1]
      : [start.getFullYear(), start.getMonth() + 1]
    const firstDue = new Date(firstYear, firstMonth, 1)
    const firstInstallmentPeriod = `${firstDue.getFullYear()}-${String(firstDue.getMonth() + 1).padStart(2, '0')}`
    // CAST للنص يحفظ قروش DECIMAL(18,2) دون تحويل مبلغ SQL إلى Number.
    const inserted = await em.query(`INSERT INTO [loans] ([requestId], [employeeId], [amount], [status], [requestedAmount], [isExceptional], [exceptionalCategory],
      [exceptionalReason], [firstInstallmentPeriod], [installmentMonths], [capSnapshot], [createdByUserId])
      OUTPUT INSERTED.[id] AS [id] VALUES (@0, @1, CAST(@2 AS decimal(18,2)), @3, CAST(@4 AS decimal(18,2)), @5, @6, @7, @8, @9, @10, @11)`,
    [req.id, req.requesterId, schedule.amount, 'APPROVED', schedule.requestedAmount, schedule.exceptional, schedule.exceptionalCategory,
      schedule.exceptionalReason, firstInstallmentPeriod, schedule.months, schedule.capSnapshot, req.createdByUserId ?? null])
    const loanId = Number(inserted[0]?.id)
    if (!Number.isInteger(loanId) || loanId <= 0) throw new Error('لم يرجع حفظ السلفة معرفًا صالحًا')
    const rows: Array<{ dueDate: string; amount: string }> = []
    for (let i = 0; i < schedule.months; i++) {
      const due = new Date(firstYear, firstMonth + i, 1)
      const dueDate = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-01`
      rows.push({ dueDate, amount: schedule.amounts[i] })
    }
    // دفعات محدودة من معاملات SQL؛ يبدأ كل قسط جديد برصيد واضح ومراجعة أولى.
    for (let offset = 0; offset < rows.length; offset += 50) {
      const parameters: unknown[] = [], values = rows.slice(offset, offset + 50).map(row => {
        const index = parameters.length
        parameters.push(loanId, row.dueDate, row.amount)
        return `(@${index}, @${index + 1}, CAST(@${index + 2} AS decimal(18,2)), 0, CAST('0.00' AS decimal(18,2)), N'DUE', 1, NULL, @${index + 1}, NULL)`
      })
      await em.query(`INSERT INTO [loan_installments] ([loanId], [dueDate], [amount], [paid], [paidAmount], [financialStatus], [financialRevision], [parentInstallmentId], [originalDueDate], [paidAt]) VALUES ${values.join(', ')}`, parameters)
    }
    return { ref: refOf('LN', loanId), completed: true }
  }

  private salaryUpdateHandler: Handler = async (em, req, _t, payload) => {
    return executeSalaryChangeRequest(em, req, payload, localDateOf(new Date()))
  }

  // ========== الحالة الوظيفية ==========

  private transferHandler: Handler = async (em, req, _t, payload) => {
    const { emp, department } = await validateTransfer(em, req, payload, true)
    const effectiveDate = String(payload.effectiveDate)
    const today = localDateOf(new Date())
    // نقل لفرع تاني وجدول الموظف خاص بفرعه القديم: يترفض من الاعتماد بدل ما يفشل التنفيذ المجدول بعدين
    // الرسالة بتاعة طلب النقل: جدول لكل الشركة الأول، وجدول الفرع الجديد بعد التنفيذ (قبله بيترفض)
    if (emp.branchId !== department.branchId) await assertEmployeeSchedulesFitBranch(em, emp, department.branchId, effectiveDate, 'transfer')
    const transfer = await em.getRepository(Transfer).save({
      requestId: req.id,
      employeeId: emp.id,
      fromTeam: emp.teamId ?? null,
      toTeam: Number(payload.toTeamId),
      effectiveDate,
      status: 'SCHEDULED',
    })

    // §7.2: التنفيذ الآلي بتاريخ السريان — لو التاريخ حل نفّذ فوراً،
    // غير كده يبقى الطلب IN_EXECUTION والـ scheduler اليومي ينفّذه
    if (effectiveDate <= today) {
      await this.executeTransfer(em, transfer.id)
      return { ref: refOf('TR', transfer.id), completed: true }
    }
    return {
      ref: refOf('TR', transfer.id),
      completed: false,
      note: `مجدول للتنفيذ في ${effectiveDate}`,
    }
  }

  // النقل يغير الهيكل كاملاً وحساب الدخول في المعاملة نفسها؛ الفرع الجديد يبطل التوكن القديم.
  async executeTransfer(em: EntityManager, transferId: number): Promise<boolean> {
    // قراءة الهوية قبل أي صف مقفل، ثم القفل المالي المشترك مع الحضور ومسير الأجر.
    const identity = await em.getRepository(Transfer).findOne({ where: { id: transferId }, select: { id: true, employeeId: true, status: true } })
    if (!identity || identity.status !== 'SCHEDULED') return false
    await lockPayrollEmployees(em, [identity.employeeId])
    const transfer = await em.getRepository(Transfer).findOne({
      where: { id: transferId },
      lock: { mode: 'pessimistic_write' },
    })
    if (!transfer || transfer.status !== 'SCHEDULED' || transfer.effectiveDate > localDateOf(new Date())) return false
    const original = transfer.requestId && await em.getRepository(Request).findOne({ where: { id: transfer.requestId } })
    const req = original || Object.assign(new Request(), { id: 0, requesterId: transfer.employeeId })
    const { emp, team, department, managerId } = await validateTransfer(em, req, {
      employeeId: transfer.employeeId, toTeamId: transfer.toTeam, effectiveDate: transfer.effectiveDate,
    }, true, transfer.id)
    const changes = { teamId: team.id, departmentId: department.id, branchId: department.branchId, managerEmployeeId: managerId as any }
    let calendarActor: number | null = null
    if (emp.branchId !== department.branchId) {
      // جدول خاص بفرع يتسند لموظفي فرعه بس: الموظف مايتنقلش لفرع تاني وهو على جدول فرعه القديم
      await assertEmployeeSchedulesFitBranch(em, emp, department.branchId, transfer.effectiveDate, 'transfer')
      const decisions = em.getRepository(RequestApproval)
      const decision = original && await decisions.findOne({ where: { requestId: original.id, action: 'APPROVED' }, order: { id: 'DESC' } })
      const returned = original && await decisions.findOne({ where: { requestId: original.id, action: 'RETURNED_FOR_INFO' }, order: { id: 'DESC' } })
      calendarActor = decision && (!returned || decision.id > returned.id) ? decision.approverId : null
      if (!Number.isInteger(calendarActor) || !calendarActor || calendarActor < 1) throw new ConflictException('لا يوجد قرار اعتماد موثق لهوية منفذ النقل؛ يلزم مراجعة الطلب القديم قبل تغيير فرع الموظف')
    }
    await recordEmploymentChanges(em, req, emp, changes, 'نقل معتمد — تنفيذ بتاريخ السريان')
    await em.getRepository(Employee).update({ id: emp.id }, changes)
    if (emp.branchId !== department.branchId) {
      await appendEmployeeOrgCalendar(em, { employeeId: emp.id, beforeBranchId: emp.branchId, branchId: department.branchId,
        effectiveFrom: transfer.effectiveDate, reason: `نقل معتمد بطلب ${req.id} بتاريخ السريان`, actorUserId: calendarActor! })
      const users = await em.getRepository(User).find({ where: { employeeId: emp.id } })
      for (const user of users) {
        user.branchId = department.branchId
        user.tokenVersion = (user.tokenVersion || 0) + 1
        await em.getRepository(User).save(user)
      }
    }
    transfer.status = 'EXECUTED'
    transfer.executedAt = new Date()
    await em.getRepository(Transfer).save(transfer)
    return true
  }

  private promotionHandler: Handler = async (em, req, _t, payload) => {
    await validateEmploymentRequest(em, req, _t, true)
    const effectiveDate = employmentEffectiveDate(_t, payload)
    if (effectiveDate > localDateOf(new Date())) return {
      ref: refOf(_t.destinationHandler === 'employee_update' ? 'TITLE' : 'PR', req.id), completed: false,
      note: `مجدول للتنفيذ في ${effectiveDate}`,
    }
    const emp = await em.getRepository(Employee).findOne({
      where: { id: req.requesterId },
    })
    if (!emp) throw new BadRequestException('الموظف المستهدف غير موجود')
    // المسمى يُكتب في ملف الموظف ويُطبع في المستندات (SEC-EMP-2)
    const toTitle = assertJobTitle(payload.toTitle)
    if (_t.destinationHandler === 'employee_update') {
      await recordEmploymentChanges(em, req, emp, { jobTitle: toTitle }, 'تغيير مسمى معتمد')
      await em.getRepository(Employee).update(emp.id, { jobTitle: toTitle })
      return { ref: refOf('TITLE', req.id), completed: true }
    }
    const promo = await em.getRepository(Promotion).save({
      requestId: req.id,
      employeeId: emp.id,
      fromTitle: emp.jobTitle ?? '',
      toTitle,
      effectiveDate,
    })
    await recordEmploymentChanges(em, req, emp, { jobTitle: toTitle }, 'ترقية معتمدة')
    emp.jobTitle = toTitle
    await em.getRepository(Employee).save(emp)
    return { ref: refOf('PR', promo.id), completed: true }
  }

  // تحديث بيانات الموظف (حقول معالجه في RECORD_UPDATE_FIELDS فقط) + سجل تدقيق
  private employeeRecordHandler =
    (fields: Record<string, keyof Employee>): Handler =>
    async (em, req, _t, payload) => {
      const emp = await em.getRepository(Employee).findOne({
        where: { id: req.requesterId },
        // Different requests may update this employee concurrently. Read the
        // committed value under the same lock used through data/audit writes.
        lock: { mode: 'pessimistic_write' },
      })
      if (!emp) throw new BadRequestException('الموظف المطلوب تحديث بياناته غير موجود')
      const changes: { fieldName: string; oldValue: unknown; newValue: unknown }[] = []
      for (const [key, col] of Object.entries(fields)) {
        // الشاشة ترسل كل حقول النموذج، والحقل الذي تركه الموظف فارغًا يصل ''. النص الفارغ = «لم يُطلب
        // تغييره» — كان يمسح العنوان/الهاتف المحفوظ بصمت عند الاعتماد. المسح الصريح (REQ-10) بقيمة null فقط
        const raw = payload[key]
        if (raw === undefined) continue
        const next = raw === null ? null : recordValue(raw)
        if (raw !== null && next === null) continue
        if ((next ?? null) !== ((emp as any)[col] ?? null)) {
          changes.push({ fieldName: col, oldValue: (emp as any)[col], newValue: next })
          ;(emp as any)[col] = next
        }
      }
      if (!changes.length) throw new BadRequestException('لم تتغير أي بيانات في الطلب')
      await em.getRepository(Employee).save(emp)
      let hist!: EmployeeStatusHistory
      for (const change of changes) hist = await recordEmployeeChange(em, {
        employeeId: emp.id, ...change, reason: 'تحديث بيانات معتمد', requestId: req.id,
      })
      return { ref: refOf('EMP', hist.id), completed: true }
    }

  // المسار الأمني: تغيير الحساب البنكي — بعد الدورة الأمنية فقط
  private bankChangeHandler: Handler = async (em, req, _t, payload) => {
    const emp = await em.getRepository(Employee).findOne({
      where: { id: req.requesterId },
    })
    if (!emp) throw new BadRequestException('الموظف المطلوب تغيير حسابه البنكي غير موجود')
    // نفس regex الـDTO — ويُتحقق منه عند التقديم أيضاً (SEC-EMP-2)
    const iban = assertIban(payload.iban)
    const old = emp.iban
    emp.iban = iban
    if (payload.bankName) emp.bankName = assertBankName(payload.bankName)
    await em.getRepository(Employee).save(emp)
    const hist = await recordEmployeeChange(em, {
      employeeId: emp.id,
      fieldName: 'iban', oldValue: old, newValue: emp.iban,
      reason: 'تغيير حساب بنكي — مسار أمني',
      requestId: req.id,
    })
    return { ref: refOf('BNK', hist.id), completed: true }
  }

  // تغيير الحالة الوظيفية: استقالة → فترة إشعار + فتح إخلاء الطرف أوتوماتيك
  private employeeStatusHandler: Handler = async (em, req, type, payload) => {
    const emp = await em.getRepository(Employee).findOne({
      where: { id: req.requesterId },
    })
    if (!emp) throw new BadRequestException('الموظف المطلوب تغيير حالته غير موجود')
    const ending = type.code === 'RESIGNATION' || type.code === 'RETIREMENT'
    const lastWorkingDay = String(payload.lastWorkingDate ?? payload.effectiveDate ?? '')
    if (ending) {
      if (!isValidYmd(lastWorkingDay) || (emp.joinDate && lastWorkingDay < emp.joinDate)) {
        throw new BadRequestException('آخر يوم عمل مطلوب ولا يسبق تاريخ التعيين')
      }
      const existing = await em.getRepository(OffboardingCase).findOne({
        where: { employeeId: emp.id, status: In(OPEN_CASE_STATUSES) },
      })
      if (existing) throw new BadRequestException('يوجد ملف إنهاء خدمة مفتوح بالفعل')
    }
    const oldStatus = emp.status
    const newStatus =
      ending
        ? 'notice_period'
        : String(payload.newStatus ?? emp.status)
    emp.status = newStatus as any
    if (newStatus === 'archived') {
      emp.isActive = false
      emp.archivedAt = new Date()
      emp.archiveReason =
        type.code === 'RETIREMENT'
          ? 'تقاعد'
          : String(payload.reason ?? type.nameAr)
      // عطّل حساب الدخول المرتبط — المؤرشف لا يسجّل دخولاً بعد الآن
      await em
        .getRepository(User)
        .update({ employeeId: emp.id }, { isActive: false })
    }
    await em.getRepository(Employee).save(emp)
    const hist = await recordEmployeeChange(em, {
      employeeId: emp.id,
      fieldName: 'status', oldValue: oldStatus, newValue: newStatus,
      reason:
        type.code === 'RESIGNATION'
          ? `استقالة — آخر يوم عمل ${payload.lastWorkingDate ?? '—'}: ${payload.reason ?? ''}`
          : String(payload.reason ?? type.nameAr),
      requestId: req.id,
    })

    // §2.7: الاستقالة المعتمدة تفتح حالة إخلاء طرف بجهاتها الخمس — نفس فاتح ملف
    // الإنهاء من طرف الشركة (EMP-1)، والسبب «استقالة» يحدد معامل المكافأة (EMP-2)
    if (ending) {
      const existing = await em.getRepository(OffboardingCase).findOne({
        where: { employeeId: emp.id, status: In(OPEN_CASE_STATUSES) },
      })
      if (!existing) {
        const kase = await openOffboardingCase(em, {
          employeeId: emp.id,
          resignationRequestId: req.id,
          terminationReason: type.code === 'RETIREMENT' ? 'retirement' : 'resignation',
          lastWorkingDay,
        })
        return {
          ref: refOf('OFB', kase.id),
          completed: true,
          note: 'فُتحت حالة إخلاء الطرف',
        }
      }
    }
    return { ref: refOf('ST', hist.id), completed: true }
  }

  // ========== الخطابات ==========

  private letterHandler: Handler = (em, req, type, payload) => this.letters.generate(em, req, type, payload)

  // ========== العهدة ==========

  // تسليم عهدة: الموظف اختار أصولاً متاحة من الكتالوج —
  // الاعتماد يحوّلها تلقائياً لإسنادات بانتظار تأكيد الاستلام
  private custodyAssignHandler: Handler = async (em, req, _t, payload) => {
    const ids: number[] = Array.isArray(payload.assetIds)
      ? payload.assetIds.map(Number).filter(Boolean)
      : payload.assetId
        ? [Number(payload.assetId)]
        : []
    // طلب عهدة بلا أصول كان يكتمل «مكتمل» بلا أي إسناد (REQ-3)
    if (ids.length === 0) throw new BadRequestException('لم تُحدد أصول في طلب العهدة — أرجعه لاختيار الأصول')
    let firstId = 0
    for (const assetId of ids) {
      const asset = await em.getRepository(Asset).findOne({
        where: { id: assetId },
      })
      if (!asset) {
        throw new Error(`الأصل #${assetId} غير موجود`)
      }
      if (asset.status !== 'AVAILABLE' || asset.currentHolderId) {
        throw new Error(
          `«${asset.name}» لم يعد متاحاً في المخزون — راجع الكتالوج`
        )
      }
      // الحارس الحاسم: يبقى الأصل AVAILABLE طوال PENDING_ACK، فطلبان لنفس
      // الأصل قد يمرّان معاً وقت التقديم — نمنع الازدواج هنا (وقت التنفيذ) بفحص
      // وجود إسناد مفتوح، فالطلب الثاني يفشل بدل إنشاء إسناد ثانٍ لنفس الأصل
      const open = await em.getRepository(CustodyAssignment).findOne({
        where: {
          assetId,
          status: In([
            'PENDING_ACK',
            'PENDING_MANAGER_CONFIRM',
            'ACTIVE',
            'RETURN_REQUESTED',
          ]),
        },
      })
      if (open) {
        throw new BadRequestException(
          `«${asset.name}» له إسناد عهدة مفتوح بالفعل — لا يُسنَد لموظفين`
        )
      }
      const row = await em.getRepository(CustodyAssignment).save({
        requestId: req.id,
        assetId,
        employeeId: req.requesterId,
        status: 'PENDING_ACK',
      })
      if (!firstId) firstId = row.id
    }
    return {
      ref: refOf('CU', firstId),
      completed: false,
      note: `${ids.length} أصل بانتظار تأكيد استلام الموظف`,
    }
  }

  // إرجاع عهدة
  private custodyReturnHandler: Handler = async (em, req, _t, payload) => {
    const assignmentId = Number(payload.assignmentId)
    if (!Number.isSafeInteger(assignmentId) || assignmentId <= 0) throw new BadRequestException('إسناد العهدة مطلوب')
    const found = await em.getRepository(CustodyAssignment).findOneBy({ id: assignmentId, employeeId: req.requesterId })
    if (!found) throw new BadRequestException('إسناد العهدة غير موجود أو ليس باسم صاحب الطلب')
    const asset = await em.getRepository(Asset).findOne({ where: { id: found.assetId }, lock: { mode: 'pessimistic_write' } })
    const row = await em.getRepository(CustodyAssignment).findOne({
      where: {
        id: assignmentId,
        employeeId: req.requesterId,
      },
    })
    if (!row || !['ACTIVE', 'RETURN_REQUESTED'].includes(row.status)) throw new BadRequestException('العهدة ليست نشطة أو بانتظار الإرجاع')
    if (!asset || asset.status === 'RETIRED' || (asset.currentHolderId && asset.currentHolderId !== row.employeeId)) throw new BadRequestException('حالة الأصل لا تطابق العهدة المطلوب إرجاعها')
    const pending = await em.getRepository(CustodyAssignment).count({ where: { assetId: row.assetId, id: Not(row.id), status: In(['ACTIVE', 'PENDING_ACK', 'PENDING_MANAGER_CONFIRM', 'RETURN_REQUESTED']) } })
    if (pending) throw new BadRequestException('للأصل نقل أو إسناد آخر مفتوح — ألغِ النقل أو أكمله قبل الإرجاع')
    if (payload.condition != null && (typeof payload.condition !== 'string' || payload.condition.length > 100)) throw new BadRequestException('وصف حالة العهدة بحد أقصى 100 حرف')
    row.status = 'RETURNED'
    row.returnedAt = new Date()
    row.condition = String(payload.condition ?? 'سليمة')
    await em.getRepository(CustodyAssignment).save(row)
    await em
      .getRepository(Asset)
      .update(
        { id: row.assetId },
        { currentHolderId: null as any, status: 'AVAILABLE' }
      )
    return { ref: refOf('CUR', row.id), completed: true }
  }

  // الحامل الحالي يبقى مسؤولاً عن الأصل حتى قبول المستلم واعتماد مديره.
  private custodyTransferHandler: Handler = async (em, req, _t, payload) => {
    const created = await startCustodyTransfer(em, Number(payload.assignmentId), Number(payload.toEmployeeId), req)
    return {
      ref: refOf('CUT', created.id),
      completed: false,
      note: 'بانتظار قبول الموظف المستلم ثم اعتماد مديره',
    }
  }

  // ========== سجل الـ handlers — الأكواد من كتالوج الطلبات ==========

  // ========== المالية → دفتر المديونيات ==========

  // بند مالي لمرة واحدة (مكافأة/بدل/مصروفات/تسوية) → قيد PENDING في الدفتر
  // يستهلكه المسير. payload: amount (>0)، type اختياري لتجاوز الافتراضي.
  private obligationHandler =
    (defaultType: ObligationType, category: string, labelPrefix: string): Handler =>
    async (em, req, _t, payload) => {
      // صرف المصروفات/البدل هو أثر الطلب الوحيد: مبلغ غير موجب أو غير رقمي كان يكتمل «سجل عام»
      // بلا قيد (المعتمد يظن أنه صرف) — يُرفض ليبقى الطلب في الصندوق للإرجاع أو الرفض (REQ-3)
      const amount = obligationAmount(payload.amount)
      // SEC ٤-أ بند 6 / الخطوة 25: نوع القيد من تعريف الوجهة فقط — payload.type من العميل
      // كان يحوّل مكافأة/بدل/مصروفات معتمدة إلى خصم DEBIT؛ الخصم يمر من الخصومات المصنفة
      const type: ObligationType = defaultType
      const text = String(payload.reason || payload.description || '').trim()
      const effectiveDate = typeof payload.effectiveDate === 'string' && isValidYmd(payload.effectiveDate) ? payload.effectiveDate : null
      await em.getRepository(EmployeeObligation).save({
        employeeId: req.requesterId,
        type,
        category,
        amount,
        // عمود البيان 300 حرف — الوصف الطويل كان يُسقط الاعتماد بخطأ داخلي
        label: `${labelPrefix}${text ? ': ' + text : ''}`.slice(0, 300),
        status: 'PENDING',
        sourceRequestId: req.id,
        effectiveDate: effectiveDate as string,
      })
      return {
        ref: refOf('REQ', req.id),
        completed: true,
        note: `${type === 'DEBIT' ? 'خصم' : 'إضافة'} ${amount} في دفتر المديونيات`,
      }
    }

  // C4 / الخطوة 27 (مراجعة ⑧): اعتماد طلب BONUS قديم من محرك الطلبات. القيد للموظف المختار في الحمولة (لا لمقدم الطلب)
  // إن كان موظفًا موجودًا، وبشهر مسير يوم الاعتماد وبداية دورته حتى لا يدخل مسودة شهر سابق. النوع CREDIT دائمًا.
  private legacyBonusHandler: Handler = async (em, req, _t, payload) => {
    const amount = Number(payload.amount ?? 0)
    const chosen = Number(payload.employeeId)
    const exists = Number.isSafeInteger(chosen) && chosen > 0 && (await em.getRepository(Employee).count({ where: { id: chosen } })) === 1
    const employeeId = exists ? chosen : req.requesterId
    if (amount > 0) {
      const cycleRow = await em.getRepository(RequestsConfig).findOne({ where: { key: 'payroll.cycle_start_day' } })
      const cycle = Number(cycleRow?.value ?? '23')
      const cycleStartDay = Number.isInteger(cycle) && cycle >= 1 && cycle <= 31 ? cycle : 23
      const targetPeriod = payrollPeriodOfDate(new Date().toLocaleDateString('en-CA'), cycleStartDay)
      await em.getRepository(EmployeeObligation).save({
        employeeId,
        type: 'CREDIT',
        category: 'bonus',
        amount: Math.round(amount * 100) / 100,
        label: `مكافأة${payload.reason ? ': ' + payload.reason : ''}`.slice(0, 300),
        status: 'PENDING',
        sourceRequestId: req.id,
        effectiveDate: salaryPayrollPeriodBounds(targetPeriod, cycleStartDay).startDate,
        targetPeriod,
      })
    }
    return {
      ref: refOf('REQ', req.id),
      completed: true,
      note: amount > 0 ? `إضافة مكافأة ${amount} للموظف #${employeeId} في دفتر المديونيات` : 'بلا مبلغ — سجل عام',
    }
  }

  // بلاغ فقد/تلف العهدة المعتمد: يعلّم الإسناد LOST، يقاعِد الأصل، ويقيّد قيمته
  // كمديونية DEBIT على حائز العهدة يستهلكها المسير
  private custodyFinanceHandler: Handler = async (em, req, _t, payload) => {
    // البلاغ عن عهدة صاحب الطلب النشطة فقط، ومرة واحدة: بلا هذا كان بلاغ على إسناد موظف آخر
    // يقيّد قيمة الأصل عليه، والبلاغ على عهدة مُرجَعة أو مبلَّغ عنها يقيّد مديونية ثانية
    // والأصل في المخزن، والإسناد غير المحدد يكتمل «بلا أثر» (REQ-3)
    const assignmentId = Number(payload.assignmentId)
    if (!Number.isSafeInteger(assignmentId) || assignmentId <= 0) throw new BadRequestException('إسناد العهدة المبلَّغ عنها مطلوب')
    const found = await em.getRepository(CustodyAssignment).findOneBy({ id: assignmentId, employeeId: req.requesterId })
    if (!found) throw new BadRequestException('إسناد العهدة غير موجود أو ليس باسم صاحب البلاغ')
    const asset = await em.getRepository(Asset).findOne({ where: { id: found.assetId }, lock: { mode: 'pessimistic_write' } })
    const row = await em.getRepository(CustodyAssignment).findOneBy({ id: assignmentId, employeeId: req.requesterId })
    if (!row || !['ACTIVE', 'RETURN_REQUESTED'].includes(row.status)) {
      throw new BadRequestException('العهدة ليست بحوزة الموظف حاليًا (مُرجَعة أو مبلَّغ عنها من قبل أو لم يؤكَّد استلامها) — لا يُقيَّد فقدها')
    }
    if (!asset || asset.status === 'RETIRED' || (asset.currentHolderId && asset.currentHolderId !== row.employeeId)) {
      throw new BadRequestException('حالة الأصل لا تطابق العهدة المبلَّغ عنها — راجع المخزون')
    }
    const pending = await em.getRepository(CustodyAssignment).count({ where: { assetId: row.assetId, id: Not(row.id), status: In(['ACTIVE', 'PENDING_ACK', 'PENDING_MANAGER_CONFIRM', 'RETURN_REQUESTED']) } })
    if (pending) throw new BadRequestException('للأصل نقل أو إسناد آخر مفتوح — ألغِ النقل أو أكمله قبل بلاغ الفقد')
    row.status = 'LOST'
    row.returnedAt = new Date()
    // عمود الحالة 100 حرف — الوصف الطويل كان يُسقط الاعتماد بخطأ داخلي
    row.condition = String(payload.description ?? 'مفقودة').trim().slice(0, 100) || 'مفقودة'
    await em.getRepository(CustodyAssignment).save(row)
    await em
      .getRepository(Asset)
      .update({ id: row.assetId }, { currentHolderId: null as any, status: 'RETIRED' })
    const val = Number(asset.value ?? 0)
    if (val > 0) {
      await em.getRepository(EmployeeObligation).save({
        employeeId: row.employeeId,
        type: 'DEBIT',
        category: 'custody_shortfall',
        amount: Math.round(val * 100) / 100,
        label: `قيمة عهدة مفقودة/تالفة: ${asset?.name ?? '#' + row.assetId}`,
        status: 'PENDING',
        sourceRequestId: req.id,
        sourceRef: `asset:${row.assetId}`,
      })
    }
    return {
      ref: refOf('REQ', req.id),
      completed: true,
      note: val > 0 ? `قُيّدت ${val} كمديونية عهدة على الموظف` : 'الأصل بلا قيمة مسجلة',
    }
  }

  private readonly handlers: Record<string, Handler> = {
    // إجازات
    leave_deduct_balance: this.leaveHandler(true),
    leave_no_balance: this.leaveHandler(false),
    leave_calendar_balance: this.leaveHandler(true),
    leave_calendar: this.leaveHandler(true),
    leave_calendar_payroll: this.leaveHandler(false),
    leave_calendar_once: this.leaveHandler(false),
    leave_balance_restore: this.leaveRestoreHandler,
    // حضور
    overtime_entries: this.overtimeHandler,
    overtime_auto: this.overtimeAutoHandler,
    attendance_corrections: this.punchCorrectionHandler,
    holiday_work: this.holidayWorkHandler,
    // مالية
    loans_installments: this.loanHandler,
    loan_early_settlement: this.loanHandler,
    loan_installment_defer: this.loanDeferralHandler,
    salary_update_history: this.salaryUpdateHandler,
    // حالة وظيفية
    transfers_effective_date: this.transferHandler,
    employee_update_promotions: this.promotionHandler,
    employee_update: this.promotionHandler,
    contracts_register: executeContract,
    shift_schedule: executeShiftSwap,
    // بيانات شخصية
    employee_record: this.employeeRecordHandler(RECORD_UPDATE_FIELDS.employee_record),
    employee_record_auto: this.employeeRecordHandler(
      RECORD_UPDATE_FIELDS.employee_record_auto
    ),
    payroll_bank_secure: this.bankChangeHandler,
    // حالة وظيفية (استقالة/تقاعد)
    employee_status: this.employeeStatusHandler,
    // خطابات
    letter_pdf_generator: this.letterHandler,
    // عهدة
    custody_assignments_ack: this.custodyAssignHandler,
    custody_assignments: this.custodyReturnHandler,
    custody_return: this.custodyReturnHandler,
    custody_transfer: this.custodyTransferHandler,
    custody_finance: this.custodyFinanceHandler,
    // مالية → دفتر المديونيات (بنود لمرة واحدة يستهلكها المسير)
    // C4 / الخطوة 27: الطلبات القديمة فقط (الإنشاء الجديد مقفول ويمر من موديول المكافآت)
    payroll_bonus: this.legacyBonusHandler,
    payroll_allowance: this.obligationHandler('CREDIT', 'allowance', 'بدل'),
    expense_register: this.obligationHandler('CREDIT', 'expense', 'مصروفات'),
    payroll_adjustment: this.obligationHandler('CREDIT', 'adjustment', 'تسوية'),
    // الباقي (تدريب/ER...) يسقط على السجل العام REQ لحين بناء موديولاته
  }
}

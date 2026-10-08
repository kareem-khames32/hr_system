import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, inBranchScope, userHasPerm } from '../auth/guards'
import { LOAN_DEFERRAL_TYPE } from '../requests/loan-installment-requests'
import { confidentialTexts, scrubConfidentialTexts } from './confidential-text'
import { Employee } from './employee.entity'
import { readGosiFirstRegistered } from './employee-gosi-registration'
import { partialMaskingOn } from './employee-privacy'
import { canSeeEmployeesFinance, projectEmployee } from './employee-projection'

// B4.8 (أ): تصدير بيانات موظف واحد كاملة (طلب اطلاع — C-EG-08، C-SA-08). قراءة بس: ملف الموظف وكل سجلاته اللي عليها رقمه، من الجداول
// الموجودة فعلًا في القاعدة (الجدول أو العمود الناقص بيتعدّى). للي معاه «تعديل الموظفين» وفرع الموظف في نطاقه، وكل تصدير في سجل التدقيق.
// مش في الملف: حسابات الدخول، وملفات القضايا والتحقيقات وتقييمات الغير (فيها بيانات ناس تانية)، والملفات المرفوعة نفسها (مراجعها بس)،
// والطلبات السرّية (بتتقري من أطرافها بس). والأقسام المالية والجزاءات بتطلع للي معاه صلاحيتها بس — اللي اتشال بيتقال في `omitted`.
// P4A-B04: السرّية بحكم تعريف الطلب الفعلي (definitionCode ثم typeCode — زي شاشة الطلب)، وأي سجل اتعمل من طلب سري (عمود requestId) برّه كمان.
// P4C-B01: رابط إنشاء الصف مابيحميش نص اتنسخ له بعدين بالتحديث (سبب حذف معال، وصف فقد عهدة، سبب أرشفة في ملف الموظف) — فأي خانة نصية
// في ملف الموظف أو في أي قسم فيها نص سردي من طلب سري له بتطلع محجوبة (`confidential-text.ts`). وP4C-N02: أقساط السلف بتتصدّر عن طريق سلفتها.
// P4B-B01: «سجل اتعمل من طلب سري» بكل أعمدة الربط الفعلية للطلب (مش `requestId` بس — قيد الدفتر بيشاور بـ`sourceRequestId`)، وبالقفزة التانية
// (قسط السلفة ← السلفة ← الطلب). وP4B-N01: لو SQL اختار التصدير ضحية تعارض أقفال (1205) بيتعاد كله من الأول — التصدير قراءة وماكتبش حاجة.
// P4A-B05: التصدير كله في معاملة واحدة ماسكة صف الموظف — حكم النطاق والبيانات المصدّرة من نفس اللحظة، ونقل الفرع بيستنى لحد ما التصدير يخلص.

/** access: القسم محتاج صلاحية زيادة عن «تعديل الموظفين» — finance (البيانات المالية) أو penalties (لائحة الجزاءات) */
export interface EmployeeDataSection {
  key: string; label: string; table: string; column: string; access?: 'finance' | 'penalties'
  /** الجدول مالوش عمود موظف: سطوره لسطور الموظف في الجدول الأب (القسط ← السلفة). column هنا هو عمود الربط بالأب */
  owner?: { table: string; column: string }
}
const FINANCE_SECTIONS: readonly string[] = ['salaryHistory', 'paymentChanges', 'loans', 'loanInstallments', 'deductions', 'bonuses', 'obligations', 'payrollItems']
export const EMPLOYEE_DATA_EXCLUDED: readonly string[] = ['حساب الدخول', 'ملفات القضايا والتحقيقات', 'تقييمات الغير', 'الطلبات السرّية وأي سجل اتعمل منها', 'الملفات المرفوعة نفسها (مراجعها بس)']
export const EMPLOYEE_DATA_SECTION_LIMIT = 5000
export const EMPLOYEE_DATA_SECTIONS: readonly EmployeeDataSection[] = [
  ['documents', 'مستندات الموظف', 'employee_documents'], ['changeHistory', 'سجل تغييرات الملف', 'employee_status_history'], ['salaryHistory', 'سجل الراتب', 'employee_salary_history'],
  ['paymentChanges', 'تغييرات بيانات الصرف', 'employee_payment_changes'], ['employmentPeriods', 'فترات الخدمة', 'employment_periods'], ['education', 'المؤهلات', 'employee_education'],
  ['experiences', 'الخبرات', 'employee_experiences'], ['languages', 'اللغات', 'employee_languages'], ['skills', 'المهارات', 'employee_skills'], ['certifications', 'الشهادات', 'employee_certifications'],
  ['customValues', 'الخانات المخصصة', 'employee_custom_values'], ['dependents', 'المعالين', 'dependents'], ['leaves', 'الإجازات', 'leaves'], ['leaveBalances', 'أرصدة الإجازات', 'leave_balances'],
  ['leaveBalanceAdjustments', 'تسويات أرصدة الإجازات', 'leave_balance_adjustments'], ['attendanceDays', 'أيام الحضور', 'attendance_days'], ['attendancePunches', 'البصمات', 'attendance_punches'],
  ['attendanceCorrections', 'تصحيحات الحضور', 'attendance_corrections'], ['attendanceExemptions', 'استثناءات الحضور', 'attendance_exemptions'], ['overtime', 'الإضافي', 'overtime_entries'],
  ['suspensions', 'الإيقافات عن العمل', 'employee_suspensions'], ['penalties', 'الجزاءات', 'employee_penalties'], ['loans', 'السلف', 'loans'], ['loanInstallments', 'أقساط السلف', 'loan_installments'],
  ['deductions', 'الخصومات', 'deduction_requests'], ['bonuses', 'المكافآت', 'bonus_requests'], ['obligations', 'دفتر المديونيات', 'employee_obligations'], ['payrollItems', 'بنود الرواتب', 'payroll_items'],
  ['custody', 'العهد', 'custody_assignments'], ['issuedDocuments', 'المستندات الصادرة', 'hr_issued_documents'], ['letters', 'طلبات الخطابات', 'letter_requests'],
  ['policyAcknowledgements', 'إقرارات السياسات', 'policy_acknowledgements'], ['promotions', 'الترقيات', 'promotions'], ['goals', 'الأهداف', 'performance_goals'],
  ['onboardingTasks', 'مهام التهيئة', 'onboarding_tasks'], ['offboarding', 'ملفات إنهاء الخدمة', 'offboarding_cases'],
].map(([key, label, table]): EmployeeDataSection => ({ key, label, table,
  // P4C-N02: أقساط السلف مالهاش عمود موظف — عن طريق سلفتها
  ...(key === 'loanInstallments' ? { column: 'loanId', owner: { table: 'loans', column: 'employeeId' } } : { column: 'employeeId' }),
  ...(FINANCE_SECTIONS.includes(key) ? { access: 'finance' as const } : key === 'penalties' ? { access: 'penalties' as const } : {}) }))
  .concat([{ key: 'requests', label: 'الطلبات (غير السرّية)', table: 'requests', column: 'requesterId' }])

/** طلب سري بحكم شاشة الطلب: نوع تعريفه الفعلي (definitionCode) أو نوعه سري، وتأجيل القسط على سرّية السلفة. r = صف الطلب */
export const CONFIDENTIAL_REQUEST_SQL = `EXISTS (SELECT 1 FROM dbo.[request_types] t WHERE t.[isConfidential] = 1
  AND (t.[code] = r.[definitionCode] OR t.[code] = r.[typeCode] OR (t.[code] = N'LOAN' AND r.[typeCode] = N'${LOAN_DEFERRAL_TYPE}')))`
export const EMPLOYEE_NOT_FOUND = 'الموظف غير موجود'
/** أعمدة الجداول المشتقة اللي بتشاور على جدول requests — أي واحد منها موجود في جدول القسم سطره بيتفحص */
export const REQUEST_LINK_COLUMNS: readonly string[] = ['requestId', 'sourceRequestId', 'resignationRequestId']
/** قفزة تانية: السطر مربوط بسطر أب في جدول تاني، والأب هو اللي مربوط بالطلب */
export const PARENT_REQUEST_LINKS: Readonly<Record<string, { column: string; table: string }>> = {
  // قسط السلفة ← السلفة ← طلبها
  loan_installments: { column: 'loanId', table: 'loans' },
  // فترة الخدمة (سبب الخروج) ← ملف إنهاء الخدمة ← طلب الاستقالة
  employment_periods: { column: 'offboardingCaseId', table: 'offboarding_cases' },
}
export const EXPORT_DEADLOCK_ATTEMPTS = 3
const deadlockVictim = (error: unknown) => {
  const value = error as { number?: unknown; driverError?: { number?: unknown } } | null
  return value?.driverError?.number === 1205 || value?.number === 1205
}

@Injectable()
export class EmployeeDataExportService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  /** ضحية تعارض الأقفال (1205) بتتعاد من الأول بحكمها كله — المعاملة اللي رجعت ماكتبتش حاجة */
  async export(user: JwtPayload, employeeId: number) {
    for (let attempt = 1; ; attempt++) {
      try { return await this.exportOnce(user, employeeId) }
      catch (error) { if (attempt >= EXPORT_DEADLOCK_ATTEMPTS || !deadlockVictim(error)) throw error }
    }
  }

  private exportOnce(user: JwtPayload, employeeId: number) {
    const scope = branchScopeOf(user)
    return this.ds.transaction(async em => {
      // صف الموظف مقفول من هنا لآخر قراءة: فرعه مايتغيّرش في النص، وحكم النطاق على الصف المقفول. خارج نطاق فروع الحساب = «غير موجود»
      const [locked]: Array<{ id: number; branchId: number | null }> = await em.query('SELECT [id], [branchId] FROM [employees] WITH (UPDLOCK, ROWLOCK) WHERE [id] = @0', [employeeId])
      if (!locked || !inBranchScope(scope, locked.branchId == null ? null : Number(locked.branchId))) throw new NotFoundException(EMPLOYEE_NOT_FOUND)
      const entity = await em.getRepository(Employee).findOneOrFail({ where: { id: employeeId } })
      entity.gosiFirstRegisteredAt = (await readGosiFirstRegistered(em, [employeeId])).get(employeeId) ?? null
      // النصوص السردية في الطلبات السرية اللي الموظف صاحبها أو موضوعها — أي خانة اتنسخت فيها بتتحجب
      const confidential: Array<{ payload: string | null }> = await em.query(`SELECT r.[payload] FROM dbo.[requests] r
        WHERE (r.[requesterId] = @0 OR (ISJSON(r.[payload]) = 1 AND TRY_CONVERT(int, JSON_VALUE(r.[payload], '$.employeeId')) = @0)) AND ${CONFIDENTIAL_REQUEST_SQL}`, [employeeId])
      const secrets = confidentialTexts(confidential.map(row => row.payload))
      const employee = scrubConfidentialTexts(projectEmployee(entity, user, await partialMaskingOn(em)), secrets)
      const column = async (table: string, name: string) => {
        const [exists]: Array<{ ok: number }> = await em.query('SELECT CASE WHEN COL_LENGTH(@0, @1) IS NOT NULL THEN 1 ELSE 0 END AS [ok]', [`dbo.${table}`, name])
        return Number(exists?.ok) === 1
      }
      // أعمدة الربط بالطلب الموجودة فعلًا في القاعدة (قراءة واحدة)
      const linkNames = [...REQUEST_LINK_COLUMNS, ...Object.values(PARENT_REQUEST_LINKS).map(parent => parent.column)]
      const present = new Set((await em.query(`SELECT t.[name] AS [table], c.[name] AS [column] FROM sys.columns c INNER JOIN sys.tables t ON t.[object_id] = c.[object_id]
        WHERE SCHEMA_NAME(t.[schema_id]) = N'dbo' AND c.[name] IN (${linkNames.map((_, index) => `@${index}`).join(', ')})`, linkNames) as Array<{ table: string; column: string }>)
        .map(row => `${row.table}.${row.column}`))
      /** شروط «مش مشتق من طلب سري» لجدول القسم: بكل عمود ربط فيه، وعن طريق أبوه لو له أب */
      const notFromConfidential = (table: string): string => {
        const own = REQUEST_LINK_COLUMNS.filter(name => present.has(`${table}.${name}`))
          .map(name => ` AND NOT EXISTS (SELECT 1 FROM dbo.[requests] r WHERE r.[id] = s.[${name}] AND ${CONFIDENTIAL_REQUEST_SQL})`)
        const parent = PARENT_REQUEST_LINKS[table]
        const viaParent = parent && present.has(`${table}.${parent.column}`) ? REQUEST_LINK_COLUMNS.filter(name => present.has(`${parent.table}.${name}`))
          .map(name => ` AND NOT EXISTS (SELECT 1 FROM dbo.[${parent.table}] p INNER JOIN dbo.[requests] r ON r.[id] = p.[${name}] WHERE p.[id] = s.[${parent.column}] AND ${CONFIDENTIAL_REQUEST_SQL})`) : []
        return [...own, ...viaParent].join('')
      }
      const sections: Array<{ key: string; label: string; count: number; truncated: boolean; rows: unknown[] }> = []
      const omitted: Array<{ key: string; label: string; reason: string }> = []
      for (const section of EMPLOYEE_DATA_SECTIONS) {
        // القسم بصلاحية اللي بيصدّر: «تعديل الموظفين» مابيفتحش الجزاءات ولا يزوّد على قاعدة البيانات المالية
        if (section.access === 'penalties' && !userHasPerm(user, 'cases.penalties')) { omitted.push({ key: section.key, label: section.label, reason: 'محتاج صلاحية لائحة الجزاءات' }); continue }
        if (section.access === 'finance' && !canSeeEmployeesFinance(user)) { omitted.push({ key: section.key, label: section.label, reason: 'محتاج صلاحية البيانات المالية' }); continue }
        // أسماء الجداول والأعمدة ثوابت من الكود (مش من الطلب)؛ الجدول أو العمود الناقص (قبل ترحيله) بيتعدّى
        if (!(await column(section.table, section.column)) || (section.owner && !(await column(section.owner.table, section.owner.column)))) continue
        const mine = section.owner ? `s.[${section.column}] IN (SELECT o.[id] FROM dbo.[${section.owner.table}] o WHERE o.[${section.owner.column}] = @0)` : `s.[${section.column}] = @0`
        // الطلبات: السرّي بيتقري من أطرافه بس — برّه الملف خالص. وأي جدول سطره مشتق من طلب (بأي عمود ربط، أو عن طريق أبوه): السطر اللي طلبه سري برّه كمان
        const rows: unknown[] = section.key === 'requests'
          ? await em.query(`SELECT TOP (${EMPLOYEE_DATA_SECTION_LIMIT + 1}) r.* FROM dbo.[requests] r WHERE r.[requesterId] = @0 AND NOT ${CONFIDENTIAL_REQUEST_SQL} ORDER BY r.[id]`, [employeeId])
          : await em.query(`SELECT TOP (${EMPLOYEE_DATA_SECTION_LIMIT + 1}) s.* FROM dbo.[${section.table}] s WHERE ${mine}${notFromConfidential(section.table)} ORDER BY 1`, [employeeId])
        const truncated = rows.length > EMPLOYEE_DATA_SECTION_LIMIT
        sections.push({ key: section.key, label: section.label, count: Math.min(rows.length, EMPLOYEE_DATA_SECTION_LIMIT), truncated, rows: scrubConfidentialTexts(truncated ? rows.slice(0, EMPLOYEE_DATA_SECTION_LIMIT) : rows, secrets) })
      }
      const counts = Object.fromEntries(sections.filter(section => section.count > 0).map(section => [section.key, section.count]))
      await recordAudit(em, { category: 'EXPORT', action: 'EMPLOYEE_DATA_EXPORT', entityType: 'employee', entityId: employeeId, actorUserId: user.sub, branchId: entity.branchId ?? null,
        summary: `تصدير بيانات الموظف رقم ${employeeId} كاملة (طلب اطلاع)`, after: { sections: counts, omitted: omitted.map(entry => entry.key) } })
      return { exportedAt: new Date().toISOString(), employeeId, employee, sections, omitted, excluded: EMPLOYEE_DATA_EXCLUDED }
    })
  }
}

import { Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, userHasPerm } from '../auth/guards'
import { canSeeEmployeesFinance } from './employee-projection'
import { EmployeesService } from './employees.service'

// B4.8 (أ): تصدير بيانات موظف واحد كاملة (طلب اطلاع — C-EG-08، C-SA-08). قراءة بس: ملف الموظف وكل سجلاته اللي عليها رقمه، من الجداول
// الموجودة فعلًا في القاعدة (الجدول أو العمود الناقص بيتعدّى). للي معاه «تعديل الموظفين» وفرع الموظف في نطاقه، وكل تصدير في سجل التدقيق.
// مش في الملف: حسابات الدخول، وملفات القضايا والتحقيقات وتقييمات الغير (فيها بيانات ناس تانية)، والملفات المرفوعة نفسها (مراجعها بس)،
// والطلبات السرّية (بتتقري من أطرافها بس). والأقسام المالية والجزاءات بتطلع للي معاه صلاحيتها بس — اللي اتشال بيتقال في `omitted`.

/** access: القسم محتاج صلاحية زيادة عن «تعديل الموظفين» — finance (البيانات المالية) أو penalties (لائحة الجزاءات) */
export interface EmployeeDataSection { key: string; label: string; table: string; column: string; access?: 'finance' | 'penalties' }
const FINANCE_SECTIONS: readonly string[] = ['salaryHistory', 'paymentChanges', 'loans', 'loanInstallments', 'deductions', 'bonuses', 'obligations', 'payrollItems']
export const EMPLOYEE_DATA_EXCLUDED: readonly string[] = ['حساب الدخول', 'ملفات القضايا والتحقيقات', 'تقييمات الغير', 'الطلبات السرّية', 'الملفات المرفوعة نفسها (مراجعها بس)']
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
].map(([key, label, table]): EmployeeDataSection => ({ key, label, table, column: 'employeeId',
  ...(FINANCE_SECTIONS.includes(key) ? { access: 'finance' as const } : key === 'penalties' ? { access: 'penalties' as const } : {}) }))
  .concat([{ key: 'requests', label: 'الطلبات (غير السرّية)', table: 'requests', column: 'requesterId' }])

@Injectable()
export class EmployeeDataExportService {
  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly employees: EmployeesService) {}

  async export(user: JwtPayload, employeeId: number) {
    // نفس قراءة ملف الموظف: خارج نطاق فروع الحساب = «غير موجود»
    const employee = await this.employees.findOne(employeeId, branchScopeOf(user))
    const em = this.ds.manager
    const sections: Array<{ key: string; label: string; count: number; truncated: boolean; rows: unknown[] }> = []
    const omitted: Array<{ key: string; label: string; reason: string }> = []
    for (const section of EMPLOYEE_DATA_SECTIONS) {
      // القسم بصلاحية اللي بيصدّر: «تعديل الموظفين» مابيفتحش الجزاءات ولا يزوّد على قاعدة البيانات المالية
      if (section.access === 'penalties' && !userHasPerm(user, 'cases.penalties')) { omitted.push({ key: section.key, label: section.label, reason: 'محتاج صلاحية لائحة الجزاءات' }); continue }
      if (section.access === 'finance' && !canSeeEmployeesFinance(user)) { omitted.push({ key: section.key, label: section.label, reason: 'محتاج صلاحية البيانات المالية' }); continue }
      // أسماء الجداول والأعمدة ثوابت من الكود (مش من الطلب)؛ الجدول أو العمود الناقص (قبل ترحيله) بيتعدّى
      const [exists]: Array<{ ok: number }> = await em.query('SELECT CASE WHEN COL_LENGTH(@0, @1) IS NOT NULL THEN 1 ELSE 0 END AS [ok]', [`dbo.${section.table}`, section.column])
      if (Number(exists?.ok) !== 1) continue
      // الطلبات: النوع السرّي (شكوى وتظلّم…) بيتقري من أطرافه بس — برّه الملف خالص
      const rows: unknown[] = section.key === 'requests'
        ? await em.query(`SELECT TOP (${EMPLOYEE_DATA_SECTION_LIMIT + 1}) r.* FROM dbo.[requests] r WHERE r.[requesterId] = @0
            AND NOT EXISTS (SELECT 1 FROM dbo.[request_types] t WHERE t.[code] = r.[typeCode] AND t.[isConfidential] = 1) ORDER BY r.[id]`, [employeeId])
        : await em.query(`SELECT TOP (${EMPLOYEE_DATA_SECTION_LIMIT + 1}) * FROM dbo.[${section.table}] WHERE [${section.column}] = @0 ORDER BY 1`, [employeeId])
      const truncated = rows.length > EMPLOYEE_DATA_SECTION_LIMIT
      sections.push({ key: section.key, label: section.label, count: Math.min(rows.length, EMPLOYEE_DATA_SECTION_LIMIT), truncated, rows: truncated ? rows.slice(0, EMPLOYEE_DATA_SECTION_LIMIT) : rows })
    }
    const counts = Object.fromEntries(sections.filter(section => section.count > 0).map(section => [section.key, section.count]))
    await recordAudit(em, { category: 'EXPORT', action: 'EMPLOYEE_DATA_EXPORT', entityType: 'employee', entityId: employeeId, actorUserId: user.sub, branchId: employee.branchId ?? null,
      summary: `تصدير بيانات الموظف رقم ${employeeId} كاملة (طلب اطلاع)`, after: { sections: counts, omitted: omitted.map(entry => entry.key) } })
    return { exportedAt: new Date().toISOString(), employeeId, employee, sections, omitted, excluded: EMPLOYEE_DATA_EXCLUDED }
  }
}

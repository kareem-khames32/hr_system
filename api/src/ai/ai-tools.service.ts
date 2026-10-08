import { Injectable } from '@nestjs/common'
import { AttendanceService } from '../attendance/attendance.service'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, userHasPerm } from '../auth/guards'
import { projectEmployee } from '../employees/employee-projection'
import { EmployeesService } from '../employees/employees.service'
import type { ModuleKey } from '../modules-registry/registry'
import { ModulesService } from '../modules-registry/modules.service'
import { PayrollService } from '../payroll/payroll.service'
import { PoliciesService } from '../policies/policies.service'
import { LeaveBalancesService } from '../requests/leave-balances.service'
import { RequestsService } from '../requests/requests.service'
import { AI_UNAVAILABLE_DATA } from './ai-rules'
import type { LlmToolDef } from './llm-provider'

// B6.6: أدوات مساعد القراءة — كل أداة بتنادي نفس دالة شاشتها بهوية السائل (`JwtPayload` بتاعه): صلاحياته ونطاق فروعه وموديولاته.
// بيانات السائل الشخصية (رصيدي، قسيمتي، حضوري، طلباتي) بتتقري لملفه هو بس — مفيش أداة بتاخد رقم موظف ليها. للقراءة بس.
// «مش موجود» و«برّه النطاق» و«الموديول مقفول ليك» = نفس الرد (`AI_UNAVAILABLE_DATA`).

interface ReadTool { def: LlmToolDef; label: string; module: ModuleKey | null; run(user: JwtPayload, input: Record<string, unknown>): Promise<unknown> }
const noInput = { type: 'object', properties: {}, additionalProperties: false }
const pick = <T extends Record<string, unknown>>(row: T, keys: readonly string[]) => Object.fromEntries(keys.filter(key => row?.[key] !== undefined).map(key => [key, row[key]]))
const words = (value: unknown) => (typeof value === 'string' ? value.trim().toLowerCase().slice(0, 100) : '')

@Injectable()
export class AiToolsService {
  private readonly tools: ReadTool[]

  constructor(private readonly modules: ModulesService, private readonly balances: LeaveBalancesService, private readonly requests: RequestsService, private readonly attendance: AttendanceService,
    private readonly payroll: PayrollService, private readonly policies: PoliciesService, private readonly employees: EmployeesService) {
    this.tools = [
      { label: 'رصيد إجازاتي', module: 'leave', def: { name: 'my_leave_balance', description: 'أرصدة إجازات المستخدم نفسه للسنة الجارية (نفس شاشة «إجازاتي وأرصدتي»): لكل نوع المتبقي والمستهلك والاستحقاق.', inputSchema: noInput },
        run: async user => (user.employeeId ? (await this.balances.allBalances(user.employeeId)).map(row => pick(row as unknown as Record<string, unknown>, ['balanceType', 'period', 'periodStart', 'periodEnd', 'remaining', 'totalTaken', 'annualEntitlement', 'accruedToDate', 'opening'])) : AI_UNAVAILABLE_DATA) },
      { label: 'طلباتي', module: null, def: { name: 'my_requests', description: 'آخر طلبات المستخدم نفسه وحالتها (نفس شاشة «طلباتي»).', inputSchema: noInput },
        run: async user => (await this.requests.mine(user, {}) as unknown as Array<Record<string, unknown>>).slice(0, 20).map(row => pick(row, ['id', 'typeCode', 'typeName', 'definitionCode', 'status', 'submittedAt', 'completedAt', 'currentStep'])) },
      { label: 'حضوري النهارده', module: 'attendance', def: { name: 'my_attendance_today', description: 'حضور المستخدم نفسه النهارده: الوردية وأول وآخر بصمة والحالة (نفس لوحة الموظف).', inputSchema: noInput },
        run: async user => (user.employeeId ? (await this.attendance.myToday(user.employeeId)) ?? AI_UNAVAILABLE_DATA : AI_UNAVAILABLE_DATA) },
      { label: 'قسائم راتبي', module: 'payroll', def: { name: 'my_payslips', description: 'آخر قسائم راتب المستخدم نفسه (نفس شاشة «قسائم راتبي»): الفترة وحالة المسير والأساسي والإضافي والخصومات والصافي.', inputSchema: noInput },
        run: async user => {
          if (!user.employeeId) return AI_UNAVAILABLE_DATA
          const slips = await this.payroll.payslipsOf(user.employeeId) as unknown as Array<{ item: Record<string, unknown>; run: Record<string, unknown> }>
          return [...slips].sort((a, b) => String(b.run?.period).localeCompare(String(a.run?.period))).slice(0, 3).map(slip => ({ ...pick(slip.run ?? {}, ['period', 'status', 'startDate', 'endDate']),
            ...pick(slip.item ?? {}, ['basicSalary', 'allowances', 'overtimeAmount', 'otherAdditions', 'latenessDeduction', 'shortfallDeduction', 'absenceDeduction', 'unpaidLeaveDeduction', 'loanInstallments', 'otherDeductions', 'socialInsuranceDeduction', 'netPay']) }))
        } },
      { label: 'سياسات الشركة', module: 'policies', def: { name: 'company_policies', description: 'سياسات الشركة السارية اللي المستخدم من جمهورها (مكتبة السياسات): العنوان ورقم النسخة والتصنيف وحالة إقراره. اكتب في query كلمة من موضوع السياسة، أو سيبها فاضية للقايمة كلها.',
        inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'كلمة من عنوان أو تصنيف السياسة' } }, additionalProperties: false } },
        run: async (user, input) => {
          const mine = await this.policies.mine(user) as unknown as { available: boolean; policies: Array<Record<string, unknown>> }
          const query = words(input.query)
          const rows = (mine.policies ?? []).filter(row => !query || `${row.title ?? ''} ${row.category ?? ''}`.toLowerCase().includes(query))
          if (!rows.length) return AI_UNAVAILABLE_DATA
          return rows.slice(0, 15).map(row => ({ source: 'مكتبة السياسات', title: row.title, category: row.category ?? null, isMandatory: row.isMandatory, state: row.state,
            versionNo: (row.version as Record<string, unknown> | undefined)?.versionNo ?? null, effectiveFrom: (row.version as Record<string, unknown> | undefined)?.effectiveFrom ?? null }))
        } },
      { label: 'المعلّق عندي', module: null, def: { name: 'pending_my_approval', description: 'الطلبات اللي مستنية قرار المستخدم نفسه (صندوق الموافقات).', inputSchema: noInput },
        run: async user => { const inbox = await this.requests.inbox(user) as unknown as Array<Record<string, unknown>>; return { count: inbox.length, requests: inbox.slice(0, 10).map(row => pick(row, ['id', 'typeCode', 'typeName', 'status', 'submittedAt', 'currentStep'])) } } },
      { label: 'بحث عن موظف', module: 'employees', def: { name: 'employee_lookup', description: 'بيانات وظيفية أساسية لموظف (الاسم والكود والمسمى) — بس لو المستخدم معاه صلاحية عرض الموظفين والموظف جوه نطاق فروعه. اكتب في query اسم الموظف أو كوده.',
        inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'اسم الموظف أو كوده' } }, required: ['query'], additionalProperties: false } },
        run: async (user, input) => {
          const query = words(input.query)
          if (!query || query.length < 2 || !userHasPerm(user, 'employees.view')) return AI_UNAVAILABLE_DATA
          // نفس قايمة شاشة الموظفين بنطاق فروع السائل وبنفس إسقاطها (projectEmployee): اللي برّه النطاق مش فيها أصلًا
          const masking = await this.employees.partialMasking()
          const rows = (await this.employees.findAll(branchScopeOf(user))).map(employee => projectEmployee(employee, user, masking) as unknown as Record<string, unknown>)
            .filter(row => String(row.fullName ?? '').toLowerCase().includes(query) || String(row.fullNameEn ?? '').toLowerCase().includes(query) || String(row.employeeCode ?? '').toLowerCase() === query)
          if (!rows.length) return AI_UNAVAILABLE_DATA
          return rows.slice(0, 5).map(row => pick(row, ['employeeCode', 'fullName', 'fullNameEn', 'jobTitle', 'status', 'branchId', 'departmentId', 'joinDate']))
        } },
    ]
  }

  /** الأدوات المتاحة للمستخدم ده: اللي موديولها مفعّل له (جمهور التفعيل داخل) */
  async available(user: JwtPayload): Promise<LlmToolDef[]> {
    const defs: LlmToolDef[] = []
    for (const tool of this.tools) if (tool.module === null || await this.modules.allowedFor(tool.module, user)) defs.push(tool.def)
    return defs
  }

  labelOf(name: string): string {
    return this.tools.find(tool => tool.def.name === name)?.label ?? name
  }

  /** تنفيذ أداة بهوية المستخدم. أداة مش معروفة، أو موديولها مقفول له، أو رفض من الخدمة (مش موجود / ممنوع) = «مش متاح». */
  async run(user: JwtPayload, name: string, input: Record<string, unknown>): Promise<{ ok: boolean; result: unknown }> {
    const tool = this.tools.find(candidate => candidate.def.name === name)
    if (!tool || (tool.module !== null && !(await this.modules.allowedFor(tool.module, user)))) return { ok: false, result: AI_UNAVAILABLE_DATA }
    try {
      const result = await tool.run(user, input && typeof input === 'object' ? input : {})
      return { ok: result !== AI_UNAVAILABLE_DATA, result }
    } catch {
      // رفض الخدمة (403/404/تحقق) بيرجع للنموذج بنفس النص — من غير سبب يفرّق بين «مش موجود» و«ممنوع»
      return { ok: false, result: AI_UNAVAILABLE_DATA }
    }
  }
}

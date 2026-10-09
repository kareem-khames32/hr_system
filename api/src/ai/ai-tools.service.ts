import { Injectable } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { AttendanceService } from '../attendance/attendance.service'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, userHasPerm } from '../auth/guards'
import { projectEmployee } from '../employees/employee-projection'
import { EmployeesService } from '../employees/employees.service'
import type { ModuleKey } from '../modules-registry/registry'
import { ModulesService } from '../modules-registry/modules.service'
import { parseOrgFilter } from '../org/org-filter-params'
import { OrgService } from '../org/org.service'
import { PayrollService } from '../payroll/payroll.service'
import { PoliciesService } from '../policies/policies.service'
import { METRICS } from '../reports/metrics'
import { MetricsService } from '../reports/metrics.service'
import { LeaveBalancesService } from '../requests/leave-balances.service'
import { RequestsService } from '../requests/requests.service'
import { AI_UNAVAILABLE_DATA, trusted, trustedShape } from './ai-rules'
import type { LlmToolDef } from './llm-provider'

// B6.6: أدوات مساعد القراءة — كل أداة بتنادي نفس دالة شاشتها بهوية السائل (`JwtPayload` بتاعه): صلاحياته ونطاق فروعه وموديولاته.
// بيانات السائل الشخصية (رصيدي، قسيمتي، حضوري، طلباتي) بتتقري لملفه هو بس — مفيش أداة بتاخد رقم موظف ليها. للقراءة بس.
// «مش موجود» و«برّه النطاق» و«الموديول مقفول ليك» = نفس الرد (`AI_UNAVAILABLE_DATA`).

interface ReadTool { def: LlmToolDef; label: string; module: ModuleKey | null; /** صلاحية لازمة عشان الأداة تتعرض وتتنفّذ */ perm?: string; run(user: JwtPayload, input: Record<string, unknown>): Promise<unknown> }
const noInput = { type: 'object', properties: {}, additionalProperties: false }
const pick = <T extends Record<string, unknown>>(row: T, keys: readonly string[]) => Object.fromEntries(keys.filter(key => row?.[key] !== undefined).map(key => [key, row[key]]))
const words = (value: unknown) => (typeof value === 'string' ? value.trim().toLowerCase().slice(0, 100) : '')

@Injectable()
export class AiToolsService {
  private readonly tools: ReadTool[]

  constructor(private readonly modules: ModulesService, private readonly balances: LeaveBalancesService, private readonly requests: RequestsService, private readonly attendance: AttendanceService,
    private readonly payroll: PayrollService, private readonly policies: PoliciesService, private readonly employees: EmployeesService, private readonly org: OrgService, private readonly moduleRef: ModuleRef) {
    this.tools = [
      { label: 'رصيد إجازاتي', module: 'leave', def: { name: 'my_leave_balance', description: 'أرصدة إجازات المستخدم نفسه للسنة الجارية (نفس شاشة «إجازاتي وأرصدتي»): لكل نوع المتبقي والمستهلك والاستحقاق.', inputSchema: noInput },
        run: async user => (user.employeeId ? (await this.balances.allBalances(user.employeeId)).map(row => ({ ...pick(row as unknown as Record<string, unknown>, ['balanceType', 'remaining', 'totalTaken', 'annualEntitlement', 'accruedToDate', 'opening']),
          period: trustedShape(row.period, 'period'), periodStart: trustedShape(row.periodStart, 'date'), periodEnd: trustedShape(row.periodEnd, 'date') })) : AI_UNAVAILABLE_DATA) },
      { label: 'طلباتي', module: null, def: { name: 'my_requests', description: 'آخر طلبات المستخدم نفسه وحالتها (نفس شاشة «طلباتي»).', inputSchema: noInput },
        run: async user => (await this.requests.mine(user, {}) as unknown as Array<Record<string, unknown>>).slice(0, 20).map(row => pick(row, ['id', 'typeCode', 'typeName', 'definitionCode', 'status', 'submittedAt', 'completedAt', 'currentStep'])) },
      { label: 'حضوري النهارده', module: 'attendance', def: { name: 'my_attendance_today', description: 'حضور المستخدم نفسه النهارده: الوردية وأول وآخر بصمة والحالة (نفس لوحة الموظف).', inputSchema: noInput },
        run: async user => {
          const today = user.employeeId ? await this.attendance.myToday(user.employeeId) as unknown as { date: string; workingDay: boolean; day: Record<string, unknown> | null; shift: Record<string, unknown> | null; leave: Record<string, unknown> | null } | null : null
          if (!today) return AI_UNAVAILABLE_DATA
          return { date: trustedShape(today.date, 'date'), workingDay: !!today.workingDay, status: today.day?.status ?? null, checkIn: trustedShape(today.day?.checkIn, 'time'), checkOut: trustedShape(today.day?.checkOut, 'time'),
            lateMinutes: Number(today.day?.lateMinutes ?? 0), workMinutes: Number(today.day?.workMinutes ?? 0), shiftName: today.shift?.name ?? null, shiftStart: trustedShape(today.shift?.start, 'time'), shiftEnd: trustedShape(today.shift?.end, 'time'),
            leaveType: today.leave?.leaveTypeCode ?? null }
        } },
      { label: 'قسائم راتبي', module: 'payroll', def: { name: 'my_payslips', description: 'آخر قسائم راتب المستخدم نفسه (نفس شاشة «قسائم راتبي»): الفترة وحالة المسير والأساسي والإضافي والخصومات والصافي.', inputSchema: noInput },
        run: async user => {
          if (!user.employeeId) return AI_UNAVAILABLE_DATA
          const slips = await this.payroll.payslipsOf(user.employeeId) as unknown as Array<{ item: Record<string, unknown>; run: Record<string, unknown> }>
          return [...slips].sort((a, b) => String(b.run?.period).localeCompare(String(a.run?.period))).slice(0, 3).map(slip => ({ period: trustedShape(slip.run?.period, 'period'), status: slip.run?.status ?? null, startDate: trustedShape(slip.run?.startDate, 'date'), endDate: trustedShape(slip.run?.endDate, 'date'),
            ...pick(slip.item ?? {}, ['basicSalary', 'allowances', 'overtimeAmount', 'otherAdditions', 'latenessDeduction', 'shortfallDeduction', 'absenceDeduction', 'unpaidLeaveDeduction', 'loanInstallments', 'otherDeductions', 'socialInsuranceDeduction', 'netPay']) }))
        } },
      { label: 'سياسات الشركة', module: 'policies', def: { name: 'company_policies', description: 'سياسات الشركة السارية اللي المستخدم من جمهورها (مكتبة السياسات): العنوان ورقم النسخة والتصنيف وحالة إقراره. اكتب في query كلمة من موضوع السياسة، أو سيبها فاضية للقايمة كلها.',
        inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'كلمة من عنوان أو تصنيف السياسة' } }, additionalProperties: false } },
        run: async (user, input) => {
          const mine = await this.policies.mine(user) as unknown as { available: boolean; policies: Array<Record<string, unknown>> }
          const query = words(input.query)
          const rows = (mine.policies ?? []).filter(row => !query || `${row.title ?? ''} ${row.category ?? ''}`.toLowerCase().includes(query))
          if (!rows.length) return AI_UNAVAILABLE_DATA
          return rows.slice(0, 15).map(row => ({ source: trusted('مكتبة السياسات'), title: row.title, category: row.category ?? null, isMandatory: row.isMandatory, state: row.state,
            versionNo: (row.version as Record<string, unknown> | undefined)?.versionNo ?? null, effectiveFrom: trustedShape((row.version as Record<string, unknown> | undefined)?.effectiveFrom, 'date') }))
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
          // CRP6A-B03: من غير أرقام مراجع (فرع، قسم، فريق، مدير) — المرجع ممكن يكون في فرع برّه نطاق السائل
          return rows.slice(0, 5).map(row => ({ ...pick(row, ['employeeCode', 'fullName', 'fullNameEn', 'jobTitle', 'status']), joinDate: trustedShape(row.joinDate, 'date') }))
        } },
      // B6.9: تقارير باللغة الطبيعية — النموذج بيختار مفتاح مؤشر من القاموس وفلاتر بالاسم بس (مفيش نص استعلام)، والرقم من دالة التقرير نفسها
      { label: 'مؤشرات التقارير', module: 'reports', perm: 'reports.view', def: { name: 'report_metric',
        description: `رقم مؤشر من قاموس مؤشرات التقارير (نفس رقم شاشة التقارير) بنطاق المستخدم. المؤشرات: ${METRICS.map(metric => `${metric.key} = ${metric.label}`).join('، ')}. الفلاتر اختيارية: شهر الرواتب، واسم فرع أو إدارة/قسم أو فريق. أرقام الحساب (زي عدد أيام الغياب) في parts.`,
        inputSchema: { type: 'object', additionalProperties: false, required: ['metric'], properties: { metric: { type: 'string', enum: METRICS.map(metric => metric.key) },
          period: { type: 'string', description: 'شهر الرواتب YYYY-MM؛ فاضي = الشهر الجاري' }, branch: { type: 'string', description: 'اسم الفرع' },
          department: { type: 'string', description: 'اسم الإدارة أو القسم' }, team: { type: 'string', description: 'اسم الفريق' } } } },
        run: (user, input) => this.metric(user, input) },
    ]
  }

  /**
   * B6.9 — مؤشر من القاموس بفلاتر بالاسم. الأسماء بتتحول لأرقام من شجرة نطاق الحساب (نفس مصدر فلتر شاشة التقارير): الاسم اللي برّه
   * النطاق مش فيها، فردّه زي اللي مش موجود. والقيمة من `MetricsService.values` — نفس دالة `GET /reports/metrics` بنطاقها وموديولاتها وصلاحية كل مؤشر.
   */
  private async metric(user: JwtPayload, input: Record<string, unknown>) {
    const key = words(input.metric), period = typeof input.period === 'string' ? input.period.trim() : ''
    if (!METRICS.some(metric => metric.key === key) || (period !== '' && !/^\d{4}-(0[1-9]|1[0-2])$/.test(period))) return AI_UNAVAILABLE_DATA
    const tree = await this.org.filterContext(branchScopeOf(user))
    const choose = <T extends { id: number; name: string }>(rows: T[], raw: unknown, what: string): { row: T | null; stop?: unknown } => {
      const name = words(raw)
      if (!name) return { row: null }
      const found = rows.filter(row => row.name.toLowerCase().includes(name)), exact = found.filter(row => row.name.toLowerCase() === name)
      if (exact.length === 1 || found.length === 1) return { row: exact.length === 1 ? exact[0] : found[0] }
      return { row: null, stop: found.length ? { status: 'NEEDS_INPUT', missing: `اسم ${what} بالظبط`, options: found.slice(0, 12).map(row => row.name) } : AI_UNAVAILABLE_DATA }
    }
    const branch = choose(tree.branches, input.branch, 'الفرع')
    if (branch.stop) return branch.stop
    const unit = choose(tree.units.filter(row => !branch.row || row.branchId === branch.row.id), input.department, 'الإدارة أو القسم')
    if (unit.stop) return unit.stop
    // الإدارة المختارة بأقسامها الفرعية جوه فرعها (زي فلتر الشاشة)
    let departmentIds: number[] | null = null
    if (unit.row) {
      const ids = new Set<number>([unit.row.id])
      for (let grew = true; grew;) { grew = false; for (const row of tree.units) if (row.parentId != null && row.branchId === unit.row.branchId && ids.has(row.parentId) && !ids.has(row.id)) { ids.add(row.id); grew = true } }
      departmentIds = [...ids].sort((a, b) => a - b)
    }
    const team = choose(tree.teams.filter(row => (!branch.row || row.branchId === branch.row.id) && (!departmentIds || departmentIds.includes(row.departmentId))), input.team, 'الفريق')
    if (team.stop) return team.stop
    const report = await this.moduleRef.get(MetricsService, { strict: false }).values(user, parseOrgFilter({ branchId: branch.row?.id, departmentIds: departmentIds ?? undefined, teamId: team.row?.id }), period || undefined)
    const found = report.metrics.find(metric => metric.key === key)
    // مؤشر موديوله مقفول للحساب أو صلاحيته ناقصة مابيطلعش من دالة التقرير: نفس الرد
    if (!found) return AI_UNAVAILABLE_DATA
    const dictionary = METRICS.find(metric => metric.key === found.key)!
    return { source: trusted('قاموس مؤشرات التقارير'), payrollPeriod: trustedShape(report.period, 'period'), from: trustedShape(report.from, 'date'), to: trustedShape(report.to, 'date'), date: trustedShape(report.date, 'date'),
      filter: { branch: branch.row?.name ?? null, department: unit.row?.name ?? null, team: team.row?.name ?? null },
      metric: { ...found, key: trusted(dictionary.key), label: trusted(dictionary.label), unit: trusted(dictionary.unit), definition: trusted(dictionary.definition),
        ...(found.byCurrency ? { byCurrency: found.byCurrency.map(row => ({ currency: row.currency, employees: row.employees, value: trustedShape(row.value, 'amount') })) } : {}) } }
  }

  /** الأدوات المتاحة للمستخدم ده: اللي موديولها مفعّل له (جمهور التفعيل داخل) */
  async available(user: JwtPayload): Promise<LlmToolDef[]> {
    const defs: LlmToolDef[] = []
    for (const tool of this.tools) if ((tool.perm === undefined || userHasPerm(user, tool.perm)) && (tool.module === null || await this.modules.allowedFor(tool.module, user))) defs.push(tool.def)
    return defs
  }

  labelOf(name: string): string {
    return this.tools.find(tool => tool.def.name === name)?.label ?? name
  }

  /** تنفيذ أداة بهوية المستخدم. أداة مش معروفة، أو موديولها مقفول له، أو رفض من الخدمة (مش موجود / ممنوع) = «مش متاح». */
  async run(user: JwtPayload, name: string, input: Record<string, unknown>): Promise<{ ok: boolean; result: unknown }> {
    const tool = this.tools.find(candidate => candidate.def.name === name)
    if (!tool || (tool.perm !== undefined && !userHasPerm(user, tool.perm)) || (tool.module !== null && !(await this.modules.allowedFor(tool.module, user)))) return { ok: false, result: AI_UNAVAILABLE_DATA }
    try {
      const result = await tool.run(user, input && typeof input === 'object' ? input : {})
      return { ok: result !== AI_UNAVAILABLE_DATA, result }
    } catch {
      // رفض الخدمة (403/404/تحقق) بيرجع للنموذج بنفس النص — من غير سبب يفرّق بين «مش موجود» و«ممنوع»
      return { ok: false, result: AI_UNAVAILABLE_DATA }
    }
  }
}

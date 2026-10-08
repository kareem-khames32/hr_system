// B1.12 (الأداء): عرض شاشة المسير الخفيف، وبند حدث الحساب من غير التفصيل.
//  SV-01) عرض الشاشة بيسيب المفاتيح اللي الشاشة بتقراها ومجاميع خصم الحضور بس، وبيشيل تتبّع الحضور ومحرك السياسة وأيام الخصم.
//  SV-02) بند الحدث: كل الأعمدة من غير التفصيل، وبصمة sha256 للنص المحفوظ بالحرف.
//  SV-03) عقد الشاشة: شاشة المسير ومساعداتها بيقروا من التفصيل المفاتيح دي بس، ومكونات القسيمة (اللي بتقرا التفصيل كله) مش فيها.
//         أي قراءة جديدة للتفصيل في الشاشة لازم مفتاحها يتضاف لـPAYROLL_RUN_SCREEN_BREAKDOWN_KEYS، وإلا هتيجي فاضية من ?view=screen.
// Run (من api/): node --test test/payroll-run-screen-view.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { PAYROLL_RUN_SCREEN_BREAKDOWN_KEYS, payrollRunScreenBreakdown, payrollRunScreenMember, payrollBreakdownSha256, payrollEventItem } = require('../src/payroll/payroll-run-screen-view')
const web = file => fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8')

const stored = {
  coverFrom: '2026-06-23', coverTo: '2026-07-22', coverDays: 30, prorataFactor: 1, monthlyDays: 30, missingPunchDates: ['2026-07-02'],
  leaveDeductionLines: [{ code: 'UNPAID_LEAVE', days: 2, amount: 400 }], obligationLines: [{ key: 'DEDUCTION:جزاء', label: 'جزاء', amount: 50 }],
  installmentPlan: { allocation: { lines: [{ installmentRef: '9', eligible: true }] } }, overtime: [{ entryId: 4, amount: 75 }],
  settlementPayout: { caseId: 3, lastWorkingDay: '2026-07-10' }, statutory: { total: 1490, lines: [{ code: 'INCOME_TAX', amount: 1482.5 }, { code: 'MARTYRS_FUND', amount: 7.5 }] },
  attendanceDeductions: { policy: { graceMinutes: 10 }, days: [{ date: '2026-07-01', lateMinutes: 20 }],
    totals: { lateMinutes: 20, permissionMinutes: 15, shortfallMinutes: 0, latenessDeduction: 12.5 }, latenessTierSet: { setId: 1 } },
  attendanceRules: Array.from({ length: 30 }, (_, index) => ({ date: `2026-07-${String(index + 1).padStart(2, '0')}`, rule: { graceMinutes: 10 } })),
  policyShadow: { lines: [1, 2, 3] }, policyEngine: { trace: ['a', 'b'] }, netProtection: { steps: [] }, socialInsurance: { employee: 585 }, dayRate: 260, hourRate: 32.5,
}

test('SV-01: عرض الشاشة بمفاتيح الشاشة ومجاميع خصم الحضور بس', () => {
  const slim = JSON.parse(payrollRunScreenBreakdown(JSON.stringify(stored)))
  for (const key of PAYROLL_RUN_SCREEN_BREAKDOWN_KEYS) assert.deepEqual(slim[key], stored[key], key)
  assert.deepEqual(slim.attendanceDeductions, { totals: stored.attendanceDeductions.totals })
  assert.deepEqual(Object.keys(slim).sort(), [...PAYROLL_RUN_SCREEN_BREAKDOWN_KEYS, 'attendanceDeductions'].sort())
  // مفتاح مش موجود في المحفوظ مابيتخلقش
  assert.deepEqual(JSON.parse(payrollRunScreenBreakdown(JSON.stringify({ coverDays: 30, attendanceRules: [1] }))), { coverDays: 30 })
  // الفاضي واللي مش JSON واللي مش كائن: زي ما هم
  assert.equal(payrollRunScreenBreakdown(null), null)
  assert.equal(payrollRunScreenBreakdown(undefined), null)
  assert.equal(payrollRunScreenBreakdown(''), '')
  assert.equal(payrollRunScreenBreakdown('مش JSON'), 'مش JSON')
  assert.equal(payrollRunScreenBreakdown('[1,2]'), '[1,2]')
})

test('SV-01b: عضو الشاشة — لقطته زي ما هي من غير مكونات الراتب، ومصدر الراتب بنوعه وشهره وسريانه بس', () => {
  const snapshot = { version: 1, fullName: 'موظف', employeeCode: 'E1', branchId: 2, branchName: 'فرع', departmentId: 3, teamId: null, suspensionNote: null, manualReason: 'سبب',
    alreadyInRun: { otherRunId: 9, name: 'مسير', status: 'APPROVED' }, transferredOut: { lastInScopeDate: '2026-07-10', branchName: 'فرع تاني' },
    salarySource: { kind: 'MONTHLY_HISTORY', referencePeriod: '2026-07', effectivePayrollPeriod: '2026-01', currency: 'SAR', evidenceReference: 'قرار', versionId: 4 },
    salaryComponents: [{ code: 'BASIC', nameAr: 'الأساسي', monthlyAmount: 6000, earnedAmount: 6000 }] }
  const member = { id: 5, runId: 2, employeeId: 11, membershipStatus: 'INCLUDED', exclusionReason: null, snapshot }
  const slim = payrollRunScreenMember(member)
  const { salaryComponents, salarySource, ...rest } = snapshot
  assert.deepEqual(slim, { ...member, snapshot: { ...rest, salarySource: { kind: 'MONTHLY_HISTORY', referencePeriod: '2026-07', effectivePayrollPeriod: '2026-01' } } })
  assert.deepEqual(member.snapshot, snapshot, 'العضو الأصلي مابيتغيرش')
  // من غير لقطة، أو لقطة من غير مصدر راتب: زي ما هي
  const bare = { id: 6, employeeId: 12, snapshot: null }
  assert.equal(payrollRunScreenMember(bare), bare)
  assert.deepEqual(payrollRunScreenMember({ employeeId: 13, snapshot: { fullName: 'قديم' } }), { employeeId: 13, snapshot: { fullName: 'قديم' } })
  assert.deepEqual(payrollRunScreenMember({ employeeId: 14, snapshot: { fullName: 'س', salarySource: null } }), { employeeId: 14, snapshot: { fullName: 'س', salarySource: null } })
  // اللي الشاشة بتقراه من مصدر الراتب هو التلاتة دول بس، ومكونات الراتب مابتتقراش فيها
  const page = web('src/app/payroll/page.tsx')
  assert.deepEqual([...new Set(page.match(/salarySource\??\.[a-zA-Z]+/g) ?? [])].map(read => read.split('.').pop()).sort(), ['effectivePayrollPeriod', 'kind', 'referencePeriod'])
  assert.equal(page.includes('salaryComponents'), false)
})

test('SV-02: بند الحدث من غير التفصيل وببصمته', () => {
  const breakdown = JSON.stringify(stored)
  const item = { id: 7, runId: 2, employeeId: 11, basicSalary: 6000, netPay: '7800.00', loanInstallments: 350, breakdown }
  const eventItem = payrollEventItem(item)
  assert.equal('breakdown' in eventItem, false)
  assert.deepEqual({ ...eventItem, breakdownSha256: undefined }, { id: 7, runId: 2, employeeId: 11, basicSalary: 6000, netPay: '7800.00', loanInstallments: 350, breakdownSha256: undefined })
  assert.equal(eventItem.breakdownSha256, crypto.createHash('sha256').update(breakdown, 'utf8').digest('hex'))
  assert.equal(item.breakdown, breakdown, 'البند الأصلي مابيتغيرش')
  // تفصيل فاضي: بصمة النص الفاضي (ثابتة)
  assert.equal(payrollEventItem({ id: 1, breakdown: null }).breakdownSha256, payrollBreakdownSha256(''))
  assert.equal(payrollBreakdownSha256(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
})

test('SV-03: شاشة المسير بتطلب العرض الخفيف، وبتقرا من التفصيل مفاتيحه بس', () => {
  const page = web('src/app/payroll/page.tsx')
  assert.match(page, /fetchPayrollRun\(id, 'screen'\)/, 'فتح المسير بالعرض الخفيف')
  assert.doesNotMatch(page, /fetchPayrollRun\([^,)]+\)/, 'مفيش طلب لتفاصيل المسير الكاملة من الشاشة')
  assert.match(web('src/lib/api.ts'), /fetchPayrollRun = \(id: number, view\?: 'screen'\)/)
  // مكونات ومساعدات القسيمة اللي بتقرا التفصيل الكامل مش في شاشة المسير
  for (const name of ['PayrollAttendanceBreakdown', 'PayrollLatenessTierBreakdown', 'PayrollShadowAttendanceBreakdown', 'payrollShadowAttendance',
    'savedFinancialExemptions', 'latenessTierEffects']) assert.equal(page.includes(name), false, `${name} بيقرا التفصيل الكامل — ضيف مفتاحه لعرض الشاشة قبل ما تستعمله هنا`)
  // كل قراءة للتفصيل في الشاشة ومساعداتها، بالمفتاح اللي بتقراه
  const reads = [
    ['src/app/payroll/page.tsx', 1, ["JSON.parse(item.breakdown || '{}').leaveDeductionLines"]],
    ['src/lib/payroll-item-totals.ts', 4, ["JSON.parse(item.breakdown || '{}').settlementPayout", "JSON.parse(item.breakdown || '{}').statutory?.total", 'detail.coverFrom', 'detail.coverTo', 'detail.coverDays', 'detail.prorataFactor',
      'detail.monthlyDays', 'detail.missingPunchDates']],
    ['src/components/PayrollOvertimeBreakdown.tsx', 1, ["JSON.parse(item.breakdown || '{}').overtime"]],
    ['src/components/PayrollInstallmentBreakdown.tsx', 1, ["JSON.parse(item.breakdown || '{}').installmentPlan"]],
    ['src/components/PayrollObligationBreakdown.tsx', 1, ['breakdown.obligationLines']],
  ]
  for (const [file, parses, snippets] of reads) {
    const source = web(file)
    assert.equal(source.split('JSON.parse(item.breakdown').length - 1, parses, `${file}: عدد قراءات التفصيل اتغيّر — راجع مفاتيح عرض الشاشة`)
    for (const snippet of snippets) assert.ok(source.includes(snippet), `${file}: ${snippet}`)
    for (const key of source.match(/detail\.[a-zA-Z]+/g) ?? []) {
      if (file === 'src/lib/payroll-item-totals.ts') assert.ok(PAYROLL_RUN_SCREEN_BREAKDOWN_KEYS.includes(key.slice('detail.'.length)), `${file}: ${key} مش في مفاتيح عرض الشاشة`)
    }
  }
  // دقايق «إذن بخصم» من مجاميع خصم الحضور
  assert.ok(web('src/lib/payroll-lines-api.ts').includes("JSON.parse(item.breakdown || '{}')?.attendanceDeductions?.totals?.permissionMinutes"))
  assert.match(page, /payrollItemPermissionMinutes\(item\)/)
})

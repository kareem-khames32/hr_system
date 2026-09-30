'use strict'
// فلتر «الفرع ← الإدارة ← القسم ← الفريق» الموحد (طلب المالك 30 سبتمبر) متوصل في كل شاشة فيها موظفين — قراءة المصدر بلا قاعدة ولا خادم:
//  OFW-01) كل شاشة بتستخدم الفلتر (الـhook والشريط والمطابقة أو org.params للخادم)، والقوائم القديمة للفرع/القسم/الفريق اتشالت.
//  OFW-02) الأرقام والإجماليات والتصدير من الصفوف المتفلترة (أو الخادم بنفس الفلتر) — مفيش إجمالي خادم جنب صفوف متفلترة.
//  OFW-03) الخادم: النداء الجديد بصلاحيات عرض الشاشات، ومعاملات الفلتر في الشاشات اللي بتترقّم أو بتتجمّع هناك، والنداءات الجديدة
//          في ملفات مستقلة (مش api.ts)، والفلتر مالوش دعوة بشاشات المسارين التانيين.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '../..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')

// [الملف، نصوص لازم تكون موجودة، نصوص لازم تكون اتشالت]
const SCREENS = [
  // ===== الموظفين =====
  ['src/app/employees/page.tsx', ['return matchesSearch && org.matches(emp.id) && matchesStatus', 'exportEmployeesXlsx(filteredEmployees.map((e) => e.id))'],
    ['departmentChoiceGroups(', 'selectedDepartment']],
  ['src/app/employees/archived/page.tsx', ['const orgEmployees = archivedEmployees.filter((emp) => org.matches(emp.id))',
    "const archivedCount = orgEmployees.filter((e) => e.status === 'archived').length", 'const filteredEmployees = orgEmployees.filter', 'filteredEmployees.map((e) => ['],
    ['filterDept']],
  ['src/app/employees/contracts/page.tsx', ['const orgContracts = contracts.filter((contract) => org.matches(contract.employeeId))', 'total: orgContracts.length',
    'const filteredContracts = orgContracts.filter', 'filteredContracts.map((c) => ['], []],
  ['src/app/employees/documents/page.tsx', ['const orgDocs = documents.filter((doc) => org.matches(doc.employeeId))', 'total: orgDocs.length',
    'const filteredDocs = orgDocs.filter'], []],
  ['src/app/employees/custody/page.tsx', ['const orgRecords = records.filter((r) => org.matches(r.employeeId))', "active: orgRecords.filter((r) => r.status === 'ACTIVE').length",
    'const filtered = orgRecords.filter'], ['filterBranch']],
  ['src/app/employees/onboarding/page.tsx', ['const orgList = list.filter((e) => org.matches(e.id))', 'const inProgress = orgList.filter',
    '.filter((e) => org.matches(e.id))', '`الكل (${orgList.length})`'], []],
  ['src/app/employees/transfers/page.tsx', ['const orgTransfers = transfers.filter((t) => org.matches(t.employeeId))', 'total: orgTransfers.length',
    'الكل ({orgTransfers.length})'], []],
  ['src/app/employees/hiring-documents/page.tsx', ['.filter((row) => org.matches(row.employeeId))', "const branchId = org.params.branchId ?? ''",
    'const next = prev.filter((id) => rows.some((row) => row.employeeId === id))'], ['canSeeBranch(']],
  ['src/app/offboarding/page.tsx', ['const orgCases = cases.filter((c) => org.matches(c.employeeId))', "inClearance: orgCases.filter((c) => c.status === 'IN_CLEARANCE').length"], []],
  // ===== الحضور =====
  ['src/app/attendance/page.tsx', ['const orgRecords = records.filter((r) => org.matches(r.employeeId))', 'total: orgRecords.length',
    'const filteredRecords = orgRecords.filter', 'filteredRecords.map((r) => [r.employeeCode'], ['selectedDepartment', 'departmentOptions']],
  ['src/app/attendance/permissions/page.tsx', ['.filter((p) => org.matches(p.requesterId))'], []],
  ['src/app/attendance/manual-entry/page.tsx', ['const orgPunches = punches.filter((p) => org.matches(p.employeeId))', 'total: orgPunches.length',
    'const filteredPunches = orgPunches.filter'], []],
  ['src/app/attendance/overtime/page.tsx', ['const orgEntries = entries.filter((e) => org.matches(e.employeeId))', "detected: orgEntries.filter((e) => e.status === 'DETECTED').length",
    'const filtered = orgEntries.filter', '<OrgTargetPicker'], []],
  ['src/app/attendance/exemptions/page.tsx', ['(data?.rows ?? []).filter(row => org.matches(row.employeeId))'], []],
  ['src/app/attendance/reports/page.tsx', ['const attendanceRows = allAttendanceRows.filter((row) => org.matches(Number(row.employeeId)))',
    'const overtimeRows = allOvertimeRows.filter((row) => org.matches(Number(row.employeeId)))', 'filteredData.map(row => [row.employeeCode'], []],
  ['src/app/attendance/weekly-schedule/page.tsx', ['const orgRows = rows.filter((row) => org.matches(row.id))', 'const noScheduleCount = orgRows.filter',
    'const filteredRows = orgRows.filter'], ['selectedBranch', 'selectedDepartment', 'selectedTeam']],
  // ===== الإجازات =====
  ['src/app/leaves/page.tsx', ['...orgFilterQueryValues(org.params)', '|${org.paramsKey}`'], []],
  ['src/app/leaves/balance/page.tsx', ['const orgRows = rows.filter((r) => org.matches(r.emp.id))', 'totalRemaining: orgRows.reduce',
    'const filtered = orgRows.filter', 'filtered.flatMap(row =>'], ['filterBranch']],
  ['src/app/leaves/year-end/page.tsx', ['useOrgFilter({ lockBranchId: branchId, disabled: closing })', 'const shownTotals = preview && org.active ? yearEndTotalsOf(orgRows) : totals',
    'const orgHistory = history.filter((h) => org.matches(h.employeeId))', '<OrgTargetPicker', 'الفلتر للعرض بس'], []],
  ['src/app/leaves/calendar/page.tsx', ['const leaves = allLeaves.filter((leave) => org.matches(leave.employeeId))'], []],
  // ===== الرواتب =====
  ['src/app/payroll/page.tsx', ['if (!(snapshot ? org.matchesPlacement(snapshot) : org.matches(item.employeeId))) return false',
    'const runTotals = payrollRunTotals(filteredItems)', 'filteredItems.map((item) => {', 'data-pay-methods-hidden'], []],
  ['src/components/payroll/PayrollOverviewTabs.tsx', ['org.matches(row.employeeId) &&', 'departmentIds: org.params.departmentIds ?? null', 'filters={effective}',
    '{!PAYROLL_FILTERED_TABS.includes(tab) && org.element}'], []],
  ['src/components/payroll/PayrollEmployeeFilters.tsx', ['{org.element}', 'org.reset()'], ['linkedFilterOptions', 'pickBranch', 'pickDepartment']],
  ['src/components/payroll/PayrollAllowancesTab.tsx', ['const orgRows = (data?.rows ?? []).filter(row => org.matches(row.employeeId))', 'allowanceTotalsOf(orgRows)',
    '{org.element}', "const cancelledCount = orgRows.filter(row => row.state === 'CANCELLED').length"], ['data?.totals.amount', 'data?.totals.byType']],
  ['src/components/payroll/PayrollMonthLinesTable.tsx', ['employeeId: number }) => boolean', 'sumMoney(rows.map(row => row.totals[side]))'], []],
  ['src/app/payroll/loans/page.tsx', ['const orgLoans = loans.filter((l) => org.matches(l.employeeId))', 'const openLoans = orgLoans.filter',
    'const datedLoans = !activeRange ? orgLoans : orgLoans.filter'], []],
  ['src/app/payroll/bank-sheet/page.tsx', ['fetchBankSheetFor(Number(runId), org.params)', '}, [runId, org.paramsKey])', 'downloadCsv(`${fileBase(sheet)}.csv`, HEADER, [...sheetRows(sheet), ...sheetTotals(sheet)])'], ['filterBankSheet', 'org.matches']],
  ['src/app/payroll/disbursement/page.tsx', ['departmentIds: org.params.departmentIds ?? null', 'load(runId, effective)',
    'markDisbursementFiltered(runId!, { paid, note, expectedCount }, effective)', 'org.reset()'], ['view.facets.branches', 'view.facets.departments', 'view.facets.teams']],
  ['src/components/payroll/TypedDeductionsWorkspace.tsx', ["useOrgFilter({ enabled: mode === 'admin' })", 'rows={rows.filter(row => org.matches(row.employee.id))}',
    "orgElement={mode === 'admin' ? org.element : null}", 'truncated={rows.length >= LIST_LIMIT}'], []],
  ['src/components/payroll/BonusesWorkspace.tsx', ["useOrgFilter({ enabled: mode === 'admin' })", 'rows={rows.filter(row => org.matches(row.employee.id))}',
    "orgElement={mode === 'admin' ? org.element : null}", 'shown.map(row => [row.id'], []],
  ['src/app/payroll/gosi/page.tsx', ['filterSocialInsuranceReport(fullReport, org.matches)', 'fetchSocialInsuranceReport(target, null)'], ['setBranchId']],
  ['src/app/payroll/reports/page.tsx', ['fetchPayrollRunsReport(orgFilterQueryValues(org.params))', 'useEffect(load, [org.paramsKey])'], []],
  // ===== الطلبات والتقارير والإعدادات =====
  ['src/app/requests-console/page.tsx', ['const orgRequests = requests.filter((r) => (r.masked ? org.matchesPlacement({ branchId: r.branchId }) : org.matches(r.requesterId)))',
    'total: orgRequests.length', 'const filtered = orgRequests.filter', 'requesterId: masked ? null : r.requesterId ?? null'], ['filterBranch']],
  ['src/app/reports/page.tsx', ['fetchHeadcountReportFor(org.params)', 'fetchLeavesReportFor(currentYear, org.params)', 'fetchPayrollReportFor(org.params)',
    'fetchRequestsReportFor(org.params)', 'const attendance = allAttendance.filter', 'const overtime = allOvertime.filter', '}, [org.paramsKey])'], []],
  ['src/app/reports/_financial/ReportShell.tsx', ['{ ...current, org: org.params }', 'org.label ? org.label'], ['filters.branchId', 'filters.departmentId', 'departmentOptions']],
  ['src/app/reports/cost-centers/page.tsx', ['fetchCostCenterReport({ period, org: org.params, includeDraft })', 'useEffect(load, [period, org.paramsKey, includeDraft])'], ['setBranchId']],
  ['src/app/settings/users/page.tsx', ['user.employeeId ? org.matches(user.employeeId) : org.matchesPlacement({ branchId: user.branchId ?? null })',
    'total: orgUsers.length', 'const filteredUsers = orgUsers.filter'], []],
]
// المكوّنات اللي بتاخد الفلتر من الشاشة (org في الـprops) بدل ما تعمل hook
const RECEIVES_ORG = new Set(['src/components/payroll/PayrollOverviewTabs.tsx', 'src/components/payroll/PayrollEmployeeFilters.tsx',
  'src/components/payroll/PayrollAllowancesTab.tsx', 'src/components/payroll/PayrollMonthLinesTable.tsx'])

test('OFW-01: كل شاشة فيها موظفين متوصل فيها الفلتر الموحد، والقوائم القديمة للفرع/القسم/الفريق اتشالت', () => {
  for (const [file, present, gone] of SCREENS) {
    const source = read(file)
    if (!RECEIVES_ORG.has(file)) {
      assert.match(source, /import \{ useOrgFilter(, type OrgFilterHandle)? \} from '@\/components\/OrgFilter'/, `${file}: import`)
      assert.match(source, /const org = useOrgFilter\(/, `${file}: hook`)
      assert.ok(/\{org\.element\}|orgElement=\{mode === 'admin' \? org\.element : null\}|org=\{org\}/.test(source), `${file}: الشريط`)
    }
    for (const text of present) assert.ok(source.includes(text), `${file}: ${text}`)
    for (const text of gone) assert.ok(!source.includes(text), `${file}: لسه فيه ${text}`)
  }
  // شاشة المسير بتدّي نفس الفلتر للتبويبات
  const payroll = read('src/app/payroll/page.tsx')
  assert.ok(payroll.includes('<PayrollOverviewTabs tab={tab} branches={branches} departments={departments} teams={teams} employees={employees} org={org}'))
  assert.ok(payroll.includes('<PayrollAllowancesTab branches={branches} departments={departments} teams={teams} org={org} employees={employees}'))
  // المنتقي بتاع الاستهداف (OrgTargetPicker) زي ما هو في الشاشات اللي بتستهدف
  for (const file of ['src/app/attendance/overtime/page.tsx', 'src/app/leaves/year-end/page.tsx', 'src/app/attendance/weekly-schedule/page.tsx']) {
    assert.match(read(file), /<OrgTargetPicker/, file)
  }
})

test('OFW-02: الشريط نفسه — أربع قوائم مترابطة بـ«الكل»، والفرع المقفول، و«مسح الفلتر»، وبيلف على الموبايل، والتحميل مرة للجلسة', () => {
  const component = read('src/components/OrgFilter.tsx')
  for (const text of ['aria-label="الفرع"', 'aria-label="الإدارة"', 'aria-label="القسم"', 'aria-label="الفريق"', 'كل الإدارات', 'كل الأقسام', 'كل الفرق',
    "companyWide ? 'كل الفروع' : 'كل فروعك'", 'disabled={disabled || locked}', 'مسح الفلتر', 'data-org-filter-clear',
    'grid grid-cols-2 gap-2 min-w-0 w-full sm:flex sm:flex-wrap sm:items-center sm:w-auto', 'lockedBranchIdOf(user)', 'loadOrgFilterContext()',
    'peekOrgFilterContext()']) {
    assert.ok(component.includes(text), text)
  }
  const lib = read('src/lib/org-filter.ts')
  assert.ok(lib.includes("apiFetch<OrgFilterContext>('/org/filter-context')"))
  assert.ok(lib.includes('branchLocalSubtree(context.units, [root])'), 'الإدارة/القسم بأقسامه جوه فرعه بس')
  assert.ok(lib.includes('return employee ? matchesPlacement(employee) : false'), 'المش معروف مش مطابق')
})

test('OFW-03: الخادم — النداء بصلاحيات الشاشات، والمعاملات في اللي بيترقّم أو بيتجمّع هناك، والنداءات الجديدة في ملفات مستقلة', () => {
  const controller = read('api/src/org/org.controller.ts')
  assert.ok(controller.includes("@Get('org/filter-context')") && controller.includes('@Perm(...ORG_FILTER_VIEW_PERMS)'))
  assert.ok(controller.includes('return this.org.filterContext(branchScopeOf(user))'))
  const service = read('api/src/org/org.service.ts')
  for (const text of ['parentId: visible(u.parentId, unitById)', 'departmentId: visible(e.departmentId, unitById)', 'teamId: visible(e.teamId, teamIds)',
    "where: scope === null ? { isActive: true } : { isActive: true, id: branchIdIn(scope) }", 'select: { id: true, branchId: true, departmentId: true, teamId: true }']) {
    assert.ok(service.includes(text), text)
  }
  // الشاشات اللي بتترقّم أو بتتجمّع في الخادم: الفلتر بيتبعت، والخادم بيطبّقه فوق النطاق
  assert.ok(read('api/src/requests/leaves.controller.ts').includes('const org = parseOrgFilter({ branchId, departmentIds, teamId })'))
  const reports = read('api/src/reports/reports.controller.ts')
  for (const route of ['headcount', 'leaves', 'payroll', 'requests']) {
    const block = reports.slice(reports.indexOf(`@Get('${route}')`), reports.indexOf('@Get(', reports.indexOf(`@Get('${route}')`) + 5))
    assert.ok(block.includes('this.orgFilterOf(user, { branchId, departmentIds, teamId })'), route)
  }
  assert.ok(reports.includes("AND ((t.isConfidential = 1 AND ${confidential})"), 'السرّي مايتعدّش بالإدارة/القسم/الفريق')
  assert.ok(read('api/src/reports/financial-report.service.ts').includes('x.[departmentId] IN ('))
  assert.ok(read('src/app/reports/_financial/api.ts').includes("params.set('departmentIds', filters.org.departmentIds.join(','))"))
  assert.ok(read('api/src/reports/cost-center-report.service.ts').includes('x.[departmentId] IN ('))
  assert.ok(read('api/src/payroll/payroll-disbursement.ts').includes('filter.departmentIds.includes(row.departmentId)'))
  assert.ok(read('api/src/payroll/payroll-overview-filters.ts').includes('filters.departmentIds.includes(Number(row.departmentId))'))
  assert.ok(read('api/src/payroll/payroll-reports.ts').includes('orgFilterMatches(effectivePlacement(run, member), org)'))
  // النداءات الجديدة مش في api.ts
  const api = read('src/lib/api.ts')
  assert.doesNotMatch(api, /filter-context|org-filter|reports-org-api/)
  assert.ok(read('src/lib/reports-org-api.ts').includes("withOrg('/reports/headcount', params)"))
  // الفلتر مالوش دعوة بملفات المسارين التانيين (الملف الشخصي والإطار وشاشات البوابة)
  for (const file of ['src/app/profile/page.tsx', 'src/components/layout/Sidebar.tsx', 'src/components/layout/MainLayout.tsx', 'src/components/layout/Header.tsx',
    'src/app/page.tsx', 'src/app/requests/page.tsx', 'src/app/approvals-inbox/page.tsx', 'src/app/notifications/page.tsx', 'src/app/calendar/page.tsx',
    'src/app/leaves/request/page.tsx', 'src/app/payroll/my-approvals/page.tsx']) {
    assert.ok(!read(file).includes('OrgFilter'), file)
  }
})

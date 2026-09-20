// طلب المالك (20 سبتمبر) في الواجهة: فلاتر على «المدرجين بالمسير» و«موظفين ليس لديهم مسير»، وجدول موحد
// («الكل / المدرجين في مسير / بلا مسير») بعمود «المسير»، واختيار متعدد بنافذة نقل واحدة بنتيجة لكل موظف.
// فحص نصي لمصدر الواجهة + تشغيل دوال بناء الاستعلام؛ لا SQL ولا شبكة.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true,
  compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const root = path.resolve(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const api = require('../../src/lib/payroll-overview-api')

test('بناء الاستعلام: الفلاتر الفاضية ما بتتبعتش، والمملوءة بتروح للخادم بأسمائها', () => {
  const empty = api.emptyPayrollOverviewFilters()
  assert.equal(api.payrollOverviewQuery('2026-09', empty), '?period=2026-09', 'بلا فلاتر = الشهر بس')
  assert.equal(api.payrollOverviewFilterCount(empty), 0)
  const filled = { ...empty, search: ' أحمد ', branchId: 3, departmentId: 5, teamId: 7, jobTitle: 'محاسب',
    statuses: ['active', 'suspended'], hiredFrom: '2024-01-01', hiredTo: '2024-12-31', runId: 12, reasonCode: 'OUT_OF_ALL_RUNS', membership: 'unassigned' }
  const query = new URLSearchParams(api.payrollOverviewQuery('2026-09', filled).slice(1))
  assert.equal(query.get('period'), '2026-09')
  assert.equal(query.get('search'), 'أحمد', 'البحث بيتشال منه الفراغ')
  assert.deepEqual([query.get('branchId'), query.get('departmentId'), query.get('teamId'), query.get('runId')], ['3', '5', '7', '12'])
  assert.equal(query.get('statuses'), 'active,suspended')
  assert.deepEqual([query.get('hiredFrom'), query.get('hiredTo')], ['2024-01-01', '2024-12-31'])
  assert.equal(query.get('reasonCode'), 'OUT_OF_ALL_RUNS')
  assert.equal(query.get('membership'), 'unassigned')
  // المنظور مش فلتر، ومدى التاريخ فلتر واحد
  assert.equal(api.payrollOverviewFilterCount(filled), 9)
  assert.equal(api.payrollOverviewFilterCount({ ...empty, membership: 'assigned' }), 0)
  assert.equal(api.payrollOverviewQuery('2026-09', { ...empty, membership: 'all' }), '?period=2026-09', '«الكل» ما بتتبعتش')
})

test('نداءات الفلاتر والجدول الموحد ووجهات النقل — كلها apiFetch بمسارات الخادم', () => {
  const lib = read('src/lib/payroll-overview-api.ts')
  for (const route of ['/payroll/overview/included', '/payroll/overview/unassigned', '/payroll/overview/roster', '/payroll/overview/run-targets']) {
    assert.ok(lib.includes(route), route)
  }
  assert.ok(lib.includes('payrollOverviewQuery(period, filters)'), 'كل التبويبات بتبعت نفس الفلاتر')
  assert.doesNotMatch(lib, /\bfetch\(/, 'كل النداءات من apiFetch')
  const runs = read('src/lib/payroll-runs-api.ts')
  assert.ok(runs.includes("send<PayrollBulkMembershipResult>(`/payroll/runs/${runId}/members/bulk`, 'POST', input)"), 'نداء واحد للاختيار المختلط')
  assert.ok(runs.includes("send<PayrollRunMembershipResult>(`/payroll/runs/${runId}/members`, 'POST', input)"), 'النداء المفرد باقي')
})

test('شريط الفلاتر: بحث وفرع وقسم وفريق ومسمى وحالة ومدى تعيين، وعدّاد الفلاتر و«مسح الفلاتر» وعدد الصفوف', () => {
  const filters = read('src/components/payroll/PayrollEmployeeFilters.tsx')
  for (const text of ['data-payroll-employee-filters', 'data-active-filter-count', 'data-clear-filters', 'data-filtered-row-count',
    'مسح الفلاتر', 'فلتر مفعّل', 'payrollOverviewFilterCount(value)', 'linkedFilterOptions(']) assert.ok(filters.includes(text), text)
  for (const label of ['الفرع', 'القسم', 'الفريق', 'المسمى الوظيفي', 'حالة الموظف', 'تاريخ التعيين', 'المسير', 'سبب عدم الإدراج']) {
    assert.ok(filters.includes(`>${label}<`), label)
  }
  // «كل التواريخ» من DayRangeFilter نفسه (onClear) — مش فلتر تاريخ جديد
  assert.ok(filters.includes('<DayRangeFilter') && filters.includes('onClear={() => set({ hiredFrom: null, hiredTo: null })}'))
  assert.ok(read('src/components/DayRangeFilter.tsx').includes('كل التواريخ'), 'خيار «كل التواريخ» في الفلتر الموحد')
  // «مسح الفلاتر» بيمسح الفلاتر ويسيب المنظور المختار
  assert.ok(filters.includes('onChange({ ...emptyPayrollOverviewFilters(), membership: value.membership })'))
  for (const status of ['active', 'probation', 'suspended', 'terminated', 'archived']) {
    assert.ok(api.PAYROLL_EMPLOYMENT_STATUS_LABELS[status], status)
  }
  assert.deepEqual(api.PAYROLL_EMPLOYMENT_STATUS_LABELS.active, 'نشط')
  assert.deepEqual(api.PAYROLL_EMPLOYMENT_STATUS_LABELS.probation, 'تحت التجربة')
})

test('التبويبات: الفلترة في الخادم لكل التبويبات الثلاثة، والشهر المختار محفوظ، والعدد بيعكس الفلتر', () => {
  const tabs = read('src/components/payroll/PayrollOverviewTabs.tsx')
  assert.ok(tabs.includes("export const PAYROLL_FILTERED_TABS: PayrollOverviewTab[] = ['roster', 'included', 'unassigned']"))
  assert.ok(tabs.includes('useFilteredMonthData<OverviewRoster>(period, filters, fetchPayrollRoster'))
  assert.ok(tabs.includes("useFilteredMonthData<OverviewIncluded>(period, { ...filters, membership: 'all' }, fetchPayrollIncluded)"))
  assert.ok(tabs.includes("useFilteredMonthData<OverviewUnassigned>(period, { ...filters, membership: 'all' }, fetchPayrollWithoutRun, version)"))
  // الشهر جوه نفس الكارت زي ما كان، والفلاتر مشتركة بين التبويبات الثلاثة
  assert.ok(tabs.includes('> شهر الرواتب</span>') && tabs.includes('data-payroll-period-range'))
  assert.ok(tabs.includes('useState<PayrollOverviewFilterState>(emptyPayrollOverviewFilters)'))
  assert.ok(tabs.includes('shownCount={rows.length} totalCount={data?.total ?? 0}'), 'العدد الظاهر من الصفوف المفلترة')
  // كل تبويب بيبعت قائمة الفلتر الخاصة به: المسير للمدرجين، والسبب لبلا مسير
  assert.ok(tabs.includes('runs={data?.runOptions ?? []} cycleStartDay={cycleStartDay}'), 'فلتر «في أنهي مسير» في تبويب المدرجين')
  assert.ok(tabs.includes('reasons={data?.reasonOptions ?? []} cycleStartDay={cycleStartDay}'), 'فلتر سبب الاستبعاد في تبويب بلا مسير')
})

test('الجدول الموحد: منظور «الكل / المدرجين في مسير / بلا مسير»، عمود «المسير»، واختيار الكل وعدد المختار', () => {
  const tabs = read('src/components/payroll/PayrollOverviewTabs.tsx')
  assert.deepEqual(api.PAYROLL_MEMBERSHIP_VIEW_LABELS, { all: 'الكل', assigned: 'المدرجين في مسير', unassigned: 'بلا مسير' })
  for (const text of ['data-roster-view', 'data-roster-view-option', 'data-roster-actions', 'data-picked-count', 'data-pick-all',
    'data-pick-employee', 'data-move-employee', 'data-roster-move', 'بلا مسير', 'اختيار الكل']) assert.ok(tabs.includes(text), text)
  assert.ok(tabs.includes('{data.counts[value]}'), 'عدّاد كل منظور')
  assert.ok(tabs.includes('`أضف ${picked.length} لمسير…` : `نقل ${picked.length} لمسير…`'), 'شريط إجراء واحد بالاسمين')
  // نفس النافذة من الشريط ومن الصف
  assert.ok(tabs.includes('<PayrollMoveToRunModal employees={moving}'))
  assert.ok(tabs.includes('onClick={() => setMoving(candidates([row.employeeId]))}'), 'نقل موظف واحد من صفه')
  // التبويبات القديمة باقية
  const page = read('src/app/payroll/page.tsx')
  assert.match(page, /\['roster', 'كل الموظفين والمسير'\],\s*\['included', 'المدرجين بالمسير'\],\s*\['unassigned', 'موظفين ليس لديهم مسير'\],/)
})

test('نافذة النقل الواحدة: قائمة مسيرات بالبحث بفترتها ومعادلتها، شهر البداية، السبب، ونتيجة لكل موظف', () => {
  const modal = read('src/components/payroll/PayrollMoveToRunModal.tsx')
  for (const text of ['data-testid="payroll-move-to-run"', 'data-move-target-search', 'data-move-target-list', 'data-move-target=',
    'data-move-reason', 'data-move-submit', 'data-move-result', 'data-move-result-row', 'التغيير يبدأ من شهر',
    'fetchPayrollRunTargets(month)', 'movePayrollRunMembers(targetId,']) assert.ok(modal.includes(text), text)
  assert.ok(modal.includes('moveTargetDetails(run)') && modal.includes("dayRangeLabel({ from: run.startDate, to: run.endDate })"), 'فترة المسير في القائمة')
  assert.ok(modal.includes('معادلة «${run.policyName}»'), 'مجموعة المعادلات في القائمة')
  assert.ok(modal.includes("row.outcome === 'SKIPPED' ? `اتخطى — ${row.skipReason"), 'سبب التخطي لكل موظف')
  assert.ok(modal.includes("row.outcome === 'MOVED' ? `تم — اتنقل من"), 'نتيجة «تم» لكل موظف')
  assert.ok(modal.includes('<PayrollPeriodSelect'), 'شهر بداية التغيير من المنتقي الموحد')
  assert.doesNotMatch(modal, /\bfetch\(/, 'كل النداءات من طبقة الـAPI')
})

test('نقل موظف واحد من صف المسير ومن ملفه بنفس النافذة', () => {
  const page = read('src/app/payroll/page.tsx')
  assert.ok(page.includes("import { PayrollMoveToRunModal } from '@/components/payroll/PayrollMoveToRunModal'"))
  assert.ok(page.includes('<PayrollMoveToRunModal employees={[{ employeeId: moveMemberFor.employeeId, fullName: moveMemberFor.name, runId: runDetail.id'),
    'صف المسير بيفتح نفس النافذة بموظف واحد')
  const card = read('src/components/payroll/PayrollRunMoveMemberModal.tsx')
  assert.ok(card.includes('<PayrollMoveToRunModal period={period} onClose={onClose} onDone={onMoved}'), 'الغلاف القديم بيستعمل النافذة الجديدة')
  assert.ok(card.includes('data-move-employee-run='), 'زر النقل في ملف الموظف باقي')
})

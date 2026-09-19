// فلاتر التاريخ في الحضور والرواتب (قاعدة المالك 2026-09-19): «من تاريخ / إلى تاريخ» باليوم،
// والافتراضي شهر الرواتب (من يوم بداية الدورة لليوم اللي قبله، 23 → 22) مش الشهر التقويمي.
// منطق الواجهة + React SSR + مصدر الشاشات والـAPI فقط؛ لا SQL.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true,
  compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const React = require('../../node_modules/react')
const { renderToStaticMarkup } = require('../../node_modules/react-dom/server')
const ui = require('../../src/lib/payroll-month-range')
const { DayRangeFilter } = require('../../src/components/DayRangeFilter')
const backend = require('../src/payroll/payroll-period')
const range = require('../src/attendance/attendance-report-range')
const root = path.resolve(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

test('payroll month: cycle 23 → «راتب سبتمبر» = 23 أغسطس → 22 سبتمبر، ويوم 23 يبدأ شهر أكتوبر', () => {
  assert.deepEqual(ui.payrollMonthBounds('2026-09', 23), { period: '2026-09', from: '2026-08-23', to: '2026-09-22' })
  assert.equal(ui.payrollPeriodOfDate('2026-09-19', 23), '2026-09')
  assert.equal(ui.payrollPeriodOfDate('2026-09-22', 23), '2026-09')
  assert.equal(ui.payrollPeriodOfDate('2026-09-23', 23), '2026-10')
  assert.deepEqual(ui.payrollMonthRangeOf('2026-09-19', 23), { period: '2026-09', from: '2026-08-23', to: '2026-09-22' })
  assert.deepEqual(ui.payrollMonthRangeOf('2026-12-25', 23), { period: '2027-01', from: '2026-12-23', to: '2027-01-22' })
  // السابق/التالي
  const current = { from: '2026-08-23', to: '2026-09-22' }
  assert.deepEqual(ui.shiftPayrollMonthRange(current, 23, -1), { period: '2026-08', from: '2026-07-23', to: '2026-08-22' })
  assert.deepEqual(ui.shiftPayrollMonthRange(current, 23, 1), { period: '2026-10', from: '2026-09-23', to: '2026-10-22' })
  assert.deepEqual(ui.shiftPayrollMonthRange({ from: '2027-01-05', to: '2027-01-06' }, 23, -1), { period: '2026-12', from: '2026-11-23', to: '2026-12-22' })
  // دورة 1 = شهر تقويمي
  assert.deepEqual(ui.payrollMonthRangeOf('2026-02-10', 1), { period: '2026-02', from: '2026-02-01', to: '2026-02-28' })
  assert.equal(ui.payrollMonthOfRange(current, 23), '2026-09')
  assert.equal(ui.payrollMonthOfRange({ from: '2026-08-23', to: '2026-09-21' }, 23), null)
})

test('the web payroll-month math matches the payroll engine for every cycle day and month (2024–2027)', () => {
  for (let cycle = 1; cycle <= 31; cycle++) {
    for (let year = 2024; year <= 2027; year++) {
      for (let month = 1; month <= 12; month++) {
        const period = `${year}-${String(month).padStart(2, '0')}`
        const engine = backend.payrollPeriodBounds(period, cycle)
        const web = ui.payrollMonthBounds(period, cycle)
        assert.deepEqual([web.from, web.to], [engine.startDate, engine.endDate], `${period} cycle ${cycle}`)
        for (const day of [engine.startDate, engine.endDate]) assert.equal(ui.payrollPeriodOfDate(day, cycle), backend.payrollPeriodOfDate(day, cycle), `${day} cycle ${cycle}`)
      }
    }
  }
})

test('day range editing, validation, overlap and labels', () => {
  const r = { from: '2026-08-23', to: '2026-09-22' }
  assert.deepEqual(ui.setRangeEdge(r, 'from', '2026-09-01'), { from: '2026-09-01', to: '2026-09-22' })
  assert.deepEqual(ui.setRangeEdge(r, 'from', '2026-10-01'), { from: '2026-10-01', to: '2026-10-01' }, '«من» بعد «إلى» يسحبها')
  assert.deepEqual(ui.setRangeEdge(r, 'to', '2026-08-01'), { from: '2026-08-01', to: '2026-08-01' })
  assert.deepEqual(ui.setRangeEdge(r, 'to', ''), r, 'تفريغ الحقل ما يكسرش الفلتر')
  assert.equal(ui.dayRangeError(r), null)
  assert.match(ui.dayRangeError({ from: '2026-09-02', to: '2026-09-01' }), /إلى تاريخ/)
  assert.match(ui.dayRangeError({ from: '2025-01-01', to: '2026-09-01' }), /366/)
  assert.match(ui.dayRangeError({ from: '2026-02-30', to: '2026-03-01' }), /من تاريخ/)
  assert.equal(ui.dateInRange('2026-09-22', r), true); assert.equal(ui.dateInRange('2026-09-23', r), false)
  assert.equal(ui.dateInRange('2026-08-23T10:00:00', r), true)
  assert.equal(ui.periodOverlapsRange('2026-09-10', null, r), true)
  assert.equal(ui.periodOverlapsRange('2026-01-01', '2026-08-22', r), false)
  assert.equal(ui.periodOverlapsRange('2026-09-22', '2026-12-31', r), true)
  assert.equal(ui.localDayOf('2026-09-01'), '2026-09-01')
  assert.equal(ui.localDayOf('not a date'), '')
  assert.equal(ui.dayRangeLabel(r), '23 أغسطس – 22 سبتمبر 2026')
  assert.equal(ui.dayRangeLabel({ from: '2026-12-23', to: '2027-01-22' }), '23 ديسمبر 2026 – 22 يناير 2027')
  assert.equal(ui.dayRangeQuery(r), 'from=2026-08-23&to=2026-09-22')
  assert.equal(ui.fallbackPayrollMonthContext('2026-09-19').from, '2026-09-01', 'لو السيرفر مردّش الشاشة تفضل شغالة بشهر تقويمي')
})

test('DayRangeFilter renders «من تاريخ / إلى تاريخ» and the payroll-month navigation', () => {
  const html = renderToStaticMarkup(React.createElement(DayRangeFilter, { value: { from: '2026-08-23', to: '2026-09-22' }, onChange() {}, cycleStartDay: 23, today: '2026-09-19', idPrefix: 't' }))
    .replace(/<!-- -->/g, '')
  for (const text of ['من تاريخ', 'إلى تاريخ', 'type="date"', 'value="2026-08-23"', 'value="2026-09-22"', 'شهر الرواتب السابق', 'شهر الرواتب الحالي', 'شهر الرواتب التالي',
    'شهر رواتب سبتمبر 2026: 23 أغسطس – 22 سبتمبر 2026']) assert.ok(html.includes(text), text)
  const custom = renderToStaticMarkup(React.createElement(DayRangeFilter, { value: { from: '2026-09-01', to: '2026-09-10' }, onChange() {}, cycleStartDay: 23, today: '2026-09-19' }))
  assert.ok(custom.includes('1 – 10 سبتمبر 2026') || custom.includes('1 سبتمبر – 10 سبتمبر 2026'), custom)
  const bad = renderToStaticMarkup(React.createElement(DayRangeFilter, { value: { from: '2026-09-10', to: '2026-09-01' }, onChange() {} }))
  assert.ok(bad.includes('text-red-600') && !bad.includes('شهر الرواتب الحالي'), 'بدون يوم الدورة مفيش أزرار شهر، والخطأ ظاهر')
})

test('API range helper: from/to wins, month stays backward compatible, bad ranges are 400', () => {
  assert.deepEqual(range.reportDayRange({ from: '2026-08-23', to: '2026-09-22' }), { month: null, from: '2026-08-23', to: '2026-09-22' })
  assert.deepEqual(range.reportDayRange({ month: '2026-02' }), { month: '2026-02', from: '2026-02-01', to: '2026-02-28' })
  assert.deepEqual(range.reportDayRange({ month: '2026-09', from: '2026-09-01', to: '2026-09-05' }), { month: null, from: '2026-09-01', to: '2026-09-05' })
  assert.equal(range.reportDayRange({}), null)
  for (const bad of [{ from: '2026-09-01' }, { to: '2026-09-01' }, { from: '2026-09-05', to: '2026-09-01' }, { from: '2026-02-30', to: '2026-03-01' },
    { from: '2025-01-01', to: '2026-09-01' }, { month: '2026-13' }, { from: "2026-09-01' OR 1=1 --", to: '2026-09-02' }]) {
    assert.throws(() => range.reportDayRange(bad), error => error.getStatus?.() === 400, JSON.stringify(bad))
  }
  assert.deepEqual(range.payrollMonthContext(23, '2026-09-19'), { cycleStartDay: 23, today: '2026-09-19', period: '2026-09', from: '2026-08-23', to: '2026-09-22' })
  assert.equal(range.payrollMonthContext(23, '2026-09-23').period, '2026-10')
  assert.equal(range.payrollMonthContext(23, '2026-09-19', '2026-07-01').from, '2026-06-23')
  assert.deepEqual(range.payrollMonthContextOfPeriod(23, '2026-09-19', '2026-11'), { cycleStartDay: 23, today: '2026-09-19', period: '2026-11', from: '2026-10-23', to: '2026-11-22' })
  assert.equal(range.cycleStartDayOf('23'), 23); assert.equal(range.cycleStartDayOf('abc'), 23); assert.equal(range.cycleStartDayOf('1'), 1)
})

test('API: /attendance/payroll-month, and the attendance reports/sheet/overtime/punches accept from/to (parameterised, month still works)', () => {
  const controller = read('api/src/attendance/attendance.controller.ts')
  assert.match(controller, /@UseGuards\(JwtAuthGuard\)\s*\n\s*@Get\('payroll-month'\)/)
  assert.match(controller, /key: 'payroll\.cycle_start_day'/)
  for (const route of ['monthly', 'overtime', 'punches']) assert.ok(controller.includes('reportDayRange({ month, from, to })'), route)
  assert.equal(controller.match(/reportDayRange\(\{ month, from, to \}\)/g).length, 3)
  const service = read('api/src/attendance/attendance.service.ts')
  assert.match(service, /async monthly\(user: JwtPayload, employeeId: number, month: string, dayRange\?: \{ from: string; to: string \}\)/)
  assert.match(service, /date: Between\(rangeFrom, rangeTo\)/)
  assert.match(service, /async overtimeLog\(user: JwtPayload, month\?: string, dayRange\?: \{ from: string; to: string \}\)/)
  const reports = read('api/src/reports/reports.controller.ts')
  assert.equal((reports.match(/BETWEEN @0 AND @1/g) ?? []).length, 2)
  assert.doesNotMatch(reports, /LIKE '\$\{month\}%'/, 'no month string glued into SQL any more')
  assert.match(reports, /\[range\.from, range\.to\]/)
})

test('attendance screens open on the payroll month with «من تاريخ / إلى تاريخ» (no month picker left)', () => {
  const pages = ['src/app/attendance/reports/page.tsx', 'src/app/attendance/monthly-sheet/page.tsx', 'src/app/attendance/overtime/page.tsx',
    'src/app/attendance/manual-entry/page.tsx', 'src/app/attendance/permissions/page.tsx', 'src/app/attendance/exemptions/page.tsx', 'src/app/my/attendance/page.tsx']
  for (const file of pages) {
    const page = read(file)
    assert.match(page, /const \{ range, setRange, context \} = usePayrollDayRange\(\)/, file)
    assert.match(page, /<DayRangeFilter idPrefix="[\w-]+" value=\{range\} onChange=\{setRange\} cycleStartDay=\{context\?\.cycleStartDay\} today=\{context\?\.today\} \/>/, file)
    assert.doesNotMatch(page, /type="month"/, file)
    assert.doesNotMatch(page, /localMonth\(\)/, file)
  }
  assert.match(read('src/app/attendance/reports/page.tsx'), /Promise\.all\(\[fetchAttendanceReportRange\(range\), fetchOvertimeReportRange\(range\)\]\)/)
  const sheet = read('src/app/attendance/monthly-sheet/page.tsx')
  assert.match(sheet, /fetchAttendanceSheetRange\(employeeId, range\)/)
  assert.match(sheet, /get\('employeeId'\)/, 'رابط ?employeeId= يفتح كشف موظف معين')
  assert.match(read('src/app/attendance/overtime/page.tsx'), /fetchOvertimeLogRange\(r\)/)
  assert.match(read('src/app/attendance/manual-entry/page.tsx'), /fetchPunchesRange\('MANUAL', range\)/)
  assert.match(read('src/app/attendance/permissions/page.tsx'), /rows\.filter\(\(p\) => dateInRange\(p\.date, range\)\)/)
  assert.match(read('src/app/attendance/exemptions/page.tsx'), /periodOverlapsRange\(row\.effectiveFrom, row\.effectiveTo, range\)/)
  const api = read('src/lib/attendance-range-api.ts')
  for (const text of ['/attendance/monthly?employeeId=', '/attendance/overtime?', '/attendance/punches?source=', '/reports/attendance?', '/reports/overtime?']) assert.ok(api.includes(text), text)
  assert.match(read('src/lib/payroll-month-range.ts'), /apiFetch<PayrollMonthContext>\('\/attendance\/payroll-month'\)/)
})

test('payroll screens: day range on deductions/bonuses/runs report; run period stays a month but shows its exact dates', () => {
  for (const [file, prefix] of [['src/components/payroll/TypedDeductionsWorkspace.tsx', 'deductions'], ['src/components/payroll/BonusesWorkspace.tsx', 'bonuses']]) {
    const source = read(file)
    assert.ok(source.includes(`<DayRangeFilter idPrefix="${prefix}" value={range} onChange={setRange}`), file)
    assert.ok(source.includes('rows.filter(row => dateInRange(localDayOf(row.createdAt), range))'), file)
    assert.ok(source.includes('[focused, ...rangeRows]'), `${file}: the linked request always shows`)
    assert.ok(source.includes('برا الفترة المختارة'), `${file}: rows outside the range are counted, not silently hidden`)
  }
  const reports = read('src/app/payroll/reports/page.tsx')
  assert.ok(reports.includes('<DayRangeFilter idPrefix="payroll-runs-report"'))
  assert.ok(reports.includes('periodOverlapsRange(run.startDate, run.endDate, range)'))
  const overview = read('src/components/payroll/PayrollOverviewTabs.tsx')
  assert.ok(overview.includes('setPeriod(payrollMonth.period)'), 'overview opens on the current payroll period, not the calendar month')
  assert.ok(overview.includes('dayRangeLabel(periodRange)'))
  assert.doesNotMatch(overview, /thisMonth/)
  const panel = read('src/components/payroll/PayrollRunDefinitionPanel.tsx')
  assert.ok(panel.includes('dayRangeLabel(payrollMonthBounds(period, policy.cycleStartDay))'))
  assert.ok(panel.includes("from '../../lib/payroll-month-range'"), 'relative import keeps the SSR tests working')
  // اختيار المسير يفضل بالفترة، بس الاختيار بيوضح أيامها بالظبط
  for (const file of ['src/app/payroll/page.tsx', 'src/app/payroll/bank-sheet/page.tsx']) {
    assert.ok(read(file).includes('dayRangeLabel({ from: String(run.startDate).slice(0, 10), to: String(run.endDate).slice(0, 10) })'), file)
  }
})

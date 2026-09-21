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
const { DayRangeFilter, PayrollPeriodSelect } = require('../../src/components/DayRangeFilter')
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

test('month quick-pick helpers: options around the current payroll month, labels, optional max length', () => {
  const options = ui.payrollMonthOptions('2026-09')
  assert.equal(options.length, 28, '3 قدام + الجاري + 24 لورا')
  assert.deepEqual(options.slice(0, 5), ['2026-12', '2026-11', '2026-10', '2026-09', '2026-08'])
  assert.equal(options.at(-1), '2024-09')
  assert.ok(ui.payrollMonthOptions('2026-09', '2019-03').includes('2019-03'), 'الشهر المختار بالأسهم يفضل في القائمة')
  assert.deepEqual(ui.payrollMonthOptions(null, '2026-02'), ['2026-02'])
  assert.deepEqual(ui.payrollMonthOptions('bad', 'also bad'), [])
  assert.equal(ui.periodLabel('2026-09'), 'سبتمبر 2026')
  assert.equal(ui.isPeriodKey('2026-13'), false)
  const long = { from: '2025-01-01', to: '2026-09-01' }
  assert.match(ui.dayRangeError(long), /366/)
  assert.equal(ui.dayRangeError(long, null), null, 'فلتر اختياري (السجلات) من غير حد أقصى')
  assert.equal(ui.validDayRange(long), null)
  assert.deepEqual(ui.validDayRange(long, null), long)
  assert.equal(ui.validDayRange(null), null)
  assert.deepEqual(ui.validDayRange({ from: '2026-08-23', to: '2026-09-22' }), { from: '2026-08-23', to: '2026-09-22' })
})

test('DayRangeFilter renders the month quick-pick + «من تاريخ / إلى تاريخ» and the payroll-month navigation', () => {
  const html = renderToStaticMarkup(React.createElement(DayRangeFilter, { value: { from: '2026-08-23', to: '2026-09-22' }, onChange() {}, cycleStartDay: 23, today: '2026-09-19', idPrefix: 't' }))
    .replace(/<!-- -->/g, '')
  for (const text of ['من تاريخ', 'إلى تاريخ', 'type="date"', 'value="2026-08-23"', 'value="2026-09-22"', 'شهر الرواتب السابق', 'شهر الرواتب الحالي', 'شهر الرواتب التالي',
    'شهر رواتب سبتمبر 2026: 23 أغسطس – 22 سبتمبر 2026', 'id="t-month"', 'data-month-quick-pick', '>أكتوبر 2026</option>', '>سبتمبر 2024</option>']) assert.ok(html.includes(text), text)
  assert.match(html, /<option value="2026-09" selected="">سبتمبر 2026<\/option>/, 'الشهر المطابق للمدى مختار في القائمة')
  assert.ok(!html.includes('مدة مخصصة'))
  // أيام بإيدك بتغلب على الشهر: القائمة تقول «مدة مخصصة»
  const custom = renderToStaticMarkup(React.createElement(DayRangeFilter, { value: { from: '2026-09-01', to: '2026-09-10' }, onChange() {}, cycleStartDay: 23, today: '2026-09-19' }))
  assert.ok(custom.includes('1 – 10 سبتمبر 2026') || custom.includes('1 سبتمبر – 10 سبتمبر 2026'), custom)
  assert.match(custom, /<option value="custom" disabled="" selected="">مدة مخصصة<\/option>/)
  // من غير يوم الدورة: شهور تقويمية (نفس الاختيار السريع)، والخطأ ظاهر
  const bad = renderToStaticMarkup(React.createElement(DayRangeFilter, { value: { from: '2026-09-10', to: '2026-09-01' }, onChange() {} }))
  assert.ok(bad.includes('text-red-600') && !bad.includes('شهر الرواتب الحالي') && bad.includes('الشهر الحالي') && bad.includes('data-month-quick-pick'), bad)
  // فلتر اختياري (onClear): فاضي = «كل التواريخ» والخانات شغالة؛ من غيره الفاضي = لسه بيحمّل (مقفول)
  const optional = renderToStaticMarkup(React.createElement(DayRangeFilter, { value: null, onChange() {}, onClear() {}, cycleStartDay: 23, today: '2026-09-19', idPrefix: 'o' }))
  assert.match(optional, /<option value="" selected="">كل التواريخ<\/option>/)
  assert.doesNotMatch(optional, /id="o-from"[^>]*disabled/)
  const waiting = renderToStaticMarkup(React.createElement(DayRangeFilter, { value: null, onChange() {}, idPrefix: 'w' }))
  assert.match(waiting, /id="w-from"[^>]*disabled/)
  // فلتر السلف (disabled) يقفل كل حاجة
  assert.match(renderToStaticMarkup(React.createElement(DayRangeFilter, { value: { from: '2026-08-23', to: '2026-09-22' }, onChange() {}, disabled: true, idPrefix: 'd' })), /id="d-month"[^>]*disabled/)
})

test('DayRangeFilter keeps a partially typed date (year typed digit by digit) instead of resetting the input', () => {
  const source = read('src/components/DayRangeFilter.tsx')
  // الخانة بتمسك اللي بيتكتب (0002-09-18 وهو بيكتب 2026) وبتبعت بس التاريخ الكامل الصالح، وبترجع للقيمة لو ساب الخانة ناقصة
  assert.match(source, /function DayInput\(/)
  assert.match(source, /const \[draft, setDraft\] = useState\(value\)/)
  assert.match(source, /onChange=\{event => \{ const next = event\.target\.value; setDraft\(next\); if \(isDayKey\(next\)\) onCommit\(next\) \}\}/)
  assert.match(source, /onBlur=\{\(\) => \{ if \(!isDayKey\(draft\)\) setDraft\(value\) \}\}/)
  assert.match(source, /value=\{draft\}/)
  assert.doesNotMatch(source, /value=\{value\?\.from \?\? ''\} onChange/, 'مفيش خانة مربوطة مباشرة بالقيمة المعتمدة')
  // التاريخ الجزئي مش تاريخ صالح، فمش بيتبعت ولا بيرجّع الخانة
  for (const partial of ['0002-09-18', '0020-09-18', '0202-09-18', '']) assert.equal(ui.isDayKey(partial), false, partial)
  assert.equal(ui.isDayKey('2026-09-18'), true)
})

test('PayrollPeriodSelect: a payroll run stays chosen by period but shows its exact days', () => {
  const html = renderToStaticMarkup(React.createElement(PayrollPeriodSelect, { id: 'p', label: 'شهر الرواتب', value: '2026-09', onChange() {}, cycleStartDay: 23, today: '2026-09-19' }))
  assert.match(html, /<option value="2026-09" selected="">سبتمبر 2026<\/option>/)
  assert.ok(html.includes('23 أغسطس – 22 سبتمبر 2026') && html.includes('data-payroll-period-range'), html)
  const all = renderToStaticMarkup(React.createElement(PayrollPeriodSelect, { id: 'q', label: 'شهر المسير المستهدف', value: '', allLabel: 'كل الشهور', onChange() {}, cycleStartDay: 23, today: '2026-09-19' }))
  assert.match(all, /<option value="" selected="">كل الشهور<\/option>/)
  assert.ok(!all.includes('data-payroll-period-range'))
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

test('API «تاريخ الطلب» filter: local days → UTC bounds [start, end) for a SYSUTCDATETIME column, both-or-none', () => {
  const bounds = range.utcBoundsOfLocalDays({ from: '2026-08-23', to: '2026-09-22' })
  for (const edge of [bounds.start, bounds.end]) assert.match(edge, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/, 'نص ISO من غير منطقة (CONVERT 126)')
  assert.equal(Date.parse(`${bounds.start}Z`), new Date(2026, 7, 23).getTime(), 'البداية = منتصف ليل «من تاريخ» بتوقيت الخادم')
  assert.equal(Date.parse(`${bounds.end}Z`), new Date(2026, 8, 23).getTime(), 'النهاية (مفتوحة) = منتصف ليل اليوم اللي بعد «إلى تاريخ»')
  const day = range.utcBoundsOfLocalDays({ from: '2026-09-19', to: '2026-09-19' })
  assert.equal(Date.parse(`${day.end}Z`) - Date.parse(`${day.start}Z`), new Date(2026, 8, 20).getTime() - new Date(2026, 8, 19).getTime())
  assert.equal(range.optionalCreatedRange({}), null)
  assert.equal(range.optionalCreatedRange({ from: '', to: '' }), null)
  assert.deepEqual(range.optionalCreatedRange({ from: '2026-08-23', to: '2026-09-22' }), bounds)
  for (const bad of [{ from: '2026-09-01' }, { to: '2026-09-01' }, { from: '2026-09-05', to: '2026-09-01' }, { from: '2025-01-01', to: '2026-09-01' }]) {
    assert.throws(() => range.optionalCreatedRange(bad), error => error.getStatus?.() === 400, JSON.stringify(bad))
  }
})

test('API: deductions and bonuses lists filter «من تاريخ / إلى تاريخ» on the server inside every page (before the 500 cap)', () => {
  for (const [dto, service] of [['api/src/payroll/typed-deductions.dto.ts', 'api/src/payroll/typed-deductions.service.ts'], ['api/src/payroll/bonuses.dto.ts', 'api/src/payroll/bonuses.service.ts']]) {
    const dtoSource = read(dto)
    assert.match(dtoSource, /@IsOptional\(\) @Matches\(\/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$\/, \{ message: '«من تاريخ» بصيغة YYYY-MM-DD' \}\) from\?: string/, dto)
    assert.match(dtoSource, /«إلى تاريخ» بصيغة YYYY-MM-DD' \}\) to\?: string/, dto)
    const source = read(service)
    assert.ok(source.includes("import { optionalCreatedRange } from '../attendance/attendance-report-range'"), service)
    const list = source.slice(source.indexOf('async list(user: JwtPayload'), source.indexOf('async detail(user: JwtPayload'))
    assert.ok(list.includes('const created = optionalCreatedRange(query)'), service)
    // جوه لوب الصفحات: كل صفحة 500 بتتفلتر بالتاريخ، فالترقيم بـbeforeId فاضل صحيح
    const loop = list.slice(list.indexOf('for (let page = 0;'))
    assert.ok(loop.includes("if (created) qb.andWhere('r.createdAt >= CONVERT(datetime2, :createdFrom, 126) AND r.createdAt < CONVERT(datetime2, :createdTo, 126)', { createdFrom: created.start, createdTo: created.end })"), service)
    assert.ok(loop.indexOf('if (created)') < loop.indexOf('const rows = await qb.getMany()'), service)
    assert.ok(list.includes('return result.slice(0, 500)'), service)
  }
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
  for (const [file, prefix, fetcher] of [['src/components/payroll/TypedDeductionsWorkspace.tsx', 'deductions', 'fetchDeductions'], ['src/components/payroll/BonusesWorkspace.tsx', 'bonuses', 'fetchBonuses']]) {
    const source = read(file)
    assert.ok(source.includes(`<DayRangeFilter idPrefix="${prefix}" value={range} onChange={setRange}`), file)
    // الفلترة على الخادم (من غير ما تتقص بحد الـ500 في المتصفح)، والرد القديم ما يغطيش على الأحدث
    assert.ok(source.includes(`${fetcher}({ ...base, from: listRange.from, to: listRange.to })`), file)
    assert.ok(source.includes('useEffect(loadRows, [filters.view, filters.status, filters.targetPeriod, listRange?.from, listRange?.to])'), file)
    assert.ok(source.includes('if (request !== latest.current) return'), file)
    assert.doesNotMatch(source, /dateInRange\(localDayOf\(row\.createdAt\)/, `${file}: no browser-side date filter over a capped list`)
    assert.ok(source.includes('[focused, ...rows]'), `${file}: the linked request always shows`)
    assert.ok(source.includes('برا الفترة المختارة') && source.includes('setOutsideRange(everything ? everything.filter(row => !inRange.has(row.id)).length : 0)'),
      `${file}: pending approvals outside the range are counted, not silently hidden`)
    assert.ok(source.includes('rows.length >= LIST_LIMIT'), `${file}: the 500 cap is said out loud`)
    assert.ok(source.includes('rows.length === 0 && outsideRange === 0'), `${file}: a manager with older requests still gets the workspace`)
    // شهر المسير المستهدف = اختيار مسير بالشهر، بأيامه
    assert.ok(source.includes(`<PayrollPeriodSelect id="${prefix}-target-period" label="شهر المسير المستهدف" value={filters.targetPeriod} allLabel="كل الشهور"`), file)
    assert.doesNotMatch(source, /type="month"[^>]*value=\{filters\.targetPeriod\}/, file)
  }
  for (const file of ['src/lib/deductions-api.ts', 'src/lib/bonuses-api.ts']) assert.ok(read(file).includes("view?: 'all' | 'created' | 'pending_me'; from?: string; to?: string }"), file)
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
  // تبويبات تقرير الرواتب الباقية (مخفية حاليًا) بالفترة كمان، والفروق بين مسيرين بالشهر بأيامه
  for (const prefix of ['payroll-unassigned', 'payroll-overtime']) assert.ok(reports.includes(`<DayRangeFilter idPrefix="${prefix}" value={range} onChange={setRange}`), prefix)
  assert.ok(reports.includes('<DayRangeFilter idPrefix="payroll-loans-match" value={match} onChange={setMatch} onClear={() => setMatch(null)}'))
  assert.ok(reports.includes('<PayrollPeriodSelect id="variance-period"') && reports.includes('<PayrollPeriodSelect id="variance-compare-period"'))
  assert.doesNotMatch(reports, /type="month"/)
})

test('loans screen: filter by request date or by instalment month, with the month quick-pick and exact days', () => {
  const page = read('src/app/payroll/loans/page.tsx')
  assert.ok(page.includes('<DayRangeFilter idPrefix="loans" value={range} onChange={setRange} cycleStartDay={context?.cycleStartDay} today={context?.today} disabled={dateBasis === \'all\'} />'))
  for (const text of ['<option value="requested">بتاريخ طلب السلفة</option>', '<option value="installment">بشهر القسط (مستحق في الفترة)</option>',
    "? dateInRange(loanRequestDay(loan), activeRange)", ': loan.installments.some((item) => dateInRange(item.dueDate, activeRange)))',
    "{ id: 'all', label: 'الكل', count: datedLoans.length }", 'const filteredLoans = datedLoans.filter(']) assert.ok(page.includes(text), text)
  assert.ok(page.includes("const loanRequestDay = (loan: Loan) => localDayOf(loan.requestedAt ?? loan.disbursedAt ?? null)"))
  const api = read('api/src/assets/employee-extras.controller.ts')
  assert.ok(api.includes(".leftJoin(Request, 'req', 'req.id = loan.requestId').addSelect('req.createdAt', 'requestedAt')"), 'the list carries the request date')
})

test('reports dashboard: attendance and overtime summaries follow the range filter, not the calendar month', () => {
  const page = read('src/app/reports/page.tsx')
  assert.ok(page.includes('Promise.all([fetchAttendanceReportRange(target), fetchOvertimeReportRange(target)])'))
  assert.ok(page.includes('<DayRangeFilter idPrefix="reports-attendance" value={range} onChange={setRange} cycleStartDay={context?.cycleStartDay} today={context?.today} />'))
  assert.ok(page.includes('downloadCsv(`attendance-${listRange ? dayRangeKey(listRange) : \'range\'}-${stamp}.csv`'))
  assert.ok(page.includes('downloadCsv(`overtime-${listRange ? dayRangeKey(listRange) : \'range\'}-${stamp}.csv`'))
  for (const gone of ['localMonth', 'currentMonth', 'هذا الشهر']) assert.ok(!page.includes(gone), gone)
  const api = read('src/lib/api.ts')
  for (const gone of ['/reports/attendance?month=', '/reports/overtime?month=', '/attendance/monthly?employeeId=${employeeId}&month=', '/attendance/overtime?month=']) assert.ok(!api.includes(gone), gone)
})

test('attendance fixes: permissions has no unused Calendar import, exemption counters follow the chosen range', () => {
  assert.doesNotMatch(read('src/app/attendance/permissions/page.tsx'), /^\s*Calendar,$/m)
  const exemptions = read('src/app/attendance/exemptions/page.tsx')
  assert.ok(exemptions.includes('const rangeRows = useMemo(() => rows.filter(row => !range || periodOverlapsRange(row.effectiveFrom, row.effectiveTo, range)), [rows, range])'))
  for (const counter of ["pending: rangeRows.filter(row => row.state === 'PENDING_HR'", 'awaitingMe: rangeRows.filter(', "active: rangeRows.filter(row => row.state === 'ACTIVE')",
    "scheduled: rangeRows.filter(row => row.state === 'SCHEDULED')", 'const visible = rangeRows.filter(']) assert.ok(exemptions.includes(counter), counter)
})

test('payroll-period pickers (GOSI, cost centers, financial reports, leave settlement) open on the payroll month and show its days', () => {
  for (const [file, id] of [['src/app/payroll/gosi/page.tsx', 'gosi-period'], ['src/app/reports/cost-centers/page.tsx', 'cost-center-period'],
    ['src/app/reports/_financial/ReportShell.tsx', 'financial-report-period'], ['src/app/leaves/year-end/page.tsx', 'settle-month']]) {
    const source = read(file)
    assert.ok(source.includes(`<PayrollPeriodSelect id="${id}"`), file)
    assert.ok(source.includes('usePayrollMonthContext()'), file)
    for (const gone of ['type="month"', 'thisMonth', 'localMonth']) assert.ok(!source.includes(gone), `${file}: ${gone}`)
  }
  // السجلات (الإجازات والمؤرشفين): «من / إلى» اختياري + شهر بضغطة، من غير حد 366 يوم
  for (const [file, prefix] of [['src/app/leaves/page.tsx', 'leaves'], ['src/app/employees/archived/page.tsx', 'archived']]) {
    const source = read(file)
    assert.match(source, new RegExp(`<DayRangeFilter idPrefix="${prefix}" value=\\{\\w+\\} onChange=\\{\\w+\\} onClear=\\{\\(\\) => \\w+\\(null\\)\\} maxDays=\\{null\\}`), file)
    assert.doesNotMatch(source, /type="date"/, file)
  }
})

test('no month-only date filter is left in src/: every remaining month input is a form field or a payroll-run period that shows its days', () => {
  const walk = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? walk(`${dir}/${entry.name}`) : /\.tsx?$/.test(entry.name) ? [`${dir}/${entry.name}`] : [])
  const files = walk('src')
  const monthInputs = files.filter(file => read(file).includes('type="month"')).sort()
  // حقول إدخال في نماذج (يسري من راتب شهر، أول قسط، شهر المسير المستهدف للطلب الجديد) أو اختيار مسير بشهره وأيامه ظاهرة
  const allowed = ['src/app/employees/bulk-update/page.tsx', 'src/components/EmployeeForm.tsx', 'src/components/PayrollSalaryHistoryEditor.tsx',
    'src/components/payroll/BonusesWorkspace.tsx', 'src/components/payroll/LoanExceptionalModal.tsx', 'src/components/payroll/PayrollAllowancesTab.tsx',
    'src/components/payroll/PayrollOverviewTabs.tsx', 'src/components/payroll/PayrollRunDefinitionPanel.tsx', 'src/components/payroll/TypedDeductionsWorkspace.tsx',
    // «خصم» في شاشة الطلبات: نفس حقل «شهر المسير المستهدف» في نموذج الطلب لا فلتر
    'src/components/requests/DeductionRequestForm.tsx',
    // «مكافأة» من صف المسير: نفس حقل «شهر المسير المستهدف» في نموذج الاقتراح، جاهزًا بشهر المسير — لا فلتر
    'src/components/payroll/PayrollBonusCreateModal.tsx']
  const unexpected = monthInputs.filter(file => !allowed.includes(file))
  assert.deepEqual(unexpected, [], `month-only inputs outside forms — use DayRangeFilter (filters) or PayrollPeriodSelect (payroll run by period): ${unexpected.join(', ')}`)
  for (const file of ['src/components/payroll/PayrollAllowancesTab.tsx', 'src/components/payroll/PayrollOverviewTabs.tsx']) {
    if (monthInputs.includes(file)) assert.ok(read(file).includes('dayRangeLabel(periodRange)'), `${file}: the run period shows its exact days`)
  }
  const localMonthUsers = files.filter(file => file !== 'src/lib/dates.ts' && /localMonth\(\)/.test(read(file)))
  assert.deepEqual(localMonthUsers, [], 'no calendar-month default left')
})

// حواجز صغيرة على نفس الشاشات: البحث بالرقم الوظيفي، وأول سطر في منتقي شهر الرواتب، وسنين إقفال الإجازات
test('employee-code search, a readable payroll-month placeholder, and every closable leave year', () => {
  const text = file => read(file).replace(/\r\n/g, '\n')
  // PayrollPeriodSelect من غير allLabel: أول سطر يقرأ بدل ما يبقى فاضي
  assert.ok(text('src/components/DayRangeFilter.tsx').includes("{allLabel ?? 'اختر شهر الرواتب'}"), 'the empty period row is readable')
  const loans = text('src/app/payroll/loans/page.tsx')
  assert.ok(loans.includes('placeholder="بحث بالاسم أو الرقم الوظيفي..."'), 'loans placeholder names the code')
  assert.ok(loans.includes("!(loan.employeeCode ?? '').toLowerCase().includes(searchQuery.toLowerCase())"), 'loans search matches the code')
  assert.ok(text('api/src/assets/employee-extras.controller.ts').includes('employeeCode: empById.get(loan.employeeId)?.employeeCode ?? null,'), 'the loans list carries the code')
  // المؤرشفون: كود بحروف صغيرة لازم يلاقي كود متخزن بحروف كبيرة
  assert.ok(text('src/app/employees/archived/page.tsx').includes('emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase())'), 'archived code search is case-insensitive')
  const yearEnd = text('src/app/leaves/year-end/page.tsx')
  assert.ok(yearEnd.includes('const FIRST_YEAR = 2020') && yearEnd.includes('String(FIRST_YEAR + i)'), 'older years stay closable')
  assert.ok(yearEnd.includes('useState(DEFAULT_YEAR)'), 'the default year is still last year')
})

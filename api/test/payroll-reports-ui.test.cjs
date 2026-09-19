// الخطوة 30: بناة CSV وتسميات تقارير الرواتب + تدقيق ثابت أن كل زر تصدير في شاشات الرواتب والتقارير ينتج ملفًا أو مخفي.
// بلا خادم ولا SQL.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true, compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const ui = require('../../src/lib/payroll-reports-api')
const { downloadCsv } = require('../../src/lib/csv')
const repoRoot = path.resolve(__dirname, '..', '..')

test('money helpers keep exact cents with latin digits and never round-trip through Number', () => {
  assert.equal(ui.formatReportMoney('1234567.05'), '1,234,567.05')
  assert.equal(ui.formatReportMoney('-500.10'), '-500.10')
  assert.equal(ui.formatReportMoney('9999999999999999.99'), '9,999,999,999,999,999.99')
  for (const invalid of [null, undefined, '12', '1.5', 'NaN', '١٢٣.٤٥']) assert.equal(ui.formatReportMoney(invalid), '—')
  assert.equal(ui.sumReportMoney(['0.10', '0.20', '9007199254740993.01', '-0.30']), '9007199254740993.01')
  assert.equal(ui.sumReportMoney([]), '0.00')
})

test('query builder drops empty filters and encodes values', () => {
  assert.equal(ui.reportQuery({ period: '2026-09', branchId: '', reason: undefined, includeSuspended: false }), '?period=2026-09')
  assert.equal(ui.reportQuery({ includeSuspended: true, departmentId: 4 }), '?includeSuspended=true&departmentId=4')
  assert.equal(ui.reportQuery({}), '')
})

test('run reference hides masked runs and labels status in Arabic', () => {
  // تبسيط الرواتب: رقم المسير الداخلي لا يظهر
  assert.equal(ui.runRefLabel({ id: 18, name: 'قسم1', period: '2026-05', status: 'CALCULATED', startDate: '2026-04-23', endDate: '2026-05-22' }), 'قسم1 (محسوب)')
  assert.equal(ui.runRefLabel({ id: null, name: 'مسير خارج نطاق صلاحيتك', period: '2026-05', status: 'APPROVED', startDate: '', endDate: '' }), 'مسير خارج نطاق صلاحيتك (معتمد)')
  assert.equal(ui.runRefLabel(null), '—')
})

const assertTable = (table, expectedRows) => {
  assert.ok(table.header.length > 0)
  assert.equal(table.rows.length, expectedRows)
  for (const row of table.rows) assert.equal(row.length, table.header.length, 'كل صف CSV بنفس عدد أعمدة العناوين')
}

test('every report CSV builder produces one row per displayed row with matching columns', () => {
  const run = { id: 21, name: 'مخصّص', period: '2026-05', status: 'CALCULATED', scopeType: 'CUSTOM', scopeLabel: 'قائمة مخصّصة (2 موظف)', branchId: null, branchName: null,
    startDate: '2026-04-23', endDate: '2026-05-22', employees: 2, excluded: 0, totalNet: '12000.00', storedTotalNet: '12000.00', partial: false }
  const runs = ui.runsReportCsv({ runs: [run], byMethod: [], deductions: [] })
  assertTable(runs, 1)
  assert.equal(runs.rows[0][5], 'قائمة مخصّصة (2 موظف)')
  assert.equal(runs.rows[0][6], '', 'مسير بلا فرع يُصدَّر بخانة فرع فارغة لا بخطأ')

  const unassigned = ui.unassignedReportCsv({ period: '2026-09', summary: {}, runs: [], duplicates: [], rows: [{ employeeId: 5, employeeCode: 'E5', fullName: 'موظف', status: 'active',
    branchName: 'القاهرة', departmentName: null, teamName: null, hireDate: '2026-09-01', leaveDate: null, coverFrom: '2026-09-01', coverTo: '2026-09-22', coverDays: 22,
    reason: 'EXCLUDED_IN_RUN', reasonLabel: 'مستبعد في مسير للفترة', detail: 'استبعاد يدوي',
    reasons: [{ code: 'EXCLUDED_IN_RUN', label: 'مستبعد في مسير للفترة', detail: 'استبعاد يدوي', run: { id: 30, name: 'فرع القاهرة', period: '2026-09', status: 'CALCULATED', startDate: '', endDate: '' } }],
    lastRun: null, pending: { installments: 1, installmentsAmount: '250.00', approvedOvertime: 0, obligations: 2 } }] })
  assertTable(unassigned, 1)
  assert.equal(unassigned.rows[0][8], 'مستبعد في مسير للفترة')
  // تبسيط الرواتب: المسير باسمه وحالته بلا رقمه الداخلي
  assert.match(unassigned.rows[0][10], /فرع القاهرة \(محسوب\)/); assert.doesNotMatch(unassigned.rows[0][10], /#30/)

  const overtime = ui.overtimeReportCsv({ period: '2026-09', from: '', to: '', summary: {}, rows: [{ id: 1, employeeId: 5, employeeCode: 'E5', fullName: 'موظف', departmentName: null,
    date: '2026-09-02', source: 'BIOMETRIC_DETECTED', status: 'REJECTED', dayKind: 'WEEKDAY', detectedMinutes: 90, requestedMinutes: 90, approvedMinutes: null,
    differenceMinutes: null, multiplier: 1.5, hourlyRate: null, amount: '0.00', amountSource: 'NOT_PAYABLE', amountSourceLabel: 'غير مستحق', issue: null,
    approverId: null, approvedAt: null, run: null, deferredFromRunId: null }] })
  assertTable(overtime, 1)
  assert.equal(overtime.rows[0][13], '0.00')
  assert.equal(overtime.rows[0][6], 'مرفوض')

  const loans = ui.loansReportCsv({ period: null, today: '2026-09-14', aging: [], forecast: [], afterService: [], summary: {}, rows: [{ loanId: 3, requestId: null, employeeId: 5,
    employeeCode: 'E5', fullName: 'موظف', employeeStatus: 'terminated', departmentName: null, branchName: null, status: 'DISBURSED', disbursedAt: '2026-01-01T00:00:00.000Z',
    principal: '1000.00', paid: '300.00', remaining: '700.00', installments: 10, paidInstallments: 3, currentInstallment: 4, nextDueDate: '2026-10-22',
    overdueCount: 0, overdueAmount: '0.00', partialCount: 0, deferredCount: 0, expectedCloseDate: '2027-04-22', balanced: true, issue: null, schedule: [] }] })
  assertTable(loans, 1)
  assert.equal(loans.rows[0][10], '4 من 10')

  const variance = ui.varianceReportCsv({ period: '2026-09', comparePeriod: '2026-08', unexplained: [], totals: [], summary: {}, rows: [{ employeeId: 5, employeeCode: 'E5',
    fullName: 'موظف', currentRuns: [2], previousRuns: [1], currentNet: '9150.00', previousNet: '7800.00', difference: '1350.00', percent: 17.31, direction: 'INCREASE',
    components: [{ key: 'overtimeAmount', label: 'العمل الإضافي', current: '1134.38', previous: '0.00', delta: '1134.38', effect: '1134.38' }],
    causes: [{ code: 'OVERTIME', label: 'إضافي' }], residual: '0.00', unexplained: false, changed: true }] })
  assertTable(variance, 1)
  assert.equal(variance.header[2], 'صافي 2026-09')
  assert.equal(variance.rows[0][5], 17.31)
})

test('downloadCsv really produces a UTF-8 BOM file with neutralized formulas', async () => {
  const saved = { document: global.document, URL: global.URL.createObjectURL, revoke: global.URL.revokeObjectURL, setTimeout: global.setTimeout }
  let blob = null, clicked = null
  const anchor = { click() { clicked = this.download }, remove() {} }
  global.document = { createElement: () => anchor, body: { appendChild() {} } }
  global.URL.createObjectURL = value => { blob = value; return 'blob:test' }
  global.URL.revokeObjectURL = () => {}
  try {
    downloadCsv('payroll-unassigned-2026-09.csv', ['الاسم', 'المبلغ'], [['=HYPERLINK("x")', '12.50'], ['سطر, بفاصلة', null]])
    assert.equal(clicked, 'payroll-unassigned-2026-09.csv')
    assert.ok(blob, 'تم إنشاء ملف')
    // Blob.text() يحذف BOM عند فك UTF-8؛ نفحص البايتات الخام كما سيقرؤها Excel
    const bytes = Buffer.from(await blob.arrayBuffer())
    assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf])
    assert.equal(blob.type, 'text/csv;charset=utf-8;')
    const text = bytes.subarray(3).toString('utf8')
    assert.match(text, /^الاسم,المبلغ\r\n/)
    assert.match(text, /'=HYPERLINK/)
    assert.match(text, /"سطر, بفاصلة"/)
  } finally {
    global.document = saved.document
    global.URL.createObjectURL = saved.URL
    global.URL.revokeObjectURL = saved.revoke
  }
})

// ===== تدقيق ثابت: لا زر تصدير/تنزيل/طباعة/مشاركة ميت في أي شاشة من شاشات النظام =====
function tsxFiles(dir) {
  const result = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) result.push(...tsxFiles(full))
    else if (entry.name.endsWith('.tsx')) result.push(full)
  }
  return result
}

// الكلمات تُفحص داخل الزر كله (النص والعنوان title) والأيقونات بأسمائها في JSX
const EXPORT_WORDS = /تصدير|تحميل|تنزيل|طباعة|مشاركة|ملف WPS|ملف GOSI|إرسال بالبريد|<Download\b|<Printer\b|<Share2?\b|<FileDown\b/
const EXPORT_ICONS = /<(Download|Printer|Share2?|FileDown)\b/g
const lineOf = (source, index) => source.slice(0, index).split('\n').length

function deadExportControls(files) {
  const dead = []
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8')
    const where = index => `${path.relative(repoRoot, file).replace(/\\/g, '/')}:${lineOf(source, index)}`
    for (const match of source.matchAll(/<button\b[\s\S]*?<\/button>/g)) {
      if (EXPORT_WORDS.test(match[0]) && !/onClick=|type=["']submit["']/.test(match[0])) dead.push(where(match.index))
    }
    // الأيقونة خارج زر بمعالج أو رابط حقيقي تعني عنصرًا شكليًا؛ نستبدل الكتل الفعّالة بمسافات حتى تبقى أرقام الأسطر صحيحة
    const blank = block => block.replace(/[^\n]/g, ' ')
    const withoutActionable = source
      .replace(/<button\b[\s\S]*?<\/button>/g, block => (/onClick=/.test(block) ? blank(block) : block))
      .replace(/<(Link|a)\b[\s\S]*?<\/\1>/g, blank)
    for (const icon of withoutActionable.matchAll(EXPORT_ICONS)) dead.push(`${where(icon.index)} (${icon[1]} خارج زر فعّال)`)
  }
  return dead
}

test('the dead-control audit really catches a button without a handler (self-check)', () => {
  const probe = path.join(require('node:os').tmpdir(), `dead-export-probe-${process.pid}.tsx`)
  fs.writeFileSync(probe, [
    '<button className="btn-secondary"><Download size={18} />تصدير</button>',
    '<button onClick={() => window.print()}><Printer size={18} />طباعة</button>',
    '<button className="p-2" title="تحميل الشهادة"><Award size={18} /></button>',
    '<div><Share2 size={18} /></div>',
    '<Link href="/x"><Download size={16} />تنزيل</Link>',
  ].join('\n'))
  try {
    // الزر الميت بأيقونة تصدير يُبلَّغ مرتين (الزر والأيقونة)؛ زر العنوان بلا أيقونة تصدير مرة؛ الأيقونة الحرة مرة؛ الفعّال والرابط لا شيء
    assert.deepEqual(deadExportControls([probe]).map(item => item.replace(/^.*:(\d+)/, '$1')), ['1', '3', '1 (Download خارج زر فعّال)', '4 (Share2 خارج زر فعّال)'])
  } finally { fs.rmSync(probe, { force: true }) }
})

test('every export/download/print/share control in every screen has a real handler or is removed', () => {
  const files = [...tsxFiles(path.join(repoRoot, 'src', 'app')), ...tsxFiles(path.join(repoRoot, 'src', 'components'))]
  assert.ok(files.filter(file => file.endsWith('page.tsx')).length >= 60, 'اكتشاف كل شاشات النظام لا الرواتب والتقارير وحدها')
  for (const reviewed of ['employees/[id]/page.tsx', 'performance/page.tsx', 'performance/[id]/page.tsx', 'recruitment/offers/page.tsx',
    'recruitment/[id]/page.tsx', 'training/certificates/page.tsx', 'training/my-courses/page.tsx']) {
    assert.ok(files.includes(path.join(repoRoot, 'src', 'app', ...reviewed.split('/'))), `${reviewed} ضمن الفحص`)
  }
  const dead = deadExportControls(files)
  assert.deepEqual(dead, [], `أزرار تصدير/طباعة/مشاركة بلا تنفيذ:\n${dead.join('\n')}`)
  // زر الطباعة في ملف الموظف ينفّذ طباعة المتصفح فعلًا
  assert.match(fs.readFileSync(path.join(repoRoot, 'src', 'app', 'employees', '[id]', 'page.tsx'), 'utf8'), /onClick=\{\(\) => window\.print\(\)\}[^>]*>\s*<Printer size=\{18\} \/>\s*طباعة/)
})

test('unassigned and overtime tabs default to the API payroll month (cycle start day), not the calendar month', () => {
  const source = fs.readFileSync(path.join(repoRoot, 'src', 'app', 'payroll', 'reports', 'page.tsx'), 'utf8')
  assert.doesNotMatch(source, /localMonth/, 'لا شهر ميلادي افتراضي في تقارير الرواتب')
  assert.doesNotMatch(source, /type="month"/, 'قاعدة المالك 2026-09-19: شهر بضغطة + «من تاريخ / إلى تاريخ»، مش خانة شهر بس')
  // المدى الافتراضي من /attendance/payroll-month (يوم بداية الدورة) عبر usePayrollDayRange، والطلب بـfrom/to بالظبط
  for (const fetcher of ['fetchPayrollUnassignedReport', 'fetchPayrollOvertimeReport']) {
    assert.ok(source.includes(`${fetcher}({ from: listRange.from, to: listRange.to,`), `${fetcher}: بالفترة المختارة`)
  }
  assert.equal((source.match(/const \{ range, setRange, context \} = usePayrollDayRange\(\)/g) ?? []).length, 3, 'المسيرات وبلا مسير والإضافي على شهر الرواتب الجاري')
  // الفروق بين مسيرين تفضل بالشهر (الـAPI يختار أول مرة) والاختيار بيوضح أيام كل شهر
  assert.equal((source.match(/const \[period, setPeriod\] = useState\(''\)/g) ?? []).length, 1, 'الفروق تبدأ بفترة من الـAPI')
  assert.equal(ui.reportQuery({ period: '', branchId: '' }), '', 'الفترة الفارغة لا تُرسل فيطبق الـAPI دورة payroll.cycle_start_day')
})

test('payroll reports page (payroll simplification) shows the runs tab only, exported from its own builder, without internal run numbers; the other report endpoints stay in the API file', () => {
  const source = fs.readFileSync(path.join(repoRoot, 'src', 'app', 'payroll', 'reports', 'page.tsx'), 'utf8')
  // التصدير = المسيرات المعروضة بعد فلتر «من تاريخ / إلى تاريخ» (2026-09-19)
  assert.match(source, /<ExportButton table=\{report \? runsReportCsv\(\{ \.\.\.report, runs: shownRuns \}\)/, 'runsReportCsv مربوط بزر تصدير')
  const tabs = /const TABS[^=]*= \[([\s\S]*?)\n\]/.exec(source)
  assert.ok(tabs, 'TABS')
  assert.deepEqual([...tabs[1].matchAll(/id: '(\w+)'/g)].map(match => match[1]), ['runs'])
  assert.doesNotMatch(source, /#\{run\.id\}/, 'no internal run number column')
  for (const endpoint of ['/reports/payroll', '/reports/payroll/unassigned', '/reports/payroll/overtime', '/reports/payroll/loans', '/reports/payroll/variance']) {
    assert.ok(fs.readFileSync(path.join(repoRoot, 'src', 'lib', 'payroll-reports-api.ts'), 'utf8').includes(`'${endpoint}`) ||
      fs.readFileSync(path.join(repoRoot, 'src', 'lib', 'payroll-reports-api.ts'), 'utf8').includes(`\`${endpoint}`), endpoint)
  }
  assert.doesNotMatch(source, /\bfetch\(/, 'لا نداء fetch مباشر من الصفحة')
  assert.match(source, /<MainLayout>/)
})

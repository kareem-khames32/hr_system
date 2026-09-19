'use strict'
// تحديث بيانات مجموعة موظفين من ملف (Excel/CSV) بكود الموظف — اختبارات صرفة بلا قاعدة بيانات:
// قراءة CSV، مطابقة العناوين، تطبيع قيم الخلايا، وخطة التحديث (الأخطاء والتغييرات) ببيانات وهمية،
// وقراءة/كتابة Excel وحارس الملف المضغوط. التطبيق على قاعدة SQL مؤقتة في employee-bulk-update.integration.cjs.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const zlib = require('node:zlib')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const fields = require('../src/employees/employee-bulk-update.fields')
const { readBulkSheet, planBulkUpdate, bulkLookupKeys, uniqueKey } = require('../src/employees/employee-bulk-update.plan')
const { readBulkFile, writeBulkWorkbook, bulkFileFormat } = require('../src/employees/employee-bulk-update.sheet')

const def = key => fields.BULK_FIELD_BY_KEY.get(key)
const parse = (key, cell) => fields.parseBulkField(def(key), cell)
const ok = (key, cell) => { const result = parse(key, cell); assert.equal(result.ok, true, JSON.stringify(result)); return result.value }
const fails = (key, cell, pattern) => { const result = parse(key, cell); assert.equal(result.ok, false, `${key}=${cell}`); if (pattern) assert.match(result.error, pattern) }

test('CSV: BOM، علامات تنصيص بفواصل وأسطر، فاصل «;» أو Tab، وCRLF', () => {
  const rows = fields.parseCsv('﻿كود الموظف,الاسم,العنوان\r\nE1,"أحمد, علي","سطر1\nسطر2"\r\nE2,"قال ""نعم""",\r\n')
  assert.deepEqual(rows, [['كود الموظف', 'الاسم', 'العنوان'], ['E1', 'أحمد, علي', 'سطر1\nسطر2'], ['E2', 'قال "نعم"', '']])
  assert.deepEqual(fields.parseCsv('كود الموظف;رقم الجوال\nE1;0501234567'), [['كود الموظف', 'رقم الجوال'], ['E1', '0501234567']])
  assert.deepEqual(fields.parseCsv('كود الموظف\tالجنس\nE1\tذكر\n'), [['كود الموظف', 'الجنس'], ['E1', 'ذكر']])
})

test('CSV للقالب: BOM، تحييد المعادلات، والقراءة بترجّع نفس القيم (من غير الفاصلة العليا)', () => {
  const csv = fields.toCsv([['كود الموظف', 'المسمى الوظيفي', 'رقم الجوال'], ['E1', '=HYPERLINK("x")', '+966501234567'], ['E2', 'مدير, مبيعات', '-5']])
  assert.ok(csv.startsWith('﻿'))
  assert.match(csv, /'=HYPERLINK/)
  assert.doesNotMatch(csv, /'\+966/)
  const rows = fields.parseCsv(csv)
  assert.equal(fields.bulkCellText(rows[1][1]), '=HYPERLINK("x")')
  assert.equal(rows[2][1], 'مدير, مبيعات')
})

test('العناوين: الاسم بالعربي بأي همزة/تطويل أو اسم الحقل بالإنجليزي، والمجهول بيتجاهل، والمتكرر والكود الناقص أخطاء', () => {
  const { columns, errors } = fields.mapBulkHeader(['كود الموظف', 'اسم الموظف', 'رقم  الجوال', 'البريد الالكتروني للعمل', 'iban', 'ملاحظات', 'الجنـس'])
  assert.deepEqual(errors, [])
  assert.deepEqual(columns.map(column => column.key), ['code', 'name', 'phone', 'email', 'iban', null, 'gender'])
  const duplicate = fields.mapBulkHeader(['كود الموظف', 'رقم الجوال', 'الجوال'])
  assert.match(duplicate.errors[0], /متكرر/)
  assert.equal(duplicate.columns[2].key, null)
  assert.match(fields.mapBulkHeader(['رقم الجوال']).errors[0], /كود الموظف/)
  assert.match(fields.mapBulkHeader(['كود الموظف', 'ملاحظات']).errors[0], /مفيش ولا عمود بيانات/)
})

test('قيم الخلايا: تواريخ بأكتر من شكل، مبالغ، أرقام عربية، اختيارات، «مسح»، وصيغة Excel العلمية', () => {
  assert.equal(ok('birthDate', '1990-5-1'), '1990-05-01')
  assert.equal(ok('birthDate', '01/05/1990'), '1990-05-01')
  assert.equal(ok('birthDate', '١٩٩٠/٠٥/٠١'), '1990-05-01')
  assert.equal(ok('birthDate', new Date(Date.UTC(1990, 4, 1))), '1990-05-01')
  assert.equal(ok('contractStart', 45658), '2025-01-01') // رقم Excel التسلسلي
  fails('birthDate', '2026-02-30', /تاريخ غير صحيح/)
  fails('birthDate', 'امبارح')

  assert.equal(ok('basicSalary', '1,234.5'), '1234.50')
  assert.equal(ok('basicSalary', '٥٠٠٠'), '5000.00')
  assert.equal(ok('basicSalary', 1100.0000000000002), '1100.00')
  assert.equal(ok('gosiBaseSalary', 0), '0.00')
  fails('basicSalary', '12.345', /منزلتين/)
  fails('basicSalary', '-5')
  fails('basicSalary', 12.345)

  assert.equal(ok('gender', 'ذكر'), 'male')
  assert.equal(ok('gender', 'انثى'), 'female')
  assert.equal(ok('payMethod', 'نقدي + بنك'), 'mixed')
  assert.equal(ok('payMethod', 'transfer'), 'transfer')
  assert.equal(ok('contractType', 'محدد المدة'), 'fixed_term')
  assert.equal(ok('isGosiRegistered', 'نعم'), true)
  assert.equal(ok('isGosiRegistered', 'لا'), false)
  fails('gender', 'م', /مش من الاختيارات/)

  assert.equal(ok('team', 'مسح'), null)
  assert.equal(ok('contractEnd', ' مسح '), null)
  fails('phone', 'مسح', /ماينفعش يتمسح/)
  fails('department', 'مسح', /ماينفعش يتمسح/)

  assert.equal(ok('iban', 'sa03 8000 0000 6080 1016 7519'), 'SA0380000000608010167519')
  fails('iban', '1234', /آيبان/)
  assert.equal(ok('phone', "'0501234567"), '0501234567')
  fails('phone', 'abc', /جوال/)
  assert.equal(ok('nationalId', 29001011234567), '29001011234567')
  fails('nationalId', '9.66501E+11', /صيغة علمية/)
  fails('fingerprintCode', '123456789012345678901', /20 حرف/)
  assert.equal(fields.parseBulkMonth('9/2026'), '2026-09')
  assert.equal(fields.parseBulkMonth('2026-09'), '2026-09')
  assert.equal(fields.parseBulkMonth('2026-13'), null)
})

// ===== الخطة ببيانات وهمية =====
const snapshot = (extra = {}) => ({
  id: 1, employeeCode: 'E1', fullName: 'موظف أول', status: 'active', branchId: 1, departmentId: 10, teamId: 100, managerEmployeeId: null,
  costCenterId: null, gradeId: null, jobTitle: 'محاسب', phone: '0501234567', email: 'e1@x.com', nationalId: '1012345678', nationality: 'سعودي',
  gender: 'male', birthDate: '1990-01-01', fingerprintCode: '0012', contractType: 'permanent', contractStart: '2020-01-01', contractEnd: null,
  bankName: 'بنك', iban: 'SA0380000000608010167519', payMethod: 'transfer', bankTransferAmount: null, gosiNumber: null, isGosiRegistered: null,
  gosiBaseSalary: null, currency: 'SAR', basicSalary: '5000.00', housingAllowance: '1000.00', transportAllowance: '0.00', phoneAllowance: null,
  workNatureAllowance: null, otherAllowance: '0.00', ...extra,
})
const lookups = (employees, holders = {}) => ({
  employees: new Map(employees.map(row => [row.employeeCode.toUpperCase(), row])),
  people: new Map(employees.map(row => [row.id, { employeeCode: row.employeeCode, fullName: row.fullName }])),
  branches: [{ id: 1, name: 'الرياض', isActive: true }, { id: 2, name: 'جدة', isActive: true }],
  departments: [{ id: 10, name: 'المالية', branchId: 1, isActive: true }, { id: 11, name: 'المبيعات', branchId: 1, isActive: true },
    { id: 20, name: 'المالية', branchId: 2, isActive: true }],
  teams: [{ id: 100, name: 'الحسابات', departmentId: 10, isActive: true }, { id: 110, name: 'التجزئة', departmentId: 11, isActive: true }],
  costCenters: [{ id: 5, code: 'CC-01', name: 'عميل أ', isActive: true }],
  grades: [{ id: 7, name: 'الأولى', isActive: true }, { id: 8, name: 'القديمة', isActive: false }],
  jobTitles: [{ title: 'محاسب', isActive: true }, { title: 'مدير مبيعات', isActive: true }],
  holders: { fingerprintCode: new Map(), nationalId: new Map(), email: new Map(), ...holders },
})
const options = (extra = {}) => ({ branchScope: null, today: '2026-09-19', currentPayrollPeriod: '2026-09', canChangeSalary: true, salaryMonth: null,
  mode: 'preview', ...extra })
const sheet = (header, ...rows) => ({ header, rows: rows.map((cells, index) => ({ row: index + 2, cells })) })
const plan = (header, rows, data, extra) => planBulkUpdate(readBulkSheet(sheet(header, ...rows)), data, options(extra))

test('الخطة: كود مش موجود، كود متكرر، موظف فرع تاني لحساب فرع، وصف من غير تغيير', () => {
  const data = lookups([snapshot(), snapshot({ id: 2, employeeCode: 'E2', branchId: 2, departmentId: 20, teamId: null })])
  const result = plan(['كود الموظف', 'رقم الجوال'], [['E404', '0509999999'], ['E1', '0501234567'], ['e2', '0507777777'], ['', ''], ['E1', '0508888888']], data,
    { branchScope: 1 })
  assert.deepEqual(result.rows.map(row => [row.row, row.status]), [[2, 'error'], [3, 'error'], [4, 'error'], [6, 'error']])
  assert.match(result.rows[0].errors[0], /«E404» مش موجود/)
  assert.match(result.rows[1].errors[0], /متكرر في الملف \(الصفوف 3، 6\)/)
  assert.match(result.rows[2].errors[0], /فرع تاني — خارج صلاحية/)
  assert.equal(result.rows[2].employeeName, null) // بلا اسم موظف فرع تاني
  const unchanged = plan(['كود الموظف', 'رقم الجوال'], [['E1', '0501234567']], data)
  assert.equal(unchanged.rows[0].status, 'unchanged')
  assert.deepEqual(unchanged.summary, { total: 1, ready: 0, unchanged: 1, error: 0 })
})

test('الخطة: التغيير القديم ← الجديد، الأصفار اللي Excel شالها بتتجاهل، والهوية بشكل الجنسية', () => {
  const data = lookups([snapshot()])
  const result = plan(['كود الموظف', 'رقم الجوال', 'رقم البصمة', 'الجنس', 'تاريخ الميلاد'], [['E1', '501234567', '12', 'أنثى', '1991-02-03']], data)
  const row = result.rows[0]
  assert.equal(row.status, 'ready')
  assert.deepEqual(row.update, { gender: 'female', birthDate: '1991-02-03' })
  assert.deepEqual(row.changes.map(change => [change.field, change.old, change.new]), [['birthDate', '1990-01-01', '1991-02-03'], ['gender', 'ذكر', 'أنثى']])
  assert.equal(row.warnings.length, 2)
  const badId = plan(['كود الموظف', 'رقم الهوية / الإقامة'], [['E1', '2123456789']], data)
  assert.match(badId.rows[0].errors[0], /للسعودي 10 أرقام ويبدأ بـ1/)
  const future = plan(['كود الموظف', 'تاريخ الميلاد'], [['E1', '2030-01-01']], data)
  assert.match(future.rows[0].errors[0], /قبل النهارده/)
})

test('الخطة: التكرار — رقم هوية مسجل لموظف تاني (الاسم بس لو في النطاق) ورقم بصمة متكرر في الملف', () => {
  const data = lookups([snapshot(), snapshot({ id: 2, employeeCode: 'E2', fingerprintCode: '0099', nationalId: '1099999999' })], {
    nationalId: new Map([['1055555555', [{ id: 9, fullName: 'صاحب الهوية', branchId: 1 }]], ['1066666666', [{ id: 10, fullName: 'فرع تاني', branchId: 2 }]]]),
    fingerprintCode: new Map([[uniqueKey('fingerprintCode', 'ab-1'), [{ id: 11, fullName: 'صاحب البصمة', branchId: 1 }]]]),
  })
  const result = plan(['كود الموظف', 'رقم الهوية / الإقامة', 'رقم البصمة'], [['E1', '1055555555', 'FP-7'], ['E2', '1066666666', 'FP-7']], data, { branchScope: 1 })
  assert.match(result.rows[0].errors.join(), /مسجل لموظف تاني \(صاحب الهوية\)/)
  assert.match(result.rows[1].errors.join(), /مسجل لموظف تاني — مايتكررش/)
  assert.doesNotMatch(result.rows[1].errors.join(), /فرع تاني/)
  const inFile = plan(['كود الموظف', 'رقم البصمة'], [['E1', 'FP-7'], ['E2', 'fp-7']], data)
  assert.deepEqual(inFile.rows.map(row => row.status), ['error', 'error'])
  assert.match(inFile.rows[0].errors[0], /رقم البصمة FP-7 متكرر في الملف \(الصفوف 2، 3\)/)
  const holder = plan(['كود الموظف', 'رقم البصمة'], [['E1', 'AB-1']], data)
  assert.match(holder.rows[0].errors[0], /رقم البصمة AB-1 مسجل لموظف تاني \(صاحب البصمة\)/)
  assert.deepEqual(bulkLookupKeys(readBulkSheet(sheet(['كود الموظف', 'رقم البصمة', 'كود المدير المباشر'], ['e1', 'FP-7', 'm 1']))).codes, ['E1', 'M1'])
})

test('الخطة: القسم والفريق بالاسم جوه الفرع، نقل الفرع، الدرجة المعطّلة، مركز التكلفة بالكود، والمدير بكوده', () => {
  const data = lookups([snapshot(), snapshot({ id: 3, employeeCode: 'M1', fullName: 'المدير' })])
  const unknown = plan(['كود الموظف', 'القسم'], [['E1', 'التسويق']], data)
  assert.match(unknown.rows[0].errors[0], /القسم «التسويق» مش موجود في فرع «الرياض»/)
  const moved = plan(['كود الموظف', 'القسم'], [['E1', 'المبيعات']], data)
  assert.deepEqual(moved.rows[0].update, { departmentId: 11, teamId: null })
  assert.match(moved.rows[0].warnings[0], /الفريق «الحسابات» اتشال/)
  const branchNoDept = plan(['كود الموظف', 'الفرع'], [['E1', 'جدة']], data)
  assert.match(branchNoDept.rows[0].errors[0], /محتاج اسم القسم الجديد/)
  const branch = plan(['كود الموظف', 'الفرع', 'القسم'], [['E1', 'جده', 'الماليه']], data)
  assert.equal(branch.rows[0].status, 'ready')
  assert.deepEqual(branch.rows[0].update, { branchId: 2, departmentId: 20, teamId: null })
  assert.equal(branch.rows[0].branchChange, true)
  assert.equal(branch.needs.org, true)
  const branchUser = plan(['كود الموظف', 'الفرع', 'القسم'], [['E1', 'جدة', 'المالية']], data, { branchScope: 1 })
  assert.match(branchUser.rows[0].errors[0], /حساب الفرع مايقدرش ينقل/)
  const misc = plan(['كود الموظف', 'الدرجة الوظيفية', 'مركز التكلفة', 'كود المدير المباشر', 'المسمى الوظيفي'], [['E1', 'القديمة', 'cc-01', 'M1', 'سائق']], data)
  assert.deepEqual(misc.rows[0].errors, ['المسمى الوظيفي: «سائق» مش في كتالوج المسميات الوظيفية', 'الدرجة الوظيفية: الدرجة «القديمة» معطّلة — اختار درجة فعّالة'])
  const good = plan(['كود الموظف', 'مركز التكلفة', 'كود المدير المباشر', 'المسمى الوظيفي'], [['E1', 'cc-01', 'm1', 'مدير مبيعات']], data)
  assert.deepEqual(good.rows[0].update, { jobTitle: 'مدير مبيعات', costCenterId: 5, managerEmployeeId: 3 })
  assert.equal(good.rows[0].changes.find(change => change.field === 'manager').new, 'M1 — المدير')
  const self = plan(['كود الموظف', 'كود المدير المباشر'], [['E1', 'E1']], data)
  assert.match(self.rows[0].errors[0], /مدير مباشر لنفسه/)
})

test('الخطة: طريقة الصرف على الحالة بعد الحفظ، والعقد نهايته بعد بدايته', () => {
  const data = lookups([snapshot()])
  const mixedNoAmount = plan(['كود الموظف', 'طريقة الصرف'], [['E1', 'نقدي + بنك']], data)
  assert.match(mixedNoAmount.rows[0].errors[0], /مبلغ التحويل البنكي/)
  const amountWithTransfer = plan(['كود الموظف', 'مبلغ التحويل البنكي'], [['E1', '1000']], data)
  assert.match(amountWithTransfer.rows[0].errors[0], /بس مع «نقدي \+ بنك»/)
  const mixed = plan(['كود الموظف', 'طريقة الصرف', 'مبلغ التحويل البنكي'], [['E1', 'نقدي + بنك', '1500']], data)
  assert.deepEqual(mixed.rows[0].update, { payMethod: 'mixed', bankTransferAmount: 1500 })
  const noIban = plan(['كود الموظف', 'طريقة الصرف'], [['E1', 'تحويل بنكي']], lookups([snapshot({ payMethod: 'cash', iban: null, bankName: null })]))
  assert.match(noIban.rows[0].errors[0], /اسم البنك مطلوب/)
  const contract = plan(['كود الموظف', 'نهاية العقد'], [['E1', '2019-12-31']], data)
  assert.match(contract.rows[0].errors[0], /نهاية العقد قبل بدايته/)
})

test('الخطة: الراتب والبدلات — صلاحية اعتماد المسير، شهر السريان (مش مستقبلي)، والباقي من الأجر الحالي', () => {
  const data = lookups([snapshot()])
  const header = ['كود الموظف', 'الراتب الأساسي', 'بدل الهاتف', 'يسري من راتب شهر']
  const noPerm = plan(header, [['E1', '6000', '', '']], data, { canChangeSalary: false })
  assert.match(noPerm.fileErrors[0], /اعتماد المسير/)
  const preview = plan(header, [['E1', '6000', '', '']], data)
  const row = preview.rows[0]
  assert.equal(row.status, 'ready')
  assert.deepEqual(row.salary.values, { basicSalary: '6000.00', housingAllowance: '1000.00', transportAllowance: '0.00', phoneAllowance: '0.00',
    workNatureAllowance: '0.00', otherAllowance: '0.00' })
  assert.deepEqual(row.changes.map(change => [change.field, change.old, change.new]), [['basicSalary', '5000.00', '6000.00']])
  assert.match(row.warnings[0], /حدد «يسري من راتب شهر»/)
  assert.equal(preview.needs.salaryMonth, true)
  const apply = plan(header, [['E1', '6000', '', '']], data, { mode: 'apply' })
  assert.match(apply.rows[0].errors[0], /حدد «يسري من راتب شهر»/)
  const global = plan(header, [['E1', '6000', '', '']], data, { mode: 'apply', salaryMonth: '2026-08' })
  assert.equal(global.rows[0].salary.month, '2026-08')
  const future = plan(header, [['E1', '6000', '', '2026-10']], data, { mode: 'apply', salaryMonth: '2026-08' })
  assert.match(future.rows[0].errors[0], /بعد الشهر الجاري 2026-09/)
  const same = plan(header, [['E1', '5000', '0', '2026-09']], data)
  assert.equal(same.rows[0].status, 'unchanged')
  const noCurrency = plan(header, [['E1', '6000', '', '2026-09']], lookups([snapshot({ currency: null })]))
  assert.match(noCurrency.rows[0].errors[0], /عملة أجر الموظف/)
})

test('الملف: الصفوف الفاضية بتتجاهل، أرقام الصفوف زي الملف، والحد 2000 صف', () => {
  const parsed = readBulkSheet(sheet(['كود الموظف', 'رقم الجوال', 'عمود زيادة'], ['E1', '0501234567', 'x'], ['', '', ''], ['E2', '', 'y']))
  assert.deepEqual(parsed.records.map(record => [record.row, record.code, record.values.size]), [[2, 'E1', 1], [4, 'E2', 0]])
  assert.deepEqual(parsed.ignoredColumns, ['عمود زيادة'])
  const many = readBulkSheet(sheet(['كود الموظف', 'رقم الجوال'], ...Array.from({ length: 2001 }, (_, index) => [`E${index}`, '0501234567'])))
  assert.match(many.fileErrors[0], /الحد 2000 صف/)
})

test('Excel: القالب بيتكتب ويتقري تاني بنفس القيم (أرقام نصية وتواريخ ومبالغ)، وxls القديم مرفوض', async () => {
  const buffer = await writeBulkWorkbook({
    columns: [{ header: 'كود الموظف', width: 14, text: true }, { header: 'اسم الموظف', width: 20, text: true },
      { header: 'رقم البصمة', width: 14, text: true }, { header: 'الجنس', width: 10, text: true, list: ['ذكر', 'أنثى'] },
      { header: 'الراتب الأساسي', width: 14, text: false, money: true }],
    rows: [['E1', 'موظف', '0012', 'ذكر', 5000.5]],
    references: [{ title: 'الفروع', headers: ['الفرع'], rows: [['الرياض']] }],
    instructions: ['تعليمات'],
  })
  const sheetRead = await readBulkFile(buffer, 'قالب.xlsx')
  assert.equal(sheetRead.format, 'xlsx')
  assert.deepEqual(sheetRead.header, ['كود الموظف', 'اسم الموظف', 'رقم البصمة', 'الجنس', 'الراتب الأساسي'])
  assert.deepEqual(sheetRead.rows[0], { row: 2, cells: ['E1', 'موظف', '0012', 'ذكر', 5000.5] })
  const parsed = readBulkSheet(sheetRead)
  assert.deepEqual([...parsed.records[0].values.entries()].map(([key, value]) => [key, value.value]),
    [['fingerprintCode', '0012'], ['gender', 'male'], ['basicSalary', '5000.50']])
  assert.throws(() => bulkFileFormat('old.xls', Buffer.from('x')), /\.xls/)
  assert.equal(bulkFileFormat('data.csv', Buffer.from('a,b')), 'csv')
})

test('Excel: ملف مضغوط بينفجر بعد فك الضغط بيترفض قبل القراءة', async () => {
  const name = Buffer.from('xl/worksheets/sheet1.xml')
  const data = zlib.deflateRawSync(Buffer.alloc(64 * 1024 * 1024))
  const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(8, 8); local.writeUInt32LE(data.length, 18)
  local.writeUInt32LE(64 * 1024 * 1024, 22); local.writeUInt16LE(name.length, 26)
  const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(8, 10); central.writeUInt32LE(data.length, 20)
  central.writeUInt32LE(1024, 24); central.writeUInt16LE(name.length, 28); central.writeUInt32LE(0, 42)
  const body = Buffer.concat([local, name, data])
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10)
  end.writeUInt32LE(central.length + name.length, 12); end.writeUInt32LE(body.length, 16)
  const bomb = Buffer.concat([body, central, name, end])
  assert.ok(bomb.length < 1024 * 1024)
  await assert.rejects(readBulkFile(bomb, 'bomb.xlsx'), /كبير جدًا بعد فك الضغط/)
})

test('CSV مش UTF-8 أو ملف فاضي بيترفض برسالة واضحة', async () => {
  await assert.rejects(readBulkFile(Buffer.from([0x63, 0x6f, 0xe4, 0x2c, 0x61]), 'x.csv'), /UTF-8/)
  await assert.rejects(readBulkFile(Buffer.alloc(0), 'x.csv'), /الملف فاضي/)
})

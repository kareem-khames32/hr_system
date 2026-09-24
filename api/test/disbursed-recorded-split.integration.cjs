'use strict'
// «اللي اتصرف فعلًا» حيًّا على قاعدة SQL مؤقتة معزولة (تدقيق 24 سبتمبر — N02):
// بند مسير اتسجل صرفه نقدي (payroll_item_disbursements) وبعده ملف الموظف بقى «تحويل بنكي» —
// كشف البنوك والتقرير المالي وشاشة الصرف وتقرير طرق الصرف **والقسيمة** لازم يقولوا نفس الرقم: بنك 0.00 / نقدي 1,000.00.
// والبند اللي لسه ماتصرفش (بلا علامة أو بعلامة «لم يتم») يفضل على طريقة الصرف الحالية في الملف.
// لا مساس بقاعدة الشركة ولا بقاعدة المراجعة؛ التوكن موقّع محليًّا بسر عشوائي (لا كلمات مرور ولا أسرار).
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_recorded_split_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_recorded_split_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-recorded-split-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const IBAN = 'SA0380000000608010167519'
let app, master, ds, base, created = false, admin
const E = {}, R = {}, I = {}
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
const C = value => Math.round(Number(value) * 100)

async function get(endpoint) {
  const token = jwt.sign({ sub: admin.id, email: admin.email, role: admin.role, branchId: null, employeeId: null, tokenVersion: 0, permissions: ['*'] })
  const response = await fetch(base + endpoint, { headers: { Authorization: `Bearer ${token}` } })
  const text = await response.text()
  const body = text ? JSON.parse(text) : null
  assert.equal(response.status, 200, `${endpoint}: ${text}`)
  return body
}
/** الأربع شاشات لنفس المسير: كشف البنوك، صفوف التقرير المالي، شاشة الصرف، وتقرير طرق الصرف. */
async function surfaces(run, period) {
  const [sheet, register, screen, methods] = await Promise.all([
    get(`/payroll/runs/${run.id}/bank-sheet`), get(`/reports/financial/payroll-register?period=${period}`),
    get(`/payroll/disbursement/runs/${run.id}`), get(`/payroll/runs/${run.id}/pay-methods`),
  ])
  const rowOf = employeeId => ({
    sheet: sheet.rows.find(row => row.employeeId === employeeId),
    register: register.rows.find(row => row.employeeId === employeeId),
    screen: screen.rows.find(row => row.employeeId === employeeId),
  })
  return { sheet, register, screen, methods, rowOf }
}
const split = ({ sheet, register, screen }) => [
  [sheet.payMethod, C(sheet.bankAmount), C(sheet.cashAmount)],
  [register.payMethod, C(register.bank), C(register.cash)],
  [screen.payMethod, C(screen.bankAmount), C(screen.cashAmount)],
]

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME,
    password: env.DB_PASSWORD, database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`

  const cycle = await repo('RequestsConfig').findOneBy({ key: 'payroll.cycle_start_day' })
  await repo('RequestsConfig').save(cycle ? { ...cycle, value: '23' } : { key: 'payroll.cycle_start_day', value: '23' })
  const branch = await repo('Branch').save({ code: 'FR_RS', name: 'فرع الصرف' })
  admin = await repo('User').save({ email: 'admin@rs.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin',
    branchId: null, permissions: JSON.stringify(['*']) })
  // كل الموظفين بدأوا «نقدي» ⇒ لقطة البند نقدي، وبعد الصرف بيتحولوا «تحويل بنكي»
  const employee = (code, fullName) => repo('Employee').save({ employeeCode: code, fullName, branchId: branch.id, joinDate: '2020-01-01',
    basicSalary: 1000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'cash' })
  E.paid = await employee('RS-001', 'مصروف نقدي')
  E.open = await employee('RS-002', 'لسه ماتصرفلوش')
  E.runLevel = await employee('RS-003', 'مسير اتصرف كله')

  const snapshot = emp => ({ version: 1, capturedAt: '2026-08-01T00:00:00.000Z', employeeCode: emp.employeeCode, fullName: emp.fullName,
    branchId: branch.id, departmentId: null, teamId: null, costCenterId: null, coverFrom: null, coverTo: null, coverDays: null,
    prorataFactor: null, monthlyDays: 30, basicSalary: 1000, allowances: 0, gross: 1000, grossEarned: 1000 })
  const item = (runId, emp, netPay) => repo('PayrollItem').save({ runId, employeeId: emp.id, basicSalary: netPay, allowances: 0,
    payMethod: 'cash', netPay, breakdown: '{}' })

  // مسير معتمد: بند اتعلّم «تم الصرف» نقدي، وبند تاني لسه ماتعلّمش
  R.approved = await repo('PayrollRun').save({ status: 'APPROVED', period: '2026-08', scopeType: 'COMPANY', name: 'مسير أغسطس',
    startDate: '2026-07-23', endDate: '2026-08-22' })
  await repo('PayrollRunMember').save([{ runId: R.approved.id, employeeId: E.paid.id, snapshot: snapshot(E.paid) },
    { runId: R.approved.id, employeeId: E.open.id, snapshot: snapshot(E.open) }])
  I.paid = await item(R.approved.id, E.paid, 1000)
  I.open = await item(R.approved.id, E.open, 500)
  await repo('PayrollItemDisbursement').save({ runId: R.approved.id, itemId: I.paid.id, employeeId: E.paid.id, status: 'PAID',
    amount: 1000, bankAmount: 0, cashAmount: 1000, payMethod: 'cash', note: 'استلم نقدي', markedByUserId: admin.id, markedAt: new Date('2026-08-23T09:00:00Z') })

  // مسير مصروف كله مرة واحدة بلا علامات (الشهر اللي قبله)
  R.runLevel = await repo('PayrollRun').save({ status: 'PAID', period: '2026-07', scopeType: 'COMPANY', name: 'مسير يوليو',
    startDate: '2026-06-23', endDate: '2026-07-22' })
  await repo('PayrollRunMember').save({ runId: R.runLevel.id, employeeId: E.runLevel.id, snapshot: snapshot(E.runLevel) })
  I.runLevel = await item(R.runLevel.id, E.runLevel, 700)

  // ... وبعد الصرف: ملف كل الموظفين بقى «تحويل بنكي»
  for (const emp of [E.paid, E.open, E.runLevel]) {
    await repo('Employee').update(emp.id, { payMethod: 'transfer', bankName: 'بنك الاختبار', iban: IBAN })
  }
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try { fs.rmSync(uploads, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'recorded disbursement split fixture cleanup failed')
})

test('RS-01: البند المصروف نقدي يفضل نقدي في الشاشات الأربع بعد ما الملف بقى «تحويل بنكي»، واللي لسه ماتصرفش بيتبع الملف', async () => {
  const view = await surfaces(R.approved, '2026-08')
  // الصف المصروف: نقدي في كشف البنوك والتقرير المالي وشاشة الصرف بالحرف
  assert.deepEqual(split(view.rowOf(E.paid.id)), [['cash', 0, 100000], ['cash', 0, 100000], ['cash', 0, 100000]])
  assert.equal(view.rowOf(E.paid.id).screen.state, 'PAID')
  assert.equal(view.rowOf(E.paid.id).sheet.issue, null, 'مبلغ اتصرف خلاص مش تنبيه بيانات صرف')
  // الصف اللي لسه ماتعلّمش: طريقة الصرف الحالية في الملف (تحويل بنكي) — السلوك الصح ما اتغيرش
  assert.deepEqual(split(view.rowOf(E.open.id)), [['transfer', 50000, 0], ['transfer', 50000, 0], ['transfer', 50000, 0]])
  assert.equal(view.rowOf(E.open.id).screen.state, 'UNPAID')
  // المجاميع والتسوية: بنك 500 ونقدي 1000 في الكشف = الدفتر = شاشة الصرف = تقرير طرق الصرف
  assert.deepEqual([C(view.sheet.totals.bank), C(view.sheet.totals.cash), C(view.sheet.totals.net)], [50000, 100000, 150000])
  assert.deepEqual([C(view.register.totals.bank), C(view.register.totals.cash), C(view.register.totals.settlement), C(view.register.totals.net)],
    [50000, 100000, 0, 150000])
  assert.deepEqual([C(view.screen.totals.paid.bank), C(view.screen.totals.paid.cash)], [0, 100000])
  assert.deepEqual([C(view.screen.totals.unpaid.bank), C(view.screen.totals.unpaid.cash)], [50000, 0])
  assert.deepEqual([C(view.screen.totals.payable.bank), C(view.screen.totals.payable.cash)], [C(view.sheet.totals.bank), C(view.sheet.totals.cash)])
  assert.deepEqual([C(view.methods.cash?.bank ?? 0), C(view.methods.cash?.cash ?? 0)], [0, 100000])
  assert.deepEqual([C(view.methods.transfer?.bank ?? 0), C(view.methods.transfer?.cash ?? 0)], [50000, 0])
  assert.equal(C(view.register.totals.bank) + C(view.register.totals.cash) + C(view.register.totals.settlement), C(view.register.totals.net))
}, { timeout: 120000 })

test('RS-02: مسير اتصرف كله مرة واحدة بلا علامات بياخد لقطة البند، و«لم يتم» ترجّع الصف لملف الموظف', async () => {
  const runLevel = await surfaces(R.runLevel, '2026-07')
  assert.deepEqual(split(runLevel.rowOf(E.runLevel.id)), [['cash', 0, 70000], ['cash', 0, 70000], ['cash', 0, 70000]])
  assert.deepEqual([C(runLevel.sheet.totals.bank), C(runLevel.sheet.totals.cash)], [0, 70000])
  assert.equal(runLevel.rowOf(E.runLevel.id).screen.state, 'PAID')

  // «لم يتم» (اتقفل الصرف بسبب مكتوب): البند لسه مستحق ⇒ طريقة الصرف الحالية
  await repo('PayrollItemDisbursement').update({ itemId: I.paid.id }, { status: 'UNPAID', bankAmount: 0, cashAmount: 0, payMethod: null })
  const after = await surfaces(R.approved, '2026-08')
  assert.deepEqual(split(after.rowOf(E.paid.id)), [['transfer', 100000, 0], ['transfer', 100000, 0], ['transfer', 100000, 0]])
  assert.deepEqual([C(after.sheet.totals.bank), C(after.sheet.totals.cash)], [150000, 0])
  assert.deepEqual([C(after.register.totals.bank), C(after.register.totals.cash)], [150000, 0])
  assert.equal(after.rowOf(E.paid.id).screen.state, 'UNPAID')
}, { timeout: 120000 })

// قرار المالك 24 سبتمبر: القسيمة كمان لازم تقول اللي اتصرف فعلًا — كانت مستثناة بقصد قبل كده.
test('RS-03: القسيمة تقول اللي اتصرف فعلًا — نقدي بعد ما الملف بقى «تحويل بنكي»، وبند بلا علامة يتبع الملف', async () => {
  // RS-02 سابته «لم يتم»؛ نرجّع العلامة لحالتها المعلنة عشان الاختبار ده يقف على رجليه لوحده
  await repo('PayrollItemDisbursement').update({ itemId: I.paid.id },
    { status: 'PAID', amount: 1000, bankAmount: 0, cashAmount: 1000, payMethod: 'cash' })
  const payslip = id => get(`/payroll/items/${id}`)
  const pay = slip => [slip.employee.payMethod, C(slip.employee.paySplit.bank), C(slip.employee.paySplit.cash)]

  const paid = await payslip(I.paid.id)
  assert.deepEqual(pay(paid), ['cash', 0, 100000], 'قسيمة بند اتصرف نقدي تفضل نقدي بعد ما الملف بقى تحويل')
  // ونفس رقم كشف البنوك بالحرف (مصدر واحد للخمس شاشات)
  const sheet = await get(`/payroll/runs/${R.approved.id}/bank-sheet`)
  const row = sheet.rows.find(entry => entry.employeeId === E.paid.id)
  assert.deepEqual(pay(paid), [row.payMethod, C(row.bankAmount), C(row.cashAmount)])
  // الهوية والبنك والآيبان لسه قراءة حالية من الملف (مش لقطة) — نفس سلوك النهاردة
  assert.equal(paid.employee.bankName, 'بنك الاختبار')
  assert.equal(paid.employee.iban, IBAN)

  // بند بلا علامة في مسير معتمد: ملف الموظف الحالي زي ما هو (السلوك القديم بالحرف)
  assert.deepEqual(pay(await payslip(I.open.id)), ['transfer', 50000, 0])
  // مسير مصروف كله مرة واحدة بلا علامات: طريقة الصرف المحفوظة على البند
  assert.deepEqual(pay(await payslip(I.runLevel.id)), ['cash', 0, 70000])

  // و«لم يتم» ترجّع القسيمة لملف الموظف الحالي (لسه ماتصرفلوش)
  await repo('PayrollItemDisbursement').update({ itemId: I.paid.id }, { status: 'UNPAID', bankAmount: 0, cashAmount: 0, payMethod: null })
  assert.deepEqual(pay(await payslip(I.paid.id)), ['transfer', 100000, 0])
}, { timeout: 120000 })

// مراجعة مستقلة 24 سبتمبر (تكملة N02): الصرف الجماعي كان بيرجع لطريقة الصرف المحفوظة وقت **الحساب**، فالرقم كان بينقلب
// من بنك لنقدي بمجرد الإقفال، و«نقدي + بنك» المصروف كان بيتغير تاريخيًا بتعديل مبلغ التحويل في الملف. دلوقتي الصرف
// بيثبّت على البند طريقته وتقسيمه (paidPayMethod/paidBankAmount/paidCashAmount — ترحيل 067)، والخمس شاشات بتقراه.
test('RS-04: التقسيم المثبت وقت الصرف يغلب الملف الحالي ولقطة الحساب في الخمس شاشات، وتعديل الملف بعده مابيغيّرش حاجة', async () => {
  const branchId = E.paid.branchId
  // الملف الحالي: تحويل بنكي كامل بمبلغ 800. لقطة الحساب: نقدي. المثبت وقت الصرف: نقدي + بنك 300 / 700.
  const employee = await repo('Employee').save({ employeeCode: 'RS-004', fullName: 'مثبت وقت الصرف', branchId, joinDate: '2020-01-01',
    basicSalary: 1000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, status: 'active', isActive: true,
    payMethod: 'transfer', bankTransferAmount: 800, bankName: 'بنك الاختبار', iban: IBAN })
  const run = await repo('PayrollRun').save({ status: 'PAID', period: '2026-06', scopeType: 'COMPANY', name: 'مسير يونيو',
    startDate: '2026-05-23', endDate: '2026-06-22' })
  await repo('PayrollRunMember').save({ runId: run.id, employeeId: employee.id, snapshot: { version: 1, capturedAt: '2026-06-01T00:00:00.000Z',
    employeeCode: employee.employeeCode, fullName: employee.fullName, branchId, departmentId: null, teamId: null, costCenterId: null,
    coverFrom: null, coverTo: null, coverDays: null, prorataFactor: null, monthlyDays: 30, basicSalary: 1000, allowances: 0, gross: 1000, grossEarned: 1000 } })
  const item = await repo('PayrollItem').save({ runId: run.id, employeeId: employee.id, basicSalary: 1000, allowances: 0,
    payMethod: 'cash', netPay: 1000, breakdown: '{}', paidPayMethod: 'mixed', paidBankAmount: 300, paidCashAmount: 700 })

  const frozen = [['mixed', 30000, 70000], ['mixed', 30000, 70000], ['mixed', 30000, 70000]]
  const before = await surfaces(run, '2026-06')
  assert.deepEqual(split(before.rowOf(employee.id)), frozen, 'المثبت وقت الصرف لا الملف (800/200) ولا لقطة الحساب (نقدي)')
  assert.deepEqual([C(before.sheet.totals.bank), C(before.sheet.totals.cash)], [30000, 70000])
  assert.deepEqual([C(before.register.totals.bank), C(before.register.totals.cash)], [30000, 70000])
  assert.equal(before.rowOf(employee.id).screen.state, 'PAID')
  // تقرير طرق الصرف على نفس المصدر (مجموعة «نقدي + بنك» لوحدها في هذا المسير)
  const mixedBucket = before.methods.mixed
  assert.deepEqual([mixedBucket.count, C(mixedBucket.bank), C(mixedBucket.cash)], [1, 30000, 70000])
  // والقسيمة كمان (الخامسة)
  const slip = await get(`/payroll/items/${item.id}`)
  assert.deepEqual([slip.employee.payMethod, C(slip.employee.paySplit.bank), C(slip.employee.paySplit.cash)], ['mixed', 30000, 70000])

  // تعديل ملف الموظف بعد الصرف: ولا رقم بيتغير في أي شاشة (واقعة صرف حصلت خلاص)
  await repo('Employee').update(employee.id, { payMethod: 'cash', bankTransferAmount: 999 })
  const after = await surfaces(run, '2026-06')
  assert.deepEqual(split(after.rowOf(employee.id)), frozen, 'تعديل الملف بعد الصرف مابيلمسش المثبت')
  assert.deepEqual([C(after.sheet.totals.bank), C(after.sheet.totals.cash)], [30000, 70000])

  // علامة «لم يتم» متجاوزة (اتعلّم ثم اتلغى وهو معتمد، وبعدها المسير اتصرف كله مرة واحدة): التثبيت يغلبها،
  // عشان الشاشة ماتقولش «تم الصرف» وتقسيمه لسه بيتغير مع أي تعديل في الملف. (الشاشة أصلًا بتقول PAID في الصرف الجماعي.)
  await repo('PayrollItemDisbursement').save({ runId: run.id, itemId: item.id, employeeId: employee.id, status: 'UNPAID',
    amount: 1000, bankAmount: 0, cashAmount: 0, payMethod: null, note: 'اتلغت علامته قبل إقفال المسير', markedByUserId: admin.id, markedAt: new Date() })
  const stale = await surfaces(run, '2026-06')
  assert.deepEqual(split(stale.rowOf(employee.id)), frozen, 'المثبت وقت الصرف يغلب علامة «لم يتم» المتجاوزة')
  assert.equal(stale.rowOf(employee.id).screen.state, 'PAID', 'الصرف الجماعي صرف للكل')

  // و«لم يتم» الحقيقية (إقفال موظف بموظف: البند ده مش مثبت أصلًا لأنه ما اتصرفلوش) ⇒ ملف الموظف الحالي
  await repo('PayrollItem').update({ id: item.id }, { paidPayMethod: null, paidBankAmount: null, paidCashAmount: null })
  const unpaid = await surfaces(run, '2026-06')
  assert.deepEqual(split(unpaid.rowOf(employee.id)), [['cash', 0, 100000], ['cash', 0, 100000], ['cash', 0, 100000]])
  await repo('PayrollItem').update({ id: item.id }, { paidPayMethod: 'mixed', paidBankAmount: 300, paidCashAmount: 700 })

  // وعلامة «تم الصرف» بمبالغها تغلب المثبت كمان (العلامة أحدث دليل)
  await repo('PayrollItemDisbursement').update({ itemId: item.id },
    { status: 'PAID', bankAmount: 250, cashAmount: 750, payMethod: 'mixed' })
  const marked = await surfaces(run, '2026-06')
  assert.deepEqual(split(marked.rowOf(employee.id)), [['mixed', 25000, 75000], ['mixed', 25000, 75000], ['mixed', 25000, 75000]])
}, { timeout: 120000 })

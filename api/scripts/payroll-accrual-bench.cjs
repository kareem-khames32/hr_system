// قياس تكلفة حساب مسير شهر كامل — على قاعدة بيانات مؤقتة تُنشأ وتُحذف هنا،
// ولا تلمس قاعدة الإنتاج أبدًا. يطبع: زمن الحساب الكلي، وأين راح الوقت
// (تجسيد الحضور/computeDay، استعلامات لكل موظف، أكثر جمل SQL تكرارًا = N+1).
//
//   node scripts/payroll-accrual-bench.cjs --employees=580 --period=2026-07
//   node scripts/payroll-accrual-bench.cjs --employees=60 --accrual   (يقيس مسار التراكم اليومي)
//
// كل شيء هنا للقياس فقط: لا يُستورد من التطبيق وقت التشغيل العادي.
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const crypto = require('node:crypto')

const apiRoot = path.resolve(__dirname, '..')
require(path.join(apiRoot, 'node_modules/ts-node')).register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require(path.join(apiRoot, 'node_modules/reflect-metadata'))
const sql = require(path.join(apiRoot, 'node_modules/mssql'))
const env = require(path.join(apiRoot, 'node_modules/dotenv')).parse(fs.readFileSync(path.join(apiRoot, '.env')))

const args = new Map(process.argv.slice(2).map(arg => {
  const [key, value] = arg.replace(/^--/, '').split('=')
  return [key, value === undefined ? 'true' : value]
}))
const EMPLOYEES = Number(args.get('employees') ?? 580)
const PERIOD = String(args.get('period') ?? '2026-07')
const CYCLE_START_DAY = Number(args.get('cycleStartDay') ?? 23)
const WITH_ACCRUAL = args.get('accrual') === 'true'

// اسم قاعدة الاختبار المؤقتة بالصيغة التي يقبلها حارس DB_SYNCHRONIZE: hr_<اسم>_test_<16 hex>
const database = `hr_payroll_bench_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-bench-'))
const secret = crypto.randomBytes(48).toString('hex')

// ===== أداة القياس: كل جملة SQL بزمنها، مجمّعة على «شكل» الجملة =====
const stats = { queries: 0, sqlMs: 0, byShape: new Map(), phases: new Map() }
let collecting = false
function shapeOf(query) {
  return String(query)
    .replace(/\s+/g, ' ')
    .replace(/@\d+/g, '?')
    .replace(/\b\d+\b/g, 'N')
    .slice(0, 150)
}
function record(query, ms) {
  if (!collecting) return
  stats.queries++
  stats.sqlMs += ms
  const key = shapeOf(query)
  const row = stats.byShape.get(key) ?? { count: 0, ms: 0 }
  row.count++
  row.ms += ms
  stats.byShape.set(key, row)
}
function phase(name, ms) {
  const row = stats.phases.get(name) ?? { count: 0, ms: 0 }
  row.count++
  row.ms += ms
  stats.phases.set(name, row)
}
function instrumentDataSource(ds) {
  const original = ds.createQueryRunner.bind(ds)
  ds.createQueryRunner = (...params) => {
    const runner = original(...params)
    const query = runner.query.bind(runner)
    runner.query = async (text, values, useStructuredResult) => {
      const started = process.hrtime.bigint()
      try { return await query(text, values, useStructuredResult) } finally {
        record(text, Number(process.hrtime.bigint() - started) / 1e6)
      }
    }
    return runner
  }
}
// الدوال الثقيلة داخل حلقة الموظف — نقيسها بالاسم لا بالـSQL وحدها
function instrumentMethods(app) {
  const { AttendanceService } = require(path.join(apiRoot, 'src/attendance/attendance.service'))
  for (const name of ['materializeAbsences', 'computeDay']) {
    const original = AttendanceService.prototype[name]
    AttendanceService.prototype[name] = async function wrapped(...params) {
      if (!collecting) return original.apply(this, params)
      const started = process.hrtime.bigint()
      try { return await original.apply(this, params) } finally {
        phase(`AttendanceService.${name}`, Number(process.hrtime.bigint() - started) / 1e6)
      }
    }
  }
  return app
}

function dates(from, to) {
  const out = []
  for (let time = Date.parse(`${from}T12:00:00Z`); time <= Date.parse(`${to}T12:00:00Z`); time += 86400000) {
    out.push(new Date(time).toISOString().slice(0, 10))
  }
  return out
}

async function main() {
  if ((env.DB_TYPE || 'mssql') !== 'mssql') throw new Error('القياس على SQL Server فقط')
  if (database === env.DB_DATABASE) throw new Error('رفض: اسم قاعدة القياس يساوي قاعدة الإنتاج')
  const master = await new sql.ConnectionPool({
    server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433),
    user: env.DB_USERNAME, password: env.DB_PASSWORD, database: 'master',
    options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 10000,
  }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`)
  console.log(`قاعدة مؤقتة: ${database}`)

  let app = null
  try {
    Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
    const bootStarted = Date.now()
    app = await require(path.join(apiRoot, 'node_modules/@nestjs/core')).NestFactory.create(
      require(path.join(apiRoot, 'src/app.module')).AppModule, { logger: ['error'], abortOnError: false })
    await app.init()
    const scheduler = app.get(require(path.join(apiRoot, 'node_modules/@nestjs/schedule')).SchedulerRegistry)
    for (const job of scheduler.getCronJobs().values()) job.stop()
    const ds = app.get(require(path.join(apiRoot, 'node_modules/typeorm')).DataSource)
    if (ds.options.database !== database) throw new Error('رفض: التطبيق غير موصول بقاعدة القياس')
    console.log(`إقلاع + مخطط: ${((Date.now() - bootStarted) / 1000).toFixed(1)}s`)
    instrumentMethods(app)
    instrumentDataSource(ds)
    const repo = name => ds.getRepository(name)

    // ===== بيانات القياس =====
    const seedStarted = Date.now()
    const branch = await repo('Branch').save({ name: 'قياس المسير', code: 'BENCH' })
    const admin = await repo('User').save({ email: 'bench@payroll.invalid', displayName: 'قياس',
      passwordHash: 'bench-only', role: 'super_admin', permissions: '["*"]' })
    await repo('RequestsConfig').save([
      { key: 'payroll.cycle_start_day', value: String(CYCLE_START_DAY) },
      { key: 'payroll.monthly_days', value: '30' }, { key: 'payroll.daily_hours', value: '8' },
      { key: 'payroll.late_deduction_enabled', value: 'true' },
      { key: 'attendance.absence_penalty_days', value: '1' }, { key: 'attendance.weekend_days', value: 'FRI,SAT' },
      { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' },
    ])
    const shift = await repo('Shift').save({ name: 'وردية القياس', startTime: '08:00', endTime: '16:00', shiftMode: 'fixed' })

    const payrollService = app.get(require(path.join(apiRoot, 'src/payroll/payroll.service')).PayrollService)
    const { startDate, endDate } = await payrollService.periodRange(PERIOD)
    const periodDates = dates(startDate, endDate)
    console.log(`الفترة ${PERIOD}: ${startDate} → ${endDate} (${periodDates.length} يوم)، ${EMPLOYEES} موظف`)

    const employees = []
    for (let index = 0; index < EMPLOYEES; index += 1) {
      employees.push({
        employeeCode: `BN${String(index + 1).padStart(4, '0')}`,
        fullName: `موظف قياس ${index + 1}`, branchId: branch.id, joinDate: '2020-01-01',
        basicSalary: 6000 + (index % 20) * 250, housingAllowance: 500, transportAllowance: 300, otherAllowance: 0,
        status: 'active', isActive: true, payMethod: 'transfer',
      })
    }
    const saved = []
    for (let index = 0; index < employees.length; index += 100) saved.push(...await repo('Employee').save(employees.slice(index, index + 100)))

    // جدول أسبوعي لكل موظف يغطي الفترة (الأحد مفتاح الأسبوع)
    const weekStarts = new Set()
    for (const date of [startDate, ...periodDates]) {
      const day = new Date(`${date}T12:00:00Z`)
      day.setUTCDate(day.getUTCDate() - day.getUTCDay())
      weekStarts.add(day.toISOString().slice(0, 10))
    }
    const scheduleRows = []
    for (const emp of saved) for (const weekStart of weekStarts) {
      scheduleRows.push({ employeeId: emp.id, weekStart, shiftId: shift.id, shiftName: shift.name, startTime: '08:00', endTime: '16:00' })
    }
    for (let index = 0; index < scheduleRows.length; index += 500) await repo('ScheduleEntry').save(scheduleRows.slice(index, index + 500))

    // بصمات خام: دخول وخروج لكل يوم عمل (الجمعة/السبت عطلة) — نحو 20 ألف بصمة لـ580 موظف
    const workDates = periodDates.filter(date => {
      const weekday = new Date(`${date}T12:00:00Z`).getUTCDay()
      return weekday !== 5 && weekday !== 6
    })
    let punchCount = 0
    const punchValues = []
    for (const emp of saved) for (const date of workDates) {
      const lateMinutes = (emp.id + date.charCodeAt(9)) % 7 === 0 ? 17 : 0
      punchValues.push(`('${emp.employeeCode}',${emp.id},'${date}T${String(8).padStart(2, '0')}:${String(lateMinutes).padStart(2, '0')}:00','BENCH','DEVICE')`)
      punchValues.push(`('${emp.employeeCode}',${emp.id},'${date}T16:05:00','BENCH','DEVICE')`)
      punchCount += 2
    }
    for (let index = 0; index < punchValues.length; index += 900) {
      await ds.query(`INSERT INTO attendance_punches (employeeCode, employeeId, punchTime, deviceSn, source) VALUES ${punchValues.slice(index, index + 900).join(',')}`)
    }
    // أيام حضور محسوبة مسبقًا (مثل الإنتاج: المزامنة الليلية حسبتها بالفعل)
    const dayValues = []
    for (const emp of saved) for (const date of workDates) {
      const lateMinutes = (emp.id + date.charCodeAt(9)) % 7 === 0 ? 17 : 0
      dayValues.push(`(${emp.id},${branch.id},'${date}','08:${String(lateMinutes).padStart(2, '0')}','16:05',N'وردية القياس','08:00','16:00',${shift.id},'weekly','present',${lateMinutes},0,0,0,${480 - lateMinutes})`)
    }
    for (let index = 0; index < dayValues.length; index += 700) {
      await ds.query(`INSERT INTO attendance_days (employeeId, branchId, date, checkIn, checkOut, shiftName, shiftStart, shiftEnd, shiftId, scheduleSource, status, lateMinutes, earlyLeaveMinutes, excusedMinutes, deductibleMinutes, workMinutes) VALUES ${dayValues.slice(index, index + 700).join(',')}`)
    }
    console.log(`تجهيز البيانات: ${((Date.now() - seedStarted) / 1000).toFixed(1)}s — ${saved.length} موظف، ${punchCount} بصمة، ${dayValues.length} يوم حضور`)

    const user = { sub: admin.id, email: admin.email, role: 'super_admin', branchId: null, employeeId: null, tokenVersion: 0, permissions: ['*'] }

    // ===== 1) الحساب الكامل (الوضع الحالي) =====
    collecting = true
    const fullStarted = Date.now()
    const run = await payrollService.calculateDefined(user, {
      period: PERIOD, scopeType: 'CUSTOM', employeeIds: saved.map(emp => emp.id), name: 'قياس الحساب الكامل',
    })
    const fullMs = Date.now() - fullStarted
    collecting = false
    console.log('')
    console.log('========== الحساب الكامل (قبل) ==========')
    console.log(`الزمن الكلي: ${(fullMs / 1000).toFixed(1)}s لـ${saved.length} موظف (${(fullMs / saved.length).toFixed(0)}ms/موظف)`)
    console.log(`عدد استعلامات SQL: ${stats.queries} (${(stats.queries / saved.length).toFixed(0)}/موظف) — زمن SQL: ${(stats.sqlMs / 1000).toFixed(1)}s`)
    console.log(`مجموع البنود: ${run.items?.length ?? 0}، الصافي: ${run.totalNet}`)
    console.log('')
    console.log('-- أين راح الوقت (دوال) --')
    for (const [name, row] of [...stats.phases].sort((a, b) => b[1].ms - a[1].ms)) {
      console.log(`  ${(row.ms / 1000).toFixed(1)}s  ×${row.count}  ${name}`)
    }
    console.log('')
    console.log('-- أكثر 15 جملة SQL (N+1) --')
    for (const [text, row] of [...stats.byShape].sort((a, b) => b[1].ms - a[1].ms).slice(0, 15)) {
      console.log(`  ${(row.ms / 1000).toFixed(2)}s  ×${row.count}  ${text}`)
    }

    // ===== 2) مسار التراكم اليومي (بعد) =====
    if (WITH_ACCRUAL) {
      const accrual = app.get(require(path.join(apiRoot, 'src/payroll/payroll-daily-accrual.service')).PayrollDailyAccrualService)
      stats.queries = 0; stats.sqlMs = 0; stats.byShape.clear(); stats.phases.clear()
      collecting = true
      const accrueStarted = Date.now()
      const accrued = await accrual.accrueRun(run.id, { upTo: endDate })
      const accrueMs = Date.now() - accrueStarted
      collecting = false
      console.log('')
      console.log('========== التراكم اليومي ==========')
      console.log(`تجميع ${accrued.days} يوم-موظف مسبقًا: ${(accrueMs / 1000).toFixed(1)}s (ليلًا، موزعة على ${periodDates.length} ليلة ≈ ${(accrueMs / periodDates.length / 1000).toFixed(1)}s/ليلة)`)

      stats.queries = 0; stats.sqlMs = 0; stats.byShape.clear(); stats.phases.clear()
      collecting = true
      const reuseStarted = Date.now()
      const warm = await payrollService.calculateDefined(user, { runId: run.id, period: PERIOD, scopeType: 'CUSTOM',
        employeeIds: saved.map(emp => emp.id), reason: 'قياس إعادة الحساب من التراكم' })
      const reuseMs = Date.now() - reuseStarted
      collecting = false
      console.log(`إقفال الشهر من التراكم: ${(reuseMs / 1000).toFixed(1)}s (${(reuseMs / saved.length).toFixed(0)}ms/موظف) — استعلامات: ${stats.queries}`)
      console.log(`التسريع: ×${(fullMs / reuseMs).toFixed(1)}`)
      // تحقق من التطابق: القياس بلا إثبات إن النتيجة واحدة ما ينفعش
      const print = detail => JSON.stringify([...detail.items].sort((a, b) => a.employeeId - b.employeeId)
        .map(({ id: _id, runId: _runId, ...columns }) => columns))
      console.log(print(warm) === print(run) && String(warm.totalNet) === String(run.totalNet)
        ? 'التطابق: كل البنود والصافي متطابقة بالحرف ✓'
        : 'تحذير: البنود مش متطابقة — راجع قبل أي نشر ✗')
    }
  } finally {
    try { if (app) await app.close() } catch (error) { console.error('إغلاق التطبيق:', error.message) }
    try {
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      console.log(found.recordset.length === 0 ? `تم حذف قاعدة القياس ${database}` : 'تحذير: قاعدة القياس لم تُحذف')
    } catch (error) { console.error('حذف قاعدة القياس:', error.message) }
    try { await master.close() } catch { /* مغلق بالفعل */ }
    try { fs.rmSync(uploads, { recursive: true, force: true }) } catch { /* لا شيء */ }
  }
}

main().then(() => process.exit(0), error => { console.error(error); process.exit(1) })

// Disposable local UI review. Never connects the application to the configured HR database.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const sql = require('../node_modules/mssql')
const database = `hr_preview_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'hr-preview-files-'))
const stateFile = path.join(__dirname, '.preview-state.json')
const stopFile = path.join(uploads, 'stop')
let app, master, created = false, stopping = false
async function stop() {
  if (stopping) return; stopping = true
  try {
    if (app) await app.close()
    if (created) {
      assert.match(database, /^hr_preview_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
    }
    if (master) await master.close()
    assert.equal(path.dirname(uploads), require('node:os').tmpdir()); assert.ok(path.basename(uploads).startsWith('hr-preview-files-'))
    fs.rmSync(uploads, { recursive: true, force: true })
    if (fs.existsSync(stateFile) && JSON.parse(fs.readFileSync(stateFile)).database === database) fs.unlinkSync(stateFile)
  } finally { process.exit() }
}
process.on('SIGINT', stop); process.on('SIGTERM', stop)
async function start() {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME || 'sa', password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true } }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', JWT_SECRET: crypto.randomBytes(48).toString('hex'), NODE_ENV: 'test', UPLOADS_ROOT: uploads })
  const { NestFactory } = require('../node_modules/@nestjs/core')
  const { ValidationPipe } = require('../node_modules/@nestjs/common')
  app = await NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api'); app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  app.enableCors({ origin: 'http://localhost:3001', credentials: true })
  await app.init()
  const ds = app.get(require('../node_modules/typeorm').DataSource)
  const repo = (name, file) => ds.getRepository(require(`../src/${file}`)[name])
  const branches = repo('Branch', 'org/entities/branch.entity')
  const branch = await branches.save({ code: 'PREVIEW', name: 'فرع الرياض — تجريبي', country: 'SA', weekendDays: 'FRI,SAT' })
  const employees = repo('Employee', 'employees/employee.entity')
  const manager = await employees.save({ employeeCode: 'DEMO001', fullName: 'سارة أحمد — حساب مراجعة', jobTitle: 'مديرة الموارد البشرية', branchId: branch.id,
    joinDate: '2020-01-01', basicSalary: 12000, status: 'active' })
  const employee = await employees.save({ employeeCode: 'DEMO002', fullName: 'أحمد محمد عبدالله — بيانات تجريبية', jobTitle: 'مهندس برمجيات', branchId: branch.id,
    managerEmployeeId: manager.id, joinDate: '2022-02-01', basicSalary: 8000, housingAllowance: 2000, transportAllowance: 500, phoneAllowance: 150, workNatureAllowance: 250, otherAllowance: 300,
    currency: 'SAR', contractType: 'fixed_term', contractStart: '2026-01-01', contractEnd: '2026-09-30', status: 'active' })
  const department = await repo('Department', 'org/entities/department.entity').save({ name: 'تقنية المعلومات', branchId: branch.id, managerEmployeeId: manager.id })
  const team = await repo('Team', 'org/entities/team.entity').save({ name: 'تطوير المنتجات', departmentId: department.id, leaderEmployeeId: manager.id })
  await employees.update(employee.id, { departmentId: department.id, teamId: team.id })
  const users = repo('User', 'auth/user.entity')
  const passwordHash = await require('../node_modules/bcryptjs').hash('Preview2026!Local', 10)
  const admin = await users.save({ email: 'admin@preview.invalid', displayName: 'سارة أحمد — مراجعة النظام', passwordHash, role: 'super_admin', employeeId: manager.id, branchId: branch.id })
  const user = await users.save({ email: 'employee@preview.invalid', displayName: employee.fullName, passwordHash, role: 'employee', employeeId: employee.id, branchId: branch.id })
  const config = repo('RequestsConfig', 'requests/entities/requests-config.entity')
  await config.save([{ key: 'company.name', value: 'شركة آفاق للتقنية — بيئة تجريبية' }, { key: 'company.name_en', value: 'AFAQ TECHNOLOGY | REVIEW ENVIRONMENT' },
    { key: 'company.address', value: 'الرياض — بيانات مخصصة لاختبار النظام' }])
  const { typesSeed, leaveTypesSeed } = require('../src/seed/requests-seed.data')
  const leaveRepo = repo('LeaveType', 'requests/entities/leave.entities')
  for (const l of leaveTypesSeed) if (!await leaveRepo.findOneBy({ code: l.code })) await leaveRepo.save(l)
  const chain = await repo('ApprovalChain', 'requests/entities/approval-chain.entity').save({ code: 'PREVIEW_HR', nameAr: 'اعتماد الموارد البشرية', isActive: true })
  await repo('ApprovalStep', 'requests/entities/approval-step.entity').save({ chainId: chain.id, stepOrder: 1, approverRole: 'hr', slaDays: 3 })
  const typeRepo = repo('RequestType', 'requests/entities/request-type.entity')
  for (const t of typesSeed) {
    await typeRepo.save({ code: t.code, nameAr: t.nameAr, category: t.category, destinationHandler: t.handler, approvalChainId: chain.id,
      requiredFields: JSON.stringify(t.requiredFields || []), autoGeneratesPdf: !!t.autoGeneratesPdf, affectsBalance: !!t.affectsBalance, isActive: true })
  }
  const requestRepo = repo('Request', 'requests/entities/request.entity')
  const completed = await requestRepo.save({ typeCode: 'LETTER_SALARY', requesterId: employee.id, createdByUserId: user.id, branchId: branch.id,
    status: 'APPROVED', payload: JSON.stringify({ purpose: 'تعريف بالراتب لغرض المراجعة التجريبية' }), submittedAt: new Date() })
  const result = await ds.transaction(em => app.get(require('../src/letters/letters.service').LettersService).generate(em, completed, { code: 'LETTER_SALARY' }, JSON.parse(completed.payload)))
  await requestRepo.update(completed.id, { status: 'COMPLETED', destinationRef: result.ref, completedAt: new Date() })
  const personal = await typeRepo.findOneBy({ code: 'PERSONAL_DATA_UPDATE' }) || await typeRepo.findOneBy({ destinationHandler: 'employee_record_auto' })
  const returned = await requestRepo.save({ typeCode: personal?.code || 'LETTER_EMPLOYMENT', requesterId: employee.id, createdByUserId: user.id, branchId: branch.id,
    status: 'RETURNED_FOR_INFO', payload: JSON.stringify({ phone: '0501234567', address: 'الرياض', note: 'تحديث بيانات التواصل' }), submittedAt: new Date(),
    resolvedSteps: JSON.stringify([{ stepOrder: 1, role: 'hr', action: 'RETURN', actedAt: new Date().toISOString() }]) })
  await repo('RequestApproval', 'requests/entities/request-approval.entity').save({ requestId: returned.id, step: 1, approverId: admin.id, action: 'RETURNED_FOR_INFO', comment: 'يرجى استكمال العنوان التفصيلي ومراجعة رقم الجوال قبل إعادة الإرسال.' })
  await requestRepo.save({ typeCode: 'LETTER_EMPLOYMENT', requesterId: employee.id, createdByUserId: user.id, branchId: branch.id, status: 'UNDER_REVIEW', currentStep: 1,
    payload: JSON.stringify({ purpose: 'إثبات جهة العمل — طلب تجريبي' }), submittedAt: new Date(), resolvedSteps: JSON.stringify([{ stepOrder: 1, role: 'hr', dueAt: '2026-09-14T12:00:00Z' }]) })
  const schedule = await repo('WorkSchedule', 'assets/assets.entities').save({ name: 'الدوام الرسمي', startTime: '08:00', endTime: '17:00', weekendDays: 'FRI,SAT', isActive: true })
  await employees.update(employee.id, { workScheduleId: schedule.id })
  await app.listen(4001, '127.0.0.1')
  fs.writeFileSync(stateFile, JSON.stringify({ database, uploads, pid: process.pid }))
  setInterval(() => { if (fs.existsSync(stopFile)) void stop() }, 1000)
  console.log(`PREVIEW_READY http://localhost:4001/api database=${database}; UI accounts admin@preview.invalid / employee@preview.invalid; local password Preview2026!Local`)
  console.log('Run node api/test/preview-stop.cjs to stop and clean up this disposable database.')
}
start().catch(async e => { console.error(e.message); await stop() })

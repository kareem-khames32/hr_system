// Uses an isolated SQL Server database; verifies the actual HTTP calendar and working-day engine.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs')
const crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_calendar_test_${crypto.randomBytes(8).toString('hex')}`
const secret = crypto.randomBytes(48).toString('hex')
let master, app, base, created = false, viewer, employee, annualLeave, halfLeave, otherEmployee
const { JwtService } = require('../node_modules/@nestjs/jwt')
const jwt = new JwtService({ secret })
async function request(user, query) {
  const token = jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId,
    employeeId: user.employeeId, tokenVersion: user.tokenVersion ?? 0, permissions: JSON.parse(user.permissions || '[]') })
  const response = await fetch(`${base}/calendar?${query}`, { headers: { Authorization: `Bearer ${token}` } })
  return { status: response.status, body: await response.json() }
}
before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME || 'sa', password: env.DB_PASSWORD, database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', JWT_SECRET: secret, NODE_ENV: 'test' })
  const { NestFactory } = require('../node_modules/@nestjs/core')
  app = await NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api'); await app.listen(0, '127.0.0.1')
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  const ds = app.get(require('../node_modules/typeorm').DataSource)
  const repo = (file, name) => ds.getRepository(require(`../src/${file}`)[name])
  const branches = repo('org/entities/branch.entity', 'Branch')
  const emps = repo('employees/employee.entity', 'Employee')
  const users = repo('auth/user.entity', 'User')
  const leaves = repo('requests/entities/leave.entities', 'Leave')
  const branch = await branches.save({ name: 'Calendar A', code: 'CAL_A', country: 'SA', weekendDays: 'FRI,SAT' })
  const otherBranch = await branches.save({ name: 'Calendar B', code: 'CAL_B', country: 'EG', weekendDays: 'THU,FRI' })
  const emp = await emps.save({ employeeCode: 'CAL001', fullName: 'Calendar employee', branchId: branch.id, joinDate: '2020-01-01', status: 'active' })
  const colleague = await emps.save({ employeeCode: 'CAL002', fullName: 'Calendar colleague', branchId: branch.id, joinDate: '2020-01-01', status: 'active' })
  otherEmployee = await emps.save({ employeeCode: 'CAL003', fullName: 'Other branch employee', branchId: otherBranch.id, joinDate: '2020-01-01', status: 'active' })
  const makeUser = (email, employeeId, permissions) => users.save({ email, role: 'employee', displayName: email, passwordHash: 'unused-in-token-test', branchId: branch.id, employeeId, permissions: JSON.stringify(permissions) })
  viewer = await makeUser('viewer@calendar.invalid', null, ['calendar.view_all'])
  employee = await makeUser('self@calendar.invalid', emp.id, [])
  await repo('assets/assets.entities', 'PublicHoliday').save({ name: 'Calendar regional holiday', date: '2026-12-30', country: 'SA' })
  annualLeave = await leaves.save({ employeeId: emp.id, leaveTypeCode: 'ANNUAL', fromDate: '2026-12-28', toDate: '2027-01-05', days: 6, status: 'APPROVED', period: 'FULL' })
  halfLeave = await leaves.save({ employeeId: colleague.id, leaveTypeCode: 'ANNUAL', fromDate: '2026-12-29', toDate: '2026-12-29', days: 0.5, status: 'APPROVED', period: 'MORNING' })
  await leaves.save({ employeeId: otherEmployee.id, leaveTypeCode: 'ANNUAL', fromDate: '2026-12-28', toDate: '2027-01-05', days: 7, status: 'APPROVED', period: 'FULL' })
  await leaves.save({ employeeId: emp.id, leaveTypeCode: 'ANNUAL', fromDate: '2026-12-27', toDate: '2026-12-27', days: 1, status: 'CANCELLED', period: 'FULL' })
}, { timeout: 60000 })
after(async () => {
  if (app) await app.close()
  if (created && master) {
    assert.match(database, /^hr_calendar_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
    await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
  }
  if (master) await master.close()
})
test('week crossing year uses employee working days and excludes the regional holiday, without attendance permission', async () => {
  const response = await request(viewer, 'month=2026-12&from=2026-12-27&to=2027-01-02')
  assert.equal(response.status, 200, JSON.stringify(response.body))
  assert.equal(response.body.leaves.find(l => l.id === annualLeave.id).daysInRange, 3)
  assert.equal(response.body.leaves.find(l => l.id === halfLeave.id).daysInRange, 0.5)
  assert.equal(response.body.leaves.length, 2)
  assert.ok(response.body.leaves.every(l => l.employeeId !== otherEmployee.id))
  assert.deepEqual(response.body.weekendDays, ['FRI', 'SAT'])
})
test('both boundary month queries return the same range count and preserve monthly totals for existing callers', async () => {
  const boundary = await request(viewer, 'month=2027-01&from=2026-12-27&to=2027-01-02')
  assert.equal(boundary.status, 200)
  assert.equal(boundary.body.leaves.find(l => l.id === annualLeave.id).daysInRange, 3)
  const monthly = await request(viewer, 'month=2027-01')
  assert.equal(monthly.body.leaves.find(l => l.id === annualLeave.id).daysInMonth, 3)
  assert.equal(monthly.body.leaves.find(l => l.id === annualLeave.id).daysInRange, 3)
})
test('self-service calendar cannot expose colleagues through a requested range', async () => {
  const response = await request(employee, 'month=2026-12&from=2026-12-27&to=2027-01-02')
  assert.equal(response.status, 200)
  assert.deepEqual(response.body.leaves.map(l => l.id), [annualLeave.id])
})
test('malformed, reversed, oversized or nonintersecting calendar ranges are rejected', async () => {
  for (const query of ['month=2026-13', 'month=2026-12&from=2026-12-01', 'month=2026-02&from=2026-02-30&to=2026-03-01', 'month=2026-12&from=2026-12-05&to=2026-12-01', 'month=2026-12&from=2026-10-01&to=2027-01-01', 'month=2026-12&from=2027-01-01&to=2027-01-07']) assert.equal((await request(viewer, query)).status, 400, query)
})

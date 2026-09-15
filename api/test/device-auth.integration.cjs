// SQL/HTTP + real loopback TCP fixture. No configured devices or original DB are used.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path'), fs = require('node:fs'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const { terminal } = require('./fixtures/zk-terminal.cjs')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_recovery_test_${crypto.randomBytes(8).toString('hex')}`
const secret = crypto.randomBytes(48).toString('hex')
let master, app, ds, base, created = false, admin, hr, branch, otherBranch, devices, punches
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
async function request(user, method, url, body) {
  const token = jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null,
    employeeId: null, tokenVersion: user.tokenVersion ?? 0, permissions: JSON.parse(user.permissions || '[]') })
  const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  return { status: response.status, body: await response.json() }
}
before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433),
    user: env.DB_USERNAME || 'sa', password: env.DB_PASSWORD, database: 'master',
    options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', JWT_SECRET: secret, NODE_ENV: 'test' })
  const { NestFactory } = require('../node_modules/@nestjs/core')
  const { ValidationPipe } = require('../node_modules/@nestjs/common')
  app = await NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api'); app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  ds = app.get(require('../node_modules/typeorm').DataSource)
  const branches = ds.getRepository(require('../src/org/entities/branch.entity').Branch)
  // weekendDays=null = إعداد النظام؛ النص الفارغ يرفضه فحص لقطة التقويم كما يرفضه API الفروع
  branch = await branches.save({ name: 'Device test A', code: 'DEV_A', weekendDays: null })
  otherBranch = await branches.save({ name: 'Device test B', code: 'DEV_B', weekendDays: null })
  const users = ds.getRepository(require('../src/auth/user.entity').User)
  admin = await users.save({ email: 'device-admin@test.invalid', displayName: 'Admin', role: 'super_admin', permissions: '["*"]', passwordHash: 'unused' })
  hr = await users.save({ email: 'device-hr@test.invalid', displayName: 'HR', role: 'hr_manager', branchId: branch.id,
    permissions: '["settings.manage","attendance.sync"]', passwordHash: 'unused' })
  devices = ds.getRepository(require('../src/assets/assets.entities').BiometricDevice)
  punches = ds.getRepository(require('../src/attendance/attendance.entities').AttendancePunch)
  await ds.getRepository(require('../src/employees/employee.entity').Employee).save({ employeeCode: '0001',
    fingerprintCode: '0001', fullName: 'Device test employee', branchId: branch.id, joinDate: '2020-01-01', status: 'active' })
}, { timeout: 60000 })
after(async () => {
  if (app) await app.close()
  if (created && master) {
    assert.match(database, /^hr_recovery_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
    await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
  }
  if (master) await master.close()
})
const storedKey = async (id) => (await devices.createQueryBuilder('d').addSelect('d.authKey').where('d.id = :id', { id }).getOne()).authKey
let serial = 0
async function createDevice(extra = {}, actor = admin) {
  const result = await request(actor, 'POST', '/catalogs/devices', { name: 'Fixture terminal',
    serialNumber: `AUTH_TEST_${++serial}`, branchId: branch.id, ...extra })
  assert.equal(result.status, 201, JSON.stringify(result.body))
  return result.body
}
function noSecret(body, secret = '123456') {
  assert.ok(!JSON.stringify(body).includes(secret), 'plaintext key excluded')
  assert.ok(!JSON.stringify(body).includes('"authKey"'), 'authKey property excluded')
}

test('ATT24 catalog validates range, masks all responses, and preserves/replaces/clears Comm Key', async () => {
  const count = await devices.count()
  for (const authKey of ['private-key', '-1', '1000000', '1e5', '12 34', true]) {
    const response = await request(admin, 'POST', '/catalogs/devices', { name: 'Invalid terminal',
      serialNumber: 'INVALID_AUTH', branchId: branch.id, authKey })
    assert.equal(response.status, 400); noSecret(response.body, String(authKey))
  }
  assert.equal(await devices.count(), count)
  const device = await createDevice({ authKey: '123456' })
  noSecret(device); assert.equal(device.hasAuthKey, true)
  assert.equal((await devices.findOneBy({ id: device.id })).authKey, undefined, 'select:false retained')
  assert.equal(await storedKey(device.id), '123456')
  const listed = await request(hr, 'GET', '/catalogs/devices')
  noSecret(listed.body); assert.equal(listed.body.find((d) => d.id === device.id).hasAuthKey, true)
  for (const body of [{ name: 'Renamed device' }, { authKey: '' }]) {
    const update = await request(hr, 'PATCH', `/catalogs/devices/${device.id}`, body)
    assert.equal(update.status, 200); noSecret(update.body); assert.equal(update.body.hasAuthKey, true)
    assert.equal(await storedKey(device.id), '123456')
  }
  assert.equal((await request(hr, 'PATCH', `/catalogs/devices/${device.id}`, { authKey: '1.5' })).status, 400)
  assert.equal(await storedKey(device.id), '123456')
  const replacement = await request(hr, 'PATCH', `/catalogs/devices/${device.id}`, { authKey: '000987' })
  assert.equal(replacement.body.hasAuthKey, true); noSecret(replacement.body, '987')
  assert.equal(await storedKey(device.id), '987')
  for (const authKey of [null, '0']) {
    await request(hr, 'PATCH', `/catalogs/devices/${device.id}`, { authKey: '123456' })
    const cleared = await request(hr, 'PATCH', `/catalogs/devices/${device.id}`, { authKey })
    assert.equal(cleared.body.hasAuthKey, false); assert.equal(await storedKey(device.id), null)
  }
})

test('ATT24 HTTP sync authenticates, ingests actual decoded records, deduplicates and persists safe status', async () => {
  const fixture = await terminal({ fragment: true })
  try {
    const device = await createDevice({ ip: '127.0.0.1', port: fixture.port, authKey: '123456' })
    const response = await request(hr, 'POST', `/attendance/devices/${device.id}/sync`)
    assert.equal(response.status, 201); assert.equal(response.body.ok, true, JSON.stringify(response.body))
    assert.equal(response.body.pulled, 1); assert.equal(response.body.inserted, 1); assert.equal(response.body.matched, 1)
    noSecret(response.body)
    const stored = await devices.findOneBy({ id: device.id })
    assert.match(stored.lastStatus, /^OK/); assert.ok(stored.lastSyncAt)
    assert.equal(await storedKey(device.id), '123456', 'sync status write does not replace the key')
    assert.equal(await punches.countBy({ deviceSn: device.serialNumber }), 1)
    const again = await request(hr, 'POST', `/attendance/devices/${device.id}/sync`)
    assert.equal(again.body.ok, true); assert.equal(again.body.inserted, 0)
    assert.equal(await punches.countBy({ deviceSn: device.serialNumber }), 1)
    await devices.update(device.id, { isActive: false })
  } finally { await fixture.stop() }
})

test('ATT24 rejected authentication persists failure without ingesting, returning or logging a secret', async () => {
  const fixture = await terminal()
  const service = app.get(require('../src/attendance/device-sync.service').DeviceSyncService)
  const warnings = [], originalWarn = service.logger.warn
  service.logger.warn = (message) => warnings.push(message)
  try {
    const device = await createDevice({ ip: '127.0.0.1', port: fixture.port, authKey: '654321' })
    const result = await request(hr, 'POST', `/attendance/devices/${device.id}/sync`)
    assert.equal(result.body.ok, false); assert.equal(result.body.pulled, 0)
    assert.match(result.body.error, /رفض الجهاز مفتاح الاتصال/); noSecret(result.body, '654321')
    assert.equal(await punches.countBy({ deviceSn: device.serialNumber }), 0)
    assert.ok(!JSON.stringify(warnings).includes('654321'))
    assert.ok(!(await devices.findOneBy({ id: device.id })).lastStatus.includes('654321'))
    await devices.update(device.id, { isActive: false })
  } finally { service.logger.warn = originalWarn; await fixture.stop() }
})

test('ATT24 catalog and sync routes enforce branch scope before opening a TCP socket', async () => {
  const fixture = await terminal()
  try {
    const foreign = await createDevice({ branchId: otherBranch.id, ip: '127.0.0.1', port: fixture.port, authKey: '123456' })
    const list = await request(hr, 'GET', '/catalogs/devices')
    assert.ok(!list.body.some((d) => d.id === foreign.id))
    assert.equal((await request(hr, 'PATCH', `/catalogs/devices/${foreign.id}`, { authKey: null })).status, 404)
    assert.equal((await request(hr, 'POST', `/attendance/devices/${foreign.id}/sync`)).status, 404)
    const all = await request(hr, 'POST', '/attendance/devices/sync-all')
    assert.equal(all.status, 201); assert.ok(!all.body.some((d) => d.deviceId === foreign.id))
    assert.equal(fixture.connections, 0, 'no connection to out-of-scope device')
  } finally { await fixture.stop() }
})

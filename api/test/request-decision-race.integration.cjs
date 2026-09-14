// Deterministic HTTP/SQL regression for opposing decisions on one letter request.
// The renderer is paused at its boundary; the real PDF content is covered by recovery.integration.cjs.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_decision_race_${crypto.randomBytes(8).toString('hex')}`
const secret = crypto.randomBytes(48).toString('hex')
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-decision-race-'))
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let master, app, ds, base, service, renderer, created = false, approver, opponent, employee, branch, type
const repos = {}
const PDF_BYTES = Buffer.from('%PDF-1.4\nDeterministic decision race fixture\n')
function deferred() { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }
async function deadline(promise, message) {
  let timer
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), 12000) })]) }
  finally { clearTimeout(timer) }
}
function auth(user) { return jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: null, employeeId: null, tokenVersion: user.tokenVersion ?? 0, permissions: ['*'] }) }
async function decide(user, requestId, action, extra = {}) {
  const response = await fetch(`${base}/requests/${requestId}/${action === 'CANCEL' ? 'cancel' : 'act'}`, {
    method: 'POST', headers: { Authorization: `Bearer ${auth(user)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(action === 'CANCEL' ? {} : { action, comment: `Controlled concurrent ${action}`, ...extra }),
  })
  return { status: response.status, body: await response.json() }
}
async function makeRequest() {
  return repos.Request.save({ typeCode: type.code, requesterId: employee.id, branchId: branch.id, status: 'UNDER_REVIEW', currentStep: 1,
    resolvedSteps: JSON.stringify([{ stepOrder: 1, role: 'hr', actedAt: null }]), payload: '{}' })
}
async function isBlockedBy(sessionId) {
  const result = await master.request().input('blocker', sql.Int, sessionId).query('SELECT COUNT(*) AS total FROM sys.dm_exec_requests WHERE blocking_session_id = @blocker AND wait_type LIKE \'LCK%\'')
  return result.recordset[0].total > 0
}
before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql', 'This suite verifies SQL Server row locks')
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME || 'sa', password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', JWT_SECRET: secret, NODE_ENV: 'test', UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1'); base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  ds = app.get(require('../node_modules/typeorm').DataSource)
  const files = { User: 'auth/user.entity', Branch: 'org/entities/branch.entity', Employee: 'employees/employee.entity', Request: 'requests/entities/request.entity',
    RequestType: 'requests/entities/request-type.entity', RequestApproval: 'requests/entities/request-approval.entity', LetterRequest: 'requests/entities/letter.entities', StoredFile: 'files/stored-file.entity', RequestsConfig: 'requests/entities/requests-config.entity' }
  for (const [name, file] of Object.entries(files)) repos[name] = ds.getRepository(require(`../src/${file}`)[name])
  branch = await repos.Branch.save({ name: 'Decision race branch', code: 'DECISION_RACE', weekendDays: 'FRI,SAT' })
  employee = await repos.Employee.save({ employeeCode: 'DECISION_RACE', fullName: 'Decision race employee', branchId: branch.id, jobTitle: 'Tester', joinDate: '2020-01-01', status: 'active' })
  const makeUser = email => repos.User.save({ email, displayName: email, passwordHash: 'unused-in-token-tests', role: 'super_admin', permissions: '[]' })
  approver = await makeUser('approve@decision.invalid'); opponent = await makeUser('opponent@decision.invalid')
  await repos.RequestsConfig.save({ key: 'company.name', value: 'Decision test company' })
  type = await repos.RequestType.save({ code: 'LETTER_DECISION_RACE', nameAr: 'خطاب اختبار التزامن', category: 'letters', destinationHandler: 'letter_pdf_generator', isActive: true })
  const templates = app.get(require('../src/letters/letter-templates.service').LetterTemplatesService)
  await templates.bind(type.code, (await templates.catalog()).templates[0].id)
  service = app.get(require('../src/requests/requests.service').RequestsService)
  renderer = app.get(require('../src/letters/letter-renderer.service').LetterRenderer)
}, { timeout: 60000 })
after(async () => {
  if (app) await app.close()
  if (created && master) {
    assert.match(database, /^hr_decision_race_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
    await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
  }
  if (master) await master.close()
  const target = path.resolve(uploads)
  assert.equal(path.dirname(target), path.resolve(os.tmpdir())); assert.ok(path.basename(target).startsWith('hr-decision-race-'))
  fs.rmSync(target, { recursive: true, force: true })
})

for (const action of ['REJECT', 'RETURN', 'CANCEL']) {
  test(`approval holding the request lock wins against ${action}; COMPLETED, audit and issued PDF stay consistent`, async () => {
    const req = await makeRequest(), renderEntered = deferred(), releaseRender = deferred(), otherReadStarted = deferred()
    const helper = action === 'CANCEL' ? 'owned' : 'scoped'
    const originalRead = service[helper], originalRender = renderer.pdf
    let approval, other
    service[helper] = function(...args) {
      const result = originalRead.apply(this, args)
      if (args[0].sub === opponent.id && args[1] === req.id) otherReadStarted.resolve()
      return result
    }
    renderer.pdf = async () => { renderEntered.resolve(); await releaseRender.promise; return PDF_BYTES }
    try {
      approval = decide(approver, req.id, 'APPROVE')
      await deadline(renderEntered.promise, 'Approval never reached the gated renderer')
      other = decide(opponent, req.id, action)
      await deadline(otherReadStarted.promise, 'Opposing request never attempted its guarded read')
      releaseRender.resolve()
      const [approved, declined] = await deadline(Promise.all([approval, other]), 'Concurrent decisions did not complete')
      assert.equal(approved.status, 201, JSON.stringify(approved.body)); assert.equal(approved.body.status, 'COMPLETED')
      assert.equal(declined.status, 400, JSON.stringify(declined.body))
      assert.equal((await repos.Request.findOneByOrFail({ id: req.id })).status, 'COMPLETED')
      assert.deepEqual((await repos.RequestApproval.findBy({ requestId: req.id })).map(row => row.action), ['APPROVED'])
      const letters = await repos.LetterRequest.findBy({ requestId: req.id }); assert.equal(letters.length, 1)
      const file = await repos.StoredFile.findOneByOrFail({ id: Number(letters[0].generatedPdfRef.slice(5)) })
      assert.deepEqual(fs.readFileSync(require('../src/files/storage').storedPath(file.storedName)), PDF_BYTES)
    } finally {
      releaseRender.resolve(); await Promise.allSettled([approval, other].filter(Boolean)); service[helper] = originalRead; renderer.pdf = originalRender
    }
  }, { timeout: 30000 })

  test(`${action} that read the request first holds its lock; a later approval cannot issue a PDF from stale state`, async () => {
    const req = await makeRequest(), otherHasRead = deferred(), releaseOther = deferred(), releaseRender = deferred()
    const helper = action === 'CANCEL' ? 'owned' : 'scoped'
    const originalRead = service[helper], originalRender = renderer.pdf
    let blockingSession = null, renderCalls = 0, other, approval
    service[helper] = async function(...args) {
      const result = await originalRead.apply(this, args)
      if (args[0].sub === opponent.id && args[1] === req.id) {
        // Capture the actual transaction connection, then stop after its locked read.
        // Before the fix there is no transaction: approval reaches renderer while this stale copy is paused.
        if (args[2]?.queryRunner?.isTransactionActive) blockingSession = Number((await args[2].query('SELECT @@SPID AS spid'))[0].spid)
        otherHasRead.resolve(); await releaseOther.promise
      }
      return result
    }
    renderer.pdf = async () => { renderCalls++; await releaseRender.promise; return PDF_BYTES }
    try {
      other = decide(opponent, req.id, action)
      await deadline(otherHasRead.promise, 'First decision did not reach its gated read')
      approval = decide(approver, req.id, 'APPROVE')
      // Wait for observed SQL blocking, or the old failure where rendering begins too early.
      // This is a controlled database wait, not a race between two randomly scheduled HTTP calls.
      await deadline((async () => { while (renderCalls === 0) { if (blockingSession && await isBlockedBy(blockingSession)) return; await new Promise(done => setTimeout(done, 20)) } })(), 'Second decision neither blocked nor reached renderer')
      const prematureRender = renderCalls > 0
      releaseOther.resolve(); releaseRender.resolve()
      const [declined, approved] = await deadline(Promise.all([other, approval]), 'Ordered decisions did not complete')
      assert.equal(prematureRender, false, 'Approval entered renderer while the earlier decision held its read: stale request state can overwrite issuance')
      assert.equal(declined.status, 201, JSON.stringify(declined.body)); assert.equal(approved.status, 400, JSON.stringify(approved.body))
      assert.equal((await repos.Request.findOneByOrFail({ id: req.id })).status, { REJECT: 'REJECTED', RETURN: 'RETURNED_FOR_INFO', CANCEL: 'CANCELLED' }[action])
      assert.equal(await repos.LetterRequest.countBy({ requestId: req.id }), 0)
      assert.equal(await repos.StoredFile.countBy({ entityType: 'letter', entityId: req.id }), 0)
      const audit = await repos.RequestApproval.findBy({ requestId: req.id })
      assert.ok(audit.every(row => row.action !== 'APPROVED'))
      if (action === 'CANCEL') assert.ok(audit.length <= 1 && audit.every(row => row.action === 'CANCELLED'))
      else assert.equal(audit.length, 1)
    } finally {
      releaseOther.resolve(); releaseRender.resolve(); await Promise.allSettled([other, approval].filter(Boolean)); service[helper] = originalRead; renderer.pdf = originalRender
    }
  }, { timeout: 30000 })
}

for (const action of ['REJECT', 'RETURN']) test(`${action} requires a meaningful reason and stores the trimmed comment only`, async () => {
  const req = await makeRequest()
  for (const comment of [undefined, '  \n\t ']) {
    const rejected = await decide(opponent, req.id, action, { comment })
    assert.equal(rejected.status, 400, JSON.stringify(rejected.body))
    assert.equal((await repos.Request.findOneByOrFail({ id: req.id })).status, 'UNDER_REVIEW')
    assert.equal(await repos.RequestApproval.countBy({ requestId: req.id }), 0)
    assert.equal(await repos.LetterRequest.countBy({ requestId: req.id }), 0)
  }
  const result = await decide(opponent, req.id, action, { comment: '  سبب واضح للمراجعة  ' })
  assert.equal(result.status, 201, JSON.stringify(result.body))
  const audit = await repos.RequestApproval.findBy({ requestId: req.id })
  assert.equal(audit.length, 1); assert.equal(audit[0].comment, 'سبب واضح للمراجعة')
})

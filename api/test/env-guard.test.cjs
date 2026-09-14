// Run: node --test --test-concurrency=1 api/test/env-guard.test.cjs
// حارس الإقلاع: لا مزامنة تلقائية إلا لقاعدة اختبار مؤقتة، ولا أسرار JWT منشورة خارج test.
// اختبار الإقلاع الحقيقي يوجّه الاتصال لمنفذ مغلق (127.0.0.1:1) فلا يمكن أن يلمس hr_system حتى لو فشل الحارس.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const crypto = require('node:crypto')
const { spawn } = require('node:child_process')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
const { validateEnv, isDisposableTestDatabase, isKnownPlaceholderSecret } = require('../src/auth/jwt-secret')

const secret = crypto.randomBytes(48).toString('hex')
const EXAMPLE_SECRET = 'change-this-to-a-long-random-secret-in-production'

test('synchronize is refused for the company database and any non-disposable name, in every environment', () => {
  for (const NODE_ENV of ['development', 'test', undefined]) {
    assert.throws(() => validateEnv({ NODE_ENV, JWT_SECRET: secret, DB_SYNCHRONIZE: 'true', DB_DATABASE: 'hr_system' }), /DB_SYNCHRONIZE=true مرفوض على قاعدة البيانات "hr_system"/)
    // غياب DB_DATABASE = الافتراضي hr_system في app.module
    assert.throws(() => validateEnv({ NODE_ENV, JWT_SECRET: secret, DB_SYNCHRONIZE: 'true' }), /"hr_system"/)
    assert.throws(() => validateEnv({ NODE_ENV, JWT_SECRET: secret, DB_SYNCHRONIZE: ' TRUE ', DB_DATABASE: 'hr_system' }), /DB_SYNCHRONIZE/)
    for (const name of ['hr_review_pre_payroll_20260911162404_52ee65ac', 'hr_migrate_rehearsal_20260914120000_0a1b2c3d', 'payroll', 'hr_test_0123456789abcdef', 'hr_x_test_0123'])
      assert.throws(() => validateEnv({ NODE_ENV, JWT_SECRET: secret, DB_SYNCHRONIZE: 'true', DB_DATABASE: name }), /DB_SYNCHRONIZE/, name)
  }
  assert.throws(() => validateEnv({ NODE_ENV: 'production', JWT_SECRET: secret, DB_SYNCHRONIZE: 'true', DB_DATABASE: 'hr_integrity_test_0123456789abcdef' }), /الإنتاج/)
  for (const name of ['hr_integrity_test_0123456789abcdef', 'hr_payroll_policy_definitions_test_fedcba9876543210', 'hr_decision_race_0123456789abcdef']) {
    assert.equal(isDisposableTestDatabase(name), true, name)
    assert.equal(validateEnv({ NODE_ENV: 'test', JWT_SECRET: secret, DB_SYNCHRONIZE: 'true', DB_DATABASE: name }).DB_DATABASE, name)
  }
  assert.equal(validateEnv({ NODE_ENV: 'development', JWT_SECRET: secret, DB_SYNCHRONIZE: 'false', DB_DATABASE: 'hr_system' }).DB_SYNCHRONIZE, 'false')
})

test('known placeholder secrets are refused outside test and only warned about inside test', () => {
  for (const NODE_ENV of ['development', 'production', 'staging', undefined]) {
    assert.throws(() => validateEnv({ NODE_ENV, JWT_SECRET: EXAMPLE_SECRET, DB_SYNCHRONIZE: 'false' }), /JWT_SECRET/)
    assert.throws(() => validateEnv({ NODE_ENV, JWT_SECRET: 'replace-me-with-a-strong-secret-before-going-live-now', DB_SYNCHRONIZE: 'false' }), /JWT_SECRET/)
  }
  assert.equal(isKnownPlaceholderSecret(secret), false)
  assert.equal(isKnownPlaceholderSecret(EXAMPLE_SECRET), true)
  const warn = console.warn
  const warnings = []
  console.warn = message => warnings.push(String(message))
  try { assert.equal(validateEnv({ NODE_ENV: 'test', JWT_SECRET: EXAMPLE_SECRET, DB_SYNCHRONIZE: 'false' }).JWT_SECRET, EXAMPLE_SECRET) } finally { console.warn = warn }
  assert.equal(warnings.length, 1)
})

test('real bootstrap with DB_SYNCHRONIZE=true and DB_DATABASE=hr_system exits with a clear message before TypeORM connects', async () => {
  const child = spawn(process.execPath, ['-r', 'ts-node/register/transpile-only', 'src/main.ts'], {
    cwd: apiRoot,
    env: { ...process.env, NODE_ENV: 'development', DB_SYNCHRONIZE: 'true', DB_DATABASE: 'hr_system', DB_HOST: '127.0.0.1', DB_PORT: '1',
      JWT_SECRET: secret, PORT: '0', TS_NODE_PROJECT: path.join(apiRoot, 'tsconfig.json') },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  child.stdout.on('data', chunk => { output += chunk })
  child.stderr.on('data', chunk => { output += chunk })
  const code = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error('bootstrap did not stop within 90s:\n' + output.slice(-2000))) }, 90000)
    child.on('exit', exitCode => { clearTimeout(timer); resolve(exitCode) })
  })
  assert.notEqual(code, 0, output.slice(-2000))
  assert.match(output, /DB_SYNCHRONIZE=true مرفوض على قاعدة البيانات "hr_system"/)
  assert.doesNotMatch(output, /TypeOrmModule|Unable to connect to the database|HR API running/)
})

// ---------- البذر والتصفير: كانا يتجاوزان validateEnv بـDataSource خاص (synchronize: true / DELETE) ----------
const { seedPreflight, seedSchemaDecision, SEED_FRESH_INSTALL_FLAG } = require('../src/seed/seed-guard')

test('seed and reset refuse the company database before connecting; seed syncs only disposable or empty fresh-install databases', () => {
  for (const database of ['hr_system', undefined, '', 'hr_review_pre_payroll_20260911162404_52ee65ac', 'payroll']) {
    assert.throws(() => seedPreflight(database, [], 'seed'), /البذر مرفوض/, String(database))
    assert.throws(() => seedPreflight(database, [SEED_FRESH_INSTALL_FLAG], 'reset'), /التصفير مرفوض/, String(database))
  }
  assert.throws(() => seedPreflight('hr_system; DROP', [], 'seed'), /غير صالح/)
  const disposable = seedPreflight('hr_seed_test_0123456789abcdef', [], 'seed')
  assert.deepEqual(disposable, { database: 'hr_seed_test_0123456789abcdef', disposable: true, freshInstall: false })
  assert.equal(seedSchemaDecision(disposable, { exists: true, userTables: 90 }).synchronize, true)
  assert.equal(seedPreflight('hr_seed_test_0123456789abcdef', [], 'reset').disposable, true)
  const fresh = seedPreflight('hr_newcompany', [SEED_FRESH_INSTALL_FLAG], 'seed')
  assert.equal(seedSchemaDecision(fresh, { exists: false, userTables: 0 }).synchronize, true)
  assert.equal(seedSchemaDecision(fresh, { exists: true, userTables: 0 }).synchronize, true)
  assert.throws(() => seedSchemaDecision(fresh, { exists: true, userTables: 1 }), /فيها 1 جدول/)
  assert.throws(() => seedSchemaDecision(seedPreflight('hr_system', [SEED_FRESH_INSTALL_FLAG], 'seed'), { exists: true, userTables: 88 }), /لقاعدة جديدة أو فارغة فقط/)
})

async function runScript(script, extraEnv, args = []) {
  const child = spawn(process.execPath, ['-r', 'ts-node/register/transpile-only', script, ...args], {
    cwd: apiRoot,
    env: { ...process.env, NODE_ENV: 'development', DB_HOST: '127.0.0.1', DB_PORT: '1', TS_NODE_PROJECT: path.join(apiRoot, 'tsconfig.json'), ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  child.stdout.on('data', chunk => { output += chunk })
  child.stderr.on('data', chunk => { output += chunk })
  const code = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error(`${script} did not stop within 90s:\n` + output.slice(-2000))) }, 90000)
    child.on('exit', exitCode => { clearTimeout(timer); resolve(exitCode) })
  })
  return { code, output }
}

test('npm run seed / reset against hr_system exit non-zero with the Arabic refusal before any database connection', async () => {
  const seed = await runScript('src/seed/seed.ts', { DB_DATABASE: 'hr_system' })
  assert.notEqual(seed.code, 0, seed.output.slice(-2000))
  assert.match(seed.output, /البذر مرفوض على قاعدة البيانات "hr_system"/)
  assert.doesNotMatch(seed.output, /القاعدة hr_system جاهزة|اتصال قاعدة البيانات ناجح|Failed to connect|ECONNREFUSED/)
  const reset = await runScript('src/seed/reset.ts', { DB_DATABASE: 'hr_system' }, [SEED_FRESH_INSTALL_FLAG])
  assert.notEqual(reset.code, 0, reset.output.slice(-2000))
  assert.match(reset.output, /التصفير مرفوض على قاعدة البيانات "hr_system"/)
  assert.doesNotMatch(reset.output, /الاتصال ناجح|ECONNREFUSED/)
  // --fresh-install يتجاوز الفحص النصي فقط: يصل لفحص القاعدة (المنفذ مغلق هنا فيفشل بالاتصال، لا بالمزامنة)
  const fresh = await runScript('src/seed/seed.ts', { DB_DATABASE: 'hr_system' }, [SEED_FRESH_INSTALL_FLAG])
  assert.notEqual(fresh.code, 0)
  assert.doesNotMatch(fresh.output, /اتصال قاعدة البيانات ناجح|البذر اكتمل/)
})

test('the device key seed is not a published value (empty = reception stopped until a strong key is set)', () => {
  const { configSeed } = require('../src/seed/requests-seed.data')
  const { deviceKeyWeakness, DEVICE_KEY_PLACEHOLDER } = require('../src/attendance/device-key')
  const seeded = configSeed.find(row => row.key === 'attendance.device_key')
  assert.ok(seeded)
  assert.equal(seeded.value, '')
  assert.notEqual(seeded.value, DEVICE_KEY_PLACEHOLDER)
  assert.match(deviceKeyWeakness(seeded.value), /غير مضبوط/)
})

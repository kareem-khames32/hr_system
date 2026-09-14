'use strict'
// وضع الفحص هو الافتراضي. إضافة الإعدادات لا تغير القيم القائمة أو سلاسل الاعتماد أو الطلبات الجارية.
const { fs, path, sql, apiRoot, pool } = require('./migrations-lib.cjs')
const { assertTarget, digest } = require('./payroll-migrations.cjs')
const { configSeed, chainsSeed } = require('../src/seed/requests-seed.data')

const root = path.resolve(apiRoot, '..')
const migrationVersion = '20260913_005_overtime_workflow'
const desiredChainCode = 'CHAIN_OVERTIME_MANAGER_DEPT_HR'
const overtimeConfigs = () => {
  const rows = configSeed.filter(row => row.key.startsWith('overtime.'))
  if (new Set(rows.map(row => row.key)).size !== rows.length || rows.some(row => typeof row.value !== 'string')) throw new Error('بذرة إعدادات الإضافي غير صالحة')
  return rows
}
function manifestOfReview() {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'docs/prepayrollmigration/review-database.json'), 'utf8'))
  assertTarget(manifest, manifest.database)
  return manifest
}
async function verifyConnection(connection, manifest) {
  const database = (await connection.request().query('SELECT DB_NAME() AS databaseName')).recordset[0]?.databaseName
  assertTarget(manifest, database)
}

async function inspect(connection) {
  const config = (await connection.request().query("SELECT [key],[value] FROM dbo.requests_config WHERE [key] LIKE N'overtime.%' ORDER BY [key]")).recordset
  const definitions = (await connection.request().query("SELECT id,code,nameAr,isActive,destinationHandler,approvalChainId,requiredFields FROM dbo.request_types WHERE code IN ('OVERTIME','OVERTIME_AUTO') ORDER BY code")).recordset
  const chainSelection = `SELECT DISTINCT c.id FROM dbo.approval_chains c
    WHERE c.requestTypeCode IN ('OVERTIME','OVERTIME_AUTO')
      OR c.code IN ('CH_OVERTIME','CH_OVERTIME_AUTO','CHAIN_MANAGER','CHAIN_OVERTIME_MANAGER_DEPT_HR')
      OR c.code IN (SELECT linked.code FROM dbo.request_types t JOIN dbo.approval_chains linked ON linked.id=t.approvalChainId WHERE t.code IN ('OVERTIME','OVERTIME_AUTO'))`
  const chains = (await connection.request().query(`SELECT id,code,nameAr,branchId,isActive,requestTypeCode,autoApprove FROM dbo.approval_chains WHERE id IN (${chainSelection}) ORDER BY code,branchId,id`)).recordset
  const steps = (await connection.request().query(`SELECT id,chainId,stepOrder,approverRole,specificEmployeeId,isParallel,thresholdField,thresholdOp,thresholdValue,slaDays,escalateTo,canDelegate FROM dbo.approval_steps WHERE chainId IN (${chainSelection}) ORDER BY chainId,stepOrder,id`)).recordset
  const requests = (await connection.request().query("SELECT typeCode,status,COUNT(*) AS count FROM dbo.requests WHERE typeCode IN ('OVERTIME','OVERTIME_AUTO') GROUP BY typeCode,status ORDER BY typeCode,status")).recordset
  const current = new Map(config.map(row => [row.key, row.value]))
  const chainSeed = chainsSeed.find(row => row.code === desiredChainCode)
  if (!chainSeed) throw new Error('تعريف سلسلة الإضافي الجديدة غير موجود في البذرة')
  return {
    configurations: overtimeConfigs().map(row => ({ key: row.key, exists: current.has(row.key), currentValue: current.get(row.key) ?? null,
      seedValue: row.value, action: current.has(row.key) ? 'PRESERVE' : 'INSERT_MISSING' })),
    additionalExistingKeys: config.filter(row => !overtimeConfigs().some(seed => seed.key === row.key)),
    definitions,
    chains: chains.map(chain => ({ ...chain, steps: steps.filter(step => step.chainId === chain.id) })),
    requestCounts: requests,
    proposedChain: { ...chainSeed, branchId: null, isActive: true, autoApprove: false },
    chainMutationEnabled: false,
    chainReview: definitions.map(definition => {
      const linked = chains.find(chain => chain.id === definition.approvalChainId)
      const linkedSteps = steps.filter(step => step.chainId === linked?.id)
      const overrides = linked ? chains.filter(chain => chain.code === linked.code && chain.branchId != null) : []
      const manager = chainsSeed.find(row => row.code === 'CHAIN_MANAGER')
      const match = !!linked && linked.code === manager?.code && linked.nameAr === manager.nameAr && linked.branchId == null &&
        linked.isActive === true && linked.autoApprove === false && linked.requestTypeCode == null && linkedSteps.length === 1 &&
        linkedSteps[0].stepOrder === 1 && linkedSteps[0].approverRole === manager.steps[0].role && linkedSteps[0].specificEmployeeId == null &&
        linkedSteps[0].isParallel === false && linkedSteps[0].thresholdField == null && linkedSteps[0].thresholdOp == null &&
        linkedSteps[0].thresholdValue == null && linkedSteps[0].slaDays === manager.steps[0].slaDays &&
        linkedSteps[0].escalateTo === manager.steps[0].escalateTo && linkedSteps[0].canDelegate === true && overrides.length === 0
      return { typeCode: definition.code, linkedChainId: linked?.id ?? null, branchOverrideIds: overrides.map(row => row.id),
        matchesKnownBuiltInManagerShape: match,
        proposal: match ? 'REVIEW_EXACT_BUILT_IN_MATCH_BEFORE_REBIND' : 'KEEP_EXISTING_CHAIN_REVIEW_REQUIRED',
        note: 'تطابق الشكل لا يثبت وحده أن المالك لم يعدله؛ لا تغيير ربط دون مراجعة صريحة. سلاسل CH_ المخصصة وخطوات الطلبات السابقة تبقى كما هي.' }
    }),
  }
}

async function applyMissingConfig(connection, manifest = manifestOfReview()) {
  await verifyConnection(connection, manifest)
  // لا يسبق ضبط المراجعة ترحيلها المتحقق؛ نقارن checksum دون تنفيذ DDL هنا.
  const exists = (await connection.request().query("SELECT OBJECT_ID(N'dbo.payroll_schema_migrations',N'U') AS id")).recordset[0]?.id
  if (!exists) throw new Error('طبّق الترحيل005 أولاً بأداة ترحيلات الرواتب')
  const ledger = (await connection.request().input('version', sql.NVarChar, migrationVersion)
    .query('SELECT checksum FROM dbo.payroll_schema_migrations WHERE version=@version')).recordset
  const content = fs.readFileSync(path.join(root, 'docs/migrations/payroll', migrationVersion + '.sql'), 'utf8')
  if (ledger.length !== 1 || ledger[0].checksum !== digest(content)) throw new Error('ترحيل005 غير مطبق أو لا يطابق الملف؛ لن تضاف إعدادات المراجعة')
  const transaction = new sql.Transaction(connection)
  let active = false
  const inserted = [], preserved = []
  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE); active = true
    for (const row of overtimeConfigs()) {
      const request = new sql.Request(transaction).input('key', sql.NVarChar, row.key).input('value', sql.NVarChar, row.value)
      const found = (await request.query('SELECT [value] FROM dbo.requests_config WITH (UPDLOCK,HOLDLOCK) WHERE [key]=@key')).recordset
      if (found.length) preserved.push({ key: row.key, value: found[0].value })
      else {
        await request.query('INSERT INTO dbo.requests_config ([key],[value]) VALUES (@key,@value)')
        inserted.push(row.key)
      }
    }
    for (const row of preserved) {
      const actual = (await new sql.Request(transaction).input('key', sql.NVarChar, row.key)
        .query('SELECT [value] FROM dbo.requests_config WHERE [key]=@key')).recordset
      if (actual.length !== 1 || actual[0].value !== row.value) throw new Error('تغير إعداد موجود؛ أُلغي إدخال المفاتيح الناقصة')
    }
    await transaction.commit(); active = false
    return { inserted, preserved: preserved.map(row => row.key), existingValuesPreserved: true, approvalChainsChanged: false, requestsChanged: false }
  } finally { if (active) await transaction.rollback() }
}

async function main(mode = 'inspect') {
  if (!['inspect', 'apply-config'].includes(mode)) throw new Error('استخدم inspect للفحص أو apply-config لإضافة الإعدادات الناقصة فقط')
  const manifest = manifestOfReview()
  const connection = await pool(manifest.database)
  try {
    await verifyConnection(connection, manifest)
    const changes = mode === 'apply-config' ? await applyMissingConfig(connection, manifest) : null
    const result = { mode, database: manifest.database, databaseReadOnly: mode === 'inspect', checkedAt: new Date().toISOString(), changes,
      ...(await inspect(connection)) }
    const output = path.join(root, 'output', mode === 'inspect' ? 'payroll-overtime-review-config-inspect.json' : 'payroll-overtime-review-config.json')
    fs.writeFileSync(output, JSON.stringify(result, null, 2))
    console.log(JSON.stringify(result))
    return result
  } finally { await connection.close() }
}
module.exports = { main, inspect, applyMissingConfig }
if (require.main === module) main(process.argv[2] ?? 'inspect').catch(error => { console.error(error.message); process.exitCode = 1 })

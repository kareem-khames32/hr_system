// فرع الأصل (تدقيق الأدوار D3 — ترحيل 20260922_065): القاعدة الصافية في assets/asset-branch.ts، ونص الترحيل، والربط.
// دوال صافية + فحص نصي؛ لا SQL ولا قاعدة بيانات (الإثبات على قاعدة مؤقتة في assets-branch.integration.cjs).
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const policy = require('../src/assets/asset-branch')
const { branchScopeOf, PERMS_KEY } = require('../src/auth/guards')
const { Asset } = require('../src/requests/entities/custody.entities')
const { AssetsController } = require('../src/assets/assets.controller')
const read = file => fs.readFileSync(path.resolve(apiRoot, '..', file), 'utf8').replace(/\r\n/g, '\n')
const status = fn => { try { fn(); return null } catch (error) { return [error.getStatus(), error.getResponse().message] } }

test('الرؤية والكتابة بناتج branchScopeOf: null = كل الفروع، فرع = أصوله + القديم قراءة بس، والنطاق الفاضي مايشوفش حاجة', () => {
  const inA = { branchId: 10 }, inB = { branchId: 11 }, legacy = { branchId: null }, legacyUndefined = {}
  // [النطاق، الأصل، يشوف، يكتب]
  for (const [scope, asset, visible, writable] of [
    [null, inA, true, true], [null, legacy, true, true],
    [10, inA, true, true], [10, inB, false, false], [10, legacy, true, false], [10, legacyUndefined, true, false],
    [-1, inA, false, false], [-1, legacy, false, false], [0, legacy, false, false],
  ]) {
    assert.deepEqual([policy.assetVisibleTo(scope, asset), policy.assetWritableBy(scope, asset)], [visible, writable], JSON.stringify([scope, asset]))
  }
  // الفرع رقم حتى لو رجع من القاعدة نص
  assert.equal(policy.assetWritableBy(10, { branchId: '10' }), true)
  // لا كاشف وجود: الغايب والخارج عن النطاق نفس الرد بالحرف؛ والأصل اللي بلا فرع (اللي السائل شايفه) بسببه الصريح
  assert.deepEqual(status(() => policy.assertAssetVisible(10, null)), [404, policy.ASSET_NOT_FOUND])
  assert.deepEqual(status(() => policy.assertAssetVisible(10, inB)), [404, policy.ASSET_NOT_FOUND])
  assert.deepEqual(status(() => policy.assertAssetWritable(10, inB)), status(() => policy.assertAssetWritable(10, undefined)))
  assert.deepEqual(status(() => policy.assertAssetWritable(10, legacy)), [403, policy.ASSET_UNBRANCHED_READ_ONLY])
  assert.deepEqual(status(() => policy.assertAssetWritable(-1, legacy)), [404, policy.ASSET_NOT_FOUND])
  assert.equal(policy.assertAssetWritable(null, legacy), legacy)
  assert.equal(policy.assertAssetWritable(10, inA), inA)
})

test('العهدة جوه الفرع الواحد، والنقل بين فرعين لحساب نطاقه كل الفروع بس — الحكم على قيمة النطاق مش على اسم الدور', () => {
  const A = { branchId: 10 }, B = { branchId: 11 }, legacy = { branchId: null }
  assert.equal(policy.custodyBranchProblem(10, A, A), null)
  assert.equal(policy.custodyBranchProblem(null, A, A), null)
  assert.equal(policy.custodyBranchProblem(null, A, B), policy.CUSTODY_CROSS_BRANCH, 'حتى حساب كل الفروع مايسلّمش أصل فرع لموظف فرع تاني')
  assert.equal(policy.custodyBranchProblem(10, legacy, A), policy.ASSET_UNBRANCHED_READ_ONLY)
  assert.equal(policy.custodyBranchProblem(null, legacy, B), null, 'أصل بلا فرع يسلّمه حساب كل الفروع')
  assert.equal(policy.custodyTransferProblem(10, A, A), null)
  assert.equal(policy.custodyTransferProblem(undefined, A, A), null)
  assert.equal(policy.custodyTransferProblem(null, A, B), null)
  for (const scope of [10, 11, -1, undefined]) assert.match(policy.custodyTransferProblem(scope, A, B), /نفس الفرع/, String(scope))
  // مدير النظام وحساب «كل الفروع» غير مدير النظام بياخدوا نفس النطاق؛ وحساب الفرع العادي لأ
  assert.equal(branchScopeOf({ role: 'super_admin', branchId: null }), null)
  assert.equal(branchScopeOf({ role: 'hr_manager', branchId: 10, scopeAllBranches: true }), null)
  assert.equal(branchScopeOf({ role: 'hr_manager', branchId: 10 }), 10)
  assert.equal(branchScopeOf({ role: 'hr_manager', branchId: null }), -1)
  for (const file of ['api/src/assets/asset-branch.ts', 'api/src/assets/assets.controller.ts', 'api/src/requests/custody-execution.ts']) {
    assert.ok(!/role\s*===|super_admin/.test(read(file)), `${file}: مفيش فحص على اسم الدور`)
  }
  // تحديد الفرع: حساب كل الفروع بس، وأصل في عهدة مايتنقلش لفرع غير فرع صاحبها
  assert.equal(status(() => policy.assertAllBranches(null)), null)
  for (const scope of [10, -1]) assert.deepEqual(status(() => policy.assertAllBranches(scope)), [403, policy.ASSET_BRANCH_ALL_BRANCHES_ONLY])
  assert.equal(policy.assetBranchMoveProblem(11, []), null)
  assert.equal(policy.assetBranchMoveProblem(11, [B, { branchId: '11' }]), null)
  assert.match(policy.assetBranchMoveProblem(11, [B, A]), /فرع تاني/)
  assert.match(policy.assetBranchMoveProblem(11, [{ branchId: null }]), /فرع تاني/, 'صاحب عهدة مجهول الفرع = مخالف')
  for (const bad of [0, -3, 1.5, 'x', null, undefined]) assert.deepEqual(status(() => policy.assertValidBranchId(bad)), [400, 'الفرع غير صالح'], String(bad))
  assert.equal(policy.assertValidBranchId('12'), 12)
})

test('الترحيل 065: إضافي، محروس، أكواده فريدة، واسم الفهرس هو اللي TypeORM بيولّده من الكيان', () => {
  const sql = read('docs/migrations/payroll/20260922_065_assets_branch.sql')
  const statements = sql.replace(/--[^\n]*/g, '')
  for (const forbidden of [/\bDROP\b/i, /\bDELETE\b/i, /\bTRUNCATE\b/i, /\bINSERT\b/i, /\bALTER\s+COLUMN\b/i, /\bEXEC\b/i]) assert.ok(!forbidden.test(statements), String(forbidden))
  // غير متاح في SQL Server 2019
  for (const modern of [/\bGREATEST\b/i, /\bLEAST\b/i, /GENERATE_SERIES/i, /DATETRUNC/i, /IS\s+(NOT\s+)?DISTINCT\s+FROM/i, /JSON_OBJECT|JSON_ARRAY/i]) assert.ok(!modern.test(statements), String(modern))
  assert.ok(sql.includes("IF COL_LENGTH(N'dbo.assets', N'branchId') IS NULL\n  ALTER TABLE dbo.assets ADD [branchId] int NULL;"), 'العمود nullable بلا قيد افتراضي وبحارس')
  // التعبئة من الحامل الحالي بس، ولا تمس إلا الفاضي
  assert.match(statements, /UPDATE a SET a\.\[branchId\] = e\.\[branchId\]\s+FROM dbo\.assets a\s+INNER JOIN dbo\.employees e ON e\.\[id\] = a\.\[currentHolderId\]\s+WHERE a\.\[branchId\] IS NULL/)
  assert.equal((statements.match(/\bUPDATE\b/gi) ?? []).length, 1)
  const { DefaultNamingStrategy, getMetadataArgsStorage } = require('../node_modules/typeorm')
  const index = new DefaultNamingStrategy().indexName('assets', ['branchId'])
  assert.equal(index, 'IDX_b9a2d908e40ada723882053f98')
  assert.ok(sql.includes(`WHERE name = N'${index}' AND object_id = OBJECT_ID(N'dbo.assets')`) && sql.includes(`CREATE INDEX [${index}] ON dbo.assets ([branchId]);`))
  // الكيان: عمود int nullable بلا default، وعليه @Index بلا اسم (فالاسم المولَّد هو اللي في الترحيل)
  const storage = getMetadataArgsStorage()
  const column = storage.columns.find(item => item.target === Asset && item.propertyName === 'branchId')
  assert.deepEqual([column.options.type, column.options.nullable, column.options.default], ['int', true, undefined])
  const indexArgs = storage.indices.find(item => item.target === Asset && Array.isArray(item.columns) && item.columns.join() === 'branchId')
  assert.ok(indexArgs && !indexArgs.name && !indexArgs.unique)
  const migrator = require('../scripts/db-migrate.cjs')
  const files = migrator.discover()
  assert.deepEqual(migrator.analyze(files).problems.filter(problem => /065|5665\d/.test(problem)), [])
  assert.deepEqual(migrator.throwCodes(sql), [56651, 56652, 56653])
  assert.deepEqual(migrator.duplicateThrowCodes(files).filter(dup => dup.code >= 56650 && dup.code <= 56659), [])
})

test('الربط: مسارات الأصول بصلاحية العهد وبتقرا النطاق، و«المتاح» مقسوم على الفرع، والتنشيط بيختم الأصل بفرع حامله', () => {
  const permsOf = method => Reflect.getMetadata(PERMS_KEY, AssetsController.prototype[method]) ?? null
  for (const method of ['listAssets', 'createAsset', 'setAssetsBranch', 'updateAsset', 'retireAsset', 'reactivateAsset', 'listCustody', 'assign', 'returnCustody', 'writeOff']) {
    assert.deepEqual(permsOf(method), ['custody.assign'], method)
  }
  const controller = read('api/src/assets/assets.controller.ts')
  // كل مسار على الأصل بياخد صاحب الحساب ويمر بالقاعدة (كانت retire/reactivate/available/create بلا أي نطاق)
  for (const signature of ['createAsset(@Body() dto: CreateAssetDto, @CurrentUser() user: JwtPayload)', 'retireAsset(@Param(\'id\', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload)',
    'reactivateAsset(@Param(\'id\', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload)', 'availableAssets(@CurrentUser() user: JwtPayload)']) assert.ok(controller.includes(signature), signature)
  assert.equal((controller.match(/assertAssetWritable\(/g) ?? []).length, 3, 'التعديل والتقاعد وإعادة التفعيل')
  assert.match(controller, /where: \{ status: 'AVAILABLE', \.\.\.\(scope === null \? \{\} : \{ branchId: scope \}\) \}/)
  assert.match(controller, /setAssetsBranch\(@Body\(\) dto: SetAssetsBranchDto, @CurrentUser\(\) user: JwtPayload\) \{\n    assertAllBranches\(branchScopeOf\(user\)\)/)
  // مسار «دفعة» متعرّف قبل :id
  assert.ok(controller.indexOf("@Post('assets/branch')") < controller.indexOf("@Patch('assets/:id')"))
  const service = read('api/src/requests/requests.service.ts')
  assert.ok(service.includes("update(asset.id, { currentHolderId: row.employeeId, status: 'ASSIGNED', branchId: employee.branchId })"))
  assert.equal((service.match(/await this\.assertCustodyInScope\(user, /g) ?? []).length, 4, 'الاستلام والتسليم واعتماد المدير والرفض')
  const execution = read('api/src/requests/custody-execution.ts')
  assert.match(execution, /const scope = actor && !req \? branchScopeOf\(actor\) : undefined\n  const crossBranch = custodyTransferProblem\(scope, owner, target\)/)
  // الشاشة: الفرع ظاهر، وتحديده (فردي ودفعة) لحساب كل الفروع
  const page = read('src/app/employees/custody/page.tsx')
  assert.ok(page.includes('setAssetsBranch(') && page.includes('أصول بلا فرع'))
  assert.match(read('src/lib/api.ts'), /export const setAssetsBranch = \(assetIds: number\[\], branchId: number\) =>/)
})

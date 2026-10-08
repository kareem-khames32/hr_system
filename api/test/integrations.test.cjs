// B6.3 (أ) — التكاملات: شكل المفتاح وبصمته ومطابقته، النطاقات وفروع المفتاح، شرط النطاق في جملة القراءة، ومصدر الكود (الحارس بترتيبه، مفيش مسار كتابة
// ولا عمود حساس في الـAPI العام، والإدارة لحساب بكل الفروع). حساب نقي بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const keys = require('../src/integrations/integration-keys')
const api = require('../src/integrations/public-api.service')
const read = rel => fs.readFileSync(path.join(apiRoot, 'src', rel), 'utf8').replace(/\r\n/g, '\n')

test('INU-01: المفتاح — شكله وبادئته وبصمته، والمطابقة بالبصمة بس (المفتاح نفسه مابيتخزنش)، والمفتاح من الترويسة', () => {
  const made = keys.generateKey()
  assert.match(made.key, /^hrk_[a-f0-9]{8}_[a-f0-9]{40}$/)
  assert.deepEqual([made.prefix, made.hash, made.hash.length], [made.key.slice(4, 12), keys.hashKey(made.key), 64])
  assert.notEqual(keys.generateKey().key, made.key)
  assert.deepEqual([keys.keyPrefixOf(made.key), keys.keyPrefixOf(` ${made.key} `), keys.keyPrefixOf('hrk_zzzzzzzz_' + 'a'.repeat(40)), keys.keyPrefixOf(made.key.slice(0, -1)), keys.keyPrefixOf(null), keys.keyPrefixOf(5)],
    [made.prefix, made.prefix, null, null, null, null])
  const other = keys.generateKey()
  assert.deepEqual([keys.keyMatches(made.key, made.hash), keys.keyMatches(other.key, made.hash), keys.keyMatches(made.key, 'abc'), keys.keyMatches(made.key, '')], [true, false, false, false])
  assert.deepEqual([keys.keyFromHeaders({ authorization: `Bearer ${made.key}` }), keys.keyFromHeaders({ 'x-api-key': made.key }), keys.keyFromHeaders({ authorization: 'Basic abc' }), keys.keyFromHeaders({})], [made.key, made.key, null, null])
})

test('INU-02: النطاقات والفروع — قايمة من المعروف بس، والفروع الفاضية = كل الفروع؛ والنص المخزن التالف = ولا نطاق ولا فرع (مش كل الفروع)', () => {
  assert.deepEqual(keys.INTEGRATION_SCOPES, ['employees.read', 'structure.read', 'attendance.read', 'leaves.read', 'payroll.read'])
  assert.deepEqual([keys.cleanScopes(['structure.read', 'employees.read', 'employees.read']), keys.cleanScopes([]), keys.cleanScopes('employees.read'), keys.cleanScopes(['employees.write'])],
    [{ scopes: ['employees.read', 'structure.read'], issue: null }, { scopes: [], issue: 'اختار نطاق قراءة واحد على الأقل' }, { scopes: [], issue: 'اختار نطاق قراءة واحد على الأقل' }, { scopes: [], issue: 'نطاق قراءة مش معروف' }])
  assert.deepEqual([keys.cleanBranchIds(null), keys.cleanBranchIds([]), keys.cleanBranchIds([3, 1, 3]), keys.cleanBranchIds([0]), keys.cleanBranchIds(['1']), keys.cleanBranchIds(2)],
    [{ branchIds: null, issue: null }, { branchIds: null, issue: null }, { branchIds: [1, 3], issue: null }, { branchIds: null, issue: 'الفروع أرقام فروع صحيحة' }, { branchIds: null, issue: 'الفروع أرقام فروع صحيحة' },
      { branchIds: null, issue: 'الفروع أرقام فروع صحيحة' }])
  assert.equal(keys.cleanBranchIds(Array.from({ length: 51 }, (_, index) => index + 1)).issue, 'الفروع 50 بالكتير')
  assert.deepEqual([keys.storedBranchScope(null), keys.storedBranchScope('[2,5]'), keys.storedBranchScope('not json'), keys.storedBranchScope('{"a":1}'), keys.storedBranchScope('[0]')], [null, [2, 5], [], [], []])
  assert.deepEqual([keys.storedScopes('["structure.read","x"]'), keys.storedScopes('broken'), keys.storedScopes('{}')], [['structure.read'], [], []])
})

test('INU-03: شرط نطاق الفروع جوه جملة القراءة — كل الفروع من غير شرط، ولا فرع = ولا صف، وقايمة بباراميترات؛ والصفحة بحدودها', () => {
  const all = [], none = [], some = ['x']
  assert.deepEqual([api.scopeClause(null, 'e.[branchId]', all), all, api.scopeClause([], 'e.[branchId]', none), none, api.scopeClause([4, 9], 'e.[branchId]', some), some],
    ['', [], ' AND 1 = 0', [], ' AND e.[branchId] IN (@1, @2)', ['x', 4, 9]])
  assert.deepEqual([api.pageOf({}), api.pageOf({ page: '3', pageSize: '200' })], [{ page: 1, pageSize: 50 }, { page: 3, pageSize: 200 }])
  for (const query of [{ page: '0' }, { page: 'x' }, { pageSize: '201' }, { pageSize: '0' }, { page: '1.5' }]) assert.throws(() => api.pageOf(query))
  // (ب) مدى التاريخ: إجباري وصحيح ومرتّب وبحد
  assert.deepEqual([api.rangeOf({ from: '2026-10-01', to: '2026-10-31' }, 31), api.rangeOf({ from: '2026-02-28', to: '2026-02-28' }, 31)], [{ from: '2026-10-01', to: '2026-10-31' }, { from: '2026-02-28', to: '2026-02-28' }])
  for (const query of [{}, { from: '2026-10-01' }, { from: '2026-10-02', to: '2026-10-01' }, { from: '2026-10-01', to: '2026-11-01' }, { from: '2026-02-30', to: '2026-03-01' }, { from: '01/10/2026', to: '2026-10-02' }])
    assert.throws(() => api.rangeOf(query, 31), JSON.stringify(query))
})

test('INU-04: مصدر الكود — الحارس (حد العنوان ← المفتاح ← حد المفتاح ← النطاق)، والـAPI العام للقراءة بس ومن غير أعمدة حساسة، والإدارة لحساب بكل الفروع', () => {
  const guard = read('integrations/integration-key.guard.ts'), controller = read('integrations/public-api.controller.ts'), service = read('integrations/public-api.service.ts'),
    manage = read('integrations/integrations.controller.ts'), store = read('integrations/integration-keys.service.ts')
  // ترتيب الحارس، ونفس الرد لأي مفتاح مش صالح
  const order = ['this.byAddress.take(', 'await this.keys.authenticate(', 'if (!identity) throw new UnauthorizedException(KEY_INVALID)', 'this.byKey.take(', 'throw new ForbiddenException(KEY_SCOPE_MISSING)', 'request.integration = identity'].map(text => guard.indexOf(text))
  assert.ok(order.every((at, index) => at > 0 && (index === 0 || at > order[index - 1])), JSON.stringify(order))
  // الـAPI العام: ورا الموديول والحارس، GET بس، وكل مسار بيانات عليه نطاق
  assert.match(controller, /@RequireModule\('integrations'\)\n@UseGuards\(IntegrationKeyGuard\)\n@Controller\('public\/v1'\)/)
  assert.doesNotMatch(controller, /@(Post|Put|Patch|Delete)\(/)
  assert.deepEqual([...controller.matchAll(/(?:@RequireScope\('([a-z.]+)'\)\n\s+)?@Get\('([^']+)'\)/g)].map(match => [match[2], match[1] ?? null]),
    [['openapi.json', null], ['employees', 'employees.read'], ['employees/:id', 'employees.read'], ['structure', 'structure.read'], ['attendance', 'attendance.read'], ['leaves', 'leaves.read'], ['payroll/runs', 'payroll.read']])
  // (ب) كل قراءة ورا موديول بياناتها كمان
  for (const [module, route] of [['attendance', 'attendance'], ['leave', 'leaves'], ['payroll', 'payroll/runs']]) assert.match(controller, new RegExp(`@RequireModule\\('integrations', '${module}'\\)\\n\\s+@RequireScope\\('[a-z.]+'\\)\\n\\s+@Get\\('${route}'\\)`))
  // مفيش عمود حساس في أي جملة قراءة، ومفيش كتابة
  assert.doesNotMatch(service, /salary|Salary|nationalId|passport|iban|bankAccount|\[phone\]|birthDate|passwordHash|basicSalary|allowances|deduction/)
  assert.doesNotMatch(service, /INSERT INTO|UPDATE dbo|DELETE FROM|\.save\(|\.insert\(/)
  // النطاق في جملة القراءة نفسها لكل قراءة
  assert.equal((service.match(/scopeClause\(integration\.branchScope, /g) || []).length, 7)
  // (ب) الإجازات المعتمدة بس، والمسيرات المعتمدة والمصروفة بس، وإجمالي من غير مبلغ لموظف بعينه
  assert.match(service, /WHERE l\.\[status\] = N'APPROVED' AND l\.\[fromDate\] <= @1 AND l\.\[toDate\] >= @0/)
  assert.match(service, /WHERE r\.\[period\] = @0 AND r\.\[status\] IN \(N'APPROVED', N'PAID'\)/)
  assert.match(service, /COUNT\(i\.\[id\]\) AS \[employees\], CONVERT\(varchar\(40\), SUM\(i\.\[netPay\]\)\) AS \[totalNet\]/)
  // الإدارة: الصلاحية على كل مسار، والحكم «كل الفروع» في كل مدخل؛ والمفتاح بيرجع في رد الإنشاء بس وبصمته مابترجعش
  assert.match(manage, /@RequireModule\('integrations'\)\n@UseGuards\(JwtAuthGuard, RolesGuard\)\n@Controller\('integrations'\)/)
  assert.equal((manage.match(/@Perm\('integrations\.manage'\)/g) || []).length, 3)
  assert.equal((store.match(/assertCompanyWideWrite\(user\)/g) || []).length, 3)
  assert.match(store, /return \{ \.\.\.view\(row\), key: fresh\.key \}/)
  assert.doesNotMatch(store.slice(store.indexOf('const view = '), store.indexOf('@Injectable()')), /keyHash/)
  // الإلغاء كتابة مشروطة، والتحقق بيقرا الشغال بس
  assert.match(store, /UPDATE dbo\.integration_keys SET \[isActive\] = 0, \[revokedByUserId\] = @1, \[revokedAt\] = @2 OUTPUT INSERTED\.\[id\] WHERE \[id\] = @0 AND \[isActive\] = 1/)
  assert.match(store, /FROM dbo\.integration_keys WHERE \[keyPrefix\] = @0 AND \[isActive\] = 1/)
})

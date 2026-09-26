'use strict'
// الأدوار ونطاق الفروع (قرارات المالك 22 سبتمبر بعد تدقيق الأدوار ROLES_AUDIT.md) — بلا قاعدة بيانات:
// - سجل الصلاحيات: payroll.disburse وpayroll.chain_manage بتسمياتهم، وكل صلاحية تحت وحدة واحدة ولها شرح (مفيش صلاحية تتوه من الشاشة)
// - الحزم: الأدوار الثلاثة الجديدة بالظبط، والأدوار الثلاثة المضيّقة (D1/D2/D4)، والأدوار «قراءة فقط» مابتفتحش غير مسارات GET
// - branchScopeOf: «نطاقه: كل الفروع» بيرجّع null بمقارنة حرفية، والنطاق مش صلاحية (RolesGuard ماتغيّرش)، والفاضي يفضل مقفول
// - ترحيل 064 مربوط بالكود حرفًا بحرف (الحزم القديمة والجديدة)، إضافي، متوافق مع SQL Server 2019، واسم القيد من TypeORM
// - الحراسات في المصدر: فتح النطاق لمدير النظام بس، وtokenVersion بيزيد، والتوكن بيتطابق مع القاعدة
// الملفات على القرص CRLF — كل قراءة مصدر بتتطبّع.
// Run: node --test api/test/roles-scope-presets.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(apiRoot, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')

const permissions = require('../src/auth/permissions')
const { PERMISSIONS, ALL_PERMISSIONS, PERMISSION_MODULES, PERMISSION_DESCRIPTIONS, permissionRegistry, ROLE_PRESETS,
  LEGACY_SHIPPED_ROLE_PRESETS, SUPER_ADMIN_ONLY_GRANTS, adminGrantViolation, effectivePermissions } = permissions
const guards = require('../src/auth/guards')
const migrate = require('../scripts/db-migrate.cjs')

const read = (...parts) => fs.readFileSync(path.join(repoRoot, ...parts), 'utf8').replace(/\r\n/g, '\n')
const MIGRATION = ['docs', 'migrations', 'payroll', '20260922_064_roles_scope_and_presets.sql']
const preset = code => ROLE_PRESETS.find(role => role.code === code)
const sorted = list => [...list].sort()

test('registry: the two payroll permissions the disbursement feature relies on exist with their exact Arabic labels', () => {
  assert.equal(PERMISSIONS['payroll.disburse'], 'تسجيل صرف الرواتب للموظفين (تم / لم يتم) بلا أي تعديل')
  assert.equal(PERMISSIONS['payroll.chain_manage'], 'ضبط سلسلة اعتماد المسير')
  // سلسلة الاعتماد = ضابط فصل المهام نفسه: حامل users.manage مايصنعش حسابًا يحملها
  assert.ok(SUPER_ADMIN_ONLY_GRANTS.includes('payroll.chain_manage'))
  assert.match(adminGrantViolation(['payroll.view', 'payroll.chain_manage'], ['payroll.view']), /«ضبط سلسلة اعتماد المسير» متاح لمدير النظام فقط/)
  assert.equal(adminGrantViolation(['payroll.view', 'payroll.disburse'], ['payroll.view']), null)
  assert.ok(!SUPER_ADMIN_ONLY_GRANTS.includes('payroll.disburse'))
  for (const perm of SUPER_ADMIN_ONLY_GRANTS) assert.ok(PERMISSIONS[perm], `${perm} في قائمة الحصري ومش في السجل`)
})

test('registry: every permission sits in exactly one module and has a one-line description — nothing can vanish from the screen', () => {
  const placed = PERMISSION_MODULES.flatMap(module => module.permissions)
  assert.deepEqual(sorted(placed), sorted(ALL_PERMISSIONS), 'كل صلاحية في السجل تحت وحدة، ومفيش وحدة فيها صلاحية مش في السجل')
  assert.equal(new Set(placed).size, placed.length, 'صلاحية مكررة في وحدتين')
  assert.equal(new Set(PERMISSION_MODULES.map(module => module.key)).size, PERMISSION_MODULES.length)
  for (const module of PERMISSION_MODULES) {
    assert.match(module.labelAr, /[؀-ۿ]/, module.key)
    assert.ok(module.permissions.length > 0, module.key)
  }
  assert.deepEqual(sorted(Object.keys(PERMISSION_DESCRIPTIONS)), sorted(ALL_PERMISSIONS), 'شرح لكل صلاحية، ولا شرح لصلاحية مش موجودة')
  for (const key of ALL_PERMISSIONS) {
    const description = PERMISSION_DESCRIPTIONS[key]
    assert.match(description, /[؀-ۿ]/, key)
    assert.ok(description.length >= 15 && description.length <= 200 && !description.includes('\n'), `${key}: سطر واحد واضح`)
    assert.notEqual(description, PERMISSIONS[key], `${key}: الشرح مش تكرار للتسمية`)
  }
  const registry = permissionRegistry()
  assert.deepEqual(registry.map(entry => entry.key), ALL_PERMISSIONS)
  for (const entry of registry) {
    assert.deepEqual(Object.keys(entry).sort(), ['description', 'group', 'groupLabelAr', 'key', 'labelAr', 'superAdminOnly'])
    assert.notEqual(entry.group, 'other', `${entry.key} وقعت تحت «أخرى»`)
    assert.equal(entry.superAdminOnly, SUPER_ADMIN_ONLY_GRANTS.includes(entry.key))
    // الصلاحية الحصرية شرحها بيقول كده صراحةً
    if (entry.superAdminOnly) assert.match(entry.description, /مدير النظام/, entry.key)
  }
  assert.equal(registry.find(entry => entry.key === 'payroll.disburse').group, 'payroll')
  assert.equal(registry.find(entry => entry.key === 'approve.custody').groupLabelAr, 'خطوات الاعتماد')
})

test('presets: the three new roles carry exactly their list — no more, no less', () => {
  const asset = preset('asset_officer'), hr = preset('hr_officer'), disburser = preset('payroll_disburser')
  assert.deepEqual([asset.nameAr, hr.nameAr, disburser.nameAr], ['مسؤول الأصول', 'مسؤول موارد بشرية', 'مسؤول صرف الرواتب'])
  for (const role of [asset, hr, disburser]) assert.equal(role.isSystem, false, `${role.code}: يتعدّل ويتعطّل من الشاشة`)

  // مسؤول الأصول: العهد والأصول وخطوة أمين العهدة — ولا حاجة عن المال أو ملفات الموظفين أو الحضور أو الإعدادات
  assert.deepEqual(sorted(asset.permissions), ['approve.custody', 'custody.assign'])

  // مسؤول صرف الرواتب: يشوف المسيرات ويعلّم الصرف — بس
  assert.deepEqual(sorted(disburser.permissions), ['payroll.disburse', 'payroll.view'])

  // مسؤول موارد بشرية: قراءة فقط — كل صلاحية «عرض»، وبلا رواتب ولا خصومات ولا مكافآت ولا إعفاءات
  assert.deepEqual(sorted(hr.permissions), sorted(['employees.view', 'requests.view_all', 'attendance.view_all', 'attendance_exemption.view',
    'leaves.view_all', 'calendar.view_all', 'dashboard.view_all', 'reports.view', 'transfers.view']))
  for (const perm of hr.permissions) assert.match(perm, /\.(view|view_all)$/, `${perm} مش صلاحية عرض`)
  for (const perm of hr.permissions) assert.doesNotMatch(perm, /^(payroll|loans|deductions|bonuses|financial_exemption|settlement)\./, perm)

  for (const role of [asset, hr, disburser]) {
    for (const perm of role.permissions) assert.ok(ALL_PERMISSIONS.includes(perm), `${role.code}: ${perm} مش في السجل`)
    assert.equal(role.permissions.filter(perm => SUPER_ADMIN_ONLY_GRANTS.includes(perm)).length, 0, `${role.code} شايل صلاحية حصرية`)
    assert.equal(new Set(role.permissions).size, role.permissions.length)
  }
  // approve.custody ماكانش في أي دور (تدقيق 21 سبتمبر) — دلوقتي مسؤول الأصول شايلها
  assert.deepEqual(ROLE_PRESETS.filter(role => role.permissions.includes('approve.custody')).map(role => role.code), ['asset_officer'])
})

test('presets: payroll_manager cannot approve or pay, read_only cannot write or read the bank sheet, data_entry cannot archive', () => {
  const removed = {
    payroll_manager: ['payroll.approve', 'payroll.pay'],
    read_only: ['attendance.manage', 'custody.assign', 'candidates.manage', 'documents.manage', 'payroll.view'],
    data_entry: ['employees.archive'],
  }
  for (const [code, gone] of Object.entries(removed)) {
    const shipped = LEGACY_SHIPPED_ROLE_PRESETS[code], now = preset(code).permissions
    assert.deepEqual(sorted(now), sorted(shipped.filter(perm => !gone.includes(perm))), `${code}: الجديد = القديم ناقص المشال بالظبط`)
    for (const perm of gone) assert.ok(shipped.includes(perm) && !now.includes(perm), `${code}: ${perm}`)
    assert.equal(preset(code).isSystem, false)
  }
  // D1: فصل المهام — اللي بيحتسب لا يعتمد ولا يصرف ولا يعلّم الصرف ولا يضبط سلسلة الاعتماد
  const payroll = preset('payroll_manager').permissions
  assert.ok(payroll.includes('payroll.calculate') && payroll.includes('payroll.view'))
  for (const perm of ['payroll.approve', 'payroll.pay', 'payroll.disburse', 'payroll.chain_manage', 'payroll.reopen', 'payroll.cancel', 'payroll.reverse']) assert.ok(!payroll.includes(perm), perm)
  // D4
  assert.deepEqual(sorted(preset('data_entry').permissions), ['documents.manage', 'employees.create', 'employees.edit', 'employees.view'])
})

// كل مسار HTTP مع صلاحياته من ديكوريتورز الكنترولرز
function routeInventory() {
  const routes = []
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name)
      if (entry.isDirectory()) { walk(file); continue }
      if (!/\.controller\.ts$/.test(entry.name)) continue
      const lines = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n')
      let classPerms = null, pending = { perms: null, verb: null, route: null }, inClass = false
      for (const line of lines) {
        if (/^export class /.test(line)) { inClass = true; classPerms = pending.perms; pending = { perms: null, verb: null, route: null }; continue }
        const perms = [...line.matchAll(/@Perm\(([^)]*)\)/g)].flatMap(match => [...match[1].matchAll(/'([^']+)'/g)].map(item => item[1]))
        if (perms.length) pending.perms = perms
        const verb = line.match(/@(Get|Post|Patch|Put|Delete)\(/)
        if (verb) pending.verb = verb[1].toUpperCase()
        if (inClass && pending.verb && /^\s+(?:async\s+)?[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(line) && !/^\s+@/.test(line)) {
          routes.push({ file: path.relative(apiRoot, file), verb: pending.verb, perms: pending.perms ?? classPerms ?? [] })
          pending = { perms: null, verb: null, route: null }
        }
      }
    }
  }
  walk(path.join(apiRoot, 'src'))
  return routes
}

test('read-only roles: every permission they carry opens GET routes only (a future POST under a «view» permission fails here)', () => {
  const routes = routeInventory()
  assert.ok(routes.length > 300, `جرد المسارات: ${routes.length}`)
  assert.ok(routes.some(route => route.verb === 'POST' && route.perms.includes('custody.assign')), 'الجرد بيشوف المسارات الكاتبة')
  for (const code of ['hr_officer', 'read_only']) {
    for (const perm of preset(code).permissions) {
      const writes = routes.filter(route => route.verb !== 'GET' && route.perms.includes(perm))
      assert.deepEqual(writes, [], `${code}: ${perm} بتفتح مسار كاتب`)
    }
  }
  // الحزمة القديمة لـ«قراءة فقط» كانت بتكتب فعلًا — ده اللي اتصلّح
  const oldWrites = routes.filter(route => route.verb !== 'GET' && route.perms.some(perm => LEGACY_SHIPPED_ROLE_PRESETS.read_only.includes(perm)))
  assert.ok(oldWrites.length > 10, 'الحزمة القديمة كانت بتفتح مسارات كاتبة')
})

test('branchScopeOf: «كل الفروع» opens the scope only on a literal true; everything else stays locked, and the empty scope stays closed', () => {
  const { branchScopeOf, assertCompanyWideWrite } = guards
  assert.equal(branchScopeOf({ role: 'super_admin', branchId: 3 }), null)
  assert.deepEqual(branchScopeOf({ role: 'hr_manager', branchId: 3 }), [3])
  assert.equal(branchScopeOf({ role: 'hr_manager', branchId: 3, scopeAllBranches: true }), null)
  assert.equal(branchScopeOf({ role: 'employee', branchId: null, scopeAllBranches: true }), null)
  // أي قيمة غير true الحرفية = مقفول على فرعه
  for (const junk of [false, undefined, null, 1, 'true', 'yes', {}, []]) {
    assert.deepEqual(branchScopeOf({ role: 'hr_manager', branchId: 3, scopeAllBranches: junk }), [3], String(junk))
  }
  // الحساب القديم بلا فرع: نطاق فاضي ([]) مش كل الفروع — الفشل المقفول باقي
  for (const branchId of [null, undefined, 0, -5, 'x', 2.5]) {
    assert.deepEqual(branchScopeOf({ role: 'hr_manager', branchId }), [], String(branchId))
    assert.deepEqual(branchScopeOf({ role: 'hr_manager', branchId, scopeAllBranches: false }), [])
  }
  // الفروع المختارة في التوكن (branchIds) هي النطاق بالظبط — والفاضية تفضل فاضية (مش فرعه ولا «الكل»)، والقيم البايظة بتتشال
  assert.deepEqual(branchScopeOf({ role: 'hr_manager', branchId: 3, branchIds: [3, 4] }), [3, 4])
  assert.deepEqual(branchScopeOf({ role: 'hr_manager', branchId: 3, branchIds: [4] }), [4])
  assert.deepEqual(branchScopeOf({ role: 'hr_manager', branchId: 3, branchIds: [] }), [])
  assert.deepEqual(branchScopeOf({ role: 'hr_manager', branchId: 3, branchIds: [0, -1, 'x', 2.5, 4, 4] }), [4])
  assert.equal(branchScopeOf({ role: 'hr_manager', branchId: 3, branchIds: [3], scopeAllBranches: true }), null)
  // الكتابة على مستوى الشركة: «كل الفروع» بيعدّي، والمقفول (فرع أو أكتر) والفاضي لأ
  assertCompanyWideWrite({ role: 'super_admin', branchId: 1 })
  assertCompanyWideWrite({ role: 'hr_manager', branchId: 1, scopeAllBranches: true })
  for (const user of [{ role: 'hr_manager', branchId: 1 }, { role: 'hr_manager', branchId: null }, { role: 'hr_manager', branchId: 1, scopeAllBranches: 'true' },
    { role: 'hr_manager', branchId: 1, branchIds: [1, 2] }, { role: 'hr_manager', branchId: 1, branchIds: [] }]) {
    assert.throws(() => assertCompanyWideWrite(user), error => error.getStatus?.() === 403 && /لكل الشركة/.test(error.message))
  }
})

test('scope is not permission: RolesGuard and userHasPerm ignore «كل الفروع» completely', () => {
  const { RolesGuard, PERMS_KEY, userHasPerm } = guards
  const guardFor = required => new RolesGuard({ getAllAndOverride: key => (key === PERMS_KEY ? required : undefined) })
  const context = user => ({ getHandler: () => null, getClass: () => null, switchToHttp: () => ({ getRequest: () => ({ user }) }) })
  const wide = { role: 'hr_officer', branchId: 1, scopeAllBranches: true, permissions: ['employees.view'] }
  assert.equal(guardFor(['settings.manage']).canActivate(context(wide)), false)
  assert.equal(guardFor(['employees.edit']).canActivate(context(wide)), false)
  assert.equal(guardFor(['employees.view']).canActivate(context(wide)), true)
  assert.equal(guardFor(['settings.manage']).canActivate(context({ ...wide, permissions: ['settings.manage'] })), true)
  assert.equal(userHasPerm(wide, 'settings.manage'), false)
  assert.equal(userHasPerm(wide, 'employees.view'), true)
  // ومفيش أي ذكر للنطاق جوه الحارس نفسه
  const source = read('api', 'src', 'auth', 'guards.ts')
  const guardBody = source.slice(source.indexOf('export class RolesGuard'), source.indexOf('// فحص برمجي داخل الخدمات'))
  assert.doesNotMatch(guardBody, /scopeAllBranches|branchScopeOf/)
  assert.match(source, /if \(user\.role === 'super_admin' \|\| user\.scopeAllBranches === true\) return null/)
})

test('effective permissions = role ∪ grants − revokes (what the users screen shows)', () => {
  assert.deepEqual(sorted(effectivePermissions(['a', 'b'], ['c'], ['a'])), ['b', 'c'])
  assert.deepEqual(effectivePermissions(['*'], [], ['a']), ['*'])
  assert.deepEqual(effectivePermissions([], ['x'], ['x']), [], 'السحب بيكسب المنحة')
})

test('source guards: only the super admin flips the switch, it bumps tokenVersion, rides in the JWT and is cross-checked on every request', () => {
  const users = read('api', 'src', 'auth', 'users.controller.ts')
  // الإنشاء: غير مدير النظام مايفتحش النطاق
  assert.match(users, /if \(actor\.role !== 'super_admin' && dto\.scopeAllBranches === true\) \{\s+throw new ForbiddenException\(SCOPE_ALL_BRANCHES_SUPER_ADMIN_ONLY\)/)
  // التعديل: لا فتح ولا قفل، والحساب المفتوح له مايديروش غير مدير النظام — قبل أي حفظ
  const update = users.slice(users.indexOf("@Patch(':id')"))
  const flip = update.indexOf('throw new ForbiddenException(SCOPE_ALL_BRANCHES_SUPER_ADMIN_ONLY)')
  const locked = update.indexOf('if (wasScopeAll) throw new ForbiddenException(SCOPE_ALL_BRANCHES_ACCOUNT_LOCKED)')
  const save = update.indexOf('await this.users.save(user)')
  assert.ok(flip > 0 && locked > flip && save > locked, 'الحراسة قبل الحفظ')
  assert.match(update, /dto\.scopeAllBranches !== undefined && dto\.scopeAllBranches !== wasScopeAll/)
  assert.match(update, /nextRole === 'super_admin' \? false : \(dto\.scopeAllBranches \?\? wasScopeAll\)/)
  assert.match(update, /if \(scopeAllChanged\) user\.scopeAllBranches = nextScopeAll/)
  // والفروع المختارة: تغييرها جزء من «تغيير النطاق» (يبطل التوكنات، وممنوع على حسابك إنت)
  assert.match(update, /if \(scopeBranchesChanged\) user\.scopeBranchIds = nextScopeBranchIds/)
  assert.match(update, /const scopeChanged = scopeAllChanged \|\| scopeBranchesChanged/)
  const manageable = update.indexOf('assertManageableScope(actor, user)')
  assert.ok(manageable > locked && manageable < save, 'حساب نطاقه أوسع من المنفّذ: الرفض قبل الحفظ')
  assert.match(update, /employeeChanged \|\|\s+scopeChanged\s+\) \{\s+user\.tokenVersion = \(user\.tokenVersion \?\? 0\) \+ 1/)
  // لا أحد يغيّر نطاق حسابه بنفسه
  assert.match(update, /roleChanged \|\| permsChanged \|\| branchChanged \|\| employeeChanged \|\| scopeChanged/)
  // منحة «منطقية فقط»: 1 أو "true" مرفوضة من الـDTO
  assert.equal((users.match(/@IsBoolean\(\{ message: 'نطاق الحساب غير صالح' \}\)\s+scopeAllBranches\?: boolean/g) ?? []).length, 2)
  // كلمة المرور المؤقتة بالجملة وتجاوزات الصلاحيات: نفس القفل
  assert.match(users, /actor\.role !== 'super_admin' && target\.scopeAllBranches === true/)
  assert.match(read('api', 'src', 'auth', 'roles.controller.ts'), /actor\.role !== 'super_admin' && user\.scopeAllBranches === true/)

  const service = read('api', 'src', 'auth', 'auth.service.ts')
  assert.match(service, /const scopeAllBranches = user\.role !== 'super_admin' && user\.scopeAllBranches === true/)
  assert.match(service, /\.\.\.\(scopeAllBranches \? \{ scopeAllBranches: true \} : \{\}\)/)

  const strategy = read('api', 'src', 'auth', 'jwt.strategy.ts')
  assert.match(strategy, /select: \['id', 'isActive', 'tokenVersion', 'scopeAllBranches', 'scopeBranchIds', 'branchId'\]/)
  // توكن شايل فروع صريحة أوسع من نطاق الحساب في القاعدة دلوقتي بيموت
  assert.match(strategy, /if \(!branchScopeCovers\(current, branchScopeOf\(payload\)\)\) \{\s+throw new UnauthorizedException/)
  assert.match(service, /\.\.\.\(branchIds !== null \? \{ branchIds \} : \{\}\)/)
  assert.match(strategy, /if \(payload\.scopeAllBranches === true && user\.scopeAllBranches !== true\) \{\s+throw new UnauthorizedException/)

  const entity = read('api', 'src', 'auth', 'user.entity.ts')
  assert.match(entity, /@Column\(\{ default: false \}\)\s+scopeAllBranches: boolean/)
  assert.match(entity, /@Column\(\{ type: 'nvarchar', length: 400, nullable: true \}\)\s+scopeBranchIds: string \| null/)
})

test('migration 064 is tied to the code letter by letter, additive, idempotent by construction and SQL Server 2019-safe', () => {
  const content = read(...MIGRATION)
  assert.deepEqual(migrate.forbiddenStatements(content), [])
  assert.doesNotMatch(migrate.stripComments(content), /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY|STRING_AGG|TRIM)\s*\(|IS\s+(NOT\s+)?DISTINCT\s+FROM|STRING_SPLIT\s*\(/i)
  assert.deepEqual(migrate.throwCodes(content), [56641, 56642, 56643, 56644, 56645])
  const files = migrate.discover()
  assert.deepEqual(migrate.analyze(files).problems, [], 'أكواد THROW فريدة بين كل الملفات وبلا عبارات ممنوعة')
  assert.equal(files.filter(file => file.version === '20260922_064_roles_scope_and_presets').length, 1)

  // اسم القيد الافتراضي = اللي TypeORM بيولّده (فرق المخطط صفر)
  const { DefaultNamingStrategy } = require('../node_modules/typeorm')
  const constraint = new DefaultNamingStrategy().defaultConstraintName('users', 'scopeAllBranches')
  assert.equal(constraint, 'DF_20a6fc998d6589e92bb17fe0946')
  assert.match(content, new RegExp(`IF COL_LENGTH\\(N'dbo\\.users', N'scopeAllBranches'\\) IS NULL\\s+ALTER TABLE dbo\\.users ADD \\[scopeAllBranches\\] bit NOT NULL CONSTRAINT \\[${constraint}\\] DEFAULT 0;`))

  // الأدوار الجديدة: نفس الكود والاسم والصلاحيات بالترتيب زي ROLE_PRESETS
  for (const code of ['asset_officer', 'hr_officer', 'payroll_disburser']) {
    const role = preset(code)
    assert.ok(content.includes(`N'${code}', N'${role.nameAr}', N'${JSON.stringify(role.permissions)}'`), code)
  }
  assert.match(content, /WHERE NOT EXISTS \(SELECT 1 FROM dbo\.roles r WHERE r\.code = n\.code\)/, 'الدور الموجود مايتلمسش')

  // التضييق: الحزمة القديمة والمعتمدة في الترحيل = اللي في الكود بالحرف
  for (const code of ['payroll_manager', 'read_only', 'data_entry']) {
    const row = content.match(new RegExp(`\\(N'${code}',\\s+N'(\\[[^']+\\])',\\s+N'(\\[[^']+\\])'\\)`))
    assert.ok(row, code)
    assert.deepEqual(JSON.parse(row[1]), LEGACY_SHIPPED_ROLE_PRESETS[code], `${code}: الحزمة القديمة`)
    assert.deepEqual(JSON.parse(row[2]), preset(code).permissions, `${code}: الحزمة المعتمدة`)
    assert.deepEqual(sorted(JSON.parse(row[1])), JSON.parse(row[1]), `${code}: القديمة مرتبة زي ما المستورد كتبها`)
  }
  // مطابقة بالحرف = نفس المجموعة (عدد + احتواء في الاتجاهين) بمقارنة ثنائية، والجلسات بتتقفل للدور اللي اتغيّر بس
  assert.match(content, /\(SELECT COUNT\(\*\) FROM OPENJSON\(r\.permissions\)\) = \(SELECT COUNT\(\*\) FROM OPENJSON\(p\.shipped\)\)/)
  assert.ok((content.match(/COLLATE Latin1_General_BIN2/g) ?? []).length >= 10)
  assert.match(content, /OUTPUT inserted\.code INTO #r64_changed \(code\)/)
  assert.match(content, /UPDATE u SET u\.tokenVersion = ISNULL\(u\.tokenVersion, 0\) \+ 1\s+FROM dbo\.users u\s+JOIN #r64_changed c/)
  // الترحيل مايفتحش نطاق أي حساب ومايكتبش في العمود الجديد
  assert.doesNotMatch(migrate.stripComments(content), /SET\s+\[?scopeAllBranches\]?\s*=/i)
})

test('legacy importer: a role with an approved preset is created from the preset, and trimmed permissions do not come back as per-user grants', () => {
  const source = read('api', 'scripts', 'legacy-import', 'users-assets.ts')
  assert.match(source, /const preset = ROLE_PRESETS\.find\(\(r\) => r\.code === code && !r\.permissions\.includes\('\*'\)\)/)
  assert.match(source, /const granted = preset \? \[\.\.\.preset\.permissions\] : \[\.\.\.perms\]\.filter\(\(p\) => !SA_ONLY\.has\(p\)\)\.sort\(\)/)
  assert.match(source, /const extras = \[\.\.\.userPerms\]\.filter\(\(p\) => !rolePerms\.includes\(p\) && !trimmedAway\.has\(p\)\)\.sort\(\)/)
  // دور الاختبار المتروك pr_test_42103 صف في القاعدة بس — مفيش كود بيبذره
  for (const file of [['api', 'src', 'seed', 'seed.ts'], ['api', 'src', 'auth', 'permissions.ts'], ['api', 'scripts', 'legacy-import', 'users-assets.ts']]) {
    assert.doesNotMatch(read(...file), /pr_test_/, file.join('/'))
  }
})

test('screens: the roles page shows the whole registry with search, copy and orphan flags; the users page shows effective permissions and the scope switch', () => {
  const roles = read('src', 'app', 'settings', 'roles', 'page.tsx')
  for (const text of ['fetchPermissionsRegistry', 'p.description', 'p.groupLabelAr', 'p.carriedBy.length === 0', 'مفيش دور شايلها', 'نسخ دور',
    'openCopyModal', 'presetDiff', 'رجّعه للحزمة المعتمدة', 'permSearch', 'modalSearch', 'اللي هيتغيّر لما تحفظ', 'يمنحها مدير النظام فقط']) {
    assert.ok(roles.includes(text), `شاشة الأدوار: ${text}`)
  }
  // الحفظ النضيف: الاسم بس لو اتغيّر، والصلاحيات بس لو اتغيّرت، وبترتيب السجل
  assert.match(roles, /\.\.\.\(nameChanged \? \{ nameAr: form\.nameAr \} : \{\}\),\s+\.\.\.\(permsChanged \? \{ permissions: ordered \} : \{\}\),/)
  assert.match(roles, /disabled=\{saving \|\| !dirty \|\|/)

  const users = read('src', 'app', 'settings', 'users', 'page.tsx')
  for (const text of ['نطاقه', 'كل الفروع', 'فرعه', 'يغيّره مدير النظام فقط', 'scopeAllBranches', 'صلاحيات المستخدم الفعلية', 'من الدور', 'منحة إضافية',
    'مسحوبة من دوره', 'permissionState', 'lockedScopeAllAccount', 'disabled={!isSuperAdmin}']) {
    assert.ok(users.includes(text), `شاشة المستخدمين: ${text}`)
  }
  // النطاق بيتبعت بس من مدير النظام ولما يتغيّر فعلًا
  assert.match(users, /isSuperAdmin &&\s+formData\.role !== 'super_admin' &&\s+formData\.scopeAllBranches !== \(editingUser\.scopeAllBranches === true\)/)

  const lib = read('src', 'lib', 'api.ts')
  assert.match(lib, /export const isCompanyWideUser = \(user: CurrentUser \| null \| undefined\): boolean =>\s+!!user && \(user\.role === 'super_admin' \|\| user\.scopeAllBranches === true\)/)
  // مرايا الواجهة لقاعدة النطاق بتسأل المساعد الواحد بدل مقارنة الدور بإيدها
  for (const file of [['src', 'components', 'CompanyWideReadOnly.tsx'], ['src', 'components', 'DefinitionBranchField.tsx'], ['src', 'app', 'settings', 'company', 'page.tsx'],
    ['src', 'app', 'settings', 'branches', 'page.tsx']]) {
    assert.match(read(...file), /isCompanyWideUser\(/, file.join('/'))
  }
  // مسؤول الأصول بلا employees.view: منتقي الموظف من الدليل المختصر
  assert.match(read('src', 'app', 'employees', 'custody', 'page.tsx'), /can\('employees\.view'\)\s+\? fetchEmployees\(\)\s+: fetchEmployeeDirectory\(\)/)
})

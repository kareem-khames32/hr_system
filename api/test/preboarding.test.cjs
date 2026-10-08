'use strict'
// B3.1 (ب): بوابة التهيئة قبل المباشرة — فحص من غير قاعدة (الدورة الفعلية في preboarding.integration.cjs):
//  PG-01) القواعد: العلامة قافلة لحد يوم المباشرة بس، ومدير النظام وحساب من غير موظف برّه البوابة، والدخول بيسأل اللي مسجّل نفسه.
//  PG-02) الربط: الميزة مقفولة افتراضيًا، والحارس بعد بوابتي كلمة المرور وتطبيق المصادقة، والجلسة من غير صلاحيات، والمسارات المسموحة
//         هي شاشات التهيئة بس.
//  PG-03) الواجهة: التوجيه لـ«مستنداتي»، وشاشات التهيئة بس في القايمة، وسطر الترحيب.
// Run (من api/): node --test test/preboarding.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const rules = require('../src/auth/preboarding')
const { MODULES } = require('../src/modules-registry/registry')
const root = path.resolve(__dirname, '..', '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n')

test('PG-01: the mark closes the session until the start day only; a system admin and an unlinked account stay outside', async () => {
  assert.equal(rules.localYmd(new Date(2026, 9, 8, 23, 59)), '2026-10-08')
  const active = (until, today) => rules.preboardingActive({ preboardingUntil: until }, today)
  assert.deepEqual([active('2026-10-20', '2026-10-08'), active('2026-10-20', '2026-10-19'), active('2026-10-20', '2026-10-20'), active('2026-10-20', '2026-10-21')], [true, true, false, false])
  for (const bad of [undefined, null, '', 'soon', '2026-10', '20261020', 20261020, true, {}]) assert.equal(active(bad, '2026-10-08'), false, String(bad))
  assert.equal(rules.preboardingActive(undefined, '2026-10-08'), false)
  assert.match(rules.preboardingMessage('2026-10-20'), /بوابة التهيئة لحد تاريخ مباشرتك 2026-10-20/)
  // من غير مسجّل: الدخول عادي. والمسجّل بيتسأل برقم الموظف، لحساب مربوط بموظف ومش مدير نظام
  rules.bindPreboarding(null)
  assert.equal(await rules.preboardingUntilOf({ id: 1, role: 'employee', employeeId: 5 }), null)
  const asked = []
  rules.bindPreboarding(async employeeId => { asked.push(employeeId); return employeeId === 5 ? '2026-10-20' : employeeId === 6 ? 'not-a-date' : null })
  try {
    assert.equal(await rules.preboardingUntilOf({ id: 1, role: 'employee', employeeId: 5 }), '2026-10-20')
    assert.equal(await rules.preboardingUntilOf({ id: 1, role: 'hr_manager', employeeId: 5 }), '2026-10-20', 'أي دور غير مدير النظام')
    assert.equal(await rules.preboardingUntilOf({ id: 1, role: 'employee', employeeId: 6 }), null, 'رد مش تاريخ = من غير علامة')
    assert.equal(await rules.preboardingUntilOf({ id: 1, role: 'employee', employeeId: 7 }), null)
    assert.equal(await rules.preboardingUntilOf({ id: 1, role: 'super_admin', employeeId: 5 }), null)
    assert.equal(await rules.preboardingUntilOf({ id: 1, role: 'employee', employeeId: null }), null)
    assert.deepEqual(asked, [5, 5, 6, 7])
  } finally { rules.bindPreboarding(null) }
})

test('PG-02: the feature is closed by default; the guard, the permission-less session, and the allowed routes', () => {
  const feature = MODULES.onboarding.features[rules.PREBOARDING_FEATURE]
  assert.deepEqual([rules.PREBOARDING_FEATURE, feature.default, typeof feature.nameAr], ['onboarding.preboarding', false, 'string'])
  const guards = read('api/src/auth/guards.ts')
  const guard = guards.slice(guards.indexOf('export class JwtAuthGuard'), guards.indexOf('// @CurrentUser()'))
  assert.match(guard, /preboardingActive\(payload as JwtPayload \| undefined\) &&\n\s+!Reflect\.getMetadata\(ALLOW_PREBOARDING_KEY, context\.getHandler\(\)\) &&\n\s+!Reflect\.getMetadata\(ALLOW_PREBOARDING_KEY, context\.getClass\(\)\)/)
  assert.ok(guard.indexOf('TOTP_SETUP_REQUIRED') < guard.indexOf('PREBOARDING_ONLY'), 'بعد بوابتي كلمة المرور وتطبيق المصادقة')
  const auth = read('api/src/auth/auth.service.ts')
  assert.match(auth, /const preboardingUntil = await preboardingUntilOf\(user\)\n\s+const permissions = preboardingUntil \? \[\] : await this\.resolvePermissions\(user\)/)
  assert.match(auth, /\.\.\.\(preboardingUntil \? \{ preboardingUntil \} : \{\}\),\n    \}/)
  assert.match(auth, /\.\.\.\(preboardingActive\(payload\) \? \{ preboardingUntil: payload\.preboardingUntil \} : \{\}\)/)
  const onboarding = read('api/src/onboarding/onboarding.service.ts')
  assert.match(onboarding, /bindPreboarding\(\(employeeId\) => this\.preboardingUntil\(employeeId\)\)/)
  assert.match(onboarding, /if \(!\(await this\.modules\.isEnabled\('onboarding'\)\) \|\| !\(await this\.modules\.isFeatureEnabled\(PREBOARDING_FEATURE\)\)\) return null/)
  assert.match(onboarding, /const start = String\(emp\.actualStartDate \|\| emp\.joinDate \|\| ''\)\.slice\(0, 10\)/)
  // المسارات المسموحة: المتحكمات دي بس، وكل واحد بعدد مساراته بالظبط (إضافة مسار جديد للبوابة لازم تتغيّر هنا)
  const allowed = { 'api/src/auth/auth.controller.ts': 1, 'api/src/modules-registry/modules.controller.ts': 1, 'api/src/policies/policies.controller.ts': 5,
    'api/src/assets/hiring-documents.controller.ts': 1, 'api/src/assets/docs.controller.ts': 1, 'api/src/files/files.controller.ts': 1, 'api/src/tasks/tasks.controller.ts': 4,
    'api/src/assets/portal.controller.ts': 2 }
  for (const [file, count] of Object.entries(allowed)) assert.equal(read(file).split('@AllowPreboarding()\n').length - 1, count, file)
  const sources = require('node:child_process').execFileSync('git', ['grep', '-l', '@AllowPreboarding()', '--', 'api/src'], { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/).sort()
  // (الحارس وملف القواعد بيذكروا العلامة في تعليق بس)
  assert.deepEqual(sources, [...Object.keys(allowed), 'api/src/auth/guards.ts', 'api/src/auth/preboarding.ts'].sort())
  assert.match(read('api/src/auth/auth.controller.ts'), /@AllowPreboarding\(\)\n@Controller\('auth'\)/)
  for (const route of ["@Get('mine')", "@Get('mine/count')", "@Get(':id')", "@Post(':id/status')"]) assert.ok(read('api/src/tasks/tasks.controller.ts').includes(`@AllowPreboarding()\n  ${route}\n`), route)
  for (const route of ["@Get('notifications')", "@Patch('notifications/read')"]) assert.ok(read('api/src/assets/portal.controller.ts').includes(`@AllowPreboarding()\n  ${route}\n`), route)
})

test('PG-03: the web app sends a pre-boarding account to its documents, lists the pre-boarding screens only, and greets it with the start date', () => {
  const lib = read('src/lib/preboarding.ts')
  assert.match(lib, /export const PREBOARDING_PATHS = \['\/my\/documents', '\/my\/policies', '\/my\/tasks', '\/notifications', '\/profile\/security'\]/)
  assert.match(lib, /localToday\(\) < until \? until : null/)
  const shell = read('src/components/layout/MainLayout.tsx')
  assert.match(shell, /if \(preboardingUntil\(\) && !preboardingPathAllowed\(pathname\)\) \{\n\s+window\.location\.href = PREBOARDING_HOME\n\s+return/)
  assert.match(shell, /\{startsOn && \(/)
  const sidebar = read('src/components/layout/Sidebar.tsx')
  assert.match(sidebar, /if \(preboardingUntil\(currentUser\)\) return portalItems\.filter\(\(item\) => !!item\.href && preboardingPathAllowed\(item\.href\) && available\(item\.href\)\)/)
  assert.match(read('src/lib/api.ts'), /preboardingUntil\?: string/)
})

test('Codex P3L-B01: a pre-boarding session sees only the task that awaits itself — no manager, assigner or task-admin authority', async () => {
  const { taskAccess } = require('../src/tasks/task-rules')
  const until = new Date(Date.now() + 5 * 86400000), ymd = `${until.getFullYear()}-${String(until.getMonth() + 1).padStart(2, '0')}-${String(until.getDate()).padStart(2, '0')}`
  const structure = { directManagerOf: async () => 7, isUnder: async () => true }
  const task = extra => ({ id: 1, assigneeEmployeeId: 9, assigneeRole: null, branchId: 1, createdByUserId: 3, isPersonal: false, ...extra })
  const manager = { sub: 3, role: 'employee', employeeId: 7, branchId: 1, permissions: [] }
  // جلسة عادية: المدير المباشر بيشوف، واللي كلّف بيها ومسؤولها تحته بيديرها
  assert.deepEqual(await taskAccess(manager, task(), structure), { visible: true, work: false, manage: true })
  // نفس الحساب قبل المباشرة: ولا حاجة — حتى بصلاحية إدارة المهام لو التوكن شايلها
  for (const session of [{ ...manager, preboardingUntil: ymd }, { ...manager, preboardingUntil: ymd, permissions: ['tasks.manage', 'tasks.view_all'] }]) {
    assert.deepEqual(await taskAccess(session, task(), structure), { visible: false, work: false, manage: false })
    assert.deepEqual(await taskAccess(session, task({ isPersonal: true }), structure), { visible: false, work: false, manage: false })
    // ومهمته هو بتفضل له
    assert.deepEqual(await taskAccess(session, task({ assigneeEmployeeId: 7 }), structure), { visible: true, work: true, manage: false })
  }
  // تاريخ المباشرة جه: الجلسة رجعت عادية
  assert.equal((await taskAccess({ ...manager, preboardingUntil: '2020-01-01' }, task(), structure)).visible, true)
})

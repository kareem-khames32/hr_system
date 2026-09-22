'use strict'
// مزامنة حسابات الدومين + المُطابِق المشترك — بلا قاعدة بيانات وبلا أي اتصال بالدليل.
// السبب اللي المزامنة موجودة له (قرار المالك 22 سبتمبر): الربط «في لحظته» لوحده معناه إن الحساب
// مايظهرش في شاشة المستخدمين غير بعد أول دخول، فالمالك مش قادر يسند دور أو صلاحية لحد قبل كده.
//
// اللي بيتأكد هنا:
//   أ) التطبيع: الأصفار البادئة مالهاش قيمة في الكود/البصمة، وبريد الأصفار جزء منه
//   ب) ترتيب المطابقة بالحرف: employeeCode ← fingerprintCode ← mail ← UPN، وأول ما ينجح بيوقف
//   ج) الغموض: قيمة بتطابق أكتر من موظف = رفض، ومفيش رجوع للخطوة اللي بعدها (ممنوع التخمين)
//   د) حالة الموظف اللي تقفل الحساب، وحساب الجهاز/الخدمة
//   هـ) كل سبب تخطّي له رسالة عربية، ومفيش سبب بلا نص
//   و) السكربت: معاينة افتراضيًّا، بلا NestJS، ومفيش سر بيتطبع
//   ز) الخادم والواجهة: الحراسة، والمعاينة قبل التأكيد، وعلامة «حساب دومين»
// الملفات على القرص CRLF — كل قراءة مصدر بتتطبّع.
// Run: node --test api/test/domain-users-sync.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(apiRoot, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')

const m = require('../src/auth/domain-match')
const { isNonPersonAccount } = require('../src/auth/directory.types')
const { DOMAIN_SYNC_REASONS, DOMAIN_SYNC_ACTIONS } = require('../src/auth/domain-sync.service')
const { domainEmailCandidates } = require('../src/auth/domain-login.service')

const read = (...parts) => fs.readFileSync(path.join(repoRoot, ...parts), 'utf8').replace(/\r\n/g, '\n')
const isArabic = (text) => /[؀-ۿ]/.test(String(text))

let seq = 0
const emp = (overrides = {}) => ({
  id: ++seq,
  employeeCode: `EMP-${String(seq).padStart(4, '0')}`,
  fingerprintCode: null,
  fullName: `موظف ${seq}`,
  email: null,
  branchId: 1,
  status: 'active',
  archivedAt: null,
  isActive: true,
  ...overrides,
})
const ad = (overrides = {}) => ({
  objectGuid: `guid-${++seq}`,
  sAMAccountName: `user${seq}`,
  userPrincipalName: `user${seq}@maharah.local`,
  mail: null,
  displayName: null,
  employeeId: null,
  disabled: false,
  ...overrides,
})
const match = (account, employees) => m.matchEmployeeForDirectory(account, m.employeeMatchIndex(employees))

// ============================================================================
// أ) التطبيع
// ============================================================================

test('MATCH1 — مفتاح الكود: قصّ وتوحيد حالة الأحرف وشيل الأصفار البادئة (وبيفضل حرف على الأقل)', () => {
  assert.equal(m.normalizeCodeKey('  00123 '), '123')
  assert.equal(m.normalizeCodeKey('123'), '123')
  assert.equal(m.normalizeCodeKey('EMP-0007'), 'emp-0007') // الصفر في النص مش بادئ
  assert.equal(m.normalizeCodeKey('0EMP-7'), 'emp-7')
  // «000» مابتبقاش فاضية — وإلا كانت تطابق كل موظف بلا كود
  assert.equal(m.normalizeCodeKey('000'), '0')
  assert.equal(m.normalizeCodeKey('0'), '0')
  assert.equal(m.normalizeCodeKey(''), '')
  assert.equal(m.normalizeCodeKey('   '), '')
  assert.equal(m.normalizeCodeKey(null), '')
  assert.equal(m.normalizeCodeKey(undefined), '')
  assert.equal(m.normalizeCodeKey(12345), '') // مش نص = مفيش مفتاح
})

test('MATCH2 — مفتاح البريد: قصّ وتوحيد حالة بس — الأصفار جزء من العنوان', () => {
  assert.equal(m.normalizeEmailKey('  Sami@Maharah.PRO '), 'sami@maharah.pro')
  assert.equal(m.normalizeEmailKey('0x@y.com'), '0x@y.com', 'ممنوع شيل صفر من بريد')
  assert.equal(m.normalizeEmailKey(null), '')
})

test('MATCH3 — مرشّحات الأصفار: المفتاح + كل تصفير ممكن لطول العمود، ومفيش أطول من العمود', () => {
  assert.deepEqual(m.codeMatchCandidates('123', 5), ['123', '0123', '00123'])
  assert.deepEqual(m.codeMatchCandidates('', 20), [])
  const wide = m.codeMatchCandidates('7', m.FINGERPRINT_CODE_LENGTH)
  assert.equal(wide.length, m.FINGERPRINT_CODE_LENGTH)
  assert.equal(wide[0], '7')
  assert.equal(wide[wide.length - 1], '0'.repeat(m.FINGERPRINT_CODE_LENGTH - 1) + '7')
  for (const candidate of wide) assert.ok(candidate.length <= m.FINGERPRINT_CODE_LENGTH, candidate)
  // وكل مرشّح بيطبّع لنفس المفتاح — ده اللي بيخلي الفهرس الداخلي والقاعدة يجاوبوا نفس الجواب
  for (const candidate of wide) assert.equal(m.normalizeCodeKey(candidate), '7')
  assert.equal(m.EMPLOYEE_CODE_LENGTH, 20)
  assert.equal(m.FINGERPRINT_CODE_LENGTH, 40)
})

// ============================================================================
// ب) ترتيب المطابقة
// ============================================================================

test('MATCH4 — الترتيب بالحرف: كود الموظف ← رقم البصمة ← بريد AD ← الـUPN، وأول ما ينجح بيوقف', async () => {
  const byCode = emp({ employeeCode: 'A100' })
  const byFinger = emp({ employeeCode: 'B200', fingerprintCode: 'A100' })
  const byMail = emp({ employeeCode: 'C300', email: 'x@maharah.pro' })
  const byUpn = emp({ employeeCode: 'D400', email: 'u@maharah.local' })
  const all = [byCode, byFinger, byMail, byUpn]

  // 1) الكود بيكسب على البصمة وإن كانت نفس القيمة بتطابق الاتنين
  const first = await match(ad({ employeeId: 'A100', mail: 'x@maharah.pro', userPrincipalName: 'u@maharah.local' }), all)
  assert.equal(first.kind, 'matched')
  assert.equal(first.employee.id, byCode.id)
  assert.equal(first.via, 'employeeCode')

  // 2) مفيش كود مطابق → البصمة
  const second = await match(ad({ employeeId: 'A100', mail: 'x@maharah.pro' }), [byFinger, byMail])
  assert.equal(second.via, 'fingerprintCode')
  assert.equal(second.employee.id, byFinger.id)

  // 3) مفيش employeeID خالص → بريد AD
  const third = await match(ad({ mail: 'X@Maharah.PRO', userPrincipalName: 'u@maharah.local' }), all)
  assert.equal(third.via, 'mail')
  assert.equal(third.employee.id, byMail.id)

  // 4) بريد AD فاضي → الـUPN
  const fourth = await match(ad({ mail: null, userPrincipalName: 'U@Maharah.local' }), all)
  assert.equal(fourth.via, 'userPrincipalName')
  assert.equal(fourth.employee.id, byUpn.id)

  // مفيش ولا واحدة
  const none = await match(ad({ employeeId: 'ZZZ', mail: 'nobody@nowhere.example' }), all)
  assert.equal(none.kind, 'none')
})

test('MATCH5 — رقم البصمة بالأصفار البادئة: «00123» بتطابق «123» والعكس (السبب اللي 323 موظف اتعلّقوا عليه)', async () => {
  const padded = emp({ employeeCode: 'P1', fingerprintCode: '00123' })
  const bare = emp({ employeeCode: 'P2', fingerprintCode: '123' })

  // AD فيه «123» والبصمة عندنا «00123»
  const a = await match(ad({ employeeId: '123' }), [padded])
  assert.equal(a.kind, 'matched')
  assert.equal(a.employee.id, padded.id)
  assert.equal(a.via, 'fingerprintCode')

  // والعكس: AD فيه «00123» والبصمة عندنا «123»
  const b = await match(ad({ employeeId: '00123' }), [bare])
  assert.equal(b.kind, 'matched')
  assert.equal(b.employee.id, bare.id)

  // ومسافات حوالين القيمة مابتفرقش
  const c = await match(ad({ employeeId: '  0123  ' }), [bare])
  assert.equal(c.kind, 'matched')
  assert.equal(c.employee.id, bare.id)

  // وكود الموظف كمان بيتطابق بلا أصفار
  const d = await match(ad({ employeeId: '00045' }), [emp({ employeeCode: '45' })])
  assert.equal(d.via, 'employeeCode')
})

// ============================================================================
// ج) الغموض — رفض صريح ومفيش تخمين
// ============================================================================

test('MATCH6 — قيمة بتطابق أكتر من موظف = غموض مرفوض، وممنوع الرجوع للخطوة اللي بعدها', async () => {
  // موظفين بنفس البصمة (واحد «123» والتاني «0123»): الأصفار خلّت القيمة نفسها
  const one = emp({ employeeCode: 'G1', fingerprintCode: '123', email: 'shared@maharah.pro' })
  const two = emp({ employeeCode: 'G2', fingerprintCode: '0123' })
  const safe = emp({ employeeCode: 'G3', email: 'safe@maharah.pro' })
  const ambiguous = await match(
    ad({ employeeId: '123', mail: 'safe@maharah.pro' }),
    [one, two, safe]
  )
  assert.equal(ambiguous.kind, 'ambiguous')
  assert.equal(ambiguous.via, 'fingerprintCode')
  assert.equal(ambiguous.employees.length, 2)
  // الأهم: البريد كان بيطابق موظف واحد بالظبط — ومع ذلك مفيش رجوع له. الرقم نفسه مش موثوق.
  assert.notEqual(ambiguous.kind, 'matched')

  // غموض في الكود كذلك
  const codes = await match(ad({ employeeId: '9' }), [emp({ employeeCode: '9' }), emp({ employeeCode: '009' })])
  assert.equal(codes.kind, 'ambiguous')
  assert.equal(codes.via, 'employeeCode')

  // وغموض في البريد كذلك
  const mails = await match(ad({ mail: 'dup@maharah.pro' }), [
    emp({ employeeCode: 'M1', email: 'dup@maharah.pro' }),
    emp({ employeeCode: 'M2', email: 'DUP@maharah.pro' }),
  ])
  assert.equal(mails.kind, 'ambiguous')
  assert.equal(mails.via, 'mail')
})

test('MATCH7 — نفس الموظف بيرجع من أكتر من خانة مش غموض، والقيم الفاضية مابتطابقش حاجة', async () => {
  // موظف واحد كوده وبصمته نفس الرقم — مفيش غموض، ده هو
  const same = emp({ employeeCode: '500', fingerprintCode: '500' })
  const single = await match(ad({ employeeId: '500' }), [same])
  assert.equal(single.kind, 'matched')
  assert.equal(single.employee.id, same.id)

  // موظفين بلا كود بصمة وبلا بريد: قيمة فاضية في AD مابتطابقهمش
  const blanks = [emp({ fingerprintCode: '', email: '' }), emp({ fingerprintCode: null, email: null })]
  assert.equal((await match(ad({ employeeId: '   ', mail: '  ' }), blanks)).kind, 'none')
  assert.equal((await match(ad({}), blanks)).kind, 'none')
  // و«000» في AD مابتطابقش موظف بلا بصمة
  assert.equal((await match(ad({ employeeId: '000' }), blanks)).kind, 'none')
})

test('MATCH8 — كل خانة مطابقة لها اسم عربي للتقرير', () => {
  for (const via of ['employeeCode', 'fingerprintCode', 'mail', 'userPrincipalName']) {
    const label = m.DOMAIN_MATCH_VIA_LABELS[via]
    assert.ok(label && isArabic(label), `${via}: ${label}`)
  }
})

// ============================================================================
// د) حالة الموظف وحساب الجهاز/الخدمة
// ============================================================================

test('SYNC1 — الموظف الأرشيف/المنتهي/غير النشط مقفول، والنشط مفتوح', () => {
  assert.equal(m.employeeBlockReason(emp()), null)
  assert.equal(m.employeeBlockReason(emp({ status: 'probation' })), null)
  assert.equal(m.employeeBlockReason(emp({ status: 'archived' })), 'ended')
  assert.equal(m.employeeBlockReason(emp({ status: 'terminated' })), 'ended')
  assert.equal(m.employeeBlockReason(emp({ archivedAt: new Date() })), 'ended')
  assert.equal(m.employeeBlockReason(emp({ isActive: false })), 'inactive')
  // الأرشفة أقوى من عدم التنشيط (السبب الأدق بيتقال)
  assert.equal(m.employeeBlockReason(emp({ status: 'archived', isActive: false })), 'ended')
})

test('SYNC2 — حساب الجهاز أو الخدمة مش شخص', () => {
  assert.equal(isNonPersonAccount({ sAMAccountName: 'DC01$' }), true)
  assert.equal(isNonPersonAccount({ sAMAccountName: 'svc', objectClasses: ['top', 'computer'] }), true)
  assert.equal(isNonPersonAccount({ sAMAccountName: 'gmsa', objectClasses: ['msDS-GroupManagedServiceAccount'] }), true)
  assert.equal(isNonPersonAccount({ sAMAccountName: 'sami', objectClasses: ['top', 'person', 'user'] }), false)
  assert.equal(isNonPersonAccount({ sAMAccountName: 'sami' }), false)
})

test('SYNC3 — بريد الحساب الجديد بالترتيب: AD ثم نسختنا ثم الـUPN، بلا تكرار وبلا عنوان بلا @', () => {
  const employee = emp({ email: 'ours@maharah.local' })
  assert.deepEqual(
    domainEmailCandidates(ad({ mail: 'AD@maharah.pro', userPrincipalName: 'upn@maharah.local' }), employee),
    ['ad@maharah.pro', 'ours@maharah.local', 'upn@maharah.local']
  )
  // بريد AD فاضي → نسختنا الأول
  assert.deepEqual(
    domainEmailCandidates(ad({ mail: null, userPrincipalName: 'upn@maharah.local' }), employee),
    ['ours@maharah.local', 'upn@maharah.local']
  )
  // نفس العنوان مرتين = مرة واحدة، ونص بلا @ مابيتحسبش
  assert.deepEqual(
    domainEmailCandidates(ad({ mail: 'same@x.com', userPrincipalName: 'SAME@x.com' }), emp({ email: 'not-an-email' })),
    ['same@x.com']
  )
})

// ============================================================================
// هـ) الأسباب كلها بالعربي
// ============================================================================

test('SYNC4 — كل سبب تخطّي/تعارض وكل إجراء له نص عربي، ومفيش نص فاضي', () => {
  const reasons = ['noObjectGuid', 'notPerson', 'adDisabled', 'alreadyLinked', 'noMatch', 'ambiguous',
    'employeeEnded', 'employeeInactive', 'userInactive', 'guidConflict', 'emailTaken', 'duplicateEmployee', 'failed']
  assert.deepEqual(Object.keys(DOMAIN_SYNC_REASONS).sort(), [...reasons].sort())
  for (const [key, text] of Object.entries(DOMAIN_SYNC_REASONS)) {
    assert.ok(text && isArabic(text), `${key}: ${text}`)
  }
  assert.deepEqual(Object.keys(DOMAIN_SYNC_ACTIONS).sort(), ['conflict', 'create', 'link', 'skip'])
  for (const [key, text] of Object.entries(DOMAIN_SYNC_ACTIONS)) {
    assert.ok(text && isArabic(text), `${key}: ${text}`)
  }
})

// ============================================================================
// و) المصدر: مفيش روتين إنشاء تاني، ومفيش سر بيتطبع
// ============================================================================

test('SRC-SYNC1 — الإنشاء والربط في مكان واحد: المزامنة بتنادي DomainLoginService مش بتكتب users بنفسها', () => {
  const sync = read('api/src/auth/domain-sync.service.ts')
  assert.match(sync, /this\.domainLogin\.createDomainOnlyUser\(/)
  assert.match(sync, /this\.domainLogin\.linkExistingUser\(/)
  // ممنوع أي كتابة مباشرة على جدول المستخدمين من المزامنة
  assert.doesNotMatch(sync, /this\.users\.(save|insert|update|delete|remove)\(/)
  assert.doesNotMatch(sync, /this\.employees\.(save|insert|update|delete|remove)\(/)
  // ومفيش bcrypt هنا: كلمة المرور غير القابلة للاستخدام بتتعمل في مسار الدخول الواحد
  assert.doesNotMatch(sync, /bcrypt/)
  // والمطابقة من الملف المشترك
  assert.match(sync, /matchEmployeeForDirectory/)
  assert.match(sync, /employeeMatchIndex/)
  // معاينة افتراضيًّا: apply لازم تكون true بالحرف
  assert.match(sync, /options\.apply === true/)
  // الدور الأدنى وبلا صلاحيات — من مسار الإنشاء الواحد
  const login = read('api/src/auth/domain-login.service.ts')
  assert.match(login, /role: 'employee'/)
  assert.match(login, /permissions: null/)
  assert.match(login, /unusablePasswordHash\(\)/)
  // الربط مابيغيّرش غير العمود الناقص — ولا دور ولا صلاحيات ولا بريد ولا تفعيل
  assert.match(login, /if \(existing\.domainObjectGuid\) return false/)
  assert.match(login, /\{ domainObjectGuid: directory\.objectGuid \}/)
})

test('SRC-SYNC2 — السرد قراءة فقط بحساب الخدمة، بصفحات، وبلا أي مجموعة', () => {
  const service = read('api/src/auth/directory.service.ts')
  assert.match(service, /async listUsers\(\)/)
  // حساب خدمة إلزامي للسرد (مفيش bind بكلمة أي مستخدم)
  assert.match(service, /listUsers[\s\S]{0,900}config\.bindDn/)
  // بصفحات: الدليل الحيّ فيه 827 كائن وAD بيقطع عند 1000
  assert.match(service, /paged: \{ pageSize: LIST_PAGE_SIZE \}/)
  assert.ok(/const LIST_PAGE_SIZE = (\d+)/.exec(service), 'حجم الصفحة لازم يكون معلنًا')
  assert.ok(Number(/const LIST_PAGE_SIZE = (\d+)/.exec(service)[1]) <= 1000)
  // الأجهزة مستثناة من الفلتر نفسه
  assert.match(service, /objectCategory=person/)
  assert.match(service, /!\(objectClass=computer\)/)
  // مفيش كتابة على الدليل أبدًا
  assert.doesNotMatch(service, /\.(add|modify|modifyDN|del|delete)\(/)
})

test('SRC-SYNC3 — السكربت: معاينة افتراضيًّا، بلا NestJS، ومفيش سر بيتطبع', () => {
  const script = read('api/scripts/sync-domain-users.cjs')
  // الافتراضي معاينة: الكتابة محتاجة --apply بالحرف
  assert.match(script, /const wantApply = flag\('--apply'\)/)
  assert.match(script, /sync\.run\(\{ apply: wantApply \}\)/)
  assert.match(script, /--apply/)
  // بلا bootstrap للتطبيق: DataSource مستقل، مفيش NestFactory ولا HTTP
  assert.doesNotMatch(script, /NestFactory|@nestjs\/core|app\.listen|fetch\(/)
  assert.match(script, /new DataSource\(/)
  // نفس خدمات الخادم (مفيش منطق تاني في السكربت)
  assert.match(script, /new DomainSyncService\(/)
  assert.match(script, /new DomainLoginService\(/)
  assert.match(script, /new DirectoryService\(/)
  // الأسرار: بتتمسح من أي مخرج، وقيمتها عمرها ما بتتلحّم على نص مطبوع
  assert.match(script, /const secrets = \[process\.env\.AD_BIND_PASSWORD, process\.env\.DB_PASSWORD\]/)
  assert.match(script, /out\.split\(secret\)\.join\('\*\*\*'\)/)
  assert.doesNotMatch(script, /\$\{process\.env\.AD_BIND_PASSWORD\}|\$\{process\.env\.DB_PASSWORD\}/)
  assert.doesNotMatch(script, /\$\{config\.bindPassword\}|\$\{directory\.config\.bindPassword\}/)
  // كلمة حساب الخدمة بتظهر «مضبوطة / فاضية» بس
  assert.match(script, /bindPassword \? '\(مضبوطة — مش بتتطبع\)' : '\(فاضية\)'/)
  // كل console.log بيمر على المسح
  assert.equal((script.match(/console\.log\(/g) || []).length, 1)
  assert.match(script, /const say = \(line\) => console\.log\(scrub\(line\)\)/)
  // ومفيش حذف ولا تعديل جماعي
  assert.doesNotMatch(script, /\bDELETE\b|\bDROP\b|\bTRUNCATE\b|\bUPDATE dbo\./i)
})

test('SRC-SYNC4 — مفيش تسجيل لكلمة مرور في ملفات المزامنة الجديدة', () => {
  for (const file of ['api/src/auth/domain-sync.service.ts', 'api/src/auth/domain-match.ts']) {
    const source = read(file)
    const logLines = source.split('\n').filter((line) => /logger\.(log|warn|error|debug)|console\.(log|warn|error)/.test(line))
    for (const line of logLines) {
      assert.doesNotMatch(line, /\bpassword\b/i, `${file}: سطر تسجيل فيه كلمة مرور → ${line.trim()}`)
      assert.doesNotMatch(line, /\bbindPassword\b/, `${file}: سطر تسجيل فيه كلمة حساب الخدمة → ${line.trim()}`)
    }
  }
})

// ============================================================================
// ز) الخادم والواجهة
// ============================================================================

test('SRC-SYNC5 — المسار محروس بـusers.manage ونطاق كل الفروع، والقائمة بتعلّم حساب الدومين', () => {
  const controller = read('api/src/auth/users.controller.ts')
  // الحراسة على مستوى الكلاس كله
  assert.match(controller, /@Perm\('users\.manage'\)\n@Controller\('users'\)/)
  assert.match(controller, /@Post\('domain-sync'\)/)
  assert.match(controller, /domainSyncRun[\s\S]{0,300}branchScopeOf\(actor\) !== null[\s\S]{0,120}ForbiddenException/)
  assert.match(controller, /DOMAIN_SYNC_COMPANY_WIDE_ONLY/)
  assert.ok(isArabic(/DOMAIN_SYNC_COMPANY_WIDE_ONLY =\s*\n?\s*'([^']+)'/.exec(controller)[1]))
  // التطبيق محتاج apply=true صريحة
  assert.match(controller, /this\.domainSync\.run\(\{ apply: dto\.apply === true \}\)/)
  // علامة «حساب دومين» في القائمة، ومفيش hash بيخرج
  assert.match(controller, /isDomainAccount: !!rest\.domainObjectGuid/)
  assert.match(controller, /passwordHash: _ph/)
})

test('SRC-SYNC6 — الشاشة: معاينة قبل التأكيد، وعلامة «حساب دومين»، وعربي RTL زي جيرانها', () => {
  const page = read('src/app/settings/users/page.tsx')
  assert.match(page, /مزامنة حسابات الدومين/)
  // فتح المودال = معاينة (apply=false)، والتطبيق زر تاني منفصل
  assert.match(page, /const openSync = async \(\)[\s\S]{0,400}syncDomainUsers\(false\)/)
  assert.match(page, /const applySync = async \(\)[\s\S]{0,300}syncDomainUsers\(true\)/)
  assert.match(page, /دي <span className="font-bold">معاينة<\/span>/)
  // زر التطبيق مقفول وقت الشغل أو لما مفيش حاجة تتعمل
  assert.match(page, /syncPreview\.counts\.create \+ syncPreview\.counts\.link === 0/)
  // الأسباب بتتعرض بقايمة يقدر يفلتر بيها، والصفوف في قايمة بتتسكرول
  assert.match(page, /syncShown\.reasons\.map/)
  assert.match(page, /max-h-72 overflow-y-auto/)
  // العلامة في قائمة المستخدمين
  assert.match(page, /user\.isDomainAccount && \(/)
  assert.match(page, /حساب دومين/)
  // الزر مايظهرش لحساب مقفول على فرع (مرآة رفض الخادم)
  assert.match(page, /isCompanyWide && \(/)
  assert.match(page, /setIsCompanyWide\(isCompanyWideUser\(me\)\)/)
  // طبقة الاتصال: معاينة افتراضيًّا
  const api = read('src/lib/api.ts')
  assert.match(api, /export const syncDomainUsers = \(apply = false\) =>/)
  assert.match(api, /post<ApiDomainSyncSummary>\('\/users\/domain-sync', \{ apply \}\)/)
  assert.match(api, /isDomainAccount\?: boolean/)
})

test('SRC-SYNC7 — .env.example بيشرح مفتاح حساب الخدمة المطلوب للمزامنة بلا أي قيمة سر', () => {
  const example = read('api/.env.example')
  assert.match(example, /sync-domain-users\.cjs/)
  assert.match(example, /^#\s*AD_BIND_PASSWORD=$/m)
})

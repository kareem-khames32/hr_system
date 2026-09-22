'use strict'
// الدخول بحساب الشركة (Active Directory) والتحقق بخطوتين برمز بريد — بلا قاعدة بيانات وبلا أي اتصال:
// - قراءة الإعداد من البيئة: المجال مقفول بلا AD_HOST، والبريد ناقص بلا SMTP_HOST/SMTP_FROM
// - LDAPS مقفول أو شهادة غير متحقَّق منها = تحذير إقلاع صريح (مفيش قبول صامت)
// - تطبيع اسم الدخول (sam / DOMAIN\sam / UPN)، هروب فلتر LDAP، objectGUID المختلط، بِت الحساب المتوقف
// - مسح أي كلمة مرور من نص الخطأ، وتقنيع عنوان البريد
// - بوابة الفتح: التحقق بخطوتين مايتفتحش وخادم البريد مش مضبوط (منع قفل الشركة كلها برّه النظام)
// - المصدر نفسه: مفيش تسجيل لكلمة مرور، الرمز مخزَّن hash، والمفتاح مبذور 'false'
// - ترحيل 066: إضافي، آمن للتكرار، أكواد THROW فريدة 66xxx، متوافق مع SQL Server 2019، وأسماء TypeORM
// - سكربت الطوارئ وسكربت فحص البريد موجودين وبيعملوا اللي مكتوب عليهم
// الملفات على القرص CRLF — كل قراءة مصدر بتتطبّع.
// Run: node --test api/test/domain-login-two-factor.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(apiRoot, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')

const directory = require('../src/auth/directory.types')
const mail = require('../src/auth/mail.service')
const gate = require('../src/auth/two-factor-gate')
const { OTP } = require('../src/auth/two-factor.service')
const { configSeed } = require('../src/seed/requests-seed.data')
const migrate = require('../scripts/db-migrate.cjs')

const read = (...parts) => fs.readFileSync(path.join(repoRoot, ...parts), 'utf8').replace(/\r\n/g, '\n')
const MIGRATION_FILE = 'docs/migrations/payroll/20260922_066_domain_login_and_2fa.sql'
const isArabic = (text) => /[؀-ۿ]/.test(String(text))

// ============================================================================
// أ) قراءة الإعداد من البيئة
// ============================================================================

test('AD1 — المجال مقفول تمامًا بلا AD_HOST، ومفتوح لما يتكتب، وAD_ENABLED=false بيقفله بلا مسح الإعداد', () => {
  const full = { AD_HOST: 'dc01.maharah.local', AD_BASE_DN: 'DC=maharah,DC=local', AD_UPN_SUFFIX: 'maharah.local' }
  assert.equal(directory.readDirectoryConfig({}).enabled, false)
  assert.equal(directory.readDirectoryConfig({ AD_HOST: '   ' }).enabled, false)
  assert.equal(directory.readDirectoryConfig(full).enabled, true)
  assert.equal(directory.readDirectoryConfig({ ...full, AD_ENABLED: 'false' }).enabled, false)
  // إعداد ناقص = مايشتغلش، والنقص معلن بالاسم للشاشة
  assert.deepEqual(directory.directoryConfigGaps(directory.readDirectoryConfig({ AD_HOST: 'dc01' })), ['AD_BASE_DN', 'AD_UPN_SUFFIX'])
  assert.deepEqual(directory.directoryConfigGaps(directory.readDirectoryConfig(full)), [])
})

test('AD2 — المنفذ الافتراضي يتبع LDAPS، والقيم التالفة ترجع للافتراضي، واللاحقة بتتنضف من @', () => {
  assert.equal(directory.readDirectoryConfig({ AD_HOST: 'dc', AD_LDAPS: 'true' }).port, 636)
  assert.equal(directory.readDirectoryConfig({ AD_HOST: 'dc', AD_LDAPS: 'false' }).port, 389)
  assert.equal(directory.readDirectoryConfig({ AD_HOST: 'dc', AD_PORT: '3268' }).port, 3268)
  assert.equal(directory.readDirectoryConfig({ AD_HOST: 'dc', AD_PORT: 'abc' }).port, 389)
  assert.equal(directory.readDirectoryConfig({ AD_HOST: 'dc', AD_PORT: '0' }).port, 389)
  assert.equal(directory.readDirectoryConfig({ AD_HOST: 'dc', AD_UPN_SUFFIX: '@maharah.local' }).upnSuffix, 'maharah.local')
  // المهلة لها حد أدنى — 10 مللي مش مهلة
  assert.equal(directory.readDirectoryConfig({ AD_HOST: 'dc', AD_TIMEOUT_MS: '10' }).timeoutMs, 8000)
  assert.equal(directory.readDirectoryConfig({ AD_HOST: 'dc', AD_TIMEOUT_MS: '20000' }).timeoutMs, 20000)
  assert.equal(directory.directoryUrl(directory.readDirectoryConfig({ AD_HOST: 'dc01', AD_LDAPS: 'true' })), 'ldaps://dc01:636')
})

test('AD3 — LDAPS مقفول = تحذير إقلاع صريح؛ وشهادة غير متحقَّق منها = تحذير كذلك؛ والآمن بلا تحذير', () => {
  const base = { AD_HOST: 'dc01.maharah.local', AD_BASE_DN: 'DC=maharah,DC=local', AD_UPN_SUFFIX: 'maharah.local' }
  const plain = directory.directoryInsecureWarning(directory.readDirectoryConfig({ ...base, AD_LDAPS: 'false' }))
  assert.ok(plain && isArabic(plain), String(plain))
  assert.match(plain, /LDAPS/)
  assert.match(plain, /بلا تشفير/)
  const loose = directory.directoryInsecureWarning(
    directory.readDirectoryConfig({ ...base, AD_LDAPS: 'true', AD_TLS_REJECT_UNAUTHORIZED: 'false' })
  )
  assert.ok(loose && isArabic(loose), String(loose))
  assert.match(loose, /AD_TLS_REJECT_UNAUTHORIZED/)
  assert.equal(directory.directoryInsecureWarning(directory.readDirectoryConfig({ ...base, AD_LDAPS: 'true' })), null)
  // مقفول = مفيش ما يُحذَّر منه
  assert.equal(directory.directoryInsecureWarning(directory.readDirectoryConfig({})), null)
})

test('MAIL1 — البريد ناقص بلا SMTP_HOST أو SMTP_FROM، والمنفذ والتشفير بافتراضات معلنة', () => {
  assert.deepEqual(mail.mailConfigGaps(mail.readMailConfig({})), ['SMTP_HOST', 'SMTP_FROM'])
  assert.deepEqual(mail.mailConfigGaps(mail.readMailConfig({ SMTP_HOST: 'mail.x' })), ['SMTP_FROM'])
  assert.deepEqual(mail.mailConfigGaps(mail.readMailConfig({ SMTP_HOST: 'mail.x', SMTP_FROM: 'hr@x' })), [])
  assert.equal(mail.readMailConfig({ SMTP_HOST: 'm' }).port, 587)
  assert.equal(mail.readMailConfig({ SMTP_HOST: 'm', SMTP_SECURE: 'true' }).port, 465)
  // STARTTLS إلزامي افتراضيًّا على 587، ومش مطلوب لما TLS من الأول
  assert.equal(mail.readMailConfig({ SMTP_HOST: 'm' }).requireTls, true)
  assert.equal(mail.readMailConfig({ SMTP_HOST: 'm', SMTP_SECURE: 'true' }).requireTls, false)
  assert.equal(mail.readMailConfig({ SMTP_HOST: 'm' }).rejectUnauthorized, true)
  assert.equal(mail.readMailConfig({ SMTP_HOST: 'm', SMTP_TIMEOUT_MS: '5' }).timeoutMs, 15000)
})

test('MAIL2 — تقنيع العنوان: الدومين ظاهر والاسم مقنَّع، ومفيش عنوان كامل بيطلع للعميل', () => {
  assert.equal(mail.maskEmail('kareem@maharahsa.com'), 'ka****@maharahsa.com')
  assert.equal(mail.maskEmail('ab@x.com'), 'a***@x.com')
  assert.equal(mail.maskEmail('a@x.com'), 'a***@x.com')
  assert.equal(mail.maskEmail(''), '')
  assert.equal(mail.maskEmail('no-at-sign'), 'n***')
  // الاسم الكامل مش موجود في الناتج
  assert.equal(mail.maskEmail('kareem@maharahsa.com').includes('kareem'), false)
})

// ============================================================================
// ب) تطبيع الهوية وقراءة خصائص AD
// ============================================================================

test('AD4 — تطبيع اسم الدخول: الاسم بس، DOMAIN\\الاسم، والـUPN الكامل — كلهم لنفس الحساب', () => {
  const n = (value) => directory.normalizeDomainLogin(value, 'maharah.local')
  assert.deepEqual(n('ahmed'), { upn: 'ahmed@maharah.local', sam: 'ahmed' })
  assert.deepEqual(n('MAHARAH\\ahmed'), { upn: 'ahmed@maharah.local', sam: 'ahmed' })
  assert.deepEqual(n('  Ahmed  '), { upn: 'ahmed@maharah.local', sam: 'Ahmed' })
  assert.deepEqual(n('ahmed@maharah.local'), { upn: 'ahmed@maharah.local', sam: 'ahmed' })
  // UPN بلاحقة تانية بيتقبل كما هو (الشركة ممكن يكون عندها أكتر من لاحقة)
  assert.deepEqual(n('ahmed@maharah.pro'), { upn: 'ahmed@maharah.pro', sam: 'ahmed' })
  assert.equal(n(''), null)
  assert.equal(n('   '), null)
  assert.equal(n('MAHARAH\\'), null)
  // بلا لاحقة مضبوطة مفيش UPN نبنيه
  assert.equal(directory.normalizeDomainLogin('ahmed', ''), null)
})

test('AD5 — هروب فلتر LDAP: اسم فيه ( أو * أو \\ مايبنيش فلتر تاني', () => {
  assert.equal(directory.escapeLdapFilterValue('ahmed'), 'ahmed')
  assert.equal(directory.escapeLdapFilterValue('*'), '\\2a')
  assert.equal(directory.escapeLdapFilterValue('a)(objectClass=*'), 'a\\29\\28objectClass=\\2a')
  assert.equal(directory.escapeLdapFilterValue('a\\b'), 'a\\5cb')
  assert.equal(directory.escapeLdapFilterValue('a/b'), 'a\\2fb')
  assert.equal(directory.escapeLdapFilterValue('a\0b'), 'a\\00b')
})

test('AD6 — objectGUID: أول 3 مجموعات little-endian، والباقي كما هو؛ والطول الغلط = null', () => {
  // نفس المثال المعروف: البايتات دي بتتحول للـGUID تحت
  const buffer = Buffer.from([0x78, 0x56, 0x34, 0x12, 0x34, 0x12, 0x78, 0x56, 0x9a, 0xbc, 0xde, 0xf0, 0x12, 0x34, 0x56, 0x78])
  assert.equal(directory.objectGuidToString(buffer), '12345678-1234-5678-9abc-def012345678')
  assert.equal(directory.objectGuidToString(new Uint8Array(buffer)), '12345678-1234-5678-9abc-def012345678')
  assert.equal(directory.objectGuidToString(Buffer.alloc(15)), null)
  assert.equal(directory.objectGuidToString('12345678-1234-5678-9abc-def012345678'), null)
  assert.equal(directory.objectGuidToString(null), null)
  assert.equal(directory.objectGuidToString(undefined), null)
})

test('AD7 — بِت الحساب المتوقف (userAccountControl & 2) يُقرأ من رقم أو نص أو مصفوفة', () => {
  assert.equal(directory.isDisabledAccountControl(512), false) // حساب عادي مفعّل
  assert.equal(directory.isDisabledAccountControl(514), true) // مفعّل + متوقف
  assert.equal(directory.isDisabledAccountControl('66050'), true) // متوقف + كلمة لا تنتهي
  assert.equal(directory.isDisabledAccountControl(['512']), false)
  assert.equal(directory.isDisabledAccountControl(undefined), false)
  assert.equal(directory.isDisabledAccountControl('abc'), false)
})

test('SEC1 — مسح الأسرار من نص الخطأ: كلمة المستخدم وكلمة حساب الخدمة مايظهروش', () => {
  const message = 'bind failed for user with password Str0ng-Pass and service Svc-Secret-99'
  const clean = directory.scrubSecrets(message, ['Str0ng-Pass', 'Svc-Secret-99'])
  assert.equal(clean.includes('Str0ng-Pass'), false)
  assert.equal(clean.includes('Svc-Secret-99'), false)
  assert.match(clean, /\*\*\*/)
  // الكلمات القصيرة جدًا مابتتمسحش (وإلا كل النص بقى نجوم)
  assert.equal(directory.scrubSecrets('abc def', ['a']), 'abc def')
  assert.equal(directory.scrubSecrets('x', [undefined]), 'x')
})

test('SEC2 — كل رسائل رفض المجال عربية ومختلفة عن بعضها (المستخدم يعرف السبب بلا تفاصيل تقنية)', () => {
  const codes = Object.keys(directory.DIRECTORY_FAILURE_MESSAGES)
  assert.deepEqual(codes.sort(), ['ACCOUNT_DISABLED', 'DIRECTORY_UNAVAILABLE', 'INVALID_CREDENTIALS', 'NOT_CONFIGURED', 'NOT_FOUND_IN_DIRECTORY'])
  const messages = codes.map((code) => directory.DIRECTORY_FAILURE_MESSAGES[code])
  for (const message of messages) assert.ok(isArabic(message), message)
  assert.equal(new Set(messages).size, messages.length)
  const error = new directory.DirectoryAuthError('ACCOUNT_DISABLED', 'detail for log')
  assert.equal(error.code, 'ACCOUNT_DISABLED')
  assert.equal(error.message, directory.DIRECTORY_FAILURE_MESSAGES.ACCOUNT_DISABLED)
})

// ============================================================================
// ج) بوابة فتح التحقق بخطوتين — الحاجز الأساسي ضد قفل الشركة
// ============================================================================

test('2FA1 — المفتاح مبذور مقفول، ومُعلن في قائمة القيم المغلقة (true/false بس)', () => {
  const seeded = configSeed.find((row) => row.key === gate.TWO_FACTOR_CONFIG_KEY)
  assert.ok(seeded, 'مفتاح التحقق بخطوتين لازم يكون مبذور')
  assert.equal(seeded.value, 'false')
  const controller = read('api/src/settings/settings.controller.ts')
  assert.match(controller, /'auth\.two_factor_enabled':\s*\['true',\s*'false'\]/)
  // والقارئ بيقارن 'true' حرفيًّا فأي قيمة تانية = مقفول
  const service = read('api/src/auth/two-factor.service.ts')
  assert.match(service, /=== 'true'/)
})

test('2FA2 — الفتح مرفوض وخادم البريد مش مضبوط، ومسموح لما يتضبط، والقفل مسموح دايمًا', () => {
  const key = gate.TWO_FACTOR_CONFIG_KEY
  const blocked = gate.twoFactorEnableBlock(key, 'true', {})
  assert.ok(blocked && isArabic(blocked), String(blocked))
  assert.match(blocked, /SMTP_HOST/)
  assert.match(blocked, /SMTP_FROM/)
  assert.equal(gate.twoFactorEnableBlock(key, 'true', { SMTP_HOST: 'mail.x', SMTP_FROM: 'hr@x' }), null)
  // القفل مفيش حاجة تمنعه — ده مفتاح الطوارئ
  assert.equal(gate.twoFactorEnableBlock(key, 'false', {}), null)
  // مفاتيح تانية مالهاش علاقة
  assert.equal(gate.twoFactorEnableBlock('leave.annual_entitled', 'true', {}), null)
})

test('2FA3 — ثوابت الرمز: 6 أرقام، 5 دقائق، حد محاولات، ومهلة وحد لإعادة الإرسال', () => {
  assert.equal(OTP.codeLength, 6)
  assert.equal(OTP.ttlSeconds, 300)
  assert.ok(OTP.maxAttempts >= 3 && OTP.maxAttempts <= 10, String(OTP.maxAttempts))
  assert.ok(OTP.resendCooldownSeconds >= 30, String(OTP.resendCooldownSeconds))
  assert.ok(OTP.maxResends >= 1 && OTP.maxResends <= 10, String(OTP.maxResends))
})

// ============================================================================
// د) المصدر: مفيش كلمة مرور بتتسجّل، والرمز مخزَّن hash
// ============================================================================

test('SRC1 — مفيش تسجيل لكلمة مرور في أي ملف من ملفات الدخول الجديدة', () => {
  const files = ['api/src/auth/directory.service.ts', 'api/src/auth/mail.service.ts',
    'api/src/auth/two-factor.service.ts', 'api/src/auth/domain-login.service.ts', 'api/src/auth/auth.service.ts']
  for (const file of files) {
    const source = read(file)
    // مفيش logger أو console بياخد كلمة مرور أو الرمز الصريح
    const logLines = source.split('\n').filter((line) => /logger\.(log|warn|error|debug)|console\.(log|warn|error)/.test(line))
    for (const line of logLines) {
      assert.doesNotMatch(line, /\bpassword\b/i, `${file}: سطر تسجيل فيه كلمة مرور → ${line.trim()}`)
      assert.doesNotMatch(line, /\bbindPassword\b/, `${file}: سطر تسجيل فيه كلمة حساب الخدمة → ${line.trim()}`)
      assert.doesNotMatch(line, /\$\{code\}|\bcode\b\s*\)/, `${file}: سطر تسجيل فيه الرمز الصريح → ${line.trim()}`)
    }
  }
})

test('SRC2 — الرمز بيتخزن hash فقط (bcrypt) ومفيش أي عمود بيحمله صريحًا', () => {
  const service = read('api/src/auth/two-factor.service.ts')
  assert.match(service, /bcrypt\.hash\(code, 10\)/)
  assert.match(service, /bcrypt\.compare\(clean, row\.codeHash\)/)
  const entity = read('api/src/auth/login-challenge.entity.ts')
  assert.match(entity, /codeHash/)
  // مفيش عمود اسمه code أو plainCode
  assert.doesNotMatch(entity, /^\s*(?:code|plainCode|rawCode)\s*:/m)
  // الرمز مولَّد بمصدر عشوائي مُعتمد مش Math.random
  assert.match(service, /crypto\.randomInt\(0, 10\)/)
  assert.match(service, /crypto\.randomBytes\(OTP\.challengeTokenBytes\)/)
})

test('SRC3 — الحالة المعلَّقة مش جلسة: مفيش توقيع توكن في two-factor.service، والتوقيع في auth.service بس', () => {
  const service = read('api/src/auth/two-factor.service.ts')
  assert.doesNotMatch(service, /signAsync|jwt\.sign/)
  const auth = read('api/src/auth/auth.service.ts')
  // التوقيع في مكان واحد (issueSession) وverifyTwoFactor بيمر عليه
  assert.equal((auth.match(/this\.jwt\.signAsync\(/g) || []).length, 1)
  assert.match(auth, /async verifyTwoFactor\(/)
  // وقواعد الحساب بتتقري من جديد عند التحقق (الحساب اتعطّل في النص؟)
  assert.match(auth, /verifyTwoFactor[\s\S]{0,700}!user \|\| !user\.isActive/)
})

test('SRC4 — فشل البريد بيرفض الدخول (503) ومابيفتحش جلسة ولا حالة معلَّقة', () => {
  const auth = read('api/src/auth/auth.service.ts')
  assert.match(auth, /MailSendError[\s\S]{0,200}ServiceUnavailableException/)
  const service = read('api/src/auth/two-factor.service.ts')
  // الإرسال قبل الكتابة: الصف مايتعملش غير بعد ما البريد ينجح
  const sendAt = service.indexOf('await this.mail.send(')
  const insertAt = service.indexOf('await this.challenges.insert(')
  assert.ok(sendAt > 0 && insertAt > sendAt, 'الإرسال لازم يسبق كتابة الحالة المعلَّقة')
})

test('SRC5 — حساب المجال بلا كلمة مرور قابلة للاستخدام، والصلاحيات مش من AD (مفيش memberOf)', () => {
  const domain = read('api/src/auth/domain-login.service.ts')
  assert.match(domain, /unusablePasswordHash/)
  assert.match(domain, /role: 'employee'/)
  // ممنوع قراءة أي مجموعة من الدليل — الفحص على الكود بعد مسح التعليقات (الشرح بيذكرها عمدًا)
  const withoutComments = (source) => source.split('\n').filter((line) => !/^\s*(?:\/\/|\*|\/\*)/.test(line)).join('\n')
  for (const file of ['api/src/auth/directory.service.ts', 'api/src/auth/directory.types.ts',
    'api/src/auth/domain-login.service.ts', 'api/src/auth/domain-match.ts', 'api/src/auth/domain-sync.service.ts']) {
    assert.doesNotMatch(withoutComments(read(file)), /memberOf|primaryGroupID|tokenGroups/i, `${file}: ممنوع قراءة مجموعات AD`)
  }
  // ترتيب المطابقة بقى في ملف مشترك واحد (domain-match) بيستخدمه الدخول الحيّ والمزامنة الجماعية:
  // employeeCode ثم fingerprintCode ثم mail ثم UPN
  assert.match(domain, /matchEmployeeForDirectory\(directory, employeeRepositoryMatchSource\(this\.employees\)\)/)
  const match = read('api/src/auth/domain-match.ts')
  assert.match(match, /byEmployeeCode[\s\S]{0,400}byFingerprintCode[\s\S]{0,400}\['mail', 'userPrincipalName'\]/)
  assert.match(match, /e\.employeeCode/)
  assert.match(match, /e\.fingerprintCode/)
  // مفيش إنشاء موظف من الدخول — الإنشاء للحساب بس
  assert.doesNotMatch(domain, /this\.employees\.(save|insert|create)\(/)
})

test('SRC6 — كلمة مرور فاضية مرفوضة قبل أي اتصال (الربط المجهول في LDAP بينجح)', () => {
  const service = read('api/src/auth/directory.service.ts')
  assert.match(service, /password\.length === 0[\s\S]{0,200}INVALID_CREDENTIALS/)
  // والرفض قبل بناء العميل
  const emptyCheck = service.indexOf("password.length === 0")
  const clientCall = service.indexOf('this.client()')
  assert.ok(emptyCheck > 0 && clientCall > emptyCheck, 'رفض الكلمة الفاضية لازم يسبق أي اتصال')
})

// ============================================================================
// هـ) ترحيل 066
// ============================================================================

test('MIG1 — ترحيل 066 إضافي وآمن للتكرار وبأكواد THROW فريدة 66xxx ومتوافق مع 2019', () => {
  const content = read(MIGRATION_FILE)
  assert.deepEqual(migrate.forbiddenStatements(content), [])
  // دوال مش موجودة في 2019
  assert.doesNotMatch(content, /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(NOT\s+)?DISTINCT\s+FROM/i)
  // STRING_SPLIT بثلاث وسائط مش موجود في 2019
  assert.doesNotMatch(content, /STRING_SPLIT\s*\([^)]*,[^)]*,[^)]*\)/i)
  const codes = migrate.throwCodes(content)
  assert.ok(codes.length >= 6, JSON.stringify(codes))
  for (const code of codes) assert.ok(code >= 66000 && code < 67000, `كود THROW ${code} لازم يكون 66xxx`)
  // مفيش تعارض مع أي ترحيل تاني
  assert.deepEqual(migrate.duplicateThrowCodes(migrate.discover()), [])
  // الحراسات: العمود والجدول والفهارس والمفتاح كلهم بحارس
  assert.match(content, /IF COL_LENGTH\(N'dbo\.users', N'domainObjectGuid'\) IS NULL/)
  assert.match(content, /IF OBJECT_ID\(N'dbo\.login_challenges', N'U'\) IS NULL/)
  assert.match(content, /WHERE NOT EXISTS \(SELECT 1 FROM dbo\.requests_config/)
  // كل الفهارس بحارس sys.indexes
  const creates = content.match(/CREATE (?:UNIQUE )?INDEX \[(\w+)\]/g) || []
  assert.equal(creates.length, 3, JSON.stringify(creates))
  for (const name of ['UX_users_domain_object_guid', 'UX_login_challenges_token', 'IX_login_challenges_user']) {
    assert.match(content, new RegExp(`sys\\.indexes WHERE name = N'${name}'`), `${name} بلا حارس`)
  }
})

test('MIG2 — أسماء القيد والفهارس في الترحيل مطابقة لكيانات TypeORM بالحرف', () => {
  const content = read(MIGRATION_FILE)
  const user = read('api/src/auth/user.entity.ts')
  const challenge = read('api/src/auth/login-challenge.entity.ts')
  // الفهرس الفريد المفلتر على users — الاسم والشرط واحد في الكيان والترحيل
  assert.match(user, /@Index\('UX_users_domain_object_guid', \['domainObjectGuid'\], \{ unique: true, where: '\[domainObjectGuid\] IS NOT NULL' \}\)/)
  assert.match(content, /CREATE UNIQUE INDEX \[UX_users_domain_object_guid\] ON dbo\.users \(\[domainObjectGuid\]\) WHERE \[domainObjectGuid\] IS NOT NULL/)
  assert.match(challenge, /primaryKeyConstraintName: 'PK_login_challenges'/)
  assert.match(content, /CONSTRAINT \[PK_login_challenges\] PRIMARY KEY \(\[id\]\)/)
  assert.match(challenge, /@Index\('UX_login_challenges_token', \['token'\], \{ unique: true \}\)/)
  assert.match(challenge, /@Index\('IX_login_challenges_user', \['userId'\]\)/)
  // الأعمدة: كل عمود في الكيان موجود في الترحيل بنفس الاسم
  const entityColumns = [...challenge.matchAll(/^\s{2}(\w+)(?:\?)?:\s/gm)].map((m) => m[1])
  for (const column of entityColumns) {
    assert.match(content, new RegExp(`\\[${column}\\]`), `عمود ${column} ناقص في الترحيل`)
  }
  // مفيش أي قيد افتراضي مُدار على الجدول الجديد (الخدمة بتكتب كل الأعمدة)
  assert.doesNotMatch(content, /CONSTRAINT \[DF_/)
  assert.doesNotMatch(challenge, /default:/)
})

test('MIG3 — الترحيل بيبذر مفتاح التحقق مقفول ولا يلمس قيمة موجودة', () => {
  const content = read(MIGRATION_FILE)
  assert.match(content, /N'auth\.two_factor_enabled', N'false'/)
  // إضافة بشرط عدم الوجود — القيمة اللي المالك ضبطها مش بتتغير
  assert.match(content, /INSERT INTO dbo\.requests_config[\s\S]{0,300}WHERE NOT EXISTS/)
  assert.doesNotMatch(content, /UPDATE dbo\.requests_config/)
})

// ============================================================================
// و) سكربت الطوارئ وسكربت فحص البريد
// ============================================================================

test('OPS1 — سكربت الطوارئ موجود، مابيحتاجش التطبيق، وبيكتب المفتاح على القاعدة مباشرة', () => {
  const script = read('api/scripts/two-factor-off.cjs')
  // القاعدة مباشرة بلا API ولا NestJS ولا ts-node
  assert.match(script, /require\('mssql'\)/)
  assert.doesNotMatch(script, /@nestjs|NestFactory|fetch\(/)
  assert.match(script, /auth\.two_factor_enabled/)
  // الافتراضي هو القفل — الاستخدام بلا وسائط بيقفل
  assert.match(script, /const target = wantOn \? 'true' : 'false'/)
  // --status قراءة بس، و--on بيحذّر لو البريد مش مضبوط
  assert.match(script, /--status/)
  assert.match(script, /SMTP_HOST/)
  // كلمة مرور القاعدة مابتتطبعش في الخطأ
  assert.match(script, /split\(secret\)\.join\('\*\*\*'\)/)
  // مفيش حذف صفوف
  assert.doesNotMatch(script, /\bDELETE\b|\bDROP\b|\bTRUNCATE\b/i)
})

test('OPS2 — سكربت فحص البريد بيقرأ نفس إعداد الخادم ومابيطبعش كلمة مرور البريد', () => {
  const script = read('api/scripts/mail-selftest.cjs')
  // مصدر واحد للحقيقة: نفس readMailConfig اللي الخادم بيستخدمه
  assert.match(script, /readMailConfig/)
  assert.match(script, /mailConfigGaps/)
  assert.match(script, /transport\.verify\(\)/)
  assert.match(script, /sendMail/)
  // الكلمة تظهر كـ«مضبوطة / فاضية» بس — مفيش قيمتها بتتكتب في أي مخرج، وكل نص خطأ بيتنضف
  assert.match(script, /config\.password \? '\(مضبوطة — مش بتتطبع\)' : '\(فاضية\)'/)
  assert.match(script, /const scrub = /)
  // القيمة نفسها مابتتداخلش في أي نص مطبوع ولا بتتلحّم على نص
  assert.doesNotMatch(script, /\$\{config\.password\}/)
  assert.doesNotMatch(script, /\+\s*config\.password/)
  // الاستخدام الوحيد المسموح: تمريرها للنقل نفسه، وبناء دالة المسح
  const uses = script.split('\n').filter((line) => /config\.password/.test(line))
  for (const line of uses) {
    assert.match(
      line,
      /pass: config\.password|config\.password && config\.password\.length|split\(config\.password\)|config\.password \? '\(مضبوطة/,
      `استخدام غير متوقع لكلمة مرور البريد → ${line.trim()}`
    )
  }
})

test('OPS3 — .env.example فيه كل مفاتيح المجال والبريد بلا أي قيمة سر', () => {
  const example = read('api/.env.example')
  for (const key of ['AD_ENABLED', 'AD_HOST', 'AD_PORT', 'AD_LDAPS', 'AD_TLS_REJECT_UNAUTHORIZED',
    'AD_BASE_DN', 'AD_UPN_SUFFIX', 'AD_BIND_DN', 'AD_BIND_PASSWORD', 'AD_TIMEOUT_MS',
    'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_REQUIRE_TLS', 'SMTP_TLS_REJECT_UNAUTHORIZED',
    'SMTP_FROM', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_TIMEOUT_MS']) {
    assert.match(example, new RegExp(`^#\\s*${key}=`, 'm'), `${key} ناقص في .env.example`)
  }
  // مفيش كلمة مرور مكتوبة في المثال
  assert.match(example, /^#\s*AD_BIND_PASSWORD=$/m)
  assert.match(example, /^#\s*SMTP_PASSWORD=$/m)
  // ومفتاح الطوارئ موثق في نفس الملف
  assert.match(example, /two-factor-off\.cjs/)
  assert.match(example, /mail-selftest\.cjs/)
})

test('UI1 — شاشة الدخول فيها الطريقتان وخطوة الرمز، وشاشة السياسات فيها مفتاح التحقق وحالة البريد', () => {
  const loginPage = read('src/app/login/page.tsx')
  assert.match(loginPage, /الدخول بحساب الشركة/)
  assert.match(loginPage, /isTwoFactorChallenge/)
  // الرمز مخفي بزر إظهار، وإعادة الإرسال بعدّاد ظاهر
  assert.match(loginPage, /showCode \? 'text' : 'password'/)
  assert.match(loginPage, /إعادة الإرسال بعد \$\{cooldown\} ثانية/)
  // مفيش جلسة بتتحفظ قبل التحقق: saveSession في enterSystem بس
  assert.equal((loginPage.match(/saveSession\(/g) || []).length, 1)
  const policies = read('src/app/settings/policies/page.tsx')
  assert.match(policies, /auth\.two_factor_enabled/)
  assert.match(policies, /الدخول والأمان/)
  assert.match(policies, /two-factor-off\.cjs/)
  // ومرآة رفض الخادم قبل الحفظ
  assert.match(policies, /security && !security\.mail\.configured/)
})

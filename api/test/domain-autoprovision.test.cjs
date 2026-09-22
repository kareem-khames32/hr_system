'use strict'
// حساب الدخول من الدومين للموظف الواحد: التزويد التلقائي عند الإضافة + زرّ «مزامنة من AD» في ملفه.
// بلا قاعدة بيانات وبلا أي اتصال بالدليل — قراءة مصدر ودوال نقية بس.
//
// السبب اللي المسار ده موجود له (قرار المالك 22 سبتمبر بالليل): «لما الموظف يضاف على النظام دايركت
// يتعمل sync على الدومين ويتفتح اليوزر ليه». المزامنة الجماعية بتعمل ده لكل الدليل مرة، والدخول
// بيعمله لأول داخل — الموظف الجديد كان بيستنى واحد من الاتنين.
//
// اللي بيتأكد هنا:
//   أ) المفتاح: الاسم، الافتراضي (مفتوح)، والقفل بقيمة صريحة — والبذرة بتوصل لقاعدة قائمة عند الإقلاع
//   ب) نصوص الحالات كلها عربية، ومفيش حالة بلا نص
//   ج) المشبك: بيجري **بعد** ما المعاملة اتثبّتت، وملفوف في try/catch، ومفيش روتين إنشاء تاني
//   د) الخادم: الزرّ محروس بـusers.manage + نطاق كل الفروع، والكارت بصلاحية عرض الملف نفسها
//   هـ) الشاشة وطبقة الاتصال
//   و) مفيش تسجيل لكلمة مرور في الملفات الجديدة
// الملفات على القرص CRLF — كل قراءة مصدر بتتطبّع.
// Run: node --test api/test/domain-autoprovision.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(apiRoot, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')

const {
  DOMAIN_AUTOPROVISION_CONFIG_KEY,
  DOMAIN_AUTOPROVISION_DEFAULT,
  DOMAIN_PROVISION_OUTCOMES,
  domainAutoProvisionEnabled,
} = require('../src/auth/domain-provision')
const { DOMAIN_SYNC_REASONS } = require('../src/auth/domain-sync.service')
const { configSeed } = require('../src/seed/requests-seed.data')

const read = (...parts) => fs.readFileSync(path.join(repoRoot, ...parts), 'utf8').replace(/\r\n/g, '\n')
const isArabic = (text) => /[؀-ۿ]/.test(String(text))

// ============================================================================
// أ) المفتاح: الافتراضي مفتوح، والقفل بقيمة صريحة، والبذرة توصل لقاعدة قائمة
// ============================================================================

test('AP1 — المفتاح اسمه auth.domain_autoprovision_enabled وبيتسلّم مفتوح', () => {
  assert.equal(DOMAIN_AUTOPROVISION_CONFIG_KEY, 'auth.domain_autoprovision_enabled')
  assert.equal(DOMAIN_AUTOPROVISION_DEFAULT, 'true')
  // الافتراضي **مفتوح** لأن الدخول بالدومين شغّال حيًّا — بخلاف التحقق بخطوتين اللي بيتسلّم مقفول
  assert.equal(domainAutoProvisionEnabled(DOMAIN_AUTOPROVISION_DEFAULT), true)
})

test('AP2 — المفتاح الناقص أو الفاضي = مفتوح (الافتراضي)، و«false» وأخواتها بس هي اللي تقفل', () => {
  // ناقص/فاضي/مسافات = الافتراضي المعلن، عشان أول إقلاع قبل البذرة مايوقّفش التزويد
  for (const value of [undefined, null, '', '   ', 'true', 'TRUE', ' True ', 'yes', '1', 'حاجة غريبة']) {
    assert.equal(domainAutoProvisionEnabled(value), true, `القيمة «${value}» المفروض تفضل مفتوحة`)
  }
  // القفل لازم ينجح مهما كتبه المالك — ومفيش قيمة قفل بتفضل مفتوحة بصمت
  for (const value of ['false', 'FALSE', ' False ', '0', 'no', 'OFF']) {
    assert.equal(domainAutoProvisionEnabled(value), false, `القيمة «${value}» المفروض تقفل`)
  }
})

test('AP3 — المفتاح مبذور في configSeed بقيمته الافتراضية، فبيوصل لقاعدة قائمة عند الإقلاع بلا ترحيل', () => {
  const seeded = configSeed.filter((row) => row.key === DOMAIN_AUTOPROVISION_CONFIG_KEY)
  assert.equal(seeded.length, 1, 'مفتاح واحد بالظبط في البذرة')
  assert.equal(seeded[0].value, DOMAIN_AUTOPROVISION_DEFAULT)
  // ConfigDefaultsService هو الطريق للقاعدة القائمة: بيقرا نفس configSeed عند الإقلاع
  // وبيـinsert الناقص بس (الموجود مايتلمسش) — فمفيش ترحيل محتاج للمفتاح ده
  const defaults = read('api/src/settings/config-defaults.service.ts')
  assert.match(defaults, /from '\.\.\/seed\/requests-seed\.data'/)
  assert.match(defaults, /implements OnApplicationBootstrap/)
  assert.match(defaults, /configSeed\.filter\(\(s\) => !existing\.has\(s\.key\)\)/)
  assert.match(defaults, /await this\.config\.insert\(\{ key: c\.key, value: c\.value \}\)/)
  // وفشل البذرة ممنوع يمنع الإقلاع
  assert.match(defaults, /لا يمنع الإقلاع/)
})

// ============================================================================
// ب) نصوص الحالات كلها عربية
// ============================================================================

test('AP4 — كل حالة لها نص عربي، والحالات هي المعلنة بالظبط', () => {
  const outcomes = ['created', 'linked', 'alreadyLinked', 'noMatch', 'skipped', 'conflict',
    'switchedOff', 'directoryUnavailable', 'failed']
  assert.deepEqual(Object.keys(DOMAIN_PROVISION_OUTCOMES).sort(), [...outcomes].sort())
  for (const [key, text] of Object.entries(DOMAIN_PROVISION_OUTCOMES)) {
    assert.ok(text && isArabic(text), `${key}: ${text}`)
  }
  // الحالات اللي الموظف فيها اتحفظ بلا حساب بتقول كده بصراحة — مفيش لبس مع «الموظف ما اتحفظش»
  for (const key of ['switchedOff', 'directoryUnavailable', 'failed']) {
    assert.match(DOMAIN_PROVISION_OUTCOMES[key], /اتحفظ/, key)
  }
  // ومفردات أسباب المزامنة الجماعية هي نفسها اللي بتظهر للموظف الواحد
  for (const reason of ['noMatch', 'ambiguous', 'adDisabled', 'employeeEnded', 'emailTaken', 'guidConflict']) {
    assert.ok(isArabic(DOMAIN_SYNC_REASONS[reason]), reason)
  }
})

// ============================================================================
// ج) المشبك: بعد تثبيت المعاملة، ملفوف، ومفيش روتين إنشاء تاني
// ============================================================================

test('AP5 — المشبك بيجري بعد ما معاملة إنشاء الموظف اتثبّتت، ومفيش استثناء بيرجّع الإنشاء', () => {
  const service = read('api/src/employees/employees.service.ts')
  const create = service.slice(
    service.indexOf('async create(dto: CreateEmployeeDto'),
    service.indexOf('private async provisionDomainUser(')
  )
  assert.ok(create.length > 0, 'مالقيتش دالة الإنشاء')
  // الترتيب: المعاملة الأول، وبعد ما خلصت (والبصمات اتربطت) ييجي التزويد
  const transaction = create.indexOf('await this.employees.manager.transaction(')
  const relink = create.indexOf('await this.relinkPunches(emp)')
  const provision = create.indexOf('await this.provisionDomainUser(emp)')
  assert.ok(transaction > -1 && relink > transaction, 'البصمات بعد المعاملة')
  assert.ok(provision > relink, 'التزويد لازم يكون بعد ما صف الموظف اتثبّت')
  // النتيجة حقل إضافي في الرد — بلا أي تغيير في شكل الرد القديم
  assert.match(create, /const domainProvision = await this\.provisionDomainUser\(emp\)/)
  assert.match(create, /return Object\.assign\(await this\.attendanceView\(emp\), \{ domainProvision \}\)/)

  // الاحتواء: الخدمة الناقصة = تخطّي صامت، وكل استثناء بيتلمّ
  const hook = service.slice(
    service.indexOf('private async provisionDomainUser('),
    service.indexOf('private async relinkPunches(')
  )
  assert.match(hook, /if \(!this\.domainSync\) return null/)
  assert.match(hook, /try \{/)
  assert.match(hook, /return await this\.domainSync\.provisionOnHire\(emp\.id\)/)
  assert.match(hook, /\} catch \(e\) \{[\s\S]{0,400}return null/)
  // مفيش أي throw في المشبك، ومفيش أي كتابة على جدول المستخدمين من ملف الموظفين
  assert.doesNotMatch(hook, /throw /)
  assert.doesNotMatch(service, /this\.users\.(save|insert|update|delete|remove)\(/)
  // نداء واحد بس للخدمة — مفيش منطق تزويد تاني متفرّق في ملف الموظفين
  assert.equal((service.match(/this\.domainSync\./g) || []).length, 1)
  // الحقن اختياري وفي الآخر: الاختبارات اللي بتعمل الخدمة بإيدها مابتتكسرش
  assert.match(service, /@Optional\(\) private readonly domainSync\?: DomainSyncService/)
})

test('AP6 — موظف واحد بيمرّ على **نفس** خطة المزامنة الجماعية: مفيش مطابقة تانية ومفيش إنشاء تاني', () => {
  const sync = read('api/src/auth/domain-sync.service.ts')
  const single = sync.slice(sync.indexOf('async syncEmployee('), sync.indexOf('async provisionOnHire('))
  assert.ok(single.length > 0)
  // نفس الخطة ونفس التطبيق اللي الجماعية بتستخدمهم — مفيش مطابقة مكتوبة تاني هنا
  assert.match(single, /await this\.plan\(accounts\)/)
  assert.match(single, /await this\.applyPlan\(mine\)/)
  assert.doesNotMatch(single, /matchEmployeeForDirectory|employeeMatchIndex|domainEmailCandidates/)
  // وممنوع أي كتابة مباشرة على الجداول من الملف كله (الإنشاء/الربط في DomainLoginService)
  assert.doesNotMatch(sync, /this\.users\.(save|insert|update|delete|remove)\(/)
  assert.doesNotMatch(sync, /this\.employees\.(save|insert|update|delete|remove)\(/)
  assert.match(sync, /this\.domainLogin\.createDomainOnlyUser\(/)
  assert.match(sync, /this\.domainLogin\.linkExistingUser\(/)
  // الدليل الواقف = نتيجة بسبب مش استثناء
  assert.match(single, /catch[\s\S]{0,600}outcome: 'directoryUnavailable'/)
  // الغموض بيتلقط للموظف ده كمان وهو واحد من المرشّحين (مش بس اللي طابق)
  assert.match(single, /entry\.candidates\.some\(\(candidate\) => candidate\.id === employeeId\)/)

  // التلقائي: المفتاح الأول، وكل حاجة ملفوفة، ومفيش رمي على مسار الإنشاء
  const auto = sync.slice(sync.indexOf('async provisionOnHire('), sync.indexOf('/** نتيجة بلا أي صف دليل'))
  assert.match(auto, /if \(!\(await this\.autoProvisionEnabled\(\)\)\)/)
  assert.match(auto, /outcome: 'switchedOff'/)
  assert.match(auto, /\} catch \(error\) \{[\s\S]{0,600}outcome: 'failed'/)
  assert.doesNotMatch(auto, /throw /)
  // المفتاح بيتقرا من القاعدة كل مرة (بلا كاش) عشان القفل يسري بلا إعادة تشغيل
  assert.match(sync, /async autoProvisionEnabled\(\)[\s\S]{0,400}DOMAIN_AUTOPROVISION_CONFIG_KEY/)
  assert.match(sync, /domainAutoProvisionEnabled\(row\?\.value\)/)
})

// ============================================================================
// د) الخادم: حراسة الزرّ، وقراءة الكارت بصلاحية الملف
// ============================================================================

test('AP7 — زرّ الموظف الواحد محروس زي المزامنة الجماعية: users.manage + نطاق كل الفروع', () => {
  const controller = read('api/src/auth/users.controller.ts')
  // users.manage على الكلاس كله
  assert.match(controller, /@Perm\('users\.manage'\)\n@Controller\('users'\)/)
  assert.match(controller, /@Post\('domain-sync\/employee\/:id'\)/)
  assert.match(
    controller,
    /domainSyncEmployee\([\s\S]{0,300}branchScopeOf\(actor\) !== null\) throw new ForbiddenException\(DOMAIN_SYNC_COMPANY_WIDE_ONLY\)/
  )
  assert.match(controller, /this\.domainSync\.syncEmployee\(id\)/)
  // ومسار المزامنة الجماعية زي ما هو (معاينة افتراضيًّا)
  assert.match(controller, /this\.domainSync\.run\(\{ apply: dto\.apply === true \}\)/)
})

test('AP8 — كارت الملف بيتقرا بصلاحية عرض الموظف نفسها، بعزل الفرع، وبلا أي hash', () => {
  const card = read('api/src/auth/employee-login-account.controller.ts')
  assert.match(card, /@Controller\('employees'\)/)
  assert.match(card, /@Get\(':id\/login-account'\)/)
  // نفس بوابة GET /employees/:id بالحرف: الموظف لنفسه، وغيره employees.view
  assert.match(card, /actor\.employeeId !== id && !userHasPerm\(actor, 'employees\.view'\)/)
  assert.match(card, /throw new ForbiddenException\('لا تملك صلاحية عرض الموظفين'\)/)
  // خارج نطاق الفرع = غير موجود
  assert.match(card, /scope != null && employee\.branchId !== scope[\s\S]{0,120}NotFoundException/)
  // مفيش users.manage على الكارت (الزرّ هو اللي محتاجها)، وcanSync مرآة حراسة الخادم
  assert.doesNotMatch(card, /@Perm\(/)
  assert.match(card, /canSync: userHasPerm\(actor, 'users\.manage'\) && scope === null/)
  // ولا hash ولا كلمة مرور بتخرج: الرد مبني حقل بحقل
  assert.doesNotMatch(card, /passwordHash/)
  assert.match(card, /isDomainAccount: !!account\.domainObjectGuid/)
  // والنصوص عربية
  for (const constant of ['DOMAIN_ACCOUNT_SUMMARY', 'LOCAL_ACCOUNT_SUMMARY', 'NO_ACCOUNT_SUMMARY']) {
    const text = new RegExp(`const ${constant} =\\s*\\n?\\s*'([^']+)'`).exec(card)
    assert.ok(text && isArabic(text[1]), `${constant}: ${text && text[1]}`)
  }
  // مسجّلة في الموديول، والخدمة مصدَّرة لملف الموظفين
  const module_ = read('api/src/auth/auth.module.ts')
  assert.match(module_, /EmployeeLoginAccountController/)
  assert.match(module_, /exports: \[[^\]]*DomainSyncService/)
  const employees = read('api/src/employees/employees.module.ts')
  assert.match(employees, /AuthModule/)
})

// ============================================================================
// هـ) الشاشة وطبقة الاتصال
// ============================================================================

test('AP9 — كارت «مرتبط بحساب دخول» وزرّ «مزامنة من AD» في ملف الموظف، بعربي RTL زي جيرانه', () => {
  const page = read('src/app/employees/[id]/page.tsx')
  assert.match(page, /حساب الدخول/)
  assert.match(page, /مزامنة من AD/)
  // بيقول الحالة بصراحة في التلات حالات
  assert.match(page, /مفيش حساب دخول/)
  assert.match(page, /حساب دومين/)
  assert.match(page, /حساب عندنا \(بريد \+ كلمة مرور\)/)
  // البريد والدور بيظهروا
  assert.match(page, /بريد الدخول/)
  assert.match(page, /account\.roleLabel/)
  // الزرّ مايظهرش لمين مايقدرش (مرآة رفض الخادم)، ومقفول لو الدليل مش مضبوط
  assert.match(page, /loginAccount\.canSync && \(/)
  assert.match(page, /disabled=\{domainSyncing \|\| !loginAccount\.directory\.configured\}/)
  // النتيجة بتتعرض مكانها بالسبب العربي وبالمرشّحين في حالة الغموض
  assert.match(page, /domainSyncResult\.message/)
  assert.match(page, /domainSyncResult\.candidates\.length > 0/)
  assert.match(page, /domainSyncResult\.matchedViaLabel/)
  // نداء الكارت بأفضل جهد: فشله في الكارت وحده ومابيعطّلش الملف
  assert.match(page, /fetchEmployeeLoginAccount\(Number\(params\.id\)\)/)
  assert.match(page, /setLoginAccountError/)
  // وبعد ما حساب يتعمل/يتربط الكارت بيتقرا تاني
  assert.match(page, /DOMAIN_PROVISION_WROTE\.includes\(result\.outcome\)/)

  const api = read('src/lib/api.ts')
  assert.match(api, /export const fetchEmployeeLoginAccount = \(employeeId: number\) =>/)
  assert.match(api, /get<ApiEmployeeLoginAccount>\(`\/employees\/\$\{employeeId\}\/login-account`\)/)
  assert.match(api, /export const syncDomainUserForEmployee = \(employeeId: number\) =>/)
  assert.match(api, /post<ApiDomainProvisionResult>\(`\/users\/domain-sync\/employee\/\$\{employeeId\}`\)/)
  // حقل إضافي في رد الإنشاء — اختياري فمفيش شاشة قديمة بتتكسر
  assert.match(api, /domainProvision\?: ApiDomainProvisionResult \| null/)
})

test('AP11 — حارس بنيوي: ولا اتصال LDAP حقيقي من أي اختبار، مهما كان api/.env مضبوط على المجال الحيّ', () => {
  // من يوم ما إضافة موظف بقت بتزوّد حساب دخول، أي اختبار بيضيف موظف كان يقدر يفتح جلسة LDAPS
  // على الدومين الحيّ (api/.env عندنا AD_ENABLED=true، وConfigModule بيعيد تحميله بعد ما الاختبار
  // يشيل المفاتيح من process.env). الحارس في باني العميل نفسه، فمفيش اختبار بيعتمد على إنه
  // يزيّف الدليل صح عشان مايخرجش للشبكة.
  const service = read('api/src/auth/directory.service.ts')
  const client = service.slice(service.indexOf('protected client()'), service.indexOf('private async close('))
  assert.ok(client.length > 0, 'مالقيتش باني العميل')
  assert.match(client, /if \(process\.env\.NODE_ENV === 'test'\) \{/)
  assert.match(client, /اتصال LDAP حقيقي/)
  // والحارس قبل تحميل المكتبة وقبل أي كائن عميل
  assert.ok(
    client.indexOf("NODE_ENV === 'test'") < client.indexOf("require('ldapts')"),
    'الحارس لازم يكون قبل تحميل ldapts'
  )
  // والرسالة عربية (الاختبار اللي هيقع عليها لازم يفهم فورًا)
  assert.ok(isArabic(client))
})

// ============================================================================
// و) مفيش سر ولا كلمة مرور في أي سجل
// ============================================================================

test('AP10 — مفيش تسجيل لكلمة مرور ولا لكلمة حساب الخدمة في الملفات الجديدة', () => {
  for (const file of [
    'api/src/auth/domain-provision.ts',
    'api/src/auth/domain-sync.service.ts',
    'api/src/auth/employee-login-account.controller.ts',
    'api/src/employees/employees.service.ts',
  ]) {
    const source = read(file)
    const logLines = source
      .split('\n')
      .filter((line) => /logger\.(log|warn|error|debug)|console\.(log|warn|error)/.test(line))
    for (const line of logLines) {
      assert.doesNotMatch(line, /\bpassword\b/i, `${file}: سطر تسجيل فيه كلمة مرور → ${line.trim()}`)
      assert.doesNotMatch(line, /\bbindPassword\b/, `${file}: سطر تسجيل فيه كلمة حساب الخدمة → ${line.trim()}`)
      assert.doesNotMatch(line, /passwordHash/, `${file}: سطر تسجيل فيه hash → ${line.trim()}`)
    }
  }
})

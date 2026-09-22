'use strict'
// ===== مزامنة حسابات الدومين: كل موظف مطابق يبقى له حساب ظاهر في شاشة المستخدمين =====
// السبب (قرار المالك 22 سبتمبر): الربط «في لحظته» لوحده معناه إن الحساب مايظهرش غير بعد أول دخول،
// فالمالك مش قادر يسند دور أو صلاحية لحد قبل ما يدخل. السكربت ده بيقرا الدليل، يطابق الموظفين،
// ويعمل الحسابات الناقصة — بأقل دور (employee) وبلا أي كلمة مرور قابلة للاستخدام.
//
// **معاينة افتراضيًّا**: بلا --apply مفيش صف واحد بيتكتب في القاعدة.
//
// الاستخدام (من فولدر api):
//   node scripts/sync-domain-users.cjs                 ← معاينة: الأرقام وأسباب التخطّي (مفيش كتابة)
//   node scripts/sync-domain-users.cjs --status         ← إعداد المجال والقاعدة بس (بلا اتصال بالدليل)
//   node scripts/sync-domain-users.cjs --show 50        ← معاينة + أول 50 صف بالتفصيل
//   node scripts/sync-domain-users.cjs --show all       ← معاينة + كل الصفوف
//   node scripts/sync-domain-users.cjs --only noMatch   ← اعرض صفوف سبب واحد بس (مع --show)
//   node scripts/sync-domain-users.cjs --apply          ← نفّذ فعلًا (بيقول اسم القاعدة قبل ما يكتب)
//
// الإعداد كله من api/.env. كلمة مرور حساب الخدمة (AD_BIND_PASSWORD) وكلمة مرور القاعدة (DB_PASSWORD)
// مابتتطبعش ولا بتظهر في أي رسالة خطأ. ولا مجموعة AD واحدة بتتقري، ولا صلاحية واحدة بتتمنح منها.
const path = require('path')
const apiRoot = path.resolve(__dirname, '..')
require('dotenv').config({ path: path.join(apiRoot, '.env'), quiet: true })
require(path.join(apiRoot, 'node_modules', 'ts-node')).register({
  project: path.join(apiRoot, 'tsconfig.json'),
  transpileOnly: true,
})
require(path.join(apiRoot, 'node_modules', 'reflect-metadata'))
const { DataSource } = require(path.join(apiRoot, 'node_modules', 'typeorm'))

const src = (...parts) => require(path.join(apiRoot, 'src', ...parts))
const { DirectoryService } = src('auth', 'directory.service')
const { DomainLoginService } = src('auth', 'domain-login.service')
const { DomainSyncService, DOMAIN_SYNC_ACTIONS } = src('auth', 'domain-sync.service')
const { directoryConfigGaps, directoryInsecureWarning, directoryUrl } = src('auth', 'directory.types')
const { User } = src('auth', 'user.entity')
const { Employee } = src('employees', 'employee.entity')

// ===== الوسائط =====
const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const value = (name) => {
  const at = args.indexOf(name)
  return at >= 0 && args[at + 1] && !args[at + 1].startsWith('--') ? args[at + 1] : null
}
const wantStatus = flag('--status')
const wantApply = flag('--apply')
const onlyReason = value('--only')
const showRaw = value('--show')
const showCount = showRaw === 'all' ? Infinity : Number(showRaw || 0)
const known = ['--status', '--apply', '--show', '--only']
const unknown = args.filter((a, i) => a.startsWith('--') ? !known.includes(a) : !known.includes(args[i - 1]))

// ===== مسح الأسرار من أي نص بيتطبع =====
const secrets = [process.env.AD_BIND_PASSWORD, process.env.DB_PASSWORD]
const scrub = (input) => {
  let out = String(input === undefined || input === null ? '' : input)
  for (const secret of secrets) {
    if (typeof secret === 'string' && secret.length >= 3) out = out.split(secret).join('***')
  }
  return out
}
const say = (line) => console.log(scrub(line))
const pad = (text, width) => String(text ?? '').padEnd(width, ' ')

;(async () => {
  if (unknown.length) {
    say(`وسيط غير معروف: ${unknown.join(' ')}`)
    say('الاستخدام: node scripts/sync-domain-users.cjs [--status] [--show N|all] [--only <سبب>] [--apply]')
    process.exit(1)
  }

  const database = process.env.DB_DATABASE || 'hr_system'
  // نفس قارئ الإعداد اللي الخادم بيستخدمه — مصدر واحد للحقيقة، والباسورد مابيخرجش منه
  const directory = new DirectoryService({ get: (key) => process.env[key] })
  const gaps = directoryConfigGaps(directory.config)

  say('===== إعداد المجال من api/.env =====')
  say(`AD_HOST / المنفذ    : ${directory.config.host ? directoryUrl(directory.config) : '(فاضي)'}`)
  say(`AD_BASE_DN           : ${directory.config.baseDn || '(فاضي)'}`)
  say(`AD_UPN_SUFFIX        : ${directory.config.upnSuffix || '(فاضي)'}`)
  say(`حساب الخدمة (قراءة)  : ${directory.config.bindDn ? directory.config.bindDn : '(غير مضبوط)'}`)
  say(`AD_BIND_PASSWORD     : ${directory.config.bindPassword ? '(مضبوطة — مش بتتطبع)' : '(فاضية)'}`)
  say(`التحقق من الشهادة    : ${directory.config.rejectUnauthorized}`)
  say(`قاعدة البيانات       : ${database} على ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 1433}`)
  const warning = directoryInsecureWarning(directory.config)
  if (warning) say(`⚠️  ${warning}`)
  say('')

  if (gaps.length) {
    say(`⛔ إعداد المجال ناقص: ${gaps.join(', ')} — المزامنة مش هتشتغل.`)
    process.exit(1)
  }
  if (!directory.config.bindDn) {
    say('⛔ المزامنة محتاجة حساب خدمة للقراءة — اضبط AD_BIND_DN و AD_BIND_PASSWORD في api/.env.')
    process.exit(1)
  }
  if (wantStatus) {
    say('(--status: مفيش اتصال بالدليل ولا بالقاعدة)')
    return
  }

  // ===== القاعدة: DataSource مستقل (مفيش NestJS ولا جدولة ولا HTTP) =====
  const ds = new DataSource({
    type: 'mssql',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 1433),
    username: process.env.DB_USERNAME || 'sa',
    password: process.env.DB_PASSWORD || '',
    database,
    entities: [User, Employee],
    synchronize: false,
    logging: false,
    options: { encrypt: false, trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false' },
  })
  await ds.initialize()
  try {
    const users = ds.getRepository(User)
    const employees = ds.getRepository(Employee)
    // نفس الخدمات اللي الخادم بيستخدمها بالحرف: الإنشاء والربط من DomainLoginService،
    // والمطابقة من domain-match — فمفيش منطق تاني هنا يقدر يختلف عن الدخول الحيّ
    const login = new DomainLoginService(users, employees)
    const sync = new DomainSyncService(users, employees, directory, login)

    if (wantApply) {
      say('===== تطبيق فعلي =====')
      say(`هيتكتب على قاعدة: ${database}`)
      say('')
    } else {
      say('===== معاينة (مفيش أي كتابة) =====')
    }
    const summary = await sync.run({ apply: wantApply })
    const c = summary.counts
    say(`حسابات في الدليل     : ${c.scanned} (مفعّلة: ${c.adEnabled})`)
    say(`موظفين اتطابقوا      : ${c.employees}`)
    say(`حساب جديد            : ${c.create}${wantApply ? ` (اتعمل: ${summary.entries.filter((e) => e.action === 'create' && e.applied).length})` : ' (هيتعمل)'}`)
    say(`ربط حساب قائم        : ${c.link}${wantApply ? ` (اتربط: ${summary.entries.filter((e) => e.action === 'link' && e.applied).length})` : ' (هيتربط)'}`)
    say(`تخطّي                : ${c.skip}`)
    say(`تعارض                : ${c.conflict}`)
    if (c.failed) say(`فشل                  : ${c.failed}`)
    say('')
    say('===== أسباب التخطّي والتعارض =====')
    for (const row of summary.reasons) {
      say(`${pad(row.count, 6)}${pad(row.reason, 20)}${row.reasonText}`)
    }

    if (showCount > 0) {
      const rows = summary.entries.filter((e) => !onlyReason || e.reason === onlyReason)
      say('')
      say(`===== الصفوف (${Math.min(rows.length, showCount)} من ${rows.length}) =====`)
      say(`${pad('حساب المجال', 24)}${pad('الإجراء', 14)}${pad('الكود', 12)}${pad('الموظف', 26)}البريد / السبب`)
      for (const entry of rows.slice(0, showCount === Infinity ? rows.length : showCount)) {
        const tail = entry.action === 'create' || entry.action === 'link'
          ? entry.email
          : `${entry.reasonText}${entry.candidates.length ? ` → ${entry.candidates.map((x) => `${x.employeeCode} ${x.fullName}`).join(' | ')}` : ''}${entry.error ? ` (${entry.error})` : ''}`
        say(`${pad(entry.sAMAccountName, 24)}${pad(DOMAIN_SYNC_ACTIONS[entry.action], 14)}${pad(entry.employeeCode ?? '-', 12)}${pad(entry.employeeName ?? '-', 26)}${tail}`)
      }
    } else {
      say('')
      say('لعرض الصفوف: --show 50  أو  --show all   (وتقدر تفلتر بسبب واحد: --only noMatch)')
    }

    say('')
    if (wantApply) {
      say(`✅ خلص. اتعمل ${summary.entries.filter((e) => e.action === 'create' && e.applied).length} حساب جديد، ` +
        `واتربط ${summary.entries.filter((e) => e.action === 'link' && e.applied).length} حساب قائم. ` +
        'كلهم بدور «موظف» وبلا صلاحيات إضافية — اسند الأدوار من: الإعدادات ← المستخدمين.')
      say('التمرير ده آمن للتكرار: تشغيله تاني مش هيغيّر حاجة.')
    } else {
      say('دي معاينة بس — مفيش صف اتكتب. للتنفيذ: node scripts/sync-domain-users.cjs --apply')
    }
  } finally {
    await ds.destroy().catch(() => {})
  }
})().catch((error) => {
  say('حصل خطأ: ' + scrub(error && error.message ? error.message : error).slice(0, 500))
  process.exit(1)
})

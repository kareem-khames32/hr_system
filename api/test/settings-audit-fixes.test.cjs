// تدقيق ما قبل المسير — إعدادات النظام: خمس إصلاحات بلا قاعدة بيانات.
// 1) سماحية التأخير العامة توصل للتعريفات القائمة بنسخة مؤرخة، والماضي ما يتغيرش
// 2) قارئ إيقاف خصم نقص الساعات بالمفتاح اللي الشاشة بتضبطه
// 3) معامل عقوبة الغياب السالب مرفوض (وكل مفتاح رقمي مبذور له حد أدنى)
// 4) مفاتيح كان الخادم يقرأها ومحدش يقدر يضبطها بقت مبذورة
// 5) GET /settings/company بيرجّع مفاتيح ملف الشركة كلها
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })

const history = require('../src/attendance/attendance-rule-history')
const { AttendanceRuleVersion } = require('../src/attendance/attendance-rule.entities')
const { Shift, WorkSchedule } = require('../src/assets/assets.entities')
const { RequestsConfig } = require('../src/requests/entities/requests-config.entity')
const { configSeed } = require('../src/seed/requests-seed.data')
const { COMPANY_PROFILE_NEW_KEYS, COMPANY_PROFILE_FIELD_NAMES } = require('../src/settings/company-profile')

// الملفات على القرص CRLF — أي فحص نصي يطبّع أولاً
const source = file => fs.readFileSync(path.join(apiRoot, file), 'utf8').replace(/\r\n/g, '\n')
const seeded = new Map(configSeed.map(row => [row.key, row.value]))

// ===== EntityManager مزيّف: بس اللي بيستخدمه applyGeneralGraceToAttendanceRules =====
function fakeEntityManager({ shifts = [], schedules = [], versions = [], config = {} }) {
  let nextId = Math.max(100, ...versions.map(row => row.id ?? 0)) + 1
  const rows = entity => entity === Shift ? shifts : entity === WorkSchedule ? schedules
    : entity === AttendanceRuleVersion ? versions
      : entity === RequestsConfig ? Object.entries(config).map(([key, value]) => ({ key, value })) : []
  const em = {
    find: async (entity, options) => {
      const all = rows(entity)
      const where = options && options.where
      if (entity === AttendanceRuleVersion && where) {
        return all.filter(row => row.sourceType === where.sourceType && row.sourceId === where.sourceId)
      }
      return all
    },
    findOneBy: async (entity, where) => rows(entity).find(row => row.key === where.key) ?? null,
    create: (entity, data) => ({ id: nextId++, ...data }),
    save: async (entity, row) => { if (entity === AttendanceRuleVersion) versions.push(row); return row },
    existsBy: async () => true,
    getRepository: entity => ({
      find: options => em.find(entity, options),
      findOneBy: where => em.findOneBy(entity, where),
      create: data => em.create(entity, data),
      save: row => em.save(entity, row),
    }),
  }
  return { em, versions }
}

const legacyBaseline = (sourceType, sourceId, snapshot) => ({ id: sourceId * 10, sourceType, sourceId,
  version: 0, effectiveFrom: null, legacyBaseline: true, snapshot })

// ===== 1) سماحية التأخير العامة =====
test('الإصلاح 1: تغيير السماحية العامة يولّد نسخة مؤرخة لكل تعريف ساري، والقيمة القديمة تفضل في نسخها', async () => {
  const schedule = { id: 1, name: 'جدول قائم', startTime: '08:00', endTime: '17:00', weekendDays: 'FRI,SAT', isActive: true, isDefault: true }
  const shift = { id: 2, name: 'وردية بسماحية خاصة', startTime: '08:00', endTime: '17:00', graceMinutes: 5, isActive: true, shiftMode: 'fixed' }
  const sameValue = { id: 3, name: 'جدول على نفس القيمة الجديدة', startTime: '08:00', endTime: '17:00', weekendDays: 'FRI,SAT', isActive: true }
  const future = { id: 4, name: 'جدول كل نسخه في المستقبل', startTime: '08:00', endTime: '17:00', weekendDays: 'FRI,SAT', isActive: true }
  const versions = [
    legacyBaseline('WORK_SCHEDULE', 1, { ...schedule, generalGraceMinutes: 10, flexPolicy: {} }),
    legacyBaseline('SHIFT', 2, { ...shift, generalGraceMinutes: 10, flexPolicy: {} }),
    legacyBaseline('WORK_SCHEDULE', 3, { ...sameValue, generalGraceMinutes: 0, flexPolicy: {} }),
    { id: 41, sourceType: 'WORK_SCHEDULE', sourceId: 4, version: 1, effectiveFrom: '2030-01-01',
      legacyBaseline: false, snapshot: { ...future, generalGraceMinutes: 10, flexPolicy: {} } },
  ]
  const { em } = fakeEntityManager({ shifts: [shift], schedules: [schedule, sameValue, future],
    versions, config: { 'attendance.grace_minutes': '10' } })
  const before = versions.map(row => JSON.parse(JSON.stringify(row)))

  const appended = await history.applyGeneralGraceToAttendanceRules(em, 0, '2026-09-21', 'تغيير السماحية العامة إلى 0', 7)

  assert.deepEqual(appended.map(row => `${row.sourceType}:${row.sourceId}`).sort(), ['SHIFT:2', 'WORK_SCHEDULE:1'],
    'نسخة جديدة للتعريفات السارية اللي قيمتها مختلفة فقط')
  assert.equal(appended.length, 2, 'التعريف على نفس القيمة والتعريف المستقبلي ما بياخدوش نسخة (لا تكثير نسخ)')
  for (const row of before) {
    const stored = versions.find(candidate => candidate.id === row.id)
    assert.deepEqual(JSON.parse(JSON.stringify(stored)), row, `النسخة ${row.id} القديمة اتغيرت — الماضي لازم يفضل مجمّد`)
  }
  for (const entry of appended) {
    const saved = versions.find(row => row.id === entry.versionId)
    assert.equal(saved.effectiveFrom, '2026-09-21')
    assert.equal(saved.legacyBaseline, false)
    assert.equal(saved.actorUserId, 7)
    assert.equal(saved.snapshot.generalGraceMinutes, 0, 'النسخة الجديدة بتحمل القيمة الجديدة')
    assert.equal(saved.version, 1, 'نسخة مؤرخة بعد الأساس القديم (0)')
  }
  // باقي اللقطة كما هي: النسخة الجديدة تعريف دوام كامل، مش قيمة سماحية معلّقة
  const scheduleVersion = versions.find(row => row.id === appended.find(entry => entry.sourceId === 1).versionId)
  assert.equal(scheduleVersion.snapshot.startTime, '08:00')
  assert.equal(scheduleVersion.snapshot.isActive, true)
  assert.equal(scheduleVersion.snapshot.isDefault, true, 'تعريف افتراضي يفضل افتراضي')
})

test('الإصلاح 1: يوم قبل تاريخ السريان يحتفظ بسماحيته القديمة، واليوم من تاريخ السريان ياخد الجديدة', async () => {
  const schedule = { id: 1, name: 'جدول قائم', startTime: '08:00', endTime: '17:00', isActive: true }
  const rows = [
    legacyBaseline('WORK_SCHEDULE', 1, { ...schedule, generalGraceMinutes: 10, flexPolicy: {} }),
    { id: 11, sourceType: 'WORK_SCHEDULE', sourceId: 1, version: 1, effectiveFrom: '2026-09-21',
      legacyBaseline: false, snapshot: { ...schedule, generalGraceMinutes: 0, flexPolicy: {} } },
  ]
  const { em } = fakeEntityManager({ config: { 'attendance.grace_minutes': '0' } })
  const graceOn = async date => {
    const picked = history.pickAttendanceRule(rows, date, schedule)
    const resolved = await history.resolveAttendanceGrace(em, date, { sourceType: 'WORK_SCHEDULE', sourceId: 1,
      sourceVersionId: picked.versionId, sourceVersion: picked.version, sourceSettings: picked.snapshot })
    return resolved
  }
  const past = await graceOn('2026-09-14')
  assert.equal(past.minutes, 10, 'يوم قبل التغيير لازم يفضل على 10 دقايق بعد إعادة الحساب')
  assert.equal(past.source, 'SOURCE_SNAPSHOT')
  const onDate = await graceOn('2026-09-21')
  assert.equal(onDate.minutes, 0, 'يوم تاريخ السريان نفسه ياخد القيمة الجديدة')
  const forward = await graceOn('2026-09-22')
  assert.equal(forward.minutes, 0, 'يوم بعد التغيير ياخد القيمة الجديدة')
})

test('الإصلاح 1: سماحية الوردية تعلو العامة قبل التغيير وبعده', async () => {
  const shift = { id: 2, name: 'وردية بسماحية خاصة', graceMinutes: 5, startTime: '08:00', endTime: '17:00', isActive: true }
  const rows = [
    legacyBaseline('SHIFT', 2, { ...shift, generalGraceMinutes: 10, flexPolicy: {} }),
    { id: 21, sourceType: 'SHIFT', sourceId: 2, version: 1, effectiveFrom: '2026-09-21',
      legacyBaseline: false, snapshot: { ...shift, generalGraceMinutes: 0, flexPolicy: {} } },
  ]
  const { em } = fakeEntityManager({ config: { 'attendance.grace_minutes': '0' } })
  for (const date of ['2026-09-14', '2026-09-22']) {
    const picked = history.pickAttendanceRule(rows, date, shift)
    const resolved = await history.resolveAttendanceGrace(em, date, { sourceType: 'SHIFT', sourceId: 2,
      sourceVersionId: picked.versionId, sourceVersion: picked.version, sourceSettings: picked.snapshot })
    assert.equal(resolved.minutes, 5, `سماحية الوردية هي السارية في ${date}`)
    assert.equal(resolved.source, 'SHIFT_OVERRIDE')
  }
})

test('الإصلاح 1: حفظ attendance.grace_minutes بيولّد النسخة المؤرخة داخل نفس معاملة الأقفال', () => {
  const controller = source('src/settings/settings.controller.ts')
  const branch = controller.slice(controller.indexOf("dto.key === 'attendance.grace_minutes'"))
  const block = branch.slice(0, branch.indexOf('row.value = dto.value'))
  assert.match(block, /lockAttendanceRuleMutation\(em\)/)
  const baselines = block.indexOf('captureLegacyAttendanceRuleBaselines')
  const apply = block.indexOf('applyGeneralGraceToAttendanceRules')
  const write = block.indexOf('current.value = dto.value')
  assert.ok(baselines > 0 && apply > baselines, 'الأساس القديم يُجمّد قبل توليد النسخة الجديدة')
  assert.ok(write > apply, 'النسخة المؤرخة قبل كتابة القيمة الجديدة، فلقطة «قبل» تحمل القيمة القديمة')
  assert.match(block, /attendanceRuleToday\(\)/, 'تاريخ السريان = تاريخ التغيير')
})

// ===== 2) مفتاح إيقاف خصم نقص الساعات =====
test('الإصلاح 2: التراكم اليومي بيقرا payroll.shortfall_enabled (المفتاح المبذور اللي الشاشة بتضبطه)', () => {
  const service = source('src/payroll/payroll-daily-accrual.service.ts')
  const basis = service.slice(service.indexOf('async deductionBasis'), service.indexOf('// ===== تراكم مدى لموظف واحد'))
  assert.match(basis, /shortfallEnabled: value\('payroll\.shortfall_enabled', 'true'\) === 'true'/)
  assert.ok(!/'payroll\.shortfall_deduction_enabled'/.test(basis), 'الاسم القديم غير المبذور اختفى من القراءة')
  assert.match(basis, /In\(\[[^\]]*'payroll\.shortfall_enabled'/s, 'المفتاح نفسه في قائمة الاستعلام')
})

test('الإصلاح 2: مفيش قارئ تاني لإعداد نقص الساعات بمفتاح غير مبذور', () => {
  const orphans = new Set()
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) { walk(full); continue }
      if (!entry.name.endsWith('.ts')) continue
      const text = fs.readFileSync(full, 'utf8').replace(/\r\n/g, '\n')
      for (const match of text.matchAll(/'((?:payroll|attendance)\.[a-z0-9_.]*shortfall[a-z0-9_.]*)'/g)) {
        if (!seeded.has(match[1])) orphans.add(`${path.relative(apiRoot, full)} → ${match[1]}`)
      }
    }
  }
  walk(path.join(apiRoot, 'src'))
  assert.deepEqual([...orphans], [], 'مفاتيح نقص ساعات مقروءة وغير مبذورة')
})

// ===== 3) الحدود الرقمية =====
test('الإصلاح 3: معامل عقوبة الغياب وباقي المفاتيح الرقمية المبذورة ليها حد أدنى', () => {
  const controller = source('src/settings/settings.controller.ts')
  const list = controller.slice(controller.indexOf('NUMERIC_MIN'), controller.indexOf('ALLOWED_VALUES'))
  const mins = new Map([...list.matchAll(/'([^']+)':\s*(-?[\d.]+)/g)].map(row => [row[1], Number(row[2])]))
  assert.equal(mins.get('attendance.absence_penalty_days'), 0, 'الغياب السالب كان بيقلب العقوبة إضافة للموظف')
  assert.equal(mins.get('attendance.holiday_work_multiplier'), 0.01)
  assert.equal(mins.get('attendance.sync_interval_minutes'), 0)
  assert.equal(mins.get('payroll.daily_accrual_hour'), 0)
  // المسح: كل مفتاح رقمي مبذور يرفض القيمة السالبة — بالحد الأدنى هنا أو بمتحقّقه الخاص
  const validators = [
    require('../src/payroll/payroll-decision-settings').payrollDecisionConfigError,
    require('../src/payroll/typed-deductions').deductionSettingError,
    require('../src/payroll/bonuses').bonusSettingError,
    require('../src/payroll/financial-exemptions').exemptionSettingError,
    require('../src/payroll/payroll-policy-settings').validatePayrollPolicyDefaultConfig,
    require('../src/offboarding/eos').eosConfigError,
  ]
  const rejectsNegative = key => {
    for (const validate of validators) {
      try { if (validate(key, '-1')) return true } catch { return true }
    }
    return false
  }
  const unguarded = []
  for (const [key, value] of seeded) {
    if (value === '' || !/^-?\d+(\.\d+)?$/.test(value)) continue
    if (mins.has(key)) {
      assert.ok(Number(value) >= mins.get(key), `القيمة المبذورة لـ${key} أقل من حدها الأدنى`)
      continue
    }
    if (!rejectsNegative(key)) unguarded.push(key)
  }
  assert.deepEqual(unguarded, [], 'مفاتيح رقمية مبذورة بتقبل قيمة سالبة')
})

test('الإصلاح 3: الحد الأعلى ورسالة عربية لمعامل عقوبة الغياب ومضاعف العطلة', () => {
  const controller = source('src/settings/settings.controller.ts')
  const penalty = controller.slice(controller.indexOf("if (dto.key === 'attendance.absence_penalty_days')"))
  const message = penalty.slice(0, penalty.indexOf('}\n    }'))
  assert.match(message, /9999/, 'نفس حدّ تجاوز المعادلة (payroll-policy.dto.ts)')
  assert.match(message, /[؀-ۿ]{3,}/, 'رسالة عربية زي المفاتيح المجاورة')
  const multiplier = controller.slice(controller.indexOf("if (dto.key === 'attendance.holiday_work_multiplier')"))
  assert.match(multiplier.slice(0, 400), /99\.99/)
  assert.match(multiplier.slice(0, 400), /[؀-ۿ]{3,}/)
})

// ===== 4) مفاتيح كان الخادم يقرأها ومحدش يقدر يضبطها =====
test('الإصلاح 4: مفاتيح التراكم اليومي ودولة النظام مبذورة بقيمها الاحتياطية', () => {
  const accrual = source('src/payroll/payroll-daily-accrual.ts')
  assert.match(accrual, /PAYROLL_ACCRUAL_ENABLED_KEY = 'payroll\.daily_accrual_enabled'/)
  assert.match(accrual, /PAYROLL_ACCRUAL_HOUR_KEY = 'payroll\.daily_accrual_hour'/)
  assert.equal(seeded.get('payroll.daily_accrual_enabled'), 'true', 'نفس القيمة الاحتياطية في الخدمة')
  assert.equal(seeded.get('payroll.daily_accrual_hour'), '2', 'نفس القيمة الاحتياطية في الجار الليلي')
  assert.equal(seeded.get('system.country'), '', 'نفس القيمة الاحتياطية في catalogs.controller (فارغ = كل الدول)')
  // القيمة الاحتياطية في الكود لسه مطابقة للمبذور، فما فيش سلوكين لنفس المفتاح
  assert.match(source('src/payroll/payroll-daily-accrual.scheduler.ts'), /PAYROLL_ACCRUAL_HOUR_KEY, '2'/)
  const controller = source('src/settings/settings.controller.ts')
  const allowed = controller.slice(controller.indexOf('ALLOWED_VALUES'), controller.indexOf("@Patch('config')"))
  assert.match(allowed, /'payroll\.daily_accrual_enabled': \['true', 'false'\]/, 'صمام الأمان بولياني')
  const hour = controller.slice(controller.indexOf("'payroll.daily_accrual_hour'].includes(dto.key)"))
  assert.match(hour.slice(0, 500), /23/, 'ساعة التشغيل من 0 إلى 23')
  const country = controller.slice(controller.indexOf("if (dto.key === 'system.country')"))
  assert.match(country.slice(0, 400), /\[A-Za-z\]\{2,5\}/, 'رمز دولة أو فارغ')
  assert.match(country.slice(0, 400), /[؀-ۿ]{3,}/)
})

test('الإصلاح 4: كل مفتاح إعداد يقرأه الخادم بقيمة احتياطية مبذور (PATCH /settings/config مايردّهوش 404)', () => {
  // مفاتيح حالة داخلية بيكتبها الخادم لنفسه، مش إعدادات يضبطها المستخدم
  const state = new Set(['attendance.absences_materialized_through', 'leave.rollover_through_period'])
  const orphans = new Set()
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) { walk(full); continue }
      if (!entry.name.endsWith('.ts') || entry.name.endsWith('.data.ts')) continue
      const text = fs.readFileSync(full, 'utf8').replace(/\r\n/g, '\n')
      for (const match of text.matchAll(/key: '((?:payroll|attendance|system|leave|overtime)\.[a-z0-9_.]+)'/g)) {
        if (!seeded.has(match[1]) && !state.has(match[1])) orphans.add(`${path.relative(apiRoot, full)} → ${match[1]}`)
      }
    }
  }
  walk(path.join(apiRoot, 'src'))
  assert.deepEqual([...orphans].sort(), [], 'مفاتيح مقروءة بـkey: «...» وغير مبذورة')
})

// ===== 5) ملف الشركة كامل من GET /settings/company =====
test('الإصلاح 5: الرد بيغطي مفاتيح ملف الشركة الـ23 كلها والأسماء القديمة كما هي', () => {
  assert.equal(COMPANY_PROFILE_NEW_KEYS.length, 17)
  for (const key of COMPANY_PROFILE_NEW_KEYS) {
    assert.ok(COMPANY_PROFILE_FIELD_NAMES[key], `مفتاح مخزَّن بلا اسم في الرد: ${key}`)
  }
  assert.equal(Object.keys(COMPANY_PROFILE_FIELD_NAMES).length, 17, 'مفيش اسم زيادة لمفتاح مش موجود')
  const names = Object.values(COMPANY_PROFILE_FIELD_NAMES)
  assert.equal(new Set(names).size, names.length, 'مفيش اسمين متشابهين في الرد')
  for (const legacy of ['name', 'nameEn', 'commercialRegister', 'address', 'phone', 'logoFileId']) {
    assert.ok(!names.includes(legacy), `${legacy} اسم قديم في الرد — مينفعش مفتاح جديد ياخده`)
  }
  assert.equal(COMPANY_PROFILE_FIELD_NAMES['company.payroll_iban'], 'payrollIban')
  assert.equal(COMPANY_PROFILE_FIELD_NAMES['company.wps_establishment_id'], 'wpsEstablishmentId')
  const controller = source('src/settings/settings.controller.ts')
  const endpoint = controller.slice(controller.indexOf("@Get('company')"), controller.indexOf('NUMERIC_MIN'))
  assert.match(endpoint, /COMPANY_PROFILE_FIELD_NAMES/, 'الرد مبني على نفس قائمة المفاتيح، فما يقدرش يفوت مفتاح')
  const returned = endpoint.slice(endpoint.indexOf('return {'))
  for (const [field, expression] of [['name', 'withoutDataPlaceholder(v(\'company.name\'))'], ['nameEn', "v('company.name_en')"],
    ['commercialRegister', "v('company.commercial_register')"], ['address', "v('company.address')"], ['phone', "v('company.phone')"]]) {
    assert.ok(returned.includes(`${field}: ${expression}`), `الاسم القديم «${field}» اتغير في الرد — توافق خلفي مكسور`)
  }
  assert.match(returned, /logoFileId: Number\.isInteger\(logo\)/, 'الشعار لسه رقم أو null زي ما كان')
  assert.match(endpoint, /In\(\[\.\.\.legacy, \.\.\.Object\.keys\(COMPANY_PROFILE_FIELD_NAMES\)\]\)/, 'الاستعلام بيقرا المفاتيح كلها')
  // قارئو بيانات الشركة في الخطابات والمستندات بيقروا الصفوف مباشرة، فشكل الرد ما يخصهمش
  for (const file of ['src/letters/letters.service.ts', 'src/hr-documents/hr-documents.service.ts']) {
    assert.ok(!/settings\/company/.test(source(file)), `${file} مايعتمدش على شكل رد /settings/company`)
  }
})

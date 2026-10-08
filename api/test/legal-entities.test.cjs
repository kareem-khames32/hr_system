'use strict'
// B4.1-أ: الكيان القانوني — فحص من غير قاعدة (الدورة الفعلية في legal-entities.integration.cjs والترحيلين في legal-entities-migration.integration.cjs):
//  LU-01) القواعد: قيم الإنشاء والتعديل، والعملة عملة الدولة، والدولة مابتتغيّرش، والآيبان بدولة الكيان، والمنطقة الزمنية، والنواقص،
//         وعملة الفرع: كيانه لو معروف العملة وإلا القاعدة القديمة.
//  LU-02) الربط: قرّاء العملة بمصدر واحد قبل الترحيل وبعده، وعمود الفرع برّه قراءة وكتابة الكيان، والكتابة تحت القفل وبالخانات، وفك الربط عند
//         تغيير دولة الفرع، وحارس المسير في الحفظ والتعديل (مش النسخ ولا التكميلي)، ومسار التحذير قبل المسار بالرقم، والواجهة.
//  LU-03) (الجزء ب) اليوم المحلي في منطقة، ومهمة الغياب: مجموعة عامة بفروع الكيانات المزمّنة مستبعدة، ومجموعة لكل كيان بحالته وبدايته.
// Run (من api/): node --test test/legal-entities.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const rules = require('../src/org/legal-entities')
const root = path.resolve(__dirname, '..', '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n')
const refuses = (work, label) => assert.throws(work, error => error?.getStatus?.() === 400, label)
const SA_IBAN = 'SA' + '1'.repeat(22), EG_IBAN = 'EG' + '2'.repeat(27)

test('LU-01: creating and editing values, currency from the country, a fixed country, the IBAN of the entity country, the time zone, the gaps, and the branch currency', () => {
  const create = raw => rules.cleanLegalEntityValues(raw, null), edit = (raw, country = 'SA') => rules.cleanLegalEntityValues(raw, { country })
  assert.deepEqual(create({ name: '  كيان   السعودية ', country: 'sa' }), { name: 'كيان السعودية', country: 'SA', currency: 'SAR' })
  assert.deepEqual(create({ name: 'كيان مصر', country: 'EG', nameEn: ' Egypt Co ', timeZone: ' Africa/Cairo ', taxNumber: ' 123 ', payrollIban: ` eg${'2'.repeat(27)} `, cycleStartDay: 1, isActive: true }),
    { name: 'كيان مصر', nameEn: 'Egypt Co', country: 'EG', currency: 'EGP', timeZone: 'Africa/Cairo', taxNumber: '123', payrollIban: EG_IBAN, cycleStartDay: 1, isActive: true })
  for (const bad of [{}, { name: 'ك', country: 'SA' }, { name: 'كيان' }, { name: 'كيان', country: 'AE' }, { name: 'كيان', country: 5 }, { name: 'كيان', country: 'SA', nameEn: 5 },
    { name: 'كيان', country: 'SA', timeZone: 'Riyadh' }, { name: 'كيان', country: 'SA', timeZone: 'Asia/Nowhere' }, { name: 'كيان', country: 'SA', qiwaNumber: 7 },
    { name: 'كيان', country: 'SA', wpsNumber: 'ت'.repeat(101) }, { name: 'كيان', country: 'SA', payrollBankName: 'ت'.repeat(201) }, { name: 'كيان', country: 'SA', payrollIban: EG_IBAN },
    { name: 'كيان', country: 'EG', payrollIban: SA_IBAN }, { name: 'كيان', country: 'SA', payrollIban: 'SA12' }, { name: 'كيان', country: 'SA', cycleStartDay: 0 },
    { name: 'كيان', country: 'SA', cycleStartDay: 29 }, { name: 'كيان', country: 'SA', cycleStartDay: 1.5 }, { name: 'كيان', country: 'SA', isActive: 'yes' }]) refuses(() => create(bad), JSON.stringify(bad).slice(0, 70))
  // التعديل: المبعوت بس، والفاضي بيفضّي الاختياري، والعملة مابتتبعتش، والدولة مابتتغيّرش
  assert.deepEqual([edit({}), edit({ country: 'sa' }), edit({ timeZone: '', taxNumber: null, payrollIban: '', cycleStartDay: null, nameEn: '' }), edit({ payrollIban: SA_IBAN, isActive: false })],
    [{}, {}, { timeZone: null, taxNumber: null, payrollIban: null, cycleStartDay: null, nameEn: null }, { payrollIban: SA_IBAN, isActive: false }])
  for (const bad of [{ country: 'EG' }, { name: '' }, { payrollIban: EG_IBAN }]) refuses(() => edit(bad), JSON.stringify(bad).slice(0, 40))
  assert.deepEqual(edit({ payrollIban: EG_IBAN }, 'EG'), { payrollIban: EG_IBAN })
  assert.deepEqual([rules.entityCurrencyOf('EG'), rules.entityCurrencyOf('SA')], ['EGP', 'SAR'])
  assert.deepEqual(['Africa/Cairo', 'Asia/Riyadh', 'America/Argentina/Buenos_Aires', 'Riyadh', 'UTC', '', 'Asia/Riyadh; DROP'].map(rules.validTimeZone), [true, true, true, false, false, false, false])

  const full = { country: 'SA', commercialRegister: '1', taxNumber: '2', insuranceNumber: '3', qiwaNumber: '4', payrollIban: SA_IBAN, wpsNumber: '5' }
  assert.deepEqual([rules.legalEntityGaps(full), rules.legalEntityGaps({ ...full, qiwaNumber: null, wpsNumber: null }), rules.legalEntityGaps({ ...full, country: 'EG', qiwaNumber: null, wpsNumber: null }),
    rules.legalEntityGaps({ country: 'EG', commercialRegister: null, taxNumber: null, insuranceNumber: null, qiwaNumber: null, payrollIban: null, wpsNumber: null })],
  [[], ['رقم قوى', 'رقم حماية الأجور'], [], ['السجل التجاري', 'الرقم الضريبي', 'رقم منشأة التأمينات', 'آيبان بنك الرواتب']])

  // عملة الفرع: كيانه لو عملته معروفة؛ غير كده القاعدة القديمة بالحرف (دولته، وإلا عملة النظام)
  const { branchCurrency } = require('../src/org/branch-currency')
  for (const [country, system] of [['EG', 'SAR'], ['SA', 'EGP'], [null, 'EGP'], ['AE', 'SAR'], ['', 'SAR']]) {
    for (const none of [null, undefined, '', 'USD']) assert.equal(rules.currencyOfBranch(none, country, system), branchCurrency(country, system), `${country}/${system}/${none}`)
  }
  assert.deepEqual([rules.currencyOfBranch('EGP', null, 'SAR'), rules.currencyOfBranch('SAR', 'EG', 'EGP')], ['EGP', 'SAR'])
})

test('LU-02: one currency source before and after the migration, the branch column outside the entity, locked field-only writes, the unlink on a country change, the payroll guard, the routes and the screens', () => {
  const readers = read('api/src/org/branch-currency-db.ts')
  assert.match(readers, /\(await legalEntitiesReady\(em\)\)\n    \? 'SELECT b\.\[id\], b\.\[country\], e\.\[currency\] AS \[entityCurrency\] FROM dbo\.branches b LEFT JOIN dbo\.legal_entities e ON e\.\[id\] = b\.\[legalEntityId\]'\n    : 'SELECT b\.\[id\], b\.\[country\], NULL AS \[entityCurrency\] FROM dbo\.branches b'/)
  assert.equal((readers.match(/await branchCurrencySource\(em\)/g) ?? []).length, 2, 'قارئ الفرع الواحد وقارئ كل الفروع من نفس المصدر')
  assert.equal((readers.match(/currencyOfBranch\(/g) ?? []).length, 2)
  assert.doesNotMatch(readers, /branchCurrency\(/, 'مفيش اشتقاق من الدولة برّه القاعدة الواحدة')
  assert.match(read('api/src/org/currency-context.controller.ts'), /ownCurrency = await readBranchCurrency\(em, rows\[0\]\.branchId, defaultCurrency\)/)

  assert.match(read('api/src/org/entities/branch.entity.ts'), /@Column\(\{ type: 'int', nullable: true, select: false, insert: false, update: false \}\)\n  legalEntityId\?: number \| null/)
  const source = read('api/src/org/legal-entities.ts')
  assert.match(source, /OBJECT_ID\(N'dbo\.legal_entities', N'U'\) IS NOT NULL AND COL_LENGTH\(N'dbo\.branches', N'legalEntityId'\) IS NOT NULL/)
  assert.doesNotMatch(source.slice(source.indexOf('export class LegalEntity'), source.indexOf('export const LEGAL_ENTITIES_MIGRATION_MISSING')), /default:/, 'الكيان من غير قيم افتراضية')

  const service = read('api/src/org/legal-entities.service.ts')
  assert.equal((service.match(/assertCompanyWideWrite\(user\)/g) ?? []).length, 4, 'القراءة والإنشاء والتعديل والربط لحساب الشركة كلها')
  assert.doesNotMatch(service, /\.save\(/, 'من غير حفظ كيان كامل')
  const update = service.slice(service.indexOf('  async update('), service.indexOf('  async linkBranch('))
  assert.ok(update.indexOf("lock: { mode: 'pessimistic_write' }") > 0 && update.indexOf("lock: { mode: 'pessimistic_write' }") < update.indexOf('cleanLegalEntityValues(input, row)'), 'القيم بتتحكم على الصف المقفول')
  assert.match(update, /WITH \(UPDLOCK, HOLDLOCK\) WHERE \[legalEntityId\] = @0/)
  const linking = service.slice(service.indexOf('  async linkBranch('))
  const order = ["getRepository(LegalEntity).findOne({ where: { id: entityId }, lock: { mode: 'pessimistic_write' } })", 'await this.branches(em, branchId)', 'entity.isActive !== true',
    'country && country !== entity.country', 'UPDATE dbo.branches SET [legalEntityId] = @1 WHERE [id] = @0'].map(part => linking.indexOf(part))
  assert.ok(order.every((at, index) => at > 0 && (index === 0 || at > order[index - 1])), 'الكيان ثم الفرع تحت القفل، والحكم قبل الكتابة: ' + order.join(','))
  assert.equal((service.match(/await recordAudit\(/g) ?? []).length, 3)

  // دولة الفرع اتغيّرت: كيانه القديم بيتفك جوه معاملة التعديل
  const orgService = read('api/src/org/org.service.ts')
  assert.match(orgService, /if \(countryChanged\) await unlinkBranchEntityOnCountryChange\(em, id, fields\.country\)/)
  assert.match(source, /SET \[legalEntityId\] = NULL WHERE \[id\] = @0 AND \[legalEntityId\] IS NOT NULL AND \[legalEntityId\] NOT IN \(SELECT \[id\] FROM dbo\.legal_entities WHERE \[country\] = @1\)/)

  // حارس المسير: في حفظ المسودة الجديدة (مش النسخ ولا التكميلي) وتعديلها — وقبل الترحيل مفيش حارس
  const payroll = read('api/src/payroll/payroll.service.ts')
  assert.match(payroll, /if \(!correction && !copiedFromRunId\) await assertRunSingleEntity\(em, definition, null\)/)
  assert.match(payroll, /if \(payrollRunTypeOf\(run\) !== 'SUPPLEMENTARY'\) await assertRunSingleEntity\(em, definition, before\)/)
  assert.equal((payroll.match(/assertRunSingleEntity\(/g) ?? []).length, 2)
  const guard = read('api/src/payroll/payroll-run-entities.ts')
  assert.match(guard, /if \(!\(await legalEntitiesReady\(em\)\)\) return \[\]/)
  assert.match(guard, /if \(entities\.length < 2\) return\n  if \(previous && \(await runEntities\(em, previous\)\)\.length > 1\) return/)
  const controller = read('api/src/payroll/payroll.controller.ts')
  assert.ok(controller.indexOf("@Get('runs/entity-warnings')") > 0 && controller.indexOf("@Get('runs/entity-warnings')") < controller.indexOf("@Get('runs/:id')"), 'مسار التحذير قبل المسار بالرقم')
  const entityController = read('api/src/org/legal-entities.controller.ts')
  assert.equal((entityController.match(/@Perm\('settings\.manage'\)/g) ?? []).length, 4)
  assert.ok(entityController.indexOf("@Put('branches/:branchId')") < entityController.indexOf("@Patch(':id')"))

  // الواجهة
  assert.match(read('src/app/settings/page.tsx'), /href: '\/settings\/legal-entities', permission: 'settings\.manage'/)
  assert.match(read('src/components/layout/pageTitles.ts'), /\['\/settings\/legal-entities', 'الكيانات القانونية'\]/)
  assert.match(read('src/app/payroll/page.tsx'), /<PayrollEntityWarnings refreshKey=\{runs\} \/>/)
  const page = read('src/app/settings/legal-entities/page.tsx')
  assert.match(page, /const ok = can\('settings\.manage'\) && isCompanyWideUser\(getCurrentUser\(\)\)/)
  assert.match(page, /invalidateCurrency\(\)/)
  assert.match(page, /disabled=\{!!entity\}/, 'الدولة مابتتعدّلش من الشاشة')
})

test('LU-03: the local day in a zone, and the absence catch-up split into the general group and one group per zoned entity', () => {
  const at = iso => new Date(iso)
  assert.deepEqual([rules.localDateInZone(at('2026-10-08T21:30:00Z'), 'Asia/Riyadh'), rules.localDateInZone(at('2026-10-08T20:30:00Z'), 'Asia/Riyadh'), rules.localDateInZone(at('2026-10-08T21:30:00Z'), 'Africa/Cairo'),
    rules.localDateInZone(at('2026-01-01T00:30:00Z'), 'America/New_York'), rules.localDateInZone(at('2026-12-31T10:30:00Z'), 'Pacific/Kiritimati'), rules.localDateInZone(at('2026-03-01T05:00:00Z'), 'Pacific/Pago_Pago')],
  ['2026-10-09', '2026-10-08', '2026-10-09', '2025-12-31', '2027-01-01', '2026-02-28'])

  const source = read('api/src/org/legal-entities.ts')
  const zones = source.slice(source.indexOf('export async function readEntityZones('), source.indexOf('/** كيان كل فرع مربوط'))
  assert.match(zones, /if \(!\(await legalEntitiesReady\(em\)\)\) return \[\]/)
  assert.match(zones, /WHERE e\.\[isActive\] = 1 AND e\.\[timeZone\] IS NOT NULL AND e\.\[timeZone\] <> N''/)
  assert.match(zones, /if \(!validTimeZone\(String\(row\.timeZone\)\)\) continue/, 'منطقة مش صالحة في القاعدة مابتوقّعش المهمة')

  const attendance = read('api/src/attendance/attendance.service.ts')
  const job = attendance.slice(attendance.indexOf('  async materializeAbsencesCatchUp('), attendance.indexOf('  // ===== تجاوز وردية يوم بعينه'))
  const order = ['const zones = await readEntityZones(this.days.manager)', "const seed = zones.length ? await this.configValue(STATE_KEY, '') : ''",
    "await this.absenceCatchUpRange(STATE_KEY, localDateOf(now), opts, null, zones.flatMap(zone => zone.branchIds), '')",
    'await this.absenceCatchUpRange(`${STATE_KEY}.entity.${zone.entityId}`, localDateInZone(now, zone.timeZone), opts, zone.branchIds, [], seed)'].map(part => job.indexOf(part))
  assert.ok(order.every((at, index) => at > 0 && (index === 0 || at > order[index - 1])), 'المناطق ← الحالة العامة قبل التشغيلة ← المجموعة العامة ← مجموعة لكل كيان: ' + order.join(','))
  assert.match(job, /const to = addDays\(today, -1\) \/\/ أمس\n      let last = await this\.configValue\(STATE_KEY, ''\)\n      if \(!last\) last = seed/)
  assert.match(job, /await this\.materializeAbsencesAll\(from, to, scope, exclude\)/)
  assert.match(job, /await this\.config\.save\(this\.config\.create\(\{ key: STATE_KEY, value: to \}\)\)/)
  assert.match(attendance, /if \(scope != null\) where\.branchId = branchIdIn\(scope\)\n    else if \(excludeBranchIds\.length\) where\.branchId = Not\(In\(excludeBranchIds\)\)/)
})

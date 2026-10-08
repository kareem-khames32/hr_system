// B4.5 (هـ) — المدد القانونية لطلب الاستقالة، وتنبيه الحد الأدنى للأجور: حساب نقي بلا قاعدة بيانات، وعرض بس.
// مصر: إخطار بالشهور ومهلة رد بالأيام؛ السعودية: الاتنين بالأيام؛ دولة تانية = مفيش؛ والأرقام من حزمة الدولة مش ثوابت في الكود.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
const terms = require('../src/requests/resignation-legal-terms')
const wage = require('../src/payroll/minimum-wage-alert')
const { STATUTORY_SEED } = require('../src/statutory/statutory-data')
const entries = STATUTORY_SEED.map(seed => ({ ...seed, verified: false }))
const of = (country, submittedOn, lastWorkingDate, today = submittedOn, rows = entries) => terms.resignationLegalTerms(rows, country, { submittedOn, lastWorkingDate, today })

test('RTU-01: مصر — إخطار 3 شهور من تاريخ التقديم ومهلة رد 10 أيام؛ والإخطار الأقصر والمهلة اللي عدّت متعلّمين', () => {
  assert.deepEqual(of('EG', '2026-10-08', '2026-11-08'), { country: 'EG', noticeLabel: '3 شهور', noticeEndsOn: '2027-01-08', shortNotice: true, replyDays: 10, replyDeadline: '2026-10-18', replyOverdue: false })
  assert.deepEqual([of('EG', '2026-10-08', '2027-01-08').shortNotice, of('EG', '2026-10-08', '2027-01-07').shortNotice, of('EG', '2026-10-08', null).shortNotice], [false, true, false])
  assert.deepEqual([of('EG', '2026-10-08', null, '2026-10-18').replyOverdue, of('EG', '2026-10-08', null, '2026-10-19').replyOverdue], [false, true])
  // نهاية شهر أقصر: 30 نوفمبر + 3 شهور = آخر فبراير
  assert.deepEqual([of('EG', '2026-11-30', null).noticeEndsOn, of('EG', '2027-11-30', null).noticeEndsOn, of('EG', '2026-12-15', null).noticeEndsOn], ['2027-02-28', '2028-02-29', '2027-03-15'])
})

test('RTU-02: السعودية — إخطار 30 يوم ومهلة رد 30 يوم؛ ودولة تانية أو تاريخ ناقص أو قبل سريان الصف = مفيش', () => {
  assert.deepEqual(of('SA', '2026-10-08', '2026-10-20', '2026-11-08'), { country: 'SA', noticeLabel: '30 يوم', noticeEndsOn: '2026-11-07', shortNotice: true, replyDays: 30, replyDeadline: '2026-11-07', replyOverdue: true })
  assert.deepEqual([of('SA', '2026-10-08', '2026-11-07').shortNotice, of('SA', '2026-10-08', null, '2026-11-07').replyOverdue], [false, false])
  assert.deepEqual([of('AE', '2026-10-08', null), of(null, '2026-10-08', null), of('SA', null, null, '2026-10-08'), of('SA', 'bad', null, '2026-10-08'), of('SA', '2025-02-18', null), of('EG', '2025-08-31', null)], [null, null, null, null, null, null])
  // الأرقام من الحزمة
  const changed = entries.map(entry => entry.key === 'sa.termination' ? { ...entry, values: { ...entry.values, notice_employee_days: '45', resignation_silence_days: '15' } } : entry)
  assert.deepEqual([of('SA', '2026-10-08', null, '2026-10-08', changed).noticeEndsOn, of('SA', '2026-10-08', null, '2026-10-08', changed).replyDeadline], ['2026-11-22', '2026-10-23'])
  const broken = entries.map(entry => entry.key === 'sa.termination' ? { ...entry, values: { notice_employee_days: '30' } } : entry)
  assert.equal(of('SA', '2026-10-08', null, '2026-10-08', broken), null)
})

test('RTU-03: الحد الأدنى للأجور — مصر من الحزمة والسعودية مالهاش صف؛ والفرق للإجمالي الأقل بس', () => {
  const eg = wage.minimumWageAt(entries, 'EG', '2026-10-08')
  assert.deepEqual(eg, { country: 'EG', amount: 7000, key: 'eg.minimum_wage', effectiveFrom: '2025-03-01', verified: false })
  assert.deepEqual([wage.minimumWageAt(entries, 'SA', '2026-10-08'), wage.minimumWageAt(entries, null, '2026-10-08'), wage.minimumWageAt(entries, 'EG', '2025-02-28')], [null, null, null])
  assert.deepEqual([wage.minimumWageShortfall(6500.5, eg), wage.minimumWageShortfall(7000, eg), wage.minimumWageShortfall(9000, eg), wage.minimumWageShortfall(0, eg), wage.minimumWageShortfall(100, null)], [499.5, null, null, 7000, null])
  const changed = entries.map(entry => entry.key === 'eg.minimum_wage' ? { ...entry, values: { monthly_amount: '8000' }, verified: true } : entry)
  assert.deepEqual([wage.minimumWageAt(changed, 'EG', '2026-10-08').amount, wage.minimumWageAt(changed, 'EG', '2026-10-08').verified], [8000, true])
})

test('RTU-04: مصدر الكود — عرض بس: ورا إعداده المقفول ولمن تنظيم الموظف ظاهر له، ومن مسار الحسابات القانونية؛ وتنبيه الأجور قراءة بنطاق الحساب', () => {
  const read = rel => fs.readFileSync(path.join(apiRoot, 'src', rel), 'utf8').replace(/\r\n/g, '\n')
  const pure = read('requests/resignation-legal-terms.ts')
  assert.doesNotMatch(pure, /EntityManager|getRepository|\.query\(/)
  const service = read('requests/requests.service.ts')
  assert.match(service, /if \(type\?\.code !== 'RESIGNATION' \|\| !requester \|\| requester\.orgHidden \|\| !req\.submittedAt \|\| !\['SUBMITTED', 'UNDER_REVIEW'\]\.includes\(req\.status\)\) return \{\}/)
  assert.match(service, /if \(setting\?\.value !== 'true'\) return \{\}/)
  assert.equal((service.match(/this\.resignationTerms\(/g) ?? []).length, 1, 'نداء واحد في تفاصيل الطلب')
  const method = service.slice(service.indexOf('  private async resignationTerms('), service.indexOf('  // بطاقة صاحب الطلب: هويته'))
  assert.doesNotMatch(method, /\.save\(|\.update\(|\.insert\(|UPDATE |INSERT /, 'مفيش كتابة')
  assert.match(read('statutory/statutory-calculators.service.ts'), /code: 'RESIGNATION_LEGAL_TERMS'[\s\S]{0,500}enabledKey: RESIGNATION_LEGAL_TERMS_KEY/)
  const { configSeed } = require('../src/seed/requests-seed.data')
  assert.equal(configSeed.some(row => row.key === terms.RESIGNATION_LEGAL_TERMS_KEY), false, 'مش مبذور: مساره حزمة الدولة بس')
  const alert = read('payroll/minimum-wage-alert.ts')
  assert.match(alert, /if \(!inBranchScope\(scope, Number\(branch\.id\)\)\) continue/)
  assert.doesNotMatch(alert, /\.save\(|\.update\(|\.insert\(|UPDATE |INSERT |DELETE /, 'تقرير قراءة بس')
  assert.doesNotMatch(alert.replace(/\/\/.*$/gm, ''), /\b7000\b/, 'ولا رقم قانوني في الكود')
})

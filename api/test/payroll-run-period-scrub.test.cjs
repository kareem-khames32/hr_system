// CR38-B02: فترة المسير المخفي في النصوص — اختبارات نقية بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { HIDDEN_RUN_TEXT, scrubEventReferences, scrubRunPeriods, scrubRunPeriodsDeep } = require('../src/payroll/payroll-run-visibility')

test('CR38-B02: «مسير YYYY-MM» لفترة مخفية بيبقى الوصف العام، وتاريخ العمل والشهر المستهدف والفترة المرئية زي ما هم', () => {
  assert.equal(HIDDEN_RUN_TEXT, 'مسير خارج نطاق صلاحيتك')
  assert.equal(scrubRunPeriods('أُجّل 100 من مسير 2026-08 إلى 2026-09 (يوم 2026-08-04)', ['2026-08']),
    'أُجّل 100 من مسير خارج نطاق صلاحيتك إلى 2026-09 (يوم 2026-08-04)')
  assert.equal(scrubRunPeriods('دخل الموظف مسير 2026-07', ['2026-08']), 'دخل الموظف مسير 2026-07', 'فترة مش مخفية مابتتلمسش')
  assert.equal(scrubRunPeriods('مسير 2026-08 ومسير 2026-08', new Set(['2026-08'])), `${HIDDEN_RUN_TEXT} و${HIDDEN_RUN_TEXT}`)
  assert.equal(scrubRunPeriods(null, ['2026-08']), null)
  assert.equal(scrubRunPeriods('مسير 2026-08', [null, undefined, 'غلط']), 'مسير 2026-08')
})

test('CR38-B02: نص الحدث من غير «#رقم» ولا فترة المسير المخفي، والمبلغ وتاريخ العمل زي ما هم', () => {
  assert.equal(scrubEventReferences('عكس صرف مسير 2026-08 (#4) بمسير العكس #5: عاد السجل معتمدًا بلا مسير', ['2026-08']),
    'عكس صرف مسير خارج نطاق صلاحيتك بمسير العكس: عاد السجل معتمدًا بلا مسير')
  assert.equal(scrubEventReferences('عكس صرف مسير 2026-07 (#9) بمسير العكس #10: أُعيد القسط مستحقًا (300.12 مخصوم سابقًا)', ['2026-07']),
    'عكس صرف مسير خارج نطاق صلاحيتك بمسير العكس: أُعيد القسط مستحقًا (300.12 مخصوم سابقًا)')
  // من غير فترات = نفس سلوك الجولة 37 (الأرقام بس)
  assert.equal(scrubEventReferences('عكس صرف مسير 2026-08 (#4) بمسير العكس #5'), 'عكس صرف مسير 2026-08 بمسير العكس')
})

test('CR38-B02: النسخة العميقة بتنضّف حقول النص بس (اسم وسبب وملاحظة ووصف)، والأرقام والتواريخ والمراجع زي ما هي', () => {
  const when = new Date('2026-08-23T10:00:00Z')
  const value = { id: 7, label: 'مرحّل من قيد #3 (مسير 2026-08): غرامة', amount: '10.00', createdAt: when, targetPeriod: '2026-09',
    lines: [{ label: 'مؤجَّل من مسير 2026-08 بقرار الإعفاء المالي #2: خصم', reason: 'مسير 2026-08', period: '2026-08', runId: 4 }] }
  const out = scrubRunPeriodsDeep(value, new Set(['2026-08']))
  assert.equal(out.label, 'مرحّل من قيد #3 (مسير خارج نطاق صلاحيتك): غرامة')
  assert.equal(out.lines[0].label, 'مؤجَّل من مسير خارج نطاق صلاحيتك بقرار الإعفاء المالي #2: خصم')
  assert.equal(out.lines[0].reason, HIDDEN_RUN_TEXT)
  assert.deepEqual([out.id, out.amount, out.createdAt, out.targetPeriod, out.lines[0].period, out.lines[0].runId], [7, '10.00', when, '2026-09', '2026-08', 4])
  assert.equal(value.label, 'مرحّل من قيد #3 (مسير 2026-08): غرامة', 'الأصل مابيتعدّلش')
  assert.equal(scrubRunPeriodsDeep(value, new Set()), value, 'من غير فترات = نفس القيمة')
  assert.equal(scrubRunPeriodsDeep(value, undefined), value)
})

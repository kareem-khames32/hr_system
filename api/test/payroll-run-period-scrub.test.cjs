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

test('CR39-B01: مفتاح السطر المحجوب ببصمة من الأصل — مفتاحين مختلفين مايبقوش واحد، ونفس المفتاح نفس النتيجة في الصف والعمود، والاسم من غير الفترة', () => {
  const { scrubRunLineKey } = require('../src/payroll/payroll-run-visibility')
  const july = 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: بدل', august = 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-08: بدل'
  const hidden = new Set(['2026-07', '2026-08'])
  assert.notEqual(scrubRunLineKey(july, hidden), scrubRunLineKey(august, hidden))
  assert.equal(scrubRunLineKey(july, hidden), scrubRunLineKey(july, hidden))
  assert.match(scrubRunLineKey(july, hidden), /^ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: بدل~[a-f0-9]{16}$/)
  assert.equal(scrubRunLineKey('BASIC', hidden), 'BASIC')
  const response = { runId: 9, columns: { earnings: [{ key: july, name: july.slice(10) }] }, rows: [{ employeeId: 1, earnings: [{ key: july, name: july.slice(10), amount: 67.89 }] }] }
  const out = scrubRunPeriodsDeep(response, hidden)
  assert.equal(out.columns.earnings[0].key, out.rows[0].earnings[0].key, 'الصف والعمود بنفس المفتاح')
  assert.equal(out.rows[0].earnings[0].name, 'إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: بدل')
  assert.deepEqual([out.runId, out.rows[0].employeeId, out.rows[0].earnings[0].amount], [9, 1, 67.89])
  assert.equal(JSON.stringify(out).includes('2026-07'), false)
})

test('CR40-B01: بصمة المفتاح المحجوب معتمة — مش hash علني للنص الأصلي، فتجربة الشهور من الرد بس مابتطابقش أي شهر', () => {
  const crypto = require('node:crypto')
  const { scrubRunLineKey } = require('../src/payroll/payroll-run-visibility')
  const original = 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: بدل'
  const key = scrubRunLineKey(original, new Set(['2026-07']))
  const split = key.lastIndexOf('~'), rendered = key.slice(0, split), fingerprint = key.slice(split + 1)
  assert.equal(rendered.includes('2026-07'), false)
  // نفس مفكك Codex في الجولة 40 (432 شهر × كل hash علني معروف): مفيش ولا تطابق
  const candidates = []
  for (let year = 2000; year <= 2035; year++) for (let month = 1; month <= 12; month++) {
    const period = `${year}-${String(month).padStart(2, '0')}`
    const guess = rendered.split('مسير خارج نطاق صلاحيتك').join(`مسير ${period}`)
    for (const algorithm of ['sha1', 'sha256', 'sha512', 'md5']) {
      const digest = crypto.createHash(algorithm).update(guess).digest('hex')
      if (digest.startsWith(fingerprint) || digest.slice(0, 8) === fingerprint.slice(0, 8)) candidates.push(`${algorithm}:${period}`)
    }
  }
  assert.deepEqual(candidates, [])
  assert.equal(scrubRunLineKey(original, new Set(['2026-07'])), key, 'ثابتة بين القراءات')
})

test('CR40: قايمة فترات بعد «مسير» — كل فترة مخفية بتتشال والمرئية تفضل', () => {
  assert.equal(scrubRunPeriods('عكس خصم #3 — مسير 2026-07، 2026-08: سبب', ['2026-07', '2026-08']), `عكس خصم #3 — ${HIDDEN_RUN_TEXT}: سبب`)
  assert.equal(scrubRunPeriods('عكس خصم #3 — مسير 2026-07، 2026-08: سبب', ['2026-08']), `عكس خصم #3 — مسير 2026-07، ${HIDDEN_RUN_TEXT}: سبب`)
  assert.equal(scrubRunPeriods('عكس خصم #3 — مسير 2026-07، 2026-08: سبب', ['2026-09']), 'عكس خصم #3 — مسير 2026-07، 2026-08: سبب')
})

test('CR40 (شبكة الأمان): موظفي الرد من employeeId ومن employee.id، والحجب في كل نص ومفتاح واسم خاصية — والأرقام والتواريخ زي ما هي', () => {
  const { responseEmployeeIds, scrubResponseRunPeriods } = require('../src/payroll/hidden-run-periods.interceptor')
  const original = 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: بدل'
  const body = { run: { id: 9, period: '2026-11' }, employee: { id: 4, fullName: 'موظف' }, rows: [{ employeeId: 7, amount: 67.89, items: [{ breakdown: `{"label":"مؤجَّل من مسير 2026-07"}` }] }],
    columns: [{ key: original, name: original.slice(10) }], totalsByKey: { [original]: 67.89 } }
  assert.deepEqual([...responseEmployeeIds(body)].sort(), [4, 7])
  assert.deepEqual([...responseEmployeeIds({ rows: [] }, new Set([3]))], [3])
  const out = scrubResponseRunPeriods(body, new Set(['2026-07']))
  assert.equal(JSON.stringify(out).includes('2026-07'), false)
  assert.equal(out.rows[0].items[0].breakdown, `{"label":"مؤجَّل من ${HIDDEN_RUN_TEXT}"}`)
  const { scrubRunLineKey } = require('../src/payroll/payroll-run-visibility')
  assert.equal(out.columns[0].key, scrubRunLineKey(original, new Set(['2026-07'])))
  assert.deepEqual(Object.keys(out.totalsByKey), [out.columns[0].key], 'اسم الخاصية نفس المفتاح المحجوب')
  assert.deepEqual([out.run, out.rows[0].amount, out.employee.id], [{ id: 9, period: '2026-11' }, 67.89, 4])
})

test('CR39-B02: تسمية نطاق المسير لقارئ فرع — وحدات نطاقه بس، والباقي «وغيرها خارج نطاق صلاحيتك»، والشركة كاملة، والقايمة المخصّصة من غير عدد', () => {
  const { payrollRunScopeLabel } = require('../src/payroll/payroll-reports')
  const names = { branches: new Map([[1, 'فرع ألف'], [2, 'فرع باء']]), departments: new Map([[10, 'قسم ألف'], [20, 'قسم باء']]),
    teams: new Map([[100, 'فريق ألف'], [200, 'فريق باء']]), costCenters: new Map([[7, 'مركز مشروعات']]),
    departmentBranch: new Map([[10, 1], [20, 2]]), teamBranch: new Map([[100, 1], [200, 2]]) }
  const run = (scopeType, scopeIds, employeeIds = null) => ({ scopeType, scopeIds: JSON.stringify(scopeIds), employeeIds, branchId: null })
  assert.equal(payrollRunScopeLabel(run('BRANCH', [1, 2]), names), 'فرع: فرع ألف، فرع باء')
  assert.equal(payrollRunScopeLabel(run('BRANCH', [1, 2]), names, [1]), 'فرع: فرع ألف، وغيرها خارج نطاق صلاحيتك')
  assert.equal(payrollRunScopeLabel(run('BRANCH', [2]), names, [1]), 'فرع: خارج نطاق صلاحيتك')
  assert.equal(payrollRunScopeLabel(run('DEPARTMENT', [10, 20]), names, 1), 'قسم: قسم ألف، وغيرها خارج نطاق صلاحيتك')
  assert.equal(payrollRunScopeLabel(run('TEAM', [100, 200]), names, [1]), 'فريق: فريق ألف، وغيرها خارج نطاق صلاحيتك')
  assert.equal(payrollRunScopeLabel(run('COST_CENTER', [7]), names, [1]), 'مركز تكلفة: مركز مشروعات')
  assert.equal(payrollRunScopeLabel(run('CUSTOM', [], JSON.stringify([1, 2, 3])), names), 'قائمة مخصّصة (3 موظف)')
  assert.equal(payrollRunScopeLabel(run('CUSTOM', [], JSON.stringify([1, 2, 3])), names, [1]), 'قائمة مخصّصة')
  for (const label of [payrollRunScopeLabel(run('BRANCH', [1, 2]), names, [1]), payrollRunScopeLabel(run('DEPARTMENT', [10, 20]), names, [1])]) {
    assert.equal(label.includes('باء'), false)
  }
})

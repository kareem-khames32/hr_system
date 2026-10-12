// B-ADD.17 (طلب المالك 12 أكتوبر): «الطلب وقف عند مين؟» — القواعد الصافية (مين اسمه يظهر لمين، ومن إمتى)، ونص السطر في الواجهة ورسمه،
// وربط الخادم والشاشات. اختبارات نقية بلا قاعدة بيانات. (الملفات على القرص CRLF — تُطبّع قبل الفحص)
// Run (من api/): node --test test/request-holder.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true, compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const React = require('../../node_modules/react')
const { renderToStaticMarkup } = require('../../node_modules/react-dom/server')
const root = path.join(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')
const rules = require('../src/requests/request-holders')
const ui = require('../../src/lib/request-waiting')
const RequestWaitingAt = require('../../src/components/requests/RequestWaitingAt').default

const who = (key, name, branchId, jobTitle = null, employeeId = Number(key.slice(1))) => ({ key, employeeId: key.startsWith('e') ? employeeId : null, name, jobTitle, branchId })
const manager = who('e9', 'منصور', 1, 'مدير المبيعات'), deputy = who('e7', 'نادر', 1, 'نائب'), ceo = who('e3', 'طارق', 2, 'الرئيس التنفيذي')
const structural = (named, delegates = [], role = 'direct_manager_of_requester') => ({ role, named, delegates, accounts: [] })
const functional = (accounts, role = 'hr') => ({ role, named: null, delegates: [], accounts })
const requester = { requesterSide: true, employeeId: 50, scope: [1] }
const branchReader = { requesterSide: false, employeeId: 60, scope: [1] }
const companyReader = { requesterSide: false, employeeId: null, scope: null }

test('RHU-01: مين اسمه يظهر — صاحب الطلب دايمًا، وغيره بفرع الشخص الحالي جوه نطاقه؛ والمسمى بالنطاق للكل؛ ومن غير أرقام', () => {
  // المدير في نطاق القارئ: الاسم والمسمى للكل
  for (const viewer of [requester, branchReader, companyReader]) {
    assert.deepEqual(rules.waitingPeople([structural(manager)], viewer), { people: [{ name: 'منصور', jobTitle: 'مدير المبيعات', role: 'direct_manager_of_requester' }], more: 0 })
  }
  // الشخص في فرع برّه النطاق: صاحب الطلب بياخد الاسم من غير المسمى، وغيره عدد من غير اسم، وحساب كل الفروع الاسم والمسمى
  const skip = [structural(ceo, [], 'manager_of_direct_manager')]
  assert.deepEqual(rules.waitingPeople(skip, requester), { people: [{ name: 'طارق', jobTitle: null, role: 'manager_of_direct_manager' }], more: 0 })
  assert.deepEqual(rules.waitingPeople(skip, branchReader), { people: [], more: 1 })
  assert.deepEqual(rules.waitingPeople(skip, companyReader), { people: [{ name: 'طارق', jobTitle: 'الرئيس التنفيذي', role: 'manager_of_direct_manager' }], more: 0 })
  // الشخص نفسه بيشوف اسمه ومسمّاه حتى لو فرعه برّه نطاق حسابه؛ والنطاق الفاضي مش «الكل»
  assert.deepEqual(rules.waitingPeople(skip, { requesterSide: false, employeeId: 3, scope: [1] }).people, [{ name: 'طارق', jobTitle: 'الرئيس التنفيذي', role: 'manager_of_direct_manager' }])
  assert.deepEqual(rules.waitingPeople([structural(manager)], { requesterSide: false, employeeId: null, scope: [] }), { people: [], more: 1 })
  // شخص من غير فرع (حساب على مستوى الشركة): برّه أي نطاق مقفول
  assert.deepEqual(rules.waitingPeople([functional([who('u4', 'مكتب الموارد البشرية', null)])], branchReader), { people: [], more: 1 })
  assert.deepEqual(rules.waitingPeople([functional([who('u4', 'مكتب الموارد البشرية', null)])], requester).people, [{ name: 'مكتب الموارد البشرية', jobTitle: null, role: 'hr' }])
  // الرد اسم ومسمى ودور بس — من غير مفتاح ولا رقم موظف ولا فرع
  for (const row of rules.waitingPeople([structural(manager, [deputy]), functional([who('e4', 'هدى', 1, 'أخصائية')])], companyReader).people) {
    assert.deepEqual(Object.keys(row).filter(key => !['name', 'jobTitle', 'role', 'onBehalfOfName'].includes(key)), [])
  }
})

test('RHU-02: البديل «بالنيابة عن»، وعدم التكرار، والحد الأقصى و«+N»', () => {
  // البديل الظاهر بيتكتب بالنيابة عن المفوِّض، والمفوِّض مابيتكتبش سطر تاني
  assert.deepEqual(rules.waitingPeople([structural(manager, [deputy])], requester),
    { people: [{ name: 'نادر', jobTitle: 'نائب', role: 'direct_manager_of_requester', onBehalfOfName: 'منصور' }], more: 0 })
  // المفوِّض برّه نطاق القارئ: البديل ظاهر «بالنيابة» من غير اسم المفوِّض
  assert.deepEqual(rules.waitingPeople([structural(ceo, [deputy])], branchReader).people, [{ name: 'نادر', jobTitle: 'نائب', role: 'direct_manager_of_requester', onBehalfOfName: null }])
  // البديل برّه النطاق والمعتمد جوه: المعتمد نفسه؛ والاتنين برّه: واحد معدود
  const farDeputy = who('e8', 'بعيد', 2)
  assert.deepEqual(rules.waitingPeople([structural(manager, [farDeputy])], branchReader), { people: [{ name: 'منصور', jobTitle: 'مدير المبيعات', role: 'direct_manager_of_requester' }], more: 0 })
  assert.deepEqual(rules.waitingPeople([structural(ceo, [farDeputy])], branchReader), { people: [], more: 1 })
  // نفس الشخص على خطوتين متوازيتين: مرة واحدة (بأول دور)
  const twice = rules.waitingPeople([structural(manager), functional([manager, who('e4', 'هدى', 1)], 'finance')], requester)
  assert.deepEqual(twice.people.map(row => [row.name, row.role]), [['منصور', 'direct_manager_of_requester'], ['هدى', 'finance']])
  // خطوة مالهاش حد
  assert.deepEqual(rules.waitingPeople([functional([])], requester), { people: [], more: 0 })
  assert.deepEqual(rules.waitingPeople([structural(null)], requester), { people: [], more: 0 })
  // سبعة حاملين: أول خمسة والباقي عدد؛ والمخفي بيتعد معاهم
  const seven = Array.from({ length: 7 }, (_, index) => who(`e${index + 10}`, `حامل ${index + 1}`, index === 6 ? 2 : 1))
  assert.equal(rules.WAITING_NAMES_MAX, 5)
  const capped = rules.waitingPeople([functional(seven)], requester)
  assert.deepEqual([capped.people.map(row => row.name), capped.more], [['حامل 1', 'حامل 2', 'حامل 3', 'حامل 4', 'حامل 5'], 2])
  const cappedForBranch = rules.waitingPeople([functional(seven)], branchReader)
  assert.deepEqual([cappedForBranch.people.length, cappedForBranch.more], [5, 2])
})

test('RHU-03: «من إمتى» — وقت التقديم، أو آخر قرار في خطوة قبلها، أو بداية مهلة الخطوة بعد التصعيد؛ ولمجموعة متوازية أقدم خطوة مستنية', () => {
  const submittedAt = '2026-10-01T08:00:00.000Z'
  const since = (currentStep, steps, at = submittedAt) => rules.waitingSince({ currentStep, submittedAt: at, resolvedSteps: JSON.stringify(steps) })
  const step = (stepOrder, extra = {}) => ({ stepOrder, role: 'hr', approverEmployeeId: null, slaDays: null, dueAt: null, actedAt: null, action: null, ...extra })
  // أول خطوة: من وقت التقديم (نص أو تاريخ)
  assert.equal(since(1, [step(1), step(2)]), submittedAt)
  assert.equal(since(1, [step(1)], new Date(submittedAt)), submittedAt)
  // الخطوة التانية: من آخر قرار في اللي قبلها (مجموعة متوازية قبلها: آخر واحد اعتمد)
  assert.equal(since(2, [step(1, { actedAt: '2026-10-03T09:00:00.000Z' }), step(1, { actedAt: '2026-10-04T10:00:00.000Z' }), step(2)]), '2026-10-04T10:00:00.000Z')
  // اعتماد واحد من المجموعة الحالية مابيحركش «من إمتى» لباقيها
  assert.equal(since(1, [step(1, { actedAt: '2026-10-02T09:00:00.000Z' }), step(1)]), submittedAt)
  // خطوة بمهلة لسه في مهلتها الأولى: من وصولها (موعدها ناقص مهلتها = وقت الوصول)
  assert.equal(since(2, [step(1, { actedAt: '2026-10-03T09:00:00.000Z' }), step(2, { slaDays: 2, dueAt: '2026-10-05T09:00:00.000Z' })]), '2026-10-03T09:00:00.000Z')
  // خطوة اتصعّدت: مهلتها بدأت من جديد وقت التصعيد
  assert.equal(since(1, [step(1, { slaDays: 1, dueAt: '2026-10-07T12:00:00.000Z' })]), '2026-10-06T12:00:00.000Z')
  // طلب قديم مهلة خطوته محسوبة من التقديم (قبل الوصول): وصول الخطوة هو الحكم
  assert.equal(since(2, [step(1, { actedAt: '2026-10-05T09:00:00.000Z' }), step(2, { slaDays: 1, dueAt: '2026-10-02T08:00:00.000Z' })]), '2026-10-05T09:00:00.000Z')
  // مجموعة متوازية واحدة منها اتصعّدت: أقدم خطوة مستنية
  assert.equal(since(1, [step(1, { slaDays: 1, dueAt: '2026-10-07T12:00:00.000Z' }), step(1)]), submittedAt)
  // من غير وقت تقديم ولا خطوات، ونص خطوات تالف
  assert.equal(rules.waitingSince({ currentStep: 1, submittedAt: null, resolvedSteps: JSON.stringify([step(1)]) }), null)
  assert.equal(rules.waitingSince({ currentStep: 1, submittedAt, resolvedSteps: 'not json' }), null)
})

test('RHU-04: نص سطر «واقف عند» ورسمه', () => {
  const roleLabels = { direct_manager_of_requester: 'المدير المباشر', hr: 'الموارد البشرية' }
  const now = Date.parse('2026-10-12T10:00:00.000Z')
  const one = { stepOrder: 1, roles: ['direct_manager_of_requester'], since: '2026-10-09T08:00:00.000Z', more: 0,
    people: [{ name: 'منصور', jobTitle: 'مدير المبيعات', role: 'direct_manager_of_requester' }] }
  assert.equal(ui.waitingAtText(one, roleLabels, now), 'واقف عند: منصور — مدير المبيعات — من 3 يوم (2026-10-09)')
  // من غير مسمى ظاهر: اسم الدور
  assert.equal(ui.waitingAtText({ ...one, people: [{ ...one.people[0], jobTitle: null }] }, roleLabels, now), 'واقف عند: منصور — المدير المباشر — من 3 يوم (2026-10-09)')
  // البديل
  const delegated = { ...one.people[0], name: 'نادر', jobTitle: 'نائب', onBehalfOfName: 'منصور' }
  assert.deepEqual([ui.waitingPersonName(delegated), ui.waitingPersonName({ ...delegated, onBehalfOfName: null }), ui.waitingPersonName(one.people[0])],
    ['نادر بالنيابة عن منصور', 'نادر بالنيابة (تفويض)', 'منصور'])
  // أكتر من واحد و«+N»
  const many = { stepOrder: 1, roles: ['hr'], since: '2026-10-12T07:00:00.000Z', more: 2,
    people: [{ name: 'هدى', jobTitle: 'أخصائية', role: 'hr' }, { name: 'مكتب الموارد البشرية', jobTitle: null, role: 'hr' }] }
  assert.equal(ui.waitingAtText(many, roleLabels, now), 'واقف عند: هدى (أخصائية)، مكتب الموارد البشرية (الموارد البشرية) +2 — من النهارده (2026-10-12)')
  // مفيش اسم: مخفي عن الحساب، أو الخطوة مالهاش حد
  assert.equal(ui.waitingAtText({ ...one, people: [], more: 1 }, roleLabels, now), 'واقف عند: المدير المباشر — الاسم مش ظاهر لحسابك — من 3 يوم (2026-10-09)')
  assert.equal(ui.waitingAtText({ ...many, people: [], more: 0, since: null }, roleLabels, now), 'واقف عند: الموارد البشرية — مفيش حساب عليه الخطوة دي دلوقتي')
  assert.equal(ui.waitingAtText({ ...many, people: [], more: 0, roles: ['unknown_role'], since: null }, roleLabels, now), 'واقف عند: جهة اعتماد — مفيش حساب عليه الخطوة دي دلوقتي')
  assert.deepEqual([ui.waitingAtText(null, roleLabels), ui.waitingAtText(undefined, roleLabels), ui.waitingSinceText(null), ui.waitingSinceText('nonsense')], ['', '', '', ''])
  // الأيام بفرق التاريخين المكتوبين: مساء امبارح «من امبارح» مش «من النهارده»، ووقت جاي (ساعة مختلفة) مش سالب
  assert.deepEqual([ui.waitingSinceText('2026-10-11T20:00:00.000Z', now), ui.waitingSinceText('2026-10-12T09:59:00.000Z', now), ui.waitingSinceText('2026-10-12T15:00:00.000Z', now)],
    ['من امبارح (2026-10-11)', 'من النهارده (2026-10-12)', 'من النهارده (2026-10-12)'])
  // أسماء الخطوة الحالية بدورها (لسلسلة الاعتماد)
  assert.deepEqual([ui.waitingNamesOfRole(many, 'hr'), ui.waitingNamesOfRole(many, 'finance'), ui.waitingNamesOfRole(undefined, 'hr'), ui.waitingNamesOfRole({ ...one, people: [delegated] }, 'direct_manager_of_requester')],
    ['هدى، مكتب الموارد البشرية', '', '', 'نادر بالنيابة عن منصور'])

  // الرسم: الاسم بارز، والمسمى ومن إمتى؛ ومن غير بيانات مابيترسمش حاجة
  const render = props => renderToStaticMarkup(React.createElement(RequestWaitingAt, { roleLabels, ...props }))
  const html = render({ waitingAt: one })
  assert.ok(html.includes('data-waiting-at') && html.includes('واقف عند:') && html.includes('<strong class="font-bold">منصور</strong>') && html.includes('— مدير المبيعات') && html.includes('2026-10-09'), html)
  const several = render({ waitingAt: many, compact: true })
  assert.ok(several.includes('<strong class="font-bold">هدى</strong>') && several.includes('(أخصائية)') && several.includes('(الموارد البشرية)') && several.includes('+2'), several)
  assert.ok(render({ waitingAt: { ...one, people: [], more: 1 } }).includes('المدير المباشر — الاسم مش ظاهر لحسابك'))
  assert.deepEqual([render({ waitingAt: null }), render({})], ['', ''])
  // من غير أصناف اتجاه فيزيائي
  assert.doesNotMatch(read('src/components/requests/RequestWaitingAt.tsx'), /\b(?:ml|mr|pl|pr|left|right)-\d|text-(?:left|right)\b/)
})

test('RHU-05: الربط — الحكم من المحرك نفسه (مش منطق تاني)، والرد على طلباتي ولوحة الطلبات والتفاصيل، والشاشات التلاتة بترسمه', () => {
  const service = read('api/src/requests/request-holders.service.ts')
  // مين الخطوة مستنياه: stepAwaitsAccount بسياق delegationContext، والمرشحين بـholdsFunctionalStep وactiveDelegationsFrom — دوال المحرك
  for (const call of ['this.requests.stepAwaitsAccount(account, req, role, actingFor)', 'this.requests.delegationContext(', 'this.requests.waitingSteps(req)',
    'holdsFunctionalStep(account, code)', 'activeDelegationsFrom(this.ds.manager, named)', 'this.auth.accountPayloads(users)', 'this.requests.requesterSide(user, req)',
    '!this.resolver.holdsStep(row.account, step) && this.resolver.holdsStep(row.account, step, row.actingFor)']) assert.ok(service.includes(call), call)
  // السري المحجوب واللي مش قيد المراجعة مابيتزوّدش عليهم حاجة
  assert.ok(service.includes("rows.filter(row => row.status === 'UNDER_REVIEW' && !row.confidentialMasked && row.requesterId != null)"))
  // بريد «طلب بانتظار اعتمادك» وإشارة «المعتمد الحالي» بياخدوا مستلميهم من نفس الحساب
  const notifications = read('api/src/notifications/notifications.service.ts')
  assert.ok(notifications.includes('return ((await this.holders.accountsAwaited([req], role)).get(req.id) ?? []).map(row => row.account)'))
  assert.ok(!notifications.includes('activeDelegationsFrom'))
  // الرد: طلباتي، لوحة الطلبات، التفاصيل — بعد قراءة الخدمة اللي اتحكم فيها
  const controller = read('api/src/requests/requests.controller.ts')
  for (const call of ['return this.holders.attach(user, await this.service.mine(user, {', 'return this.holders.attach(user, await this.service.listAll(user, { status, typeCode, execution }))',
    'return (await this.holders.attach(user, [await this.service.detail(user, id)]))[0]']) assert.ok(controller.includes(call), call)
  const module = read('api/src/requests/requests.module.ts')
  assert.ok(module.includes('RequestHoldersService,\n') && /exports: \[[^\]]*RequestHoldersService\]/.test(module))
  // حقول الرد في الواجهة هي حقول الخادم
  const serverShape = read('api/src/requests/request-holders.ts')
  const clientShape = read('src/lib/request-waiting.ts')
  for (const field of ['stepOrder: number', 'roles: string[]', 'since: string | null', 'more: number', 'jobTitle: string | null', 'onBehalfOfName?: string | null']) {
    assert.ok(serverShape.includes(field) && clientShape.includes(field), field)
  }
  assert.ok(read('src/lib/api.ts').includes('waitingAt?: ApiRequestWaitingAt'))
  // الشاشات: طلباتي (القايمة والتفاصيل واسم الخطوة الحالية)، لوحة الطلبات (القايمة والتفاصيل والسلسلة)، بانتظار موافقتي (التفاصيل)
  const mine = read('src/app/requests/page.tsx')
  for (const text of ["import RequestWaitingAt from '@/components/requests/RequestWaitingAt'", '<RequestWaitingAt waitingAt={req.waitingAt} roleLabels={roleLabels} compact />',
    '<RequestWaitingAt waitingAt={requestDetail.waitingAt} roleLabels={roleLabels} />', 'waitingNamesOfRole(r.waitingAt, s.role)', "{step.state === 'current' && step.who && `: ${step.who}`}"]) assert.ok(mine.includes(text), text)
  const consolePage = read('src/app/requests-console/page.tsx')
  for (const text of ["import RequestWaitingAt from '@/components/requests/RequestWaitingAt'", "{req.status === 'UNDER_REVIEW' && <RequestWaitingAt waitingAt={req.waitingAt} roleLabels={roleLabels} compact />}",
    '<RequestWaitingAt waitingAt={detail.waitingAt} roleLabels={roleLabels} />', 'waitingNamesOfRole(detail.waitingAt, s.role)']) assert.ok(consolePage.includes(text), text)
  const inbox = read('src/app/approvals-inbox/page.tsx')
  assert.ok(inbox.includes("import RequestWaitingAt from '@/components/requests/RequestWaitingAt'"))
  assert.ok(inbox.includes('{detail && <RequestWaitingAt waitingAt={detail.waitingAt} roleLabels={roleLabels} />}'))
})

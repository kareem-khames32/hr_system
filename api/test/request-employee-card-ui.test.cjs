// بطاقة صاحب الطلب في «تفاصيل الطلب» (بانتظار موافقتي، طلباتي، لوحة الطلبات) + بنود قرار المالك 26 سبتمبر في الواجهة:
// عدد استثناءات الحضور المعلقة في «بانتظار موافقتي»، ورسائل نجاح الإنشاء (استثناء/مكافأة/خصم) حسب الاعتماد الفوري.
// منطق الواجهة ونصوصها فقط؛ لا SQL ولا خدمة. (الملفات على القرص CRLF — تُطبّع قبل الفحص)
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true,
  compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const React = require('../../node_modules/react')
const { renderToStaticMarkup } = require('../../node_modules/react-dom/server')
const RequestEmployeeCard = require('../../src/components/requests/RequestEmployeeCard').default
const exemptionsUi = require('../../src/lib/attendance-exemptions-api')
const root = path.resolve(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')
const render = props => renderToStaticMarkup(React.createElement(RequestEmployeeCard, props))

const requester = { employeeId: 7, fullName: 'سارة أحمد', employeeCode: 'EMP-007', jobTitle: 'محاسبة أولى', departmentName: 'المالية',
  branchName: 'فرع الرياض', teamName: 'فريق الحسابات', directManagerName: 'خالد منصور' }

test('the card shows the employee identity and organization, and says who filed it on behalf', () => {
  const html = render({ requester, submittedBy: { displayName: 'مدير الموارد البشرية' } })
  for (const text of ['سارة أحمد', 'EMP-007', 'محاسبة أولى', 'المالية', 'فرع الرياض', 'فريق الحسابات', 'خالد منصور',
    'المسمى الوظيفي', 'القسم', 'الفرع', 'الفريق', 'المدير المباشر', 'قدّمه نيابةً: مدير الموارد البشرية']) {
    assert.ok(html.includes(text), text)
  }
  assert.ok(html.includes('aria-label="بيانات الموظف صاحب الطلب"'))
})

test('no on-behalf line for a request the employee filed himself, and missing organization shows a dash — never a raw id', () => {
  const html = render({ requester: { ...requester, teamName: null, directManagerName: null, jobTitle: null }, submittedBy: null })
  assert.ok(!html.includes('قدّمه نيابةً'))
  assert.equal((html.match(/—/g) || []).length, 3)
  assert.ok(!html.includes('#7'), 'the employee id is not shown as a label')
})

test('a masked confidential request (no requester data from the server) renders nothing', () => {
  assert.equal(render({ requester: null, submittedBy: null }), '')
  assert.equal(render({}), '')
})

test('all three request detail views show the card at the top, before the payload', () => {
  const inbox = read('src/app/approvals-inbox/page.tsx')
  assert.ok(inbox.includes("import RequestEmployeeCard from '@/components/requests/RequestEmployeeCard'"))
  // نافذة «تفاصيل الطلب #…» ونافذة القرار نفسها — البطاقة قبل الحمولة في الاثنين
  assert.ok(inbox.includes('{detail && <><RequestEmployeeCard requester={detail.requester} submittedBy={detail.submittedBy} /><RequestPayload payload={detail.payload} />'))
  assert.ok(inbox.includes('<RequestEmployeeCard requester={detail.requester} submittedBy={detail.submittedBy} />\n                  <RequestPayload payload={detail.payload} />'))

  const mine = read('src/app/requests/page.tsx')
  assert.ok(mine.includes("import RequestEmployeeCard from '@/components/requests/RequestEmployeeCard'"))
  assert.ok(mine.includes('<h2 className="text-xl font-bold">تفاصيل الطلب #{requestDetail.id}</h2>'))
  const drawer = mine.slice(mine.indexOf('تفاصيل الطلب #{requestDetail.id}'))
  assert.ok(drawer.indexOf('<RequestEmployeeCard requester={requestDetail.requester} submittedBy={requestDetail.submittedBy} />') > 0)
  assert.ok(drawer.indexOf('<RequestEmployeeCard') < drawer.indexOf('<RequestPayload payload={requestDetail.payload} />'))

  const consolePage = read('src/app/requests-console/page.tsx')
  assert.ok(consolePage.includes("import RequestEmployeeCard from '@/components/requests/RequestEmployeeCard'"))
  const consoleDrawer = consolePage.slice(consolePage.indexOf('REQ-{detail.id}'))
  assert.ok(consoleDrawer.indexOf('<RequestEmployeeCard requester={detail.requester} submittedBy={detail.submittedBy} />') > 0)
  assert.ok(consoleDrawer.indexOf('<RequestEmployeeCard') < consoleDrawer.indexOf('<RequestPayload payload={detail.payload} />'))
})

test('the request type carries the card data, and the server masks it for a confidential non-party', () => {
  const api = read('src/lib/api.ts')
  assert.ok(api.includes('requester?: ApiRequestRequester | null'))
  assert.ok(api.includes('submittedBy?: ApiRequestSubmittedBy | null'))
  for (const key of ['employeeId: number', 'fullName: string', 'employeeCode: string | null', 'jobTitle: string | null', 'departmentName: string | null',
    'branchName: string | null', 'teamName: string | null', 'directManagerName: string | null']) assert.ok(api.includes(key), key)
  const service = read('api/src/requests/requests.service.ts')
  assert.ok(service.includes('if (!party && type?.isConfidential) return { ...this.maskConfidential({ ...this.withCanonicalStepActions(req), approvals }), requester: null, submittedBy: null }'))
  assert.ok(service.includes('const full = { ...this.withCanonicalStepActions(req), approvals, ...(await this.requestPeople(req, user)) }'))
  // مراجعة Codex الجولة 4 (CR4-B02): التنظيم الحالي لصاحب الطلب نفسه أو لحساب نطاقه فيه فرع الموظف الحالي بس
  assert.ok(service.includes('|| inBranchScope(branchScopeOf(user), employee.branchId))'))
  assert.ok(service.includes('departmentName: null, branchName: null, teamName: null, directManagerName: null, orgHidden: true }'))
  assert.ok(api.includes('orgHidden?: boolean'))
  assert.ok(read('src/components/requests/RequestEmployeeCard.tsx').includes('requester.orgHidden ?'))
  // المدير المباشر بنفس حل خطوة «المدير المباشر» في السلسلة
  assert.ok(service.includes('this.resolver.directManagerOf(employee.id)'))
})

test('«بانتظار موافقتي» counts pending attendance exemptions awaiting the user and links to the pending filter', () => {
  const inbox = read('src/app/approvals-inbox/page.tsx')
  assert.ok(inbox.includes("if (!can('attendance_exemption.approve') && !can('attendance_exemption.approve_executive')) return"), 'only for users who can decide')
  assert.ok(inbox.includes("fetchAttendanceExemptionList({ status: 'PENDING' })"))
  // العدد من إجراءات الخادم لكل صف — نفس «بانتظار قرارك أنت» في شاشة الاستثناء
  assert.ok(inbox.includes('list.rows.filter(row => row.actions.approve || row.actions.approveExecutive).length'))
  assert.ok(inbox.includes('href="/attendance/exemptions?status=PENDING"'))
  assert.ok(inbox.includes('استثناءات حضور بانتظار موافقتك'))
  const page = read('src/app/attendance/exemptions/page.tsx')
  assert.ok(page.includes("const status = new URLSearchParams(window.location.search).get('status')"))
  assert.ok(page.includes('if (status && STATUS_FILTERS.some(option => option.value === status)) setFilter(status as StatusFilter)'))
  assert.ok(page.includes('طلب آخر بانتظار القرار مدته خارج الفترة المختارة'), 'pending rows hidden by the date range are announced')
})

test('creating an exemption reports the instant HR approval the server returned, and the creator hint stays server-driven', () => {
  assert.equal(exemptionsUi.exemptionCreatedNotice({ id: 5, status: 'APPROVED', approvedByUserId: 3 }), 'أُنشئ الاستثناء #5 واعتُمد فورًا — قرار مدير الموارد البشرية نهائي.')
  assert.match(exemptionsUi.exemptionCreatedNotice({ id: 6, status: 'PENDING', approvedByUserId: 3 }), /واعتمدته الموارد البشرية فورًا، وهو بانتظار الاعتماد التنفيذي/)
  assert.equal(exemptionsUi.exemptionCreatedNotice({ id: 7, status: 'PENDING', approvedByUserId: null }), 'أُنشئ طلب الاستثناء #7 وهو بانتظار قرار مستخدم آخر غير منشئه.')
  assert.equal(exemptionsUi.EXEMPTION_EVENT_LABELS.HR_INSTANT_APPROVED, 'اعتماد فوري — أنشأه مدير الموارد البشرية')
  assert.ok(exemptionsUi.EXEMPTION_EVENT_LABELS.EXECUTIVE_INSTANT_APPROVED)
  const page = read('src/app/attendance/exemptions/page.tsx')
  assert.ok(page.includes('setNotice(exemptionCreatedNotice(created))'))
  // «أنشأته أنت؛ القرار لمستخدم آخر» تظهر من إجراءات الخادم فقط — والخادم مابيحطهاش لمدير الموارد البشرية في استثناء غيره
  assert.ok(page.includes("{row.actions.blockedBy === 'CREATOR' && <div className=\"text-warning-600\">أنشأته أنت؛ القرار لمستخدم آخر.</div>}"))
  const service = read('api/src/attendance/attendance-exemptions.service.ts')
  assert.ok(service.includes('const creator = row.createdByUserId === user.sub && !hrFinal'))
})

test('bonus and deduction success messages follow the status the server returned: instant for HR, the chain for everyone else', () => {
  // الفردي: الحالة من رد الخادم نفسه — مفيش تخمين من صلاحيات الواجهة
  const bonusForm = read('src/components/requests/BonusRequestForm.tsx')
  assert.ok(bonusForm.includes("setResult(created.status === 'APPROVED'"))
  assert.ok(bonusForm.includes('واعتُمدت فورًا — قرار مدير الموارد البشرية نهائي. تُصرف مع مسير ${created.targetPeriod}'))
  assert.ok(bonusForm.includes('أُرسل طلب المكافأة #${created.id}'), 'the chain message stays for non-HR creators')
  const deductionForm = read('src/components/requests/DeductionRequestForm.tsx')
  assert.ok(deductionForm.includes("setResult(created.status === 'APPROVED'"))
  assert.ok(deductionForm.includes('أُنشئ الخصم #${created.id} واعتُمد فورًا — قرار مدير الموارد البشرية نهائي.'))
  assert.ok(deductionForm.includes('أُرسل طلب الخصم #${created.id}'), 'the chain message stays for non-HR creators')
  // الدفعة: كل صف راجع بحالته من الخادم
  for (const [file, text] of [['src/components/payroll/BonusesWorkspace.tsx', 'مكافأة واعتُمدت فورًا — قرار مدير الموارد البشرية نهائي'],
    ['src/components/payroll/TypedDeductionsWorkspace.tsx', 'خصمًا واعتُمد فورًا (دفعة #${created.batchId}) — قرار مدير الموارد البشرية نهائي']]) {
    const source = read(file)
    assert.ok(source.includes("created.created.length && created.created.every(row => row.status === 'APPROVED')"), file)
    assert.ok(source.includes(text), file)
  }
  for (const file of ['src/lib/bonuses-api.ts', 'src/lib/deductions-api.ts']) {
    assert.ok(read(file).includes('created: Array<{ employeeId: number; requestId: number; amount: string; status?: string }>'), file)
  }
  for (const file of ['api/src/payroll/bonuses.service.ts', 'api/src/payroll/typed-deductions.service.ts']) {
    assert.ok(read(file).includes('created.push({ employeeId: evaluation.employee.id, requestId: saved.id, amount: evaluation.amount, status: saved.status })'), file)
  }
})

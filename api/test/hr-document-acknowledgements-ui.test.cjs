// B2.7 (ب): إرسال مستند للإقرار — الواجهة: بصمة المحاولة وعميل الـAPI على مسارات الخادم، وقارئ المستند والإقرار في «مستنداتي»،
// و«مهامي»، وشاشة الإصدار (طلب الإقرار، وحالته في السجل، والمجموعة). اختبارات نقية بلا قاعدة ولا خادم.
// Run (من api/): node --test test/hr-document-acknowledgements-ui.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true, compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const root = path.join(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')
const count = (text, part) => text.split(part).length - 1

test('DU-01: بصمة محاولة الإصدار فيها طلب الإقرار وموعده — نفس المفتاح مايتبعتش ببيانات تانية', () => {
  const { hrDocumentAttemptFingerprint } = require('../../src/lib/hr-document-template-editor')
  const input = { templateId: 1, revisionId: 2, employeeId: 3, values: { 'custom.a': 'أ' } }
  const plain = hrDocumentAttemptFingerprint(input)
  // من غير طلب إقرار: الموعد لوحده مالوش أثر (الخادم بيرفضه أصلًا)، و«لأ» زي الغايب
  assert.equal(plain, hrDocumentAttemptFingerprint({ ...input, requireAck: false }))
  assert.equal(plain, hrDocumentAttemptFingerprint({ ...input, ackDueDate: '2026-12-01' }))
  const requested = hrDocumentAttemptFingerprint({ ...input, requireAck: true })
  const dated = hrDocumentAttemptFingerprint({ ...input, requireAck: true, ackDueDate: '2026-12-01' })
  assert.equal(new Set([plain, requested, dated, hrDocumentAttemptFingerprint({ ...input, requireAck: true, ackDueDate: '2026-12-02' })]).size, 4)
  assert.equal(requested, hrDocumentAttemptFingerprint({ ...input, requireAck: true, ackDueDate: null }))
})

test('DU-02: عميل الـAPI على مسارات الخادم نفسها — «مستني إقرارك»، والقراءة، والإقرار، والإلغاء، وفلتر السجل؛ والمعاينة من غير طلب الإقرار', async () => {
  const controller = read('api/src/hr-documents/hr-documents.controller.ts')
  for (const route of ["@Get('mine/acknowledgements')", "@Get('issued/:id/acknowledgement')", "@Post('issued/:id/acknowledge')", "@Perm('documents.manage') @Post('issued/:id/acknowledgement/cancel')"]) assert.equal(count(controller, route), 1, route)
  assert.match(controller, /@Query\('employeeId'\) employeeId\?: string, @Query\('ack'\) ack\?: string/)
  const previous = { window: global.window, localStorage: global.localStorage, sessionStorage: global.sessionStorage, fetch: global.fetch }
  const calls = []
  try {
    const empty = { getItem: () => null, setItem: () => undefined, removeItem: () => undefined }
    global.window = { location: { pathname: '/', href: '/' } }; global.localStorage = empty; global.sessionStorage = empty
    global.fetch = async (url, init = {}) => {
      calls.push({ url: String(url), method: init.method ?? 'GET', body: init.body === undefined ? undefined : JSON.parse(init.body) })
      return String(url).endsWith('/preview') ? new Response(new Blob(['%PDF-1.4']), { status: 200, headers: { 'content-type': 'application/pdf' } })
        : new Response(JSON.stringify({ documents: [] }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    const api = require('../../src/lib/hr-documents')
    const base = /^https?:\/\/[^/]+\/api\/hr-documents/
    await api.fetchMyHrDocumentAcks()
    await api.fetchHrDocumentAck(7)
    await api.acknowledgeHrDocument(7, 'a'.repeat(64))
    await api.cancelHrDocumentAck(7)
    await api.fetchIssuedHrDocuments()
    await api.fetchIssuedHrDocuments(5)
    await api.fetchIssuedHrDocuments(undefined, 'pending')
    await api.fetchIssuedHrDocuments(5, 'overdue')
    // المعاينة مابتحفظش ومابتطلبش إقرار: طلب الإقرار وموعده مابيتبعتوش
    await api.previewHrDocument({ templateId: 1, revisionId: 2, employeeId: 3, values: { 'custom.a': 'أ' }, requireAck: true, ackDueDate: '2026-12-01' })
    await api.previewHrDocument({ templateId: 1, revisionId: 2, values: {}, requireAck: true })
    // والإصدار بيبعتهم زي ما هم
    await api.issueHrDocument({ templateId: 1, revisionId: 2, employeeId: 3, values: {}, requireAck: true, ackDueDate: '2026-12-01', idempotencyKey: 'k' })
    assert.deepEqual(calls.map(call => [call.method, call.url.replace(base, ''), call.body]), [
      ['GET', '/mine/acknowledgements', undefined],
      ['GET', '/issued/7/acknowledgement', undefined],
      ['POST', '/issued/7/acknowledge', { contentHash: 'a'.repeat(64) }],
      ['POST', '/issued/7/acknowledgement/cancel', {}],
      ['GET', '/issued', undefined],
      ['GET', '/issued?employeeId=5', undefined],
      ['GET', '/issued?ack=pending', undefined],
      ['GET', '/issued?employeeId=5&ack=overdue', undefined],
      ['POST', '/preview', { templateId: 1, revisionId: 2, employeeId: 3, values: { 'custom.a': 'أ' } }],
      ['POST', '/preview', { templateId: 1, revisionId: 2, values: {} }],
      ['POST', '/issue', { templateId: 1, revisionId: 2, employeeId: 3, values: {}, requireAck: true, ackDueDate: '2026-12-01', idempotencyKey: 'k' }],
    ])
    assert.deepEqual(api.HR_DOCUMENT_ACK_LABELS, { PENDING: 'بانتظار الإقرار', OVERDUE: 'إقرار متأخر', ACKNOWLEDGED: 'أقرّ الموظف' })
    // ملف المستند: انقطاع الاتصال، وتحميل انقطع في منتصفه (ملف تغيّر والخادم قطع الرد) — برسالة عربية بدل نص المتصفح
    global.fetch = async () => { throw new TypeError('Failed to fetch') }
    await assert.rejects(api.downloadIssuedHrDocument(7), error => error.message === 'تعذر الاتصال بالخادم — تحقق من الاتصال ثم أعد المحاولة')
    global.fetch = async () => ({ ok: true, status: 200, headers: { get: () => 'application/pdf' }, blob: async () => { throw new TypeError('network error') } })
    await assert.rejects(api.downloadIssuedHrDocument(7), error => error.message === 'انقطع تحميل ملف المستند — حاول مرة أخرى')
  } finally { Object.assign(global, previous) }
  // فلتر الخادم بنفس القيم
  assert.match(read('api/src/hr-documents/hr-documents.service.ts'), /\['pending', 'overdue', 'acknowledged'\]\.includes\(ack\)/)
  assert.match(read('src/lib/hr-documents.ts'), /export type HrDocumentAckFilter = 'pending' \| 'overdue' \| 'acknowledged'/)
})

test('DU-03: «مستنداتي» — «مستني إقرارك» بقارئ المستند؛ والإقرار ببصمة الملف اللي اتعرض، وبعد ما يتعرض فعلًا بس', () => {
  const page = read('src/app/my/documents/page.tsx')
  assert.equal(count(page, '<MyDocumentAcknowledgements />'), 1)
  const reader = read('src/components/hr-documents/MyDocumentAcknowledgements.tsx')
  // البصمة من قراءة المستند نفسه، والملف من مسار تحميله (المتحقق منه في الخادم)
  assert.match(reader, /loaded = await fetchHrDocumentAck\(documentId\)/)
  assert.match(reader, /const url = URL\.createObjectURL\(await downloadIssuedHrDocument\(documentId\)\)/)
  assert.match(reader, /await acknowledgeHrDocument\(content\.id, content\.contentHash\)/)
  // زرار الإقرار بعد ما أول صفحة تترسم بس، وبالموافقة، ومرة واحدة
  assert.match(reader, /<PdfPreview url=\{fileUrl\} subject="المستند" onStatus=\{setFileState\} failureText="تعذر عرض ملف المستند\." \/>/)
  assert.match(reader, /const shown = !!content && fileState === 'rendered'/)
  assert.match(reader, /\{content\.state !== 'ACKNOWLEDGED' \? shown && \(\n\s+<div [^>]*data-document-acknowledge>/)
  assert.match(reader, /if \(!content \|\| !shown \|\| !agreed \|\| running\.current\) return\n\s+running\.current = true; setSaving\(true\); setError\(''\)/)
  assert.match(reader, /<button type="button" disabled=\{!agreed \|\| saving\} onClick=\{acknowledge\}/)
  assert.equal(count(reader, 'acknowledgeHrDocument('), 1)
  // ملف ماتحمّلش أو ماتعرضش: بيتقال، ومن غير إقرار
  assert.match(reader, /if \(isCurrent\(\)\) \{ setFileState\('failed'\); setError\(cause instanceof Error \? cause\.message : 'تعذر تحميل ملف المستند'\) \}/)
  assert.match(reader, /\{fileState === 'failed' && \(\n\s+<div role="alert"[^>]*data-document-ack-file-failed>/)
  // الطلب اتلغى أو المستند اتغيّر (404 / 409): القارئ بيتقفل والقايمة بتتحمّل تاني برسالة
  assert.match(reader, /if \(!\(cause instanceof ApiError\) \|\| !\[404, 409\]\.includes\(cause\.status\)\) return false\n\s+stale\.current\(cause\.status === 404 \? 'المستند ده مابقاش مطلوب إقرارك بيه\.' : cause\.message\)/)
  assert.match(reader, /const stale = \(message: string\) => \{ setOpen\(null\); setNotice\(message\); load\(\); notifyTasksChanged\(\) \}/)
  // الإقرار قفل المهمة: عدّاد «مهامي» بيتقرا تاني
  assert.match(reader, /const acknowledged = \(\) => \{ setOpen\(null\); setNotice\('اتسجّل إقرارك بالمستند\.'\); load\(\); notifyTasksChanged\(\) \}/)
  // المتأخر الأول، وبعده اللي جوه موعده، وبعدهم اللي أقرّ بيه
  assert.match(reader, /const rank = \(document: MyHrDocumentAck\) => \(document\.state === 'OVERDUE' \? 0 : document\.state === 'PENDING' \? 1 : 2\)/)
  // «افتح المستند» من «مهامي»
  assert.match(reader, /const id = Number\(new URLSearchParams\(window\.location\.search\)\.get\('ack'\)\)\n\s+if \(Number\.isSafeInteger\(id\) && id > 0\) setOpen\(id\)/)
  // نفس جملة الإقرار الإلكتروني بتاعة السياسات
  assert.match(reader, /<p className="text-xs text-gray-500">\{POLICY_ACK_STATEMENT\}<\/p>/)
})

test('DU-04: «مهامي» — مهمة إقرار المستند من غير أزرار، ورابط فتح المستند لصاحبها', () => {
  const api = read('src/lib/tasks-api.ts')
  assert.match(api, /\n  documentAck: boolean\n/)
  assert.match(api, /\n  documentAckId: number \| null\n/)
  const card = read('src/components/tasks/TaskCard.tsx')
  assert.match(card, /\{task\.documentAck && <span>مهمة إقرار مستند — بتتقفل لما الموظف يقرّ بيه<\/span>\}/)
  // المهمة الملغية طلبها اتلغى: من غير رابط
  assert.match(card, /\{task\.documentAckId && task\.status !== 'CANCELLED' && <a href=\{`\/my\/documents\?ack=\$\{task\.documentAckId\}`\}[^>]*data-task-document>افتح المستند<\/a>\}/)
  // والخادم هو اللي بيشيل الأزرار عنها
  assert.match(read('api/src/tasks/tasks.service.ts'), /return document \? \{ \.\.\.view, canWork: false, canManage: false, canRequestExtension: false, canDecideExtension: false, canNotMine: false, canRate: false,\n\s+documentAck: true, documentAckId: mine \? document\.documentId : null \}\n\s+: \{ \.\.\.view, documentAck: false, documentAckId: null \}/)
})

test('DU-05: شاشة الإصدار — طلب الإقرار وموعده، وحالته وفلترها وإلغاؤه في السجل، ونفس المستند لمجموعة', () => {
  const page = read('src/app/employees/documents/create/page.tsx')
  // الطلب وموعده جزء من بيانات الإصدار لما يتعلّم بس
  assert.match(page, /\.\.\.\(requireAck \? \{ requireAck: true, \.\.\.\(ackDueDate \? \{ ackDueDate \} : \{\}\) \} : \{\}\),/)
  assert.match(page, /const input: HrDocumentIssueInput \| null = shared \? \{ \.\.\.shared, \.\.\.\(employeeId \? \{ employeeId: Number\(employeeId\) \} : \{\}\) \} : null/)
  // المستند العام مابيتبعتش للإقرار، والموعد من النهارده أو بعده
  assert.match(page, /const ackDateInvalid = requireAck && !!ackDueDate && ackDueDate < localToday\(\)/)
  assert.match(page, /const sharedValid = !!shared && invalidFields\.length === 0 && !ackDateInvalid/)
  assert.match(page, /const valid = sharedValid && \(!requiresEmployee \|\| !!selectedEmployee\) && \(!employeeId \|\| !!selectedEmployee\) && \(!requireAck \|\| !!selectedEmployee\)/)
  assert.match(page, /<input type="checkbox" className="mt-1" checked=\{requireAck\} disabled=\{inputsDisabled\} onChange=\{event => \{ changed\(\); setRequireAck\(event\.target\.checked\) \}\} \/>/)
  assert.match(page, /<input type="date" value=\{ackDueDate\} min=\{localToday\(\)\} disabled=\{inputsDisabled\} onChange=\{event => \{ changed\(\); setAckDueDate\(event\.target\.value\) \}\}/)
  // السجل: الحالة والفلتر، والإلغاء للي لسه مااتقرّش بيه بس وبتأكيد
  assert.match(page, /fetchIssuedHrDocuments\(employeeId \? Number\(employeeId\) : undefined, ackFilter \|\| undefined\)/)
  assert.match(page, /\}, \[catalog, employeeId, historyVersion, ackFilter\]\)/)
  assert.match(page, /\{document\.ack\.state !== 'ACKNOWLEDGED' && <button type="button" disabled=\{!!operation\} onClick=\{\(\) => cancelAck\(document\)\}/)
  assert.match(page, /const cancelAck = \(document: IssuedHrDocument\) => \{\n\s+if \(!window\.confirm\([^\n]*\)\) return\n\s+void run\('cancel', async \(\) => \{\n\s+await cancelHrDocumentAck\(document\.id\)\n\s+setHistoryVersion\(previous => previous \+ 1\)/)
  for (const option of ['<option value="">كل المستندات</option>', '<option value="pending">بانتظار الإقرار</option>', '<option value="overdue">إقرار متأخر</option>', '<option value="acknowledged">أقرّ الموظف</option>']) assert.equal(count(page, option), 1, option)
  // المجموعة: بنفس بيانات الإصدار المشتركة (ومنها طلب الإقرار)، ومن غير موظف الشاشة
  assert.match(page, /<GroupIssuePanel employees=\{employees\} input=\{shared\} ready=\{sharedValid && !revisionConflict\} disabled=\{inputsDisabled\} onIssued=\{\(\) => setHistoryVersion\(previous => previous \+ 1\)\} \/>/)
  const group = read('src/components/hr-documents/GroupIssuePanel.tsx')
  // نفس مسار الإصدار لكل موظف، واحد ورا التاني، بمفتاح ثابت للموظف وببيانات التشغيلة اللي بدأت
  assert.match(group, /for \(const employee of targets\) \{\n\s+if \(!alive\.current\) break\n\s+update\(employee\.id, \{ status: 'running', message: undefined \}\)\n\s+const key = keys\.current\.get\(employee\.id\) \?\? crypto\.randomUUID\(\)\n\s+keys\.current\.set\(employee\.id, key\)\n\s+try \{\n\s+const document = await issueHrDocument\(\{ \.\.\.base, employeeId: employee\.id, idempotencyKey: key \}\)/)
  assert.match(group, /const base = snapshot\.current\n\s+if \(busy\.current \|\| !base \|\| !targets\.length\) return\n\s+busy\.current = true; setRunning\(true\)/)
  assert.match(group, /if \(!input \|\| !ready \|\| !members\.length \|\| busy\.current\) return\n\s+snapshot\.current = input\n\s+keys\.current = new Map\(\)/)
  // المستخدم ساب الشاشة: التشغيلة بتقف عند الموظف اللي عليه الدور
  assert.match(group, /useEffect\(\(\) => \{ alive\.current = true; return \(\) => \{ alive\.current = false \} \}, \[\]\)/)
  assert.match(group, /for \(const employee of targets\) \{\n\s+if \(!alive\.current\) break\n/)
  // الرد اللي ماوصلش مش فشل: «ماوصلش تأكيد»، والإعادة للي ماتمّش بس
  assert.match(group, /status: isUncertainWriteError\(cause\) \? 'uncertain' : 'failed'/)
  assert.match(group, /const retry = \(\) => \{ if \(rows\) void issue\(rows\.filter\(row => row\.status === 'failed' \|\| row\.status === 'uncertain'\)\.map\(row => row\.employee\)\) \}/)
  assert.equal(count(group, 'issueHrDocument('), 1)
  // تشغيلة شغالة أو رد ماوصلش: الخروج من الصفحة بيسأل، و«مجموعة جديدة» بتأكيد
  assert.match(group, /if \(!running && !uncertain\) return\n\s+const handler = \(event: BeforeUnloadEvent\) => \{ event\.preventDefault\(\); event\.returnValue = '' \}/)
  assert.match(group, /if \(busy\.current\) return\n\s+if \(uncertain && !window\.confirm\(/)
  // الموظف مايتضافش مرتين، وبحد أقصى
  assert.match(group, /export const GROUP_ISSUE_MAX = 200/)
  assert.match(group, /filter=\{employee => !members\.some\(member => member\.id === employee\.id\)\}/)
  assert.match(group, /previous\.some\(member => member\.id === employee\.id\) \|\| previous\.length >= GROUP_ISSUE_MAX \? previous : \[\.\.\.previous, employee\]/)
})

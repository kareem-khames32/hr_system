'use strict'
// «مسوغات التعيين» (طلب المالك 30 سبتمبر) — الواجهة من غير قاعدة ولا خادم (fetch معزول):
//  HD-UI-01) القائمة الجانبية «نواقص مسوغات التعيين» بعد «مستندات الموظفين» بصلاحية documents.manage، وعنوان الهيدر نفس الكلام،
//            وحارس المسار documents.manage قبل «/employees» العام.
//  HD-UI-02) نداءات الواجهة في ملف مستقل (مش api.ts): التقرير بالبحث والفرع، والتذكير، و«المطلوب منّي»؛ ونصوص الشاشات ورابط
//            «ارفع الناقص» اللي «مستندات الموظفين» بتقراه وتفتح نموذج الإضافة عليه.
//  HD-UI-03) الشاشات متوصلة: «أنواع المستندات» (عمود «مطلوب للتعيين» وتبديله والإضافة بيه)، و«نواقص مسوغات التعيين» (بحث وفرع
//            واختيار و«ابعت تذكير» ورسالة النجاح ورابط الرفع)، و«تهيئة الموظفين الجدد» (مهمة النظام بالتقدّم والناقص وخانتها مقفولة
//            بالسبب ومن غير تعديل ولا استبعاد)، و«مستنداتي» (المطلوب منك بـ✓ أو «ناقص»، وكروت للموبايل بدل الجدول).
// Run (من api/): node --test test/hiring-documents-ui.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true,
  compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const { pageTitleFor } = require('../../src/components/layout/pageTitles')
const ui = require('../../src/lib/hiring-documents-api')
const root = path.resolve(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')

async function fetched(response, fn) {
  const original = global.fetch
  const calls = []
  global.fetch = async (url, options) => { calls.push({ url: String(url), options }); return { ok: true, text: async () => JSON.stringify(response) } }
  try { return { result: await fn(), calls } } finally { global.fetch = original }
}

test('HD-UI-01: «نواقص مسوغات التعيين» في القائمة بعد «مستندات الموظفين» بصلاحيتها، وعنوانها في الهيدر، وحارس المسار', () => {
  const sidebar = read('src/components/layout/Sidebar.tsx').split('\n')
  const docs = sidebar.findIndex(line => line.includes("{ label: 'مستندات الموظفين', href: '/employees/documents', perm: 'documents.manage' },"))
  assert.ok(docs > 0)
  assert.equal(sidebar[docs + 1].trim(), "{ label: 'نواقص مسوغات التعيين', href: '/employees/hiring-documents', perm: 'documents.manage' },")
  assert.equal(pageTitleFor('/employees/hiring-documents'), 'نواقص مسوغات التعيين')
  assert.equal(pageTitleFor('/employees/documents'), 'مستندات الموظفين', 'مسار «مستندات الموظفين» زي ما هو')
  const layout = read('src/components/layout/MainLayout.tsx')
  const guard = layout.indexOf("['/employees/hiring-documents', 'documents.manage'],")
  assert.ok(guard > 0, 'حارس المسار documents.manage')
  assert.ok(guard < layout.indexOf("['/employees', 'employees.view'],"), 'قبل حارس «/employees» العام (أول تطابق بيكسب)')
  const page = read('src/app/employees/hiring-documents/page.tsx')
  assert.match(page, /<h1 className="text-2xl font-bold text-gray-800">نواقص مسوغات التعيين<\/h1>/)
})

test('HD-UI-02: النداءات في hiring-documents-api.ts (مش api.ts)، ونصوص الشاشات، ورابط «ارفع الناقص» ذهابًا وإيابًا', async () => {
  assert.doesNotMatch(read('src/lib/api.ts'), /hiring-documents/, 'نداءات جديدة في ملف مستقل')
  const report = { required: [{ code: 'contract', nameAr: 'عقد عمل' }], employees: [] }
  let call = await fetched(report, () => ui.fetchHiringMissing({ search: '  أحمد  ', branchId: 3 }))
  assert.deepEqual(call.result, report)
  assert.match(call.calls[0].url, /\/hiring-documents\/missing\?search=%D8%A3%D8%AD%D9%85%D8%AF&branchId=3$/)
  call = await fetched(report, () => ui.fetchHiringMissing({ search: '   ', branchId: '' }))
  assert.match(call.calls[0].url, /\/hiring-documents\/missing$/, 'من غير فلاتر فاضية')
  call = await fetched({ sent: 2, skipped: 0, reminders: [] }, () => ui.sendHiringReminders([4, 9]))
  assert.match(call.calls[0].url, /\/hiring-documents\/reminders$/)
  assert.equal(call.calls[0].options.method, 'POST')
  assert.deepEqual(JSON.parse(call.calls[0].options.body), { employeeIds: [4, 9] })
  call = await fetched({ employeeLinked: true, documents: [], missingCount: 0 }, () => ui.fetchMyHiringDocuments())
  assert.match(call.calls[0].url, /\/hiring-documents\/mine$/)

  const types = [{ code: 'contract', nameAr: 'عقد عمل' }, { code: 'criminal_record', nameAr: 'فيش وتشبيه' }]
  assert.equal(ui.hiringDocNames(types), 'عقد عمل، فيش وتشبيه')
  assert.equal(ui.hiringProgressText({ presentCount: 3, requiredCount: 5 }), '3/5 مستندات')
  assert.equal(ui.hiringTaskLockReason({ requiredCount: 3, presentCount: 1, missing: types }),
    'ناقص: عقد عمل، فيش وتشبيه — المهمة بتكتمل لوحدها لما يترفعوا من «مستندات الموظفين»')
  assert.equal(ui.hiringTaskLockReason({ requiredCount: 3, presentCount: 3, missing: [] }), 'اكتملت لوحدها بعد رفع كل المستندات المطلوبة')
  assert.equal(ui.reminderResultText({ sent: 4, skipped: 0 }), 'اتبعت تذكير لـ 4 موظف')
  assert.equal(ui.reminderResultText({ sent: 2, skipped: 1 }), 'اتبعت تذكير لـ 2 موظف، و1 مالهمش نواقص فماتبعتلهمش')
  assert.equal(ui.reminderResultText({ sent: 0, skipped: 3 }), 'ماتبعتش تذكير — الموظفين المختارين مالهمش نواقص دلوقتي')

  // مهمة النظام من رد التهيئة: غيرها null، ومن غير تفاصيل = صفر
  const plain = { id: 1, employeeId: 2, templateItemId: 5, label: 'مهمة', party: 'it', dueDate: '2026-09-30', sortOrder: 10, status: 'PENDING',
    note: null, doneAt: null, doneByName: null, canAct: true }
  assert.equal(ui.hiringDocsOfTask(plain), null)
  assert.equal(ui.hiringDocsOfTask({ ...plain, systemKey: null }), null)
  const hiringDocs = { requiredCount: 2, presentCount: 1, missing: [types[1]] }
  assert.deepEqual(ui.hiringDocsOfTask({ ...plain, systemKey: 'HIRING_DOCS', hiringDocs }), hiringDocs)
  assert.deepEqual(ui.hiringDocsOfTask({ ...plain, systemKey: 'HIRING_DOCS' }), { requiredCount: 0, presentCount: 0, missing: [] })

  // «ارفع الناقص» → «مستندات الموظفين» بالموظف والنوع، والقراءة بترفض الغلط
  const href = ui.uploadMissingHref(12, 'criminal_record')
  assert.equal(href, '/employees/documents?employeeId=12&docType=criminal_record')
  assert.deepEqual(ui.uploadPrefillFromSearch(href.slice(href.indexOf('?'))), { employeeId: '12', docType: 'criminal_record' })
  assert.equal(ui.uploadMissingHref(7), '/employees/documents?employeeId=7')
  assert.deepEqual(ui.uploadPrefillFromSearch('?employeeId=7'), { employeeId: '7', docType: '' })
  assert.deepEqual(ui.uploadPrefillFromSearch('?employeeId=7&docType=Bad Code!'), { employeeId: '7', docType: '' })
  for (const search of ['', '?docType=contract', '?employeeId=0', '?employeeId=-3', '?employeeId=12abc', '?employeeId=99999999999']) {
    assert.equal(ui.uploadPrefillFromSearch(search), null, search)
  }
  const documents = read('src/app/employees/documents/page.tsx')
  assert.ok(documents.includes("import { uploadPrefillFromSearch } from '@/lib/hiring-documents-api'"))
  assert.ok(documents.includes('const prefill = uploadPrefillFromSearch(window.location.search)'))
  assert.ok(documents.includes('setUploadForm({ ...emptyForm, ...prefill })'))
})

test('HD-UI-03: الشاشات متوصلة — أنواع المستندات، ونواقص مسوغات التعيين، وتهيئة الموظفين الجدد، ومستنداتي', () => {
  // «أنواع المستندات»: عمود وتبديل وإضافة بالعلامة
  const settings = read('src/app/settings/documents/page.tsx')
  for (const text of ['<th className="text-center py-3 px-4 font-medium text-gray-700">مطلوب للتعيين</th>',
    "updateCatalogItem('doc-types', t.id, { requiredForHiring: !t.requiredForHiring })",
    "createCatalogItem('doc-types', { code, nameAr, isActive: true, requiredForHiring: newRequired })",
    "{t.requiredForHiring ? 'مطلوب ✓' : 'مش مطلوب'}", 'مطلوب للتعيين — لازم كل موظف يسلّمه، وتهيئته ماتكتملش من غيره']) {
    assert.ok(settings.includes(text), text)
  }
  assert.match(read('src/lib/doc-types.ts'), /requiredForHiring\?: boolean/)

  // «نواقص مسوغات التعيين»: بحث وفرع واختيار وتذكير ورفع
  const page = read('src/app/employees/hiring-documents/page.tsx')
  for (const text of ['fetchHiringMissing({ search, branchId })', 'await sendHiringReminders(selected)', 'setNotice(reminderResultText(result))',
    'placeholder="بحث باسم الموظف أو كوده..."', '<option value="">كل الفروع</option>', 'canSeeBranch(branchScope, branch.id)',
    "{sending ? 'جارٍ الإرسال...' : 'ابعت تذكير'}", 'href={uploadMissingHref(row.employeeId, doc.code)}',
    'href={uploadMissingHref(row.employeeId, row.missing[0]?.code)}', "{row.lastReminderAt ? formatDate(row.lastReminderAt) : 'ماتبعتش'}",
    'مفيش مستندات متعلّمة «مطلوب للتعيين»', 'onClick={toggleAll}']) {
    assert.ok(page.includes(text), text)
  }
  assert.doesNotMatch(page, /from '@\/lib\/api'[^\n]*fetchHiring/, 'النداءات من الملف المستقل')

  // «تهيئة الموظفين الجدد»: مهمة النظام
  const onboarding = read('src/app/employees/onboarding/page.tsx')
  for (const text of ['const hiring = hiringDocsOfTask(task)', 'disabled={!task.canAct || busy || !!hiring}', 'hiringTaskLockReason(hiring)',
    '{hiringProgressText(hiring)}', '— ناقص: {hiringDocNames(hiring.missing)}', '{emp.canManage && !draft && !hiring && (',
    'اكتملت لوحدها بعد رفع كل المستندات المطلوبة', "can('documents.manage')"]) {
    assert.ok(onboarding.includes(text), text)
  }

  // «مستنداتي»: المطلوب منك، وكروت للموبايل
  const mine = read('src/app/my/documents/page.tsx')
  for (const text of ['<h2 className="font-bold text-gray-800">مسوغات التعيين المطلوبة منك</h2>', 'fetchMyHiringDocuments()',
    'ناقص', '✓', 'سلّم المستندات الناقصة للموارد البشرية عشان تترفع على ملفك', '<ul className="sm:hidden divide-y divide-gray-100">',
    '<div className="hidden sm:block overflow-x-auto">', 'grid grid-cols-1 sm:grid-cols-2 gap-2']) {
    assert.ok(mine.includes(text), text)
  }
  // من غير عرض ثابت أعرض من شاشة 390px
  assert.doesNotMatch(mine, /\b(?:min-w|w)-\[(?:[4-9]\d{2}|\d{4,})px\]/)
})

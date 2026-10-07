'use strict'
// B2.15 (أ): صلاحية المستندات — فحص من غير قاعدة (الدورة الفعلية في document-expiry.integration.cjs):
//  DE-01) القواعد: أيام التنبيه (القراءة والمدخل)، ويوم التنبيه اللي المستند وصله.
//  DE-02) الربط: الأعمدة الجديدة برّه قراءة وكتابة الكيانات، والتنبيه تحت قفل صف المستند وبمفتاح فيه يوم التنبيه، ومهمة التجديد من
//         النظام على دور النوع، والمحرك مشترك في الحدث وبيفحص وقت الإرسال، وقفل المهمة جوه معاملة تعديل المستند.
//  DE-03) الواجهة: إعدادات النوع في «أنواع المستندات»، والتقرير في «مستندات الموظفين».
// Run (من api/): node --test test/document-expiry.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const rules = require('../src/assets/document-expiry')
const events = require('../src/notifications/notification-events')
const root = path.resolve(__dirname, '..', '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n')

test('DE-01: alert days are read and entered safely, and a document reaches the nearest alert day', () => {
  assert.deepEqual(rules.parseAlertDays('60,30,7'), [60, 30, 7])
  assert.deepEqual(rules.parseAlertDays(' 7 , 30,30 , 60 '), [60, 30, 7])
  // الفاضي أو الغلط كله = الافتراضي (نافذة الحدث القايمة)
  for (const bad of [null, undefined, '', 'x', '0', '366,-5', '1.5']) assert.deepEqual(rules.parseAlertDays(bad), [30], String(bad))
  assert.deepEqual(rules.parseAlertDays('90,x,10'), [90, 10])
  assert.equal(rules.alertDaysInput([7, 60, 30, 30]), '60,30,7'); assert.equal(rules.alertDaysInput('45, 10'), '45,10')
  for (const empty of [null, undefined, '', []]) assert.equal(rules.alertDaysInput(empty), null)
  for (const bad of [['x'], [0], [366], [1, 2, 3, 4, 5, 6], '7;30', '1.5', [-1], '٣٠']) assert.throws(() => rules.alertDaysInput(bad), /أيام التنبيه/, JSON.stringify(bad))
  // يوم التنبيه: أصغر يوم في القايمة أكبر من أو يساوي الباقي
  const days = [60, 30, 7]
  for (const [left, expected] of [[61, null], [60, 60], [45, 60], [30, 30], [25, 30], [8, 30], [7, 7], [3, 7], [0, 7], [-1, null], [-40, null]]) {
    assert.equal(rules.alertThreshold(days, left), expected, `الباقي ${left}`)
  }
  assert.equal(rules.alertThreshold([30], 31), null); assert.equal(rules.alertThreshold([30], 10), 30)
  assert.equal(rules.daysUntil('2026-10-07', '2026-11-01'), 25); assert.equal(rules.daysUntil('2026-10-07', '2026-10-07'), 0)
  assert.equal(rules.daysUntil('2026-10-07', '2026-09-27'), -10)
  assert.match(rules.DOCUMENT_EXPIRY_MIGRATION_MISSING, /20261007_099/)
})

test('DE-02: the new columns stay outside the entities; alerts run under the document row lock; the task and the notice follow the type', () => {
  const entities = read('api/src/assets/assets.entities.ts'), source = read('api/src/assets/document-expiry.ts')
  for (const column of ['hasExpiry', 'alertDays', 'ownerRole', 'renewalTaskId']) {
    assert.match(entities, new RegExp(`nullable: true, select: false, insert: false, update: false \\}\\)\\s+${column}\\?:`), column)
  }
  const raise = source.slice(source.indexOf('export async function raiseDocumentAlerts'), source.indexOf('export async function closeRenewalTask'))
  // قفل صف المستند ثم قراءة تاريخه وربطه، ثم الحدث، ثم المهمة — كله في معاملة المستند
  const order = ['WITH (UPDLOCK, ROWLOCK) WHERE d.[id] = @0', 'isCurrentEmployee(employee', 'alertThreshold(', 'recordOutboxEvent(em, { type: \'DOCUMENT_EXPIRING\'', 'tasks.save(tasks.create({',
    'UPDATE [employee_documents] SET [renewalTaskId] = @1', 'type: \'TASK_ASSIGNED\''].map(part => raise.indexOf(part))
  assert.ok(order.every((at, index) => at > 0 && (index === 0 || at > order[index - 1])), JSON.stringify(order))
  assert.match(raise, /key: `document-expiring:\$\{doc\.id\}:\$\{doc\.expiryDate\}:\$\{threshold\}`/)
  assert.match(raise, /if \(!fresh\) return/, 'يوم تنبيه طلع قبل كده: ولا حدث ولا مهمة')
  assert.match(raise, /assigneeRole: type\.ownerRole,\s+branchId, createdByUserId: 0, dueDate: doc\.expiryDate/)
  assert.match(raise, /AND NOT \$\{supersededSql\('d'\)\}/)
  assert.doesNotMatch(raise, /d\.\[number\]|fileRef|notes/, 'ولا رقم المستند ولا ملفه في الحدث ولا المهمة')
  const close = source.slice(source.indexOf('export async function closeRenewalTask'))
  assert.ok(close.indexOf('FROM [employee_documents] WITH (UPDLOCK, ROWLOCK)') < close.indexOf("lock: { mode: 'pessimistic_write' }"), 'صف المستند ثم صف المهمة')
  // المهمة اليومية القايمة هي اللي بتنادي، ببوابتها
  const queue = read('api/src/queue/queue.service.ts')
  assert.match(queue, /if \(!\(await this\.modules\.jobEnabled\('documents\.expiry-events'\)\)\) return 0/)
  assert.match(queue, /return \(await this\.documentAlerts\(today\)\)\.events/)
  // المحرك: مشترك في الحدث، والبريد بس (جوه النظام العنصر المحسوب القايم)، وفحص وقت الإرسال
  const service = read('api/src/notifications/notifications.service.ts')
  assert.match(service, /'DOCUMENT_EXPIRING',\n\s+\/\/ B2\.8|'DOCUMENT_EXPIRING',/)
  assert.match(service, /case 'DOCUMENT_EXPIRING': return this\.onDocumentExpiring\(event\)/)
  assert.match(service, /return doc && doc\.expiryDate === expiryDate \? doc : null/)
  assert.match(service, /if \(notification\.entityType === 'employee_document'\) \{/)
  const def = events.notificationEventDef('document.expiring')
  assert.deepEqual([def.category, def.kind, def.storedInApp], ['document', 'warning', false])
  assert.equal(events.NOTIFICATION_CATEGORIES.document, 'مستنداتي')
  assert.ok(read('api/src/assets/portal.controller.ts').includes('`document-expiry-${doc.id}-${doc.expiryDate}`'), 'العنصر المحسوب القايم جوه النظام')
  // المستندات: الإلزام على القيم بعد الدمج، وقفل مهمة التجديد جوه معاملة التعديل قبل الحفظ، والتقرير بصلاحيته
  const controller = read('api/src/assets/docs.controller.ts')
  assert.match(controller, /await this\.assertExpiryRule\(docType !== undefined \? docType : doc\.docType, expiry\)/)
  const update = controller.slice(controller.indexOf('const renewed ='))
  assert.ok(update.indexOf('if (renewed) await closeRenewalTask(em, doc.id, user)') < update.indexOf('return em.save(EmployeeDocument, doc)'))
  assert.match(controller, /@Perm\('documents\.manage'\)\s+@Get\('expiry'\)/)
  assert.match(controller, /@Perm\('settings\.manage'\)\s+@Get\('expiry-settings'\)/); assert.match(controller, /@Perm\('settings\.manage'\)\s+@Patch\('expiry-settings\/:id'\)/)
  const report = controller.slice(controller.indexOf("@Get('expiry')"), controller.indexOf("@Get('expiry-settings')"))
  assert.doesNotMatch(report, /d\.\[number\]|fileRef|notes/)
  assert.match(report, /\$\{currentEmployeeSql\('e\.'\)\}/); assert.match(report, /andBranchScopeSql\('e\.\[branchId\]', scope, params\)/)
  // لوحة فريقي: اسم النوع من الكتالوج
  assert.match(read('api/src/manager/team.service.ts'), /COALESCE\(dt\.nameAr, d\.docType\) AS docType/)
})

test('DE-03: the settings sit on the document types screen and the report on the employees documents screen', () => {
  const settings = read('src/components/documents/DocTypeExpirySettings.tsx'), report = read('src/components/documents/DocumentExpiryReport.tsx')
  assert.match(read('src/app/settings/documents/page.tsx'), /\{can\('settings\.manage'\) && <DocTypeExpirySettings canWrite=\{canWrite\} refreshKey=/)
  assert.match(read('src/app/employees/documents/page.tsx'), /\{can\('documents\.manage'\) && <DocumentExpiryReport \/>\}/)
  for (const part of ['له تاريخ انتهاء', 'أيام التنبيه قبل الانتهاء', 'المسؤول عن التجديد', 'من غير مهمة', 'data-doc-type-expiry']) assert.ok(settings.includes(part), part)
  assert.match(settings, /const locked = !canWrite \|\| !data\.ready \|\| busy === type\.id/)
  assert.match(settings, /<div className="overflow-x-auto">\s+<table/)
  for (const part of ['data-document-expiry', 'منتهي من', 'باقي', 'renewalTaskText(row)', 'loadOrgFilterContext()']) assert.ok(report.includes(part), part)
  assert.match(report, /<div className="overflow-x-auto">\s+<table/)
  const lib = read('src/lib/documents-expiry-api.ts')
  assert.match(lib, /apiFetch<DocumentExpiryReport>\(`\/documents\/expiry\?days=\$\{days\}/)
  assert.match(lib, /`\/documents\/expiry-settings\/\$\{id\}`, \{ method: 'PATCH'/)
})

test('DE-04: the renewal destination is registered with its own form fields and server-written key', () => {
  const renewal = require('../src/assets/document-renewal')
  const { MODULES, moduleOfHandler } = require('../src/modules-registry/registry')
  assert.equal(renewal.DOCUMENT_RENEWAL_HANDLER, 'document_renewal')
  assert.ok(MODULES.documents.requestHandlers.includes('document_renewal'))
  if (typeof moduleOfHandler === 'function') assert.equal(moduleOfHandler('document_renewal'), 'documents')
  const destinations = read('api/src/requests/destinations.service.ts'), requests = read('api/src/requests/requests.service.ts')
  assert.match(destinations, /\[DOCUMENT_RENEWAL_HANDLER\]: executeDocumentRenewal,/)
  assert.match(requests, /\[DOCUMENT_RENEWAL_HANDLER\]: \['documentType', 'expiryDate', 'documentNumber', 'issueDate', \.\.\.DOCUMENT_RENEWAL_STAGED_KEYS\],/)
  assert.match(requests, /if \(type\.destinationHandler === DOCUMENT_RENEWAL_HANDLER\) req\.payload = JSON\.stringify\(await stageDocumentRenewal\(em, req\)\)/)
  assert.match(read('api/src/settings/settings.controller.ts'), /\{ key: 'document_renewal', labelAr: 'تجديد مستند \(تحديث تاريخ الانتهاء\)' \},/)
  // حقول الوجهة الأول، وحقول الباني بعدها، ومفاتيح الوجهة والخادم محجوزة
  const fields = renewal.documentRenewalFields(['إقامة', 'جواز سفر'], { requiredFields: JSON.stringify(['notes', 'documentTypeCode']),
    customFields: JSON.stringify([{ key: 'notes', label: 'ملاحظات', type: 'text' }, { key: 'expiryDate', label: 'مزوّر', type: 'text' }, { key: 'documentTypeCode', label: 'x', type: 'text' }]) })
  assert.deepEqual(JSON.parse(fields.customFields).map(field => field.key), ['documentType', 'expiryDate', 'documentNumber', 'issueDate', 'notes'])
  assert.deepEqual(JSON.parse(fields.customFields)[1].label, 'تاريخ الانتهاء الجديد')
  assert.deepEqual(JSON.parse(fields.requiredFields), ['documentType', 'expiryDate', 'notes'])
  // التنفيذ: الحكم تاني، ثم قفل صف المستند، ثم التحديث بالأعمدة المتغيّرة بس، ثم قفل مهمة التجديد
  const source = read('api/src/assets/document-renewal.ts')
  const execute = source.slice(source.indexOf('export async function executeDocumentRenewal'))
  const order = ['await renewalValues(em, payload)', 'WITH (UPDLOCK, ROWLOCK) WHERE d.[employeeId] = @0', 'UPDATE [employee_documents] SET', 'await closeRenewalTask(em, documentId'].map(part => execute.indexOf(part))
  assert.ok(order.every((at, index) => at > 0 && (index === 0 || at > order[index - 1])), JSON.stringify(order))
  assert.doesNotMatch(execute, /fileRef|\[notes\]/, 'ملف المستند وملاحظاته مابيتلمسوش')
  // الواجهة: اسم الوجهة، وتسميات الحمولة، ومفتاح الخادم مخفي
  assert.match(read('src/app/requests/page.tsx'), /document_renewal: 'تجديد مستند',/)
  const payload = read('src/lib/request-payload.ts')
  assert.match(payload, /expiryDate: 'تاريخ الانتهاء الجديد',/); assert.match(payload, /'positionDepartmentId', 'documentTypeCode'\]/)
})

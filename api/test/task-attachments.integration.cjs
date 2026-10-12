'use strict'
// B-ADD.19 (كلمة المالك 12 أكتوبر 2026): مرفقات المهام، على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_task_attachments_test_<16 hex>)
// ومجلد رفع مؤقت، عبر HTTP بتوكنات موقّعة محليًا ومن غير كلمات مرور.
//  TA-01) الإرفاق مع إنشاء المهمة، وبعده من اللي كلّف بيها ومن المسؤول عنها (بيرفع شغله)؛ والملف قبل الربط لرافعه بس؛ وسطر في سجل المهمة.
//  TA-02) مين يشوف ويحمّل: المسؤول، واللي كلّف، واللي فوقهم في الهيكل، وصاحب صلاحية المهام في نطاقه — وغيرهم 404 في القايمة والتحميل
//         بنفس رد الغايب.
//  TA-03) قواعد الرفع والربط: النوع والحجم من إعدادات الملفات القايمة؛ وملف حد تاني أو تصنيف تاني أو اتربط قبل كده أو مش موجود مايتربطش؛
//         واللي مالوش حق على المهمة مايرفقش؛ وحد أقصى للمرفقات.
//  TA-04) الشيل: اللي رفع المرفق أو اللي بيدير المهمة؛ الصف بيتختم والملف بيفضل على التخزين ومابيتحمّلش؛ والمهمة المقفولة مرفقاتها ثابتة.
//  TA-05) المهمة الجماعية: نفس الملف لكل اللي خدوا المهمة، وشيله من مهمة مابيشيلوش من الباقي.
//  TA-06) المهمة الشخصية: مرفقاتها لصاحبها ومديره المباشر بس.
//  TA-07) الترحيل 194: من غير الجدول المهام زي ما هي والمرفقات مقفولة برسالتها؛ والمُرحّل بيعمل الجدول بنفس شكل synchronize والفرق صفر،
//         وآمن للتكرار، وبعده الإرفاق شغال من غير إعادة تشغيل.
// Run (من api/): node --test test/task-attachments.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os')
const { disposableApp, apiRoot } = require('./helpers/disposable-app.cjs')
const { moduleTools } = require('./helpers/modules.cjs')
const migrate = require('../scripts/db-migrate.cjs')
const ExcelJS = require('../node_modules/exceljs')
const t = disposableApp('task_attachments')
const org = {}, emps = {}, users = {}, state = {}
const FILE = '20261012_194_task_attachments.sql'
const MIGRATIONS = path.join(apiRoot, '..', 'docs', 'migrations', 'payroll')
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-task-attachments-migrations-'))
const MISSING = 'مرفقات المهام محتاجة ترحيل 20261012_194 على قاعدة البيانات'
const INVALID = 'مرفق غير صالح — ارفعه من خانة مرفقات المهمة نفسها'
const TASK_GONE = 'المهمة غير موجودة', FILE_GONE = 'الملف غير موجود'
let number = 0, signer
const employee = (fullName, extra = {}) => t.repo('Employee').save({ employeeCode: `TA${String(++number).padStart(3, '0')}`, fullName, branchId: org.a.id, joinDate: '2020-01-01',
  basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'cash', ...extra })
const account = (permissions, extra = {}) => t.user({ role: 'employee', branchId: org.a.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
const answer = response => [response.status, [].concat(response.body?.message ?? []).join('، ')]
const bearer = user => ({ Authorization: `Bearer ${signer.sign(t.payloadOf(user))}` })
async function upload(who, bytes, name, query = 'entityType=task_attachment') {
  const form = new FormData()
  form.append('file', new Blob([bytes]), name)
  const response = await fetch(`${t.base}/files/upload?${query}`, { method: 'POST', headers: bearer(users[who]), body: form })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const uploaded = async (who, bytes, name) => t.expectStatus(await upload(who, bytes, name), 201).id
async function download(who, fileId) {
  const response = await fetch(`${t.base}/files/${fileId}`, { headers: bearer(users[who]) })
  const bytes = Buffer.from(await response.arrayBuffer())
  let message = null
  if (response.status !== 200) { try { message = JSON.parse(bytes.toString('utf8')).message } catch { message = null } }
  return { status: response.status, bytes, message }
}
const listOf = (who, taskId) => t.request(users[who], 'GET', `/tasks/${taskId}/attachments`)
const attach = (who, taskId, fileIds) => t.request(users[who], 'POST', `/tasks/${taskId}/attachments`, { fileIds })
const detach = (who, taskId, fileId) => t.request(users[who], 'DELETE', `/tasks/${taskId}/attachments/${fileId}`)
const namesOf = view => view.attachments.map(row => row.name)
const idsOf = view => view.attachments.map(row => row.id)
const setConfig = (key, value) => t.request(users.admin, 'PATCH', '/settings/config', { key, value })
const links = fileId => t.repo('TaskAttachment').find({ where: { fileId }, order: { id: 'ASC' } })
const diskFiles = (dir = process.env.UPLOADS_ROOT) => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? diskFiles(path.join(dir, entry.name)) : [entry.name])

// محتوى حقيقي لكل نوع (النوع بيتحسب من المحتوى نفسه)
const pdf = (padding = 0) => Buffer.concat([Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\n'), Buffer.alloc(padding, 0x20), Buffer.from('\n%%EOF\n')])
function png() {
  const zlib = require('node:zlib')
  const chunk = (kind, data) => {
    const length = Buffer.alloc(4); length.writeUInt32BE(data.length)
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(Buffer.concat([Buffer.from(kind), data])) >>> 0)
    return Buffer.concat([length, Buffer.from(kind), data, crc])
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(1, 0); header.writeUInt32BE(1, 4); header[8] = 8; header[9] = 2
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(Buffer.from([0, 255, 0, 0]))), chunk('IEND', Buffer.alloc(0))])
}
async function xlsx() {
  const book = new ExcelJS.Workbook()
  book.addWorksheet('خطة').addRow(['البند', 'المسؤول'])
  return Buffer.from(await book.xlsx.writeBuffer())
}
const shape = async () => ({
  columns: await t.query(`SELECT c.name AS columnName, ty.name AS type, c.max_length AS maxLength, c.is_nullable AS nullable, c.is_identity AS isIdentity
    FROM sys.columns c JOIN sys.types ty ON ty.user_type_id = c.user_type_id WHERE c.object_id = OBJECT_ID(N'dbo.task_attachments') ORDER BY c.column_id`),
  indexes: await t.query(`SELECT i.name, i.is_unique AS isUnique, i.has_filter AS hasFilter,
      STUFF((SELECT ',' + c.name FROM sys.index_columns ic JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
        WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id ORDER BY ic.key_ordinal FOR XML PATH('')), 1, 1, '') AS [columns]
    FROM sys.indexes i WHERE i.object_id = OBJECT_ID(N'dbo.task_attachments') AND i.name IS NOT NULL ORDER BY i.name`),
})

before(async () => {
  await t.start()
  signer = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret: process.env.JWT_SECRET })
  await moduleTools(t.app).enable('tasks')
  org.a = await t.repo('Branch').save({ code: 'TA_A', name: 'فرع أ', country: 'SA' })
  org.b = await t.repo('Branch').save({ code: 'TA_B', name: 'فرع ب', country: 'SA' })
  // إدارة (up) ← قسم (boss) فيه a1 وa2؛ وقسم تاني (oh) فيه out؛ وbEmp في فرع ب
  emps.up = await employee('مدير الإدارة'); emps.boss = await employee('مدير القسم'); emps.oh = await employee('مدير قسم تاني')
  org.adm = await t.repo('Department').save({ name: 'الإدارة', code: 'TA_ADM', branchId: org.a.id, unitType: 'ADMINISTRATION', managerEmployeeId: emps.up.id })
  org.dep = await t.repo('Department').save({ name: 'القسم', code: 'TA_DEP', branchId: org.a.id, parentId: org.adm.id, managerEmployeeId: emps.boss.id })
  org.other = await t.repo('Department').save({ name: 'قسم تاني', code: 'TA_OTH', branchId: org.a.id, managerEmployeeId: emps.oh.id })
  await t.repo('Employee').update({ id: emps.up.id }, { departmentId: org.adm.id })
  await t.repo('Employee').update({ id: emps.boss.id }, { departmentId: org.dep.id })
  await t.repo('Employee').update({ id: emps.oh.id }, { departmentId: org.other.id })
  emps.a1 = await employee('موظف أول', { departmentId: org.dep.id })
  emps.a2 = await employee('موظف تاني', { departmentId: org.dep.id })
  emps.out = await employee('موظف برّه', { departmentId: org.other.id })
  emps.bEmp = await employee('موظف فرع ب', { branchId: org.b.id })
  for (const key of Object.keys(emps)) users[key] = await account([], { employeeId: emps[key].id, branchId: emps[key].branchId, displayName: `حساب ${emps[key].fullName}` })
  users.admin = await t.user({ scopeAllBranches: true })
  users.hr = await account(['tasks.manage', 'tasks.view_all'], { displayName: 'حساب إدارة المهام' })
  users.viewer = await account(['tasks.view_all'])
  users.hrB = await account(['tasks.manage', 'tasks.view_all'], { branchId: org.b.id })
  state.sheet = await xlsx(); state.report = pdf(); state.photo = png()
  fs.mkdirSync(path.join(base, 'payroll'), { recursive: true })
  fs.copyFileSync(path.join(MIGRATIONS, FILE), path.join(base, 'payroll', FILE))
}, { timeout: 120000 })
after(async context => {
  try { await t.stop(context) } finally {
    assert.equal(path.dirname(path.resolve(base)), os.tmpdir()); assert.match(path.basename(base), /^hr-task-attachments-migrations-/)
    fs.rmSync(base, { recursive: true, force: true })
  }
})

test('TA-01: الإرفاق مع إنشاء المهمة، وبعده من اللي كلّف بيها ومن المسؤول عنها؛ والملف قبل الربط لرافعه بس', async () => {
  const sheet = await uploaded('boss', state.sheet, 'خطة الشهر.xlsx'), report = await uploaded('boss', state.report, 'تقرير.pdf')
  // قبل الربط: لرافعه بس، ومش تبع ملف موظف
  assert.deepEqual((({ entityType, entityId, employeeId, uploadedBy }) => [entityType, entityId, employeeId, uploadedBy])(await t.repo('StoredFile').findOneBy({ id: sheet })), ['task_attachment', null, null, users.boss.id])
  assert.equal((await download('boss', sheet)).status, 200)
  for (const who of ['a1', 'hr', 'admin', 'up']) assert.deepEqual((({ status, message }) => [status, message])(await download(who, sheet)), [404, FILE_GONE], who)
  assert.equal(t.expectStatus(await t.request(users.boss, 'GET', '/tasks/assignees'), 200).attachmentsAvailable, true)
  // مع الإنشاء
  const made = t.expectStatus(await t.request(users.boss, 'POST', '/tasks', { title: 'راجع خطة الشهر', assigneeEmployeeId: emps.a1.id, attachmentFileIds: [report, sheet] }), 201)
  state.task = made.id
  assert.deepEqual([made.attachmentsAvailable, made.canAttach, namesOf(made), made.attachments.map(row => [row.mine, row.canRemove, row.uploadedByName, row.size])],
    [true, true, ['خطة الشهر.xlsx', 'تقرير.pdf'], [[true, true, 'حساب مدير القسم', state.sheet.length], [true, true, 'حساب مدير القسم', state.report.length]]])
  assert.equal((await t.repo('StoredFile').findOneBy({ id: sheet })).entityId, made.id)
  // المسؤول شايفهم في «مهامي» وبيحمّلهم بمحتواهم، ومايشيلش ملفات اللي كلّفه
  const mine = t.expectStatus(await t.request(users.a1, 'GET', '/tasks/mine'), 200).tasks.find(row => row.id === made.id)
  assert.deepEqual([mine.canAttach, idsOf(mine), mine.attachments.map(row => [row.mine, row.canRemove])], [true, [sheet, report], [[false, false], [false, false]]])
  const got = await download('a1', sheet)
  assert.deepEqual([got.status, got.bytes.equals(state.sheet)], [200, true])
  assert.equal((await download('a1', report)).bytes.equals(state.report), true)
  // بعد الإنشاء: اللي كلّف بيها بيضيف ملف، والمسؤول بيرفع شغله على نفس المهمة
  const extra = await uploaded('boss', pdf(64), 'ملحق.pdf')
  assert.deepEqual(idsOf(t.expectStatus(await attach('boss', made.id, [extra]), 201)), [sheet, report, extra])
  const work = await uploaded('a1', state.photo, 'شغلي.png')
  const after = t.expectStatus(await attach('a1', made.id, [work]), 201)
  assert.deepEqual([idsOf(after), after.attachments[3].mine, after.attachments[3].canRemove, after.attachments[3].uploadedByName], [[sheet, report, extra, work], true, true, 'حساب موظف أول'])
  const seen = t.expectStatus(await t.request(users.boss, 'GET', `/tasks/${made.id}`), 200)
  assert.deepEqual(seen.attachments.map(row => [row.name, row.mine, row.canRemove]), [['خطة الشهر.xlsx', true, true], ['تقرير.pdf', true, true], ['ملحق.pdf', true, true], ['شغلي.png', false, true]])
  assert.equal((await download('boss', work)).bytes.equals(state.photo), true)
  // كل ربط بسطر في سجل المهمة باسم اللي عمله
  const log = t.expectStatus(await t.request(users.boss, 'GET', `/tasks/${made.id}/log`), 200).lines.filter(line => line.event === 'ATTACHED')
  assert.deepEqual(log.map(line => [line.label, line.body, line.by]), [['مرفق', 'أرفق «خطة الشهر.xlsx»، «تقرير.pdf»', 'مدير القسم'], ['مرفق', 'أرفق «ملحق.pdf»', 'مدير القسم'], ['مرفق', 'أرفق «شغلي.png»', 'موظف أول']])
  Object.assign(state, { sheet1: sheet, report1: report, extra1: extra, work1: work })
})

test('TA-02: مين يشوف ويحمّل — المسؤول، واللي كلّف، واللي فوقهم في الهيكل، وصاحب صلاحية المهام في نطاقه؛ وغيرهم 404 بنفس رد الغايب', async () => {
  const all = [state.sheet1, state.report1, state.extra1, state.work1]
  for (const who of ['a1', 'boss', 'up', 'hr', 'viewer', 'admin']) {
    assert.deepEqual(idsOf(t.expectStatus(await listOf(who, state.task), 200)), all, who)
    for (const fileId of all) assert.equal((await download(who, fileId)).status, 200, `${who} ${fileId}`)
  }
  // اللي فوق مسؤولها بمستويين: مرفقاتها بتتقري وتتحمّل، من غير ما المهمة نفسها تتفتح له ومن غير إرفاق ولا شيل
  const above = t.expectStatus(await listOf('up', state.task), 200)
  assert.deepEqual([above.available, above.canAttach, above.attachments.some(row => row.canRemove || row.mine)], [true, false, false])
  assert.deepEqual(answer(await t.request(users.up, 'GET', `/tasks/${state.task}`)), [404, TASK_GONE])
  assert.deepEqual(answer(await attach('up', state.task, [state.sheet1])), [404, TASK_GONE])
  // اللي بيدير بالصلاحية بيرفق ويشيل؛ وصاحب «عرض كل المهام» بيقرا بس
  const manager = t.expectStatus(await listOf('hr', state.task), 200), reader = t.expectStatus(await listOf('viewer', state.task), 200)
  assert.deepEqual([manager.canAttach, manager.attachments.every(row => row.canRemove), reader.canAttach, reader.attachments.some(row => row.canRemove)], [true, true, false, false])
  // برّه: زميل في نفس القسم، ومدير قسم تاني وموظفه، وصاحب الصلاحية في فرع تاني، وموظف فرع تاني — نفس رد المهمة الغايبة والملف الغايب
  for (const who of ['a2', 'oh', 'out', 'hrB', 'bEmp']) {
    assert.deepEqual(answer(await listOf(who, state.task)), [404, TASK_GONE], who)
    for (const fileId of all) assert.deepEqual((({ status, message }) => [status, message])(await download(who, fileId)), [404, FILE_GONE], `${who} ${fileId}`)
    assert.deepEqual(answer(await attach(who, state.task, [state.sheet1])), [404, TASK_GONE], who)
    assert.deepEqual(answer(await detach(who, state.task, state.sheet1)), [404, TASK_GONE], who)
  }
  assert.deepEqual(answer(await listOf('a2', 999999)), [404, TASK_GONE])
  assert.deepEqual((({ status, message }) => [status, message])(await download('a2', 999999)), [404, FILE_GONE])
})

test('TA-03: قواعد الرفع والربط — النوع والحجم من إعدادات الملفات، وملف مش بتاعك أو متربط مايتربطش، واللي مالوش حق مايرفقش، وحد أقصى', async () => {
  const [rows, onDisk] = [await t.repo('StoredFile').count(), diskFiles().length]
  // الرفع: من غير رقم كيان ولا موظف، والنوع من المحتوى ومطابق للامتداد
  for (const query of ['entityType=task_attachment&entityId=5', `entityType=task_attachment&employeeId=${emps.a1.id}`]) {
    assert.deepEqual(answer(await upload('boss', state.report, 'x.pdf', query)), [400, 'مرفق المهمة بيترفع من غير رقم كيان أو موظف'], query)
  }
  assert.equal((await upload('boss', state.report, 'تقرير.jpg')).status, 400)
  assert.equal((await upload('boss', Buffer.from('MZ\x90\x00 مش ملف مسموح'), 'برنامج.exe')).status, 400)
  // نوع مقفول من الإعداد القايم، وحجم أكبر من الحد القايم
  t.expectStatus(await setConfig('files.allowed_types', 'jpeg,png,webp,pdf'), 200)
  const closed = await upload('boss', state.sheet, 'خطة.xlsx')
  assert.equal(closed.status, 400); assert.match(answer(closed)[1], /مش مسموح — المسموح:/)
  t.expectStatus(await setConfig('files.allowed_types', 'jpeg,png,webp,pdf,doc,docx,xls,xlsx'), 200)
  t.expectStatus(await setConfig('files.max_size_mb', '1'), 200)
  const big = await upload('boss', pdf(1024 * 1024 + 10), 'كبير.pdf')
  assert.equal(big.status, 400); assert.match(answer(big)[1], /حجم الملف أكبر من الحد \(1 ميجا\)/)
  t.expectStatus(await setConfig('files.max_size_mb', '10'), 200)
  assert.deepEqual([await t.repo('StoredFile').count(), diskFiles().length], [rows, onDisk], 'المرفوض مابيكتبش صف ولا ملف')

  // الربط: ملف رفعه حد تاني، وملف بتصنيف تاني (إثبات)، وملف اتربط قبل كده، ورقم مش موجود — نفس الرفض ومن غير أي ربط
  const foreign = await uploaded('a2', state.report, 'بتاع زميل.pdf')
  const proof = t.expectStatus(await upload('boss', state.report, 'إثبات.pdf', 'entityType=task'), 201).id
  const before = (await t.repo('TaskAttachment').count())
  for (const fileIds of [[foreign], [proof], [state.sheet1], [999999]]) assert.deepEqual(answer(await attach('boss', state.task, fileIds)), [400, INVALID], JSON.stringify(fileIds))
  // واحد غلط في القايمة = ولا ملف بيتربط (حتى السليم اللي قبله)
  const fine = await uploaded('boss', state.report, 'سليم.pdf')
  assert.deepEqual(answer(await attach('boss', state.task, [fine, foreign])), [400, INVALID])
  assert.deepEqual([await t.repo('TaskAttachment').count(), (await t.repo('StoredFile').findOneBy({ id: fine })).entityId], [before, null])
  // ومع الإنشاء: مرفق مرفوض = ولا مهمة
  const tasks = await t.repo('Task').count()
  assert.deepEqual(answer(await t.request(users.boss, 'POST', '/tasks', { title: 'بمرفق غلط', assigneeEmployeeId: emps.a2.id, attachmentFileIds: [fine, foreign] })), [400, INVALID])
  assert.deepEqual([await t.repo('Task').count(), (await t.repo('StoredFile').findOneBy({ id: fine })).entityId], [tasks, null])
  // شكل الطلب: قايمة أرقام موجبة لحد 20
  for (const fileIds of [[], ['5'], [0], [1.5], Array.from({ length: 21 }, (_, index) => index + 1), undefined]) assert.equal((await attach('boss', state.task, fileIds)).status, 400, JSON.stringify(fileIds))

  // مين يرفق: اللي بيدير المهمة أو مسؤولها بس. مهمة كلّف بيها صاحب الصلاحية: المدير المباشر شايفها ومايرفقش ولا يشيل ملف مش بتاعه
  const byHr = t.expectStatus(await t.request(users.hr, 'POST', '/tasks', { title: 'من إدارة المهام', assigneeEmployeeId: emps.a1.id }), 201)
  const direct = t.expectStatus(await t.request(users.boss, 'GET', `/tasks/${byHr.id}`), 200)
  assert.deepEqual([direct.canAttach, direct.canManage, direct.canWork], [false, false, false])
  assert.deepEqual(answer(await attach('boss', byHr.id, [fine])), [403, 'إرفاق ملف بالمهمة للي كلّف بيها أو للمسؤول عنها'])
  assert.equal(t.expectStatus(await attach('hr', byHr.id, [await uploaded('hr', state.report, 'من الإدارة.pdf')]), 201).attachments.length, 1)
  assert.deepEqual(answer(await detach('boss', byHr.id, idsOf(t.expectStatus(await listOf('boss', byHr.id), 200))[0])), [403, 'شيل المرفق للي رفعه أو للي كلّف بالمهمة'])

  // حد أقصى 20 مرفق ساري على المهمة
  const more = []
  for (let index = 0; index < 16; index++) more.push(await uploaded('boss', pdf(index), `ملف ${index + 1}.pdf`))
  assert.equal(t.expectStatus(await attach('boss', state.task, more), 201).attachments.length, 20)
  assert.deepEqual(answer(await attach('boss', state.task, [fine])), [400, '20 مرفق بالكتير على المهمة'])
  for (const fileId of more) t.expectStatus(await detach('boss', state.task, fileId), 200)
  assert.equal(t.expectStatus(await attach('boss', state.task, [fine]), 201).attachments.length, 5)
  state.fine = fine
})

test('TA-04: الشيل — اللي رفع المرفق أو اللي بيدير المهمة؛ الصف بيتختم والملف بيفضل على التخزين؛ والمهمة المقفولة مرفقاتها ثابتة', async () => {
  const onDisk = diskFiles().length, rows = await t.repo('StoredFile').count()
  // المسؤول مايشيلش ملف اللي كلّفه، وبيشيل ملفه هو
  assert.deepEqual(answer(await detach('a1', state.task, state.sheet1)), [403, 'شيل المرفق للي رفعه أو للي كلّف بالمهمة'])
  assert.deepEqual(idsOf(t.expectStatus(await detach('a1', state.task, state.work1), 200)), [state.sheet1, state.report1, state.extra1, state.fine])
  const [link] = await links(state.work1)
  assert.deepEqual([link.taskId, link.uploadedByUserId, link.removedByUserId, link.removedAt instanceof Date], [state.task, users.a1.id, users.a1.id, true])
  // مرفق اتشال: مابيتحمّلش لحد (حتى رافعه)، وصفه وملفه على التخزين زي ما هم
  for (const who of ['a1', 'boss', 'hr', 'admin']) assert.deepEqual((({ status, message }) => [status, message])(await download(who, state.work1)), [404, FILE_GONE], who)
  assert.deepEqual([diskFiles().length, await t.repo('StoredFile').count()], [onDisk, rows])
  // اللي بيديرها: اللي كلّف بيشيل ملفه، وصاحب الصلاحية بيشيل ملف مش بتاعه
  t.expectStatus(await detach('boss', state.task, state.report1), 200)
  assert.deepEqual(idsOf(t.expectStatus(await detach('hr', state.task, state.extra1), 200)), [state.sheet1, state.fine])
  // مرفق مش على المهمة (اتشال، أو على مهمة تانية، أو مش موجود)
  for (const fileId of [state.work1, 999999]) assert.deepEqual(answer(await detach('boss', state.task, fileId)), [404, 'المرفق غير موجود'], String(fileId))
  const log = t.expectStatus(await t.request(users.boss, 'GET', `/tasks/${state.task}/log`), 200).lines.filter(line => line.event === 'ATTACHMENT_REMOVED')
  assert.deepEqual(log.slice(-3).map(line => [line.label, line.body, line.by]), [['شيل مرفق', 'شال المرفق «شغلي.png»', 'موظف أول'], ['شيل مرفق', 'شال المرفق «تقرير.pdf»', 'مدير القسم'], ['شيل مرفق', 'شال المرفق «ملحق.pdf»', 'حساب إدارة المهام']])
  // المهمة اتقفلت: مرفقاتها ظاهرة وبتتحمّل، ومن غير إرفاق ولا شيل
  t.expectStatus(await t.request(users.a1, 'POST', `/tasks/${state.task}/status`, { status: 'DONE' }), 201)
  const done = t.expectStatus(await t.request(users.boss, 'GET', `/tasks/${state.task}`), 200)
  assert.deepEqual([done.canAttach, idsOf(done), done.attachments.some(row => row.canRemove)], [false, [state.sheet1, state.fine], false])
  assert.deepEqual(answer(await attach('boss', state.task, [await uploaded('boss', state.report, 'بعد الإقفال.pdf')])), [400, 'المهمة مقفولة — المرفقات بتتغيّر والمهمة مفتوحة بس'])
  assert.deepEqual(answer(await detach('boss', state.task, state.sheet1)), [400, 'المهمة مقفولة — المرفقات بتتغيّر والمهمة مفتوحة بس'])
  assert.equal((await download('a1', state.sheet1)).status, 200)
})

test('TA-05: المهمة الجماعية — نفس الملف لكل اللي خدوا المهمة، وشيله من مهمة مابيشيلوش من الباقي', async () => {
  const shared = await uploaded('boss', state.sheet, 'جدول الفريق.xlsx')
  const made = t.expectStatus(await t.request(users.boss, 'POST', '/tasks/group', { title: 'حدّثوا الجدول', attachmentFileIds: [shared],
    audience: { mode: 'all', where: { mode: 'units', ids: [org.dep.id], branchId: org.a.id } } }), 201)
  assert.equal(made.created, 2)
  const tasks = await t.repo('Task').find({ where: made.taskIds.map(id => ({ id })), order: { id: 'ASC' } })
  const taskOf = Object.fromEntries(tasks.map(row => [row.assigneeEmployeeId === emps.a1.id ? 'a1' : 'a2', row.id]))
  assert.deepEqual((await links(shared)).map(row => [row.taskId, row.removedAt]).sort((x, y) => x[0] - y[0]), [taskOf.a1, taskOf.a2].sort((x, y) => x - y).map(id => [id, null]))
  for (const who of ['a1', 'a2']) {
    const mine = t.expectStatus(await t.request(users[who], 'GET', `/tasks/${taskOf[who]}`), 200)
    assert.deepEqual([namesOf(mine), mine.canAttach, mine.attachments[0].canRemove], [['جدول الفريق.xlsx'], true, false], who)
    assert.equal((await download(who, shared)).bytes.equals(state.sheet), true, who)
  }
  assert.deepEqual((({ status, message }) => [status, message])(await download('out', shared)), [404, FILE_GONE])
  // كل واحد على مهمته هو: مايشوفش مهمة زميله ولا يرفع عليها
  assert.deepEqual(answer(await listOf('a1', taskOf.a2)), [404, TASK_GONE])
  // شغل واحد منهم على مهمته بيظهر له وللي كلّف — مش لزميله
  const work = await uploaded('a2', state.photo, 'شغل التاني.png')
  t.expectStatus(await attach('a2', taskOf.a2, [work]), 201)
  assert.deepEqual([(await download('boss', work)).status, (await download('a1', work)).status], [200, 404])
  // اللي كلّف شال الملف المشترك من مهمة الأول: التاني لسه شايفه، والأول لأ
  t.expectStatus(await detach('boss', taskOf.a1, shared), 200)
  assert.deepEqual([(await download('a1', shared)).status, (await download('a2', shared)).status, (await download('boss', shared)).status], [404, 200, 200])
  assert.deepEqual(namesOf(t.expectStatus(await t.request(users.a2, 'GET', `/tasks/${taskOf.a2}`), 200)), ['جدول الفريق.xlsx', 'شغل التاني.png'])
  state.groupTask = taskOf.a2; state.shared = shared
})

test('TA-06: المهمة الشخصية — مرفقاتها لصاحبها ومديره المباشر بس', async () => {
  const note = await uploaded('a1', state.report, 'ورقي.pdf')
  const personal = t.expectStatus(await t.request(users.a1, 'POST', '/tasks', { title: 'أجدّد رخصتي', assigneeEmployeeId: emps.a1.id, attachmentFileIds: [note] }), 201)
  assert.deepEqual([personal.personal, namesOf(personal), personal.canAttach], [true, ['ورقي.pdf'], true])
  for (const who of ['a1', 'boss']) assert.deepEqual([idsOf(t.expectStatus(await listOf(who, personal.id), 200)), (await download(who, note)).status], [[note], 200], who)
  // مش للي فوقه بمستويين، ولا لصاحب صلاحية المهام، ولا لمدير النظام
  for (const who of ['up', 'hr', 'viewer', 'admin', 'a2']) {
    assert.deepEqual(answer(await listOf(who, personal.id)), [404, TASK_GONE], who)
    assert.deepEqual((({ status, message }) => [status, message])(await download(who, note)), [404, FILE_GONE], who)
  }
  // مديره المباشر بيشوف ومايرفقش (المهمة بيديرها صاحبها بس)
  assert.deepEqual(answer(await attach('boss', personal.id, [state.fine])), [403, 'إرفاق ملف بالمهمة للي كلّف بيها أو للمسؤول عنها'])
})

test('TA-07: ترحيل 194 — من غير الجدول المهام زي ما هي والمرفقات مقفولة برسالتها؛ والمُرحّل بيعمله بنفس الشكل والفرق صفر، وآمن للتكرار', async () => {
  const { resetTaskAttachmentsCache } = require('../src/tasks/task-attachments')
  const synchronized = await shape()
  assert.deepEqual([synchronized.columns.map(row => row.columnName), synchronized.indexes.map(row => [row.name, row.isUnique, row.hasFilter, row.columns])],
    [['id', 'taskId', 'fileId', 'uploadedByUserId', 'createdAt', 'removedAt', 'removedByUserId'],
      [['IX_task_attachments_file', false, false, 'fileId'], ['PK_task_attachments', true, false, 'id'], ['UX_task_attachments_task_file', true, false, 'taskId,fileId']]])
  assert.deepEqual((await t.ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
  const waiting = await uploaded('a2', state.report, 'قبل الترحيل.pdf')
  await t.query('DROP TABLE dbo.task_attachments')
  resetTaskAttachmentsCache()
  // من غير الجدول: المهام بتتقري وتتكلّف زي ما هي، والمرفقات فاضية ومقفولة برسالتها
  const mine = t.expectStatus(await t.request(users.a2, 'GET', '/tasks/mine'), 200).tasks.find(row => row.id === state.groupTask)
  assert.deepEqual([mine.attachmentsAvailable, mine.attachments, mine.canAttach], [false, [], false])
  assert.equal(t.expectStatus(await t.request(users.boss, 'GET', '/tasks/assignees'), 200).attachmentsAvailable, false)
  assert.deepEqual((({ available, canAttach, attachments }) => [available, canAttach, attachments])(t.expectStatus(await listOf('a2', state.groupTask), 200)), [false, false, []])
  assert.deepEqual(answer(await upload('a2', state.report, 'x.pdf')), [400, MISSING])
  assert.deepEqual(answer(await attach('a2', state.groupTask, [waiting])), [400, MISSING])
  assert.deepEqual(answer(await detach('a2', state.groupTask, state.shared)), [400, MISSING])
  assert.deepEqual(answer(await t.request(users.boss, 'POST', '/tasks', { title: 'بمرفق قبل الترحيل', assigneeEmployeeId: emps.a1.id, attachmentFileIds: [waiting] })), [400, MISSING])
  assert.deepEqual(answer(await t.request(users.boss, 'POST', '/tasks/group', { title: 'جماعية بمرفق', attachmentFileIds: [waiting], audience: null })), [400, MISSING])
  assert.equal((await t.request(users.boss, 'POST', '/tasks', { title: 'من غير مرفق', assigneeEmployeeId: emps.a1.id })).status, 201)
  // ملف اتربط قبل كده مابيتحمّلش (مفيش ربط يتحكم بيه)، واللي لسه ماتربطش لرافعه
  assert.deepEqual([(await download('a2', state.shared)).status, (await download('a2', waiting)).status, (await download('boss', waiting)).status], [404, 200, 404])

  const record = await migrate.apply({ database: t.database, base, trial: true, schemaDiff: false, quiet: true })
  assert.equal(record.mode, 'disposable')
  assert.equal(record.failed, undefined, JSON.stringify(record.failed))
  assert.equal(record.trial?.passed, true)
  assert.deepEqual(record.applied.map(item => path.basename(item.file)), [FILE])
  assert.equal(record.ledgerComplete, true)
  assert.deepEqual(record.columns.removedOrRenamed, [])
  assert.deepEqual(await shape(), synchronized, 'نفس شكل synchronize بالحرف')
  assert.deepEqual((await t.ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
  const plan = await migrate.plan({ database: t.database, base })
  assert.equal(plan.readOnly, true); assert.equal(plan.pendingCount, 0); assert.deepEqual(plan.problems, [])
  assert.equal(plan.schemaDiffCount, 0, JSON.stringify(plan.schemaDiff))
  // آمن للتكرار
  const replay = await migrate.apply({ database: t.database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)
  // وجدول بنفس الاسم وبشكل تاني بيوقّف الملف من غير ما يغيّر حاجة
  await t.query('DROP TABLE dbo.task_attachments'); await t.query('CREATE TABLE dbo.task_attachments ([id] int NOT NULL)')
  const text = fs.readFileSync(path.join(MIGRATIONS, FILE), 'utf8').replace(/\r\n/g, '\n')
  const pool = await new (require('../node_modules/mssql').ConnectionPool)({ ...t.master.config, database: t.database }).connect()
  try {
    await assert.rejects((async () => { for (const batch of migrate.splitBatches(text)) await pool.request().batch(batch) })(), error => Number(error.number) === 194001)
    assert.deepEqual((await shape()).columns.map(row => row.columnName), ['id'])
    await pool.request().batch('DROP TABLE dbo.task_attachments')
    for (const batch of migrate.splitBatches(text)) await pool.request().batch(batch)
    for (const batch of migrate.splitBatches(text)) await pool.request().batch(batch)
  } finally { await pool.close() }
  assert.deepEqual(await shape(), synchronized)

  // بعد الترحيل — من غير نسيان الحالة: العملية الشغالة من قبله بتشوفه مع أول نداء
  assert.equal(t.expectStatus(await t.request(users.boss, 'GET', '/tasks/assignees'), 200).attachmentsAvailable, true)
  assert.deepEqual(namesOf(t.expectStatus(await attach('a2', state.groupTask, [waiting]), 201)), ['قبل الترحيل.pdf'])
  assert.equal((await download('boss', waiting)).status, 200)
})

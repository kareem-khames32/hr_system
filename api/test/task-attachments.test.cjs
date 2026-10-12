'use strict'
// B-ADD.19 (كلمة المالك 12 أكتوبر 2026): مرفقات المهام — القواعد النقية ومصدر الكود، من غير قاعدة بيانات (المسارات نفسها في
// task-attachments.integration.cjs):
//  TAU-01) مين يشوف مرفقات المهمة (taskAttachmentsVisibleTo): اللي يشوف المهمة، واللي فوق مسؤولها في الهيكل بأي عمق؛ والشخصية لصاحبها
//          ومديره المباشر بس؛ والجلسة قبل المباشرة لمهمتها بس.
//  TAU-02) أرقام المرفقات المبعوتة: قايمة أرقام صحيحة موجبة من غير تكرار، لحد الأقصى.
//  TAU-03) الربط: الملف بيتختم بشرطه في جملة واحدة (تصنيفه، ولسه مش مربوط، ورافعه هو الحساب) وصف لكل مهمة؛ وقبل الترحيل القراءة فاضية
//          من غير ما تلمس الجدول.
//  TAU-04) مصدر الكود: الإرفاق والشيل تحت قفل صف المهمة والحكم بعده، والربط جوه معاملة الإنشاء، والتحميل بحكم المهمة وبرد الملف الغايب،
//          والترحيل والكيان بنفس الشكل.
//  TAU-05) الشاشات: المرفقات في نموذج المهمة وكارتها من حكم الخادم، ومن غير أصناف اتجاه فيزيائي.
//  TAU-06) أساس تحميل ملف المهمة الجماعية: المدير المباشر لموظف = الموظف تحته في «كل اللي تحته» — على كل موظف في هيكل فيه كل الدرجات.
// Run (من api/): node --test test/task-attachments.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const rules = require('../src/tasks/task-rules')
const attachments = require('../src/tasks/task-attachments')
const migrate = require('../scripts/db-migrate.cjs')
const read = rel => fs.readFileSync(path.join(apiRoot, 'src', rel), 'utf8').replace(/\r\n/g, '\n')
const web = rel => fs.readFileSync(path.join(apiRoot, '..', 'src', rel), 'utf8').replace(/\r\n/g, '\n')
const MIGRATION = path.join(apiRoot, '..', 'docs', 'migrations', 'payroll', '20261012_194_task_attachments.sql')

const user = (extra = {}) => ({ sub: 10, email: 'u@example.invalid', role: 'employee', employeeId: 100, branchId: 1, permissions: [], ...extra })
const task = (extra = {}) => ({ createdByUserId: 99, branchId: 1, assigneeEmployeeId: 200, assigneeRole: null, isPersonal: false, ...extra })
// الهيكل: 200 مديره المباشر 300، و300 تحت 400، و400 تحت 500 (فـ300 و400 و500 فوق 200)
const structure = { directManagerOf: async id => ({ 200: 300, 300: 400, 400: 500 }[id] ?? null),
  isUnder: async (id, manager) => ({ 200: [300, 400, 500], 300: [400, 500], 400: [500] }[id] ?? []).includes(manager) }
const sees = async (who, what = task()) => (await rules.taskAttachmentsVisibleTo(who, what, structure)).visible

test('TAU-01: مين يشوف مرفقات المهمة — اللي يشوف المهمة، واللي فوق مسؤولها بأي عمق؛ والشخصية لصاحبها ومديره المباشر بس', async () => {
  // المسؤول، ومديره المباشر، واللي كلّف بيها ومسؤولها تحته، وصاحب «إدارة المهام» أو «عرض كل المهام» في فرعها
  assert.equal(await sees(user({ employeeId: 200 })), true)
  assert.equal(await sees(user({ employeeId: 300 })), true)
  assert.equal(await sees(user({ sub: 99, employeeId: 400 })), true)
  for (const permission of ['tasks.manage', 'tasks.view_all']) assert.equal(await sees(user({ employeeId: null, permissions: [permission] })), true, permission)
  // اللي فوق المسؤول بأكتر من مستوى: مرفقاتها ظاهرة له — والمهمة نفسها لأ (حكمها زي ما هو)
  for (const above of [400, 500]) {
    const seen = await rules.taskAttachmentsVisibleTo(user({ employeeId: above }), task(), structure)
    assert.deepEqual([seen.visible, seen.access.visible, seen.access.manage, seen.access.work], [true, false, false, false], String(above))
  }
  // برّه: زميل، حد من غير موظف، صاحب صلاحية في فرع تاني، واللي كلّف بيها ومسؤولها مابقاش تحته (ولا معاه صلاحية)
  assert.equal(await sees(user({ employeeId: 600 })), false)
  assert.equal(await sees(user({ employeeId: null })), false)
  assert.equal(await sees(user({ employeeId: null, branchId: 2, permissions: ['tasks.manage', 'tasks.view_all'] })), false)
  assert.equal(await sees(user({ sub: 99, employeeId: 600 })), false)
  // مهمة دور: حاملها في فرعها؛ ومفيش «فوق» لمهمة من غير موظف
  assert.equal(await sees(user({ employeeId: 500 }), task({ assigneeEmployeeId: null, assigneeRole: 'hr' })), false)
  assert.equal(await sees(user({ employeeId: null, permissions: ['approve.hr'] }), task({ assigneeEmployeeId: null, assigneeRole: 'hr' })), true)
  // الشخصية: صاحبها ومديره المباشر بس — مش اللي فوقه بمستويين ولا صاحب الصلاحية
  const personal = task({ isPersonal: true, createdByUserId: 10 })
  assert.deepEqual([await sees(user({ employeeId: 200 }), personal), await sees(user({ employeeId: 300 }), personal), await sees(user({ employeeId: 400 }), personal),
    await sees(user({ employeeId: null, permissions: ['tasks.manage', 'tasks.view_all'] }), personal)], [true, true, false, false])
  // الجلسة قبل المباشرة: مهمتها هي بس، ومن غير سلطة «فوق»
  const early = extra => user({ preboardingUntil: '2999-01-01', ...extra })
  assert.deepEqual([await sees(early({ employeeId: 200 })), await sees(early({ employeeId: 400 })), await sees(early({ employeeId: 300 }))], [true, false, false])
})

test('TAU-02: أرقام المرفقات المبعوتة — قايمة أرقام صحيحة موجبة من غير تكرار، لحد الأقصى', () => {
  const clean = attachments.cleanAttachmentIds
  assert.deepEqual([clean(undefined), clean(null), clean([]), clean([5, 3, 5, 9])], [[], [], [], [3, 5, 9]])
  for (const bad of ['5', 5, {}, [0], [-1], [1.5], ['7'], [null], [2147483648], [1, 'x']]) assert.throws(() => clean(bad), error => error.getStatus() === 400 && error.message === 'أرقام المرفقات غير صالحة', JSON.stringify(bad))
  const many = Array.from({ length: attachments.TASK_ATTACHMENTS_MAX + 1 }, (_, index) => index + 1)
  assert.equal(clean(many.slice(0, attachments.TASK_ATTACHMENTS_MAX)).length, 20)
  assert.throws(() => clean(many), /20 مرفق بالكتير على المهمة/)
  assert.deepEqual([attachments.TASK_ATTACHMENT_FILE_TYPE, attachments.TASK_ATTACHMENTS_MAX], ['task_attachment', 20])
  // اسم المرفق: multer بيقرا العربي latin1 — بيترجع UTF-8؛ والاسم اللاتيني زي ما هو
  const name = attachments.taskAttachmentName
  assert.deepEqual([name(Buffer.from('خطة الشهر.xlsx', 'utf8').toString('latin1')), name('plan.xlsx'), name('خطة.xlsx'), name('résumé.pdf'), name(''), name(undefined)],
    ['خطة الشهر.xlsx', 'plan.xlsx', 'خطة.xlsx', 'résumé.pdf', 'مرفق', 'مرفق'])
})

test('TAU-03: الربط — الملف بيتختم بشرطه في جملة واحدة وصف لكل مهمة؛ وقبل الترحيل القراءة فاضية من غير ما تلمس الجدول', async () => {
  const fake = ({ ready = 1, bound = () => [{ originalName: 'خطة.xlsx' }] } = {}) => {
    const calls = { queries: [], inserts: [], finds: 0 }
    return { calls, query: async (text, params) => { calls.queries.push([text, params]); return /OBJECT_ID/.test(text) ? [{ ready }] : /^UPDATE \[stored_files\]/.test(text) ? bound(params) : [] },
      getRepository: () => ({ insert: async rows => { calls.inserts.push(...rows) }, find: async () => { calls.finds++; return [] }, count: async () => 0 }) }
  }
  // ربط ملفين بتلات مهام (مهمة جماعية): ختم لكل ملف بشرطه، وصف لكل (مهمة، ملف)
  const em = fake()
  const names = await attachments.bindTaskAttachments(em, { sub: 7 }, [31, 32, 33], [5, 6])
  assert.deepEqual(names, ['خطة.xlsx', 'خطة.xlsx'])
  const updates = em.calls.queries.filter(([text]) => text.startsWith('UPDATE'))
  assert.equal(updates.length, 2)
  for (const [text] of updates) {
    assert.match(text.replace(/\s+/g, ' '), /^UPDATE \[stored_files\] SET \[entityId\] = @0 OUTPUT INSERTED\.\[originalName\] AS \[originalName\] WHERE \[id\] = @1 AND \[entityType\] = N'task_attachment' AND \[entityId\] IS NULL AND \[uploadedBy\] = @2$/)
  }
  assert.deepEqual(updates.map(([, params]) => params), [[31, 5, 7], [31, 6, 7]])
  assert.deepEqual(em.calls.inserts.map(row => [row.taskId, row.fileId, row.uploadedByUserId, row.removedAt, row.removedByUserId]),
    [[31, 5, 7, null, null], [32, 5, 7, null, null], [33, 5, 7, null, null], [31, 6, 7, null, null], [32, 6, 7, null, null], [33, 6, 7, null, null]])
  // ملف مااتختمش (بتاع حد تاني، أو تصنيف تاني، أو اتربط قبل كده، أو مش موجود): نفس الرفض، ومن غير صف
  const refused = fake({ bound: () => [] })
  await assert.rejects(attachments.bindTaskAttachments(refused, { sub: 7 }, [31], [5]), error => error.getStatus() === 400 && error.message === attachments.TASK_ATTACHMENT_INVALID)
  assert.deepEqual(refused.calls.inserts, [])
  // من غير ملفات أو من غير مهام: ولا نداء
  const idle = fake()
  assert.deepEqual([await attachments.bindTaskAttachments(idle, { sub: 7 }, [31], []), await attachments.bindTaskAttachments(idle, { sub: 7 }, [], [5]), idle.calls.queries.length], [[], [], 0])
  // قبل الترحيل: القراءة فاضية والجدول مااتلمسش؛ والناقص مابيتحفظش (بيتفحص مع كل نداء)، والموجود بيتحفظ
  attachments.resetTaskAttachmentsCache()
  const before = fake({ ready: 0 })
  assert.deepEqual([[...(await attachments.taskAttachmentsOf(before, [1, 2]))], await attachments.taskAttachmentsReady(before), before.calls.finds, before.calls.queries.length], [[], false, 0, 2])
  const after = fake({ ready: 1 })
  assert.deepEqual([await attachments.taskAttachmentsReady(after), await attachments.taskAttachmentsReady(after), after.calls.queries.length], [true, true, 1])
  attachments.resetTaskAttachmentsCache()
  assert.match(attachments.TASK_ATTACHMENTS_MIGRATION_MISSING, /ترحيل 20261012_194/)
})

test('TAU-04: مصدر الكود — الإرفاق والشيل تحت قفل صف المهمة، والربط جوه معاملة الإنشاء، والتحميل بحكم المهمة، والترحيل والكيان بنفس الشكل', () => {
  const service = read('tasks/tasks.service.ts')
  const inOrder = (text, parts, label) => {
    const at = parts.map(part => text.indexOf(part))
    assert.ok(at.every((value, index) => value > 0 && (index === 0 || value > at[index - 1])), `${label}: ${JSON.stringify(at)}`)
  }
  // القفل ثم الحكم: الترحيل، وربط المهمة (تنفيذ طلب / إقرار مستند)، وقفل صفها بحق الحساب، وحالتها — وبعدها حكم الإرفاق والحد والربط
  const attachable = service.slice(service.indexOf('private async attachable('), service.indexOf('async attach('))
  inOrder(attachable, ['await taskAttachmentsReady(em)', 'await this.load(user, id, em, !acknowledgement)', 'throw new BadRequestException(TASK_ATTACHMENTS_LINKED)', 'TASK_STILL_OPENING', 'TASK_ATTACHMENTS_CLOSED'], 'attachable')
  const attach = service.slice(service.indexOf('async attach('), service.indexOf('async removeAttachment('))
  inOrder(attach, ['await this.attachable(em, user, id)', 'if (!access.manage && !access.work) throw new ForbiddenException(TASK_ATTACH_RULE)', 'await activeTaskAttachments(em, task.id)', 'await this.attachOnCreate(em, user, [task], fileIds)'], 'attach')
  const remove = service.slice(service.indexOf('async removeAttachment('), service.indexOf('// ===== التذكير والتصعيد'))
  inOrder(remove, ['await this.attachable(em, user, id)', 'WITH (UPDLOCK, ROWLOCK) WHERE [taskId] = @0 AND [fileId] = @1 AND [removedAt] IS NULL', 'throw new NotFoundException(TASK_ATTACHMENT_NOT_FOUND)',
    'Number(link.uploadedByUserId) !== user.sub && !access.manage', '{ removedAt: new Date(), removedByUserId: user.sub }', "'ATTACHMENT_REMOVED'"], 'remove')
  // من غير نداء خدمة تانية ولا اتصال تاني جوه المعاملتين، ومن غير حفظ صف المهمة كله ولا مسح صف أو ملف
  for (const [label, text] of [['attach', attach], ['remove', remove]]) {
    assert.doesNotMatch(text.slice(text.indexOf('this.ds.transaction(')).split('return this.detail(')[0], /this\.resolver\.|this\.ds\.manager|this\.modules\./, label)
    assert.match(text, /await em\.getRepository\(Task\)\.update\(\{ id: task\.id \}, \{ updatedAt: new Date\(\) \}\)/, label)
    assert.doesNotMatch(text, /\.save\(|\.delete\(|\.remove\(|storage\(\)/, label)
  }
  // مع الإنشاء: الربط جوه معاملة الإنشاء بعد صف المهمة (مرفق مرفوض = ولا مهمة)، والمهمة الجماعية بتربط نفس الملفات بكل مهامها
  const create = service.slice(service.indexOf('async create('), service.indexOf('// ===== B-ADD.1: المهمة الجماعية'))
  inOrder(create, ['const fileIds = cleanAttachmentIds(input.attachmentFileIds)', 'this.ds.transaction(', 'TASK_ATTACHMENTS_MIGRATION_MISSING', 'await repo.save(', 'await this.attachOnCreate(em, user, [row], fileIds)'], 'create')
  const group = service.slice(service.indexOf('async createForGroup('), service.indexOf('// ===== B-ADD.18: شجرة المدير'))
  inOrder(group, ['const fileIds = cleanAttachmentIds(input.attachmentFileIds)', 'this.ds.transaction(', "if (!created.length) throw new BadRequestException(", 'await this.attachOnCreate(em, user, created, fileIds)'], 'group')
  // القراءة: بحكم المرفقات (اللي فوق المسؤول معاهم)، وبرّه كده رد المهمة الغايبة؛ وكارت المهمة للي يشوفها زي ما هو
  const list = service.slice(service.indexOf('async attachments('), service.indexOf('private async attachable('))
  assert.match(list, /await taskAttachmentsVisibleTo\(user, \{ \.\.\.task, isPersonal: \(await taskExtrasOfOne\(em, id\)\)\.isPersonal \}, this\.resolver\)/)
  assert.match(list, /if \(!task \|\| !seen\?\.visible\) throw new NotFoundException\(TASK_NOT_FOUND\)/)
  assert.match(service, /canAttach: attachmentsReady && open && !link && !documentOf\.has\(task\.id\) && \(canManage \|\| mine\),/)
  assert.match(service, /attachments: link \|\| documentOf\.has\(task\.id\) \? \[\] : /)
  // مسار الملفات القايم: التصنيف الجديد من غير رقم كيان ولا موظف، والحجم والنوع من نفس الإعدادات، والتحميل بحكم المهمة
  const files = read('files/files.controller.ts')
  assert.match(files, /'announcement', TASK_ATTACHMENT_FILE_TYPE, 'leave_attachment', 'task', 'case'\]\.includes\(entityType\)/)
  inOrder(files, ["if (entityType === TASK_ATTACHMENT_FILE_TYPE) {", "throw new BadRequestException('مرفق المهمة بيترفع من غير رقم كيان أو موظف')", 'throw new BadRequestException(TASK_ATTACHMENTS_MIGRATION_MISSING)',
    'const settings = await this.uploadSettings()', 'classifyUpload(file.buffer, file.originalname, settings.allowed)'], 'upload')
  assert.match(files, /\} else if \(f\.entityType === TASK_ATTACHMENT_FILE_TYPE\) \{\n[^\n]+\n\s+await assertTaskAttachmentFileAccess\(this\.ds\.manager, user, f\)/)
  assert.match(files, /entityType === 'case' \? undefined : entityType === TASK_ATTACHMENT_FILE_TYPE \? undefined\n/)
  const helper = read('tasks/task-attachments.ts')
  // التحميل: قبل الربط لرافعه بس، وبعده بحكم المهمة حتى لرافعه، وبرد الملف الغايب بالحرف
  assert.match(helper, /const missing = \(\) => new NotFoundException\(TASK_FILE_NOT_FOUND\)/)
  assert.match(helper, /if \(file\.entityId == null\) \{\n\s+if \(!!user\.sub && file\.uploadedBy === user\.sub\) return\n\s+throw missing\(\)/)
  assert.match(helper, /find\(\{ where: \{ fileId: file\.id, removedAt: IsNull\(\) \}/)
  assert.equal(rules.TASK_FILE_NOT_FOUND, 'الملف غير موجود')
  // ملف المهمة الجماعية: «اللي تحتي» مرة واحدة للتحميل كله، والحكم نفسه واحد (taskAttachmentsVisibleTo) على هيكل بيجاوب منها
  assert.match(helper, /const under = new Set\(user\.employeeId \? await resolver\.subordinatesOf\(user\.employeeId\) : \[\]\)/)
  assert.match(helper, /directManagerOf: async employeeId => \(under\.has\(employeeId\) \? resolver\.directManagerOf\(employeeId\) : null\),/)
  assert.match(helper, /isUnder: async \(employeeId, managerEmployeeId\) => \(managerEmployeeId === user\.employeeId \? under\.has\(employeeId\) : resolver\.isUnder\(employeeId, managerEmployeeId\)\),/)
  assert.match(helper, /taskAttachmentsVisibleTo\(user, \{ \.\.\.task, isPersonal: extras\.get\(task\.id\)\?\.isPersonal \?\? false \}, structure\)\)\.visible\) return/)
  // المسارات تبع موديول المهام وبحارس الدخول
  const controller = read('tasks/tasks.controller.ts')
  for (const route of ["@Get(':id/attachments')", "@Post(':id/attachments')", "@Delete(':id/attachments/:fileId')"]) assert.ok(controller.includes(route), route)
  assert.match(controller, /@RequireModule\('tasks'\)\n@UseGuards\(JwtAuthGuard, RolesGuard\)\n@Controller\('tasks'\)/)
  // الترحيل: من غير BOM، ومن غير عبارة ممنوعة، وجدول جديد بس، وأكواده فريدة بين كل الملفات، ومتوافق مع SQL Server 2019
  const raw = fs.readFileSync(MIGRATION)
  assert.notDeepEqual([...raw.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'من غير BOM')
  const text = raw.toString('utf8').replace(/\r\n/g, '\n')
  assert.match(text, /^-- 20261012_194: /)
  assert.deepEqual(migrate.forbiddenStatements(text), [])
  assert.deepEqual(migrate.throwCodes(text), [194001, 194002])
  const statements = migrate.stripComments(text)
  assert.doesNotMatch(statements, /\b(?:DROP|TRUNCATE|MERGE|INSERT|DELETE|ALTER)\b|\bUPDATE\s+(?:dbo\.)?\[?\w/i, 'جدول جديد بس')
  assert.doesNotMatch(statements, /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(?:NOT\s+)?DISTINCT\s+FROM/i, 'SQL Server 2019')
  assert.match(statements, /\bSET NOCOUNT ON;\s*\nGO\n/)
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات')
  // والكيان بنفس أعمدة وفهارس الترحيل
  const entity = read('tasks/task-attachment.entity.ts')
  assert.match(entity, /@Entity\('task_attachments'\)\n@Index\('UX_task_attachments_task_file', \['taskId', 'fileId'\], \{ unique: true \}\)\n@Index\('IX_task_attachments_file', \['fileId'\]\)/)
  for (const column of ['taskId', 'fileId', 'uploadedByUserId', 'createdAt', 'removedAt', 'removedByUserId']) {
    assert.ok(entity.includes(`  ${column}: `), column)
    assert.ok(text.includes(`(N'${column}', N'`), column)
  }
  assert.match(text, /CREATE UNIQUE INDEX \[UX_task_attachments_task_file\] ON dbo\.task_attachments \(\[taskId\], \[fileId\]\);/)
  assert.match(text, /CREATE INDEX \[IX_task_attachments_file\] ON dbo\.task_attachments \(\[fileId\]\);/)
  assert.match(read('tasks/tasks.module.ts'), /TypeOrmModule\.forFeature\(\[Task, TaskExtra, TaskLogEntry, TaskAttachment\]\)/)
})

test('TAU-05: الشاشات — المرفقات في نموذج المهمة وكارتها من حكم الخادم، ومن غير أصناف اتجاه فيزيائي', () => {
  const api = web('lib/tasks-api.ts')
  assert.match(api, /export const attachTaskFiles = \(id: number, fileIds: number\[\]\) => apiFetch<ApiTask>\(`\/tasks\/\$\{id\}\/attachments`, json\('POST', \{ fileIds \}\)\)/)
  assert.match(api, /export const removeTaskAttachment = \(id: number, fileId: number\) => apiFetch<ApiTask>\(`\/tasks\/\$\{id\}\/attachments\/\$\{fileId\}`, \{ method: 'DELETE' \}\)/)
  // نفس تصنيف وحد الخادم
  assert.match(api, /export const TASK_ATTACHMENT_FILE_TYPE = 'task_attachment'\nexport const TASK_ATTACHMENTS_MAX = 20\n/)
  const modal = web('components/tasks/TaskFormModal.tsx')
  // المهمة الجديدة بس، والترحيل موجود؛ الملف اللي اترفع مابيترفعش تاني؛ والأرقام بتتبعت مع الإنشاء (فردي وجماعي)
  assert.match(modal, /const canAttach = !task && !!assignees\.attachmentsAvailable/)
  assert.match(modal, /const id = uploaded\.current\.get\(file\) \?\? \(await uploadFile\(file, \{ entityType: TASK_ATTACHMENT_FILE_TYPE \}\)\)\.id/)
  assert.match(modal, /audience, \.\.\.\(attachmentFileIds\.length \? \{ attachmentFileIds \} : \{\}\) \}\)/)
  assert.match(modal, /await createTask\(\{ \.\.\.input, description: input\.description \?\? undefined, \.\.\.\(attachmentFileIds\.length \? \{ attachmentFileIds \} : \{\}\) \}\)/)
  assert.match(modal, /\{canAttach && \(\n\s+<div data-task-form-attachments>/)
  const card = web('components/tasks/TaskCard.tsx')
  assert.match(card, /\{\(\(task\.attachments\?\.length \?\? 0\) > 0 \|\| task\.canAttach\) && \(\n\s+<div className="mt-2 text-sm space-y-1" data-task-attachments>/)
  assert.match(card, /\{row\.canRemove && <button type="button" className="text-xs text-red-700 underline ms-auto"/)
  assert.match(card, /\{task\.canAttach && \(\n\s+<>\n\s+<input ref=\{attachInput\} type="file" multiple className="hidden"/)
  assert.match(card, /for \(const item of picked\) ids\.push\(\(await uploadFile\(item, \{ entityType: TASK_ATTACHMENT_FILE_TYPE \}\)\)\.id\)\n\s+onChanged\(await attachTaskFiles\(task\.id, ids\)\)/)
  assert.match(card, /if \(!window\.confirm\(`تشيل المرفق «\$\{name\}» من المهمة؟`\)\) return/)
  // إثبات الإقفال زي ما هو (تصنيفه task)
  assert.match(card, /uploadFile\(file, \{ entityType: 'task' \}\)/)
  for (const [name, text] of Object.entries({ modal, card })) assert.doesNotMatch(text, /(?<![\w-])(?:ml|mr|pl|pr|left|right)-\d|text-left|text-right/, `${name}: أصناف اتجاه فيزيائي`)
})

test('TAU-06: أساس تحميل ملف المهمة الجماعية — المدير المباشر لموظف = الموظف من «كل اللي تحته» بتاعه', async () => {
  const { ApproverResolver } = require('../src/requests/approver-resolver.service')
  const repo = rows => ({ findOne: async ({ where }) => { const row = rows.find(item => item.id === where.id); return row ? { ...row } : null }, find: async () => rows.map(row => ({ ...row })) })
  // مدير مسجّل، قائد فريق، مدير قسم، مدير إدارة فوقه، مدير فرع، ودايرة، ومدير نفسه
  const employees = [
    { id: 1, departmentId: 10, branchId: 1 }, { id: 2, departmentId: 11, branchId: 1 }, { id: 3, departmentId: 11, teamId: 20, branchId: 1 }, { id: 4, departmentId: 11, teamId: 20, branchId: 1 },
    { id: 5, departmentId: 11, teamId: 20, managerEmployeeId: 7, branchId: 1 }, { id: 6, departmentId: 11, branchId: 1 }, { id: 7, departmentId: 12, branchId: 1 }, { id: 8, branchId: 1 },
    { id: 9, branchId: 1 }, { id: 10, managerEmployeeId: 11, branchId: 2 }, { id: 11, managerEmployeeId: 10, branchId: 2 }, { id: 12, managerEmployeeId: 12, departmentId: 11, branchId: 1 },
  ]
  const resolver = new ApproverResolver(repo(employees), repo([{ id: 20, leaderEmployeeId: 3, departmentId: 11 }]),
    repo([{ id: 10, managerEmployeeId: 1, parentId: null }, { id: 11, managerEmployeeId: 2, parentId: 10 }, { id: 12, managerEmployeeId: 7, parentId: null }]),
    repo([{ id: 1, managerEmployeeId: 9 }, { id: 2, managerEmployeeId: null }]))
  let checked = 0
  for (const row of employees) {
    const manager = await resolver.directManagerOf(row.id)
    if (!manager || manager === row.id) continue
    assert.equal((await resolver.subordinatesOf(manager)).includes(row.id), true, `${row.id} تحت مديره المباشر ${manager}`)
    checked++
  }
  // 9 مدير الفرع مافوقوش حد، و12 مسجّل مدير نفسه: الباقي عشرة
  assert.equal(checked, 10)
})

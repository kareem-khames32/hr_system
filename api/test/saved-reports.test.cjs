'use strict'
// B2.13 (ب): التقرير المحفوظ والمجدول — فحص من غير قاعدة (الدورة الفعلية في saved-reports.integration.cjs):
//  SV-01) القواعد: الاسم، والفلاتر المحفوظة، ومتى يستحق الإرسال، والشهر السابق.
//  SV-02) الربط: المهمة المجدولة متسجلة في موديول التقارير وبتعدّي على tick، والبريد بيشيل المرفق، والإرسال بهوية صاحب التقرير وقتها
//         ومن غير معاملة، وسطر التدقيق بعد ما الرسالة تطلع، والتعديل بالحقول المتغيّرة وبصاحب الصف.
//  SV-03) الواجهة: المكوّن في صفحة التقارير، والحذف بتأكيد، وتنبيه البريد المقفول، ونفس نصوص الخادم.
// Run (من api/): node --test test/saved-reports.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const rules = require('../src/reports/saved-reports')
const { MODULES } = require('../src/modules-registry/registry')
const { SCHEDULED_JOBS } = require('../src/scheduler/scheduled-jobs')
const root = path.resolve(__dirname, '..', '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n')

test('SV-01: names, saved filters, due dates and the previous payroll month', () => {
  assert.equal(rules.savedReportName('  حضور   فرع الرياض '), 'حضور فرع الرياض')
  for (const bad of ['', ' ', 'x', 'ت'.repeat(121), null, 12, 'اسم\u0007فيه تحكم']) assert.equal(rules.savedReportName(bad), null, String(bad))
  assert.equal(rules.savedReportName('ت'.repeat(120)).length, 120)
  // الفلاتر: أي حاجة مش مفهومة = من غير فلتر، والفترة الافتراضية الجاري
  const none = { branchId: null, departmentIds: null, teamId: null, period: 'current' }
  for (const bad of ['', 'not json', '[]', 'null', '{"branchId":"x","departmentIds":"1,2","teamId":-3,"period":"next"}']) assert.deepEqual(rules.parseSavedFilters(bad), none, bad)
  assert.deepEqual(rules.parseSavedFilters('{"branchId":3,"departmentIds":[5,5,7,0,"x"],"teamId":9,"period":"previous"}'),
    { branchId: 3, departmentIds: [5, 7], teamId: 9, period: 'previous' })
  assert.equal(rules.savedFiltersNarrow(none), false)
  assert.equal(rules.savedFiltersNarrow({ ...none, teamId: 4 }), true)
  // الاستحقاق: مرة في اليوم بالكتير، ومن آخر إرسال
  const due = rules.savedReportDue
  assert.equal(due('NONE', null, '2026-10-07'), false); assert.equal(due('HOURLY', null, '2026-10-07'), false)
  for (const frequency of ['DAILY', 'WEEKLY', 'MONTHLY']) {
    assert.equal(due(frequency, null, '2026-10-07'), true, `${frequency}: التقرير الجديد بيتبعت في أول فحص`)
    assert.equal(due(frequency, '2026-10-07', '2026-10-07'), false, `${frequency}: مش مرتين في اليوم`)
    assert.equal(due(frequency, '2026-10-08', '2026-10-07'), false, `${frequency}: تاريخ قدام النهارده`)
  }
  assert.equal(due('DAILY', '2026-10-06', '2026-10-07'), true)
  assert.equal(due('WEEKLY', '2026-10-01', '2026-10-07'), false); assert.equal(due('WEEKLY', '2026-09-30', '2026-10-07'), true)
  assert.equal(due('WEEKLY', '2026-02-25', '2026-03-04'), true, 'عبر آخر فبراير')
  assert.equal(due('MONTHLY', '2026-10-01', '2026-10-31'), false); assert.equal(due('MONTHLY', '2026-09-30', '2026-10-01'), true)
  assert.equal(due('MONTHLY', '2025-12-15', '2026-01-02'), true)
  assert.equal(rules.previousPeriod('2026-10'), '2026-09'); assert.equal(rules.previousPeriod('2026-01'), '2025-12')
  assert.match(rules.SAVED_REPORTS_MIGRATION_MISSING, /20261007_098/)
})

test('SV-02: the job is registered and goes through tick; mail carries the file; the send uses the owner\'s identity now', () => {
  assert.deepEqual(MODULES.reports.jobs, ['reports.scheduled'])
  assert.deepEqual({ module: SCHEDULED_JOBS['reports.scheduled'].module, lock: SCHEDULED_JOBS['reports.scheduled'].lock, cron: SCHEDULED_JOBS['reports.scheduled'].cron },
    { module: 'reports.scheduled', lock: 'reports.scheduled', cron: '20 * * * *' })
  const runner = read('api/src/scheduler/scheduled-jobs.runner.ts')
  assert.match(runner, /@Scheduled\('reports\.scheduled'\)\s+scheduledReports\(\) \{\s+return this\.jobs\.tick\('reports\.scheduled', \(\) => this\.use\(SavedReportsService\)\.sendDue\(\)\)/)
  const mail = read('api/src/auth/mail.service.ts')
  assert.match(mail, /attachments\?: Array<\{ filename: string; content: Buffer; contentType: string \}>/)
  assert.match(mail, /\.\.\.\(message\.attachments\?\.length \? \{ attachments: message\.attachments \} : \{\}\)/)
  const service = read('api/src/reports/saved-reports.service.ts')
  const send = service.slice(service.indexOf('async sendDue('))
  assert.doesNotMatch(service, /\.transaction\(/, 'من غير معاملة: مفيش نداء خدمة تانية ولا بريد تحت معاملة')
  // هوية صاحب التقرير من حسابه دلوقتي (accountPayloads)، للحسابات المفعّلة بس
  // الصف والهوية بيتقروا لكل تقرير جوه الحلقة قبل بنائه
  const loop = send.slice(send.indexOf('for (const listed of rows)'))
  assert.match(loop, /const row = await this\.repo\.findOne\(\{ where: \{ id: listed\.id \} \}\)\s+if \(!row \|\| !savedReportDue\(/)
  assert.match(loop, /users\.findOne\(\{ where: \{ id: row\.ownerUserId, isActive: true \} \}\)/)
  assert.match(loop, /await auth\.accountPayloads\(\[account\]\)/)
  assert.match(loop, /throw new Error\(SAVED_REPORT_MAIL_FAILED\)/, 'تفاصيل خادم البريد مابتتعرضش لصاحب التقرير')
  assert.match(send, /!userHasPerm\(current, 'reports\.view'\) \|\| !userHasPerm\(current, 'reports\.save'\) \|\| !\(await this\.modules\.allowedFor\('reports', current\)\)/)
  // CRP3D-B13-01: الهوية بتتقري تاني بعد بناء الملف وقبل الإرسال، والملف بيتبني من جديد لو اختلفت (3 مرات بالكتير)
  assert.match(send, /let owner = await identity\(\)\n\s+let file = await render\(owner\)\n[\s\S]{0,420}for \(let round = 0; ; round\+\+\) \{\n\s+const current = await identity\(\)\n\s+if \(identityStamp\(current\) === identityStamp\(owner\)\) break\n\s+if \(round >= 2\) throw new Error\(SAVED_REPORT_OWNER_CHANGING\)\n\s+owner = current\n\s+file = await render\(owner\)\n\s+\}\n\s+await mail\.send\(/)
  assert.match(send, /if \(!\(await this\.modules\.jobEnabled\('reports\.scheduled'\)\)\) return none\('module'\)/)
  // الترتيب: البريد مفتوح قبل أي بناء، ثم الملف، ثم الرسالة، ثم سطر التدقيق، ثم تسجيل يوم الإرسال
  const order = ['await this.mailReady()', 'let file = await render(owner)', 'await mail.send(', 'await file.audit()', '{ lastSentOn: today, lastError: null }'].map(part => send.indexOf(part))
  assert.ok(order.every((at, index) => at > 0 && (index === 0 || at > order[index - 1])), JSON.stringify(order))
  assert.match(send, /to: owner\.email/, 'لبريد صاحب التقرير بس')
  // التعديل والحذف بصاحب الصف، وبالحقول المتغيّرة مش حفظ الكيان كله
  assert.match(service, /this\.repo\.update\(\{ id: row\.id, ownerUserId: user\.sub \}, changes\)/)
  assert.match(service, /this\.repo\.delete\(\{ id: row\.id, ownerUserId: user\.sub \}\)/)
  assert.match(service, /findOne\(\{ where: \{ id, ownerUserId: user\.sub \} \}\)/)
  const controller = read('api/src/reports/saved-reports.controller.ts')
  assert.match(controller, /@RequireModule\('reports'\)\s+@UseGuards\(JwtAuthGuard, RolesGuard\)\s+@Perm\('reports\.view'\)\s+@Controller\('reports\/saved'\)/)
  // المسارات الكاتبة بصلاحية الحفظ (مش صلاحية العرض)، ومعاها فحص مركز التقارير
  for (const verb of ['Post()', "Patch(':id')", "Delete(':id')"]) {
    const at = controller.indexOf(`@${verb}`)
    assert.ok(at > 0 && controller.slice(at - 30, at).includes("@Perm('reports.save')"), verb)
    assert.ok(controller.slice(at, at + 260).includes('this.writer(user)'), verb)
  }
  assert.deepEqual(MODULES.reports.permissions, ['reports.view', 'reports.save'])
  const { ROLE_PRESETS } = require('../src/auth/permissions')
  for (const code of ['hr_officer', 'read_only']) assert.equal(ROLE_PRESETS.find(role => role.code === code).permissions.includes('reports.save'), false, code)
  assert.equal(ROLE_PRESETS.find(role => role.code === 'hr_manager').permissions.includes('reports.save'), true)
  // الفلاتر المحفوظة بتتحكم بقواعد التقرير: موديوله، وصلاحية الرواتب، والفلتر الموحد
  const reports = read('api/src/reports/reports.controller.ts')
  const filters = reports.slice(reports.indexOf('async savedFilters('), reports.indexOf('private async companyName'))
  for (const part of ['this.modules.allowedFor(', "if (report === 'payroll') this.requirePayrollView(user)", 'this.orgFilterOf(user,']) assert.ok(filters.includes(part), part)
})

test('SV-03: the reports screen holds the saved reports card with the server\'s labels', () => {
  const page = read('src/app/reports/page.tsx'), card = read('src/components/reports/SavedReports.tsx'), lib = read('src/lib/reports-org-api.ts')
  assert.match(page, /<SavedReports orgParams=\{org\.params\} reports=\{\[\.\.\.reportCards\.map\(\(card\) => \(\{ id: card\.id, title: card\.title \}\)\), \{ id: 'metrics', title: 'المؤشرات' \}\]\} \/>/)
  for (const call of ['createSavedReport(', 'deleteSavedReport(', 'exportSavedReport(', 'fetchSavedReports()', 'updateSavedReport(']) assert.ok(card.includes(call), call)
  assert.match(card, /if \(confirmDelete !== item\.id\) return setConfirmDelete\(item\.id\)/, 'الحذف بتأكيد')
  assert.match(card, /data-saved-reports-mail-off/); assert.match(card, /\{list\.migrationMessage\}/)
  assert.match(card, /\{list\.ready && list\.canSave && \(/, 'نموذج الحفظ للي معاه الصلاحية بس')
  assert.match(card, /\{list\.canSave && <button type="button" onClick=\{\(\) => remove\(item\)\}/)
  assert.match(card, /disabled=\{!SAVED_REPORT_PERIOD_REPORTS\.includes\(chosen\)\}/)
  // نفس نصوص وقوايم الخادم
  for (const [key, label] of Object.entries(rules.SAVED_REPORT_PERIOD_LABELS)) assert.ok(lib.includes(`${key}: '${label}'`), key)
  assert.ok(lib.includes(`SAVED_REPORT_PERIOD_REPORTS: readonly string[] = [${rules.SAVED_REPORT_PERIOD_REPORTS.map(key => `'${key}'`).join(', ')}]`))
  assert.match(lib, /apiFetch<SavedReportItem>\('\/reports\/saved', \{ method: 'POST'/)
  assert.match(lib, /downloadApiFile\(`\/reports\/saved\/\$\{id\}\/export\?format=\$\{format\}`/)
})

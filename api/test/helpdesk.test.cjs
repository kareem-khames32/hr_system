'use strict'
// B3.10: مركز خدمات الموارد البشرية — فحص من غير قاعدة (الدورة الفعلية في helpdesk.integration.cjs):
//  HU-01) القواعد: التقييم وتعليقه، ومهلة أول رد من إعدادها، وفترة التقرير، والمتوسط.
//  HU-02) الربط: موديول جديد مقفول بصلاحيته وأنواع استفساراته، وفئة «استفسارات» في قوايم الفئات والبذرة (سلسلة «تنفيذ فوري» ومهمة على دور
//         بمهلة للأنواع الجديدة بس)، والتقييم تحت قفل صف الطلب لصاحبه، والتقرير بنطاق الفروع، والمسارات.
// Run (من api/): node --test test/helpdesk.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const rules = require('../src/helpdesk/helpdesk-rules')
const { MODULES } = require('../src/modules-registry/registry')
const root = path.resolve(__dirname, '..', '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n')
const refuses = (work, label) => assert.throws(work, error => error?.getStatus?.() === 400, label)

test('HU-01: rating and comment, the first-response limit from its setting, the report range and the average', () => {
  assert.deepEqual([rules.cleanHelpdeskRating(1), rules.cleanHelpdeskRating(5), rules.cleanHelpdeskComment('  رد سريع '), rules.cleanHelpdeskComment('   '), rules.cleanHelpdeskComment(undefined)], [1, 5, 'رد سريع', null, null])
  for (const bad of [0, 6, 4.5, '5', null, undefined]) refuses(() => rules.cleanHelpdeskRating(bad), 'rating ' + String(bad))
  for (const bad of [5, 'ت'.repeat(501)]) refuses(() => rules.cleanHelpdeskComment(bad), 'comment')
  assert.deepEqual(['48', '1', '720', '0', '721', '2.5', 'x', '', null, undefined].map(raw => rules.firstResponseHours(raw)), [48, 1, 720, 24, 24, 24, 24, 24, 24, 24])
  assert.deepEqual([rules.cleanHelpdeskRange(undefined, undefined, '2026-10-08'), rules.cleanHelpdeskRange('', '', '2026-10-08'), rules.cleanHelpdeskRange('2026-01-01', '2026-01-01', '2026-10-08'),
    rules.cleanHelpdeskRange('2025-10-08', '2026-10-09', '2026-10-08')],
  [{ from: '2026-07-11', to: '2026-10-08' }, { from: '2026-07-11', to: '2026-10-08' }, { from: '2026-01-01', to: '2026-01-01' }, { from: '2025-10-08', to: '2026-10-09' }])
  for (const [from, to] of [['2026-10-05', '2026-10-01'], ['x', '2026-10-01'], ['2026-02-31', '2026-03-01'], ['2026-10-01', undefined], ['2024-01-01', '2026-01-01']]) refuses(() => rules.cleanHelpdeskRange(from, to, '2026-10-08'), 'range')
  assert.deepEqual([rules.average([]), rules.average([4]), rules.average([4, 3]), rules.average([1, 2, 2])], [null, 4, 3.5, 1.7])
  assert.deepEqual(Object.keys(rules.HELPDESK_SERVICE_LABELS), ['OPEN', 'IN_PROGRESS', 'WAITING', 'DONE', 'CANCELLED'], 'حالات الخدمة = حالات مهمة التنفيذ')
})

test('HU-02: a new closed module owning the inquiry types, the category and the seed, the rating under the request row lock, the scoped report, and the routes', () => {
  const module = MODULES.helpdesk
  assert.deepEqual([module.defaultEnabled, module.permissions, module.routes, module.requestTypes, module.dependsOn],
    [false, ['helpdesk.manage'], ['/helpdesk'], [...rules.HELPDESK_TYPE_CODES], ['employees', 'tasks']])
  const { PERMISSIONS, PERMISSION_MODULES, ROLE_PRESETS } = require('../src/auth/permissions')
  assert.deepEqual(['helpdesk.manage' in PERMISSIONS, PERMISSION_MODULES.find(unit => unit.key === 'helpdesk').permissions, ROLE_PRESETS.find(role => role.code === 'hr_manager').permissions.includes('helpdesk.manage'),
    ROLE_PRESETS.find(role => role.code === 'employee').permissions.includes('helpdesk.manage')], [true, ['helpdesk.manage'], true, false])
  // الفئة في قوايم الخادم ومرآتها في الواجهة
  const categories = require('../src/requests/request-category-chains')
  assert.deepEqual([categories.isRequestCategory(rules.HELPDESK_CATEGORY), categories.REQUEST_CATEGORY_LABELS.inquiries], [true, 'استفسارات'])
  assert.match(read('src/data/requestsCatalog.ts'), /inquiries: 'استفسارات',/)
  // البذرة: أنواع «خدمة» من غير اعتمادات وبمهمة على دور بمهلة — للسلسلة والنوع الجداد بس
  const { typesSeed } = require('../src/seed/requests-seed.data')
  assert.deepEqual(typesSeed.filter(type => type.category === 'inquiries').map(type => [type.code, type.chain, type.handler, type.service]),
    rules.HELPDESK_TYPE_CODES.map(code => [code, 'CHAIN_AUTO', 'none', { role: 'hr', days: 3 }]))
  assert.equal(typesSeed.filter(type => type.service && type.category !== 'inquiries').length, 0)
  const seed = read('api/src/seed/seed-requests.ts')
  assert.match(seed, /autoApprove: !!t\.service,/)
  assert.match(seed, /createdTypes\+\+\n\s+\/\/ B3\.10[^\n]*\n\s+if \(t\.service && ds\.manager && \(await executionSchemaReady\(ds\.manager\)\)\) \{/)
  const service = read('api/src/helpdesk/helpdesk.service.ts')
  const rate = service.slice(service.indexOf('async rate('), service.indexOf('/**\n   * تقرير الاستفسارات'))
  const order = ['cleanHelpdeskRating(input.rating)', 'this.ds.transaction(', "getRepository(Request).findOne({ where: { id: requestId }, lock: { mode: 'pessimistic_write' } })", 'request.requesterId !== user.employeeId',
    "request.status !== 'COMPLETED'", 'getRepository(RequestServiceRating).count({ where: { requestId: request.id } })', 'getRepository(RequestServiceRating).insert('].map(part => rate.indexOf(part))
  assert.ok(order.every((at, index) => at > 0 && (index === 0 || at > order[index - 1])), JSON.stringify(order))
  const report = service.slice(service.indexOf('async report('))
  assert.match(report, /if \(!userHasPerm\(user, HELPDESK_PERMISSION\)\) throw new ForbiddenException/)
  assert.match(report, /row\.status !== 'DRAFT' && inBranchScope\(scope, row\.branchId\)/, 'بنطاق فرع الطلب')
  assert.match(report, /internal: false/, 'أول رد = أول تعليق ظاهر للموظف')
  assert.doesNotMatch(service, /\.save\(/, 'الكتابة بالخانات بس')
  const controller = read('api/src/helpdesk/helpdesk.controller.ts')
  assert.match(controller, /@RequireModule\('helpdesk'\)\n@UseGuards\(JwtAuthGuard, RolesGuard\)\n@Controller\('helpdesk'\)/)
  assert.match(controller, /@Perm\('helpdesk\.manage'\)\n\s+@Get\('report'\)/)
  assert.ok(controller.indexOf("@Get('report')") < controller.indexOf("@Post(':id/rate')"))
  assert.doesNotMatch(read('api/src/helpdesk/helpdesk.entities.ts'), /default:|CreateDateColumn/, 'من غير افتراضي (زي الترحيل)')
  assert.ok(read('src/app/helpdesk/page.tsx').includes('fetchMyInquiries()'))
})

test('HU-03: knowledge base — article values, search matching, the reader limited to published articles in the viewer audience, and management within the branch scope under the row lock', () => {
  const kb = require('../src/helpdesk/knowledge.service')
  assert.deepEqual([kb.cleanArticleTitle('  ليه   الراتب؟ '), kb.cleanArticleBody(' نص\r\nسطر '), kb.cleanArticleKeywords('  خصم   غياب '), kb.cleanArticleKeywords('   '), kb.cleanArticleKeywords(undefined)],
    ['ليه الراتب؟', 'نص\nسطر', 'خصم غياب', null, null])
  for (const bad of ['ا', '', null, 'ع'.repeat(201)]) refuses(() => kb.cleanArticleTitle(bad), 'title')
  for (const bad of ['', '   ', null, 'ن'.repeat(20001)]) refuses(() => kb.cleanArticleBody(bad), 'body')
  for (const bad of [5, 'ك'.repeat(501)]) refuses(() => kb.cleanArticleKeywords(bad), 'keywords')
  const article = { title: 'ليه الراتب اتخصم؟', body: 'الخصم من الغياب أو التأخير', keywords: 'Payslip قسيمة' }
  assert.deepEqual(['', '  ', 'الراتب', 'التأخير', 'payslip', 'قسيمة', 'إجازة'].map(term => kb.articleMatches(article, term)), [true, true, true, true, true, true, false])
  const service = read('api/src/helpdesk/knowledge.service.ts')
  const readable = service.slice(service.indexOf('private async readable('), service.indexOf('private async typeNames('))
  assert.match(readable, /find\(\{ where: \{ isPublished: true \}/, 'المنشور بس')
  assert.match(readable, /rows\.filter\(\(row\) => this\.inAudience\(row, employee, user\.role, positions\)\)/, 'وفي جمهور موظف الحساب')
  assert.match(service, /announcementAudienceIntact\(row\.audience\) && requestAudienceAllows\(row\.audience, subject, 'submit'\)/, 'نفس مقيّم جمهور الإعلانات')
  const update = service.slice(service.indexOf('async update('), service.indexOf('private async managed('))
  const order = ['this.assertManager(user)', 'this.ds.transaction(', "lock: { mode: 'pessimistic_write' }", '!announcementAudienceInScope(row.audience, branchScopeOf(user))', 'await this.fields(em, user, input, row)'].map(part => update.indexOf(part))
  assert.ok(order.every((at, index) => at > 0 && (index === 0 || at > order[index - 1])), JSON.stringify(order))
  assert.match(service, /if \(!announcementAudienceInScope\(audience, branchScopeOf\(user\)\)\) throw new ForbiddenException\(KB_BRANCH_AUDIENCE\)/)
  assert.doesNotMatch(service, /default:|CreateDateColumn|\.save\(/, 'من غير افتراضي، والكتابة بالخانات')
  const controller = read('api/src/helpdesk/helpdesk.controller.ts')
  assert.equal(controller.split("@Perm('helpdesk.manage')").length - 1, 4, 'التقرير وإدارة المقالات بالصلاحية')
  assert.ok(controller.indexOf("@Get('articles/manage')") < controller.indexOf("@Get('articles/:id')"), 'المسار الثابت قبل ‎:id')
  assert.ok(read('src/app/helpdesk/KnowledgePanel.tsx').includes('searchArticles(term.trim(), typeCode)') && read('src/app/helpdesk/ArticlesManager.tsx').includes('fetchManagedArticles()'))
})

test('Codex P3L-B06: the policy reference of an article is read with the manager of the transaction that holds the article row', () => {
  const fs = require('node:fs'), path = require('node:path')
  const source = file => fs.readFileSync(path.resolve(__dirname, '..', 'src', file), 'utf8')
  const knowledge = source('helpdesk/knowledge.service.ts'), policies = source('policies/policies.service.ts')
  assert.equal((knowledge.match(/this\.policies\.referenceFor\(/g) ?? []).length, 3)
  const fields = knowledge.slice(knowledge.indexOf('  private async fields(em: EntityManager'), knowledge.indexOf('  async create('))
  assert.match(fields, /await this\.policies\.referenceFor\(user, input\.policyId, em\)/)
  const update = knowledge.slice(knowledge.indexOf('  async update('), knowledge.indexOf('  private async managed('))
  assert.match(update, /this\.ds\.transaction\(async \(em\) => \{[\s\S]*await this\.fields\(em, user, input, row\)/)
  const reference = policies.slice(policies.indexOf('  async referenceFor('), policies.indexOf("  /** «سياساتي»"))
  assert.match(reference, /async referenceFor\(user: JwtPayload, policyId: number, em: EntityManager = this\.ds\.manager\)/)
  assert.doesNotMatch(reference.slice(reference.indexOf('{')), /this\.ds\./, 'كل القراءات بمدير الاتصال المبعوت')
})

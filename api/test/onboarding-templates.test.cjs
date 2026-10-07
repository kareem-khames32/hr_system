'use strict'
// B3.1 (أ): قوالب التهيئة بالنطاق — فحص من غير قاعدة (الدورة الفعلية في onboarding-templates.integration.cjs):
//  OU-01) اختيار القالب: كل خانة مكتوبة لازم تطابق ملف الموظف، الأدق أولًا وعند التساوي الأقدم، والمسمى من غير فرق مسافات ولا حروف
//         كبيرة، وقالب من غير نطاق مابيطابقش حد.
//  OU-02) الربط: عمود الربط برّه قراءة وكتابة الكيان وبيتقري بعد فحص وجوده، والنسخ بيرجع للقالب العام، وإدارة القوالب بصلاحية الإعدادات
//         وبنطاق فروع المنفّذ، والكتابة بالحقول.
//  OU-03) الواجهة: اختيار القالب وقالب جديد في نافذة القالب القايمة، ومن غير القوالب قبل الترحيل.
// Run (من api/): node --test test/onboarding-templates.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const rules = require('../src/onboarding/onboarding-templates')
const root = path.resolve(__dirname, '..', '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n')

test('OU-01: a template matches when every written scope field equals the employee file; most specific first, then the oldest', () => {
  const scope = (id, fields = {}) => ({ id, branchId: null, jobTitle: null, gradeId: null, contractType: null, ...fields })
  const employee = { branchId: 3, jobTitle: 'مندوب مبيعات', gradeId: 7, contractType: 'permanent' }
  assert.equal(rules.templateSpecificity(scope(1)), 0)
  assert.equal(rules.templateSpecificity(scope(1, { branchId: 3, jobTitle: 'مندوب', gradeId: 7, contractType: 'permanent' })), 4)
  assert.equal(rules.templateSpecificity(scope(1, { jobTitle: '   ' })), 0, 'مسمى مسافات بس = مش مكتوب')
  // قالب من غير نطاق مابيطابقش حد (ده القالب العام، ومش صف في الجدول)
  assert.equal(rules.templateMatches(scope(1), employee), false)
  assert.equal(rules.templateMatches(scope(1, { branchId: 3 }), employee), true)
  assert.equal(rules.templateMatches(scope(1, { branchId: 4 }), employee), false)
  assert.equal(rules.templateMatches(scope(1, { branchId: 3, gradeId: 8 }), employee), false, 'خانة واحدة مختلفة تكفي')
  assert.equal(rules.templateMatches(scope(1, { contractType: 'seasonal' }), employee), false)
  assert.equal(rules.templateMatches(scope(1, { contractType: 'permanent', gradeId: 7 }), employee), true)
  // المسمى نص حر في ملف الموظف: من غير فرق مسافات ولا حروف كبيرة، ومش جزء من نص
  assert.equal(rules.templateMatches(scope(1, { jobTitle: ' مندوب   مبيعات ' }), employee), true)
  assert.equal(rules.templateMatches(scope(1, { jobTitle: 'Sales REP' }), { ...employee, jobTitle: 'sales  rep' }), true)
  assert.equal(rules.templateMatches(scope(1, { jobTitle: 'مندوب' }), employee), false)
  // ملف ناقص (من غير درجة أو مسمى) مابيطابقش قالب بيطلبهم
  assert.equal(rules.templateMatches(scope(1, { gradeId: 7 }), { branchId: 3 }), false)
  assert.equal(rules.templateMatches(scope(1, { jobTitle: 'مندوب مبيعات' }), { branchId: 3, jobTitle: null }), false)

  const all = [scope(5, { branchId: 3 }), scope(2, { jobTitle: 'مندوب مبيعات' }), scope(9, { branchId: 3, jobTitle: 'مندوب مبيعات' }), scope(4, { branchId: 8 }),
    scope(6, { branchId: 3, jobTitle: 'مندوب مبيعات', contractType: 'permanent' }), scope(1, { gradeId: 99 })]
  assert.deepEqual(rules.matchingOnboardingTemplates(all, employee).map(row => row.id), [6, 9, 2, 5])
  assert.deepEqual(rules.matchingOnboardingTemplates(all, { branchId: 8 }).map(row => row.id), [4])
  assert.deepEqual(rules.matchingOnboardingTemplates(all, { branchId: 1, jobTitle: 'محاسب' }), [])
  assert.deepEqual(all.map(row => row.id), [5, 2, 9, 4, 6, 1], 'القايمة الأصلية مابتتغيّرش')
  assert.deepEqual([...rules.ONBOARDING_CONTRACT_TYPES], ['permanent', 'fixed_term', 'part_time', 'seasonal'])
})

test('OU-02: the link column stays outside entity reads and writes, the copy falls back to the general template, and management is scoped', () => {
  const entities = read('api/src/onboarding/onboarding.entities.ts')
  assert.match(entities, /@Column\(\{ type: 'int', nullable: true, select: false, insert: false, update: false \}\)\n  templateId\?: number \| null/)
  const table = read('api/src/onboarding/onboarding-template.entity.ts')
  assert.match(table, /@Entity\('onboarding_templates'\)/)
  assert.doesNotMatch(table, /default:|CreateDateColumn/, 'من غير افتراضي (زي الترحيل)')
  assert.match(read('api/src/onboarding/onboarding.module.ts'), /OnboardingTemplate,\n/)
  const ready = read('api/src/onboarding/onboarding-templates.ts')
  assert.match(ready, /OBJECT_ID\(N'dbo\.onboarding_templates', N'U'\) IS NOT NULL\s+AND COL_LENGTH\(N'dbo\.onboarding_template_items', N'templateId'\) IS NOT NULL/)
  assert.match(ready, /if \(ready === true\) return true/, 'الناقص مابيتحفظش: بيتفحص لحد ما الترحيل يتطبق')

  const service = read('api/src/onboarding/onboarding.service.ts')
  // النسخ: القالب العام = بنود من غير قالب (بعد الترحيل)، وقالب الموظف أول قالب مطابق فيه بنود مفعّلة
  const copy = service.slice(service.indexOf('private async materialize('), service.indexOf('private async ensureHiringDocsTasks('))
  assert.match(copy, /const ready = await onboardingTemplatesReady\(this\.tasks\.manager\)/)
  assert.match(copy, /if \(ready\) query\.andWhere\(templateId !== null \? 'i\.templateId = :templateId' : 'i\.templateId IS NULL'/)
  assert.match(copy, /const scoped = ready \? await this\.templates\.find\(\{ where: \{ isActive: true \} \}\) : \[\]/)
  assert.match(copy, /let items = general\n\s+for \(const template of matchingOnboardingTemplates\(scoped, emp\)\) \{[\s\S]*?if \(own\.length\) \{\n\s+items = own\n\s+break/)
  assert.match(copy, /if \(items\.length === 0\) continue/)
  // القالب في نطاق الحساب وإلا غير موجود؛ وقبل الترحيل برسالته
  const scopedTemplate = service.slice(service.indexOf('private async scopedTemplate('), service.indexOf('private async templateIdOfItem('))
  assert.match(scopedTemplate, /throw new BadRequestException\(ONBOARDING_TEMPLATES_MIGRATION_MISSING\)/)
  assert.match(scopedTemplate, /if \(!row \|\| !inBranchScope\(user, row\.branchId\)\) throw new NotFoundException\(missing\)/)
  const scope = service.slice(service.indexOf('private async cleanTemplateScope('), service.indexOf('private async templateViews('))
  assert.match(scope, /if \(templateSpecificity\(scope\) === 0\) throw new BadRequestException\(ONBOARDING_TEMPLATE_SCOPE_REQUIRED\)/)
  assert.match(scope, /if \(scope\.branchId === null && branchScopeOf\(user\) !== null\) \{\n\s+throw new ForbiddenException/)
  assert.match(scope, /!inBranchScope\(user, scope\.branchId\)/)
  // قايمة القوالب بنطاق القارئ، والتعديل بالحقول وبرقم الصف، وعمود الربط بيتكتب في معاملة البند
  assert.match(service, /\.filter\(\(row\) => inBranchScope\(user, row\.branchId\)\)/)
  assert.match(service, /if \(Object\.keys\(patch\)\.length\) await this\.templates\.update\(\{ id \}, patch\)/)
  assert.match(service, /if \(templateId !== null\) await em\.query\('UPDATE \[onboarding_template_items\] SET \[templateId\] = @0 WHERE \[id\] = @1', \[templateId, saved\.id\]\)/)
  assert.match(service, /if \(templateId !== null\) await this\.scopedTemplate\(user, templateId, 'بند القالب غير موجود'\)/)

  const controller = read('api/src/onboarding/onboarding.controller.ts')
  for (const route of ["@Get('templates')", "@Post('templates')", "@Patch('templates/:id')"]) {
    assert.ok(controller.includes(`@Perm('settings.manage')\n  ${route}`), route)
  }
  assert.ok(controller.indexOf("@Get('templates')") < controller.indexOf("@Post(':employeeId/tasks')"), 'قبل :employeeId')
})

test('OU-03: the template window offers the scoped templates only after the migration, with the same item table', () => {
  const page = read('src/app/employees/onboarding/page.tsx')
  assert.match(page, /\{templatesReady && \(/)
  assert.match(page, /<option value="">القالب العام \(لكل الموظفين\)<\/option>/)
  assert.match(page, /fetchOnboardingTemplate\(selected \?\? undefined\)/)
  assert.match(page, /\.\.\.\(selected !== null \? \{ templateId: selected \} : \{\}\)/)
  assert.match(page, /newTpl\.branchId !== '' \|\| newTpl\.jobTitle !== '' \|\| newTpl\.gradeId !== '' \|\| newTpl\.contractType !== ''/, 'نطاق واحد على الأقل')
  const api = read('src/lib/api.ts')
  assert.match(api, /get<\{ ready: boolean; templates: ApiOnboardingScopedTemplate\[\] \}>\('\/onboarding\/templates'\)/)
  assert.match(api, /`\/onboarding\/template\$\{templateId \? `\?templateId=\$\{templateId\}` : ''\}`/)
})

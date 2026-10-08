// B5.4 (أ) — المهارات: قواعد المكتبة ومتطلبات الوظيفة والتقييم، حكم الفجوة، ومصدر الكود والواجهة. حساب نقي بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const rules = require('../src/skills/skills')
const registry = require('../src/modules-registry/registry')
const read = rel => fs.readFileSync(path.join(apiRoot, 'src', rel), 'utf8').replace(/\r\n/g, '\n')
const web = rel => fs.readFileSync(path.join(apiRoot, '..', 'src', rel), 'utf8').replace(/\r\n/g, '\n')

test('SKU-01: المستويات هي الأربعة القايمة في ملف الموظف، وترتيبها، وقواعد المهارة في المكتبة', () => {
  assert.deepEqual([...rules.SKILL_LEVELS], ['beginner', 'intermediate', 'advanced', 'expert'])
  assert.match(read('employees/qualifications.controller.ts'), /@IsIn\(\['beginner', 'intermediate', 'advanced', 'expert'\]/, 'نفس مقياس ملف الموظف')
  assert.deepEqual(['beginner', 'intermediate', 'advanced', 'expert', 'master', null, undefined, 3].map(rules.levelRank), [1, 2, 3, 4, 0, 0, 0, 0])
  assert.deepEqual(rules.skillFields({ name: '  لحام   كهربائي ', category: ' فني ', description: '' }).fields, { name: 'لحام كهربائي', category: 'فني', description: null, isActive: true })
  assert.deepEqual([{ name: 'ل' }, { name: 'x'.repeat(121) }, { name: 'لحام', category: 5 }, { name: 'لحام', description: 'x'.repeat(301) }, { name: 'لحام', isActive: 0 }, null].map(body => rules.skillFields(body).fields),
    [null, null, null, null, null, null])
})

test('SKU-02: متطلبات الوظيفة والتقييم — قايمة من غير تكرار مهارة، ومستوى من المقياس، وصلاحية للشهادة بس، وتاريخ برّه المدى رسالة مش استثناء', () => {
  assert.deepEqual(rules.requirementsOf({ requirements: [{ skillId: 3, level: 'advanced' }, { skillId: 5, level: 'beginner' }] }).requirements, [{ skillId: 3, level: 'advanced' }, { skillId: 5, level: 'beginner' }])
  assert.deepEqual(rules.requirementsOf({ requirements: [] }).requirements, [])
  assert.deepEqual([{}, { requirements: 'all' }, { requirements: [{ skillId: '3', level: 'advanced' }] }, { requirements: [{ skillId: 3, level: 'master' }] }, { requirements: [{ skillId: 3, level: 'advanced' }, { skillId: 3, level: 'expert' }] },
    { requirements: [null] }, { requirements: Array.from({ length: 41 }, (_, index) => ({ skillId: index + 1, level: 'beginner' })) }].map(body => rules.requirementsOf(body).requirements), [null, null, null, null, null, null, null])
  assert.deepEqual(rules.assessmentFields({ level: 'expert' }).fields, { level: 'expert', source: 'ASSESSMENT', validUntil: null })
  assert.deepEqual(rules.assessmentFields({ level: 'advanced', source: 'CERTIFICATE', validUntil: '2027-01-31' }).fields, { level: 'advanced', source: 'CERTIFICATE', validUntil: '2027-01-31' })
  assert.deepEqual([{ level: 'master' }, { level: 'expert', source: 'RUMOR' }, { level: 'expert', validUntil: '2027-01-31' }, { level: 'expert', source: 'CERTIFICATE', validUntil: '2026-13-01' },
    { level: 'expert', source: 'CERTIFICATE', validUntil: '2026-02-30' }, { level: 'expert', source: 'CERTIFICATE', validUntil: 20270131 }].map(body => rules.assessmentFields(body).error),
    ['اختار المستوى: مبتدئ، متوسط، متقدم، أو خبير', 'المصدر «تقييم» أو «شهادة»', 'تاريخ الصلاحية للشهادة بس', 'تاريخ صلاحية الشهادة مش صحيح', 'تاريخ صلاحية الشهادة مش صحيح', 'تاريخ صلاحية الشهادة مش صحيح'])
})

test('SKU-03: حكم الفجوة — مستوفاة، أقل، مش متقيّمة، وشهادة منتهية (حتى لو مستواها كفاية)', () => {
  const today = '2026-10-08'
  const gap = (required, held) => rules.gapOf(required, held, today)
  assert.deepEqual([gap('advanced', { level: 'advanced' }), gap('advanced', { level: 'expert' }), gap('advanced', { level: 'intermediate' }), gap('beginner', null), gap('beginner', { level: null }), gap('beginner', { level: 'master' })],
    ['MET', 'MET', 'BELOW', 'MISSING', 'MISSING', 'MISSING'])
  assert.deepEqual([gap('advanced', { level: 'expert', validUntil: '2026-10-07' }), gap('advanced', { level: 'expert', validUntil: '2026-10-08' }), gap('advanced', { level: 'expert', validUntil: null }),
    gap('advanced', { level: 'intermediate', validUntil: '2026-10-07' }), gap('advanced', { level: 'intermediate', validUntil: '2027-01-01' })], ['EXPIRED', 'MET', 'MET', 'EXPIRED', 'BELOW'])
  assert.deepEqual(Object.keys(rules.GAP_LABELS).sort(), ['BELOW', 'EXPIRED', 'MET', 'MISSING'])
})

test('SKU-04: مصدر الكود — الموديول مقفول افتراضيًا وبيعتمد على الوظائف المعتمدة؛ المكتبة لحساب بكل الفروع؛ الأقفال والنطاق؛ وأعمدة الربط برّه كيان ملف الموظف', () => {
  const module = registry.MODULES.skills
  assert.deepEqual([module.defaultEnabled, module.preset, module.group, module.dependsOn, module.permissions, module.routes, module.core], [false, 'full', 'talent', ['employees', 'positions'], ['skills.manage'], ['/skills', '/my/skills'], false])
  const controller = read('skills/skills.controller.ts')
  assert.match(controller, /@RequireModule\('skills'\)\n@UseGuards\(JwtAuthGuard, RolesGuard\)/)
  assert.deepEqual([(controller.match(/@Perm\('skills\.manage'\)/g) ?? []).length, (controller.match(/@(Get|Post|Put|Patch|Delete)\(/g) ?? []).length, /@Delete\(/.test(controller)], [6, 9, false])
  const service = read('skills/skills.service.ts')
  assert.equal((service.match(/assertCompanyWideWrite\(user\)/g) ?? []).length, 2, 'إضافة مهارة وتعديلها لحساب بكل الفروع')
  assert.match(service, /FROM dbo\.positions WITH \(UPDLOCK, ROWLOCK\) WHERE \[id\] = @0/)
  assert.match(service, /position\.status === 'CANCELLED' \|\| !inBranchScope\(branchScopeOf\(user\), Number\(position\.branchId\)\)\) throw new NotFoundException\(POSITION_NOT_FOUND\)/)
  // التقييم: قفل صف الموظف الأول، والحكم بعده، ومحدش بيقيّم نفسه، وصف واحد تحت قفل مدى
  const assess = service.slice(service.indexOf('async assess('))
  assert.ok(assess.indexOf('FROM dbo.employees WITH (UPDLOCK, ROWLOCK)') < assess.indexOf(`userHasPerm(user, 'skills.manage')`))
  assert.match(assess, /if \(!person \|\| \(!byRight && !byManager\)\) throw new NotFoundException\(EMPLOYEE_NOT_FOUND\)/)
  assert.match(assess, /if \(me !== null && me === Number\(person\.id\)\) throw new ForbiddenException\(SELF_ASSESSMENT\)/)
  assert.match(assess, /FROM dbo\.employee_skills WITH \(UPDLOCK, HOLDLOCK\) WHERE \[employeeId\] = @0 AND \[skillId\] = @1/)
  assert.match(service, /LEFT JOIN dbo\.departments d ON d\.\[id\] = p\.\[departmentId\] AND d\.\[branchId\] = p\.\[branchId\]/, 'قسم اتنقل من فرع الوظيفة مايتسمّاش')
  assert.doesNotMatch(service, /getRepository\(Skill\)\.delete|employee_obligations|EmployeeObligation/, 'مفيش مسح مهارة من المكتبة ولا مبلغ')
  // أعمدة ترحيل 157 برّه قراءة وكتابة ملف الموظف
  const entity = read('employees/qualifications.entities.ts')
  for (const column of ['skillId', 'source', 'assessedByUserId', 'assessedAt', 'validUntil']) assert.match(entity, new RegExp(`nullable: true, select: false, insert: false, update: false \\}\\)\\n  ${column}\\?:`), column)
  assert.ok(JSON.stringify(require('../src/auth/permissions')).includes('skills.manage'))
})

test('SKU-05: الواجهة — «المهارات والإحلال» للمكتبة والمتطلبات والمصفوفة، و«مهاراتي» لفجوة الموظف وفريق المدير، والتقييم من المصفوفة', () => {
  const admin = web('app/skills/page.tsx'), mine = web('app/my/skills/page.tsx'), matrix = web('components/skills/SkillMatrix.tsx'), api = web('lib/skills-api.ts')
  assert.match(admin, />\s*المهارات والإحلال\s*<\/h1>/); assert.match(mine, />\s*مهاراتي\s*<\/h1>/)
  assert.match(admin, /\{catalog\.canEdit && \(\n\s+<div className="flex flex-wrap items-end gap-3 bg-gray-50 rounded-xl p-3" data-skill-form>/)
  assert.match(admin, /<SkillMatrix rows=\{rows\} levels=\{catalog\.levels\} canAssess onChanged=\{load\} \/>/)
  assert.match(mine, /<SkillMatrix rows=\{\[mine\.row\]\} levels=\{LEVELS\} canAssess=\{false\} onChanged=\{load\} \/>/)
  assert.match(mine, /\{team\.length > 0 && \(/)
  assert.match(matrix, /\{canAssess && <button type="button" className="underline mt-1"/)
  assert.match(matrix, /validUntil: draft\.source === 'CERTIFICATE' && draft\.validUntil \? draft\.validUntil : null/)
  for (const route of ['/skills/catalog', '/skills/positions', '/skills/matrix', '/skills/my-team', '/skills/my', '/skills/employees/']) assert.ok(api.includes(route), route)
  const sidebar = web('components/layout/Sidebar.tsx'), titles = web('components/layout/pageTitles.ts')
  assert.match(sidebar, /id: 'skills',\n    label: 'المهارات والإحلال',\n    icon: <GraduationCap size=\{20\} \/>,\n    href: '\/skills',\n    perm: 'skills\.manage',/)
  assert.match(sidebar, /\{ id: 'my-skills', label: 'مهاراتي', icon: <GraduationCap size=\{20\} \/>, href: '\/my\/skills' \}/)
  assert.match(titles, /\['\/skills', 'المهارات والإحلال'\]/); assert.match(titles, /\['\/my\/skills', 'مهاراتي'\]/)
})

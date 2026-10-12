// B5.8 — ساعات المشاريع: قواعد المشروع وسطر الساعات والقرار وفترة التقرير، أجر الساعة والتكلفة، ومصدر الكود (قفل صف الموظف ثم الأسبوع، الحكم بعد القفل، التكلفة ورا ميزتها) والواجهة.
// حساب نقي بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const rules = require('../src/timesheets/timesheets')
const registry = require('../src/modules-registry/registry')
const read = rel => fs.readFileSync(path.join(apiRoot, 'src', rel), 'utf8').replace(/\r\n/g, '\n')
const web = rel => fs.readFileSync(path.join(apiRoot, '..', 'src', rel), 'utf8').replace(/\r\n/g, '\n')
const TODAY = '2026-10-10'

test('TSU-01: المشروع — عميل واسم وفرع اختياري ومهام من غير تكرار', () => {
  const good = { clientName: ' شركة   النور ', name: ' بوابة ', branchId: 3, tasks: [{ name: ' تحليل ' }, { id: 7, name: 'تطوير', isActive: false }] }
  assert.deepEqual(rules.projectFields(good).fields, { clientName: 'شركة النور', name: 'بوابة', branchId: 3, isActive: true, tasks: [{ id: null, name: 'تحليل', isActive: true }, { id: 7, name: 'تطوير', isActive: false }] })
  assert.deepEqual([rules.projectFields({ clientName: 'عميل', name: 'مشروع' }).fields.branchId, rules.projectFields({ clientName: 'عميل', name: 'مشروع', branchId: '' }).fields.tasks], [null, []])
  const issue = body => rules.projectFields(body).error
  assert.deepEqual([issue(null), issue({ ...good, name: 'x'.repeat(151) }), issue({ ...good, branchId: 0 }), issue({ ...good, isActive: 'yes' }), issue({ ...good, tasks: Array.from({ length: 51 }, (_, index) => ({ name: `مهمة ${index}` })) }),
    issue({ ...good, tasks: [{ id: 'x', name: 'مهمة' }] }), issue({ ...good, tasks: [{ id: 7, name: 'أولى' }, { id: 7, name: 'تانية' }] }), issue({ ...good, tasks: [{ name: 'مهمة', isActive: 1 }] }), issue({ ...good, tasks: [null] })],
  ['اسم العميل من حرفين لحد 120 حرف', 'اسم المشروع من حرفين لحد 150 حرف', 'الفرع مش صحيح', 'حالة المشروع مش صحيحة', 'مهام المشروع قايمة لحد 50 مهمة', 'مهمة من المهام مش صحيحة', 'مهمة مكررة في المشروع', 'حالة المهمة مش صحيحة',
    'اسم المهمة من حرفين لحد 120 حرف'])
})

test('TSU-02: سطر الساعات والقرار وفترة التقرير وأيام الأسبوع', () => {
  const good = { workDate: TODAY, projectId: 4, minutes: 90 }
  assert.deepEqual(rules.entryFields(good, TODAY).fields, { workDate: TODAY, projectId: 4, taskId: null, minutes: 90, note: null })
  assert.deepEqual(rules.entryFields({ ...good, taskId: 2, minutes: 0, note: '  ملاحظة ' }, TODAY).fields, { workDate: TODAY, projectId: 4, taskId: 2, minutes: 0, note: 'ملاحظة' })
  const issue = body => rules.entryFields(body, TODAY).error
  assert.deepEqual([issue({ ...good, workDate: '2026-02-30' }), issue({ ...good, workDate: '2026-10-11' }), issue({ ...good, workDate: '2026-08-08' }), issue({ ...good, workDate: '2026-08-09' }), issue({ ...good, projectId: 0 }), issue({ ...good, taskId: -1 }),
    issue({ ...good, minutes: -1 }), issue({ ...good, minutes: 1440 }), issue({ ...good, minutes: 1441 })],
  ['اليوم مش صحيح', 'ماينفعش تسجّل ساعات يوم لسه ماجاش', 'التسجيل لآخر 62 يوم بس', null, 'اختار المشروع', 'المهمة مش صحيحة', 'الوقت بالدقايق: رقم صحيح من صفر لحد 1440', null, 'الوقت بالدقايق: رقم صحيح من صفر لحد 1440'])
  assert.deepEqual([rules.decisionFields({ action: 'APPROVE' }).fields, rules.decisionFields({ action: 'REJECT', note: ' مش  منطقي ' }).fields, rules.decisionFields({ action: 'REJECT' }).error, rules.decisionFields({ action: 'approve' }).error,
    rules.decisionFields({ action: 'APPROVE', note: 'x'.repeat(301) }).error],
  [{ approve: true, note: null }, { approve: false, note: 'مش منطقي' }, 'اكتب سبب الرفض', 'القرار: اعتماد أو رفض', 'الملاحظة 300 حرف بالكتير'])
  assert.deepEqual([rules.reportRange({ from: '2026-01-01', to: '2026-12-31' }), rules.reportRange({ from: '2026-01-01', to: '2027-01-03' }), rules.reportRange({ from: '2026-02-01', to: '2026-01-01' }), rules.reportRange({ from: '2026-13-01', to: '2026-12-31' }), rules.reportRange(null)],
    [{ from: '2026-01-01', to: '2026-12-31' }, null, null, null, null])
  // 2026-10-04 أحد
  assert.deepEqual([rules.weekDays('2026-10-04'), rules.weekOrCurrent('2026-10-04', TODAY), rules.weekOrCurrent('2026-10-06', TODAY), rules.weekOrCurrent(undefined, TODAY), rules.addDays('2026-02-27', 2)],
    [['2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10'], '2026-10-04', '2026-10-04', '2026-10-04', '2026-03-01'])
  assert.deepEqual([rules.weekEditable(null), rules.weekEditable(undefined), rules.weekEditable('REJECTED'), rules.weekEditable('SUBMITTED'), rules.weekEditable('APPROVED')], [true, true, true, false, false])
})

test('TSU-03: أجر الساعة والتكلفة — إجمالي مكونات الشهر ÷ أيام الشهر ÷ ساعات اليوم، والتكلفة بالقروش، ومقسوم مش صالح = من غير تسعير', () => {
  assert.equal(rules.hourlyWage([6000, 0, 0, 0, 0, 0], 30, 8), 25)
  assert.equal(rules.hourlyWage([5000, 1000, 500, 0, 0, 700], 30, 8), 30)
  assert.deepEqual([rules.hourlyWage([6000], 0, 8), rules.hourlyWage([6000], 30, NaN), rules.hourlyWage([-1], 30, 8), rules.hourlyWage([Infinity], 30, 8)], [null, null, null, null])
  assert.deepEqual([rules.costCents(60, 25), rules.costCents(660, 25), rules.costCents(1, 25), rules.costCents(0, 25), rules.costCents(100, 33.333333)], [2500, 27500, 42, 0, 5556])
})

test('TSU-04: سجل الموديولات — موديول timesheets مقفول افتراضيًا في الباقة الكاملة، وميزة التكلفة مقفولة', () => {
  const def = registry.MODULES.timesheets
  assert.deepEqual([def.defaultEnabled, def.preset, def.group, def.dependsOn, def.softUses, def.permissions, def.routes], [false, 'full', 'time', ['employees'], ['attendance'], ['timesheets.manage'], ['/timesheets', '/my/timesheets']])
  assert.deepEqual([registry.MODULE_FEATURES[rules.TIMESHEETS_COST_FEATURE].module, registry.MODULE_FEATURES[rules.TIMESHEETS_COST_FEATURE].default], ['timesheets', false])
  assert.deepEqual([registry.routeOwner('/timesheets').module, registry.routeOwner('/my/timesheets').module], ['timesheets', 'timesheets'])
})

test('TSU-05: مصدر الكود — كتابات ساعات الموظف تحت قفل صف ملفه ثم صف الأسبوع، قرار المدير بيتحكم بعد القفل، والتكلفة ورا ميزتها وصلاحية الرواتب ومن مصدر تسعير الإضافي', () => {
  const service = read('timesheets/timesheets.service.ts'), controller = read('timesheets/timesheets.controller.ts')
  for (const method of ['saveEntry', 'submit', 'recall']) {
    const body = service.slice(service.indexOf(`async ${method}(`))
    assert.match(body.slice(0, body.indexOf('\n  }\n')), /await this\.assertReady\(em\)\n\s+(const person = )?await this\.lockMe\(em, me\)\n\s+(const week = )?await this\.(editableWeek|weekRow)\(em, me, weekStart\)/, method)
  }
  assert.match(service, /FROM dbo\.employees WITH \(UPDLOCK, ROWLOCK\) WHERE \[id\] = @0', \[employeeId\]\)/)
  // القرار: الموظف ثم الأسبوع، والحكم بعدهم
  const decide = service.slice(service.indexOf('async decide('), service.indexOf('// ===== التقرير ====='))
  assert.ok(decide.indexOf('await this.lockPerson(em, peek.employeeId)') < decide.indexOf("lock: { mode: 'pessimistic_write' }"))
  assert.ok(decide.indexOf("lock: { mode: 'pessimistic_write' }") < decide.indexOf('const byManager ='))
  assert.match(decide, /if \(!week \|\| !person \|\| \(!byManager && !byRight\)\) throw new NotFoundException\(WEEK_NOT_FOUND\)/)
  assert.match(decide, /inBranchScope\(branchScopeOf\(user\), idOf\(person\.branchId\)\)/)
  // التكلفة: الميزة والصلاحية قبل المعاملة، ومن نفس مصدر راتب شهر الإضافي — ومفيش كتابة
  assert.match(service, /const costShown = userHasPerm\(user, 'payroll\.view'\) && await this\.modules\.isFeatureEnabled\(TIMESHEETS_COST_FEATURE\)\n\s+return this\.ds\.transaction\(/)
  assert.match(service, /overtimeWageMonthSalary\(em, employee, workDate, config\)/)
  const report = service.slice(service.indexOf('async report('))
  assert.doesNotMatch(report, /\.save\(|\.update\(|\.delete\(|INSERT |UPDATE |recordAudit/)
  // التقرير بالأسابيع المعتمدة بس
  assert.match(report, /w\.\[status\] = N'APPROVED'/)
  // المتحكم
  assert.match(controller, /@RequireModule\('timesheets'\)\n@UseGuards\(JwtAuthGuard, RolesGuard\)\n@Controller\('timesheets'\)/)
  assert.equal((controller.match(/@Perm\('timesheets\.manage'\)/g) || []).length, 4)
  assert.equal((controller.match(/@(Get|Post|Patch|Put)\(/g) || []).length, 10)
})

test('TSU-06: الواجهة — الشاشتين بعنوانهم في القايمة، والساعات بتتبعت دقايق، والتكلفة من رد الخادم', () => {
  const mine = web('app/my/timesheets/page.tsx'), admin = web('app/timesheets/page.tsx'), sidebar = web('components/layout/Sidebar.tsx'), titles = web('components/layout/pageTitles.ts')
  assert.match(sidebar, /\{ label: 'ساعات المشاريع', href: '\/timesheets', perm: 'timesheets\.manage' \},/)
  assert.match(sidebar, /\{ label: 'ساعاتي', href: '\/my\/timesheets' \},/)
  assert.match(titles, /\['\/timesheets', 'ساعات المشاريع'\]/); assert.match(titles, /\['\/my\/timesheets', 'ساعاتي'\]/)
  assert.match(mine, />\s*ساعاتي\s*<\/h1>/); assert.match(admin, />\s*ساعات المشاريع\s*<\/h1>/)
  assert.match(mine, /minutes: Math\.round\(hours \* 60\)/)
  assert.match(admin, /report\.costShown &&/)
  assert.doesNotMatch(mine, /employeeId:|status: '/)
})

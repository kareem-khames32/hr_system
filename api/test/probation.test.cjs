'use strict'
// B3.1 (ج): قرار فترة التجربة — فحص من غير قاعدة (الدورة الفعلية في probation.integration.cjs):
//  PT-01) القواعد: نهاية التجربة الفعلية (المكتوبة ثم المدة الافتراضية)، وسبب القرار، وتاريخ التمديد، وعناوين المهام، وبصمة الصف.
//  PT-02) الربط: الحكم قبل المعاملة والمقارنة تحت قفل صف الموظف، والقرار في سجل تغييرات الموظف، والمهمة اليومية وإعداداتها.
//  PT-03) الواجهة: الشاشة وبند القايمة وعنوانها.
// Run (من api/): node --test test/probation.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const rules = require('../src/onboarding/probation')
const root = path.resolve(__dirname, '..', '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n')
const refuses = (work, label) => assert.throws(work, error => error?.getStatus?.() === 400, label)

test('PT-01: the effective end date, the reason, the extension date, the task titles and the row stamp', () => {
  const end = (file, days) => rules.effectiveProbationEnd(file, days)
  assert.deepEqual(end({ probationEndDate: '2026-12-01', joinDate: '2026-09-01' }, 90), { date: '2026-12-01', fromDefault: false }, 'المكتوب بيسبق')
  assert.deepEqual(end({ probationEndDate: null, joinDate: '2026-09-01' }, 90), { date: '2026-11-30', fromDefault: true })
  assert.deepEqual(end({ joinDate: '2026-09-01', actualStartDate: '2026-09-10' }, 30), { date: '2026-10-10', fromDefault: true }, 'المباشرة الفعلية أولًا')
  assert.deepEqual(end({ joinDate: '2026-09-01' }, 0), { date: null, fromDefault: false })
  assert.deepEqual(end({}, 90), { date: null, fromDefault: false })
  assert.deepEqual(end({ probationEndDate: new Date(2026, 11, 1), joinDate: '2026-09-01' }, 0), { date: '2026-12-01', fromDefault: false }, 'قيمة تاريخ من القاعدة')
  assert.deepEqual([rules.addDaysYmd('2026-12-31', 1), rules.addDaysYmd('2026-03-01', -1), rules.daysBetween('2026-10-08', '2026-10-18'), rules.daysBetween('2026-10-08', '2026-10-06')],
    ['2027-01-01', '2026-02-28', 10, -2])
  // السبب: مطلوب في التمديد والإنهاء، واختياري في التثبيت
  assert.equal(rules.probationReason('  أداء   ممتاز ', false), 'أداء ممتاز')
  assert.equal(rules.probationReason(undefined, false), null)
  assert.equal(rules.probationReason('   ', false), null)
  for (const bad of [undefined, null, '', '  ', 'ق', 7]) refuses(() => rules.probationReason(bad, true), `required ${String(bad)}`)
  refuses(() => rules.probationReason('ق', false), 'قصير')
  refuses(() => rules.probationReason('س'.repeat(301), false), 'طويل')
  assert.equal(rules.probationReason('س'.repeat(300), true).length, 300)
  // التمديد: تاريخ حقيقي بعد النهارده وبعد النهاية الحالية
  assert.equal(rules.extensionDate('2026-11-20', '2026-10-08', '2026-11-01'), '2026-11-20')
  assert.equal(rules.extensionDate('2026-10-09', '2026-10-08', null), '2026-10-09')
  for (const bad of [undefined, '', '2026-13-01', '2026-02-31', '20261120', 20261120, '2026-10-08', '2026-10-01', '2026-11-01', '2026-10-20']) {
    refuses(() => rules.extensionDate(bad, '2026-10-08', '2026-11-01'), `extension ${String(bad)}`)
  }
  const employee = { fullName: 'سارة أحمد', employeeCode: 'E-0042' }
  assert.deepEqual([rules.probationTaskTitle(employee), rules.terminationTaskTitle(employee)],
    ['قرار فترة التجربة: سارة أحمد (E-0042)', 'فتح ملف إنهاء خدمة: سارة أحمد (E-0042) — قرار فترة التجربة'])
  assert.ok(rules.probationTaskTitle({ fullName: 'س'.repeat(400), employeeCode: 'E1' }).length <= 200)
  // بصمة الصف: أي تغيير في الحالة أو التفعيل أو الفرع أو المدير أو القسم أو الفريق أو التاريخ بيغيّرها
  const row = { status: 'probation', isActive: true, branchId: 1, managerEmployeeId: 5, departmentId: 2, teamId: 3, probationEndDate: '2026-11-01' }
  const stamp = rules.probationStamp(row)
  assert.equal(rules.probationStamp({ ...row, probationEndDate: new Date(2026, 10, 1) }), stamp, 'نص أو قيمة تاريخ: نفس البصمة')
  for (const change of [{ status: 'active' }, { isActive: false }, { branchId: 2 }, { managerEmployeeId: null }, { departmentId: 9 }, { teamId: null }, { probationEndDate: '2026-11-02' }]) {
    assert.notEqual(rules.probationStamp({ ...row, ...change }), stamp, JSON.stringify(change))
  }
  assert.deepEqual([rules.PROBATION_NOTICE_KEY, rules.PROBATION_DAYS_KEY, rules.PROBATION_NOTICE_DEFAULT, [...rules.PROBATION_DECISIONS]],
    ['onboarding.probation_notice_days', 'onboarding.probation_days', 14, ['CONFIRM', 'EXTEND', 'TERMINATE']])
})

test('PT-02: the judgment before the transaction and the comparison under the employee row lock; the change log; the daily job and its settings', () => {
  const service = read('api/src/onboarding/probation.service.ts')
  const decide = service.slice(service.indexOf('async decide('), service.indexOf('private async closeDecisionTasks('))
  // حل المدير المباشر (خدمة تانية) قبل المعاملة، وجوه المعاملة قفل الصف ثم المقارنة ثم الحالة
  assert.ok(decide.indexOf('this.resolver.directReportsOf(') < decide.indexOf('this.ds.transaction('))
  assert.doesNotMatch(decide.slice(decide.indexOf('this.ds.transaction(')), /this\.resolver\./, 'مفيش نداء خدمة جوه المعاملة')
  assert.match(decide, /lock: \{ mode: 'pessimistic_write' \} \}\)\n\s+if \(!emp \|\| probationStamp\(emp\) !== probationStamp\(seen\)\) throw new ConflictException\(PROBATION_CHANGED\)\n\s+if \(emp\.status !== 'probation' \|\| !emp\.isActive\) throw new BadRequestException\(PROBATION_NOT_ON\)/)
  assert.match(decide, /if \(!seen \|\| \(!inBranchScope\(scope, seen\.branchId\) && !manager\)\) throw new NotFoundException\('الموظف غير موجود'\)/)
  assert.match(decide, /await em\.update\(Employee, \{ id: emp\.id \}, \{ status: 'active' \}\)/, 'بالحقل المتغيّر بس')
  assert.match(decide, /await em\.update\(Employee, \{ id: emp\.id \}, \{ probationEndDate: endDate \}\)/)
  assert.equal(decide.split('await recordEmployeeChange(em, {').length - 1, 3, 'كل قرار بسطره في سجل تغييرات الموظف')
  const job = service.slice(service.indexOf('async raiseDecisionTasks('))
  assert.match(job, /if \(!\(await this\.modules\.jobEnabled\('onboarding\.probation-tasks'\)\)\) return 0/)
  assert.equal(rules.PROBATION_JOB, 'onboarding.probation-tasks')
  assert.ok(job.indexOf('this.resolver.directManagerOf(') < job.indexOf('this.ds.transaction('), 'المدير بيتحل قبل المعاملة')
  assert.match(job, /if \(!emp \|\| emp\.status !== 'probation' \|\| !emp\.isActive \|\| due\(emp\) !== end\) return 0/)
  assert.match(job, /WHERE \[createdByUserId\] = 0 AND \[title\] = @0 AND \[dueDate\] = @1/, 'مرة لكل تاريخ نهاية')
  // القايمة: فرع برّه النطاق من غير رقمه ولا اسمه
  assert.match(service, /branchId: inScope \? emp\.branchId : null, branchName: inScope \? branchName\.get\(emp\.branchId\) \?\? null : null/)
  const controller = read('api/src/onboarding/probation.controller.ts')
  assert.match(controller, /@RequireModule\('onboarding'\)\n@UseGuards\(JwtAuthGuard, RolesGuard\)\n@Controller\('probation'\)/)
  assert.match(read('api/src/scheduler/scheduled-jobs.ts'), /'onboarding\.probation-tasks': \{ cron: '40 7 \* \* \*', module: 'onboarding\.probation-tasks', lock: 'onboarding\.probation-tasks'/)
  assert.match(read('api/src/scheduler/scheduled-jobs.runner.ts'), /@Scheduled\('onboarding\.probation-tasks'\)\n\s+probationTasks\(\) \{\n\s+return this\.jobs\.tick\('onboarding\.probation-tasks', \(\) => this\.use\(ProbationService\)\.raiseDecisionTasks\(\)\)/)
  const seed = read('api/src/seed/requests-seed.data.ts')
  assert.match(seed, /\{ key: 'onboarding\.probation_notice_days', value: '14' \},\n\s+\{ key: 'onboarding\.probation_days', value: '0' \}/)
  assert.match(read('api/src/settings/settings.controller.ts'), /'onboarding\.probation_notice_days': 0,\n\s+'onboarding\.probation_days': 0,/)
})

test('PT-03: the probation screen, its menu entry and title', () => {
  const page = read('src/app/my/probation/page.tsx')
  assert.match(page, /fetchProbation\(\)/)
  assert.match(page, /decision !== 'EXTEND' \|\| \(newEndDate !== '' && newEndDate > minDate\)/)
  assert.match(page, /\{row\.canDecide && \(/)
  assert.match(page, /role="dialog" aria-modal="true"/)
  assert.match(read('src/lib/probation-api.ts'), /apiFetch<ApiProbationList>\('\/probation'\)/)
  assert.match(read('src/components/layout/Sidebar.tsx'), /\{ label: 'فترات التجربة', href: '\/my\/probation', when: 'probation' \},/)
  assert.match(read('src/components/layout/Sidebar.tsx'), /probation: teamManager \|\| can\('employees\.view'\),/)
  assert.match(read('src/components/layout/pageTitles.ts'), /\['\/my\/probation', 'فترات التجربة'\]/)
  assert.ok(require('../src/modules-registry/registry').MODULES.onboarding.routes.includes('/my/probation'))
})

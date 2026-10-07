// B1.4 — المهام المجدولة: التوقيت الصريح وقايمة المهام وربطها بالموديولات والشاشة (القواعد الصافية والربط من غير قاعدة بيانات).
// التشغيل نفسه (مرة واحدة بين نسختين، والسجل، والترحيل 079) في scheduled-jobs.integration.cjs.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { timeZoneIssue, systemTimeZone } = require('../src/scheduler/schedule-time-zone')
const jobs = require('../src/scheduler/scheduled-jobs')
const registry = require('../src/modules-registry/registry')
const { validateEnv } = require('../src/auth/jwt-secret')
const { CronTime } = require('../node_modules/cron')
const apiRoot = path.resolve(__dirname, '..'), root = path.resolve(apiRoot, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')

test('TZ: الفاضي = توقيت الجهاز، والاسم المعروف مقبول، والغلط بيوقف الإقلاع برسالة واضحة', () => {
  for (const value of [undefined, null, '', '  ']) assert.equal(timeZoneIssue(value), null)
  for (const zone of ['Africa/Cairo', 'Asia/Riyadh', 'UTC']) assert.equal(timeZoneIssue(zone), null, zone)
  assert.match(timeZoneIssue('Cairo/Egypt'), /مش توقيت معروف/)
  assert.ok(systemTimeZone())
  const env = { JWT_SECRET: 'x'.repeat(48) + 'Q9#lowercase-and-UPPER' }
  assert.doesNotThrow(() => validateEnv({ ...env, TZ: 'Africa/Cairo' }))
  assert.throws(() => validateEnv({ ...env, TZ: 'Mars/Olympus' }), /مش توقيت معروف/)
  // .env قبل أي كود: load-env أول import في main بعد reflect-metadata، وقبل app.module
  const main = read('api/src/main.ts')
  assert.ok(main.indexOf("import './load-env'") > -1 && main.indexOf("import './load-env'") < main.indexOf("import { AppModule }"))
  assert.match(read('api/src/load-env.ts'), /config\(\{ quiet: true \}\)/)
  assert.match(read('docs/DEPLOY_SERVER.md'), /TZ=Africa\/Cairo/)
})

test('قايمة المهام: كل مهمة بموعد صالح، وكل موعد في الكود من القايمة ومتسجل مرة واحدة، ومفيش @Cron خارجها', () => {
  const ids = jobs.SCHEDULED_JOB_IDS
  assert.equal(new Set(ids).size, ids.length)
  // B2.3: + أحداث المستندات اللي هتنتهي. B2.4: + الملخص اليومي لإشعارات البريد. B2.5: + تذكير وتصعيد المهام. B2.13: + التقارير المجدولة
  assert.equal(ids.length, 16)
  for (const id of ids) {
    const job = jobs.SCHEDULED_JOBS[id]
    assert.doesNotThrow(() => new CronTime(job.cron, systemTimeZone()), id)
    assert.ok(job.label && job.schedule && job.lock, id)
    if (job.module !== null) assert.ok(registry.moduleOfJob(job.module), `${id}: «${job.module}» مش متسجّلة في سجل الموديولات`)
  }
  // كل مهمة موديول في السجل ليها موعد هنا، والمهمة الأساسية الوحيدة مسح السجل
  const registered = registry.MODULE_KEYS.flatMap(key => registry.MODULES[key].jobs).sort()
  assert.deepEqual([...new Set(ids.map(id => jobs.SCHEDULED_JOBS[id].module).filter(Boolean))].sort(), registered)
  assert.deepEqual(ids.filter(id => jobs.SCHEDULED_JOBS[id].module === null), ['scheduler.prune-runs'])
  // التجسيد اليومي ولحاقه بيشتركوا في قفل واحد
  assert.equal(jobs.SCHEDULED_JOBS['attendance.materialize-absences'].lock, jobs.SCHEDULED_JOBS['attendance.materialize-absences.catch-up'].lock)
  // المواعيد كلها في ScheduledJobsRunner — كل مهمة مرة واحدة وبتعدي على tick بنفس الاسم
  const runner = read('api/src/scheduler/scheduled-jobs.runner.ts')
  for (const id of ids) {
    assert.equal(runner.split(`@Scheduled('${id}')`).length - 1, 1, id)
    assert.match(runner, new RegExp(`@Scheduled\\('${id.replace(/\./g, '\\.')}'\\)\\n  \\w+\\(\\) \\{\\n    return this\\.jobs\\.tick\\('${id.replace(/\./g, '\\.')}'`), id)
  }
  const files = []
  const walk = dir => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full); else if (entry.name.endsWith('.ts')) files.push(full)
  } }
  walk(path.join(apiRoot, 'src'))
  const raw = files.filter(file => /^\s*@(Cron|Interval|Timeout)\(/m.test(fs.readFileSync(file, 'utf8')))
  assert.deepEqual(raw.map(file => path.relative(apiRoot, file)), [], 'كل موعد بيعدي على @Scheduled')
  // خانة الدقيقة بتوقيت UTC
  assert.equal(jobs.scheduledSlot(new Date('2026-10-29T21:30:45.123Z')), '2026-10-29T21:30Z')
})

test('الشاشة: «المهام المجدولة» في الإعدادات بصلاحية إدارة الإعدادات، والخادم بيشترط حساب على كل الفروع', () => {
  const page = read('src/app/settings/scheduled-jobs/page.tsx')
  for (const text of ['fetchScheduledJobs()', 'data-scheduled-jobs-unavailable', 'data-scheduled-job-runs', "'المهمة', 'آخر تشغيل', 'آخر فشل', 'آخر 24 ساعة', 'الجاية'"]) assert.ok(page.includes(text), text)
  assert.doesNotMatch(page, /^export (const|function) (?!default)/m, 'صفحة Next من غير exports تانية')
  assert.ok(read('src/components/layout/MainLayout.tsx').includes("['/settings/scheduled-jobs', 'settings.manage']"))
  assert.ok(read('src/components/layout/Sidebar.tsx').includes("{ label: 'المهام المجدولة', href: '/settings/scheduled-jobs', perm: 'settings.manage' }"))
  assert.ok(read('src/components/layout/pageTitles.ts').includes("['/settings/scheduled-jobs', 'المهام المجدولة']"))
  const controller = read('api/src/scheduler/scheduled-jobs.controller.ts')
  assert.match(controller, /@Perm\('settings\.manage'\)/)
  assert.match(controller, /branchScopeOf\(user\) !== null\) throw new ForbiddenException/)
})

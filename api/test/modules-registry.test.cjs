'use strict'
// سجل الموديولات (خطة التنفيذ — الجزء 3، الدفعة B0.2) — دوال صافية من غير قاعدة ولا خادم:
//  MR-01) السجل سليم: كل تبعية موديول مسجّل، مفيش دايرة، الأساسي مايعتمدش على اختياري، وكل مفتاح ميزة بادئته موديوله.
//  MR-02) الحالة: الصف الغايب = افتراضي السجل، الأساسي مفعّل دايمًا، وقفل موديول بيقفل اللي بيعتمد عليه فعليًا.
//  MR-03) صاحب مسار الواجهة: أطول نمط بيكسب، والنجمة أضعف من الثابت، والشاشات الوهمية ورا ميزتها.
//  MR-04) أنواع الطلبات: بالكود الأول ثم بمعالج التنفيذ، وغير كده محرك الطلبات (أساسي).
//  MR-05) المهام المجدولة والصلاحيات: كل اسم لموديول واحد بس.
//  MR-06) الباقات: كل باقة بتشمل اللي قبلها والأساسي دايمًا.
//  MR-07) التبعيات عند القفل والفتح: الناقص والمعتمد.
//  MR-08) كل صلاحية في سجل الصلاحيات لها موديول (شاشة الأدوار بتعرض صلاحيات الموديولات المفعّلة بس).
//  MR-09) كل معالج تنفيذ في أنواع الطلبات المزروعة له موديول متوقع.
//  MR-10) صلاحيات تابعة لموديول اختياري ومسار أساسي بيطلبها بتفضل ظاهرة في شاشة الأدوار.
// Run (من api/): node --test test/modules-registry.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const registry = require('../src/modules-registry/registry')
const { MODULES, MODULE_KEYS, MODULE_FEATURES, MODULE_PRESET_ORDER, DEMO_ROUTES, DEMO_SCREENS_FEATURE } = registry

const state = (modules = {}, features = {}) => ({ modules, features })

test('MR-01: السجل سليم — تبعيات مسجّلة ومن غير دايرة، والأساسي مايعتمدش على اختياري', () => {
  assert.ok(MODULE_KEYS.length >= 19)
  for (const key of MODULE_KEYS) {
    const def = MODULES[key]
    assert.match(key, /^[a-z][a-z0-9_]*$/, `مفتاح الموديول ${key}`)
    assert.ok(def.nameAr && def.description, `اسم ووصف ${key}`)
    for (const dependency of [...def.dependsOn, ...def.softUses]) assert.ok(registry.isModuleKey(dependency), `${key} ← ${dependency} مش مسجّل`)
    assert.ok(!def.dependsOn.includes(key) && !def.softUses.includes(key), `${key} بيعتمد على نفسه`)
    if (def.core) {
      for (const dependency of def.dependsOn) assert.ok(MODULES[dependency].core, `الأساسي ${key} بيعتمد على الاختياري ${dependency}`)
      assert.equal(def.defaultEnabled, true)
    }
    assert.ok(def.preset === null || MODULE_PRESET_ORDER.includes(def.preset))
    for (const feature of Object.keys(def.features)) assert.ok(feature.startsWith(`${key}.`), `الميزة ${feature} لازم تبدأ بمفتاح موديولها`)
    for (const route of def.routes) assert.match(route, /^\/([a-z0-9*-]+(\/[a-z0-9*-]+)*)?$/, `مسار ${route}`)
  }
  // من غير دايرة: كل موديول بيتفعّل لما كل الصفوف مفعّلة
  const all = state(Object.fromEntries(MODULE_KEYS.map(key => [key, true])))
  for (const key of MODULE_KEYS) assert.equal(registry.moduleEnabled(all, key), true, key)
  // مفيش مسار واجهة متسجّل لموديولين
  const routes = MODULE_KEYS.flatMap(key => MODULES[key].routes)
  assert.equal(new Set(routes).size, routes.length, 'مسار واجهة متكرر في موديولين')
  assert.equal(MODULE_FEATURES[DEMO_SCREENS_FEATURE].module, 'platform')
  assert.equal(MODULE_FEATURES[DEMO_SCREENS_FEATURE].default, false)
})

test('MR-02: الحالة — الصف الغايب افتراضي السجل، والأساسي مايتقفلش، والقفل بينزل على المعتمدين', () => {
  const empty = state()
  for (const key of MODULE_KEYS) assert.equal(registry.moduleEnabled(empty, key), MODULES[key].defaultEnabled, key)
  // كل الموجود النهارده مفعّل من غير صفوف
  assert.deepEqual(registry.enabledSnapshot(empty).modules, MODULE_KEYS.filter(key => MODULES[key].defaultEnabled))
  assert.deepEqual(registry.enabledSnapshot(empty).features, [])
  // صف «مقفول» على أساسي مالوش أثر
  assert.equal(registry.moduleEnabled(state({ employees: false, requests: false }), 'employees'), true)
  assert.equal(registry.moduleEnabled(state({ employees: false, requests: false }), 'requests'), true)
  // الحضور مقفول ← الورديات والإضافي مقفولين فعليًا حتى لو صفوفهم مفعّلة
  const noAttendance = state({ attendance: false, shifts: true, overtime: true })
  assert.equal(registry.moduleEnabled(noAttendance, 'attendance'), false)
  assert.equal(registry.moduleEnabled(noAttendance, 'shifts'), false)
  assert.equal(registry.moduleEnabled(noAttendance, 'overtime'), false)
  assert.equal(registry.moduleEnabled(noAttendance, 'leave'), true)
  // الرواتب مقفولة ← السلف مقفولة، والمصروفات (على محرك الطلبات) شغالة
  const noPayroll = state({ payroll: false })
  assert.equal(registry.moduleEnabled(noPayroll, 'loans'), false)
  assert.equal(registry.moduleEnabled(noPayroll, 'expenses'), true)
  // الميزة: موديولها مفعّل وصفها (أو افتراضيها) مفعّل، ومفتاح مش مسجّل = مقفول
  assert.equal(registry.featureEnabled(empty, DEMO_SCREENS_FEATURE), false)
  assert.equal(registry.featureEnabled(state({}, { [DEMO_SCREENS_FEATURE]: true }), DEMO_SCREENS_FEATURE), true)
  assert.equal(registry.featureEnabled(state({}, { 'nope.feature': true }), 'nope.feature'), false)
  assert.equal(registry.isFeatureKey(DEMO_SCREENS_FEATURE), true)
  assert.equal(registry.isFeatureKey('constructor'), false)
  assert.equal(registry.isModuleKey('constructor'), false)
  assert.equal(registry.isModuleKey('payroll'), true)
})

test('MR-03: صاحب مسار الواجهة — أطول نمط بيكسب، والنجمة أضعف من الثابت، والشاشات الوهمية ورا ميزتها', () => {
  const owner = pathname => registry.routeOwner(pathname)
  const expectModule = (pathname, module) => assert.deepEqual(owner(pathname), { module, feature: null }, pathname)
  expectModule('/', 'platform')
  expectModule('/settings', 'platform')
  expectModule('/settings/work-days', 'platform')
  expectModule('/settings/users', 'platform')
  expectModule('/leaves/holidays', 'platform')
  expectModule('/login/change-password', 'platform')
  expectModule('/settings/branches', 'org')
  expectModule('/employees/org-chart', 'org')
  expectModule('/employees', 'employees')
  expectModule('/employees/12', 'employees')
  expectModule('/employees/12/edit', 'employees')
  expectModule('/employees/archived', 'employees')
  expectModule('/employees/bulk-update', 'employees')
  expectModule('/employees/transfers', 'employees')
  expectModule('/employees/12/terminate', 'offboarding')
  expectModule('/employees/12/settlement', 'offboarding')
  expectModule('/offboarding/7', 'offboarding')
  expectModule('/employees/onboarding', 'onboarding')
  expectModule('/employees/custody', 'custody')
  expectModule('/my/custody', 'custody')
  expectModule('/settings/asset-types', 'custody')
  expectModule('/employees/documents/create', 'documents')
  expectModule('/employees/hiring-documents', 'documents')
  expectModule('/my/documents', 'documents')
  expectModule('/profile', 'self_service')
  expectModule('/calendar', 'self_service')
  expectModule('/requests', 'requests')
  expectModule('/approvals-inbox', 'requests')
  expectModule('/requests-console', 'requests')
  expectModule('/settings/request-types', 'requests')
  expectModule('/notifications', 'notifications')
  expectModule('/attendance', 'attendance')
  expectModule('/attendance/devices', 'attendance')
  expectModule('/attendance/monthly-sheet', 'attendance')
  expectModule('/my/attendance', 'attendance')
  expectModule('/attendance/shifts', 'shifts')
  expectModule('/attendance/weekly-schedule', 'shifts')
  expectModule('/attendance/overtime', 'overtime')
  expectModule('/attendance/holiday-work', 'overtime')
  expectModule('/attendance/permissions', 'leave')
  expectModule('/settings/permission-types', 'leave')
  expectModule('/leaves', 'leave')
  expectModule('/leaves/request', 'leave')
  expectModule('/leaves/year-end', 'leave')
  expectModule('/my/leaves', 'leave')
  expectModule('/payroll', 'payroll')
  expectModule('/payroll/payslip/55', 'payroll')
  expectModule('/payroll/disbursement', 'payroll')
  expectModule('/my/payslips', 'payroll')
  expectModule('/my/deductions', 'payroll')
  expectModule('/my/bonuses', 'payroll')
  expectModule('/reports/payroll-register', 'payroll')
  expectModule('/payroll/loans', 'loans')
  expectModule('/my/loans', 'loans')
  expectModule('/reports/loans', 'loans')
  expectModule('/reports', 'reports')
  expectModule('/recruitment', 'recruitment')
  expectModule('/recruitment/applicants', 'recruitment')
  // الاستعلام والهاش مايأثروش
  expectModule('/requests?type=PUNCH_CORRECTION&date=2026-10-01', 'requests')
  expectModule('/payroll/loans#x', 'loans')
  // مسار مش مسجّل لأي موديول = مالوش صاحب (بيتعامل كأساسي)
  assert.deepEqual(owner('/something-new'), { module: null, feature: null })

  // الشاشات الوهمية: ورا الميزة، ومسار العرض الأدق بيكسب على مسار الموديول
  const demo = (pathname, module) => assert.deepEqual(owner(pathname), { module, feature: DEMO_SCREENS_FEATURE }, pathname)
  // B3.6 وB3.7: شاشات الأداء بقت حقيقية تبع موديوله (الأهداف، التقييمات، نموذج التقييم، الدورات، النماذج)؛ «تقييم جديد» لسه شاشة عرض
  for (const route of ['/performance/goals', '/performance', '/performance/15', '/performance/cycles', '/performance/templates']) {
    assert.deepEqual(registry.routeOwner(route), { module: 'performance', feature: null }, route)
  }
  demo('/performance/new', 'performance')
  // B3.9-ب: شاشات التدريب بقت حقيقية تبع موديول التدريب
  for (const route of ['/training', '/training/my-courses', '/training/add', '/training/certificates', '/training/7']) assert.deepEqual(registry.routeOwner(route), { module: 'training', feature: null }, route)
  demo('/reports/custom', 'reports')
  demo('/recruitment/add', 'recruitment')
  // B3.4-ب: شاشة المقابلات بقت حقيقية (تبع الموديول، مش شاشة عرض)
  assert.deepEqual(registry.routeOwner('/recruitment/interviews'), registry.routeOwner('/recruitment/jobs'))
  // B3.5-أ: شاشة العروض بقت حقيقية
  assert.deepEqual(registry.routeOwner('/recruitment/offers'), registry.routeOwner('/recruitment/jobs'))
  demo('/recruitment/15', 'recruitment')
  assert.ok(DEMO_ROUTES.length >= 4) // B3.4-ب وB3.5-أ: شاشتي المقابلات والعروض خرجوا من شاشات العرض؛ B3.9-ب: وشاشات التدريب

  // routeAvailable: الموديول مفعّل والميزة (لو فيه) مفعّلة
  const basic = registry.enabledSnapshot(state())
  assert.equal(registry.routeAvailable('/payroll', basic), true)
  assert.equal(registry.routeAvailable('/performance', basic), false)
  assert.equal(registry.routeAvailable('/recruitment/add', basic), false)
  assert.equal(registry.routeAvailable('/recruitment/applicants', basic), true)
  assert.equal(registry.routeAvailable('/something-new', basic), true)
  const withDemo = registry.enabledSnapshot(state({}, { [DEMO_SCREENS_FEATURE]: true }))
  // شاشة العرض بتفتح بالميزة؛ وشاشات الأداء والتدريب الحقيقية بموديولها (المقفول افتراضيًا) مش بميزة العرض
  assert.equal(registry.routeAvailable('/reports/custom', withDemo), true)
  assert.equal(registry.routeAvailable('/training', withDemo), false)
  assert.equal(registry.routeAvailable('/training', registry.enabledSnapshot(state({ training: true }))), true)
  assert.equal(registry.routeAvailable('/performance', withDemo), false)
  assert.equal(registry.routeAvailable('/performance', registry.enabledSnapshot(state({ performance: true }))), true)
  assert.equal(registry.routeAvailable('/recruitment/add', withDemo), true)
  // التوظيف مقفول: شاشاته الحقيقية والوهمية مقفولة حتى مع ميزة العرض
  const demoNoRecruitment = registry.enabledSnapshot(state({ recruitment: false }, { [DEMO_SCREENS_FEATURE]: true }))
  assert.equal(registry.routeAvailable('/recruitment', demoNoRecruitment), false)
  assert.equal(registry.routeAvailable('/recruitment/add', demoNoRecruitment), false)
  assert.equal(registry.routeAvailable('/reports/custom', demoNoRecruitment), true)
  // الحضور مقفول: شاشاته وشاشات اللي بيعتمد عليه مقفولة، والإجازات شغالة
  const noAttendance = registry.enabledSnapshot(state({ attendance: false }))
  for (const pathname of ['/attendance', '/my/attendance', '/attendance/shifts', '/attendance/overtime']) assert.equal(registry.routeAvailable(pathname, noAttendance), false, pathname)
  for (const pathname of ['/attendance/permissions', '/leaves', '/settings/work-days', '/leaves/holidays']) assert.equal(registry.routeAvailable(pathname, noAttendance), true, pathname)
  // شاشة صاحبها موديول وبياناتها من موديول تاني: «تقرير الإضافي المالي» شاشة رواتب محتاجة الإضافي كمان (زي @RequireModule بتاع مسارها)
  assert.deepEqual(registry.ROUTE_ALSO_REQUIRES, [{ route: '/reports/overtime', modules: ['overtime'] }])
  assert.equal(registry.routeOwner('/reports/overtime').module, 'payroll')
  assert.equal(registry.routeAvailable('/reports/overtime', basic), true)
  assert.equal(registry.routeAvailable('/reports/overtime?period=2026-09', basic), true)
  assert.equal(registry.routeAvailable('/reports/overtime', registry.enabledSnapshot(state({ overtime: false }))), false)
  assert.equal(registry.routeAvailable('/reports/overtime', registry.enabledSnapshot(state({ payroll: false }))), false)
  assert.equal(registry.routeAvailable('/reports/overtime', noAttendance), false, 'الإضافي بيتقفل مع الحضور')
  // باقي تقارير الرواتب مش محتاجة الإضافي
  for (const pathname of ['/reports/payroll-register', '/reports/payroll-cost', '/reports/deductions', '/reports/cost-centers', '/payroll/reports']) {
    assert.equal(registry.routeAvailable(pathname, registry.enabledSnapshot(state({ overtime: false }))), true, pathname)
  }
  // وكل موديول في القايمة دي مسجّل، ومساره له صاحب
  for (const extra of registry.ROUTE_ALSO_REQUIRES) {
    assert.ok(registry.routeOwner(extra.route).module, extra.route)
    for (const module of extra.modules) assert.ok(MODULE_KEYS.includes(module), module)
  }
})

test('MR-04: أنواع الطلبات — بالكود الأول ثم بمعالج التنفيذ، وغير كده محرك الطلبات', () => {
  const of = (code, destinationHandler) => registry.moduleOfRequestType({ code, destinationHandler })
  assert.equal(of('PERMISSION', null), 'leave')
  assert.equal(of('PAYROLL_DEDUCTION', null), 'payroll')
  assert.equal(of('PAYROLL_BONUS', 'payroll_bonus'), 'payroll')
  assert.equal(of('ANNUAL', 'leave_deduct_balance'), 'leave')
  assert.equal(of('MY_CUSTOM_LEAVE', 'leave_no_balance'), 'leave')
  assert.equal(of('PUNCH_CORRECTION', 'attendance_corrections'), 'attendance')
  assert.equal(of('SHIFT_SWAP', 'shift_schedule'), 'shifts')
  assert.equal(of('OVERTIME', 'overtime_entries'), 'overtime')
  assert.equal(of('OVERTIME_AUTO', 'overtime_auto'), 'overtime')
  assert.equal(of('HOLIDAY_WORK', 'holiday_work'), 'overtime')
  assert.equal(of('LOAN', 'loans_installments'), 'loans')
  assert.equal(of('LOAN_INSTALLMENT_DEFER', 'loan_installment_defer'), 'loans')
  assert.equal(of('SALARY_INCREASE', 'salary_update_history'), 'payroll')
  assert.equal(of('BANK_ACCOUNT_CHANGE', 'payroll_bank_secure'), 'payroll')
  assert.equal(of('EXPENSE_CLAIM', 'expense_register'), 'expenses')
  assert.equal(of('CUSTODY_REQUEST', 'custody_assignments_ack'), 'custody')
  assert.equal(of('RESIGNATION', 'employee_status'), 'offboarding')
  assert.equal(of('LETTER_SALARY', 'letter_pdf_generator'), 'documents')
  assert.equal(of('PROMOTION', 'employee_update_promotions'), 'employees')
  assert.equal(of('TEAM_TRANSFER', 'transfers_effective_date'), 'employees')
  // نوع مخصص من غير معالج، أو معالج مش مسجّل = محرك الطلبات نفسه (أساسي، مايتقفلش)
  assert.equal(of('COMPLAINT', null), 'requests')
  assert.equal(of('CUSTOM_X', 'unknown_handler'), 'requests')
  assert.equal(of(null, null), 'requests')
  // الكود المسجّل بالاسم بيكسب على المعالج
  assert.equal(of('PERMISSION', 'attendance_log'), 'leave')
  // مفيش كود ولا معالج متسجّل لموديولين
  const codes = MODULE_KEYS.flatMap(key => MODULES[key].requestTypes), handlers = MODULE_KEYS.flatMap(key => MODULES[key].requestHandlers)
  assert.equal(new Set(codes).size, codes.length)
  assert.equal(new Set(handlers).size, handlers.length)
})

test('MR-05: المهام المجدولة والصلاحيات — كل اسم لموديول واحد', () => {
  assert.equal(registry.moduleOfJob('attendance.materialize-absences'), 'attendance')
  assert.equal(registry.moduleOfJob('attendance.device-sync'), 'attendance')
  assert.equal(registry.moduleOfJob('overtime.reconcile-auto'), 'overtime')
  assert.equal(registry.moduleOfJob('leave.year-start'), 'leave')
  assert.equal(registry.moduleOfJob('leave.attachment-deadline'), 'leave')
  assert.equal(registry.moduleOfJob('payroll.daily-accrual'), 'payroll')
  assert.equal(registry.moduleOfJob('payroll.deductions-sla'), 'payroll')
  assert.equal(registry.moduleOfJob('offboarding.finalize-due'), 'offboarding')
  assert.equal(registry.moduleOfJob('requests.escalations'), 'requests')
  assert.equal(registry.moduleOfJob('requests.scheduled-transfers'), 'employees')
  // B2.4: الملخص اليومي لإشعارات البريد تابع لموديول الإشعارات (أساسي)
  assert.equal(registry.moduleOfJob('notifications.daily-digest'), 'notifications')
  assert.equal(registry.moduleOfJob('nope'), null)
  const jobs = MODULE_KEYS.flatMap(key => MODULES[key].jobs), permissions = MODULE_KEYS.flatMap(key => MODULES[key].permissions)
  assert.equal(new Set(jobs).size, jobs.length, 'مهمة مجدولة في موديولين')
  assert.equal(new Set(permissions).size, permissions.length, 'صلاحية في موديولين')
  assert.equal(registry.moduleOfPermission('payroll.approve'), 'payroll')
  assert.equal(registry.moduleOfPermission('custody.assign'), 'custody')
  assert.equal(registry.moduleOfPermission('nope.perm'), null)
})

test('MR-06: الباقات — كل باقة بتشمل اللي قبلها والأساسي دايمًا', () => {
  const basic = registry.modulesOfPreset('basic'), standard = registry.modulesOfPreset('standard'), full = registry.modulesOfPreset('full')
  for (const key of MODULE_KEYS.filter(key => MODULES[key].core)) assert.ok(basic.includes(key), `الأساسي ${key} برّه الباقة الأساسية`)
  for (const key of basic) assert.ok(standard.includes(key))
  for (const key of standard) assert.ok(full.includes(key))
  for (const key of ['attendance', 'shifts', 'overtime', 'leave', 'payroll', 'loans', 'expenses', 'onboarding', 'custody', 'offboarding']) assert.ok(basic.includes(key), key)
  assert.ok(!basic.includes('recruitment'))
  assert.ok(standard.includes('recruitment'))
  // كل باقة مقفولة على تبعياتها: مفيش موديول في باقة واللي بيعتمد عليه برّاها
  for (const preset of MODULE_PRESET_ORDER) {
    const inPreset = registry.modulesOfPreset(preset)
    for (const key of inPreset) for (const dependency of MODULES[key].dependsOn) assert.ok(inPreset.includes(dependency), `${preset}: ${key} ← ${dependency}`)
  }
})

test('MR-07: التبعيات عند القفل والفتح — الناقص والمعتمد', () => {
  const empty = state()
  assert.deepEqual(registry.enabledDependents(empty, 'attendance').sort(), ['overtime', 'shifts'])
  assert.deepEqual(registry.enabledDependents(empty, 'payroll'), ['loans'])
  assert.deepEqual(registry.enabledDependents(empty, 'custody'), [])
  assert.deepEqual(registry.enabledDependents(state({ loans: false }), 'payroll'), [])
  assert.deepEqual(registry.missingDependencies(state({ attendance: false }), 'shifts'), ['attendance'])
  assert.deepEqual(registry.missingDependencies(state({ payroll: false }), 'loans'), ['payroll'])
  assert.deepEqual(registry.missingDependencies(empty, 'loans'), [])
  assert.deepEqual(registry.missingDependencies(empty, 'recruitment'), [])
})

test('MR-08: كل صلاحية في سجل الصلاحيات لها موديول، وكل صلاحية في سجل الموديولات معروفة', () => {
  const { ALL_PERMISSIONS } = require('../src/auth/permissions')
  assert.ok(Array.isArray(ALL_PERMISSIONS) && ALL_PERMISSIONS.length > 50)
  const unowned = ALL_PERMISSIONS.filter(key => registry.moduleOfPermission(key) === null)
  assert.deepEqual(unowned, [], `صلاحيات من غير موديول: ${unowned.join(', ')}`)
  const unknown = MODULE_KEYS.flatMap(key => MODULES[key].permissions).filter(key => !ALL_PERMISSIONS.includes(key))
  assert.deepEqual(unknown, [], `صلاحيات في سجل الموديولات مش في سجل الصلاحيات: ${unknown.join(', ')}`)
})

test('MR-10: صلاحيات تابعة لموديول اختياري ومسار أساسي بيطلبها بتفضل ظاهرة في شاشة الأدوار', () => {
  const { PERMISSIONS } = require('../src/auth/permissions')
  assert.deepEqual([...registry.PERMISSIONS_USED_BY_CORE], ['payroll.approve', 'attendance.manage'])
  for (const key of registry.PERMISSIONS_USED_BY_CORE) assert.ok(Object.prototype.hasOwnProperty.call(PERMISSIONS, key), key + ' صلاحية مسجّلة')
  // كل الموديولات مفعّلة (B2.11: فيه موديول مقفول افتراضيًا، فالحالة الفاضية مابقتش «الكل»)
  const all = registry.enabledSnapshot(state(Object.fromEntries(MODULE_KEYS.map(key => [key, true])))).modules
  // والموديول المقفول افتراضيًا صلاحياته مخفية من شاشة الأدوار لحد ما يتفعّل
  const byDefault = registry.enabledSnapshot(state()).modules
  assert.deepEqual(['positions.view', 'positions.manage', 'employees.view'].map(key => registry.permissionShown(key, byDefault)), [false, false, true])
  const noPayroll = registry.enabledSnapshot(state({ payroll: false })).modules
  const noAttendance = registry.enabledSnapshot(state({ attendance: false })).modules
  assert.deepEqual(['payroll.approve', 'payroll.view', 'loans.repay', 'employees.view'].map(key => registry.permissionShown(key, noPayroll)), [true, false, false, true])
  assert.deepEqual(['attendance.manage', 'attendance.view_all', 'overtime.confirm', 'leaves.view_all'].map(key => registry.permissionShown(key, new Set(noAttendance))), [true, false, false, true])
  for (const key of Object.keys(PERMISSIONS)) assert.equal(registry.permissionShown(key, all), true, key)
})

test('MR-09: أنواع الطلبات المزروعة — كل نوع في موديوله، وكل معالج تنفيذ حقيقي متسجّل لموديول', () => {
  const { typesSeed } = require('../src/seed/requests-seed.data')
  assert.ok(typesSeed.length >= 60)
  // معالج تنفيذ حقيقي (غير «تسجيل بس») لازم يبقى متسجّل لموديول — مايقعش على محرك الطلبات بالغلط
  const handlers = [...new Set(typesSeed.map(type => type.handler))].filter(handler => handler && handler !== 'none')
  const unowned = handlers.filter(handler => !MODULE_KEYS.some(key => MODULES[key].requestHandlers.includes(handler)))
  assert.deepEqual(unowned, [], `معالجات تنفيذ من غير موديول: ${unowned.join(', ')}`)
  // وكل معالج متنفّذ فعلًا في محرك الوجهات (حتى القديم اللي لسه بيتنفذ لقواعد قديمة) له موديول
  const { DestinationsService, ENGINE_RECORD_HANDLERS } = require('../src/requests/destinations.service')
  const implemented = [...Object.keys(new DestinationsService({}, {}).handlers), ...Object.keys(ENGINE_RECORD_HANDLERS)]
  assert.ok(implemented.length >= 30)
  const unmapped = implemented.filter(handler => !MODULE_KEYS.some(key => MODULES[key].requestHandlers.includes(handler)))
  assert.deepEqual(unmapped, [], `معالجات متنفّذة من غير موديول: ${unmapped.join(', ')}`)
  const byModule = {}
  for (const type of typesSeed) (byModule[registry.moduleOfRequestType({ code: type.code, destinationHandler: type.handler })] ??= []).push(type.code)
  assert.deepEqual(byModule, {
    leave: ['LEAVE', 'LEAVE_ANNUAL', 'LEAVE_SICK', 'LEAVE_CASUAL', 'LEAVE_UNPAID', 'LEAVE_MATERNITY', 'LEAVE_PATERNITY', 'LEAVE_HAJJ', 'LEAVE_MARRIAGE',
      'LEAVE_BEREAVEMENT', 'LEAVE_EXAM', 'LEAVE_COMPENSATORY', 'LEAVE_MODIFY_CANCEL', 'PERMISSION'],
    overtime: ['OVERTIME', 'OVERTIME_AUTO', 'HOLIDAY_WORK'],
    attendance: ['PUNCH_CORRECTION', 'REMOTE_WORK', 'BUSINESS_TRIP'],
    shifts: ['SHIFT_SWAP'],
    loans: ['LOAN', 'LOAN_INSTALLMENT_DEFER', 'EARLY_LOAN_SETTLEMENT'],
    payroll: ['SALARY_INCREASE', 'BONUS', 'PER_DIEM', 'DEDUCTION_OBJECTION', 'PAYROLL_DEDUCTION', 'PAYROLL_BONUS', 'BANK_ACCOUNT_CHANGE'],
    expenses: ['EXPENSE_CLAIM'],
    employees: ['PROMOTION', 'TEAM_TRANSFER', 'TITLE_CHANGE', 'CONTRACT_RENEWAL', 'CONTRACT_TYPE_CHANGE', 'PERSONAL_DATA_UPDATE', 'EMERGENCY_CONTACT'],
    // B2.11-ب: طلب «وظيفة جديدة / زيادة عدد» تبع موديول الوظائف المعتمدة (المقفول افتراضيًا)
    positions: ['POSITION_REQUEST'],
    // B3.2-أ: طلب «احتياج توظيف» تبع موديول التوظيف
    recruitment: ['RECRUITMENT_REQUISITION'],
    // B3.10: استفسارات مركز الخدمات تبع موديوله (المقفول افتراضيًا)
    helpdesk: ['INQUIRY_PAYROLL', 'INQUIRY_LEAVES', 'INQUIRY_DATA', 'INQUIRY_GENERAL'],
    // «تسجيل بس» من غير معالج: تبع محرك الطلبات نفسه (أساسي)
    requests: ['SECONDMENT', 'DEPENDENTS_UPDATE', 'DOCUMENT_RENEWAL', 'IT_EQUIPMENT', 'ACCESS_REQUEST', 'FACILITY_CARD', 'TRAINING_REQUEST', 'CERT_REIMBURSEMENT',
      'CONFERENCE', 'EDUCATION_ASSISTANCE', 'GRIEVANCE', 'WHISTLEBLOWING', 'PENALTY_OBJECTION', 'APPRAISAL_OBJECTION', 'SUGGESTION', 'HR_MEETING'],
    offboarding: ['RETIREMENT', 'RESIGNATION'],
    documents: ['LETTER_SALARY', 'LETTER_EMPLOYMENT', 'LETTER_EXPERIENCE', 'LETTER_NOC', 'LETTER_EMBASSY', 'LETTER_BANK_LOAN'],
    custody: ['CUSTODY_REQUEST', 'CUSTODY_RETURN', 'CUSTODY_TRANSFER', 'CUSTODY_LOSS_REPORT'],
  })
})

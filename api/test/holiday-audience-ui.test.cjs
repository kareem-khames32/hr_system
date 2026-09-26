'use strict'
// واجهة «تسري على» للعطلة الرسمية (طلب المالك 26 سبتمبر — ترحيل 070): تحويل قيمة منتقي الاستهداف الموحّد من/إلى شكل
// الخادم، ووصف «للكل / فرع المعادي / 3 موظفين»، وسياق التقويم بيقبل التخصيص السليم بس، وملخص النسخة مابيطبعش كائن خام،
// وشاشة العطلات بتبعت «تسري على» وبتعرضها في القائمة. SSR بلا خادم.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true, compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const React = require('../../node_modules/react')
const { renderToStaticMarkup } = require('../../node_modules/react-dom/server')
const audience = require('../../src/lib/holiday-audience')
const calendarApi = require('../../src/lib/payroll-calendar-api')
const root = path.resolve(__dirname, '../..')
const load = Module._load
Module._load = function (request, parent, isMain) { return load.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, parent, isMain) }
const { CalendarContextSummary } = require('../../src/components/PayrollCalendarChange')
Module._load = load
const src = file => fs.readFileSync(path.join(root, 'src', file), 'utf8')
const target = (level, extra = {}) => ({ level, branchId: null, departmentIds: [], teamIds: [], employeeIds: [], ...extra })

test('HAU-01: picker value ↔ server audience — company is everyone (null), only the chosen level list is sent, sorted and deduped', () => {
  assert.equal(audience.holidayTargetToAudience(target('company')), null)
  assert.equal(audience.holidayTargetToAudience(target('employees')), null, 'فرع مش متحدد = مفيش تخصيص')
  assert.deepEqual(audience.holidayTargetToAudience(target('branch', { branchId: 3, departmentIds: [5] })), { level: 'branch', branchId: 3 })
  assert.deepEqual(audience.holidayTargetToAudience(target('departments', { branchId: 3, departmentIds: [9, 5, 9], employeeIds: [1] })), { level: 'departments', branchId: 3, departmentIds: [5, 9] })
  assert.deepEqual(audience.holidayTargetToAudience(target('teams', { branchId: 3, departmentIds: [5], teamIds: [7] })), { level: 'teams', branchId: 3, teamIds: [7] })
  assert.deepEqual(audience.holidayTargetToAudience(target('employees', { branchId: 3, employeeIds: [12, 4] })), { level: 'employees', branchId: 3, employeeIds: [4, 12] })
  for (const value of [null, { level: 'branch', branchId: 3 }, { level: 'departments', branchId: 3, departmentIds: [5, 9] }, { level: 'teams', branchId: 3, teamIds: [7] },
    { level: 'employees', branchId: 3, employeeIds: [4, 12] }]) {
    assert.deepEqual(audience.holidayTargetToAudience(audience.holidayAudienceToTarget(value)), value, JSON.stringify(value))
  }
  assert.equal(audience.holidayTargetIncomplete(target('company')), false)
  assert.equal(audience.holidayTargetIncomplete(target('branch')), true)
  assert.equal(audience.holidayTargetIncomplete(target('branch', { branchId: 3 })), false)
  assert.equal(audience.holidayTargetIncomplete(target('employees', { branchId: 3 })), true)
  assert.equal(audience.holidayTargetIncomplete(target('teams', { branchId: 3, teamIds: [] })), true)
})

test('HAU-02: labels — «للكل», branch/department/team by name, employees by count; without names (version summary) by count only', () => {
  const names = { branches: [{ id: 3, name: 'المعادي' }, { id: 4, name: 'فرع الرياض' }], departments: [{ id: 5, name: 'المبيعات' }, { id: 9, name: 'المخازن' }],
    teams: [{ id: 7, name: 'فريق الجرد' }] }
  const describe = audience.describeHolidayAudience
  assert.equal(describe(null, names), 'للكل')
  assert.equal(describe({ level: 'branch', branchId: 3 }, names), 'فرع المعادي')
  assert.equal(describe({ level: 'branch', branchId: 4 }, names), 'فرع الرياض')
  assert.equal(describe({ level: 'departments', branchId: 3, departmentIds: [5] }, names), 'فرع المعادي — قسم المبيعات')
  assert.equal(describe({ level: 'departments', branchId: 3, departmentIds: [5, 9] }, names), 'فرع المعادي — أقسام: المبيعات، المخازن')
  assert.equal(describe({ level: 'teams', branchId: 3, teamIds: [7] }, names), 'فرع المعادي — فريق الجرد')
  assert.equal(describe({ level: 'employees', branchId: 3, employeeIds: [1, 2, 3] }, names), '3 موظفين')
  assert.equal(describe({ level: 'branch', branchId: 3 }), 'فرع كامل')
  assert.equal(describe({ level: 'departments', branchId: 3, departmentIds: [5, 9] }), 'قسمين')
  assert.equal(describe({ level: 'teams', branchId: 3, teamIds: [7] }), 'فريق واحد')
  assert.equal(describe({ level: 'employees', branchId: 3, employeeIds: [1] }), 'موظف واحد')
  assert.equal(audience.employeesCount(11), '11 موظف')
})

test('HAU-03: the calendar context accepts a well-formed audience and rejects a malformed one (never read as everyone)', () => {
  const context = holidays => ({ scope: 'GLOBAL', sourceId: 0, revision: 3, currentSourceHash: 'a'.repeat(64), effectiveFrom: '2026-09-01', legacyBaseline: false,
    currentMatchesHistory: true, current: { weekendDays: 'FRI,SAT', holidays, exceptions: [] } })
  const holiday = extra => ({ id: 4, name: 'عطلة اختبار', date: '2026-10-01', endDate: null, country: 'EG', ...extra })
  assert.doesNotThrow(() => calendarApi.validatePayrollCalendarContext(context([holiday(), holiday({ id: 5, audience: { level: 'employees', branchId: 2, employeeIds: [7, 8] } })]), 'GLOBAL', 0))
  for (const bad of [null, 'employees', { level: 'company' }, { level: 'branch' }, { level: 'teams', branchId: 2, teamIds: [] }, { level: 'teams', branchId: 2, teamIds: [7, 7] },
    { level: 'employees', branchId: 2, employeeIds: ['7'] }, { level: 'branch', branchId: 2, employeeIds: [7] }]) {
    assert.throws(() => calendarApi.validatePayrollCalendarContext(context([holiday({ audience: bad })]), 'GLOBAL', 0), undefined, JSON.stringify(bad))
  }
})

test('HAU-04: the version summary shows «تسري على» per holiday without printing raw objects', () => {
  const html = renderToStaticMarkup(React.createElement(CalendarContextSummary, { context: { scope: 'GLOBAL', sourceId: 0, revision: 3, currentSourceHash: 'a'.repeat(64),
    effectiveFrom: '2026-09-01', legacyBaseline: false, currentMatchesHistory: true, current: { weekendDays: 'FRI,SAT', exceptions: [], holidays: [
      { id: 4, name: 'عطلة للكل', date: '2026-10-01', endDate: null, country: 'EG' },
      { id: 5, name: 'عيد لموظفين', date: '2026-10-02', endDate: null, country: 'EG', audience: { level: 'employees', branchId: 2, employeeIds: [7, 8] } }] } } }))
  for (const text of ['عطلة للكل', 'تسري على: للكل', 'عيد لموظفين', 'تسري على: موظفين اتنين']) assert.ok(html.includes(text), text)
  assert.doesNotMatch(html, /\[object Object\]|undefined/)
})

test('HAU-05: the holidays screen offers the unified picker as «تسري على», sends the audience with the dated calendar change, and lists it', () => {
  const page = src('app/leaves/holidays/page.tsx')
  assert.match(page, /<OrgTargetPicker/)
  assert.match(page, /تسري على/)
  assert.match(page, /audience: holidayTargetToAudience\(formTarget\)/)
  assert.match(page, /calendarChange,\s*\n\s*\}/, 'التعديل لسه بتاريخ سريان وسبب (نسخة التقويم)')
  assert.match(page, /holidayAudienceToTarget\(audienceOf\(row\)\)/, 'التعديل بيبدأ من «تسري على» في نسخة التقويم الحالية')
  assert.match(page, /data-holiday-audience>/)
  for (const file of ['app/calendar/page.tsx', 'app/leaves/calendar/page.tsx']) assert.match(src(file), /audienceText/, file)
})

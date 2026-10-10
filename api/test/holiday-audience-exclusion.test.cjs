// B-ADD.2: «تسري على» للعطلة (ونفس الشكل لجمهور فترة الإضافي) — «الكل ماعدا…» جوه فرع، والإدارة بتشمل اللي تحتها، والمحفوظ القديم بنصه
// وبصمته بالحرف، وتحويل الواجهة بين الحقل الموحد وشكل العطلة.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
const { holidayAudienceFromInput, normalizeHolidayAudience, parseHolidayAudienceColumn, holidayAudienceColumn, holidayAudienceMatches, describeHolidayAudience,
  holidayAudienceNeedsOrg } = require('../src/attendance/holiday-audience')
const fail = message => { throw new Error(message) }
const m = (employeeId, branchId, departmentPath = [], teamId = null) => ({ employeeId, branchId, departmentPath, teamId })
const src = file => fs.readFileSync(path.join(apiRoot, '..', 'src', file), 'utf8').replace(/\r\n/g, '\n')

test('HAX-01: the stored shape — the old text is untouched, the exclusion is an optional sorted list, and it never rides on named employees', () => {
  // القديم بنصه (وبالتالي بصمة التقويم)
  for (const old of ['{"level":"branch","branchId":3}', '{"level":"departments","branchId":3,"departmentIds":[5,6]}', '{"level":"teams","branchId":3,"teamIds":[9]}',
    '{"level":"employees","branchId":3,"employeeIds":[11,12]}']) assert.equal(holidayAudienceColumn(parseHolidayAudienceColumn(old, fail)), old)
  // الجديد: المفتاح في الآخر ومرتّب
  assert.equal(holidayAudienceColumn(holidayAudienceFromInput({ level: 'departments', branchId: 3, departmentIds: [6, 5], excludeEmployeeIds: [9, 4, 9] })),
    '{"level":"departments","branchId":3,"departmentIds":[5,6],"excludeEmployeeIds":[4,9]}')
  assert.equal(holidayAudienceColumn(holidayAudienceFromInput({ level: 'branch', branchId: 3, excludeEmployeeIds: [7] })), '{"level":"branch","branchId":3,"excludeEmployeeIds":[7]}')
  // قايمة فاضية أو غايبة = من غير المفتاح
  assert.equal(holidayAudienceColumn(holidayAudienceFromInput({ level: 'teams', branchId: 3, teamIds: [9], excludeEmployeeIds: [] })), '{"level":"teams","branchId":3,"teamIds":[9]}')
  // الموظفين بالاسم: المستثنين بيتشالوا من المدخل، والمخزن بيهم مرفوض
  assert.equal(holidayAudienceColumn(holidayAudienceFromInput({ level: 'employees', branchId: 3, employeeIds: [11], excludeEmployeeIds: [5] })), '{"level":"employees","branchId":3,"employeeIds":[11]}')
  assert.throws(() => normalizeHolidayAudience({ level: 'employees', branchId: 3, employeeIds: [11], excludeEmployeeIds: [5] }, fail), /مالهمش مستثنين/)
  // المخزن التالف مايتقراش
  for (const bad of ['{"level":"branch","branchId":3,"excludeEmployeeIds":[]}', '{"level":"branch","branchId":3,"excludeEmployeeIds":[2,2]}', '{"level":"branch","branchId":3,"excludeEmployeeIds":"x"}',
    '{"level":"branch","branchId":3,"extra":1}', '{"level":"company","excludeEmployeeIds":[2]}']) assert.throws(() => parseHolidayAudienceColumn(bad, fail), Error, bad)
  // الشركة كلها: من غير مستثنين = للكل (NULL)، وبمستثنين مرفوض برسالته
  assert.equal(holidayAudienceFromInput({ level: 'company' }), null)
  assert.equal(holidayAudienceFromInput({ level: 'company', excludeEmployeeIds: [] }), null)
  assert.throws(() => holidayAudienceFromInput({ level: 'company', excludeEmployeeIds: [4] }), /اختار فرع واستثني منه/)
  assert.throws(() => holidayAudienceFromInput({ level: 'branch', branchId: 3, excludeEmployeeIds: 'x' }), /المستثنين/)
})

test('HAX-02: matching — the excluded employee is out at every level, an administration covers what is under it, and the branch calendar is unaffected', () => {
  const branch = { level: 'branch', branchId: 1, excludeEmployeeIds: [7] }
  assert.deepEqual([holidayAudienceMatches(branch, m(7, 1)), holidayAudienceMatches(branch, m(8, 1)), holidayAudienceMatches(branch, m(8, 2)), holidayAudienceMatches(branch, m(null, 1)),
    holidayAudienceMatches(branch, null)], [false, true, false, true, false])
  // الإدارة 10 فوق القسم 12: اختيار الإدارة بيشمل موظف القسم (مساره [12، 10])
  const administration = { level: 'departments', branchId: 1, departmentIds: [10], excludeEmployeeIds: [7] }
  assert.deepEqual([holidayAudienceMatches(administration, m(8, 1, [12, 10])), holidayAudienceMatches(administration, m(7, 1, [12, 10])), holidayAudienceMatches(administration, m(9, 1, [20])),
    holidayAudienceMatches(administration, m(null, 1))], [true, false, false, false])
  const team = { level: 'teams', branchId: 1, teamIds: [5], excludeEmployeeIds: [7] }
  assert.deepEqual([holidayAudienceMatches(team, m(8, 1, [], 5)), holidayAudienceMatches(team, m(7, 1, [], 5)), holidayAudienceMatches(team, m(8, 1, [], 6))], [true, false, false])
  // القديم زي ما هو: الموظف برقمه مهما اتنقل، والقسم بمساره من غير قيد فرع
  assert.equal(holidayAudienceMatches({ level: 'employees', branchId: 1, employeeIds: [8] }, m(8, 2)), true)
  assert.equal(holidayAudienceMatches({ level: 'departments', branchId: 1, departmentIds: [10] }, m(8, 2, [10])), true)
  assert.deepEqual([holidayAudienceNeedsOrg(branch), holidayAudienceNeedsOrg(administration), holidayAudienceNeedsOrg(team)], [false, true, true])
  assert.equal(describeHolidayAudience(administration, { branches: new Map([[1, 'المعادي']]), departments: new Map([[10, 'المبيعات']]) }), 'فرع المعادي — قسم المبيعات (ماعدا موظف واحد)')
  assert.equal(describeHolidayAudience({ level: 'branch', branchId: 1 }, { branches: new Map([[1, 'المعادي']]) }), 'فرع المعادي')
})

test('HAX-03: the screens — holidays and overtime periods use the unified field, and the converters keep one branch per audience', () => {
  const lib = src('lib/holiday-audience.ts')
  assert.match(lib, /export function storedOfHolidayAudience\(/)
  assert.match(lib, /export function holidayInputOfStored\(/)
  assert.match(lib, /if \(where\.mode === 'branches'\) return ids\.length === 1 \? \{ level: 'branch', branchId: ids\[0\], \.\.\.extra \} : undefined/, 'أكتر من فرع مش من شكل العطلة')
  assert.match(lib, /if \(where\.mode === 'units'\) return \{ level: 'departments', branchId, departmentIds: ids, \.\.\.extra \}/, 'الإدارة والقسم = وحدة بتشمل اللي تحتها')
  assert.match(lib, /const excluded = Object\.prototype\.hasOwnProperty\.call\(row, 'excludeEmployeeIds'\)/, 'العطلة اللي عليها مستثنين مقروءة في الشاشة')
  const holidays = src('app/leaves/holidays/page.tsx')
  assert.match(holidays, /<OrgAudienceField value=\{formAudience\} disabled=\{saving\} multiBranch=\{false\}/)
  assert.match(holidays, /if \(!formAudienceComplete \|\| holidayInputOfStored\(formAudience\) === undefined\) \{/)
  const overtime = src('app/attendance/overtime/page.tsx')
  assert.match(overtime, /data-overtime-period-audience/)
  assert.match(overtime, /input\.level === 'branch' && !input\.excludeEmployeeIds\?\.length \? \{ branchId: input\.branchId \} : \{ audience: input \}/, 'الفرع كله من غير مستثنين = فترة فرع زي زمان')
  assert.match(overtime, /p\.audienceText \|\| branchName\(p\.branchId\)/)
  const service = fs.readFileSync(path.join(apiRoot, 'src/attendance/attendance.service.ts'), 'utf8').replace(/\r\n/g, '\n')
  assert.match(service, /if \(audience === 'INVALID'\) return p\.effect === 'CLOSED'/, 'الجمهور التالف مايفتحش إضافي')
  assert.match(service, /const covering = await this\.coveringOvertimePeriods\(date, calendar\.branchId!, employeeId\)/)
  assert.match(service, /const window = await this\.overtimeWindow\(date, calendar\.branchId!, employeeId\)/)
  assert.match(fs.readFileSync(path.join(apiRoot, 'src/attendance/attendance.entities.ts'), 'utf8'), /@Entity\('overtime_period_audiences'\)/)
})

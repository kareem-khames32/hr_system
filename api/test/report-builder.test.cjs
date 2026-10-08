// B5.9 — بانِي التقارير: القاموس (مصادر وأعمدة بتعبيرات ثابتة)، صحة التعريف، بناء الاستعلام (مفاتيح من القاموس وقيم معاملات)، ومصدر الكود (التشغيل بصلاحيات القارئ) والواجهة.
// حساب نقي بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const rules = require('../src/reports/report-builder')
const registry = require('../src/modules-registry/registry')
const { PERMISSIONS: PERMISSION_LABELS } = require('../src/auth/permissions')
const read = rel => fs.readFileSync(path.join(apiRoot, 'src', rel), 'utf8').replace(/\r\n/g, '\n')
const web = rel => fs.readFileSync(path.join(apiRoot, '..', 'src', rel), 'utf8').replace(/\r\n/g, '\n')
const people = (columns, extra = {}) => ({ source: 'employees', columns, ...extra })

test('RBU-01: القاموس — خمس مصادر بصلاحيات وموديولات مسجّلة، كل مصدر مربوط بالموظف (النطاق على e.[branchId])، ومفيش عمود حساس من غير صلاحية', () => {
  assert.deepEqual(rules.BUILDER_SOURCES.map(source => [source.key, source.perm, source.modules]),
    [['employees', 'employees.view', ['employees']], ['attendance', 'attendance.view_all', ['attendance']], ['leaves', 'leaves.view_all', ['leave']], ['requests', 'requests.view_all', ['requests']], ['payroll', 'payroll.view', ['payroll']]])
  for (const source of rules.BUILDER_SOURCES) {
    assert.ok(Object.prototype.hasOwnProperty.call(PERMISSION_LABELS, source.perm), source.perm)
    assert.ok(source.modules.every(key => registry.isModuleKey(key)), source.key)
    assert.match(source.from, /dbo\.employees e\b/, source.key)
    assert.equal(new Set(source.columns.map(column => column.key)).size, source.columns.length, source.key)
    for (const column of source.columns) {
      assert.match(column.sql, /^(CONVERT\(date, )?[a-z]\.\[[A-Za-z]+\]\)?$/, `${source.key}.${column.key}`)
      if (column.perm) assert.ok(Object.prototype.hasOwnProperty.call(PERMISSION_LABELS, column.perm), column.perm)
      // المبالغ مابتتجمعش (العملة بتختلف بالفرع)، والتجميع الرقمي للأرقام بس
      if (column.sum) assert.equal(column.type, 'number', `${source.key}.${column.key}`)
    }
  }
  const employees = rules.sourceOf('employees')
  assert.deepEqual(employees.columns.filter(column => column.type === 'money').map(column => [column.key, column.perm]), [['basicSalary', 'payroll.view']])
  // مفيش عمود للهوية ولا البنك ولا التواصل في أي مصدر
  assert.equal(rules.BUILDER_SOURCES.some(source => source.columns.some(column => /nationalId|passport|iban|bank|phone|email|address|birth/i.test(column.sql))), false)
  // السرية بحكم المحرك: التعريف الفعلي، والنوع العام، والموروثة لتأجيل قسط السلفة
  const requestsSource = rules.sourceOf('requests')
  assert.match(requestsSource.from, /INNER JOIN dbo\.request_types t ON t\.\[code\] = COALESCE\(NULLIF\(r\.\[definitionCode\], N''\), r\.\[typeCode\]\)/)
  assert.equal(requestsSource.where, "ISNULL(t.[isConfidential], 0) = 0 AND NOT EXISTS (SELECT 1 FROM dbo.request_types bt WHERE bt.[code] = r.[typeCode] AND bt.[isConfidential] = 1)" +
    " AND NOT (t.[code] = N'LOAN_INSTALLMENT_DEFER' AND EXISTS (SELECT 1 FROM dbo.request_types lt WHERE lt.[code] = N'LOAN' AND lt.[isConfidential] = 1))")
  assert.match(rules.sourceOf('payroll').where, /r\.\[status\] IN \(N'APPROVED', N'PAID'\) AND NOT EXISTS \(SELECT 1 FROM dbo\.\[payroll_run_reversal_lines\]/)
  assert.deepEqual([rules.sourceOf('users'), rules.sourceOf(undefined)], [null, null])
})

test('RBU-02: التعريف — مصدر وأعمدة من القاموس، فلاتر بعامل وقيمة يناسبوا نوع العمود، وتجميع بعمود بيتجمّع بيه', () => {
  assert.deepEqual(rules.definitionOf(people(['fullName', 'joinDate'], { filters: [{ column: 'jobTitle', op: 'contains', value: '  محاسب ' }, { column: 'joinDate', op: 'gte', value: '2026-01-01' }], groupBy: '' })).definition,
    { source: 'employees', columns: ['fullName', 'joinDate'], filters: [{ column: 'jobTitle', op: 'contains', value: 'محاسب' }, { column: 'joinDate', op: 'gte', value: '2026-01-01' }], groupBy: null })
  const issue = body => rules.definitionOf(body).error
  assert.deepEqual([issue(null), issue({ source: 'constructor', columns: ['x'] }), issue(people('fullName')), issue(people(Array.from({ length: 13 }, (_, index) => `c${index}`))), issue(people(['__proto__'])),
    issue(people(['fullName'], { filters: 'x' })), issue(people(['fullName'], { filters: [null] })), issue(people(['fullName'], { filters: [{ column: 'fullName', op: 'like', value: 'x' }] })),
    issue(people(['fullName'], { filters: [{ column: 'fullName', op: 'eq', value: '  ' }] })), issue(people(['fullName'], { filters: [{ column: 'fullName', op: 'eq', value: 'x'.repeat(201) }] })),
    issue(people(['fullName'], { filters: [{ column: 'joinDate', op: 'contains', value: '2026' }] })), issue(people(['fullName'], { filters: [{ column: 'basicSalary', op: 'gte', value: Infinity }] })),
    issue(people(['fullName'], { groupBy: 'nope' })), issue(people(['fullName'], { groupBy: 'jobTitle' }))],
  ['اختار مصدر التقرير', 'اختار مصدر التقرير', 'اختار من عمود لحد 12 عمود', 'اختار من عمود لحد 12 عمود', 'عمود من الأعمدة مش في المصدر أو مكرر', 'الفلاتر قايمة لحد 8', 'فلتر على عمود مش في المصدر',
    'الفلتر على «اسم الموظف» بعامل مش مناسب', 'قيمة الفلتر على «اسم الموظف» مش صحيحة', 'قيمة الفلتر على «اسم الموظف» مش صحيحة', 'الفلتر على «تاريخ التعيين» بعامل مش مناسب', 'قيمة الفلتر على «الراتب الأساسي» مش صحيحة',
    'التجميع بعمود مش بيتجمّع بيه', null])
  // كل عمود التعريف بيلمسه: معروض، أو في فلتر، أو في تجميع
  const touched = rules.definitionColumns({ source: 'employees', columns: ['fullName'], filters: [{ column: 'basicSalary', op: 'gte', value: 1 }], groupBy: 'jobTitle' }).map(column => column.key).sort()
  assert.deepEqual(touched, ['basicSalary', 'fullName', 'jobTitle'])
  assert.deepEqual([rules.definitionName('  تقرير   الشهر '), rules.definitionName('ت'), rules.definitionName(5), rules.sharedRolesOf(undefined), rules.sharedRolesOf(['hr', 'hr', 'it_1']), rules.sharedRolesOf(['a b']), rules.sharedRolesOf('hr'),
    rules.sharedRolesOf(Array.from({ length: 11 }, (_, index) => `r${index}`)), rules.parseSharedRoles('hr,it'), rules.parseSharedRoles(null)],
  ['تقرير الشهر', null, null, [], ['hr', 'it_1'], null, null, null, ['hr', 'it'], []])
})

test('RBU-03: الاستعلام — تعبيرات القاموس بس، وكل قيمة معامل، وحروف LIKE بتتهرّب، والنطاق والشرط الثابت دايمًا في WHERE، والتجميع بالعدد ومجموع الأرقام', () => {
  const plain = rules.buildQuery(rules.definitionOf(people(['fullName', 'joinDate', 'basicSalary'], { filters: [{ column: 'jobTitle', op: 'contains', value: "50%_[x]\\'; DROP" }, { column: 'joinDate', op: 'gte', value: '2026-01-01' }] })).definition,
    'e.[branchId] IN (@0, @1)', [3, 4])
  assert.equal(plain.sql, `SELECT TOP (2001) e.[fullName] AS [c0], CONVERT(varchar(10), e.[joinDate], 23) AS [c1], CONVERT(varchar(40), e.[basicSalary]) AS [c2] FROM ${rules.sourceOf('employees').from} WHERE 1 = 1 AND e.[branchId] IN (@0, @1) AND e.[jobTitle] LIKE @2 ESCAPE N'\\' AND e.[joinDate] >= @3 ORDER BY e.[employeeCode], e.[id]`)
  assert.deepEqual([plain.params, plain.headers.map(header => header.key)], [[3, 4, "%50\\%\\_\\[x]\\\\'; DROP%", '2026-01-01'], ['fullName', 'joinDate', 'basicSalary']])
  // نص المستخدم مابيدخلش الاستعلام
  assert.equal(plain.sql.includes('DROP'), false)
  const grouped = rules.buildQuery(rules.definitionOf({ source: 'attendance', columns: ['fullName', 'workMinutes', 'lateMinutes'], groupBy: 'date', filters: [{ column: 'status', op: 'eq', value: 'late' }] }).definition, '', [])
  assert.equal(grouped.sql, `SELECT TOP (2001) CONVERT(varchar(10), a.[date], 23) AS [c0], COUNT(*) AS [c1], SUM(a.[workMinutes]) AS [c2], SUM(a.[lateMinutes]) AS [c3] FROM ${rules.sourceOf('attendance').from} WHERE 1 = 1 AND a.[status] = @0 GROUP BY a.[date] ORDER BY a.[date]`)
  assert.deepEqual([grouped.params, grouped.headers.map(header => [header.key, header.label, header.type])], [['late'], [['date', 'اليوم', 'date'], ['count', 'العدد', 'number'], ['workMinutes', 'مجموع دقايق العمل', 'number'], ['lateMinutes', 'مجموع دقايق التأخير', 'number']]])
  // الشرط الثابت للمصدر (السرّي برّه) بيفضل مع النطاق والفلاتر
  const requests = rules.buildQuery(rules.definitionOf({ source: 'requests', columns: ['typeName'], groupBy: 'createdOn' }).definition, '1 = 0', [])
  assert.ok(requests.sql.includes(` WHERE ${rules.sourceOf('requests').where} AND 1 = 0 GROUP BY CONVERT(date, r.[createdAt]) ORDER BY CONVERT(date, r.[createdAt])`) && requests.sql.endsWith('ORDER BY CONVERT(date, r.[createdAt])'))
  assert.deepEqual([rules.ROWS_MAX, rules.COLUMNS_MAX, rules.FILTERS_MAX, rules.DEFINITIONS_MAX], [2000, 12, 8, 50])
})

test('RBU-04: سجل الموديولات — ميزة reports.builder مقفولة افتراضيًا بمسار شاشتها، وشاشة العرض القديمة زي ما هي', () => {
  const feature = registry.MODULE_FEATURES[rules.REPORT_BUILDER_FEATURE]
  assert.deepEqual([feature.module, feature.default, feature.routes], ['reports', false, ['/reports/builder']])
  assert.deepEqual([registry.routeOwner('/reports/builder').feature, registry.routeOwner('/reports').module, registry.DEMO_ROUTES.includes('/reports/custom')], [rules.REPORT_BUILDER_FEATURE, 'reports', true])
})

test('RBU-05: مصدر الكود — التشغيل بصلاحيات القارئ ونطاقه (حتى المتشارك)، وصلاحية الحقل على كل عمود التعريف بيلمسه، والحفظ بصلاحيته تحت قفل مدى', () => {
  const service = read('reports/report-builder.service.ts'), controller = read('reports/report-builder.controller.ts')
  assert.match(service, /definitionColumns\(definition\)\.every\(column => !column\.perm \|\| userHasPerm\(user, column\.perm\)\)/)
  assert.match(service, /if \(!\(await this\.allowed\(user, definition\)\)\) throw new ForbiddenException\(refusal\)\n\s+const params: unknown\[\] = \[\]\n\s+const query = buildQuery\(definition, branchScopeSql\('e\.\[branchId\]', branchScopeOf\(user\), params\), params\)/)
  // المتشارك: «مش موجود» لغير صاحبه ودوره، وبعدها نفس حكم القارئ
  assert.match(service, /if \(!row \|\| \(row\.ownerUserId !== user\.sub && !parseSharedRoles\(row\.sharedRoles\)\.includes\(user\.role\)\)\) throw new NotFoundException\(DEFINITION_NOT_FOUND\)/)
  assert.match(service, /this\.execute\(user, definition, DEFINITION_UNAVAILABLE\)/)
  // مفيش نص من المستخدم في SQL: الاستعلام الوحيد المبني هو buildQuery
  assert.equal((service.match(/\.query\(/g) || []).length, 4)
  assert.match(service, /FROM dbo\.report_definitions WITH \(UPDLOCK, HOLDLOCK\) WHERE \[ownerUserId\] = @0', \[user\.sub\]\)/)
  // حكم الصلاحية قبل المعاملة (نداء خدمة الموديولات برّه transaction)
  const save = service.slice(service.indexOf('async save('), service.indexOf('async remove('))
  assert.ok(save.indexOf('await this.allowed(user, definition)') < save.indexOf('this.ds.transaction('))
  assert.doesNotMatch(save.slice(save.indexOf('this.ds.transaction(')), /this\.modules|this\.allowed/)
  assert.match(controller, /@RequireModule\('reports'\)\n@RequireFeature\('reports\.builder'\)\n@UseGuards\(JwtAuthGuard, RolesGuard\)\n@Perm\('reports\.view'\)\n@Controller\('reports\/builder'\)/)
  assert.equal((controller.match(/@Perm\('reports\.save'\)\n  @(Post|Patch|Delete)\([^)]*\)\n  \w+\([^\n]+\n    this\.writer\(user\)/g) || []).length, 4)
  // صلاحية العرض بتفتح GET بس
  assert.doesNotMatch(controller.replace(/@Perm\('reports\.save'\)\n  @(Post|Patch|Delete)\(/g, ''), /@(Post|Patch|Put|Delete)\(/)
})

test('RBU-06: الواجهة — شاشة البانِي بعنوانها في القايمة، والقاموس من الخادم', () => {
  const page = web('app/reports/builder/page.tsx'), sidebar = web('components/layout/Sidebar.tsx'), titles = web('components/layout/pageTitles.ts')
  assert.match(sidebar, /\{ label: 'بانِي التقارير', href: '\/reports\/builder' \}/)
  assert.match(titles, /\['\/reports\/builder', 'بانِي التقارير'\]/)
  assert.match(page, />\s*بانِي التقارير\s*<\/h1>/)
  assert.match(page, /apiFetch<Overview>\(B\)/)
  // الشاشة مافيهاش أسماء جداول ولا تعبيرات
  assert.doesNotMatch(page, /dbo\.|e\.\[|SELECT /)
})

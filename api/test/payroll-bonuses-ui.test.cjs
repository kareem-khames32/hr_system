// C4 / الخطوة 27: شاشات المكافآت — فحص الإدخال في الواجهة، شارة «معتمد — بانتظار الصرف» و«مصروف»، والاقتراح الفردي والجماعي
// بمعاينة واستبعاد، وبوابة الكتالوج بصلاحية، وتسميات طلبات BONUS القديمة (COMPLETED ليس «مصروف»). منطق الواجهة ونصوصها فقط؛ لا SQL ولا خدمة.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true,
  compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const ui = require('../../src/lib/bonuses-api')
const deductionsUi = require('../../src/lib/deductions-api')
const root = path.resolve(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

const spot = { id: 2, calcMethod: 'FIXED_AMOUNT' }
const valid = { bonusTypeId: 2, inputValue: '250', reason: 'أداء متميز في تسليم مشروع الربع الثالث', targetPeriod: '2026-09' }

test('input check before sending: type, positive value, two decimals for a fixed amount, reason length, target payroll month', () => {
  assert.equal(ui.bonusInputError(valid, 20, spot), null)
  assert.equal(ui.bonusInputError({ ...valid, bonusTypeId: 0 }, 20, spot), 'اختر نوع المكافأة من الكتالوج.')
  assert.equal(ui.bonusInputError({ ...valid, inputValue: '0' }, 20, spot), 'اكتب قيمة موجبة للمكافأة.')
  assert.equal(ui.bonusInputError({ ...valid, inputValue: '-5' }, 20, spot), 'اكتب قيمة موجبة للمكافأة.')
  assert.equal(ui.bonusInputError({ ...valid, inputValue: '10.001' }, 20, spot), 'المبلغ بمنزلتين عشريتين على الأكثر.')
  assert.equal(ui.bonusInputError({ ...valid, inputValue: '0.25' }, 20, { id: 1, calcMethod: 'DAYS_OF_SALARY' }), null, 'days accept a quarter')
  assert.equal(ui.bonusInputError({ ...valid, reason: 'قصير' }, 20, spot), 'اكتب سبب المكافأة (20 حرفًا على الأقل).')
  assert.equal(ui.bonusInputError({ ...valid, targetPeriod: '2026-13' }, 20, spot), 'حدد شهر المسير المستهدف.')
  assert.equal(ui.bonusInputError({ ...valid, targetPeriod: '' }, 20, spot), 'حدد شهر المسير المستهدف.')
})

test('status badge: «معتمد — بانتظار الصرف» until the ledger entry is consumed by a paid run, then the paid colour; one money formatter with deductions', () => {
  assert.equal(ui.BONUS_STATUS_META.APPROVED.label, 'معتمد — بانتظار الصرف')
  assert.equal(ui.bonusBadgeClass('APPROVED', 'AWAITING_PAYROLL'), ui.BONUS_STATUS_META.APPROVED.className)
  assert.equal(ui.bonusBadgeClass('APPROVED', 'RESERVED'), ui.BONUS_STATUS_META.APPROVED.className)
  assert.equal(ui.bonusBadgeClass('APPROVED', 'PAID'), 'bg-success-100 text-success-700')
  assert.equal(ui.bonusBadgeClass('IN_APPROVAL', null), ui.BONUS_STATUS_META.IN_APPROVAL.className)
  assert.equal(ui.formatBonusMoney, deductionsUi.formatDeductionMoney)
  assert.deepEqual(Object.keys(ui.BONUS_ROLE_LABELS).sort(), ['BRANCH_MANAGER', 'DEPARTMENT_MANAGER', 'DIRECT_MANAGER', 'EXECUTIVE', 'HR', 'TEAM_LEADER'])
})

test('API client: every call goes through apiFetch, bulk submits the preview hash, decisions carry the expected revision', () => {
  const lib = read('src/lib/bonuses-api.ts')
  assert.doesNotMatch(lib, /\bfetch\(/, 'API calls go through apiFetch only')
  for (const text of ["'/bonuses/preview'", "'/bonuses/bulk'", "{ ...input, selection, previewHash }", "post<BonusView>('/bonuses', input)", "'/bonuses/mine'",
    'expectedRevision: row.revision', '/withdraw`', '/cancel`', '/reverse`']) {
    assert.ok(lib.includes(text), text)
  }
})

test('workspace (money-requests simplification): one selection list (an employee is a group of one), a team, a department or a branch; «إرسال» previews internally and sends that preview hash; the table appears only when somebody is excluded or refused; catalog behind bonuses.manage', () => {
  const workspace = read('src/components/payroll/BonusesWorkspace.tsx')
  for (const text of ["EMPLOYEES: 'موظف أو مجموعة مختارة'", "TEAM: 'فريق'", "DEPARTMENT: 'قسم (مع أقسامه الفرعية)'", "BRANCH: 'فرع'",
    'إرسال للاعتماد', "'استبعاد' : 'إرجاع'", 'excludeEmployeeIds: [...excluded]', "setCanManage(can('bonuses.manage'))", '{canManage && <button',
    'لا مكافأة لنفسك ولا لمن يعلوك', 'شهر المسير المستهدف', 'submitBonusBatch(input, selection, fresh.previewHash)', 'err.details?.preview',
    'fresh = preview && !stale ? preview : await previewBonuses(input, selection)',
    '{preview && (preview.totals.failed > 0 || preview.totals.excluded > 0) && (',
    'إجمالي المجموعة ({preview.totals.ready} موظف)']) {
    assert.ok(workspace.includes(text), text)
  }
  // «مكافأة فردية» المنفصلة و«معاينة الأرقام» كخطوة ثانية لم يعودا
  for (const gone of ['SINGLE', 'معاينة الأرقام', 'singleId', 'أعد المعاينة بعد آخر تعديل قبل الإرسال.']) {
    assert.ok(!workspace.includes(gone), gone)
  }
  // رابط «بانتظار موافقتي» من صندوق الموافقات يفتح الشاشة على العرض المطلوب
  assert.ok(workspace.includes("if (view === 'pending_me' || view === 'created' || view === 'all') setFilters(value => ({ ...value, view }))"))
  // الشاشة لا تقرر شيئًا ماليًا: لا تنسيق أرقام محلي مباشر ولا حساب مبلغ في الواجهة
  assert.doesNotMatch(workspace, /toLocaleString\(/)
  assert.doesNotMatch(workspace, /Number\([^)]*\)\s*\*/, 'no amount arithmetic in the screen')
})

test('money requests (B3/B4): the financial catalog cards open the existing workspaces, the generic engine refuses them, and the audience gates creating', () => {
  const requests = read('src/app/requests/page.tsx')
  assert.ok(requests.includes("if (code === 'PAYROLL_DEDUCTION') return can('deductions.manage') ? '/payroll/deductions?tab=create' : '/my/deductions?tab=create'"))
  assert.ok(requests.includes("if (code === 'PAYROLL_BONUS') return can('bonuses.manage') ? '/payroll/bonuses?tab=create' : '/my/bonuses?tab=create'"))
  assert.ok(requests.includes('const workspace = moneyWorkspaceRoute(t.code)'), 'the card routes instead of opening a generic form')
  const engine = read('api/src/requests/requests.service.ts')
  assert.ok(engine.includes("PAYROLL_DEDUCTION: 'الخصم يُرفع من شاشة الخصومات"), 'the generic engine refuses with a message that names the screen')
  assert.ok(engine.includes("PAYROLL_BONUS: 'المكافأة تُرفع من شاشة المكافآت"))
  // كلا الكارتين يفتح تبويب الإنشاء فعلاً: كل مساحة تقرأ ?tab=create بنفسها،
  // فرابط /my/bonuses?tab=create يعمل مثل /my/deductions?tab=create بلا تمرير prop من الصفحة.
  assert.ok(read('src/components/payroll/BonusesWorkspace.tsx').includes("(initialTab === 'create' || urlParam('tab') === 'create') && value.types.length > 0"))
  assert.ok(read('src/components/payroll/TypedDeductionsWorkspace.tsx').includes("urlParam('tab') === 'create' && value.types.length > 0"))
  // مقيّم جمهور واحد لا اثنين: محرك الطلبات وشاشتا المال يسألون نفس الدالة بنفس الاستثناءات
  const audience = read('api/src/requests/request-audience.ts')
  assert.ok(audience.includes('export function requestAudienceAllows('))
  // ب4: المالك وحده خارج القيد في البابين؛ بانِي الأنواع يرى الكتالوج كله ولا يقدّم نوعًا يستثنيه جمهوره
  assert.ok(audience.includes("if (subject.role === 'super_admin' || permissions.includes('*')) return true"), 'owner bypass at both doors')
  assert.ok(audience.includes("if (purpose === 'catalog' && permissions.includes('request_types.manage')) return true"), 'the type builder bypass is catalog-only')
  assert.ok(engine.includes("this.audienceAllows(type, user, requester, 'submit')"), 'submission asks with the submit purpose')
  assert.ok(engine.includes('requestAudienceAllows(type.visibleTo, audienceSubjectOf(user, emp), purpose)'), 'the engine delegates to the shared evaluator')
  // ج1: التقديم نيابةً عن موظف آخر لا يوقفه جمهور النوع
  assert.ok(engine.includes("if (requesterId === actorEmployeeId && !this.audienceAllows(type, user, requester, 'submit'))"))
  const deductions = read('api/src/payroll/typed-deductions.service.ts')
  assert.ok(deductions.includes("from '../requests/request-audience'"), 'the money screens reuse the engine evaluator')
  assert.ok(deductions.includes("audienceSubjectOf(user, self), 'submit'"), 'the money screens enforce the audience at submission too')
  assert.ok(deductions.includes('async assertMoneyRequestVisible(em: EntityManager, user: JwtPayload, typeCode: string, label: string)'), 'one shared audience helper')
  assert.ok(deductions.includes("await this.assertMoneyRequestVisible(em, user, 'PAYROLL_DEDUCTION', 'الخصم')"))
  assert.ok(read('api/src/payroll/bonuses.service.ts').includes("await this.org.assertMoneyRequestVisible(em, user, 'PAYROLL_BONUS', 'المكافأة')"))
})

test('B4: the seeded money types match the live rows — one row each, no approval chain, and an audience limited to the people the owner picks', () => {
  const { typesSeed, MONEY_REQUEST_AUDIENCE } = require('../src/seed/requests-seed.data')
  for (const code of ['PAYROLL_DEDUCTION', 'PAYROLL_BONUS']) {
    const rows = typesSeed.filter(row => row.code === code)
    assert.equal(rows.length, 1, `${code}: صف واحد لا اثنان`)
    assert.equal(rows[0].chain, null, `${code}: بلا سلسلة اعتماد — الإنشاء في شاشته`)
    assert.equal(rows[0].visibleTo, MONEY_REQUEST_AUDIENCE, code)
  }
  assert.deepEqual(JSON.parse(MONEY_REQUEST_AUDIENCE), { mode: 'roles', ids: ['super_admin', 'hr_manager', 'branch_manager'] })
  assert.ok(read('api/src/seed/seed-requests.ts').includes('if (t.chain === null) {'), 'the seeder creates no empty chain for them')
  const migration = read('docs/migrations/payroll/20260916_039_money_request_audience_and_exemption_threshold.sql')
  assert.ok(migration.includes('{"mode":"roles","ids":["super_admin","hr_manager","branch_manager"]}'), 'the migration ships the same audience')
  const statements = migration.split('\n').filter(line => !line.trim().startsWith('--')).join('\n')
  assert.ok(!/\b(DROP|DELETE|TRUNCATE)\b/.test(statements), 'الترحيل إضافي فقط')
})

test('pages: /payroll/bonuses inside MainLayout with the admin workspace, opened prefilled from the run («مكافأة»), without the legacy BONUS requests table; /my/bonuses shows the employee his bonuses plus the manager workspace', () => {
  const admin = read('src/app/payroll/bonuses/page.tsx')
  for (const text of ['<MainLayout>', '<BonusesWorkspace currency={currency} mode="admin"', "params.get('tab') === 'create'",
    'initialTab={initial.tab ?? undefined} initialEmployeeId={initial.employeeId} initialPeriod={initial.period}']) {
    assert.ok(admin.includes(text), text)
  }
  // تبسيط الرواتب: جدول طلبات المكافآت القديمة من محرك الطلبات لا يُعرض (الطلبات القديمة باقية في قاعدة البيانات)
  assert.doesNotMatch(admin, /طلبات المكافآت القديمة|COMPLETED:/)
  // تغيير نوع المكافأة لا يُسقط الموظف القادم من رابط المسير: يُعاد اختياره متى كان داخل نطاق النوع الجديد
  const workspace = read('src/components/payroll/BonusesWorkspace.tsx')
  assert.ok(workspace.includes('if (selected.size === 1) setPendingEmployeeId([...selected][0])'), 'changing the bonus type keeps the chosen employee')
  assert.ok(workspace.includes("setSelectionMode('EMPLOYEES'); setSelected(new Set([pendingEmployeeId]))"))
  assert.doesNotMatch(admin, /label: 'مصروف'/, 'a legacy approved bonus is recorded in the ledger, not paid')
  assert.doesNotMatch(admin, /createRequest|submitRequest/, 'no new bonus through the generic requests engine')
  const mine = read('src/app/my/bonuses/page.tsx')
  for (const text of ['<MainLayout>', 'fetchMyBonuses()', '<BonusesWorkspace currency={currency} mode="manager" />', 'bonusBadgeClass(row.status, row.payout?.state)']) {
    assert.ok(mine.includes(text), text)
  }
  for (const file of ['src/app/payroll/bonuses/page.tsx', 'src/app/my/bonuses/page.tsx', 'src/lib/bonuses-api.ts']) assert.doesNotMatch(read(file), /toLocaleString\(/, file)
  const sidebar = read('src/components/layout/Sidebar.tsx')
  assert.ok(sidebar.includes("href: '/payroll/bonuses'") && sidebar.includes("href: '/my/bonuses'"))
  const breakdown = read('src/components/PayrollObligationBreakdown.tsx')
  assert.ok(breakdown.includes("can('bonuses.view') ? `/payroll/bonuses?request=${row.bonus.requestId}` : '/my/bonuses'"), 'payslip line links to its bonus request')
})

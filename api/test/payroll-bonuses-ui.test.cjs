// C4 / الخطوة 27: شاشات المكافآت — فحص الإدخال في الواجهة، شارة «معتمد — بانتظار الصرف» و«مصروف»، والاقتراح الفردي والجماعي
// بمعاينة واستبعاد، وبوابة الكتالوج بصلاحية، وتسميات طلبات BONUS القديمة (COMPLETED ليس «مصروف»). منطق الواجهة ونصوصها فقط؛ لا SQL ولا خدمة.
// وقاعدة المالك: «مكافأة» على صف المسير بتفتح نافذة مكانها ولا توديش شاشة تانية. (الملفات على القرص CRLF — تُطبّع قبل الفحص)
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true,
  compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const ui = require('../../src/lib/bonuses-api')
const deductionsUi = require('../../src/lib/deductions-api')
const root = path.resolve(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')

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
  // «خصم» لم يعد ينتقل لشاشة أخرى: نموذجه الحقيقي داخل شاشة الطلبات (deduction-request-ui.test.cjs)
  assert.ok(!requests.includes("if (code === 'PAYROLL_DEDUCTION')"), 'the deduction card no longer routes away')
  assert.ok(requests.includes('<DeductionRequestForm onSubmitted={load} />'), 'the deduction card opens its own form inline')
  assert.ok(requests.includes("if (code === 'PAYROLL_BONUS') return can('bonuses.manage') ? '/payroll/bonuses?tab=create' : '/my/bonuses?tab=create'"))
  assert.ok(requests.includes('const workspace = moneyWorkspaceRoute(t.code)'), 'the bonus card routes instead of opening a generic form')
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
  assert.ok(engine.includes("this.audienceAllows(type, user, requester, 'submit', positions)"), 'submission asks with the submit purpose')
  assert.ok(engine.includes('requestAudienceAllows(type.visibleTo, { ...audienceSubjectOf(user, emp), positions }, purpose)'), 'the engine delegates to the shared evaluator')
  // ج1: التقديم نيابةً عن موظف آخر لا يوقفه جمهور النوع
  assert.ok(engine.includes('if (requesterId === actorEmployeeId) {'))
  // «حسب المنصب»: مدير القسم وقائد الفريق ومدير الفرع يُعرفون من الهيكل لا من الدور
  assert.ok(audience.includes("case 'positions':"), 'position-based audience')
  assert.ok(read('api/src/requests/request-audience-positions.ts').includes('export async function orgPositionsOf('))
  const deductions = read('api/src/payroll/typed-deductions.service.ts')
  assert.ok(deductions.includes("from '../requests/request-audience'"), 'the money screens reuse the engine evaluator')
  assert.ok(deductions.includes("{ ...audienceSubjectOf(user, self), positions }, 'submit'"), 'the money screens enforce the audience at submission too')
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
  assert.deepEqual(JSON.parse(MONEY_REQUEST_AUDIENCE), { mode: 'positions', ids: ['DEPARTMENT_MANAGERS', 'TEAM_LEADERS', 'BRANCH_MANAGERS', 'hr_manager', 'executive'] })
  assert.ok(read('api/src/seed/seed-requests.ts').includes('if (t.chain === null) {'), 'the seeder creates no empty chain for them')
  const migration = read('docs/migrations/payroll/20260916_041_money_request_audience_by_position.sql')
  assert.ok(migration.includes(MONEY_REQUEST_AUDIENCE), 'the migration ships the same audience')
  const statements = migration.split('\n').filter(line => !line.trim().startsWith('--')).join('\n')
  assert.ok(!/\b(DROP|DELETE|TRUNCATE)\b/.test(statements), 'الترحيل إضافي فقط')
})

// شاشة المكافآت نفسها لم تتغير: تبقى شاشة المجموعات، وتُفتح جاهزة بالموظف والشهر من الرابط الثانوي داخل نافذة صف المسير
test('pages: /payroll/bonuses inside MainLayout with the admin workspace, opened prefilled by employee and month from the run row modal’s group link, without the legacy BONUS requests table; /my/bonuses shows the employee his bonuses plus the manager workspace', () => {
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

const RUN_PAGE = 'src/app/payroll/page.tsx'
const BONUS_MODAL = 'src/components/payroll/PayrollBonusCreateModal.tsx'

test('«مكافأة» على صف المسير بتفتح نافذة مكانها: نفس نمط «شيل خصم» و«نقل لمسير آخر»، بلا انتقال لشاشة المكافآت', () => {
  const page = read(RUN_PAGE)
  // لا انتقال: الرابط القديم لشاشة المكافآت بتبويب الإنشاء لم يعد على الصف
  assert.ok(!page.includes('/payroll/bonuses?tab=create&employeeId='), 'the run row no longer routes away to the bonuses screen')
  assert.doesNotMatch(page, /<Link href=\{`\/payroll\/bonuses/, 'no bonus link on the run row')
  // الزرار على الصف بنفس شكل الزرارين الجارين عليه (حالة + تعطيل أثناء الشغل + نفس السمة للاختبار)
  assert.ok(page.includes('onClick={() => setBonusFor({ employeeId: item.employeeId, name })} disabled={actionBusy || detailLoading}'))
  assert.ok(page.includes('data-bonus-employee={item.employeeId}'), 'the row action keeps its test hook')
  assert.ok(page.includes("{runDetail && runDetail.status !== 'CANCELLED' && ("), 'same visibility rule as before: any run but a cancelled one')
  // نفس نمط الحالة والعرض بالظبط زي «شيل خصم» و«نقل لمسير آخر»
  for (const text of [
    "const [bonusFor, setBonusFor] = useState<{ employeeId: number; name: string } | null>(null)",
    "import { PayrollBonusCreateModal } from '@/components/payroll/PayrollBonusCreateModal'",
    '{bonusFor && runDetail && (',
    '<PayrollBonusCreateModal employeeId={bonusFor.employeeId} employeeName={bonusFor.name} period={runDetail.period}',
    'onClose={() => setBonusFor(null)} />',
  ]) {
    assert.ok(page.includes(text), text)
  }
  // الأشقاء الثلاثة على الصف نفسه: كلهم نافذة في الشاشة
  for (const text of ['setRemoveDeductionFor({ employeeId: item.employeeId', 'setMoveMemberFor({ employeeId: item.employeeId, name })']) {
    assert.ok(page.includes(text), text)
  }
})

test('نافذة المكافأة: نفس نقطة الإنشاء الفردي ونفس المعاينة والفحص وبوابة المجموعات — بلا حساب مال ولا نقطة خدمة جديدة', () => {
  const modal = read(BONUS_MODAL)
  for (const text of [
    // الأنواع المسموح له بإنشائها من الخادم — لا صلاحية مخترعة في الواجهة
    'fetchBonusCreatable()',
    // الموظف وشهر المسير جاهزان من صف المسير
    'isPeriod(period) ? period : value.currentPeriod',
    'previewBonuses(input, { mode: \'EMPLOYEES\', ids: [employeeId], excludeEmployeeIds: [] })',
    // نقطة الإنشاء الفردي نفسها (POST /bonuses) التي تستعملها مكتبة العميل
    'createBonus({ ...input, employeeId })',
    // نفس فحص الواجهة قبل الإرسال الذي تستعمله شاشة المكافآت
    'bonusInputError(input, creatable.reasonMinLength, type)',
    // نفس منسّق المبالغ وتسميات الأدوار والوحدات — بلا نسخ
    'formatBonusMoney(', 'BONUS_METHOD_UNIT[type.calcMethod]', 'BONUS_ROLE_LABELS[role]',
    'شهر المسير المستهدف', 'سبب المكافأة',
  ]) {
    assert.ok(modal.includes(text), text)
  }
  // النافذة لا تقرر شيئًا ماليًا: لا تنسيق أرقام محلي ولا حساب مبلغ ولا نداء خادم خارج مكتبة المكافآت
  assert.doesNotMatch(modal, /toLocaleString\(/)
  assert.doesNotMatch(modal, /toFixed\(/)
  assert.doesNotMatch(modal, /Number\([^)]*\)\s*[*+\-/]/, 'no amount arithmetic in the modal')
  assert.doesNotMatch(modal, /apiFetch|\bfetch\(/, 'no new endpoint: every call goes through the bonuses client')
  // شاشة المكافآت باقية للمجموعات، والرابط الثانوي خلف نفس بوابة الشاشة الإدارية
  assert.ok(modal.includes("const canBulk = can('bonuses.manage')"), 'the group link reuses the bonuses screen gate')
  assert.ok(modal.includes('مكافأة لمجموعة موظفين ← شاشة المكافآت'))
  assert.ok(modal.includes('const bulkHref = `/payroll/bonuses?tab=create&employeeId=${employeeId}&period=${form.targetPeriod || period}`'), 'the group link carries the employee and month')
  assert.ok(modal.includes('{canBulk && ('), 'the group link is behind the permission')
})

test('نافذة المكافأة: رسالة الخادم العربية على النموذج، وسطر تأكيد باسم سلسلة الاعتماد وشهر المسير — زي نافذتي الخصم والنقل', () => {
  const modal = read(BONUS_MODAL)
  // الخطأ: رسالة الخادم كما هي في مكانها على النموذج (لا انتقال ولا تنبيه متصفح)
  assert.ok(modal.includes("setError(errorText(err, 'تعذر إرسال المكافأة'))"), 'server refusal surfaces as Arabic on the form')
  assert.ok(modal.includes('{error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</div>}'))
  assert.ok(modal.includes("setLoadError(errorText(err, 'تعذر تحميل أنواع المكافآت المسموحة لك'))"))
  assert.ok(modal.includes("setPreviewError(errorText(err, 'تعذرت معاينة مبلغ المكافأة'))"))
  assert.doesNotMatch(modal, /\balert\(|window\.location|router\.push/, 'the modal never navigates away nor uses a browser alert')
  // التكرار: نفس تأكيد شاشة المكافآت بدل رفض صامت
  assert.ok(modal.includes("row?.status === 'BONUS_DUPLICATE' || errorKind === 'BONUS_DUPLICATE'"))
  assert.ok(modal.includes('confirmNotDuplicate: form.confirmNotDuplicate'))
  // النجاح: سطر قصير فيه رقم الطلب والحالة وسلسلة الاعتماد وشهر الصرف
  assert.ok(modal.includes("const chainOf = (steps: BonusView['steps']) => steps.filter(step => step.status !== 'SKIPPED').map(step => step.roleLabel).join(' ← ')"))
  assert.ok(modal.includes('سلسلة الاعتماد: {chainOf(created.steps)}. بعد اعتماد الموارد البشرية تُصرف مع مسير {created.targetPeriod}.'))
  assert.ok(modal.includes('role="status"'))
  // نفس هيكل نافذتي «شيل خصم» و«نقل لمسير آخر» على الشاشة نفسها
  const siblings = [read('src/components/payroll/PayrollMoveToRunModal.tsx'), read('src/components/payroll/PayrollFinancialExemptionsPanel.tsx')]
  for (const marker of ['role="dialog" aria-modal="true"', 'fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4', 'text-sm text-gray-500 disabled:opacity-50">إغلاق</button>']) {
    assert.ok(modal.includes(marker), `نمط النوافذ: ${marker}`)
    assert.ok(siblings.some(file => file.includes(marker)), `الشقيق: ${marker}`)
  }
  assert.ok(modal.includes('data-testid="payroll-bonus-create"'))
})

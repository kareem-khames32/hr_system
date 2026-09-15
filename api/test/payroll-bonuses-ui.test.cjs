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

test('workspace: single employee, a selection, a team, a department or a branch; real-number preview with exclude/return; stale preview blocks sending; catalog behind bonuses.manage', () => {
  const workspace = read('src/components/payroll/BonusesWorkspace.tsx')
  for (const text of ["SINGLE: 'مكافأة فردية (موظف واحد)'", "EMPLOYEES: 'مجموعة مختارة'", "TEAM: 'فريق'", "DEPARTMENT: 'قسم (مع أقسامه الفرعية)'", "BRANCH: 'فرع'",
    'معاينة الأرقام', 'إرسال للاعتماد', "'استبعاد' : 'إرجاع'", 'excludeEmployeeIds: [...excluded]', 'أعد المعاينة بعد آخر تعديل قبل الإرسال.',
    'disabled={busy || !preview || stale || preview.totals.ready === 0}', "setCanManage(can('bonuses.manage'))", '{canManage && <button', 'لا مكافأة لنفسك ولا لمن يعلوك',
    'شهر المسير المستهدف', 'createBonus({ ...input, employeeId: singleId })', 'submitBonusBatch(input, selection, preview.previewHash)', 'err.details?.preview']) {
    assert.ok(workspace.includes(text), text)
  }
  // الشاشة لا تقرر شيئًا ماليًا: لا تنسيق أرقام محلي مباشر ولا حساب مبلغ في الواجهة
  assert.doesNotMatch(workspace, /toLocaleString\(/)
  assert.doesNotMatch(workspace, /Number\([^)]*\)\s*\*/, 'no amount arithmetic in the screen')
})

test('pages: /payroll/bonuses inside MainLayout with the admin workspace and legacy BONUS requests read-only (COMPLETED is not «مصروف»); /my/bonuses shows the employee his bonuses plus the manager workspace', () => {
  const admin = read('src/app/payroll/bonuses/page.tsx')
  for (const text of ['<MainLayout>', '<BonusesWorkspace currency={currency} mode="admin"', "COMPLETED: { label: 'معتمد — قُيّد في الدفتر بانتظار الصرف'", 'للاطلاع فقط']) {
    assert.ok(admin.includes(text), text)
  }
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

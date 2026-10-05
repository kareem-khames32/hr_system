// B1.14 (الراتب الحي) في الواجهة: تاب «لحد امبارح»، وكارت الموظف ومبلغ يومه ورا الميزة الفرعية، وتنبيهات قبل الاعتماد، وحقلين الإعدادات.
// فحص نصي للربط بين الشاشات وعميل الـAPI والخادم — لا SQL ولا خدمة ولا قاعدة بيانات.
// Run (من api/): node --test test/payroll-live-ui.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

test('LV-UI-01: عميل الـAPI على مسارات الخادم نفسها بصلاحياتها، والمسار الذاتي ورا الميزة الفرعية', () => {
  const client = read('src/lib/payroll-live-api.ts')
  assert.match(client, /apiFetch<PayrollLivePreview>\('\/payroll\/live'\)/)
  assert.match(client, /'\/payroll\/live\/refresh', \{ method: 'POST' \}/)
  assert.match(client, /apiFetch<MyLiveSalary>\('\/payroll\/live\/mine'\)/)
  // الميزة مقفولة (404) أو من غير صلاحية = مفيش بيانات، مش خطأ في الشاشة
  assert.match(client, /error\.status === 404 \|\| error\.status === 403\)\) return null/)
  const controller = read('api/src/payroll/payroll-live.controller.ts')
  assert.match(controller, /@RequireModule\('payroll'\)\s+@UseGuards\(JwtAuthGuard, RolesGuard\)\s+@Controller\('payroll\/live'\)/)
  assert.match(controller, /@Perm\('payroll\.view'\)\s+@Get\(\)/)
  assert.match(controller, /@Perm\('payroll\.calculate'\)\s+@Post\('refresh'\)/)
  assert.match(controller, /@RequireFeature\('payroll\.live_employee_view'\)\s+@Get\('mine'\)/)
  // الميزة الفرعية متسجلة في موديول الرواتب ومقفولة افتراضيًا
  const registry = read('api/src/modules-registry/registry.ts')
  assert.match(registry, /'payroll\.live_employee_view': \{\s+nameAr: '[^']+',\s+description: '[^']+',\s+default: false,/)
})

test('LV-UI-02: تاب «لحد امبارح» في شاشة الرواتب — مكتوب عليه تقديري، وزرار «حدّث الحساب» بصلاحية الحساب بس', () => {
  const page = read('src/app/payroll/page.tsx')
  assert.match(page, /\['live', 'لحد امبارح'\]/)
  assert.match(page, /tab === 'live' \? \(\s*<PayrollLivePreviewTab \/>/)
  const tab = read('src/components/payroll/PayrollLivePreviewTab.tsx')
  assert.ok(tab.includes('fetchPayrollLive') && tab.includes('refreshPayrollLive'))
  // ملاحظة «تقديري» من الخادم بتتعرض زي ما هي، والعمود اسمه «الصافي التقديري»
  assert.match(tab, /\{data\.note\}/)
  assert.ok(tab.split('الصافي التقديري').length >= 3)
  assert.match(tab, /can\('payroll\.calculate'\) && <button onClick=\{refresh\}/)
  // الزرار بيتقفل وهو شغال فما يتنادىش مرتين
  assert.match(tab, /if \(busy\) return/)
  // كل طلب بميزانية وقت: الشاشة بتكمّل طول ما فيه باقي، وبتقف لو جولة ماحسبتش حاجة (مفيش حلقة للأبد)
  assert.match(tab, /if \(!\(result\.remaining > 0\) \|\| result\.computed === 0\) break/)
  assert.match(read('api/src/payroll/payroll-live.service.ts'), /refreshLive\(pending, \{ budgetMs: PAYROLL_LIVE_REFRESH_BUDGET_MS \}\)/)
  assert.match(tab, /disabled=\{loading \|\| busy\}/)
  // الموظف اللي لسه ماتحسبش أو عليه يوم محتاج إعادة حساب باين
  assert.match(tab, /لسه ماتحسبش/)
  assert.match(tab, /يوم محتاج إعادة حساب/)
  // الأرقام من الخادم زي ما هي: الشاشة مابتجمعش مبالغ
  assert.doesNotMatch(tab, /\.reduce\(/)
})

test('LV-UI-03: كارت الموظف ومبلغ يومه ورا الميزة الفرعية — مقفولة = مفيش نداء ولا عرض', () => {
  const card = read('src/components/payroll/MyLiveSalaryCard.tsx')
  assert.match(card, /export const MY_LIVE_SALARY_FEATURE = 'payroll\.live_employee_view'/)
  assert.match(card, /const enabled = useFeatureEnabled\(MY_LIVE_SALARY_FEATURE\)/)
  assert.match(card, /if \(!enabled\) \{ setData\(null\); return \}/)
  assert.match(card, /if \(!enabled \|\| !data\?\.available \|\| !data\.summary\) return null/)
  assert.match(card, /مستحقك التقديري لحد امبارح/)
  assert.match(card, /\{data\.note\}/)
  // الإضافي اللي لسه ماتعتمدش: عدد بس من غير مبلغ
  assert.match(card, /إضافي في انتظار اعتماد<\/span><span>\{data\.pendingOvertime\}/)
  assert.match(read('src/components/dashboard/EmployeeHome.tsx'), /<MyLiveSalaryCard \/>/)
  const attendance = read('src/app/my/attendance/page.tsx')
  assert.match(attendance, /const liveMoneyOn = useFeatureEnabled\(MY_LIVE_SALARY_FEATURE\)/)
  assert.match(attendance, /if \(!liveMoneyOn\) \{ setLiveDays\(new Map\(\)\); return \}/)
  assert.match(attendance, /خصم تقديري:/)
  assert.match(attendance, /النهائي في القسيمة بعد الاعتماد/)
})

test('LV-UI-04: تنبيهات قبل الاعتماد في لوحة «اتغيّر إيه» — من رد الخادم، وبيانات الصرف الناقصة من كشف البنوك الموجود', () => {
  const panel = read('src/components/payroll/PayrollRunChangesPanel.tsx')
  assert.match(panel, /data\.alerts\?\.netChanges \?\? \[\]/)
  assert.match(panel, /data\.alerts\?\.zeroOrNegativeNet \?\? \[\]/)
  assert.match(panel, /الصافي اتغيّر \{data\.alerts!\.thresholdPercent\}% أو أكتر عن آخر مسير/)
  assert.match(panel, /صافي صفر أو سالب/)
  assert.match(panel, /بيانات صرف ناقصة/)
  // نفس فحص كشف البنوك بالحرف، وفشله مايوقفش اللوحة
  assert.match(panel, /fetchBankSheet\(runId\)[\s\S]{0,160}sheet\.issues\?\.rows \?\? \[\][\s\S]{0,60}\.catch\(\(\) => undefined\)/)
  const api = read('src/lib/api.ts')
  assert.match(api, /alerts\?: \{\s+thresholdPercent: number\s+netChanges: Array</)
  // الخادم بيرجّع التنبيهات في مفتاح لوحده، والعدّادات القديمة زي ما هي
  const service = read('api/src/payroll/payroll.service.ts')
  assert.match(service, /alerts: \{ thresholdPercent, netChanges, zeroOrNegativeNet \},\s+counts: \{ changed:/)
})

test('LV-UI-05: الإعدادين في شاشة السياسات بنفس مفاتيح الخادم وحدوده', () => {
  const policies = read('src/app/settings/policies/page.tsx')
  assert.match(policies, /key: 'payroll\.live_accrual_all', label: '[^']+', type: 'bool'/)
  assert.match(policies, /key: 'payroll\.approval\.net_change_alert_percent', label: '[^']+', type: 'number', unit: '%', min: 0, max: 1000, integer: true/)
  const controller = read('api/src/settings/settings.controller.ts')
  assert.match(controller, /'payroll\.live_accrual_all': \['true', 'false'\]/)
  assert.match(controller, /'payroll\.approval\.net_change_alert_percent': 0,/)
  assert.match(controller, /dto\.key === 'payroll\.approval\.net_change_alert_percent'[\s\S]{0,120}!Number\.isInteger\(n\) \|\| n > 1000/)
  const seed = read('api/src/seed/requests-seed.data.ts')
  assert.match(seed, /\{ key: 'payroll\.live_accrual_all', value: 'true' \}/)
  assert.match(seed, /\{ key: 'payroll\.approval\.net_change_alert_percent', value: '20' \}/)
})

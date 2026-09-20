// تراكم المسير يومًا بيوم في شاشة المسير: «آخر يوم محسوب» وزرار «حدّث الحساب».
// فحص نصي للربط بين الشاشة وعميل الـAPI — لا SQL ولا خدمة ولا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

test('ACR-UI-01: عميل الـAPI بيعرّف قراءة التراكم وتحديثه على مسارات الخادم نفسها', () => {
  const api = read('src/lib/api.ts')
  assert.match(api, /export const fetchPayrollRunAccrual = \(id: number\) => get<ApiPayrollRunAccrual>\(`\/payroll\/runs\/\$\{id\}\/accrual`\)/)
  assert.match(api, /export const refreshPayrollRunAccrual[\s\S]{0,220}\/payroll\/runs\/\$\{id\}\/accrual\/refresh/)
  for (const field of ['lastAccruedDate', 'dirtyDays', 'accruedDays', 'targetDate', 'upToDate', 'open']) {
    assert.ok(api.includes(`${field}:`), `ApiPayrollRunAccrual لازم يحمل ${field}`)
  }
  // المسارات لازم تطابق المتحكم في الخادم
  const controller = fs.readFileSync(path.join(root, 'api/src/payroll/payroll-daily-accrual.controller.ts'), 'utf8')
  assert.match(controller, /@Get\(':id\/accrual'\)/)
  assert.match(controller, /@Post\(':id\/accrual\/refresh'\)/)
  assert.match(controller, /@Perm\('payroll\.view'\)/)
  assert.match(controller, /@Perm\('payroll\.calculate'\)/)
})

test('ACR-UI-02: شاشة المسير بتعرض «آخر يوم محسوب» وزرار «حدّث الحساب» للمسير المفتوح بس', () => {
  const page = read('src/app/payroll/page.tsx')
  assert.ok(page.includes('fetchPayrollRunAccrual') && page.includes('refreshPayrollRunAccrual'), 'الشاشة بتستعمل الدالتين')
  assert.match(page, /آخر يوم محسوب/)
  assert.match(page, /حدّث الحساب/)
  // القراءة للمسير المفتوح بس (مسودة أو محسوب)، والزرار كمان بصلاحية الحساب
  assert.match(page, /\['DRAFT', 'CALCULATED'\]\.includes\(runDetail\.status\)[\s\S]{0,120}fetchPayrollRunAccrual/)
  assert.match(page, /accrual\?\.open && can\('payroll\.calculate'\)/)
  // فشل القراءة ما يوقفش الشاشة (الترحيل ممكن يكون لسه مش متطبق)
  assert.match(page, /fetchPayrollRunAccrual\(runDetail\.id\)[\s\S]{0,200}\.catch\(\(\) =>/)
  // الزرار بيتقفل وهو شغال فما يتنادىش مرتين
  assert.match(page, /disabled=\{accrualBusy \|\| actionBusy \|\| detailLoading\}/)
})

test('ACR-UI-03: نصوص الشاشة عربية بسيطة بلا مصطلحات تقنية', () => {
  const page = read('src/app/payroll/page.tsx')
  const block = page.slice(page.indexOf('data-payroll-accrual'), page.indexOf('data-payroll-accrual') + 500)
  assert.ok(block.length > 100, 'سطر التراكم موجود في الشاشة')
  // النص المعروض للمستخدم: كل جملة عربية في السطر بلا مصطلح تقني لاتيني
  const shown = [...block.matchAll(/[؀-ۿ][^`'"{}<>]*/g)].map(match => match[0].trim()).filter(text => text.length > 3)
  assert.ok(shown.length >= 3, 'السطر فيه نصوص عربية معروضة')
  for (const text of shown) assert.ok(!/[A-Za-z]{3,}/.test(text), `نص المستخدم «${text}» فيه مصطلح لاتيني`)
  assert.ok(shown.some(text => text.includes('آخر يوم محسوب')))
  assert.ok(shown.some(text => /محتاج إعادة حساب|الحساب متجمّع|لسه مافيش/.test(text)))
})

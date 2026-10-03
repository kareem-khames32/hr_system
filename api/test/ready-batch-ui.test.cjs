// B1.2 — دفعة «جاهز فعلًا»: لينك تغيير كلمة المرور، واللينك المكسور، واسم المنتج، والأيقونة، وزرار الحفظ، وسبب «عطلة»، وبيانات الدخول في الملفات.
// فحص نصي للملفات؛ لا SQL ولا خدمة (سبب «عطلة» نفسه في attendance-holiday-reason.integration.cjs).
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')

test('B1.2: «تغيير كلمة المرور» في كارت المستخدم لكل حساب غير حساب المجال، والجلسة بتقول حساب المجال بس', () => {
  const sidebar = read('src/components/layout/Sidebar.tsx')
  assert.ok(sidebar.includes('href="/login/change-password"') && sidebar.includes('currentUser && !currentUser.domainAccount &&'))
  assert.ok(fs.existsSync(path.join(root, 'src/app/login/change-password/page.tsx')), 'الشاشة موجودة')
  const auth = read('api/src/auth/auth.service.ts')
  assert.ok(auth.includes('...(user.domainObjectGuid ? { domainAccount: true as const } : {}),'), 'الحساب العادي رده زي ما هو بالحرف')
  assert.ok(read('src/lib/api.ts').includes('domainAccount?: boolean'))
})

test('B1.2: اللينك المكسور في صفحة الوظيفة بيودّي لصفحة المتقدمين، ومفيش أزرار من غير فعل', () => {
  const job = read('src/app/recruitment/[id]/page.tsx')
  assert.ok(!job.includes('/recruitment/applicants/${'), 'مفيش صفحة متقدم لوحده')
  assert.ok(job.includes('href="/recruitment/applicants"'))
  assert.doesNotMatch(job, /<Edit2|<Trash2/)
  assert.ok(fs.existsSync(path.join(root, 'src/app/recruitment/applicants/page.tsx')))
})

test('B1.2: مفيش «نظام الموارد البشرية» ولا «HR System» كاسم للمنتج، والأيقونة موجودة', () => {
  for (const file of ['src/components/layout/Header.tsx', 'src/app/payroll/payslip/[id]/page.tsx', 'api/src/auth/auth.service.ts', 'api/src/auth/two-factor.service.ts']) {
    assert.doesNotMatch(read(file), /نظام الموارد البشرية/, file)
  }
  for (const file of ['api/src/employees/employee-export.ts', 'api/src/employees/employee-bulk-update.sheet.ts']) {
    assert.ok(read(file).includes('workbook.creator = PRODUCT_NAME') && !read(file).includes("'HR System'"), file)
  }
  assert.ok(read('api/src/settings/product-name.ts').includes("export const PRODUCT_NAME = 'Logic Leap HR'"))
  assert.ok(read('api/src/settings/branding.controller.ts').includes("export { PRODUCT_NAME } from './product-name'"), 'نفس الاسم من مكان واحد')
  assert.match(read('src/app/icon.svg'), /^<svg[^>]*viewBox="0 0 64 64"/)
})

test('B1.2: زرار الحفظ في «أيام العمل» شغّال وبيظهر لما فيه تعديل بس', () => {
  const page = read('src/app/settings/work-days/page.tsx')
  assert.ok(!page.includes('الحفظ في مرحلة لاحقة'), 'مفيش زرار مقفول دايمًا')
  assert.match(page, /\{daysDirty && \(\n\s+<button type="button" disabled=\{scheduleBusy\} onClick=\{saveWorkDays\}[^>]*data-save-work-days-top>/)
})

test('B1.2: شاشة الحضور بتقول سبب «عطلة» واسم العطلة في اليوم الفاضي', () => {
  const page = read('src/app/attendance/page.tsx')
  for (const text of ['getStatusBadge(record.status, record.flexDay.holidayName)', "holidayName === null ? 'راحة أسبوعية' : 'عطلة'", "fetchCatalog<{ name: string; date: string; endDate: string | null }>('holidays')",
    'اليوم ده عطلة رسمية: ${holidayNames.join']) assert.ok(page.includes(text), text)
})

test('B1.2: مفيش كلمة سر مكتوبة جنب حساب الدخول في الملفات', () => {
  for (const file of ['api/README.md', 'docs/USER_GUIDE_AR.md']) {
    const text = read(file)
    assert.ok(text.includes('admin@company.com'), `${file}: الحساب نفسه مذكور`)
    assert.doesNotMatch(text, /admin@company\.com\s*\/\s*\S/, `${file}: من غير كلمة سر بعده`)
  }
})

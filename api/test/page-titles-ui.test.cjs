// خط labels-cleanup (موجة 2026-09-16): اسم الشاشة واحد — في القائمة الجانبية وفي عنوان الهيدر وفي عنوان جسم الصفحة،
// ولا رقم مستخدم خام على أي شاشة، ولا لغة دفتر محاسبي على شاشات الفلوس، ولا زر يفتح الشاشة التي أنت فيها.
// فحص نصي + دالة العناوين نفسها؛ لا SQL ولا خدمة.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true,
  compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const { pageTitleFor } = require('../../src/components/layout/pageTitles')
const root = path.resolve(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const walk = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true })
  .flatMap(entry => entry.isDirectory() ? walk(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`])

// أزواج (الاسم، المسار) من ملف القائمة الجانبية نصيًا — بلا تشغيل مكوّن React.
// الفجوة بين الاسم والمسار لا تحتوي اسمًا آخر، فلا يلتصق اسم مجموعة بمسار أول أبنائها.
function sidebarLinks() {
  const source = read('src/components/layout/Sidebar.tsx')
  return [...source.matchAll(/label: '([^']+)',((?:(?!label:)[\s\S]){0,160}?)href: '([^']+)'/g)]
    .map(match => ({ label: match[1], href: match[3] }))
}

// مسار الشاشة من موقع ملفها: [id] يصير رقمًا و(المجموعات) تُحذف
const routeOf = file => '/' + file.replace(/^src\/app/, '').replace(/\/page\.tsx$/, '')
  .split('/').filter(Boolean).filter(part => !/^\(.*\)$/.test(part)).map(part => /^\[.*\]$/.test(part) ? '1' : part).join('/')

// نص العنوان كما يقرؤه المستخدم؛ ⟨…⟩ مكان أي تعبير برمجي (اسم موظف أو شهر)
const headingOf = source => {
  const match = source.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)
  return match ? match[1].replace(/\{[^{}]*\}/g, '⟨…⟩').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : null
}

test('every sidebar item opens a screen whose header title is the same words', () => {
  const links = sidebarLinks()
  assert.ok(links.length >= 70, `تعذّرت قراءة عناصر القائمة الجانبية (${links.length})`)
  const mismatched = links
    .filter(link => link.href !== '/')
    .filter(link => pageTitleFor(link.href) !== link.label)
    .map(link => `${link.href}: القائمة «${link.label}» والعنوان «${pageTitleFor(link.href) ?? 'بلا عنوان'}»`)
  assert.deepEqual(mismatched, [])
})

test('the heading inside the screen says the same words as its header and its sidebar item', () => {
  const pages = walk('src/app').filter(file => file.endsWith('/page.tsx'))
  assert.ok(pages.length >= 80, `تعذّرت قراءة شاشات التطبيق (${pages.length})`)
  const mismatched = []
  for (const file of pages) {
    const heading = headingOf(read(file))
    const title = pageTitleFor(routeOf(file))
    // شاشة بلا عنوان في جسمها (الهيدر يكفيها)، أو عنوان يحمل اسم موظف/شهر: لا مقارنة نصية
    if (!heading || !title || heading.includes('⟨…⟩')) continue
    if (heading !== title) mismatched.push(`${file}: الهيدر «${title}» والجسم «${heading}»`)
  }
  assert.deepEqual(mismatched, [])
})

test('the employee screens that had no title (deductions and bonuses) have one now, and the renamed screens match the sidebar', () => {
  assert.equal(pageTitleFor('/my/deductions'), 'خصوماتي')
  assert.equal(pageTitleFor('/my/bonuses'), 'مكافآتي')
  assert.equal(pageTitleFor('/payroll/policies'), 'معادلات الرواتب')
  assert.equal(pageTitleFor('/settings/policies'), 'سياسات النظام')
  assert.equal(pageTitleFor('/requests-console'), 'لوحة الطلبات')
  assert.equal(pageTitleFor('/employees/transfers'), 'سجل النقل')
  // شاشتان تحت مسار أعم كانتا تفتحان بعنوان القسم بدل اسمهما
  assert.equal(pageTitleFor('/settings/company'), 'بيانات الشركة')
  assert.equal(pageTitleFor('/employees/documents/create'), 'إصدار مستند')
  // شاشة «القيم العامة للخصومات» أُوقفت مع نقل الشرائح إلى المعادلة؛ لا عنوان خاصًا بها
  assert.doesNotMatch(read('src/components/layout/pageTitles.ts'), /\/payroll\/formulas/)
  // ولا زر يفتحها: كان يعيد فتح شاشة المعادلات نفسها
  assert.doesNotMatch(read('src/app/payroll/policies/page.tsx'), /payroll\/formulas/)
})

test('no raw user number and no latin system name on the screens', () => {
  // بلا أسطر التعليق: النص المعروض وحده هو المقصود
  const code = file => read(file).split('\n').filter(line => !/^\s*(\/\/|\*|\/\*)/.test(line)).join('\n')
  for (const file of walk('src').filter(name => /\.tsx?$/.test(name))) {
    assert.doesNotMatch(code(file), /المستخدم #/, `${file} يعرض رقم المستخدم بدل اسمه`)
    assert.doesNotMatch(code(file), /نظام HR/, `${file} يعرض اسم النظام بحروف لاتينية`)
  }
  const overtimeSummary = read('src/components/OvertimeRequestSummary.tsx')
  assert.match(overtimeSummary, /بواسطة \$\{event\.actorName \|\| 'أحد المستخدمين'\}/)
  // من أقرّ بتقرير «موظفون بلا مسير» يظهر باسمه (الخادم يرسله مع الإقرار)
  assert.match(read('src/components/payroll/PayrollUnassignedPanel.tsx'), /أقرّ \{ack\.current\.acknowledgedByName \|\| 'أحد المستخدمين'\}/)
  assert.match(read('api/src/payroll/payroll.service.ts'), /acknowledgedByName: names\.get\(ack\.acknowledgedBy\)/)
})

test('the money screens speak plainly: no ledger words, and the payslip says what was cancelled', () => {
  const obligations = read('src/components/PayrollObligationBreakdown.tsx')
  assert.doesNotMatch(obligations, /تُحجز|تُستهلك|المرحّل/)
  assert.match(obligations, /يُخصم الشهر القادم/)
  // اسم البند وحده؛ التصنيف لا يتكرر فوقه («خصم / خصم مصنف / خصم إداري» سابقًا)
  assert.match(obligations, /!row\.deduction && !row\.bonus \? <p[^>]*>\{row\.categoryLabel\}<\/p> : null/)
  // ومصدر تلك الكلمات في الخادم صار كلامًا عاديًا
  const trace = read('api/src/payroll/payroll-obligation-trace.ts')
  assert.doesNotMatch(trace, /'خصم مصنف'|'عكس خصم مصنف'|'قيد يدوي'/)
  assert.match(trace, /typed_deduction: 'خصم', deduction_reversal: 'إلغاء خصم'/)
  // نفس اللغة في المكوّن الشقيق على الشاشتين نفسيهما (القسيمة وجدول المسير)
  const installments = read('src/components/PayrollInstallmentBreakdown.tsx')
  assert.doesNotMatch(installments, /المرحّل|تُحجز|الترحيل/)
  assert.match(installments, /يُخصم الشهر القادم/)
  assert.doesNotMatch(read('src/app/payroll/reports/page.tsx'), /المرحّل من الدفتر/)
  // نافذة إلغاء الخصم على شاشة المسير تسمّي البند بالاسم نفسه («خصم مصنف» و«قيد #» كانا يظهران في قائمتها)
  assert.doesNotMatch(read('src/components/payroll/PayrollFinancialExemptionsPanel.tsx'), /خصم مصنف|قيد #/)
  assert.doesNotMatch(read('src/lib/financial-exemptions-api.ts'), /خصم مصنف/)
  assert.doesNotMatch(read('src/components/PayrollOvertimeBreakdown.tsx'), /غير موثق تاريخيًا/)
  // السقف اليومي للخصم أُلغي بقرار المالك (أ4): لا تذكره ملاحظة شرائح التأخير
  assert.doesNotMatch(read('src/components/payroll/PayrollLatenessTierBreakdown.tsx'), /السقف اليومي/)
  const payslip = read('src/app/payroll/payslip/[id]/page.tsx')
  assert.doesNotMatch(payslip, /خصومات الدفتر/)
  // سطر الخصم في القسيمة يقول إنه أُلغي وكم كان قبل الإلغاء
  assert.match(payslip, /exemptionNote\(deduction\.component\)/)
  assert.match(payslip, /أُلغي منه \$\{formatMoney\(total\.exempted\)\}/)
})

'use strict'
// خط الموبايل (30 سبتمبر): النظام يتفتح ويتستخدم على موبايل (~390px).
// الإطار: تحت lg القائمة الجانبية درج من اليمين — زرار قائمة في الهيدر، خلفية معتمة بتقفله بالضغط، وEsc والانتقال
// بيقفلوه، وتمرير الصفحة مقفول وهو مفتوح؛ والمحتوى lg:mr-72 وp-4 lg:p-8. من lg وفوق مفيش كلاس جديد بيتطبّق.
// شاشات البوابة: مفيش mr-72 ثابت ولا grid-cols-3+ من غير بديل للشاشة الصغيرة ولا col-span بيعمل عمود ضمني،
// والجداول جوّه overflow-x-auto، والنوافذ جوّه الشاشة بـmax-h وتمرير داخلي.
// فحص نصي للمصدر + React SSR للهيدر والقائمة + CSS المشروع مبني بـTailwind؛ لا SQL ولا خدمة.
// Run: node --test api/test/mobile-shell-ui.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true,
  compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const root = path.resolve(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')

const React = require('../../node_modules/react')
const { renderToStaticMarkup } = require('../../node_modules/react-dom/server')
// '@/x' ← src/x، وبدائل بسيطة لـnext/link وnext/navigation عشان الرسم على الخادم
const originalLoad = Module._load
Module._load = function (request, parent, isMain) {
  if (request === 'next/link') return ({ children, href, ...props }) => React.createElement('a', { href, ...props }, children)
  if (request === 'next/navigation') return { usePathname: () => '/my/leaves' }
  return originalLoad.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, parent, isMain)
}
const Header = require('../../src/components/layout/Header').default
const Sidebar = require('../../src/components/layout/Sidebar').default
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props))
// أول وسم فيه العلامة، وكلاساته
const tagWith = (html, marker) => {
  const at = html.indexOf(marker)
  assert.ok(at >= 0, `مش لاقي ${marker}`)
  return html.slice(html.lastIndexOf('<', at), html.indexOf('>', at) + 1)
}
const classesOf = tag => (/class="([^"]*)"/.exec(tag)?.[1] ?? '').split(/\s+/).filter(Boolean)

// كلاسات القائمة الجانبية على الديسكتوب زي ما كانت بالظبط قبل الخط ده
const DESKTOP_ASIDE = 'fixed right-0 top-0 h-screen w-72 bg-white border-l border-gray-100 flex flex-col z-50'.split(' ')

test('MOB-UI-01: زرار القائمة في الهيدر (أقل من lg بس) بـaria-label وaria-expanded وبيتحكم في القائمة، والعنوان سطر واحد على الموبايل', () => {
  const html = render(Header, { onMenuClick() {}, menuOpen: false })
  const burger = tagWith(html, 'aria-label="فتح القائمة"')
  assert.match(burger, /^<button type="button"/)
  assert.match(burger, /aria-expanded="false"/)
  assert.match(burger, /aria-controls="app-sidebar"/)
  for (const cls of ['lg:hidden', 'print:hidden', 'shrink-0']) assert.ok(classesOf(burger).includes(cls), cls)
  assert.match(tagWith(render(Header, { onMenuClick() {}, menuOpen: true }), 'aria-label="فتح القائمة"'), /aria-expanded="true"/)
  // من غير onMenuClick (رسم منفصل) مفيش زرار
  assert.ok(!render(Header, {}).includes('فتح القائمة'))
  // الهيدر مضغوط على الموبايل وزي ما كان من lg وفوق
  const row = classesOf(tagWith(html, 'lg:px-8'))
  for (const cls of ['px-4', 'py-3', 'lg:px-8', 'lg:py-4']) assert.ok(row.includes(cls), cls)
  const title = classesOf(tagWith(html, '<h2'))
  for (const cls of ['text-lg', 'lg:text-xl', 'xl:text-2xl', 'max-lg:truncate']) assert.ok(title.includes(cls), cls)
  assert.ok(classesOf(tagWith(html, 'text-sm text-gray-400 mt-1')).includes('sm:flex'), 'التاريخ بيستخبى تحت sm بس')
  // الجرس باقي على الموبايل
  assert.ok(html.includes('aria-label="الإشعارات"'))
})

test('MOB-UI-02: القائمة الجانبية درج تحت lg — مقفول برّه الشاشة ومخفي، مفتوح ظاهر، وكل كلاس جديد max-lg: بس', () => {
  const closed = tagWith(render(Sidebar, { open: false }), 'id="app-sidebar"')
  const open = tagWith(render(Sidebar, { open: true, onClose() {} }), 'id="app-sidebar"')
  assert.match(closed, /^<aside /)
  for (const tag of [closed, open]) {
    const cls = classesOf(tag)
    for (const desktop of DESKTOP_ASIDE) assert.ok(cls.includes(desktop), `كلاس الديسكتوب ${desktop} باقي`)
    // أي كلاس زيادة عن كلاسات الديسكتوب لازم يكون max-lg: — يعني من lg وفوق القائمة زي ما هي
    const extra = cls.filter(c => !DESKTOP_ASIDE.includes(c))
    assert.ok(extra.length > 0 && extra.every(c => c.startsWith('max-lg:')), extra.join(' '))
    assert.ok(cls.includes('max-lg:bottom-0') && cls.includes('max-lg:h-auto'), 'بطول الشاشة الظاهرة على الموبايل')
  }
  for (const cls of ['max-lg:invisible', 'max-lg:translate-x-full']) {
    assert.ok(classesOf(closed).includes(cls), `مقفول: ${cls}`)
    assert.ok(!classesOf(open).includes(cls), `مفتوح: من غير ${cls}`)
  }
  // زرار قفل جوّه الدرج (أقل من lg بس)
  const close = tagWith(render(Sidebar, { open: true }), 'aria-label="إغلاق القائمة"')
  assert.match(close, /^<button type="button"/)
  assert.ok(classesOf(close).includes('lg:hidden'))
  const source = read('src/components/layout/Sidebar.tsx')
  assert.match(source, /if \(open\) closeRef\.current\?\.focus\(\{ preventScroll: true \}\)/, 'التركيز بيدخل الدرج لما يتفتح')
  // أي رابط جوّه الدرج بيقفله (حتى رابط الصفحة المفتوحة اللي مفيهوش انتقال)
  assert.ok(source.includes('<nav ref={navRef} onClick={closeOnLink} '))
  assert.match(source, /if \(\(event\.target as HTMLElement\)\.closest\('a'\)\) onClose\?\.\(\)/)
})

test('MOB-UI-03: AppShell — المحتوى lg:mr-72 وp-4 lg:p-8، خلفية معتمة بتقفل، Esc والانتقال بيقفلوا، وقفل تمرير الصفحة', () => {
  const layout = read('src/components/layout/MainLayout.tsx')
  assert.ok(layout.includes('<div className="lg:mr-72">'))
  assert.ok(layout.includes('<main className="p-4 lg:p-8">'))
  assert.doesNotMatch(layout, /["\s]mr-72["\s]/, 'مفيش mr-72 ثابت')
  assert.doesNotMatch(layout, /className="p-8"/)
  assert.ok(layout.includes('<Sidebar open={navOpen} onClose={closeNav} />'))
  assert.ok(layout.includes('<Header onMenuClick={openNav} menuOpen={navOpen} menuButtonRef={menuButtonRef} />'))
  assert.ok(layout.includes('{navOpen && <div aria-hidden="true" onClick={closeNav} className="fixed inset-0 z-[45] bg-gray-900/40 lg:hidden" />}'), 'الخلفية المعتمة')
  // الانتقال بيقفل
  assert.match(layout, /useEffect\(\(\) => \{\n\s+setNavOpen\(false\)\n\s+\}, \[pathname\]\)/)
  const effect = layout.slice(layout.indexOf('if (!navOpen) return'), layout.indexOf('}, [navOpen])'))
  assert.match(effect, /event\.key === 'Escape'\) setNavOpen\(false\)/)
  assert.match(effect, /window\.matchMedia\('\(min-width: 1024px\)'\)/, 'الشاشة لو كبرت لـlg الدرج بيتقفل')
  // قفل التمرير على الـhtml (هو اللي بيتمرّر في الصفحة دي) ورجوعه زي ما كان
  assert.match(effect, /html\.style\.overflow = 'hidden'/)
  assert.match(effect, /html\.style\.overflow = previousOverflow/)
  assert.match(effect, /window\.removeEventListener\('keydown', onKey\)/)
  assert.match(effect, /menuButtonRef\.current\?\.focus\(\{ preventScroll: true \}\)/, 'التركيز بيرجع لزرار القائمة')
})

test('MOB-UI-04: CSS المشروع — كل max-lg: جوّه (أقل من 1024px) بس، وlg:mr-72 من 1024 وفوق، وclip للهيدر الثابت على الموبايل بس', async () => {
  const postcss = require('../../node_modules/postcss'), tailwind = require('../../node_modules/tailwindcss')
  const files = ['src/components/layout/MainLayout.tsx', 'src/components/layout/Sidebar.tsx', 'src/components/layout/Header.tsx'].map(file => path.join(root, file))
  const globals = read('src/app/globals.css')
  const result = await postcss([tailwind({ ...require('../../tailwind.config.js'), content: files })]).process(globals.replace(/^@import[^\n]+\n/m, ''), { from: undefined })
  // الميديا اللي حوالين كل قاعدة (متداخلة كمان: motion-reduce جوّه max-lg)
  const mediaOf = rule => { const out = []; for (let node = rule.parent; node; node = node.parent) if (node.type === 'atrule' && node.name === 'media') out.push(node.params.trim()); return out }
  const rules = []
  result.root.walkRules(rule => { rules.push(rule) })
  // كل قاعدة max-lg: جوّه ميديا «not all and (min-width: 1024px)» — مفيش منها حاجة بتلمس الديسكتوب
  const maxLg = rules.filter(rule => rule.selector.includes('.max-lg\\:'))
  assert.ok(maxLg.length >= 10, `${maxLg.length}`)
  for (const rule of maxLg) assert.ok(mediaOf(rule).includes('not all and (min-width: 1024px)'), rule.selector)
  for (const selector of ['.lg\\:mr-72', '.lg\\:p-8', '.lg\\:hidden']) {
    const rule = rules.find(item => item.selector === selector)
    assert.ok(rule, selector)
    assert.deepEqual(mediaOf(rule), ['(min-width: 1024px)'], selector)
  }
  // globals.css: hidden زي ما هو للكل، وclip (عشان sticky) تحت lg بس
  assert.match(globals, /html,\nbody \{\n\s+max-width: 100vw;\n\s+overflow-x: hidden;\n\}/)
  assert.match(globals, /@media not all and \(min-width: 1024px\) \{\n\s+html,\n\s+body \{\n\s+overflow-x: clip;\n\s+\}\n\}/)
  assert.equal((globals.match(/overflow-x: clip/g) || []).length, 1)
})

test('MOB-UI-05: الـviewport: Next بيطلع width=device-width, initial-scale=1 افتراضيًا ومحدش بيغيّره', () => {
  const { createDefaultViewport } = require('../../node_modules/next/dist/lib/metadata/default-metadata')
  const viewport = createDefaultViewport()
  assert.equal(viewport.width, 'device-width')
  assert.equal(viewport.initialScale, 1)
  const layout = read('src/app/layout.tsx')
  assert.doesNotMatch(layout, /viewport/i, 'الـlayout مابيعدّلش الـviewport')
  // ولا صفحة بتقفل التكبير أو بتغيّر الـviewport
  const walk = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true })
    .flatMap(entry => entry.isDirectory() ? walk(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`])
  for (const file of walk('src/app').filter(name => /\.(tsx|ts)$/.test(name))) {
    assert.doesNotMatch(read(file), /export (const|async function|function) (viewport|generateViewport)\b|user-scalable|maximum-scale/, file)
  }
})

// شاشات البوابة والمكوّنات المشتركة اللي بتستخدمها
const PORTAL = [
  'src/app/page.tsx', 'src/components/dashboard/EmployeeHome.tsx', 'src/components/dashboard/QuickActions.tsx', 'src/components/dashboard/StatsCards.tsx',
  'src/components/dashboard/PendingApprovals.tsx', 'src/components/dashboard/AttendanceChart.tsx', 'src/components/dashboard/DepartmentStats.tsx',
  'src/components/dashboard/MyClearanceItems.tsx', 'src/components/dashboard/UpcomingEvents.tsx', 'src/components/dashboard/RecentActivities.tsx',
  'src/app/requests/page.tsx', 'src/app/approvals-inbox/page.tsx', 'src/app/my/attendance/page.tsx', 'src/app/my/leaves/page.tsx',
  'src/app/my/payslips/page.tsx', 'src/app/my/deductions/page.tsx', 'src/app/my/bonuses/page.tsx', 'src/app/my/custody/page.tsx',
  'src/app/notifications/page.tsx', 'src/app/calendar/page.tsx', 'src/app/leaves/request/page.tsx', 'src/app/payroll/payslip/[id]/page.tsx',
  'src/app/payroll/my-approvals/page.tsx', 'src/components/RequestPayload.tsx', 'src/components/requests/RequestEmployeeCard.tsx',
  'src/components/MyApprovalDecisions.tsx', 'src/components/EmptyState.tsx', 'src/components/payroll/BonusesWorkspace.tsx',
  'src/components/payroll/TypedDeductionsWorkspace.tsx', 'src/components/payroll/PayrollApprovalReviewTable.tsx',
  'src/components/payroll/PayrollApprovalChainStrip.tsx', 'src/components/requests/BonusRequestForm.tsx', 'src/components/requests/DeductionRequestForm.tsx',
  'src/components/OvertimePreview.tsx', 'src/components/OvertimeRequestSummary.tsx', 'src/components/PayrollAttendanceBreakdown.tsx',
  'src/components/PayrollOvertimeBreakdown.tsx', 'src/components/PayrollInstallmentBreakdown.tsx', 'src/components/PayrollObligationBreakdown.tsx',
]
// شبكات أعمدتها ثابتة عن قصد: أيام الأسبوع السبعة في التقويم، وشريط أرقام الرصيد الثلاثة (استحقاق/مستهلك/متبقٍ) اللي بيساع 390
const FIXED_GRIDS = new Map([
  ['src/app/calendar/page.tsx', ['grid grid-cols-7 gap-1 mb-2', 'grid grid-cols-7 gap-1']],
  ['src/app/my/leaves/page.tsx', ['grid grid-cols-3 gap-3 text-center']],
])
// جدولين عمودين (البند/المبلغ) في القسيمة — بيساعوا الموبايل من غير تمرير
const NARROW_TABLES = new Map([['src/app/payroll/payslip/[id]/page.tsx', 2]])
const classStrings = source => [...source.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{'([^']*)'\})|'([^'\n]*\bgrid-cols-[^'\n]*)'/g)].map(m => m[1] ?? m[2] ?? m[3] ?? m[4])

test('MOB-UI-06: شاشات البوابة — مفيش mr-72 ثابت، ولا grid-cols-3+ من غير بديل للشاشة الصغيرة، ولا col-span بيعمل عمود ضمني', () => {
  for (const file of PORTAL) {
    const source = read(file)
    assert.doesNotMatch(source, /(^|["'`\s])mr-72(?=["'`\s])/m, `${file}: mr-72 ثابت`)
    for (const cls of classStrings(source)) {
      const tokens = cls.split(/\s+/)
      const wide = tokens.filter(token => /^grid-cols-(\d+)$/.test(token) && Number(token.slice(10)) >= 3)
      if (!wide.length) continue
      if ((FIXED_GRIDS.get(file) ?? []).includes(cls.trim())) continue
      assert.ok(tokens.some(token => /^(sm|md|lg|xl|2xl):grid-cols-\d+$/.test(token)), `${file}: «${cls}» مالهاش بديل للشاشة الصغيرة`)
    }
    // col-span بدون بادئة جوّه شبكة عمود واحد بيعمل عمود ضمني ويوسّع الصفحة
    assert.doesNotMatch(source, /(^|["'`\s])col-span-([2-9]|1[0-2])(?=["'`\s])/m, `${file}: col-span من غير بادئة`)
  }
  // الشبكات اللي اتعدلت بالاسم: عمود/اتنين على الموبايل وزي ما كانت من lg
  const expect = {
    'src/components/dashboard/EmployeeHome.tsx': ['grid grid-cols-1 lg:grid-cols-3 gap-6', 'card p-6 lg:col-span-2', 'grid grid-cols-1 sm:grid-cols-2 gap-4'],
    'src/components/dashboard/QuickActions.tsx': ['grid grid-cols-2 sm:grid-cols-4 gap-4'],
    'src/app/my/attendance/page.tsx': ['grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-10 gap-4'],
    'src/app/my/leaves/page.tsx': ['grid grid-cols-1 sm:grid-cols-2 gap-4', 'card p-8 text-center sm:col-span-2'],
    'src/app/leaves/request/page.tsx': ['grid grid-cols-2 sm:grid-cols-4 gap-3'],
    'src/app/payroll/payslip/[id]/page.tsx': ['grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8'],
    'src/app/requests/page.tsx': ['grid grid-cols-1 sm:grid-cols-2 gap-3', "'sm:col-span-2'"],
  }
  for (const [file, snippets] of Object.entries(expect)) for (const snippet of snippets) assert.ok(read(file).includes(snippet), `${file}: ${snippet}`)
})

test('MOB-UI-07: الجداول جوّه overflow-x-auto، والنوافذ جوّه الشاشة بهامش وmax-h وتمرير داخلي', () => {
  for (const file of PORTAL) {
    const source = read(file)
    let narrow = 0
    for (const match of source.matchAll(/<table\b/g)) {
      const before = source.slice(Math.max(0, match.index - 160), match.index)
      if (before.includes('overflow-x-auto')) continue
      narrow++
    }
    assert.equal(narrow, NARROW_TABLES.get(file) ?? 0, `${file}: جدول برّه overflow-x-auto`)
    const overlays = [...source.matchAll(/className="fixed inset-0 ([^"]*)"/g)]
    assert.equal(overlays.length, (source.match(/fixed inset-0/g) || []).length, `${file}: نافذة بصيغة ماتتفحصش`)
    for (const match of overlays) {
      const overlay = match[1].split(/\s+/)
      const panel = /className="([^"]*)"/.exec(source.slice(match.index + match[0].length))?.[1].split(/\s+/) ?? []
      // درج التفاصيل الجانبي في «طلباتي» بطول الشاشة وتمريره جوّاه
      if (overlay.includes('justify-end')) {
        assert.ok(panel.includes('h-full') && panel.includes('overflow-y-auto') && panel.includes('w-full'), `${file}: ${panel.join(' ')}`)
        continue
      }
      assert.ok(overlay.includes('p-4') || overlay.includes('max-lg:p-4'), `${file}: النافذة لازقة في حرف الشاشة (${match[1]})`)
      assert.ok(panel.includes('w-full'), `${file}: ${panel.join(' ')}`)
      assert.ok(panel.some(c => /^(max-lg:)?max-h-\[/.test(c)) && panel.some(c => /^(max-lg:)?overflow-y-auto$/.test(c)), `${file}: النافذة من غير max-h وتمرير داخلي (${panel.join(' ')})`)
    }
  }
})

test('MOB-UI-08: لوحة الإشعارات جوّه الشاشة على الموبايل، ومنتقي الموظف قايمته مقصوصة على عرض الشاشة', () => {
  const header = read('src/components/layout/Header.tsx')
  assert.ok(header.includes('<div className="sm:relative">'), 'على الموبايل اللوحة بتتموضع على الهيدر كله')
  assert.ok(header.includes('className="absolute left-4 sm:left-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-96 '))
  assert.ok(header.includes('max-h-[50vh] sm:max-h-96 overflow-y-auto'))
  assert.ok(header.includes('className="hidden sm:block p-3 bg-gray-100'), 'الترس بيستخبى على الموبايل (الإعدادات في القائمة)')
  const picker = read('src/components/EmployeePicker.tsx')
  assert.match(picker, /const width = Math\.min\(Math\.max\(rect\.width, POPUP_MIN_WIDTH\), window\.innerWidth - 16\)/)
  assert.match(picker, /const left = Math\.max\(8, Math\.min\(rect\.right - width, window\.innerWidth - width - 8\)\)/)
})

test('MOB-UI-09: الطباعة — زرار القائمة مابيتطبعش، وطباعة الهيكل التنظيمي بتلغي هامش القائمة الجديد (lg:mr-72)', () => {
  assert.ok(read('src/components/layout/Header.tsx').includes('lg:hidden print:hidden shrink-0'))
  const { ORG_CHART_CSS } = require('../../src/components/org-chart/OrgChartView')
  const print = ORG_CHART_CSS.slice(ORG_CHART_CSS.indexOf('@media print'))
  assert.ok(print.includes('.lg\\:mr-72 { margin-right: 0 !important; }'), 'اسم الكلاس الجديد متهرّب صح في CSS الطباعة')
  assert.ok(!/\.mr-72\b/.test(print.replace('.lg\\:mr-72', '')), 'مفيش إشارة للكلاس القديم')
})

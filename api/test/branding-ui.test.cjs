'use strict'
// هوية الشركة في الواجهة (طلب المالك 26 سبتمبر): اسم الشركة وشعارها فوق القائمة الجانبية وفي صفحة الدخول (من GET /api/branding
// العامة)، و«بواسطة Logic Leap HR» صغير في آخرهم وفي عنوان التبويب، وصفحة دخول جديدة بتدرّج ونقشة (مش شاشة زرقا).
// بلا خادم ولا قاعدة: دوال الهوية نفسها + رسم صفحة الدخول على الخادم + ربط الشاشات بالحدث والعنوان.
// Run: node --test api/test/branding-ui.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true,
  compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const root = path.resolve(__dirname, '..', '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')
// '@/x' ← src/x (نفس paths في tsconfig الواجهة)
const originalLoad = Module._load
Module._load = function (request, parent, isMain) {
  return originalLoad.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, parent, isMain)
}
const api = require('../../src/lib/api')
const branding = require('../../src/lib/branding')
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'

test('BR-UI-01: اسم المنتج ثابت، والحدث باسم ثابت، والعلامة البديلة بحرف الشركة المميز (مش «شركة») أو حرفين للاتيني', () => {
  assert.equal(branding.PRODUCT_NAME, 'Logic Leap HR')
  assert.equal(require('../../src/lib/product').PRODUCT_NAME, 'Logic Leap HR')
  assert.equal(branding.BRANDING_CHANGED, 'hr:branding-changed')
  const cases = [['Logic Leap HR', 'LL'], ['شركة مهارة للتقنية', 'م'], ['المهارة', 'م'], ['مجموعة الفطيم', 'ف'],
    ['الشركة الوطنية للنقل', 'و'], ['Maharah Technology Co.', 'MT'], ['Acme', 'A'], ['«مهارة»', 'م'], ['شركة', 'ش'], ['   ', '']]
  for (const [name, initials] of cases) assert.equal(branding.brandInitials(name), initials, name)
})

test('BR-UI-02: fetchBranding بيقص الاسم، وبيحوّل مسار الشعار لرابط على الـAPI نفسه، ومايقبلش رابط من برّه', async () => {
  const realFetch = global.fetch
  const calls = []
  const respond = (body) => { global.fetch = async (url, init) => { calls.push({ url, init }); return new Response(JSON.stringify(body), { status: 200 }) } }
  try {
    respond({ productName: 'Logic Leap HR', companyName: '  شركة مهارة  ', logoUrl: '/api/branding/logo?v=7' })
    assert.deepEqual(await api.fetchBranding(), { productName: 'Logic Leap HR', companyName: 'شركة مهارة', logoUrl: `${API_BASE}/branding/logo?v=7` })
    assert.equal(calls[0].url, `${API_BASE}/branding`)
    assert.equal(calls[0].init.method, undefined, 'GET')
    // مش مضبوط = null، ورابط مش /api/… (سكربت أو موقع تاني) = null
    for (const logoUrl of ['javascript:alert(1)', 'https://evil.example/logo.png', '//evil.example/x.png', '', null, 5]) {
      respond({ productName: 'Logic Leap HR', companyName: '', logoUrl })
      assert.deepEqual(await api.fetchBranding(), { productName: 'Logic Leap HR', companyName: null, logoUrl: null }, JSON.stringify(logoUrl))
    }
    // رد ناقص = اسم المنتج الثابت
    respond({})
    assert.deepEqual(await api.fetchBranding(), { productName: 'Logic Leap HR', companyName: null, logoUrl: null })
  } finally { global.fetch = realFetch }
})

test('BR-UI-03: صفحة الدخول بتترسم على الخادم بالنصّين: هيكل مكان الاسم (مفيش اسم احتياطي يومض)، والنقشة والكروت و«بواسطة Logic Leap HR»', () => {
  const React = require(path.join(root, 'node_modules', 'react'))
  const { renderToString } = require(path.join(root, 'node_modules', 'react-dom', 'server'))
  const LoginPage = require('../../src/app/login/page').default
  const html = renderToString(React.createElement(LoginPage))
  assert.match(html, /dir="rtl"/)
  assert.match(html, /lg:flex-row-reverse/, 'النص البصري شمال والفورم يمين على الشاشة الكبيرة، وفوق الفورم على الموبايل')
  assert.match(html, /id="ll-login-pattern"/, 'نقشة النجمة الثمانية')
  assert.match(html, /كل ما يخص فريقك في مكان واحد/)
  for (const chip of ['الحضور', 'الرواتب', 'الطلبات', 'الإجازات']) assert.ok(html.includes(chip), chip)
  assert.match(html, /بواسطة/)
  assert.match(html, /<bdi[^>]*>Logic Leap HR<\/bdi>/)
  // قبل ما الهوية توصل: هيكل بيتنفس (وبيقف مع تقليل الحركة) — مش «Logic Leap HR» مكان اسم الشركة
  assert.match(html, /motion-safe:animate-pulse/)
  assert.doesNotMatch(html, /title="Logic Leap HR"/)
  // الفورم نفسه زي ما هو
  for (const text of ['مرحباً بعودتك', 'البريد الإلكتروني', 'كلمة المرور', 'تذكرني', 'تسجيل الدخول']) assert.ok(html.includes(text), text)
  // مش شاشة زرقا: لا تدرّج النظام الأزرق ولا اسم النظام القديم
  assert.doesNotMatch(html, /from-primary-500|to-primary-700|نظام الموارد البشرية/)
})

test('BR-UI-04: القائمة الجانبية: هوية الشركة فوق (والطويل على سطرين بتلميح) و«بواسطة» تحت؛ والعنوان والتبويب باسم المنتج', () => {
  const sidebar = read('src/components/layout/Sidebar.tsx')
  assert.match(sidebar, /const brand = useBranding\(\)/)
  assert.match(sidebar, /<BrandLogo brand=\{brand\} size="md" \/>/)
  assert.match(sidebar, /title=\{brand\.companyName\} className="[^"]*line-clamp-2 break-words/)
  assert.match(sidebar, /flex flex-wrap items-center/, 'الشعار العريض بينزّل الاسم لسطر تحته')
  assert.match(sidebar, /<PoweredBy className="mt-3" \/>\n\s+<\/div>\n\s+<\/aside>/, '«بواسطة» آخر حاجة في القائمة')
  assert.doesNotMatch(sidebar, /نظام الموارد البشرية/)
  const header = read('src/components/layout/Header.tsx')
  assert.match(header, /`\$\{pageTitle\} \| \$\{PRODUCT_NAME\}`/)
  assert.doesNotMatch(header, /\| نظام الموارد البشرية/)
  const layout = read('src/app/layout.tsx')
  assert.match(layout, /import \{ PRODUCT_NAME \} from '@\/lib\/product'/)
  assert.match(layout, /title: PRODUCT_NAME,/)
  // PoweredBy وlayout مكوّنات خادم ممكن: اسم المنتج من ملف بلا React
  assert.doesNotMatch(read('src/lib/product.ts'), /from 'react'/)
})

test('BR-UI-05: حفظ الاسم أو الشعار في «بيانات الشركة» بيبعت الحدث (حتى لو الحفظ وقف بعدهم)، والهوية بتعيد الجلب عليه', () => {
  const page = read('src/app/settings/company/page.tsx')
  assert.match(page, /import \{ BRANDING_CHANGED \} from '@\/lib\/branding'/)
  assert.match(page, /if \(key === 'company\.name' \|\| key === LOGO_KEY\) brandingSaved = true/)
  const finallyBlock = page.slice(page.indexOf('} finally {', page.indexOf('const handleSave')), page.indexOf('const name = (values'))
  assert.match(finallyBlock, /if \(brandingSaved\) window\.dispatchEvent\(new Event\(BRANDING_CHANGED\)\)/)
  const lib = read('src/lib/branding.ts')
  assert.match(lib, /window\.addEventListener\(BRANDING_CHANGED, load\)/)
  // نسخة الجلسة: القراءة والكتابة بس، وكل واحدة جوّه try (تخزين مقفول = نكمّل بالجلب)
  assert.equal((lib.match(/sessionStorage\./g) || []).length, 2)
  assert.match(lib.slice(lib.indexOf('const readStored'), lib.indexOf('const writeStored')), /try \{\n\s+const raw = sessionStorage\.getItem\(STORAGE_KEY\)/)
  assert.match(lib.slice(lib.indexOf('const writeStored'), lib.indexOf('const getSnapshot')), /try \{\n\s+sessionStorage\.setItem\(STORAGE_KEY/)
  // جلب واحد لكل تحميل صفحة، ورد قديم مايكتبش فوق رد أحدث
  assert.match(lib, /if \(!requested\) \{\n\s+requested = true\n\s+load\(\)/)
  assert.match(lib, /if \(mine !== generation\) return/)
})

test('BR-UI-06: الحركة كلها ll-* جوّه prefers-reduced-motion: no-preference، ومفيش صورة ولا أصل خارجي', () => {
  const css = read('src/app/globals.css')
  const block = css.slice(css.indexOf('@media (prefers-reduced-motion: no-preference)'), css.indexOf('@keyframes ll-rise'))
  for (const name of ['.ll-rise', '.ll-drift', '.ll-drift-slow', '.ll-spin-slow']) {
    assert.ok(block.includes(`${name} {`), name)
    // الكلاس مايتعرّفش برّه الـmedia
    assert.equal(css.split(`${name} {`).length - 1, 1, `${name} متعرّف مرة واحدة جوّه الـmedia`)
  }
  const files = ['src/app/login/page.tsx', 'src/components/branding/BrandBackdrop.tsx', 'src/components/branding/BrandLogo.tsx',
    'src/components/branding/PoweredBy.tsx', 'src/app/login/change-password/page.tsx']
  for (const file of files) {
    const source = read(file)
    assert.doesNotMatch(source, /https?:\/\/(?!www\.w3\.org\/2000\/svg)/, `${file}: مفيش أصل خارجي`)
    // مكتبات النظام الموجودة بس
    for (const [, from] of source.matchAll(/from '([^']+)'/g)) {
      assert.match(from, /^(react|clsx|lucide-react|@\/.+|\.\/.+)$/, `${file}: ${from}`)
    }
  }
})

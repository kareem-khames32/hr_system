'use strict'
// B2.12 (ب): التطبيق القابل للتثبيت (PWA) — فحص من غير متصفح (اختبار المتصفح نفسه في portal-mobile.e2e.cjs، PM-04):
//  PW-01) ملف التعريف: اسم المنتج، والبداية والنطاق، وعرض standalone، وعربي من اليمين للشمال، والأيقونات التلاتة بمقاساتها وأغراضها.
//  PW-02) الأيقونات ملفات PNG سليمة بالمقاس المكتوب: العادية بزوايا شفافة (زي icon.svg)، و«maskable» وأيقونة iOS من غير شفافية،
//         والتلاتة بلون الأيقونة في النص.
//  PW-03) زرار التثبيت: مابيترسمش من غير عرض المتصفح، وبيسمع beforeinstallprompt وappinstalled، ومكانه آخر القايمة قبل «بواسطة».
//  PW-04) من غير service worker ولا تخزين مؤقت ولا تغيير في viewport، وخطوة HTTPS مكتوبة في دليل التحديث.
// Run (من api/): node --test test/pwa-ui.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib')
const Module = require('node:module')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true, compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const root = path.resolve(__dirname, '..', '..')
const load = Module._load
Module._load = function (request, parent, isMain) {
  return load.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, parent, isMain)
}
const React = require('../../node_modules/react')
const { renderToStaticMarkup } = require('../../node_modules/react-dom/server')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')
const manifest = require('../../src/app/manifest').default()

/** PNG: المقاس ونوع اللون من الترويسة، والبكسلات (RGBA، من غير فلتر) من IDAT */
function png(file) {
  const data = fs.readFileSync(path.join(root, file))
  assert.deepEqual([...data.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], `${file}: مش PNG`)
  const width = data.readUInt32BE(16), height = data.readUInt32BE(20)
  assert.deepEqual([data[24], data[25]], [8, 6], `${file}: 8 بت RGBA`)
  const chunks = []
  for (let at = 8; at < data.length;) {
    const length = data.readUInt32BE(at), type = data.toString('ascii', at + 4, at + 8)
    if (type === 'IDAT') chunks.push(data.subarray(at + 8, at + 8 + length))
    at += 12 + length
  }
  const raw = zlib.inflateSync(Buffer.concat(chunks))
  assert.equal(raw.length, height * (width * 4 + 1), `${file}: طول البكسلات`)
  const pixel = (x, y) => { assert.equal(raw[y * (width * 4 + 1)], 0, 'صف من غير فلتر'); const at = y * (width * 4 + 1) + 1 + x * 4; return [...raw.subarray(at, at + 4)] }
  return { width, height, pixel }
}

test('PW-01: ملف التعريف — اسم المنتج، البداية والنطاق، standalone، عربي RTL، والأيقونات بمقاساتها وأغراضها', () => {
  const { PRODUCT_NAME } = require('../../src/lib/product')
  assert.deepEqual([manifest.name, manifest.short_name], [PRODUCT_NAME, PRODUCT_NAME])
  assert.deepEqual([manifest.start_url, manifest.scope, manifest.display, manifest.dir, manifest.lang], ['/', '/', 'standalone', 'rtl', 'ar'])
  assert.deepEqual([manifest.theme_color, manifest.background_color], ['#1d4ed8', '#f9fafb'])
  assert.deepEqual(manifest.icons, [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ])
  // شرط المتصفح للتثبيت: أيقونة 192 وأيقونة 512 على الأقل
  assert.deepEqual(manifest.icons.filter(icon => icon.purpose === 'any').map(icon => icon.sizes), ['192x192', '512x512'])
  assert.equal(manifest.prefer_related_applications, undefined)
})

test('PW-02: الأيقونات PNG سليمة بالمقاس المكتوب — العادية بزوايا شفافة، و«maskable» وأيقونة iOS من غير شفافية، وبلون الأيقونة', () => {
  const BLUE = [0x1d, 0x4e, 0xd8, 255]
  for (const icon of manifest.icons) {
    const image = png(`public${icon.src}`), size = Number(icon.sizes.split('x')[0])
    assert.deepEqual([image.width, image.height], [size, size], icon.src)
    // الركن: شفاف في العادية (زوايا مدوّرة)، وأزرق في maskable (أندرويد بيقص الشكل هو)
    assert.deepEqual(image.pixel(0, 0), icon.purpose === 'maskable' ? BLUE : [0, 0, 0, 0], `${icon.src}: الركن`)
    // نص الحرف الأبيض (عمود L الأول) ونص الخلفية الزرقا تحت الحروف
    const at = (x, y) => image.pixel(Math.round(x * size / 64), Math.round(y * size / 64))
    const scale = icon.purpose === 'maskable' ? 0.68 : 1, glyph = (x, y) => at((x - 32) * scale + 32, (y - 32) * scale + 32)
    assert.deepEqual(glyph(20, 28), [255, 255, 255, 255], `${icon.src}: الحرف الأبيض`)
    assert.deepEqual(glyph(46, 38), [0xe9, 0xb9, 0x49, 255], `${icon.src}: الحرف الدهبي`)
    assert.deepEqual(at(32, 58), BLUE, `${icon.src}: الخلفية`)
  }
  // أيقونة iOS (Next بيربطها من src/app/apple-icon.png): 180 ومن غير شفافية
  const apple = png('src/app/apple-icon.png')
  assert.deepEqual([apple.width, apple.height, apple.pixel(0, 0), apple.pixel(179, 179)], [180, 180, BLUE, BLUE])
  // نفس أشكال أيقونة التبويب
  const svg = read('src/app/icon.svg')
  for (const part of ['<rect width="64" height="64" rx="14" fill="#1d4ed8"/>', '<path d="M16 14h8v28h14v8H16z" fill="#ffffff"/>', '<path d="M34 14h8v20h10v8H34z" fill="#e9b949"/>']) assert.ok(svg.includes(part), part)
})

test('PW-03: زرار التثبيت — مابيترسمش من غير عرض المتصفح، وبيسمع العرض والتثبيت، ومكانه آخر القايمة قبل «بواسطة»', () => {
  const { InstallAppButton } = require('../../src/components/layout/InstallAppButton')
  // من غير حدث beforeinstallprompt (الرسم على الخادم، سفاري، HTTP): ولا عنصر
  assert.equal(renderToStaticMarkup(React.createElement(InstallAppButton, { className: 'mt-3' })), '')
  const source = read('src/components/layout/InstallAppButton.tsx')
  for (const part of ["window.addEventListener('beforeinstallprompt', offered)", "window.addEventListener('appinstalled', installed)",
    "window.removeEventListener('beforeinstallprompt', offered)", "window.removeEventListener('appinstalled', installed)",
    '      event.preventDefault()\n      setOffer(event as InstallPrompt)', '  if (!offer) return null\n', '    await offer.prompt()\n', '    setOffer(null)\n', 'data-install-app', 'ثبّت التطبيق على الجهاز']) {
    assert.ok(source.includes(part), part)
  }
  const sidebar = read('src/components/layout/Sidebar.tsx')
  assert.ok(sidebar.includes("import { InstallAppButton } from './InstallAppButton'"))
  assert.match(sidebar, /        <InstallAppButton className="mt-3" \/>\n        \{\/\* اسم المنتج صغير في الآخر — الاسم الكبير فوق للشركة \*\/\}\n        <PoweredBy className="mt-3" \/>\n/)
})

test('PW-04: من غير service worker ولا تخزين مؤقت ولا تغيير في viewport — وخطوة HTTPS مكتوبة في دليل التحديث', () => {
  assert.equal(fs.existsSync(path.join(root, 'public', 'sw.js')), false)
  // vendor: ناتج بناء (prepare-pdf-viewer.cjs بينسخ عارض PDF قبل next build) ومتجاهل في git — الاختبار كان بيفشل على أي شجرة اتبنت
  assert.deepEqual(fs.readdirSync(path.join(root, 'public')).filter(name => name !== 'vendor'), ['icons'])
  assert.deepEqual(fs.readdirSync(path.join(root, 'public', 'icons')).sort(), ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png'])
  const walk = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`])
  for (const file of walk('src').filter(name => /\.(tsx|ts)$/.test(name))) assert.doesNotMatch(read(file), /serviceWorker|caches\.open|export (const|function) viewport\b/, file)
  const deploy = read('docs/ops/deploy.md')
  for (const part of ['## HTTPS (لازم لتثبيت التطبيق على الموبايل وإشعارات الجهاز)', 'الشهادة بتتعمل لاسم، مش لرقم IP', '`FRONTEND_URL=https://<الاسم>`', '`NEXT_PUBLIC_API_URL=https://<الاسم>/api`', '«ثبّت التطبيق على الجهاز»']) {
    assert.ok(deploy.includes(part), part)
  }
})

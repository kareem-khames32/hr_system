// B6.2 (أ) — لغتين: قاموس الواجهة (كل بنود القايمة وعناوين الشاشات ليها ترجمة)، لغة الحساب في الخادم (تفضيل عرض بس، بمسارين لصاحب الحساب)،
// توصيل الإطار، وكلاسات الاتجاه المنطقية. قراءة مصدر بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..'), webRoot = path.resolve(apiRoot, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
const language = require('../src/auth/user-language')
const web = rel => fs.readFileSync(path.join(webRoot, 'src', rel), 'utf8').replace(/\r\n/g, '\n')
const api = rel => fs.readFileSync(path.join(apiRoot, 'src', rel), 'utf8').replace(/\r\n/g, '\n')
const dictionary = () => Object.fromEntries([...web('i18n/en.ts').matchAll(/^\s*'((?:[^'\\]|\\.)+)': '((?:[^'\\]|\\.)*)',?$/gm)].map(match => [match[1], match[2]]))

test('I18N-01: القاموس — كل بند في القايمة وكل عنوان شاشة ليه ترجمة إنجليزي مش فاضية ومش عربي، ومن غير مفتاح مكرر', () => {
  const en = dictionary()
  const labels = [...web('components/layout/Sidebar.tsx').matchAll(/label: '([^']+)'/g)].map(match => match[1])
  const titles = [...web('components/layout/pageTitles.ts').matchAll(/^\s*\['[^']+', '([^']+)'\]/gm)].map(match => match[1])
  assert.ok(labels.length > 100 && titles.length > 100, `${labels.length} ${titles.length}`)
  for (const text of new Set([...labels, ...titles, 'لوحة التحكم', 'لوحتي'])) {
    assert.ok(en[text], `من غير ترجمة: ${text}`)
    assert.doesNotMatch(en[text], /[؀-ۿ]/, `الترجمة فيها عربي: ${text}`)
  }
  const keys = [...web('i18n/en.ts').matchAll(/^\s*'((?:[^'\\]|\\.)+)': '/gm)].map(match => match[1])
  assert.equal(new Set(keys).size, keys.length, 'مفتاح مكرر في القاموس')
})

test('I18N-02: الواجهة — العربي هو الأصل (من غير ترجمة بيرجع النص)، الاتجاه على <html>، والإطار بيترجم القايمة والعنوان، وزرار اللغة بيظهر بس لو الخادم جاهز', () => {
  const lib = web('lib/i18n.ts'), layout = web('components/layout/MainLayout.tsx'), sidebar = web('components/layout/Sidebar.tsx'), header = web('components/layout/Header.tsx'), client = web('lib/api.ts')
  assert.match(lib, /return lang === 'en' \? EN\[text\] \?\? text : text/)
  assert.match(lib, /document\.documentElement\.lang = lang\n\s+document\.documentElement\.dir = dirOf\(lang\)/)
  assert.match(lib, /export const dirOf = \(lang: Lang\): 'rtl' \| 'ltr' => \(lang === 'en' \? 'ltr' : 'rtl'\)/)
  // تخزين المتصفح تفضيل بس: القراءة والكتابة جوه try، ومن غيره الصفحة عربي
  assert.equal((lib.match(/try \{ [^\n]*localStorage/g) || []).length, 2)
  assert.match(layout, /useEffect\(\(\) => \{ initLang\(\) \}, \[\]\)/)
  assert.equal((sidebar.match(/\{t\(item\.label\)\}/g) || []).length, 2)
  assert.match(sidebar, /\{t\(child\.label\)\}/)
  assert.doesNotMatch(sidebar, /\{item\.label\}|\{child\.label\}/)
  assert.match(header, /\{t\(pageTitle\)\}<\/h2>/)
  // لغة الحساب من الخادم، والزرار ورا `changeable`، والحفظ هو اللي بيغيّر العرض
  assert.match(header, /fetchAccountLanguage\(\)\.then\(\(account\) => \{[\s\S]{0,200}setLanguageChangeable\(account\.changeable === true\)/)
  assert.match(header, /\{languageChangeable && \(\s*<button type="button" onClick=\{switchLanguage\}[^>]*data-language-switch/)
  assert.match(header, /try \{ setLang\(\(await saveAccountLanguage\(next\)\)\.language\) \} catch/)
  assert.match(client, /export const fetchAccountLanguage = \(\) => get<AccountLanguage>\('\/auth\/language'\)/)
  assert.match(client, /export const saveAccountLanguage = \(language: 'ar' \| 'en'\) => apiFetch<AccountLanguage>\('\/auth\/language', \{ method: 'PUT', body: JSON\.stringify\(\{ language \}\) \}\)/)
})

test('I18N-03: الخادم — لغة الحساب عمود برّه الكيان بيتقري ويتكتب بصف صاحبه بس، بمسارين من غير صلاحية ومن غير استثناء للجلسات المقيّدة', () => {
  assert.deepEqual([language.UI_LANGUAGES, language.DEFAULT_UI_LANGUAGE, ['ar', 'en', 'fr', '', null, 'AR'].map(language.isUiLanguage)], [['ar', 'en'], 'ar', [true, true, false, false, false, false]])
  const rules = api('auth/user-language.ts'), controller = api('auth/auth.controller.ts'), service = api('auth/auth.service.ts'), entity = api('auth/user.entity.ts')
  assert.match(entity, /@Column\(\{ type: 'nvarchar', length: 5, nullable: true, select: false, insert: false, update: false \}\)\n\s+language: string \| null/)
  // قبل الترحيل: القراءة عربي والكتابة مرفوضة؛ والكتابة على صف الحساب نفسه بعمود واحد
  assert.match(rules, /if \(!\(await userLanguageReady\(em\)\)\) return DEFAULT_UI_LANGUAGE/)
  assert.match(rules, /if \(!isUiLanguage\(language\)\) throw new BadRequestException\(LANGUAGE_INVALID\)\n\s+if \(!\(await userLanguageReady\(em\)\)\) throw new ConflictException\(LANGUAGE_NOT_READY\)\n\s+await em\.query\('UPDATE dbo\.users SET \[language\] = @1 WHERE \[id\] = @0', \[userId, language\]\)/)
  assert.match(service, /language: await readUserLanguage\(this\.users\.manager, payload\.sub\)/)
  assert.match(service, /language: await writeUserLanguage\(this\.users\.manager, payload\.sub, language\)/)
  // المسارين بحارس الدخول بس — ولا استثناء جلسة مقيّدة (كلمة مؤقتة، تفعيل TOTP، بوابة السياسات، التهيئة)
  assert.match(controller, /\n  @UseGuards\(JwtAuthGuard\)\n  @Get\('language'\)\n  language\(@CurrentUser\(\) user: JwtPayload\) \{/)
  assert.match(controller, /\n  @UseGuards\(JwtAuthGuard\)\n  @Put\('language'\)\n  setLanguage\(@CurrentUser\(\) user: JwtPayload, @Body\('language'\) language: unknown\) \{/)
})

test('I18N-04: كلاسات الاتجاه — الواجهة على الكلاسات المنطقية (بداية/نهاية)؛ الفيزيائي الباقي على عناصر اتجاهها صريح أو توسيط بس، ومايزيدش', () => {
  const PHYSICAL = /(^|[\s"'`:!])-?(?:(?:mr|ml|pr|pl|right|left)-[a-z0-9.\[]|text-(?:right|left)(?![a-z-])|(?:rounded|border)-(?:tr|tl|br|bl|r|l)(?![a-z]))/g
  let physical = 0, logical = 0
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) { walk(full); continue }
      if (!/\.(tsx|ts)$/.test(entry.name)) continue
      const text = fs.readFileSync(full, 'utf8')
      physical += (text.match(PHYSICAL) || []).length
      logical += (text.match(/(^|[\s"'`:!])-?(?:(?:ms|me|ps|pe|start|end)-[a-z0-9.\[]|text-(?:start|end)(?![a-z-]))/g) || []).length
    }
  }
  walk(path.join(webRoot, 'src'))
  // كود جديد يستخدم ms-/me-/ps-/pe-/start-/end-/text-start/text-end — الحد ده مايتزوّدش
  assert.ok(physical <= 26, `كلاسات فيزيائية: ${physical} — استخدم المنطقية`)
  assert.ok(logical > 800, String(logical))
  // هامش المحتوى جنب القايمة، والقايمة نفسها، وCSS الطباعة بنفس الاسم المنطقي
  assert.ok(web('components/layout/MainLayout.tsx').includes('<div className="lg:ms-72">'))
  assert.ok(web('components/layout/Sidebar.tsx').includes(`'fixed start-0 top-0 h-screen w-72 bg-white border-e border-gray-100 flex flex-col z-50'`))
  assert.ok(web('components/org-chart/OrgChartView.tsx').includes('.lg\\\\:ms-72 { margin-inline-start: 0 !important; }'))
})

test('I18N-05: (ب) البوابة والقسيمة — كل نص متلفّ في دالة الترجمة ليه مفتاح في القاموس، مفيش نص عربي ظاهر برّاها في القسيمتين، والتفقيط العربي بالعربي بس', () => {
  const en = dictionary()
  const has = key => Object.prototype.hasOwnProperty.call(en, key.replace(/\\'/g, "'")) || Object.prototype.hasOwnProperty.call(en, key)
  const pages = ['app/my/payslips/page.tsx', 'app/payroll/payslip/[id]/page.tsx', 'components/dashboard/EmployeeHome.tsx']
  for (const page of pages) {
    const source = web(page)
    assert.match(source, /const t = useT\(\)/, page)
    const wrapped = [...source.matchAll(/\bt\('((?:[^'\\]|\\.)+)'\)/g)].map(match => match[1]).filter(key => /[\u0600-\u06FF]/.test(key))
    assert.ok(wrapped.length >= 15, `${page}: ${wrapped.length}`)
    for (const key of wrapped) assert.ok(has(key), `${page}: من غير ترجمة: ${key}`)
  }
  // القسيمتين: مفيش نص عربي ظاهر برّه دالة الترجمة (نص JSX خام، أو خاصية نصها عربي)
  for (const page of pages.slice(0, 2)) {
    const source = web(page).split('\n').filter(line => !/^\s*(\/\/|\{\/\*)/.test(line)).join('\n')
    assert.doesNotMatch(source, />\s*[^<>{}\n]*[\u0600-\u06FF][^<>{}\n]*</, page)
    assert.doesNotMatch(source, /\s(title|placeholder|aria-label|alt)="[^"]*[\u0600-\u06FF]/, page)
  }
  const slip = web('app/payroll/payslip/[id]/page.tsx'), list = web('app/my/payslips/page.tsx')
  // أسماء البنود والحالة وطريقة الدفع والعملة بتعدّي على القاموس عند العرض
  for (const text of ['{t(earning.name)}', '{t(deduction.name)}', "{t(runStatusLabels[run.status] ?? 'غير معروف')}", "{t(payMethodLabels[employee.payMethod ?? item.payMethod] ?? 'غير معروف')}", '{t(currency)}']) assert.ok(slip.includes(text), text)
  for (const text of ["{t(runStatusLabels[run.status] ?? 'غير معروف')}", "{t(payMethodLabels[item.payMethod] ?? 'غير معروف')}", '{t(currency)}']) assert.ok(list.includes(text), text)
  // المبلغ بالحروف عربي بس — في الإنجليزي السطر مابيظهرش
  assert.match(slip, /\{lang === 'ar' && <p className="text-primary-200 text-sm mt-2">\{numberToArabicWords\(netSalary, currency\)\}<\/p>\}/)
  // بنود القسيمة الثابتة اللي الخادم بيسميها ليها ترجمة
  for (const name of ['الأساسي', 'بدل السكن', 'بدل الانتقال', 'الإضافي', 'التأخير', 'الغياب', 'السلف', 'التأمينات (حصة الموظف)', 'خصومات أخرى', 'ر.س', 'ج.م']) assert.ok(has(name), name)
})

test('I18N-06: (ج) الحقول الثنائية — الاسم الإنجليزي لو اللغة إنجليزي وهو مكتوب، وإلا العربي؛ والقسيمة بتعرض اسم الموظف والفرع بيها', () => {
  const lib = web('lib/i18n.ts'), slip = web('app/payroll/payslip/[id]/page.tsx')
  assert.match(lib, /export function localName\(lang: Lang, arabic: string \| null \| undefined, english: string \| null \| undefined\): string \{\n  const en = typeof english === 'string' \? english\.trim\(\) : ''\n  return lang === 'en' && en \? en : arabic \?\? ''\n\}/)
  assert.ok(slip.includes('{localName(lang, employee.fullName, employee.fullNameEn)}'))
  assert.ok(slip.includes('{branch ? localName(lang, branch.name, branch.nameEn) : brand.companyName}'))
})

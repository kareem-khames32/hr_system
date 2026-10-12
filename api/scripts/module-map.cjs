'use strict'
// بيكتب docs/plan/module-map.md: جرد كل شاشة وبند قايمة وكنترولر ووجهة تنفيذ ومهمة مجدولة ومجموعة إعدادات بموديولها ومكانها في القايمة (B-ADD.21).
// من الكود نفسه (scripts/module-map-lib.cjs) — من غير قاعدة بيانات ولا خادم. التشغيل من api/:
//   node scripts/module-map.cjs            يكتب الملف
//   node scripts/module-map.cjs --check    يقول لو الملف المكتوب قديم (exit 1) من غير ما يكتب
const fs = require('node:fs'), path = require('node:path')
const lib = require('./module-map-lib.cjs')
const core = require('../test/fixtures/module-map-core.cjs')
const registry = lib.registry()
const { MODULES, MODULE_KEYS, MODULE_FEATURES, MODULE_GROUPS, MODULE_PRESETS } = registry

const nameOf = key => key === null || key === undefined ? '—' : `${MODULES[key].nameAr} \`${key}\``
const kindOf = key => key === null || key === undefined ? 'نواة' : MODULES[key].core ? 'أساسي' : MODULES[key].defaultEnabled ? 'اختياري (مفعّل)' : 'اختياري (مقفول)'
const featureOf = key => key ? `${MODULE_FEATURES[key].nameAr} \`${key}\`` : ''
const cell = value => String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
const table = (head, rows) => [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map(row => `| ${row.map(cell).join(' | ')} |`)].join('\n')
const code = value => `\`${value}\``

function build() {
  const menu = lib.menu(), pages = lib.pages(), controllers = lib.apiControllers(), handlers = lib.apiHandlers(), requests = lib.requests(), jobs = lib.jobs(),
    settings = lib.settings(), dashboard = lib.dashboard(), notifications = lib.notifications()
  const owner = href => registry.routeOwner(href)
  const out = []
  const section = (title, ...body) => out.push(`## ${title}`, '', ...body, '')

  out.push('# خريطة الموديولات — كل نقطة في النظام وموديولها ومكانها', '',
    '> **ملف مولَّد — ماتعدّلوش بإيدك.** بيتكتب من الكود بالأمر `node scripts/module-map.cjs` (من `api/`). الدفعة B-ADD.21، كلمة المالك 12 أكتوبر 2026:',
    '> «أي حاجة مش محطوطة في الموديولات إن إحنا نفتحها ونقفلها نحطها في الموديولات… كل نقطة في النظام في المكان بتاعها، في الموديول بتاعها».', '',
    '**القاعدة:** الموديول المقفول شاشاته بتختفي من القايمة، ومساراته في الخادم بترد 404، ومهمته المجدولة مابتشتغلش، وأنواع طلباته مابتتعرضش للتقديم،',
    'ومجموعة إعداداته وقسمه في لوحة الإدارة بيختفوا. **القفل مابيمسحش أي بيانات.** «أساسي» = مايتقفلش (النواة).', '',
    `**الأعداد:** ${MODULE_KEYS.length} موديول (${MODULE_KEYS.filter(key => MODULES[key].core).length} أساسي و${MODULE_KEYS.filter(key => !MODULES[key].core).length} اختياري) · ${Object.keys(MODULE_FEATURES).length} ميزة فرعية · ` +
    `${pages.length} شاشة · ${menu.length} مجموعة في القايمة فيها ${menu.reduce((sum, group) => sum + group.children.length, 0)} بند · ${controllers.length} كنترولر فيهم ${handlers.length} مسار · ` +
    `${requests.handlers.length} وجهة تنفيذ و${requests.types.length} نوع طلب مزروع · ${jobs.list.length} مهمة مجدولة.`, '')

  // 1) الموديولات
  section('1) الموديولات',
    table(['الموديول', 'المجموعة', 'النوع', 'الباقة', 'بيعتمد على', 'المزايا الفرعية (كلها بتتفتح وتتقفل لوحدها)'], MODULE_KEYS.map(key => {
      const def = MODULES[key]
      return [nameOf(key), MODULE_GROUPS[def.group], kindOf(key), def.core ? '—' : def.preset ? MODULE_PRESETS[def.preset].nameAr : 'برّه الباقات',
        def.dependsOn.map(item => MODULES[item].nameAr).join('، ') || '—', Object.entries(def.features).map(([feature, item]) => `${item.nameAr} ${code(feature)}`).join(' · ') || '—']
    })))

  // 2) القايمة
  const whenOf = child => child.when ? lib.WHEN_LABELS[child.when] : ''
  section('2) القايمة الجانبية — الترتيب الثابت', 'كل شاشة في مكان واحد. البند بيظهر لو صلاحيته مع الحساب وموديول مساره (وميزته) مفعّل. «من غير صلاحية» = لكل حساب (بوابة الموظف).', '',
    ...menu.flatMap((group, index) => [`### ${index + 1}. ${group.label}`, '',
      table(['البند', 'المسار', 'الصلاحية', 'الموديول', 'الميزة', 'شرط ظهور'], group.children.map(child => {
        const own = owner(child.href)
        return [child.label, code(child.href), child.perm.map(code).join(' + ') || 'من غير صلاحية', nameOf(own.module), featureOf(own.feature), whenOf(child)]
      })), '']))

  // 3) الشاشات
  const placeOf = page => page.menu ? `${page.menu.group} ← ${page.menu.label}`
    : core.OFF_MENU_PAGES[page.route] ? `من غير بند: ${core.OFF_MENU_PAGES[page.route]}`
      : page.dynamic ? 'شاشة تفاصيل — بتتفتح من شاشتها' : '**من غير مكان**'
  section('3) كل شاشات الواجهة (`src/app`)', table(['المسار', 'الموديول', 'النوع', 'الميزة', 'مكانها'],
    pages.map(page => [code(page.route), nameOf(page.module), kindOf(page.module), featureOf(page.feature), placeOf(page)])))

  // 4) الكنترولرز
  section('4) كنترولرز الخادم (`api/src`)', 'وسم الكنترولر هو موديول كل مساراته، إلا المسارات المكتوبة في آخر عمود (وسمها على المسار نفسه بيكسب). الموديول المقفول = 404 حتى من غير دخول.', '',
    table(['الكنترولر', 'الملف', 'بادئة المسار', 'الموديول', 'عدد المسارات', 'مسارات بموديول أو ميزة غير الكنترولر'], controllers.map(controller => [
      code(controller.name), code(controller.file), controller.prefixes.map(code).join(' '),
      [controller.modules.map(nameOf).join(' + ') || 'كل مسار بوسمه', controller.features.length ? `ميزة ${controller.features.map(featureOf).join(' + ')}` : '',
        controller.byParam ? `حسب \`:${controller.byParam.param}\`: ${Object.entries(controller.byParam.map).map(([value, module]) => `${value} ← ${MODULES[module].nameAr}`).join('، ')}` : ''].filter(Boolean).join(' — '),
      controller.handlers, Object.entries(controller.tagged).map(([tag, names]) => `**${tag}**: ${names.join('، ')}`).join(' · ') || '—'])))

  // 5) الطلبات
  section('5) وجهات تنفيذ الطلبات وأنواعها', 'نوع الطلب تبع موديول كوده لو متسجّل بالاسم، وإلا تبع موديول وجهة تنفيذه؛ ومن غير وجهة («تسجيل بس») تبع محرك الطلبات نفسه (أساسي). النوع اللي موديوله مقفول مابيتعرضش للتقديم، والطلب المفتوح منه بيكمّل سلسلته.', '',
    '### وجهات التنفيذ', '', table(['الوجهة', 'الموديول', 'النوع', 'أنواع الطلبات المزروعة عليها'],
      requests.handlers.map(handler => [code(handler.handler), nameOf(handler.module), kindOf(handler.module), handler.types.map(code).join(' ') || (handler.implemented ? '—' : 'قديمة (لقواعد قديمة)')])), '',
    '### أنواع الطلبات المزروعة', '', table(['الكود', 'الاسم', 'الوجهة', 'الموديول', 'النوع'],
      requests.types.map(type => [code(type.code), type.nameAr, code(type.handler), nameOf(type.module), kindOf(type.module)])))

  // 6) المهام المجدولة
  section('6) المهام المجدولة', 'كل موعد بيعدّي على `tick` اللي بيسأل «موديول المهمة مفعّل؟» — المقفول مابيشتغلش، وشاشة «المهام المجدولة» بتكتب جنبه «موديولها مقفول».', '',
    table(['المهمة', 'الموعد (cron)', 'الموديول', 'النوع'], jobs.list.map(job => [code(job.id), code(job.cron), nameOf(job.module), kindOf(job.module)])), '',
    '### مؤقّتات جوه الخادم برّه المجدول', '', table(['الملف', 'بيعمل إيه'], jobs.timers.map(file => [code(file), core.INTERNAL_TIMERS[file] ?? '**مش مكتوب في النواة**'])))

  // 7) الإعدادات
  section('7) الإعدادات', '### مجموعات «سياسات النظام» (`/settings/policies`)', '',
    'المجموعة اللي لها موديول بتختفي كلها لو مقفول؛ والخانة اللي لها موديول جوه مجموعة مشتركة بتختفي لوحدها. القيم بتفضل محفوظة.', '',
    table(['المجموعة', 'موديول المجموعة', 'الخانة', 'المفتاح', 'موديول الخانة'], settings.groups.flatMap(group => group.fields.length
      ? group.fields.map(field => [group.title, group.module ? nameOf(group.module) : 'مشتركة', field.label, code(field.key), nameOf(field.module ?? group.module ?? null)])
      : [[group.title, group.module ? nameOf(group.module) : 'مشتركة', '(ملاحظة من غير خانات)', '—', nameOf(group.module)]])), '',
    table(['بلوك جوه الشاشة', 'الموديول'], settings.blocks.map(block => [code(block.name), nameOf(block.module)])), '',
    '### كروت فهرس «الإعدادات العامة» (`/settings`)', '', 'نفس الشاشات اللي في القايمة، مرتّبة بنفس مجموعاتها. الكارت بيختفي لو موديول شاشته مقفول.', '',
    table(['المجموعة', 'الكارت', 'المسار', 'الصلاحية', 'الموديول'], settings.cards.map(card => [card.group, card.title, code(card.href), code(card.perm), nameOf(card.module)])))

  // 8) لوحة الإدارة
  section('8) لوحة الإدارة', '### الأقسام (الكروت)', '', table(['الكارت', 'العنوان', 'الموديول', 'الصلاحية'],
    dashboard.cards.map(card => [code(card.key), card.title, card.modules.map(nameOf).join(' + ') || 'نواة (الموظفين)', card.perms.map(code).join(' أو ')])), '',
    '### شريط الموديولات', '', table(['الموديول', 'الصلاحية'], dashboard.strip.map(tile => [nameOf(tile.module), tile.perms.map(code).join(' أو ')])))

  // 9) الإشعارات
  section('9) أحداث الإشعارات', 'الإشعار بيتبعت للمستلم بس لو الشاشة اللي اللينك بيودّي ليها متاحة له (موديولها مفعّل) — نفس قاعدة القايمة.', '',
    table(['الحدث', 'الاسم', 'الفئة'], notifications.map(event => [code(event.code), event.label, event.category])))

  // 10) لكل موديول اختياري: كل اللي تبعه
  const of = module => ({
    menu: menu.flatMap(group => group.children.filter(child => owner(child.href).module === module).map(child => `${group.label} ← ${child.label}`)),
    pages: pages.filter(page => page.module === module).map(page => page.route),
    controllers: controllers.filter(controller => controller.modules.includes(module)).map(controller => controller.name),
    tagged: [...new Set(handlers.filter(handler => handler.ownModules?.includes(module) || Object.values(handler.byParam?.map ?? {}).includes(module)).map(handler => handler.controller))]
      .filter(name => !controllers.find(controller => controller.name === name).modules.includes(module)),
    jobs: MODULES[module].jobs, handlers: MODULES[module].requestHandlers, types: requests.types.filter(type => type.module === module).map(type => type.code),
    settings: [...settings.groups.filter(group => group.module === module).map(group => `مجموعة «${group.title}»`),
      ...settings.groups.flatMap(group => group.fields.filter(field => field.module === module).map(field => `خانة «${field.label}»`)),
      ...settings.blocks.filter(block => block.module === module).map(block => `بلوك ${block.name}`),
      ...settings.cards.filter(card => card.module === module).map(card => `كارت «${card.title}»`)],
    dashboard: [...dashboard.cards.filter(card => card.modules.includes(module)).map(card => `كارت «${card.title}»`), ...dashboard.strip.filter(tile => tile.module === module).map(() => 'بند في شريط الموديولات')],
  })
  const list = values => values.length ? values.join('، ') : '—'
  section('10) كل موديول اختياري واللي بيتقفل معاه', ...MODULE_KEYS.filter(key => !MODULES[key].core).flatMap(key => {
    const own = of(key)
    return [`### ${MODULES[key].nameAr} \`${key}\` — ${MODULES[key].defaultEnabled ? 'مفعّل افتراضيًا' : 'مقفول افتراضيًا'}`, '',
      `- **بنود القايمة:** ${list(own.menu)}`, `- **الشاشات:** ${list(own.pages.map(code))}`,
      `- **الكنترولرز:** ${list(own.controllers.map(code))}${own.tagged.length ? ` — ومسارات موسومة جوه: ${own.tagged.map(code).join('، ')}` : ''}`,
      `- **المهام المجدولة:** ${list(own.jobs.map(code))}`, `- **وجهات التنفيذ:** ${list(own.handlers.map(code))}`, `- **أنواع الطلبات المزروعة:** ${list(own.types.map(code))}`,
      `- **الإعدادات:** ${list(own.settings)}`, `- **لوحة الإدارة:** ${list(own.dashboard)}`,
      `- **بيتقفل معاه (بيعتمدوا عليه):** ${list(MODULE_KEYS.filter(other => MODULES[other].dependsOn.includes(key)).map(other => MODULES[other].nameAr))}`, '']
  }))
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n'
}

if (require.main === module) {
  const target = path.join(lib.root, 'docs', 'plan', 'module-map.md')
  const text = build()
  if (process.argv.includes('--check')) {
    const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') : ''
    if (current !== text) { console.error('docs/plan/module-map.md قديم — شغّل: node scripts/module-map.cjs'); process.exit(1) }
    console.log('docs/plan/module-map.md مطابق للكود')
  } else {
    fs.writeFileSync(target, text)
    console.log(`اتكتب ${path.relative(lib.root, target)} (${text.split('\n').length} سطر)`)
  }
  // ملفات الواجهة والخادم المستوردة ممكن تسيب مؤقّتات شغالة: الخروج صريح
  process.exit(0)
}

module.exports = { build }

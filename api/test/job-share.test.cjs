'use strict'
// B-ADD.6: نشر الوظيفة على السوشيال ميديا — فحص من غير قاعدة (الدورة الفعلية في job-share.integration.cjs):
//  JSU-01) المصادر: المعروف بمفتاحه أو اسمه أو كتابته بالعربي، ومصدر اللينك العام من القايمة بس (غيره «لينك عام»)، وقايمة الواجهة = قايمة الخادم.
//  JSU-02) عنوان الواجهة العام: المضبوط، والداخلي (http، جهاز محلي، شبكة خاصة)، وغير المضبوط؛ ولينك التقديم بمصدره.
//  JSU-03) البوست: عربي وإنجليزي من خانات الوظيفة العامة، والمتطلبات باختصار، واللينك في آخره؛ ولينكات المشاركة القياسية لكل منصة.
//  JSU-04) الفيد: الصيغتين، وهروب النص، ولينك التقديم بمصدره، ومن غير أي خانة داخلية.
//  JSU-05) الربط: المسارات بصلاحية إدارة التوظيف وبنطاق الفروع، والفيد من غير حارس جلسة ورا ميزة الصفحة العامة، والخدمة قراءة بس ومن غير أي
//          نداء خارجي، واللوحة للوظيفة المنشورة «خارجي» ولصاحب الصلاحية، ومكان النشر التلقائي مقفول من غير حقول.
// Run (من api/): node --test test/job-share.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const share = require('../src/recruitment/job-share')
const careers = require('../src/recruitment/careers')
const ui = require('../../src/lib/job-share')
const root = path.resolve(__dirname, '..', '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n')
const refuses = (work, label) => assert.throws(work, error => error?.getStatus?.() === 400, label)
const job = (extra = {}) => ({ id: 7, code: 'J-0007', title: 'محاسب أول', branchName: 'فرع الرياض', openings: 2, description: 'محاسب عام لقسم المالية\nسطر تاني من الوصف\nسطر تالت',
  requirements: '- خبرة 3 سنين\n• إجادة Excel\n1. بكالوريوس محاسبة\n٢) لغة إنجليزية\nسطر خامس مايظهرش', startDate: null, publishedAt: '2026-10-10T08:00:00.000Z', ...extra })

test('JSU-01: sources — known by key, name or Arabic spelling; the public link takes the known list only', () => {
  assert.deepEqual(share.JOB_SOURCES.map(source => [source.key, source.label]),
    [['linkedin', 'LinkedIn'], ['facebook', 'Facebook'], ['x', 'X'], ['whatsapp', 'WhatsApp'], ['instagram', 'Instagram'], ['indeed', 'Indeed']])
  assert.deepEqual(['linkedin', ' LinkedIn ', 'LINKEDIN', 'لينكد   إن', 'facebook', 'فيسبوك', 'x', 'Twitter', 'whatsapp', 'واتساب', 'instagram', 'indeed'].map(share.knownSourceLabel),
    ['LinkedIn', 'LinkedIn', 'LinkedIn', 'LinkedIn', 'Facebook', 'Facebook', 'X', 'X', 'WhatsApp', 'WhatsApp', 'Instagram', 'Indeed'])
  for (const unknown of ['', '   ', 'linkedin.com', 'linked in ads', 'حملة سبتمبر', '<script>alert(1)</script>', null, undefined, 5, {}, ['linkedin']]) assert.equal(share.knownSourceLabel(unknown), null, String(unknown))
  // اللينك العام: المعروف باسمه، وأي نص تاني (أو فاضي) = «لينك عام»؛ والنوع والطول بيتفحصوا زي الأول
  assert.deepEqual(['linkedin', 'Facebook', ' X ', 'لينكد إن', 'حملة سبتمبر', '<b>x</b>', '', '   ', undefined, null].map(careers.publicSource),
    ['LinkedIn', 'Facebook', 'X', 'LinkedIn', 'لينك عام', 'لينك عام', 'لينك عام', 'لينك عام', 'لينك عام', 'لينك عام'])
  refuses(() => careers.publicSource('م'.repeat(61)), 'طويل'); refuses(() => careers.publicSource(5), 'مش نص')
  assert.equal(careers.SOURCE_PUBLIC, 'لينك عام')
  // الواجهة: نفس المفاتيح، وأي قيمة تانية في ‎?src= بتتساب
  assert.deepEqual([...ui.SHARE_SOURCES], share.JOB_SOURCES.map(source => source.key))
  assert.deepEqual(['linkedin', ' LinkedIn ', 'FACEBOOK', 'x', 'jobfair', '', null, undefined, 7, 'linkedin&x=1'].map(ui.knownShareSource), ['linkedin', 'linkedin', 'facebook', 'x', '', '', '', '', '', ''])
  for (const channel of ui.SHARE_CHANNELS) assert.ok(share.knownSourceLabel(channel.key), channel.key)
})

test('JSU-02: the public base address — set, internal, or missing; and the apply link with its source', () => {
  assert.deepEqual(share.publicBaseOf('https://jobs.example.com'), { url: 'https://jobs.example.com', internal: false })
  assert.deepEqual(share.publicBaseOf(' https://hr.example.com/portal/ '), { url: 'https://hr.example.com/portal', internal: false })
  for (const inside of ['http://jobs.example.com', 'https://localhost:3000', 'http://localhost:3000', 'https://127.0.0.1', 'https://10.1.2.3', 'https://192.168.1.20:3000', 'https://172.16.5.5',
    'https://172.31.0.9', 'https://hr-server', 'https://hr.company.local', 'https://hr.example.invalid', 'https://[::1]:3000']) {
    const base = share.publicBaseOf(inside)
    assert.deepEqual([typeof base.url, base.internal], ['string', true], inside)
  }
  assert.equal(share.publicBaseOf('https://172.32.0.1').internal, false, 'برّه نطاق الشبكة الخاصة')
  for (const missing of ['', '   ', undefined, null, 7, 'jobs.example.com', 'ftp://jobs.example.com', 'javascript:alert(1)', 'https://user:secret@jobs.example.com']) {
    assert.deepEqual(share.publicBaseOf(missing), { url: null, internal: false }, String(missing))
  }
  // عنوان صفحة الوظائف: CAREERS_PUBLIC_URL لو مضبوط (حتى لو غلط — مابيتعوّضش)، وإلا FRONTEND_URL
  assert.deepEqual([share.careersBaseOf('https://jobs.example.com/', 'http://192.168.1.10:3000'), share.careersBaseOf('  ', 'http://192.168.1.10:3000'), share.careersBaseOf(undefined, 'https://hr.example.com'),
    share.careersBaseOf('jobs.example.com', 'https://hr.example.com'), share.careersBaseOf(undefined, undefined)],
  [{ url: 'https://jobs.example.com', internal: false }, { url: 'http://192.168.1.10:3000', internal: true }, { url: 'https://hr.example.com', internal: false }, { url: null, internal: false },
    { url: null, internal: false }])
  assert.deepEqual([share.jobApplyLink('https://jobs.example.com', 7), share.jobApplyLink('https://jobs.example.com', 7, 'linkedin')],
    ['https://jobs.example.com/careers/7', 'https://jobs.example.com/careers/7?src=linkedin'])
  assert.deepEqual([ui.applyLink('https://jobs.example.com/', 7), ui.applyLink('https://jobs.example.com', 7, 'whatsapp'), ui.applyLink('https://jobs.example.com', 7, '')],
    ['https://jobs.example.com/careers/7', 'https://jobs.example.com/careers/7?src=whatsapp', 'https://jobs.example.com/careers/7'])
})

test('JSU-03: the post — Arabic and English from the public fields, brief requirements, the link last; and the standard share links', () => {
  assert.deepEqual(ui.requirementsBrief(job()), ['خبرة 3 سنين', 'إجادة Excel', 'بكالوريوس محاسبة', 'لغة إنجليزية'])
  assert.deepEqual(ui.requirementsBrief(job({ requirements: null })), ['محاسب عام لقسم المالية', 'سطر تاني من الوصف'], 'من غير متطلبات: أول سطرين من الوصف')
  assert.deepEqual(ui.requirementsBrief(job({ requirements: '  ', description: null })), [])
  const long = ui.requirementsBrief(job({ requirements: 'ط'.repeat(300) }))[0]
  assert.deepEqual([long.length, long.endsWith('…')], [100, true])
  const arabic = ui.jobPostBody(job(), 'شركة النشر', 'ar'), english = ui.jobPostBody(job(), 'شركة النشر', 'en')
  assert.equal(arabic, ['شركة النشر تعلن عن وظيفة شاغرة: محاسب أول', 'المكان: فرع الرياض', 'العدد المطلوب: 2', 'المتطلبات:', '- خبرة 3 سنين', '- إجادة Excel', '- بكالوريوس محاسبة', '- لغة إنجليزية'].join('\n'))
  assert.equal(english, ['شركة النشر is hiring: محاسب أول', 'Location: فرع الرياض', 'Openings: 2', 'Requirements:', '- خبرة 3 سنين', '- إجادة Excel', '- بكالوريوس محاسبة', '- لغة إنجليزية'].join('\n'))
  // من غير اسم شركة ولا فرع، وبعدد واحد: السطور دي مابتتكتبش
  assert.equal(ui.jobPostBody(job({ branchName: null, openings: 1, requirements: null, description: null }), null, 'ar'), 'وظيفة شاغرة: محاسب أول')
  assert.equal(ui.jobPostBody(job({ branchName: null, openings: 1, requirements: null }), null, 'en').split('\n')[1], 'About the role:')
  const link = ui.applyLink('https://jobs.example.com', 7, 'linkedin')
  assert.equal(ui.jobPost(`${arabic}\n\n`, link, 'ar'), `${arabic}\n\nللتقديم: ${link}`)
  assert.equal(ui.jobPost(english, link, 'en').split('\n').pop(), `Apply here: ${link}`)
  assert.equal(ui.shortPost(arabic), 'شركة النشر تعلن عن وظيفة شاغرة: محاسب أول — المكان: فرع الرياض')
  assert.ok(ui.shortPost('س'.repeat(500)).length <= 200)

  // لينكات المشاركة القياسية: اللينك (بمصدره) متشفّر كامل، وX بالنص القصير، وواتساب بالبوست كله، وInstagram من غير لينك مشاركة
  assert.equal(ui.shareUrl('linkedin', arabic, link, 'ar'), 'https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fjobs.example.com%2Fcareers%2F7%3Fsrc%3Dlinkedin')
  const facebook = ui.applyLink('https://jobs.example.com', 7, 'facebook')
  assert.equal(ui.shareUrl('facebook', arabic, facebook, 'ar'), 'https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fjobs.example.com%2Fcareers%2F7%3Fsrc%3Dfacebook')
  const onX = new URL(ui.shareUrl('x', arabic, ui.applyLink('https://jobs.example.com', 7, 'x'), 'ar'))
  assert.deepEqual([onX.origin + onX.pathname, onX.searchParams.get('text'), onX.searchParams.get('url')],
    ['https://twitter.com/intent/tweet', ui.shortPost(arabic), 'https://jobs.example.com/careers/7?src=x'])
  const whatsappLink = ui.applyLink('https://jobs.example.com', 7, 'whatsapp')
  const onWhatsapp = new URL(ui.shareUrl('whatsapp', arabic, whatsappLink, 'ar'))
  assert.deepEqual([onWhatsapp.origin + onWhatsapp.pathname, onWhatsapp.searchParams.get('text')], ['https://wa.me/', ui.jobPost(arabic, whatsappLink, 'ar')])
  assert.deepEqual([ui.shareUrl('instagram', arabic, link, 'ar'), ui.shareUrl('indeed', arabic, link, 'ar')], [null, null])
  assert.deepEqual(ui.SHARE_CHANNELS.map(channel => [channel.key, channel.opens]), [['linkedin', true], ['facebook', true], ['x', true], ['whatsapp', true], ['instagram', false]])
  for (const channel of ui.SHARE_CHANNELS.filter(item => item.opens)) assert.match(ui.shareUrl(channel.key, arabic, link, 'ar'), /^https:\/\/(www\.linkedin\.com|www\.facebook\.com|twitter\.com|wa\.me)\//)
  // الصورة: المقاسين، وتقسيم السطور بحد أقصى
  assert.deepEqual([ui.SHARE_IMAGE_SIZES.linkedin.width, ui.SHARE_IMAGE_SIZES.linkedin.height, ui.SHARE_IMAGE_SIZES.instagram.width, ui.SHARE_IMAGE_SIZES.instagram.height], [1200, 627, 1080, 1080])
  const width = value => value.length
  assert.deepEqual(ui.wrapLines('واحد اتنين تلاتة اربعة', 11, width), ['واحد اتنين', 'تلاتة اربعة'])
  const cut = ui.wrapLines('aaaa bbbb cccc dddd eeee ffff', 9, width, 2)
  assert.deepEqual([cut.length, cut[0], cut[1].endsWith('…'), cut[1].length <= 9], [2, 'aaaa bbbb', true, true])
  assert.deepEqual(ui.wrapLines('   ', 10, width), [])
})

test('JSU-04: the feed — both formats, escaped text, the apply link with its source, and no internal field', () => {
  const now = new Date('2026-10-11T09:00:00.000Z')
  const jobs = [job(), job({ id: 8, code: 'J-0008', title: 'مبرمج <b>]]> & co', branchName: null, description: 'وصف فيه ]]> ووسم <script>alert(1)</script> & علامة\u0001', requirements: null, publishedAt: null })]
  const indeed = share.jobsFeedXml('indeed.xml', jobs, 'شركة <النشر> & شركاه', 'https://jobs.example.com', now)
  const linkedin = share.jobsFeedXml('linkedin.xml', jobs, 'شركة <النشر> & شركاه', 'https://jobs.example.com', now)
  for (const xml of [indeed, linkedin]) {
    assert.ok(xml.startsWith('<?xml version="1.0" encoding="utf-8"?>\n<source>\n') && xml.endsWith('</source>\n'))
    assert.deepEqual([xml.split('<job>').length - 1, xml.split('</job>').length - 1], [2, 2])
    assert.equal(xml.split('<![CDATA[').length, xml.split(']]>').length, 'كل CDATA مقفول مرة واحدة')
    assert.doesNotMatch(xml, /<script>|\u0001/, 'النص بحروفه مش وسم، وحروف التحكم اتشالت')
    assert.match(xml, /&lt;script&gt;alert\(1\)&lt;\/script&gt; &amp; علامة/)
    assert.match(xml, /<publisher>شركة &lt;النشر&gt; &amp; شركاه<\/publisher>/)
    assert.match(xml, /<b>المتطلبات<\/b><br>- خبرة 3 سنين<br>• إجادة Excel/)
    assert.doesNotMatch(xml, /salary|department|reason|openings|راتب/i)
  }
  assert.match(indeed, /<publisherurl>https:\/\/jobs\.example\.com\/careers<\/publisherurl>\n<lastBuildDate>Sun, 11 Oct 2026 09:00:00 GMT<\/lastBuildDate>/)
  assert.match(indeed, /<job>\n<title><!\[CDATA\[محاسب أول\]\]><\/title>\n<date><!\[CDATA\[Sat, 10 Oct 2026 08:00:00 GMT\]\]><\/date>\n<referencenumber><!\[CDATA\[J-0007\]\]><\/referencenumber>\n<url><!\[CDATA\[https:\/\/jobs\.example\.com\/careers\/7\?src=indeed\]\]><\/url>\n<company><!\[CDATA\[شركة <النشر> & شركاه\]\]><\/company>\n<city><!\[CDATA\[فرع الرياض\]\]><\/city>\n<description>/)
  assert.match(indeed, /<title><!\[CDATA\[مبرمج <b>\]\]\]\]><!\[CDATA\[> & co\]\]><\/title>\n<date><!\[CDATA\[Sun, 11 Oct 2026 09:00:00 GMT\]\]><\/date>/, 'نهاية CDATA جوّه النص بتتقسم، ومن غير تاريخ نشر = وقت الفيد')
  assert.match(linkedin, /<publisherUrl>https:\/\/jobs\.example\.com\/careers<\/publisherUrl>\n<publisher>/)
  assert.match(linkedin, /<job>\n<partnerJobId><!\[CDATA\[J-0007\]\]><\/partnerJobId>\n<company><!\[CDATA\[[^\n]*\]\]><\/company>\n<title><!\[CDATA\[محاسب أول\]\]><\/title>\n<description>[^\n]*<\/description>\n<applyUrl><!\[CDATA\[https:\/\/jobs\.example\.com\/careers\/7\?src=linkedin\]\]><\/applyUrl>\n<location><!\[CDATA\[فرع الرياض\]\]><\/location>\n<listDate>/)
  assert.equal(share.jobsFeedXml('indeed.xml', [], 'شركة', 'https://jobs.example.com', now).includes('<job>'), false)
  assert.deepEqual(['indeed.xml', 'linkedin.xml', 'indeed', 'INDEED.XML', '../indeed.xml', 'toString', '', null, 5].map(share.isJobFeedName), [true, true, false, false, false, false, false, false, false])
})

test('JSU-05: wiring — behind the recruitment permission and the branch scope, the feed behind the public-page feature, read-only and no outside call', () => {
  const controller = read('api/src/recruitment/job-share.controller.ts')
  assert.match(controller, /@RequireModule\('recruitment'\)\n@UseGuards\(JwtAuthGuard, RolesGuard\)\n@Perm\('candidates\.manage'\)\n@Controller\('recruitment\/share'\)/)
  assert.doesNotMatch(controller, /@Post|@Put|@Patch|@Delete/, 'قراءة بس')
  // الفيد جوّه كنترولر الصفحة العامة: نفس الموديول والميزة، ومن غير حارس جلسة عن قصد
  const publicController = read('api/src/recruitment/careers.controller.ts')
  assert.match(publicController, /@RequireModule\('recruitment'\)\n@RequireFeature\(PUBLIC_CAREERS_FEATURE\)\n@Controller\('careers'\)/)
  assert.match(publicController, /@Get\('feed\/:name'\)\n\s+@Header\('Content-Type', 'application\/xml; charset=utf-8'\)\n[^\n]*\n\s+feed\(@Param\('name'\) name: string\) \{\n\s+return this\.share\.feed\(name\)/)
  const service = read('api/src/recruitment/job-share.service.ts')
  // اللوحة: نطاق الفروع الأول (غير موجودة)، وبعده «منشورة خارجي»، والوظيفة بشكلها العام بس
  const kit = service.slice(service.indexOf('async kit('), service.indexOf('async channels('))
  const order = ['!inBranchScope(branchScopeOf(user), row.branchId)) throw new NotFoundException(JOB_NOT_FOUND)', "row.status !== 'PUBLISHED' || row.external !== true) throw new BadRequestException(JOB_SHARE_NOT_PUBLIC)",
    'this.careers.views(em, [row])'].map(part => kit.indexOf(part))
  assert.ok(order.every((at, index) => at > 0 && (index === 0 || at > order[index - 1])), JSON.stringify(order))
  assert.match(service, /if \(!isJobFeedName\(name\) \|\| !base\.url\) throw new NotFoundException\(FEED_NOT_FOUND\)/)
  assert.match(service, /return careersBaseOf\(this\.config\.get<string>\('CAREERS_PUBLIC_URL'\), this\.config\.get<string>\('FRONTEND_URL'\)\)/)
  assert.match(service, /jobsFeedXml\(name, await this\.careers\.published\(em\)/)
  for (const [file, text] of [['job-share.service.ts', service], ['job-share.ts', read('api/src/recruitment/job-share.ts')], ['job-share.controller.ts', controller]]) {
    assert.doesNotMatch(text, /\.save\(|\.update\(|\.insert\(|\.delete\(|\.query\(/, `${file}: قراءة بس`)
    assert.doesNotMatch(text, /fetch\(|https?\.request|axios|token|secret|apiKey/i, `${file}: من غير نداء خارجي ولا بيانات ربط`)
  }
  assert.match(service, /autoPublish: AUTO_PUBLISH_CHANNELS\.map\(\(channel\) => \(\{ key: channel\.key, label: channel\.label, needs: channel\.needs, enabled: false \}\)\)/)
  // التقديم العام بياخد مصدره من القايمة المعروفة، والأرقام بتجمّع المعروف على اسمه — وخدمة الأرقام لسه قراءة بس
  const careersService = read('api/src/recruitment/careers.service.ts')
  assert.match(careersService, /source = publicSource\(input\.source\)/)
  assert.doesNotMatch(careersService, /cleanSource\(/)
  assert.doesNotMatch(careersService.slice(careersService.indexOf('private view('), careersService.indexOf('async list(')), /salary|reason|department/i)
  const metrics = read('api/src/recruitment/recruitment-metrics.service.ts')
  assert.match(metrics, /const source = knownSourceLabel\(application\.source\) \?\? application\.source \?\? 'غير محدد'/)
  assert.doesNotMatch(metrics, /\.save\(|\.update\(|\.insert\(|\.delete\(/)
  const module = read('api/src/recruitment/recruitment.module.ts')
  assert.match(module, /OfferLinkController, JobShareController\]/); assert.match(module, /RecruitmentMetricsService, JobShareService\]/)

  // الواجهة: الزرار للوظيفة المنشورة «خارجي» ولصاحب إدارة الوظائف؛ والبوست والمشاركة من المتصفح؛ والنشر التلقائي مقفول من غير حقول
  const page = read('src/app/recruitment/jobs/page.tsx')
  assert.match(page, /\{data\.canManage && job\.status !== 'CLOSED' && \([\s\S]{0,900}\{job\.status === 'PUBLISHED' && job\.external && \(\n\s+<button onClick=\{\(\) => setSharing\(job\.id\)\}/)
  assert.match(page, /\{sharing > 0 && <JobSharePanel jobId=\{sharing\} onClose=\{\(\) => setSharing\(0\)\} \/>\}/)
  const panel = read('src/components/recruitment/JobSharePanel.tsx')
  assert.match(panel, /const linkFor = \(source\?: ShareSource\) => \(kit\?\.baseUrl \? applyLink\(kit\.baseUrl, kit\.job\.id, source\) : ''\)/)
  assert.match(panel, /const canShare = !!kit\?\.baseUrl && body\.trim\(\) !== ''/)
  assert.match(panel, /window\.open\(target, '_blank', 'noopener,noreferrer'\)/)
  assert.doesNotMatch(panel, /window\.location\.origin/, 'اللينك على عنوان الواجهة العام من الخادم، مش عنوان متصفح مسؤول التوظيف')
  const channels = read('src/components/recruitment/PublishingChannels.tsx')
  assert.doesNotMatch(channels, /<input|<textarea|<select|apiFetch\(|method:/, 'مكان الإعداد بس: من غير حقول ولا حفظ')
  assert.match(channels, /<button disabled title="يتفعّل لاحقًا/)
  for (const file of ['src/lib/job-share.ts', 'src/lib/job-share-image.ts']) assert.doesNotMatch(read(file), /fetch\(|XMLHttpRequest|apiFetch/, `${file}: من غير نداء`)
  // صفحة الوظائف العامة: ‎?src= من القايمة المعروفة بس، وبيكمّل من القايمة لصفحة الوظيفة
  assert.match(read('src/app/careers/[id]/page.tsx'), /setSource\(knownShareSource\(new URLSearchParams\(window\.location\.search\)\.get\('src'\)\)\)/)
  assert.match(read('src/app/careers/page.tsx'), /href=\{`\/careers\/\$\{job\.id\}\$\{source \? `\?src=\$\{source\}` : ''\}`\}/)
  assert.match(read('src/lib/careers-api.ts'), /export const publicFeedUrl = \(name: string\) => `\$\{API_BASE\}\/careers\/feed\/\$\{encodeURIComponent\(name\)\}`/)
})

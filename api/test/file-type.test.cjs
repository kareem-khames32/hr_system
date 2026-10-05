// B2.2: نوع الملف الحقيقي من محتواه، ومطابقته للامتداد والإعدادات — اختبارات نقية بلا قاعدة بيانات.
// CRP2A-B02 (مراجعة Codex): ملفات Office بتتحسم من بنية الحاوية (أجزاء أرشيف ZIP ونوعها المعلن، أو تيارات حاوية OLE)، مش من نص في أي
// مكان في البايتات — فالحاويات هنا حقيقية ومبنية بالبايت (FT-05 وFT-06).
// CRP2B-A-B01 (مراجعة Codex): الحزمة بتتقري بترتيب Office (علاقة المستند ← الجزء ← نوعه المعلن) وملفات تعريفها كـXML فعلي (FT-07)،
// وحاوية OLE بشجرة دليلها: تيار في الجذر مش مجلد ولا تيار جوه مجلد (FT-08).
// CRP2C-A-B01 (مراجعة Codex): «التيار موجود» = بايتاته بتتقري فعلًا من سلسلة قطاعاته (العادية والمصغّرة) وبيبدأ ببداية صيغته (FT-09)،
// وقارئ XML صارم زي أي قارئ فعلي، والجزء الرئيسي بيبدأ بعنصر جذر نوعه (FT-10).
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path'), crypto = require('node:crypto')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const ft = require('../src/files/file-type')

const bytes = (...parts) => Buffer.concat(parts.map(part => typeof part === 'string' ? Buffer.from(part, 'latin1') : Buffer.from(part)))

const { zip, ole, oleEntryOffset, contentTypes, relationships, officePackage, wordPackage, excelPackage, WORD_MAIN: WORD, EXCEL_MAIN: EXCEL, TYPES_OPEN, OLE_NONE, OLE_END,
  WORD_BODY, EXCEL_BODY, WORD_NS, EXCEL_NS } = require('./fixtures/office-containers.cjs')
const MACRO = 'application/vnd.ms-word.document.macroEnabled.main+xml'
const MAIN = 'word/document.xml'
const override = (type, part = MAIN, extra = '') => `<Override${extra} PartName="/${part}" ContentType="${type}"/>`
// [Content_Types].xml بمحتوى عناصره كما هو (للحالات الشاذة)
const types = inner => `${TYPES_OPEN}<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>${inner}</Types>`
const word = options => officePackage(MAIN, WORD, options)

const samples = {
  jpeg: bytes([0xff, 0xd8, 0xff, 0xe0], 'JFIF'),
  png: bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'IHDR'),
  webp: bytes('RIFF', [0x10, 0, 0, 0], 'WEBPVP8 '),
  pdf: bytes('%PDF-1.7\n'),
  doc: ole(['1Table', 'WordDocument', 'SummaryInformation']),
  xls: ole(['Workbook', 'SummaryInformation']),
  docx: wordPackage(),
  xlsx: excelPackage(),
}

test('FT-01: كل نوع من محتواه، والـZIP العادي والنص والـHTML مش من الأنواع', () => {
  for (const type of ['jpeg', 'png', 'webp', 'pdf', 'doc', 'xls', 'docx', 'xlsx']) assert.equal(ft.detectFileType(samples[type]), type, type)
  assert.equal(ft.detectFileType(zip([['notes.txt', 'ملاحظات']])), null)
  assert.equal(ft.detectFileType(bytes([0x50, 0x4b, 0x03, 0x04], 'notes.txt')), null)
  assert.equal(ft.detectFileType(bytes('<html><script>alert(1)</script>')), null)
  assert.equal(ft.detectFileType(bytes('<svg xmlns="http://www.w3.org/2000/svg"/>')), null)
  assert.equal(ft.detectFileType(Buffer.alloc(0)), null)
  assert.equal(ft.detectFileType(bytes('RIFF', [0, 0, 0, 0], 'WAVE')), null, 'RIFF مش WEBP')
})

test('FT-02: الامتداد لازم يطابق المحتوى — PDF متسمي .jpg مرفوض، والحروف الكبيرة والامتدادين لـJPG مقبولين', () => {
  const all = ft.parseAllowedFileTypes('')
  assert.match(ft.classifyUpload(samples.pdf, 'scan.jpg', all).error, /محتوى الملف PDF لكن امتداده «\.jpg»/)
  assert.match(ft.classifyUpload(samples.jpeg, 'photo.pdf', all).error, /امتداده «\.pdf»/)
  assert.deepEqual(ft.classifyUpload(samples.jpeg, 'Photo.JPG', all), { type: 'jpeg' })
  assert.deepEqual(ft.classifyUpload(samples.jpeg, 'photo.jpeg', all), { type: 'jpeg' })
  assert.deepEqual(ft.classifyUpload(samples.docx, 'عقد.docx', all), { type: 'docx' })
  assert.deepEqual(ft.classifyUpload(samples.xlsx, 'sheet.xlsx', all), { type: 'xlsx' })
  assert.match(ft.classifyUpload(samples.docx, 'sheet.xlsx', all).error, /محتوى الملف Word/)
  assert.deepEqual(ft.classifyUpload(samples.pdf, 'scan', all), { type: 'pdf' }, 'من غير امتداد = بنوعه الحقيقي')
  assert.match(ft.classifyUpload(bytes('<html>'), 'page.pdf', all).error, /محتوى الملف مش من الأنواع المسموحة/)
})

test('FT-03: Word وExcel القديم بيتحسموا من تيارات الحاوية، مش من الامتداد', () => {
  const all = ft.parseAllowedFileTypes('')
  assert.deepEqual(ft.classifyUpload(samples.doc, 'old.doc', all), { type: 'doc' })
  assert.deepEqual(ft.classifyUpload(samples.xls, 'old.xls', all), { type: 'xls' })
  assert.deepEqual(ft.classifyUpload(samples.doc, 'old', all), { type: 'doc' }, 'من غير امتداد = بنوعه الحقيقي')
  assert.equal(ft.detectFileType(ole(['Book'])), 'xls', 'Excel 5/95')
  // Excel متسمي .doc: الامتداد مايطابقش، ولو المسموح Word بس فهو نوع مقفول (مش Word)
  assert.match(ft.classifyUpload(samples.xls, 'renamed.doc', all).error, /محتوى الملف Excel قديم \(\.xls\) لكن امتداده «\.doc»/)
  assert.match(ft.classifyUpload(samples.xls, 'renamed.doc', ['doc']).error, /نوع الملف \(Excel قديم \(\.xls\)\) مش مسموح — المسموح: Word قديم \(\.doc\)/)
  assert.match(ft.classifyUpload(samples.doc, 'old.jpg', all).error, /محتوى الملف Word قديم \(\.doc\) لكن امتداده «\.jpg»/)
})

test('FT-04: الإعدادات — نوع مقفول بيترفض باسمه، والحد بالميجا من 1 لـ50 والغلط = 10، وقيمة الأنواع بتتراجع', () => {
  const imagesOnly = ft.parseAllowedFileTypes('jpeg, PNG ,webp,unknown')
  assert.deepEqual(imagesOnly, ['jpeg', 'png', 'webp'])
  assert.match(ft.classifyUpload(samples.pdf, 'x.pdf', imagesOnly).error, /نوع الملف \(PDF\) مش مسموح — المسموح: صورة JPG، صورة PNG، صورة WEBP/)
  assert.deepEqual(ft.parseAllowedFileTypes(null), [...ft.FILE_TYPES])
  assert.equal(ft.FILES_ALLOWED_TYPES_DEFAULT, 'jpeg,png,webp,pdf,doc,docx,xls,xlsx')
  assert.deepEqual([ft.maxFileSizeMb('10'), ft.maxFileSizeMb('1'), ft.maxFileSizeMb('50'), ft.maxFileSizeMb('51'), ft.maxFileSizeMb('0'), ft.maxFileSizeMb('2.5'), ft.maxFileSizeMb(null)],
    [10, 1, 50, 10, 10, 10, 10])
  assert.equal(ft.allowedFileTypesError('pdf,jpeg'), null)
  assert.equal(ft.allowedFileTypesError(' , '), 'اختار نوع ملف واحد على الأقل')
  assert.match(ft.allowedFileTypesError('pdf,exe,html'), /أنواع ملفات مش معروفة: exe، html/)
  assert.deepEqual([...ft.IMAGE_FILE_TYPES], ['jpeg', 'png', 'webp'])
})

test('FT-05 (CRP2A-B02): أرشيف ZIP مش Word ولا Excel إلا بجزئه الرئيسي الفعلي ونوعه المعلن — التعليق والمحتوى والاسم لوحدهم مايكفوش', () => {
  const docxOnly = ['docx']
  // حالة المراجعة بالحرف: ZIP صحيح فيه readme.txt وتعليق فيه اسم الجزء، باسم not-word.docx
  const commented = zip([['readme.txt', 'not a word file']], { comment: 'word/document.xml' })
  assert.equal(ft.detectFileType(commented), null)
  assert.match(ft.classifyUpload(commented, 'not-word.docx', docxOnly).error, /محتوى الملف مش من الأنواع المسموحة \(Word\)/)
  // اسم الجزء جوه محتوى ملف تاني، أو في التعليق مع [Content_Types].xml سليم من غير الجزء نفسه
  assert.equal(ft.detectFileType(zip([['readme.txt', 'word/document.xml xl/workbook.xml [Content_Types].xml']])), null)
  assert.equal(ft.detectFileType(zip([['[Content_Types].xml', contentTypes(['word/document.xml', WORD])]], { comment: 'word/document.xml' })), null, 'معلن والجزء مش موجود')
  // الجزء موجود من غير [Content_Types].xml، أو معلن بنوع تاني (ماكرو، قالب، XML عادي)، أو فاضي
  assert.equal(ft.detectFileType(zip([['word/document.xml', '<w:document/>'], ['_rels/.rels', relationships(MAIN)]])), null)
  for (const type of [MACRO, 'application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml', 'application/xml']) {
    assert.equal(ft.detectFileType(officePackage(MAIN, type)), null, type)
  }
  assert.equal(ft.detectFileType(officePackage('xl/workbook.xml', 'application/vnd.ms-excel.sheet.macroEnabled.main+xml')), null)
  assert.equal(ft.detectFileType(word({ body: '' })), null, 'الجزء الرئيسي فاضي')
  // النوع من نوع الجزء الرئيسي المعلن مش من اسمه: مصنف Excel جزؤه متسمي باسم Word هو Excel، وامتداد .docx مايطابقوش
  assert.equal(ft.detectFileType(officePackage(MAIN, EXCEL)), 'xlsx')
  assert.match(ft.classifyUpload(officePackage(MAIN, EXCEL), 'x.docx', ft.parseAllowedFileTypes('')).error, /محتوى الملف Excel لكن امتداده «\.docx»/)
  // السليم: مخزّن أو مضغوط، وبتعليق، وبحروف كبيرة في اسم الجزء، وبعلامة تنصيص مفردة في XML
  assert.equal(ft.detectFileType(wordPackage({ deflate: true })), 'docx')
  assert.equal(ft.detectFileType(excelPackage({ deflate: true, comment: 'word/document.xml' })), 'xlsx', 'التعليق مابيغيّرش النوع الحقيقي')
  assert.equal(ft.detectFileType(officePackage('Word/Document.xml', WORD)), 'docx')
  const single = `<Types xmlns='http://schemas.openxmlformats.org/package/2006/content-types'><Override ContentType='${EXCEL}' PartName='/xl/workbook.xml'/></Types>`
  assert.equal(ft.detectFileType(officePackage('xl/workbook.xml', EXCEL, { types: single })), 'xlsx')
  // [Content_Types].xml مضغوط لأكتر من الحد (قنبلة ضغط) = مش مقروء = مش Office
  const bomb = word({ types: contentTypes([MAIN, WORD]) + ' '.repeat(2 * 1024 * 1024), deflate: true })
  assert.ok(bomb.length < 64 * 1024, 'القنبلة صغيرة وهي مضغوطة')
  assert.equal(ft.detectFileType(bomb), null)
})

test('FT-06 (CRP2A-B02، مسح الصنف): حاوية OLE مش Word ولا Excel إلا بتيارها — MSI أو رسالة Outlook أو حاوية مقطوعة مرفوضين، ومفيش خطأ على أي بايتات', () => {
  assert.equal(ft.detectFileType(ole(['SummaryInformation', '!_StringPool', '!_Tables'])), null, 'حاوية من غير تيار Word أو Excel (زي MSI)')
  assert.equal(ft.detectFileType(ole(['__properties_version1.0', '__substg1.0_0037001F'])), null, 'رسالة Outlook')
  assert.equal(ft.detectFileType(ole(['EncryptedPackage', 'EncryptionInfo'])), null, 'Office مشفّر')
  assert.equal(ft.detectFileType(ole(['WordDocument', 'Workbook'])), null, 'التيارين مع بعض')
  assert.match(ft.classifyUpload(ole(['!_Tables']), 'setup.doc', ft.parseAllowedFileTypes('')).error, /محتوى الملف مش من الأنواع المسموحة/)
  assert.equal(ft.detectFileType(bytes([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], 'x')), null, 'توقيع OLE من غير حاوية')
  // التيار في تاني قطاع من الدليل: سلسلة القطاعات بتتتبع من جدول التوزيع
  assert.equal(ft.detectFileType(ole(['CompObj', 'ObjectPool', '1Table', 'Data', 'SummaryInformation', 'WordDocument'])), 'doc')
  // أي قص لحاوية سليمة، وأي بايتات عشوائية بتوقيع حاوية: نتيجة من غير أي خطأ (والمقصوص مش بيعدّي كنوعه)
  for (const sample of [samples.doc, samples.docx, wordPackage({ deflate: true }), samples.xlsx]) {
    for (let length = 0; length < sample.length; length += 7) assert.doesNotThrow(() => ft.detectFileType(sample.subarray(0, length)))
  }
  for (const [name, sample, missing] of [['doc', samples.doc, 600], ['docx', samples.docx, 30]]) assert.equal(ft.detectFileType(sample.subarray(0, sample.length - missing)), null, `${name} مقصوص`)
  for (let round = 0; round < 400; round++) {
    const noise = crypto.createHash('sha512').update(`${round}`).digest(), size = 64 + (round * 37) % 1500
    const body = Buffer.concat(Array.from({ length: Math.ceil(size / noise.length) }, () => noise)).subarray(0, size)
    for (const magic of [[0x50, 0x4b, 0x03, 0x04], [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]]) {
      const candidate = Buffer.concat([Buffer.from(magic), body])
      // توقيع نهاية الدليل في آخر العشوائي عشان مسار القراءة يتمشّى كله
      if (round % 2 === 0) Buffer.from([0x50, 0x4b, 0x05, 0x06]).copy(candidate, candidate.length - 22), candidate.writeUInt16LE(0, candidate.length - 2)
      assert.doesNotThrow(() => ft.detectFileType(candidate))
      assert.equal(ft.detectFileType(candidate), null)
    }
  }
})

test('FT-07 (CRP2B-A-B01): ملفات تعريف الحزمة بتتقري كـXML فعلي وبترتيب Office — التعليق وCDATA وقيمة خاصية تانية والتصريح المكرر والجزء الطُّعم مابيغيّروش النوع', () => {
  const is = (inner, expected, label, options = {}) => assert.equal(ft.detectFileType(word({ types: types(inner), ...options })), expected, label)
  is(override(WORD), 'docx', 'الضابط: تصريح واحد بنوع Word')
  is(override(MACRO), null, 'الضابط: تصريح واحد بنوع ماكرو')
  // حالة المراجعة بالحرف: النوع الفعلي ماكرو، ونوع Word جوه تعليق XML — والعكس (ماكرو في التعليق) لسه Word
  is(override(MACRO) + `<!-- ${override(WORD)} -->`, null, 'تصريح Word جوه تعليق')
  is(`<!-- ${override(WORD)} -->` + override(MACRO), null, 'تصريح Word جوه تعليق قبل الفعلي')
  is(override(WORD) + `<!-- ${override(MACRO)} -->`, 'docx', 'تصريح ماكرو جوه تعليق مالوش أثر')
  // نفس الصنف: CDATA وتعليمات المعالجة وDOCTYPE
  is(override(MACRO) + `<![CDATA[${override(WORD)}]]>`, null, 'CDATA')
  is(override(WORD) + '<![CDATA[x]]>', null, 'CDATA مش في ملف تعريف حزمة سليم')
  is(override(MACRO) + `<?note ${override(WORD)} ?>`, null, 'تعليمة معالجة')
  is(override(WORD) + `<?note ${override(MACRO)} ?>`, 'docx', 'تعليمة معالجة مالهاش أثر')
  assert.equal(ft.detectFileType(word({ types: `<?xml version="1.0"?><!DOCTYPE Types [<!ENTITY x "y">]>${types(override(WORD)).replace(/^<\?xml[^>]*\?>/, '')}` })), null, 'DOCTYPE')
  // قيمة خاصية تانية فيها نص شبه خاصية، وعلامة > جوه قيمة
  is(`<Override note=' ContentType="${WORD}"' PartName="/${MAIN}" ContentType="${MACRO}"/>`, null, 'نوع Word جوه قيمة خاصية تانية')
  is(`<Override note=' PartName="/${MAIN}" ContentType="${WORD}"' PartName="/word/other.xml" ContentType="${WORD}"/>` + override(MACRO), null, 'تصريح كامل جوه قيمة خاصية')
  is(override(WORD, MAIN, ' note="a>b"'), 'docx', 'علامة > جوه قيمة خاصية')
  // خاصية مكررة، وتصريحين لنفس الجزء بأي ترتيب وبأي حالة حروف، وتصريح جوه عنصر تاني
  is(`<Override PartName="/${MAIN}" ContentType="${WORD}" ContentType="${MACRO}"/>`, null, 'خاصية مكررة')
  is(override(WORD) + override(MACRO), null, 'تصريحين لنفس الجزء')
  is(override(MACRO) + override(WORD), null, 'تصريحين لنفس الجزء (العكس)')
  is(override(WORD) + override(MACRO, 'WORD/Document.XML'), null, 'تصريحين بحالة حروف مختلفة')
  is(override(MACRO) + `<Extra>${override(WORD)}</Extra>`, null, 'تصريح Word جوه عنصر تاني')
  is(`<Extra>${override(WORD)}</Extra>`, null, 'تصريح Word جوه عنصر تاني بس (والافتراضي مش نوع Word)')
  // مساحة الأسماء: عنصر في مساحة تانية مش تصريح، وبادئة تانية لنفس المساحة تصريح (فبيتعارض)
  is(override(MACRO) + `<x:Override xmlns:x="urn:other" PartName="/${MAIN}" ContentType="${WORD}"/>`, null, 'تصريح في مساحة أسماء تانية')
  is(override(WORD) + `<x:Override xmlns:x="urn:other" PartName="/${MAIN}" ContentType="${MACRO}"/>`, 'docx', 'عنصر مساحة تانية مالوش أثر')
  is(override(WORD) + `<x:Override xmlns:x="http://schemas.openxmlformats.org/package/2006/content-types" PartName="/${MAIN}" ContentType="${MACRO}"/>`, null, 'بادئة تانية لنفس المساحة = تصريح تاني')
  const prefixed = `<ct:Types xmlns:ct="http://schemas.openxmlformats.org/package/2006/content-types"><ct:Override PartName="/${MAIN}" ContentType="${WORD}"/></ct:Types>`
  assert.equal(ft.detectFileType(word({ types: prefixed })), 'docx', 'الجذر والتصريح ببادئة')
  assert.equal(ft.detectFileType(word({ types: `<Types>${override(WORD)}</Types>` })), null, 'من غير مساحة أسماء الحزمة')
  assert.equal(ft.detectFileType(word({ types: `<Types xmlns="urn:other">${override(WORD)}</Types>` })), null, 'جذر في مساحة تانية')
  // الترميز: تصريح XML بترميز غير UTF-8، أو مش في أول الملف، أو بايتات UTF-16
  assert.equal(ft.detectFileType(word({ types: types(override(WORD)).replace('encoding="UTF-8"', 'encoding="UTF-7"') })), null, 'ترميز UTF-7 معلن')
  assert.equal(ft.detectFileType(word({ types: ' ' + types(override(WORD)) })), null, 'تصريح XML مش في أول الملف')
  assert.equal(ft.detectFileType(word({ types: Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(types(override(WORD)), 'utf16le')]) })), null, 'UTF-16')
  assert.equal(ft.detectFileType(word({ types: Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(types(override(WORD)), 'utf8')]) })), 'docx', 'UTF-8 بعلامة ترتيب البايتات')
  // اسم الجزء بكيان أو بترميز بالنسبة المئوية: نفس الجزء عند قارئ تاني = تعارض
  is(override(WORD) + override(MACRO, 'word/document&#46;xml'), null, 'مرجع رقمي بيطلع نفس اسم الجزء')
  is(override(WORD) + override(MACRO, 'word/%64ocument.xml'), null, 'ترميز بالنسبة المئوية بيطلع نفس اسم الجزء')
  is(override(WORD) + override(MACRO, 'word/%zz.xml'), null, 'ترميز بالنسبة المئوية مش سليم')
  is(override(WORD, 'word/document&amp;x.xml') + override(WORD), 'docx', 'كيان معروف في اسم جزء تاني')
  is(override(WORD) + `<Override PartName="/word/a&bogus;.xml" ContentType="${WORD}"/>`, null, 'كيان مش معروف')
  // وسم مش مقفول، أو جذرين، أو نص بعد الجذر (مسموح)
  assert.equal(ft.detectFileType(word({ types: types(override(WORD)).replace('</Types>', '') })), null, 'الجذر مش مقفول')
  assert.equal(ft.detectFileType(word({ types: types(override(MACRO)) + `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">${override(WORD)}</Types>` })), null, 'جذرين')
  // النوع الافتراضي للامتداد لما مفيش تصريح للجزء (مسموح في الحزمة)، وافتراضيين لنفس الامتداد = تعارض
  is(`<Default Extension="xml" ContentType="${WORD}"/>`, 'docx', 'النوع الافتراضي لامتداد الجزء')
  is(`<Default Extension="xml" ContentType="${WORD}"/><Default Extension="XML" ContentType="${MACRO}"/>`, null, 'افتراضيين لنفس الامتداد')
  is(`<Default Extension="xml" ContentType="${WORD}"/>` + override(MACRO), null, 'التصريح بيكسب على الافتراضي')

  // ===== العلاقة: الجزء الرئيسي هو اللي علاقة المستند بتشاور عليه =====
  const withRels = (rels, expected, label, options = {}) => assert.equal(ft.detectFileType(word({ rels, ...options })), expected, label)
  withRels(null, null, 'من غير ملف العلاقات')
  withRels(relationships('/word/document.xml'), 'docx', 'مسار مطلق')
  withRels(relationships(MAIN, 'http://purl.oclc.org/ooxml/officeDocument/relationships/officeDocument'), 'docx', 'علاقة Strict')
  withRels(relationships(MAIN, 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties'), null, 'من غير علاقة مستند')
  withRels(relationships('word/missing.xml'), null, 'الجزء اللي العلاقة بتشاور عليه مش في الأرشيف')
  withRels(relationships('../word/document.xml'), null, 'مسار بنقطتين')
  withRels(relationships(MAIN).replace('Target="word/document.xml"', 'Target="word/document.xml" TargetMode="External"'), null, 'علاقة خارجية')
  const two = relationships(MAIN).replace('</Relationships>', `<Relationship Id="rId9" Type="${require('./fixtures/office-containers.cjs').OFFICE_DOCUMENT}" Target="word/macro.xml"/></Relationships>`)
  withRels(two, null, 'علاقتين للمستند الرئيسي')
  withRels(relationships(MAIN).replace('<Relationship Id="rId1"', '<!-- <Relationship Id="rId0" Type="x" Target="y"/> --><Relationship Id="rId1"'), 'docx', 'تعليق في ملف العلاقات مالوش أثر')
  // الجزء الطُّعم: word/document.xml معلن Word، والعلاقة بتشاور على جزء ماكرو — النوع نوع اللي العلاقة بتشاور عليه
  const decoy = { types: types(override(WORD) + override(MACRO, 'word/macro.xml')), extra: [['word/macro.xml', '<w:document/>']] }
  withRels(relationships('word/macro.xml'), null, 'علاقة المستند على جزء ماكرو وجزء Word طُعم', decoy)
  withRels(relationships(MAIN), 'docx', 'نفس الحزمة والعلاقة على جزء Word', decoy)
  // مستند جزؤه الرئيسي باسم تاني (ملفات حقيقية بتطلع كده): النوع من نوع الجزء
  assert.equal(ft.detectFileType(officePackage('word/document2.xml', WORD)), 'docx')
  // اسم مدخل مكرر في الأرشيف (قارئ ياخد الأول وقارئ ياخد الأخير)
  const duplicate = zip([['[Content_Types].xml', types(override(MACRO))], ['[Content_Types].xml', types(override(WORD))], ['_rels/.rels', relationships(MAIN)], [MAIN, '<w:document/>']])
  assert.equal(ft.detectFileType(duplicate), null, 'ملف تعريف الأنواع مرتين')
  assert.equal(ft.detectFileType(zip([['[Content_Types].xml', types(override(WORD))], ['_rels/.rels', relationships(MAIN)], [MAIN, '<w:document/>'], ['WORD/DOCUMENT.XML', 'x']])), null, 'الجزء الرئيسي مرتين بحالة حروف مختلفة')
  // مفيش خطأ على أي قص لملفات التعريف نفسها
  const good = types(override(WORD))
  for (let length = 0; length <= good.length; length += 3) assert.doesNotThrow(() => ft.detectFileType(word({ types: good.slice(0, length) })))
})

test('FT-08 (CRP2B-A-B01): حاوية OLE بشجرة دليلها — تيار في الجذر مش مجلد ولا تيار جوه مجلد، وحجمه مش صفر، والروابط المكسورة مرفوضة', () => {
  // حالة المراجعة بالحرف: مجلد (storage) اسمه WordDocument في الجذر
  assert.equal(ft.detectFileType(ole([{ name: 'WordDocument', kind: 'storage' }])), null, 'مجلد باسم WordDocument')
  const mutated = ole(['WordDocument']); mutated[oleEntryOffset(1) + 66] = 1
  assert.equal(ft.detectFileType(mutated), null, 'نفس التيار بعد تحويل نوعه لمجلد')
  assert.equal(ft.detectFileType(ole([{ name: 'Workbook', kind: 'storage' }, 'SummaryInformation'])), null, 'مجلد باسم Workbook')
  // تيار بالاسم جوه مجلد فرعي (ملف متضمَّن) من غير تيار في الجذر
  assert.equal(ft.detectFileType(ole([{ name: 'ObjectPool', kind: 'storage', children: ['WordDocument'] }, 'SummaryInformation'])), null, 'تيار Word جوه مجلد')
  assert.equal(ft.detectFileType(ole([{ name: 'MBD0001', kind: 'storage', children: ['Workbook'] }])), null, 'تيار Excel جوه مجلد')
  // مستند Word فيه مصنف Excel متضمَّن (تيار Workbook جوه مجلد): Word
  assert.equal(ft.detectFileType(ole(['1Table', 'WordDocument', { name: 'ObjectPool', kind: 'storage', children: [{ name: '_1', kind: 'storage', children: ['Workbook'] }] }])), 'doc')
  assert.equal(ft.detectFileType(ole(['Workbook', { name: 'MBD0001', kind: 'storage', children: ['WordDocument'] }])), 'xls')
  // تيار حجمه صفر
  assert.equal(ft.detectFileType(ole([{ name: 'WordDocument', size: 0 }])), null, 'تيار فاضي')
  assert.equal(ft.detectFileType(ole([{ name: 'WordDocument', size: 4096 }])), 'doc')
  assert.equal(ft.detectFileType(ole([{ name: 'WordDocument', size: 20000 }])), 'doc', 'تيار على 40 قطاع')
  // التيار لازم يبقى موجود فعلًا: سلسلة قطاعاته في جدول التوزيع بطول حجمه (أول قطاع بيانات = 2، وجدول التوزيع عند 512)
  const cut = ole(['WordDocument']); cut.writeUInt32LE(0xfffffffe, 512 + 2 * 4)
  assert.equal(ft.detectFileType(cut), null, 'السلسلة بتخلص بعد قطاع واحد والحجم 4096')
  const huge = ole(['WordDocument']); huge.writeUInt32LE(1000000, oleEntryOffset(1) + 120)
  assert.equal(ft.detectFileType(huge), null, 'حجم معلن أكبر من سلسلة القطاعات')
  const nowhere = ole(['WordDocument']); nowhere.writeUInt32LE(0xfffffffe, oleEntryOffset(1) + 116)
  assert.equal(ft.detectFileType(nowhere), null, 'تيار من غير قطاع بداية')
  // التيار الصغير (أقل من 4096) في تيار الجذر المصغّر — زي ملفات LibreOffice الصغيرة
  assert.equal(ft.detectFileType(ole([{ name: 'Workbook', size: 300 }, 'SummaryInformation'])), 'xls', 'تيار صغير في التيار المصغّر')
  const noMini = ole([{ name: 'Workbook', size: 300 }]); noMini.writeUInt32LE(64, oleEntryOffset(0) + 120)
  assert.equal(ft.detectFileType(noMini), null, 'تيار الجذر المصغّر أصغر من التيار')
  // الملف المقصوص: قطاع جدول التوزيع بيقول إنه مستعمل ومش موجود في الملف
  const whole = ole(['1Table', 'WordDocument', 'SummaryInformation'])
  for (const missing of [512, 513, 4096, 8192]) assert.equal(ft.detectFileType(whole.subarray(0, whole.length - missing)), null, `مقصوص ${missing} بايت`)
  // آخر قطاع بيانات ناقص شوية بايتات (برامج تصدير قديمة مابتكمّلش آخر قطاع): مقبول. والقطاع الغايب كله، أو قطاع الدليل الناقص، مرفوضين
  for (const missing of [1, 30, 511]) assert.equal(ft.detectFileType(whole.subarray(0, whole.length - missing)), 'doc', `آخر قطاع ناقص ${missing} بايت`)
  const directoryLast = ole([{ name: 'WordDocument', size: 0 }, { name: 'Workbook', size: 0 }])
  assert.equal(ft.detectFileType(directoryLast.subarray(0, directoryLast.length - 30)), null, 'قطاع الدليل نفسه ناقص')
  // مدخل في الدليل مش مربوط بشجرة الجذر (يتيم)
  const orphan = ole(['SummaryInformation', 'WordDocument']); orphan.writeUInt32LE(OLE_NONE, oleEntryOffset(1) + 72)
  assert.equal(ft.detectFileType(orphan), null, 'تيار مش مربوط بالجذر')
  // الروابط: بالأخ الشمال، وحلقة، ورقم برّه الدليل، والجذر كابن لنفسه، وجذر نوعه مش جذر
  const left = ole(['SummaryInformation', 'WordDocument']); left.writeUInt32LE(OLE_NONE, oleEntryOffset(1) + 72); left.writeUInt32LE(2, oleEntryOffset(1) + 68)
  assert.equal(ft.detectFileType(left), 'doc', 'ربط بالأخ الشمال')
  const loop = ole(['WordDocument']); loop.writeUInt32LE(1, oleEntryOffset(1) + 72)
  assert.equal(ft.detectFileType(loop), null, 'حلقة في الإخوة')
  const outside = ole(['WordDocument']); outside.writeUInt32LE(900, oleEntryOffset(1) + 72)
  assert.equal(ft.detectFileType(outside), null, 'رقم مدخل برّه الدليل')
  const selfRoot = ole(['WordDocument']); selfRoot.writeUInt32LE(0, oleEntryOffset(0) + 76)
  assert.equal(ft.detectFileType(selfRoot), null, 'الجذر ابن لنفسه')
  const noRoot = ole(['WordDocument']); noRoot[oleEntryOffset(0) + 66] = 1
  assert.equal(ft.detectFileType(noRoot), null, 'أول مدخل مش جذر')
  const unused = ole(['WordDocument', 'Data']); unused[oleEntryOffset(2) + 66] = 0
  assert.equal(ft.detectFileType(unused), null, 'أخ نوعه مش تيار ولا مجلد')
  // الجذر من غير أولاد
  assert.equal(ft.detectFileType(ole([])), null)
})

test('FT-09 (CRP2C-A-B01): تيار OLE لازم بايتاته تتقري فعلًا — السلسلة المصغّرة والعادية من غير قطاع ناقص ولا متكرر، وبداية الصيغة', () => {
  const FAT = 512, small = () => ole([{ name: 'WordDocument', size: 300 }])
  // مواضع تجهيز الحاوية الصغيرة: مدخل التيار ومدخل الجذر، وجدول القطاعات المصغّرة (آخر قطاع في الملف)
  const entry = oleEntryOffset(1), rootEntry = oleEntryOffset(0)
  const patched = (make, change) => { const copy = Buffer.from(make()); change(copy); return ft.detectFileType(copy) }
  assert.equal(ft.detectFileType(small()), 'doc', 'الضابط: تيار صغير سليم')
  // حالات المراجعة بالحرف: مدخل من غير بايتات يتوصل لها
  assert.equal(patched(small, copy => copy.writeUInt32LE(OLE_END, entry + 116)), null, 'التيار من غير قطاع بداية')
  assert.equal(patched(small, copy => { copy.writeUInt32LE(OLE_END, 60); copy.writeUInt32LE(0, 64) }), null, 'من غير جدول القطاعات المصغّرة')
  assert.equal(patched(small, copy => copy.writeUInt32LE(OLE_END, rootEntry + 116)), null, 'تيار الجذر من غير بيانات')
  assert.equal(patched(small, copy => copy.writeUInt32LE(123456, entry + 116)), null, 'بداية التيار برّه تيار الجذر')
  // نفس الصنف في التيار المصغّر: الجدول بعدد صفر في الرأس، وحلقة، وسلسلة أقصر من الحجم، وقطاع برّه حجم تيار الجذر
  assert.equal(patched(small, copy => copy.writeUInt32LE(0, 64)), null, 'عدد قطاعات الجدول المصغّر صفر')
  assert.equal(patched(small, copy => copy.writeUInt32LE(0, copy.length - 512)), null, 'القطاع المصغّر الأول بيشاور على نفسه')
  assert.equal(patched(small, copy => copy.writeUInt32LE(0, copy.length - 512 + 2 * 4)), null, 'السلسلة المصغّرة بترجع لقطاع اتقرا')
  assert.equal(patched(small, copy => copy.writeUInt32LE(OLE_END, copy.length - 512 + 4)), null, 'السلسلة المصغّرة أقصر من الحجم')
  assert.equal(patched(small, copy => copy.writeUInt32LE(299, rootEntry + 120)), null, 'تيار الجذر أقصر من التيار ببايت')
  assert.equal(patched(small, copy => copy.writeUInt32LE(300, rootEntry + 120)), 'doc', 'تيار الجذر بحجم التيار بالظبط (الحشو مش مطلوب)')
  assert.equal(patched(small, copy => copy.writeUInt32LE(64, rootEntry + 120)), null, 'تيار الجذر قطاع مصغّر واحد')
  // تيار الجذر نفسه سلسلة عادية: حلقة فيها = مش مقروء (تيار 3000 بايت = 47 قطاع مصغّر = 6 قطاعات عادية لتيار الجذر)
  const wide = () => ole([{ name: 'WordDocument', size: 3000 }])
  assert.equal(ft.detectFileType(wide()), 'doc')
  assert.equal(patched(wide, copy => { const first = copy.readUInt32LE(rootEntry + 116); copy.writeUInt32LE(first, FAT + first * 4) }), null, 'حلقة في سلسلة تيار الجذر')
  // تيارين صغيرين: بداية التاني في قطاع عادي تاني من تيار الجذر، وبتتقري من مكانها الصح
  const second = () => ole([{ name: 'Data', size: 3000 }, { name: 'WordDocument', size: 600 }])
  assert.equal(ft.detectFileType(second()), 'doc', 'تيار صغير بدايته جوه تيار الجذر')
  assert.equal(ft.detectFileType(ole([{ name: 'Data', size: 3000 }, { name: 'WordDocument', size: 600, head: [0x4d, 0x5a] }])), null, 'نفس التيار ببداية مش Word')

  // التيار العادي — حالة المراجعة بالحرف: 4096 بايت معلنة على قطاع واحد بيشاور على نفسه
  const regular = () => ole(['WordDocument'])
  const first = regular().readUInt32LE(entry + 116)
  assert.equal(patched(regular, copy => copy.writeUInt32LE(first, FAT + first * 4)), null, 'قطاع بيشاور على نفسه')
  assert.equal(patched(regular, copy => copy.writeUInt32LE(first, FAT + (first + 1) * 4)), null, 'السلسلة بترجع لأول قطاع')
  assert.equal(patched(regular, copy => copy.writeUInt32LE(first + 3, FAT + (first + 5) * 4)), null, 'السلسلة بترجع لقطاع في النص')
  assert.equal(patched(regular, copy => copy.writeUInt32LE(0xffffffff, FAT + (first + 2) * 4)), null, 'قطاع «فاضي» في نص السلسلة')
  assert.equal(patched(regular, copy => copy.writeUInt32LE(5000, FAT + (first + 2) * 4)), null, 'قطاع برّه الملف في نص السلسلة')
  assert.equal(patched(regular, copy => copy.writeUInt32LE(5000, entry + 116)), null, 'بداية التيار برّه الملف')
  // سلسلة أطول من الحجم مقبولة (قطاعات محجوزة زيادة)، والحجم المعلن أكبر من الملف مرفوض
  assert.equal(ft.detectFileType(ole([{ name: 'WordDocument', size: 4097 }])), 'doc', 'حجم مش مضاعف القطاع')
  assert.equal(patched(regular, copy => copy.writeUInt32LE(4000000, entry + 120)), null, 'حجم معلن أكبر من الملف')

  // بداية الصيغة: التيار بيتقري وأوله مش رأس Word ولا سجل بداية Excel
  assert.equal(ft.detectFileType(ole([{ name: 'WordDocument', head: [0x4d, 0x5a, 0x90, 0x00] }])), null, 'تيار باسم Word ومحتواه مش Word')
  assert.equal(ft.detectFileType(ole([{ name: 'WordDocument', head: [0x20, 0x20] }])), null, 'تيار Word كله مسافات')
  assert.equal(ft.detectFileType(ole([{ name: 'WordDocument', head: [0xdc, 0xa5] }])), 'doc', 'Word 6 و95')
  assert.equal(ft.detectFileType(ole([{ name: 'Workbook', head: [0x50, 0x4b, 0x03, 0x04] }])), null, 'تيار باسم Workbook ومحتواه مش Excel')
  assert.equal(ft.detectFileType(ole([{ name: 'Workbook', size: 200, head: [0x00, 0x00] }])), null, 'تيار Excel صغير ببداية غلط')
  assert.equal(ft.detectFileType(ole([{ name: 'WordDocument', size: 1 }])), null, 'تيار ببايت واحد مافيهوش بداية')
  // مصنف محفوظ بالصيغتين (Workbook وBook): Excel. ولو Workbook نفسه مش سليم، Book مايعوّضوش
  assert.equal(ft.detectFileType(ole(['Workbook', 'Book'])), 'xls')
  assert.equal(ft.detectFileType(ole([{ name: 'Workbook', head: [0x20, 0x20] }, 'Book'])), null, 'Workbook مش سليم وBook سليم')

  // اسم مكرر في الجذر (قارئ ياخد ده وقارئ ياخد ده)، أو اسم النوع التاني موجود بأي شكل
  assert.equal(ft.detectFileType(ole(['WordDocument', { name: 'WordDocument', kind: 'storage' }])), null, 'تيار ومجلد بنفس الاسم')
  assert.equal(ft.detectFileType(ole(['WordDocument', 'WordDocument'])), null, 'تيارين بنفس الاسم')
  assert.equal(ft.detectFileType(ole(['WordDocument', 'worddocument'])), null, 'نفس الاسم بحالة حروف تانية')
  assert.equal(ft.detectFileType(ole(['worddocument'])), null, 'الاسم بحالة حروف غير بتاعة Word')
  assert.equal(ft.detectFileType(ole(['WordDocument', { name: 'Workbook', kind: 'storage' }])), null, 'تيار Word ومجلد باسم Workbook')
  assert.equal(ft.detectFileType(ole(['Workbook', { name: 'WordDocument', size: 0 }])), null, 'تيار Excel وتيار Word فاضي')

  // الرأس: القيم اللي القراءة مبنية عليها
  assert.equal(patched(regular, copy => copy.writeUInt16LE(0xfeff, 28)), null, 'ترتيب بايتات معكوس')
  assert.equal(patched(regular, copy => copy.writeUInt16LE(4, 26)), null, 'الإصدار 4 بقطاع 512')
  assert.equal(patched(regular, copy => copy.writeUInt16LE(5, 32)), null, 'حجم القطاع المصغّر مش 64')
  assert.equal(patched(regular, copy => copy.writeUInt32LE(2048, 56)), null, 'حد التيار المصغّر مش 4096')
  assert.equal(patched(regular, copy => copy.writeUInt32LE(0, 76 + 4)), null, 'قطاع جدول التوزيع مكتوب مرتين')
  // سلسلة قطاعات جدول التوزيع الإضافية بتشاور على نفسها، وسلسلة الدليل بتشاور على نفسها
  assert.equal(patched(regular, copy => { const at = (first + 1) * 512; copy.fill(0xff, at, at + 512); copy.writeUInt32LE(first, at + 508); copy.writeUInt32LE(first, 68) }), null, 'حلقة في سلسلة DIFAT')
  assert.equal(patched(regular, copy => copy.writeUInt32LE(1, FAT + 4)), null, 'قطاع الدليل بيشاور على نفسه')
  // مفيش خطأ على أي تغيير بايت واحد في البنية (الرأس والجدول والدليل والجدول المصغّر)
  for (const make of [small, regular]) {
    const base = make()
    for (const [from, to] of [[24, 512 + 64], [1024, 1024 + 256], [base.length - 512, base.length - 512 + 32]]) {
      for (let at = from; at < to; at++) for (const value of [0x00, 0x01, 0xfe, 0xff]) {
        const copy = Buffer.from(base); copy[at] = value
        assert.doesNotThrow(() => ft.detectFileType(copy), `بايت ${at} = ${value}`)
      }
    }
  }
})

test('FT-10 (CRP2C-A-N01): قارئ XML صارم زي أي قارئ فعلي، والجزء الرئيسي بيبدأ بعنصر جذر نوعه', () => {
  const is = (xml, expected, label) => assert.equal(ft.detectFileType(word({ types: xml })), expected, label)
  const good = types(override(WORD))
  is(good, 'docx', 'الضابط')
  // حالتي المراجعة بالحرف: وسم إقفال الجذر باسم تاني، ونص مش XML بعد الجذر
  is(good.replace('</Types>', '</NotTypes>'), null, 'وسم إقفال الجذر باسم تاني')
  is(good + 'THIS IS NOT XML', null, 'نص بعد الجذر')
  // نفس الصنف: نص في أي مكان، ووسم إقفال مش مطابق لعنصر جواه، ووسم إقفال بخصائص
  is(good.replace('<Override', 'text<Override'), null, 'نص جوه الجذر')
  is('x' + good, null, 'نص قبل التصريح')
  is(good.replace('<Types', 'x<Types'), null, 'نص قبل الجذر')
  is(types(override(WORD) + '<Extra></Other>'), null, 'وسم إقفال مش مطابق')
  is(types(override(WORD) + '<Extra></Extra>'), 'docx', 'عنصر زيادة مقفول صح')
  is(good.replace('</Types>', '</Types x="1">'), null, 'وسم إقفال بخصائص')
  is(good.replace('</Types>', '</Types \n>') + '\n<!-- بعد الجذر --><?done ?>\n', 'docx', 'مسافات وتعليق وتعليمة بعد الجذر')
  // البادئات: عنصر أو خاصية ببادئة مش متصرّح بيها، وتصريح بادئة فاضي، ونفس الخاصية ببادئتين لنفس المساحة
  is(types(override(WORD) + '<x:Thing/>'), null, 'عنصر ببادئة مش متصرّح بيها')
  is(types(override(WORD, MAIN, ' x:note="1"')), null, 'خاصية ببادئة مش متصرّح بيها')
  is(types(override(WORD, MAIN, ' xml:space="preserve"')), 'docx', 'بادئة xml معرّفة دايمًا')
  is(types(override(WORD, MAIN, ' xmlns:x=""')), null, 'تصريح بادئة من غير مساحة')
  is(types(override(WORD, MAIN, ' xmlns:a="urn:n" xmlns:b="urn:n" a:k="1" b:k="2"')), null, 'نفس الخاصية ببادئتين لنفس المساحة')
  is(types(override(WORD, MAIN, ' xmlns:a="urn:n" xmlns:b="urn:m" a:k="1" b:k="2"')), 'docx', 'خاصيتين في مساحتين')
  is(types(`<x:Wrap xmlns:x="urn:other">${override(MACRO)}</x:Wrap>` + override(WORD)), 'docx', 'تصريح جوه عنصر مساحة تانية مالوش أثر')
  // التعليقات وتعليمات المعالجة
  is(types(override(WORD) + '<!-- a -- b -->'), null, 'شرطتين جوه تعليق')
  is(types(override(WORD) + '<!---->'), 'docx', 'تعليق فاضي')
  is(types(override(WORD) + '<!-- مش مقفول'), null, 'تعليق مش مقفول')
  is(types(override(WORD) + '<?xml version="1.0"?>'), null, 'تصريح XML في غير أول الملف')
  is(types(override(WORD) + '<? ?>'), null, 'تعليمة من غير اسم')
  is(types(override(WORD) + '<?note?>'), 'docx', 'تعليمة باسمها بس')
  // تصريح XML نفسه
  const declared = declaration => good.replace(/^<\?xml[^>]*\?>/, declaration)
  is(declared('<?xml version="1.1"?>'), null, 'إصدار 1.1')
  is(declared('<?xml encoding="UTF-8"?>'), null, 'من غير إصدار')
  is(declared('<?xml version="1.0" standalone="yes" encoding="UTF-8"?>'), null, 'ترتيب غلط')
  is(declared('<?XML version="1.0"?>'), null, 'حروف كبيرة')
  is(declared('<?xml version="1.0" bogus="1"?>'), null, 'خاصية مش معروفة في التصريح')
  is(declared("<?xml version='1.0' encoding='utf-8' standalone='no' ?>"), 'docx', 'علامات تنصيص مفردة وحروف صغيرة')
  is(declared(''), 'docx', 'من غير تصريح')
  // البايتات: UTF-8 مش سليم، وحرف تحكم
  is(Buffer.concat([Buffer.from(good.replace('</Types>', '<!-- '), 'utf8'), Buffer.from([0xc3, 0x28]), Buffer.from(' --></Types>', 'utf8')]), null, 'بايتات مش UTF-8')
  is(good.replace('</Types>', '<!-- \u0001 --></Types>'), null, 'حرف تحكم')
  // نفس الصرامة في ملف العلاقات
  for (const [change, label] of [[rels => rels.replace('</Relationships>', '</Other>'), 'وسم إقفال العلاقات باسم تاني'], [rels => rels + 'x', 'نص بعد جذر العلاقات'],
    [rels => rels.replace('<Relationship Id="rId2"', 'x<Relationship Id="rId2"'), 'نص جوه العلاقات']]) {
    assert.equal(ft.detectFileType(word({ rels: change(relationships(MAIN)) })), null, label)
  }

  // ===== بداية الجزء الرئيسي: عنصر جذر النوع المعلن في مساحته =====
  const body = (content, expected, label, options = {}) => assert.equal(ft.detectFileType(word({ body: content, ...options })), expected, label)
  body(WORD_BODY, 'docx', 'الضابط')
  body('not xml at all', null, 'الجزء الرئيسي مش XML')
  body('<document/>', null, 'جذر من غير مساحة أسماء')
  body('<w:document/>', null, 'بادئة مش متصرّح بيها')
  body(`<w:body xmlns:w="${WORD_NS}"/>`, null, 'عنصر تاني من مساحة Word')
  body('<w:document xmlns:w="urn:other"/>', null, 'الاسم صح والمساحة غلط')
  body(EXCEL_BODY, null, 'معلن Word وجسمه مصنف Excel')
  body(`<!DOCTYPE x>${WORD_BODY}`, null, 'DOCTYPE قبل الجذر')
  body(`<?xml version="1.0" encoding="UTF-16"?><w:document xmlns:w="${WORD_NS}"/>`, null, 'ترميز معلن غير UTF-8')
  body(Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(WORD_BODY, 'utf16le')]), null, 'UTF-16')
  body(`<w:document xmlns:w="${WORD_NS}"`, null, 'وسم الجذر مش مكتمل')
  body(`<x:document xmlns:x="${WORD_NS}"><x:body/></x:document>`, 'docx', 'بادئة تانية لمساحة Word')
  body(`<document xmlns="${WORD_NS}"><body/></document>`, 'docx', 'المساحة الافتراضية')
  body(`<?xml version="1.0"?>\n<!-- مولّد --><?mso-application progid="Word.Document"?>\n<w:document xmlns:w="${WORD_NS}"/>`, 'docx', 'تعليق وتعليمة قبل الجذر')
  body('<w:document xmlns:w="http://purl.oclc.org/ooxml/wordprocessingml/main"><w:body/></w:document>', 'docx', 'مستند Strict')
  assert.equal(ft.detectFileType(excelPackage({ body: '<workbook xmlns="http://purl.oclc.org/ooxml/spreadsheetml/main"/>' })), 'xlsx', 'مصنف Strict')
  assert.equal(ft.detectFileType(excelPackage({ body: WORD_BODY })), null, 'معلن Excel وجسمه مستند Word')
  assert.equal(ft.detectFileType(excelPackage({ body: `<worksheet xmlns="${EXCEL_NS}"/>` })), null, 'ورقة مش مصنف')
  // مستند حقيقي الشكل: وسم جذر بعشرات المساحات وجسم كبير، مخزّن ومضغوط — البداية بس هي اللي بتتفك
  const spaces = Array.from({ length: 40 }, (_, index) => ` xmlns:n${index}="http://schemas.example.invalid/2010/namespace/${index}"`).join('')
  const large = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n<w:document${spaces} xmlns:w="${WORD_NS}"><w:body>${'<w:p><w:r><w:t>نص المستند</w:t></w:r></w:p>'.repeat(45000)}</w:body></w:document>`
  assert.ok(Buffer.byteLength(large) > 2 * 1024 * 1024)
  body(large, 'docx', 'مستند كبير مخزّن')
  body(large, 'docx', 'مستند كبير مضغوط', { deflate: true })
  body(WORD_BODY, 'docx', 'مضغوط', { deflate: true })
  // بيانات مضغوطة مش بتتفك: أول بايتات بيانات الجزء الرئيسي بايظة
  const broken = word({ body: large, deflate: true })
  const nameAt = broken.indexOf(Buffer.from(MAIN, 'utf8'))
  broken.fill(0xff, nameAt + MAIN.length, nameAt + MAIN.length + 16)
  assert.equal(ft.detectFileType(broken), null, 'ضغط الجزء الرئيسي مش سليم')
  // مفيش خطأ على أي قص لجسم المستند
  for (let length = 0; length <= WORD_BODY.length; length += 5) assert.doesNotThrow(() => ft.detectFileType(word({ body: WORD_BODY.slice(0, length) })))
})

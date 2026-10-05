// B2.2: نوع الملف الحقيقي من محتواه، ومطابقته للامتداد والإعدادات — اختبارات نقية بلا قاعدة بيانات.
// CRP2A-B02 (مراجعة Codex): ملفات Office بتتحسم من بنية الحاوية (أجزاء أرشيف ZIP ونوعها المعلن، أو تيارات حاوية OLE)، مش من نص في أي
// مكان في البايتات — فالحاويات هنا حقيقية ومبنية بالبايت (FT-05 وFT-06).
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path'), crypto = require('node:crypto')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const ft = require('../src/files/file-type')

const bytes = (...parts) => Buffer.concat(parts.map(part => typeof part === 'string' ? Buffer.from(part, 'latin1') : Buffer.from(part)))

const { zip, ole, contentTypes, wordPackage, excelPackage, WORD_MAIN: WORD, EXCEL_MAIN: EXCEL } = require('./fixtures/office-containers.cjs')

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
  assert.equal(ft.detectFileType(zip([['word/document.xml', '<w:document/>']])), null)
  for (const type of ['application/vnd.ms-word.document.macroEnabled.main+xml', 'application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml', 'application/xml']) {
    assert.equal(ft.detectFileType(zip([['[Content_Types].xml', contentTypes(['word/document.xml', type])], ['word/document.xml', '<w:document/>']])), null, type)
  }
  assert.equal(ft.detectFileType(zip([['[Content_Types].xml', contentTypes(['xl/workbook.xml', 'application/vnd.ms-excel.sheet.macroEnabled.main+xml'])], ['xl/workbook.xml', '<workbook/>']])), null)
  assert.equal(ft.detectFileType(zip([['[Content_Types].xml', contentTypes(['word/document.xml', WORD])], ['word/document.xml', '']])), null, 'الجزء الرئيسي فاضي')
  // نوع Excel معلن على جزء Word (والعكس) مش واحد منهم
  assert.equal(ft.detectFileType(zip([['[Content_Types].xml', contentTypes(['word/document.xml', EXCEL])], ['word/document.xml', '<w:document/>']])), null)
  // السليم: مخزّن أو مضغوط، وبتعليق، وبحروف كبيرة في اسم الجزء، وبعلامة تنصيص مفردة في XML
  assert.equal(ft.detectFileType(wordPackage({ deflate: true })), 'docx')
  assert.equal(ft.detectFileType(excelPackage({ deflate: true, comment: 'word/document.xml' })), 'xlsx', 'التعليق مابيغيّرش النوع الحقيقي')
  assert.equal(ft.detectFileType(zip([['[Content_Types].xml', contentTypes(['Word/Document.xml', WORD])], ['Word/Document.xml', '<w:document/>']])), 'docx')
  assert.equal(ft.detectFileType(zip([['[Content_Types].xml', `<Types><Override ContentType='${EXCEL}' PartName='/xl/workbook.xml'/></Types>`], ['xl/workbook.xml', '<workbook/>']])), 'xlsx')
  // [Content_Types].xml مضغوط لأكتر من الحد (قنبلة ضغط) = مش مقروء = مش Office
  const bomb = zip([['[Content_Types].xml', contentTypes(['word/document.xml', WORD]) + ' '.repeat(2 * 1024 * 1024)], ['word/document.xml', '<w:document/>']], { deflate: true })
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
  for (const [name, sample] of [['doc', samples.doc], ['docx', samples.docx]]) assert.equal(ft.detectFileType(sample.subarray(0, sample.length - 30)), null, `${name} مقصوص`)
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

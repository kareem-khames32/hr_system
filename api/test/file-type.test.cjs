// B2.2: نوع الملف الحقيقي من أول بايتاته، ومطابقته للامتداد والإعدادات — اختبارات نقية بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const ft = require('../src/files/file-type')

const bytes = (...parts) => Buffer.concat(parts.map(part => typeof part === 'string' ? Buffer.from(part, 'latin1') : Buffer.from(part)))
const samples = {
  jpeg: bytes([0xff, 0xd8, 0xff, 0xe0], 'JFIF'),
  png: bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'IHDR'),
  webp: bytes('RIFF', [0x10, 0, 0, 0], 'WEBPVP8 '),
  pdf: bytes('%PDF-1.7\n'),
  ole: bytes([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], 'x'),
  docx: bytes([0x50, 0x4b, 0x03, 0x04], '....[Content_Types].xml....word/document.xml'),
  xlsx: bytes([0x50, 0x4b, 0x03, 0x04], '....[Content_Types].xml....xl/workbook.xml'),
}

test('FT-01: كل نوع من أول بايتاته، والـZIP العادي والنص والـHTML مش من الأنواع', () => {
  for (const type of ['jpeg', 'png', 'webp', 'pdf', 'docx', 'xlsx']) assert.equal(ft.detectFileType(samples[type]), type, type)
  assert.equal(ft.detectFileType(samples.ole), 'ole')
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

test('FT-03: Word وExcel القديم (نفس الحاوية) بيتحسموا بالامتداد', () => {
  const all = ft.parseAllowedFileTypes('')
  assert.deepEqual(ft.classifyUpload(samples.ole, 'old.doc', all), { type: 'doc' })
  assert.deepEqual(ft.classifyUpload(samples.ole, 'old.xls', all), { type: 'xls' })
  assert.match(ft.classifyUpload(samples.ole, 'old.jpg', all).error, /الامتداد لازم يكون \.doc أو \.xls/)
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

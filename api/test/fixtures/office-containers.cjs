'use strict'
// حاويات ملفات Office مبنية بالبايت للاختبارات (CRP2A-B02 وCRP2B-A-B01): أرشيف ZIP حقيقي (حزمة Word أو Excel الجديد بعلاقتها ونوع جزئها،
// أو أي أرشيف تاني بتعليق)، وحاوية OLE حقيقية بشجرة دليلها (Word أو Excel القديم، أو أي حاوية تانية). من غير مكتبات، عشان الاختبار
// يتحكم في كل بايت (تعليق، جزء ناقص، نوع معلن، علاقة، تيار أو مجلد، في الجذر أو جوه مجلد).
const zlib = require('node:zlib')

/** أرشيف ZIP حقيقي: files = [[الاسم، المحتوى]…]، مخزّن أو deflate، بتعليق اختياري */
function zip(files, { comment = '', deflate = false } = {}) {
  const locals = [], centrals = []
  let offset = 0
  for (const [name, content] of files) {
    const nameBytes = Buffer.from(name, 'utf8'), raw = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8'), data = deflate ? zlib.deflateRawSync(raw) : raw, crc = zlib.crc32(raw) >>> 0
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(deflate ? 8 : 0, 8); local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(data.length, 18); local.writeUInt32LE(raw.length, 22); local.writeUInt16LE(nameBytes.length, 26)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(deflate ? 8 : 0, 10); central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(data.length, 20); central.writeUInt32LE(raw.length, 24); central.writeUInt16LE(nameBytes.length, 28); central.writeUInt32LE(offset, 42)
    locals.push(local, nameBytes, data); centrals.push(central, nameBytes)
    offset += 30 + nameBytes.length + data.length
  }
  const directory = Buffer.concat(centrals), commentBytes = Buffer.from(comment, 'latin1'), end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(directory.length, 12)
  end.writeUInt32LE(offset, 16); end.writeUInt16LE(commentBytes.length, 20)
  return Buffer.concat([...locals, directory, end, commentBytes])
}

const WORD_MAIN = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml'
const EXCEL_MAIN = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml'
const OFFICE_DOCUMENT = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument'
const TYPES_OPEN = '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
/** [Content_Types].xml بالأجزاء المعلنة: overrides = [[مسار الجزء، نوعه]…] */
const contentTypes = (...overrides) => TYPES_OPEN
  + '<Default Extension="xml" ContentType="application/xml"/>' + overrides.map(([part, type]) => `<Override PartName="/${part}" ContentType="${type}"/>`).join('') + '</Types>'
/** _rels/.rels بعلاقة المستند الرئيسي للجزء ده (ومعاها علاقة خصائص زي الملفات الحقيقية) */
const relationships = (target, type = OFFICE_DOCUMENT) => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
  + `<Relationship Id="rId1" Type="${type}" Target="${target}"/>`
  + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>'
/**
 * حزمة Office: الجزء الرئيسي بنوعه المعلن وعلاقته. types/rels بيتبدّلوا للحالات الشاذة (rels: null = من غير ملف العلاقات)،
 * وextra أجزاء زيادة، والباقي خيارات الأرشيف (comment, deflate).
 */
function officePackage(part, type, { types = contentTypes([part, type]), rels = relationships(part), body = '<document/>', extra = [], ...options } = {}) {
  return zip([['[Content_Types].xml', types], ...(rels === null ? [] : [['_rels/.rels', rels]]), [part, body], ...extra], options)
}
const wordPackage = options => officePackage('word/document.xml', WORD_MAIN, { body: '<w:document/>', ...options })
const excelPackage = options => officePackage('xl/workbook.xml', EXCEL_MAIN, { body: '<workbook/>', ...options })

const OLE_NONE = 0xffffffff, OLE_END = 0xfffffffe
/** موضع مدخل الدليل رقم id في حاوية مبنية بـole() (الدليل بيبدأ في القطاع 1) */
const oleEntryOffset = id => 1024 + id * 128
/**
 * حاوية OLE حقيقية (قطاعات 512 بايت): رأس + قطاع توزيع + قطاعات دليل (4 مدخلات في القطاع) + سلسلة قطاعات بيانات لكل تيار.
 * entries: اسم تيار في الجذر (نص)، أو { name, kind: 'stream' | 'storage', size, children: [...] }.
 * التيار الافتراضي 4096 بايت (8 قطاعات)، والأصغر من 4096 بيتخزن في تيار الجذر المصغّر (قطاعات 64 بايت) زي الملفات الحقيقية.
 * المدخلات بترتيب الكتابة (الجذر 0، وبعده الأولاد بالعمق)، وأولاد كل مجلد سلسلة: الابن الأول في خانة الابن، وكل واحد أخوه اليمين اللي بعده.
 */
function ole(entries) {
  const flat = [{ name: 'Root Entry', kind: 5, size: 0, children: [] }]
  const add = (spec, parent) => {
    const node = typeof spec === 'string' ? { name: spec } : spec
    const storage = node.kind === 'storage'
    const entry = { name: node.name, kind: storage ? 1 : 2, size: node.size ?? (storage ? 0 : 4096), children: [] }
    parent.children.push(flat.push(entry) - 1)
    for (const child of node.children ?? []) add(child, entry)
  }
  for (const spec of entries) add(spec, flat[0])
  const directorySectors = Math.ceil(flat.length / 4)
  const fat = Buffer.alloc(512, 0xff), sectors = []
  fat.writeUInt32LE(0xfffffffd, 0)
  for (let index = 0; index < directorySectors; index++) fat.writeUInt32LE(index === directorySectors - 1 ? OLE_END : index + 2, (index + 1) * 4)
  let nextSector = 1 + directorySectors
  // سلسلة قطاعات عادية بالعدد ده: بترجّع أول قطاع
  const chain = count => {
    const first = nextSector
    for (let index = 0; index < count; index++) { fat.writeUInt32LE(index === count - 1 ? OLE_END : nextSector + 1, nextSector * 4); nextSector++; sectors.push(Buffer.alloc(512, 0x20)) }
    if (nextSector > 128) throw new Error('الحاوية أكبر من قطاع توزيع واحد')
    return first
  }
  const directory = Buffer.alloc(512 * directorySectors), miniFat = Buffer.alloc(512, 0xff)
  let miniSectors = 0
  flat.forEach((entry, id) => {
    const at = id * 128, nameBytes = Buffer.from(entry.name + '\0', 'utf16le')
    nameBytes.copy(directory, at); directory.writeUInt16LE(nameBytes.length, at + 64); directory[at + 66] = entry.kind; directory[at + 67] = 1
    directory.writeUInt32LE(OLE_NONE, at + 68); directory.writeUInt32LE(OLE_NONE, at + 72)
    directory.writeUInt32LE(entry.children.length ? entry.children[0] : OLE_NONE, at + 76)
    directory.writeUInt32LE(OLE_END, at + 116); directory.writeUInt32LE(entry.size, at + 120)
    if (entry.kind !== 2 || entry.size <= 0) return
    if (entry.size >= 4096) directory.writeUInt32LE(chain(Math.ceil(entry.size / 512)), at + 116)
    else {
      // تيار صغير: سلسلة قطاعات مصغّرة (64 بايت) في تيار الجذر المصغّر
      const count = Math.ceil(entry.size / 64)
      directory.writeUInt32LE(miniSectors, at + 116)
      for (let index = 0; index < count; index++) { miniFat.writeUInt32LE(index === count - 1 ? OLE_END : miniSectors + 1, miniSectors * 4); miniSectors++ }
    }
  })
  // أولاد كل مجلد سلسلة بالأخ اليمين
  flat.forEach(entry => entry.children.forEach((child, index) => directory.writeUInt32LE(index + 1 < entry.children.length ? entry.children[index + 1] : OLE_NONE, child * 128 + 72)))
  const header = Buffer.alloc(512)
  Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]).copy(header)
  header.writeUInt16LE(0x3e, 24); header.writeUInt16LE(3, 26); header.writeUInt16LE(0xfffe, 28); header.writeUInt16LE(9, 30); header.writeUInt16LE(6, 32)
  header.writeUInt32LE(1, 44); header.writeUInt32LE(1, 48); header.writeUInt32LE(0x1000, 56); header.writeUInt32LE(OLE_END, 60); header.writeUInt32LE(OLE_END, 68)
  for (let index = 0; index < 109; index++) header.writeUInt32LE(index === 0 ? 0 : OLE_NONE, 76 + index * 4)
  if (miniSectors) {
    // تيار الجذر المصغّر (بيشيل القطاعات المصغّرة) وجدول توزيعها
    directory.writeUInt32LE(chain(Math.ceil(miniSectors * 64 / 512)), 116); directory.writeUInt32LE(miniSectors * 64, 120)
    header.writeUInt32LE(chain(1), 60); header.writeUInt32LE(1, 64)
    sectors[sectors.length - 1] = miniFat
  }
  return Buffer.concat([header, fat, directory, ...sectors])
}
const oldWord = () => ole(['1Table', 'WordDocument', 'SummaryInformation'])
const oldExcel = () => ole(['Workbook', 'SummaryInformation'])

module.exports = { zip, ole, oleEntryOffset, contentTypes, relationships, officePackage, wordPackage, excelPackage, oldWord, oldExcel,
  WORD_MAIN, EXCEL_MAIN, OFFICE_DOCUMENT, TYPES_OPEN, OLE_NONE, OLE_END }

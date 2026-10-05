'use strict'
// حاويات ملفات Office مبنية بالبايت للاختبارات (CRP2A-B02): أرشيف ZIP حقيقي (حزمة Word أو Excel الجديد، أو أي أرشيف تاني بتعليق)،
// وحاوية OLE حقيقية (Word أو Excel القديم، أو أي حاوية تانية). من غير مكتبات، عشان الاختبار يتحكم في كل بايت (تعليق، جزء ناقص، نوع معلن).
const zlib = require('node:zlib')

/** أرشيف ZIP حقيقي: files = [[الاسم، المحتوى]…]، مخزّن أو deflate، بتعليق اختياري */
function zip(files, { comment = '', deflate = false } = {}) {
  const locals = [], centrals = []
  let offset = 0
  for (const [name, content] of files) {
    const nameBytes = Buffer.from(name, 'utf8'), raw = Buffer.from(content, 'utf8'), data = deflate ? zlib.deflateRawSync(raw) : raw, crc = zlib.crc32(raw) >>> 0
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
/** [Content_Types].xml بالأجزاء المعلنة: overrides = [[مسار الجزء، نوعه]…] */
const contentTypes = (...overrides) => '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
  + '<Default Extension="xml" ContentType="application/xml"/>' + overrides.map(([part, type]) => `<Override PartName="/${part}" ContentType="${type}"/>`).join('') + '</Types>'
const wordPackage = options => zip([['[Content_Types].xml', contentTypes(['word/document.xml', WORD_MAIN])], ['word/document.xml', '<w:document/>']], options)
const excelPackage = options => zip([['[Content_Types].xml', contentTypes(['xl/workbook.xml', EXCEL_MAIN])], ['xl/workbook.xml', '<workbook/>']], options)

/** حاوية OLE حقيقية (قطاعات 512 بايت): رأس + قطاع توزيع + قطاعات دليل (4 مدخلات في القطاع) بالتيارات دي */
function ole(streams) {
  const header = Buffer.alloc(512)
  Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]).copy(header)
  header.writeUInt16LE(0x3e, 24); header.writeUInt16LE(3, 26); header.writeUInt16LE(0xfffe, 28); header.writeUInt16LE(9, 30); header.writeUInt16LE(6, 32)
  header.writeUInt32LE(1, 44); header.writeUInt32LE(1, 48); header.writeUInt32LE(0x1000, 56); header.writeUInt32LE(0xfffffffe, 60); header.writeUInt32LE(0xfffffffe, 68)
  for (let index = 0; index < 109; index++) header.writeUInt32LE(index === 0 ? 0 : 0xffffffff, 76 + index * 4)
  const entries = ['Root Entry', ...streams], directorySectors = Math.ceil(entries.length / 4)
  const fat = Buffer.alloc(512, 0xff)
  fat.writeUInt32LE(0xfffffffd, 0)
  for (let index = 0; index < directorySectors; index++) fat.writeUInt32LE(index === directorySectors - 1 ? 0xfffffffe : index + 2, (index + 1) * 4)
  const directory = Buffer.alloc(512 * directorySectors)
  entries.forEach((name, index) => {
    const at = index * 128, nameBytes = Buffer.from(name + '\0', 'utf16le')
    nameBytes.copy(directory, at); directory.writeUInt16LE(nameBytes.length, at + 64); directory[at + 66] = index === 0 ? 5 : 2
  })
  return Buffer.concat([header, fat, directory])
}
const oldWord = () => ole(['1Table', 'WordDocument', 'SummaryInformation'])
const oldExcel = () => ole(['Workbook', 'SummaryInformation'])

module.exports = { zip, ole, contentTypes, wordPackage, excelPackage, oldWord, oldExcel, WORD_MAIN, EXCEL_MAIN }

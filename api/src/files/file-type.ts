// B2.2: النوع الحقيقي للملف من أول بايتاته (magic bytes) — مش من النوع اللي المتصفح بيقوله. من غير مكتبات.
// النوع الحقيقي لازم يكون مسموح (الإعداد files.allowed_types) ومطابق لامتداد اسم الملف: PDF متسمي .jpg بيترفض.
//
// CRP2A-B02 (مراجعة Codex): ملفات Office حاويات (ZIP للجديد، OLE للقديم)، فأول البايتات بتقول «حاوية» مش «Word». النوع بيتحسم من
// بنية الحاوية نفسها: أجزاء الأرشيف الفعلية ونوعها المعلن في [Content_Types].xml، أو تيارات دليل OLE. نص «word/document.xml» في تعليق
// الأرشيف أو جوه ملف فيه مالوش أي أثر، وأي حاوية تانية (ZIP عادي، MSI، رسالة Outlook) مش Word ولا Excel.
import { inflateRawSync } from 'node:zlib'

export const FILE_TYPES = ['jpeg', 'png', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx'] as const
export type FileType = typeof FILE_TYPES[number]
export const IMAGE_FILE_TYPES: readonly FileType[] = ['jpeg', 'png', 'webp']

export const FILE_TYPE_MIME: Record<FileType, string> = {
  jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

export const FILE_TYPE_LABELS: Record<FileType, string> = {
  jpeg: 'صورة JPG', png: 'صورة PNG', webp: 'صورة WEBP', pdf: 'PDF', doc: 'Word قديم (.doc)', docx: 'Word', xls: 'Excel قديم (.xls)', xlsx: 'Excel',
}

// الامتدادات المقبولة لكل نوع؛ أولها امتداد التخزين
export const FILE_TYPE_EXTENSIONS: Record<FileType, readonly string[]> = {
  jpeg: ['.jpg', '.jpeg'], png: ['.png'], webp: ['.webp'], pdf: ['.pdf'], doc: ['.doc'], docx: ['.docx'], xls: ['.xls'], xlsx: ['.xlsx'],
}

export const FILES_MAX_SIZE_KEY = 'files.max_size_mb'
export const FILES_ALLOWED_TYPES_KEY = 'files.allowed_types'
export const FILES_MAX_SIZE_DEFAULT_MB = 10
export const FILES_MAX_SIZE_LIMIT_MB = 50
export const FILES_ALLOWED_TYPES_DEFAULT = FILE_TYPES.join(',')

const startsWith = (buffer: Buffer, bytes: readonly number[], offset = 0) =>
  buffer.length >= offset + bytes.length && bytes.every((byte, index) => buffer[offset + index] === byte)
const ascii = (buffer: Buffer, text: string, offset = 0) => startsWith(buffer, [...Buffer.from(text, 'latin1')], offset)

// ===== ZIP: Word وExcel الجديد (حزمة OOXML) =====
interface ZipEntry { name: string; flags: number; method: number; compressedSize: number; uncompressedSize: number; localOffset: number }

/**
 * مدخلات الدليل المركزي للأرشيف (أجزاؤه الفعلية بأسمائها)، أو null لو البنية مش ZIP سليم من ملف واحد.
 * تعليق الأرشيف ومحتوى الملفات اللي جواه مش مدخلات.
 */
function zipEntries(buffer: Buffer): ZipEntry[] | null {
  const RECORD = 22
  if (buffer.length < RECORD) return null
  let end = -1
  // سجل نهاية الدليل المركزي: في آخر الملف، وبعده التعليق (لحد 65535 بايت). طول التعليق المكتوب فيه لازم ينتهي عند آخر الملف بالظبط
  for (let at = buffer.length - RECORD; at >= Math.max(0, buffer.length - RECORD - 0xffff); at--) {
    if (buffer.readUInt32LE(at) === 0x06054b50 && at + RECORD + buffer.readUInt16LE(at + 20) === buffer.length) { end = at; break }
  }
  if (end < 0) return null
  const total = buffer.readUInt16LE(end + 10), size = buffer.readUInt32LE(end + 12), offset = buffer.readUInt32LE(end + 16)
  // أرشيف على أكتر من قرص أو ZIP64: مش ملف Office في حدود الحجم المسموح
  if (buffer.readUInt16LE(end + 4) !== 0 || buffer.readUInt16LE(end + 6) !== 0 || buffer.readUInt16LE(end + 8) !== total
    || total === 0xffff || size === 0xffffffff || offset === 0xffffffff || offset + size > end) return null
  const entries: ZipEntry[] = []
  let at = offset
  for (let index = 0; index < total; index++) {
    if (at + 46 > offset + size || buffer.readUInt32LE(at) !== 0x02014b50) return null
    const nameLength = buffer.readUInt16LE(at + 28), next = at + 46 + nameLength + buffer.readUInt16LE(at + 30) + buffer.readUInt16LE(at + 32)
    if (next > offset + size) return null
    entries.push({ name: buffer.toString('utf8', at + 46, at + 46 + nameLength), flags: buffer.readUInt16LE(at + 8), method: buffer.readUInt16LE(at + 10),
      compressedSize: buffer.readUInt32LE(at + 20), uncompressedSize: buffer.readUInt32LE(at + 24), localOffset: buffer.readUInt32LE(at + 42) })
    at = next
  }
  return entries
}

/** محتوى جزء من الأرشيف (مخزّن أو deflate) بحد أقصى للحجم، أو null لو مش مقروء: مشفّر، أو ضغط تاني، أو خارج الملف، أو أكبر من الحد */
function zipPart(buffer: Buffer, entry: ZipEntry, maxBytes: number): Buffer | null {
  if (entry.flags & 0x1 || entry.compressedSize > maxBytes || entry.uncompressedSize > maxBytes) return null
  const at = entry.localOffset
  if (at + 30 > buffer.length || buffer.readUInt32LE(at) !== 0x04034b50) return null
  const nameLength = buffer.readUInt16LE(at + 26), start = at + 30 + nameLength + buffer.readUInt16LE(at + 28)
  // اسم الجزء في رأسه المحلي لازم يطابق اسمه في الدليل المركزي
  if (start + entry.compressedSize > buffer.length || buffer.toString('utf8', at + 30, at + 30 + nameLength) !== entry.name) return null
  const data = buffer.subarray(start, start + entry.compressedSize)
  try {
    if (entry.method === 0) return data.length === entry.uncompressedSize ? data : null
    if (entry.method === 8) return inflateRawSync(data, { maxOutputLength: maxBytes })
  } catch { /* ضغط مش سليم، أو الناتج أكبر من الحد */ }
  return null
}

// الجزء الرئيسي ونوعه المعلن. نوع الماكرو (docm/xlsm) والقالب (dotx/xltx) غير دول، فمش Word ولا Excel هنا
const OOXML_MAIN: Record<'docx' | 'xlsx', { part: string; contentType: string }> = {
  docx: { part: 'word/document.xml', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml' },
  xlsx: { part: 'xl/workbook.xml', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml' },
}
const CONTENT_TYPES_MAX_BYTES = 1024 * 1024
const xmlAttribute = (tag: string, name: string): string | null => {
  const match = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`).exec(tag)
  return match ? match[1] ?? match[2] ?? null : null
}

/** Word أو Excel الجديد: الجزء الرئيسي موجود فعلًا في الأرشيف ومش فاضي، ومعلن بنوعه في [Content_Types].xml */
function ooxmlType(buffer: Buffer): 'docx' | 'xlsx' | null {
  const entries = zipEntries(buffer)
  if (!entries) return null
  // أسماء أجزاء الحزمة مش حساسة لحالة الحروف
  const byName = new Map(entries.map(entry => [entry.name.toLowerCase(), entry]))
  const types = byName.get('[content_types].xml')
  const xml = types ? zipPart(buffer, types, CONTENT_TYPES_MAX_BYTES)?.toString('utf8') : null
  if (!xml) return null
  const overrides = xml.match(/<(?:[A-Za-z_][\w.-]*:)?Override\s[^>]*>/g) ?? []
  for (const type of ['docx', 'xlsx'] as const) {
    const { part, contentType } = OOXML_MAIN[type]
    const main = byName.get(part)
    if (!main || main.uncompressedSize === 0) continue
    if (overrides.some(tag => xmlAttribute(tag, 'PartName')?.toLowerCase() === `/${part}` && xmlAttribute(tag, 'ContentType') === contentType)) return type
  }
  return null
}

// ===== OLE (Compound File): Word وExcel القديم =====
/**
 * أسماء مدخلات دليل حاوية OLE (المجلدات والتيارات)، أو null لو البنية مش سليمة. Word القديم فيه تيار WordDocument، وExcel القديم فيه
 * Workbook (أو Book في الإصدارات الأقدم). الحاويات التانية (MSI، رسالة Outlook، PowerPoint، Office مشفّر) مالهاش ولا واحد منهم.
 */
function oleEntryNames(buffer: Buffer): string[] | null {
  if (buffer.length < 512) return null
  const sectorShift = buffer.readUInt16LE(30)
  if (sectorShift !== 9 && sectorShift !== 12) return null
  const sectorSize = 1 << sectorShift, perSector = sectorSize / 4, maxSectors = Math.floor(buffer.length / sectorSize)
  const LAST_REGULAR = 0xfffffffa, END_OF_CHAIN = 0xfffffffe
  // القطاع رقم n بيبدأ بعد الرأس (اللي واخد قطاع كامل)
  const sectorAt = (sector: number) => { const at = (sector + 1) * sectorSize; return sector < maxSectors && at + sectorSize <= buffer.length ? at : -1 }
  // قطاعات جدول التوزيع (FAT): أول 109 في الرأس، والباقي في سلسلة DIFAT
  const fatSectors: number[] = []
  for (let index = 0; index < 109; index++) { const sector = buffer.readUInt32LE(76 + index * 4); if (sector < LAST_REGULAR) fatSectors.push(sector) }
  for (let difat = buffer.readUInt32LE(68), guard = 0; difat < LAST_REGULAR; guard++) {
    const at = sectorAt(difat)
    if (at < 0 || guard > maxSectors) return null
    for (let index = 0; index < perSector - 1; index++) { const sector = buffer.readUInt32LE(at + index * 4); if (sector < LAST_REGULAR) fatSectors.push(sector) }
    difat = buffer.readUInt32LE(at + (perSector - 1) * 4)
  }
  const names: string[] = []
  for (let sector = buffer.readUInt32LE(48), guard = 0; sector !== END_OF_CHAIN; guard++) {
    const at = sector < LAST_REGULAR ? sectorAt(sector) : -1
    if (at < 0 || guard > maxSectors) return null
    for (let entry = at; entry < at + sectorSize; entry += 128) {
      const kind = buffer[entry + 66], nameBytes = buffer.readUInt16LE(entry + 64)
      if ((kind === 1 || kind === 2 || kind === 5) && nameBytes >= 2 && nameBytes <= 64) names.push(buffer.toString('utf16le', entry, entry + nameBytes - 2))
    }
    // القطاع التالي في سلسلة الدليل من جدول التوزيع
    const fatAt = Math.floor(sector / perSector) < fatSectors.length ? sectorAt(fatSectors[Math.floor(sector / perSector)]) : -1
    if (fatAt < 0) return null
    sector = buffer.readUInt32LE(fatAt + (sector % perSector) * 4)
  }
  return names
}

function oleType(buffer: Buffer): 'doc' | 'xls' | null {
  const names = oleEntryNames(buffer)
  if (!names) return null
  const word = names.includes('WordDocument'), excel = names.includes('Workbook') || names.includes('Book')
  // حاوية فيها الاتنين مش ملف Word ولا Excel عادي
  return word && !excel ? 'doc' : excel && !word ? 'xls' : null
}

/**
 * النوع الحقيقي من المحتوى، أو null (مش من الأنواع المعروفة). الصور وPDF من أول البايتات؛ وملفات Office من بنية حاويتها
 * (أرشيف ZIP: الجزء الرئيسي ونوعه المعلن — حاوية OLE: تيارات دليلها).
 */
export function detectFileType(buffer: Buffer): FileType | null {
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return 'jpeg'
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png'
  if (ascii(buffer, 'RIFF') && ascii(buffer, 'WEBP', 8)) return 'webp'
  if (ascii(buffer, '%PDF-')) return 'pdf'
  if (startsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return oleType(buffer)
  if (startsWith(buffer, [0x50, 0x4b, 0x03, 0x04])) return ooxmlType(buffer)
  return null
}

/** امتداد اسم الملف بحروف صغيرة وبالنقطة، أو '' */
export const fileExtension = (name: string | null | undefined) => {
  const match = /\.[A-Za-z0-9]{1,8}$/.exec(String(name ?? '').trim())
  return match ? match[0].toLowerCase() : ''
}

/** الأنواع المسموحة من الإعداد: المجهول بيتشال، والفاضي أو الغلط كله = الافتراضي (كل الأنواع) */
export function parseAllowedFileTypes(value: unknown): FileType[] {
  const list = String(value ?? '').split(',').map(item => item.trim().toLowerCase())
    .filter((item): item is FileType => (FILE_TYPES as readonly string[]).includes(item))
  return list.length ? [...new Set(list)] : [...FILE_TYPES]
}

/** خطأ قيمة الإعداد files.allowed_types (null = سليمة) */
export function allowedFileTypesError(value: string): string | null {
  const items = value.split(',').map(item => item.trim().toLowerCase()).filter(Boolean)
  if (!items.length) return 'اختار نوع ملف واحد على الأقل'
  const unknown = items.filter(item => !(FILE_TYPES as readonly string[]).includes(item))
  return unknown.length ? `أنواع ملفات مش معروفة: ${unknown.join('، ')} — المسموح: ${FILE_TYPES.join(', ')}` : null
}

/** حد الحجم بالميجا من الإعداد (عدد صحيح من 1 لـ 50، وغير كده الافتراضي) */
export function maxFileSizeMb(value: unknown): number {
  const mb = Number(value)
  return Number.isInteger(mb) && mb >= 1 && mb <= FILES_MAX_SIZE_LIMIT_MB ? mb : FILES_MAX_SIZE_DEFAULT_MB
}

/**
 * الحكم على الملف المرفوع: النوع الحقيقي مسموح ومطابق للامتداد (Word القديم المتسمي .xls بيترفض زي أي عدم تطابق).
 * من غير امتداد خالص = مفيش ادعاء، فبيتقبل بنوعه الحقيقي (وبيتخزن بامتداد نوعه).
 */
export function classifyUpload(buffer: Buffer, originalName: string, allowed: readonly FileType[]): { type: FileType } | { error: string } {
  const type = detectFileType(buffer)
  const extension = fileExtension(originalName)
  const allowedText = allowed.map(item => FILE_TYPE_LABELS[item]).join('، ')
  if (!type) return { error: `محتوى الملف مش من الأنواع المسموحة (${allowedText})` }
  if (!allowed.includes(type)) return { error: `نوع الملف (${FILE_TYPE_LABELS[type]}) مش مسموح — المسموح: ${allowedText}` }
  if (extension && !FILE_TYPE_EXTENSIONS[type].includes(extension)) {
    return { error: `محتوى الملف ${FILE_TYPE_LABELS[type]} لكن امتداده «${extension}» — الامتداد لازم يطابق المحتوى (${FILE_TYPE_EXTENSIONS[type].join(' أو ')})` }
  }
  return { type }
}

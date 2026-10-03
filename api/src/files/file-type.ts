// B2.2: النوع الحقيقي للملف من أول بايتاته (magic bytes) — مش من النوع اللي المتصفح بيقوله. من غير مكتبات.
// النوع الحقيقي لازم يكون مسموح (الإعداد files.allowed_types) ومطابق لامتداد اسم الملف: PDF متسمي .jpg بيترفض.

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

/**
 * النوع الحقيقي من المحتوى، أو 'ole' (Word أو Excel القديم: الحاوية واحدة والامتداد بيحسم)، أو null (مش من الأنواع المعروفة).
 * Word وExcel الجديد أرشيف ZIP: النوع من اسم الجزء الرئيسي جوه الأرشيف (word/document.xml أو xl/workbook.xml).
 */
export function detectFileType(buffer: Buffer): FileType | 'ole' | null {
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return 'jpeg'
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png'
  if (ascii(buffer, 'RIFF') && ascii(buffer, 'WEBP', 8)) return 'webp'
  if (ascii(buffer, '%PDF-')) return 'pdf'
  if (startsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return 'ole'
  if (startsWith(buffer, [0x50, 0x4b, 0x03, 0x04])) {
    if (buffer.includes('word/document.xml', 0, 'latin1')) return 'docx'
    if (buffer.includes('xl/workbook.xml', 0, 'latin1')) return 'xlsx'
  }
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
 * الحكم على الملف المرفوع: النوع الحقيقي مسموح ومطابق للامتداد. 'ole' بيتحسم بالامتداد (.doc أو .xls).
 * من غير امتداد خالص = مفيش ادعاء، فبيتقبل بنوعه الحقيقي (وبيتخزن بامتداد نوعه).
 */
export function classifyUpload(buffer: Buffer, originalName: string, allowed: readonly FileType[]): { type: FileType } | { error: string } {
  const detected = detectFileType(buffer)
  const extension = fileExtension(originalName)
  const allowedText = allowed.map(type => FILE_TYPE_LABELS[type]).join('، ')
  if (!detected) return { error: `محتوى الملف مش من الأنواع المسموحة (${allowedText})` }
  const type: FileType | null = detected !== 'ole' ? detected : extension === '.xls' ? 'xls' : extension === '.doc' || !extension ? 'doc' : null
  if (!type) return { error: `محتوى الملف Word أو Excel قديم، لكن امتداده «${extension}» — الامتداد لازم يكون .doc أو .xls` }
  if (!allowed.includes(type)) return { error: `نوع الملف (${FILE_TYPE_LABELS[type]}) مش مسموح — المسموح: ${allowedText}` }
  if (extension && !FILE_TYPE_EXTENSIONS[type].includes(extension)) {
    return { error: `محتوى الملف ${FILE_TYPE_LABELS[type]} لكن امتداده «${extension}» — الامتداد لازم يطابق المحتوى (${FILE_TYPE_EXTENSIONS[type].join(' أو ')})` }
  }
  return { type }
}

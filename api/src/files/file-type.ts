// B2.2: النوع الحقيقي للملف من أول بايتاته (magic bytes) — مش من النوع اللي المتصفح بيقوله. من غير مكتبات.
// النوع الحقيقي لازم يكون مسموح (الإعداد files.allowed_types) ومطابق لامتداد اسم الملف: PDF متسمي .jpg بيترفض.
//
// CRP2A-B02 (مراجعة Codex): ملفات Office حاويات (ZIP للجديد، OLE للقديم)، فأول البايتات بتقول «حاوية» مش «Word». النوع بيتحسم من
// بنية الحاوية نفسها. نص «word/document.xml» في تعليق الأرشيف أو جوه ملف فيه مالوش أي أثر، وأي حاوية تانية (ZIP عادي، MSI، رسالة
// Outlook) مش Word ولا Excel.
// CRP2B-A-B01 (مراجعة Codex): الحزمة بتتقري بنفس ترتيب Office: علاقة المستند الرئيسي في _rels/.rels ← الجزء اللي بتشاور عليه ←
// نوعه المعلن في [Content_Types].xml. والملفين دول بيتقروا كـXML فعلي (عناصر وخصائص)، مش بحث عن نص: التعليق وCDATA وتعليمات المعالجة
// وقيمة خاصية تانية مالهمش أثر، وأي حاجة مش متوقعة في ملف تعريف حزمة (DOCTYPE، ترميز غير UTF-8، خاصية مكررة، تصريحين لنفس الجزء)
// = مش ملف Office. وحاوية OLE: تيار (مش مجلد) في جذر الحاوية نفسه وحجمه مش صفر.
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

/** بيانات الجزء المضغوطة زي ما هي في الأرشيف، أو null لو رأسه المحلي مش موجود، أو اسمه غير اسمه في الدليل المركزي، أو بياناته خارج الملف */
function zipPartData(buffer: Buffer, entry: ZipEntry): Buffer | null {
  const at = entry.localOffset
  if (at + 30 > buffer.length || buffer.readUInt32LE(at) !== 0x04034b50) return null
  const nameLength = buffer.readUInt16LE(at + 26), start = at + 30 + nameLength + buffer.readUInt16LE(at + 28)
  // اسم الجزء في رأسه المحلي لازم يطابق اسمه في الدليل المركزي
  if (start + entry.compressedSize > buffer.length || buffer.toString('utf8', at + 30, at + 30 + nameLength) !== entry.name) return null
  return buffer.subarray(start, start + entry.compressedSize)
}

/** محتوى جزء من الأرشيف (مخزّن أو deflate) بحد أقصى للحجم، أو null لو مش مقروء: مشفّر، أو ضغط تاني، أو خارج الملف، أو أكبر من الحد */
function zipPart(buffer: Buffer, entry: ZipEntry, maxBytes: number): Buffer | null {
  if (entry.flags & 0x1 || entry.compressedSize > maxBytes || entry.uncompressedSize > maxBytes) return null
  const data = zipPartData(buffer, entry)
  if (!data) return null
  try {
    if (entry.method === 0) return data.length === entry.uncompressedSize ? data : null
    if (entry.method === 8) return inflateRawSync(data, { maxOutputLength: maxBytes })
  } catch { /* ضغط مش سليم، أو الناتج أكبر من الحد */ }
  return null
}

// نوع الجزء الرئيسي. نوع الماكرو (docm/xlsm) والقالب (dotx/xltx) غير دول، فمش Word ولا Excel هنا
const OOXML_MAIN_TYPES: Record<string, 'docx' | 'xlsx'> = {
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml': 'xlsx',
}
const PACKAGE_XML_MAX_BYTES = 1024 * 1024
const CONTENT_TYPES_NS = 'http://schemas.openxmlformats.org/package/2006/content-types'
const RELATIONSHIPS_NS = 'http://schemas.openxmlformats.org/package/2006/relationships'
// علاقة المستند الرئيسي (العادية والـStrict)
const OFFICE_DOCUMENT_RELATIONSHIPS: readonly string[] = [
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument',
  'http://purl.oclc.org/ooxml/officeDocument/relationships/officeDocument',
]

interface XmlElement { prefix: string; local: string; depth: number; attributes: Map<string, string> }
const XML_NAME = /[A-Za-z_][\w.-]*(?::[A-Za-z_][\w.-]*)?/y
const XML_SPACE = /[ \t\r\n]*/y
const XML_VALUE = /"([^"<]*)"|'([^'<]*)'/y
const stickyMatch = (pattern: RegExp, text: string, at: number): RegExpExecArray | null => { pattern.lastIndex = at; return pattern.exec(text) }

/** قيمة خاصية XML بعد فك الكيانات الخمسة والمراجع الرقمية، أو null لو فيها كيان تاني أو & مش مكتملة */
function xmlValue(value: string): string | null {
  if (!value.includes('&')) return value
  let bad = false
  const out = value.replace(/&([^;&]*);?/g, (all: string, ref: string) => {
    if (!all.endsWith(';')) { bad = true; return '' }
    if (ref === 'amp') return '&'
    if (ref === 'lt') return '<'
    if (ref === 'gt') return '>'
    if (ref === 'quot') return '"'
    if (ref === 'apos') return "'"
    const code = /^#x[0-9A-Fa-f]{1,6}$/.test(ref) ? Number.parseInt(ref.slice(2), 16) : /^#[0-9]{1,7}$/.test(ref) ? Number.parseInt(ref.slice(1), 10) : NaN
    if (!Number.isInteger(code) || code < 1 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) { bad = true; return '' }
    return String.fromCodePoint(code)
  })
  return bad ? null : out
}

/**
 * عناصر ملف XML بسيط (ملفات تعريف حزمة Office) بترتيبها وعمقها وخصائصها، أو null لو الملف مش XML سليم من النوع المتوقع.
 * التعليقات وتعليمات المعالجة بتتعدّى (محتواها مش عناصر). DOCTYPE وCDATA وترميز غير UTF-8 وخاصية مكررة ووسم مش مقفول وأكتر من جذر = null:
 * مفيش واحد منهم بيظهر في ملف تعريف حزمة سليم، وكل واحد منهم طريق إن قارئين يفهموا الملف بشكلين.
 */
function xmlElements(xml: string): XmlElement[] | null {
  const out: XmlElement[] = []
  const first = xml.charCodeAt(0) === 0xfeff ? 1 : 0
  let at = first, depth = 0, rootClosed = false
  while (at < xml.length) {
    const open = xml.indexOf('<', at)
    if (open < 0) break
    if (xml.startsWith('<!--', open)) {
      const end = xml.indexOf('-->', open + 4)
      if (end < 0) return null
      at = end + 3
      continue
    }
    if (xml.startsWith('<?', open)) {
      const end = xml.indexOf('?>', open + 2)
      if (end < 0) return null
      // تصريح XML: في أول الملف بس، والترميز لازم UTF-8 (البايتات اتقرت UTF-8؛ ترميز تاني = قارئ تاني يشوف ملف تاني)
      if (/^<\?xml[ \t\r\n?]/i.test(xml.slice(open, open + 6))) {
        const encoding = /[ \t\r\n]encoding[ \t\r\n]*=[ \t\r\n]*(?:"([^"]*)"|'([^']*)')/.exec(xml.slice(open, end))
        if (open !== first || (encoding && (encoding[1] ?? encoding[2] ?? '').toLowerCase() !== 'utf-8')) return null
      }
      at = end + 2
      continue
    }
    // DOCTYPE أو CDATA
    if (xml.startsWith('<!', open)) return null
    if (xml.startsWith('</', open)) {
      const end = xml.indexOf('>', open)
      if (end < 0 || depth === 0) return null
      depth--
      if (depth === 0) rootClosed = true
      at = end + 1
      continue
    }
    // عنصر بعد ما الجذر اتقفل = أكتر من جذر
    if (rootClosed) return null
    const name = stickyMatch(XML_NAME, xml, open + 1)?.[0]
    if (!name) return null
    let pos = open + 1 + name.length, selfClosed = false
    const attributes = new Map<string, string>()
    for (;;) {
      const space = stickyMatch(XML_SPACE, xml, pos)![0].length
      pos += space
      if (xml.startsWith('/>', pos)) { pos += 2; selfClosed = true; break }
      if (xml[pos] === '>') { pos += 1; break }
      // خاصية: مسافة قبلها، واسم، وعلامة = وقيمة بين علامتي تنصيص. الخاصية المكررة مرفوضة
      const key = space > 0 ? stickyMatch(XML_NAME, xml, pos)?.[0] : undefined
      if (!key) return null
      pos += key.length
      pos += stickyMatch(XML_SPACE, xml, pos)![0].length
      if (xml[pos] !== '=') return null
      pos += 1
      pos += stickyMatch(XML_SPACE, xml, pos)![0].length
      const quoted = stickyMatch(XML_VALUE, xml, pos)
      const value = quoted ? xmlValue(quoted[1] ?? quoted[2] ?? '') : null
      if (!quoted || value === null || attributes.has(key)) return null
      attributes.set(key, value)
      pos += quoted[0].length
    }
    const colon = name.indexOf(':')
    out.push({ prefix: colon < 0 ? '' : name.slice(0, colon), local: colon < 0 ? name : name.slice(colon + 1), depth, attributes })
    if (!selfClosed) depth++
    else if (depth === 0) rootClosed = true
    at = pos
  }
  return depth === 0 && out.length ? out : null
}

/**
 * عناصر المستوى الأول اللي في مساحة الأسماء المطلوبة، تحت جذر باسمه ومساحته — أو null لو الجذر مش هو.
 * مساحة العنصر بتتحسب من بادئته (تصريحها عليه أو على الجذر)، فالعنصر ببادئة تانية لنفس المساحة محسوب، واللي في مساحة تانية لأ.
 */
function packageChildren(xml: string, rootName: string, namespace: string): XmlElement[] | null {
  const elements = xmlElements(xml)
  const root = elements?.[0]
  if (!elements || !root || root.depth !== 0 || root.local !== rootName) return null
  const spaceOf = (element: XmlElement) => {
    const key = element.prefix ? `xmlns:${element.prefix}` : 'xmlns'
    return element.attributes.get(key) ?? root.attributes.get(key)
  }
  if (spaceOf(root) !== namespace) return null
  return elements.filter(element => element.depth === 1 && spaceOf(element) === namespace)
}

/** اسم الجزء من خاصية (PartName أو Target): من غير الشرطة الأولى وبحروف صغيرة، أو null لو مش اسم جزء عادي */
function partName(value: string | undefined): string | null {
  const name = (value ?? '').replace(/^\//, '')
  return /^[A-Za-z0-9_.\-[\] ]+(?:\/[A-Za-z0-9_.\-[\] ]+)*$/.test(name) && !name.split('/').some(segment => segment === '.' || segment === '..')
    ? name.toLowerCase() : null
}

/** نفس الاسم بعد فك الترميز بالنسبة المئوية (قارئ تاني ممكن يطابق بيه)، أو null لو الترميز مش سليم */
function decodedPartName(value: string | undefined): string | null {
  try { return decodeURIComponent((value ?? '').replace(/^\//, '')).toLowerCase() } catch { return null }
}

/** الجزء الرئيسي للحزمة من علاقة المستند في _rels/.rels: علاقة واحدة بالظبط، داخلية، باسم جزء عادي */
function ooxmlMainPart(relationships: string): string | null {
  const children = packageChildren(relationships, 'Relationships', RELATIONSHIPS_NS)
  const main = children?.filter(element => element.local === 'Relationship' && OFFICE_DOCUMENT_RELATIONSHIPS.includes(element.attributes.get('Type') ?? '')) ?? []
  if (main.length !== 1 || (main[0].attributes.get('TargetMode') ?? 'Internal') !== 'Internal') return null
  return partName(main[0].attributes.get('Target'))
}

/** نوع الجزء المعلن في [Content_Types].xml: تصريح واحد بالظبط باسم الجزء، وإلا النوع الافتراضي لامتداده. أي التباس = null */
function ooxmlPartContentType(contentTypes: string, part: string): string | null {
  const children = packageChildren(contentTypes, 'Types', CONTENT_TYPES_NS)
  if (!children) return null
  const overrides = children.filter(element => element.local === 'Override')
  const declared = overrides.filter(element => partName(element.attributes.get('PartName')) === part)
  // تصريحين لنفس الجزء، أو تصريح باسم مش عادي بيطلع نفس الجزء بعد فك ترميزه (قارئ ياخد ده وقارئ ياخد ده): الحزمة مرفوضة
  const aliases = overrides.filter(element => { const decoded = decodedPartName(element.attributes.get('PartName')); return decoded === null || decoded === part })
  if (declared.length > 1 || aliases.length !== declared.length) return null
  if (declared.length === 1) return declared[0].attributes.get('ContentType') ?? null
  const extension = /\.([A-Za-z0-9]+)$/.exec(part)?.[1]
  const defaults = children.filter(element => element.local === 'Default' && (element.attributes.get('Extension') ?? '').toLowerCase() === extension)
  return defaults.length === 1 ? defaults[0].attributes.get('ContentType') ?? null : null
}

/**
 * Word أو Excel الجديد بنفس ترتيب Office: علاقة المستند الرئيسي ← الجزء اللي بتشاور عليه موجود فعلًا في الأرشيف ومش فاضي ← نوعه
 * المعلن نوع مستند Word أو مصنف Excel. اسم مدخل مكرر في الأرشيف (قارئ ياخد الأول وقارئ ياخد الأخير) = مش ملف Office.
 */
function ooxmlType(buffer: Buffer): 'docx' | 'xlsx' | null {
  const entries = zipEntries(buffer)
  if (!entries) return null
  // أسماء أجزاء الحزمة مش حساسة لحالة الحروف
  const byName = new Map(entries.map(entry => [entry.name.toLowerCase(), entry]))
  if (byName.size !== entries.length) return null
  const read = (name: string): string | null => {
    const entry = byName.get(name)
    const bytes = entry ? zipPart(buffer, entry, PACKAGE_XML_MAX_BYTES) : null
    // UTF-16 (بعلامة ترتيب البايتات) مش ملف تعريف حزمة بنقراه
    if (!bytes || (bytes.length >= 2 && ((bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff)))) return null
    return bytes.toString('utf8')
  }
  const relationships = read('_rels/.rels'), contentTypes = read('[content_types].xml')
  if (!relationships || !contentTypes) return null
  const part = ooxmlMainPart(relationships)
  const main = part ? byName.get(part) : undefined
  // الجزء الرئيسي موجود فعلًا: مدخله في الدليل، ورأسه المحلي وبياناته جوه الملف، ومش فاضي
  if (!part || !main || main.uncompressedSize === 0 || !zipPartData(buffer, main)?.length) return null
  return OOXML_MAIN_TYPES[ooxmlPartContentType(contentTypes, part) ?? ''] ?? null
}

// ===== OLE (Compound File): Word وExcel القديم =====
interface OleEntry { name: string; kind: number; start: number; size: number }
interface OleContainer {
  sectorSize: number
  /** حد حجم التيار المصغّر بالبايت (4096 عادةً): التيار الأصغر منه بيتخزن في تيار الجذر المصغّر */
  miniCutoff: number
  rootSize: number
  /** القطاع التالي في السلسلة من جدول التوزيع، أو null لو القراءة برّه الجدول */
  next(sector: number): number | null
  /** أولاد الجذر المباشرين (تيارات ومجلدات) */
  children: OleEntry[]
}
const OLE_LAST_REGULAR = 0xfffffffa, OLE_END_OF_CHAIN = 0xfffffffe, OLE_FREE = 0xffffffff

/**
 * حاوية OLE: جدول توزيعها وأولاد جذرها المباشرين بنوعهم وحجمهم وأول قطاع، أو null لو البنية مش سليمة.
 * كل قطاع جدول التوزيع بيقول إنه مستعمل لازم يبدأ جوه الملف (الملف المقصوص مرفوض)، والدليل بيتقري كشجرة من الجذر:
 * الابن الأول ثم الأخ الشمال والأخ اليمين. رقم برّه الدليل أو حلقة = بنية مش سليمة.
 */
function oleContainer(buffer: Buffer): OleContainer | null {
  if (buffer.length < 512) return null
  const sectorShift = buffer.readUInt16LE(30)
  if (sectorShift !== 9 && sectorShift !== 12) return null
  const sectorSize = 1 << sectorShift, perSector = sectorSize / 4, maxSectors = Math.floor(buffer.length / sectorSize)
  // القطاع رقم n بيبدأ بعد الرأس (اللي واخد قطاع كامل)
  const sectorAt = (sector: number) => { const at = (sector + 1) * sectorSize; return sector < maxSectors && at + sectorSize <= buffer.length ? at : -1 }
  // قطاعات جدول التوزيع (FAT): أول 109 في الرأس، والباقي في سلسلة DIFAT
  const fatSectors: number[] = []
  for (let index = 0; index < 109; index++) { const sector = buffer.readUInt32LE(76 + index * 4); if (sector < OLE_LAST_REGULAR) fatSectors.push(sector) }
  for (let difat = buffer.readUInt32LE(68), guard = 0; difat < OLE_LAST_REGULAR; guard++) {
    const at = sectorAt(difat)
    if (at < 0 || guard > maxSectors) return null
    for (let index = 0; index < perSector - 1; index++) { const sector = buffer.readUInt32LE(at + index * 4); if (sector < OLE_LAST_REGULAR) fatSectors.push(sector) }
    difat = buffer.readUInt32LE(at + (perSector - 1) * 4)
  }
  if (fatSectors.length > maxSectors) return null
  const fatAt = fatSectors.map(sectorAt)
  if (fatAt.some(at => at < 0)) return null
  // كل قطاع الجدول بيقول إنه مستعمل (مش «فاضي») لازم يبقى موجود في الملف: الملف المقصوص مرفوض. آخر قطاع بيانات ممكن يبقى ناقص
  // شوية بايتات (برامج تصدير قديمة مابتكمّلش آخر قطاع)، فالمطلوب إن القطاع يبدأ جوه الملف؛ قطاعات البنية نفسها (الجدول والدليل) بكاملها
  for (let table = 0; table < fatAt.length; table++) {
    for (let index = 0; index < perSector; index++) {
      if (buffer.readUInt32LE(fatAt[table] + index * 4) !== OLE_FREE && (table * perSector + index + 1) * sectorSize >= buffer.length) return null
    }
  }
  const next = (sector: number) => {
    const at = sector < OLE_LAST_REGULAR ? fatAt[Math.floor(sector / perSector)] : undefined
    return at === undefined ? null : buffer.readUInt32LE(at + (sector % perSector) * 4)
  }
  // مواضع مدخلات الدليل بترتيبها (رقم المدخل = ترتيبه في سلسلة قطاعات الدليل)
  const entryAt: number[] = []
  for (let sector: number | null = buffer.readUInt32LE(48), guard = 0; sector !== OLE_END_OF_CHAIN; guard++) {
    const at = sector !== null && sector < OLE_LAST_REGULAR ? sectorAt(sector) : -1
    if (at < 0 || guard > maxSectors) return null
    for (let entry = at; entry < at + sectorSize; entry += 128) entryAt.push(entry)
    sector = next(sector!)
  }
  // المدخل رقم 0 هو الجذر
  if (!entryAt.length || buffer[entryAt[0] + 66] !== 5) return null
  // الحجم 64 بت في الإصدار 4؛ في الإصدار 3 النص الأعلى مالوش معنى
  const sizeOf = (at: number) => buffer.readUInt32LE(at + 120) + (sectorShift === 12 ? buffer.readUInt32LE(at + 124) * 0x100000000 : 0)
  const children: OleEntry[] = [], seen = new Set<number>(), pending = [buffer.readUInt32LE(entryAt[0] + 76)]
  while (pending.length) {
    const id = pending.pop()!
    if (id === OLE_FREE) continue
    // رقم برّه الدليل، أو مدخل اتزار قبل كده (حلقة)، أو الجذر نفسه
    if (id === 0 || id >= entryAt.length || seen.has(id)) return null
    seen.add(id)
    const at = entryAt[id], kind = buffer[at + 66], nameBytes = buffer.readUInt16LE(at + 64)
    if ((kind !== 1 && kind !== 2) || nameBytes < 2 || nameBytes > 64) return null
    children.push({ name: buffer.toString('utf16le', at, at + nameBytes - 2), kind, start: buffer.readUInt32LE(at + 116), size: sizeOf(at) })
    pending.push(buffer.readUInt32LE(at + 68), buffer.readUInt32LE(at + 72))
  }
  return { sectorSize, miniCutoff: buffer.readUInt32LE(56), rootSize: sizeOf(entryAt[0]), next, children }
}

/**
 * تيار في جذر الحاوية (النوع 2، مش مجلد) بالاسم ده وفيه بيانات فعلًا: التيار العادي سلسلة قطاعاته في جدول التوزيع بطول حجمه،
 * والتيار الصغير (أقل من حد التيار المصغّر) محتاج تيار الجذر المصغّر يشيله.
 */
function oleRootStream(container: OleContainer, name: string): boolean {
  return container.children.some(entry => {
    if (entry.kind !== 2 || entry.name !== name || entry.size <= 0) return false
    if (entry.size < container.miniCutoff) return container.rootSize >= entry.size
    let sector: number | null = entry.start
    for (let left = Math.ceil(entry.size / container.sectorSize); left > 0; left--) {
      // السلسلة خلصت أو خرجت برّه الجدول قبل ما تغطي الحجم
      if (sector === null || sector >= OLE_LAST_REGULAR) return false
      sector = container.next(sector)
    }
    return true
  })
}

/**
 * Word القديم فيه **تيار** WordDocument في جذر الحاوية، وExcel القديم فيه تيار Workbook (أو Book في الإصدارات الأقدم).
 * مجلد بنفس الاسم، أو تيار بالاسم ده جوه مجلد فرعي (ملف تاني متضمَّن)، مش هو. والحاويات التانية (MSI، رسالة Outlook، PowerPoint) مالهاش ولا واحد.
 */
function oleType(buffer: Buffer): 'doc' | 'xls' | null {
  const container = oleContainer(buffer)
  if (!container) return null
  const word = oleRootStream(container, 'WordDocument'), excel = oleRootStream(container, 'Workbook') || oleRootStream(container, 'Book')
  // حاوية جذرها فيه الاتنين مش ملف Word ولا Excel عادي
  return word && !excel ? 'doc' : excel && !word ? 'xls' : null
}

/**
 * النوع الحقيقي من المحتوى، أو null (مش من الأنواع المعروفة). الصور وPDF من أول البايتات؛ وملفات Office من بنية حاويتها
 * (أرشيف ZIP: علاقة المستند الرئيسي ونوع جزئه المعلن — حاوية OLE: تيارات جذرها).
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

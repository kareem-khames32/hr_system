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
// CRP2C-A-B01 (مراجعة Codex): «التيار موجود» = بايتاته بتتقري فعلًا. الحد اللي الفحص بيقف عنده في الحاويتين:
//   1. بنية الحاوية سليمة ومن غير التباس في تحديد المحتوى الرئيسي (الجزء الرئيسي للحزمة، أو تيار Word/Excel في جذر حاوية OLE).
//   2. كل بايت من المحتوى الرئيسي موجود في الملف: سلسلة قطاعات التيار (العادية، أو المصغّرة جوه تيار الجذر) من غير قطاع متكرر ولا
//      برّه الملف، وبيانات الجزء الرئيسي جوه الأرشيف.
//   3. المحتوى الرئيسي بيبدأ ببداية صيغته: رأس مستند Word، أو سجل بداية مصنف Excel، أو عنصر الجذر بتاع المستند أو المصنف.
// باقي جسم المستند مابيتفحصش (زي الصور وPDF: من أول البايتات)، فملف جسمه تالف ممكن يتقبل وهو مش هيفتح — ده ملف بايظ، مش نوع متخفي.
import { constants as zlibConstants, inflateRawSync } from 'node:zlib'

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
    const out = entry.method === 0 ? data : entry.method === 8 ? inflateRawSync(data, { maxOutputLength: maxBytes }) : null
    // الحجم بعد الفك لازم يطابق المكتوب في الدليل
    return out && out.length === entry.uncompressedSize ? out : null
  } catch { /* ضغط مش سليم، أو الناتج أكبر من الحد */ }
  return null
}

// أول الجزء الرئيسي: 8 كيلو مضغوطين كفاية لوسم الجذر بكل تصريحات مساحاته (وأقصى ناتج ليهم ~8 ميجا، فالحد مابيتعدّاش)
const MAIN_PART_HEAD_COMPRESSED = 8 * 1024, MAIN_PART_HEAD_BYTES = 64 * 1024

/** أول بايتات جزء من الأرشيف بعد فك ضغطها (من غير فك الجزء كله)، أو null لو مشفّر أو مش بيتفك أو بياناته مش في الملف */
function zipPartHead(buffer: Buffer, entry: ZipEntry): Buffer | null {
  if (entry.flags & 0x1) return null
  const data = zipPartData(buffer, entry)
  if (!data?.length) return null
  try {
    if (entry.method === 0) return data.length === entry.uncompressedSize ? data.subarray(0, MAIN_PART_HEAD_BYTES) : null
    // Z_SYNC_FLUSH: بيرجّع اللي اتفك من الجزء اللي اتبعت، من غير ما يطلب نهاية التيار
    if (entry.method === 8) {
      return inflateRawSync(data.subarray(0, MAIN_PART_HEAD_COMPRESSED), { finishFlush: zlibConstants.Z_SYNC_FLUSH, maxOutputLength: 16 * 1024 * 1024 })
        .subarray(0, MAIN_PART_HEAD_BYTES)
    }
  } catch { /* ضغط مش سليم */ }
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
// عنصر الجذر اللي الجزء الرئيسي لازم يبدأ بيه (العادي والـStrict)
const OOXML_MAIN_ROOTS: Record<'docx' | 'xlsx', { local: string; namespaces: readonly string[] }> = {
  docx: { local: 'document', namespaces: ['http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'http://purl.oclc.org/ooxml/wordprocessingml/main'] },
  xlsx: { local: 'workbook', namespaces: ['http://schemas.openxmlformats.org/spreadsheetml/2006/main', 'http://purl.oclc.org/ooxml/spreadsheetml/main'] },
}

interface XmlElement { prefix: string; local: string; namespace: string | null; depth: number; attributes: Map<string, string> }
interface XmlStartTag { name: string; attributes: Map<string, string>; selfClosed: boolean; end: number }
const XML_NAME = /[A-Za-z_][\w.-]*(?::[A-Za-z_][\w.-]*)?/y
const XML_SPACE = /[ \t\r\n]*/y
const XML_VALUE = /"([^"<]*)"|'([^'<]*)'/y
// تصريح XML كامل: الإصدار 1.0، وترميز اختياري، وstandalone اختياري — بالترتيب ده
const XML_DECLARATION = /<\?xml[ \t\r\n]+version[ \t\r\n]*=[ \t\r\n]*(?:"1\.0"|'1\.0')(?:[ \t\r\n]+encoding[ \t\r\n]*=[ \t\r\n]*(?:"([A-Za-z][A-Za-z0-9._-]*)"|'([A-Za-z][A-Za-z0-9._-]*)'))?(?:[ \t\r\n]+standalone[ \t\r\n]*=[ \t\r\n]*(?:"(?:yes|no)"|'(?:yes|no)'))?[ \t\r\n]*\?>/y
// حروف مش مسموحة في XML 1.0
const XML_FORBIDDEN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/
const XML_NAMESPACE = 'http://www.w3.org/XML/1998/namespace'
const XML_NO_SCOPE: ReadonlyMap<string, string> = new Map()
const stickyMatch = (pattern: RegExp, text: string, at: number): RegExpExecArray | null => { pattern.lastIndex = at; return pattern.exec(text) }

/** نص XML من بايتاته: UTF-8 سليم بالحرف (من غير تبديل بايت غلط بحرف بديل) ومن غير حروف تحكم، أو null. partial = أول الملف بس (آخره ممكن يبقى نص حرف) */
function xmlText(bytes: Buffer, partial = false): string | null {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes, { stream: partial })
    return XML_FORBIDDEN.test(text) ? null : text
  } catch { return null }
}

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

/** موضع أول حاجة بعد تصريح XML لو موجود: في أول الملف بالظبط، بإصدار 1.0 وترميز UTF-8 (البايتات اتقرت UTF-8). -1 = تصريح مش سليم */
function xmlAfterDeclaration(xml: string): number {
  if (!/^<\?xml[ \t\r\n?]/i.test(xml.slice(0, 6))) return 0
  const declaration = stickyMatch(XML_DECLARATION, xml, 0)
  const encoding = declaration?.[1] ?? declaration?.[2]
  return !declaration || (encoding && encoding.toLowerCase() !== 'utf-8') ? -1 : declaration[0].length
}

/** موضع أول حاجة بعد المسافات والتعليقات وتعليمات المعالجة (محتواهم مش عناصر). -1 = تعليق أو تعليمة مش سليمة */
function xmlSkipMisc(xml: string, from: number): number {
  let at = from
  for (;;) {
    at += stickyMatch(XML_SPACE, xml, at)![0].length
    if (xml.startsWith('<!--', at)) {
      // «--» جوه التعليق مش مسموحة: أول «--» لازم تبقى نهايته
      const end = xml.indexOf('--', at + 4)
      if (end < 0 || xml[end + 2] !== '>') return -1
      at = end + 3
    } else if (xml.startsWith('<?', at)) {
      const target = stickyMatch(XML_NAME, xml, at + 2)?.[0], end = xml.indexOf('?>', at + 2)
      // اسم التعليمة مطلوب، و«xml» محجوز لتصريح أول الملف (تصريح تاني أو في غير مكانه مرفوض)
      if (!target || target.includes(':') || target.toLowerCase() === 'xml' || end < 0) return -1
      const after = xml[at + 2 + target.length]
      if (after !== '?' && after !== ' ' && after !== '\t' && after !== '\r' && after !== '\n') return -1
      at = end + 2
    } else return at
  }
}

/** وسم بداية عنصر من أول «<»: اسمه وخصائصه (اسم، علامة =، قيمة بين علامتي تنصيص، ومن غير تكرار)، أو null لو مش سليم أو مش مكتمل */
function xmlStartTag(xml: string, open: number): XmlStartTag | null {
  const name = stickyMatch(XML_NAME, xml, open + 1)?.[0]
  if (!name) return null
  let pos = open + 1 + name.length
  const attributes = new Map<string, string>()
  for (;;) {
    const space = stickyMatch(XML_SPACE, xml, pos)![0].length
    pos += space
    if (xml.startsWith('/>', pos)) return { name, attributes, selfClosed: true, end: pos + 2 }
    if (xml[pos] === '>') return { name, attributes, selfClosed: false, end: pos + 1 }
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
}

/**
 * مساحات الأسماء السارية على العنصر (اللي ورثها + تصريحاته) ومساحة العنصر نفسه. null = بادئة مش متصرّح بيها (للعنصر أو لخاصية)،
 * أو تصريح بادئة من غير مساحة، أو نفس الخاصية مرتين ببادئتين لنفس المساحة.
 */
function xmlNamespaces(tag: XmlStartTag, inherited: ReadonlyMap<string, string>): { scope: Map<string, string>; namespace: string | null } | null {
  const scope = new Map(inherited)
  for (const [key, value] of tag.attributes) {
    if (key === 'xmlns') scope.set('', value)
    else if (key.startsWith('xmlns:')) {
      const prefix = key.slice(6)
      if (!value || prefix === 'xmlns' || prefix === 'xml') return null
      scope.set(prefix, value)
    }
  }
  const expanded = new Set<string>()
  for (const key of tag.attributes.keys()) {
    const colon = key.indexOf(':')
    if (colon < 0 || key.startsWith('xmlns:')) continue
    const prefix = key.slice(0, colon), space = prefix === 'xml' ? XML_NAMESPACE : scope.get(prefix)
    const name = `${space}|${key.slice(colon + 1)}`
    if (!space || expanded.has(name)) return null
    expanded.add(name)
  }
  const colon = tag.name.indexOf(':')
  if (colon < 0) return { scope, namespace: scope.get('') || null }
  const namespace = scope.get(tag.name.slice(0, colon))
  return namespace ? { scope, namespace } : null
}

const xmlLocalName = (name: string) => name.slice(name.indexOf(':') + 1)

/**
 * عناصر ملف XML بسيط (ملفات تعريف حزمة Office) بترتيبها وعمقها ومساحتها وخصائصها، أو null لو الملف مش XML سليم من النوع المتوقع.
 * التعليقات وتعليمات المعالجة بتتعدّى (محتواها مش عناصر). DOCTYPE وCDATA وترميز غير UTF-8 وخاصية مكررة ووسم مش مقفول وأكتر من جذر = null:
 * مفيش واحد منهم بيظهر في ملف تعريف حزمة سليم، وكل واحد منهم طريق إن قارئين يفهموا الملف بشكلين.
 * CRP2C-A-N01 (مراجعة Codex): وسم الإقفال لازم يطابق اسم العنصر المفتوح، وأي نص برّه الوسوم (قبل الجذر أو جواه أو بعده) = null،
 * والبادئة لازم تبقى متصرّح بيها — زي أي قارئ XML فعلي.
 */
function xmlElements(xml: string): XmlElement[] | null {
  const out: XmlElement[] = []
  const stack: Array<{ name: string; scope: ReadonlyMap<string, string> }> = []
  let at = xmlAfterDeclaration(xml), rootClosed = false
  if (at < 0) return null
  for (;;) {
    at = xmlSkipMisc(xml, at)
    if (at < 0) return null
    if (at >= xml.length) break
    // نص برّه الوسوم، أو DOCTYPE أو CDATA
    if (xml[at] !== '<' || xml[at + 1] === '!') return null
    if (xml[at + 1] === '/') {
      const name = stickyMatch(XML_NAME, xml, at + 2)?.[0], top = stack.pop()
      if (!name || !top || top.name !== name) return null
      at += 2 + name.length
      at += stickyMatch(XML_SPACE, xml, at)![0].length
      if (xml[at] !== '>') return null
      at += 1
      if (!stack.length) rootClosed = true
      continue
    }
    // عنصر بعد ما الجذر اتقفل = أكتر من جذر
    if (rootClosed) return null
    const tag = xmlStartTag(xml, at)
    const resolved = tag ? xmlNamespaces(tag, stack.length ? stack[stack.length - 1].scope : XML_NO_SCOPE) : null
    if (!tag || !resolved) return null
    const colon = tag.name.indexOf(':')
    out.push({ prefix: colon < 0 ? '' : tag.name.slice(0, colon), local: xmlLocalName(tag.name), namespace: resolved.namespace, depth: stack.length, attributes: tag.attributes })
    if (!tag.selfClosed) stack.push({ name: tag.name, scope: resolved.scope })
    else if (!stack.length) rootClosed = true
    at = tag.end
  }
  return rootClosed && !stack.length ? out : null
}

/** عنصر الجذر من أول المستند (النص ممكن يبقى مقطوع بعد وسم الجذر): اسمه المحلي ومساحته، أو null */
function xmlRoot(head: string): { local: string; namespace: string | null } | null {
  let at = xmlAfterDeclaration(head)
  if (at < 0) return null
  at = xmlSkipMisc(head, at)
  if (at < 0 || head[at] !== '<' || head[at + 1] === '!' || head[at + 1] === '/') return null
  const tag = xmlStartTag(head, at)
  const resolved = tag ? xmlNamespaces(tag, XML_NO_SCOPE) : null
  return tag && resolved ? { local: xmlLocalName(tag.name), namespace: resolved.namespace } : null
}

/** عناصر المستوى الأول اللي في مساحة الأسماء المطلوبة، تحت جذر باسمه ومساحته — أو null لو الجذر مش هو */
function packageChildren(xml: string, rootName: string, namespace: string): XmlElement[] | null {
  const elements = xmlElements(xml)
  const root = elements?.[0]
  if (!elements || !root || root.local !== rootName || root.namespace !== namespace) return null
  return elements.filter(element => element.depth === 1 && element.namespace === namespace)
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
 * المعلن نوع مستند Word أو مصنف Excel ← الجزء نفسه بيبدأ بعنصر الجذر بتاع النوع ده.
 * اسم مدخل مكرر في الأرشيف (قارئ ياخد الأول وقارئ ياخد الأخير) = مش ملف Office.
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
    // UTF-8 سليم بس: UTF-16 أو بايتات مش UTF-8 مش ملف تعريف حزمة بنقراه
    return bytes ? xmlText(bytes) : null
  }
  const relationships = read('_rels/.rels'), contentTypes = read('[content_types].xml')
  if (!relationships || !contentTypes) return null
  const part = ooxmlMainPart(relationships)
  const main = part ? byName.get(part) : undefined
  // الجزء الرئيسي موجود فعلًا: مدخله في الدليل، ورأسه المحلي وبياناته جوه الملف، ومش فاضي
  if (!part || !main || main.uncompressedSize === 0 || !zipPartData(buffer, main)?.length) return null
  const type = OOXML_MAIN_TYPES[ooxmlPartContentType(contentTypes, part) ?? '']
  if (!type) return null
  // بداية الجزء الرئيسي بتتفك وبتتقري: عنصر الجذر بتاع النوع المعلن (مستند Word أو مصنف Excel) في مساحته
  const head = zipPartHead(buffer, main), text = head ? xmlText(head, true) : null, root = text ? xmlRoot(text) : null
  const expected = OOXML_MAIN_ROOTS[type]
  return root && root.local === expected.local && expected.namespaces.includes(root.namespace ?? '') ? type : null
}

// ===== OLE (Compound File): Word وExcel القديم =====
interface OleEntry { name: string; kind: number; start: number; size: number }
interface OleContainer {
  /** أولاد الجذر المباشرين (تيارات ومجلدات) */
  children: OleEntry[]
  /**
   * أول بايتات التيار — بعد التأكد إن كل بايت من حجمه المعلن موجود في الملف عن طريق سلسلة قطاعاته (العادية، أو المصغّرة جوه تيار الجذر).
   * null = التيار مش بيتقري: سلسلة ناقصة أو فيها قطاع متكرر أو برّه الملف، أو جدول القطاعات المصغّرة أو تيار الجذر مش موجودين.
   */
  streamHead(entry: OleEntry, bytes: number): Buffer | null
}
const OLE_LAST_REGULAR = 0xfffffffa, OLE_END_OF_CHAIN = 0xfffffffe, OLE_FREE = 0xffffffff
const OLE_MINI_SECTOR = 64, OLE_MINI_CUTOFF = 4096

/**
 * حاوية OLE: جدول توزيعها وأولاد جذرها المباشرين بنوعهم وحجمهم وأول قطاع، أو null لو البنية مش سليمة.
 * كل قطاع جدول التوزيع بيقول إنه مستعمل لازم يبدأ جوه الملف (الملف المقصوص مرفوض)، والدليل بيتقري كشجرة من الجذر:
 * الابن الأول ثم الأخ الشمال والأخ اليمين. رقم برّه الدليل أو حلقة = بنية مش سليمة.
 * CRP2C-A-B01: الرأس لازم يبقى بالقيم اللي القراءة مبنية عليها (ترتيب البايتات، والإصدار مع حجم القطاع، وحجم القطاع المصغّر 64،
 * وحد التيار المصغّر 4096)، وقطاعات الجدول والدليل من غير تكرار.
 */
function oleContainer(buffer: Buffer): OleContainer | null {
  if (buffer.length < 512) return null
  const major = buffer.readUInt16LE(26), sectorShift = buffer.readUInt16LE(30)
  if (buffer.readUInt16LE(28) !== 0xfffe || !((major === 3 && sectorShift === 9) || (major === 4 && sectorShift === 12))) return null
  if (buffer.readUInt16LE(32) !== 6 || buffer.readUInt32LE(56) !== OLE_MINI_CUTOFF) return null
  const sectorSize = 1 << sectorShift, perSector = sectorSize / 4, maxSectors = Math.floor(buffer.length / sectorSize)
  // القطاع رقم n بيبدأ بعد الرأس (اللي واخد قطاع كامل). need = البايتات المطلوبة منه (قطاع البنية كله؛ قطاع البيانات اللي التيار محتاجه منه)
  const sectorAt = (sector: number, need = sectorSize) => { const at = (sector + 1) * sectorSize; return sector < OLE_LAST_REGULAR && at + need <= buffer.length ? at : -1 }
  // قطاعات جدول التوزيع (FAT): أول 109 في الرأس، والباقي في سلسلة DIFAT
  const fatSectors: number[] = []
  for (let index = 0; index < 109; index++) { const sector = buffer.readUInt32LE(76 + index * 4); if (sector < OLE_LAST_REGULAR) fatSectors.push(sector) }
  const difatSeen = new Set<number>()
  for (let difat = buffer.readUInt32LE(68); difat < OLE_LAST_REGULAR;) {
    const at = sectorAt(difat)
    if (at < 0 || difatSeen.has(difat)) return null
    difatSeen.add(difat)
    for (let index = 0; index < perSector - 1; index++) { const sector = buffer.readUInt32LE(at + index * 4); if (sector < OLE_LAST_REGULAR) fatSectors.push(sector) }
    difat = buffer.readUInt32LE(at + (perSector - 1) * 4)
  }
  if (fatSectors.length > maxSectors || new Set(fatSectors).size !== fatSectors.length) return null
  const fatAt = fatSectors.map(sector => sectorAt(sector))
  if (fatAt.some(at => at < 0)) return null
  // كل قطاع الجدول بيقول إنه مستعمل (مش «فاضي») لازم يبقى موجود في الملف: الملف المقصوص مرفوض. آخر قطاع بيانات ممكن يبقى ناقص
  // شوية بايتات (برامج تصدير قديمة مابتكمّلش آخر قطاع)، فالمطلوب إن القطاع يبدأ جوه الملف؛ قطاعات البنية نفسها (الجدول والدليل) بكاملها،
  // وبايتات التيار الرئيسي نفسها بتتفحص في streamHead
  for (let table = 0; table < fatAt.length; table++) {
    for (let index = 0; index < perSector; index++) {
      if (buffer.readUInt32LE(fatAt[table] + index * 4) !== OLE_FREE && (table * perSector + index + 1) * sectorSize >= buffer.length) return null
    }
  }
  const next = (sector: number) => {
    const at = sector < OLE_LAST_REGULAR ? fatAt[Math.floor(sector / perSector)] : undefined
    return at === undefined ? null : buffer.readUInt32LE(at + (sector % perSector) * 4)
  }
  /**
   * سلسلة قطاعات من جدول التوزيع: count قطاع من start (أو لحد نهاية السلسلة لو count = null). كل قطاع رقم عادي، بيبدأ جوه الملف،
   * ومابيتكررش (الحلقة مش سلسلة)، وقطاعات البنية (structure) بكاملها جوه الملف. null = السلسلة مش سليمة أو أقصر من المطلوب.
   */
  const chainOf = (start: number, count: number | null, structure: boolean): number[] | null => {
    const chain: number[] = [], seen = new Set<number>()
    let sector: number | null = start
    while (count === null ? sector !== OLE_END_OF_CHAIN : chain.length < count) {
      if (sector === null || sector >= OLE_LAST_REGULAR || seen.has(sector) || sectorAt(sector, structure ? sectorSize : 1) < 0) return null
      seen.add(sector); chain.push(sector)
      sector = next(sector)
    }
    return chain
  }
  // مواضع مدخلات الدليل بترتيبها (رقم المدخل = ترتيبه في سلسلة قطاعات الدليل)
  const directory = chainOf(buffer.readUInt32LE(48), null, true)
  if (!directory?.length) return null
  const entryAt: number[] = []
  for (const sector of directory) { const at = sectorAt(sector); for (let entry = at; entry < at + sectorSize; entry += 128) entryAt.push(entry) }
  // المدخل رقم 0 هو الجذر
  if (buffer[entryAt[0] + 66] !== 5) return null
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

  // التيار المصغّر: بياناته في تيار الجذر (سلسلة قطاعات عادية من مدخل الجذر)، وسلسلته في جدول القطاعات المصغّرة (MiniFAT) —
  // الاتنين بيتقروا مرة واحدة، ولو واحد منهم مش سليم مفيش ولا تيار مصغّر بيتقري
  let mini: { root: number[]; rootSize: number; table: number[]; entries: number } | null | undefined
  const miniStream = () => {
    if (mini !== undefined) return mini
    const rootSize = sizeOf(entryAt[0])
    const root = rootSize > 0 && rootSize <= buffer.length ? chainOf(buffer.readUInt32LE(entryAt[0] + 116), Math.ceil(rootSize / sectorSize), false) : null
    const table = root ? chainOf(buffer.readUInt32LE(60), null, true) : null
    // عدد قطاعات الجدول في الرأس والسلسلة الفعلية: القراءة بالأقل (قارئ بياخد العدد وقارئ بيمشي السلسلة — الاتنين لازم يشوفوا المدخل)
    mini = root && table?.length ? { root, rootSize, table, entries: Math.min(table.length, buffer.readUInt32LE(64)) * perSector } : null
    return mini
  }
  const streamHead = (entry: OleEntry, bytes: number): Buffer | null => {
    if (entry.kind !== 2 || entry.size <= 0 || entry.size > buffer.length) return null
    if (entry.size >= OLE_MINI_CUTOFF) {
      const chain = chainOf(entry.start, Math.ceil(entry.size / sectorSize), false)
      if (!chain) return null
      // كل بايت من التيار موجود: القطاع الأخير محتاج منه اللي التيار واصل له بس (حشو آخر قطاع ممكن يبقى ناقص)
      for (let index = 0; index < chain.length; index++) if (sectorAt(chain[index], Math.min(sectorSize, entry.size - index * sectorSize)) < 0) return null
      const at = sectorAt(chain[0], 1)
      return buffer.subarray(at, at + Math.min(bytes, entry.size, sectorSize))
    }
    const container = miniStream()
    if (!container) return null
    // موضع القطاع المصغّر رقم n في الملف، لو البايتات المطلوبة منه جوه تيار الجذر وجوه الملف
    const miniAt = (sector: number, need: number) => {
      const offset = sector * OLE_MINI_SECTOR, host = container.root[Math.floor(offset / sectorSize)]
      if (offset + need > container.rootSize || host === undefined) return -1
      const at = sectorAt(host, (offset % sectorSize) + need)
      return at < 0 ? -1 : at + (offset % sectorSize)
    }
    const count = Math.ceil(entry.size / OLE_MINI_SECTOR), visited = new Set<number>()
    let sector = entry.start, first = -1
    for (let index = 0; index < count; index++) {
      // رقم برّه جدول القطاعات المصغّرة، أو قطاع متكرر، أو بياناته مش موجودة
      if (sector >= container.entries || visited.has(sector)) return null
      const at = miniAt(sector, Math.min(OLE_MINI_SECTOR, entry.size - index * OLE_MINI_SECTOR))
      if (at < 0) return null
      if (index === 0) first = at
      visited.add(sector)
      sector = buffer.readUInt32LE(sectorAt(container.table[Math.floor(sector / perSector)]) + (sector % perSector) * 4)
    }
    return buffer.subarray(first, first + Math.min(bytes, entry.size, OLE_MINI_SECTOR))
  }
  return { children, streamHead }
}

/**
 * أول بايتات تيار في جذر الحاوية بالاسم ده، لو هو تيار (النوع 2، مش مجلد) وبياناته كلها بتتقري. اسم مكرر في الجذر بأي حالة حروف
 * (تيار ومجلد، أو تيارين: قارئ ياخد ده وقارئ ياخد ده) = مش موجود.
 */
function oleRootStream(container: OleContainer, name: string): Buffer | null {
  const same = container.children.filter(entry => entry.name.toLowerCase() === name.toLowerCase())
  return same.length === 1 && same[0].name === name ? container.streamHead(same[0], 8) : null
}

/**
 * Word القديم فيه **تيار** WordDocument في جذر الحاوية بيبدأ برأس مستند Word (0xA5EC، أو 0xA5DC لـWord 6 و95)، وExcel القديم فيه تيار
 * Workbook (أو Book في الإصدارات الأقدم) بيبدأ بسجل بداية المصنف (BOF = 0x0809).
 * مجلد بنفس الاسم، أو تيار بالاسم ده جوه مجلد فرعي (ملف تاني متضمَّن)، أو تيار بالاسم ده بياناته مش موجودة أو مش بداية الصيغة، مش هو.
 * والحاويات التانية (MSI، رسالة Outlook، PowerPoint) مالهاش ولا واحد.
 */
function oleType(buffer: Buffer): 'doc' | 'xls' | null {
  const container = oleContainer(buffer)
  if (!container) return null
  const starts = (name: string, magics: readonly number[]) => {
    const head = oleRootStream(container, name)
    return !!head && head.length >= 2 && magics.includes(head.readUInt16LE(0))
  }
  const present = (name: string) => container.children.some(entry => entry.name.toLowerCase() === name.toLowerCase())
  // Excel بيفتح Workbook لو موجود (الملف المحفوظ بالصيغتين فيه الاتنين)، وBook للإصدارات الأقدم بس
  const word = starts('WordDocument', [0xa5ec, 0xa5dc]), excel = starts(present('Workbook') ? 'Workbook' : 'Book', [0x0809])
  // حاوية جذرها فيه الاتنين (حتى لو واحد منهم مش سليم) مش ملف Word ولا Excel عادي
  if (word) return present('Workbook') || present('Book') ? null : 'doc'
  return excel && !present('WordDocument') ? 'xls' : null
}

/**
 * النوع الحقيقي من المحتوى، أو null (مش من الأنواع المعروفة). الصور وPDF من أول البايتات؛ وملفات Office من بنية حاويتها
 * (أرشيف ZIP: علاقة المستند الرئيسي ونوع جزئه المعلن وعنصر جذره — حاوية OLE: تيار جذرها المقروء فعلًا وبدايته).
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

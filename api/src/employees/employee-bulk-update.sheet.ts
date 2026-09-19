// قراءة وكتابة ملف التحديث الجماعي على الخادم: CSV بلا أي مكتبة، وExcel (.xlsx) بمكتبة exceljs
// اللي بتتحمل وقت الحاجة بس — لو مش متسطبة، CSV يفضل شغال.
import { BadRequestException } from '@nestjs/common'
import { inflateRawSync } from 'zlib'
import type { Workbook, CellValue } from 'exceljs'
import { BULK_UPDATE_MAX_FILE_BYTES, BULK_UPDATE_MAX_ROWS, parseCsv, type BulkCell } from './employee-bulk-update.fields'
import type { BulkSheet } from './employee-bulk-update.plan'

export type BulkFileFormat = 'xlsx' | 'csv'
export const BULK_CONTENT_TYPES: Record<BulkFileFormat, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv; charset=utf-8',
}
const DATA_SHEET = 'البيانات'
// حد ما بعد فك الضغط: ملف 2000 صف حقيقي أقل من كده بكتير — القنبلة المضغوطة بتترفض قبل ما تتقري
const MAX_UNZIPPED_BYTES = 60 * 1024 * 1024
const bad = (message: string): never => { throw new BadRequestException({ code: 'BULK_UPDATE_FILE_INVALID', message }) }

function loadExcel(): typeof import('exceljs') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('exceljs')
  } catch {
    return bad('قراءة ملفات Excel مش متاحة على الخادم دلوقتي — احفظ الملف CSV (UTF-8) وارفعه')
  }
}

/** صيغة الملف من امتداده ومحتواه: xlsx = ملف zip، xls القديم مرفوض برسالة واضحة. */
export function bulkFileFormat(fileName: string, buffer: Buffer): BulkFileFormat {
  const name = String(fileName ?? '').toLowerCase()
  const zip = buffer.length >= 4 && buffer.readUInt32LE(0) === 0x04034b50
  if (name.endsWith('.xls') || (buffer.length >= 8 && buffer.readUInt32LE(0) === 0xe011cfd0)) {
    return bad('صيغة Excel القديمة (.xls) مش مدعومة — احفظ الملف «Excel Workbook (.xlsx)» أو CSV')
  }
  if (name.endsWith('.xlsx') || zip) {
    if (!zip) bad('ملف Excel ده تالف أو مش .xlsx حقيقي')
    return 'xlsx'
  }
  if (name.endsWith('.csv') || name.endsWith('.txt') || !name.includes('.')) return 'csv'
  return bad('ارفع ملف Excel (.xlsx) أو CSV')
}

/** يفك كل ملفات الـzip بحد أقصى للحجم قبل exceljs (اللي بيفك كله في الذاكرة من غير حد). */
function assertSafeZip(buffer: Buffer) {
  const floor = Math.max(0, buffer.length - 65557)
  let end = -1
  for (let i = buffer.length - 22; i >= floor; i--) if (buffer.readUInt32LE(i) === 0x06054b50) { end = i; break }
  if (end < 0) bad('ملف Excel ده تالف — افتحه واحفظه تاني .xlsx')
  const count = buffer.readUInt16LE(end + 10)
  let position = buffer.readUInt32LE(end + 16)
  if (count > 5000) bad('ملف Excel ده فيه أجزاء كتير بشكل غير طبيعي')
  let budget = MAX_UNZIPPED_BYTES
  for (let entry = 0; entry < count; entry++) {
    if (position + 46 > buffer.length || buffer.readUInt32LE(position) !== 0x02014b50) bad('ملف Excel ده تالف — افتحه واحفظه تاني .xlsx')
    const method = buffer.readUInt16LE(position + 10)
    const compressed = buffer.readUInt32LE(position + 20)
    const local = buffer.readUInt32LE(position + 42)
    position += 46 + buffer.readUInt16LE(position + 28) + buffer.readUInt16LE(position + 30) + buffer.readUInt16LE(position + 32)
    if (local + 30 > buffer.length || buffer.readUInt32LE(local) !== 0x04034b50) bad('ملف Excel ده تالف — افتحه واحفظه تاني .xlsx')
    const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28)
    if (start + compressed > buffer.length) bad('ملف Excel ده تالف — افتحه واحفظه تاني .xlsx')
    let size = compressed
    if (method === 8) {
      try { size = inflateRawSync(buffer.subarray(start, start + compressed), { maxOutputLength: Math.max(1, budget) }).length }
      catch { bad('ملف Excel ده كبير جدًا بعد فك الضغط أو تالف') }
    } else if (method !== 0) bad('ملف Excel ده مضغوط بطريقة مش مدعومة — احفظه تاني من Excel')
    budget -= size
    if (budget < 0) bad('ملف Excel ده كبير جدًا بعد فك الضغط')
  }
}

function cellOf(value: CellValue | undefined): BulkCell {
  if (value === null || value === undefined) return null
  if (value instanceof Date || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'object') {
    if ('richText' in value && Array.isArray(value.richText)) return value.richText.map(part => part.text).join('')
    if ('result' in value) return cellOf(value.result as CellValue)
    if ('formula' in value || 'sharedFormula' in value) return null
    if ('text' in value) return String((value as { text: unknown }).text ?? '')
    if ('error' in value) return String((value as { error: unknown }).error ?? '')
  }
  return String(value)
}

/** الصف الأول عناوين؛ رقم الصف = رقمه في الملف (الصف 2 أول بيانات) عشان المستخدم يلاقيه. */
export async function readBulkFile(buffer: Buffer, fileName: string): Promise<BulkSheet & { format: BulkFileFormat }> {
  if (!buffer?.length) bad('الملف فاضي')
  if (buffer.length > BULK_UPDATE_MAX_FILE_BYTES) bad('حجم الملف أكبر من 5 ميجا — قسّمه على أكتر من ملف')
  const format = bulkFileFormat(fileName, buffer)
  if (format === 'csv') {
    const text = buffer.toString('utf8')
    if (text.includes('�')) bad('الملف مش محفوظ UTF-8 — من Excel اختار «CSV UTF-8» أو ارفع الملف .xlsx')
    const rows = parseCsv(text)
    if (rows.length > BULK_UPDATE_MAX_ROWS * 3) bad(`الملف فيه صفوف أكتر من الحد (${BULK_UPDATE_MAX_ROWS} صف)`)
    return { format, header: rows[0] ?? [], rows: rows.slice(1).map((cells, index) => ({ row: index + 2, cells })) }
  }
  assertSafeZip(buffer)
  const ExcelJS = loadExcel()
  const workbook: Workbook = new ExcelJS.Workbook()
  try { await workbook.xlsx.load(buffer as unknown as Parameters<Workbook['xlsx']['load']>[0]) } catch { bad('تعذر قراءة ملف Excel — افتحه واحفظه تاني .xlsx') }
  const sheet = workbook.getWorksheet(DATA_SHEET) ?? workbook.worksheets[0]
  if (!sheet) bad('ملف Excel ده مفيهوش ورقة بيانات')
  const width = Math.min(sheet!.columnCount, 200)
  const cellsOf = (rowNumber: number) => {
    const row = sheet!.getRow(rowNumber)
    return Array.from({ length: width }, (_, index) => cellOf(row.getCell(index + 1).value))
  }
  // الصفوف اللي فيها قيم بس (صفوف التنسيق الفاضية مش بتتعد)؛ الخطة بتعد الصفوف غير الفاضية على الحد
  const rows: BulkSheet['rows'] = []
  let tooMany = false
  sheet!.eachRow({ includeEmpty: false }, (_row, rowNumber) => {
    if (rowNumber === 1 || tooMany) return
    if (rows.length >= BULK_UPDATE_MAX_ROWS * 3) { tooMany = true; return }
    rows.push({ row: rowNumber, cells: cellsOf(rowNumber) })
  })
  if (tooMany) bad(`الملف فيه صفوف أكتر من الحد (${BULK_UPDATE_MAX_ROWS} صف)`)
  return { format, header: cellsOf(1), rows }
}

export interface BulkWorkbookColumn { header: string; width: number; text: boolean; money?: boolean; list?: string[]; note?: string }
export interface BulkReferenceTable { title: string; headers: string[]; rows: string[][] }

/** قالب Excel: ورقة بيانات من اليمين للشمال بعناوين ثابتة، أعمدة الأرقام النصية «نص»، اختيارات جاهزة، وورقة قوائم وتعليمات. */
export async function writeBulkWorkbook(input: {
  columns: BulkWorkbookColumn[]
  rows: Array<Array<string | number | null>>
  references: BulkReferenceTable[]
  instructions: string[]
}): Promise<Buffer> {
  const ExcelJS = loadExcel()
  const workbook: Workbook = new ExcelJS.Workbook()
  workbook.creator = 'HR System'
  const sheet = workbook.addWorksheet(DATA_SHEET, { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] })
  sheet.columns = input.columns.map(column => ({ header: column.header, width: column.width,
    style: column.text ? { numFmt: '@' } : column.money ? { numFmt: '0.00' } : {} }))
  const header = sheet.getRow(1)
  header.font = { bold: true }
  header.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
  header.height = 30
  input.columns.forEach((column, index) => {
    const cell = header.getCell(index + 1)
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: index < 2 ? 'FFE5E7EB' : 'FFDBEAFE' } }
    if (column.note) cell.note = column.note
  })
  for (const values of input.rows) sheet.addRow(values)
  const lastRow = Math.min(BULK_UPDATE_MAX_ROWS + 1, Math.max(input.rows.length + 300, 500))
  input.columns.forEach((column, index) => {
    if (!column.list?.length) return
    for (let row = 2; row <= lastRow; row++) {
      sheet.getRow(row).getCell(index + 1).dataValidation = { type: 'list', allowBlank: true, formulae: [`"${column.list.join(',')}"`],
        showErrorMessage: false }
    }
  })

  const lists = workbook.addWorksheet('القوائم', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 2 }] })
  let offset = 1
  for (const table of input.references) {
    lists.getRow(1).getCell(offset).value = table.title
    lists.getRow(1).getCell(offset).font = { bold: true, size: 12 }
    table.headers.forEach((title, index) => {
      const cell = lists.getRow(2).getCell(offset + index)
      cell.value = title
      cell.font = { bold: true }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
      lists.getColumn(offset + index).width = 26
    })
    table.rows.forEach((values, rowIndex) => values.forEach((value, index) => { lists.getRow(rowIndex + 3).getCell(offset + index).value = value }))
    offset += table.headers.length + 1
  }

  const help = workbook.addWorksheet('تعليمات', { views: [{ rightToLeft: true }] })
  help.getColumn(1).width = 110
  input.instructions.forEach((line, index) => {
    const cell = help.getRow(index + 1).getCell(1)
    cell.value = line
    cell.alignment = { wrapText: true, vertical: 'top' }
    if (index === 0) cell.font = { bold: true, size: 13 }
  })
  return Buffer.from(await workbook.xlsx.writeBuffer())
}

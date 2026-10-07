import type { Workbook } from 'exceljs'
import { PAYROLL_RUN_STATUS_LABELS } from '../payroll/payroll-run-approval'
import { PRODUCT_NAME } from '../settings/product-name'
import type { MetricValue, WorkforceCounts } from './metrics.service'

// B2.13: تصدير تقارير صفحة التقارير من الخادم (Excel وPDF). الجدول بيتبني من رد دالة التقرير نفسها — نفس الصلاحية والنطاق
// والموديول — بنفس أعمدة تصدير الشاشة. ملف صرف: من غير Nest ولا قاعدة.

export const REPORT_KEYS = ['headcount', 'attendance', 'leaves', 'payroll', 'overtime', 'requests', 'metrics'] as const
export type ReportKey = typeof REPORT_KEYS[number]
export const isReportKey = (value: unknown): value is ReportKey => REPORT_KEYS.includes(value as ReportKey)

export const REPORT_EXPORT_FORMATS = ['xlsx', 'pdf'] as const
export type ReportExportFormat = typeof REPORT_EXPORT_FORMATS[number]
export const isReportExportFormat = (value: unknown): value is ReportExportFormat => REPORT_EXPORT_FORMATS.includes(value as ReportExportFormat)

export const REPORT_TITLES: Record<ReportKey, string> = {
  headcount: 'تقرير القوى العاملة', attendance: 'تقرير الحضور والانصراف', leaves: 'تقرير الإجازات', payroll: 'تقرير الرواتب',
  overtime: 'تقرير العمل الإضافي', requests: 'تقرير الطلبات', metrics: 'المؤشرات',
}
/** موديولات كل تقرير — نفس @RequireModule على مساره في ReportsController */
export const REPORT_MODULES: Record<ReportKey, readonly string[]> = {
  headcount: [], attendance: ['attendance'], leaves: ['leave'], payroll: ['payroll'], overtime: ['overtime'], requests: [], metrics: [],
}
export const REPORT_CONTENT_TYPES: Record<ReportExportFormat, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pdf: 'application/pdf',
}
// PDF بيترسم في متصفح على الخادم: حد للصفوف عشان الطلب مايعلّقش الخادم. Excel حده أعلى.
export const REPORT_PDF_MAX_ROWS = 2000
export const REPORT_XLSX_MAX_ROWS = 50000
export const REPORT_PDF_TOO_LARGE = `التقرير أكبر من حد PDF (${REPORT_PDF_MAX_ROWS} صف)؛ صدّره Excel أو ضيّق الفلتر`
export const REPORT_XLSX_TOO_LARGE = `التقرير أكبر من حد التصدير (${REPORT_XLSX_MAX_ROWS} صف)؛ ضيّق الفلتر`

// نفس نصوص الواجهة (src/lib/status-labels.ts وsrc/data/requestsCatalog.ts) — اختبار REX-UI بيقارنهم
export const EMPLOYEE_STATUS_LABELS: Record<string, string> = {
  active: 'نشط', probation: 'تحت التجربة', notice_period: 'فترة إشعار', suspended: 'موقوف', terminated: 'منتهي الخدمة', archived: 'مؤرشف',
}
export const OVERTIME_STATUS_LABELS: Record<string, string> = {
  DETECTED: 'مكتشف — بانتظار دورة الاعتماد', SUBMITTED: 'مُقدّم للاعتماد', APPROVED: 'معتمد — بانتظار المسير', REJECTED: 'مرفوض',
  CANCELLED: 'ملغى', PAID: 'مدفوع',
}
export const REQUEST_CATEGORY_LABELS: Record<string, string> = {
  leaves: 'الإجازات', time_attendance: 'الحضور والوقت', financial: 'المالية', employment_status: 'الحالة الوظيفية',
  personal_data: 'البيانات الشخصية', letters: 'الخطابات والشهادات', custody_assets: 'العهدة والأصول', training: 'التدريب والتطوير',
  employee_relations: 'علاقات الموظفين',
}

export type ReportCell = string | number | null
export type ReportColumnKind = 'text' | 'number' | 'money'
export interface ReportColumn { header: string; kind: ReportColumnKind; width?: number }
export interface ReportTable { key: ReportKey; title: string; subtitle: string; columns: ReportColumn[]; rows: ReportCell[][] }

const text = (header: string, width = 24): ReportColumn => ({ header, kind: 'text', width })
const number = (header: string, width = 14): ReportColumn => ({ header, kind: 'number', width })
const money = (header: string, width = 16): ReportColumn => ({ header, kind: 'money', width })
const num = (value: unknown): number => Number(value ?? 0)
const table = (key: ReportKey, subtitle: string, columns: ReportColumn[], rows: ReportCell[][]): ReportTable =>
  ({ key, title: REPORT_TITLES[key], subtitle, columns, rows })

// ===== بناء جدول كل تقرير من رد دالته =====

export function headcountTable(report: Pick<WorkforceCounts, 'byBranch' | 'byDepartment' | 'byStatus'> & { summary: { headcount: number; active: number }; date: string }): ReportTable {
  return table('headcount', `حتى ${report.date}`, [text('النوع', 12), text('الاسم/الحالة', 30), number('الإجمالي'), number('النشطون')], [
    ['الإجمالي', 'الموظفون الحاليون', report.summary.headcount, report.summary.active],
    ...report.byBranch.map((row): ReportCell[] => ['فرع', row.branchName, num(row.total), num(row.active)]),
    ...report.byDepartment.map((row): ReportCell[] => ['قسم', row.departmentName, num(row.total), null]),
    ...report.byStatus.map((row): ReportCell[] => ['حالة', EMPLOYEE_STATUS_LABELS[row.status] ?? row.status, num(row.total), null]),
  ])
}

export function attendanceTable(rows: ReadonlyArray<Record<string, unknown>>, range: { from: string; to: string }): ReportTable {
  return table('attendance', `من ${range.from} إلى ${range.to}`,
    [text('الرقم الوظيفي', 16), text('الموظف', 30), number('أيام الحضور'), number('أيام التأخير'), number('أيام الغياب'), number('انصراف مبكر'),
      number('دقائق التأخير'), number('دقائق العمل')],
    rows.map((row): ReportCell[] => [String(row.employeeCode ?? ''), String(row.fullName ?? ''), num(row.presentDays), num(row.lateDays), num(row.absentDays),
      num(row.earlyLeaveDays), num(row.totalLateMinutes), num(row.totalWorkMinutes)]))
}

export function leavesTable(report: { byType: ReadonlyArray<Record<string, unknown>> }, year: string, typeNames: ReadonlyMap<string, string>): ReportTable {
  return table('leaves', `سنة ${year}`, [text('نوع الإجازة', 30), number('عدد الطلبات'), number('إجمالي الأيام')],
    report.byType.map((row): ReportCell[] => [typeNames.get(String(row.leaveTypeCode)) ?? String(row.leaveTypeCode ?? ''), num(row.requests), num(row.totalDays)]))
}

export function payrollTable(report: { runs: ReadonlyArray<Record<string, any>> }): ReportTable {
  const parts = (run: Record<string, any>): Array<{ currency: string; totalNet: unknown }> => run.netByCurrency ?? [{ currency: '', totalNet: run.totalNet }]
  const currencies = [...new Set(report.runs.flatMap(run => parts(run).map(part => String(part.currency))))].sort()
  const multi = currencies.length > 1
  return table('payroll', 'كل المسيرات بحالتها',
    [number('رقم المسير', 12), text('الاسم', 28), text('الفترة', 12), text('النطاق', 26), text('الحالة', 12), number('الموظفون', 12),
      ...(multi ? currencies.map(code => money(`الصافي ${code}`)) : [money('الصافي')])],
    report.runs.map((run): ReportCell[] => [num(run.id), String(run.name ?? ''), String(run.period ?? ''), String(run.branchName ?? run.scopeLabel ?? ''),
      (PAYROLL_RUN_STATUS_LABELS as Record<string, string>)[String(run.status)] ?? String(run.status ?? ''), num(run.employees),
      ...(multi ? currencies.map(code => { const part = parts(run).find(item => String(item.currency) === code); return part ? num(part.totalNet) : null })
        : [num(run.totalNet)])]))
}

export function overtimeTable(rows: ReadonlyArray<Record<string, unknown>>, range: { from: string; to: string }): ReportTable {
  // قيمة المعتمد بتيجي من الدالة لقارئ الرواتب بس — العمود بيظهر لما تكون في الرد
  const withAmount = rows.some(row => 'approvedAmount' in row)
  return table('overtime', `من ${range.from} إلى ${range.to}`,
    [text('الموظف', 30), text('الحالة', 28), number('عدد السجلات'), number('الساعات الفعلية'), number('الساعات المستحقة'), ...(withAmount ? [money('قيمة المعتمد')] : [])],
    rows.map((row): ReportCell[] => [String(row.fullName ?? ''), OVERTIME_STATUS_LABELS[String(row.status)] ?? String(row.status ?? ''), num(row.entries), num(row.actualHours),
      num(row.payableHours), ...(withAmount ? [row.approvedAmount == null ? null : num(row.approvedAmount)] : [])]))
}

export function requestsTable(report: { byType: ReadonlyArray<Record<string, unknown>> }): ReportTable {
  const categories = [...new Set(report.byType.map(row => String(row.category)))]
  const sum = (category: string, match: (status: string) => boolean) =>
    report.byType.filter(row => String(row.category) === category && match(String(row.status))).reduce((total, row) => total + num(row.total), 0)
  const named = ['COMPLETED', 'UNDER_REVIEW', 'REJECTED']
  return table('requests', 'الطلبات حسب الفئة والحالة',
    [text('الفئة', 28), number('مكتملة'), number('قيد المراجعة'), number('مرفوضة'), number('أخرى'), number('الإجمالي')],
    categories.map((category): ReportCell[] => [REQUEST_CATEGORY_LABELS[category] ?? category, sum(category, status => status === 'COMPLETED'),
      sum(category, status => status === 'UNDER_REVIEW'), sum(category, status => status === 'REJECTED'), sum(category, status => !named.includes(status)),
      sum(category, () => true)]))
}

/** قيمة المؤشر كنص بوحدته (نفس اللي الشاشة بتعرضه) */
export function metricValueText(metric: Pick<MetricValue, 'unit' | 'value' | 'byCurrency'>): string {
  if (metric.unit === 'money') {
    return metric.byCurrency?.length ? metric.byCurrency.map(group => `${group.value} ${group.currency}`.trim()).join(' + ') : '—'
  }
  if (metric.value === null) return '—'
  return metric.unit === 'percent' ? `${metric.value}%` : String(metric.value)
}

export function metricsTable(report: { period: string; from: string; to: string; metrics: ReadonlyArray<MetricValue> }): ReportTable {
  return table('metrics', `شهر الرواتب ${report.period} (من ${report.from} إلى ${report.to})`, [text('المؤشر', 22), text('القيمة', 20), text('التعريف', 90)],
    report.metrics.map((metric): ReportCell[] => [metric.label, metricValueText(metric), metric.definition]))
}

// ===== الملفات =====

const SHEET_NAME_BAD = /[\\/?*[\]:]/g

/** ملف Excel: ورقة واحدة من اليمين للشمال، العناوين ثابتة وعليها فلتر، والنص «نص» (كود 0012 مايتحولش 12، ونص يبدأ بـ= مايتنفذش). */
export async function writeReportWorkbook(report: ReportTable): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ExcelJS: typeof import('exceljs') = require('exceljs')
  const workbook: Workbook = new ExcelJS.Workbook()
  workbook.creator = PRODUCT_NAME
  const sheet = workbook.addWorksheet(report.title.replace(SHEET_NAME_BAD, ' ').slice(0, 31), { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] })
  sheet.columns = report.columns.map(column => ({ header: column.header, width: column.width ?? 18,
    style: column.kind === 'text' ? { numFmt: '@' } : column.kind === 'money' ? { numFmt: '#,##0.00' } : {} }))
  const header = sheet.getRow(1)
  header.font = { bold: true }
  header.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
  header.height = 30
  report.columns.forEach((_, index) => {
    header.getCell(index + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }
  })
  for (const values of report.rows) sheet.addRow(values)
  if (report.columns.length) sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: report.columns.length } }
  return Buffer.from(await workbook.xlsx.writeBuffer())
}

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!))
const cellText = (value: ReportCell, kind: ReportColumnKind): string =>
  value === null ? '' : kind === 'money' && typeof value === 'number' ? value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : typeof value === 'number' ? value.toLocaleString('en-US') : value

/** صفحة التقرير للـPDF: كل النصوص متهرّبة، والخط مضمّن (الرسم من غير JavaScript ولا طلبات خارجية). */
export function reportTableHtml(report: ReportTable, meta: { company: string; printedAt: string; printedBy: string }, fontBase64: string): string {
  const head = report.columns.map(column => `<th>${escapeHtml(column.header)}</th>`).join('')
  const body = report.rows.map(row => `<tr>${row.map((value, index) => {
    const kind = report.columns[index]?.kind ?? 'text'
    return `<td class="${kind === 'text' ? 'text' : 'num'}">${kind === 'text' ? escapeHtml(cellText(value, kind)) : `<bdi>${escapeHtml(cellText(value, kind))}</bdi>`}</td>`
  }).join('')}</tr>`).join('')
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
    @font-face{font-family:Naskh;src:url(data:font/ttf;base64,${fontBase64})}*{box-sizing:border-box}
    body{font-family:Naskh,serif;color:#162d40;margin:0;font-size:12px;line-height:1.7}
    header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #1d4ed8;padding-bottom:6px;margin-bottom:10px}
    h1{font-size:18px;margin:0}h2{font-size:14px;margin:0;color:#1d4ed8}.meta{font-size:10px;color:#52606d;text-align:left}
    table{width:100%;border-collapse:collapse}thead{display:table-header-group}tr{page-break-inside:avoid}
    th{background:#dbeafe;font-weight:700;padding:5px 6px;border:1px solid #9fb3c8;text-align:center}
    td{padding:4px 6px;border:1px solid #cbd2d9;vertical-align:top}td.num{text-align:center;white-space:nowrap}
    .empty{text-align:center;color:#52606d;padding:18px}</style></head><body>
    <header><div><h1>${escapeHtml(meta.company)}</h1><h2>${escapeHtml(report.title)}</h2><div>${escapeHtml(report.subtitle)}</div></div>
    <div class="meta">تاريخ الاستخراج: <bdi>${escapeHtml(meta.printedAt)}</bdi><br>بواسطة: <bdi>${escapeHtml(meta.printedBy)}</bdi><br>عدد الصفوف: <bdi>${report.rows.length}</bdi></div></header>
    <table><thead><tr>${head}</tr></thead><tbody>${body || `<tr><td class="empty" colspan="${report.columns.length}">لا توجد بيانات في هذا التقرير</td></tr>`}</tbody></table>
    </body></html>`
}

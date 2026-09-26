import { BadRequestException } from '@nestjs/common'
import type { Workbook } from 'exceljs'
import { PAID_SALARY_COMPONENTS } from './compensation'
import { CONTRACT_TYPE_OPTIONS, GENDER_OPTIONS, PAY_METHOD_OPTIONS } from './employee-bulk-update.fields'

// تصدير الموظفين من صفحة الموظفين (طلب المالك 24 سبتمبر): كل بيانات الملف، وأولها كود البصمة — هو الربط بينه
// وبين أي نظام تاني لحد ما النقل يكمل. ملف Excel حقيقي مش CSV: كود البصمة والجوال والهوية والآيبان بيتكتبوا نص،
// لأن CSV بيخلي Excel يشيل الأصفار اللي في أول الرقم (كود 0012 ← 12، وجوال 0501234567 ← 501234567).
// الراتب والبدلات وطريقة الصرف والبنك والتأمينات بس للي عنده payroll.view أو employees.edit (نفس قاعدة projectEmployee).

// الأرقام في رابط GET (ids=12,5,9): 2,000 رقم ≈ 12 كيلوبايت تحت حد رأس الطلب في Node (16 كيلو)
export const EMPLOYEE_EXPORT_MAX = 2000

/** أرقام الموظفين من الرابط بترتيبها: موجبة صحيحة، واحد على الأقل، وEMPLOYEE_EXPORT_MAX بالكتير. */
export function parseEmployeeExportIds(raw: unknown): number[] {
  const text = typeof raw === 'string' ? raw.trim() : ''
  if (!text) throw new BadRequestException('مفيش موظفين للتصدير')
  const parts = text.split(',').map(part => part.trim())
  if (parts.length > EMPLOYEE_EXPORT_MAX) throw new BadRequestException(`التصدير بحد أقصى ${EMPLOYEE_EXPORT_MAX} موظف`)
  if (parts.some(part => !/^[1-9]\d{0,9}$/.test(part) || Number(part) > 2147483647)) throw new BadRequestException('معرّف موظف غير صالح')
  return parts.map(Number)
}

export interface EmployeeExportRow {
  id: number; employeeCode: string; fingerprintCode: string | null; fullName: string; fullNameEn: string | null
  nationalId: string | null; nationality: string | null; gender: string | null; birthDate: string | null; birthPlace: string | null
  maritalStatus: string | null; passportNo: string | null; passportExpiry: string | null
  phone: string | null; phoneAlt: string | null; email: string | null; personalEmail: string | null; address: string | null
  country: string | null; postalCode: string | null; emergencyContactName: string | null; emergencyRelation: string | null
  emergencyContactPhone: string | null; emergencyPhoneAlt: string | null
  branchId: number | null; departmentId: number | null; teamId: number | null; jobTitle: string | null; gradeId: number | null
  managerEmployeeId: number | null; costCenterId: number | null; workScheduleId: number | null; workLocation: string | null
  workType: string | null; joinDate: string | null; actualStartDate: string | null; probationEndDate: string | null
  salaryEntitlementStart: string | null; recruitmentSource: string | null; status: string | null; annualLeaveEntitled: boolean | null
  contractType: string | null; contractNumber: string | null; contractStart: string | null; contractEnd: string | null
  contractDurationMonths: number | null; noticePeriodDays: number | null
  currency: string | null; salaryCycle: string | null
  basicSalary: number | null; housingAllowance: number | null; transportAllowance: number | null
  phoneAllowance: number | null; workNatureAllowance: number | null; otherAllowance: number | null; workPressureAllowance: number | null
  payMethod: string | null; bankTransferAmount: number | null; bankName: string | null; bankBranch: string | null; iban: string | null
  gosiNumber: string | null; isGosiRegistered: boolean | null; gosiBaseSalary: number | null
  archivedAt: string | null; archiveReason: string | null
}

/** أسماء بالمعرّف لعرض الفرع والقسم والفريق والدرجة ومركز التكلفة وجدول العمل والمدير بالاسم مش بالرقم. */
export interface EmployeeExportLookups {
  branches: Map<number, string>; departments: Map<number, string>; teams: Map<number, string>; grades: Map<number, string>
  costCenters: Map<number, string>; workSchedules: Map<number, string>; managers: Map<number, string>
}

type Cell = string | number | null
export type EmployeeExportKind = 'text' | 'money' | 'number'
export interface EmployeeExportColumn {
  header: string; width: number; kind: EmployeeExportKind
  /** عمود مالي — بيطلع بس للي بيشوف الماليات */
  finance?: boolean
  value: (row: EmployeeExportRow, lookups: EmployeeExportLookups) => Cell
}

const labelOf = (options: ReadonlyArray<{ value: string; label: string }>) => (value: string | null) =>
  value == null || value === '' ? null : options.find(option => option.value === value)?.label ?? value
const mapped = (labels: Record<string, string>) => (value: string | null) => value == null || value === '' ? null : labels[value] ?? value
const yesNo = (value: boolean | null) => value == null ? null : value ? 'نعم' : 'لا'
const nameOf = (map: Map<number, string>, id: number | null) => id == null ? null : map.get(id) ?? null
const text = (value: string | null | undefined) => value == null || value === '' ? null : value
const money = (value: number | null) => value == null ? null : Number(value)

// نفس تسميات الشاشات (src/lib/status-labels.ts وsrc/lib/employee-history.ts)
const STATUS_LABELS: Record<string, string> = { active: 'نشط', probation: 'تحت التجربة', notice_period: 'فترة إشعار', suspended: 'موقوف', terminated: 'منتهي الخدمة', archived: 'مؤرشف' }
const MARITAL_LABELS: Record<string, string> = { single: 'أعزب', married: 'متزوج', divorced: 'مطلق', widowed: 'أرمل' }
const WORK_TYPE_LABELS: Record<string, string> = { full_time: 'دوام كامل', fulltime: 'دوام كامل', part_time: 'دوام جزئي', parttime: 'دوام جزئي', contract: 'عقد مؤقت', consultant: 'استشاري', intern: 'متدرب' }
const RELATION_LABELS: Record<string, string> = { spouse: 'زوج/زوجة', parent: 'أب/أم', sibling: 'أخ/أخت', child: 'ابن/ابنة', other: 'أخرى' }
const SALARY_CYCLE_LABELS: Record<string, string> = { monthly: 'شهري', biweekly: 'كل أسبوعين', weekly: 'أسبوعي' }
const gender = labelOf(GENDER_OPTIONS), contractType = labelOf(CONTRACT_TYPE_OPTIONS), payMethod = labelOf(PAY_METHOD_OPTIONS)

const column = (header: string, width: number, kind: EmployeeExportKind, value: EmployeeExportColumn['value'], finance = false): EmployeeExportColumn =>
  ({ header, width, kind, value, ...(finance ? { finance: true } : {}) })

export const EMPLOYEE_EXPORT_COLUMNS: ReadonlyArray<EmployeeExportColumn> = [
  // الأساسي — كود البصمة جنب كود الموظف على طول
  column('كود الموظف', 14, 'text', row => row.employeeCode),
  column('كود البصمة', 14, 'text', row => text(row.fingerprintCode)),
  column('الاسم', 30, 'text', row => row.fullName),
  column('الاسم بالإنجليزية', 30, 'text', row => text(row.fullNameEn)),
  column('رقم الهوية / الإقامة', 18, 'text', row => text(row.nationalId)),
  column('الجنسية', 14, 'text', row => text(row.nationality)),
  column('النوع', 10, 'text', row => gender(row.gender)),
  column('تاريخ الميلاد', 14, 'text', row => row.birthDate),
  column('مكان الميلاد', 16, 'text', row => text(row.birthPlace)),
  column('الحالة الاجتماعية', 14, 'text', row => mapped(MARITAL_LABELS)(row.maritalStatus)),
  column('رقم الجواز', 14, 'text', row => text(row.passportNo)),
  column('انتهاء الجواز', 14, 'text', row => row.passportExpiry),
  // التواصل
  column('الجوال', 16, 'text', row => text(row.phone)),
  column('جوال بديل', 16, 'text', row => text(row.phoneAlt)),
  column('بريد العمل', 28, 'text', row => text(row.email)),
  column('البريد الشخصي', 28, 'text', row => text(row.personalEmail)),
  column('العنوان', 30, 'text', row => text(row.address)),
  column('الدولة', 10, 'text', row => text(row.country)),
  column('الرمز البريدي', 12, 'text', row => text(row.postalCode)),
  column('جهة اتصال الطوارئ', 22, 'text', row => text(row.emergencyContactName)),
  column('صلة القرابة', 12, 'text', row => mapped(RELATION_LABELS)(row.emergencyRelation)),
  column('هاتف الطوارئ', 16, 'text', row => text(row.emergencyContactPhone)),
  column('هاتف طوارئ بديل', 16, 'text', row => text(row.emergencyPhoneAlt)),
  // الوظيفة
  column('الفرع', 18, 'text', (row, l) => nameOf(l.branches, row.branchId)),
  column('القسم', 20, 'text', (row, l) => nameOf(l.departments, row.departmentId)),
  column('الفريق', 20, 'text', (row, l) => nameOf(l.teams, row.teamId)),
  column('المسمى الوظيفي', 22, 'text', row => text(row.jobTitle)),
  column('الدرجة', 14, 'text', (row, l) => nameOf(l.grades, row.gradeId)),
  column('المدير المباشر', 30, 'text', (row, l) => nameOf(l.managers, row.managerEmployeeId)),
  column('مركز التكلفة', 22, 'text', (row, l) => nameOf(l.costCenters, row.costCenterId)),
  column('جدول العمل', 20, 'text', (row, l) => nameOf(l.workSchedules, row.workScheduleId)),
  column('مكان العمل', 18, 'text', row => text(row.workLocation)),
  column('نوع التوظيف', 12, 'text', row => mapped(WORK_TYPE_LABELS)(row.workType)),
  column('تاريخ التعيين', 14, 'text', row => row.joinDate),
  column('تاريخ بدء العمل الفعلي', 14, 'text', row => row.actualStartDate),
  column('نهاية فترة التجربة', 14, 'text', row => row.probationEndDate),
  column('بداية استحقاق الراتب', 14, 'text', row => row.salaryEntitlementStart),
  column('مصدر التوظيف', 16, 'text', row => text(row.recruitmentSource)),
  column('الحالة', 14, 'text', row => mapped(STATUS_LABELS)(row.status)),
  column('يستحق إجازة سنوية', 12, 'text', row => yesNo(row.annualLeaveEntitled)),
  // العقد
  column('نوع العقد', 14, 'text', row => contractType(row.contractType)),
  column('رقم العقد', 16, 'text', row => text(row.contractNumber)),
  column('بداية العقد', 14, 'text', row => row.contractStart),
  column('نهاية العقد', 14, 'text', row => row.contractEnd),
  column('مدة العقد (شهور)', 12, 'number', row => row.contractDurationMonths),
  column('فترة الإشعار (أيام)', 12, 'number', row => row.noticePeriodDays),
  // الراتب والبنك والتأمينات — بصلاحية بس (المكونات السبعة، وآخرها «بدل ضغط العمل»)
  ...PAID_SALARY_COMPONENTS.map(component => column(component.nameAr, 14, 'money',
    row => money(row[component.key as keyof EmployeeExportRow] as number | null), true)),
  column('العملة', 10, 'text', row => text(row.currency), true),
  column('دورة الراتب', 12, 'text', row => mapped(SALARY_CYCLE_LABELS)(row.salaryCycle), true),
  column('طريقة الصرف', 14, 'text', row => payMethod(row.payMethod), true),
  column('مبلغ التحويل البنكي', 14, 'money', row => money(row.bankTransferAmount), true),
  column('البنك', 20, 'text', row => text(row.bankName), true),
  column('فرع البنك', 18, 'text', row => text(row.bankBranch), true),
  column('الآيبان', 30, 'text', row => text(row.iban), true),
  column('رقم التأمينات', 16, 'text', row => text(row.gosiNumber), true),
  column('مسجل بالتأمينات', 12, 'text', row => yesNo(row.isGosiRegistered), true),
  column('أجر التأمينات', 14, 'money', row => money(row.gosiBaseSalary), true),
  // الأرشيف
  column('تاريخ الأرشفة', 14, 'text', row => row.archivedAt),
  column('سبب الأرشفة', 30, 'text', row => text(row.archiveReason)),
]

export function employeeExportColumns(includeFinance: boolean): EmployeeExportColumn[] {
  return EMPLOYEE_EXPORT_COLUMNS.filter(item => includeFinance || !item.finance)
}

export function employeeExportCells(row: EmployeeExportRow, lookups: EmployeeExportLookups, columns: ReadonlyArray<EmployeeExportColumn>): Cell[] {
  return columns.map(item => item.value(row, lookups))
}

/** ملف Excel: ورقة واحدة من اليمين للشمال، العناوين ثابتة وعليها فلتر، والأعمدة النصية «نص» عشان الأصفار الأولى ماتضيعش. */
export async function writeEmployeesWorkbook(columns: ReadonlyArray<EmployeeExportColumn>, rows: Cell[][]): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ExcelJS: typeof import('exceljs') = require('exceljs')
  const workbook: Workbook = new ExcelJS.Workbook()
  workbook.creator = 'HR System'
  const sheet = workbook.addWorksheet('الموظفين', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] })
  sheet.columns = columns.map(item => ({ header: item.header, width: item.width,
    style: item.kind === 'text' ? { numFmt: '@' } : item.kind === 'money' ? { numFmt: '#,##0.00' } : {} }))
  const header = sheet.getRow(1)
  header.font = { bold: true }
  header.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
  header.height = 30
  columns.forEach((item, index) => {
    header.getCell(index + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: item.finance ? 'FFFEF3C7' : 'FFDBEAFE' } }
  })
  for (const values of rows) sheet.addRow(values)
  if (columns.length) sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } }
  return Buffer.from(await workbook.xlsx.writeBuffer())
}

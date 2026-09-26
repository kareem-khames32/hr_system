import { BadRequestException, ConflictException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { MONTHLY_SALARY_COMPONENTS, PAID_SALARY_COMPONENTS, WORK_PRESSURE_ALLOWANCE } from '../employees/compensation'
import { payrollLiveSourceContent } from './payroll-live-source-contract'
import { lockPayrollEmployees } from './payroll-settlement-boundary'
import { MonthlySalaryPeriod, normalizeMonthlySalaryPeriods, PAYROLL_MONTHLY_SALARY_HISTORY_VERSION } from './payroll-period-salary'

export const PAYROLL_SALARY_HISTORY_VERSION = 'SALARY_EFFECTIVE_HISTORY_V1_20260913' as const
export const PAYROLL_SALARY_HISTORY_LIMIT = 120
// سجل الأجر المؤرخ بيأرّخ كل مكونات الراتب المصروفة: الست + بدل ضغط العمل (تغييره بشهر سريان زي أي تغيير أجر).
export const SALARY_HISTORY_MONEY_KEYS = PAID_SALARY_COMPONENTS.map(row => row.key)
export type SalaryHistoryMoneyKey = typeof PAID_SALARY_COMPONENTS[number]['key']
// بدل ضغط العمل (ترحيل 071) مكوّن اختياري في المدخلات: غيابه = صفر (قيمته الافتراضية في القاعدة)، والصفر منه ما بيدخلش
// أي بصمة — فكل بصمة اتحفظت قبله (السجل، والأجر الحالي، ودليل طلب الزيادة) فاضلة مطابقة بالحرف، والمكونات الست زي ما هي إلزامية.
export const SALARY_HISTORY_REQUIRED_MONEY_KEYS = MONTHLY_SALARY_COMPONENTS.map(row => row.key)
export type SalaryHistoryOptionalMoneyKey = typeof WORK_PRESSURE_ALLOWANCE.key
export const SALARY_HISTORY_OPTIONAL_MONEY_KEYS: readonly SalaryHistoryOptionalMoneyKey[] = [WORK_PRESSURE_ALLOWANCE.key]
export const isOptionalSalaryKey = (key: string): key is SalaryHistoryOptionalMoneyKey => (SALARY_HISTORY_OPTIONAL_MONEY_KEYS as readonly string[]).includes(key)
const zeroOrMissing = (value: unknown) => value === null || value === undefined || value === 0 || (typeof value === 'string' && /^-?0*(?:\.0*)?$/.test(value) && /0/.test(value))
/** نسخة للبصمة: بدل ضغط العمل الصفري (أو الغائب) يتشال، فالبصمة = بصمة ما قبل ترحيل 071 بالحرف؛ غير الصفري بيدخلها. */
export function withoutZeroOptionalSalary<T extends object>(row: T): T {
  const record = row as Record<string, unknown>
  if (!SALARY_HISTORY_OPTIONAL_MONEY_KEYS.some(key => Object.prototype.hasOwnProperty.call(record, key) && zeroOrMissing(record[key]))) return row
  const copy: Record<string, unknown> = { ...record }
  for (const key of SALARY_HISTORY_OPTIONAL_MONEY_KEYS) if (Object.prototype.hasOwnProperty.call(copy, key) && zeroOrMissing(copy[key])) delete copy[key]
  return copy as T
}
export type SalaryHistorySegment = Record<SalaryHistoryMoneyKey, string> & { effectiveFrom: string; effectiveTo: string | null; currency: 'SAR' | 'EGP'; effectivePayrollPeriod?: string | null; effectiveToPayrollPeriod?: string | null }
export type SalaryHistoryCurrent = Record<SalaryHistoryMoneyKey, string | null> & { currency: string | null }
export interface SalaryHistoryVersionView { id: number; revision: number; reason: string; evidenceReference: string; createdAt: string; createdBy: number; contentHash: string; currentSourceHash: string; contractVersion: string | null; cycleStartDay: number | null }
export interface SalaryHistoryRead { revision: number; version: SalaryHistoryVersionView | null; segments: SalaryHistorySegment[] }

const invalid = (code: string, message: string): never => { throw new BadRequestException({ code, message }) }
const plain = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
function exactKeys(value: unknown, keys: readonly string[], optional: readonly string[] = []) {
  if (!plain(value) || keys.some(key => !Object.prototype.hasOwnProperty.call(value, key)) ||
    Object.keys(value).some(key => !keys.includes(key) && !optional.includes(key))) invalid('SALARY_HISTORY_SHAPE_INVALID', 'حقول سجل الأجر غير مكتملة أو تحتوي على بيانات غير مسموحة')
  return value as Record<string, unknown>
}
/** مبالغ المكونات السبعة من صف مُدخل: الست إلزامية، وبدل ضغط العمل الغائب = صفر (قيمته الافتراضية). */
export function salaryHistoryMoneyOf(row: Record<string, unknown>, allowNegative = false): Record<SalaryHistoryMoneyKey, string> {
  return Object.fromEntries(SALARY_HISTORY_MONEY_KEYS.map(key => [key,
    isOptionalSalaryKey(key) && row[key] === undefined ? '0.00' : salaryHistoryMoney(row[key], allowNegative)])) as Record<SalaryHistoryMoneyKey, string>
}

export function salaryHistoryDate(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) invalid('SALARY_HISTORY_DATE_INVALID', 'تاريخ سريان الأجر يجب أن يكون تاريخًا صحيحًا بصيغة YYYY-MM-DD')
  const date = value as string, year = Number(date.slice(0, 4)), month = Number(date.slice(5, 7)), day = Number(date.slice(8, 10))
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]) invalid('SALARY_HISTORY_DATE_INVALID', 'تاريخ سريان الأجر غير موجود في التقويم')
  return date
}

export function salaryHistoryMoney(value: unknown, allowNegative = false): string {
  if (typeof value !== 'string' || value.length > 80 || !(allowNegative ? /^-?\d+(?:\.\d{1,2})?$/ : /^\d+(?:\.\d{1,2})?$/).test(value)) invalid('SALARY_HISTORY_AMOUNT_INVALID', 'كل مكوّن أجر مبلغ نصي صريح بمنزلتين عشريتين على الأكثر، دون تقريب أو قيم افتراضية')
  const source = value as string, negative = source.startsWith('-'), [whole, fraction = ''] = source.replace(/^-/, '').split('.')
  const integral = whole.replace(/^0+(?=\d)/, '')
  if (integral.length > 16) invalid('SALARY_HISTORY_AMOUNT_PRECISION', 'قيمة مكوّن الأجر تتجاوز الدقة المالية المسموحة')
  const result = `${integral}.${fraction.padEnd(2, '0')}`
  return negative && result !== '0.00' ? '-' + result : result
}

export function salaryHistoryText(value: unknown, max: number, label: string): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) invalid('SALARY_HISTORY_EVIDENCE_REQUIRED', `${label} مطلوب وبحد أقصى ${max} حرفًا`)
  return (value as string).trim()
}

/** الفجوات تبقى نقصًا في الإثبات؛ لا تُفترض نهاية مفتوحة للفترة. */
export function normalizeSalaryHistorySegments(input: unknown): SalaryHistorySegment[] {
  if (!Array.isArray(input) || input.length < 1 || input.length > PAYROLL_SALARY_HISTORY_LIMIT) invalid('SALARY_HISTORY_SEGMENT_LIMIT', 'أدخل من فترة واحدة إلى 120 فترة أجر موثقة')
  const rows = (input as unknown[]).map(value => {
    const row = exactKeys(value, ['effectiveFrom', 'effectiveTo', 'currency', ...SALARY_HISTORY_REQUIRED_MONEY_KEYS], SALARY_HISTORY_OPTIONAL_MONEY_KEYS)
    const effectiveFrom = salaryHistoryDate(row.effectiveFrom), effectiveTo = row.effectiveTo === null ? null : salaryHistoryDate(row.effectiveTo)
    if (effectiveTo !== null && effectiveTo < effectiveFrom) invalid('SALARY_HISTORY_RANGE_INVALID', 'نهاية سريان الأجر تسبق بدايته')
    if (row.currency !== 'SAR' && row.currency !== 'EGP') invalid('SALARY_HISTORY_CURRENCY_INVALID', 'عملة فترة الأجر يجب أن تكون SAR أو EGP')
    const money = salaryHistoryMoneyOf(row)
    return { effectiveFrom, effectiveTo, currency: row.currency as 'SAR' | 'EGP', ...money }
  }).sort((left, right) => left.effectiveFrom.localeCompare(right.effectiveFrom))
  for (let index = 1; index < rows.length; index++) {
    const previous = rows[index - 1]
    if (previous.effectiveTo === null || previous.effectiveTo >= rows[index].effectiveFrom) invalid('SALARY_HISTORY_OVERLAP', 'فترات الأجر متداخلة؛ الفترة المفتوحة لا يقبل بعدها فترة أخرى')
  }
  return rows
}

export function salaryCurrentSourceHash(current: SalaryHistoryCurrent): string {
  const row = exactKeys(current, [...SALARY_HISTORY_REQUIRED_MONEY_KEYS, 'currency'], SALARY_HISTORY_OPTIONAL_MONEY_KEYS)
  const normalized = Object.fromEntries(SALARY_HISTORY_MONEY_KEYS.filter(key => !isOptionalSalaryKey(key) || row[key] !== undefined)
    .map(key => [key, row[key] === null ? null : salaryHistoryMoney(row[key], true)]))
  if (row.currency !== null && (typeof row.currency !== 'string' || row.currency.length > 20)) invalid('SALARY_HISTORY_CURRENT_INVALID', 'عملة الأجر الحالي غير صالحة')
  return payrollLiveSourceContent(withoutZeroOptionalSalary({ ...normalized, currency: row.currency })).contentHash
}

export function salaryHistoryContentHash(input: { employeeId: number; revision: number; reason: string; evidenceReference: string; currentSourceHash: string; segments: SalaryHistorySegment[] }): string {
  // أعمدة012 الفارغة لا تدخل بصمةV1؛ تبقى كل البصمات السابقة مطابقة حرفيًا. وكذلك بدل ضغط العمل الصفري (ترحيل 071).
  const segments = input.segments.map(({ effectivePayrollPeriod, effectiveToPayrollPeriod, ...row }) => {
    if (effectivePayrollPeriod != null || effectiveToPayrollPeriod != null) invalid('SALARY_HISTORY_MONTHLY_REQUIRED', 'الدليل الشهري يتطلب عقد الرواتب الشهري ولا يقبل بصمة التاريخ اليومي')
    return withoutZeroOptionalSalary(row)
  })
  return payrollLiveSourceContent({ schemaVersion: PAYROLL_SALARY_HISTORY_VERSION, employeeId: input.employeeId, revision: input.revision,
    reason: input.reason, evidenceReference: input.evidenceReference, currentSourceHash: input.currentSourceHash, segments }).contentHash
}

export function monthlySalaryHistoryContentHash(input: { employeeId: number; revision: number; reason: string; evidenceReference: string; currentSourceHash: string; cycleStartDay: number; segments: SalaryHistorySegment[]; createdBy: number; createdAt: string }): string {
  if (!sqlInt(input.createdBy) || typeof input.createdAt !== 'string' || !Number.isFinite(Date.parse(input.createdAt)) || new Date(input.createdAt).toISOString() !== input.createdAt) invalid('SALARY_HISTORY_IDENTITY_INVALID', 'فاعل وتوقيت إثبات الراتب الشهري مطلوبان بصيغة صريحة صحيحة')
  // بدل ضغط العمل الصفري برّه البصمة: مراجعات ما قبل ترحيل 071 (العمود بقى صفر) فاضلة مطابقة بصمتها المحفوظة
  return payrollLiveSourceContent({ schemaVersion: PAYROLL_MONTHLY_SALARY_HISTORY_VERSION, contractVersion: PAYROLL_MONTHLY_SALARY_HISTORY_VERSION, ...input,
    segments: input.segments.map(row => withoutZeroOptionalSalary(row)) }).contentHash
}

export function salaryHistorySchemaMissing(error: any): boolean {
  const numbers = [error?.number, error?.driverError?.number, error?.originalError?.info?.number, error?.driverError?.originalError?.info?.number]
  return numbers.some(number => number === 207 || number === 208)
}

const sqlInt = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 2147483647
const hex = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
export function salaryHistoryStorageInvalid(): never { throw new ConflictException({ code: 'SALARY_HISTORY_INVALID', message: 'سجل الأجر المؤرخ لا يطابق بياناته الموثقة؛ يلزم مراجعته قبل استخدامه' }) }

export async function readSalaryHistoryCurrent(em: EntityManager, employeeId: number) {
  if (!em.queryRunner?.isTransactionActive) throw new Error('قراءة الأجر الحالي تتطلب معاملة نشطة')
  if (!sqlInt(employeeId)) invalid('SALARY_HISTORY_EMPLOYEE_INVALID', 'معرّف الموظف غير صالح')
  const rows = await em.query(`SELECT [id], [employeeCode], [fullName], [branchId], [currency], ${SALARY_HISTORY_MONEY_KEYS.map(key => `CAST([${key}] AS nvarchar(80)) AS [${key}]`).join(', ')} FROM dbo.employees WHERE [id]=@0`, [employeeId])
  if (!rows.length) return null
  if (rows.length !== 1 || !sqlInt(rows[0].id) || (rows[0].branchId !== null && !sqlInt(rows[0].branchId)) || typeof rows[0].employeeCode !== 'string' || typeof rows[0].fullName !== 'string') salaryHistoryStorageInvalid()
  const row = rows[0], current = { currency: row.currency, ...Object.fromEntries(SALARY_HISTORY_MONEY_KEYS.map(key => [key, row[key]])) } as SalaryHistoryCurrent
  return { employee: { id: row.id as number, employeeCode: row.employeeCode as string, fullName: row.fullName as string, branchId: row.branchId as number | null }, current, currentSourceHash: salaryCurrentSourceHash(current) }
}

/** تُقرأ المراجعة الأخيرة كاملة؛ لا تُملأ فجواتها من مراجعات سابقة. */
export async function readSalaryHistory(em: EntityManager, employeeId: number): Promise<SalaryHistoryRead> {
  if (!em.queryRunner?.isTransactionActive) throw new Error('قراءة سجل الأجر تتطلب معاملة نشطة')
  if (!sqlInt(employeeId)) invalid('SALARY_HISTORY_EMPLOYEE_INVALID', 'معرّف الموظف غير صالح')
  const headers = await em.query(`SELECT TOP (1) [id], [employeeId], [revision], [reason], [evidenceReference], [currentSourceHash], [contentHash], [contractVersion], [cycleStartDay], [createdBy], [createdAt], CONVERT(nvarchar(27), [createdAt], 126) AS [createdAtUtc] FROM dbo.employee_salary_history_versions WHERE [employeeId]=@0 ORDER BY [revision] DESC`, [employeeId])
  if (!headers.length) return { revision: 0, version: null, segments: [] }
  const header = headers[0]
  if (!sqlInt(header.id) || header.employeeId !== employeeId || !sqlInt(header.revision) || !sqlInt(header.createdBy) || !hex(header.currentSourceHash) || !hex(header.contentHash)) salaryHistoryStorageInvalid()
  const contractVersion = header.contractVersion ?? null, cycleStartDay = header.cycleStartDay ?? null
  if ((contractVersion === null && cycleStartDay !== null) || (contractVersion !== null && contractVersion !== PAYROLL_MONTHLY_SALARY_HISTORY_VERSION)) salaryHistoryStorageInvalid()
  const stored = await em.query(`SELECT TOP (121) [sequence], CONVERT(nvarchar(10), [effectiveFrom], 23) AS [effectiveFrom], CONVERT(nvarchar(10), [effectiveTo], 23) AS [effectiveTo], [effectivePayrollPeriod], [effectiveToPayrollPeriod], [currency], ${SALARY_HISTORY_MONEY_KEYS.map(key => `CAST([${key}] AS nvarchar(80)) AS [${key}]`).join(', ')} FROM dbo.employee_salary_history WHERE [versionId]=@0 ORDER BY [sequence]`, [header.id])
  let segments: SalaryHistorySegment[], reason: string, evidenceReference: string
  try {
    if (stored.some((row: any, index: number) => row.sequence !== index + 1)) salaryHistoryStorageInvalid()
    reason = salaryHistoryText(header.reason, 500, 'سبب إثبات الأجر')
    evidenceReference = salaryHistoryText(header.evidenceReference, 200, 'مرجع مستند الأجر')
    if (reason !== header.reason || evidenceReference !== header.evidenceReference) salaryHistoryStorageInvalid()
    if (contractVersion === null) {
      if (stored.some((row: any) => row.effectivePayrollPeriod != null || row.effectiveToPayrollPeriod != null)) salaryHistoryStorageInvalid()
      segments = normalizeSalaryHistorySegments(stored.map(({ sequence: _sequence, effectivePayrollPeriod: _period, effectiveToPayrollPeriod: _toPeriod, ...row }: any) => row))
    } else {
      segments = normalizeMonthlySalaryPeriods(stored.map(({ sequence: _sequence, effectiveFrom: _from, effectiveTo: _to, ...row }: any) => row), cycleStartDay)
      if (stored.some((row: any, index: number) => row.effectivePayrollPeriod !== segments[index].effectivePayrollPeriod || row.effectiveToPayrollPeriod !== segments[index].effectiveToPayrollPeriod || row.effectiveTo !== segments[index].effectiveTo)) salaryHistoryStorageInvalid()
    }
    if (stored.some((row: any, index: number) => row.effectiveFrom !== segments[index].effectiveFrom)) salaryHistoryStorageInvalid()
  } catch { salaryHistoryStorageInvalid() }
  // datetime2 لا يحمل منطقة زمنية؛ V2 يكتب UTC صريحًا ويقرأ نصه بعيدًا عن تحويل منطقة برنامج التشغيل.
  // أي كسور أدق من المللي ثانية مرفوضة بدل فقدها ثم قبول بصمة لا تثبتها.
  const stamp = contractVersion === null ? null : typeof header.createdAtUtc === 'string' ? /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,7}))?$/.exec(header.createdAtUtc) : null
  if (contractVersion !== null && (!stamp || /[1-9]/.test((stamp[2] ?? '').slice(3)))) salaryHistoryStorageInvalid()
  const createdAt = contractVersion === null ? (header.createdAt instanceof Date ? header.createdAt : new Date(header.createdAt)) : new Date(`${stamp![1]}.${(stamp![2] ?? '').slice(0, 3).padEnd(3, '0')}Z`)
  if (!Number.isFinite(createdAt.getTime())) salaryHistoryStorageInvalid()
  const hashInput = { employeeId, revision: header.revision, reason: reason!, evidenceReference: evidenceReference!, currentSourceHash: header.currentSourceHash, segments: segments! }
  const contentHash = contractVersion === null ? salaryHistoryContentHash(hashInput) : monthlySalaryHistoryContentHash({ ...hashInput, cycleStartDay, createdBy: header.createdBy, createdAt: createdAt.toISOString() })
  if (contentHash !== header.contentHash) salaryHistoryStorageInvalid()
  return { revision: header.revision, version: { id: header.id, revision: header.revision, reason: reason!, evidenceReference: evidenceReference!, createdAt: createdAt.toISOString(), createdBy: header.createdBy, contentHash, currentSourceHash: header.currentSourceHash, contractVersion, cycleStartDay }, segments: segments! }
}

/** إضافة مراجعة كاملة تحت القفل المالي، بلا تعديل الموظف أو المراجعات السابقة. */
export async function appendSalaryHistoryRevision(em: EntityManager, input: {
  employeeId: number; reason: string; evidenceReference: string; currentSourceHash: string;
  segments: SalaryHistorySegment[]; createdBy: number
}): Promise<SalaryHistoryRead> {
  if (!em.queryRunner?.isTransactionActive) throw new Error('إضافة مراجعة الأجر تتطلب معاملة نشطة')
  if (!sqlInt(input.employeeId) || !sqlInt(input.createdBy) || !hex(input.currentSourceHash)) invalid('SALARY_HISTORY_IDENTITY_INVALID', 'هوية إثبات الأجر وبصمة المصدر غير صالحتين')
  const reason = salaryHistoryText(input.reason, 500, 'سبب إثبات الأجر'), evidenceReference = salaryHistoryText(input.evidenceReference, 200, 'مرجع مستند الأجر'), segments = normalizeSalaryHistorySegments(input.segments)
  await lockPayrollEmployees(em, [input.employeeId])
  const previous = await readSalaryHistory(em, input.employeeId)
  if (previous.version?.contractVersion === PAYROLL_MONTHLY_SALARY_HISTORY_VERSION) throw new ConflictException({ code: 'SALARY_HISTORY_MONTHLY_REQUIRED', message: 'سجل الموظف مثبت بالشهر المرجعي؛ استخدم حفظ التاريخ الشهري حتى لا تفقد هذا الدليل' })
  if (previous.revision >= 2147483647) throw new ConflictException({ code: 'SALARY_HISTORY_REVISION_LIMIT', message: 'وصل سجل الأجر إلى الحد الأقصى للمراجعات' })
  const revision = previous.revision + 1, contentHash = salaryHistoryContentHash({ employeeId: input.employeeId, revision, reason, evidenceReference, currentSourceHash: input.currentSourceHash, segments })
  const inserted = await em.query(`INSERT INTO dbo.employee_salary_history_versions ([employeeId], [revision], [reason], [evidenceReference], [currentSourceHash], [contentHash], [createdBy]) OUTPUT INSERTED.[id] VALUES (@0, @1, @2, @3, @4, @5, @6)`, [input.employeeId, revision, reason, evidenceReference, input.currentSourceHash, contentHash, input.createdBy])
  const versionId = inserted[0]?.id
  if (!sqlInt(versionId)) throw new Error('لم يرجع حفظ مراجعة الأجر معرّفًا صالحًا')
  for (let offset = 0; offset < segments.length; offset += 50) {
    const parameters: unknown[] = []
    const values = segments.slice(offset, offset + 50).map((segment, index) => {
      const at = parameters.length
      parameters.push(versionId, offset + index + 1, segment.effectiveFrom, segment.effectiveTo, segment.currency, ...SALARY_HISTORY_MONEY_KEYS.map(key => segment[key]))
      return `(${Array.from({ length: 5 + SALARY_HISTORY_MONEY_KEYS.length }, (_unused, i) => i >= 5 ? `CAST(@${at + i} AS decimal(18,2))` : `@${at + i}`).join(', ')})`
    })
    await em.query(`INSERT INTO dbo.employee_salary_history ([versionId], [sequence], [effectiveFrom], [effectiveTo], [currency], ${SALARY_HISTORY_MONEY_KEYS.map(key => `[${key}]`).join(', ')}) VALUES ${values.join(', ')}`, parameters)
  }
  return readSalaryHistory(em, input.employeeId)
}

/** إثبات شهري كامل مستقل عن راتب الملف الحالي؛ لا تحويل تلقائي للتاريخ اليومي القديم. */
export async function appendMonthlySalaryHistoryRevision(em: EntityManager, input: {
  employeeId: number; reason: string; evidenceReference: string; currentSourceHash: string;
  // بدل ضغط العمل الغائب من الفترة = صفر (normalizeMonthlySalaryPeriods)
  periods: Array<Omit<MonthlySalaryPeriod, SalaryHistoryOptionalMoneyKey> & Partial<Pick<MonthlySalaryPeriod, SalaryHistoryOptionalMoneyKey>>>; cycleStartDay: number; createdBy: number
}): Promise<SalaryHistoryRead> {
  if (!em.queryRunner?.isTransactionActive) throw new Error('إضافة مراجعة الأجر تتطلب معاملة نشطة')
  if (!sqlInt(input.employeeId) || !sqlInt(input.createdBy) || !hex(input.currentSourceHash)) invalid('SALARY_HISTORY_IDENTITY_INVALID', 'هوية إثبات الأجر وبصمة المصدر غير صالحتين')
  const reason = salaryHistoryText(input.reason, 500, 'سبب إثبات الأجر'), evidenceReference = salaryHistoryText(input.evidenceReference, 200, 'مرجع مستند الأجر')
  const segments = normalizeMonthlySalaryPeriods(input.periods, input.cycleStartDay)
  await lockPayrollEmployees(em, [input.employeeId])
  const previous = await readSalaryHistory(em, input.employeeId)
  if (previous.revision >= 2147483647) throw new ConflictException({ code: 'SALARY_HISTORY_REVISION_LIMIT', message: 'وصل سجل الأجر إلى الحد الأقصى للمراجعات' })
  const revision = previous.revision + 1, createdAt = new Date().toISOString()
  const contentHash = monthlySalaryHistoryContentHash({ employeeId: input.employeeId, revision, reason, evidenceReference, currentSourceHash: input.currentSourceHash, cycleStartDay: input.cycleStartDay, segments, createdBy: input.createdBy, createdAt })
  // الفاعل والتوقيت داخل بصمةV2؛ نكتب التوقيت نفسه ولا نعتمد على DEFAULT قد يختلف عنه.
  const inserted = await em.query(`INSERT INTO dbo.employee_salary_history_versions ([employeeId], [revision], [reason], [evidenceReference], [currentSourceHash], [contentHash], [createdBy], [contractVersion], [cycleStartDay], [createdAt]) OUTPUT INSERTED.[id] VALUES (@0, @1, @2, @3, @4, @5, @6, @7, @8, CAST(@9 AS datetime2))`, [input.employeeId, revision, reason, evidenceReference, input.currentSourceHash, contentHash, input.createdBy, PAYROLL_MONTHLY_SALARY_HISTORY_VERSION, input.cycleStartDay, createdAt])
  const versionId = inserted[0]?.id
  if (!sqlInt(versionId)) throw new Error('لم يرجع حفظ مراجعة الأجر معرّفًا صالحًا')
  for (let offset = 0; offset < segments.length; offset += 50) {
    const parameters: unknown[] = []
    const values = segments.slice(offset, offset + 50).map((segment, index) => {
      const at = parameters.length
      parameters.push(versionId, offset + index + 1, segment.effectiveFrom, segment.effectiveTo, segment.currency, segment.effectivePayrollPeriod, segment.effectiveToPayrollPeriod, ...SALARY_HISTORY_MONEY_KEYS.map(key => segment[key]))
      return `(${Array.from({ length: 7 + SALARY_HISTORY_MONEY_KEYS.length }, (_unused, i) => i >= 7 ? `CAST(@${at + i} AS decimal(18,2))` : `@${at + i}`).join(', ')})`
    })
    await em.query(`INSERT INTO dbo.employee_salary_history ([versionId], [sequence], [effectiveFrom], [effectiveTo], [currency], [effectivePayrollPeriod], [effectiveToPayrollPeriod], ${SALARY_HISTORY_MONEY_KEYS.map(key => `[${key}]`).join(', ')}) VALUES ${values.join(', ')}`, parameters)
  }
  return readSalaryHistory(em, input.employeeId)
}

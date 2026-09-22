import { Repository } from 'typeorm'
import { Employee } from '../employees/employee.entity'
import { DirectoryUser } from './directory.types'

// ===== مطابقة حساب المجال بالموظف — مصدر واحد للحقيقة =====
// الدخول الحيّ (الربط في لحظته) والمزامنة الجماعية بيستخدموا **نفس** الترتيب ونفس التطبيع ونفس الرفض
// بالحرف. أي فرق بين الاتنين = حساب بيتعمل في المزامنة ومايعرفش يدخل، أو العكس.
//
// الترتيب (أول ما ينجح بيوقف):
//   1) AD employeeID → employees.employeeCode
//   2) AD employeeID → employees.fingerprintCode
//   3) AD mail       → employees.email
//   4) الـUPN        → employees.email
//
// ليه البصمة في الترتيب: في الدليل الحيّ (827 كائن، 653 مفعّل) خاصية employeeID مكتوبة على 523 حساب،
// ولما طابقناها بـ616 موظف طلع **43 بكود الموظف و323 برقم البصمة**. يعني الـIT كتب رقم البصمة في
// الخانة دي أكتر بكتير من كود الموظف — فبدون الخطوة التانية 323 موظف مش هيتطابقوا خالص.
//
// التطبيع: قصّ المسافات، وبلا تفريق بين حالة الأحرف. وللكود/البصمة **بس**: الأصفار البادئة مالهاش
// قيمة — «00123» نفس «123» (أجهزة البصمة بتصفّر لعرض ثابت، والـIT بيكتب الرقم بإيده). البريد
// مابنشيلش منه أي صفر: «0x@y.com» عنوان مختلف عن «x@y.com».
//
// قيمة بتطابق أكتر من موظف = **غموض**: رفض صريح ومفيش تخمين، ومفيش رجوع للخطوة اللي بعدها
// (لو employeeID بيطابق موظفين بالبصمة، ممنوع نكمّل بالبريد ونختار حد — الرقم نفسه مش موثوق).

/** حالات الموظف اللي مايتعملّهاش حساب ولا تدخل: أرشيف أو خدمة منتهية. */
export const BLOCKED_EMPLOYEE_STATUS = new Set(['archived', 'terminated'])

/** طول عمودي الكود والبصمة في employee.entity — بيحدّد أقصى تصفير بادئ ممكن يكون مخزَّن. */
export const EMPLOYEE_CODE_LENGTH = 20
export const FINGERPRINT_CODE_LENGTH = 40

/** المفتاح اللي المقارنة بتحصل عليه: بلا مسافات أطراف وبلا تفريق حالة أحرف. */
const trimLower = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : ''

/**
 * مفتاح الكود/رقم البصمة: زي trimLower + الأصفار البادئة بتتشال (بيفضل حرف واحد على الأقل،
 * فـ«000» بتبقى «0» ومابتبقاش فاضية وتطابق كل حاجة).
 */
export const normalizeCodeKey = (value: unknown): string => trimLower(value).replace(/^0+(?=.)/, '')

/** مفتاح البريد: قصّ وتوحيد حالة الأحرف بس — الأصفار جزء من العنوان. */
export const normalizeEmailKey = (value: unknown): string => trimLower(value)

/**
 * كل القيم اللي ممكن تكون مخزّنة في العمود وبتطبّع لنفس المفتاح: المفتاح نفسه ومسبوقًا بأصفار
 * لحد طول العمود. بكده «المقارنة بلا أصفار بادئة» تتعمل على قيم كاملة (تقدر تستخدم الفهرس)
 * بدل دالة على العمود، والفهرس الداخلي والقاعدة بيجاوبوا نفس الجواب بالحرف.
 */
export function codeMatchCandidates(key: string, columnLength: number): string[] {
  if (!key) return []
  const out = [key]
  for (let pad = 1; key.length + pad <= columnLength; pad++) out.push('0'.repeat(pad) + key)
  return out
}

/** الخانة اللي المطابقة نجحت بيها — بتتقال للمالك في تقرير المزامنة. */
export type DomainMatchVia = 'employeeCode' | 'fingerprintCode' | 'mail' | 'userPrincipalName'

export const DOMAIN_MATCH_VIA_LABELS: Record<DomainMatchVia, string> = {
  employeeCode: 'كود الموظف (AD employeeID)',
  fingerprintCode: 'رقم البصمة (AD employeeID)',
  mail: 'بريد العمل (AD mail)',
  userPrincipalName: 'اسم الدخول الكامل (UPN)',
}

export type DomainMatch =
  | { kind: 'matched'; via: DomainMatchVia; value: string; employee: Employee }
  | { kind: 'ambiguous'; via: DomainMatchVia; value: string; employees: Employee[] }
  | { kind: 'none' }

/** مصدر الموظفين للمطابقة: القاعدة في الدخول الحيّ، وفهرس في الذاكرة في المزامنة الجماعية. */
export interface EmployeeMatchSource {
  /** كل موظف قيمة employeeCode بتاعته واحدة من المرشّحات (بعد قصّ المسافات وتوحيد الحالة) */
  byEmployeeCode(candidates: readonly string[]): Promise<Employee[]>
  byFingerprintCode(candidates: readonly string[]): Promise<Employee[]>
  /** كل موظف بريده = القيمة المطبَّعة بالظبط */
  byEmail(value: string): Promise<Employee[]>
}

const dedupeById = (rows: Employee[]): Employee[] => {
  const seen = new Map<number, Employee>()
  for (const row of rows) if (!seen.has(row.id)) seen.set(row.id, row)
  return [...seen.values()]
}

const decide = (via: DomainMatchVia, value: string, rows: Employee[]): DomainMatch | null => {
  const unique = dedupeById(rows)
  if (unique.length === 1) return { kind: 'matched', via, value, employee: unique[0] }
  if (unique.length > 1) return { kind: 'ambiguous', via, value, employees: unique }
  return null
}

/**
 * الموظف المقابل لحساب المجال — بالترتيب المعلن فوق. مابيرميش أي استثناء: المتصل هو اللي
 * يحوّل النتيجة لرفض عربي (الدخول) أو لسبب في التقرير (المزامنة).
 */
export async function matchEmployeeForDirectory(
  directory: Pick<DirectoryUser, 'employeeId' | 'mail' | 'userPrincipalName'>,
  source: EmployeeMatchSource
): Promise<DomainMatch> {
  const codeKey = normalizeCodeKey(directory.employeeId)
  if (codeKey) {
    const byCode = await source.byEmployeeCode(codeMatchCandidates(codeKey, EMPLOYEE_CODE_LENGTH))
    const code = decide('employeeCode', codeKey, byCode)
    if (code) return code
    const byFingerprint = await source.byFingerprintCode(
      codeMatchCandidates(codeKey, FINGERPRINT_CODE_LENGTH)
    )
    const fingerprint = decide('fingerprintCode', codeKey, byFingerprint)
    if (fingerprint) return fingerprint
  }
  for (const via of ['mail', 'userPrincipalName'] as const) {
    const value = normalizeEmailKey(via === 'mail' ? directory.mail : directory.userPrincipalName)
    if (!value) continue
    const outcome = decide(via, value, await source.byEmail(value))
    if (outcome) return outcome
  }
  return { kind: 'none' }
}

/**
 * مصدر على القاعدة — للدخول الحيّ: استعلام لكل خطوة بدل تحميل جدول الموظفين كامل في كل دخول.
 * LOWER+TRIM على العمودين الجهتين عشان يجاوب نفس جواب الفهرس الداخلي بالحرف.
 */
export function employeeRepositoryMatchSource(
  employees: Repository<Employee>
): EmployeeMatchSource {
  const byColumn = async (
    column: 'employeeCode' | 'fingerprintCode',
    candidates: readonly string[]
  ): Promise<Employee[]> => {
    if (candidates.length === 0) return []
    return employees
      .createQueryBuilder('e')
      .where(`LOWER(LTRIM(RTRIM(e.${column}))) IN (:...candidates)`, {
        candidates: [...candidates],
      })
      .getMany()
  }
  return {
    byEmployeeCode: (candidates) => byColumn('employeeCode', candidates),
    byFingerprintCode: (candidates) => byColumn('fingerprintCode', candidates),
    byEmail: (value) =>
      employees
        .createQueryBuilder('e')
        .where('LOWER(LTRIM(RTRIM(e.email))) = :value', { value })
        .getMany(),
  }
}

/**
 * فهرس في الذاكرة — للمزامنة الجماعية: 827 حساب مجال × 616 موظف = استعلام واحد بدل آلاف.
 * المفاتيح مخزّنة مطبَّعة، فأي مرشّح من مرشّحات الأصفار بيطبّع لنفس المفتاح ويلاقي نفس الصفوف.
 */
export function employeeMatchIndex(employees: readonly Employee[]): EmployeeMatchSource {
  const byCode = new Map<string, Employee[]>()
  const byFingerprint = new Map<string, Employee[]>()
  const byEmail = new Map<string, Employee[]>()
  const push = (map: Map<string, Employee[]>, key: string, row: Employee) => {
    if (!key) return
    const list = map.get(key)
    if (list) list.push(row)
    else map.set(key, [row])
  }
  for (const employee of employees) {
    push(byCode, normalizeCodeKey(employee.employeeCode), employee)
    push(byFingerprint, normalizeCodeKey(employee.fingerprintCode), employee)
    push(byEmail, normalizeEmailKey(employee.email), employee)
  }
  const collect = (map: Map<string, Employee[]>, candidates: readonly string[]): Employee[] => {
    const out: Employee[] = []
    for (const candidate of candidates) out.push(...(map.get(normalizeCodeKey(candidate)) ?? []))
    return out
  }
  return {
    byEmployeeCode: async (candidates) => collect(byCode, candidates),
    byFingerprintCode: async (candidates) => collect(byFingerprint, candidates),
    byEmail: async (value) => byEmail.get(value) ?? [],
  }
}

/**
 * الموظف مقفول قدّام أي حساب؟ 'ended' = أرشيف أو خدمة منتهية، 'inactive' = غير نشط،
 * null = مفتوح. نفس القاعدة في الدخول (رفض) وفي المزامنة (تخطّي بسبب).
 */
export function employeeBlockReason(employee: Employee): 'ended' | 'inactive' | null {
  if (BLOCKED_EMPLOYEE_STATUS.has(String(employee.status)) || employee.archivedAt) return 'ended'
  if (employee.isActive === false) return 'inactive'
  return null
}

import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { Column, Entity, PrimaryGeneratedColumn, type EntityManager } from 'typeorm'
import { DocType } from '../assets/assets.entities'
import { closeRenewalTask } from '../assets/document-expiry'
import { raiseDependentRemoval } from '../benefits/insurance-members'
import { localDateOf } from '../attendance/attendance.service'
import { recordEmployeeChange } from '../employees/employee-change-log'
import { Employee } from '../employees/employee.entity'

// B3.14: سجل المعالين — الكيان والقواعد وعمليات السجل. العمليات بـem بس (جوه معاملة اللي بيناديها): بتستخدمها خدمة الموارد البشرية ووجهة
// طلب «تحديث المعالين». كل كتابة تحت قفل صف الموظف (وبعده صف المعال)، والحكم كله بيتعاد تحت القفل. هوية المعال مستند موظف بتاريخ انتهاء
// (تنبيهات B2.15 شغالة عليه)، وكل تغيير سطر في سجل تغييرات ملف الموظف.

export const DEPENDENT_RELATIONS = ['SPOUSE', 'SON', 'DAUGHTER', 'FATHER', 'MOTHER', 'OTHER'] as const
export type DependentRelation = (typeof DEPENDENT_RELATIONS)[number]
export const DEPENDENT_GENDERS = ['MALE', 'FEMALE'] as const
export type DependentGender = (typeof DEPENDENT_GENDERS)[number]
export type DependentStatus = 'ACTIVE' | 'REMOVED'

@Entity('dependents')
export class Dependent {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_dependents' })
  id: number

  @Column({ type: 'int' })
  employeeId: number

  @Column({ type: 'nvarchar', length: 150 })
  nameAr: string

  @Column({ type: 'nvarchar', length: 150, nullable: true })
  nameEn: string | null

  @Column({ type: 'nvarchar', length: 20 })
  relation: DependentRelation

  @Column({ type: 'date', nullable: true })
  birthDate: string | null

  @Column({ type: 'nvarchar', length: 30, nullable: true })
  nationalId: string | null

  @Column({ type: 'nvarchar', length: 10, nullable: true })
  gender: DependentGender | null

  @Column({ type: 'bit' })
  isInsured: boolean

  // مستند هوية المعال (employee_documents.id)
  @Column({ type: 'int', nullable: true })
  documentId: number | null

  @Column({ type: 'nvarchar', length: 20 })
  status: DependentStatus

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  removeReason: string | null

  // الطلب اللي أضافه (لو من طلب «تحديث المعالين»)
  @Column({ type: 'int', nullable: true })
  requestId: number | null

  @Column({ type: 'int', nullable: true })
  createdByUserId: number | null

  @Column({ type: 'datetime2' })
  createdAt: Date

  @Column({ type: 'datetime2', nullable: true })
  updatedAt: Date | null
}

export const DEPENDENTS_PERMISSION = 'dependents.manage'
export const DEPENDENTS_MIGRATION_MISSING = 'سجل المعالين محتاج ترحيل 20261009_132 على قاعدة البيانات'
export const DEPENDENT_NOT_FOUND = 'المعال غير موجود'
export const DEPENDENT_EMPLOYEE = 'الموظف غير موجود'
export const DEPENDENT_NAME = 'اسم المعال مطلوب (من 2 لـ150 حرف)'
export const DEPENDENT_NAME_EN = 'اسم المعال بالإنجليزي 150 حرف بالكتير'
export const DEPENDENT_RELATION = 'اختار صلة القرابة'
export const DEPENDENT_BIRTH = 'تاريخ الميلاد تاريخ صحيح مش بعد النهارده'
export const DEPENDENT_ID_NUMBER = 'رقم هوية المعال من 3 لـ30 حرف'
export const DEPENDENT_GENDER = 'الجنس: ذكر أو أنثى'
export const DEPENDENT_INSURED = '«مشمول بالتأمين» نعم أو لا'
export const DEPENDENT_ID_EXPIRY = 'تاريخ انتهاء هوية المعال تاريخ صحيح'
export const DEPENDENT_DUPLICATE = 'فيه معال مسجّل للموظف بنفس رقم الهوية'
export const DEPENDENT_REASON = 'سبب الحذف مطلوب (من 3 لـ300 حرف)'
export const DEPENDENT_NOTHING = 'مفيش بيانات اتغيّرت'
export const DEPENDENT_ID_CODE = 'DEPENDENT_ID'
export const DEPENDENT_ID_NAME = 'هوية معال'
export const DEPENDENT_RELATION_LABELS: Record<DependentRelation, string> = { SPOUSE: 'زوج/زوجة', SON: 'ابن', DAUGHTER: 'ابنة', FATHER: 'أب', MOTHER: 'أم', OTHER: 'أخرى' }
export const DEPENDENT_GENDER_LABELS: Record<DependentGender, string> = { MALE: 'ذكر', FEMALE: 'أنثى' }

let ready: boolean | null = null
/** جدول ترحيل 132 موجود؟ الموجود بيتحفظ */
export async function dependentsReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.dependents', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetDependentsCache() { ready = null }

// ===== المنظّفات =====

const line = (raw: unknown): string => (typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : '')
const blank = (raw: unknown): boolean => raw === null || raw === undefined || raw === ''
export const validDay = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const time = Date.parse(`${value}T12:00:00Z`)
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value
}

export interface DependentInput {
  nameAr?: unknown; nameEn?: unknown; relation?: unknown; birthDate?: unknown; nationalId?: unknown; gender?: unknown; isInsured?: unknown; idExpiryDate?: unknown
}
export interface DependentValues {
  nameAr?: string; nameEn?: string | null; relation?: DependentRelation; birthDate?: string | null; nationalId?: string | null; gender?: DependentGender | null; isInsured?: boolean
  /** تاريخ انتهاء مستند الهوية: بيتكتب على المستند مش على صف المعال */
  idExpiryDate?: string
}

/**
 * قيم معال نضيفة. `full` = إضافة (الاسم والقرابة إلزاميين، والغايب من الاختياري فاضي)؛ من غيرها = تعديل (المبعوت بس، والفاضي بيفضّي الاختياري).
 * تاريخ انتهاء الهوية الفاضي بيتساب (المستند مابيتمسحش من هنا).
 */
export function cleanDependentValues(raw: DependentInput, full: boolean, today: string): DependentValues {
  const out: DependentValues = {}
  if (full || raw.nameAr !== undefined) {
    const name = line(raw.nameAr)
    if (name.length < 2 || name.length > 150) throw new BadRequestException(DEPENDENT_NAME)
    out.nameAr = name
  }
  if (full || raw.nameEn !== undefined) {
    if (!blank(raw.nameEn) && typeof raw.nameEn !== 'string') throw new BadRequestException(DEPENDENT_NAME_EN)
    const name = line(raw.nameEn)
    if (name.length > 150) throw new BadRequestException(DEPENDENT_NAME_EN)
    out.nameEn = name || null
  }
  if (full || raw.relation !== undefined) {
    if (typeof raw.relation !== 'string' || !(DEPENDENT_RELATIONS as readonly string[]).includes(raw.relation)) throw new BadRequestException(DEPENDENT_RELATION)
    out.relation = raw.relation as DependentRelation
  }
  if (full || raw.birthDate !== undefined) {
    if (blank(raw.birthDate)) out.birthDate = null
    else {
      if (!validDay(raw.birthDate) || raw.birthDate > today || raw.birthDate < '1900-01-01') throw new BadRequestException(DEPENDENT_BIRTH)
      out.birthDate = raw.birthDate
    }
  }
  if (full || raw.nationalId !== undefined) {
    if (blank(raw.nationalId)) out.nationalId = null
    else {
      const value = line(raw.nationalId)
      if (typeof raw.nationalId !== 'string' || value.length < 3 || value.length > 30) throw new BadRequestException(DEPENDENT_ID_NUMBER)
      out.nationalId = value
    }
  }
  if (full || raw.gender !== undefined) {
    if (blank(raw.gender)) out.gender = null
    else {
      if (typeof raw.gender !== 'string' || !(DEPENDENT_GENDERS as readonly string[]).includes(raw.gender)) throw new BadRequestException(DEPENDENT_GENDER)
      out.gender = raw.gender as DependentGender
    }
  }
  if (raw.isInsured !== undefined) {
    if (typeof raw.isInsured !== 'boolean') throw new BadRequestException(DEPENDENT_INSURED)
    out.isInsured = raw.isInsured
  } else if (full) out.isInsured = false
  if (!blank(raw.idExpiryDate)) {
    if (!validDay(raw.idExpiryDate) || raw.idExpiryDate < '1900-01-01' || raw.idExpiryDate > '2200-12-31') throw new BadRequestException(DEPENDENT_ID_EXPIRY)
    out.idExpiryDate = raw.idExpiryDate
  }
  return out
}

export function cleanRemoveReason(raw: unknown): string {
  const value = line(raw)
  if (value.length < 3 || value.length > 300) throw new BadRequestException(DEPENDENT_REASON)
  return value
}

// ===== العرض =====

const day = (value: unknown): string | null => (value === null || value === undefined ? null : String(value).slice(0, 10))

export async function dependentViews(em: EntityManager, rows: Dependent[]) {
  const ids = rows.map((row) => row.documentId).filter((id): id is number => !!id)
  // التاريخ نص من القاعدة (yyyy-mm-dd): الاستعلام الخام بيرجّع Date بتوقيت الجهاز
  const documents: Array<{ id: number; expiryDate: string | null }> = ids.length
    ? await em.query(`SELECT [id], CONVERT(char(10), [expiryDate], 23) AS [expiryDate] FROM [employee_documents] WHERE [id] IN (${ids.map((_, index) => `@${index}`).join(', ')})`, ids) : []
  const expiry = new Map(documents.map((row) => [Number(row.id), row.expiryDate ?? null]))
  return rows.map((row) => ({ id: row.id, employeeId: row.employeeId, nameAr: row.nameAr, nameEn: row.nameEn ?? null, relation: row.relation, relationLabel: DEPENDENT_RELATION_LABELS[row.relation] ?? row.relation,
    birthDate: day(row.birthDate), nationalId: row.nationalId ?? null, gender: row.gender ?? null, genderLabel: row.gender ? DEPENDENT_GENDER_LABELS[row.gender] ?? row.gender : null,
    isInsured: row.isInsured === true, documentId: row.documentId ?? null, idExpiryDate: row.documentId ? expiry.get(row.documentId) ?? null : null, status: row.status }))
}

export const activeDependents = (em: EntityManager, employeeId: number) => em.getRepository(Dependent).find({ where: { employeeId, status: 'ACTIVE' }, order: { id: 'ASC' } })

// ===== العمليات (جوه معاملة اللي بيناديها) =====

export interface DependentActor {
  /** الحساب اللي عمل التغيير (0 = النظام باعتماد طلب) */
  userId: number
  requestId?: number | null
  /** حكم على الموظف بعد قفل صفه (نطاق الفروع مثلًا) — false = «غير موجود» */
  allow?: (employee: Employee) => boolean
}

/** نوع مستند «هوية معال» من كتالوج المستندات (بيتعمل أول مرة) — تحت قفل مدى على كوده واسمه */
async function idDocumentType(em: EntityManager): Promise<string> {
  const rows: Array<{ code: string }> = await em.query('SELECT [code] FROM [doc_types] WITH (UPDLOCK, HOLDLOCK) WHERE [code] = @0 OR [nameAr] = @1', [DEPENDENT_ID_CODE, DEPENDENT_ID_NAME])
  if (rows.length) return rows.find((row) => row.code === DEPENDENT_ID_CODE)?.code ?? rows[0].code
  await em.getRepository(DocType).insert({ code: DEPENDENT_ID_CODE, nameAr: DEPENDENT_ID_NAME, isActive: true, requiredForHiring: false })
  return DEPENDENT_ID_CODE
}

/** مستند هوية المعال: بيتحدّث تاريخه ورقمه لو موجود (الأعمدة دي بس)، وإلا بيتسجّل — وبيرجّع رقمه */
async function writeIdDocument(em: EntityManager, row: Pick<Dependent, 'employeeId' | 'documentId' | 'nameAr' | 'nationalId'>, expiryDate: string | undefined, actorUserId: number): Promise<number | null> {
  const [current]: Array<{ id: number }> = row.documentId
    ? await em.query('SELECT [id] FROM [employee_documents] WITH (UPDLOCK, ROWLOCK) WHERE [id] = @0 AND [employeeId] = @1', [row.documentId, row.employeeId]) : []
  if (current) {
    const sets = ['[number] = @1'], params: unknown[] = [Number(current.id), row.nationalId ?? null]
    if (expiryDate) { params.push(expiryDate); sets.push(`[expiryDate] = @${params.length - 1}`) }
    await em.query(`UPDATE [employee_documents] SET ${sets.join(', ')} WHERE [id] = @0`, params)
    // تاريخ جديد لسه ساري: مهمة تجديد المستند المفتوحة (لو فيه) بتتقفل
    if (expiryDate && expiryDate > localDateOf(new Date())) await closeRenewalTask(em, Number(current.id), { sub: actorUserId })
    return Number(current.id)
  }
  if (!expiryDate) return null
  const code = await idDocumentType(em)
  const [made]: Array<{ id: number }> = await em.query(
    'INSERT INTO [employee_documents] ([employeeId], [docType], [number], [issueDate], [expiryDate], [notes]) OUTPUT INSERTED.[id] VALUES (@0, @1, @2, NULL, @3, @4)',
    [row.employeeId, code, row.nationalId ?? null, expiryDate, `هوية المعال: ${row.nameAr}`.slice(0, 500)])
  return Number(made.id)
}

/** قفل صف الموظف والحكم عليه تحته — وإلا «غير موجود» */
async function lockedEmployee(em: EntityManager, employeeId: number, actor: DependentActor, missing: string): Promise<Employee> {
  const employee = await em.getRepository(Employee).findOne({ where: { id: employeeId }, lock: { mode: 'pessimistic_write' } })
  if (!employee || (actor.allow && !actor.allow(employee))) throw new NotFoundException(missing)
  return employee
}

async function assertNoDuplicate(em: EntityManager, employeeId: number, nationalId: string | null | undefined, exceptId: number | null) {
  if (!nationalId) return
  const same = await em.getRepository(Dependent).find({ where: { employeeId, nationalId, status: 'ACTIVE' } })
  if (same.some((row) => row.id !== exceptId)) throw new ConflictException(DEPENDENT_DUPLICATE)
}

const describe = (row: Pick<Dependent, 'nameAr' | 'relation'>) => `${row.nameAr} (${DEPENDENT_RELATION_LABELS[row.relation] ?? row.relation})`

/** إضافة معال لموظف — تحت قفل صف الموظف: رقم الهوية مش مكرر له، ومستند الهوية لو له تاريخ انتهاء، وسطر في سجل التغييرات */
export async function addDependent(em: EntityManager, employeeId: number, values: DependentValues, actor: DependentActor): Promise<number> {
  await lockedEmployee(em, employeeId, actor, DEPENDENT_EMPLOYEE)
  await assertNoDuplicate(em, employeeId, values.nationalId, null)
  const fields = { employeeId, nameAr: values.nameAr as string, nameEn: values.nameEn ?? null, relation: values.relation as DependentRelation, birthDate: values.birthDate ?? null, nationalId: values.nationalId ?? null,
    gender: values.gender ?? null, isInsured: values.isInsured === true }
  const made = await em.getRepository(Dependent).insert({ ...fields, documentId: null, status: 'ACTIVE', removeReason: null, requestId: actor.requestId ?? null, createdByUserId: actor.userId || null, createdAt: new Date(), updatedAt: null })
  const id = made.identifiers[0].id as number
  const documentId = await writeIdDocument(em, { ...fields, documentId: null }, values.idExpiryDate, actor.userId)
  if (documentId) await em.getRepository(Dependent).update({ id }, { documentId })
  await recordEmployeeChange(em, { employeeId, fieldName: 'dependents', oldValue: null, newValue: `إضافة: ${describe(fields)}`, changeType: 'DATA', requestId: actor.requestId ?? null, changedByUserId: actor.userId || null })
  return id
}

/** صف المعال الساري تحت القفل (الموظف ثم المعال) — وإلا «غير موجود». `ownerId` = المعال لازم يكون للموظف ده */
async function lockedDependent(em: EntityManager, dependentId: number, actor: DependentActor, ownerId: number | null): Promise<Dependent> {
  const seen = await em.getRepository(Dependent).findOne({ where: { id: dependentId } })
  if (!seen || (ownerId !== null && seen.employeeId !== ownerId)) throw new NotFoundException(DEPENDENT_NOT_FOUND)
  await lockedEmployee(em, seen.employeeId, actor, DEPENDENT_NOT_FOUND)
  const row = await em.getRepository(Dependent).findOne({ where: { id: dependentId }, lock: { mode: 'pessimistic_write' } })
  if (!row || row.status !== 'ACTIVE' || row.employeeId !== seen.employeeId) throw new NotFoundException(DEPENDENT_NOT_FOUND)
  return row
}

const CHANGE_LABELS: Record<string, string> = { nameAr: 'الاسم', nameEn: 'الاسم بالإنجليزي', relation: 'القرابة', birthDate: 'تاريخ الميلاد', nationalId: 'رقم الهوية', gender: 'الجنس', isInsured: 'التأمين' }

/** تعديل معال ساري — تحت القفل: المبعوت بس بيتكتب، ومستند الهوية بيتحدّث معاه، وسطر في سجل التغييرات باللي اتغيّر */
export async function updateDependent(em: EntityManager, dependentId: number, values: DependentValues, actor: DependentActor, ownerId: number | null = null): Promise<number> {
  const row = await lockedDependent(em, dependentId, actor, ownerId)
  const { idExpiryDate, ...columns } = values
  const changed = (Object.keys(columns) as Array<keyof typeof columns>).filter((key) => (key === 'birthDate' ? day(row.birthDate) : key === 'isInsured' ? row.isInsured === true : row[key] ?? null) !== (columns[key] ?? null))
  if (!changed.length && !idExpiryDate) throw new BadRequestException(DEPENDENT_NOTHING)
  if (changed.includes('nationalId')) await assertNoDuplicate(em, row.employeeId, columns.nationalId, row.id)
  const next = { ...row, ...Object.fromEntries(changed.map((key) => [key, columns[key]])) } as Dependent
  if (changed.length) await em.getRepository(Dependent).update({ id: row.id }, { ...Object.fromEntries(changed.map((key) => [key, columns[key]])), updatedAt: new Date() })
  if (idExpiryDate || (row.documentId && changed.includes('nationalId'))) {
    const documentId = await writeIdDocument(em, next, idExpiryDate, actor.userId)
    if (documentId && documentId !== row.documentId) await em.getRepository(Dependent).update({ id: row.id }, { documentId, updatedAt: new Date() })
  }
  const what = [...changed.map((key) => CHANGE_LABELS[key] ?? key), ...(idExpiryDate ? ['انتهاء الهوية'] : [])].join('، ')
  await recordEmployeeChange(em, { employeeId: row.employeeId, fieldName: 'dependents', oldValue: describe(row), newValue: `تعديل: ${describe(next)} — ${what}`, changeType: 'DATA', requestId: actor.requestId ?? null,
    changedByUserId: actor.userId || null })
  return row.id
}

/** حذف معال ساري (تعليم بسببه — الصف بيفضل) — تحت القفل، وسطر في سجل التغييرات */
export async function removeDependent(em: EntityManager, dependentId: number, reason: string, actor: DependentActor, ownerId: number | null = null): Promise<number> {
  const row = await lockedDependent(em, dependentId, actor, ownerId)
  await em.getRepository(Dependent).update({ id: row.id }, { status: 'REMOVED', removeReason: reason, updatedAt: new Date() })
  // B5.2 (ب): المعال المشترك في التأمين: طلب حذف لشركة التأمين (من غير اشتراك ساري = ولا حاجة)
  await raiseDependentRemoval(em, row.employeeId, row.id, actor.userId || 0)
  await recordEmployeeChange(em, { employeeId: row.employeeId, fieldName: 'dependents', oldValue: describe(row), newValue: 'حذف', changeType: 'DATA', reason, requestId: actor.requestId ?? null, changedByUserId: actor.userId || null })
  return row.id
}

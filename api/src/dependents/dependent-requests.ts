import { BadRequestException, NotFoundException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { localDateOf } from '../attendance/attendance.service'
import type { Request } from '../requests/entities/request.entity'
import type { RequestType } from '../requests/entities/request-type.entity'
import {
  DEPENDENTS_MIGRATION_MISSING, DEPENDENT_GENDERS, DEPENDENT_GENDER_LABELS, DEPENDENT_RELATIONS, DEPENDENT_RELATION_LABELS, Dependent, activeDependents, addDependent, cleanDependentValues, dependentsReady,
  removeDependent, updateDependent, type DependentInput, type DependentValues,
} from './dependent-rules'

// B3.14: وجهة «تحديث المعالين» — نوع الطلب الموجود بسلسلته بياخد الوجهة دي من «أنواع الطلبات» (زي «تجديد مستند» في B2.15-ب)، والاعتماد
// النهائي بيعدّل سجل معالين صاحب الطلب: إضافة أو تعديل أو حذف. من غيرها النوع بيفضل «تسجيل فقط». كله بـem بس.

export const DEPENDENTS_REQUEST_HANDLER = 'dependents_update'
export const DEPENDENTS_REQUEST_ACTIONS = { ADD: 'إضافة معال', UPDATE: 'تعديل بيانات معال', REMOVE: 'حذف معال' } as const
type Action = keyof typeof DEPENDENTS_REQUEST_ACTIONS
export const DEPENDENTS_REQUEST_ACTION = 'اختار الإجراء: إضافة معال، تعديل بيانات معال، أو حذف معال'
export const DEPENDENTS_REQUEST_PICK = 'اختار المعال من معالينك المسجّلين'
export const DEPENDENTS_REQUEST_EMPTY = 'اكتب البيانات اللي هتتغيّر'
// (محرك الطلبات بيكمّل الرسالة: «الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات»)
export const DEPENDENTS_REQUEST_GONE = 'المعال مابقاش مسجّل للموظف'
/** مفاتيح بيكتبها الخادم وقت التقديم — مش من العميل: رقم المعال المختار */
export const DEPENDENTS_REQUEST_STAGED_KEYS = ['dependentId'] as const
export const DEPENDENTS_REQUEST_CLIENT_KEYS = ['dependentAction', 'dependent', 'dependentName', 'dependentNameEn', 'dependentRelation', 'dependentBirthDate', 'dependentNationalId', 'dependentGender',
  'dependentIdExpiry'] as const

const listOf = (value: unknown): unknown[] => { try { const parsed = typeof value === 'string' ? JSON.parse(value) : value; return Array.isArray(parsed) ? parsed : [] } catch { return [] } }
const optionOf = (row: Pick<Dependent, 'id' | 'nameAr' | 'relation'>): string => `${row.nameAr} — ${DEPENDENT_RELATION_LABELS[row.relation] ?? row.relation} (#${row.id})`
const blank = (value: unknown): boolean => value === undefined || value === null || value === ''
const codeOf = <T extends string>(labels: Record<T, string>, codes: readonly T[], value: unknown): unknown => (blank(value) ? value : codes.find((code) => labels[code] === value) ?? value)

/** معالين مقدّم الطلب الساريين باختياراتهم */
async function ownDependents(em: EntityManager, employeeId: number | null | undefined): Promise<Array<{ row: Dependent; option: string }>> {
  if (!employeeId || !(await dependentsReady(em))) return []
  return (await activeDependents(em, employeeId)).map((row) => ({ row, option: optionOf(row) }))
}

/** اختيارات خانة «المعال» في نموذج الطلب لصاحب الحساب */
export async function dependentRequestOptions(em: EntityManager, employeeId: number | null | undefined): Promise<string[]> {
  return (await ownDependents(em, employeeId)).map((entry) => entry.option)
}

/** حقول نموذج الطلب: حقول الوجهة الأول، وبعدها حقول الباني الخاصة (مفاتيح الوجهة والخادم محجوزة) */
export function dependentRequestFields(options: string[], type: Pick<RequestType, 'requiredFields' | 'customFields'>): { requiredFields: string; customFields: string } {
  const own = [
    { key: 'dependentAction', label: 'الإجراء', type: 'select', required: true, options: Object.values(DEPENDENTS_REQUEST_ACTIONS) },
    { key: 'dependent', label: 'المعال (للتعديل أو الحذف)', type: 'select', required: false, options },
    { key: 'dependentName', label: 'اسم المعال', type: 'text', required: false },
    { key: 'dependentNameEn', label: 'الاسم بالإنجليزي', type: 'text', required: false },
    { key: 'dependentRelation', label: 'صلة القرابة', type: 'select', required: false, options: DEPENDENT_RELATIONS.map((code) => DEPENDENT_RELATION_LABELS[code]) },
    { key: 'dependentBirthDate', label: 'تاريخ الميلاد', type: 'date', required: false },
    { key: 'dependentNationalId', label: 'رقم الهوية أو الإقامة', type: 'text', required: false },
    { key: 'dependentGender', label: 'الجنس', type: 'select', required: false, options: DEPENDENT_GENDERS.map((code) => DEPENDENT_GENDER_LABELS[code]) },
    { key: 'dependentIdExpiry', label: 'تاريخ انتهاء الهوية', type: 'date', required: false },
  ]
  const reserved: string[] = [...own.map((field) => field.key), ...DEPENDENTS_REQUEST_STAGED_KEYS]
  const extra = listOf(type.customFields).filter((field): field is { key: string } => !!field && typeof field === 'object' && typeof (field as { key?: unknown }).key === 'string'
    && !reserved.includes((field as { key: string }).key))
  const required = [...new Set(['dependentAction', ...listOf(type.requiredFields).filter((key): key is string => typeof key === 'string' && !(DEPENDENTS_REQUEST_STAGED_KEYS as readonly string[]).includes(key))])]
  const fields: Array<{ key: string }> = [...own, ...extra]
  for (const key of required) if (!fields.some((field) => field.key === key)) fields.push({ key, label: key, type: 'text', required: true } as { key: string })
  return { requiredFields: JSON.stringify(required), customFields: JSON.stringify(fields) }
}

/** الإجراء وقيمه من حمولة الطلب — محكوم عليها دلوقتي. الموظف مابيحددش «مشمول بالتأمين» */
function requestValues(payload: Record<string, unknown>): { action: Action; values: DependentValues } {
  const action = (Object.keys(DEPENDENTS_REQUEST_ACTIONS) as Action[]).find((key) => DEPENDENTS_REQUEST_ACTIONS[key] === payload.dependentAction)
  if (!action) throw new BadRequestException(DEPENDENTS_REQUEST_ACTION)
  if (action === 'REMOVE') return { action, values: {} }
  const input: DependentInput = {}
  const set = (key: keyof DependentInput, value: unknown) => { if (action === 'ADD' ? value !== undefined : !blank(value)) input[key] = value }
  set('nameAr', payload.dependentName)
  set('nameEn', payload.dependentNameEn)
  set('relation', codeOf(DEPENDENT_RELATION_LABELS, DEPENDENT_RELATIONS, payload.dependentRelation))
  set('birthDate', payload.dependentBirthDate)
  set('nationalId', payload.dependentNationalId)
  set('gender', codeOf(DEPENDENT_GENDER_LABELS, DEPENDENT_GENDERS, payload.dependentGender))
  set('idExpiryDate', payload.dependentIdExpiry)
  const values = cleanDependentValues(input, action === 'ADD', localDateOf(new Date()))
  if (action === 'UPDATE' && !Object.keys(values).length) throw new BadRequestException(DEPENDENTS_REQUEST_EMPTY)
  return { action, values }
}

/**
 * وقت التقديم (وكل إعادة تقديم): الإجراء وقيمه سليمة، والمعال (للتعديل والحذف) من معالين مقدّم الطلب الساريين دلوقتي — بالاختيار، أو بالرقم
 * المتثبّت عند إعادة التقديم — وتثبيت رقمه على الطلب فوق أي قيمة من العميل.
 */
export async function stageDependentsRequest(em: EntityManager, req: Pick<Request, 'payload' | 'requesterId'>): Promise<Record<string, unknown>> {
  const { dependentId: staged, ...payload }: Record<string, unknown> = JSON.parse(req.payload || '{}')
  if (!(await dependentsReady(em))) throw new BadRequestException(DEPENDENTS_MIGRATION_MISSING)
  const { action } = requestValues(payload)
  if (action === 'ADD') { const { dependent: _picked, ...rest } = payload; return rest }
  const own = await ownDependents(em, req.requesterId)
  const chosen = typeof payload.dependent === 'string' ? own.find((entry) => entry.option === payload.dependent) : undefined
  // إعادة التقديم: الاختيار المتخزّن ممكن اسمه يتغيّر — الرقم المتثبّت هو المرجع لو لسه مسجّل
  const found = chosen ?? (typeof staged === 'number' ? own.find((entry) => entry.row.id === staged) : undefined)
  if (!found) throw new BadRequestException(DEPENDENTS_REQUEST_PICK)
  return { ...payload, dependent: found.option, dependentId: found.row.id }
}

/**
 * التنفيذ جوه معاملة الاعتماد النهائي: القيم بتتحكم تاني، والسجل بيتعدّل تحت قفل صف صاحب الطلب (وصف المعال) — والمعال لازم يكون لسه ساري
 * ولصاحب الطلب. إعادة تنفيذ طلب إضافة بترجّع نفس المعال.
 */
export async function executeDependentsRequest(em: EntityManager, req: Request, _type: RequestType, payload: Record<string, unknown>) {
  if (!req.requesterId) throw new BadRequestException('طلب تحديث المعالين لازم يكون له موظف')
  if (!(await dependentsReady(em))) throw new BadRequestException(DEPENDENTS_MIGRATION_MISSING)
  const { action, values } = requestValues(payload)
  // باعتماد الطلب (0 = النظام)، وسطر التغيير شايل رقمه
  const actor = { userId: 0, requestId: req.id }
  if (action === 'ADD') {
    const existing = await em.getRepository(Dependent).findOne({ where: { requestId: req.id } })
    return { ref: `DEP-${existing ? existing.id : await addDependent(em, req.requesterId, values, actor)}`, completed: true }
  }
  const dependentId = typeof payload.dependentId === 'number' ? payload.dependentId : NaN
  if (!Number.isSafeInteger(dependentId)) throw new BadRequestException(DEPENDENTS_REQUEST_GONE)
  try {
    if (action === 'UPDATE') await updateDependent(em, dependentId, values, actor, req.requesterId)
    else await removeDependent(em, dependentId, (typeof payload.reason === 'string' && payload.reason.replace(/\s+/g, ' ').trim().slice(0, 300)) || 'بطلب الموظف', actor, req.requesterId)
  } catch (error) {
    if (error instanceof NotFoundException) throw new BadRequestException(DEPENDENTS_REQUEST_GONE)
    throw error
  }
  return { ref: `DEP-${dependentId}`, completed: true }
}

// «ملفي الشخصي» (قرار المالك 30 سبتمبر):
//  • «تعديل الملف» = طلب «تحديث بيانات شخصية» بالخانات اللي اتغيرت بس — بيمشي في سلسلة اعتماده ويتطبق بعد الاعتماد.
//    القايمة والقواعد من ملف الخادم الصرف (employee-personal-data.ts) — الشاشة والخادم بيفحصوا بنفس القاعدة.
//  • الصورة الشخصية: الموظف يرفعها لنفسه من غير اعتماد (PUT /employees/me/photo).
import { apiFetch, createRequest, uploadFile, type ApiEmployee, type ApiRequest, type ApiRequestType } from './api'
import { personalDataChanges, personalDataIssue, personalDataStoredValue, PERSONAL_DATA_FIELDS, type PersonalDataChange,
  type PersonalDataKey } from '../../api/src/employees/employee-personal-data'

export { PERSONAL_DATA_FIELDS, PERSONAL_DATA_SECTIONS, personalDataOptionLabel, type PersonalDataChange, type PersonalDataField,
  type PersonalDataKey } from '../../api/src/employees/employee-personal-data'
export { IDENTITY_HINT, normalizeIdentityNumber } from '../../api/src/employees/employee-required-fields'

export const PERSONAL_DATA_REQUEST_TYPE = 'PERSONAL_DATA_UPDATE'
export const BANK_CHANGE_REQUEST_TYPE = 'BANK_ACCOUNT_CHANGE'
/** رابط فتح نموذج «تغيير الحساب البنكي» في «الطلبات» مباشرة */
export const BANK_CHANGE_REQUEST_LINK = `/requests?type=${BANK_CHANGE_REQUEST_TYPE}`

// الطلب لسه ماخلصش: متقدّم أو تحت المراجعة أو راجع للتصحيح أو اتعتمد ولسه بيتنفذ — طلب تاني عليه = تكرار
export const PENDING_REQUEST_STATUSES: readonly string[] = ['SUBMITTED', 'UNDER_REVIEW', 'RETURNED_FOR_INFO', 'APPROVED', 'IN_EXECUTION']

/** طلب «تحديث بيانات شخصية» اللي لسه ماخلصش (الأحدث)، أو null */
export const pendingPersonalDataRequest = (requests: readonly ApiRequest[]): ApiRequest | null =>
  requests.find(request => request.typeCode === PERSONAL_DATA_REQUEST_TYPE && PENDING_REQUEST_STATUSES.includes(request.status)) ?? null

/** النوع متاح لحسابي (موجود في كتالوجي ومبني التنفيذ)؟ */
export const availableRequestType = (types: readonly ApiRequestType[], code: string): ApiRequestType | null =>
  types.find(type => type.code === code && type.isActive !== false && type.destinationSupported !== false) ?? null

export type ProfileFormValues = Record<PersonalDataKey, string>

/** قيم النموذج من الملف الحالي: الفاضي ''، والتاريخ YYYY-MM-DD. */
export function profileFormValues(employee: Partial<ApiEmployee>): ProfileFormValues {
  return Object.fromEntries(PERSONAL_DATA_FIELDS.map(field =>
    [field.key, personalDataStoredValue(field.key, (employee as Record<string, unknown>)[field.key]) ?? ''])) as ProfileFormValues
}

/** الخانات اللي اتغيرت بس — الخانة اللي اتفضّت = مسح (null)، ورقم الهوية/الجواز بنفس تطبيع الخادم. */
export function profileFormChanges(employee: Partial<ApiEmployee>, values: ProfileFormValues): PersonalDataChange[] {
  const payload = Object.fromEntries(PERSONAL_DATA_FIELDS.map(field => {
    const value = (values[field.key] ?? '').trim()
    return [field.key, value === '' ? null : value]
  }))
  return personalDataChanges(employee as Record<string, unknown>, payload)
}

/** أول مشكلة في التعديل (نفس قاعدة الخادم) أو null — التفرد بيتفحص في الخادم. */
export const profileFormIssue = (employee: Partial<ApiEmployee>, changes: readonly PersonalDataChange[], today: string): string | null =>
  personalDataIssue(changes, employee as Record<string, unknown>, today)

/** حمولة الطلب: الخانات المتغيرة بس، والمسح null. */
export const personalDataPayload = (changes: readonly PersonalDataChange[]): Record<string, string | null> =>
  Object.fromEntries(changes.map(change => [change.key, change.newValue]))

export const submitPersonalDataRequest = (changes: readonly PersonalDataChange[]) =>
  createRequest(PERSONAL_DATA_REQUEST_TYPE, personalDataPayload(changes))

// ===== الصورة الشخصية =====
export const PROFILE_PHOTO_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp']
export const PROFILE_PHOTO_MAX_BYTES = 10 * 1024 * 1024

export function profilePhotoIssue(file: { type: string; size: number }): string | null {
  if (!PROFILE_PHOTO_TYPES.includes(file.type)) return 'الصورة لازم تكون JPG أو PNG أو WEBP — اختار صورة تانية'
  if (file.size > PROFILE_PHOTO_MAX_BYTES) return 'حجم الصورة أكبر من 10 ميجا — اختار صورة أصغر'
  return null
}

/** ربط صورة مرفوعة بملفي (أو null لمسحها) — من غير اعتماد. */
export const setMyPhoto = (fileId: number | null) =>
  apiFetch<{ photoFileId: number | null }>('/employees/me/photo', { method: 'PUT', body: JSON.stringify({ fileId }) })

/** رفع الصورة كصورة موظف ثم ربطها بملفي — بيرجّع رقمها. */
export async function uploadMyPhoto(file: File): Promise<number> {
  const issue = profilePhotoIssue(file)
  if (issue) throw new Error(issue)
  const uploaded = await uploadFile(file, { entityType: 'employee_photo' })
  const saved = await setMyPhoto(uploaded.id)
  return saved?.photoFileId ?? uploaded.id
}

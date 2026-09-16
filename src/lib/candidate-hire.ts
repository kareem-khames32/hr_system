// تعيين مرشح (قرار المالك: نفس الحقول الإجبارية بتاعة إضافة موظف): زرار «تعيين» بيفتح نموذج إضافة الموظف
// متعبّي من بيانات المرشح، والحفظ بيروح لـ POST /candidates/:id/hire اللي بيتحقق من نفس الحقول.
// الاسم غير العربي بيتحط في خانات الاسم الإنجليزي، والاسم العربي بيتكتب في النموذج قبل الحفظ.
import type { EmployeeFormState } from '@/components/EmployeeForm'
import { arabicNameNeedsFullField, englishNameNeedsFullField, splitArabicName, splitEnglishName } from './employee-form-fields'

export const candidateHireHref = (candidateId: number) => `/employees/add?candidateId=${candidateId}`

/** رقم المرشح من ?candidateId= — null لو مش موجود، و'invalid' لو مكتوب غلط. */
export function candidateIdFromSearch(search: string): number | null | 'invalid' {
  const raw = new URLSearchParams(search).get('candidateId')
  if (raw === null) return null
  return /^[1-9]\d{0,9}$/.test(raw) ? Number(raw) : 'invalid'
}

export interface HireCandidateSource {
  fullName: string
  email?: string | null
  phone?: string | null
  positionTitle?: string | null
  branchId?: number | null
}

/** القيم الابتدائية لنموذج الإضافة من بيانات المرشح (الباقي يكمله المستخدم). */
export function candidateHireInitial(candidate: HireCandidateSource): Partial<EmployeeFormState> {
  const name = String(candidate.fullName ?? '').trim()
  const initial: Partial<EmployeeFormState> = { status: 'probation' }
  if (/[؀-ۿ]/.test(name)) {
    if (arabicNameNeedsFullField(name)) initial.nameArFull = name
    else {
      const ar = splitArabicName(name)
      Object.assign(initial, { firstNameAr: ar.first, fatherNameAr: ar.father, grandNameAr: ar.grand, familyNameAr: ar.family })
    }
  } else if (name) {
    if (englishNameNeedsFullField(name)) initial.nameEnFull = name
    else {
      const en = splitEnglishName(name)
      Object.assign(initial, { firstNameEn: en.first, middleNameEn: en.middle, lastNameEn: en.last })
    }
  }
  if (candidate.email?.trim()) initial.personalEmail = candidate.email.trim()
  if (candidate.phone?.trim()) initial.phone = candidate.phone.trim()
  if (candidate.positionTitle?.trim()) initial.jobTitle = candidate.positionTitle.trim()
  if (candidate.branchId != null) initial.branchId = String(candidate.branchId)
  return initial
}

/** سبب منع تعيين المرشح من الشاشة، أو null. */
export function candidateHireBlock(candidate: { stage: string } | null | undefined): string | null {
  if (!candidate) return 'المرشح غير موجود'
  if (candidate.stage === 'hired') return 'المرشح ده اتعين بالفعل'
  if (candidate.stage === 'rejected') return 'المرشح مرفوض — رجّع مرحلته الأول'
  return null
}

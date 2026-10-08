import { EntityManager, In } from 'typeorm'
import { raiseOffboardingRemovals } from '../benefits/insurance-members'
import { openAdvancesOf } from '../expenses/travel-advances'
import { CustodyAssignment } from '../requests/entities/custody.entities'
import {
  ClearanceItem,
  OffboardingCase,
  OffboardingStatus,
} from './offboarding.entities'

// الملف المفتوح (قبل الإغلاق/الإلغاء) — ملف واحد مفتوح لكل موظف
export const OPEN_CASE_STATUSES: OffboardingStatus[] = [
  'IN_CLEARANCE',
  'IN_SETTLEMENT',
  'SETTLED',
]

// عهد لم تُرجع بعد — بند العهدة لا يكتمل وهي موجودة
export const OPEN_CUSTODY_STATUSES = [
  'PENDING_ACK',
  'PENDING_MANAGER_CONFIRM',
  'ACTIVE',
  'RETURN_REQUESTED',
]

// EMP-1: فتح ملف إنهاء خدمة بجهات إخلاء الطرف الخمس — مصدر واحد للاستقالة
// المعتمدة (destinations) والإنهاء من طرف الشركة (POST /offboarding)
export async function openOffboardingCase(
  em: EntityManager,
  input: {
    employeeId: number
    lastWorkingDay: string
    // أساسي (الاستقالة/التقاعد من الطلبات) أو أي سبب اتفحص في معالج الإنهاء (أساسي أو مخصص مفعّل)
    terminationReason: string
    resignationRequestId?: number
    noticeDate?: string
    notes?: string
    exitInterviewNotes?: string
    openedBy?: number
    accessRevokedAt?: Date
  }
): Promise<OffboardingCase> {
  const repo = em.getRepository(OffboardingCase)
  const kase = await repo.save(
    repo.create({ ...input, status: 'IN_CLEARANCE' as const })
  )
  const openCustody = await em.getRepository(CustodyAssignment).count({
    where: {
      employeeId: input.employeeId,
      status: In(OPEN_CUSTODY_STATUSES),
    },
  })
  const items: Array<Pick<ClearanceItem, 'caseId' | 'party' | 'label'>> = [
    { caseId: kase.id, party: 'manager', label: 'تسليم المهام ونقل المعرفة' },
    {
      caseId: kase.id,
      party: 'custody',
      label: `إرجاع العهد والأصول${openCustody ? ` (${openCustody} عهدة مفتوحة)` : ' (لا عهد مفتوحة)'}`,
    },
    { caseId: kase.id, party: 'it', label: 'إلغاء الصلاحيات والأجهزة' },
    { caseId: kase.id, party: 'finance', label: 'تسوية السلف وحساب المستحقات' },
    { caseId: kase.id, party: 'hr', label: 'تسليم الوثائق وشهادة الخبرة' },
  ]
  // B5.2 (ب): اشتراكات تأمين سارية للموظف أو معاليه = طلب حذف لكل اشتراك وبند إخلاء طرف عند الموارد البشرية. من غير اشتراكات (أو قبل ترحيلها): ولا حاجة زيادة
  const insuranceRemovals = await raiseOffboardingRemovals(em, input.employeeId, input.openedBy ?? 0)
  if (insuranceRemovals > 0) items.push({ caseId: kase.id, party: 'hr', label: `حذف التأمين الطبي من الوثيقة (${insuranceRemovals} عضو)` })
  // B5.3 (ب): سلف مأموريات مفتوحة = بند إخلاء طرف عند المالية بعددها وإجماليها. من غير سلف (أو قبل ترحيل 152) مفيش بند
  const advances = await openAdvancesOf(em, input.employeeId)
  if (advances.count > 0) items.push({ caseId: kase.id, party: 'finance', label: `تسوية سلف مأموريات مفتوحة (${advances.count}) بإجمالي ${advances.total}` })
  await em.getRepository(ClearanceItem).save(items)
  return kase
}

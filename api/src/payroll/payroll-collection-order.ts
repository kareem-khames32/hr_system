import { ConflictException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { inspectPayrollCollectionPolicy } from './payroll-collection-policy'
import { PAYROLL_COLLECTION_CLASSES, PAYROLL_DEFAULT_COLLECTION_ORDER, type PayrollCollectionClass } from './payroll-obligation-protection'
import { readPayrollPolicyDefinition } from './payroll-policy-definition-store'
import { PayrollPolicyVersion } from './payroll-policy.entities'

// B5 / الخطوة 22: «ترتيب التحصيل بتاعك متطبق» — ترتيب المالك محفوظ في نسخة السياسة على مستوى بنود تعريفها وتصنيفها،
// والمسير يطبقه على فئات التحصيل التي يحسبها فعلًا: الحضور، والاستردادات (قيود دفتر غير مصنفة)، والمصنفة، والإدارية، وأقساط السلف.
// الاستقطاع النظامي والحكم القضائي والإجازة بلا أجر محمية دائمًا قبل هذا الترتيب (DD-11). التصنيف OTHER لا يقابله مبلغ في المسير فلا يغيّر الترتيب.
export const PAYROLL_COLLECTION_CLASS_LABELS: Record<PayrollCollectionClass, string> = {
  ATTENDANCE: 'خصومات الحضور', RECOVERY: 'الاستردادات والعهد', TYPED: 'الخصومات المصنفة', ADMINISTRATIVE: 'الخصومات الإدارية', LOAN: 'أقساط السلف',
}

export interface PayrollRunCollectionOrder {
  source: 'POLICY_VERSION' | 'DEFAULT'
  versionId: number | null
  // null = الترتيب الافتراضي كما هو في نواة الحماية (المصنفة والإدارية معًا بأولوية الترحيل)
  order: PayrollCollectionClass[] | null
  effectiveOrder: PayrollCollectionClass[]
  // السلف ليست آخر فئة: خطة الأقساط تُبنى على رصيد موضعها ثم تُعاد الحماية للفئات التالية
  loanBeforeOthers: boolean
  componentOrder: string[] | null
  message: string
}

const orderText = (order: readonly PayrollCollectionClass[]) => order.map(kind => PAYROLL_COLLECTION_CLASS_LABELS[kind]).join(' ← ')

/**
 * يشتق ترتيب فئات المسير من ترتيب بنود المالك وتصنيف كل بند: أول ظهور لكل فئة يحدد مكانها.
 * الفئة التي لا يمثلها بند في النسخة تأخذ مكانها الافتراضي بعد أقرب فئة تسبقها في الترتيب الافتراضي.
 */
export function payrollCollectionClassOrder(policy: { classifications: ReadonlyArray<{ componentCode: string; kind: string }>; collectionOrder: readonly string[] }): PayrollCollectionClass[] {
  const kinds = new Map(policy.classifications.map(row => [row.componentCode, row.kind]))
  const result: PayrollCollectionClass[] = []
  for (const code of policy.collectionOrder) {
    const kind = kinds.get(code)
    if (kind && (PAYROLL_COLLECTION_CLASSES as readonly string[]).includes(kind) && !result.includes(kind as PayrollCollectionClass)) result.push(kind as PayrollCollectionClass)
  }
  PAYROLL_DEFAULT_COLLECTION_ORDER.forEach((kind, index) => {
    if (result.includes(kind)) return
    const previous = PAYROLL_DEFAULT_COLLECTION_ORDER.slice(0, index).reverse().find(item => result.includes(item))
    result.splice(previous ? result.indexOf(previous) + 1 : 0, 0, kind)
  })
  return result
}

/** ترتيب التحصيل لمسير مرتبط بنسخة سياسة (قراءة فقط). النسخة المنشورة مجمدة بختمها، فالترتيب المقروء عند كل حساب هو نفسه. */
export async function readPayrollRunCollectionOrder(em: EntityManager, policyVersionId: number | null): Promise<PayrollRunCollectionOrder> {
  const fallback = (message: string): PayrollRunCollectionOrder => ({ source: 'DEFAULT', versionId: policyVersionId, order: null,
    effectiveOrder: [...PAYROLL_DEFAULT_COLLECTION_ORDER], loanBeforeOthers: false, componentOrder: null, message })
  if (!policyVersionId) return fallback(`مسير بلا نسخة سياسة: الترتيب الافتراضي (${orderText(PAYROLL_DEFAULT_COLLECTION_ORDER)})`)
  const version = await em.getRepository(PayrollPolicyVersion).findOne({ where: { id: policyVersionId }, select: { id: true, collectionPolicy: true } })
  if (!version) throw new ConflictException({ code: 'PAYRUN-POLICY-NOT-FOUND', message: 'نسخة سياسة الرواتب المرتبطة بالمسير غير موجودة' })
  if (version.collectionPolicy == null) {
    return fallback(`نسخة السياسة بلا ترتيب تحصيل محفوظ؛ يُطبق الترتيب الافتراضي (${orderText(PAYROLL_DEFAULT_COLLECTION_ORDER)}). احفظ ترتيبك في نسخة جديدة من «سياسات الرواتب» ليُطبق`)
  }
  const inspection = inspectPayrollCollectionPolicy(await readPayrollPolicyDefinition(em, version.id), version.collectionPolicy)
  if (inspection.state !== 'COMPLETE' || !inspection.collection) {
    throw new ConflictException({ code: 'PAYRUN-COLLECTION-POLICY-INVALID', issues: inspection.issues,
      message: 'ترتيب التحصيل المحفوظ في نسخة السياسة غير صالح؛ صححه في نسخة جديدة وانشرها قبل حساب المسير' })
  }
  const order = payrollCollectionClassOrder(inspection.collection)
  return { source: 'POLICY_VERSION', versionId: version.id, order, effectiveOrder: order, loanBeforeOthers: order.indexOf('LOAN') < order.length - 1,
    componentOrder: [...inspection.collection.collectionOrder], message: `ترتيب المالك من نسخة السياسة: ${orderText(order)}` }
}

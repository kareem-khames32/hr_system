import { createHash } from 'node:crypto'
import type { EntityManager } from 'typeorm'

// B2.7-أ: قواعد مكتبة السياسات والإقرار — دوال صافية (التاريخ، النسخة السارية، أساس الإقرار، موعد القفل) وفحص وجود الجداول.
//  الجداول برّه مسار الكود قبل ترحيل 091: كل قراءة ليها بعد policySchemaReady.

export const POLICY_MIGRATION_MISSING = 'مكتبة السياسات محتاجة ترحيل 20261005_091 على قاعدة البيانات'
/** كود الرد لما الحساب عليه سياسة إلزامية عدّت مهلتها: الواجهة بتحوّل لشاشة الإقرار */
export const POLICY_ACK_REQUIRED = 'POLICY_ACK_REQUIRED'
export const POLICY_ACK_REQUIRED_MESSAGE = 'عليك سياسة إلزامية لازم تقرّ بيها الأول قبل ما تكمّل في النظام'
export const POLICY_NOT_FOUND = 'السياسة غير موجودة'
/** أقصى مهلة سماح بالأيام */
export const POLICY_GRACE_MAX = 365
/** أقصى طول لنص السياسة (حروف): جوه حد حجم الطلب (100 ك.ب) حتى لو النص كله عربي. الأطول يترفع ملف PDF */
export const POLICY_BODY_MAX = 30_000
/** أقصى طول لجمهور السياسة وهو متخزن (عمود audience) */
export const POLICY_AUDIENCE_MAX = 2000

let ready: boolean | null = null, checkedAt = 0

/** جداول السياسات التلاتة موجودة (ترحيل 091)؟ الموجود بيتحفظ، والناقص بيتفحص تاني كل دقيقة */
export async function policySchemaReady(em: EntityManager): Promise<boolean> {
  if (ready === true || (ready === false && Date.now() - checkedAt < 60_000)) return ready
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.policies', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.policy_versions', N'U') IS NOT NULL
    AND OBJECT_ID(N'dbo.policy_acknowledgements', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  checkedAt = Date.now()
  return ready
}

/** للاختبارات: نسيان حالة الجداول */
export function resetPolicySchemaCache() { ready = null; checkedAt = 0 }

/** تاريخ محلي YYYY-MM-DD (ممنوع toISOString على «الآن») */
export const policyLocalDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const DATE = /^\d{4}-\d{2}-\d{2}$/
export const isPolicyDate = (value: unknown): value is string =>
  typeof value === 'string' && DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value

/** يوم + عدد أيام (تواريخ تقويمية، من غير منطقة زمنية) */
export const policyAddDays = (day: string, days: number) => new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)

/** بصمة المحتوى اللي بيتعرض: نص (UTF-8) أو بايتات ملف */
export const policyContentHash = (content: string | Buffer) => createHash('sha256').update(content).digest('hex')

export const POLICY_FILE_MISMATCH = 'ملف السياسة على التخزين مش مطابق للنسخة المنشورة — بلّغ مسؤول النظام'

export interface PolicyVersionFacts {
  id: number
  policyId: number
  versionNo: number
  effectiveDate: string
  isMaterial: boolean
  contentHash: string
}

/** النسخ اللي تاريخ سريانها جه، الأحدث أولًا */
const effectiveVersions = <T extends PolicyVersionFacts>(versions: readonly T[], today: string): T[] =>
  versions.filter(version => version.effectiveDate <= today).sort((a, b) => b.versionNo - a.versionNo)

/** النسخة السارية: أحدث نسخة تاريخ سريانها جه — هي اللي بتتعرض وبيتقرّ بيها */
export const currentPolicyVersion = <T extends PolicyVersionFacts>(versions: readonly T[], today: string): T | null =>
  effectiveVersions(versions, today)[0] ?? null

/** النسخة الجاية: أول نسخة منشورة لسه تاريخ سريانها ماجاش */
export const upcomingPolicyVersion = <T extends PolicyVersionFacts>(versions: readonly T[], today: string): T | null =>
  versions.filter(version => version.effectiveDate > today).sort((a, b) => a.versionNo - b.versionNo)[0] ?? null

/**
 * أساس الإقرار: آخر نسخة سارية عليها «تغيير جوهري» (وأول نسخة جوهرية دايمًا). الإقرار بيها أو بأي نسخة بعدها كافي؛ والإقرار بنسخة
 * قبلها مابقاش كافي.
 */
export const baselinePolicyVersion = <T extends PolicyVersionFacts>(versions: readonly T[], today: string): T | null => {
  const effective = effectiveVersions(versions, today)
  return effective.find(version => version.isMaterial) ?? effective[effective.length - 1] ?? null
}

/**
 * أول يوم القفل بيشتغل فيه للموظف: الأبعد من (سريان نسخة الأساس، تعيين الموظف، اليوم اللي السياسة بقت فيه إلزامية أو جمهورها اتغيّر)
 * + مهلة السماح. مهلة صفر = من نفس اليوم. graceFrom بيخلّي المهلة تتحسب من يوم ما الإلزام بدأ فعلًا، مش من سريان نسخة قديمة.
 */
export const policyLockDate = (baselineEffectiveDate: string, joinDate: string | null | undefined, graceDays: number, graceFrom?: string | null): string =>
  policyAddDays([baselineEffectiveDate, joinDate, graceFrom].filter((day): day is string => !!day).sort().pop()!, Math.max(0, graceDays))

export type PolicyAckState = 'ACKNOWLEDGED' | 'PENDING' | 'OVERDUE'

/**
 * حالة الموظف مع سياسة منشورة هو في جمهورها: أقرّ (بنسخة الأساس أو بعدها)، أو لسه جوه المهلة، أو عدّى المهلة.
 * acknowledgedVersionNos = أرقام النسخ اللي أقرّ بيها من السياسة دي. السياسة غير الإلزامية مالهاش مهلة ولا قفل: «لسه» لحد ما يقرّ.
 */
export function policyAckState(versions: readonly PolicyVersionFacts[], acknowledgedVersionNos: readonly number[], joinDate: string | null | undefined,
  graceDays: number, today: string, isMandatory = true, graceFrom: string | null = null): { state: PolicyAckState; lockDate: string | null } | null {
  const baseline = baselinePolicyVersion(versions, today)
  if (!baseline) return null
  if (acknowledgedVersionNos.some(versionNo => versionNo >= baseline.versionNo)) return { state: 'ACKNOWLEDGED', lockDate: null }
  if (!isMandatory) return { state: 'PENDING', lockDate: null }
  const lockDate = policyLockDate(baseline.effectiveDate, joinDate, graceDays, graceFrom)
  return { state: today >= lockDate ? 'OVERDUE' : 'PENDING', lockDate }
}

import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { IsNull } from 'typeorm'
import type { EntityManager, FindOptionsWhere } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf } from '../auth/guards'
import { Branch } from '../org/entities/branch.entity'

// ===== تعريفات الفرع (قرار المالك 16 سبتمبر) =====
// أنواع الإجازات وأنواع الطلبات والورديات وجداول العمل (ومعادلات الرواتب) عامة لكل الشركة افتراضيًا
// (branchId = null)، والفرع يقدر يعمل تعريف خاص بيه: يظهر ويُستخدم جوه فرعه بس.
// حساب الفرع (نطاق JWT) يضيف لفرعه تلقائيًا ويعدّل تعريفات فرعه فقط؛ الحساب العام يختار «كل الشركة» أو فرع.
// الصفوف القديمة تفضل عامة.

// هل التعريف متاح لموظف/حساب في الفرع ده؟ (null = كل الشركة)
export const definitionInBranch = (
  definitionBranchId: number | null | undefined,
  branchId: number | null | undefined
): boolean => definitionBranchId == null || (branchId != null && Number(definitionBranchId) === Number(branchId))

// ?branchId= في القوائم: رقم فرع موجب، والباقي يتجاهل (الفلتر اختياري)
export function definitionBranchQuery(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === '') return null
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

// شرط القوائم والمنتقيات: حساب الفرع يرى العام + فرعه، والحساب العام يرى الكل
// أو (لو حدد فرعًا) العام + الفرع ده — عشان منتقي موظف في فرع معيّن ما يعرضش تعريفات فرع تاني.
export function definitionBranchWhere<T extends { branchId?: number | null }>(
  user: JwtPayload,
  base: FindOptionsWhere<T> = {} as FindOptionsWhere<T>,
  forBranchId: number | null = null
): FindOptionsWhere<T> | FindOptionsWhere<T>[] {
  const scope = branchScopeOf(user)
  const branch = scope !== null ? scope : forBranchId
  if (branch === null) return base
  return [
    { ...base, branchId: IsNull() },
    { ...base, branchId: branch },
  ] as FindOptionsWhere<T>[]
}

// فرع التعريف الجديد: حساب الفرع = فرعه دائمًا، والحساب العام = اللي اختاره (فاضي = كل الشركة)
export async function definitionBranchForCreate(em: EntityManager, user: JwtPayload, requested: unknown): Promise<number | null> {
  const scope = branchScopeOf(user)
  if (scope === -1) throw new ForbiddenException('حسابك مش مربوط بفرع، فمينفعش تضيف تعريفات')
  const wanted = requested === undefined || requested === null || requested === '' ? null : Number(requested)
  if (wanted !== null && (!Number.isInteger(wanted) || wanted < 1)) throw new BadRequestException('الفرع المختار غير صحيح')
  if (scope !== null) {
    if (wanted !== null && wanted !== scope) throw new ForbiddenException('تقدر تضيف تعريفات لفرعك بس')
    return scope
  }
  if (wanted === null) return null
  if (!(await em.getRepository(Branch).existsBy({ id: wanted, isActive: true }))) {
    throw new BadRequestException('الفرع المختار غير موجود أو متوقف')
  }
  return wanted
}

// التعديل: حساب الفرع يعدّل تعريفات فرعه بس؛ العام يتعدّل من حساب على مستوى الشركة،
// وتعريف فرع تاني كأنه مش موجود.
export function assertDefinitionWritable(user: JwtPayload, definition: { branchId?: number | null }) {
  const scope = branchScopeOf(user)
  if (scope === null) return
  if (definition.branchId == null) {
    throw new ForbiddenException('التعريف ده لكل الشركة، وتعديله من حساب على مستوى الشركة بس. تقدر تضيف تعريف خاص بفرعك')
  }
  if (scope < 1 || Number(definition.branchId) !== scope) throw new NotFoundException('التعريف غير موجود')
}

// فرع التعريف ثابت بعد الإنشاء (زي الكود): تغييره كان هيسيب موظفين وطلبات على تعريف مش متاح لفرعهم
export function assertDefinitionBranchUnchanged(definition: { branchId?: number | null }, requested: unknown) {
  if (requested === undefined) return
  const wanted = requested === null || requested === '' ? null : Number(requested)
  if (wanted !== (definition.branchId ?? null)) {
    throw new BadRequestException('فرع التعريف مايتغيرش بعد الإضافة — أضف تعريف جديد للفرع التاني')
  }
}

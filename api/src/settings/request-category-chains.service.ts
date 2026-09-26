import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { DataSource, EntityManager, In, IsNull, Like, Not } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { assertCompanyWideWrite, branchScopeOf, userHasPerm } from '../auth/guards'
import { assertDefinitionWritable, definitionBranchWhere } from '../common/definition-branch'
import { Branch } from '../org/entities/branch.entity'
import { ApprovalChain } from '../requests/entities/approval-chain.entity'
import { ApprovalStep } from '../requests/entities/approval-step.entity'
import { Request } from '../requests/entities/request.entity'
import { RequestType } from '../requests/entities/request-type.entity'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import {
  CATEGORY_CHAIN_KEY_PREFIX,
  REQUEST_CATEGORIES,
  REQUEST_CATEGORY_LABELS,
  categoryChainKey,
  categoryChainMap,
  fixedChainReason,
  isOvertimeRequestType,
  isRequestCategory,
  nextFreeChainCode,
  parseCategoryChainId,
  typeChainMode,
} from '../requests/request-category-chains'

// ===== سلسلة اعتماد لكل فئة جوّه «بانِي الطلبات» (طلب المالك 26 سبتمبر) =====
// الربط في requests_config (requests.category_chain.<الفئة>)، والطلب نفسه لسه بيتحل بـ approvalChainId + نسخة الفرع
// بنفس الكود (resolveChain ماتغيّرش). مفيش ترحيل آلي: كل تغيير هنا ضغطة من المالك نفسه، في معاملة واحدة،
// ومابيمسحش أي سلسلة (القديمة بتفضل في مكتبة «الاعتمادات والموافقات»)، والرد بيقول اتنقل مين من فين لفين.

export interface SetCategoryChainInput {
  // سلسلة موجودة للفئة، أو null = الفئة من غير سلسلة (كل طلب بسلسلته)
  chainId?: number | null
  // أو سلسلة جديدة للفئة بنسخ خطوات السلسلة دي (ونسخ فروعها)
  copyFromChainId?: number | null
  nameAr?: string
  // أنواع من نفس الفئة تتنقل للسلسلة كمان (الماشيين على سلسلة الفئة القديمة بيتنقلوا لوحدهم)
  repointTypeIds?: number[]
}

// الربط والتخصيص بيغيّروا سلسلة نوع طلب (بانِي الطلبات) وبيعملوا سلاسل (بانِي الدورات) — لازم الاتنين
export function assertChainAndTypePerms(user: JwtPayload) {
  if (!userHasPerm(user, 'request_types.manage') || !userHasPerm(user, 'approval_chains.manage')) {
    throw new ForbiddenException('ربط الطلبات بسلاسل الاعتماد محتاج الصلاحيتين: «بانِي أنواع الطلبات» و«بانِي دورات الاعتماد»')
  }
}

// فروع نطاق الحساب كقائمة (null = كل الشركة) — بيقبل شكل branchScopeOf الحالي (رقم) والجاي (قائمة) من غير ما يفترض واحد منهم
function scopeBranchIds(user: JwtPayload): number[] | null {
  const scope = branchScopeOf(user) as unknown
  if (scope === null || scope === undefined) return null
  const list = Array.isArray(scope) ? scope : [scope]
  return list.map(Number).filter((id) => Number.isInteger(id) && id > 0)
}

@Injectable()
export class RequestCategoryChainsService {
  private readonly logger = new Logger(RequestCategoryChainsService.name)

  constructor(private readonly ds: DataSource) {}

  // ===== الخريطة: سلسلة كل فئة + وضع كل نوع + استخدامه =====
  async map(user: JwtPayload) {
    const em = this.ds.manager
    const [configRows, types, chains, steps, usage] = await Promise.all([
      em.find(RequestsConfig, { where: { key: Like(`${CATEGORY_CHAIN_KEY_PREFIX}%`) } }),
      // نفس نطاق «بانِي الطلبات»: أنواع الشركة + أنواع فرع الحساب
      em.find(RequestType, { where: definitionBranchWhere<RequestType>(user), order: { category: 'ASC', id: 'ASC' } }),
      // السلاسل العامة + سلاسل فروع نطاقه بس (نسخ فروع تانية ماتظهرش ولا تتعد)
      em.find(ApprovalChain, { where: definitionBranchWhere<ApprovalChain>(user), order: { id: 'ASC' } }),
      em.find(ApprovalStep, { order: { chainId: 'ASC', stepOrder: 'ASC', id: 'ASC' } }),
      this.usage(em, user),
    ])
    const mapping = categoryChainMap(configRows)
    const chainById = new Map(chains.map((chain) => [chain.id, chain]))
    const stepsByChain = new Map<number, ApprovalStep[]>()
    for (const step of steps) stepsByChain.set(step.chainId, [...(stepsByChain.get(step.chainId) ?? []), step])

    const typeRows = types.map((type) => {
      const mode = typeChainMode(type, mapping.get(type.category) ?? null)
      const used = usage.get(type.code)
      return {
        id: type.id,
        code: type.code,
        category: type.category,
        approvalChainId: type.approvalChainId ?? null,
        mode,
        fixedReason: fixedChainReason(type),
        // أنواع تانية على نفس السلسلة — تعديلها بيأثر عليهم كمان
        chainSharedWith: mode === 'fixed' || !type.approvalChainId ? 0
          : types.filter((other) => other.id !== type.id && other.approvalChainId === type.approvalChainId && !fixedChainReason(other)).length,
        usageCount: used?.count ?? 0,
        lastRequestAt: used?.lastAt ?? null,
      }
    })

    const categories = REQUEST_CATEGORIES.map((category) => {
      const chainId = mapping.get(category) ?? null
      const inCategory = typeRows.filter((type) => type.category === category)
      return {
        category,
        label: REQUEST_CATEGORY_LABELS[category],
        chainId,
        chainMissing: chainId !== null && !chainById.has(chainId),
        sharedWith: chainId === null ? [] : REQUEST_CATEGORIES.filter((other) => other !== category && mapping.get(other) === chainId),
        typeCount: inCategory.length,
        following: inCategory.filter((type) => type.mode === 'category').length,
      }
    })

    const referenced = new Set<number>([...mapping.values(), ...types.map((type) => Number(type.approvalChainId)).filter((id) => id > 0)])
    const summaries = [...referenced].map((id) => chainById.get(id)).filter((chain): chain is ApprovalChain => !!chain).map((chain) => {
      const own = stepsByChain.get(chain.id) ?? []
      const versions = chain.branchId == null ? chains.filter((other) => other.code === chain.code && other.branchId != null) : []
      return {
        id: chain.id,
        code: chain.code,
        nameAr: chain.nameAr,
        branchId: chain.branchId ?? null,
        isActive: chain.isActive,
        autoApprove: chain.autoApprove,
        stepsCount: own.length,
        stepRoles: own.map((step) => step.approverRole),
        branchVersions: versions.map((version) => ({
          id: version.id,
          branchId: version.branchId,
          isActive: version.isActive,
          stepsCount: (stepsByChain.get(version.id) ?? []).length,
        })),
      }
    })
    return { categories, chains: summaries, types: typeRows }
  }

  // عدد الطلبات وآخر طلب لكل نوع (بكود تعريفه: الإجازة الموحّدة بتتحسب على نوعها الأصلي) — بنطاق فروع الحساب
  private async usage(em: EntityManager, user: JwtPayload) {
    const branchIds = scopeBranchIds(user)
    const result = new Map<string, { count: number; lastAt: string | null }>()
    if (branchIds !== null && branchIds.length === 0) return result
    const code = "COALESCE(NULLIF(r.definitionCode, ''), r.typeCode)"
    const query = em.getRepository(Request).createQueryBuilder('r')
      .select(code, 'code')
      .addSelect('COUNT(*)', 'total')
      .addSelect('MAX(r.createdAt)', 'lastAt')
      .groupBy(code)
    if (branchIds !== null) query.where('r.branchId IN (:...branchIds)', { branchIds })
    const rows = await query.getRawMany<{ code: string; total: number | string; lastAt: Date | string | null }>()
    for (const row of rows) {
      const lastAt = row.lastAt ? new Date(row.lastAt) : null
      result.set(String(row.code), { count: Number(row.total) || 0, lastAt: lastAt && !Number.isNaN(lastAt.getTime()) ? lastAt.toISOString() : null })
    }
    return result
  }

  // ===== سلسلة الفئة: اختيار/تغيير/شيل + نقل الأنواع (إعداد لكل الشركة) =====
  async setCategoryChain(user: JwtPayload, categoryRaw: string, input: SetCategoryChainInput) {
    assertChainAndTypePerms(user)
    assertCompanyWideWrite(user)
    if (!isRequestCategory(categoryRaw)) throw new BadRequestException('الفئة غير صالحة')
    const category = categoryRaw
    const label = REQUEST_CATEGORY_LABELS[category]
    const copying = input.copyFromChainId !== undefined && input.copyFromChainId !== null
    const choosing = input.chainId !== undefined
    if (copying === choosing) {
      throw new BadRequestException('اختار سلسلة موجودة للفئة، أو اعمل سلسلة جديدة بنسخ خطوات سلسلة — واحدة بس')
    }
    const repointIds = [...new Set((input.repointTypeIds ?? []).map(Number))]
    if (repointIds.some((id) => !Number.isSafeInteger(id) || id < 1)) throw new BadRequestException('اختيار غير صحيح في الطلبات')

    return this.ds.transaction(async (em) => {
      await this.lock(em)
      const key = categoryChainKey(category)
      const row = await em.findOneBy(RequestsConfig, { key })
      const previousChainId = parseCategoryChainId(row?.value)

      const picked = repointIds.length ? await em.findBy(RequestType, { id: In(repointIds) }) : []
      for (const id of repointIds) {
        const type = picked.find((item) => item.id === id)
        if (!type) throw new BadRequestException('نوع طلب من المختارين مش موجود')
        if (type.category !== category) throw new BadRequestException(`«${type.nameAr}» مش من فئة «${label}»`)
        const fixed = fixedChainReason(type)
        if (fixed) throw new BadRequestException(`«${type.nameAr}» ${fixed} — مابيتنقلش لسلسلة الفئة`)
      }

      let target: ApprovalChain | null = null
      let created: { chain: ApprovalChain; stepsCount: number; branchVersions: number } | null = null
      if (copying) {
        const source = await em.findOneBy(ApprovalChain, { id: Number(input.copyFromChainId) })
        if (!source) throw new BadRequestException('السلسلة اللي بتنسخ خطواتها مش موجودة')
        if (!(await em.countBy(ApprovalStep, { chainId: source.id })) && !source.autoApprove) {
          throw new BadRequestException(`«${source.nameAr}» لسه مالهاش خطوات — اختار سلسلة فيها معتمدين تنسخ منها`)
        }
        // سلسلة الفئة الجديدة عامة ومفعّلة؛ نسخ فروع المصدر بتتنسخ زي ما هي عشان توجيه كل فرع مايتغيرش
        created = await this.copyChainWithVersions(em, source, {
          codeBase: `CAT_${category}`,
          nameAr: input.nameAr?.trim() || `سلسلة ${label}`,
          branchId: null,
          requestTypeCode: null,
          withVersions: true,
          activate: true,
        })
        target = created.chain
      } else if (input.chainId !== null) {
        target = await em.findOneBy(ApprovalChain, { id: Number(input.chainId) })
        if (!target) throw new BadRequestException('السلسلة المختارة مش موجودة')
      }

      let targetSteps = 0
      if (target) {
        if (target.branchId != null) {
          throw new BadRequestException('سلسلة الفئة لازم تكون لكل الشركة — السلسلة الخاصة بفرع بتتعمل من جدول «سلسلة مختلفة لكل فرع» جوّه تعديل سلسلة الفئة')
        }
        if (!target.isActive) throw new BadRequestException(`السلسلة «${target.nameAr}» معطّلة — فعّلها الأول أو اختار سلسلة تانية`)
        targetSteps = await em.countBy(ApprovalStep, { chainId: target.id })
        if (!targetSteps && !target.autoApprove) {
          throw new BadRequestException(`السلسلة «${target.nameAr}» لسه مالهاش خطوات — ضيف المعتمدين الأول، وإلا طلبات الفئة كلها هتقف`)
        }
      } else if (repointIds.length) {
        throw new BadRequestException('مينفعش تنقل طلبات لفئة من غير سلسلة — اختار سلسلة للفئة')
      }

      // الماشيين على سلسلة الفئة القديمة بيتنقلوا معاها؛ اللي ليه سلسلة خاصة بيفضل عليها إلا لو اتعلّم عليه
      const followers = target && previousChainId !== null && previousChainId !== target.id
        ? await em.find(RequestType, { where: { category, approvalChainId: previousChainId }, order: { id: 'ASC' } })
        : []
      const moving = [...followers.filter((type) => !fixedChainReason(type)), ...picked.filter((type) => !followers.some((f) => f.id === type.id))]
        .filter((type) => target && type.approvalChainId !== target.id)
      if (target && !targetSteps && moving.some(isOvertimeRequestType)) {
        throw new BadRequestException(`الإضافي محتاج معتمدين صريحين — السلسلة «${target.nameAr}» مالهاش خطوات`)
      }
      if (target) {
        const followerIds = moving.filter((type) => type.approvalChainId === previousChainId).map((type) => type.id)
        const pickedIds = moving.filter((type) => !followerIds.includes(type.id)).map((type) => type.id)
        // الماشي على الفئة بيتنقل بشرط إنه لسه عليها: نوع اتخصّص في نفس اللحظة مايتكتبش فوقه
        if (followerIds.length) await em.update(RequestType, { id: In(followerIds), approvalChainId: previousChainId! }, { approvalChainId: target.id })
        if (pickedIds.length) await em.update(RequestType, { id: In(pickedIds) }, { approvalChainId: target.id })
      }

      const value = target ? String(target.id) : ''
      if (row) {
        if (row.value !== value) await em.update(RequestsConfig, { key }, { value })
      } else if (target) {
        await em.insert(RequestsConfig, { key, value })
      }

      this.logger.log(`سلسلة فئة ${category}: ${previousChainId ?? '—'} ← ${target?.id ?? '—'}${created ? ' (جديدة منسوخة)' : ''} بواسطة المستخدم ${user.sub}؛ `
        + `اتنقل ${moving.length} نوع${moving.length ? `: ${moving.map((type) => `${type.code} من ${type.approvalChainId ?? '—'}`).join('، ')}` : ''}`)
      return {
        category,
        chainId: target?.id ?? null,
        previousChainId,
        createdChain: created
          ? { id: created.chain.id, code: created.chain.code, nameAr: created.chain.nameAr, stepsCount: created.stepsCount, branchVersions: created.branchVersions }
          : null,
        repointed: moving.map((type) => ({ id: type.id, code: type.code, nameAr: type.nameAr, fromChainId: type.approvalChainId ?? null })),
      }
    })
  }

  // ===== «خصّص سلسلة للطلب ده»: سلسلة باسمه بنفس الخطوات الحالية (ونسخ الفروع)، والطلب يتنقل عليها =====
  async customizeType(user: JwtPayload, typeId: number) {
    assertChainAndTypePerms(user)
    return this.ds.transaction(async (em) => {
      await this.lock(em)
      const type = await em.findOneBy(RequestType, { id: typeId })
      if (!type) throw new NotFoundException('نوع الطلب غير موجود')
      // نوع لكل الشركة = سلسلة لكل الشركة (حساب الشركة)، ونوع الفرع = سلسلة لفرعه (حساب فرعه)
      assertDefinitionWritable(user, type)
      const fixed = fixedChainReason(type)
      if (fixed) throw new BadRequestException(`«${type.nameAr}» ${fixed} — مالوش سلسلة خاصة`)
      const mapping = await this.mapping(em)
      const current = type.approvalChainId ? await em.findOneBy(ApprovalChain, { id: type.approvalChainId }) : null
      const branchId = type.branchId ?? null
      // سلسلة النوع لوحده (مش سلسلة فئة ولا مشتركة، وفي نطاقه): نسخة تانية منها مالهاش لازمة — ضغطتين ماتعملوش سلسلتين
      if (current && !new Set(mapping.values()).has(current.id) && (current.branchId ?? null) === branchId) {
        const others = (await em.find(RequestType, { where: { approvalChainId: current.id, id: Not(type.id) } })).filter((other) => !fixedChainReason(other))
        if (!others.length) {
          throw new BadRequestException(`«${type.nameAr}» ليه سلسلته الخاصة أصلًا («${current.nameAr}») — عدّل خطواتها من «تعديل سلسلته»`)
        }
      }
      // نوع خاص بفرع: خطوات السلسلة اللي طلباته ماشية عليها فعلًا (نسخة فرعه المفعّلة لو موجودة) — التخصيص مايغيّرش التوجيه
      let effective = current
      if (current && branchId !== null && current.branchId == null) {
        effective = (await em.findOneBy(ApprovalChain, { code: current.code, branchId, isActive: true })) ?? current
      }
      const nameAr = `سلسلة اعتماد ${type.nameAr}`
      let made: { chain: ApprovalChain; stepsCount: number; branchVersions: number }
      if (effective) {
        made = await this.copyChainWithVersions(em, effective, {
          codeBase: `CH_${type.code}`,
          nameAr,
          branchId,
          requestTypeCode: type.code,
          withVersions: branchId === null,
          activate: false,
        })
      } else {
        // من غير سلسلة: سلسلة فاضية باسمه (زي إنشاء نوع جديد) — الطلب واقف لحد ما تتضاف خطواتها
        const code = nextFreeChainCode(`CH_${type.code}`, await this.takenCodes(em))
        const chain = await em.save(ApprovalChain, em.create(ApprovalChain, {
          code, nameAr: nameAr.slice(0, 200), branchId: branchId ?? undefined, requestTypeCode: type.code, autoApprove: false,
        }))
        made = { chain, stepsCount: 0, branchVersions: 0 }
      }
      const previousChainId = type.approvalChainId ?? null
      await em.update(RequestType, { id: type.id }, { approvalChainId: made.chain.id })
      this.logger.log(`تخصيص سلسلة للنوع ${type.code}: ${previousChainId ?? '—'} ← ${made.chain.id} (${made.chain.code}، ${made.stepsCount} خطوة، ${made.branchVersions} نسخة فرع) بواسطة المستخدم ${user.sub}`)
      return {
        typeId: type.id,
        code: type.code,
        previousChainId,
        chain: { id: made.chain.id, code: made.chain.code, nameAr: made.chain.nameAr, branchId: made.chain.branchId ?? null, stepsCount: made.stepsCount },
        branchVersions: made.branchVersions,
      }
    })
  }

  // ===== «رجّعه لسلسلة الفئة» =====
  async followCategory(user: JwtPayload, typeId: number) {
    assertChainAndTypePerms(user)
    return this.ds.transaction(async (em) => {
      await this.lock(em)
      const type = await em.findOneBy(RequestType, { id: typeId })
      if (!type) throw new NotFoundException('نوع الطلب غير موجود')
      assertDefinitionWritable(user, type)
      const fixed = fixedChainReason(type)
      if (fixed) throw new BadRequestException(`«${type.nameAr}» ${fixed} — مابيتنقلش لسلسلة الفئة`)
      const label = REQUEST_CATEGORY_LABELS[type.category] ?? type.category
      const chainId = (await this.mapping(em)).get(type.category) ?? null
      if (chainId === null) throw new BadRequestException(`فئة «${label}» مالهاش سلسلة عامة لسه — اختار سلسلة للفئة الأول`)
      const chain = await em.findOneBy(ApprovalChain, { id: chainId })
      if (!chain) throw new BadRequestException(`سلسلة فئة «${label}» مش موجودة — اختار سلسلة تانية للفئة`)
      const previousChainId = type.approvalChainId ?? null
      if (previousChainId === chain.id) return { typeId: type.id, code: type.code, chainId: chain.id, previousChainId, changed: false }
      if (isOvertimeRequestType(type) && !(await em.countBy(ApprovalStep, { chainId: chain.id }))) {
        throw new BadRequestException(`الإضافي محتاج معتمدين صريحين — سلسلة الفئة «${chain.nameAr}» مالهاش خطوات`)
      }
      await em.update(RequestType, { id: type.id }, { approvalChainId: chain.id })
      this.logger.log(`النوع ${type.code} رجع لسلسلة فئة ${type.category}: ${previousChainId ?? '—'} ← ${chain.id} بواسطة المستخدم ${user.sub} (السلسلة القديمة فاضلة في المكتبة)`)
      return { typeId: type.id, code: type.code, chainId: chain.id, previousChainId, changed: true }
    })
  }

  private async mapping(em: EntityManager) {
    return categoryChainMap(await em.find(RequestsConfig, { where: { key: Like(`${CATEGORY_CHAIN_KEY_PREFIX}%`) } }))
  }

  private async takenCodes(em: EntityManager) {
    return new Set((await em.find(ApprovalChain, { select: { id: true, code: true } })).map((chain) => chain.code))
  }

  // قفل واحد لتعديلات سلاسل الفئات والتخصيص: تغييران متزامنان مايكتبوش فوق بعض
  private async lock(em: EntityManager) {
    if (em.connection.options.type !== 'mssql') return
    const rows = await em.query(`DECLARE @result int;
      EXEC @result = sys.sp_getapplock @Resource = 'hr:request-category-chains', @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000;
      SELECT @result AS lockResult;`)
    if (!rows.length || Number(rows[0].lockResult) < 0) {
      throw new ConflictException('سلاسل الطلبات بتتعدل دلوقتي من حد تاني؛ جرّب تاني بعد شوية')
    }
  }

  // نسخة من سلسلة بخطواتها — ولو المصدر عام: نسخ فروعه بنفس الكود الجديد، فتوجيه كل فرع يفضل زي ما هو
  private async copyChainWithVersions(em: EntityManager, source: ApprovalChain, into: {
    codeBase: string
    nameAr: string
    branchId: number | null
    requestTypeCode: string | null
    withVersions: boolean
    activate: boolean
  }) {
    const code = nextFreeChainCode(into.codeBase, await this.takenCodes(em))
    const main = await this.copyOne(em, source, {
      code, nameAr: into.nameAr, branchId: into.branchId, requestTypeCode: into.requestTypeCode, isActive: into.activate ? true : source.isActive,
    })
    let branchVersions = 0
    if (into.withVersions && source.branchId == null) {
      const versions = await em.find(ApprovalChain, { where: { code: source.code, branchId: Not(IsNull()) }, order: { id: 'ASC' } })
      if (versions.length) {
        const names = new Map((await em.find(Branch, { select: { id: true, name: true } })).map((branch) => [branch.id, branch.name]))
        for (const version of versions) {
          await this.copyOne(em, version, {
            code,
            nameAr: `${into.nameAr} — ${names.get(version.branchId) ?? `فرع رقم ${version.branchId}`}`,
            branchId: version.branchId,
            requestTypeCode: into.requestTypeCode,
            isActive: version.isActive,
          })
          branchVersions++
        }
      }
    }
    return { chain: main.chain, stepsCount: main.stepsCount, branchVersions }
  }

  private async copyOne(em: EntityManager, source: ApprovalChain, into: {
    code: string
    nameAr: string
    branchId: number | null
    requestTypeCode: string | null
    isActive: boolean
  }) {
    const chain = await em.save(ApprovalChain, em.create(ApprovalChain, {
      code: into.code,
      nameAr: into.nameAr.slice(0, 200),
      branchId: into.branchId ?? undefined,
      requestTypeCode: into.requestTypeCode ?? undefined,
      autoApprove: source.autoApprove,
      isActive: into.isActive,
    }))
    const steps = await em.find(ApprovalStep, { where: { chainId: source.id }, order: { stepOrder: 'ASC', id: 'ASC' } })
    if (steps.length) {
      await em.save(ApprovalStep, steps.map((step) => em.create(ApprovalStep, {
        chainId: chain.id,
        stepOrder: step.stepOrder,
        approverRole: step.approverRole,
        specificEmployeeId: step.specificEmployeeId,
        isParallel: step.isParallel,
        thresholdField: step.thresholdField,
        thresholdOp: step.thresholdOp,
        thresholdValue: step.thresholdValue,
        slaDays: step.slaDays,
        escalateTo: step.escalateTo,
        canDelegate: step.canDelegate,
      })))
    }
    return { chain, stepsCount: steps.length }
  }
}

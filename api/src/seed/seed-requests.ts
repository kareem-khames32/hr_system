// بذر محرك الطلبات: السلاسل + الأنواع + أنواع الإجازات + الإعدادات
// idempotent — يُنشئ الناقص فقط ولا يكرر

import { DataSource } from 'typeorm'
import { ApprovalChain } from '../requests/entities/approval-chain.entity'
import { ApprovalStep } from '../requests/entities/approval-step.entity'
import { RequestType } from '../requests/entities/request-type.entity'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { LeaveBalance, LeaveType } from '../requests/entities/leave.entities'
import {
  chainsSeed,
  configSeed,
  leaveTypesSeed,
  typesSeed,
} from './requests-seed.data'

/** تهيئة ضيقة اختيارية: نوع التأجيل الناقص فقط؛ لا تغيير سلسلة أو نوع موجود أو إعداد أو قالب. */
export async function seedLoanInstallmentDeferralOnly(ds: DataSource): Promise<{ created: boolean; typeId: number }> {
  return ds.transaction(async em => {
    const types = em.getRepository(RequestType)
    const existing = await types.findOne({ where: { code: 'LOAN_INSTALLMENT_DEFER' } })
    if (existing) return { created: false, typeId: existing.id }
    const loanType = await types.findOne({ where: { code: 'LOAN' } })
    if (!loanType) throw new Error('تأجيل القسط يحتاج إنشاء نوع السلفة أولًا')
    const definition = typesSeed.find(type => type.code === 'LOAN_INSTALLMENT_DEFER')!
    const created = await types.save(types.create({ code: definition.code, nameAr: definition.nameAr, category: definition.category as any,
      requiredFields: JSON.stringify(definition.requiredFields ?? []), approvalChainId: loanType.approvalChainId ?? (null as unknown as number),
      destinationHandler: definition.handler, affectsBalance: false, isSecurityRoute: false,
      isConfidential: loanType.isConfidential, autoGeneratesPdf: false, phase: definition.phase ?? 'P1' }))
    return { created: true, typeId: created.id }
  })
}

export async function seedRequests(ds: DataSource) {
  const chains = ds.getRepository(ApprovalChain)
  const steps = ds.getRepository(ApprovalStep)
  const types = ds.getRepository(RequestType)
  const config = ds.getRepository(RequestsConfig)
  const leaveTypes = ds.getRepository(LeaveType)

  // ===== أنواع الطلبات + دورة اعتماد مخصّصة لكل نوع =====
  // القاعدة: سلسلة اعتماد واحدة لكل نوع طلب، مسمّاة باسمه، فاضية —
  // المالك يحط المعتمدين والترتيب بنفسه (لا defaults مفروضة).
  // سلسلة فاضية توقف الطلب برسالة واضحة لحد ما تُضبط.
  let createdTypes = 0
  let createdChains = 0
  for (const t of typesSeed) {
    // السلف القائمة تحتفظ بسلسلة المالك؛ التأجيل أدناه يشارك نفس السلسلة الحالية.
    if (t.code === 'LOAN' && await types.findOne({ where: { code: t.code } })) continue
    if (t.code === 'LOAN_INSTALLMENT_DEFER') {
      // التأجيل يتبع سلسلة السلفة الفعلية وتجاوز فرعها عند التقديم؛ لا سلسلة فارغة مستقلة.
      const result = await seedLoanInstallmentDeferralOnly(ds)
      if (result.created) createdTypes++
      continue
    }
    if (['OVERTIME', 'OVERTIME_AUTO'].includes(t.code)) {
      // OT-04: ثلاث خطوات للتركيب الجديد فقط؛ لا نبدّل سلسلة خصصها المالك أو طلبًا جاريًا.
      const created = await ds.transaction(async em => {
        const typeRepo = em.getRepository(RequestType), chainRepo = em.getRepository(ApprovalChain)
        if (await typeRepo.findOne({ where: { code: t.code } })) return { type: 0, chain: 0 }
        let chain = await chainRepo.findOne({ where: { code: `CH_${t.code}` } })
        let newChain = 0
        if (!chain) {
          const definition = chainsSeed.find(item => item.code === t.chain)
          if (!definition?.steps.length) throw new Error('تعريف دورة اعتماد الإضافي الافتراضية مفقود')
          chain = await chainRepo.save(chainRepo.create({ code: `CH_${t.code}`, nameAr: `سلسلة اعتماد ${t.nameAr}`,
            requestTypeCode: t.code, autoApprove: false }))
          const stepRepo = em.getRepository(ApprovalStep)
          await stepRepo.save(definition.steps.map((step, index) => stepRepo.create({ chainId: chain!.id,
            stepOrder: index + 1, approverRole: step.role, slaDays: step.slaDays, escalateTo: step.escalateTo,
            thresholdField: step.thresholdField, thresholdOp: step.thresholdOp, thresholdValue: step.thresholdValue })))
          newChain = 1
        }
        await typeRepo.save(typeRepo.create({ code: t.code, nameAr: t.nameAr, category: t.category as any,
          requiredFields: JSON.stringify(t.requiredFields ?? []), approvalChainId: chain.id, destinationHandler: t.handler,
          affectsBalance: t.affectsBalance ?? false, isSecurityRoute: t.securityRoute ?? false, isConfidential: t.confidential ?? false,
          autoGeneratesPdf: t.autoGeneratesPdf ?? false, phase: t.phase ?? 'P1' }))
        return { type: 1, chain: newChain }
      })
      createdTypes += created.type; createdChains += created.chain
      continue
    }
    // ب3: باب دخول بلا دورة اعتماد خاصة («خصم» و«مكافأة») — الإنشاء يبقى في شاشتيهما بدفترهما
    // وسلسلتهما، فلا تُنشأ لهما سلسلة فارغة ولا يُربطان بواحدة، تمامًا كالقاعدة الحية.
    if (t.chain === null) {
      if (!(await types.findOne({ where: { code: t.code } }))) {
        await types.save(
          types.create({
            code: t.code,
            nameAr: t.nameAr,
            category: t.category as any,
            requiredFields: JSON.stringify(t.requiredFields ?? []),
            approvalChainId: null as unknown as number,
            destinationHandler: t.handler,
            visibleTo: t.visibleTo,
            affectsBalance: t.affectsBalance ?? false,
            isSecurityRoute: t.securityRoute ?? false,
            isConfidential: t.confidential ?? false,
            autoGeneratesPdf: t.autoGeneratesPdf ?? false,
            phase: t.phase ?? 'P1',
          })
        )
        createdTypes++
      }
      continue
    }

    // 1) السلسلة المخصّصة لهذا النوع (تُنشأ فاضية — خطواتها من صنع المالك)
    const chainCode = `CH_${t.code}`
    let chain = await chains.findOne({ where: { code: chainCode } })
    if (!chain) {
      chain = await chains.save(
        chains.create({
          code: chainCode,
          nameAr: `سلسلة اعتماد ${t.nameAr}`,
          branchId: undefined,
          requestTypeCode: t.code,
          autoApprove: false,
        })
      )
      createdChains++
    } else if (chain.requestTypeCode !== t.code) {
      chain.requestTypeCode = t.code
      await chains.save(chain)
    }

    // 2) النوع مربوط بسلسلته الخاصة
    let type = await types.findOne({ where: { code: t.code } })
    if (!type) {
      await types.save(
        types.create({
          code: t.code,
          nameAr: t.nameAr,
          category: t.category as any,
          requiredFields: t.requiredFields
            ? JSON.stringify(t.requiredFields)
            : undefined,
          approvalChainId: chain.id,
          destinationHandler: t.handler,
          affectsBalance: t.affectsBalance ?? false,
          isSecurityRoute: t.securityRoute ?? false,
          isConfidential: t.confidential ?? false,
          autoGeneratesPdf: t.autoGeneratesPdf ?? false,
          phase: t.phase ?? 'P1',
        })
      )
      createdTypes++
    } else if (type.approvalChainId !== chain.id) {
      // ترحيل: اربط الأنواع الحالية بسلاسلها المخصّصة الجديدة
      type.approvalChainId = chain.id
      await types.save(type)
    }
  }
  console.log(
    `✓ أنواع الطلبات: ${createdTypes} جديد + ${createdChains} سلسلة مخصّصة (الإجمالي ${typesSeed.length})`
  )

  // ===== تنظيف السلاسل المشتركة القديمة (مرة واحدة — idempotent) =====
  // تحفظ السلسلة المستخدمة وجميع تجاوزات فروعها؛ findOne(code) قد يرجع نسخة الفرع أولًا.
  const protectedChainCodes = new Set<string>()
  for (const code of ['OVERTIME', 'OVERTIME_AUTO', 'LOAN', 'LOAN_INSTALLMENT_DEFER']) {
    const type = await types.findOne({ where: { code } })
    if (!type?.approvalChainId) continue
    const chain = await chains.findOne({ where: { id: type.approvalChainId } })
    if (chain) protectedChainCodes.add(chain.code)
  }
  let removedOld = 0
  for (const c of chainsSeed) {
    if (protectedChainCodes.has(c.code)) continue
    const old = await chains.findOne({ where: { code: c.code } })
    if (old) {
      if (await types.findOne({ where: [{ code: 'OVERTIME', approvalChainId: old.id }, { code: 'OVERTIME_AUTO', approvalChainId: old.id },
        { code: 'LOAN', approvalChainId: old.id }, { code: 'LOAN_INSTALLMENT_DEFER', approvalChainId: old.id }] })) continue
      await steps.delete({ chainId: old.id })
      await chains.delete({ id: old.id })
      removedOld++
    }
  }
  if (removedOld > 0) console.log(`✓ حُذفت ${removedOld} سلسلة مشتركة قديمة`)

  // ===== توحيد الإجازات: «طلب إجازة» واحد بدل الأنواع المنفصلة =====
  // نعطّل أنواع طلب الإجازة المستقلة (سنوية/مرضية/...) — الموظف يختار
  // النوع من قائمة داخل «طلب إجازة». نُبقي LEAVE و LEAVE_MODIFY_CANCEL.
  const standaloneLeaveCodes = [
    'LEAVE_ANNUAL', 'LEAVE_SICK', 'LEAVE_CASUAL', 'LEAVE_UNPAID',
    'LEAVE_MATERNITY', 'LEAVE_PATERNITY', 'LEAVE_HAJJ', 'LEAVE_MARRIAGE',
    'LEAVE_BEREAVEMENT', 'LEAVE_EXAM', 'LEAVE_COMPENSATORY',
  ]
  let deactivated = 0
  for (const code of standaloneLeaveCodes) {
    const t = await types.findOne({ where: { code } })
    if (t && t.isActive) {
      t.isActive = false
      await types.save(t)
      deactivated++
    }
  }
  if (deactivated > 0) {
    console.log(`✓ عُطّل ${deactivated} نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)`)
  }

  // ===== أنواع الإجازات =====
  for (const lt of leaveTypesSeed) {
    const existing = await leaveTypes.findOne({ where: { code: lt.code } })
    if (!existing) {
      await leaveTypes.save(leaveTypes.create(lt as Partial<LeaveType>))
    }
  }
  console.log(`✓ أنواع الإجازات: ${leaveTypesSeed.length}`)

  // ===== الإعدادات =====
  for (const c of configSeed) {
    const existing = await config.findOne({ where: { key: c.key } })
    if (!existing) await config.save(config.create(c))
  }
  console.log('✓ إعدادات المحرك')
}

// رصيد سنوي افتتاحي للموظف للسنة الحالية — يُستدعى بعد إنشاء الموظفين
export async function ensureLeaveBalance(
  ds: DataSource,
  employeeId: number,
  entitled?: number
) {
  const balances = ds.getRepository(LeaveBalance)
  const period = String(new Date().getFullYear())
  // الاستحقاقان من سياسة الإجازات (leave.annual_entitled / leave.sick_entitled)
  const cfg = async (key: string, fallback: string) =>
    Number(
      (await ds.getRepository(RequestsConfig).findOne({ where: { key } }))
        ?.value ?? fallback
    )
  const annual = entitled ?? (await cfg('leave.annual_entitled', '21'))
  const sick = await cfg('leave.sick_entitled', '180')
  for (const balanceType of ['annual', 'sick']) {
    const existing = await balances.findOne({
      where: { employeeId, balanceType, period },
    })
    if (!existing) {
      await balances.save(
        balances.create({
          employeeId,
          balanceType,
          entitled: balanceType === 'annual' ? entitled : 180,
          taken: 0,
          period,
        })
      )
    }
  }
}

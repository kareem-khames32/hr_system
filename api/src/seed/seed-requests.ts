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
  // بعد ربط كل نوع بسلسلته، السلاسل العامة القديمة لم تعد مرجعية
  let removedOld = 0
  for (const c of chainsSeed) {
    const old = await chains.findOne({ where: { code: c.code } })
    if (old) {
      await steps.delete({ chainId: old.id })
      await chains.delete({ id: old.id })
      removedOld++
    }
  }
  if (removedOld > 0) console.log(`✓ حُذفت ${removedOld} سلسلة مشتركة قديمة`)

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
  entitled = 21
) {
  const balances = ds.getRepository(LeaveBalance)
  const period = String(new Date().getFullYear())
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

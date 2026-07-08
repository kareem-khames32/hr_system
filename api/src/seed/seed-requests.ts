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

  // ===== السلاسل العامة وخطواتها =====
  const chainIdByCode = new Map<string, number>()
  for (const c of chainsSeed) {
    let chain = await chains.findOne({ where: { code: c.code } })
    if (!chain) {
      chain = await chains.save(
        chains.create({ code: c.code, nameAr: c.nameAr, branchId: undefined })
      )
      let order = 1
      for (const s of c.steps) {
        await steps.save(
          steps.create({
            chainId: chain.id,
            stepOrder: order++,
            approverRole: s.role,
            thresholdField: s.thresholdField,
            thresholdOp: s.thresholdOp as any,
            thresholdValue: s.thresholdValue,
            slaDays: s.slaDays,
            escalateTo: s.escalateTo,
          })
        )
      }
    }
    chainIdByCode.set(c.code, chain.id)
  }
  console.log(`✓ سلاسل الاعتماد: ${chainsSeed.length}`)

  // ===== أنواع الطلبات (55) =====
  let createdTypes = 0
  for (const t of typesSeed) {
    const existing = await types.findOne({ where: { code: t.code } })
    if (existing) continue
    await types.save(
      types.create({
        code: t.code,
        nameAr: t.nameAr,
        category: t.category as any,
        requiredFields: t.requiredFields
          ? JSON.stringify(t.requiredFields)
          : undefined,
        approvalChainId: t.chain ? chainIdByCode.get(t.chain) : undefined,
        destinationHandler: t.handler,
        affectsBalance: t.affectsBalance ?? false,
        isSecurityRoute: t.securityRoute ?? false,
        isConfidential: t.confidential ?? false,
        autoGeneratesPdf: t.autoGeneratesPdf ?? false,
        phase: t.phase ?? 'P1',
      })
    )
    createdTypes++
  }
  console.log(`✓ أنواع الطلبات: ${createdTypes} جديد (الإجمالي ${typesSeed.length})`)

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

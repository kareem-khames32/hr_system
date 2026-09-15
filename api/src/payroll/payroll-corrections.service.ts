import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { createHash } from 'node:crypto'
import { EntityManager, In, Not, Repository } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { userHasPerm } from '../auth/guards'
import { PayrollItem, PayrollRun, PayrollRunMember } from './payroll.entities'
import { PayrollRunEvent } from './payroll-membership.entities'
import { PayrollRunReversalLine } from './payroll-corrections.entities'
import { payrollCorrectionReasonIssue, payrollRunTypeOf, PAYROLL_RUN_TYPE_LABELS, summarizePayrollCorrections, type CorrectionRunLite } from './payroll-corrections'
import { describePayrollRunCorrection, lockPayrollRunForCorrection, payrollExemptionCarriesToSupplementary, planPayrollItemReversal, payrollReversalPlanSummary } from './payroll-reversal-ledger'
import { PayrollFinancialExemption } from './financial-exemptions.entities'
import { findPayrollConflicts } from './payroll-membership-guard'
import { lockPayrollEmployees } from './payroll-settlement-boundary'
import { payrollRunStateIssue } from './payroll-run-approval'
import { PayrollService } from './payroll.service'

// C8 / الخطوة 31: مسار تصحيح المسير المصروف — معاينة عكس الصرف وإنشاء مسير العكس، والمسير التكميلي المربوط، وتقرير التسويات.
// اعتماد مسير العكس وتنفيذه وإلغاؤه يمرون من نقاط المسير نفسها (approve/pay/cancel/reopen) بفصل المهام وقيد الصرف (payroll.service.ts).

const cents = (value: unknown) => Math.round(Number(value ?? 0) * 100)
const money = (value: number) => (value / 100).toFixed(2)
const conflict = (code: string, message: string, details: Record<string, unknown> = {}) => new ConflictException({ code, message, ...details })

@Injectable()
export class PayrollCorrectionsService {
  constructor(
    @InjectRepository(PayrollRun) private readonly runs: Repository<PayrollRun>,
    private readonly payroll: PayrollService,
  ) {}

  private async runOr404(em: EntityManager, runId: number) {
    const run = await em.getRepository(PayrollRun).findOneBy({ id: runId })
    if (!run) throw new NotFoundException('المسير غير موجود')
    return run
  }

  private reason(value: unknown) {
    const issue = payrollCorrectionReasonIssue(value)
    if (issue) throw new BadRequestException(issue)
    return String(value).trim()
  }

  /** المسير المصروف القابل للتصحيح: أصلي أو تكميلي، لا مسير عكس. */
  private assertCorrectable(run: PayrollRun, action: string) {
    if (payrollRunTypeOf(run) === 'REVERSAL') throw conflict('PAYRUN-REVERSAL-OF-REVERSAL', 'مسير العكس لا يُصحح بعكس أو تكميلي؛ صحح المسير الأصلي المرتبط به')
    if (run.status !== 'PAID') throw new BadRequestException(payrollRunStateIssue(action, run.status, ['PAID']))
  }

  private async employeeNames(em: EntityManager, runIds: number[], employeeIds: number[]) {
    const names = new Map<number, { fullName: string | null; employeeCode: string | null }>()
    const ids = [...new Set(employeeIds)]
    if (!ids.length) return names
    if (runIds.length) {
      const members = await em.getRepository(PayrollRunMember).find({ where: { runId: In(runIds), employeeId: In(ids) }, order: { id: 'DESC' } })
      for (const member of members) if (member.snapshot && !names.has(member.employeeId)) names.set(member.employeeId, { fullName: member.snapshot.fullName ?? null, employeeCode: member.snapshot.employeeCode ?? null })
    }
    const missing = ids.filter(id => !names.has(id))
    for (let offset = 0; offset < missing.length; offset += 500) {
      const chunk = missing.slice(offset, offset + 500)
      const rows: Array<{ id: number; fullName: string; employeeCode: string }> = await em.query(`SELECT [id],[fullName],[employeeCode] FROM [employees] WHERE [id] IN (${chunk.map((_, index) => `@${index}`).join(',')})`, chunk)
      for (const row of rows) names.set(Number(row.id), { fullName: row.fullName, employeeCode: row.employeeCode })
    }
    return names
  }

  /** جذر السلسلة: أول مسير بلا parentRunId بالصعود من المسير الحالي. */
  private async rootOf(em: EntityManager, run: PayrollRun) {
    let current = run
    for (let guard = 0; current.parentRunId && guard < 50; guard++) {
      const parent = await em.getRepository(PayrollRun).findOneBy({ id: current.parentRunId })
      if (!parent) break
      current = parent
    }
    return current
  }

  private async chainRuns(em: EntityManager, rootId: number): Promise<CorrectionRunLite[]> {
    const found = new Map<number, PayrollRun>()
    const root = await em.getRepository(PayrollRun).findOne({ where: { id: rootId } })
    if (root) found.set(root.id, root)
    let frontier = [rootId]
    for (let guard = 0; frontier.length && guard < 50; guard++) {
      const children = await em.getRepository(PayrollRun).find({ where: { parentRunId: In(frontier) } })
      frontier = children.filter(child => !found.has(child.id)).map(child => child.id)
      for (const child of children) found.set(child.id, child)
    }
    return [...found.values()].map(run => ({ id: run.id, name: run.name, period: run.period, status: run.status, runType: run.runType, parentRunId: run.parentRunId,
      totalNet: run.totalNet, correctionReason: run.correctionReason, paidAt: run.paidAt, approvedAt: run.approvedAt, createdAt: run.createdAt }))
  }

  private async reconciliation(em: EntityManager, rootId: number) {
    const chain = await this.chainRuns(em, rootId)
    const runIds = chain.map(run => run.id)
    const items: Array<{ id: number; runId: number; employeeId: number; netPay: string }> = []
    for (let offset = 0; offset < runIds.length; offset += 500) {
      const chunk = runIds.slice(offset, offset + 500)
      items.push(...(await em.query(`SELECT [id],[runId],[employeeId],CONVERT(varchar(40),[netPay]) AS [netPay] FROM [payroll_items] WHERE [runId] IN (${chunk.map((_, index) => `@${index}`).join(',')})`, chunk))
        .map((row: any) => ({ id: Number(row.id), runId: Number(row.runId), employeeId: Number(row.employeeId), netPay: row.netPay })))
    }
    const reversalIds = chain.filter(run => payrollRunTypeOf(run) === 'REVERSAL').map(run => run.id)
    const lines = reversalIds.length ? await em.getRepository(PayrollRunReversalLine).find({ where: { reversalRunId: In(reversalIds) }, order: { id: 'ASC' } }) : []
    const summary = summarizePayrollCorrections(rootId, chain, items, lines)
    const names = await this.employeeNames(em, runIds, summary.employees.map(row => row.employeeId))
    return { ...summary, employees: summary.employees.map(row => ({ ...row, fullName: names.get(row.employeeId)?.fullName ?? null, employeeCode: names.get(row.employeeId)?.employeeCode ?? null })),
      items, lines }
  }

  /**
   * من يُصرف له مسير تكميلي مربوط بهذا المسير: موظف في عضويته (داخل أو مستبعد) أو بنوده، وليس له حجز أو مسير معتمد/مصروف حاجب على الفترة الآن
   * (البند المعكوس المنفذ يحرر حجزه). غير المؤهل يُعرض بسببه.
   */
  private async supplementaryCandidates(em: EntityManager, run: PayrollRun) {
    if (payrollRunTypeOf(run) === 'REVERSAL') return { available: false, reason: 'مسير العكس لا يُربط به مسير تكميلي؛ اربطه بالمسير الأصلي', candidates: [] }
    if (run.status !== 'PAID') return { available: false, reason: 'المسير التكميلي يُربط بمسير مصروف', candidates: [] }
    if (!run.policyVersionId) return { available: false, reason: 'مسير سابق بلا نسخة سياسة منشورة؛ المسير التكميلي يُحتسب بنسخة سياسة المسير الأصلي', candidates: [] }
    const members = await em.getRepository(PayrollRunMember).find({ where: { runId: run.id } })
    const items = await em.getRepository(PayrollItem).find({ where: { runId: run.id }, select: { id: true, employeeId: true, netPay: true } })
    const ids = [...new Set([...members, ...items].map(row => row.employeeId))].sort((a, b) => a - b)
    const conflicts = ids.length ? await findPayrollConflicts(em, { startDate: run.startDate, endDate: run.endDate, period: run.period }, ids) : []
    const posted = await em.getRepository(PayrollRunReversalLine).find({ where: { originalRunId: run.id, status: 'POSTED' } })
    const pending = await em.getRepository(PayrollRunReversalLine).find({ where: { originalRunId: run.id, status: 'PENDING' } })
    const names = await this.employeeNames(em, [run.id], ids)
    // C3 × C8: من عُكس بنده وله إعفاء مطبق في المسير الأصلي — إعفاء الحضور يُنقل للتكميلي عند إنشائه، و«كل الخصومات» يُمنح صراحةً، والإسقاط أو التأجيل المنفذ يبقى
    const reversedIds = [...new Set(posted.map(line => line.employeeId))]
    const appliedExemptions = reversedIds.length ? await em.getRepository(PayrollFinancialExemption).find({ where: { runId: run.id, employeeId: In(reversedIds), status: 'APPLIED' },
      select: { id: true, employeeId: true, scopeKind: true, targetKind: true }, order: { id: 'ASC' } }) : []
    const exemptionsOf = (employeeId: number) => {
      const own = appliedExemptions.filter(row => row.employeeId === employeeId)
      const tags = (rows: typeof own) => rows.map(row => `#${row.id}`).join('، ')
      const carried = own.filter(row => payrollExemptionCarriesToSupplementary(row))
      const all = own.filter(row => !payrollExemptionCarriesToSupplementary(row) && row.scopeKind === 'ALL_DEDUCTIONS')
      const preserved = own.filter(row => !payrollExemptionCarriesToSupplementary(row) && row.scopeKind !== 'ALL_DEDUCTIONS')
      const notes = [
        carried.length ? `إعفاء خصومات الحضور (${tags(carried)}) يُنقل تلقائيًا بقراره الأصلي إلى المسير التكميلي عند إنشائه` : null,
        all.length ? `إعفاء «كل الخصومات» (${tags(all)}) لا يُنقل تلقائيًا؛ امنح إعفاء الحضور على التكميلي بعد حسابه إن بقي مستحقًا (القرار المعكوس لا يُحتسب في حد الموظف)` : null,
        preserved.length ? `قرار الإعفاء (${tags(preserved)}) أسقط أو أجّل عند الصرف ويبقى نافذًا` : null,
      ].filter((note): note is string => !!note)
      return { exemptionIds: own.map(row => row.id), carriedExemptionIds: carried.map(row => row.id), warning: notes.length ? notes.join(' — ') : null }
    }
    const candidates = ids.map(employeeId => {
      const own = conflicts.filter(row => row.employeeId === employeeId)
      const blocking = own.filter(row => row.blocking)
      const member = members.find(row => row.employeeId === employeeId)
      const reversed = posted.some(line => line.employeeId === employeeId)
      const basis = reversed ? 'REVERSED' : member?.membershipStatus === 'EXCLUDED' ? 'EXCLUDED' : items.some(item => item.employeeId === employeeId) ? 'PAID_IN_RUN' : 'MEMBER'
      const reason = blocking.length ? (blocking.some(row => row.otherRunId === run.id)
          ? (pending.some(line => line.employeeId === employeeId) ? 'بنده في هذا المسير بانتظار تنفيذ العكس' : 'مصروف في هذا المسير؛ اعكس بنده أولًا')
          : `مرتبط بالمسير #${blocking[0].otherRunId} (${blocking[0].status})`)
        : null
      const exemptions = reversed ? exemptionsOf(employeeId) : { exemptionIds: [], carriedExemptionIds: [], warning: null }
      return { employeeId, fullName: names.get(employeeId)?.fullName ?? null, employeeCode: names.get(employeeId)?.employeeCode ?? null, basis,
        eligible: !blocking.length, reason, draftRuns: own.filter(row => !row.blocking).map(row => ({ runId: row.otherRunId, status: row.status })), ...exemptions }
    })
    return { available: true, reason: null, candidates: candidates.filter(row => row.eligible || row.basis === 'REVERSED' || row.basis === 'EXCLUDED') }
  }

  async view(user: JwtPayload, runId: number) {
    const em = this.runs.manager
    const run = await this.runOr404(em, runId)
    await this.payroll.assertRunAccess(user, run, em)
    const root = await this.rootOf(em, run)
    const { items, lines, ...reconciliation } = await this.reconciliation(em, root.id)
    const correction = await describePayrollRunCorrection(em, run)
    const correctable = run.status === 'PAID' && payrollRunTypeOf(run) !== 'REVERSAL'
    const reversible = correctable ? items.filter(item => item.runId === run.id).map(item => {
      const line = lines.filter(row => row.originalItemId === item.id && row.status !== 'CANCELLED').sort((a, b) => b.id - a.id)[0]
      const person = reconciliation.employees.find(row => row.employeeId === item.employeeId)
      return { itemId: item.id, employeeId: item.employeeId, fullName: person?.fullName ?? null, employeeCode: person?.employeeCode ?? null, netPay: money(cents(item.netPay)),
        reversal: line ? { lineId: line.id, reversalRunId: line.reversalRunId, status: line.status } : null }
    }).sort((a, b) => a.employeeId - b.employeeId) : []
    return {
      run: { id: run.id, name: run.name, period: run.period, status: run.status, runType: payrollRunTypeOf(run), runTypeLabel: PAYROLL_RUN_TYPE_LABELS[payrollRunTypeOf(run)] },
      root: { id: root.id, name: root.name, period: root.period, status: root.status },
      correction, reconciliation, reversible,
      supplementary: await this.supplementaryCandidates(em, run),
      permissions: { canReverse: correctable && userHasPerm(user, 'payroll.reverse'), canSupplement: correctable && userHasPerm(user, 'payroll.calculate') },
    }
  }

  private async selectedItems(em: EntityManager, run: PayrollRun, employeeIds?: number[]) {
    const items = await em.getRepository(PayrollItem).find({ where: { runId: run.id }, order: { employeeId: 'ASC' } })
    if (!items.length) throw new BadRequestException({ code: 'PAYRUN-REVERSAL-EMPTY', message: 'المسير لا يحتوي بنودًا مصروفة لعكسها' })
    if (!employeeIds?.length) return items
    const missing = employeeIds.filter(id => !items.some(item => item.employeeId === id))
    if (missing.length) throw new BadRequestException({ code: 'PAYRUN-REVERSAL-EMPLOYEE-NOT-IN-RUN', message: `الموظف رقم ${missing[0]} ليس له بند مصروف في هذا المسير`, employeeIds: missing })
    return items.filter(item => employeeIds.includes(item.employeeId))
  }

  private previewHash(run: PayrollRun, plans: Awaited<ReturnType<typeof planPayrollItemReversal>>[]) {
    return createHash('sha256').update(JSON.stringify({ runId: run.id, lines: plans.map(plan => [plan.itemId, plan.hash, payrollReversalPlanSummary(plan)]) })).digest('hex')
  }

  private async planAll(em: EntityManager, run: PayrollRun, items: PayrollItem[]) {
    const plans = []
    for (const item of items) plans.push(await planPayrollItemReversal(em, run, item))
    const names = await this.employeeNames(em, [run.id], items.map(item => item.employeeId))
    const lines = plans.map(plan => ({ ...payrollReversalPlanSummary(plan), fullName: names.get(plan.employeeId)?.fullName ?? null, employeeCode: names.get(plan.employeeId)?.employeeCode ?? null }))
    return { plans, lines, blockers: plans.flatMap(plan => plan.blockers), totalNet: money(plans.reduce((sum, plan) => sum + cents(plan.netPay), 0)), previewHash: this.previewHash(run, plans) }
  }

  /** معاينة عكس الصرف (قراءة فقط): ما سيعود لكل موظف وما يمنعه، وبصمة المعاينة التي يُشترط إرسالها مع الإنشاء. */
  async previewReversal(user: JwtPayload, runId: number, dto: { employeeIds?: number[] }) {
    const em = this.runs.manager
    const run = await this.runOr404(em, runId)
    await this.payroll.assertRunAccess(user, run, em)
    this.assertCorrectable(run, 'عكس صرف المسير')
    const items = await this.selectedItems(em, run, dto.employeeIds)
    const { plans: _plans, ...preview } = await this.planAll(em, run, items)
    return { runId: run.id, period: run.period, employees: items.length, blocked: preview.blockers.length > 0, ...preview }
  }

  /** إنشاء مسير العكس (CALCULATED) بسطر معلق لكل بند؛ لا أثر مالي قبل اعتماده من مستخدم آخر وتنفيذه بقيد صرف. */
  async createReversal(user: JwtPayload, runId: number, dto: { employeeIds?: number[]; reason?: unknown; previewHash?: string }) {
    const reason = this.reason(dto.reason)
    const reversalRunId = await this.runs.manager.transaction(async em => {
      await lockPayrollRunForCorrection(em, runId)
      const run = await this.runOr404(em, runId)
      await this.payroll.assertRunAccess(user, run, em)
      this.assertCorrectable(run, 'عكس صرف المسير')
      const items = await this.selectedItems(em, run, dto.employeeIds)
      await lockPayrollEmployees(em, items.map(item => item.employeeId))
      const { plans, lines, blockers, totalNet, previewHash } = await this.planAll(em, run, items)
      if (blockers.length) throw conflict('PAYRUN-REVERSAL-BLOCKED', `تعذر عكس الصرف: ${blockers[0].message}${blockers.length > 1 ? ` (و${blockers.length - 1} مانعًا آخر)` : ''}`, { blockers })
      if (!dto.previewHash || dto.previewHash !== previewHash) throw conflict('PAYRUN-REVERSAL-PREVIEW-STALE', 'اعرض معاينة العكس الحالية ثم أكد الإنشاء؛ تغيّرت بنود العكس أو آثاره منذ المعاينة')
      const base = `عكس صرف ${run.name ?? `المسير #${run.id}`}`.slice(0, 170)
      let name = base
      for (let suffix = 2; (await em.query(`SELECT TOP (1) [id] FROM [payroll_runs] WHERE [period]=@0 AND [name]=@1 AND [status]<>'CANCELLED'`, [run.period, name])).length; suffix++) {
        if (suffix > 200) throw conflict('PAYRUN-REVERSAL-NAME', 'تعذر اشتقاق اسم فريد لمسير العكس')
        name = `${base} (${suffix})`
      }
      const repo = em.getRepository(PayrollRun)
      const reversal = await repo.save(repo.create({ name, scopeType: 'CUSTOM', scopeIds: null, employeeIds: JSON.stringify(items.map(item => item.employeeId)), branchId: run.branchId,
        policyId: run.policyId, policyVersionId: run.policyVersionId, definition: null, period: run.period, startDate: run.startDate, endDate: run.endDate, status: 'CALCULATED',
        totalNet: -Number(totalNet), snapshotVersion: 0, engineMode: run.engineMode ?? null, calculatedBy: user.sub, calculatedAt: new Date(),
        runType: 'REVERSAL', parentRunId: run.id, correctionReason: reason }))
      const lineRepo = em.getRepository(PayrollRunReversalLine)
      for (const plan of plans) {
        await lineRepo.save(lineRepo.create({ reversalRunId: reversal.id, originalRunId: run.id, originalItemId: plan.itemId, employeeId: plan.employeeId, status: 'PENDING',
          netPay: plan.netPay, itemSnapshot: JSON.stringify(plan.snapshot), itemHash: plan.hash, effects: null, createdByUserId: user.sub }))
      }
      const events = em.getRepository(PayrollRunEvent)
      const summary = lines.map(({ blockers: _blockers, ...line }) => line)
      await events.save({ runId: reversal.id, eventType: 'REVERSAL_CREATED', actorUserId: user.sub, reason: reason.slice(0, 500),
        payload: { parentRunId: run.id, employeeIds: items.map(item => item.employeeId), totalNet: -Number(totalNet), previewHash, lines: summary.slice(0, 200) } })
      await events.save({ runId: run.id, eventType: 'REVERSAL_CREATED', actorUserId: user.sub, reason: reason.slice(0, 500),
        payload: { reversalRunId: reversal.id, employeeIds: items.map(item => item.employeeId), totalNet: -Number(totalNet) } })
      return reversal.id
    })
    return this.payroll.detail(user, reversalRunId)
  }

  /** مسير تكميلي مربوط بالمسير المصروف: مسودة بنسخة سياسته وفترته وقائمة الموظفين المؤهلين، ثم الحساب والاعتماد والصرف المعتادة. */
  async createSupplementary(user: JwtPayload, runId: number, dto: { employeeIds: number[]; name?: string; reason?: unknown }) {
    const reason = this.reason(dto.reason)
    const em = this.runs.manager
    const run = await this.runOr404(em, runId)
    await this.payroll.assertRunAccess(user, run, em)
    this.assertCorrectable(run, 'إنشاء مسير تكميلي')
    const eligibility = await this.supplementaryCandidates(em, run)
    if (!eligibility.available) throw conflict('PAYRUN-SUPPLEMENTARY-UNAVAILABLE', eligibility.reason ?? 'المسير التكميلي غير متاح لهذا المسير')
    const ids = [...new Set(dto.employeeIds)].sort((a, b) => a - b)
    const notEligible = ids.filter(id => !eligibility.candidates.some(row => row.employeeId === id && row.eligible))
    if (!ids.length || notEligible.length) {
      const first = eligibility.candidates.find(row => row.employeeId === notEligible[0])
      throw conflict('PAYRUN-SUPPLEMENTARY-NOT-ELIGIBLE', ids.length
        ? `الموظف رقم ${notEligible[0]} غير مؤهل للمسير التكميلي: ${first?.reason ?? 'ليس عضوًا في المسير الأصلي'}`
        : 'اختر موظفًا واحدًا على الأقل للمسير التكميلي', { employeeIds: notEligible })
    }
    const base = (typeof dto.name === 'string' && dto.name.trim() ? dto.name.trim() : `تكميلي ${run.name ?? `المسير #${run.id}`}`).slice(0, 180)
    let name = base
    for (let suffix = 2; (await em.query(`SELECT TOP (1) [id] FROM [payroll_runs] WHERE [period]=@0 AND [name]=@1 AND [status]<>'CANCELLED'`, [run.period, name])).length; suffix++) {
      if (dto.name?.trim()) break
      if (suffix > 200) throw conflict('PAYRUN-SUPPLEMENTARY-NAME', 'تعذر اشتقاق اسم فريد للمسير التكميلي')
      name = `${base} (${suffix})`
    }
    return this.payroll.createRunDraft(user, { name, policyVersionId: run.policyVersionId!, period: run.period,
      filters: { branchIds: [], departmentIds: [], teamIds: [], employeeIds: ids }, exclusions: [] },
    { runType: 'SUPPLEMENTARY', parentRunId: run.id, correctionReason: reason, startDate: run.startDate, endDate: run.endDate, employeeIds: ids })
  }

  /** تقرير التسويات لفترة: كل سلسلة تصحيح (أصلي + عكس + تكميلي) بفروقها لكل موظف، بنطاق الفرع. */
  async report(user: JwtPayload, query: { fromPeriod: string; toPeriod: string }) {
    if (query.fromPeriod > query.toPeriod) throw new BadRequestException({ code: 'PAYRUN-CORRECTIONS-RANGE', message: 'بداية فترة التقرير بعد نهايتها' })
    const em = this.runs.manager
    const linked = await em.getRepository(PayrollRun).find({ where: { parentRunId: Not(In([0])), period: In(await this.periodsBetween(em, query)) }, order: { id: 'ASC' } })
    const roots = new Map<number, PayrollRun>()
    for (const run of linked.filter(row => row.parentRunId != null)) {
      const root = await this.rootOf(em, run)
      if (!roots.has(root.id)) roots.set(root.id, root)
    }
    type ReconciliationSummary = Omit<Awaited<ReturnType<PayrollCorrectionsService['reconciliation']>>, 'items' | 'lines'>
    const chains: Array<ReconciliationSummary & { root: { id: number; name: string | null; period: string; status: string } }> = []
    for (const root of [...roots.values()].sort((a, b) => a.period.localeCompare(b.period) || a.id - b.id)) {
      try { await this.payroll.assertRunAccess(user, root, em) } catch (error) { if (error instanceof ForbiddenException) continue; throw error }
      const { items: _items, lines: _lines, ...summary } = await this.reconciliation(em, root.id)
      chains.push({ root: { id: root.id, name: root.name, period: root.period, status: root.status }, ...summary })
    }
    const total = (key: 'reversedNet' | 'supplementaryPaidNet' | 'settlementDifference' | 'pendingReversalNet' | 'supplementaryOpenNet') => money(chains.reduce((sum, chain) => sum + cents(chain.totals[key]), 0))
    return { fromPeriod: query.fromPeriod, toPeriod: query.toPeriod, chains,
      totals: { chains: chains.length, reversedNet: total('reversedNet'), pendingReversalNet: total('pendingReversalNet'), supplementaryPaidNet: total('supplementaryPaidNet'),
        supplementaryOpenNet: total('supplementaryOpenNet'), settlementDifference: total('settlementDifference') } }
  }

  private async periodsBetween(em: EntityManager, query: { fromPeriod: string; toPeriod: string }) {
    const rows: Array<{ period: string }> = await em.query(`SELECT DISTINCT [period] FROM [payroll_runs] WHERE [parentRunId] IS NOT NULL AND [period]>=@0 AND [period]<=@1`, [query.fromPeriod, query.toPeriod])
    return rows.length ? rows.map(row => row.period) : ['0000-00']
  }
}

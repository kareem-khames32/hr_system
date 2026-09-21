import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { DataSource, EntityManager, In } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { PayrollItem, PayrollRun, PayrollRunMember } from './payroll.entities'
import { PayrollRunEvent } from './payroll-membership.entities'
import { PayrollItemDisbursement } from './payroll-disbursement.entities'
import {
  buildPayrollDisbursementRows, filterPayrollDisbursementRows, payrollDisbursementMode, payrollDisbursementNote, payrollDisbursementOpen, summarizePayrollDisbursement,
  PAYROLL_DISBURSE_BULK_MAX, type PayrollDisbursementFilter, type PayrollDisbursementRow,
} from './payroll-disbursement'
import { PAY_METHOD_LABELS } from './pay-split'
import { PAYROLL_PAY_CHANNEL_LABELS, payrollRunStateIssue, type PayrollPayChannel } from './payroll-run-approval'
import { payrollRunTypeOf } from './payroll-corrections'
import { lockPayrollRunForCorrection } from './payroll-reversal-ledger'
import { PayrollService } from './payroll.service'

// صرف الرواتب موظف بموظف: حامل payroll.disburse يشوف موظفي المسير المعتمد ويعلّم «تم الصرف / لم يتم» — ولا حاجة غير كده.
// الخدمة دي مابتكتبش غير جدول العلامات وحدث على المسير؛ مفيش مبلغ ولا حالة مسير بتتغير من هنا.

const RUN_NOT_FOUND = 'المسير غير موجود'
const DISBURSABLE = ['APPROVED', 'PAID'] as const

@Injectable()
export class PayrollDisbursementService {
  constructor(private readonly dataSource: DataSource, private readonly payroll: PayrollService) {}

  private get manager() { return this.dataSource.manager }

  private async userNames(em: EntityManager, ids: Array<number | null | undefined>) {
    const unique = [...new Set(ids.filter((id): id is number => Number.isSafeInteger(id) && Number(id) > 0))]
    if (!unique.length) return new Map<number, string>()
    const rows: Array<{ id: number; displayName: string | null }> = await em.query(
      `SELECT [id], [displayName] FROM [users] WHERE [id] IN (${unique.map((_, index) => `@${index}`).join(', ')})`, unique)
    return new Map(rows.map(row => [Number(row.id), row.displayName || 'حساب بلا اسم']))
  }

  /** المسير في نطاق المستخدم وحالته تسمح بالصرف؛ «غير موجود» و«خارج نطاقك» رد واحد (لا كاشف وجود). */
  private async disbursableRun(em: EntityManager, user: JwtPayload, runId: number) {
    const run = await em.getRepository(PayrollRun).findOneBy({ id: runId })
    if (!run) throw new NotFoundException(RUN_NOT_FOUND)
    try { await this.payroll.assertRunAccess(user, run, em) }
    catch (error) { if (error instanceof ForbiddenException) throw new NotFoundException(RUN_NOT_FOUND); throw error }
    if (payrollRunTypeOf(run) === 'REVERSAL') throw new BadRequestException({ code: 'PAYRUN-DISBURSE-REVERSAL', message: 'مسير العكس استرداد مش صرف؛ مفيش موظفين يتعلّم لهم «تم الصرف»' })
    if (!(DISBURSABLE as readonly string[]).includes(run.status)) throw new BadRequestException(payrollRunStateIssue('صرف رواتب الموظفين', run.status, ['APPROVED', 'PAID']))
    return run
  }

  private async rowsOf(em: EntityManager, user: JwtPayload, run: PayrollRun) {
    const items = await em.getRepository(PayrollItem).find({ where: { runId: run.id }, order: { employeeId: 'ASC' } })
    const members = await em.getRepository(PayrollRunMember).find({ where: { runId: run.id } })
    const employeeIds = [...new Set(items.map(item => item.employeeId))]
    const employees: Employee[] = []
    for (let offset = 0; offset < employeeIds.length; offset += 1000) {
      employees.push(...await em.getRepository(Employee).find({ where: { id: In(employeeIds.slice(offset, offset + 1000)) },
        select: ['id', 'employeeCode', 'fullName', 'branchId', 'payMethod', 'bankTransferAmount', 'bankName', 'iban'] }))
    }
    const marks = await em.getRepository(PayrollItemDisbursement).find({ where: { runId: run.id } })
    return { items, marks, ...buildPayrollDisbursementRows({ runStatus: run.status, items, employees, members, marks, branchScope: branchScopeOf(user) }) }
  }

  private runView(run: PayrollRun, mode: ReturnType<typeof payrollDisbursementMode>, names: Map<number, string>) {
    return { id: run.id, name: run.name, period: run.period, startDate: run.startDate, endDate: run.endDate, status: run.status, runType: payrollRunTypeOf(run),
      mode, marking: payrollDisbursementOpen(run.status, mode),
      closed: run.status === 'PAID' ? { at: run.paidAt ?? null, by: run.paidBy == null ? null : { id: run.paidBy, name: names.get(run.paidBy) ?? null },
        channel: run.payChannel, channelLabel: run.payChannel ? PAYROLL_PAY_CHANNEL_LABELS[run.payChannel as PayrollPayChannel] ?? run.payChannel : null,
        reference: run.payReference } : null }
  }

  /** المسيرات المتاحة للصرف في نطاق المستخدم: المعتمدة (مفتوحة للتعليم) والمصروفة (للمتابعة)، بعدد اللي اتعلّم في كل واحد. */
  async runs(user: JwtPayload) {
    const visible = (await this.payroll.list(user)).filter(run => (DISBURSABLE as readonly string[]).includes(run.status) && payrollRunTypeOf(run) !== 'REVERSAL')
    if (!visible.length) return []
    const ids = visible.map(run => run.id)
    const paid: Array<{ runId: number; n: number }> = []
    for (let offset = 0; offset < ids.length; offset += 1000) {
      const chunk = ids.slice(offset, offset + 1000)
      paid.push(...await this.manager.query(`SELECT [runId], COUNT(*) AS [n] FROM [payroll_item_disbursements]
        WHERE [status] = 'PAID' AND [runId] IN (${chunk.map((_, index) => `@${index}`).join(', ')}) GROUP BY [runId]`, chunk))
    }
    const paidOf = new Map(paid.map(row => [Number(row.runId), Number(row.n)]))
    return visible.map(run => ({ id: run.id, name: run.name, period: run.period, startDate: run.startDate, endDate: run.endDate, status: run.status,
      runType: payrollRunTypeOf(run), totalNet: Number(run.totalNet), markedPaid: paidOf.get(run.id) ?? 0 }))
  }

  async view(user: JwtPayload, runId: number, filter: PayrollDisbursementFilter) {
    const em = this.manager
    const run = await this.disbursableRun(em, user, runId)
    const { rows, mode } = await this.rowsOf(em, user, run)
    const shown = filterPayrollDisbursementRows(rows, filter)
    const names = await this.userNames(em, [run.paidBy, ...rows.map(row => row.markedByUserId)])
    const facet = <T extends number | string>(pairs: Array<[T | null, string | null]>) => {
      const seen = new Map<T, string>()
      for (const [id, name] of pairs) if (id != null && !seen.has(id)) seen.set(id, name ?? String(id))
      return [...seen].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'ar'))
    }
    const changeable = (paid: boolean) => shown.filter(row => row.tickable && (paid ? row.state === 'UNPAID' : row.state === 'PAID')).length
    return {
      run: this.runView(run, mode, names),
      totals: summarizePayrollDisbursement(rows), filteredTotals: summarizePayrollDisbursement(shown),
      counts: { all: rows.length, shown: shown.length },
      // كام صف هيتغير لو اتعلّم المفلتر كله — بيرجع مع طلب التعليم الجماعي عشان الخادم يرفض لو الشاشة قديمة
      bulk: { markPaid: changeable(true), markUnpaid: changeable(false) },
      facets: {
        branches: facet(rows.map(row => [row.branchId, row.branchName])), departments: facet(rows.map(row => [row.departmentId, row.departmentName])),
        teams: facet(rows.map(row => [row.teamId, row.teamName])),
        payMethods: facet(rows.filter(row => row.state !== 'SETTLEMENT').map(row => [row.payMethod, PAY_METHOD_LABELS[row.payMethod] ?? row.payMethod])),
      },
      rows: shown.map(row => ({ ...row, markedBy: row.markedByUserId == null ? null : { id: row.markedByUserId, name: names.get(row.markedByUserId) ?? null } })),
    }
  }

  /** كتابة العلامات تحت قفل المسير: الحالة بتتفحص تاني جوّه المعاملة، وكل نداء بحدث واحد على المسير. */
  private async write(user: JwtPayload, runId: number, paid: boolean, noteInput: unknown,
    pick: (rows: PayrollDisbursementRow[]) => PayrollDisbursementRow[]) {
    const note = payrollDisbursementNote(noteInput)
    const result = await this.manager.transaction(async em => {
      await lockPayrollRunForCorrection(em, runId)
      const run = await this.disbursableRun(em, user, runId)
      const { rows, mode, items } = await this.rowsOf(em, user, run)
      const open = payrollDisbursementOpen(run.status, mode)
      if (open === 'CLOSED') throw new ConflictException({ code: 'PAYRUN-DISBURSE-CLOSED', message: 'المسير اتصرف كله مرة واحدة واتقفل؛ مفيش علامات صرف تتغير فيه' })
      if (open === 'LATE_ONLY' && !paid) throw new ConflictException({ code: 'PAYRUN-DISBURSE-CLOSED', message: 'الصرف اتقفل على المسير ده؛ اللي اتعلّم «تم الصرف» مابيتلغيش، واللي لسه ماتصرفلوش بس هو اللي بيتعلّم' })
      const targets = pick(rows)
      if (!targets.length) throw new BadRequestException({ code: 'PAYRUN-DISBURSE-EMPTY', message: 'مفيش موظفين مختارين للتعليم' })
      if (targets.length > PAYROLL_DISBURSE_BULK_MAX) throw new BadRequestException({ code: 'PAYRUN-DISBURSE-TOO-MANY', message: `علّم ${PAYROLL_DISBURSE_BULK_MAX} موظف كحد أقصى في المرة الواحدة` })
      const refused = targets.find(row => !row.tickable)
      if (refused) {
        throw new ConflictException({ code: refused.state === 'SETTLEMENT' ? 'PAYRUN-DISBURSE-SETTLEMENT' : refused.state === 'NO_AMOUNT' ? 'PAYRUN-DISBURSE-NO-AMOUNT' : 'PAYRUN-DISBURSE-CLOSED',
          employeeId: refused.employeeId,
          message: refused.state === 'SETTLEMENT' ? `«${refused.fullName}» راتبه مصروف مع التصفية — مابيتعلّمش هنا`
            : refused.state === 'NO_AMOUNT' ? `«${refused.fullName}» مالوش مبلغ يتصرف في المسير ده`
            : `«${refused.fullName}» اتعلّم «تم الصرف» والصرف اتقفل؛ علامته مابتتغيرش` })
      }
      const wanted = paid ? 'PAID' : 'UNPAID'
      const changing = targets.filter(row => row.state !== wanted)
      const repo = em.getRepository(PayrollItemDisbursement)
      const existing = changing.length ? await repo.find({ where: { runId: run.id, itemId: In(changing.map(row => row.itemId)) } }) : []
      const itemOf = new Map(items.map(item => [item.id, item]))
      const now = new Date()
      let totalCents = 0
      for (const row of changing) {
        const item = itemOf.get(row.itemId)!
        totalCents += Math.round((row.bankAmount + row.cashAmount) * 100)
        await repo.save({ ...(existing.find(mark => mark.itemId === row.itemId) ?? {}), runId: run.id, itemId: row.itemId, employeeId: row.employeeId, status: wanted,
          // المبلغ من بند المسير المحفوظ نفسه، وتقسيمه وطريقة الصرف كما في كشف البنوك لحظة العلامة
          amount: Number(item.netPay) || 0, bankAmount: row.bankAmount, cashAmount: row.cashAmount, payMethod: row.payMethod, note, markedByUserId: user.sub, markedAt: now })
      }
      if (changing.length) {
        await em.getRepository(PayrollRunEvent).save({ runId: run.id, eventType: 'DISBURSEMENT_MARKED', actorUserId: user.sub, reason: note,
          payload: { paid, count: changing.length, total: totalCents / 100, employeeIds: changing.map(row => row.employeeId), runStatus: run.status } })
      }
      return { changed: changing.length, unchanged: targets.length - changing.length }
    })
    return result
  }

  /** علامة موظف واحد أو مجموعة مختارة بالاسم. */
  async mark(user: JwtPayload, runId: number, dto: { itemIds: number[]; paid: boolean; note?: unknown }, filter: PayrollDisbursementFilter = {}) {
    const ids = new Set(dto.itemIds)
    const result = await this.write(user, runId, dto.paid, dto.note, rows => {
      const picked = rows.filter(row => ids.has(row.itemId))
      if (picked.length !== ids.size) throw new NotFoundException({ code: 'PAYRUN-DISBURSE-ITEM', message: 'بند من المختارين مش في المسير ده؛ حدّث الشاشة' })
      return picked
    })
    return { ...result, ...await this.view(user, runId, filter) }
  }

  /** «علّم المفلتر تم الصرف»: الخادم بيطبق نفس الفلاتر بنفسه، ويرفض لو عدد اللي هيتغير غير اللي الشاشة عرضته. */
  async markFiltered(user: JwtPayload, runId: number, dto: { paid: boolean; note?: unknown; expectedCount: number }, filter: PayrollDisbursementFilter) {
    const result = await this.write(user, runId, dto.paid, dto.note, rows => {
      const picked = filterPayrollDisbursementRows(rows, filter).filter(row => row.tickable && row.state === (dto.paid ? 'UNPAID' : 'PAID'))
      if (picked.length !== dto.expectedCount) {
        throw new ConflictException({ code: 'PAYRUN-DISBURSE-STALE', expected: dto.expectedCount, actual: picked.length,
          message: `الشاشة عرضت ${dto.expectedCount} موظف والموجود دلوقتي ${picked.length} — حدّث الشاشة وراجع قبل التعليم الجماعي` })
      }
      return picked
    })
    return { ...result, ...await this.view(user, runId, filter) }
  }

  /** ملخص الصرف للمالك: لمسير واحد أو لكل مسيرات شهر — تم / لم يتم (عدد وإجمالي) وكل واحد بنك ونقدي. */
  async summary(user: JwtPayload, query: { period?: string; runId?: number }) {
    const em = this.manager
    if (query.runId == null && !query.period) throw new BadRequestException({ code: 'PAYRUN-DISBURSE-SUMMARY-SCOPE', message: 'اختار مسير أو شهر للملخص' })
    const visible = (await this.payroll.list(user)).filter(run => (DISBURSABLE as readonly string[]).includes(run.status) && payrollRunTypeOf(run) !== 'REVERSAL'
      && (query.runId != null ? run.id === query.runId : run.period === query.period))
    if (query.runId != null && !visible.length) throw new NotFoundException(RUN_NOT_FOUND)
    const runs = []
    const totalRows: PayrollDisbursementRow[] = []
    const closers = await this.userNames(em, visible.map(run => run.paidBy))
    for (const light of visible.sort((a, b) => a.period.localeCompare(b.period) || a.id - b.id)) {
      const run = await em.getRepository(PayrollRun).findOneByOrFail({ id: light.id })
      const { rows, mode } = await this.rowsOf(em, user, run)
      totalRows.push(...rows)
      const closeEvent = run.status === 'PAID' ? await em.getRepository(PayrollRunEvent).findOne({ where: { runId: run.id, eventType: 'PAID' }, order: { id: 'DESC' } }) : null
      const close = (closeEvent?.payload as { disbursement?: { unpaidReason?: string | null } } | null)?.disbursement ?? null
      runs.push({ ...this.runView(run, mode, closers), unpaidReason: close?.unpaidReason ?? null, ...summarizePayrollDisbursement(rows) })
    }
    return { period: query.period ?? runs[0]?.period ?? null, runId: query.runId ?? null, runs, totals: summarizePayrollDisbursement(totalRows) }
  }
}

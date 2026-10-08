import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, In, type EntityManager } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, inBranchScope, userHasPerm } from '../auth/guards'
import { Comment } from '../comments/comment.entity'
import { RequestType } from '../requests/entities/request-type.entity'
import { Request } from '../requests/entities/request.entity'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { executionSchemaReady } from '../requests/execution-tasks'
import { taskLocalDate } from '../tasks/task-rules'
import { RequestServiceRating } from './helpdesk.entities'
import {
  HELPDESK_CATEGORY, HELPDESK_FIRST_RESPONSE_KEY, HELPDESK_MIGRATION_MISSING, HELPDESK_NOT_FOUND, HELPDESK_PERMISSION, HELPDESK_RATED, HELPDESK_RATING_STAGE, HELPDESK_SERVICE_LABELS,
  average, cleanHelpdeskComment, cleanHelpdeskRange, cleanHelpdeskRating, firstResponseHours, helpdeskReady,
} from './helpdesk-rules'

interface TaskFacts { status: string; dueDate: string | null; closedAt: Date | null }
const HOUR = 3600000

// B3.10: مركز خدمات الموارد البشرية — الاستفسار طلب في محرك الطلبات (فئة «استفسارات»): اعتماد فوري بسلسلته، ومهمة تنفيذ على دور النوع بمهلة،
// وردود في تعليقات الطلب. هنا بس: استفسارات الموظف بحالة خدمتها، وتقييمه بعد الإقفال، وتقرير المتوسطات والمهل (بصلاحية وبنطاق الفروع).
@Injectable()
export class HelpdeskService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  /** أنواع فئة الاستفسارات (كودها ← اسمها) */
  private async inquiryTypes(em: EntityManager): Promise<Map<string, string>> {
    return new Map((await em.getRepository(RequestType).find({ where: { category: HELPDESK_CATEGORY as RequestType['category'] } })).map((row) => [row.code, row.nameAr]))
  }

  /** مهام تنفيذ الطلبات (حالتها وموعدها وإقفالها) — فاضية قبل ترحيل مهام التنفيذ */
  private async tasksOf(em: EntityManager, requestIds: number[]): Promise<Map<number, TaskFacts>> {
    const out = new Map<number, TaskFacts>()
    if (!requestIds.length || !(await executionSchemaReady(em))) return out
    for (let offset = 0; offset < requestIds.length; offset += 1000) {
      const part = requestIds.slice(offset, offset + 1000)
      const rows: Array<{ requestId: number; status: string; dueDate: string | null; closedAt: Date | null }> = await em.query(
        `SELECT r.[id] AS [requestId], t.[status], CONVERT(nvarchar(10), t.[dueDate], 23) AS [dueDate], t.[closedAt]
           FROM [requests] r INNER JOIN [tasks] t ON t.[id] = r.[executionTaskId] WHERE r.[id] IN (${part.map((_, index) => `@${index}`).join(', ')})`, part)
      for (const row of rows) out.set(Number(row.requestId), { status: row.status, dueDate: row.dueDate ?? null, closedAt: row.closedAt ?? null })
    }
    return out
  }

  private serviceStatus(request: Pick<Request, 'status'>, task: TaskFacts | undefined): { status: string; label: string } {
    if (request.status === 'COMPLETED') return { status: 'DONE', label: HELPDESK_SERVICE_LABELS.DONE }
    if (request.status === 'REJECTED' || request.status === 'CANCELLED') return { status: 'CANCELLED', label: HELPDESK_SERVICE_LABELS.CANCELLED }
    const status = task && HELPDESK_SERVICE_LABELS[task.status] ? task.status : 'OPEN'
    return { status, label: HELPDESK_SERVICE_LABELS[status] }
  }

  /** «استفساراتي»: استفسارات الموظف بحالة خدمتها وتقييمه */
  async mine(user: JwtPayload) {
    const em = this.ds.manager
    const available = await helpdeskReady(em)
    const types = await this.inquiryTypes(em)
    if (!user.employeeId || !types.size) return { available, inquiries: [] }
    const rows = (await em.getRepository(Request).find({ where: { requesterId: user.employeeId, typeCode: In([...types.keys()]) }, order: { id: 'DESC' }, take: 200 })).filter((row) => row.status !== 'DRAFT')
    const ids = rows.map((row) => row.id)
    const tasks = await this.tasksOf(em, ids)
    const ratings = new Map((available && ids.length ? await em.getRepository(RequestServiceRating).find({ where: { requestId: In(ids) } }) : []).map((row) => [row.requestId, row]))
    return { available, inquiries: rows.map((row) => {
      const service = this.serviceStatus(row, tasks.get(row.id)), rating = ratings.get(row.id)
      let subject = ''
      try { subject = String((JSON.parse(row.payload || '{}') as { reason?: unknown }).reason ?? '') } catch { subject = '' }
      return { id: row.id, typeName: types.get(row.typeCode) ?? row.typeCode, subject: subject.slice(0, 200), createdAt: row.createdAt, serviceStatus: service.status, serviceStatusLabel: service.label,
        dueDate: tasks.get(row.id)?.dueDate ?? null, rating: rating?.rating ?? null, ratingComment: rating?.comment ?? null, canRate: available && row.status === 'COMPLETED' && !rating }
    }) }
  }

  /** تقييم الموظف لخدمة استفساره — صاحبه بس، بعد الإقفال، ومرة واحدة (تحت قفل صف الطلب) */
  async rate(user: JwtPayload, requestId: number, input: { rating?: unknown; comment?: unknown }) {
    const rating = cleanHelpdeskRating(input.rating), comment = cleanHelpdeskComment(input.comment)
    await this.ds.transaction(async (em) => {
      if (!(await helpdeskReady(em))) throw new BadRequestException(HELPDESK_MIGRATION_MISSING)
      const request = await em.getRepository(Request).findOne({ where: { id: requestId }, lock: { mode: 'pessimistic_write' } })
      // طلب حد تاني، أو مش استفسار = غير موجود
      if (!request || !user.employeeId || request.requesterId !== user.employeeId || !(await this.inquiryTypes(em)).has(request.typeCode)) throw new NotFoundException(HELPDESK_NOT_FOUND)
      if (request.status !== 'COMPLETED') throw new BadRequestException(HELPDESK_RATING_STAGE)
      if (await em.getRepository(RequestServiceRating).count({ where: { requestId: request.id } })) throw new ConflictException(HELPDESK_RATED)
      await em.getRepository(RequestServiceRating).insert({ requestId: request.id, rating, comment, createdByUserId: user.sub, createdAt: new Date() })
    })
    return this.mine(user)
  }

  /**
   * تقرير الاستفسارات (بالصلاحية وبنطاق الفروع) لفترة: لكل نوع — العدد، والمفتوح، ومتوسط وقت أول رد (أول تعليق ظاهر للموظف من غيره؛ ولو اتحل من
   * غير رد فوقت الحل) ومتوسط وقت الحل بالساعات، واللي عدّى مهلة أول رد (إعداد) ومهلة الحل (موعد مهمة التنفيذ)، ورضا الموظفين.
   */
  async report(user: JwtPayload, input: { from?: unknown; to?: unknown }) {
    if (!userHasPerm(user, HELPDESK_PERMISSION)) throw new ForbiddenException('الإجراء ده لصاحب صلاحية إدارة مركز الخدمات')
    const em = this.ds.manager
    const today = taskLocalDate(new Date()), range = cleanHelpdeskRange(input.from, input.to, today)
    const types = await this.inquiryTypes(em)
    const limitHours = firstResponseHours((await em.getRepository(RequestsConfig).findOne({ where: { key: HELPDESK_FIRST_RESPONSE_KEY } }))?.value)
    const scope = branchScopeOf(user)
    const all = types.size ? await em.getRepository(Request).createQueryBuilder('request').where('request.typeCode IN (:...codes)', { codes: [...types.keys()] })
      .andWhere('request.createdAt >= :from AND request.createdAt < DATEADD(day, 1, :to)', range).orderBy('request.id', 'ASC').getMany() : []
    const rows = all.filter((row) => row.status !== 'DRAFT' && inBranchScope(scope, row.branchId))
    const ids = rows.map((row) => row.id)
    const tasks = await this.tasksOf(em, ids)
    const comments = ids.length ? await em.getRepository(Comment).find({ where: { entityType: 'request', entityId: In(ids), internal: false }, order: { id: 'ASC' } }) : []
    const ratings = new Map(((await helpdeskReady(em)) && ids.length ? await em.getRepository(RequestServiceRating).find({ where: { requestId: In(ids) } }) : []).map((row) => [row.requestId, row.rating]))
    const now = Date.now()
    const facts = rows.map((row) => {
      const task = tasks.get(row.id), created = new Date(row.createdAt).getTime()
      const reply = comments.find((entry) => entry.entityId === row.id && entry.authorEmployeeId !== row.requesterId)
      const resolved = row.status === 'COMPLETED' && task?.closedAt ? new Date(task.closedAt).getTime() : null
      const open = !resolved && row.status !== 'REJECTED' && row.status !== 'CANCELLED'
      const firstAt = reply ? new Date(reply.createdAt).getTime() : resolved
      const firstHours = firstAt !== null ? Math.max(0, (firstAt - created) / HOUR) : null
      const closedDay = task?.closedAt ? taskLocalDate(new Date(task.closedAt)) : null
      return { typeCode: row.typeCode, open, firstHours, resolutionHours: resolved !== null ? Math.max(0, (resolved - created) / HOUR) : null,
        firstBreached: firstHours !== null ? firstHours > limitHours : open && (now - created) / HOUR > limitHours,
        resolutionBreached: !!task?.dueDate && (closedDay ? closedDay > task.dueDate : open && today > task.dueDate), rating: ratings.get(row.id) ?? null }
    })
    const summary = (part: typeof facts) => ({ total: part.length, open: part.filter((row) => row.open).length, resolved: part.filter((row) => row.resolutionHours !== null).length,
      avgFirstResponseHours: average(part.map((row) => row.firstHours).filter((value): value is number => value !== null)),
      avgResolutionHours: average(part.map((row) => row.resolutionHours).filter((value): value is number => value !== null)),
      firstResponseBreached: part.filter((row) => row.firstBreached).length, resolutionBreached: part.filter((row) => row.resolutionBreached).length,
      rated: part.filter((row) => row.rating !== null).length, satisfaction: average(part.map((row) => row.rating).filter((value): value is number => value !== null)) })
    return { ...range, firstResponseLimitHours: limitHours, totals: summary(facts),
      types: [...types].map(([code, name]) => ({ code, name, ...summary(facts.filter((row) => row.typeCode === code)) })).filter((row) => row.total > 0) }
  }
}

import { BadRequestException, ForbiddenException, HttpException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, In, type EntityManager } from 'typeorm'
import { withDeadlockRetry } from '../attendance/device-sync.service'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, inBranchScope } from '../auth/guards'
import { User } from '../auth/user.entity'
import { Employee } from '../employees/employee.entity'
import { StoredFile } from '../files/stored-file.entity'
import { recordOutboxEvent } from '../queue/outbox'
import { RequestsService } from '../requests/requests.service'
import { taskAwaitsAccount, TASK_NOT_FOUND } from '../tasks/task-rules'
import { TasksService } from '../tasks/tasks.service'
import { Comment } from './comment.entity'
import {
  cleanComment, commentRef, commentsTableReady, commentTargetLabel, isCommentEntity, parseCommentMentions, storedCommentMentions,
  COMMENT_THREAD_MAX, COMMENTS_CONFIDENTIAL, COMMENTS_MIGRATION_MISSING, type CommentEntityType, type CommentInput,
} from './comment-rules'

// B2.8: التعليقات والإشارات — حوار مكتوب على الطلب أو المهمة نفسها (بديل الشات).
//  الحق: حق الكيان بالحرف. الطلب: كل اللي يشوف تفاصيله من غير حجب (بوابة RequestsService.readable نفسها)، والسري لأطرافه بس.
//  المهمة: كل اللي يشوفها (TasksService.commentable) — ومهمة تنفيذ طلب أو إقرار مستند مالهاش حوار (تفاصيلها تبع الطلب أو المستند).
//  «داخلي» (على الطلب بس): مابيرجعش لـ«جانب الموظف» في أي رد ولا عدّ ومايكتبوش — صاحب الطلب، والحساب اللي قدّم الطلب
//  (RequestsService.requesterSide)، واللي رفض استلام عهدة الطلب (طرف فيه بسطر رفضه، ومش جهة اعتماد).
//  الرد مافيهوش رقم تعليق: مرجع (commentRef) — الأرقام من عدّاد واحد، ورقمين ورا بعض كانوا هيقولوا إن فيه تعليق مخفي بينهم.
//  الكتابة: الحق بيتحكم جوه معاملة التعليق وصف الطلب أو المهمة مقفول بقفل القرار أو التحويل نفسه، فتغيير في نفس اللحظة يا إما قبل
//  التعليق يا إما بعده. كاتب مابياخدش صف الطلب الأول (رفض استلام العهدة) بيتقاطع مع قراءات التعليق: القاعدة بتوقّع التعليق (ماكتبش
//  حاجة لسه)، فمعاملته بتتعاد (withDeadlockRetry) والحكم بيتاخد من الأول.
//  الإشارة: لدور في الموضوع (صاحب الطلب، المعتمد الحالي، مسؤول المهمة، اللي كلّف بيها) أو رد على تعليق من نفس الحوار — مش لموظف من
//  الدليل، فالإشارة ماتدّيش حد حق في موضوع مش بتاعه. بتسجّل حدث في نفس المعاملة، ومحرك الإشعارات بيحسب المستلمين وحقهم وقت التوزيع
//  ووقت الإرسال (readableBy).
//  الحوار سجل بيتضاف عليه بس: مفيش تعديل ولا مسح. وقبل ترحيل 093: القراءة «مش متاحة» والكتابة مرفوضة برسالتها.

export const COMMENT_FILE_NOT_FOUND = 'الملف غير موجود'

/** حق الحساب في حوار الكيان */
export interface CommentAccess {
  /** على «جانب الموظف» في الموضوع (صاحب الطلب، أو الحساب اللي قدّمه): التعليق الداخلي مابيرجعلوش ومايكتبوش */
  subject: boolean
  /** طرف في الموضوع: بيشوف أسماء كل الكتّاب */
  party: boolean
  /** الكيان بيقبل تعليق داخلي؟ */
  internal: boolean
  /** موظف صاحب الموضوع — اسمه ظاهر على الكيان نفسه لكل قرّائه */
  subjectEmployeeId: number | null
  /** أدوار الإشارة المتاحة للحساب ده دلوقتي */
  targets: string[]
}

interface AuthorView { name: string | null; subject: boolean }

@Injectable()
export class CommentsService {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly requests: RequestsService,
    private readonly tasks: TasksService
  ) {}

  /**
   * حق الحساب في حوار الكيان. اللي مايشوفش الكيان بياخد نفس رد قراءته (غير موجود أو مرفوض)، ورقم برّه حدود الأرقام = غير موجود.
   * الكتابة بتنادي جوه معاملتها (em) وصف الكيان مقفول (lock).
   */
  async access(user: JwtPayload, entityType: CommentEntityType, entityId: number, em: EntityManager = this.ds.manager, lock = false): Promise<CommentAccess> {
    if (!Number.isSafeInteger(entityId) || entityId < 1 || entityId > 2147483647) throw new NotFoundException(entityType === 'request' ? 'الطلب غير موجود' : TASK_NOT_FOUND)
    if (entityType === 'request') {
      const { req, approvals, party, type } = await this.requests.readable(user, entityId, em, lock)
      // الطلب السري: غير أطرافه بيشوفوه محجوب، ومن غير حوار
      if (!party && type?.isConfidential) throw new ForbiddenException(COMMENTS_CONFIDENTIAL)
      // رفض استلام عهدة الطلب بيكتب سطر رفض في «خطوة 0» باسم الحساب، وكاتبه بيبقى طرف في الطلب بالسطر ده (من قبل الدفعة). حساب كل
      // سطوره في سجل الطلب «خطوة 0» (برّه السلسلة) ومنها رفض = موظف مستلم مش جهة اعتماد: على جانب الموظف زي صاحب الطلب. واللي ليه
      // سطر في السلسلة نفسها (معتمد أو منفّذ) جهة اعتماد حتى لو رفض الاستلام
      const mine = approvals.filter(row => row.approverId === user.sub)
      const subject = this.requests.requesterSide(user, req) || (mine.some(row => row.action === 'REJECTED') && mine.every(row => row.step === 0))
      const requester = !!user.employeeId && user.employeeId === req.requesterId
      const waiting = req.status === 'UNDER_REVIEW' && this.requests.waitingSteps(req).length > 0
      return { subject, party, internal: true, subjectEmployeeId: req.requesterId ?? null,
        targets: [...(requester ? [] : ['REQUESTER']), ...(waiting ? ['CURRENT_APPROVERS'] : [])] }
    }
    const task = await this.tasks.commentable(user, entityId, em, lock)
    return { subject: false, party: true, internal: false, subjectEmployeeId: null,
      targets: [...(taskAwaitsAccount(user, task) ? [] : ['ASSIGNEE']), ...(task.createdByUserId === user.sub ? [] : ['CREATOR'])] }
  }

  /** الحساب ده يقرا التعليق دلوقتي؟ (توزيع إشعار الإشارة وإرساله، وتحميل مرفق التعليق) */
  async readableBy(account: JwtPayload, comment: Pick<Comment, 'entityType' | 'entityId' | 'internal'>): Promise<boolean> {
    if (!isCommentEntity(comment.entityType)) return false
    try {
      const access = await this.access(account, comment.entityType, comment.entityId)
      return !(comment.internal === true && access.subject)
    } catch (error) {
      // رفض أو «غير موجود» = مايقراش. أي خطأ تاني (قاعدة البيانات) بيطلع للمنادي: الإشعار بيتعاد مش بيتشال
      if (error instanceof HttpException) return false
      throw error
    }
  }

  async byId(id: number): Promise<Comment | null> {
    if (!(await commentsTableReady(this.ds.manager))) return null
    return this.ds.getRepository(Comment).findOne({ where: { id } })
  }

  /** الحسابات اللي كتبت التعليقات دي (للرد عليهم) */
  async authorAccountsOf(comment: Pick<Comment, 'entityType' | 'entityId'>, ids: number[]): Promise<number[]> {
    if (!ids.length) return []
    const rows = await this.ds.getRepository(Comment).find({ where: { id: In(ids), entityType: comment.entityType, entityId: comment.entityId }, select: { id: true, authorUserId: true } })
    return [...new Set(rows.map(row => row.authorUserId))]
  }

  private targetViews(entityType: CommentEntityType, keys: readonly string[]) {
    return keys.map(key => ({ key, label: commentTargetLabel(entityType, key) })).filter((row): row is { key: string; label: string } => row.label !== null)
  }

  // ===== القراءة =====
  async list(user: JwtPayload, entityType: CommentEntityType, entityId: number) {
    if (!(await commentsTableReady(this.ds.manager))) return { available: false, comments: [], targets: [], canInternal: false, truncated: false }
    const access = await this.access(user, entityType, entityId)
    // الداخلي برّه استعلام صاحب الطلب نفسه: لا صف ولا عدّ ولا «فيه أكتر»
    const rows = await this.ds.getRepository(Comment).find({
      where: { entityType, entityId, ...(access.subject ? { internal: false } : {}) }, order: { id: 'DESC' }, take: COMMENT_THREAD_MAX + 1 })
    return {
      available: true, comments: await this.views(user, access, entityType, entityId, rows.slice(0, COMMENT_THREAD_MAX).reverse()),
      targets: this.targetViews(entityType, access.targets), canInternal: access.internal && !access.subject, truncated: rows.length > COMMENT_THREAD_MAX,
    }
  }

  private async views(user: JwtPayload, access: CommentAccess, entityType: CommentEntityType, entityId: number, rows: Comment[]) {
    if (!rows.length) return []
    const loaded = new Map(rows.map(row => [row.id, row]))
    const mentionsOf = new Map(rows.map(row => [row.id, parseCommentMentions(row.mentions)]))
    // تعليق مردود عليه أقدم من المعروض: بيتقري بنفس فلتر القارئ
    const older = [...new Set([...mentionsOf.values()].flatMap(mentions => mentions.replyTo))].filter(id => !loaded.has(id))
    if (older.length) {
      for (const row of await this.ds.getRepository(Comment).find({ where: { id: In(older), entityType, entityId, ...(access.subject ? { internal: false } : {}) } })) loaded.set(row.id, row)
    }
    const authors = await this.authorViews(user, access, [...loaded.values()])
    const files = await this.filesOf(rows.map(row => row.id))
    return rows.map(row => ({
      ref: commentRef(row.id), body: row.body, internal: row.internal === true, createdAt: row.createdAt,
      mine: row.authorUserId === user.sub, author: authors.get(row.id)!,
      mentions: {
        targets: this.targetViews(entityType, mentionsOf.get(row.id)!.targets),
        replies: mentionsOf.get(row.id)!.replyTo.filter(id => loaded.has(id))
          .map(id => ({ ref: commentRef(id), mine: loaded.get(id)!.authorUserId === user.sub, author: authors.get(id)! })),
      },
      files: files.get(row.id) ?? [],
    }))
  }

  /**
   * كاتب كل تعليق قدام القارئ ده. صاحب الموضوع باسمه (ظاهر على الكيان نفسه)؛ وأطراف الموضوع بيشوفوا كل الأسماء (زي «بالنيابة عن»
   * في سجل الطلب)؛ وغير الطرف (شايف الطلب بـ«عرض كل الطلبات») بيشوف الاسم لو فرع الكاتب دلوقتي في نطاقه، وإلا من غير اسم. الاسم
   * بموظف الحساب المتسجّل وقت الكتابة — ربط الحساب بموظف تاني بعدها مابيغيّرش كاتب التعليق. حساب من غير موظف: باسم الحساب، وللأطراف بس.
   * ومفيش رقم حساب ولا رقم موظف ولا رقم تعليق في الرد.
   */
  private async authorViews(user: JwtPayload, access: CommentAccess, rows: Comment[]): Promise<Map<number, AuthorView>> {
    const employeeIds = [...new Set(rows.map(row => row.authorEmployeeId).filter((id): id is number => id != null))]
    const employees = employeeIds.length ? await this.ds.getRepository(Employee).find({ where: { id: In(employeeIds) }, select: { id: true, fullName: true, branchId: true } }) : []
    const employeeOf = new Map(employees.map(row => [row.id, row]))
    const accountIds = access.party ? [...new Set(rows.filter(row => row.authorEmployeeId == null).map(row => row.authorUserId))] : []
    const accounts = accountIds.length ? await this.ds.getRepository(User).find({ where: { id: In(accountIds) }, select: { id: true, displayName: true } }) : []
    const accountName = new Map(accounts.map(row => [row.id, row.displayName ?? null]))
    const scope = branchScopeOf(user)
    return new Map(rows.map(row => {
      const employee = row.authorEmployeeId != null ? employeeOf.get(row.authorEmployeeId) : undefined
      const subject = access.subjectEmployeeId != null && row.authorEmployeeId === access.subjectEmployeeId
      const shown = subject || access.party || (!!employee && inBranchScope(scope, employee.branchId))
      const name = !shown ? null : employee ? employee.fullName : row.authorEmployeeId == null ? accountName.get(row.authorUserId) ?? null : null
      return [row.id, { name, subject }]
    }))
  }

  private async filesOf(commentIds: number[]) {
    const byComment = new Map<number, Array<{ id: number; name: string; size: number }>>()
    if (!commentIds.length) return byComment
    const rows = await this.ds.getRepository(StoredFile).find({
      where: { entityType: 'comment', entityId: In(commentIds) }, select: { id: true, originalName: true, size: true, entityId: true }, order: { id: 'ASC' } })
    for (const row of rows) byComment.set(row.entityId, [...(byComment.get(row.entityId) ?? []), { id: row.id, name: row.originalName, size: row.size }])
    return byComment
  }

  // ===== الكتابة =====
  async add(user: JwtPayload, entityType: CommentEntityType, entityId: number, raw: CommentInput) {
    if (!(await commentsTableReady(this.ds.manager))) throw new BadRequestException(COMMENTS_MIGRATION_MISSING)
    const input = cleanComment(entityType, raw)
    const { saved, access } = await withDeadlockRetry(() => this.ds.transaction(async em => {
      // صف الطلب أو المهمة مقفول لآخر المعاملة، والحق والإشارات المتاحة بيتحكموا تحته
      const access = await this.access(user, entityType, entityId, em, true)
      if (input.internal && !access.internal) throw new BadRequestException('التعليق الداخلي على الطلبات بس')
      // جانب الموظف مايكتبش داخلي: مش هيرجعله بعد ما يكتبه
      if (input.internal && access.subject) throw new BadRequestException('التعليق الداخلي لغير صاحب الطلب')
      // الإشارة من المتاح للحساب دلوقتي، والداخلي مايشاورش لصاحب الطلب (مش هيشوفه)
      if (input.targets.some(key => !access.targets.includes(key) || (input.internal && key === 'REQUESTER'))) {
        throw new BadRequestException('الإشارة دي مش متاحة على التعليق ده')
      }
      let replyTo: number[] = []
      if (input.replyTo.length) {
        // الرد على تعليق من نفس الحوار، بمرجعه، ومن آخر تعليقاته بس (حد العرض). تعليق ظاهر مايردّش على داخلي: كان هيقول لصاحب الطلب
        // إن فيه تعليق داخلي ومين كاتبه
        const thread = await em.getRepository(Comment).find({ where: { entityType, entityId, ...(input.internal ? {} : { internal: false }) }, select: { id: true }, order: { id: 'DESC' }, take: COMMENT_THREAD_MAX })
        const idOf = new Map(thread.map(row => [commentRef(row.id), row.id]))
        replyTo = input.replyTo.map(ref => idOf.get(ref)).filter((id): id is number => id !== undefined)
        if (replyTo.length !== input.replyTo.length) throw new BadRequestException('تعليق مردود عليه مش موجود في الحوار ده')
      }
      const row = await em.getRepository(Comment).save(em.getRepository(Comment).create({
        entityType, entityId, authorUserId: user.sub, authorEmployeeId: user.employeeId ?? null, body: input.body, internal: input.internal,
        mentions: storedCommentMentions({ targets: input.targets, replyTo }), createdAt: new Date(),
      }))
      // المرفق: ملف رفعه الكاتب نفسه بتصنيف «تعليق» ولسه مش مربوط — بيتربط مرة واحدة (تعليقين في نفس اللحظة: واحد بس بياخده)
      for (const fileId of input.fileIds) {
        const bound: unknown[] = await em.query(`UPDATE [stored_files] SET [entityId] = @0 OUTPUT INSERTED.[id]
          WHERE [id] = @1 AND [entityType] = N'comment' AND [entityId] IS NULL AND [uploadedBy] = @2`, [row.id, fileId, user.sub])
        if (!bound.length) throw new BadRequestException('مرفق غير صالح — ارفعه من خانة التعليق نفسها')
      }
      // الإشارة: حدث في نفس المعاملة (مراجع بس). المستلمين وحقهم بيتحسبوا وقت التوزيع ووقت الإرسال
      if (input.targets.length || replyTo.length) {
        await recordOutboxEvent(em, { type: 'COMMENT_MENTION', entityType: 'comment', entityId: row.id, payload: { commentId: row.id } })
      }
      return { saved: row, access }
    }))
    return (await this.views(user, access, entityType, entityId, [saved]))[0]
  }

  // ===== مرفق التعليق =====
  /** تحميل مرفق تعليق (/files/:id) بحكم التعليق نفسه: رافعه، وكل اللي يقرا التعليق. برّه كده نفس رد الملف الغايب */
  async assertFileAccess(user: JwtPayload, file: Pick<StoredFile, 'id' | 'uploadedBy' | 'entityId'>) {
    if (!!user.sub && file.uploadedBy === user.sub) return
    const comment = file.entityId ? await this.byId(file.entityId) : null
    if (!comment || !(await this.readableBy(user, comment))) throw new NotFoundException(COMMENT_FILE_NOT_FOUND)
  }
}

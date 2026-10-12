import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, In, type EntityManager } from 'typeorm'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { User } from '../auth/user.entity'
import {
  MAILBOX_MIGRATION_MISSING, SHARED_DUPLICATE, SHARED_NOT_FOUND, SHARED_USERS, cleanSharedAddress, cleanSharedName, cleanSharedUserIds,
} from './mailbox-rules'
import { mailboxTablesReady } from './mailbox-store'
import { MailSharedMailbox, MailSharedMailboxUser } from './mailbox.entities'

export interface SharedMailboxRef { address: string; name: string }

/**
 * B-ADD.16: الصناديق المشتركة (زي info@ و hr@). في المصدر كانت بتتكشف من الدليل (AD) عند كل دخول؛ هنا بتتعرّف من شاشة واحدة بصلاحية:
 * عنوان الصندوق واسمه ومين من الحسابات يفتحه. التعريف ده بيحدد اللي بيظهر للموظف جوه النظام بس — Exchange نفسه هو اللي بيسمح أو يرفض
 * بدخول الموظف (لازم يكون له Full Access على الصندوق هناك)، فتعريف غلط هنا مايفتحش بريد حد.
 *  قبل ترحيل 192: مفيش صناديق مشتركة لحد، والشاشة بتقول إن الترحيل ناقص، وكل كتابة بترفض برسالته.
 */
@Injectable()
export class SharedMailboxesService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  ready(em: EntityManager = this.ds.manager): Promise<boolean> {
    return mailboxTablesReady(em)
  }

  /** الصناديق المشتركة المفعّلة اللي الحساب ده مضاف عليها (بتظهر تحت مجلداته) */
  async listFor(userId: number): Promise<SharedMailboxRef[]> {
    if (!(await this.ready())) return []
    return this.ds.query(
      `SELECT m.[address] AS [address], m.[name] AS [name] FROM [mail_shared_mailboxes] m
       INNER JOIN [mail_shared_mailbox_users] u ON u.[mailboxId] = m.[id]
       WHERE u.[userId] = @0 AND m.[isActive] = 1 ORDER BY m.[name], m.[id]`, [userId])
  }

  /** الحساب مسموح له بالصندوق ده؟ (العنوان بحروف صغيرة — مطابقة بالحرف) */
  async allowed(userId: number, address: string): Promise<boolean> {
    return (await this.listFor(userId)).some((mailbox) => mailbox.address === address)
  }

  private async view(em: EntityManager) {
    const mailboxes = await em.getRepository(MailSharedMailbox).find({ order: { name: 'ASC', id: 'ASC' } })
    const members = mailboxes.length ? await em.getRepository(MailSharedMailboxUser).find({ where: { mailboxId: In(mailboxes.map((row) => row.id)) }, order: { id: 'ASC' } }) : []
    const userIds = [...new Set(members.map((row) => row.userId))]
    const users = new Map<number, { id: number; displayName: string; email: string; isActive: boolean }>()
    // حد معاملات SQL Server (2100) — دفعات
    for (let offset = 0; offset < userIds.length; offset += 1000) {
      for (const user of await em.getRepository(User).find({ where: { id: In(userIds.slice(offset, offset + 1000)) }, select: ['id', 'displayName', 'email', 'isActive'] })) {
        users.set(user.id, { id: user.id, displayName: user.displayName, email: user.email, isActive: !!user.isActive })
      }
    }
    return mailboxes.map((row) => ({
      id: row.id, address: row.address, name: row.name, isActive: !!row.isActive, updatedAt: row.updatedAt,
      users: members.filter((member) => member.mailboxId === row.id).map((member) => users.get(member.userId)).filter((user): user is NonNullable<typeof user> => !!user),
    }))
  }

  /** شاشة الإدارة: كل الصناديق ومين عليها */
  async list() {
    if (!(await this.ready())) return { available: false, message: MAILBOX_MIGRATION_MISSING, mailboxes: [] }
    return { available: true, mailboxes: await this.view(this.ds.manager) }
  }

  /** بحث حسابات لإضافتها على صندوق (الاسم أو البريد، من حرفين) — لصاحب صلاحية الإدارة بس */
  async searchUsers(q: unknown) {
    const term = typeof q === 'string' ? q.trim().slice(0, 100) : ''
    if (term.length < 2) return []
    const like = `%${term.replace(/[\\%_[]/g, (ch) => `\\${ch}`)}%`
    const rows: Array<{ id: number; displayName: string; email: string }> = await this.ds.query(
      `SELECT TOP 10 [id], [displayName], [email] FROM [users] WHERE [isActive] = 1 AND ([displayName] LIKE @0 ESCAPE '\\' OR [email] LIKE @0 ESCAPE '\\') ORDER BY [displayName], [id]`, [like])
    return rows.map((row) => ({ id: Number(row.id), displayName: row.displayName, email: row.email }))
  }

  private async activeUsers(em: EntityManager, ids: number[]): Promise<void> {
    if (!ids.length) return
    const found = await em.getRepository(User).count({ where: { id: In(ids), isActive: true } })
    if (found !== ids.length) throw new BadRequestException({ code: 'MAIL_SHARED_USERS', message: SHARED_USERS })
  }

  private async setUsers(em: EntityManager, mailboxId: number, ids: number[], actor: number) {
    const repo = em.getRepository(MailSharedMailboxUser)
    const current = await repo.find({ where: { mailboxId } })
    const gone = current.filter((row) => !ids.includes(row.userId))
    if (gone.length) await repo.delete({ id: In(gone.map((row) => row.id)) })
    const now = new Date()
    const added = ids.filter((id) => !current.some((row) => row.userId === id))
    if (added.length) await repo.insert(added.map((userId) => ({ mailboxId, userId, createdAt: now, createdByUserId: actor })))
  }

  async create(user: JwtPayload, body: { address?: unknown; name?: unknown; userIds?: unknown }) {
    if (!(await this.ready())) throw new BadRequestException(MAILBOX_MIGRATION_MISSING)
    const address = cleanSharedAddress(body?.address), name = cleanSharedName(body?.name)
    const userIds = body?.userIds === undefined ? [] : cleanSharedUserIds(body.userIds)
    return this.ds.transaction(async (em) => {
      const repo = em.getRepository(MailSharedMailbox)
      // الفهرس الفريد هو الحكم لو طلبين وصلوا مع بعض (2601 / 2627)
      if (await repo.count({ where: { address } })) throw new ConflictException({ statusCode: 409, code: 'MAIL_SHARED_DUPLICATE', message: SHARED_DUPLICATE })
      await this.activeUsers(em, userIds)
      const now = new Date()
      let id: number
      try {
        id = Number((await repo.insert({ address, name, isActive: true, createdAt: now, createdByUserId: user.sub, updatedAt: now, updatedByUserId: user.sub })).identifiers[0].id)
      } catch (error) {
        const number = Number((error as { number?: number; driverError?: { number?: number } })?.number ?? (error as { driverError?: { number?: number } })?.driverError?.number)
        if (number === 2601 || number === 2627) throw new ConflictException({ statusCode: 409, code: 'MAIL_SHARED_DUPLICATE', message: SHARED_DUPLICATE })
        throw error
      }
      await this.setUsers(em, id, userIds, user.sub)
      await recordAudit(em, { category: 'SETTINGS', action: 'MAIL_SHARED_MAILBOX_CREATED', entityType: 'mail_shared_mailbox', entityId: id, actorUserId: user.sub,
        summary: `صندوق بريد مشترك جديد «${name}» (${address}) — ${userIds.length} حساب`, after: { address, name, isActive: true, userIds } })
      return { available: true, mailboxes: await this.view(em) }
    })
  }

  async update(user: JwtPayload, id: number, body: { name?: unknown; isActive?: unknown; userIds?: unknown }) {
    if (!(await this.ready())) throw new BadRequestException(MAILBOX_MIGRATION_MISSING)
    const name = body?.name === undefined ? undefined : cleanSharedName(body.name)
    const userIds = body?.userIds === undefined ? undefined : cleanSharedUserIds(body.userIds)
    if (body?.isActive !== undefined && typeof body.isActive !== 'boolean') throw new BadRequestException('isActive يقبل true أو false بس')
    const isActive = body?.isActive as boolean | undefined
    return this.ds.transaction(async (em) => {
      const repo = em.getRepository(MailSharedMailbox)
      const row = await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!row) throw new NotFoundException(SHARED_NOT_FOUND)
      if (userIds) await this.activeUsers(em, userIds)
      const beforeUsers = (await em.getRepository(MailSharedMailboxUser).find({ where: { mailboxId: id } })).map((member) => member.userId).sort((a, b) => a - b)
      await repo.update({ id }, { ...(name !== undefined ? { name } : {}), ...(isActive !== undefined ? { isActive } : {}), updatedAt: new Date(), updatedByUserId: user.sub })
      if (userIds) await this.setUsers(em, id, userIds, user.sub)
      await recordAudit(em, { category: 'SETTINGS', action: 'MAIL_SHARED_MAILBOX_CHANGED', entityType: 'mail_shared_mailbox', entityId: id, actorUserId: user.sub,
        summary: `تعديل الصندوق المشترك «${name ?? row.name}» (${row.address})`, before: { name: row.name, isActive: !!row.isActive, userIds: beforeUsers },
        after: { name: name ?? row.name, isActive: isActive ?? !!row.isActive, userIds: userIds ? [...userIds].sort((a, b) => a - b) : beforeUsers } })
      return { available: true, mailboxes: await this.view(em) }
    })
  }

  /** حذف التعريف من النظام (الصندوق نفسه على Exchange زي ما هو) */
  async remove(user: JwtPayload, id: number) {
    if (!(await this.ready())) throw new BadRequestException(MAILBOX_MIGRATION_MISSING)
    return this.ds.transaction(async (em) => {
      const repo = em.getRepository(MailSharedMailbox)
      const row = await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!row) throw new NotFoundException(SHARED_NOT_FOUND)
      await em.getRepository(MailSharedMailboxUser).delete({ mailboxId: id })
      await repo.delete({ id })
      await recordAudit(em, { category: 'SETTINGS', action: 'MAIL_SHARED_MAILBOX_REMOVED', entityType: 'mail_shared_mailbox', entityId: id, actorUserId: user.sub,
        summary: `حذف تعريف الصندوق المشترك «${row.name}» (${row.address})`, before: { address: row.address, name: row.name } })
      return { available: true, mailboxes: await this.view(em) }
    })
  }
}

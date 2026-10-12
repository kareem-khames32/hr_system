import { BadRequestException, ConflictException, ForbiddenException, GoneException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { randomUUID } from 'node:crypto'
import { DataSource, In, MoreThanOrEqual, type EntityManager } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { User } from '../auth/user.entity'
import { LivekitError, livekitConfig, livekitDeleteRoom, livekitMuteParticipant, livekitRemoveParticipant, livekitRoomCounts, participantToken, type LivekitConfig } from './livekit'
import {
  MEET_CANCELLED, MEET_ENDED, MEET_EXPIRE_MS, MEET_HOST_ONLY, MEET_KNOCK_FRESH_MS, MEET_KNOCK_REQUIRED, MEET_LIST_DAYS, MEET_MIGRATION_MISSING, MEET_NOT_CONFIGURED, MEET_NOT_FOUND, MEET_NOT_IN_ROOM,
  MEET_NOT_YOURSELF, MEET_REJOIN_MS, MEET_RING_MS, MEET_TRACK, MEET_UNAVAILABLE, MEET_USER,
  cleanMeetInvites, cleanMeetLobby, cleanMeetStart, cleanMeetTitle, cleanMeetUserId, meetReady, meetStartOf, meetStatusOf,
} from './meet-rules'
import { Meeting, MeetingAttendance, MeetingInvite } from './meet.entities'

/** اللي بيظهر من حساب في الاجتماعات: الاسم والمسمى الوظيفي بس */
export interface MeetPerson { id: number; displayName: string; jobTitle: string | null }
type Role = 'host' | 'invited' | 'none'
interface Knock { user: MeetPerson; at: number; seenAt: number; hostUserId: number; title: string }
interface Decline { meetingId: string; title: string; user: MeetPerson; at: number }
export interface MeetInput { title?: unknown; startsAt?: unknown; lobby?: unknown; inviteUserIds?: unknown }

const person = (row: { id: number; displayName: string; jobTitle?: string | null }): MeetPerson => ({ id: Number(row.id), displayName: row.displayName, jobTitle: row.jobTitle || null })
const unknownPerson = (id: number): MeetPerson => ({ id, displayName: `حساب #${id}`, jobTitle: null })

// B-ADD.15: الاجتماعات (صوت وصورة ومشاركة شاشة) على خادم LiveKit عند الشركة. الخدمة دي بتدّي تذكرة الدخول، وبتنادي أوامر الغرفة لصاحب الاجتماع
// (كتم، إخراج، إنهاء)، وبتمسك طابور طلبات الدخول. النظام من غير WebSocket: الواجهة بتسأل «صندوق الاجتماعات» كل كام ثانية (دعوة بترن، طلب دخول،
// اعتذار)، واللي جوه الغرفة بيوصله الباقي من LiveKit نفسه. طلبات الدخول والمُخرَجين والاعتذارات في ذاكرة الخادم بس (بتتنسي مع إعادة تشغيله —
// اللي مستني بيطلب تاني). مفيش أي تسجيل ولا محتوى بيتخزّن.
@Injectable()
export class MeetService {
  private readonly log = new Logger(MeetService.name)
  /** كود الاجتماع ← رقم الحساب ← طلب دخوله */
  private readonly knocks = new Map<string, Map<number, Knock>>()
  /** كود الاجتماع ← اللي صاحب الاجتماع خرّجهم (لازم يطلبوا الدخول تاني) */
  private readonly blocked = new Map<string, Set<number>>()
  /** كود الاجتماع ← اللي طلبهم اترفض (لحد ما يطلبوا تاني) */
  private readonly denied = new Map<string, Set<number>>()
  /** كود الاجتماع ← المدعوين اللي اعتذروا (دعوتهم مابترنش تاني) */
  private readonly declined = new Map<string, Set<number>>()
  /** صاحب الاجتماع ← اعتذارات لسه مااتبلّغش بيها */
  private readonly declines = new Map<number, Decline[]>()

  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  // ---------------------------------------------------------------- الجاهزية والإعداد

  /** الجداول موجودة وخادم الاجتماعات مضبوط؟ — وإلا رسالة واضحة بدل الفشل */
  private async guard(em: EntityManager): Promise<LivekitConfig> {
    if (!(await meetReady(em))) throw new ConflictException({ code: 'MEET_MIGRATION_MISSING', message: MEET_MIGRATION_MISSING })
    const config = livekitConfig()
    if (!config) throw new ServiceUnavailableException({ code: 'MEET_NOT_CONFIGURED', message: MEET_NOT_CONFIGURED })
    return config
  }

  /** نداء على خادم الاجتماعات: مشارك مش موجود = 404 (أو عادي لو notFoundOk)، وخادم مش بيرد = 503 */
  private async room<T>(work: () => Promise<T>, notFoundOk = false): Promise<T | undefined> {
    try {
      return await work()
    } catch (error) {
      if (error instanceof LivekitError && error.notFound) {
        if (notFoundOk) return undefined
        throw new NotFoundException({ code: 'MEET_NOT_IN_ROOM', message: MEET_NOT_IN_ROOM })
      }
      throw new ServiceUnavailableException({ code: 'MEET_UNAVAILABLE', message: MEET_UNAVAILABLE })
    }
  }

  /** قفل الغرفة على الخادم — محاولة واحدة: الاجتماع اتقفل في القاعدة أصلًا، والغرفة الفاضية بتتقفل لوحدها */
  private async closeRoom(config: LivekitConfig, code: string) {
    try {
      await livekitDeleteRoom(config, code)
    } catch (error) {
      this.log.debug(`deleteRoom ${code}: ${(error as Error).message}`)
    }
  }

  // ---------------------------------------------------------------- قراءات مشتركة

  private async people(em: EntityManager, ids: number[]): Promise<Map<number, MeetPerson>> {
    const out = new Map<number, MeetPerson>()
    const unique = [...new Set(ids)]
    for (let offset = 0; offset < unique.length; offset += 1000) {
      const part = unique.slice(offset, offset + 1000)
      const rows: Array<{ id: number; displayName: string; jobTitle: string | null }> = await em.query(
        `SELECT u.[id], u.[displayName], e.[jobTitle] FROM [users] u LEFT JOIN [employees] e ON e.[id] = u.[employeeId] WHERE u.[id] IN (${part.map((_, index) => `@${index}`).join(', ')})`, part)
      for (const row of rows) out.set(Number(row.id), person(row))
    }
    return out
  }

  /** الحسابات النشطة من القايمة (من غير صاحب الاجتماع) */
  private async activeUsers(em: EntityManager, ids: number[], hostUserId: number): Promise<number[]> {
    const wanted = ids.filter((id) => id !== hostUserId)
    if (!wanted.length) return []
    return (await em.getRepository(User).find({ where: { id: In(wanted), isActive: true }, select: { id: true } })).map((row) => row.id)
  }

  private async load(em: EntityManager, code: string, lock = false): Promise<Meeting> {
    const meeting = await em.getRepository(Meeting).findOne({ where: { code }, ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}) })
    if (!meeting) throw new NotFoundException(MEET_NOT_FOUND)
    return meeting
  }

  private async roleOf(em: EntityManager, user: JwtPayload, meeting: Meeting): Promise<Role> {
    if (meeting.hostUserId === user.sub) return 'host'
    return (await em.getRepository(MeetingInvite).count({ where: { meetingId: meeting.id, userId: user.sub } })) ? 'invited' : 'none'
  }

  private hostOnly(user: JwtPayload, meeting: Meeting) {
    if (meeting.hostUserId !== user.sub) throw new ForbiddenException({ code: 'MEET_HOST_ONLY', message: MEET_HOST_ONLY })
  }

  /** الاجتماع لسه مفتوح (بميعاد أو شغال) — وإلا 410 */
  private open(meeting: Meeting) {
    const status = meetStatusOf(meeting)
    if (status === 'cancelled') throw new GoneException({ code: 'MEET_CANCELLED', message: MEET_CANCELLED })
    if (status === 'ended') throw new GoneException({ code: 'MEET_ENDED', message: MEET_ENDED })
    return status
  }

  /** يدخل على طول: صاحب الاجتماع، أو (مش مُخرَج) مدعو أو الاجتماع من غير غرفة انتظار */
  private mayEnter(role: Role, meeting: Meeting, userId: number): boolean {
    return role === 'host' || (!this.isBlocked(meeting.code, userId) && (role === 'invited' || !meeting.lobby))
  }

  private target(user: JwtPayload, raw: unknown): number {
    const userId = cleanMeetUserId(raw)
    if (userId === user.sub) throw new BadRequestException(MEET_NOT_YOURSELF)
    return userId
  }

  // ---------------------------------------------------------------- غرفة الانتظار (ذاكرة بس)

  /** طلبات الدخول اللي أصحابها لسه مستنيين */
  private knocksOf(code: string): Array<{ user: MeetPerson; at: string }> {
    const map = this.knocks.get(code)
    if (!map) return []
    const fresh = Date.now() - MEET_KNOCK_FRESH_MS
    for (const [userId, knock] of map) if (knock.seenAt < fresh) map.delete(userId)
    if (!map.size) this.knocks.delete(code)
    return [...map.values()].map((knock) => ({ user: knock.user, at: new Date(knock.at).toISOString() }))
  }

  private removeKnock(code: string, userId: number) {
    const map = this.knocks.get(code)
    map?.delete(userId)
    if (map && !map.size) this.knocks.delete(code)
  }

  private isBlocked(code: string, userId: number) {
    return !!this.blocked.get(code)?.has(userId)
  }

  private mark(store: Map<string, Set<number>>, code: string, userId: number) {
    let set = store.get(code)
    if (!set) store.set(code, (set = new Set()))
    set.add(userId)
  }

  private clearMeeting(code: string) {
    for (const store of [this.knocks, this.blocked, this.denied, this.declined]) store.delete(code)
  }

  // ---------------------------------------------------------------- الصندوق (الواجهة بتسأله كل كام ثانية)

  /**
   * اللي مستني الحساب دلوقتي: دعوات بترن (اجتماع بدأ من أقل من دقيقة، أو اتضاف له وهو شغال، ولسه مادخلش ولا اعتذر)، وطلبات دخول لاجتماعاته،
   * واعتذارات مدعويه. قبل الترحيل أو قبل ضبط الخادم: فاضي من غير خطأ.
   */
  async inbox(user: JwtPayload) {
    const em = this.ds.manager
    const ready = await meetReady(em), configured = !!livekitConfig()
    if (!ready || !configured) return { ready, configured, invites: [], knocks: [], declines: [] }
    const now = Date.now(), me = user.sub
    const rows: Array<{ id: number; code: string; title: string; startsAt: Date | null; createdAt: Date; hostUserId: number; invitedAt: Date | null }> = await em.query(
      `SELECT m.[id], m.[code], m.[title], m.[startsAt], m.[createdAt], m.[hostUserId], i.[createdAt] AS [invitedAt]
         FROM [meeting_invites] i INNER JOIN [meetings] m ON m.[id] = i.[meetingId]
        WHERE i.[userId] = @0 AND m.[endedAt] IS NULL AND m.[cancelledAt] IS NULL AND COALESCE(m.[startsAt], m.[createdAt]) BETWEEN @1 AND @3
       UNION ALL
       SELECT m.[id], m.[code], m.[title], m.[startsAt], m.[createdAt], m.[hostUserId], NULL AS [invitedAt]
         FROM [meetings] m
        WHERE m.[hostUserId] = @0 AND m.[endedAt] IS NULL AND m.[cancelledAt] IS NULL AND m.[startsAt] BETWEEN @2 AND @3`,
      // الحدود هنا واسعة شوية (ثانية)، والحكم الدقيق باللحظة في السطور اللي بعدها
      [me, new Date(now - MEET_EXPIRE_MS - 1000), new Date(now - MEET_RING_MS - 1000), new Date(now + 1000)])
    let ringing = rows.filter((row) => {
      const start = meetStartOf(row), ringAt = Math.max(start, row.invitedAt ? new Date(row.invitedAt).getTime() : start)
      return ringAt <= now && now - ringAt <= MEET_RING_MS && now - start <= MEET_EXPIRE_MS && !this.declined.get(row.code)?.has(me)
    })
    if (ringing.length) {
      const joined = new Set((await em.getRepository(MeetingAttendance).find({ where: { userId: me, meetingId: In(ringing.map((row) => row.id)) }, select: { meetingId: true } })).map((row) => row.meetingId))
      ringing = ringing.filter((row) => !joined.has(row.id))
    }
    const hosts = ringing.length ? await this.people(em, ringing.map((row) => row.hostUserId)) : new Map<number, MeetPerson>()
    const knocks = [...this.knocks.keys()].flatMap((code) => {
      const first = this.knocks.get(code)?.values().next().value
      if (!first || first.hostUserId !== me) return []
      return this.knocksOf(code).map((knock) => ({ meetingId: code, title: first.title, ...knock }))
    })
    const declines = (this.declines.get(me) ?? []).filter((entry) => now - entry.at <= MEET_RING_MS)
    if (declines.length) this.declines.set(me, declines)
    else this.declines.delete(me)
    return {
      ready, configured,
      invites: ringing.map((row) => ({ id: row.code, title: row.title, startsAt: row.startsAt, createdAt: row.createdAt, host: hosts.get(row.hostUserId) ?? unknownPerson(row.hostUserId), isHost: row.hostUserId === me })),
      knocks,
      declines: declines.map((entry) => ({ meetingId: entry.meetingId, title: entry.title, user: entry.user, at: new Date(entry.at).toISOString() })),
    }
  }

  // ---------------------------------------------------------------- الدليل والقايمة

  /** اللي ينفع يتدعوا: الحسابات النشطة — الاسم والمسمى الوظيفي بس */
  async directory(user: JwtPayload) {
    const em = this.ds.manager
    await this.guard(em)
    const rows: Array<{ id: number; displayName: string; jobTitle: string | null }> = await em.query(
      `SELECT TOP (5000) u.[id], u.[displayName], e.[jobTitle] FROM [users] u LEFT JOIN [employees] e ON e.[id] = u.[employeeId]
        WHERE u.[isActive] = 1 AND u.[id] <> @0 ORDER BY u.[displayName], u.[id]`, [user.sub])
    return { users: rows.map(person) }
  }

  /** «اجتماعاتي»: اللي أنا صاحبها أو مدعو لها — الجاي وآخر 60 يوم. قبل الترحيل أو قبل ضبط الخادم: فاضية بالسبب */
  async list(user: JwtPayload) {
    const em = this.ds.manager
    const ready = await meetReady(em), config = livekitConfig()
    if (!ready || !config) return { ready, configured: !!config, meetings: [] }
    const since = new Date(Date.now() - MEET_LIST_DAYS * 86_400_000)
    const list = await em.getRepository(Meeting).createQueryBuilder('m')
      .where('(m.hostUserId = :me OR EXISTS (SELECT 1 FROM [meeting_invites] i WHERE i.[meetingId] = m.id AND i.[userId] = :me))', { me: user.sub })
      .andWhere('(m.createdAt >= :since OR m.startsAt >= :since)', { since })
      .orderBy('m.createdAt', 'DESC').take(300).getMany()
    const ids = list.map((meeting) => meeting.id)
    const counts = new Map<number, number>()
    for (let offset = 0; offset < ids.length; offset += 1000) {
      const part = ids.slice(offset, offset + 1000)
      const rows: Array<{ meetingId: number; total: number }> = await em.query(
        `SELECT [meetingId], COUNT(*) AS [total] FROM [meeting_invites] WHERE [meetingId] IN (${part.map((_, index) => `@${index}`).join(', ')}) GROUP BY [meetingId]`, part)
      for (const row of rows) counts.set(Number(row.meetingId), Number(row.total))
    }
    const hosts = await this.people(em, list.map((meeting) => meeting.hostUserId))
    const meetings = list.map((meeting) => ({
      id: meeting.code, title: meeting.title, startsAt: meeting.startsAt, createdAt: meeting.createdAt, endedAt: meeting.endedAt, cancelledAt: meeting.cancelledAt, status: meetStatusOf(meeting),
      host: hosts.get(meeting.hostUserId) ?? unknownPerson(meeting.hostUserId), isHost: meeting.hostUserId === user.sub, inviteCount: counts.get(meeting.id) ?? 0, participants: 0,
    }))
    // عدد الموجودين في الشغال دلوقتي: على قد ما الخادم يرد بسرعة — القايمة ماتستناش
    const live = meetings.filter((meeting) => meeting.status === 'live')
    if (live.length) {
      try {
        const present = await livekitRoomCounts(config, live.map((meeting) => meeting.id), 1500)
        for (const meeting of live) meeting.participants = present.get(meeting.id) ?? 0
      } catch (error) {
        this.log.debug(`listRooms: ${(error as Error).message}`)
      }
    }
    return { ready, configured: true, meetings }
  }

  // ---------------------------------------------------------------- الاجتماع

  /** اجتماع جديد: فوري (من غير ميعاد — بيرن عند المدعوين دلوقتي) أو بميعاد (بيرن لما ييجي ميعاده) */
  async create(user: JwtPayload, input: MeetInput) {
    const title = cleanMeetTitle(input?.title), startsAt = cleanMeetStart(input?.startsAt) ?? null, lobby = cleanMeetLobby(input?.lobby) ?? true
    const wanted = cleanMeetInvites(input?.inviteUserIds) ?? []
    return this.ds.transaction(async (em) => {
      await this.guard(em)
      const invitees = await this.activeUsers(em, wanted, user.sub)
      const now = new Date(), code = randomUUID()
      const created = await em.getRepository(Meeting).insert({ code, title, hostUserId: user.sub, startsAt, lobby, createdAt: now, endedAt: null, cancelledAt: null })
      const meetingId = Number(created.identifiers[0].id)
      if (invitees.length) await em.getRepository(MeetingInvite).insert(invitees.map((userId) => ({ meetingId, userId, createdAt: now })))
      return { id: code }
    })
  }

  /**
   * تفاصيل اجتماع: أي حساب معاه اللينك بيشوف العنوان وصاحبه وهل يدخل على طول ولا يطلب الدخول؛ المدعوين بيشوفوا قايمة المدعوين؛ وصاحب الاجتماع
   * بيشوف كمان طلبات الدخول والحضور.
   */
  async detail(user: JwtPayload, code: string) {
    const em = this.ds.manager
    await this.guard(em)
    const meeting = await this.load(em, code)
    const role = await this.roleOf(em, user, meeting)
    const invited = role === 'none' ? [] : (await em.getRepository(MeetingInvite).find({ where: { meetingId: meeting.id }, order: { id: 'ASC' }, take: 500 })).map((row) => row.userId)
    const blocked = this.isBlocked(code, user.sub)
    const people = await this.people(em, [meeting.hostUserId, ...invited])
    const base = {
      id: code, title: meeting.title, startsAt: meeting.startsAt, createdAt: meeting.createdAt, endedAt: meeting.endedAt, cancelledAt: meeting.cancelledAt, status: meetStatusOf(meeting), lobby: meeting.lobby,
      host: people.get(meeting.hostUserId) ?? unknownPerson(meeting.hostUserId), isHost: role === 'host',
      access: role === 'host' ? 'host' : role === 'invited' && !blocked ? 'invited' : !meeting.lobby && !blocked ? 'open' : 'knock',
    }
    if (role === 'none') return base
    const invitees = invited.flatMap((id) => people.get(id) ?? []).sort((a, b) => a.displayName.localeCompare(b.displayName, 'ar'))
    if (role !== 'host') return { ...base, invitees }
    const joins = await em.getRepository(MeetingAttendance).find({ where: { meetingId: meeting.id }, order: { joinedAt: 'ASC', id: 'ASC' }, take: 2000 })
    const attendees = await this.people(em, joins.map((row) => row.userId))
    return { ...base, invitees, knocks: this.knocksOf(code),
      attendance: joins.map((row) => ({ userId: row.userId, displayName: (attendees.get(row.userId) ?? unknownPerson(row.userId)).displayName, joinedAt: row.joinedAt })) }
  }

  /**
   * تعديل صاحب الاجتماع (تحت قفل صف الاجتماع): العنوان والميعاد وغرفة الانتظار بالخانات اللي اتبعتت بس، وقايمة المدعوين لو اتبعتت بتتبدّل —
   * اللي اتضاف لاجتماع شغال دعوته بترن عنده، واللي كان مدعو مابيرنش تاني.
   */
  async update(user: JwtPayload, code: string, input: MeetInput) {
    const title = input?.title === undefined ? undefined : cleanMeetTitle(input.title)
    const startsAt = cleanMeetStart(input?.startsAt), lobby = cleanMeetLobby(input?.lobby), wanted = cleanMeetInvites(input?.inviteUserIds)
    await this.ds.transaction(async (em) => {
      await this.guard(em)
      const meeting = await this.load(em, code, true)
      this.hostOnly(user, meeting)
      this.open(meeting)
      const changes: Partial<Pick<Meeting, 'title' | 'startsAt' | 'lobby'>> = {}
      if (title !== undefined) changes.title = title
      if (startsAt !== undefined) changes.startsAt = startsAt
      if (lobby !== undefined) changes.lobby = lobby
      if (Object.keys(changes).length) await em.getRepository(Meeting).update({ id: meeting.id }, changes)
      if (wanted === undefined) return
      const invites = em.getRepository(MeetingInvite)
      const next = await this.activeUsers(em, wanted, user.sub)
      const current = (await invites.find({ where: { meetingId: meeting.id } })).map((row) => row.userId)
      const removed = current.filter((id) => !next.includes(id)), added = next.filter((id) => !current.includes(id))
      if (removed.length) await invites.delete({ meetingId: meeting.id, userId: In(removed) })
      if (added.length) await invites.insert(added.map((userId) => ({ meetingId: meeting.id, userId, createdAt: new Date() })))
    })
    return { ok: true }
  }

  /** صاحب الاجتماع بيلغيه: اللي جواه بيخرج، ومابيرنش عند حد */
  async cancel(user: JwtPayload, code: string) {
    const config = await this.ds.transaction(async (em) => {
      const config = await this.guard(em)
      const meeting = await this.load(em, code, true)
      this.hostOnly(user, meeting)
      this.open(meeting)
      await em.getRepository(Meeting).update({ id: meeting.id }, { cancelledAt: new Date() })
      return config
    })
    // نداء الخادم برّه المعاملة
    await this.closeRoom(config, code)
    this.clearMeeting(code)
    return { ok: true }
  }

  /** صاحب الاجتماع بينهيه للكل */
  async end(user: JwtPayload, code: string) {
    const config = await this.ds.transaction(async (em) => {
      const config = await this.guard(em)
      const meeting = await this.load(em, code, true)
      this.hostOnly(user, meeting)
      if (meeting.endedAt || meeting.cancelledAt) return null
      await em.getRepository(Meeting).update({ id: meeting.id }, { endedAt: new Date() })
      return config
    })
    if (!config) return { ok: true }
    await this.closeRoom(config, code)
    this.clearMeeting(code)
    return { ok: true }
  }

  // ---------------------------------------------------------------- الدخول

  /**
   * تذكرة الدخول لغرفة الاجتماع (ساعتين): لصاحبه والمدعوين، أو لأي حد لو من غير غرفة انتظار؛ غير كده (أو لو صاحب الاجتماع خرّجه) لازم يطلب الدخول.
   * وبتتسجّل صف حضور (الرجوع في خلال دقيقتين مش دخول جديد).
   */
  async token(user: JwtPayload, code: string) {
    const em = this.ds.manager
    const config = await this.guard(em)
    const meeting = await this.load(em, code)
    this.open(meeting)
    const role = await this.roleOf(em, user, meeting)
    if (!this.mayEnter(role, meeting, user.sub)) throw new ForbiddenException({ code: 'MEET_KNOCK_REQUIRED', message: MEET_KNOCK_REQUIRED })
    const me = (await this.people(em, [user.sub])).get(user.sub) ?? unknownPerson(user.sub)
    const token = participantToken(config, { room: code, identity: String(user.sub), name: me.displayName, metadata: { jobTitle: me.jobTitle ?? '' }, host: role === 'host' })
    const attendance = em.getRepository(MeetingAttendance)
    if (!(await attendance.count({ where: { meetingId: meeting.id, userId: user.sub, joinedAt: MoreThanOrEqual(new Date(Date.now() - MEET_REJOIN_MS)) } }))) {
      await attendance.insert({ meetingId: meeting.id, userId: user.sub, joinedAt: new Date() })
    }
    this.removeKnock(code, user.sub)
    return { token, url: config.url, host: role === 'host' }
  }

  /** اللي مش مدعو بيطلب الدخول: صاحب الاجتماع بيشوف الطلب في صندوقه */
  async knock(user: JwtPayload, code: string) {
    const em = this.ds.manager
    await this.guard(em)
    const meeting = await this.load(em, code)
    this.open(meeting)
    if (this.mayEnter(await this.roleOf(em, user, meeting), meeting, user.sub)) return { admitted: true }
    const me = (await this.people(em, [user.sub])).get(user.sub) ?? unknownPerson(user.sub)
    this.denied.get(code)?.delete(user.sub)
    let map = this.knocks.get(code)
    if (!map) this.knocks.set(code, (map = new Map()))
    const now = Date.now()
    map.set(user.sub, { user: me, at: map.get(user.sub)?.at ?? now, seenAt: now, hostUserId: meeting.hostUserId, title: meeting.title })
    // اجتماع واحد مايلمّش طلبات من غير حد
    if (map.size > 200) map.delete(map.keys().next().value as number)
    return { waiting: true }
  }

  /** اللي مستني بيسأل كل كام ثانية: اتوافق عليه، اترفض، ولا لسه — والسؤال نفسه بيقول إنه لسه مستني */
  async knockState(user: JwtPayload, code: string) {
    const em = this.ds.manager
    await this.guard(em)
    const meeting = await this.load(em, code)
    this.open(meeting)
    if (this.mayEnter(await this.roleOf(em, user, meeting), meeting, user.sub)) return { state: 'admitted' }
    if (this.denied.get(code)?.has(user.sub)) return { state: 'denied' }
    const knock = this.knocks.get(code)?.get(user.sub)
    if (!knock) return { state: 'none' }
    knock.seenAt = Date.now()
    return { state: 'waiting' }
  }

  /** اللي مستني زهق ومشي */
  async cancelKnock(user: JwtPayload, code: string) {
    await this.guard(this.ds.manager)
    this.removeKnock(code, user.sub)
    return { ok: true }
  }

  /** صاحب الاجتماع بيدخّل حد (تحت قفل صف الاجتماع): بيبقى مدعو، ولو كان مُخرَج بيرجع */
  async admit(user: JwtPayload, code: string, input: { userId?: unknown }) {
    const userId = this.target(user, input?.userId)
    await this.ds.transaction(async (em) => {
      await this.guard(em)
      const meeting = await this.load(em, code, true)
      this.hostOnly(user, meeting)
      this.open(meeting)
      if (!(await this.activeUsers(em, [userId], user.sub)).length) throw new NotFoundException(MEET_USER)
      const invites = em.getRepository(MeetingInvite)
      if (!(await invites.count({ where: { meetingId: meeting.id, userId } }))) await invites.insert({ meetingId: meeting.id, userId, createdAt: new Date() })
    })
    this.blocked.get(code)?.delete(userId)
    this.denied.get(code)?.delete(userId)
    this.removeKnock(code, userId)
    return { ok: true }
  }

  async deny(user: JwtPayload, code: string, input: { userId?: unknown }) {
    const userId = this.target(user, input?.userId)
    const em = this.ds.manager
    await this.guard(em)
    this.hostOnly(user, await this.load(em, code))
    this.removeKnock(code, userId)
    this.mark(this.denied, code, userId)
    return { ok: true }
  }

  /** المدعو بيعتذر عن الدعوة اللي بترن: مابترنش عنده تاني، وصاحب الاجتماع بيعرف */
  async decline(user: JwtPayload, code: string) {
    const em = this.ds.manager
    await this.guard(em)
    const meeting = await this.load(em, code)
    if ((await this.roleOf(em, user, meeting)) !== 'invited' || this.declined.get(code)?.has(user.sub)) return { ok: true }
    this.mark(this.declined, code, user.sub)
    const me = (await this.people(em, [user.sub])).get(user.sub) ?? unknownPerson(user.sub)
    this.declines.set(meeting.hostUserId, [...(this.declines.get(meeting.hostUserId) ?? []).slice(-49), { meetingId: code, title: meeting.title, user: me, at: Date.now() }])
    return { ok: true }
  }

  // ---------------------------------------------------------------- تحكم صاحب الاجتماع (أوامر الغرفة)

  /** كتم مايك أو كاميرا مشارك — هو يقدر يفتح لنفسه تاني */
  async mute(user: JwtPayload, code: string, input: { userId?: unknown; track?: unknown }) {
    const userId = this.target(user, input?.userId)
    const track = input?.track
    if (track !== 'audio' && track !== 'video') throw new BadRequestException(MEET_TRACK)
    const em = this.ds.manager
    const config = await this.guard(em)
    const meeting = await this.load(em, code)
    this.hostOnly(user, meeting)
    this.open(meeting)
    const muted = await this.room(() => livekitMuteParticipant(config, code, String(userId), track))
    return { ok: true, muted }
  }

  /** إخراج مشارك: دعوته بتتشال، ولازم يطلب الدخول عشان يرجع */
  async remove(user: JwtPayload, code: string, input: { userId?: unknown }) {
    const userId = this.target(user, input?.userId)
    const config = await this.ds.transaction(async (em) => {
      const config = await this.guard(em)
      const meeting = await this.load(em, code, true)
      this.hostOnly(user, meeting)
      this.open(meeting)
      this.mark(this.blocked, code, userId)
      await em.getRepository(MeetingInvite).delete({ meetingId: meeting.id, userId })
      return config
    })
    await this.room(() => livekitRemoveParticipant(config, code, String(userId)), true)
    return { ok: true }
  }
}

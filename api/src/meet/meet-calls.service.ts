import { BadRequestException, ConflictException, ForbiddenException, GoneException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { randomUUID } from 'node:crypto'
import { DataSource, IsNull, MoreThanOrEqual, type EntityManager } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { readWorkExtensions } from '../employees/employee-work-extension'
import { MeetCall } from './call.entity'
import {
  CALL_BUSY, CALL_CALLEE_ONLY, CALL_CONNECT_GRACE_MS, CALL_EXTENSION_MIGRATION, CALL_LOG_DAYS, CALL_LOG_MAX, CALL_MAX_MS, CALL_MIGRATION_MISSING, CALL_NOBODY, CALL_NOT_ANSWERED, CALL_NOT_FOUND, CALL_OVER,
  CALL_RING_MS, CALL_SELF_BUSY, CALL_USER, CALL_YOURSELF, callDurationSeconds, callStateOf, callsReady, cleanCallTarget, extensionsReady, type CallState,
} from './call-rules'
import { livekitConfig, livekitDeleteRoom, livekitRoomCounts, participantToken, type LivekitConfig } from './livekit'
import { MEET_NOT_CONFIGURED, MEET_PERSON_NAME_SQL } from './meet-rules'

/** اللي بيظهر من الطرف التاني في المكالمة: الاسم والمسمى الوظيفي ورقم تحويلته — ولا أي بيان تاني عن الموظف */
export interface CallPerson { id: number; displayName: string; jobTitle: string | null; extension: string | null }
export interface CallInput { extension?: unknown; userId?: unknown }

const unknownPerson = (id: number): CallPerson => ({ id, displayName: `حساب #${id}`, jobTitle: null, extension: null })
const OPEN: readonly CallState[] = ['ringing', 'active']

// B-ADD.23: الاتصال من جوه النظام — مكالمة بين حسابين فوق موديول الاجتماعات وعلى نفس خادم LiveKit (من غير سنترال ولا SIP ولا أرقام تليفونات).
// المكالمة صف في meet_calls وغرفة باسم كودها: مالهاش صف اجتماع، فمابتظهرش في «اجتماعاتي» ولا يتطلب دخولها ولا حد تالت ياخد تذكرتها.
// بترن عند الطرف التاني من «صندوق الاجتماعات» (الواجهة بتسأله كل كام ثانية)، والمتصل بيسأل عن حالتها لحد ما يترد عليه؛ وبعد الرد كل طرف
// بياخد تذكرته ويدخل الغرفة صوت بس. أي طرف يقفل = الغرفة بتتقفل على الخادم للاتنين. مفيش أي تسجيل ولا محتوى بيتخزّن.
@Injectable()
export class MeetCallsService {
  private readonly log = new Logger(MeetCallsService.name)
  /** مدة الرنة — ثابتة (CALL_RING_MS)؛ الاختبار بيقصّرها */
  ringMs = CALL_RING_MS

  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  // ---------------------------------------------------------------- الجاهزية وقراءات مشتركة

  /** جدول المكالمات موجود وخادم الاجتماعات مضبوط؟ — وإلا رسالة واضحة بدل الفشل */
  private async guard(em: EntityManager): Promise<LivekitConfig> {
    if (!(await callsReady(em))) throw new ConflictException({ code: 'CALL_MIGRATION_MISSING', message: CALL_MIGRATION_MISSING })
    const config = livekitConfig()
    if (!config) throw new ServiceUnavailableException({ code: 'MEET_NOT_CONFIGURED', message: MEET_NOT_CONFIGURED })
    return config
  }

  private stateOf(call: MeetCall, now: number = Date.now()): CallState {
    return callStateOf(call, now, this.ringMs)
  }

  /** الاسم والمسمى ورقم التحويلة (قبل ترحيل 188 التحويلة فاضية) */
  private async people(em: EntityManager, ids: number[]): Promise<Map<number, CallPerson>> {
    const out = new Map<number, CallPerson>()
    const unique = [...new Set(ids)]
    if (!unique.length) return out
    const rows: Array<{ id: number; displayName: string; employeeId: number | null; jobTitle: string | null }> = await em.query(
      `SELECT u.[id], ${MEET_PERSON_NAME_SQL} AS [displayName], u.[employeeId], e.[jobTitle] FROM [users] u LEFT JOIN [employees] e ON e.[id] = u.[employeeId] WHERE u.[id] IN (${unique.map((_, index) => `@${index}`).join(', ')})`, unique)
    const extensions = await readWorkExtensions(em, rows.flatMap((row) => (row.employeeId == null ? [] : [Number(row.employeeId)])))
    for (const row of rows) {
      out.set(Number(row.id), { id: Number(row.id), displayName: row.displayName, jobTitle: row.jobTitle || null, extension: row.employeeId == null ? null : extensions.get(Number(row.employeeId)) ?? null })
    }
    return out
  }

  /** رقم التحويلة ← الموظف ← حسابه النشط (أقدم حساب لو له أكتر من واحد)، أو null. قبل ترحيل 188: رسالة الترحيل */
  private async accountOfExtension(em: EntityManager, extension: string): Promise<number | null> {
    if (!(await extensionsReady(em))) throw new ConflictException({ code: 'CALL_EXTENSION_MIGRATION', message: CALL_EXTENSION_MIGRATION })
    const rows: Array<{ id: number }> = await em.query(
      `SELECT TOP 1 u.[id] FROM dbo.employees e INNER JOIN [users] u ON u.[employeeId] = e.[id] WHERE e.[workExtension] = @0 AND u.[isActive] = 1 ORDER BY u.[id]`, [extension])
    return rows.length ? Number(rows[0].id) : null
  }

  /** مكالمات الحسابات دي اللي لسه مفتوحة (بترن أو شغالة) */
  private async openCalls(em: EntityManager, userIds: number[], now: number): Promise<MeetCall[]> {
    const rows = await em.getRepository(MeetCall).createQueryBuilder('c')
      .where('(c.callerUserId IN (:...ids) OR c.calleeUserId IN (:...ids))', { ids: userIds })
      .andWhere('c.endedAt IS NULL AND c.rejected = :no AND c.startedAt >= :since', { no: false, since: new Date(now - CALL_MAX_MS - this.ringMs) })
      .orderBy('c.id', 'ASC').getMany()
    return rows.filter((row) => OPEN.includes(this.stateOf(row, now)))
  }

  /** المكالمة للطرفين بس: أي حساب تالت بيرد عليه زي مكالمة مالهاش وجود */
  private async load(em: EntityManager, user: JwtPayload, code: string, lock = false): Promise<MeetCall> {
    const call = await em.getRepository(MeetCall).findOne({ where: { code }, ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}) })
    if (!call || (call.callerUserId !== user.sub && call.calleeUserId !== user.sub)) throw new NotFoundException(CALL_NOT_FOUND)
    return call
  }

  private view(user: JwtPayload, call: MeetCall, people: Map<number, CallPerson>, now: number = Date.now()) {
    const outgoing = call.callerUserId === user.sub, other = outgoing ? call.calleeUserId : call.callerUserId
    return {
      id: call.code, direction: outgoing ? 'out' as const : 'in' as const, state: this.stateOf(call, now), person: people.get(other) ?? unknownPerson(other),
      startedAt: call.startedAt, answeredAt: call.answeredAt, endedAt: call.endedAt, durationSeconds: callDurationSeconds(call),
    }
  }

  /** قفل الغرفة على الخادم — محاولة واحدة: المكالمة اتقفلت في القاعدة أصلًا، والغرفة الفاضية بتتقفل لوحدها */
  private async closeRoom(config: LivekitConfig, code: string) {
    try {
      await livekitDeleteRoom(config, code)
    } catch (error) {
      this.log.debug(`deleteRoom ${code}: ${(error as Error).message}`)
    }
  }

  /**
   * مكالمة اتردّ عليها ومحدش قفلها والطرفين مشيوا (التبويب اتقفل): غرفتها فاضية على خادم الاجتماعات = انتهت — عشان صاحبها مايفضلش «مشغول».
   * نداء الخادم هنا برّه أي معاملة، والكتابة شرطها إن المكالمة لسه مفتوحة. الخادم مش بيرد = المكالمة زي ما هي.
   */
  private async settleGone(config: LivekitConfig, userIds: number[]) {
    const em = this.ds.manager, now = Date.now()
    const stale = (await this.openCalls(em, userIds, now)).filter((call) => call.answeredAt && now - new Date(call.answeredAt).getTime() > CALL_CONNECT_GRACE_MS)
    if (!stale.length) return
    let present: Map<string, number>
    try {
      present = await livekitRoomCounts(config, stale.map((call) => call.code), 1500)
    } catch (error) {
      this.log.debug(`listRooms: ${(error as Error).message}`)
      return
    }
    for (const call of stale) {
      if (!(present.get(call.code) ?? 0)) await em.getRepository(MeetCall).update({ id: call.id, endedAt: IsNull() }, { endedAt: new Date() })
    }
  }

  // ---------------------------------------------------------------- الصندوق والسجل

  /** المكالمات اللي بترن عند الحساب دلوقتي (لصندوق الاجتماعات). قبل الترحيل أو قبل ضبط الخادم: فاضية من غير خطأ */
  async ringing(user: JwtPayload) {
    const em = this.ds.manager
    if (!livekitConfig() || !(await callsReady(em))) return []
    const now = Date.now()
    // الحد هنا واسع شوية (ثانية)، والحكم الدقيق باللحظة في السطر اللي بعده
    const rows = (await em.getRepository(MeetCall).find({
      where: { calleeUserId: user.sub, startedAt: MoreThanOrEqual(new Date(now - this.ringMs - 1000)), answeredAt: IsNull(), endedAt: IsNull(), rejected: false }, order: { id: 'DESC' }, take: 20,
    })).filter((row) => this.stateOf(row, now) === 'ringing')
    if (!rows.length) return []
    const people = await this.people(em, rows.map((row) => row.callerUserId))
    return rows.map((row) => ({ id: row.code, startedAt: row.startedAt, from: people.get(row.callerUserId) ?? unknownPerson(row.callerUserId) }))
  }

  /** «آخر المكالمات» للحساب نفسه: اللي اتصل بيهم واللي اتصلوا بيه — آخر 60 يوم. قبل الترحيل أو قبل ضبط الخادم: فاضية بالسبب */
  async list(user: JwtPayload) {
    const em = this.ds.manager
    const ready = await callsReady(em), configured = !!livekitConfig(), extensions = await extensionsReady(em)
    const base = { ready, configured, extensions, ringSeconds: Math.round(this.ringMs / 1000) }
    if (!ready || !configured) return { ...base, calls: [] }
    const now = Date.now()
    const rows = await em.getRepository(MeetCall).createQueryBuilder('c')
      .where('(c.callerUserId = :me OR c.calleeUserId = :me)', { me: user.sub })
      .andWhere('c.startedAt >= :since', { since: new Date(now - CALL_LOG_DAYS * 86_400_000) })
      .orderBy('c.startedAt', 'DESC').addOrderBy('c.id', 'DESC').take(CALL_LOG_MAX).getMany()
    const people = await this.people(em, rows.map((row) => (row.callerUserId === user.sub ? row.calleeUserId : row.callerUserId)))
    return { ...base, calls: rows.map((row) => this.view(user, row, people, now)) }
  }

  /** حالة مكالمة لطرفيها (المتصل بيسأل لحد ما يترد عليه) */
  async detail(user: JwtPayload, code: string) {
    const em = this.ds.manager
    await this.guard(em)
    const call = await this.load(em, user, code)
    const other = call.callerUserId === user.sub ? call.calleeUserId : call.callerUserId
    return this.view(user, call, await this.people(em, [other]))
  }

  // ---------------------------------------------------------------- الاتصال

  /**
   * اتصال برقم تحويلة أو بحساب بالاسم. صفّين الحسابين بيتقفلوا بترتيب رقمهم وبعدها الحكم كله (الحساب نشط، والتحويلة لسه بتاعته، ومين مشغول):
   * اتصالين في نفس اللحظة على نفس الشخص واحد بس اللي بيرن. رنة المتصل نفسه اللي لسه ماتردّش عليها بتتلغي باتصاله الجديد.
   */
  async dial(user: JwtPayload, input: CallInput) {
    const target = cleanCallTarget(input)
    const config = await this.guard(this.ds.manager)
    const resolve = (em: EntityManager) => ('userId' in target ? Promise.resolve<number | null>(target.userId) : this.accountOfExtension(em, target.extension))
    // حساب موقوف أو مالوش وجود، وتحويلة مش عند حد أو صاحبها من غير حساب نشط: نفس الرد
    const nobody = () => new NotFoundException('userId' in target ? { code: 'CALL_USER', message: CALL_USER } : { code: 'CALL_NOBODY', message: CALL_NOBODY })
    const calleeId = await resolve(this.ds.manager)
    if (calleeId === null) throw nobody()
    if (calleeId === user.sub) throw new BadRequestException(CALL_YOURSELF)
    // نداء خادم الاجتماعات برّه المعاملة
    await this.settleGone(config, [user.sub, calleeId])
    return this.ds.transaction(async (em) => {
      const locked: Array<{ id: number; isActive: boolean }> = await em.query('SELECT [id], [isActive] FROM [users] WITH (UPDLOCK, ROWLOCK) WHERE [id] IN (@0, @1) ORDER BY [id]', [user.sub, calleeId])
      const callee = locked.find((row) => Number(row.id) === calleeId)
      if (!callee || !callee.isActive || (await resolve(em)) !== calleeId) throw nobody()
      const now = Date.now(), calls = em.getRepository(MeetCall)
      const open = await this.openCalls(em, [user.sub, calleeId], now)
      const redial = open.filter((call) => call.callerUserId === user.sub && !call.answeredAt)
      const rest = open.filter((call) => !redial.includes(call))
      if (rest.some((call) => call.callerUserId === user.sub || call.calleeUserId === user.sub)) throw new ConflictException({ code: 'CALL_SELF_BUSY', message: CALL_SELF_BUSY })
      // مشغول — من غير ما يتقال مع مين
      if (rest.length) throw new ConflictException({ code: 'CALL_BUSY', message: CALL_BUSY })
      for (const call of redial) await calls.update({ id: call.id }, { endedAt: new Date(now) })
      const code = randomUUID()
      await calls.insert({ code, callerUserId: user.sub, calleeUserId: calleeId, startedAt: new Date(now), answeredAt: null, endedAt: null, rejected: false })
      return { id: code, person: (await this.people(em, [calleeId])).get(calleeId) ?? unknownPerson(calleeId), ringSeconds: Math.round(this.ringMs / 1000) }
    })
  }

  /** اللي بيتّصلوا بيه بيرد (تحت قفل صف المكالمة): بعدها كل طرف ياخد تذكرته */
  async accept(user: JwtPayload, code: string) {
    await this.ds.transaction(async (em) => {
      await this.guard(em)
      const call = await this.load(em, user, code, true)
      if (call.calleeUserId !== user.sub) throw new ForbiddenException({ code: 'CALL_CALLEE_ONLY', message: CALL_CALLEE_ONLY })
      const state = this.stateOf(call)
      // رد تاني (ضغطتين أو تبويبين): المكالمة شغالة أصلًا
      if (state === 'active') return
      if (state !== 'ringing') throw new GoneException({ code: 'CALL_OVER', message: CALL_OVER })
      await em.getRepository(MeetCall).update({ id: call.id }, { answeredAt: new Date() })
    })
    return { ok: true }
  }

  /** اللي بيتّصلوا بيه بيرفض المكالمة اللي بترن */
  async reject(user: JwtPayload, code: string) {
    await this.ds.transaction(async (em) => {
      await this.guard(em)
      const call = await this.load(em, user, code, true)
      if (call.calleeUserId !== user.sub) throw new ForbiddenException({ code: 'CALL_CALLEE_ONLY', message: CALL_CALLEE_ONLY })
      if (this.stateOf(call) === 'ringing') await em.getRepository(MeetCall).update({ id: call.id }, { rejected: true, endedAt: new Date() })
    })
    return { ok: true }
  }

  /**
   * أي طرف بيقفل (تحت قفل صف المكالمة): وهي بترن — المتصل بيلغيها (فايتة عند التاني) واللي بيتّصلوا بيه بيرفضها؛ وهي شغالة — بتنتهي للاتنين
   * والغرفة بتتقفل على الخادم. مكالمة منتهية: من غير أثر.
   */
  async hangup(user: JwtPayload, code: string) {
    const config = await this.ds.transaction(async (em) => {
      const config = await this.guard(em)
      const call = await this.load(em, user, code, true)
      const state = this.stateOf(call), calls = em.getRepository(MeetCall)
      if (state === 'ringing') {
        await calls.update({ id: call.id }, call.calleeUserId === user.sub ? { rejected: true, endedAt: new Date() } : { endedAt: new Date() })
        return null
      }
      if (state !== 'active') return null
      await calls.update({ id: call.id }, { endedAt: new Date() })
      return config
    })
    // نداء الخادم برّه المعاملة
    if (config) await this.closeRoom(config, code)
    return { ok: true }
  }

  /** تذكرة دخول غرفة المكالمة (ساعتين) لطرفيها بس وبعد الرد — من غير إدارة غرفة لحد */
  async token(user: JwtPayload, code: string) {
    const em = this.ds.manager
    const config = await this.guard(em)
    const call = await this.load(em, user, code)
    const state = this.stateOf(call)
    if (state === 'ringing') throw new ConflictException({ code: 'CALL_NOT_ANSWERED', message: CALL_NOT_ANSWERED })
    if (state !== 'active') throw new GoneException({ code: 'CALL_OVER', message: CALL_OVER })
    const me = (await this.people(em, [user.sub])).get(user.sub) ?? unknownPerson(user.sub)
    const token = participantToken(config, { room: code, identity: String(user.sub), name: me.displayName, metadata: { jobTitle: me.jobTitle ?? '' }, host: false })
    return { token, url: config.url }
  }
}

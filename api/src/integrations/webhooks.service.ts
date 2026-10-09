import { lookup } from 'node:dns/promises'
import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, type EntityManager } from 'typeorm'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { assertCompanyWideWrite, inBranchScope, type BranchScope } from '../auth/guards'
import { ModulesService } from '../modules-registry/modules.service'
import type { DomainEventType } from '../queue/outbox'
import { QueueService, type QueueJobContext } from '../queue/queue.service'
import { cleanBranchIds, storedBranchScope } from './integration-keys'
import { WebhookEndpoint } from './integrations.entities'
import { cleanWebhookEvents, generateWebhookSecret, isPrivateAddress, openWebhookSecret, sealWebhookSecret, signatureHeader, storedWebhookEvents, targetIssue, WEBHOOK_DELIVER_JOB, WEBHOOK_DELIVER_MAX_ATTEMPTS,
  WEBHOOK_ENDPOINTS_MAX, WEBHOOK_EVENT_LABELS, WEBHOOK_EVENT_NAMES, WEBHOOK_EVENTS, WEBHOOK_FANOUT_JOB, WEBHOOK_NOT_FOUND, WEBHOOK_SIGNATURE_HEADER, WEBHOOK_TIMEOUT_MS, webhookBody, WEBHOOKS_MIGRATION_MISSING,
  type WebhookEventName, postPinned } from './webhooks'

// B6.3 (ج): الـwebhooks — نقاط استقبال لأنظمة خارجية بسر توقيع، والتوزيع من الـoutbox القايم:
//   حدث النظام ← مهمة «توزيع» (webhooks.fanout): بتحدد النقط الشغالة المشتركة في الحدث واللي الحدث جوه فروعها، ومهمة «إرسال» لكل نقطة.
//   مهمة «إرسال» (webhooks.deliver): بتعيد الحكم (النقطة لسه شغالة، والموديول مفتوح، والموظف لسه جوه فروعها) وبتبعت الرسالة موقّعة. الفشل بيتعاد بتأخير
//   متزايد من الطابور نفسه، وبعد الحد المهمة «ميتة» وتظهر في شاشة الطابور.
// الرسالة مراجع بس (رقم الموظف / المسير): التفاصيل من الـAPI العام بمفتاح النظام ونطاقه.

interface SourceEvent { id: string; type: DomainEventType; entityId: string | null; payload: Record<string, unknown> | null; at: string | Date }
interface DeliverPayload { endpointId: number; eventId: string; type: WebhookEventName; occurredAt: string; data: Record<string, unknown> }

const view = (row: WebhookEndpoint) => ({ id: row.id, name: row.name, url: row.url, events: storedWebhookEvents(row.events), branchIds: storedBranchScope(row.branchIds), isActive: !!row.isActive, createdAt: row.createdAt,
  lastStatus: row.lastStatus ?? null, lastAttemptAt: row.lastAttemptAt ?? null, failures: Number(row.failures ?? 0) })

@Injectable()
export class WebhooksService implements OnModuleInit {
  private readonly logger = new Logger('Webhooks')
  private tableReady = false

  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly queue: QueueService, private readonly config: ConfigService, private readonly modules: ModulesService) {}

  onModuleInit() {
    this.queue.registerHandler(WEBHOOK_FANOUT_JOB, async payload => { await this.fanout((payload as { event?: SourceEvent } | null)?.event ?? null) })
    for (const type of Object.keys(WEBHOOK_EVENTS) as DomainEventType[]) this.queue.subscribe(type, WEBHOOK_FANOUT_JOB)
    this.queue.registerHandler(WEBHOOK_DELIVER_JOB, async (payload, context) => { await this.deliver(payload as DeliverPayload, context) }, { maxAttempts: WEBHOOK_DELIVER_MAX_ATTEMPTS })
  }

  /** عناوين محلية وhttp: لبيئة التطوير والاختبار بس، وبمتغير بيئة صريح على الخادم — مش إعداد من جوه النظام */
  private allowLocal(): boolean {
    return process.env.HR_WEBHOOKS_ALLOW_LOCAL === '1' && process.env.NODE_ENV !== 'production'
  }

  private async ready(em: EntityManager): Promise<boolean> {
    if (this.tableReady) return true
    const [row]: Array<{ id: number | null }> = await em.query(`SELECT OBJECT_ID(N'dbo.webhook_endpoints', N'U') AS [id]`)
    this.tableReady = row?.id != null
    return this.tableReady
  }

  async list(user: JwtPayload) {
    assertCompanyWideWrite(user)
    const available = await this.ready(this.ds.manager)
    const rows = available ? await this.ds.getRepository(WebhookEndpoint).find({ order: { id: 'DESC' } }) : []
    return { available, events: WEBHOOK_EVENT_NAMES.map(key => ({ key, label: WEBHOOK_EVENT_LABELS[key] })), endpoints: rows.map(view) }
  }

  /** نقطة استقبال جديدة — سر التوقيع في الرد ده بس */
  async create(user: JwtPayload, body: { name?: unknown; url?: unknown; events?: unknown; branchIds?: unknown }) {
    assertCompanyWideWrite(user)
    const name = typeof body?.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : ''
    if (name.length < 2 || name.length > 120) throw new BadRequestException('اسم نقطة الاستقبال من حرفين لحد 120 حرف')
    const issue = targetIssue(body?.url, this.allowLocal())
    if (issue) throw new BadRequestException(issue)
    const { events, issue: eventsIssue } = cleanWebhookEvents(body?.events)
    if (eventsIssue) throw new BadRequestException(eventsIssue)
    const branches = cleanBranchIds(body?.branchIds)
    if (branches.issue) throw new BadRequestException(branches.issue)
    const secret = generateWebhookSecret()
    return this.ds.transaction(async em => {
      if (!(await this.ready(em))) throw new ConflictException(WEBHOOKS_MIGRATION_MISSING)
      const [count]: Array<{ n: number }> = await em.query('SELECT COUNT(*) AS [n] FROM dbo.webhook_endpoints WITH (UPDLOCK, HOLDLOCK) WHERE [isActive] = 1')
      if (Number(count?.n) >= WEBHOOK_ENDPOINTS_MAX) throw new BadRequestException(`نقاط الاستقبال الشغالة ${WEBHOOK_ENDPOINTS_MAX} بالكتير`)
      if (branches.branchIds) {
        const found: Array<{ id: number }> = await em.query(`SELECT [id] FROM dbo.branches WHERE [id] IN (${branches.branchIds.map((_, index) => `@${index}`).join(', ')})`, branches.branchIds)
        if (found.length !== branches.branchIds.length) throw new BadRequestException('فرع من الفروع مش موجود')
      }
      const repo = em.getRepository(WebhookEndpoint)
      const row = await repo.save(repo.create({ name, url: String(body.url), secret: sealWebhookSecret(secret, this.config.getOrThrow<string>('JWT_SECRET')), events: JSON.stringify(events),
        branchIds: branches.branchIds ? JSON.stringify(branches.branchIds) : null, isActive: true, createdByUserId: user.sub, createdAt: new Date(), lastStatus: null, lastAttemptAt: null, failures: 0 }))
      await recordAudit(em, { category: 'SETTINGS', action: 'WEBHOOK_ENDPOINT_CREATED', entityType: 'webhook_endpoint', entityId: String(row.id), actorUserId: user.sub, after: { name, url: row.url, events, branchIds: branches.branchIds } })
      return { ...view(row), secret }
    })
  }

  /** تشغيل أو إيقاف نقطة: كتابة مشروطة بإن الحالة غير المطلوبة */
  async setActive(user: JwtPayload, id: number, isActive: unknown) {
    assertCompanyWideWrite(user)
    if (typeof isActive !== 'boolean') throw new BadRequestException('isActive صح أو غلط')
    return this.ds.transaction(async em => {
      if (!(await this.ready(em))) throw new ConflictException(WEBHOOKS_MIGRATION_MISSING)
      const changed: Array<{ id: number }> = await em.query('UPDATE dbo.webhook_endpoints SET [isActive] = @1, [failures] = 0 OUTPUT INSERTED.[id] WHERE [id] = @0 AND [isActive] <> @1', [id, isActive ? 1 : 0])
      const row = await em.getRepository(WebhookEndpoint).findOne({ where: { id } })
      if (!row) throw new NotFoundException(WEBHOOK_NOT_FOUND)
      if (changed.length) await recordAudit(em, { category: 'SETTINGS', action: isActive ? 'WEBHOOK_ENDPOINT_ENABLED' : 'WEBHOOK_ENDPOINT_DISABLED', entityType: 'webhook_endpoint', entityId: String(id), actorUserId: user.sub })
      return view(row)
    })
  }

  /** فرع الحدث دلوقتي: للموظف فرعه الحالي؛ للمسير null (حكمه بموظفين المسير) */
  private async employeeBranch(employeeId: number): Promise<number | null | undefined> {
    const [row]: Array<{ branchId: number | null }> = await this.ds.query('SELECT [branchId] FROM dbo.employees WHERE [id] = @0', [employeeId])
    return row ? (row.branchId == null ? null : Number(row.branchId)) : undefined
  }

  /** الحدث جوه نطاق فروع النقطة؟ الموظف بفرعه الحالي، والمسير لو فيه موظف واحد على الأقل من فروعها */
  private async inScope(scope: BranchScope, type: WebhookEventName, data: Record<string, unknown>): Promise<boolean> {
    if (type === 'payroll.approved') {
      if (scope === null) return true
      if (!scope.length) return false
      const parameters: unknown[] = [Number(data.runId), ...scope]
      const [row]: Array<{ n: number }> = await this.ds.query(`SELECT COUNT(*) AS [n] FROM dbo.payroll_items i INNER JOIN dbo.employees e ON e.[id] = i.[employeeId]
        WHERE i.[runId] = @0 AND e.[branchId] IN (${scope.map((_, index) => `@${index + 1}`).join(', ')})`, parameters)
      return Number(row?.n) > 0
    }
    const branchId = await this.employeeBranch(Number(data.employeeId))
    return branchId !== undefined && inBranchScope(scope, branchId)
  }

  /** حدث النظام ← مهمة إرسال لكل نقطة شغالة مشتركة فيه وهو جوه فروعها */
  async fanout(event: SourceEvent | null): Promise<number> {
    const type = event ? (WEBHOOK_EVENTS as Partial<Record<DomainEventType, WebhookEventName>>)[event.type] : undefined
    if (!event || !type || !(await this.modules.isEnabled('integrations')) || !(await this.ready(this.ds.manager))) return 0
    const reference = Number(event.payload?.[type === 'payroll.approved' ? 'runId' : 'employeeId'] ?? event.entityId)
    if (!Number.isSafeInteger(reference) || reference < 1) return 0
    const data: Record<string, unknown> = type === 'payroll.approved' ? { runId: reference, period: typeof event.payload?.period === 'string' ? event.payload.period : null } : { employeeId: reference }
    const endpoints = await this.ds.getRepository(WebhookEndpoint).find({ where: { isActive: true }, order: { id: 'ASC' } })
    let queued = 0
    for (const endpoint of endpoints) {
      if (!storedWebhookEvents(endpoint.events).includes(type) || !(await this.inScope(storedBranchScope(endpoint.branchIds), type, data))) continue
      const payload: DeliverPayload = { endpointId: endpoint.id, eventId: String(event.id), type, occurredAt: new Date(event.at).toISOString(), data }
      // مهمة الإرسال في معاملتها، بمفتاح يمنع تكرار نفس الحدث لنفس النقطة
      if (await this.ds.transaction(em => this.queue.enqueue(em, { jobType: WEBHOOK_DELIVER_JOB, payload, key: `webhook:${event.id}:${endpoint.id}` }))) queued++
    }
    return queued
  }

  /** الاسم بيتحل، وكل عنوانه لازم يكون عام (ضد اسم عام بيشاور على عنوان داخلي) */
  /**
   * CRP6A-B04: عنوان الاتصال المثبّت — الاسم بيتحل **مرة واحدة**، كل عناوينه لازم تكون عامة، والإرسال بيتصل بالعنوان اللي اتفحص نفسه
   * (حل تاني وقت الاتصال ممكن يرجّع عنوان داخلي).
   */
  private async pinnedTarget(url: URL): Promise<{ address: string; family: number }> {
    const addresses = await this.resolve(url.hostname.replace(/^\[|\]$/g, ''))
    if (!addresses.length || (!this.allowLocal() && addresses.some(entry => isPrivateAddress(entry.address)))) throw new Error('عنوان نقطة الاستقبال بيتحل لعنوان داخلي')
    return { address: addresses[0].address, family: addresses[0].family }
  }
  /** حل الاسم (بيتبدّل في الاختبارات) */
  resolve: (host: string) => Promise<Array<{ address: string; family: number }>> = host => lookup(host, { all: true })

  private async mark(endpointId: number, status: string, ok: boolean) {
    await this.ds.query(`UPDATE dbo.webhook_endpoints SET [lastStatus] = @1, [lastAttemptAt] = @2, [failures] = CASE WHEN @3 = 1 THEN 0 ELSE [failures] + 1 END WHERE [id] = @0`, [endpointId, status.slice(0, 40), new Date(), ok ? 1 : 0])
  }

  /** إرسال رسالة واحدة موقّعة. بيعيد الحكم وقت الإرسال؛ والفشل بيرمي عشان الطابور يعيد المحاولة. */
  async deliver(payload: DeliverPayload, context: QueueJobContext): Promise<'SENT' | 'DROPPED'> {
    if (!payload || !(await this.modules.isEnabled('integrations')) || !(await this.ready(this.ds.manager))) return 'DROPPED'
    const endpoint = await this.ds.getRepository(WebhookEndpoint).findOne({ where: { id: Number(payload.endpointId) } })
    // النقطة اتوقفت، أو اشتراكها اتغيّر، أو الموظف خرج من فروعها بين التوزيع والإرسال: الرسالة بتتساب
    if (!endpoint?.isActive || !storedWebhookEvents(endpoint.events).includes(payload.type) || !(await this.inScope(storedBranchScope(endpoint.branchIds), payload.type, payload.data))) return 'DROPPED'
    const secret = openWebhookSecret(endpoint.secret, this.config.getOrThrow<string>('JWT_SECRET'))
    if (!secret) { await this.mark(endpoint.id, 'SECRET_UNREADABLE', false); throw new Error('سر نقطة الاستقبال مابيتفكّش بسر الخادم الحالي — اعمل نقطة جديدة') }
    const issue = targetIssue(endpoint.url, this.allowLocal())
    if (issue) { await this.mark(endpoint.id, 'TARGET_REFUSED', false); throw new Error(issue) }
    const url = new URL(endpoint.url), body = webhookBody(payload), timestamp = Math.floor(Date.now() / 1000)
    try {
      const pinned = await this.pinnedTarget(url)
      // من غير تتبّع تحويل (التحويل ممكن يودّي لعنوان داخلي)، وبمهلة، وعلى العنوان المثبّت
      const status = await postPinned(url, pinned, { 'Content-Type': 'application/json', 'User-Agent': 'HR-Webhooks/1', 'X-HR-Event': payload.type,
        'X-HR-Delivery': `${payload.eventId}:${endpoint.id}:${context.attempt}`, [WEBHOOK_SIGNATURE_HEADER]: signatureHeader(secret, timestamp, body) }, body, WEBHOOK_TIMEOUT_MS)
      if (status < 200 || status > 299) throw new Error(`HTTP ${status}`)
      await this.mark(endpoint.id, `HTTP ${status}`, true)
      return 'SENT'
    } catch (failure) {
      const reason = failure instanceof Error ? failure.message : String(failure)
      await this.mark(endpoint.id, /^HTTP \d+$/.test(reason) ? reason : 'UNREACHABLE', false)
      this.logger.warn(`الرسالة ${payload.type} للنقطة #${endpoint.id} فشلت (محاولة ${context.attempt} من ${context.maxAttempts}): ${reason}`)
      throw failure
    }
  }
}

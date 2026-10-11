import { BadRequestException, Injectable, Logger, type OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, In, type EntityManager } from 'typeorm'
import { recordAudit } from '../audit/audit'
import { AuthService, type JwtPayload } from '../auth/auth.service'
import { MailSendError, MailService, maskEmail } from '../auth/mail.service'
import { User } from '../auth/user.entity'
import { userLanguageReady } from '../auth/user-language'
import { CommentsService } from '../comments/comments.service'
import { AnnouncementsService } from '../announcements/announcements.service'
import { publicationAudience } from '../attendance/schedule-tools'
import { supersededSql } from '../assets/document-expiry'
import { isCommentEntity, parseCommentMentions } from '../comments/comment-rules'
import type { Comment } from '../comments/comment.entity'
import { definitionCodeOf } from '../common/leave-contract'
import { Employee } from '../employees/employee.entity'
import { ModulesService } from '../modules-registry/modules.service'
import { routeAvailable } from '../modules-registry/registry'
import { enqueueQueueJob, queueTablesReady, type DomainEventType } from '../queue/outbox'
import { QueueService } from '../queue/queue.service'
import { activeDelegationsFrom } from '../requests/approval-delegations'
import { ApproverResolver, FUNCTIONAL_APPROVER_ROLES } from '../requests/approver-resolver.service'
import { RequestType } from '../requests/entities/request-type.entity'
import { Request } from '../requests/entities/request.entity'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { RequestsService } from '../requests/requests.service'
import { Task, TASK_OPEN_STATUSES, type TaskStatus } from '../tasks/task.entity'
import { taskExtrasOfOne } from '../tasks/task-extras'
import { taskAccess, taskAwaitsAccount, taskLocalDate, taskStampCurrent, tasksTableReady, TASK_ROLE_LABELS } from '../tasks/task-rules'
import { maskPhone, whatsappParameters, type WhatsappBinding } from './channels/channel-rules'
import { NotificationChannelsService } from './channels/notification-channels.service'
import { WhatsappSendError } from './channels/whatsapp-meta'
import { Notification, NotificationDelivery, NotificationPreference, NotificationTemplate } from './notification.entities'
import { notificationTablesReady, NOTIFICATIONS_MIGRATION_MISSING } from './notification-store'
import {
  isNotificationCategory, isNotificationEvent, isNotificationTemplateLanguage, notificationEventDef, parseQuietHours, pickNotificationAddress, quietHoursEnd, renderNotificationText,
  validateNotificationTemplate, NOTIFICATION_CATEGORIES, NOTIFICATION_CHANNELS, NOTIFICATION_CHANNEL_LABELS, NOTIFICATION_DELIVERY_CHANNELS, NOTIFICATION_EVENTS, NOTIFICATION_EVENT_CODES,
  NOTIFICATION_MODES, type NotificationCategoryCode, type NotificationChannelCode, type NotificationEventCode, type NotificationMode, type NotificationTemplateLanguage,
  type NotificationText,
} from './notification-events'

// B2.4: محرك الإشعارات — أول مستهلك للـoutbox (B2.3).
//  الحدث ← مهمة توزيع (notifications.dispatch): تحدد المستلمين بحقهم في الكيان نفسه، وتكتب الإشعار وسجل توصيله لكل قناة.
//  البريد ← مهمة لكل رسالة (notifications.email) بإعادة محاولة الطابور؛ فشله مابيلمسش العملية الأصلية.
//  جوه التطبيق: الإشعار المخزّن بيدخل القايمة الموجودة (PortalController) كمصدر زيادة، والعناصر المحسوبة زي ما هي.
//  قبل ترحيل 087: مفيش إشعار مخزّن ولا بريد، والقايمة الحالية زي ما هي.

export const NOTIFICATIONS_DISPATCH_JOB = 'notifications.dispatch'
export const NOTIFICATIONS_EMAIL_JOB = 'notifications.email'
// B-ADD.5: مهمة لكل رسالة واتساب — بنفس فحوص وإعادة محاولة مهمة البريد (attemptOutbound)
export const NOTIFICATIONS_WHATSAPP_JOB = 'notifications.whatsapp'
export const NOTIFICATIONS_DIGEST_JOB = 'notifications.daily-digest'
// الملخص اللي ميعاده جه في ساعات الهدوء: مهمة في الطابور بتبعته بعد آخرها
export const NOTIFICATIONS_DIGEST_SEND_JOB = 'notifications.digest-send'
export const NOTIFICATIONS_EMAIL_ENABLED_KEY = 'notifications.email.enabled'
export const NOTIFICATIONS_QUIET_HOURS_KEY = 'notifications.quiet_hours'
export const NOTIFICATIONS_DIGEST_HOUR_KEY = 'notifications.digest_hour'
export const NOTIFICATIONS_DIGEST_HOUR_DEFAULT = 8
// محاولات البريد: 30 ثانية ثم الضعف لحد ساعة = حوالي 3 ساعات قبل «فشل» (عطل خادم البريد بيعدّي من غير ما الرسايل تضيع)
export const NOTIFICATIONS_EMAIL_MAX_ATTEMPTS = 10
// دفعة كبيرة (قسايم مسير كامل) بتتوزع: العدد ده في الدقيقة، فالطابور مايتسدّش وخادم البريد مايترفضش من الكتر
export const NOTIFICATIONS_EMAIL_PER_MINUTE = 20
// B-ADD.5: نفس التوزيع للواتساب (حد Meta أعلى من خادم بريد عادي)
export const NOTIFICATIONS_WHATSAPP_PER_MINUTE = 60
// خادم البريد مش بيرد: الإرسال بيقف المدة دي (الرسايل بتفشل بسرعة وتتعاد) بدل ما كل رسالة تستنى مهلة الاتصال وتوقّف باقي مهام الطابور
export const NOTIFICATIONS_MAIL_PAUSE_MS = 60_000
// الأحداث اللي المحرك مشترك فيها
export const NOTIFICATION_SOURCE_EVENTS: readonly DomainEventType[] = ['REQUEST_STEP_PENDING', 'REQUEST_APPROVED', 'REQUEST_REJECTED', 'REQUEST_RETURNED', 'PAYROLL_RUN_APPROVED',
  // B2.5
  'TASK_ASSIGNED', 'TASK_DUE_SOON', 'TASK_OVERDUE',
  // B2.15
  'DOCUMENT_EXPIRING',
  // B2.16
  'ANNOUNCEMENT_PUBLISHED',
  // B5.5
  'SCHEDULE_PUBLISHED',
  // B2.6
  'REQUEST_EXECUTED',
  // B2.8
  'COMMENT_MENTION']
// الملخص اليومي اللي فشل إرساله بيتجرّب تاني اليوم اللي بعده لحد العدد ده
const DIGEST_MAX_ATTEMPTS = 3
// رسالة «مستنية» من غير مهمة شغالة أكتر من المدة دي = مهمتها وقفت من غير ما تسجّل نتيجة
const STUCK_AFTER_MS = 15 * 60_000
const LANGUAGE: NotificationTemplateLanguage = 'ar'
/** B-ADD.5: قنوات برّه النظام اللي رسالتها بتطلع بمهمة في الطابور */
type OutboundChannelCode = 'EMAIL' | 'WHATSAPP'

const DECISIONS: Record<string, { text: string; kind: 'success' | 'error' | 'warning' }> = {
  REQUEST_APPROVED: { text: 'تمت الموافقة على طلبك', kind: 'success' },
  REQUEST_REJECTED: { text: 'تم رفض طلبك', kind: 'error' },
  REQUEST_RETURNED: { text: 'أُعيد طلبك لاستكمال المعلومات', kind: 'warning' },
  // B2.6: مهمة تنفيذ الطلب المعتمد اتقفلت — من غير نص الإثبات
  REQUEST_EXECUTED: { text: 'طلبك اتنفّذ', kind: 'success' },
}

// خادم البريد رفض العنوان نفسه (مش عطل اتصال): الإعادة مش هتغيّر حاجة
const MAIL_REJECTED = /code=EENVELOPE|رفض العنوان|all recipients were rejected/i
// عطل في الوصول لخادم البريد نفسه: كل الرسايل هتفشل زيه
const MAIL_UNREACHABLE = /code=(?:ECONNECTION|ETIMEDOUT|ESOCKET|EDNS|EAUTH|ETLS)|ECONNREFUSED|ECONNRESET|EHOSTUNREACH|ENOTFOUND|ETIMEDOUT|Greeting never received|Connection timeout/i
const MAIL_ADDRESS = /[^\s<>"'(),;:[\]]+@[^\s<>"'(),;:[\]]+/g
/** سبب فشل البريد من غير عناوين كاملة: رد خادم البريد بيكرر عنوان المستلم، والسجل وشاشة الطابور بيعرضوه متخفي بس */
const mailFailureText = (error: unknown) => (error instanceof MailSendError ? error.detail : String((error as Error)?.message ?? error))
  .replace(/\s+/g, ' ').trim().replace(MAIL_ADDRESS, address => maskEmail(address)).slice(0, 1000)
const mailFailureRaw = (error: unknown) => error instanceof MailSendError ? error.detail : String((error as Error)?.message ?? error)

/**
 * B-ADD.5: اللي بيفرق بين قناة وقناة في مهمة الإرسال — الباقي (القناة مفتوحة، الحساب شغال، الإشعار لسه صحيح، اختيار المستخدم و«إلزامي»، ساعات
 * الهدوء، الإعادة والتوقف) واحد للبريد والواتساب في attemptOutbound.
 */
interface OutboundDriver {
  channel: OutboundChannelCode
  job: string
  /** القناة مفتوحة دلوقتي على مستوى الشركة؟ وسبب التخطّي لو اتقفلت قبل الإرسال */
  open(): Promise<boolean>
  closedDetail: string
  offDetail: string
  noAddressDetail: string
  pausedDetail: string
  failurePrefix: string
  /** الملخص اليومي للبريد بس */
  digest: boolean
  addressOf(user: User): Promise<string | null>
  mask(address: string): string
  send(address: string, delivery: NotificationDelivery): Promise<void>
  /** rejected = المزوّد رفض الرسالة نفسها (الإعادة مش هتغيّر حاجة)؛ unreachable = المزوّد نفسه مش بيرد (كل الرسايل هتفشل زيها) */
  failure(error: unknown): { detail: string; rejected: boolean; unreachable: boolean }
}

interface SourceEvent { id: string; type: string; entityType: string | null; entityId: string | null; payload: Record<string, unknown> | null; at?: unknown }
interface DeliverInput {
  event: SourceEvent
  code: NotificationEventCode
  category: NotificationCategoryCode
  kind: string
  recipients: JwtPayload[]
  entityType: string
  entityId: number
  link: string
  values: Record<string, string>
}
type NotificationRef = Pick<Notification, 'id' | 'recipientUserId' | 'eventCode' | 'category' | 'entityType' | 'entityId' | 'link' | 'dedupeKey'>
const sqlErrorNumber = (error: unknown) => Number((error as { number?: unknown; driverError?: { number?: unknown } })?.number
  ?? (error as { driverError?: { number?: unknown } })?.driverError?.number)

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name)
  // لحد إمتى الإرسال واقف بعد عطل في الوصول لخادم البريد (في الذاكرة: نسخة تانية من الخادم بتكتشفه بأول رسالة ليها)
  private mailPausedUntil = 0
  // B-ADD.5: نفس التوقف للواتساب (Meta مش بترد أو التوكن اترفض)
  private whatsappPausedUntil = 0

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly queue: QueueService,
    private readonly mail: MailService,
    private readonly auth: AuthService,
    private readonly requests: RequestsService,
    private readonly modules: ModulesService,
    private readonly config: ConfigService,
    private readonly resolver: ApproverResolver,
    private readonly comments: CommentsService,
    private readonly announcements: AnnouncementsService,
    private readonly channels: NotificationChannelsService
  ) {}

  onModuleInit() {
    this.queue.registerHandler(NOTIFICATIONS_DISPATCH_JOB, async payload => {
      await this.dispatch((payload as { event?: SourceEvent } | null)?.event ?? null)
    })
    for (const type of NOTIFICATION_SOURCE_EVENTS) this.queue.subscribe(type, NOTIFICATIONS_DISPATCH_JOB)
    this.queue.registerHandler(NOTIFICATIONS_EMAIL_JOB, async (payload, context) => {
      await this.sendEmail(String((payload as { deliveryId?: unknown } | null)?.deliveryId ?? ''), context)
    }, { maxAttempts: NOTIFICATIONS_EMAIL_MAX_ATTEMPTS })
    this.queue.registerHandler(NOTIFICATIONS_WHATSAPP_JOB, async (payload, context) => {
      await this.sendWhatsapp(String((payload as { deliveryId?: unknown } | null)?.deliveryId ?? ''), context)
    }, { maxAttempts: NOTIFICATIONS_EMAIL_MAX_ATTEMPTS })
    this.queue.registerHandler(NOTIFICATIONS_DIGEST_SEND_JOB, async () => {
      await this.digestOrDefer(new Date(), true)
    })
  }

  /** الجداول موجودة (ترحيل 087)؟ نفس فحص قايمة الإشعارات (notification-store) */
  ready(em: EntityManager = this.ds.manager): Promise<boolean> {
    return notificationTablesReady(em)
  }

  private async setting(key: string, fallback: string): Promise<string> {
    const row = await this.ds.getRepository(RequestsConfig).findOne({ where: { key } })
    return row?.value ?? fallback
  }

  /** البريد مفتوح من الإعدادات؟ (مقفول افتراضيًا: مفيش رسالة بتطلع لحد ما المالك يفتحه) */
  async emailRequested(): Promise<boolean> {
    return (await this.setting(NOTIFICATIONS_EMAIL_ENABLED_KEY, 'false')) === 'true'
  }

  /** عنوان الواجهة اللي لينك البريد بيتبني عليه (FRONTEND_URL — نفس اللي الـCORS بيسمح له) */
  private frontendBase(): string {
    return String(this.config.get<string>('FRONTEND_URL') ?? '').trim().replace(/\/+$/, '')
  }

  /** البريد شغال فعلًا: مفتوح من الإعدادات، وخادمه مضبوط، وعنوان الواجهة اللي اللينك بيتبني عليه موجود */
  private async emailWorking(): Promise<boolean> {
    await this.mail.refreshStoredConfig()
    return this.mail.isConfigured() && !!this.frontendBase() && await this.emailRequested()
  }

  /** للاختبارات: الإرسال يرجع فورًا بعد توقف عطل خادم البريد */
  resumeMail() { this.mailPausedUntil = 0 }
  /** للاختبارات: نفس الشيء للواتساب */
  resumeWhatsapp() { this.whatsappPausedUntil = 0 }

  /**
   * B-ADD.5: فيه قناة برّه النظام مفتوحة على مستوى الشركة (البريد أو الواتساب)؟ الأحداث اللي جوه النظام عدّاد محسوب (طلب مستني، قرار،
   * مهمة) مالهاش حاجة تتكتب من غيرها — زي ما كانت بتقف والبريد مقفول.
   */
  private async outboundRequested(): Promise<boolean> {
    return (await this.emailRequested()) || (await this.channels.whatsappOpen())
  }

  // ===== التوزيع: من الحدث للمستلمين =====
  async dispatch(event: SourceEvent | null): Promise<number> {
    if (!event || !(await this.ready())) return 0
    switch (event.type) {
      case 'REQUEST_STEP_PENDING': return this.onStepPending(event)
      case 'REQUEST_APPROVED':
      case 'REQUEST_REJECTED':
      case 'REQUEST_EXECUTED':
      case 'REQUEST_RETURNED': return this.onDecision(event)
      case 'PAYROLL_RUN_APPROVED': return this.onPayrollApproved(event)
      case 'TASK_ASSIGNED':
      case 'TASK_DUE_SOON':
      case 'TASK_OVERDUE': return this.onTask(event)
      case 'COMMENT_MENTION': return this.onCommentMention(event)
      case 'DOCUMENT_EXPIRING': return this.onDocumentExpiring(event)
      case 'ANNOUNCEMENT_PUBLISHED': return this.onAnnouncementPublished(event)
      case 'SCHEDULE_PUBLISHED': return this.onSchedulePublished(event)
      default: return 0
    }
  }

  private async requestFacts(req: Request) {
    const type = await this.ds.getRepository(RequestType).findOne({ where: { code: definitionCodeOf(req) }, select: { id: true, code: true, nameAr: true, isConfidential: true } })
    const requester = req.requesterId
      ? await this.ds.getRepository(Employee).findOne({ where: { id: req.requesterId }, select: { id: true, fullName: true } }) : null
    return { confidential: type?.isConfidential === true, typeName: type?.nameAr ?? 'طلب', requesterName: requester?.fullName ?? '' }
  }

  /**
   * الحسابات اللي خطوة الطلب الحالية مستنياها (role: حاملي الدور اللي الخطوة اتصعّدت له بس). حساب «طلب بانتظار اعتمادك» نفسه، وبتستعمله
   * إشارة «المعتمد الحالي» في التعليقات (B2.8).
   */
  private async stepAccounts(req: Request, role: string | null): Promise<JwtPayload[]> {
    const waiting = this.requests.waitingSteps(req).filter(step => !role || step.role === role)
    if (!waiting.length) return []
    // خطوة وظيفية = أي حساب بيحملها؛ وكلها هيكلية = حسابات المعتمدين المسمّين بس
    const functional = waiting.some(step => (FUNCTIONAL_APPROVER_ROLES as readonly string[]).includes(step.role))
    const named = waiting.map(step => step.approverEmployeeId).filter((id): id is number => id != null)
    if (!functional && !named.length) return []
    // B2.6-ب: بدلاء المعتمدين المسمّين في تفويض ساري بيتبلّغوا كمان — الحكم النهائي لكل حساب في stepAwaitsAccount بسياق تفويضه
    const delegates = new Set(named.length ? (await activeDelegationsFrom(this.ds.manager, named)).map(row => row.delegateEmployeeId) : [])
    const users = await this.ds.getRepository(User).find({ where: functional ? { isActive: true } : { isActive: true, employeeId: In([...named, ...delegates]) } })
    const recipients: JwtPayload[] = []
    for (const account of await this.auth.accountPayloads(users)) {
      const actingFor = account.employeeId != null && delegates.has(account.employeeId) ? (await this.requests.delegationContext(account, [req]))?.(req) : undefined
      if (this.requests.stepAwaitsAccount(account, req, role, actingFor)) recipients.push(account)
    }
    return recipients
  }

  /** طلب وصل لخطوة مستنية معتمد (أو اتصعّد): للي الخطوة عليهم فعلًا. بريد بس — جوه التطبيق العدّاد المحسوب الموجود */
  private async onStepPending(event: SourceEvent): Promise<number> {
    if (!(await this.outboundRequested())) return 0
    const requestId = Number(event.payload?.requestId), stepOrder = Number(event.payload?.stepOrder)
    const req = Number.isSafeInteger(requestId) ? await this.ds.getRepository(Request).findOne({ where: { id: requestId } }) : null
    // الطلب اتحرك (اتعتمد، اترفض، راح لخطوة تانية) قبل ما المهمة تشتغل: الحدث قديم
    if (!req || req.status !== 'UNDER_REVIEW' || req.currentStep !== stepOrder) return 0
    const escalated = event.payload?.escalated === true
    // التصعيد لحاملي الدور اللي الخطوة اتصعّدت له بس: باقي المجموعة المتوازية اتبلّغوا لما الطلب وصل لهم
    const role = escalated && typeof event.payload?.role === 'string' ? event.payload.role : null
    const recipients = await this.stepAccounts(req, role)
    const facts = await this.requestFacts(req)
    return this.deliver({
      event, code: facts.confidential ? 'request.confidential' : escalated ? 'request.escalated' : 'request.pending_approval',
      category: 'approval', kind: escalated ? 'warning' : 'info', recipients, entityType: 'request', entityId: req.id,
      link: `/approvals-inbox?request=${req.id}`,
      values: facts.confidential ? {} : { 'request.type': facts.typeName, 'request.requester': facts.requesterName },
    })
  }

  /** قرار على الطلب (اعتماد، رفض، إرجاع): لصاحب الطلب. بريد بس — جوه التطبيق عنصر «قرار طلبك» المحسوب الموجود */
  private async onDecision(event: SourceEvent): Promise<number> {
    if (!(await this.outboundRequested())) return 0
    const decision = DECISIONS[event.type]
    const requestId = Number(event.payload?.requestId)
    const req = Number.isSafeInteger(requestId) ? await this.ds.getRepository(Request).findOne({ where: { id: requestId } }) : null
    if (!decision || !req?.requesterId) return 0
    const returned = event.type === 'REQUEST_RETURNED'
    // «اترجع لاستكمال»: لو صاحبه كمّله وقدّمه تاني قبل ما المهمة تشتغل، الرسالة فات وقتها
    if (returned && req.status !== 'RETURNED_FOR_INFO') return 0
    const users = await this.ds.getRepository(User).find({ where: { isActive: true, employeeId: req.requesterId } })
    const facts = await this.requestFacts(req)
    return this.deliver({
      event, code: facts.confidential ? 'request.confidential' : returned ? 'request.returned' : 'request.decided', category: 'request', kind: decision.kind,
      recipients: await this.auth.accountPayloads(users), entityType: 'request', entityId: req.id, link: '/requests',
      values: facts.confidential ? {} : { 'request.type': facts.typeName, 'request.decision': decision.text },
    })
  }

  /** المسير اتعتمد = قسيمة كل موظف فيه ظهرت: إشعار مخزّن وبريد، بالشهر بس ومن غير أي مبلغ */
  private async onPayrollApproved(event: SourceEvent): Promise<number> {
    const runId = Number(event.payload?.runId)
    if (!Number.isSafeInteger(runId)) return 0
    const [run]: Array<{ status: string; period: string }> = await this.ds.query('SELECT [status], [period] FROM [payroll_runs] WHERE [id] = @0', [runId])
    // المسير اتفتح تاني قبل ما المهمة تشتغل: القسيمة مابقتش ظاهرة
    if (!run || !['APPROVED', 'PAID'].includes(run.status)) return 0
    const members: Array<{ employeeId: number }> = await this.ds.query('SELECT DISTINCT [employeeId] FROM [payroll_items] WHERE [runId] = @0', [runId])
    const users: User[] = []
    const ids = members.map(row => Number(row.employeeId))
    for (let offset = 0; offset < ids.length; offset += 1000) {
      users.push(...await this.ds.getRepository(User).find({ where: { isActive: true, employeeId: In(ids.slice(offset, offset + 1000)) } }))
    }
    return this.deliver({
      event, code: 'payroll.payslip_available', category: 'payroll', kind: 'info', recipients: await this.auth.accountPayloads(users),
      entityType: 'payroll_run', entityId: runId, link: '/my/payslips', values: { 'payslip.period': String(run.period) },
    })
  }

  // ===== B2.16: «إعلان جديد» لجمهور الإعلان =====
  /** الإعلان لسه ساري وقت التوزيع، والمستلمين حسابات موظفين جمهوره دلوقتي (العنوان بس في الإشعار) */
  /** B5.5: جدول أسبوع اتنشر — لحسابات موظفين الفرع (بفرعهم الحالي) اللي لهم وردية في الأسبوع دلوقتي */
  private async onSchedulePublished(event: SourceEvent): Promise<number> {
    const id = Number(event.payload?.publicationId)
    if (!Number.isSafeInteger(id)) return 0
    const audience = await publicationAudience(this.ds.manager, id)
    if (!audience || !audience.employeeIds.length) return 0
    const users: User[] = []
    for (let offset = 0; offset < audience.employeeIds.length; offset += 1000) {
      users.push(...await this.ds.getRepository(User).find({ where: { isActive: true, employeeId: In(audience.employeeIds.slice(offset, offset + 1000)) } }))
    }
    return this.deliver({
      event, code: 'schedule.published', category: 'schedule', kind: 'info', recipients: await this.auth.accountPayloads(users),
      entityType: 'schedule_publication', entityId: id, link: '/my/attendance', values: { 'schedule.week': audience.weekStart },
    })
  }

  private async onAnnouncementPublished(event: SourceEvent): Promise<number> {
    const id = Number(event.payload?.announcementId)
    if (!Number.isSafeInteger(id)) return 0
    const live = await this.announcements.liveAudienceAccounts(id)
    if (!live) return 0
    return this.deliver({
      event, code: 'announcement.published', category: 'announcement', kind: 'info', recipients: await this.auth.accountPayloads(live.accounts),
      entityType: 'announcement', entityId: id, link: '/announcements', values: { 'announcement.title': live.row.title },
    })
  }

  // ===== B2.15: «مستندك هينتهي» لصاحب المستند =====
  /** المستند لسه بتاريخ الحدث وموظفه لسه حالي؟ (اتجدد أو اتمسح بعد الحدث = مفيش إشعار) */
  // CRP3D-N01: مستند اتبدّل بمستند أحدث من نفس النوع (نفس حكم التنبيه والتقرير) = مابقاش «هينتهي»: لا بيتوزّع ولا رسالته بتطلع
  private async expiringDocument(documentId: number, expiryDate: string) {
    const [doc]: Array<{ employeeId: number; docType: string; expiryDate: string }> = await this.ds.query(
      `SELECT d.[employeeId], d.[docType], CONVERT(nvarchar(10), d.[expiryDate], 23) AS [expiryDate] FROM [employee_documents] d
       WHERE d.[id] = @0 AND NOT ${supersededSql('d')}`, [documentId])
    return doc && doc.expiryDate === expiryDate ? doc : null
  }

  private async onDocumentExpiring(event: SourceEvent): Promise<number> {
    const documentId = Number(event.payload?.documentId), expiryDate = String(event.payload?.expiryDate ?? '')
    if (!Number.isSafeInteger(documentId) || !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) return 0
    const doc = await this.expiringDocument(documentId, expiryDate)
    if (!doc) return 0
    const [type]: Array<{ nameAr: string }> = await this.ds.query('SELECT [nameAr] FROM [doc_types] WHERE [code] = @0', [doc.docType])
    const users = await this.ds.getRepository(User).find({ where: { isActive: true, employeeId: Number(doc.employeeId) } })
    return this.deliver({
      event, code: 'document.expiring', category: 'document', kind: 'warning', recipients: await this.auth.accountPayloads(users),
      entityType: 'employee_document', entityId: documentId, link: '/my/documents',
      values: { 'document.type': type?.nameAr ?? String(doc.docType), 'document.expiry': doc.expiryDate },
    })
  }

  // ===== B2.5: إشعارات المهام (بريد بس — جوه النظام عدّاد «مهامي») =====
  /** حسابات المسؤول عن المهمة: حسابات موظفها، أو حاملي دورها اللي فرعها في نطاقهم (نفس حكم «مهامي») */
  private async taskAssigneeAccounts(task: Task): Promise<JwtPayload[]> {
    const users = await this.ds.getRepository(User).find({ where: task.assigneeEmployeeId != null ? { isActive: true, employeeId: task.assigneeEmployeeId } : { isActive: true } })
    return (await this.auth.accountPayloads(users)).filter(account => taskAwaitsAccount(account, task))
  }

  /**
   * اللي بيتبلّغ بتأخير المهمة: المدير المباشر للموظف المسؤول؛ ومهمة الدور، أو موظف من غير مدير أو مديره مالوش حساب شغال، اللي كلّف
   * بيها (التأخير مايضيعش من غير حد يعرف). والمستلم لازم يكون لسه شايف المهمة بحكمها (taskAccess): اللي كلّف بيها وفقد حقه مايوصلوش
   * اسم مسؤولها ولا موعدها.
   */
  private async taskEscalationAccounts(task: Task): Promise<JwtPayload[]> {
    // المهمة الشخصية تذكير صاحبها: تأخيرها مابيتبلّغش بيه حد (إضافة المالك 6 أكتوبر)
    const { isPersonal } = await taskExtrasOfOne(this.ds.manager, task.id)
    if (isPersonal) return []
    const manager = task.assigneeEmployeeId != null ? await this.resolver.directManagerOf(task.assigneeEmployeeId) : null
    const users = this.ds.getRepository(User)
    const managers = manager ? await users.find({ where: { isActive: true, employeeId: manager } }) : []
    const found = managers.length ? managers : await users.find({ where: { isActive: true, id: task.createdByUserId } })
    const allowed: JwtPayload[] = []
    for (const account of await this.auth.accountPayloads(found)) {
      // اللي المهمة عليه مابيتصعّدلوش تأخيره هو
      if (taskAwaitsAccount(account, task)) continue
      if ((await taskAccess(account, { ...task, isPersonal }, this.resolver)).visible) allowed.push(account)
    }
    return allowed
  }

  private async taskAssigneeName(task: Task): Promise<string> {
    if (task.assigneeEmployeeId == null) return TASK_ROLE_LABELS[task.assigneeRole as keyof typeof TASK_ROLE_LABELS] ?? ''
    return (await this.ds.getRepository(Employee).findOne({ where: { id: task.assigneeEmployeeId }, select: { id: true, fullName: true } }))?.fullName ?? ''
  }

  /** مهمة اتكلّف بيها مسؤول، أو موعدها قرّب (للمسؤول)، أو اتأخرت (لمدير المسؤول). العنوان والموعد بس — الوصف مابيتبعتش */
  private async onTask(event: SourceEvent): Promise<number> {
    if (!(await this.outboundRequested()) || !(await tasksTableReady(this.ds.manager))) return 0
    const taskId = Number(event.payload?.taskId)
    const task = Number.isSafeInteger(taskId) ? await this.ds.getRepository(Task).findOne({ where: { id: taskId } }) : null
    // المهمة اتقفلت أو اتلغت قبل ما مهمة التوزيع تشتغل: الحدث قديم
    if (!task || !TASK_OPEN_STATUSES.includes(task.status as TaskStatus)) return 0
    const overdue = event.type === 'TASK_OVERDUE'
    // حدث تذكير أو تأخير من جيل قديم (الموعد اتغيّر أو المهمة اتحوّلت بعد تسجيله، والمهمة اتختمت تاني أو لسه): الجيل الجديد ليه حدثه
    if (event.type !== 'TASK_ASSIGNED' && !taskStampCurrent(event.payload, overdue ? task.escalatedAt : task.remindedAt)) return 0
    const recipients = overdue ? await this.taskEscalationAccounts(task)
      // اللي كلّف نفسه مابيتبعتلوش «مهمة جديدة عليك»
      : (await this.taskAssigneeAccounts(task)).filter(account => event.type !== 'TASK_ASSIGNED' || account.sub !== task.createdByUserId)
    return this.deliver({
      event, code: overdue ? 'task.overdue' : event.type === 'TASK_DUE_SOON' ? 'task.due_soon' : 'task.assigned', category: 'task', kind: event.type === 'TASK_ASSIGNED' ? 'info' : 'warning',
      recipients, entityType: 'task', entityId: task.id, link: `/my/tasks?task=${task.id}`,
      values: { 'task.title': task.title, 'task.due': task.dueDate ?? 'من غير موعد', ...(overdue ? { 'task.assignee': await this.taskAssigneeName(task) } : {}) },
    })
  }

  // ===== B2.8: إشارة في تعليق =====
  /**
   * إشارة في تعليق: لدور في الموضوع (صاحب الطلب، المعتمد الحالي، مسؤول المهمة، اللي كلّف بيها) أو لكاتب تعليق مردود عليه. المستلم لازم
   * يقرا التعليق نفسه دلوقتي (حق الكيان، والداخلي مش لصاحب الطلب)، والكاتب مابيتبعتلوش. النص من غير محتوى: «على طلب» أو «على مهمة»
   * ولينك يفتحه.
   */
  private async onCommentMention(event: SourceEvent): Promise<number> {
    const commentId = Number(event.payload?.commentId)
    const comment = Number.isSafeInteger(commentId) ? await this.comments.byId(commentId) : null
    if (!comment || !isCommentEntity(comment.entityType)) return 0
    const mentions = parseCommentMentions(comment.mentions)
    const users = this.ds.getRepository(User)
    const accounts = new Map<number, JwtPayload>()
    const add = (rows: JwtPayload[]) => { for (const row of rows) accounts.set(row.sub, row) }
    if (comment.entityType === 'request') {
      const req = await this.ds.getRepository(Request).findOne({ where: { id: comment.entityId } })
      if (!req) return 0
      if (mentions.targets.includes('REQUESTER') && req.requesterId) add(await this.auth.accountPayloads(await users.find({ where: { isActive: true, employeeId: req.requesterId } })))
      // الطلب اتحسم أو اتحرك قبل ما مهمة التوزيع تشتغل: المعتمد الحالي هو اللي الخطوة عليه دلوقتي
      if (mentions.targets.includes('CURRENT_APPROVERS') && req.status === 'UNDER_REVIEW') add(await this.stepAccounts(req, null))
    } else {
      const task = (await tasksTableReady(this.ds.manager)) ? await this.ds.getRepository(Task).findOne({ where: { id: comment.entityId } }) : null
      if (!task) return 0
      if (mentions.targets.includes('ASSIGNEE')) add(await this.taskAssigneeAccounts(task))
      if (mentions.targets.includes('CREATOR')) add(await this.auth.accountPayloads(await users.find({ where: { isActive: true, id: task.createdByUserId } })))
    }
    const authors = await this.comments.authorAccountsOf(comment, mentions.replyTo)
    if (authors.length) add(await this.auth.accountPayloads(await users.find({ where: { isActive: true, id: In(authors) } })))
    const recipients: JwtPayload[] = []
    for (const account of accounts.values()) {
      if (account.sub !== comment.authorUserId && await this.comments.readableBy(account, comment)) recipients.push(account)
    }
    return this.deliver({
      event, code: 'comment.mentioned', category: 'comment', kind: 'info', recipients, entityType: 'comment', entityId: comment.id,
      link: comment.entityType === 'request' ? `/requests?request=${comment.entityId}` : `/my/tasks?task=${comment.entityId}`,
      values: { 'comment.where': comment.entityType === 'request' ? 'على طلب' : 'على مهمة' },
    })
  }

  /**
   * الحساب لسه مقصود بالإشارة؟ في واحد من الأدوار المشار لها دلوقتي، أو هو كاتب تعليق مردود عليه. حساب صاحب الطلب اللي اتربط بموظف تاني،
   * ومعتمد الخطوة اللي اتحسمت، ومسؤول المهمة اللي اتحوّلت: مابقوش في الدور.
   */
  private async mentionHolds(comment: Pick<Comment, 'entityType' | 'entityId' | 'mentions'>, account: JwtPayload): Promise<boolean> {
    const mentions = parseCommentMentions(comment.mentions)
    if ((await this.comments.authorAccountsOf(comment, mentions.replyTo)).includes(account.sub)) return true
    if (comment.entityType === 'request') {
      const req = await this.ds.getRepository(Request).findOne({ where: { id: comment.entityId } })
      if (!req) return false
      if (mentions.targets.includes('REQUESTER') && !!account.employeeId && account.employeeId === req.requesterId) return true
      return mentions.targets.includes('CURRENT_APPROVERS')
        && this.requests.stepAwaitsAccount(account, req, null, (await this.requests.delegationContext(account, [req]))?.(req))
    }
    const task = (await tasksTableReady(this.ds.manager)) ? await this.ds.getRepository(Task).findOne({ where: { id: comment.entityId } }) : null
    if (!task) return false
    return (mentions.targets.includes('ASSIGNEE') && taskAwaitsAccount(account, task)) || (mentions.targets.includes('CREATOR') && task.createdByUserId === account.sub)
  }

  /**
   * نص الحدث لكل قناة بلغة المستلم (B-ADD.5): النص المعدَّل بلغته، وإلا المعدَّل العربي، وإلا الافتراضي. english = فيه نص إنجليزي محفوظ للحدث
   * (من غيره لغة المستلمين مابتتقراش أصلًا).
   */
  private async templatesOf(code: NotificationEventCode): Promise<{ english: boolean; of(language: NotificationTemplateLanguage): Record<NotificationChannelCode, NotificationText> }> {
    const rows = await this.ds.getRepository(NotificationTemplate).find({ where: { eventCode: code } })
    const def = notificationEventDef(code)
    const built = new Map<string, Record<NotificationChannelCode, NotificationText>>()
    const of = (language: NotificationTemplateLanguage) => {
      if (!built.has(language)) {
        built.set(language, Object.fromEntries(NOTIFICATION_CHANNELS.map(channel => {
          const row = rows.find(item => item.channel === channel && item.language === language) ?? rows.find(item => item.channel === channel && item.language === LANGUAGE)
          return [channel, row ? { title: row.title, body: row.body } : def.templates[channel]]
        })) as Record<NotificationChannelCode, NotificationText>)
      }
      return built.get(language)!
    }
    return { english: rows.some(row => row.language === 'en'), of }
  }

  /** لغة حساب كل مستلم (B6.2). قبل ترحيل 182، أو حساب من غير لغة = عربي (مابيتحطش في الخريطة) */
  private async languagesOf(userIds: number[]): Promise<Map<number, NotificationTemplateLanguage>> {
    const out = new Map<number, NotificationTemplateLanguage>()
    if (!userIds.length || !(await userLanguageReady(this.ds.manager))) return out
    for (let offset = 0; offset < userIds.length; offset += 1000) {
      const rows: Array<{ id: number; language: string | null }> = await this.ds.query(
        'SELECT [id], [language] FROM dbo.users WHERE [id] IN (SELECT CAST([value] AS int) FROM OPENJSON(@0))', [JSON.stringify(userIds.slice(offset, offset + 1000))])
      for (const row of rows) if (isNotificationTemplateLanguage(row.language)) out.set(Number(row.id), row.language)
    }
    return out
  }

  private async modesOf(userIds: number[], category: string): Promise<Map<string, NotificationMode>> {
    const out = new Map<string, NotificationMode>()
    for (let offset = 0; offset < userIds.length; offset += 1000) {
      const rows = await this.ds.getRepository(NotificationPreference).find({ where: { userId: In(userIds.slice(offset, offset + 1000)), category } })
      for (const row of rows) out.set(`${row.userId}:${row.channel}`, row.mode as NotificationMode)
    }
    return out
  }

  /**
   * كتابة الإشعار وسجل توصيله لكل مستلم (معاملة لكل مستلم). منع التكرار بمفتاح «الحدث:الكود:المستلم»: مهمة اتعادت مابتكررش.
   * صف التوصيل بيتكتب للقناة المفتوحة على مستوى الشركة بس: حدث بريد والبريد مقفول = ولا صف.
   * B-ADD.5: والقناة لازم تكون مفتوحة للحدث نفسه من «قنوات الإشعارات» (من غير قاعدة محفوظة: داخل النظام والبريد زي ما هم، والواتساب
   * مقفول). الحدث «الإلزامي» اختيار المستخدم مابيتطبقش عليه. والواتساب رسالته قالب Meta المربوط بالحدث بقيم نفس متغيراته — من غير ربط «اتخطّى».
   */
  private async deliver(input: DeliverInput): Promise<number> {
    const def = notificationEventDef(input.code)
    const { rule, bindings } = await this.channels.ruleOf(input.code)
    const emailRequested = rule.email && await this.emailRequested()
    const whatsapp = rule.whatsapp ? await this.channels.whatsappSetup() : null
    const whatsappOpen = whatsapp?.open === true
    const storesInApp = def.storedInApp && rule.inApp
    if ((!storesInApp && !emailRequested && !whatsappOpen) || !input.recipients.length) return 0
    // إعداد خادم البريد المحفوظ من الشاشة (لو اتغيّر من نسخة تانية من الخادم) قبل الحكم «الخادم مضبوط؟»
    if (emailRequested) await this.mail.refreshStoredConfig()
    const templates = await this.templatesOf(input.code)
    const company = await this.setting('company.name', '')
    const base = this.frontendBase()
    const modes = await this.modesOf(input.recipients.map(account => account.sub), input.category)
    const quiet = parseQuietHours(await this.setting(NOTIFICATIONS_QUIET_HOURS_KEY, ''))
    const userIds = input.recipients.map(account => account.sub)
    const names = new Map<number, string>()
    for (let offset = 0; offset < userIds.length; offset += 1000) {
      for (const row of await this.ds.getRepository(User).find({ where: { id: In(userIds.slice(offset, offset + 1000)) }, select: { id: true, displayName: true } })) names.set(row.id, row.displayName ?? '')
    }
    const employeeIds = input.recipients.map(account => account.employeeId).filter((id): id is number => id != null)
    const fileEmails = new Map<number, string | null>()
    for (let offset = 0; offset < employeeIds.length; offset += 1000) {
      for (const row of await this.ds.getRepository(Employee).find({ where: { id: In(employeeIds.slice(offset, offset + 1000)) }, select: { id: true, email: true } })) fileEmails.set(row.id, row.email ?? null)
    }
    const languages = templates.english || bindings.en ? await this.languagesOf(userIds) : new Map<number, NotificationTemplateLanguage>()
    const numbers = whatsappOpen ? await this.channels.whatsappNumbers(employeeIds, whatsapp.settings) : new Map<number, string>()
    const path = input.link.split('?')[0]
    let created = 0, queued = 0, queuedWhatsapp = 0
    for (const account of input.recipients) {
      // نفس قاعدة القايمة: الشاشة اللي اللينك بيوديها متاحة للمستلم (الموديول مفعّل له)؟
      if (!routeAvailable(path, await this.modules.enabledFor(account))) continue
      const values = { ...input.values, 'recipient.name': names.get(account.sub) ?? '', 'company.name': company, link: base ? `${base}${input.link}` : '' }
      const language = languages.get(account.sub) ?? LANGUAGE
      const text = templates.of(language)
      const inAppText = renderNotificationText(text.IN_APP, values)
      // «إلزامي» من الإدارة: «مقفول» و«ملخص يومي» بتوع المستخدم مابيتطبقوش على الحدث ده
      const modeOf = (channel: string): NotificationMode => rule.mandatory ? 'ON' : modes.get(`${account.sub}:${channel}`) ?? 'ON'
      const inApp = storesInApp && modeOf('IN_APP') !== 'OFF'
      const emailMode = modeOf('EMAIL')
      const address = pickNotificationAddress(account.email, account.employeeId != null ? fileEmails.get(account.employeeId) : null)
      // قالب الواتساب بلغة المستلم، وإلا العربي
      const binding: WhatsappBinding | null = bindings[language] ?? bindings.ar ?? null
      const number = account.employeeId != null ? numbers.get(account.employeeId) ?? null : null
      const now = new Date()
      // في ساعات الهدوء المهمة بتتأجل لآخرها، والدفعة الكبيرة بتتوزع على دقايق
      const runAfter = (index: number, perMinute: number) => {
        const spread = Math.floor(index / perMinute) * 60_000
        const quietEnd = quietHoursEnd(now, quiet)
        return quietEnd ? new Date(quietEnd.getTime() + spread) : spread ? new Date(now.getTime() + spread) : null
      }
      const done = await this.ds.transaction(async em => {
        const dedupeKey = `${event_key(input.event)}:${input.code}:${account.sub}`
        if (await em.getRepository(Notification).count({ where: { dedupeKey } })) return false
        let notification: Notification
        try {
          notification = await em.getRepository(Notification).save(em.getRepository(Notification).create({
            recipientUserId: account.sub, eventCode: input.code, category: input.category, entityType: input.entityType, entityId: String(input.entityId),
            kind: input.kind, title: inAppText.title, body: inAppText.body.slice(0, 1000), link: input.link, inApp, dedupeKey, createdAt: now }))
        } catch (error) {
          // مهمة تانية لنفس الحدث سبقت بنفس المفتاح (الفهرس الفريد): الإشعار موجود
          if (sqlErrorNumber(error) === 2601 || sqlErrorNumber(error) === 2627) return false
          throw error
        }
        const deliveries = em.getRepository(NotificationDelivery)
        if (def.storedInApp) {
          await deliveries.save(deliveries.create({ notificationId: notification.id, channel: 'IN_APP', status: inApp ? 'SENT' : 'SKIPPED', attempts: 0,
            address: null, subject: null, body: null, createdAt: now, sentAt: inApp ? now : null,
            detail: inApp ? null : !rule.inApp ? 'الإشعار داخل النظام مقفول للحدث ده من «قنوات الإشعارات»' : 'المستخدم قافل الإشعار داخل النظام للفئة دي' }))
        }
        if (emailRequested) {
          const [status, detail] = !this.mail.isConfigured() ? ['SKIPPED', 'خادم البريد غير مضبوط (SMTP)']
            : !base ? ['SKIPPED', 'عنوان الواجهة مش مضبوط على الخادم (FRONTEND_URL)، ولينك الرسالة محتاجه']
            : emailMode === 'OFF' ? ['SKIPPED', 'المستخدم قافل بريد الفئة دي']
            : !address ? ['SKIPPED', 'مفيش بريد صالح على الحساب ولا في ملف الموظف']
            : emailMode === 'DIGEST' ? ['DIGEST', null] : ['PENDING', null]
          // نص الرسالة بيتخزن للي هتتبعت بس (ومابيفضلش بعد الإرسال): السجل بيعرض الحالة والسبب مش النص
          const mailText = status === 'PENDING' ? renderNotificationText(text.EMAIL, values) : null
          const delivery = await deliveries.save(deliveries.create({ notificationId: notification.id, channel: 'EMAIL', status, attempts: 0,
            address: address ? maskEmail(address) : null, subject: mailText?.title ?? null, body: mailText?.body ?? null, detail, createdAt: now, sentAt: null }))
          // مهمة البريد في نفس معاملة صف التوصيل: «مستني» = ليه مهمة. في ساعات الهدوء بتتأجل لآخرها، والدفعة الكبيرة بتتوزع على دقايق
          if (status === 'PENDING') {
            await enqueueQueueJob(em, { jobType: NOTIFICATIONS_EMAIL_JOB, payload: { deliveryId: delivery.id }, key: `${NOTIFICATIONS_EMAIL_JOB}:${delivery.id}`,
              maxAttempts: NOTIFICATIONS_EMAIL_MAX_ATTEMPTS, runAfter: runAfter(queued++, NOTIFICATIONS_EMAIL_PER_MINUTE) })
          }
        }
        if (whatsappOpen) {
          const [status, detail] = !binding ? ['SKIPPED', 'الحدث مالوش قالب واتساب مربوط']
            : binding.variables.includes('link') && !base ? ['SKIPPED', 'عنوان الواجهة مش مضبوط على الخادم (FRONTEND_URL)، وقالب الواتساب محتاج اللينك']
            : modeOf('WHATSAPP') === 'OFF' ? ['SKIPPED', 'المستخدم قافل واتساب الفئة دي']
            : !number ? ['SKIPPED', 'مفيش رقم واتساب في ملف الموظف']
            : ['PENDING', null]
          // المتخزن للي هتتبعت بس: اسم القالب وقيم متغيراته (من غير مبالغ ولا محتوى طلب — نفس متغيرات الحدث)، وبيتمسح بعد الإرسال
          const sending = status === 'PENDING' && binding ? { binding, parameters: whatsappParameters(binding, values) } : null
          const delivery = await deliveries.save(deliveries.create({ notificationId: notification.id, channel: 'WHATSAPP', status, attempts: 0,
            address: number ? maskPhone(number) : null, subject: sending ? sending.binding.templateName.slice(0, 300) : null, body: sending ? JSON.stringify(sending) : null,
            detail, createdAt: now, sentAt: null }))
          if (sending) {
            await enqueueQueueJob(em, { jobType: NOTIFICATIONS_WHATSAPP_JOB, payload: { deliveryId: delivery.id }, key: `${NOTIFICATIONS_WHATSAPP_JOB}:${delivery.id}`,
              maxAttempts: NOTIFICATIONS_EMAIL_MAX_ATTEMPTS, runAfter: runAfter(queuedWhatsapp++, NOTIFICATIONS_WHATSAPP_PER_MINUTE) })
          }
        }
        return true
      })
      if (done) created++
    }
    return created
  }

  /** العنوان اللي البريد بيتبعت عليه: بريد الحساب، وإلا البريد اللي في ملف الموظف (pickNotificationAddress) */
  private async addressOf(user: Pick<User, 'email' | 'employeeId'>): Promise<string | null> {
    const employee = user.employeeId ? await this.ds.getRepository(Employee).findOne({ where: { id: user.employeeId }, select: { id: true, email: true } }) : null
    return pickNotificationAddress(user.email, employee?.email)
  }

  /** نوع حدث المصدر اللي الإشعار اتعمل منه (مفتاح منع التكرار شايل رقم حدث الـoutbox) — دلالة الحدث بتفضل معروفة حتى لو القالب عام (الطلب السري) */
  private async sourceEventType(notification: Pick<Notification, 'dedupeKey'>): Promise<string | null> {
    const id = /^outbox:(\d+):/.exec(notification.dedupeKey ?? '')?.[1]
    if (!id || !(await queueTablesReady(this.ds.manager))) return null
    const [row]: Array<{ eventType: string }> = await this.ds.query('SELECT [eventType] FROM [outbox_events] WHERE [id] = @0', [id])
    return row?.eventType ?? null
  }

  /** حمولة حدث المصدر (رقمه متخزن في مفتاح منع التكرار) — null لو الحدث مش موجود أو الطابور مش جاهز */
  private async sourcePayload(notification: Pick<Notification, 'dedupeKey'>): Promise<Record<string, unknown> | null> {
    const id = /^outbox:(\d+):/.exec(notification.dedupeKey ?? '')?.[1]
    if (!id || !(await queueTablesReady(this.ds.manager))) return null
    const [row]: Array<{ payload: string | null }> = await this.ds.query('SELECT [payload] FROM [outbox_events] WHERE [id] = @0', [id])
    try {
      const payload: unknown = row?.payload ? JSON.parse(row.payload) : null
      return payload && typeof payload === 'object' ? payload as Record<string, unknown> : null
    } catch { return null }
  }

  /**
   * الإشعار لسه صحيح والمستلم لسه ليه حق فيه وقت الإرسال؟ البريد ممكن يتبعت بعد الحدث بساعات (ساعات الهدوء، إعادة المحاولة، الملخص
   * اليومي)، فكل حاجة اتحكم بيها وقت التوزيع بتتحكم تاني بحالتها دلوقتي قبل ما الرسالة تطلع:
   * إشعار أحدث لنفس الحدث على نفس الكيان؛ والشاشة اللي الإشعار بيودّي ليها لسه متاحة للمستلم (موديولها ماتقفلش له)؛ و«طلب مستني اعتمادك»
   * والطلب لسه مستني الحساب ده؛ وإشعارات صاحب الطلب (قرار، إرجاع) والحساب لسه حساب صاحب الطلب، و«أُعيد طلبك» والطلب لسه مرتجع؛
   * ونوع الطلب مابقاش سري بعد ما النص اتجهّز بنوعه واسم صاحبه؛
   * و«قسيمتك ظهرت» والقسيمة لسه ظاهرة لموظف الحساب. null = صحيح، وإلا سبب التخطّي.
   */
  private async staleReason(notification: NotificationRef, user: User): Promise<string | null> {
    const [latest]: Array<{ id: string }> = await this.ds.query(`SELECT TOP (1) [id] FROM [notifications]
      WHERE [recipientUserId] = @0 AND [eventCode] = @1 AND [entityType] = @2 AND [entityId] = @3 ORDER BY [id] DESC`,
    [notification.recipientUserId, notification.eventCode, notification.entityType, notification.entityId])
    if (latest && String(latest.id) !== String(notification.id)) return 'فيه إشعار أحدث لنفس الحدث'
    const [account] = await this.auth.accountPayloads([user])
    // نفس فحص التوزيع: الموديول اتقفل للمستلم بعدها = مفيش رسالة عن شاشة مابقاش يقدر يفتحها
    if (!routeAvailable(String(notification.link ?? '').split('?')[0], await this.modules.enabledFor(account))) return 'الشاشة اللي الإشعار بيودّي ليها مابقتش متاحة للمستلم'
    if (notification.entityType === 'request') {
      const id = Number(notification.entityId)
      const req = Number.isSafeInteger(id) ? await this.ds.getRepository(Request).findOne({ where: { id } }) : null
      // نوع الطلب بقى سري بعد ما الرسالة اتجهّزت بنوعه واسم صاحبه: النص المتخزن مابيطلعش (الإشعار السري قالبه عام من الأول)
      if (req && notification.eventCode !== 'request.confidential' && (await this.requestFacts(req)).confidential) return 'نوع الطلب بقى سري بعد تجهيز الرسالة'
      // B2.6-ب: والبديل لسه بديل (تفويضه ماتلغاش ولا انتهى) وقت الإرسال
      if (notification.category === 'approval') {
        return req && this.requests.stepAwaitsAccount(account, req, null, (await this.requests.delegationContext(account, [req]))?.(req)) ? null : 'الطلب مابقاش مستني اعتماد الحساب ده'
      }
      // إشعارات صاحب الطلب (قرار، إرجاع — والسري منهم): الحساب اتربط بموظف تاني بعدها = مابقاش حساب صاحب الطلب
      if (!req || !user.employeeId || user.employeeId !== req.requesterId) return 'الحساب مابقاش حساب صاحب الطلب'
      // «اترجع لاستكمال» بدلالة حدث المصدر مش بكود القالب: الطلب السري قالبه عام، وإرجاعه بياخد نفس الفحص
      const returned = notification.eventCode === 'request.returned'
        || (notification.eventCode === 'request.confidential' && (await this.sourceEventType(notification)) === 'REQUEST_RETURNED')
      return returned && req.status !== 'RETURNED_FOR_INFO' ? 'الطلب اتقدّم تاني أو اتحسم' : null
    }
    if (notification.entityType === 'task') {
      const id = Number(notification.entityId)
      const task = Number.isSafeInteger(id) && (await tasksTableReady(this.ds.manager)) ? await this.ds.getRepository(Task).findOne({ where: { id } }) : null
      if (!task || !TASK_OPEN_STATUSES.includes(task.status as TaskStatus)) return 'المهمة اتقفلت أو اتلغت'
      if (notification.eventCode === 'task.overdue') {
        if (!task.dueDate || task.dueDate >= taskLocalDate(new Date())) return 'المهمة مابقتش متأخرة'
        // الرسالة اتجهّزت باسم مسؤول وموعد: صالحة طول ما ختم التصعيد هو ختم حدثها. تحويل أو تغيير موعد بيشيل الختم، وختم جديد بعدها
        // = رسالة جديدة بحدثها — القديمة عن وضع فات حتى لو المهمة اتختمت تاني (CRP2G-N02)
        if (!taskStampCurrent(await this.sourcePayload(notification), task.escalatedAt)) return 'المهمة اتحوّلت أو موعدها اتغيّر بعد تجهيز الرسالة'
        return (await this.taskEscalationAccounts(task)).some(row => row.sub === user.id) ? null : 'تأخير المهمة مابقاش بيتبلّغ بيه الحساب ده'
      }
      if (!taskAwaitsAccount(account, task)) return 'المهمة مابقتش على الحساب ده'
      // «موعدها قرّب» اتجهّزت بموعد: صالحة طول ما ختم التذكير هو ختم حدثها (نفس القاعدة)
      return notification.eventCode === 'task.due_soon' && (!task.dueDate || !taskStampCurrent(await this.sourcePayload(notification), task.remindedAt))
        ? 'موعد المهمة اتغيّر بعد تجهيز الرسالة' : null
    }
    if (notification.entityType === 'comment') {
      // B2.8: إشارة في تعليق — المستلم لسه يقرا التعليق نفسه (حق الكيان دلوقتي، والداخلي مش لجانب الموظف)، ولسه في الدور اللي اتشاور له
      const comment = await this.comments.byId(Number(notification.entityId))
      if (!comment || !(await this.comments.readableBy(account, comment))) return 'التعليق مابقاش ظاهر للحساب ده'
      return (await this.mentionHolds(comment, account)) ? null : 'الحساب مابقاش في الدور اللي اتشاور له'
    }
    if (notification.entityType === 'announcement') {
      // B2.16: الإعلان لسه ساري والحساب لسه في جمهوره (اتسحب أو انتهى أو الموظف اتنقل = مفيش رسالة)
      return (await this.announcements.liveFor(account, Number(notification.entityId))) ? null : 'الإعلان مابقاش ساري أو الحساب مابقاش في جمهوره'
    }
    if (notification.entityType === 'schedule_publication') {
      // B5.5: الموظف لسه في فرع النشر وله وردية في أسبوعه (اتنقل أو ورديته اتشالت = مفيش رسالة)
      const audience = await publicationAudience(this.ds.manager, Number(notification.entityId))
      return audience && user.employeeId != null && audience.employeeIds.includes(Number(user.employeeId)) ? null : 'الجدول مابقاش يخص الحساب ده'
    }
    if (notification.entityType === 'employee_document') {
      // B2.15: المستند لسه بتاريخ الحدث، ولسه مستند موظف الحساب ده
      const expiryDate = String((await this.sourcePayload(notification))?.expiryDate ?? '')
      const doc = await this.expiringDocument(Number(notification.entityId), expiryDate)
      return doc && Number(doc.employeeId) === Number(user.employeeId ?? 0) ? null : 'المستند اتجدد أو مابقاش لموظف الحساب ده'
    }
    if (notification.entityType === 'payroll_run') {
      // نفس شرط «قسائم راتبي»: مسير معتمد أو مصروف ليه بند لموظف الحساب
      const [visible] = await this.ds.query(`SELECT TOP (1) 1 AS [ok] FROM [payroll_runs] r INNER JOIN [payroll_items] i ON i.[runId] = r.[id]
        WHERE r.[id] = @0 AND r.[status] IN (N'APPROVED', N'PAID') AND i.[employeeId] = @1`, [Number(notification.entityId), user.employeeId ?? 0])
      return visible ? null : 'المسير اتفتح تاني والقسيمة مابقتش ظاهرة'
    }
    return null
  }

  // ===== البريد والواتساب: مهمة لكل رسالة =====
  private readonly emailDriver: OutboundDriver = {
    channel: 'EMAIL', job: NOTIFICATIONS_EMAIL_JOB, digest: true,
    open: () => this.emailRequested(),
    closedDetail: 'البريد اتقفل من الإعدادات قبل الإرسال', offDetail: 'المستخدم قافل بريد الفئة دي', noAddressDetail: 'مفيش بريد صالح على الحساب ولا في ملف الموظف',
    pausedDetail: 'خادم البريد مش بيرد — الإرسال واقف دقيقة وهيتجرّب تاني', failurePrefix: 'تعذر إرسال بريد الإشعار',
    addressOf: user => this.addressOf(user), mask: maskEmail,
    send: async (address, delivery) => { await this.mail.send({ to: address, subject: delivery.subject ?? '', text: delivery.body ?? '' }) },
    failure: error => {
      const raw = mailFailureRaw(error), rejected = MAIL_REJECTED.test(raw)
      return { detail: mailFailureText(error), rejected, unreachable: !rejected && MAIL_UNREACHABLE.test(raw) }
    },
  }

  private readonly whatsappDriver: OutboundDriver = {
    channel: 'WHATSAPP', job: NOTIFICATIONS_WHATSAPP_JOB, digest: false,
    open: () => this.channels.whatsappOpen(),
    closedDetail: 'الواتساب اتقفل من الإعدادات قبل الإرسال', offDetail: 'المستخدم قافل واتساب الفئة دي', noAddressDetail: 'مفيش رقم واتساب في ملف الموظف',
    pausedDetail: 'مزوّد الواتساب مش بيرد — الإرسال واقف دقيقة وهيتجرّب تاني', failurePrefix: 'تعذر إرسال واتساب الإشعار',
    // الرقم بيتقري من ملف الموظف وقت الإرسال (السجل شايله متخفي بس)
    addressOf: async user => user.employeeId
      ? (await this.channels.whatsappNumbers([user.employeeId], (await this.channels.whatsappSetup()).settings)).get(user.employeeId) ?? null : null,
    mask: maskPhone,
    send: async (address, delivery) => {
      const sending = preparedWhatsapp(delivery.body)
      if (!sending) throw new WhatsappSendError('الرسالة المجهّزة مش موجودة في السجل', true, false)
      await this.channels.sendWhatsapp(address, sending.binding, sending.parameters)
    },
    failure: error => error instanceof WhatsappSendError ? { detail: error.detail.slice(0, 1000), rejected: error.rejected, unreachable: error.unreachable }
      : { detail: String((error as Error)?.message ?? error).replace(/\s+/g, ' ').trim().slice(0, 1000), rejected: false, unreachable: false },
  }

  private pausedUntil(channel: OutboundChannelCode): number {
    return channel === 'EMAIL' ? this.mailPausedUntil : this.whatsappPausedUntil
  }

  private pause(channel: OutboundChannelCode) {
    if (channel === 'EMAIL') this.mailPausedUntil = Date.now() + NOTIFICATIONS_MAIL_PAUSE_MS; else this.whatsappPausedUntil = Date.now() + NOTIFICATIONS_MAIL_PAUSE_MS
  }

  /**
   * الفشل بيترمي عشان الطابور يعيد بمهلة بتزيد، وآخر محاولة بتسيب السجل «فشل» بسببه والمهمة «ميتة» — وإعادتها من شاشة الطابور بتبعت الرسالة
   * تاني. العنوان اللي خادم البريد رفضه «فشل» من أول مرة من غير إعادة. وقبل الإرسال كل حاجة بتتفحص بحالتها دلوقتي: البريد مفتوح،
   * والحساب شغال، والإشعار لسه صحيح، واختيار المستخدم، وساعات الهدوء.
   */
  async sendEmail(deliveryId: string, context: { attempt: number; maxAttempts: number }): Promise<void> {
    await this.sendOutbound(this.emailDriver, deliveryId, context)
  }

  /** B-ADD.5: رسالة الواتساب بنفس مسار البريد بالحرف (نفس الفحوص ونفس سياسة الفشل)، والفرق في OutboundDriver بس */
  async sendWhatsapp(deliveryId: string, context: { attempt: number; maxAttempts: number }): Promise<void> {
    await this.sendOutbound(this.whatsappDriver, deliveryId, context)
  }

  private async sendOutbound(driver: OutboundDriver, deliveryId: string, context: { attempt: number; maxAttempts: number }): Promise<void> {
    if (!/^\d+$/.test(deliveryId) || !(await this.ready())) return
    // مهمتين لنفس الرسالة (مهمة اتعادت بعد عطل، أو نسختين من الخادم) مايبعتوش مع بعض ولا ورا بعض والأولى لسه عند خادم البريد:
    // قفل التوصيل ممسوك طول المحاولة، والتانية بتلاقيه ممسوك فبتسيبها للأولى
    await this.holding(`hr:notification-delivery:${deliveryId}`, () => this.attemptOutbound(driver, deliveryId, context))
  }

  /**
   * قفل قاعدة باسم، ممسوك لحد ما الشغل يخلص (معاملة مفيهاش غير القفل؛ الشغل نفسه على اتصالات تانية). ممسوك من حد تاني = null من غير
   * انتظار. الخطأ جوه الشغل بيتساب القفل وبيترمي زي ما هو.
   */
  private async holding<T>(resource: string, work: () => Promise<T>): Promise<T | null> {
    return this.ds.transaction(async em => {
      if (em.connection.options.type === 'mssql') {
        const [row] = await em.query(`DECLARE @result int;
          EXEC @result = sys.sp_getapplock @Resource = @0, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 0;
          SELECT @result AS [lockResult];`, [resource])
        if (!row || Number(row.lockResult) < 0) return null
      }
      return work()
    })
  }

  private async attemptOutbound(driver: OutboundDriver, deliveryId: string, context: { attempt: number; maxAttempts: number }): Promise<void> {
    const deliveries = this.ds.getRepository(NotificationDelivery)
    const delivery = await deliveries.findOne({ where: { id: deliveryId } })
    // اتبعتت قبل كده (مهمة اتعادت) أو اتخطّت. «فشل» بييجي هنا لما المهمة الميتة تتعاد من شاشة الطابور
    if (!delivery || delivery.channel !== driver.channel || !['PENDING', 'FAILED'].includes(delivery.status)) return
    const skip = (detail: string) => deliveries.update({ id: delivery.id }, { status: 'SKIPPED', detail, subject: null, body: null })
    if (!(await driver.open())) { await skip(driver.closedDetail); return }
    const notification = await this.ds.getRepository(Notification).findOne({ where: { id: delivery.notificationId } })
    const user = notification ? await this.ds.getRepository(User).findOne({ where: { id: notification.recipientUserId } }) : null
    if (!notification || !user?.isActive) { await skip('حساب المستلم مش نشط'); return }
    const stale = await this.staleReason(notification, user)
    if (stale) { await skip(stale); return }
    // B-ADD.5: قاعدة الحدث دلوقتي — القناة ممكن تكون اتقفلت للحدث ده بعد ما الرسالة اتجهّزت، و«إلزامي» بيلغي اختيار المستخدم
    const setup = isNotificationEvent(notification.eventCode) ? await this.channels.ruleOf(notification.eventCode) : null
    if (setup && !(driver.channel === 'EMAIL' ? setup.rule.email : setup.rule.whatsapp)) { await skip('القناة اتقفلت للحدث ده من «قنوات الإشعارات» قبل الإرسال'); return }
    // اختيار المستخدم دلوقتي: ممكن يكون قفل بريد الفئة أو اختار الملخص بعد ما الرسالة اتجهّزت
    const mode = setup?.rule.mandatory ? 'ON' : (await this.modesOf([user.id], notification.category)).get(`${user.id}:${driver.channel}`) ?? 'ON'
    if (mode === 'OFF') { await skip(driver.offDetail); return }
    if (mode === 'DIGEST' && driver.digest) { await deliveries.update({ id: delivery.id }, { status: 'DIGEST', detail: null, subject: null, body: null }); return }
    const address = await driver.addressOf(user)
    if (!address) { await skip(driver.noAddressDetail); return }
    // ساعات الهدوء دلوقتي (محاولة اتأخرت ودخلت فيها، أو دفعة اتوزعت): مهمة جديدة لآخرها، والرسالة تفضل مستنية
    const quietEnd = quietHoursEnd(new Date(), parseQuietHours(await this.setting(NOTIFICATIONS_QUIET_HOURS_KEY, '')))
    if (quietEnd) {
      await this.ds.transaction(async em => {
        await em.getRepository(NotificationDelivery).update({ id: delivery.id }, { status: 'PENDING' })
        await enqueueQueueJob(em, { jobType: driver.job, payload: { deliveryId: delivery.id }, key: `${driver.job}:${delivery.id}:${Date.now()}`,
          maxAttempts: NOTIFICATIONS_EMAIL_MAX_ATTEMPTS, runAfter: new Date(quietEnd.getTime() + 1000) })
      })
      return
    }
    const attempts = delivery.attempts + 1
    // المحاولة فشلت: آخر محاولة (أو عنوان مرفوض) = «فشل». الخطأ اللي بيترمي للطابور بنص الإشعارات ومن غير عناوين كاملة
    const failed = async (detail: string, rejected: boolean) => {
      await deliveries.update({ id: delivery.id }, { attempts, detail, status: rejected || context.attempt >= context.maxAttempts ? 'FAILED' : 'PENDING' })
      if (!rejected) throw new Error(`${driver.failurePrefix}: ${detail}`)
    }
    if (Date.now() < this.pausedUntil(driver.channel)) { await failed(driver.pausedDetail, false); return }
    try {
      await driver.send(address, delivery)
    } catch (error) {
      const { detail, rejected, unreachable } = driver.failure(error)
      if (unreachable) this.pause(driver.channel)
      await failed(detail, rejected)
      return
    }
    await deliveries.update({ id: delivery.id }, { status: 'SENT', attempts, detail: null, address: driver.mask(address), sentAt: new Date(), subject: null, body: null })
  }

  // ===== الملخص اليومي =====
  /** المهمة المجدولة: بتفحص كل ساعة (ومعاها الرسايل اللي مهمتها وقفت)، والملخص بيتبعت في ساعته المضبوطة بس (بتوقيت النظام) */
  async digestHourlyWork(now: Date = new Date()): Promise<number> {
    if (!(await this.modules.jobEnabled('notifications.daily-digest'))) return 0
    if (!(await this.ready())) return 0
    await this.settleStuck(now)
    const configured = Number(await this.setting(NOTIFICATIONS_DIGEST_HOUR_KEY, String(NOTIFICATIONS_DIGEST_HOUR_DEFAULT)))
    const hour = Number.isInteger(configured) && configured >= 0 && configured <= 23 ? configured : NOTIFICATIONS_DIGEST_HOUR_DEFAULT
    return now.getHours() === hour ? this.digestOrDefer(now) : 0
  }

  /**
   * الملخص في ساعات الهدوء مابيطلعش: بيتأجل لآخرها بمهمة في الطابور (زي البريد الفوري)، فمضمون إنه يطلع بعدها. requeue: النداء من
   * المهمة نفسها ولسه ساعات الهدوء شغالة (الساعتين مش ماشيين مع بعض، أو النافذة اتمدّت) = مهمة جديدة لآخرها.
   */
  async digestOrDefer(now: Date = new Date(), requeue = false): Promise<number> {
    const quietEnd = quietHoursEnd(now, parseQuietHours(await this.setting(NOTIFICATIONS_QUIET_HOURS_KEY, '')))
    if (!quietEnd) return this.sendDigests()
    await enqueueQueueJob(this.ds.manager, { jobType: NOTIFICATIONS_DIGEST_SEND_JOB,
      key: `${NOTIFICATIONS_DIGEST_SEND_JOB}:${quietEnd.getTime()}${requeue ? `:${Date.now()}` : ''}`, runAfter: new Date(quietEnd.getTime() + 1000) })
    return 0
  }

  /**
   * رسالة «مستنية» ومفيش مهمة شغالة ليها (العامل وقع في آخر محاولة فالمهمة ماتت من غير ما السجل يتحدّث): «فشل» بسببه، وإعادة مهمتها
   * الميتة من شاشة الطابور بتبعتها.
   */
  async settleStuck(now: Date = new Date()): Promise<void> {
    for (const driver of [this.emailDriver, this.whatsappDriver]) {
      await this.ds.query(`UPDATE d SET d.[status] = N'FAILED', d.[detail] = COALESCE(d.[detail], N'المهمة وقفت قبل ما تسجّل النتيجة')
        FROM [notification_deliveries] d
        WHERE d.[channel] = @2 AND d.[status] = N'PENDING' AND d.[createdAt] < @0
          AND NOT EXISTS (SELECT 1 FROM [jobs_queue] j WHERE j.[jobType] = @1 AND j.[status] IN (N'PENDING', N'RUNNING')
            AND JSON_VALUE(j.[payload], '$.deliveryId') = CAST(d.[id] AS nvarchar(30)))`, [new Date(now.getTime() - STUCK_AFTER_MS), driver.job, driver.channel])
    }
  }

  /** رسالة واحدة لكل مستخدم باللي اتجمع له في الملخص. بيرجّع عدد الرسائل اللي اتبعتت. تشغيلين في نفس اللحظة (الموعد ومهمة التأجيل): واحد بس */
  async sendDigests(): Promise<number> {
    if (!(await this.ready())) return 0
    return (await this.holding('hr:notifications:digest', () => this.sendDigestsNow())) ?? 0
  }

  private async sendDigestsNow(): Promise<number> {
    const deliveries = this.ds.getRepository(NotificationDelivery)
    // البريد اتقفل: اللي متجمّع مايفضلش مستني لحد ما يتفتح تاني بعد أسابيع
    if (!(await this.emailRequested())) {
      await deliveries.update({ channel: 'EMAIL', status: 'DIGEST' }, { status: 'SKIPPED', detail: 'البريد اتقفل من الإعدادات قبل الإرسال' })
      return 0
    }
    if (!this.mail.isConfigured() || Date.now() < this.mailPausedUntil) return 0
    const rows: Array<{ id: string; userId: number; title: string; body: string; link: string; notificationId: string; eventCode: string; category: string;
      entityType: string | null; entityId: string | null; dedupeKey: string }> = await this.ds.query(
      `SELECT d.[id], n.[recipientUserId] AS [userId], n.[title], n.[body], n.[link], n.[id] AS [notificationId], n.[eventCode], n.[category], n.[entityType], n.[entityId],
         n.[dedupeKey]
       FROM [notification_deliveries] d INNER JOIN [notifications] n ON n.[id] = d.[notificationId]
       WHERE d.[channel] = N'EMAIL' AND d.[status] = N'DIGEST' ORDER BY n.[recipientUserId], d.[id]`)
    const byUser = new Map<number, typeof rows>()
    for (const row of rows) byUser.set(Number(row.userId), [...(byUser.get(Number(row.userId)) ?? []), row])
    const company = await this.setting('company.name', '')
    const base = this.frontendBase()
    const mandatory = new Set<string>(await this.channels.mandatoryEvents())
    // Codex P7A-B08: بريد الحدث نفسه لسه مفتوح في «قنوات الإشعارات» وقت الإرسال؟ (نفس فحص الرسالة الفورية في attemptOutbound) — حدث
    // اتجمّع في الملخص وبعدها الإدارة قفلت بريده مابيتبعتش
    const emailOn = new Map<string, boolean>()
    const eventEmailOn = async (code: string) => {
      if (!emailOn.has(code)) emailOn.set(code, !isNotificationEvent(code) || (await this.channels.ruleOf(code)).rule.email)
      return emailOn.get(code)!
    }
    let sent = 0
    for (const [userId, collected] of byUser) {
      const user = await this.ds.getRepository(User).findOne({ where: { id: userId } })
      const address = user?.isActive ? await this.addressOf(user) : null
      if (!user || !address) {
        await deliveries.update({ id: In(collected.map(item => String(item.id))) }, { status: 'SKIPPED', detail: user?.isActive ? 'مفيش بريد صالح على الحساب ولا في ملف الموظف' : 'حساب المستلم مش نشط' })
        continue
      }
      // اللي اتجمع من امبارح ومابقاش صحيح (طلب اتعتمد من حد تاني، مسير اتفتح)، أو صاحبه قفل بريد فئته بعدها، مابيدخلش الملخص
      const items: typeof collected = []
      const modes = new Map<string, NotificationMode>()
      for (const item of collected) {
        if (!modes.has(item.category)) modes.set(item.category, (await this.modesOf([userId], item.category)).get(`${userId}:EMAIL`) ?? 'ON')
        // B-ADD.5: حدث بقى «إلزامي» بعد ما اتجمع: قفل المستخدم مابيتطبقش عليه
        const reason = !(await eventEmailOn(item.eventCode)) ? 'القناة اتقفلت للحدث ده من «قنوات الإشعارات» قبل الإرسال'
          : modes.get(item.category) === 'OFF' && !mandatory.has(item.eventCode) ? 'المستخدم قافل بريد الفئة دي'
          : await this.staleReason({ id: item.notificationId, recipientUserId: userId, eventCode: item.eventCode, category: item.category, entityType: item.entityType,
            entityId: item.entityId, link: item.link, dedupeKey: item.dedupeKey }, user)
        if (reason) await deliveries.update({ id: String(item.id) }, { status: 'SKIPPED', detail: reason }); else items.push(item)
      }
      if (!items.length) continue
      const ids = JSON.stringify(items.map(item => String(item.id)))
      const lines = items.map(item => `• ${item.title}${item.body ? ` — ${item.body}` : ''}${base ? `\n  ${base}${item.link}` : ''}`)
      const text = `السلام عليكم ${user.displayName ?? ''}،\n\nملخص إشعاراتك:\n\n${lines.join('\n')}\n\n${company}`.trim()
      // فشل الإرسال لوحده هو اللي بيرجّع البنود للملخص الجاي؛ تسجيل النتيجة بعد إرسال ناجح مابيتحسبش فشل إرسال (الرسالة مابتتبعتش تاني)
      let failure: unknown = null
      try { await this.mail.send({ to: address, subject: `ملخص إشعاراتك (${items.length})`, text }) } catch (error) { failure = error }
      if (!failure) {
        await this.ds.query(`UPDATE [notification_deliveries] SET [status] = N'SENT', [detail] = N'ضمن الملخص اليومي', [address] = @1, [sentAt] = @2, [attempts] = [attempts] + 1
          WHERE [id] IN (SELECT CAST([value] AS bigint) FROM OPENJSON(@0))`, [ids, maskEmail(address), new Date()])
        sent++
        continue
      }
      const raw = mailFailureRaw(failure), detail = mailFailureText(failure), rejected = MAIL_REJECTED.test(raw)
      // بيتجرّب تاني في ملخص بكرة، وبعد الحد (أو لو الخادم رفض العنوان نفسه) «فشل» بسببه
      await this.ds.query(`UPDATE [notification_deliveries] SET [attempts] = [attempts] + 1, [detail] = @1,
          [status] = CASE WHEN @3 = 1 OR [attempts] + 1 >= @2 THEN N'FAILED' ELSE N'DIGEST' END
        WHERE [id] IN (SELECT CAST([value] AS bigint) FROM OPENJSON(@0))`, [ids, detail, DIGEST_MAX_ATTEMPTS, rejected ? 1 : 0])
      this.logger.warn(`تعذر إرسال الملخص اليومي للحساب #${userId}: ${detail}`)
      // خادم البريد نفسه مش بيرد: باقي الملخصات بتستنى الساعة الجاية من غير ما تتحسب عليها محاولة
      if (!rejected && MAIL_UNREACHABLE.test(raw)) { this.mailPausedUntil = Date.now() + NOTIFICATIONS_MAIL_PAUSE_MS; break }
    }
    return sent
  }

  // ===== تفضيلات المستخدم =====
  /**
   * فئات الإشعارات وقنواتها للمستخدم. قناة «داخل النظام» بتظهر للفئة اللي ليها إشعار مخزّن بس (الباقي عدّادات محسوبة دايمًا ظاهرة).
   * B-ADD.5 (برّه صفوف الفئات — شكل الصف القايم زي ما هو): اختيار الواتساب لكل فئة، والأحداث اللي الإدارة معلّماها «إلزامي» (اختيار المستخدم
   * مابيتطبقش عليها)، والفئات المقفولة (كل أحداثها إلزامية)، وبيانات الحساب اللي الرسايل بتتبعت عليها.
   */
  async preferences(user: JwtPayload) {
    const available = await this.ready()
    const rows = available ? await this.ds.getRepository(NotificationPreference).find({ where: { userId: user.sub } }) : []
    const modeOf = (category: string, channel: string) => (rows.find(row => row.category === category && row.channel === channel)?.mode ?? 'ON') as NotificationMode
    const categories = Object.keys(NOTIFICATION_CATEGORIES) as NotificationCategoryCode[]
    const mandatory = available ? await this.channels.mandatoryEvents() : []
    return {
      available,
      emailEnabled: available && await this.emailWorking(),
      categories: categories.map(category => ({
        key: category, label: NOTIFICATION_CATEGORIES[category],
        inApp: this.categoryStoresInApp(category) ? modeOf(category, 'IN_APP') : null,
        email: modeOf(category, 'EMAIL'),
      })),
      whatsappEnabled: available && await this.channels.whatsappOpen(),
      whatsapp: Object.fromEntries(categories.map(category => [category, modeOf(category, 'WHATSAPP') === 'OFF' ? 'OFF' : 'ON'])) as Record<NotificationCategoryCode, NotificationMode>,
      mandatory: Object.fromEntries(categories.map(category => [category, mandatory.filter(code => NOTIFICATION_EVENTS[code].category === category).map(code => NOTIFICATION_EVENTS[code].label)])
        .filter(([, labels]) => labels.length)) as Partial<Record<NotificationCategoryCode, string[]>>,
      locked: categories.filter(category => this.categoryLocked(category, mandatory)),
      contact: available ? await this.channels.myContact(user) : { email: null, whatsapp: null },
    }
  }

  /** كل أحداث الفئة إلزامية = الفئة مقفولة على المستخدم (مفيش حدث فيها اختياره بيتطبق عليه) */
  private categoryLocked(category: string, mandatory: readonly NotificationEventCode[]): boolean {
    const events = NOTIFICATION_EVENT_CODES.filter(code => NOTIFICATION_EVENTS[code].category === category)
    return events.length > 0 && events.every(code => mandatory.includes(code))
  }

  private categoryStoresInApp(category: string): boolean {
    return NOTIFICATION_EVENT_CODES.some(code => NOTIFICATION_EVENTS[code].category === category && NOTIFICATION_EVENTS[code].storedInApp)
  }

  async setPreference(user: JwtPayload, input: { category?: unknown; channel?: unknown; mode?: unknown }) {
    if (!(await this.ready())) throw new BadRequestException(NOTIFICATIONS_MIGRATION_MISSING)
    const { category, channel, mode } = input
    if (!isNotificationCategory(category)) throw new BadRequestException('فئة الإشعار غير معروفة')
    if (!(NOTIFICATION_DELIVERY_CHANNELS as readonly unknown[]).includes(channel)) throw new BadRequestException('قناة الإشعار غير معروفة')
    if (!(NOTIFICATION_MODES as readonly unknown[]).includes(mode)) throw new BadRequestException('اختيار غير صالح')
    if (mode === 'DIGEST' && channel !== 'EMAIL') throw new BadRequestException('الملخص اليومي للبريد بس')
    if (channel === 'IN_APP' && !this.categoryStoresInApp(category)) throw new BadRequestException('الفئة دي بتظهر داخل النظام دايمًا (عدّاد محسوب)')
    // B-ADD.5: فئة كل أحداثها «إلزامي» من الإدارة: القفل والملخص مابيتحفظوش (كانوا هيتحفظوا ومايتطبقوش)
    if (mode !== 'ON' && this.categoryLocked(category, await this.channels.mandatoryEvents())) throw new BadRequestException('إشعارات الفئة دي إلزامية من الإدارة ومابتتقفلش')
    const repo = this.ds.getRepository(NotificationPreference)
    const where = { userId: user.sub, category, channel: channel as string }
    for (let attempt = 0; ; attempt++) {
      const row = await repo.findOne({ where })
      try {
        await repo.save(Object.assign(row ?? repo.create(where), { mode: mode as string, updatedAt: new Date() }))
        break
      } catch (error) {
        // طلبين في نفس اللحظة لنفس الاختيار: التاني بيعيد القراءة ويحدّث
        if (attempt >= 1 || (sqlErrorNumber(error) !== 2601 && sqlErrorNumber(error) !== 2627)) throw error
      }
    }
    return this.preferences(user)
  }

  // ===== إدارة القوالب وسجل الإرسال (حساب الشركة) =====
  /**
   * B-ADD.5: language = 'en' بيعرض ويعدّل النص الإنجليزي (للي لغة حسابه إنجليزي). من غير نص إنجليزي محفوظ المعروض هو اللي هيوصله فعلًا:
   * النص العربي (المعدَّل أو الافتراضي).
   */
  private templateLanguage(language: unknown): NotificationTemplateLanguage {
    if (language === undefined || language === null || language === '') return LANGUAGE
    if (!isNotificationTemplateLanguage(language)) throw new BadRequestException('لغة القالب غير معروفة')
    return language
  }

  async templatesAdmin(language?: unknown) {
    const wanted = this.templateLanguage(language)
    const available = await this.ready()
    const rows = available ? await this.ds.getRepository(NotificationTemplate).find({ where: { language: In([...new Set([LANGUAGE, wanted])]) } }) : []
    return {
      available,
      language: wanted,
      channels: NOTIFICATION_CHANNEL_LABELS,
      events: NOTIFICATION_EVENT_CODES.map(code => {
        const def = notificationEventDef(code)
        return {
          code, label: def.label, category: NOTIFICATION_CATEGORIES[def.category], variables: def.variables,
          // false = الحدث مالوش عنصر في القايمة: نص «داخل النظام» بتاعه هو السطر المختصر في الملخص اليومي
          storedInApp: def.storedInApp,
          templates: Object.fromEntries(NOTIFICATION_CHANNELS.map(channel => {
            const row = rows.find(item => item.eventCode === code && item.channel === channel && item.language === wanted)
            const arabic = wanted === LANGUAGE ? undefined : rows.find(item => item.eventCode === code && item.channel === channel && item.language === LANGUAGE)
            const fallback = arabic ? { title: arabic.title, body: arabic.body } : def.templates[channel]
            return [channel, { title: row?.title ?? fallback.title, body: row?.body ?? fallback.body, customized: !!row, default: fallback }]
          })),
        }
      }),
    }
  }

  /** حفظ نص قالب (text) أو الرجوع للافتراضي (text = null) — التعديل وسطر تدقيقه في معاملة واحدة */
  async saveTemplate(user: JwtPayload, code: unknown, channel: unknown, text: unknown, language?: unknown) {
    const wanted = this.templateLanguage(language)
    if (!(await this.ready())) throw new BadRequestException(NOTIFICATIONS_MIGRATION_MISSING)
    if (!isNotificationEvent(code)) throw new BadRequestException('حدث الإشعار غير معروف')
    if (!(NOTIFICATION_CHANNELS as readonly unknown[]).includes(channel)) throw new BadRequestException('قناة الإشعار غير معروفة')
    const clean = text === null ? null : validateNotificationTemplate(code, text)
    await this.ds.transaction(async em => {
      const repo = em.getRepository(NotificationTemplate)
      const where = { eventCode: code, channel: channel as string, language: wanted }
      const row = await repo.findOne({ where })
      // undefined (مش null) لما مفيش قيمة: عمود «قبل» و«بعد» في سجل التدقيق JSON أو فاضي
      const before = row ? { title: row.title, body: row.body } : undefined
      if (clean) await repo.save(Object.assign(row ?? repo.create(where), { ...clean, updatedAt: new Date(), updatedByUserId: user.sub }))
      else if (row) await repo.delete({ id: row.id })
      else return
      await recordAudit(em, { category: 'SETTINGS', action: clean ? 'NOTIFICATION_TEMPLATE_CHANGED' : 'NOTIFICATION_TEMPLATE_RESET', entityType: 'notification_template',
        entityId: `${code}:${channel}${wanted === LANGUAGE ? '' : `:${wanted}`}`, actorUserId: user.sub,
        summary: `${clean ? 'تعديل' : 'رجوع للافتراضي في'} قالب إشعار «${notificationEventDef(code).label}» (${NOTIFICATION_CHANNEL_LABELS[channel as NotificationChannelCode]}${wanted === LANGUAGE ? '' : '، إنجليزي'})`,
        before, after: clean ?? undefined })
    })
    return this.templatesAdmin(wanted)
  }

  /**
   * آخر الرسائل بحالتها وسببها (من غير نص الرسالة ولا عنوانها). status اختياري. العدّ للبريد بس (آخر 30 يوم).
   * إشعار الطلب السري بيظهر بحالته وسببه من غير مستلمه: «فلان عنده طلب سري» معلومة عن الطلب نفسه، ومدير الإعدادات مش طرف فيه.
   * وسبب الفشل متخزن من غير عناوين كاملة (mailFailureText).
   * B-ADD.5: بحث في السجل — القناة، والحالة، والحدث، واسم المستلم، ومن تاريخ لتاريخ، وصفحات. البحث باسم المستلم مابيطابقش إشعار الطلب السري
   * (مستلمه مخفي: لو كان بيطابق كان الاسم يتعرف بالتجربة).
   */
  async deliveriesAdmin(filter?: string | DeliveriesFilter, limit = 100) {
    if (!(await this.ready())) return { available: false, emailEnabled: false, mailConfigured: this.mail.isConfigured(), linkConfigured: !!this.frontendBase(), counts: {}, rows: [] }
    const wanted = typeof filter === 'object' && filter ? filter : { status: filter }
    const status = ['PENDING', 'SENT', 'FAILED', 'SKIPPED', 'DIGEST'].includes(String(wanted.status)) ? String(wanted.status) : null
    const channel = (NOTIFICATION_DELIVERY_CHANNELS as readonly unknown[]).includes(wanted.channel) ? String(wanted.channel) : null
    const event = isNotificationEvent(wanted.event) ? wanted.event : null
    const name = typeof wanted.recipient === 'string' && wanted.recipient.trim() ? `%${wanted.recipient.trim().slice(0, 100).replace(/[\\%_[]/g, char => `\\${char}`)}%` : null
    const day = (value: unknown, addDays: number) => {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ''))
      const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + addDays) : null
      return date && !Number.isNaN(date.getTime()) ? date : null
    }
    // اليوم بتوقيت النظام: «من» من أول اليوم، و«إلى» لحد آخره
    const from = day(wanted.from, 0), to = day(wanted.to, 1)
    const take = Math.max(1, Math.min(300, Math.trunc(Number(wanted.pageSize ?? limit)) || 100))
    const page = Math.max(1, Math.min(100_000, Math.trunc(Number(wanted.page)) || 1))
    const rows: Array<Record<string, unknown>> = await this.ds.query(
      `SELECT d.[id], d.[channel], d.[status], d.[attempts], d.[address], d.[detail], d.[createdAt], d.[sentAt],
          n.[eventCode], n.[recipientUserId], u.[displayName] AS [recipientName], COUNT(*) OVER () AS [total]
       FROM [notification_deliveries] d INNER JOIN [notifications] n ON n.[id] = d.[notificationId] LEFT JOIN [users] u ON u.[id] = n.[recipientUserId]
       WHERE (@0 IS NULL OR d.[status] = @0) AND (@1 IS NULL OR d.[channel] = @1) AND (@2 IS NULL OR n.[eventCode] = @2)
         AND (@3 IS NULL OR (n.[eventCode] <> N'request.confidential' AND u.[displayName] LIKE @3 ESCAPE N'\\'))
         AND (@4 IS NULL OR d.[createdAt] >= @4) AND (@5 IS NULL OR d.[createdAt] < @5)
       ORDER BY d.[id] DESC OFFSET @6 ROWS FETCH NEXT @7 ROWS ONLY`, [status, channel, event, name, from, to, (page - 1) * take, take])
    const counts: Array<{ channel: string; status: string; n: number }> = await this.ds.query(
      `SELECT [channel], [status], COUNT(*) AS [n] FROM [notification_deliveries] WHERE [channel] IN (N'EMAIL', N'WHATSAPP') AND [createdAt] >= @0 GROUP BY [channel], [status]`,
      [new Date(Date.now() - 30 * 86_400_000)])
    const countsOf = (code: string) => Object.fromEntries(counts.filter(row => row.channel === code).map(row => [row.status, Number(row.n)]))
    return {
      available: true, emailEnabled: await this.emailRequested(), mailConfigured: this.mail.isConfigured(), linkConfigured: !!this.frontendBase(),
      counts: countsOf('EMAIL'),
      whatsappEnabled: await this.channels.whatsappOpen(), whatsappCounts: countsOf('WHATSAPP'),
      total: rows.length ? Number(rows[0].total) : 0, page, pageSize: take,
      rows: rows.map(row => {
        const hidden = row.eventCode === 'request.confidential'
        return { id: String(row.id), channel: row.channel, status: row.status, attempts: Number(row.attempts ?? 0), address: hidden ? null : row.address ?? null,
          detail: row.detail ?? null, createdAt: row.createdAt, sentAt: row.sentAt ?? null,
          event: isNotificationEvent(row.eventCode) ? notificationEventDef(row.eventCode).label : row.eventCode,
          recipientUserId: hidden ? null : Number(row.recipientUserId), recipientName: hidden ? null : row.recipientName ?? null }
      }),
    }
  }
}

/** B-ADD.5: فلاتر البحث في سجل الإرسال (كلها اختيارية؛ القيمة اللي مش معروفة بتتساب) */
export interface DeliveriesFilter { status?: unknown; channel?: unknown; event?: unknown; recipient?: unknown; from?: unknown; to?: unknown; page?: unknown; pageSize?: unknown }

/** رسالة الواتساب المجهّزة في صف التوصيل (اسم القالب وقيم متغيراته). null = مش موجودة أو مش مقروءة */
function preparedWhatsapp(body: string | null): { binding: WhatsappBinding; parameters: string[] } | null {
  try {
    const parsed = JSON.parse(body ?? 'null') as { binding?: WhatsappBinding; parameters?: unknown } | null
    return parsed?.binding ? { binding: parsed.binding, parameters: Array.isArray(parsed.parameters) ? parsed.parameters.map(String) : [] } : null
  } catch { return null }
}

// مفتاح الحدث في منع التكرار: رقم حدث الـoutbox (المهمة اللي اتعادت شايلة نفس الرقم)
function event_key(event: SourceEvent): string {
  return `outbox:${event.id}`
}

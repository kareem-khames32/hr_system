import { BadRequestException, Injectable, NotFoundException, type OnApplicationBootstrap } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, In, type EntityManager } from 'typeorm'
import { recordAudit } from '../../audit/audit'
import type { JwtPayload } from '../../auth/auth.service'
import { andBranchScopeSql, branchScopeOf, inBranchScope } from '../../auth/guards'
import { MailSendError, MailService, maskEmail, type MailConfig } from '../../auth/mail.service'
import { RequestsConfig } from '../../requests/entities/requests-config.entity'
import {
  deliverableEmail, isNotificationEvent, notificationEventDef, pickNotificationAddress, NOTIFICATION_CATEGORIES, NOTIFICATION_EVENT_CODES, type NotificationChannel,
  type NotificationEventCode,
} from '../notification-events'
import {
  cleanEventRule, cleanMailSettings, cleanWhatsappBinding, cleanWhatsappSettings, incomingSecret, mailConfigOf, maskPhone, normalizeWhatsappNumber, notificationChannelTablesReady,
  openChannelSecret, sealChannelSecret, storedMailSettings, storedWhatsappBindings, storedWhatsappSettings, whatsappParameters, DEFAULT_EVENT_RULE, MAIL_ENCRYPTIONS, MAIL_PRESETS,
  NOTIFICATION_CHANNELS_MIGRATION_MISSING, WHATSAPP_API_VERSION_DEFAULT, WHATSAPP_PROVIDERS, WHATSAPP_TEMPLATE_LANGUAGES, type EventChannelRule, type MailSettings, type WhatsappBinding,
  type WhatsappSettings, type WhatsappTemplateLanguage,
} from './channel-rules'
import { EmployeeWhatsappNumber, NotificationChannelSetting, NotificationEventRule } from './notification-channels.entities'
import { metaHttp, WhatsappSendError, WHATSAPP_PROVIDER_IMPLEMENTATIONS, type WhatsappHttp } from './whatsapp-meta'

// B-ADD.5: قنوات الإشعارات — إعداد خادم البريد والواتساب من الشاشة (الأسرار مختومة ومابترجعش)، وقاعدة «الحدث × القناة» وربط قالب Meta،
// ورقم واتساب الموظف، ومين ناقصه رقم أو بريد. المحرك (NotificationsService) بيسأل هنا قبل ما يكتب أو يبعت.
//  قبل ترحيل 187: مفيش إعداد محفوظ ولا قاعدة ولا واتساب — كل قراءة بترجّع الافتراضي، وكل كتابة بترفض برسالة الترحيل.

export const NOTIFICATIONS_EMAIL_SWITCH_KEY = 'notifications.email.enabled'
export const MISSING_CONTACTS_LIMIT = 500
const EMPLOYEE_NOT_FOUND = 'الموظف غير موجود'
const MAIL_ADDRESS = /[^\s<>"'(),;:[\]]+@[^\s<>"'(),;:[\]]+/g

export interface WhatsappSetup { enabled: boolean; settings: WhatsappSettings | null; token: string | null; open: boolean }
export interface EventChannelSetup { rule: EventChannelRule; bindings: Partial<Record<WhatsappTemplateLanguage, WhatsappBinding>>; customized: boolean }

const DEFAULT_MAIL_SETTINGS: MailSettings = { preset: 'SMTP', host: '', port: 587, encryption: 'STARTTLS', user: '', fromName: '', fromAddress: '' }
const DEFAULT_WHATSAPP_SETTINGS: WhatsappSettings = { provider: 'META_CLOUD', phoneNumber: '', phoneNumberId: '', businessAccountId: '', apiVersion: WHATSAPP_API_VERSION_DEFAULT,
  defaultCountryCode: '', fallbackToPhone: false }

@Injectable()
export class NotificationChannelsService implements OnApplicationBootstrap {
  /** نداء المزوّد على الشبكة. الاختبارات بتبدّله بدالة تجريبية: مفيش طلب حقيقي بيطلع منها */
  http: WhatsappHttp = metaHttp

  /** قناة الواتساب بواجهة القناة (NotificationChannel) — مزوّد تاني بيتسجّل في WHATSAPP_PROVIDER_IMPLEMENTATIONS ومايغيّرش حاجة هنا */
  readonly whatsapp: NotificationChannel = { code: 'WHATSAPP', enabled: () => this.whatsappOpen() }

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly config: ConfigService,
    private readonly mail: MailService
  ) {}

  /** إعداد البريد المحفوظ بياخد مكان إعداد api/.env من أول الإقلاع، وبيتقري تاني قبل الإرسال (نسخة تانية من الخادم بتشوف التغيير) */
  async onApplicationBootstrap() {
    this.mail.setStoredSource(() => this.storedMailConfig())
    await this.mail.refreshStoredConfig(true)
  }

  ready(em: EntityManager = this.ds.manager): Promise<boolean> {
    return notificationChannelTablesReady(em)
  }

  private serverSecret(): string {
    return this.config.getOrThrow<string>('JWT_SECRET')
  }

  private async row(channel: 'EMAIL' | 'WHATSAPP', em: EntityManager = this.ds.manager): Promise<NotificationChannelSetting | null> {
    if (!(await this.ready(em))) return null
    return em.getRepository(NotificationChannelSetting).findOne({ where: { channel } })
  }

  // ===== البريد =====
  /** إعداد خادم البريد المحفوظ لو مفعّل وشكله صالح؛ null = إعداد api/.env زي ما هو */
  async storedMailConfig(): Promise<MailConfig | null> {
    const row = await this.row('EMAIL')
    const settings = row?.enabled ? storedMailSettings(row.config) : null
    if (!row || !settings) return null
    return mailConfigOf(settings, row.secret ? openChannelSecret(row.secret, this.serverSecret()) : null)
  }

  // ===== الواتساب =====
  /** إعداد الواتساب دلوقتي. open = مفتوح ومعرّف الرقم والتوكن موجودين (والتوكن بيتفتح بسر الخادم الحالي) */
  async whatsappSetup(): Promise<WhatsappSetup> {
    const row = await this.row('WHATSAPP')
    const settings = row ? storedWhatsappSettings(row.config) : null
    const token = row?.secret ? openChannelSecret(row.secret, this.serverSecret()) : null
    return { enabled: row?.enabled === true, settings, token, open: row?.enabled === true && !!settings && !!token }
  }

  async whatsappOpen(): Promise<boolean> {
    return (await this.whatsappSetup()).open
  }

  /**
   * رسالة قالب للرقم ده بالمزوّد المضبوط. evenIfClosed: رسالة التجربة بتتبعت والقناة لسه مقفولة (بتتجرّب قبل ما تتفتح). الفشل WhatsappSendError
   * بتفصيله من غير التوكن.
   */
  async sendWhatsapp(to: string, binding: WhatsappBinding, parameters: string[], evenIfClosed = false): Promise<{ messageId: string | null }> {
    const setup = await this.whatsappSetup()
    if (!setup.settings || !setup.token || (!setup.enabled && !evenIfClosed)) throw new WhatsappSendError('قناة الواتساب مش مضبوطة أو مقفولة', false, true)
    return WHATSAPP_PROVIDER_IMPLEMENTATIONS[setup.settings.provider].send({ settings: setup.settings, token: setup.token, to, binding, parameters }, this.http)
  }

  /**
   * أرقام واتساب الموظفين (E.164 أرقام بس). اللي مالوش رقم واتساب في ملفه بياخد موبايل الملف لو الإدارة فاتحة الاختيار ده بس، ولو الموبايل
   * بيتحوّل لرقم دولي صالح (بكود الدولة الافتراضي).
   */
  async whatsappNumbers(employeeIds: readonly number[], settings: WhatsappSettings | null): Promise<Map<number, string>> {
    const out = new Map<number, string>()
    const ids = [...new Set(employeeIds.filter(id => Number.isSafeInteger(id) && id > 0))]
    if (!ids.length || !(await this.ready())) return out
    for (let offset = 0; offset < ids.length; offset += 1000) {
      const list = JSON.stringify(ids.slice(offset, offset + 1000))
      const rows: Array<{ employeeId: number; number: string }> = await this.ds.query(
        `SELECT [employeeId], [number] FROM [employee_whatsapp_numbers] WHERE [employeeId] IN (SELECT CAST([value] AS int) FROM OPENJSON(@0))`, [list])
      for (const row of rows) out.set(Number(row.employeeId), String(row.number))
      if (!settings?.fallbackToPhone) continue
      const phones: Array<{ id: number; phone: string | null }> = await this.ds.query(
        `SELECT [id], [phone] FROM [employees] WHERE [id] IN (SELECT CAST([value] AS int) FROM OPENJSON(@0))`, [list])
      for (const row of phones) {
        const number = out.has(Number(row.id)) ? null : normalizeWhatsappNumber(row.phone, settings.defaultCountryCode)
        if (number) out.set(Number(row.id), number)
      }
    }
    return out
  }

  // ===== الحدث × القناة =====
  /** قاعدة الحدث وربط قالب الواتساب بتاعه. من غير صف (أو قبل الترحيل) = الافتراضي: السلوك الحالي والواتساب مقفول */
  async ruleOf(code: NotificationEventCode): Promise<EventChannelSetup> {
    const row = (await this.ready()) ? await this.ds.getRepository(NotificationEventRule).findOne({ where: { eventCode: code } }) : null
    return this.setupOf(code, row)
  }

  private setupOf(code: NotificationEventCode, row: NotificationEventRule | null | undefined): EventChannelSetup {
    if (!row) return { rule: { ...DEFAULT_EVENT_RULE }, bindings: {}, customized: false }
    // الحدث اللي جوه النظام عدّاد محسوب: «داخل النظام» مش اختيار (دايمًا ظاهر)
    return { rule: { inApp: row.inApp || !notificationEventDef(code).storedInApp, email: row.email, whatsapp: row.whatsapp, mandatory: row.mandatory },
      bindings: storedWhatsappBindings(code, row.whatsappTemplates), customized: true }
  }

  /**
   * الأحداث اللي بريدها مقفول دلوقتي من القايمة دي — **قراءة واحدة** لكل الأحداث مع بعض (Codex P7A-B08، P7C): الملخص بينادي دي آخر حاجة
   * قبل ما يسلّم الرسالة لخدمة البريد، فمفيش حكم حدث بيتقادم وهو مستني قراءة حدث تاني. حدث من غير صف = الافتراضي (البريد مفتوح).
   */
  async emailClosedAmong(codes: readonly string[]): Promise<Set<string>> {
    const known = [...new Set(codes)].filter(isNotificationEvent)
    if (!known.length || !DEFAULT_EVENT_RULE.email || !(await this.ready())) return new Set()
    const rows = await this.ds.getRepository(NotificationEventRule).find({ where: { eventCode: In(known), email: false }, select: { id: true, eventCode: true } })
    return new Set(rows.map(row => row.eventCode))
  }

  /** الأحداث اللي الإدارة معلّماها «إلزامي» (لصفحة اختيارات المستخدم) */
  async mandatoryEvents(): Promise<NotificationEventCode[]> {
    if (!(await this.ready())) return []
    const rows = await this.ds.getRepository(NotificationEventRule).find({ where: { mandatory: true }, select: { id: true, eventCode: true } })
    return rows.map(row => row.eventCode).filter(isNotificationEvent)
  }

  // ===== شاشة «قنوات الإشعارات» (مدير النظام) =====
  private async assertReady() {
    if (!(await this.ready())) throw new BadRequestException(NOTIFICATION_CHANNELS_MIGRATION_MISSING)
  }

  private async switchOn(key: string): Promise<boolean> {
    return (await this.ds.getRepository(RequestsConfig).findOne({ where: { key } }))?.value === 'true'
  }

  /** كل اللي الشاشة محتاجاه — من غير أي سر: كلمة السر والتوكن «متسجّل / مش متسجّل» بس */
  async state() {
    const available = await this.ready()
    const repo = this.ds.getRepository(NotificationChannelSetting)
    const [emailRow, whatsappRow] = available ? await Promise.all([repo.findOne({ where: { channel: 'EMAIL' } }), repo.findOne({ where: { channel: 'WHATSAPP' } })]) : [null, null]
    const rules = available ? await this.ds.getRepository(NotificationEventRule).find() : []
    const secret = this.serverSecret()
    await this.mail.refreshStoredConfig(true)
    const active = this.mail.status()
    return {
      available,
      email: {
        // الإعداد المحفوظ هو اللي شغال (بدل إعداد الخادم)؟
        enabled: emailRow?.enabled === true,
        settings: (emailRow ? storedMailSettings(emailRow.config) : null) ?? DEFAULT_MAIL_SETTINGS,
        passwordSet: !!emailRow?.secret,
        // false = السر متخزن بس مابيتفتحش بسر الخادم الحالي (JWT_SECRET اتغيّر): لازم يتكتب تاني
        passwordReadable: !emailRow?.secret || openChannelSecret(emailRow.secret, secret) !== null,
        presets: MAIL_PRESETS, encryptions: MAIL_ENCRYPTIONS,
        // الإعداد الشغال فعلًا دلوقتي ومصدره (الشاشة ولا api/.env)
        active: { configured: active.configured, server: active.server, from: active.from, source: active.source },
        // مفتاح الشركة القايم («سياسات النظام»): رسايل الإشعارات بالبريد مفتوحة؟
        notificationsEnabled: await this.switchOn(NOTIFICATIONS_EMAIL_SWITCH_KEY),
        linkConfigured: !!String(this.config.get<string>('FRONTEND_URL') ?? '').trim(),
      },
      whatsapp: {
        enabled: whatsappRow?.enabled === true,
        settings: (whatsappRow ? storedWhatsappSettings(whatsappRow.config) : null) ?? DEFAULT_WHATSAPP_SETTINGS,
        tokenSet: !!whatsappRow?.secret,
        tokenReadable: !whatsappRow?.secret || openChannelSecret(whatsappRow.secret, secret) !== null,
        providers: WHATSAPP_PROVIDERS, languages: [...WHATSAPP_TEMPLATE_LANGUAGES],
      },
      events: NOTIFICATION_EVENT_CODES.map(code => {
        const def = notificationEventDef(code)
        const setup = this.setupOf(code, rules.find(row => row.eventCode === code))
        return { code, label: def.label, category: NOTIFICATION_CATEGORIES[def.category], storedInApp: def.storedInApp, variables: def.variables,
          ...setup.rule, customized: setup.customized, whatsappTemplates: { ar: setup.bindings.ar ?? null, en: setup.bindings.en ?? null } }
      }),
    }
  }

  /** حفظ إعداد قناة (config من غير أسرار) وسره المختوم، وسطر تدقيقه من غير أي سر، في معاملة واحدة */
  private async saveChannel(user: JwtPayload, channel: 'EMAIL' | 'WHATSAPP', enabled: boolean, config: object, secret: string | null | undefined, summary: string,
    check: (sealed: string | null) => void) {
    await this.assertReady()
    const serverSecret = this.serverSecret()
    await this.ds.transaction(async em => {
      const repo = em.getRepository(NotificationChannelSetting)
      const row = await repo.findOne({ where: { channel } })
      const sealed = secret === undefined ? row?.secret ?? null : secret === null ? null : sealChannelSecret(secret, serverSecret)
      check(sealed)
      // التدقيق من غير السر: «متسجّل» و«اتغيّر» بس
      const snapshot = (item: Pick<NotificationChannelSetting, 'enabled' | 'config' | 'secret'>) => ({ enabled: item.enabled, ...JSON.parse(item.config) as object, sealedValueSet: !!item.secret })
      const before = row ? snapshot(row) : undefined
      const saved = await repo.save(Object.assign(row ?? repo.create({ channel }), { enabled, config: JSON.stringify(config), secret: sealed, updatedAt: new Date(), updatedByUserId: user.sub }))
      await recordAudit(em, { category: 'SETTINGS', action: 'NOTIFICATION_CHANNEL_CHANGED', entityType: 'notification_channel', entityId: channel, actorUserId: user.sub,
        summary, before, after: { ...snapshot(saved), sealedValueChanged: secret !== undefined } })
    })
  }

  async saveEmail(user: JwtPayload, body: Record<string, unknown> | null | undefined) {
    const settings = cleanMailSettings(body)
    const enabled = body?.enabled === true
    const password = incomingSecret(body?.password, 'كلمة سر البريد')
    await this.saveChannel(user, 'EMAIL', enabled, settings, password, `${enabled ? 'تفعيل' : 'حفظ'} إعداد خادم البريد من الشاشة (${settings.host}:${settings.port})`, sealed => {
      if (enabled && settings.user && !sealed) throw new BadRequestException('اكتب كلمة سر البريد قبل ما تفعّل الإعداد (كلمة سر التطبيق — App Password)')
    })
    await this.mail.refreshStoredConfig(true)
    return this.state()
  }

  /** رسالة تجربة بالإعداد الشغال دلوقتي (المحفوظ لو مفعّل، وإلا إعداد الخادم). النتيجة بسببها من غير عناوين كاملة */
  async testEmail(user: JwtPayload, body: Record<string, unknown> | null | undefined) {
    const to = deliverableEmail(body?.to)
    if (!to) throw new BadRequestException('اكتب عنوان بريد صالح تتبعت عليه رسالة التجربة')
    await this.mail.refreshStoredConfig(true)
    let ok = true, detail = ''
    try {
      const result = await this.mail.send({ to, subject: 'رسالة تجربة من نظام الموارد البشرية',
        text: 'دي رسالة تجربة من شاشة «قنوات الإشعارات».\n\nوصولها معناه إن إعداد خادم البريد شغال.' })
      detail = String(result.response ?? '').slice(0, 300)
    } catch (error) {
      ok = false
      detail = (error instanceof MailSendError ? error.detail : String((error as Error)?.message ?? error)).replace(/\s+/g, ' ').trim()
    }
    detail = detail.replace(MAIL_ADDRESS, address => maskEmail(address)).slice(0, 500)
    await recordAudit(this.ds.manager, { category: 'SETTINGS', action: 'NOTIFICATION_CHANNEL_TESTED', entityType: 'notification_channel', entityId: 'EMAIL', actorUserId: user.sub,
      summary: `رسالة تجربة بالبريد إلى ${maskEmail(to)}: ${ok ? 'اتبعتت' : 'فشلت'}` })
    return { ok, detail, to: maskEmail(to), source: this.mail.status().source }
  }

  async saveWhatsapp(user: JwtPayload, body: Record<string, unknown> | null | undefined) {
    const settings = cleanWhatsappSettings(body)
    const enabled = body?.enabled === true
    const token = incomingSecret(body?.token, 'توكن الواتساب')
    await this.saveChannel(user, 'WHATSAPP', enabled, settings, token, `${enabled ? 'فتح' : 'حفظ إعداد'} قناة الواتساب (${WHATSAPP_PROVIDERS[settings.provider]})`, sealed => {
      if (enabled && !sealed) throw new BadRequestException('اكتب توكن الواتساب قبل ما تفتح القناة')
    })
    return this.state()
  }

  /** رسالة تجربة بقالب الحدث المربوط وقيم توضيحية (مش بيانات حقيقية) — والقناة ممكن تكون لسه مقفولة */
  async testWhatsapp(user: JwtPayload, body: Record<string, unknown> | null | undefined) {
    await this.assertReady()
    const setup = await this.whatsappSetup()
    if (!setup.settings || !setup.token) throw new BadRequestException('احفظ إعداد الواتساب والتوكن الأول')
    const to = normalizeWhatsappNumber(body?.to, setup.settings.defaultCountryCode)
    if (!to) throw new BadRequestException('اكتب رقم واتساب دولي صالح (مثال: +966500000000)')
    const code = body?.eventCode
    if (!isNotificationEvent(code)) throw new BadRequestException('حدث الإشعار غير معروف')
    const language = body?.language === 'en' ? 'en' : 'ar'
    const { bindings } = await this.ruleOf(code)
    const binding = bindings[language] ?? bindings.ar
    if (!binding) throw new BadRequestException('اربط قالب واتساب بالحدث ده الأول، وبعدين ابعت التجربة')
    const samples = Object.fromEntries(notificationEventDef(code).variables.map(variable => [variable.key, variable.sample]))
    let ok = true, detail = ''
    try {
      detail = (await this.sendWhatsapp(to, binding, whatsappParameters(binding, samples), true)).messageId ? 'Meta قبلت الرسالة' : 'Meta ردّت من غير رقم رسالة'
    } catch (error) {
      ok = false
      detail = error instanceof WhatsappSendError ? error.detail : String((error as Error)?.message ?? error).slice(0, 300)
    }
    await recordAudit(this.ds.manager, { category: 'SETTINGS', action: 'NOTIFICATION_CHANNEL_TESTED', entityType: 'notification_channel', entityId: 'WHATSAPP', actorUserId: user.sub,
      summary: `رسالة تجربة بالواتساب إلى ${maskPhone(to)} بقالب «${binding.templateName}»: ${ok ? 'اتقبلت' : 'فشلت'}` })
    return { ok, detail, to: maskPhone(to) }
  }

  /**
   * قاعدة حدث: القنوات المفتوحة له، و«إلزامي»، وربط قالب الواتساب لكل لغة (null = من غير ربط). الرجوع للافتراضي من غير ربط = الصف بيتمسح.
   */
  async saveEventRule(user: JwtPayload, code: unknown, body: Record<string, unknown> | null | undefined) {
    await this.assertReady()
    if (!isNotificationEvent(code)) throw new BadRequestException('حدث الإشعار غير معروف')
    const def = notificationEventDef(code)
    const rule = cleanEventRule(body)
    if (!def.storedInApp) rule.inApp = true
    const incoming = body?.whatsappTemplates
    if (incoming !== undefined && (incoming === null || typeof incoming !== 'object' || Array.isArray(incoming))) throw new BadRequestException('ربط قوالب الواتساب غير صالح')
    await this.ds.transaction(async em => {
      const repo = em.getRepository(NotificationEventRule)
      const row = await repo.findOne({ where: { eventCode: code } })
      const bindings = storedWhatsappBindings(code, row?.whatsappTemplates)
      for (const language of WHATSAPP_TEMPLATE_LANGUAGES) {
        const value = (incoming as Record<string, unknown> | undefined)?.[language]
        if (value === undefined) continue
        if (value === null) delete bindings[language]; else bindings[language] = cleanWhatsappBinding(code, value)
      }
      const hasBindings = Object.keys(bindings).length > 0
      const isDefault = !hasBindings && (Object.keys(DEFAULT_EVENT_RULE) as Array<keyof EventChannelRule>).every(key => rule[key] === DEFAULT_EVENT_RULE[key])
      const view = (item: NotificationEventRule | null) => item ? { inApp: item.inApp, email: item.email, whatsapp: item.whatsapp, mandatory: item.mandatory,
        whatsappTemplates: storedWhatsappBindings(code, item.whatsappTemplates) } : undefined
      const before = view(row)
      let saved: NotificationEventRule | null = null
      if (isDefault) { if (!row) return; await repo.delete({ id: row.id }) } else {
        saved = await repo.save(Object.assign(row ?? repo.create({ eventCode: code }), { ...rule, whatsappTemplates: hasBindings ? JSON.stringify(bindings) : null,
          updatedAt: new Date(), updatedByUserId: user.sub }))
      }
      await recordAudit(em, { category: 'SETTINGS', action: 'NOTIFICATION_EVENT_RULE_CHANGED', entityType: 'notification_event_rule', entityId: code, actorUserId: user.sub,
        summary: `تعديل قنوات إشعار «${def.label}»${rule.mandatory ? ' (إلزامي)' : ''}`, before, after: view(saved) })
    })
    return this.state()
  }

  // ===== رقم واتساب الموظف وبريده =====
  // lock (Codex P7A-B09): صف الموظف بيتقفل لآخر معاملة الحفظ، فنطاق الكاتب بيتحكم على فرع الموظف **وقت الكتابة** — نقله لفرع تاني
  // يا إما خلص قبل القفل (404 ومفيش كتابة) يا إما بيستنى لحد ما الحفظ يخلص
  private async scopedEmployee(user: JwtPayload, employeeId: number, em: EntityManager = this.ds.manager, lock = false) {
    const [employee]: Array<{ id: number; branchId: number | null; fullName: string; email: string | null; phone: string | null }> = Number.isSafeInteger(employeeId) && employeeId > 0
      ? await em.query(`SELECT [id], [branchId], [fullName], [email], [phone] FROM [employees]${lock ? ' WITH (UPDLOCK, ROWLOCK)' : ''} WHERE [id] = @0`, [employeeId]) : []
    if (!employee || !inBranchScope(branchScopeOf(user), employee.branchId)) throw new NotFoundException(EMPLOYEE_NOT_FOUND)
    return employee
  }

  /** رقم واتساب الموظف وبريده زي ما النظام هيستعملهم (لملف الموظف) — بنطاق فروع القارئ */
  async contact(user: JwtPayload, employeeId: number) {
    const employee = await this.scopedEmployee(user, employeeId)
    const available = await this.ready()
    const row = available ? await this.ds.getRepository(EmployeeWhatsappNumber).findOne({ where: { employeeId: employee.id } }) : null
    return { available, whatsappNumber: row ? `+${row.number}` : null, email: employee.email ?? null, phone: employee.phone ?? null }
  }

  /** حفظ رقم واتساب الموظف (فاضي = مسح). الرقم المحلي بيتحوّل بكود الدولة الافتراضي لو مضبوط، وإلا لازم يتكتب دولي */
  async saveContact(user: JwtPayload, employeeId: number, raw: unknown) {
    await this.assertReady()
    const { settings } = await this.whatsappSetup()
    const wanted = raw === null || raw === undefined || (typeof raw === 'string' && !raw.trim()) ? null : normalizeWhatsappNumber(raw, settings?.defaultCountryCode ?? '')
    if (wanted === null && !(raw === null || raw === undefined || (typeof raw === 'string' && !raw.trim()))) {
      throw new BadRequestException('رقم الواتساب لازم يتكتب دولي بكود الدولة (مثال: +966500000000)')
    }
    await this.ds.transaction(async em => {
      const employee = await this.scopedEmployee(user, employeeId, em, true)
      const repo = em.getRepository(EmployeeWhatsappNumber)
      const row = await repo.findOne({ where: { employeeId: employee.id } })
      if ((row?.number ?? null) === wanted) return
      if (wanted) await repo.save(Object.assign(row ?? repo.create({ employeeId: employee.id }), { number: wanted, updatedAt: new Date(), updatedByUserId: user.sub }))
      else if (row) await repo.delete({ id: row.id })
      // الرقم بيانات شخصية: السجل بيقول اتغيّر، والرقم متخفي، والملخص من غير اسم (سجل التدقيق بيتقري بنطاق الفرع المتسجّل على الحدث)
      await recordAudit(em, { category: 'SETTINGS', action: 'EMPLOYEE_WHATSAPP_CHANGED', entityType: 'employee', entityId: employee.id, actorUserId: user.sub, branchId: employee.branchId,
        summary: `${wanted ? 'تعديل' : 'مسح'} رقم واتساب موظف`, before: row ? { whatsapp: maskPhone(row.number) } : undefined,
        after: wanted ? { whatsapp: maskPhone(wanted) } : undefined })
    })
    return this.contact(user, employeeId)
  }

  /** بيانات الحساب نفسه زي ما النظام هيبعت عليها (لصفحة اختيارات المستخدم — قراءة بس) */
  async myContact(user: JwtPayload) {
    const [employee]: Array<{ email: string | null; phone: string | null }> = user.employeeId
      ? await this.ds.query('SELECT [email], [phone] FROM [employees] WHERE [id] = @0', [user.employeeId]) : []
    const setup = await this.whatsappSetup()
    const number = user.employeeId ? (await this.whatsappNumbers([user.employeeId], setup.settings)).get(user.employeeId) ?? null : null
    return { email: pickNotificationAddress(user.email, employee?.email), whatsapp: number ? `+${number}` : null }
  }

  /**
   * الموظفين الحاليين اللي ناقصهم بيانات توصيل (في نطاق فروع القارئ): من غير حساب دخول شغال (مايوصلهمش أي إشعار)، أو من غير بريد يتبعت عليه،
   * أو من غير رقم واتساب. العدّ لكل النطاق، والأسماء لحد MISSING_CONTACTS_LIMIT.
   */
  async missingContacts(user: JwtPayload) {
    const available = await this.ready()
    const setup = await this.whatsappSetup()
    const params: unknown[] = []
    const scope = andBranchScopeSql('e.[branchId]', branchScopeOf(user), params)
    const employees: Array<{ id: number; employeeCode: string; fullName: string; branchName: string | null; email: string | null; phone: string | null; whatsapp: string | null }> =
      await this.ds.query(`SELECT e.[id], e.[employeeCode], e.[fullName], b.[name] AS [branchName], e.[email], e.[phone], ${available ? 'w.[number]' : 'NULL'} AS [whatsapp]
        FROM [employees] e LEFT JOIN [branches] b ON b.[id] = e.[branchId]
        ${available ? 'LEFT JOIN [employee_whatsapp_numbers] w ON w.[employeeId] = e.[id]' : ''}
        WHERE e.[isActive] = 1 ${scope} ORDER BY e.[fullName], e.[id]`, params)
    const accounts: Array<{ employeeId: number; email: string | null }> = await this.ds.query(
      'SELECT [employeeId], [email] FROM [users] WHERE [isActive] = 1 AND [employeeId] IS NOT NULL')
    const accountEmails = new Map<number, Array<string | null>>()
    for (const account of accounts) accountEmails.set(Number(account.employeeId), [...(accountEmails.get(Number(account.employeeId)) ?? []), account.email])
    const counts = { employees: employees.length, noAccount: 0, noEmail: 0, noWhatsapp: 0 }
    const rows: Array<{ id: number; employeeCode: string; fullName: string; branchName: string | null; noAccount: boolean; noEmail: boolean; noWhatsapp: boolean }> = []
    for (const employee of employees) {
      const logins = accountEmails.get(Number(employee.id))
      const noAccount = !logins
      // نفس اختيار المحرك للعنوان: بريد الحساب، وإلا بريد الملف
      const noEmail = !(logins ?? [null]).some(email => pickNotificationAddress(email, employee.email))
      const noWhatsapp = !(employee.whatsapp || (setup.settings?.fallbackToPhone && normalizeWhatsappNumber(employee.phone, setup.settings.defaultCountryCode)))
      if (noAccount) counts.noAccount++
      if (noEmail) counts.noEmail++
      if (noWhatsapp) counts.noWhatsapp++
      if ((noAccount || noEmail || noWhatsapp) && rows.length < MISSING_CONTACTS_LIMIT) {
        rows.push({ id: Number(employee.id), employeeCode: employee.employeeCode, fullName: employee.fullName, branchName: employee.branchName ?? null, noAccount, noEmail, noWhatsapp })
      }
    }
    return { available, whatsappOpen: setup.open, fallbackToPhone: setup.settings?.fallbackToPhone === true, counts, limit: MISSING_CONTACTS_LIMIT, rows }
  }
}

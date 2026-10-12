import { ForbiddenException, HttpException, Injectable, Logger, NotFoundException, OnApplicationBootstrap, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type * as Ews from 'ews-javascript-api'
import type { XhrApi } from '@ewsjs/xhr'
import { scrubSecrets } from '../auth/directory.types'
import {
  MAIL_BUSY, MAIL_ITEM_NOT_FOUND, MAIL_NO_ACCESS, MAIL_NO_MAILBOX, MAIL_NOT_CONFIGURED, MAIL_SEARCH_EMPTY, MAIL_UNAVAILABLE, cleanEwsId, ewsCredentialName, mailboxConfigFrom,
  mailboxInsecureWarning, testNetworkAllowed, type ComposeInput, type MailboxConfig,
} from './mailbox-rules'
import { buildFilter, type MailQuery } from './search'

// B-ADD.16: الاتصال بـExchange (EWS). كل نداء بيفتح صندوق الموظف الداخل نفسه بدخوله هو في المجال (NTLM) — مفيش حساب خدمة بيقرا بريد حد،
// ومفيش انتحال. ولا حاجة بتتنسخ على الخادم ده: القوايم صفحة صفحة، والرسالة لما تتفتح، والمرفق بيعدّي وقت التنزيل.
// المكتبة بتتحمّل عند أول استخدام للبريد بس (require متأخر): إقلاع الخادم والاختبارات اللي مابتلمسش البريد مابيحمّلوهاش.

let library: typeof Ews | null = null
const ews = (): typeof Ews => (library ??= require('ews-javascript-api') as typeof Ews)

export const WELL_KNOWN_KEYS = ['inbox', 'drafts', 'sent', 'deleted', 'junk'] as const
export type WellKnownKey = (typeof WELL_KNOWN_KEYS)[number]
const wellKnownOf = (E: typeof Ews): Record<WellKnownKey, Ews.WellKnownFolderName> => ({
  inbox: E.WellKnownFolderName.Inbox, drafts: E.WellKnownFolderName.Drafts, sent: E.WellKnownFolderName.SentItems,
  deleted: E.WellKnownFolderName.DeletedItems, junk: E.WellKnownFolderName.JunkEmail,
})
const isWellKnown = (key: string): key is WellKnownKey => (WELL_KNOWN_KEYS as readonly string[]).includes(key)

const MAX_INLINE_IMAGE = 3 * 1024 * 1024
/** طلبات EWS اللي تجري مع بعض للموظف الواحد (Exchange بيحدّ جلسات المخزن لكل مستخدم) */
// أول تجربة على Exchange الشركة (12 أكتوبر 2026): فتح البريد (طلب واحد) نجح، وتحميل المجلدات (ست طلبات مع بعض بدخول NTLM) الخادم قطع
// اتصالاتها (ECONNRESET). طلبات الموظف الواحد بقت واحد ورا التاني، وكل طلب بناقل جديد (مصافحة NTLM مابتتشاركش بين طلبين).
const MAX_PARALLEL = 1

/** مين بينادي EWS: دخول الموظف نفسه في المجال. كلها من الجلسة والمخزن — ولا خانة من طلب */
export interface MailIdentity {
  userId: number
  /** اسم الدخول في المجال (UPN) */
  login: string
  password: string
  /** صندوق مشترك مسموح للموظف (وExchange بيتحقق منه برضه)؛ فاضي = صندوقه */
  target?: string
}

/** Exchange رفض دخول الموظف (401): كلمة السر غلط أو اتغيّرت في المجال */
export class MailAuthRejected extends Error {
  constructor() { super('mail auth rejected') }
}

export interface MailRow {
  id: string; subject: string; from: { name: string; address: string } | null; to: string; date: string | null; isRead: boolean; hasAttachments: boolean
  important: boolean; flagged: boolean; preview: string; folder?: { key: string; name: string }
}
export interface MailThreadRow {
  id: string; subject: string; senders: string[]; recipients: string[]; date: string | null; count: number; unread: number; hasAttachments: boolean
  important: boolean; flagged: boolean; preview: string
}
export interface MailAction { isRead?: boolean; flagged?: boolean; moveTo?: string; remove?: boolean }

function addr(a: Ews.EmailAddress | null | undefined) {
  return a ? { name: a.Name ?? '', address: a.Address ?? '' } : null
}

/** خاصية ممكن ماتكونش متحمّلة (عنصر مش رسالة في مجلد بريد) — من غير رمي */
function safe<T>(f: () => T, fallback: T): T {
  try {
    return f() ?? fallback
  } catch {
    return fallback
  }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

@Injectable()
export class EwsService implements OnApplicationBootstrap {
  private readonly log = new Logger(EwsService.name)
  readonly config: MailboxConfig
  /** طلبات كل موظف الجارية والمنتظرة (عدّاد بس — من غير أي سر) */
  private readonly slots = new Map<number, { active: number; queue: (() => void)[] }>()
  /** صناديق مشتركة Exchange رفض فيها FindConversation (البديل بيتستخدم على طول) */
  private readonly noConversations = new Set<string>()

  constructor(config: ConfigService) {
    this.config = mailboxConfigFrom((key) => config.get(key))
  }

  onApplicationBootstrap() {
    const warning = mailboxInsecureWarning(this.config)
    if (warning) this.log.warn(`⚠️  ${warning}`)
  }

  isConfigured(): boolean {
    return this.config.enabled
  }

  /**
   * ناقل طلب واحد بدخول الموظف (NTLM). بيتعمل لكل نداء وبيترمي بعده: كلمة السر مابتفضلش ماسكها حاجة في ذاكرة الخادم بين الطلبات
   * (في المصدر العميل كان بيتحفظ ربع ساعة بكلمة السر جواه). أقصى MAX_PARALLEL طلب للموظف مع بعض والباقي بيستنى.
   */
  protected transport(who: MailIdentity): XhrApi {
    // ===== ولا اتصال Exchange حقيقي من أي اختبار — نفس حارس DirectoryService.client() =====
    if (process.env.NODE_ENV === 'test' && !testNetworkAllowed(this.config.url)) {
      throw new Error('الاختبار حاول يفتح اتصال Exchange حقيقي — زيّف خدمة EWS بدل الخروج للشبكة')
    }
    const { XhrApi: Transport } = require('@ewsjs/xhr') as typeof import('@ewsjs/xhr')
    const make = () => new Transport({ rejectUnauthorized: this.config.rejectUnauthorized, timeout: this.config.timeoutMs })
      .useNtlmAuthentication(ewsCredentialName(who.login, this.config.domain), who.password)
    const inner = make()
    const slot = () => {
      const row = this.slots.get(who.userId) ?? { active: 0, queue: [] }
      this.slots.set(who.userId, row)
      if (row.active < MAX_PARALLEL) { row.active++; return Promise.resolve() }
      return new Promise<void>((resolve) => row.queue.push(resolve))
    }
    const release = () => {
      const row = this.slots.get(who.userId)
      if (!row) return
      const next = row.queue.shift()
      if (next) next()
      else if (--row.active <= 0) this.slots.delete(who.userId)
    }
    // Exchange (IIS) بيقفل الاتصالات الخاملة: طلب لقى اتصال مقفول بيتبعت مرة تانية على اتصال جديد بدل ما يفشل قدام الموظف
    return {
      get apiName() { return 'ntlm' },
      xhr: async (options: unknown, progress?: unknown) => {
        await slot()
        try {
          // ناقل جديد لكل طلب، ولحد محاولتين كمان بمهلة قصيرة لو الخادم قطع الاتصال
          for (let attempt = 0; ; attempt++) {
            try {
              return await (make() as any).xhr(options, progress)
            } catch (err) {
              if (attempt >= 2 || !/ECONNRESET|EPIPE|socket hang up|ECONNABORTED/i.test(String((err as Error)?.message ?? err))) throw err
              await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)))
            }
          }
        } finally {
          release()
        }
      },
      xhrStream: (options: unknown, progress: unknown) => (inner as any).xhrStream(options, progress),
      disconnect: () => inner.disconnect(),
      getStatusText: (status: number) => (inner as any).getStatusText?.(status),
    } as unknown as XhrApi
  }

  /** عميل EWS داخل باسم الموظف (دخوله هو، من غير انتحال). عنوان الخادم من إعداد الخادم بس */
  private serviceFor(who: MailIdentity): Ews.ExchangeService {
    if (!this.config.enabled) throw new ServiceUnavailableException({ statusCode: 503, code: 'MAIL_NOT_CONFIGURED', message: MAIL_NOT_CONFIGURED })
    const E = ews()
    const svc = new E.ExchangeService(E.ExchangeVersion.Exchange2016)
    svc.XHRApi = this.transport(who) as never
    svc.Credentials = new E.WebCredentials(ewsCredentialName(who.login, this.config.domain), who.password)
    svc.Url = new E.Uri(this.config.url)
    // الصندوق المشترك: Exchange بيوجّه الطلب لخادم الصندوق ده
    if (who.target) svc.HttpHeaders.addUpdate('X-AnchorMailbox', who.target)
    return svc
  }

  /** بيحوّل أخطاء EWS لأخطاء API الواجهة بتفهمها. نص الخطأ بيتمسح منه أي سر قبل السجل */
  private fail(err: unknown, who: MailIdentity): never {
    if (err instanceof HttpException || err instanceof MailAuthRejected) throw err
    const e = err as { message?: string; Message?: string }
    const text = scrubSecrets(`${e?.message ?? ''} ${e?.Message ?? ''}`, [who.password]).trim()
    // صندوق مشترك اتشالت صلاحيته في Exchange
    if (/AccessDenied|ErrorAccessDenied|does not have permission|not have rights|ImpersonateUserDenied/i.test(text)) throw new ForbiddenException({ statusCode: 403, code: 'MAIL_NO_ACCESS', message: MAIL_NO_ACCESS })
    if (/NonExistentMailbox|mailbox.*(not|doesn't) exist/i.test(text)) throw new NotFoundException({ statusCode: 404, code: 'MAIL_NO_MAILBOX', message: MAIL_NO_MAILBOX })
    if (/Too many concurrent connections|ErrorServerBusy|ErrorTooManyObjectsOpened/i.test(text)) throw new ServiceUnavailableException({ statusCode: 503, code: 'MAIL_BUSY', message: MAIL_BUSY })
    if (/ItemNotFound|object was not found/i.test(text)) throw new NotFoundException({ statusCode: 404, code: 'MAIL_ITEM_NOT_FOUND', message: MAIL_ITEM_NOT_FOUND })
    // كلمة السر غلط، أو اتغيّرت في المجال وسط الجلسة: الموظف بيفتح بريده تاني
    if (/401|Unauthorized/i.test(text)) throw new MailAuthRejected()
    // الخادم مش راد: مكتبة النقل بتبلع خطأ الاتصال وسط مصافحة NTLM وبترمي «reading 'headers'» — السطر بيقول السبب الحقيقي
    const unreachable = /reading 'headers'|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|ECONNRESET|timeout of \d+ms/i.test(text)
    this.log.error(`EWS: ${unreachable ? 'مفيش رد من خادم البريد (الاتصال فشل أو المهلة خلصت) — ' : ''}${text.slice(0, 500)}`)
    throw new ServiceUnavailableException({ statusCode: 503, code: 'MAIL_UNAVAILABLE', message: MAIL_UNAVAILABLE })
  }

  private rejected(err: unknown): boolean {
    return err instanceof MailAuthRejected || /401|Unauthorized/i.test(String((err as Error)?.message))
  }

  private folderId(E: typeof Ews, key: string, target?: string): Ews.FolderId {
    if (isWellKnown(key)) return target ? new E.FolderId(wellKnownOf(E)[key], new E.Mailbox(target)) : new E.FolderId(wellKnownOf(E)[key])
    return new E.FolderId(cleanEwsId(key))
  }

  async folders(who: MailIdentity) {
    try {
      const E = ews(), svc = this.serviceFor(who)
      const props = new E.PropertySet(E.BasePropertySet.IdOnly, [E.FolderSchema.DisplayName, E.FolderSchema.UnreadCount, E.FolderSchema.TotalCount])
      const wellKnown = await Promise.all(
        WELL_KNOWN_KEYS.map(async (key) => {
          const f = await E.Folder.Bind(svc, this.folderId(E, key, who.target), props)
          return { key: key as string, id: f.Id.UniqueId, name: f.DisplayName, unread: f.UnreadCount, total: f.TotalCount }
        }),
      )
      const known = new Set(wellKnown.map((f) => f.id))

      const view = new E.FolderView(500)
      view.Traversal = E.FolderTraversal.Deep
      view.PropertySet = new E.PropertySet(E.BasePropertySet.IdOnly, [E.FolderSchema.DisplayName, E.FolderSchema.UnreadCount, E.FolderSchema.TotalCount, E.FolderSchema.ParentFolderId, E.FolderSchema.FolderClass])
      const root = who.target ? new E.FolderId(E.WellKnownFolderName.MsgFolderRoot, new E.Mailbox(who.target)) : new E.FolderId(E.WellKnownFolderName.MsgFolderRoot)
      const found = await svc.FindFolders(root, view)
      const custom = found.Folders.filter((f) => !known.has(f.Id.UniqueId) && safe(() => f.FolderClass, 'IPF.Note') === 'IPF.Note').map((f) => ({
        key: f.Id.UniqueId,
        id: f.Id.UniqueId,
        parentId: safe(() => f.ParentFolderId.UniqueId, null as string | null),
        name: f.DisplayName,
        unread: f.UnreadCount,
        total: f.TotalCount,
      }))
      // مجلدات البريد اللي الموظف شايفها بس (من غير شجر التقويم وجهات الاتصال)
      const ids = new Set([...known, ...custom.map((c) => c.id)])
      const rootChildren = custom.filter((c) => !c.parentId || !ids.has(c.parentId))
      return { wellKnown, custom, rootIds: rootChildren.map((c) => c.id) }
    } catch (err) {
      this.fail(err, who)
    }
  }

  private listProps(E: typeof Ews) {
    return new E.PropertySet(E.BasePropertySet.IdOnly, [
      E.ItemSchema.Subject, E.EmailMessageSchema.From, E.ItemSchema.DateTimeReceived, E.EmailMessageSchema.IsRead, E.ItemSchema.HasAttachments,
      E.ItemSchema.Importance, E.ItemSchema.Flag, E.ItemSchema.Preview, E.ItemSchema.DisplayTo,
    ])
  }

  private row(E: typeof Ews, i: Ews.Item, folder?: { key: string; name: string }): MailRow {
    return {
      id: i.Id.UniqueId,
      subject: safe(() => i.Subject, ''),
      from: safe(() => addr((i as Ews.EmailMessage).From), null),
      to: safe(() => i.DisplayTo, ''),
      date: safe(() => i.DateTimeReceived.ToISOString(), null as string | null),
      isRead: safe(() => (i as Ews.EmailMessage).IsRead, true),
      hasAttachments: safe(() => i.HasAttachments, false),
      important: safe(() => Number(i.Importance) === 2, false),
      flagged: safe(() => i.Flag.FlagStatus === E.ItemFlagStatus.Flagged, false),
      preview: safe(() => i.Preview, ''),
      ...(folder && { folder }),
    }
  }

  /** مجلد واحد، الأحدث أولًا؛ ومع البحث الرسايل اللي فيها الكلمة فعلًا بس (search.ts) */
  async list(who: MailIdentity, folder: string, offset: number, limit: number, q: MailQuery) {
    try {
      const E = ews(), svc = this.serviceFor(who)
      const view = new E.ItemView(limit, offset)
      view.PropertySet = this.listProps(E)
      view.OrderBy.Add(E.ItemSchema.DateTimeReceived, E.SortDirection.Descending)
      const fid = this.folderId(E, folder, who.target)
      const filter = buildFilter(E, q)
      const res = filter ? await svc.FindItems(fid, filter, view) : await svc.FindItems(fid, view)
      return { total: res.TotalCount, more: res.MoreAvailable, items: res.Items.map((i: Ews.Item) => this.row(E, i)) }
    } catch (err) {
      this.fail(err, who)
    }
  }

  /** بحث في كل مجلدات بريد الصندوق مرة واحدة (زي «كل المجلدات» في Outlook): كل مجلد بيتبحث فيه بالتوازي، والأحدث بيرجع ومعاه مجلده */
  async searchAll(who: MailIdentity, limit: number, q: MailQuery) {
    const E = ews(), filter = buildFilter(E, q)
    if (!filter) throw new HttpException({ statusCode: 400, code: 'MAIL_SEARCH_EMPTY', message: MAIL_SEARCH_EMPTY }, 400)
    const tree = await this.folders(who)
    try {
      const svc = this.serviceFor(who)
      const targets = [...tree.wellKnown.filter((f) => f.key !== 'drafts' && f.total > 0), ...tree.custom.filter((f) => f.total > 0)].map((f) => ({ key: f.key, name: f.name }))
      const found: { item: Ews.Item; folder: { key: string; name: string } }[] = []
      let truncated = false
      let next = 0
      const worker = async () => {
        while (next < targets.length) {
          const f = targets[next++]
          const view = new E.ItemView(limit)
          view.PropertySet = this.listProps(E)
          view.OrderBy.Add(E.ItemSchema.DateTimeReceived, E.SortDirection.Descending)
          const res = await svc.FindItems(this.folderId(E, f.key, who.target), filter, view)
          if (res.MoreAvailable) truncated = true
          for (const item of res.Items) found.push({ item, folder: f })
        }
      }
      await Promise.all(Array.from({ length: Math.min(MAX_PARALLEL, targets.length) }, worker))
      const items = found
        .map((x) => this.row(E, x.item, x.folder))
        .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
        .slice(0, limit)
      return { total: items.length, more: false, truncated: truncated || found.length > limit, items }
    } catch (err) {
      this.fail(err, who)
    }
  }

  /** المجلد كمحادثات (رسالة وكل ردودها صف واحد). Exchange بيجمّعهم بنفسه، طلب واحد للصفحة */
  async conversations(who: MailIdentity, folder: string, offset: number, limit: number, unreadOnly: boolean): Promise<{ total: number; more: boolean; items: MailThreadRow[] }> {
    if (who.target && this.noConversations.has(who.target)) return this.groupedPage(who, folder, offset, limit, unreadOnly, null)
    try {
      const E = ews(), svc = this.serviceFor(who)
      const view = new E.ConversationIndexedItemView(limit, offset)
      view.PropertySet = new E.PropertySet(E.BasePropertySet.IdOnly, [
        E.ConversationSchema.Topic, E.ConversationSchema.UniqueSenders, E.ConversationSchema.UniqueRecipients, E.ConversationSchema.LastDeliveryTime,
        E.ConversationSchema.MessageCount, E.ConversationSchema.UnreadCount, E.ConversationSchema.HasAttachments, E.ConversationSchema.Importance,
        E.ConversationSchema.FlagStatus, E.ConversationSchema.Preview,
      ])
      view.OrderBy.Add(E.ConversationSchema.LastDeliveryTime, E.SortDirection.Descending)
      if (unreadOnly) view.ViewFilter = E.ViewFilter.Unread
      // 4 معاملات: الشكل اللي بيرجّع العدد الكلي كمان
      const res = await svc.FindConversation(view, this.folderId(E, folder, who.target), null as unknown as string, false)
      const names = (l: { GetEnumerator(): string[] }) => safe(() => l.GetEnumerator(), [] as string[])
      const items = res.Conversations.map((c: Ews.Conversation) => ({
        id: c.Id.UniqueId,
        subject: safe(() => c.Topic, ''),
        senders: names(c.UniqueSenders),
        recipients: names(c.UniqueRecipients),
        date: safe(() => c.LastDeliveryTime.ToISOString(), null as string | null),
        count: safe(() => c.MessageCount, 1),
        unread: safe(() => c.UnreadCount, 0),
        hasAttachments: safe(() => c.HasAttachments, false),
        important: safe(() => Number(c.Importance) === 2, false),
        flagged: safe(() => c.FlagStatus === E.ConversationFlagStatus.Flagged, false),
        preview: safe(() => c.Preview, ''),
      }))
      return { total: res.TotalCount, more: offset + items.length < res.TotalCount, items }
    } catch (err) {
      if (err instanceof HttpException) throw err
      if (who.target && !this.rejected(err)) {
        this.noConversations.add(who.target)
        return this.groupedPage(who, folder, offset, limit, unreadOnly, err)
      }
      this.fail(err, who)
    }
  }

  /** بديل الصناديق المشتركة اللي Exchange بيرفض فيها FindConversation: صفحة رسايل متجمّعة بمعرّف محادثتها (محادثة على صفحتين بتظهر مرتين) */
  private async groupedPage(who: MailIdentity, folder: string, offset: number, limit: number, unreadOnly: boolean, cause: unknown) {
    if (cause) this.log.warn(`FindConversation اترفض لصندوق مشترك — تجميع صفحة واحدة بداله: ${scrubSecrets(String((cause as Error)?.message), [who.password]).slice(0, 200)}`)
    try {
      const E = ews(), svc = this.serviceFor(who)
      const view = new E.ItemView(limit, offset)
      view.PropertySet = this.listProps(E)
      view.PropertySet.Add(E.ItemSchema.ConversationId)
      view.OrderBy.Add(E.ItemSchema.DateTimeReceived, E.SortDirection.Descending)
      const fid = this.folderId(E, folder, who.target)
      const res = unreadOnly ? await svc.FindItems(fid, new E.SearchFilter.IsEqualTo(E.EmailMessageSchema.IsRead, false), view) : await svc.FindItems(fid, view)
      const rows = new Map<string, MailThreadRow>()
      for (const i of res.Items) {
        const cid = safe(() => i.ConversationId.UniqueId, i.Id.UniqueId)
        const from = safe(() => (i as Ews.EmailMessage).From?.Name || (i as Ews.EmailMessage).From?.Address || '', '')
        const unread = safe(() => ((i as Ews.EmailMessage).IsRead ? 0 : 1), 0)
        const row = rows.get(cid)
        if (row) {
          // العناصر الأحدث أولًا: الصف شايل آخر رسالة خلاص
          row.count++
          row.unread += unread
          if (from && !row.senders.includes(from)) row.senders.push(from)
          row.hasAttachments ||= safe(() => i.HasAttachments, false)
          continue
        }
        rows.set(cid, {
          id: cid,
          subject: safe(() => i.Subject, ''),
          senders: from ? [from] : [],
          recipients: safe(() => [i.DisplayTo], [] as string[]),
          date: safe(() => i.DateTimeReceived.ToISOString(), null as string | null),
          count: 1,
          unread,
          hasAttachments: safe(() => i.HasAttachments, false),
          important: safe(() => Number(i.Importance) === 2, false),
          flagged: safe(() => i.Flag.FlagStatus === E.ItemFlagStatus.Flagged, false),
          preview: safe(() => i.Preview, ''),
        })
      }
      return { total: res.TotalCount, more: res.MoreAvailable, items: [...rows.values()] }
    } catch (err) {
      this.fail(err, who)
    }
  }

  /** كل رسايل المحادثة، الأقدم أولًا، من كل المجلدات (عشان ردود الموظف نفسه في «المرسل» تظهر) */
  async conversation(who: MailIdentity, id: string, folder: string) {
    try {
      const E = ews(), svc = this.serviceFor(who)
      const cid = new E.ConversationId(cleanEwsId(id))
      const props = new E.PropertySet(E.BasePropertySet.IdOnly, [
        E.ItemSchema.Subject, E.EmailMessageSchema.From, E.ItemSchema.DisplayTo, E.ItemSchema.DisplayCc, E.ItemSchema.DateTimeReceived, E.EmailMessageSchema.IsRead,
        E.ItemSchema.HasAttachments, E.ItemSchema.Preview, E.ItemSchema.ParentFolderId,
      ])
      // نسخ «المحذوف» و«غير المرغوب» و«المسودات» بتتحسب بس لما ده المجلد المفتوح
      const ignore = (['deleted', 'junk', 'drafts'] as const).filter((k) => k !== folder).map((k) => this.folderId(E, k, who.target))
      let items: Ews.Item[]
      try {
        const res = await svc.GetConversationItems(cid, props, null as unknown as string, ignore, E.ConversationSortOrder.DateOrderAscending)
        items = res.ConversationNodes.GetEnumerator().flatMap((n) => n.Items)
      } catch (err) {
        if (!who.target || this.rejected(err)) throw err
        // بديل الصندوق المشترك: رسايل المحادثة في المجلد ده وفي «المرسل»
        const view = new E.ItemView(200)
        view.PropertySet = props
        const filter = new E.SearchFilter.IsEqualTo(E.ItemSchema.ConversationId, cid)
        const folders = [...new Set([folder, 'sent'])].map((k) => this.folderId(E, k, who.target))
        items = (await Promise.all(folders.map((f) => svc.FindItems(f, filter, view).then((r) => r.Items)))).flat()
      }
      const seen = new Set<string>()
      return items
        .filter((i) => !seen.has(i.Id.UniqueId) && seen.add(i.Id.UniqueId))
        .map((i: Ews.Item) => ({
          id: i.Id.UniqueId,
          subject: safe(() => i.Subject, ''),
          from: safe(() => addr((i as Ews.EmailMessage).From), null),
          to: safe(() => i.DisplayTo, ''),
          cc: safe(() => i.DisplayCc, ''),
          date: safe(() => i.DateTimeReceived.ToISOString(), null as string | null),
          isRead: safe(() => (i as Ews.EmailMessage).IsRead, true),
          hasAttachments: safe(() => i.HasAttachments, false),
          preview: safe(() => i.Preview, ''),
        }))
        .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
    } catch (err) {
      this.fail(err, who)
    }
  }

  /** مقروء/علم/نقل/حذف لكل رسايل المحادثة في المجلد ده، في طلب واحد */
  async conversationAction(who: MailIdentity, id: string, folder: string, action: MailAction): Promise<void> {
    try {
      const E = ews(), svc = this.serviceFor(who)
      // من غير وقت مزامنة: بيتطبق على الرسايل اللي في المجلد دلوقتي
      const pair = [{ key: new E.ConversationId(cleanEwsId(id)), value: null as never }]
      const ctx = this.folderId(E, folder, who.target)
      const check = (r: { Responses?: { ErrorMessage?: string; Result?: number }[] }) => {
        const bad = r?.Responses?.find((x) => x.Result === 2)
        if (bad) throw new Error(bad.ErrorMessage ?? 'conversation action failed')
      }
      if (action.isRead !== undefined) check((await svc.SetReadStateForItemsInConversations(pair, ctx, action.isRead, true)) as never)
      if (action.flagged !== undefined) {
        const flag = new E.Flag()
        flag.FlagStatus = action.flagged ? E.ItemFlagStatus.Flagged : E.ItemFlagStatus.NotFlagged
        check((await svc.SetFlagStatusForItemsInConversations(pair, ctx, flag)) as never)
      }
      if (action.moveTo) check((await svc.MoveItemsInConversations(pair, ctx, this.folderId(E, action.moveTo, who.target))) as never)
      if (action.remove) check((await svc.DeleteItemsInConversations(pair, ctx, E.DeleteMode.MoveToDeletedItems)) as never)
    } catch (err) {
      if (err instanceof HttpException) throw err
      if (who.target && !this.rejected(err)) return this.conversationActionByItems(who, id, folder, action)
      this.fail(err, who)
    }
  }

  /** بديل الصندوق المشترك: نفس الإجراء رسالة رسالة (المحادثة كام رسالة) */
  private async conversationActionByItems(who: MailIdentity, id: string, folder: string, action: MailAction): Promise<void> {
    try {
      const E = ews(), svc = this.serviceFor(who)
      const view = new E.ItemView(200)
      view.PropertySet = new E.PropertySet(E.BasePropertySet.IdOnly)
      const found = await svc.FindItems(this.folderId(E, folder, who.target), new E.SearchFilter.IsEqualTo(E.ItemSchema.ConversationId, new E.ConversationId(cleanEwsId(id))), view)
      for (const i of found.Items) {
        if (action.remove) await this.remove(who, i.Id.UniqueId)
        else await this.update(who, i.Id.UniqueId, { isRead: action.isRead, flagged: action.flagged, folder: action.moveTo })
      }
    } catch (err) {
      this.fail(err, who)
    }
  }

  /** رسالة واحدة بنصها كامل. peek: تحميل مسبق — الرسالة مابتتعلّمش مقروءة */
  async message(who: MailIdentity, id: string, peek = false) {
    try {
      const E = ews(), svc = this.serviceFor(who)
      // UniqueBody: اللي الرسالة دي زودته بس، من غير التاريخ المقتبس (لعرض المحادثة)
      const props = new E.PropertySet(E.BasePropertySet.FirstClassProperties, [E.ItemSchema.UniqueBody])
      props.RequestedBodyType = E.BodyType.HTML
      const m = await E.EmailMessage.Bind(svc, new E.ItemId(cleanEwsId(id)), props)

      const all = m.Attachments.GetEnumerator()
      const asHtml = (b: Ews.MessageBody | null | undefined) => {
        const text = safe(() => b!.Text, '')
        return safe(() => b!.BodyType, E.BodyType.HTML) === E.BodyType.HTML ? text : `<pre style="white-space:pre-wrap;font-family:inherit">${esc(text)}</pre>`
      }
      let html = asHtml(m.Body)
      let uniqueHtml = safe(() => asHtml(m.UniqueBody as unknown as Ews.MessageBody), '')

      // الصور اللي جوه الرسالة (cid:) بتبقى data: عشان النص المعزول مايحتاجش طلبات زيادة
      const embedded = new Set<string>()
      for (const a of all) {
        if (!(a instanceof E.FileAttachment) || !a.ContentId || a.Size > MAX_INLINE_IMAGE) continue
        const cid = `cid:${a.ContentId}`
        if (!html.includes(cid) && !uniqueHtml.includes(cid)) continue
        await a.Load()
        // نوع صورة بس — مرفق بنوع تاني مايتحطش جوه النص
        const type = /^image\/(png|jpe?g|gif|bmp|webp)$/i.test(a.ContentType || '') ? a.ContentType : 'image/png'
        const uri = `data:${type};base64,${a.Base64Content}`
        html = html.split(cid).join(uri)
        uniqueHtml = uniqueHtml.split(cid).join(uri)
        embedded.add(a.Id)
      }

      if (!peek && !m.IsRead) {
        m.IsRead = true
        // التعليم كمقروء مابيبعتش إشعار قراءة باسم الموظف
        await m.Update(E.ConflictResolutionMode.AutoResolve, true).catch(() => undefined)
      }
      const list = (c: { GetEnumerator(): Ews.EmailAddress[] }) => safe(() => c.GetEnumerator().map(addr).filter((x): x is { name: string; address: string } => !!x), [])
      return {
        id: m.Id.UniqueId,
        subject: safe(() => m.Subject, ''),
        from: safe(() => addr(m.From), null),
        to: list(m.ToRecipients),
        cc: list(m.CcRecipients),
        date: safe(() => m.DateTimeReceived.ToISOString(), null as string | null),
        important: safe(() => Number(m.Importance) === 2, false),
        flagged: safe(() => m.Flag.FlagStatus === E.ItemFlagStatus.Flagged, false),
        html,
        // فاضي لما Exchange مايعرفش يفصل الجزء الجديد: الواجهة بتعرض النص كله
        uniqueHtml: /<img/i.test(uniqueHtml) || uniqueHtml.replace(/<[^>]*>|&nbsp;|\s/g, '') ? uniqueHtml : '',
        attachments: all.filter((a) => !embedded.has(a.Id)).map((a) => ({ id: a.Id, name: a.Name, size: a.Size, contentType: a.ContentType })),
      }
    } catch (err) {
      this.fail(err, who)
    }
  }

  async update(who: MailIdentity, id: string, patch: { isRead?: boolean; flagged?: boolean; folder?: string }): Promise<void> {
    try {
      const E = ews(), svc = this.serviceFor(who)
      const m = await E.EmailMessage.Bind(svc, new E.ItemId(cleanEwsId(id)), new E.PropertySet(E.BasePropertySet.IdOnly, [E.EmailMessageSchema.IsRead, E.ItemSchema.Flag]))
      if (patch.isRead !== undefined || patch.flagged !== undefined) {
        if (patch.isRead !== undefined) m.IsRead = patch.isRead
        if (patch.flagged !== undefined) {
          const flag = new E.Flag()
          flag.FlagStatus = patch.flagged ? E.ItemFlagStatus.Flagged : E.ItemFlagStatus.NotFlagged
          ;(m as any).Flag = flag
        }
        await m.Update(E.ConflictResolutionMode.AutoResolve, true)
      }
      if (patch.folder) await m.Move(this.folderId(E, patch.folder, who.target))
    } catch (err) {
      this.fail(err, who)
    }
  }

  /** حذف = نقل لـ«المحذوف» في Exchange (مفيش حذف نهائي من النظام) */
  async remove(who: MailIdentity, id: string): Promise<void> {
    try {
      const E = ews(), svc = this.serviceFor(who)
      const m = await E.EmailMessage.Bind(svc, new E.ItemId(cleanEwsId(id)), new E.PropertySet(E.BasePropertySet.IdOnly))
      await m.Delete(E.DeleteMode.MoveToDeletedItems)
    } catch (err) {
      this.fail(err, who)
    }
  }

  async send(who: MailIdentity, input: ComposeInput): Promise<void> {
    try {
      const E = ews(), svc = this.serviceFor(who)
      let msg: Ews.EmailMessage
      if (input.mode === 'new') {
        msg = new E.EmailMessage(svc)
      } else {
        // رد/تحويل: Exchange بيبني الأصل المقتبس؛ ونصنا فوقه
        const orig = await E.EmailMessage.Bind(svc, new E.ItemId(cleanEwsId(input.refId)))
        const resp = input.mode === 'forward' ? orig.CreateForward() : orig.CreateReply(input.mode === 'replyAll')
        resp.BodyPrefix = new E.MessageBody(E.BodyType.HTML, input.html)
        msg = await resp.Save(E.WellKnownFolderName.Drafts)
        await msg.Load(new E.PropertySet(E.BasePropertySet.FirstClassProperties))
        msg.ToRecipients.Clear()
        msg.CcRecipients.Clear()
      }
      msg.Subject = input.subject
      if (input.mode === 'new') msg.Body = new E.MessageBody(E.BodyType.HTML, input.html)
      input.to.forEach((a) => msg.ToRecipients.Add(a))
      input.cc.forEach((a) => msg.CcRecipients.Add(a))
      input.bcc.forEach((a) => msg.BccRecipients.Add(a))
      input.attachments.forEach((a) => msg.Attachments.AddFileAttachment(a.name, a.base64))
      if (input.mode !== 'new') await msg.Update(E.ConflictResolutionMode.AlwaysOverwrite)
      await msg.SendAndSaveCopy()
    } catch (err) {
      this.fail(err, who)
    }
  }

  async attachment(who: MailIdentity, id: string, attachmentId: string) {
    try {
      const E = ews(), svc = this.serviceFor(who)
      const m = await E.EmailMessage.Bind(svc, new E.ItemId(cleanEwsId(id)), new E.PropertySet(E.BasePropertySet.IdOnly, [E.ItemSchema.Attachments]))
      const a = m.Attachments.GetEnumerator().find((x) => x.Id === attachmentId)
      if (!(a instanceof E.FileAttachment)) throw new NotFoundException({ statusCode: 404, code: 'MAIL_ITEM_NOT_FOUND', message: MAIL_ITEM_NOT_FOUND })
      await a.Load()
      return { name: a.Name, contentType: a.ContentType || 'application/octet-stream', data: Buffer.from(a.Base64Content, 'base64') }
    } catch (err) {
      this.fail(err, who)
    }
  }

  /** عدد غير المقروء في الوارد. وهو كمان فحص «افتح بريدك»: طلب صغير واحد بدخول الموظف — Exchange بيقبله أو يرفضه */
  async unread(who: MailIdentity): Promise<number> {
    try {
      const E = ews(), svc = this.serviceFor(who)
      const inbox = who.target ? new E.FolderId(E.WellKnownFolderName.Inbox, new E.Mailbox(who.target)) : new E.FolderId(E.WellKnownFolderName.Inbox)
      const f = await E.Folder.Bind(svc, inbox, new E.PropertySet(E.BasePropertySet.IdOnly, [E.FolderSchema.UnreadCount]))
      return f.UnreadCount
    } catch (err) {
      this.fail(err, who)
    }
  }

  /** إكمال العناوين من دليل Exchange نفسه (اللي الموظف شايفه في Outlook) — مش من جداول الموظفين عندنا */
  async contacts(who: MailIdentity, q: string): Promise<{ displayName: string; email: string }[]> {
    try {
      const E = ews(), svc = this.serviceFor(who)
      const res = await svc.ResolveName(q, E.ResolveNameSearchLocation.DirectoryOnly, false)
      const seen = new Set<string>()
      return res.GetEnumerator()
        .map((entry) => ({ displayName: safe(() => entry.Mailbox.Name, ''), email: safe(() => entry.Mailbox.Address, '') }))
        .filter((entry) => entry.email.includes('@') && !seen.has(entry.email.toLowerCase()) && !!seen.add(entry.email.toLowerCase()))
        .slice(0, 10)
    } catch (err) {
      // مفيش تطابق: Exchange بيرد «لا نتائج» كخطأ في بعض الإصدارات
      if (/NameResolutionNoResults|No results were found/i.test(String((err as Error)?.message))) return []
      this.fail(err, who)
    }
  }
}

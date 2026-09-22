import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Employee } from '../employees/employee.entity'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { DirectoryListProvider, DirectoryUser, isNonPersonAccount } from './directory.types'
import { DirectoryService } from './directory.service'
import { domainEmailCandidates, DomainLoginService } from './domain-login.service'
import {
  DomainMatchVia,
  DOMAIN_MATCH_VIA_LABELS,
  employeeBlockReason,
  employeeMatchIndex,
  matchEmployeeForDirectory,
} from './domain-match'
import {
  domainAutoProvisionEnabled,
  DOMAIN_AUTOPROVISION_CONFIG_KEY,
  DOMAIN_PROVISION_OUTCOMES,
  DomainProvisionOutcome,
} from './domain-provision'
import { User } from './user.entity'

// ===== مزامنة حسابات الدومين: الحسابات موجودة وظاهرة قبل أي دخول =====
// قرار المالك 22 سبتمبر (بعد الظهر): «المفروض إنك فعّلت كل يوزرات الدومين … تبقى ظاهرة ليا عشان
// لو عايز أدّي لحد صلاحية معينة». الربط في لحظته لوحده معناه إن المالك مايشوفش الحساب غير بعد أول
// دخول — فمش قادر يسند دور أو صلاحية لحد قبلها. المزامنة دي بتقفل الفرق.
//
// القواعد اللي المزامنة مابتخرجش عليها:
//   • **معاينة أولًا**: بلا apply=true مفيش أي صف بيتكتب — التقرير بيقول «اللي كان هيحصل» بس.
//   • **مفيش روتين إنشاء تاني**: الإنشاء والربط بيمرّوا على DomainLoginService (نفس اللي الدخول
//     الحيّ بيستخدمه)، والمطابقة على domain-match — فحساب اتعمل هنا يقدر يدخل بالمجال فورًا.
//   • **آمنة للتكرار**: التمرير التاني مابيغيّرش حاجة. الحساب القائم مايتلمسش — الاستثناء الوحيد
//     هو ملء domainObjectGuid الناقص (بالظبط اللي الدخول بيعمله).
//   • **ممنوع التخمين وممنوع الكتابة فوق**: دور أو صلاحيات أو بريد أو تفعيل حساب قائم مايتغيّرش
//     أبدًا، وأي تعارض (ربط بحساب مجال تاني، بريد محجوز، مطابقة غامضة) بيتقال للمالك بالاسم والكود.
//   • **الصلاحيات من جداولنا**: الحساب بيتعمل بأقل دور (employee) وبلا أي صلاحية إضافية — المالك
//     هو اللي يرفع اللي يستاهل من شاشة المستخدمين. ولا مجموعة AD واحدة بتتقري.

export type DomainSyncAction = 'create' | 'link' | 'skip' | 'conflict'

export type DomainSyncReason =
  | 'noObjectGuid'
  | 'notPerson'
  | 'adDisabled'
  | 'alreadyLinked'
  | 'noMatch'
  | 'ambiguous'
  | 'employeeEnded'
  | 'employeeInactive'
  | 'userInactive'
  | 'guidConflict'
  | 'emailTaken'
  | 'duplicateEmployee'
  | 'failed'

/** سبب كل تخطّي/تعارض برسالة عربية واحدة — الشاشة والسكربت بيطبعوا نفس النص. */
export const DOMAIN_SYNC_REASONS: Record<DomainSyncReason, string> = {
  noObjectGuid: 'objectGUID مش مقروء من الدليل — مفيش ربط ثابت ممكن',
  notPerson: 'حساب جهاز أو خدمة مش شخص — مايتعملّوش حساب',
  adDisabled: 'حساب المجال متوقف في الدومين — مايتعملّوش حساب',
  alreadyLinked: 'موجود ومربوط بنفس حساب المجال — مفيش أي تغيير',
  noMatch: 'مفيش موظف مطابق (لا كود ولا رقم بصمة ولا بريد) — راجع الموارد البشرية',
  ambiguous: 'بيطابق أكتر من موظف — رفض صريح، وممنوع نخمّن مين',
  employeeEnded: 'الموظف أرشيف أو خدمته منتهية',
  employeeInactive: 'الموظف غير نشط',
  userInactive: 'حساب الموظف عندنا معطّل — مابنلمسوش (نفس قاعدة الدخول)',
  guidConflict: 'حساب الموظف عندنا مربوط بحساب مجال تاني — محتاج قرار بشري',
  emailTaken: 'كل عناوين البريد المتاحة للحساب مستخدمة لحساب تاني',
  duplicateEmployee: 'أكتر من حساب مجال بيطابق نفس الموظف — الأول بس هو اللي بيتعمل',
  failed: 'فشل التطبيق على القاعدة — مفيش حساب اتعمل لده',
}

export const DOMAIN_SYNC_ACTIONS: Record<DomainSyncAction, string> = {
  create: 'حساب جديد',
  link: 'ربط حساب قائم',
  skip: 'تخطّي',
  conflict: 'تعارض',
}

export interface DomainSyncEntry {
  /** حساب المجال — objectGUID هو الربط الثابت، ومنه بيتعمل الحساب في خطوة التطبيق */
  objectGuid: string
  sAMAccountName: string
  userPrincipalName: string
  displayName: string | null
  mail: string | null
  /** خاصية employeeID كما هي في AD (كود موظف أو رقم بصمة) */
  adEmployeeId: string | null
  adDisabled: boolean
  /** الموظف المطابق عندنا — null لو مفيش مطابقة أو غامضة */
  employeeId: number | null
  employeeCode: string | null
  employeeName: string | null
  matchedVia: DomainMatchVia | null
  matchedViaLabel: string | null
  action: DomainSyncAction
  reason: DomainSyncReason | null
  reasonText: string | null
  /** البريد اللي الحساب الجديد هيتعمل بيه */
  email: string | null
  /** حساب النظام المعني (الربط/التعارض/التخطّي) */
  userId: number | null
  /** الموظفين المرشّحين في حالة الغموض — بالاسم والكود عشان المالك يصلّح البيانات */
  candidates: Array<{ id: number; employeeCode: string; fullName: string }>
  /** اتكتب فعلًا؟ دايمًا false في المعاينة */
  applied: boolean
  error: string | null
}

export interface DomainSyncSummary {
  /** false = معاينة: مفيش أي صف اتكتب */
  applied: boolean
  startedAt: string
  finishedAt: string
  counts: {
    /** كائنات رجعت من الدليل */
    scanned: number
    adEnabled: number
    /** موظفين عندنا اتقرّوا للمطابقة */
    employees: number
    create: number
    link: number
    skip: number
    conflict: number
    failed: number
  }
  /** توزيع أسباب التخطّي/التعارض — مرتّب من الأكتر للأقل */
  reasons: Array<{ reason: DomainSyncReason; reasonText: string; count: number }>
  entries: DomainSyncEntry[]
  /** حالة إعداد المجال بلا أي سر */
  directory: { configured: boolean; server: string | null; upnSuffix: string | null }
}

/**
 * نتيجة موظف واحد — صفوف الخطة بتاعته + سطر عربي واحد للشاشة. مبنية من **نفس** خطة المزامنة
 * الجماعية، فكل سبب تخطّي/تعارض بيتصرّف هنا بالحرف زي ما بيتصرّف هناك.
 */
export interface DomainProvisionResult {
  employeeId: number
  outcome: DomainProvisionOutcome
  /** سطر واحد جاهز للعرض: سبب التخطّي الأدق لو فيه، وإلا نص الحالة */
  message: string
  /** الحساب اللي اتعمل/اتربط/اتعارض معاه — null = مفيش حساب */
  userId: number | null
  email: string | null
  reason: DomainSyncReason | null
  reasonText: string | null
  /** حساب المجال اللي طابق (بلا أي سر) */
  sAMAccountName: string | null
  matchedVia: DomainMatchVia | null
  matchedViaLabel: string | null
  /** المرشّحين في حالة الغموض — بالاسم والكود عشان المالك يصلّح البيانات */
  candidates: Array<{ id: number; employeeCode: string; fullName: string }>
  /** كل صفوف الدليل اللي طابقت الموظف ده (واحد في العادة) */
  entries: DomainSyncEntry[]
  /** الدليل مضبوط؟ بلا أي سر */
  directoryConfigured: boolean
}

@Injectable()
export class DomainSyncService {
  private readonly logger = new Logger(DomainSyncService.name)

  // ملاحظة ترتيب: api/scripts/sync-domain-users.cjs بيعمل الخدمة دي بإيده بالترتيب
  // (users, employees, directory, login) — فأي إضافة جديدة بتتحط **في الآخر** عشان السكربت
  // مايتكسرش. السكربت بينادي run() بس، ومابيلمسش مفتاح الإعدادات.
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
    private readonly directory: DirectoryService,
    private readonly domainLogin: DomainLoginService,
    @InjectRepository(RequestsConfig) private readonly config: Repository<RequestsConfig>
  ) {}

  /** المعاينة والتطبيق بنفس الحساب بالحرف: apply=false بيوقف قبل الكتابة بس. */
  async run(options: { apply?: boolean } = {}): Promise<DomainSyncSummary> {
    const apply = options.apply === true
    const startedAt = new Date()
    const accounts = await (this.directory as DirectoryListProvider).listUsers()
    const entries = await this.plan(accounts)
    if (apply) await this.applyPlan(entries)
    const summary = this.summarize(entries, accounts.length, apply, startedAt)
    this.logger.log(
      `مزامنة حسابات الدومين (${apply ? 'تطبيق' : 'معاينة'}): ` +
        `${summary.counts.scanned} حساب في الدليل، ` +
        `${summary.counts.create} جديد، ${summary.counts.link} ربط، ` +
        `${summary.counts.skip} تخطّي، ${summary.counts.conflict} تعارض، ${summary.counts.failed} فشل`
    )
    return summary
  }

  // ===== (1) الخطة: قرار لكل حساب مجال بلا أي كتابة =====

  private async plan(accounts: readonly DirectoryUser[]): Promise<DomainSyncEntry[]> {
    const employees = await this.employees.find({
      select: [
        'id',
        'employeeCode',
        'fingerprintCode',
        'fullName',
        'email',
        'branchId',
        'status',
        'archivedAt',
        'isActive',
      ],
    })
    const source = employeeMatchIndex(employees)
    const employeeById = new Map(employees.map((employee) => [employee.id, employee]))
    const users = await this.users.find({
      select: ['id', 'email', 'displayName', 'role', 'branchId', 'employeeId', 'isActive', 'domainObjectGuid'],
      order: { id: 'ASC' },
    })
    const byGuid = new Map<string, User>()
    const byEmployee = new Map<number, User>()
    // البريد محجوز على مستوى النظام كله (فهرس فريد) — والأقدم هو حساب الموظف زي ما الدخول بيختاره
    const takenEmails = new Set<string>()
    for (const user of users) {
      if (user.domainObjectGuid && !byGuid.has(user.domainObjectGuid)) {
        byGuid.set(user.domainObjectGuid, user)
      }
      if (user.employeeId && !byEmployee.has(user.employeeId)) byEmployee.set(user.employeeId, user)
      takenEmails.add(String(user.email ?? '').trim().toLowerCase())
    }
    // موظفين اتحسبوا في نفس التمرير: حساب مجال تاني لنفس الموظف مايعملش حساب تاني
    const claimedEmployees = new Set<number>()

    const out: DomainSyncEntry[] = []
    // ترتيب ثابت باسم الحساب: التقرير نفسه في كل تمرير، والمعاينة هي اللي بعدها بالظبط
    const ordered = [...accounts].sort((a, b) =>
      String(a.sAMAccountName ?? '').localeCompare(String(b.sAMAccountName ?? ''), 'en')
    )
    for (const account of ordered) {
      const base: DomainSyncEntry = {
        objectGuid: account.objectGuid,
        sAMAccountName: account.sAMAccountName,
        userPrincipalName: account.userPrincipalName,
        displayName: account.displayName,
        mail: account.mail,
        adEmployeeId: account.employeeId,
        adDisabled: account.disabled === true,
        employeeId: null,
        employeeCode: null,
        employeeName: null,
        matchedVia: null,
        matchedViaLabel: null,
        action: 'skip',
        reason: null,
        reasonText: null,
        email: null,
        userId: null,
        candidates: [],
        applied: false,
        error: null,
      }

      if (!account.objectGuid) {
        out.push(skip(base, 'noObjectGuid'))
        continue
      }
      if (isNonPersonAccount(account)) {
        out.push(skip(base, 'notPerson'))
        continue
      }
      // (أ) الحساب مربوط خلاص بالـGUID ده: مفيش حاجة تتعمل — ولا نسأل عن الموظف أصلًا
      const linked = byGuid.get(account.objectGuid)
      if (linked) {
        // مافيش مطابقة محتاجة هنا (الربط ثابت خلاص) — بس بنقول الموظف اللي الحساب مربوط بيه
        // عشان قايمة المالك تبقى مقروءة، مش صفوف بلا أسماء
        const employee = linked.employeeId ? employeeById.get(linked.employeeId) : undefined
        out.push({
          ...skip(base, 'alreadyLinked'),
          userId: linked.id,
          email: linked.email,
          employeeId: employee?.id ?? null,
          employeeCode: employee?.employeeCode ?? null,
          employeeName: employee?.fullName ?? null,
        })
        continue
      }
      // (ب) المطابقة — نفس ترتيب الدخول الحيّ بالحرف.
      // بتتعمل **قبل** فحص «متوقف في المجال» عشان الصف يحمل اسم الموظف وكوده برضه لو الحساب متوقف
      // (زي صف «مربوط خلاص» فوق): وإلا زرّ ملف الموظف بيقول «مفيش حساب مجال مطابق» على موظف حسابه
      // موجود بس متوقف — وده بيبعت المالك يدوّر على حساب ناقص مش موجود أصلًا.
      // القرار نفسه ماتغيّرش بحرف: المتوقف مايتعملّوش حساب، والسبب «متوقف» أقوى من «غامض» (بيتقال أولًا).
      const match = await matchEmployeeForDirectory(account, source)
      const identity: Partial<DomainSyncEntry> =
        match.kind === 'matched'
          ? {
              employeeId: match.employee.id,
              employeeCode: match.employee.employeeCode,
              employeeName: match.employee.fullName,
              matchedVia: match.via,
              matchedViaLabel: DOMAIN_MATCH_VIA_LABELS[match.via],
            }
          : match.kind === 'ambiguous'
            ? {
                matchedVia: match.via,
                matchedViaLabel: DOMAIN_MATCH_VIA_LABELS[match.via],
                candidates: match.employees.map((e) => ({
                  id: e.id,
                  employeeCode: e.employeeCode,
                  fullName: e.fullName,
                })),
              }
            : {}
      if (account.disabled === true) {
        out.push({ ...skip(base, 'adDisabled'), ...identity })
        continue
      }
      if (match.kind === 'none') {
        out.push(skip(base, 'noMatch'))
        continue
      }
      if (match.kind === 'ambiguous') {
        out.push({ ...skip(base, 'ambiguous'), ...identity })
        continue
      }
      const employee = match.employee
      const matched: DomainSyncEntry = { ...base, ...identity }

      // (ج) الموظف نفسه مقفول؟
      const blocked = employeeBlockReason(employee)
      if (blocked === 'ended') {
        out.push(skip(matched, 'employeeEnded'))
        continue
      }
      if (blocked === 'inactive') {
        out.push(skip(matched, 'employeeInactive'))
        continue
      }

      // (د) حساب مجال تاني خد الموظف ده في نفس التمرير
      if (claimedEmployees.has(employee.id)) {
        out.push(skip(matched, 'duplicateEmployee'))
        continue
      }

      // (هـ) حساب قائم للموظف: يُربط لو الربط ناقص، وأي غير كده بيتقال ومايتلمسش
      const existing = byEmployee.get(employee.id)
      if (existing) {
        if (existing.domainObjectGuid && existing.domainObjectGuid !== account.objectGuid) {
          out.push({
            ...matched,
            action: 'conflict',
            reason: 'guidConflict',
            reasonText: DOMAIN_SYNC_REASONS.guidConflict,
            userId: existing.id,
            email: existing.email,
          })
          continue
        }
        if (existing.isActive === false) {
          out.push({ ...skip(matched, 'userInactive'), userId: existing.id, email: existing.email })
          continue
        }
        if (existing.domainObjectGuid === account.objectGuid) {
          out.push({ ...skip(matched, 'alreadyLinked'), userId: existing.id, email: existing.email })
          continue
        }
        claimedEmployees.add(employee.id)
        out.push({ ...matched, action: 'link', userId: existing.id, email: existing.email })
        continue
      }

      // (و) حساب جديد: البريد من AD الأول، وإلا بريد الموظف، وإلا الـUPN — وأول واحد غير محجوز.
      // نفس ترتيب domainEmailCandidates اللي الدخول الحيّ بيستخدمه؛ الفرق إن الحجز بيتقرا من
      // مجموعة واحدة في الذاكرة (827 حساب × 3 مرشّحين = ألفين استعلام لو سألنا القاعدة لكل واحد).
      const email = domainEmailCandidates(account, employee).find((value) => !takenEmails.has(value))
      if (!email) {
        out.push(skip(matched, 'emailTaken'))
        continue
      }
      takenEmails.add(email)
      claimedEmployees.add(employee.id)
      out.push({ ...matched, action: 'create', email: email.slice(0, 200) })
    }
    return out
  }

  // ===== (2) التطبيق: نفس مسار الدخول الحيّ بالحرف =====

  private async applyPlan(entries: DomainSyncEntry[]): Promise<void> {
    for (const entry of entries) {
      if (entry.action !== 'create' && entry.action !== 'link') continue
      try {
        const directory = directoryOf(entry)
        if (entry.action === 'link') {
          const existing = entry.userId ? await this.users.findOne({ where: { id: entry.userId } }) : null
          // الحساب اتغيّر بين المعاينة والتطبيق (دخل صاحبه في النص)؟ مابنكتبش فوق حاجة
          if (!existing) {
            fail(entry, 'الحساب مش موجود دلوقتي')
            continue
          }
          if (existing.domainObjectGuid && existing.domainObjectGuid !== directory.objectGuid) {
            entry.action = 'conflict'
            entry.reason = 'guidConflict'
            entry.reasonText = DOMAIN_SYNC_REASONS.guidConflict
            continue
          }
          entry.applied = await this.domainLogin.linkExistingUser(existing, directory)
          if (!entry.applied) {
            entry.action = 'skip'
            entry.reason = 'alreadyLinked'
            entry.reasonText = DOMAIN_SYNC_REASONS.alreadyLinked
          }
          continue
        }
        const employee = entry.employeeId
          ? await this.employees.findOne({ where: { id: entry.employeeId } })
          : null
        if (!employee || !entry.email) {
          fail(entry, 'الموظف مش موجود دلوقتي')
          continue
        }
        const created = await this.domainLogin.createDomainOnlyUser(directory, employee, entry.email)
        entry.userId = created.id
        entry.applied = true
      } catch (error) {
        fail(entry, String((error as Error)?.message ?? error))
      }
    }
  }

  // ===== (3) الملخص =====

  private summarize(
    entries: DomainSyncEntry[],
    scanned: number,
    applied: boolean,
    startedAt: Date
  ): DomainSyncSummary {
    const counts = {
      scanned,
      adEnabled: entries.filter((e) => !e.adDisabled).length,
      employees: 0,
      create: 0,
      link: 0,
      skip: 0,
      conflict: 0,
      failed: entries.filter((e) => e.reason === 'failed').length,
    }
    const reasons = new Map<DomainSyncReason, number>()
    for (const entry of entries) {
      counts[entry.action] += 1
      if (entry.reason) reasons.set(entry.reason, (reasons.get(entry.reason) ?? 0) + 1)
    }
    counts.employees = new Set(entries.filter((e) => e.employeeId).map((e) => e.employeeId)).size
    const status = this.directory.status()
    return {
      applied,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      counts,
      reasons: [...reasons.entries()]
        .map(([reason, count]) => ({ reason, reasonText: DOMAIN_SYNC_REASONS[reason], count }))
        .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason)),
      entries,
      directory: {
        configured: status.configured,
        server: status.server,
        upnSuffix: status.upnSuffix,
      },
    }
  }

  // ===== (4) موظف واحد: زرّ «مزامنة من AD»، والتزويد التلقائي عند الإضافة =====

  /** التزويد التلقائي عند إضافة موظف مفتوح؟ يُقرأ من القاعدة كل مرة عشان القفل يسري بلا إعادة تشغيل. */
  async autoProvisionEnabled(): Promise<boolean> {
    try {
      const row = await this.config.findOne({ where: { key: DOMAIN_AUTOPROVISION_CONFIG_KEY } })
      return domainAutoProvisionEnabled(row?.value)
    } catch (error) {
      // المفتاح ناقص أو القراءة فشلت = الافتراضي المعلن (مفتوح) — والقفل بقيمة صريحة بس
      this.logger.warn(
        `تعذّر قراءة ${DOMAIN_AUTOPROVISION_CONFIG_KEY} فاعتُبر مفتوحًا: ${(error as Error)?.message}`
      )
      return true
    }
  }

  /**
   * موظف واحد بالاسم: بيبني **نفس** خطة المزامنة الجماعية بالحرف (نفس المطابقة، نفس الأسباب، نفس
   * الترتيب، نفس حجز البريد) وبيطبّق صفوف الموظف ده بس. فبكده أي سبب تخطّي بيتصرّف هنا زي ما
   * بيتصرّف في المزامنة الجماعية، ومفيش روتين إنشاء تاني: الإنشاء والربط من DomainLoginService.
   * التمرير التاني مابيغيّرش حاجة (الحساب بيبقى «موجود ومربوط»).
   * الدليل واقف أو مش مضبوط = نتيجة بسبب، مش استثناء. الاستثناء الوحيد: الموظف نفسه مش موجود.
   */
  async syncEmployee(employeeId: number): Promise<DomainProvisionResult> {
    const employee = await this.employees.findOne({ where: { id: employeeId } })
    if (!employee) throw new NotFoundException('الموظف غير موجود')
    const configured = this.directory.status().configured
    let accounts: readonly DirectoryUser[]
    try {
      accounts = await (this.directory as DirectoryListProvider).listUsers()
    } catch (error) {
      // الدليل مش مضبوط أو مش راد: الموظف زي ما هو، والسبب بيتقال — ومفيش سر في رسالة الدليل
      this.logger.warn(
        `تعذّر سرد الدليل لتزويد حساب الموظف ${employee.employeeCode}: ${(error as Error)?.message}`
      )
      return {
        ...emptyResult(employeeId, configured),
        outcome: 'directoryUnavailable',
        message: DOMAIN_PROVISION_OUTCOMES.directoryUnavailable,
      }
    }
    const entries = await this.plan(accounts)
    // صفوف الموظف ده: اللي طابقته، وكمان اللي رفضها الغموض وهو واحد من مرشّحيها
    const mine = entries.filter(
      (entry) =>
        entry.employeeId === employeeId ||
        entry.candidates.some((candidate) => candidate.id === employeeId)
    )
    if (mine.length === 0) {
      return {
        ...emptyResult(employeeId, configured),
        outcome: 'noMatch',
        reason: 'noMatch',
        reasonText: DOMAIN_SYNC_REASONS.noMatch,
        message: DOMAIN_SYNC_REASONS.noMatch,
      }
    }
    await this.applyPlan(mine)
    const result = provisionResultOf(employeeId, mine, configured)
    this.logger.log(
      `مزامنة حساب الموظف ${employee.employeeCode}: ${result.outcome}` +
        (result.sAMAccountName ? ` (${result.sAMAccountName})` : '') +
        (result.userId ? ` — حساب ${result.userId}` : '')
    )
    return result
  }

  /**
   * الموظف لسه اتعمل: حسابه من المجال فورًا — **بأفضل جهد**. المفتاح مقفول أو الدليل واقف أو مفيش
   * مطابقة أو أي استثناء جوّه = الموظف اتحفظ والطلب ناجح، والسبب بيرجع في الرد عشان الشاشة تقوله.
   * مابترميش أبدًا.
   */
  async provisionOnHire(employeeId: number): Promise<DomainProvisionResult> {
    try {
      if (!(await this.autoProvisionEnabled())) {
        return {
          ...emptyResult(employeeId, this.directoryConfigured()),
          outcome: 'switchedOff',
          message: DOMAIN_PROVISION_OUTCOMES.switchedOff,
        }
      }
      return await this.syncEmployee(employeeId)
    } catch (error) {
      // آخر شبكة: مهما حصل، إضافة الموظف نجحت ومابترجعش
      this.logger.warn(
        `تعذّر تزويد حساب دخول للموظف ${employeeId} — الموظف اتحفظ: ${(error as Error)?.message}`
      )
      return {
        ...emptyResult(employeeId, this.directoryConfigured()),
        outcome: 'failed',
        reason: 'failed',
        reasonText: DOMAIN_SYNC_REASONS.failed,
        message: DOMAIN_PROVISION_OUTCOMES.failed,
      }
    }
  }

  /** «الدليل مضبوط؟» بلا أي سر — وقراءتها نفسها ممنوعة تكون سبب فشل تاني في مسار الاحتواء. */
  private directoryConfigured(): boolean {
    try {
      return this.directory.status().configured
    } catch {
      return false
    }
  }
}

/** نتيجة بلا أي صف دليل — الأساس اللي كل حالة «مفيش حساب» بتتبني عليه. */
const emptyResult = (employeeId: number, directoryConfigured: boolean): DomainProvisionResult => ({
  employeeId,
  outcome: 'skipped',
  message: DOMAIN_PROVISION_OUTCOMES.skipped,
  userId: null,
  email: null,
  reason: null,
  reasonText: null,
  sAMAccountName: null,
  matchedVia: null,
  matchedViaLabel: null,
  candidates: [],
  entries: [],
  directoryConfigured,
})

/**
 * الصف اللي بيتقال للمالك لما أكتر من حساب مجال يلمس نفس الموظف: اللي اتكتب الأول، بعده الفشل
 * (لازم يبان)، بعده التعارض، بعده «مربوط خلاص»، وأخيرًا باقي أسباب التخطّي.
 */
const entryRank = (entry: DomainSyncEntry): number => {
  if (entry.reason === 'failed') return 2
  if (entry.action === 'create') return 0
  if (entry.action === 'link') return 1
  if (entry.action === 'conflict') return 3
  if (entry.reason === 'alreadyLinked') return 4
  return 5
}

const outcomeOf = (entry: DomainSyncEntry): DomainProvisionOutcome => {
  if (entry.reason === 'failed') return 'failed'
  if (entry.action === 'create') return 'created'
  if (entry.action === 'link') return 'linked'
  if (entry.action === 'conflict') return 'conflict'
  if (entry.reason === 'alreadyLinked') return 'alreadyLinked'
  if (entry.reason === 'noMatch') return 'noMatch'
  return 'skipped'
}

const provisionResultOf = (
  employeeId: number,
  entries: DomainSyncEntry[],
  directoryConfigured: boolean
): DomainProvisionResult => {
  const ordered = [...entries].sort((a, b) => entryRank(a) - entryRank(b))
  const primary = ordered[0]
  const outcome = outcomeOf(primary)
  return {
    employeeId,
    outcome,
    // سبب التخطّي/التعارض أدق من نص الحالة العام، فهو الأوْلى في الرسالة
    message: primary.reasonText ?? DOMAIN_PROVISION_OUTCOMES[outcome],
    userId: primary.userId,
    email: primary.email,
    reason: primary.reason,
    reasonText: primary.reasonText,
    sAMAccountName: primary.sAMAccountName,
    matchedVia: primary.matchedVia,
    matchedViaLabel: primary.matchedViaLabel,
    candidates: primary.candidates,
    entries: ordered,
    directoryConfigured,
  }
}

const skip = (entry: DomainSyncEntry, reason: DomainSyncReason): DomainSyncEntry => ({
  ...entry,
  action: 'skip',
  reason,
  reasonText: DOMAIN_SYNC_REASONS[reason],
})

const fail = (entry: DomainSyncEntry, detail: string): void => {
  entry.action = 'skip'
  entry.reason = 'failed'
  entry.reasonText = DOMAIN_SYNC_REASONS.failed
  entry.applied = false
  entry.error = detail.slice(0, 300)
}

/** الحقول اللي مسار الإنشاء/الربط محتاجها من حساب المجال — من صف الخطة نفسه. */
const directoryOf = (entry: DomainSyncEntry): DirectoryUser => ({
  objectGuid: entry.objectGuid,
  sAMAccountName: entry.sAMAccountName,
  userPrincipalName: entry.userPrincipalName,
  mail: entry.mail,
  displayName: entry.displayName,
  employeeId: entry.adEmployeeId,
  disabled: entry.adDisabled,
})

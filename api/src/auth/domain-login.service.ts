import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcryptjs'
import * as crypto from 'crypto'
import { Employee } from '../employees/employee.entity'
import { DirectoryUser } from './directory.types'
import {
  DomainMatch,
  employeeBlockReason,
  employeeRepositoryMatchSource,
  matchEmployeeForDirectory,
} from './domain-match'
import { User } from './user.entity'
import { lockEmployeeAccountSlot } from './employee-account-slot'

// ===== ربط حساب المجال بالموظف «في لحظته» (Just-in-time) =====
// قرار المالك 22 سبتمبر: أول دخول ناجح بحساب مجال بيلاقي الموظف ويعمل الحساب ويربطه. مفيش مطابقة =
// رفض صريح ومفيش أي إنشاء — ممنوع نخترع موظف.
// قرار المالك 22 سبتمبر (بعد الظهر): زيادةً على كده، المزامنة الجماعية (domain-sync.service) بتعمل
// الحسابات مقدَّمًا عشان المالك يسند أدوار قبل أي دخول. الاتنين بيستخدموا **نفس** الدوال اللي تحت:
// المطابقة من domain-match، والإنشاء والربط من هنا — مفيش روتين إنشاء تاني في النظام.
//
// ترتيب المطابقة موصوف في domain-match.ts (كود الموظف ← رقم البصمة ← بريد AD ← الـUPN).
// في البيانات الحيّة خاصية employeeID بتحمل **رقم البصمة** أكتر من كود الموظف (323 مقابل 43)،
// وفصندوق البريد ومفتاح المطابقة لازم ييجوا من AD مش من نسختنا.

const REFUSALS = {
  noMatch:
    'حساب الشركة مش مربوط بأي موظف في النظام — راجع الموارد البشرية للتأكد من كود الموظف أو بريد العمل، ولا حساب بيتعمل تلقائيًّا',
  ambiguous: 'حساب الشركة بيطابق أكتر من موظف في النظام — راجع الموارد البشرية، ولا حساب بيتعمل',
  employeeEnded: 'الموظف المرتبط بحساب الشركة ده أرشيف أو خدمته منتهية — الدخول موقوف',
  employeeInactive: 'الموظف المرتبط بحساب الشركة ده غير نشط — الدخول موقوف',
  userInactive: 'الحساب معطّل',
  guidConflict:
    'حساب الموظف في النظام مربوط بحساب مجال تاني — راجع الدعم الفني (مفيش ربط بيتغيّر لوحده)',
  emailTaken:
    'بريد حساب الشركة مستخدم لحساب تاني في النظام — راجع الدعم الفني، ولا حساب بيتعمل',
} as const

export const DOMAIN_LOGIN_REFUSALS = REFUSALS
// CRP3H: الحساب اتغيّر (اتنقل لموظف تاني، أو اتعطّل، أو اتربط) بين مطابقة الهوية وكتابة الربط
export const DOMAIN_LINK_ACCOUNT_CHANGED = 'حساب الموظف اتغيّر أثناء الربط بحساب الشركة — حاول تاني'
/** CRP3I: حساب الموظف (أو ربط الهوية) ظهر أو اتغيّر بين المطابقة والإنشاء — الدخول بيعيد الحكم من الأول مرة واحدة */
export class DomainAccountChangedError extends ConflictException {
  constructor() { super(DOMAIN_LINK_ACCOUNT_CHANGED) }
}

/** كلمة مرور غير قابلة للاستخدام: حساب المجال مالوش كلمة عندنا، فمسار البريد+الكلمة بيفشل عليه دايمًا. */
const unusablePasswordHash = (): Promise<string> =>
  bcrypt.hash(`domain-only:${crypto.randomBytes(24).toString('hex')}`, 10)

@Injectable()
export class DomainLoginService {
  private readonly logger = new Logger(DomainLoginService.name)

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Employee) private readonly employees: Repository<Employee>
  ) {}

  /**
   * الحساب عندنا المقابل لحساب المجال: بيلاقيه بالـobjectGUID، وإلا بيطابق الموظف ويعمل/يربط حساب واحد.
   * أي رفض = UnauthorizedException برسالة عربية، ومفيش أي صف بيتعمل.
   */
  async resolveUser(directory: DirectoryUser): Promise<User> {
    // CRP3I (P3I-B01): الإنشاء بيحجز الموظف ويعيد حكم حسابه تحت القفل؛ لو حساب ظهر في النص، الحكم كله بيتعاد من الأول مرة واحدة على
    // الوضع الحالي (ربط، أو رفض الحساب المعطّل أو المربوط بهوية تانية) — زي الدخول اللي جه بعده بالظبط
    try {
      return await this.resolveOnce(directory)
    } catch (error) {
      if (!(error instanceof DomainAccountChangedError)) throw error
      return this.resolveOnce(directory)
    }
  }

  private async resolveOnce(directory: DirectoryUser): Promise<User> {
    // (أ) الربط الثابت: objectGUID — إعادة التسمية أو تغيير البريد في AD مابتكسرهوش
    const linked = await this.findByObjectGuid(directory.objectGuid)
    if (linked) {
      if (!linked.isActive) throw new UnauthorizedException(REFUSALS.userInactive)
      // الموظف اتأرشف أو خدمته خلصت بعد الربط؟ الدخول بيتوقف برضه
      if (linked.employeeId) await this.assertEmployeeOpen(linked.employeeId)
      return linked
    }

    // (ب) مطابقة الموظف بالترتيب — أول ما ينجح بيوقف
    const match = await this.matchEmployee(directory)
    if (match.kind === 'ambiguous') {
      this.logger.warn(
        `رفض مطابقة غامضة: ${directory.sAMAccountName} بيطابق ${match.employees.length} موظف بـ${match.via}`
      )
      throw new UnauthorizedException(REFUSALS.ambiguous)
    }
    if (match.kind === 'none') throw new UnauthorizedException(REFUSALS.noMatch)
    const employee = match.employee
    this.assertEmployeeRowOpen(employee)

    // (ج) حساب قائم لنفس الموظف؟ يُربط، ومايتعملش حساب تاني
    const existing = await this.findByEmployee(employee.id)
    if (existing) {
      if (existing.domainObjectGuid && existing.domainObjectGuid !== directory.objectGuid) {
        this.logger.warn(
          `رفض ربط: حساب ${existing.id} للموظف ${employee.employeeCode} مربوط بـobjectGUID تاني`
        )
        throw new UnauthorizedException(REFUSALS.guidConflict)
      }
      if (!existing.isActive) throw new UnauthorizedException(REFUSALS.userInactive)
      await this.linkExistingUser(existing, directory, employee)
      return existing
    }

    // (د) إنشاء حساب واحد: بلا كلمة مرور قابلة للاستخدام (مجال بس)، والصلاحيات من جداولنا كالعادة
    const email = await this.resolveNewUserEmail(directory, employee)
    if (!email) throw new UnauthorizedException(REFUSALS.emailTaken)
    return this.createDomainOnlyUser(directory, employee, email)
  }

  // ===== المسارات المشتركة بين الدخول في لحظته والمزامنة الجماعية =====

  /** الحساب المربوط بحساب المجال ده (بالـobjectGUID) — بالحقول اللي الدخول محتاجها. */
  findByObjectGuid(objectGuid: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('u')
      .addSelect(['u.mustChangePassword', 'u.passwordChangedAt'])
      .where('u.domainObjectGuid = :guid', { guid: objectGuid })
      .getOne()
  }

  /** حساب الموظف عندنا (الأقدم لو بالخطأ فيه أكتر من واحد). */
  findByEmployee(employeeId: number): Promise<User | null> {
    return this.users
      .createQueryBuilder('u')
      .addSelect(['u.mustChangePassword', 'u.passwordChangedAt'])
      .where('u.employeeId = :employeeId', { employeeId })
      .orderBy('u.id', 'ASC')
      .getOne()
  }

  /**
   * ملء الربط الناقص على حساب قائم — ومفيش حاجة تانية بتتغيّر (لا دور ولا صلاحيات ولا بريد ولا تفعيل).
   * بيرجّع true لو فعلاً كتب حاجة. المتصل لازم يكون اتأكد إن الحساب مش مربوط بـGUID تاني.
   */
  async linkExistingUser(
    existing: User,
    directory: DirectoryUser,
    employee?: Employee | null
  ): Promise<boolean> {
    if (existing.domainObjectGuid) return false
    // CRP3H (P3H-B02): الهوية اتطابقت على موظف الحساب وقت القراية — الربط بيتكتب بشرط إن الحساب لسه لنفس الموظف ده ولسه مفعّل ومش
    // مربوط. حساب اتنقل لموظف تاني (أو اتعطّل أو اتربط) بين القراية والكتابة = مفيش كتابة، والمتصل يعيد من الأول
    const written = await this.users
      .createQueryBuilder()
      .update(User)
      .set({ domainObjectGuid: directory.objectGuid })
      .where(`id = :id AND domainObjectGuid IS NULL AND isActive = 1 AND ${existing.employeeId == null ? 'employeeId IS NULL' : 'employeeId = :employeeId'}`, {
        id: existing.id,
        employeeId: existing.employeeId,
      })
      .execute()
    if (!written.affected) throw new ConflictException(DOMAIN_LINK_ACCOUNT_CHANGED)
    existing.domainObjectGuid = directory.objectGuid
    this.logger.log(
      `ربط حساب قائم ${existing.id} (${existing.email}) بحساب المجال ${directory.sAMAccountName}` +
        (employee ? ` — الموظف ${employee.employeeCode}` : '')
    )
    return true
  }

  /**
   * **الروتين الوحيد** في النظام اللي بيعمل حساب من المجال: بلا كلمة مرور قابلة للاستخدام، أقل دور
   * (employee)، فرع الموظف، والربط بالـobjectGUID من أول لحظة. الصلاحيات فاضية — المالك هو اللي
   * بيسندها من شاشة المستخدمين، ومفيش مجموعة AD واحدة بتتقري ولا بتمنح حاجة.
   */
  async createDomainOnlyUser(
    directory: DirectoryUser,
    employee: Employee,
    email: string
  ): Promise<User> {
    const passwordHash = await unusablePasswordHash()
    // CRP3I (P3I-B01): «الموظف مالوش حساب» اتحكم قبل كده من غير قفل. الإنشاء بيحجز الموظف (قفل صفه — نفس الحجز في إنشاء حساب وتغيير
    // ربطه) ويعيد الحكم تحته: الملف لسه مفتوح، ومفيش حساب للموظف ولا حساب بالهوية دي. ظهر حساب = مفيش إنشاء، والمتصل يعيد من الأول
    const created = await this.users.manager.transaction(async (em) => {
      const slot = await lockEmployeeAccountSlot(em, employee.id)
      if (!slot.employee) throw new UnauthorizedException(REFUSALS.noMatch)
      this.assertEmployeeRowOpen(slot.employee)
      if (slot.accounts.length > 0) throw new DomainAccountChangedError()
      if (await em.getRepository(User).findOne({ where: { domainObjectGuid: directory.objectGuid }, select: ['id'] })) throw new DomainAccountChangedError()
      return em.getRepository(User).save(
      em.getRepository(User).create({
        email,
        passwordHash,
        // مفيش كلمة مرور اتعيّنت على النظام ده — الحساب بيدخل بالمجال
        passwordChangedAt: null,
        displayName: (directory.displayName ?? employee.fullName ?? email).slice(0, 200),
        role: 'employee',
        // فرع الموظف زي ما هو تحت القفل
        branchId: slot.employee.branchId as unknown as number,
        employeeId: employee.id,
        permissions: null as unknown as string,
        isActive: true,
        tokenVersion: 0,
        mustChangePassword: false,
        scopeAllBranches: false,
        domainObjectGuid: directory.objectGuid,
      })
      )
    })
    this.logger.log(
      `حساب جديد ${created.id} (${created.email}) اتعمل واتربط بحساب المجال ${directory.sAMAccountName} — الموظف ${employee.employeeCode}`
    )
    return created
  }

  /**
   * بريد الحساب الجديد: بريد AD الأول، وإلا بريد الموظف عندنا، وإلا الـUPN — وأول واحد غير مستخدم.
   * null = كلهم مستخدمين لحساب تاني. `reserved` للمزامنة الجماعية: عناوين اتحُجزت لحسابات في نفس
   * التمرير ولسه ماتكتبتش في القاعدة.
   */
  async resolveNewUserEmail(
    directory: DirectoryUser,
    employee: Employee,
    reserved?: ReadonlySet<string>
  ): Promise<string | null> {
    for (const email of domainEmailCandidates(directory, employee)) {
      if (reserved?.has(email)) continue
      const taken = await this.users.findOne({ where: { email }, select: ['id'] })
      if (!taken) return email.slice(0, 200)
    }
    return null
  }

  // ===== المطابقة =====

  /** نفس الترتيب ونفس التطبيع اللي المزامنة بتستخدمهم — domain-match هو المصدر الوحيد. */
  matchEmployee(directory: DirectoryUser): Promise<DomainMatch> {
    return matchEmployeeForDirectory(directory, employeeRepositoryMatchSource(this.employees))
  }

  private assertEmployeeRowOpen(employee: Employee): void {
    const blocked = employeeBlockReason(employee)
    if (blocked === 'ended') throw new UnauthorizedException(REFUSALS.employeeEnded)
    if (blocked === 'inactive') throw new UnauthorizedException(REFUSALS.employeeInactive)
  }

  private async assertEmployeeOpen(employeeId: number): Promise<void> {
    const employee = await this.employees.findOne({ where: { id: employeeId } })
    if (!employee) return // حساب مربوط بموظف اتشال: القواعد التانية (isActive) هي الحاكمة
    this.assertEmployeeRowOpen(employee)
  }
}

/** عناوين البريد المرشّحة لحساب المجال بالترتيب: AD أولًا، ثم نسختنا، ثم الـUPN. */
export function domainEmailCandidates(directory: DirectoryUser, employee: Employee): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of [directory.mail, employee.email, directory.userPrincipalName]) {
    const email = (value ?? '').trim().toLowerCase()
    if (!email.includes('@') || seen.has(email)) continue
    seen.add(email)
    out.push(email)
  }
  return out
}

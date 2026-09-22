import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcryptjs'
import * as crypto from 'crypto'
import { Employee } from '../employees/employee.entity'
import { DirectoryUser } from './directory.types'
import { User } from './user.entity'

// ===== ربط حساب المجال بالموظف «في لحظته» (Just-in-time) =====
// قرار المالك 22 سبتمبر: مفيش إنشاء مسبق لـ485 حساب. أول دخول ناجح بحساب مجال بيلاقي الموظف
// ويعمل الحساب ويربطه. مفيش مطابقة = رفض صريح ومفيش أي إنشاء — ممنوع نخترع موظف.
//
// ترتيب المطابقة (أول ما ينجح بيوقف):
//   1) خاصية AD employeeID  →  employees.employeeCode   (لو الـIT عبّاها — الأدق)
//   2) خاصية AD mail        →  employees.email
//   3) الـUPN               →  employees.email
// في البيانات الحيّة 322 موظف بريدهم @maharah.local و239 بريدهم @maharah.pro — فصندوق البريد
// ومفتاح المطابقة لازم ييجوا من AD مش من نسختنا، وده سبب الترتيب ده بالحرف.

/** حالات الموظف اللي مايتعملّهاش حساب ولا تدخل: أرشيف أو خدمة منتهية. */
const BLOCKED_EMPLOYEE_STATUS = new Set(['archived', 'terminated'])

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
    // (أ) الربط الثابت: objectGUID — إعادة التسمية أو تغيير البريد في AD مابتكسرهوش
    const linked = await this.users
      .createQueryBuilder('u')
      .addSelect(['u.mustChangePassword', 'u.passwordChangedAt'])
      .where('u.domainObjectGuid = :guid', { guid: directory.objectGuid })
      .getOne()
    if (linked) {
      if (!linked.isActive) throw new UnauthorizedException(REFUSALS.userInactive)
      // الموظف اتأرشف أو خدمته خلصت بعد الربط؟ الدخول بيتوقف برضه
      if (linked.employeeId) await this.assertEmployeeOpen(linked.employeeId)
      return linked
    }

    // (ب) مطابقة الموظف بالترتيب — أول ما ينجح بيوقف
    const employee = await this.matchEmployee(directory)
    if (!employee) throw new UnauthorizedException(REFUSALS.noMatch)
    this.assertEmployeeRowOpen(employee)

    // (ج) حساب قائم لنفس الموظف؟ يُربط، ومايتعملش حساب تاني
    const existing = await this.users
      .createQueryBuilder('u')
      .addSelect(['u.mustChangePassword', 'u.passwordChangedAt'])
      .where('u.employeeId = :employeeId', { employeeId: employee.id })
      .orderBy('u.id', 'ASC')
      .getOne()
    if (existing) {
      if (existing.domainObjectGuid && existing.domainObjectGuid !== directory.objectGuid) {
        this.logger.warn(
          `رفض ربط: حساب ${existing.id} للموظف ${employee.employeeCode} مربوط بـobjectGUID تاني`
        )
        throw new UnauthorizedException(REFUSALS.guidConflict)
      }
      if (!existing.isActive) throw new UnauthorizedException(REFUSALS.userInactive)
      if (!existing.domainObjectGuid) {
        await this.users.update({ id: existing.id }, { domainObjectGuid: directory.objectGuid })
        existing.domainObjectGuid = directory.objectGuid
        this.logger.log(
          `ربط حساب قائم ${existing.id} (${existing.email}) بحساب المجال ${directory.sAMAccountName} — الموظف ${employee.employeeCode}`
        )
      }
      return existing
    }

    // (د) إنشاء حساب واحد: بلا كلمة مرور قابلة للاستخدام (مجال بس)، والصلاحيات من جداولنا كالعادة
    const email = await this.pickEmail(directory, employee)
    const created = await this.users.save(
      this.users.create({
        email,
        passwordHash: await unusablePasswordHash(),
        // مفيش كلمة مرور اتعيّنت على النظام ده — الحساب بيدخل بالمجال
        passwordChangedAt: null,
        displayName: (directory.displayName ?? employee.fullName ?? email).slice(0, 200),
        role: 'employee',
        branchId: employee.branchId as unknown as number,
        employeeId: employee.id,
        permissions: null as unknown as string,
        isActive: true,
        tokenVersion: 0,
        mustChangePassword: false,
        scopeAllBranches: false,
        domainObjectGuid: directory.objectGuid,
      })
    )
    this.logger.log(
      `حساب جديد ${created.id} (${created.email}) اتعمل واتربط بحساب المجال ${directory.sAMAccountName} — الموظف ${employee.employeeCode}`
    )
    return created
  }

  // ===== المطابقة =====

  private async matchEmployee(directory: DirectoryUser): Promise<Employee | null> {
    const code = (directory.employeeId ?? '').trim()
    if (code) {
      const byCode = await this.employees
        .createQueryBuilder('e')
        .where('e.employeeCode = :code', { code })
        .getMany()
      if (byCode.length === 1) return byCode[0]
      if (byCode.length > 1) throw new UnauthorizedException(REFUSALS.ambiguous)
    }
    for (const address of [directory.mail, directory.userPrincipalName]) {
      const value = (address ?? '').trim().toLowerCase()
      if (!value) continue
      const byEmail = await this.employees
        .createQueryBuilder('e')
        .where('LOWER(e.email) = :value', { value })
        .getMany()
      if (byEmail.length === 1) return byEmail[0]
      if (byEmail.length > 1) throw new UnauthorizedException(REFUSALS.ambiguous)
    }
    return null
  }

  private assertEmployeeRowOpen(employee: Employee): void {
    if (BLOCKED_EMPLOYEE_STATUS.has(String(employee.status)) || employee.archivedAt) {
      throw new UnauthorizedException(REFUSALS.employeeEnded)
    }
    if (employee.isActive === false) throw new UnauthorizedException(REFUSALS.employeeInactive)
  }

  private async assertEmployeeOpen(employeeId: number): Promise<void> {
    const employee = await this.employees.findOne({ where: { id: employeeId } })
    if (!employee) return // حساب مربوط بموظف اتشال: القواعد التانية (isActive) هي الحاكمة
    this.assertEmployeeRowOpen(employee)
  }

  /** بريد الحساب الجديد: بريد AD الأول، وإلا بريد الموظف عندنا، وإلا الـUPN — ولازم يكون غير مستخدم. */
  private async pickEmail(directory: DirectoryUser, employee: Employee): Promise<string> {
    const candidates = [directory.mail, employee.email, directory.userPrincipalName]
      .map((value) => (value ?? '').trim().toLowerCase())
      .filter((value) => value.includes('@'))
    for (const email of candidates) {
      const taken = await this.users.findOne({ where: { email }, select: ['id'] })
      if (!taken) return email.slice(0, 200)
    }
    throw new UnauthorizedException(REFUSALS.emailTaken)
  }
}

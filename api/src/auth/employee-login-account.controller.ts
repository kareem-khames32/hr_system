import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Employee } from '../employees/employee.entity'
import type { JwtPayload } from './auth.service'
import { DomainSyncService } from './domain-sync.service'
import { DirectoryService } from './directory.service'
import { branchScopeOf, CurrentUser, JwtAuthGuard, RolesGuard, userHasPerm } from './guards'
import { legacyUnusablePasswordUserIds, needsPasswordFromLegacy } from './legacy-password-marker'
import { ROLE_PRESETS } from './permissions'
import { Role } from './role.entity'
import { User } from './user.entity'

// ===== كارت «مرتبط بحساب دخول» في ملف الموظف =====
// قرار المالك 22 سبتمبر (بالليل): وهو واقف على ملف موظف عايز يعرف فورًا «ده مرتبط بحساب دخول؟
// ولا لأ؟ وحساب دومين ولا حساب عندنا؟» — وبزرّ واحد يزامنه من AD لو مش مربوط.
//
// **القراءة بصلاحية الملف نفسه** (الموظف لنفسه، أو employees.view — نفس قاعدة GET /employees/:id)
// مش users.manage: الكارت بيقول «فيه حساب / مفيش»، والبيانات اللي بتخرج بيانات حساب مش أسرار
// (مفيش hash ولا توكن ولا كلمة مرور). أما **الزرّ** فمساره في UsersController بـusers.manage
// ونطاق «كل الفروع» — نفس حراسة المزامنة الجماعية بالحرف.
//
// المسار جوه AuthModule عن قصد: الحساب والدور والدليل كلهم حاجات الـauth، وملف الموظفين
// مالوش دعوة بيهم. (نفس نمط qualifications.controller اللي بادئته 'employees/:id' وهو برّه.)

/** اللي الكارت بيعرضه — بلا أي سر. */
export interface EmployeeLoginAccountView {
  employeeId: number
  employeeCode: string
  employeeName: string
  /** الموظف مرتبط بحساب دخول؟ */
  hasAccount: boolean
  account: {
    id: number
    email: string
    displayName: string
    role: string
    /** اسم الدور بالعربي من جدول الأدوار (أو الحزم المدمجة) */
    roleLabel: string
    isActive: boolean
    /** حساب دومين = بيدخل بكلمة مرور الدومين، ومفيش كلمة مرور عندنا */
    isDomainAccount: boolean
    scopeAllBranches: boolean
    mustChangePassword: boolean
    /** «مستخدم منقول — محتاج باسورد»: جه من النظام القديم ولسه محدش عيّن له كلمة */
    legacyNeedsPassword: boolean
    lastLoginAt: string | null
  } | null
  /** المشاهد يقدر يضغط «مزامنة من AD»؟ (users.manage + نطاق كل الفروع) */
  canSync: boolean
  /** الدليل مضبوط؟ بلا سيرفر ولا حساب خدمة ولا أي سر */
  directory: { configured: boolean }
  /** التزويد التلقائي عند إضافة موظف مفتوح؟ */
  autoProvisionEnabled: boolean
  /** سطر عربي واحد جاهز للكارت */
  summary: string
}

const DOMAIN_ACCOUNT_SUMMARY = 'مرتبط بحساب دخول من الدومين — بيدخل بكلمة مرور الدومين، ومفيش كلمة مرور عندنا'
const LOCAL_ACCOUNT_SUMMARY = 'مرتبط بحساب دخول عندنا — بيدخل بالبريد وكلمة المرور'
const NO_ACCOUNT_SUMMARY = 'مش مرتبط بأي حساب دخول — الموظف ده مايقدرش يدخل النظام'

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeeLoginAccountController {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    private readonly directory: DirectoryService,
    private readonly domainSync: DomainSyncService
  ) {}

  @Get(':id/login-account')
  async read(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: JwtPayload
  ): Promise<EmployeeLoginAccountView> {
    // نفس بوابة عرض الملف بالحرف: الموظف يشوف سجله هو، وغيره محتاج employees.view
    if (actor.employeeId !== id && !userHasPerm(actor, 'employees.view')) {
      throw new ForbiddenException('لا تملك صلاحية عرض الموظفين')
    }
    const employee = await this.employees.findOne({ where: { id } })
    const scope = branchScopeOf(actor)
    // خارج نطاق فرع المشاهد = غير موجود (نفس رد EmployeesService.findOne)
    if (!employee || (scope != null && employee.branchId !== scope)) {
      throw new NotFoundException('الموظف غير موجود')
    }
    // الأقدم هو حساب الموظف — نفس اللي الدخول بالمجال بيختاره لو بالخطأ فيه أكتر من واحد
    const account = await this.users
      .createQueryBuilder('u')
      .addSelect(['u.mustChangePassword', 'u.passwordChangedAt'])
      .where('u.employeeId = :id', { id })
      .orderBy('u.id', 'ASC')
      .getOne()
    return {
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
      employeeName: employee.fullName,
      hasAccount: !!account,
      account: account
        ? {
            id: account.id,
            email: account.email,
            displayName: account.displayName,
            role: account.role,
            roleLabel: await this.roleLabel(account.role),
            isActive: account.isActive !== false,
            isDomainAccount: !!account.domainObjectGuid,
            // مدير النظام نطاقه كامل بدوره، فالعلم عليه دايمًا false (زي قائمة المستخدمين)
            scopeAllBranches: account.role !== 'super_admin' && account.scopeAllBranches === true,
            mustChangePassword: !!account.mustChangePassword,
            legacyNeedsPassword: needsPasswordFromLegacy(account, legacyUnusablePasswordUserIds()),
            lastLoginAt: account.lastLoginAt ? new Date(account.lastLoginAt).toISOString() : null,
          }
        : null,
      // مرآة حراسة الزرّ في الخادم: users.manage + نطاق كل الفروع
      canSync: userHasPerm(actor, 'users.manage') && scope === null,
      directory: { configured: this.directory.status().configured },
      autoProvisionEnabled: await this.domainSync.autoProvisionEnabled(),
      summary: !account
        ? NO_ACCOUNT_SUMMARY
        : account.domainObjectGuid
          ? DOMAIN_ACCOUNT_SUMMARY
          : LOCAL_ACCOUNT_SUMMARY,
    }
  }

  /** اسم الدور بالعربي: جدول الأدوار الأول (المخصوصة موجودة فيه)، وإلا الحزم المدمجة، وإلا الكود. */
  private async roleLabel(code: string): Promise<string> {
    const row = await this.roles.findOne({ where: { code } }).catch(() => null)
    return row?.nameAr ?? ROLE_PRESETS.find((preset) => preset.code === code)?.nameAr ?? code
  }
}

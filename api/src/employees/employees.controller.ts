import {
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  Injectable,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ForbiddenException } from '@nestjs/common'
import {
  branchScopeOf,
  CurrentUser,
  JwtAuthGuard,
  Perm,
  RolesGuard,
  userHasPerm,
} from '../auth/guards'
import type { JwtPayload } from '../auth/auth.service'
import { CreateEmployeeDto, CreateEmployeeSuspensionDto, EndEmployeeSuspensionDto, RenewEmployeeContractDto, UpdateEmployeeDto } from './employees.dto'
import { EmployeesService } from './employees.service'
import { projectEmployee } from './employee-projection'

// تغيير الأجر (أو قراءة سياقه للتغيير) يغيّر صافي المسير → اعتماد المسير شرط إضافي
// فوق employees.edit — مدير النظام يتخطى (userHasPerm)
function assertSalaryChangeAuthority(user: JwtPayload) {
  if (!userHasPerm(user, 'payroll.approve')) {
    throw new ForbiddenException('تعديل الأجر يتطلب صلاحية «اعتماد المسير» بجانب تعديل بيانات الموظف')
  }
}

// حارس PATCH: يعمل قبل التحقق من الجسم (ValidationPipe) فالرفض 403 ثابت مهما كان شكل
// salaryChange — لا تكشف رسائل التحقق بنية أمر الأجر لمن لا يملك الاعتماد
@Injectable()
class SalaryChangeAuthorityGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const request = ctx.switchToHttp().getRequest()
    const body = request.body
    if (body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'salaryChange')) {
      assertSalaryChangeAuthority(request.user)
    }
    return true
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Perm('employees.view')
  @Get()
  async findAll(@CurrentUser() user: JwtPayload) {
    return (await this.employees.findAll(branchScopeOf(user))).map(employee => projectEmployee(employee, user))
  }

  // دليل مختصر (id/اسم/كود) للنشطين في النطاق — بلا employees.view، لمنتقيات
  // الشاشات غير الإدارية (نقل العهدة/التقديم نيابة). قبل ':id' حتى لا يلتقطه
  @Get('directory')
  directory(@CurrentUser() user: JwtPayload) {
    return this.employees.directory(branchScopeOf(user))
  }

  // الخطوة 13: سياق «يسري من راتب شهر» لأجر التعيين في نموذج الإنشاء (الدورة، الشهر الجاري، شهر التعيين، المدى).
  // قبل ':id' حتى لا يلتقطه؛ لا يقرأ بيانات أي موظف.
  @Perm('employees.create')
  @Get('salary-start-context')
  salaryStartContext(@Query('hireDate') hireDate?: string) {
    return this.employees.salaryStartContext(hireDate)
  }

  // الموظف يشوف سجله هو — غيره يحتاج employees.view
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload
  ) {
    if (user.employeeId !== id && !userHasPerm(user, 'employees.view')) {
      throw new ForbiddenException('لا تملك صلاحية عرض الموظفين')
    }
    return projectEmployee(await this.employees.findOne(id, branchScopeOf(user)), user)
  }

  @Perm('employees.create')
  @Post()
  async create(@Body() dto: CreateEmployeeDto, @CurrentUser() user: JwtPayload) {
    // مدير الفرع يضيف داخل فرعه فقط
    const scope = branchScopeOf(user)
    if (scope != null) {
      // فرع مختلف مكتوب صراحةً: رفض واضح بدل ما يتكتب على فرع المستخدم في السكوت ويتأكد له فرع مااختارهوش
      if (dto.branchId != null && Number(dto.branchId) !== scope) throw new ForbiddenException('مش مسموح تضيف موظف على فرع غير فرعك')
      dto.branchId = scope
    }
    return projectEmployee(await this.employees.create(dto, user.sub, scope), user)
  }

  // سياق تعديل الأجر (الأجر الحالي الدقيق + بصمة المصدر) = بداية تغيير الراتب →
  // employees.edit وحدها لا تكفي، يلزم payroll.approve أيضاً (SEC-06)
  @Perm('employees.edit')
  @Get(':id/salary-change-context')
  salaryChangeContext(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload
  ) {
    assertSalaryChangeAuthority(user)
    return this.employees.salaryChangeContext(id, branchScopeOf(user))
  }

  // تغيير الأجر من ملف الموظف يغيّر المسير → صلاحية اعتماد المسير (SEC-06) عبر
  // SalaryChangeAuthorityGuard؛ تعديل البيانات غير المالية يبقى بـemployees.edit
  @Perm('employees.edit')
  @UseGuards(SalaryChangeAuthorityGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.employees.update(id, dto, branchScopeOf(user), user.sub)
  }

  @Perm('employees.edit')
  @Post(':id/contract/renew')
  async renewContract(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RenewEmployeeContractDto,
    @CurrentUser() user: JwtPayload
  ) {
    return projectEmployee(await this.employees.renewContract(id, dto, branchScopeOf(user), user.sub), user)
  }

  // أرشفة بدل حذف — السجل الوظيفي يبقى (بسبب موثّق)
  @Perm('employees.archive')
  @Post(':id/archive')
  async archive(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Body() body?: { reason?: string }
  ) {
    return projectEmployee(await this.employees.archive(id, branchScopeOf(user), body?.reason, user.sub), user)
  }

  // ===== الإيقاف عن العمل لفترة (قرار المالك 16 سبتمبر) =====
  // السجل: الموظف يشوف إيقافاته، وغيره يحتاج employees.view
  @Get(':id/suspensions')
  suspensions(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload
  ) {
    if (user.employeeId !== id && !userHasPerm(user, 'employees.view')) {
      throw new ForbiddenException('لا تملك صلاحية عرض الموظفين')
    }
    return this.employees.listSuspensions(id, branchScopeOf(user))
  }

  @Perm('employees.edit')
  @Post(':id/suspensions')
  suspend(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateEmployeeSuspensionDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.employees.createSuspension(id, dto, branchScopeOf(user), user.sub)
  }

  // إنهاء الإيقاف بدري أو إلغاؤه (حتى لو انتهى، طالما أيامه مش في مسير معتمد أو مصروف)
  @Perm('employees.edit')
  @Post(':id/suspensions/:suspensionId/end')
  endSuspension(
    @Param('id', ParseIntPipe) id: number,
    @Param('suspensionId', ParseIntPipe) suspensionId: number,
    @Body() dto: EndEmployeeSuspensionDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.employees.endSuspension(id, suspensionId, dto, branchScopeOf(user), user.sub)
  }

  // العودة على رأس العمل — للمؤرشف والمنتهي خدمته
  @Perm('employees.archive')
  @Post(':id/reactivate')
  async reactivate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload
  ) {
    return projectEmployee(await this.employees.reactivate(id, branchScopeOf(user), user.sub), user)
  }
}

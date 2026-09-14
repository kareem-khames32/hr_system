import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import {
  IsInt,
  IsOptional,
  IsString,
  isISO8601,
  Length,
  MaxLength,
  ValidateBy,
  ValidateIf,
} from 'class-validator'
import { Type } from 'class-transformer'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, CurrentUser, JwtAuthGuard, Perm, RolesGuard, userHasPerm } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { EmployeeDocument } from './assets.entities'
import { assertDocTypes } from './doc-types'
import { linkEmployeeFiles } from '../files/link-employee-files'

// تاريخ تقويمي صحيح بصيغة YYYY-MM-DD برسالة واحدة — الـregex وحده كان يمرّر
// 2026-02-31 فيقلبه تعريف mssql بصمت إلى 2026-03-03 (ويتخطى فحص الانتهاء قبل الإصدار)
const IsYmdDate = (message: string) =>
  ValidateBy(
    {
      name: 'isYmdDate',
      validator: {
        validate: (v: unknown) =>
          typeof v === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test(v) &&
          isISO8601(v, { strict: true }),
      },
    },
    { message }
  )

class CreateDocumentDto {
  @Type(() => Number)
  @IsInt({ message: 'الموظف مطلوب' })
  employeeId: number

  @IsString({ message: 'نوع المستند مطلوب' })
  @Length(2, 100, { message: 'نوع المستند من 2 إلى 100 حرف' })
  docType: string

  @IsOptional()
  @IsString({ message: 'رقم المستند نص' })
  @MaxLength(100, { message: 'رقم المستند لا يتجاوز 100 حرف' })
  number?: string

  @IsOptional()
  @IsYmdDate('تاريخ الإصدار غير صالح — الصيغة YYYY-MM-DD')
  issueDate?: string

  @IsOptional()
  @IsYmdDate('تاريخ الانتهاء غير صالح — الصيغة YYYY-MM-DD')
  expiryDate?: string

  @IsOptional()
  @IsString({ message: 'مرجع الملف نص' })
  @MaxLength(500, { message: 'مرجع الملف لا يتجاوز 500 حرف' })
  fileRef?: string

  @IsOptional()
  @IsString({ message: 'الملاحظات نص' })
  @MaxLength(500, { message: 'الملاحظات لا تتجاوز 500 حرف' })
  notes?: string
}

// تعديل مستند: كل الحقول اختيارية، وموظف المستند ثابت — employeeId يُقبل فقط
// مطابقاً لموظف المستند (الشاشة ترسله كما هو) وأي قيمة أخرى تُرفض (لا نقل)
class UpdateDocumentDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'الموظف رقم صحيح' })
  employeeId?: number

  // Length واحد بدل Min+Max (null كان يُظهر نفس الرسالة مرتين)
  @ValidateIf((o) => o.docType !== undefined)
  @IsString({ message: 'نوع المستند مطلوب' })
  @Length(2, 100, { message: 'نوع المستند من 2 إلى 100 حرف' })
  docType?: string

  @IsOptional()
  @IsString({ message: 'رقم المستند نص' })
  @MaxLength(100, { message: 'رقم المستند لا يتجاوز 100 حرف' })
  number?: string

  @IsOptional()
  @IsYmdDate('تاريخ الإصدار غير صالح — الصيغة YYYY-MM-DD')
  issueDate?: string

  @IsOptional()
  @IsYmdDate('تاريخ الانتهاء غير صالح — الصيغة YYYY-MM-DD')
  expiryDate?: string

  @IsOptional()
  @IsString({ message: 'مرجع الملف نص' })
  @MaxLength(500, { message: 'مرجع الملف لا يتجاوز 500 حرف' })
  fileRef?: string

  @IsOptional()
  @IsString({ message: 'الملاحظات نص' })
  @MaxLength(500, { message: 'الملاحظات لا تتجاوز 500 حرف' })
  notes?: string
}

// مستندات الموظفين — بصلاحية وتنبيه انتهاء
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documents')
export class DocsController {
  constructor(
    @InjectRepository(EmployeeDocument)
    private readonly docs: Repository<EmployeeDocument>,
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>
  ) {}

  @Get()
  async list(
    @CurrentUser() user: JwtPayload,
    @Query('employeeId') employeeId?: string,
    @Query('expiringDays') expiringDays?: string
  ) {
    // بلا documents.manage → الموظف يشوف مستنداته هو فقط
    if (!userHasPerm(user, 'documents.manage')) {
      employeeId = String(user.employeeId ?? -1)
    }
    const scope = branchScopeOf(user)
    const emps = await this.employees.find({
      where: scope !== null ? { branchId: scope } : {},
    })
    const empById = new Map(emps.map((e) => [e.id, e]))
    const where: Record<string, unknown> = {}
    if (scope !== null) where.employeeId = In(emps.map((e) => e.id))
    if (employeeId) {
      const selected = Number(employeeId)
      if (!Number.isSafeInteger(selected)) throw new BadRequestException('معرّف الموظف غير صالح')
      if (scope !== null && selected > 0 && !empById.has(selected)) {
        throw new NotFoundException('الموظف غير موجود')
      }
      where.employeeId = selected
    }
    let rows = await this.docs.find({ where: where as any, order: { id: 'DESC' } })

    // فلتر المنتهي قريباً: expiringDays=60 → ينتهي خلال 60 يوماً
    if (expiringDays) {
      const limit = new Date(Date.now() + Number(expiringDays) * 86400000)
        .toISOString()
        .slice(0, 10)
      rows = rows.filter((d) => d.expiryDate && d.expiryDate <= limit)
    }
    const today = new Date().toISOString().slice(0, 10)
    return rows.map((d) => ({
      ...d,
      employeeName: empById.get(d.employeeId)?.fullName ?? `#${d.employeeId}`,
      employeeCode: empById.get(d.employeeId)?.employeeCode ?? '',
      expired: !!d.expiryDate && d.expiryDate < today,
    }))
  }

  @Perm('documents.manage')
  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateDocumentDto) {
    await this.employeeInScope(user, dto.employeeId)
    // النوع كود مفعَّل من كتالوج أنواع المستندات — لا نص حر
    await assertDocTypes(this.docs.manager, [dto.docType], { activeOnly: true })
    if (dto.issueDate && dto.expiryDate && dto.expiryDate < dto.issueDate) {
      throw new BadRequestException('تاريخ الانتهاء قبل تاريخ الإصدار')
    }
    return this.docs.manager.transaction(async em => {
      await linkEmployeeFiles(em, dto.employeeId, [dto.fileRef], user.sub)
      return em.save(EmployeeDocument, em.create(EmployeeDocument, dto))
    })
  }

  @Perm('documents.manage')
  @Patch(':id')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDocumentDto
  ) {
    const doc = await this.docs.findOne({ where: { id } })
    if (!doc) throw new NotFoundException('المستند غير موجود')
    await this.employeeInScope(user, doc.employeeId)
    if (dto.employeeId !== undefined && dto.employeeId !== doc.employeeId) {
      throw new BadRequestException('لا يمكن نقل المستند لموظف آخر — أضف مستنداً جديداً له')
    }
    const { docType, number, issueDate, expiryDate, fileRef, notes } = dto
    // تغيير النوع لكود مفعَّل من الكتالوج؛ النوع الحالي (ولو نصاً قديماً) يُقبل كما هو
    if (docType !== undefined && docType !== doc.docType) {
      await assertDocTypes(this.docs.manager, [docType], { activeOnly: true })
    }
    const changes = { docType, number, issueDate, expiryDate, fileRef, notes }
    // التحقق على القيم بعد الدمج: الانتهاء لا يسبق الإصدار
    const issue = issueDate !== undefined ? issueDate : doc.issueDate
    const expiry = expiryDate !== undefined ? expiryDate : doc.expiryDate
    if (issue && expiry && expiry < issue) {
      throw new BadRequestException('تاريخ الانتهاء قبل تاريخ الإصدار')
    }
    for (const [key, value] of Object.entries(changes)) {
      if (value !== undefined) Object.assign(doc, { [key]: value })
    }
    return this.docs.manager.transaction(async em => {
      if (fileRef !== undefined && fileRef !== null) await linkEmployeeFiles(em, doc.employeeId, [fileRef], user.sub)
      return em.save(EmployeeDocument, doc)
    })
  }

  // نطاق الفرع: غير super_admin يدير مستندات موظفي فرعه فقط
  private async employeeInScope(user: JwtPayload, employeeId: number) {
    const emp = await this.employees.findOne({ where: { id: employeeId } })
    if (!emp) throw new BadRequestException('الموظف غير موجود')
    const scope = branchScopeOf(user)
    if (scope !== null && emp.branchId !== scope) {
      throw new ForbiddenException('الموظف خارج نطاق فرعك')
    }
    return emp
  }
}

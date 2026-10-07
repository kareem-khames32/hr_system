import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Logger,
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
import { localDateOf } from '../attendance/attendance.service'
import { andBranchScopeSql } from '../auth/guards'
import { currentEmployeeSql } from '../reports/metrics'
import { FUNCTIONAL_APPROVER_ROLES } from '../requests/approver-resolver.service'
import { TASK_ROLE_LABELS, tasksTableReady } from '../tasks/task-rules'
import {
  DOCUMENT_EXPIRY_REQUIRED, closeRenewalTask, daysUntil, docTypeExpirySettings, documentExpiryReady, supersededSql, writeDocTypeExpiry,
} from './document-expiry'
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
import { branchIdIn, branchScopeOf, CurrentUser, inBranchScope, JwtAuthGuard, Perm, RolesGuard, scopeWord, userHasPerm } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { EmployeeDocument } from './assets.entities'
import { assertDocTypes } from './doc-types'
import { syncHiringDocsTasks } from './hiring-documents'
import { linkEmployeeFiles } from '../files/link-employee-files'
import { RequireModule } from '../modules-registry/module.guard'

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
@RequireModule('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documents')
export class DocsController {
  private readonly logger = new Logger(DocsController.name)

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
      where: scope !== null ? { branchId: branchIdIn(scope) } : {},
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

  // ===== B2.15: تقرير «هينتهي / منتهي» بالفرع =====
  // المستندات اللي انتهت أو هتنتهي خلال المدة لموظفين نطاق القارئ الحاليين، بنوعها ومسؤول تجديدها وحالة مهمة التجديد. المستند اللي
  // له بديل أحدث من نفس النوع مابيظهرش. من غير رقم المستند ولا ملفه.
  @Perm('documents.manage')
  @Get('expiry')
  async expiry(@CurrentUser() user: JwtPayload, @Query('days') days?: string, @Query('branchId') branchId?: string) {
    const window = days === undefined || days === '' ? 30 : Number(days)
    if (!Number.isInteger(window) || window < 1 || window > 365) throw new BadRequestException('مدة التقرير من 1 لـ365 يوم')
    const scope = branchScopeOf(user)
    const today = localDateOf(new Date())
    const params: unknown[] = [today, window]
    let inBranch = ''
    if (branchId !== undefined && branchId !== '') {
      const wanted = Number(branchId)
      if (!Number.isInteger(wanted) || wanted < 1) throw new BadRequestException('رقم الفرع غير صالح')
      if (!inBranchScope(scope, wanted)) throw new ForbiddenException(`الفرع خارج نطاق ${scopeWord(scope)}`)
      inBranch = `AND e.[branchId] = @${params.push(wanted) - 1}`
    }
    const manager = this.docs.manager
    const linked = (await documentExpiryReady(manager)) && (await tasksTableReady(manager))
    const settings = await docTypeExpirySettings(manager)
    const rows: Array<Record<string, any>> = await manager.query(
      `SELECT d.[id] AS [id], d.[employeeId] AS [employeeId], e.[employeeCode] AS [employeeCode], e.[fullName] AS [employeeName], e.[branchId] AS [branchId],
              b.[name] AS [branchName], d.[docType] AS [docType], CONVERT(nvarchar(10), d.[expiryDate], 23) AS [expiryDate]${
                linked ? ', k.[id] AS [taskId], k.[status] AS [taskStatus]' : ''}
       FROM [employee_documents] d INNER JOIN [employees] e ON e.[id] = d.[employeeId] LEFT JOIN [branches] b ON b.[id] = e.[branchId]
       ${linked ? 'LEFT JOIN [tasks] k ON k.[id] = d.[renewalTaskId]' : ''}
       WHERE d.[expiryDate] IS NOT NULL AND d.[expiryDate] <= DATEADD(day, @1, CONVERT(date, @0, 23)) AND ${currentEmployeeSql('e.')}
         AND NOT ${supersededSql('d')} ${andBranchScopeSql('e.[branchId]', scope, params)} ${inBranch}
       ORDER BY d.[expiryDate], d.[id]`, params)
    const list = rows.map(row => {
      const type = settings.get(String(row.docType)), daysLeft = daysUntil(today, row.expiryDate)
      return {
        id: Number(row.id), employeeId: Number(row.employeeId), employeeCode: row.employeeCode, employeeName: row.employeeName,
        branchId: row.branchId == null ? null : Number(row.branchId), branchName: row.branchName ?? null,
        docType: row.docType, typeName: type?.nameAr ?? row.docType, expiryDate: row.expiryDate, daysLeft, state: daysLeft < 0 ? 'EXPIRED' as const : 'EXPIRING' as const,
        ownerRole: type?.ownerRole ?? null, ownerRoleLabel: type?.ownerRole ? TASK_ROLE_LABELS[type.ownerRole as keyof typeof TASK_ROLE_LABELS] ?? type.ownerRole : null,
        renewalTask: row.taskId ? { id: Number(row.taskId), status: String(row.taskStatus) } : null,
      }
    })
    return { date: today, days: window, summary: { expired: list.filter(row => row.state === 'EXPIRED').length, expiring: list.filter(row => row.state === 'EXPIRING').length }, rows: list }
  }

  // ===== B2.15: إعدادات انتهاء نوع المستند (له انتهاء، أيام التنبيه، الدور المسؤول) =====
  @Perm('settings.manage')
  @Get('expiry-settings')
  async expirySettings() {
    const manager = this.docs.manager
    const ready = await documentExpiryReady(manager)
    return {
      ready, roles: FUNCTIONAL_APPROVER_ROLES.map(role => ({ role, label: TASK_ROLE_LABELS[role] })),
      types: [...(await docTypeExpirySettings(manager)).values()].sort((a, b) => a.nameAr.localeCompare(b.nameAr, 'ar')),
    }
  }

  @Perm('settings.manage')
  @Patch('expiry-settings/:id')
  async updateExpirySettings(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
    const raw = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {}
    const manager = this.docs.manager
    if (![...(await docTypeExpirySettings(manager)).values()].some(type => type.id === id)) throw new NotFoundException('نوع المستند غير موجود')
    await writeDocTypeExpiry(manager, id, { hasExpiry: raw.hasExpiry, alertDays: raw.alertDays, ownerRole: raw.ownerRole })
    return [...(await docTypeExpirySettings(manager)).values()].find(type => type.id === id)
  }

  private async assertExpiryRule(docType: string, expiryDate: string | null | undefined) {
    if (expiryDate) return
    if ((await docTypeExpirySettings(this.docs.manager)).get(docType)?.hasExpiry) throw new BadRequestException(DOCUMENT_EXPIRY_REQUIRED)
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
    await this.assertExpiryRule(dto.docType, dto.expiryDate)
    const saved = await this.docs.manager.transaction(async em => {
      await linkEmployeeFiles(em, dto.employeeId, [dto.fileRef], user.sub)
      return em.save(EmployeeDocument, em.create(EmployeeDocument, dto))
    })
    await this.syncHiringDocs(saved.employeeId)
    return saved
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
    // B2.15: النوع اللي «له انتهاء» تاريخه إلزامي (على القيم بعد الدمج)
    await this.assertExpiryRule(docType !== undefined ? docType : doc.docType, expiry)
    // المستند اتجدد = تاريخ انتهائه اتأخّر لبعد النهارده: مهمة تجديده المفتوحة بتتقفل في نفس المعاملة
    const renewed = !!expiry && expiry > localDateOf(new Date()) && (!doc.expiryDate || expiry > String(doc.expiryDate).slice(0, 10))
    for (const [key, value] of Object.entries(changes)) {
      if (value !== undefined) Object.assign(doc, { [key]: value })
    }
    const saved = await this.docs.manager.transaction(async em => {
      if (renewed) await closeRenewalTask(em, doc.id, user)
      if (fileRef !== undefined && fileRef !== null) await linkEmployeeFiles(em, doc.employeeId, [fileRef], user.sub)
      return em.save(EmployeeDocument, doc)
    })
    await this.syncHiringDocs(saved.employeeId)
    return saved
  }

  // «استلام مسوغات التعيين» في تهيئة الموظف: بتكتمل لوحدها لما آخر مستند مطلوب يترفع وترجع مفتوحة لو النوع أو الملف اتغيّر.
  // بعد حفظ المستند وبأفضل جهد: فشلها مايرجّعش الحفظ، وقائمة التهيئة بتعيد الحساب مع كل قراءة
  private async syncHiringDocs(employeeId: number) {
    try {
      await syncHiringDocsTasks(this.docs.manager, [employeeId])
    } catch (e) {
      this.logger.warn(`تعذر تحديث مهمة مسوغات التعيين للموظف ${employeeId}: ${(e as Error).message}`)
    }
  }

  // نطاق الفروع: غير super_admin يدير مستندات موظفي فروعه فقط
  private async employeeInScope(user: JwtPayload, employeeId: number) {
    const emp = await this.employees.findOne({ where: { id: employeeId } })
    if (!emp) throw new BadRequestException('الموظف غير موجود')
    const scope = branchScopeOf(user)
    if (!inBranchScope(scope, emp.branchId)) {
      throw new ForbiddenException(`الموظف خارج نطاق ${scopeWord(scope)}`)
    }
    return emp
  }
}

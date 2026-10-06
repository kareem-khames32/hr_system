import { Body, Controller, Get, Logger, Param, ParseIntPipe, Patch, Post, Query, Res, UseGuards } from '@nestjs/common'
import type { Response } from 'express'
import { IsArray, IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, Matches, MaxLength, Min, ValidateIf } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import type { HrDocumentCategory } from './hr-document.entities'
import { HrDocumentsService } from './hr-documents.service'
import { RequireModule } from '../modules-registry/module.guard'
import { sendVerifiedFile } from './document-acknowledgements'

class CreateHrTemplateDto {
  @IsString() @MaxLength(150) name: string
  @IsIn(['contract', 'acknowledgement', 'certificate', 'general']) category: HrDocumentCategory
  @IsObject() draft: Record<string, unknown>
  @ValidateIf((_object, value) => value !== undefined) @IsArray() customFields?: unknown[]
  @ValidateIf((_object, value) => value !== undefined) @IsBoolean() isActive?: boolean
}
class UpdateHrTemplateDto {
  @IsInt() @Min(1) version: number
  @ValidateIf((_object, value) => value !== undefined) @IsString() @MaxLength(150) name?: string
  @ValidateIf((_object, value) => value !== undefined) @IsIn(['contract', 'acknowledgement', 'certificate', 'general']) category?: HrDocumentCategory
  @ValidateIf((_object, value) => value !== undefined) @IsObject() draft?: Record<string, unknown>
  @ValidateIf((_object, value) => value !== undefined) @IsArray() customFields?: unknown[]
  @ValidateIf((_object, value) => value !== undefined) @IsBoolean() isActive?: boolean
}
class PublishHrTemplateDto { @IsInt() @Min(1) version: number }
class SampleHrTemplateDto {
  @IsObject() draft: Record<string, unknown>
  @ValidateIf((_object, value) => value !== undefined) @IsArray() customFields?: unknown[]
}
class PreviewHrDocumentDto {
  @IsInt() @Min(1) templateId: number
  @IsInt() @Min(1) revisionId: number
  @IsOptional() @IsInt() @Min(1) employeeId?: number | null
  @IsObject() values: Record<string, string>
}
class IssueHrDocumentDto extends PreviewHrDocumentDto {
  @IsUUID() idempotencyKey: string
  // B2.7-ب: مطلوب إقرار الموظف، وآخر موعد اختياري
  @IsOptional() @IsBoolean() requireAck?: boolean
  @IsOptional() @ValidateIf((_object, value) => value !== null) @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'موعد الإقرار بصيغة YYYY-MM-DD' }) ackDueDate?: string | null
}
class AcknowledgeHrDocumentDto {
  // بصمة الملف اللي اتعرض للموظف (من رد قراءة المستند)
  @Matches(/^[a-f0-9]{64}$/, { message: 'بصمة المستند غير صالحة' }) contentHash: string
}

@RequireModule('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('hr-documents')
export class HrDocumentsController {
  private readonly logger = new Logger(HrDocumentsController.name)

  constructor(private readonly service: HrDocumentsService) {}

  @Perm('settings.manage') @Get('templates/catalog')
  catalog() { return this.service.catalog() }

  @Perm('settings.manage') @Post('templates')
  create(@Body() dto: CreateHrTemplateDto, @CurrentUser() user: JwtPayload) { return this.service.create(dto, user.sub) }

  @Perm('settings.manage') @Patch('templates/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateHrTemplateDto, @CurrentUser() user: JwtPayload) { return this.service.update(id, dto, user.sub) }

  @Perm('settings.manage') @Post('templates/:id/publish')
  publish(@Param('id', ParseIntPipe) id: number, @Body() dto: PublishHrTemplateDto, @CurrentUser() user: JwtPayload) { return this.service.publish(id, dto.version, user.sub) }

  @Perm('settings.manage') @Post('templates/preview')
  async samplePreview(@Body() dto: SampleHrTemplateDto, @Res() res: Response) {
    this.pdf(res, await this.service.samplePreview(dto.draft, dto.customFields ?? []), 'hr-template-preview.pdf')
  }

  @Perm('documents.manage') @Get('templates')
  published() { return this.service.catalog(true) }

  @Perm('documents.manage') @Get('employees')
  employees(@CurrentUser() user: JwtPayload) { return this.service.employees(user) }

  @Perm('documents.manage') @Post('preview')
  async preview(@CurrentUser() user: JwtPayload, @Body() dto: PreviewHrDocumentDto, @Res() res: Response) {
    this.pdf(res, await this.service.preview(user, dto), 'hr-document-preview.pdf')
  }

  @Perm('documents.manage') @Post('issue')
  issue(@CurrentUser() user: JwtPayload, @Body() dto: IssueHrDocumentDto) { return this.service.issue(user, dto) }

  @Perm('documents.manage') @Get('issued')
  issued(@CurrentUser() user: JwtPayload, @Query('employeeId') employeeId?: string, @Query('ack') ack?: string) {
    return this.service.issued(user, employeeId === undefined ? undefined : /^\d+$/.test(employeeId) ? Number(employeeId) : NaN, ack)
  }

  // Owners use the employee portal; managers follow current branch/finance access.
  @Get('issued/:id/download')
  async download(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const { file, path, verified } = await this.service.fileFor(user, id)
    if (!verified) {
      this.headers(res, file.originalName)
      res.sendFile(path)
      return
    }
    // B2.7-ب: مستند مطلوب إقراره — بصمته اتطابقت في الخدمة، والإرسال بالتدفق وبيتحقق تاني وهو ماشي بالحجم المعلَن (زي ملف السياسة)
    sendVerifiedFile(res, file.storedName, verified, () => this.headers(res, file.originalName),
      () => this.logger.error(`ملف المستند ${id} اتبدّل على التخزين بعد التحقق من بصمته — الرد اتقطع قبل ما يكمل`))
  }

  // ===== B2.7-ب: إقرار الموظف بالمستند (لنفسه، من غير صلاحية — الفحص في الخدمة) =====
  @Get('mine/acknowledgements')
  myAcknowledgements(@CurrentUser() user: JwtPayload) { return this.service.myAcknowledgements(user) }

  @Get('issued/:id/acknowledgement')
  acknowledgementOf(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) { return this.service.acknowledgementOf(user, id) }

  @Post('issued/:id/acknowledge')
  acknowledge(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: AcknowledgeHrDocumentDto) {
    return this.service.acknowledge(user, id, dto.contentHash)
  }

  @Perm('documents.manage') @Post('issued/:id/acknowledgement/cancel')
  cancelAcknowledgement(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) { return this.service.cancelAcknowledgement(user, id) }

  private headers(res: Response, name: string) {
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(name)}`)
  }
  private pdf(res: Response, bytes: Uint8Array, name: string) { this.headers(res, name); res.send(Buffer.from(bytes)) }
}

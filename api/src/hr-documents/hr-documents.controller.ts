import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Res, UseGuards } from '@nestjs/common'
import type { Response } from 'express'
import { IsArray, IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, MaxLength, Min, ValidateIf } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import type { HrDocumentCategory } from './hr-document.entities'
import { HrDocumentsService } from './hr-documents.service'

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
class IssueHrDocumentDto extends PreviewHrDocumentDto { @IsUUID() idempotencyKey: string }

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('hr-documents')
export class HrDocumentsController {
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
  issued(@CurrentUser() user: JwtPayload, @Query('employeeId') employeeId?: string) {
    return this.service.issued(user, employeeId === undefined ? undefined : /^\d+$/.test(employeeId) ? Number(employeeId) : NaN)
  }

  // Owners use the employee portal; managers follow current branch/finance access.
  @Get('issued/:id/download')
  async download(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const { file, path } = await this.service.fileFor(user, id)
    this.headers(res, file.originalName)
    res.sendFile(path)
  }

  private headers(res: Response, name: string) {
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(name)}`)
  }
  private pdf(res: Response, bytes: Uint8Array, name: string) { this.headers(res, name); res.send(Buffer.from(bytes)) }
}

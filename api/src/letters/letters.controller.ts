import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Res, UseGuards } from '@nestjs/common'
import { Response } from 'express'
import { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { LettersService } from './letters.service'
import { LetterTemplatesService } from './letter-templates.service'
import { IsBoolean, IsInt, IsObject, IsString, MaxLength, Min, ValidateIf } from 'class-validator'

class CreateTemplateDto {
  @IsString() @MaxLength(150) name: string
  @IsObject() draft: Record<string, unknown>
}
class UpdateTemplateDto {
  @IsInt() @Min(1) version: number
  @ValidateIf((_object, value) => value !== undefined) @IsString() @MaxLength(150) name?: string
  @ValidateIf((_object, value) => value !== undefined) @IsObject() draft?: Record<string, unknown>
  @ValidateIf((_object, value) => value !== undefined) @IsBoolean() isActive?: boolean
}
class PublishTemplateDto { @IsInt() @Min(1) version: number }
class BindTemplateDto { @IsInt() @Min(1) templateId: number }
class PreviewTemplateDto { @IsObject() draft: Record<string, unknown> }

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('letters')
export class LettersController {
  constructor(private readonly letters: LettersService, private readonly templates: LetterTemplatesService) {}

  @Perm('settings.manage') @Get('templates')
  catalog() { return this.templates.catalog() }

  @Perm('settings.manage') @Post('templates')
  create(@Body() dto: CreateTemplateDto, @CurrentUser() user: JwtPayload) { return this.templates.create(dto, user.sub) }

  @Perm('settings.manage') @Patch('templates/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTemplateDto, @CurrentUser() user: JwtPayload) { return this.templates.update(id, dto, user.sub) }

  @Perm('settings.manage') @Post('templates/:id/publish')
  publish(@Param('id', ParseIntPipe) id: number, @Body() dto: PublishTemplateDto, @CurrentUser() user: JwtPayload) { return this.templates.publish(id, dto.version, user.sub) }

  @Perm('settings.manage') @Patch('template-bindings/:code')
  bind(@Param('code') code: string, @Body() dto: BindTemplateDto) { return this.templates.bind(code, dto.templateId) }

  @Perm('settings.manage') @Post('templates/preview')
  async preview(@Body() dto: PreviewTemplateDto, @Res() res: Response) {
    const pdf = await this.templates.preview(dto.draft)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('Content-Disposition', 'inline; filename="template-preview.pdf"')
    res.send(Buffer.from(pdf))
  }

  @Get(':id/download')
  async download(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const { file, path } = await this.letters.fileFor(user, id)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`)
    res.sendFile(path)
  }
}

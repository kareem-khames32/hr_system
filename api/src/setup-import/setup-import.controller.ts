import { Controller, HttpCode, Param, Post, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import type { Response } from 'express'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { BULK_UPDATE_MAX_FILE_BYTES } from '../employees/employee-bulk-update.fields'
import { RequireModule } from '../modules-registry/module.guard'
import { SetupImportService, type ImportUploadedFile } from './setup-import.service'

// الملف بيتقري من الذاكرة (مش بيتخزن): ملف واحد بحد 5 ميجا — نفس حد «التحديث الجماعي»
const upload = () => FileInterceptor('file', { limits: { fileSize: BULK_UPDATE_MAX_FILE_BYTES, files: 1, fields: 5 } })

// B6.1 (ب): مستوردات تجهيز العميل من Excel (الهيكل والموظفين) — بصلاحية الإعدادات ولحساب بكل الفروع (الحكم في الخدمة)
@RequireModule('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('setup-import')
export class SetupImportController {
  constructor(private readonly service: SetupImportService) {}

  @Perm('settings.manage')
  @Post(':kind/template')
  @HttpCode(200)
  async template(@CurrentUser() user: JwtPayload, @Param('kind') kind: string, @Res() res: Response) {
    const file = await this.service.template(user, kind)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${file.asciiName}"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`)
    res.setHeader('Cache-Control', 'no-store')
    res.send(file.buffer)
  }

  // المعاينة: مفيش أي حفظ
  @Perm('settings.manage')
  @Post(':kind/preview')
  @HttpCode(200)
  @UseInterceptors(upload())
  preview(@CurrentUser() user: JwtPayload, @Param('kind') kind: string, @UploadedFile() file: ImportUploadedFile | undefined) {
    return this.service.preview(user, kind, file)
  }

  @Perm('settings.manage')
  @Post(':kind/apply')
  @HttpCode(200)
  @UseInterceptors(upload())
  apply(@CurrentUser() user: JwtPayload, @Param('kind') kind: string, @UploadedFile() file: ImportUploadedFile | undefined) {
    return this.service.apply(user, kind, file)
  }
}

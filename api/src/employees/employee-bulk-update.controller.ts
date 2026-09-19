import { Body, Controller, HttpCode, Post, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import type { Response } from 'express'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { BulkUpdateOptionsDto, BulkUpdateTemplateDto } from './employee-bulk-update.dto'
import { BULK_UPDATE_MAX_FILE_BYTES } from './employee-bulk-update.fields'
import { EmployeeBulkUpdateService, type BulkUploadedFile } from './employee-bulk-update.service'

// الملف بيتقري من الذاكرة (مش بيتخزن): ملف واحد بحد 5 ميجا
const upload = () => FileInterceptor('file', { limits: { fileSize: BULK_UPDATE_MAX_FILE_BYTES, files: 1, fields: 20 } })

// تحديث بيانات مجموعة موظفين من ملف Excel/CSV بكود الموظف — نفس صلاحية تعديل الموظف، وعزل الفرع في الخدمة؛
// أعمدة الراتب محتاجة كمان «اعتماد المسير» (زي تعديل الأجر من ملف الموظف)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees/bulk-update')
export class EmployeeBulkUpdateController {
  constructor(private readonly bulk: EmployeeBulkUpdateService) {}

  @Perm('employees.edit')
  @Post('template')
  @HttpCode(200)
  async template(@Body() body: BulkUpdateTemplateDto, @CurrentUser() user: JwtPayload, @Res() res: Response) {
    const file = await this.bulk.template(body, user)
    const ascii = file.fileName.endsWith('.csv') ? 'employees-update-template.csv' : 'employees-update-template.xlsx'
    res.setHeader('Content-Type', file.contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`)
    res.setHeader('Cache-Control', 'no-store')
    res.send(file.buffer)
  }

  // المعاينة: مفيش أي حفظ — لكل صف الموظف والتغييرات (القديم ← الجديد) والأخطاء
  @Perm('employees.edit')
  @Post('preview')
  @UseInterceptors(upload())
  preview(@UploadedFile() file: BulkUploadedFile | undefined, @Body() body: BulkUpdateOptionsDto, @CurrentUser() user: JwtPayload) {
    return this.bulk.preview(file, body, user)
  }

  // التطبيق: الصفوف السليمة بس (أو المطلوبة منها في الدفعة)، كل موظف في معاملته
  @Perm('employees.edit')
  @Post('apply')
  @UseInterceptors(upload())
  apply(@UploadedFile() file: BulkUploadedFile | undefined, @Body() body: BulkUpdateOptionsDto, @CurrentUser() user: JwtPayload) {
    return this.bulk.apply(file, body, user)
  }
}

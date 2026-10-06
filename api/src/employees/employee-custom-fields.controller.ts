import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, UseGuards } from '@nestjs/common'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { EmployeeCustomFieldsService } from './employee-custom-fields.service'
import type { CustomFieldInput } from './employee-custom-fields.service'

// B2.9 الجزء ب: تعريف الحقول المخصصة (الإعدادات)، وقيم الموظف (ملفه). القواعد كلها في الخدمة.

@RequireModule('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Perm('settings.manage')
@Controller('settings/employee-fields')
export class EmployeeFieldsSettingsController {
  constructor(private readonly fields: EmployeeCustomFieldsService) {}

  @Get()
  list() {
    return this.fields.definitions()
  }

  // لمحرر جمهور نوع الطلب: الحقول اللي ينفع تبقى شرط بس (من غير المقيّد)
  @Perm('settings.manage', 'request_types.manage')
  @Get('audience')
  audienceOptions() {
    return this.fields.audienceOptions()
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() body: CustomFieldInput) {
    return this.fields.create(user, body ?? {})
  }

  @Patch(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() body: CustomFieldInput) {
    return this.fields.update(user, id, body ?? {})
  }
}

@RequireModule('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees/:id/custom-fields')
export class EmployeeCustomFieldsController {
  constructor(private readonly fields: EmployeeCustomFieldsService) {}

  // صاحب الملف أو «عرض الموظفين» في النطاق — الفحص في الخدمة (قاعدة ملف الموظف)
  @Get()
  values(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.fields.valuesFor(user, id)
  }

  @Perm('employees.edit')
  @Put()
  save(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() body: { values?: unknown }) {
    return this.fields.save(user, id, body?.values)
  }
}

import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common'
import { RequireModule } from '../modules-registry/module.guard'
import { Integration, IntegrationKeyGuard, RequireScope } from './integration-key.guard'
import type { IntegrationIdentity } from './integration-keys'
import { PublicApiService } from './public-api.service'

// B6.3 (أ): الـAPI العام `/public/v1` — للقراءة بس، بمفتاح تكامل (مش جلسة مستخدم): الحارس بيتحقق من المفتاح وحد الطلبات ونطاق القراءة،
// والخدمة بتحط نطاق فروع المفتاح في جملة القراءة. الموديول المقفول = 404 (حارس الموديولات). مفيش مسار كتابة هنا.
@RequireModule('integrations')
@UseGuards(IntegrationKeyGuard)
@Controller('public/v1')
export class PublicApiController {
  constructor(private readonly service: PublicApiService) {}

  // وصف المسارات: لأي مفتاح صالح (من غير نطاق)
  @Get('openapi.json')
  openapi() {
    return this.service.openapi()
  }

  @RequireScope('employees.read')
  @Get('employees')
  employees(@Integration() integration: IntegrationIdentity, @Query() query: Record<string, unknown>) {
    return this.service.employees(integration, query)
  }

  @RequireScope('employees.read')
  @Get('employees/:id')
  employee(@Integration() integration: IntegrationIdentity, @Param('id', ParseIntPipe) id: number) {
    return this.service.employee(integration, id)
  }

  @RequireScope('structure.read')
  @Get('structure')
  structure(@Integration() integration: IntegrationIdentity) {
    return this.service.structure(integration)
  }

  // B6.3 (ب): كل قراءة كمان ورا موديول بياناتها — الموديول المقفول = 404 للمسار ده
  @RequireModule('integrations', 'attendance')
  @RequireScope('attendance.read')
  @Get('attendance')
  attendance(@Integration() integration: IntegrationIdentity, @Query() query: Record<string, unknown>) {
    return this.service.attendance(integration, query)
  }

  @RequireModule('integrations', 'leave')
  @RequireScope('leaves.read')
  @Get('leaves')
  leaves(@Integration() integration: IntegrationIdentity, @Query() query: Record<string, unknown>) {
    return this.service.leaves(integration, query)
  }

  @RequireModule('integrations', 'payroll')
  @RequireScope('payroll.read')
  @Get('payroll/runs')
  payrollRuns(@Integration() integration: IntegrationIdentity, @Query() query: Record<string, unknown>) {
    return this.service.payrollRuns(integration, query)
  }
}

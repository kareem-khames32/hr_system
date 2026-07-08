import {
  BadRequestException,
  Body,
  Controller,
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
import { IsInt, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'
import { Type } from 'class-transformer'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { EmployeeDocument } from './assets.entities'

class CreateDocumentDto {
  @Type(() => Number)
  @IsInt({ message: 'الموظف مطلوب' })
  employeeId: number

  @IsString({ message: 'نوع المستند مطلوب' })
  @MinLength(2)
  @MaxLength(100)
  docType: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  number?: string

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'تاريخ الإصدار YYYY-MM-DD' })
  issueDate?: string

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'تاريخ الانتهاء YYYY-MM-DD' })
  expiryDate?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  fileRef?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
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
    const scope = branchScopeOf(user)
    const emps = await this.employees.find({
      where: scope !== null ? { branchId: scope } : {},
    })
    const empById = new Map(emps.map((e) => [e.id, e]))
    const where: Record<string, unknown> = {}
    if (scope !== null) where.employeeId = In(emps.map((e) => e.id))
    if (employeeId) where.employeeId = Number(employeeId)
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

  @Roles('super_admin', 'hr_manager', 'branch_manager')
  @Post()
  async create(@Body() dto: CreateDocumentDto) {
    const emp = await this.employees.findOne({ where: { id: dto.employeeId } })
    if (!emp) throw new BadRequestException('الموظف غير موجود')
    if (dto.issueDate && dto.expiryDate && dto.expiryDate < dto.issueDate) {
      throw new BadRequestException('تاريخ الانتهاء قبل تاريخ الإصدار')
    }
    return this.docs.save(this.docs.create(dto))
  }

  @Roles('super_admin', 'hr_manager', 'branch_manager')
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateDocumentDto>
  ) {
    const doc = await this.docs.findOne({ where: { id } })
    if (!doc) throw new NotFoundException('المستند غير موجود')
    Object.assign(doc, dto)
    return this.docs.save(doc)
  }
}

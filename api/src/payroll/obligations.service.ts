import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import {
  EmployeeObligation,
  ObligationType,
} from '../requests/entities/financial.entities'

// دفتر المديونيات/المستحقات: أحداث مالية لمرة واحدة (خصم/إضافة) يديرها المسير
@Injectable()
export class ObligationsService {
  constructor(
    @InjectRepository(EmployeeObligation)
    private readonly repo: Repository<EmployeeObligation>
  ) {}

  async create(
    user: JwtPayload,
    dto: {
      employeeId: number
      type: ObligationType
      amount: number
      label: string
      category?: string
      effectiveDate?: string
    }
  ) {
    const amount = Number(dto.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('المبلغ يجب أن يكون رقماً أكبر من صفر')
    }
    if (dto.type !== 'DEBIT' && dto.type !== 'CREDIT') {
      throw new BadRequestException('النوع: DEBIT (خصم) أو CREDIT (إضافة)')
    }
    // DD-05 / الخطوة 25: لا خصم مباشر بلا نوع ولا اعتماد — الخصم يُنشأ من «الخصومات المصنفة»
    if (dto.type === 'DEBIT') {
      throw new ForbiddenException({
        code: 'OBLIGATION_DIRECT_DEBIT_LOCKED',
        message: 'إنشاء خصم مباشر في دفتر المديونيات مقفل؛ أنشئ الخصم من شاشة الخصومات المصنفة بنوعه ودورة اعتماده',
      })
    }
    // C4 / الخطوة 27: المكافأة الفردية تحتاج اعتمادًا — لا قيد مكافأة مباشر بلا مستفيد مختار ونطاق وفترة وسلسلة
    if (['bonus', 'bonus_reversal'].includes(String(dto.category ?? '').trim().toLowerCase())) {
      throw new ForbiddenException({
        code: 'OBLIGATION_DIRECT_BONUS_LOCKED',
        message: 'قيد المكافأة المباشر في دفتر المديونيات مقفل؛ اقترح المكافأة من شاشة المكافآت لتمر بدورة اعتمادها',
      })
    }
    if (!dto.employeeId) throw new BadRequestException('الموظف مطلوب')
    await this.assertEmployeeInScope(user, Number(dto.employeeId))
    if (!String(dto.label ?? '').trim()) {
      throw new BadRequestException('وصف المديونية مطلوب')
    }
    return this.repo.save(
      this.repo.create({
        employeeId: Number(dto.employeeId),
        type: dto.type,
        category: (dto.category ?? 'manual').trim() || 'manual',
        amount: Math.round(amount * 100) / 100,
        label: String(dto.label).trim(),
        effectiveDate: dto.effectiveDate || (null as any),
        createdByUserId: user.sub,
        status: 'PENDING',
      })
    )
  }

  // نطاق الفرع (SEC-04): الصرف يستهلك هذه القيود ويغيّر الصافي → لا قراءة ولا
  // إنشاء ولا إلغاء لقيد موظف خارج فرع المستخدم (مدير النظام بلا نطاق)
  private async assertEmployeeInScope(user: JwtPayload, employeeId: number) {
    const employee = await this.repo.manager.findOne(Employee, {
      where: { id: employeeId },
      select: { id: true, branchId: true },
    })
    if (!employee) throw new NotFoundException('الموظف غير موجود')
    const scope = branchScopeOf(user)
    if (scope !== null && employee.branchId !== scope) {
      throw new ForbiddenException('الموظف خارج نطاق فرعك — لا يمكنك إدارة مديونياته')
    }
    return employee
  }

  async listByEmployee(user: JwtPayload, employeeId: number) {
    await this.assertEmployeeInScope(user, employeeId)
    return this.repo.find({
      where: { employeeId },
      order: { id: 'DESC' },
    })
  }

  async cancel(user: JwtPayload, id: number) {
    const row = await this.repo.findOne({ where: { id } })
    if (!row) throw new NotFoundException('المديونية غير موجودة')
    await this.assertEmployeeInScope(user, row.employeeId)
    if (row.status === 'APPLIED') {
      throw new BadRequestException('طُبِّقت في مسير مصروف — لا يمكن إلغاؤها')
    }
    if (row.status === 'CANCELLED') return row
    row.status = 'CANCELLED'
    return this.repo.save(row)
  }
}

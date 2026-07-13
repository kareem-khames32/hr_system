import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
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
    if (!dto.employeeId) throw new BadRequestException('الموظف مطلوب')
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

  listByEmployee(employeeId: number) {
    return this.repo.find({
      where: { employeeId },
      order: { id: 'DESC' },
    })
  }

  async cancel(id: number) {
    const row = await this.repo.findOne({ where: { id } })
    if (!row) throw new NotFoundException('المديونية غير موجودة')
    if (row.status === 'APPLIED') {
      throw new BadRequestException('طُبِّقت في مسير مصروف — لا يمكن إلغاؤها')
    }
    if (row.status === 'CANCELLED') return row
    row.status = 'CANCELLED'
    return this.repo.save(row)
  }
}

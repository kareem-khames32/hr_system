import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, Repository } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, inBranchScope, scopeWord, userHasPerm } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { roundPayrollMoney } from './payroll-money'
import { lockPayrollEmployees } from './payroll-settlement-boundary'
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
    const employeeId = Number(dto.employeeId)
    await this.assertEmployeeInScope(user, employeeId)
    if (!String(dto.label ?? '').trim()) {
      throw new BadRequestException('وصف المديونية مطلوب')
    }
    // CR29-B01 (مراجعة Codex الجولة 29): نقل الموظف لفرع تاني بياخد قفله المالي لآخر معاملته، فالقيد بيتحفظ جوه معاملة بالقفل ده
    // والنطاق بيتقرا تاني تحته — قبل كده الفحص والحفظ كانوا منفصلين، فنقل بيتحفظ بينهم والقيد يتسجل بصلاحية الفرع القديم.
    // الفحص الأول قبل القفل عشان اللي مالوش نطاق ياخد رده من غير ما يستنى قفل حد
    return this.repo.manager.transaction(async em => {
      await lockPayrollEmployees(em, [employeeId])
      await this.assertEmployeeInScope(user, employeeId, em)
      const repo = em.getRepository(EmployeeObligation)
      return repo.save(
        repo.create({
          employeeId,
          type: dto.type,
          category: (dto.category ?? 'manual').trim() || 'manual',
          amount: roundPayrollMoney(amount),
          label: String(dto.label).trim(),
          effectiveDate: dto.effectiveDate || (null as any),
          createdByUserId: user.sub,
          status: 'PENDING',
        })
      )
    })
  }

  // نطاق الفرع (SEC-04): الصرف يستهلك هذه القيود ويغيّر الصافي → لا قراءة ولا
  // إنشاء ولا إلغاء لقيد موظف خارج فرع المستخدم (مدير النظام بلا نطاق)
  private async assertEmployeeInScope(user: JwtPayload, employeeId: number, em: EntityManager = this.repo.manager) {
    const employee = await em.findOne(Employee, {
      where: { id: employeeId },
      select: { id: true, branchId: true },
    })
    if (!employee) throw new NotFoundException('الموظف غير موجود')
    const scope = branchScopeOf(user)
    if (!inBranchScope(scope, employee.branchId)) {
      throw new ForbiddenException(`الموظف خارج نطاق ${scopeWord(scope)} — لا يمكنك إدارة مديونياته`)
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
    // صف القيد (مبلغه وسببه ومسيره) لقارئ الرواتب بس — صلاحية الحساب لوحدها بتلغي وبتاخد رقم القيد وحالته
    // (GET /obligations/employee/:id نفسه محتاج عرض مسيرات الرواتب)
    const view = (saved: EmployeeObligation) => userHasPerm(user, 'payroll.view') ? saved : { id: saved.id, status: saved.status }
    // CR29-B01: الإلغاء تحت قفل الموظف المالي (النقل بياخده)، والنطاق والحالة بيتقروا تاني تحته
    return this.repo.manager.transaction(async em => {
      await lockPayrollEmployees(em, [row.employeeId])
      await this.assertEmployeeInScope(user, row.employeeId, em)
      const repo = em.getRepository(EmployeeObligation)
      const current = await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!current || current.employeeId !== row.employeeId) throw new NotFoundException('المديونية غير موجودة')
      if (current.status === 'APPLIED') {
        throw new BadRequestException('طُبِّقت في مسير مصروف — لا يمكن إلغاؤها')
      }
      if (current.status === 'CANCELLED') return view(current)
      current.status = 'CANCELLED'
      return view(await repo.save(current))
    })
  }
}

import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, inBranchScope, userHasPerm } from '../auth/guards'
import { Employee } from './employee.entity'
import { EmployeeCustomField, EmployeeCustomValue } from './employee-custom-fields.entities'
import {
  audienceCustomFieldsOf, cleanCustomFieldOptions, customFieldOptions, customFieldsReady, customValueColumns, customValueOf,
  CUSTOM_FIELD_KEY, CUSTOM_FIELD_TYPES, CUSTOM_FIELDS_MAX, CUSTOM_FIELDS_MIGRATION_MISSING,
} from './employee-custom-fields'

// B2.9 الجزء ب: الحقول المخصصة على ملف الموظف.
//  التعريف (الإعدادات، settings.manage): مفتاح ونوع مابيتغيّروش بعد الإنشاء، والحقل مابيتمسحش (بيتعطّل وقيمه بتفضل).
//  القيم: القراءة بقاعدة ملف الموظف نفسها (GET /employees/:id): صاحب الملف أو «عرض الموظفين»، وفي نطاق فروع الحساب. الحقل المقيّد
//  للي معاه «تعديل الموظفين» بس (الموظف نفسه مايشوفوش). التعديل بـ«تعديل الموظفين» في النطاق، والحكم بفرع الموظف وصفه مقفول.
//  الإلزامي: أي حفظ لقيم موظف لازم يسيب كل حقل إلزامي نشط بقيمة؛ موظف محدش حفظ قيمه بيفضل زي ما هو.
//  قبل ترحيل 094: القراءة «مش متاحة» والحفظ مرفوض برسالته.

export interface CustomFieldInput { fieldKey?: string; label?: string; type?: string; options?: unknown; required?: boolean; restricted?: boolean; sortOrder?: number; isActive?: boolean }
const EMPLOYEE_NOT_FOUND = 'الموظف غير موجود'

@Injectable()
export class EmployeeCustomFieldsService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  private view(field: EmployeeCustomField) {
    return { id: field.id, fieldKey: field.fieldKey, label: field.label, type: field.type, options: customFieldOptions(field), required: field.required === true,
      restricted: field.restricted === true, sortOrder: field.sortOrder, isActive: field.isActive === true }
  }

  private label(raw: unknown): string {
    const label = typeof raw === 'string' ? raw.trim() : ''
    if (label.length < 2 || label.length > 100) throw new BadRequestException('اسم الحقل من حرفين لـ100 حرف')
    return label
  }

  // ===== تعريف الحقول =====
  async definitions() {
    if (!(await customFieldsReady(this.ds.manager))) return { available: false, fields: [] }
    const rows = await this.ds.getRepository(EmployeeCustomField).find({ order: { sortOrder: 'ASC', id: 'ASC' } })
    return { available: true, fields: rows.map(row => this.view(row)) }
  }

  /** الحقول اللي ينفع شرط جمهور يتحكم بيها (نشطة، غير مقيّدة، «اختيار» أو «نعم/لا») — لمحرر جمهور نوع الطلب */
  audienceOptions() {
    return audienceCustomFieldsOf(this.ds.manager)
  }

  async create(user: JwtPayload, input: CustomFieldInput) {
    if (!(await customFieldsReady(this.ds.manager))) throw new BadRequestException(CUSTOM_FIELDS_MIGRATION_MISSING)
    const fieldKey = typeof input.fieldKey === 'string' ? input.fieldKey.trim() : ''
    if (!CUSTOM_FIELD_KEY.test(fieldKey)) throw new BadRequestException('مفتاح الحقل: حروف إنجليزي صغيرة وأرقام و_ ، ويبدأ بحرف (من حرفين لـ40)')
    const type = String(input.type ?? '')
    if (!(CUSTOM_FIELD_TYPES as readonly string[]).includes(type)) throw new BadRequestException('نوع الحقل: نص، رقم، تاريخ، اختيار، أو نعم/لا')
    const label = this.label(input.label), options = cleanCustomFieldOptions(type, input.options)
    return this.ds.transaction(async em => {
      const repo = em.getRepository(EmployeeCustomField)
      // الإنشاء ورا بعض: العدّ والمفتاح والترتيب بيتحكموا والجدول مقفول
      const existing: Array<{ fieldKey: string; sortOrder: number }> = await em.query('SELECT [fieldKey], [sortOrder] FROM [employee_custom_fields] WITH (TABLOCKX, HOLDLOCK)')
      if (existing.some(row => row.fieldKey === fieldKey)) throw new ConflictException('فيه حقل بنفس المفتاح')
      if (existing.length >= CUSTOM_FIELDS_MAX) throw new BadRequestException(`الحقول المخصصة بحد أقصى ${CUSTOM_FIELDS_MAX}`)
      const sortOrder = Number.isSafeInteger(input.sortOrder) ? Number(input.sortOrder) : existing.reduce((max, row) => Math.max(max, Number(row.sortOrder)), 0) + 1
      const saved = await repo.save(repo.create({ fieldKey, label, type, options, required: input.required === true, restricted: input.restricted === true, sortOrder, isActive: true, createdAt: new Date() }))
      await recordAudit(em, { category: 'SETTINGS', action: 'EMPLOYEE_FIELD_CREATED', entityType: 'employee_custom_field', entityId: saved.id, actorUserId: user.sub,
        summary: `حقل جديد في ملف الموظف: ${label}`, after: this.view(saved) })
      return this.view(saved)
    })
  }

  async update(user: JwtPayload, id: number, input: CustomFieldInput) {
    if (!(await customFieldsReady(this.ds.manager))) throw new BadRequestException(CUSTOM_FIELDS_MIGRATION_MISSING)
    if (input.fieldKey !== undefined || input.type !== undefined) throw new BadRequestException('مفتاح الحقل ونوعه مابيتغيّروش بعد إنشائه')
    return this.ds.transaction(async em => {
      const repo = em.getRepository(EmployeeCustomField)
      const field = await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!field) throw new NotFoundException('الحقل غير موجود')
      const before = this.view(field)
      if (input.label !== undefined) field.label = this.label(input.label)
      if (input.options !== undefined) field.options = cleanCustomFieldOptions(field.type, input.options)
      if (input.required !== undefined) field.required = input.required === true
      if (input.restricted !== undefined) field.restricted = input.restricted === true
      if (input.isActive !== undefined) field.isActive = input.isActive === true
      if (input.sortOrder !== undefined) {
        if (!Number.isSafeInteger(input.sortOrder)) throw new BadRequestException('الترتيب رقم صحيح')
        field.sortOrder = Number(input.sortOrder)
      }
      const saved = await repo.save(field)
      await recordAudit(em, { category: 'SETTINGS', action: 'EMPLOYEE_FIELD_UPDATED', entityType: 'employee_custom_field', entityId: saved.id, actorUserId: user.sub,
        summary: `تعديل حقل في ملف الموظف: ${saved.label}`, before, after: this.view(saved) })
      return this.view(saved)
    })
  }

  // ===== قيم الموظف =====
  /** قيم حقول الموظف للقارئ ده — بقاعدة ملف الموظف نفسها: اللي مايشوفش الملف بياخد نفس رده */
  async valuesFor(user: JwtPayload, employeeId: number) {
    if (user.employeeId !== employeeId && !userHasPerm(user, 'employees.view')) throw new ForbiddenException('لا تملك صلاحية عرض الموظفين')
    const employee = await this.ds.getRepository(Employee).findOne({ where: { id: employeeId }, select: { id: true, branchId: true } })
    if (!employee || !inBranchScope(branchScopeOf(user), employee.branchId)) throw new NotFoundException(EMPLOYEE_NOT_FOUND)
    if (!(await customFieldsReady(this.ds.manager))) return { available: false, canEdit: false, fields: [] }
    const canEdit = userHasPerm(user, 'employees.edit')
    const fields = (await this.ds.getRepository(EmployeeCustomField).find({ where: { isActive: true }, order: { sortOrder: 'ASC', id: 'ASC' } }))
      // المقيّد للي يعدّل الملفات بس: لا تعريفه ولا قيمته بيرجعوا لغيره
      .filter(field => field.restricted !== true || canEdit)
    const values = fields.length ? await this.ds.getRepository(EmployeeCustomValue).find({ where: { employeeId } }) : []
    const byField = new Map(values.map(row => [row.fieldId, row]))
    return { available: true, canEdit, fields: fields.map(field => ({ ...this.view(field), value: customValueOf(field, byField.get(field.id)) })) }
  }

  /** حفظ قيم (المفاتيح المبعوتة بس). null أو فاضي = من غير قيمة. وبعد الحفظ كل حقل إلزامي نشط لازم يبقى بقيمة */
  async save(user: JwtPayload, employeeId: number, raw: unknown) {
    if (!(await customFieldsReady(this.ds.manager))) throw new BadRequestException(CUSTOM_FIELDS_MIGRATION_MISSING)
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new BadRequestException('قيم الحقول بصيغة غير صحيحة')
    const input = Object.entries(raw as Record<string, unknown>)
    await this.ds.transaction(async em => {
      // صف الموظف مقفول: الحكم بفرعه دلوقتي، وحفظين لنفس الموظف ورا بعض
      const employee = await em.getRepository(Employee).findOne({ where: { id: employeeId }, select: { id: true, branchId: true }, lock: { mode: 'pessimistic_write' } })
      if (!employee || !inBranchScope(branchScopeOf(user), employee.branchId)) throw new NotFoundException(EMPLOYEE_NOT_FOUND)
      const fields = await em.getRepository(EmployeeCustomField).find({ where: { isActive: true }, order: { sortOrder: 'ASC', id: 'ASC' } })
      const values = em.getRepository(EmployeeCustomValue)
      const byKey = new Map(fields.map(field => [field.fieldKey, field])), byField = new Map((await values.find({ where: { employeeId } })).map(row => [row.fieldId, row]))
      const filled = new Set(byField.keys())
      for (const [key, value] of input) {
        const field = byKey.get(key)
        if (!field) throw new BadRequestException(`حقل غير معروف أو متعطّل: ${key}`)
        const columns = customValueColumns(field, value), existing = byField.get(field.id)
        if (!columns) {
          filled.delete(field.id)
          if (existing) await values.delete({ id: existing.id })
        } else {
          filled.add(field.id)
          if (existing) await values.update({ id: existing.id }, { ...columns, updatedAt: new Date(), updatedByUserId: user.sub })
          else await values.insert({ employeeId, fieldId: field.id, ...columns, updatedAt: new Date(), updatedByUserId: user.sub })
        }
      }
      const missing = fields.find(field => field.required === true && !filled.has(field.id))
      if (missing) throw new BadRequestException(`«${missing.label}» حقل إلزامي`)
    })
    return this.valuesFor(user, employeeId)
  }
}

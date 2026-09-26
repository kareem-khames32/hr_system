import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { DataSource, EntityManager, In, IsNull, Not } from 'typeorm'
import { createHash, randomUUID } from 'crypto'
import { access, mkdir, unlink, writeFile } from 'fs/promises'
import { dirname } from 'path'
import type { JwtPayload } from '../auth/auth.service'
import { branchIdIn, branchScopeOf, branchScopeQb, inBranchScope, isEmptyBranchScope, scopeWord, userHasPerm } from '../auth/guards'
import type { BranchScope } from '../auth/guards'
import { User } from '../auth/user.entity'
import { Employee } from '../employees/employee.entity'
import { canReadEmployeeFinance } from '../employees/employee-projection'
import { grossMonthlySalary } from '../employees/compensation'
import { EmployeeDocument } from '../assets/assets.entities'
import { StoredFile } from '../files/stored-file.entity'
import { storedPath } from '../files/storage'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { LetterRenderer } from '../letters/letter-renderer.service'
import { localDateOf } from '../attendance/attendance.service'
import { HrDocumentCategory, HrDocumentSnapshot, HrDocumentTemplate, HrDocumentTemplateRevision, HrIssuedDocument } from './hr-document.entities'
import { HR_DOCUMENT_VARIABLES, hrContentVariables, resolveHrContent, validateHrContent, validateHrFields, validateHrValues } from './hr-document-content'
import { assertHrDocumentAccess, assertHrDocumentFileAccess } from './hr-document-access'
import { withoutDataPlaceholder } from '../common/data-placeholders'

export interface HrDocumentInput { templateId: number; revisionId: number; employeeId?: number | null; values: Record<string, string> }
export interface HrTemplateInput { name: string; category: HrDocumentCategory; draft: unknown; customFields?: unknown; isActive?: boolean }
const categories = new Set<HrDocumentCategory>(['contract', 'acknowledgement', 'certificate', 'general'])

// فرع المستند العام (بلا موظف) = فرع حساب اللي أصدره — هو اللي بيحكم مين يشوفه بعدين. حساب الفرع الواحد = فرعه؛ حساب
// الفروع المتعددة = فرعه الأصلي لو من فروعه، وإلا مفيش فرع واحد نختاره بصمت فالإصدار بيترفض. الحساب العام = فرعه أو بلا فرع.
function generalDocumentBranch(user: JwtPayload, scope: BranchScope): number | null {
  const home = Number.isSafeInteger(user.branchId) && Number(user.branchId) > 0 ? Number(user.branchId) : null
  if (scope === null) return home
  if (scope.length === 1) return scope[0]
  if (home !== null && scope.includes(home)) return home
  throw new BadRequestException('حسابك على أكتر من فرع وفرعك الأصلي مش منهم — المستند العام محتاج فرع واحد؛ اختار موظف أو اطلب ضبط فرع حسابك')
}

@Injectable()
export class HrDocumentsService {
  constructor(private readonly ds: DataSource, private readonly renderer: LetterRenderer) {}

  private name(value: unknown) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > 150) throw new BadRequestException('اسم القالب مطلوب وبحد أقصى 150 حرفاً')
    return value.trim()
  }
  private category(value: HrDocumentCategory) {
    if (!categories.has(value)) throw new BadRequestException('تصنيف المستند غير صالح')
    return value
  }
  private documentsPermission(user: JwtPayload) {
    if (!userHasPerm(user, 'documents.manage')) throw new ForbiddenException('صلاحية إدارة المستندات مطلوبة')
  }
  private async templateView(em: EntityManager, template: HrDocumentTemplate, publishedOnly = false) {
    const revision = template.publishedRevisionId ? await em.findOneBy(HrDocumentTemplateRevision, { id: template.publishedRevisionId, templateId: template.id }) : null
    return {
      id: template.id, name: publishedOnly && revision ? revision.name : template.name,
      category: publishedOnly && revision ? revision.category : template.category,
      version: template.version, isActive: template.isActive,
      draft: publishedOnly && revision ? revision.content : template.draft,
      customFields: publishedOnly && revision ? revision.customFields : template.customFields,
      publishedRevision: revision ? { id: revision.id, revision: revision.revision, name: revision.name, category: revision.category,
        content: revision.content, customFields: revision.customFields, publishedAt: revision.publishedAt } : null,
    }
  }
  async catalog(publishedOnly = false) {
    const em = this.ds.manager
    const templates = await em.find(HrDocumentTemplate, { where: publishedOnly ? { isActive: true, publishedRevisionId: Not(IsNull()) } : {}, order: { id: 'ASC' } })
    return { templates: await Promise.all(templates.map(template => this.templateView(em, template, publishedOnly))), variables: HR_DOCUMENT_VARIABLES }
  }
  async create(body: HrTemplateInput, actor: number) {
    const customFields = validateHrFields(body.customFields ?? [])
    const template = await this.ds.manager.save(HrDocumentTemplate, this.ds.manager.create(HrDocumentTemplate, {
      name: this.name(body.name), category: this.category(body.category), draft: validateHrContent(body.draft, customFields), customFields,
      version: 1, isActive: body.isActive ?? true, updatedByUserId: actor,
    }))
    return this.templateView(this.ds.manager, template)
  }
  private async lockedTemplate(em: EntityManager, id: number, version: number) {
    const template = await em.findOne(HrDocumentTemplate, { where: { id }, lock: { mode: 'pessimistic_write' } })
    if (!template) throw new NotFoundException('القالب غير موجود')
    if (template.version !== version) throw new ConflictException('تغير القالب في جلسة أخرى؛ حدّث النسخة قبل الحفظ')
    return template
  }
  async update(id: number, body: Partial<HrTemplateInput> & { version: number }, actor: number) {
    return this.ds.transaction(async em => {
      const template = await this.lockedTemplate(em, id, body.version)
      if (body.name !== undefined) template.name = this.name(body.name)
      if (body.category !== undefined) template.category = this.category(body.category)
      if (body.isActive !== undefined) template.isActive = body.isActive
      const fields = validateHrFields(body.customFields === undefined ? template.customFields : body.customFields)
      template.draft = validateHrContent(body.draft === undefined ? template.draft : body.draft, fields)
      template.customFields = fields
      template.version++; template.updatedByUserId = actor
      await em.save(HrDocumentTemplate, template)
      return this.templateView(em, template)
    })
  }
  async publish(id: number, version: number, actor: number) {
    return this.ds.transaction(async em => {
      const template = await this.lockedTemplate(em, id, version)
      if (!template.isActive) throw new BadRequestException('فعّل القالب قبل نشره')
      const customFields = validateHrFields(template.customFields), content = validateHrContent(template.draft, customFields)
      const last = await em.findOne(HrDocumentTemplateRevision, { where: { templateId: id }, order: { revision: 'DESC' } })
      if (last && last.name === template.name && last.category === template.category && JSON.stringify(last.content) === JSON.stringify(content) && JSON.stringify(last.customFields) === JSON.stringify(customFields)) return this.templateView(em, template)
      const revision = await em.save(HrDocumentTemplateRevision, em.create(HrDocumentTemplateRevision, { templateId: id, revision: (last?.revision ?? 0) + 1,
        name: template.name, category: template.category, content, customFields, publishedByUserId: actor }))
      template.publishedRevisionId = revision.id; template.version++; template.updatedByUserId = actor
      await em.save(HrDocumentTemplate, template)
      return this.templateView(em, template)
    })
  }
  async samplePreview(draft: unknown, rawFields: unknown = []) {
    const fields = validateHrFields(rawFields), content = validateHrContent(draft, fields)
    const values: Record<string, string> = Object.fromEntries(HR_DOCUMENT_VARIABLES.map(variable => [variable.key, variable.sample]))
    for (const field of fields) values[field.key] = `مثال توضيحي: ${field.label}`
    return this.renderer.pdf({ content: resolveHrContent(content, values), companyName: values['company.name'], companyNameEn: 'SAMPLE DOCUMENT',
      companyAddress: values['company.address'], companyPhone: values['company.phone'], commercialRegister: '', issuedDate: values.date, requestRef: values['document.ref'] }, true)
  }
  async employees(user: JwtPayload) {
    this.documentsPermission(user)
    const scope = branchScopeOf(user)
    return this.ds.manager.find(Employee, { where: scope === null ? {} : { branchId: branchIdIn(scope) }, select: { id: true, fullName: true, employeeCode: true }, order: { fullName: 'ASC' } })
  }
  private input(body: HrDocumentInput): HrDocumentInput {
    for (const key of ['templateId', 'revisionId'] as const) if (!Number.isSafeInteger(body[key]) || body[key] < 1) throw new BadRequestException('معرف القالب أو النسخة غير صالح')
    const employeeId = body.employeeId ?? null
    if (employeeId !== null && (!Number.isSafeInteger(employeeId) || employeeId < 1)) throw new BadRequestException('معرف الموظف غير صالح')
    if (!body.values || typeof body.values !== 'object' || Array.isArray(body.values) || Object.entries(body.values).some(([key, value]) => !/^custom\.[A-Za-z][A-Za-z0-9_]{0,49}$/.test(key) || typeof value !== 'string' || value.length > 4000) || Object.keys(body.values).length > 20) throw new BadRequestException('قيم الحقول المخصصة غير صالحة')
    const values = Object.fromEntries(Object.entries(body.values).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => [key, value.trim()]))
    return { templateId: body.templateId, revisionId: body.revisionId, employeeId, values }
  }
  private async prepare(em: EntityManager, user: JwtPayload, input: HrDocumentInput, reference: string, lock = false) {
    this.documentsPermission(user)
    const template = await em.findOne(HrDocumentTemplate, { where: { id: input.templateId }, ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}) })
    if (!template?.isActive || !template.publishedRevisionId) throw new BadRequestException('اختر قالباً فعالاً ومنشوراً')
    if (template.publishedRevisionId !== input.revisionId) throw new ConflictException('نُشرت نسخة أحدث من القالب؛ حدّثها وأعد المعاينة')
    const revision = await em.findOneBy(HrDocumentTemplateRevision, { id: input.revisionId, templateId: input.templateId })
    if (!revision) throw new NotFoundException('نسخة القالب غير موجودة')
    const fields = validateHrFields(revision.customFields), content = validateHrContent(revision.content, fields)
    const custom = validateHrValues(input.values, fields), tokens = hrContentVariables(content)
    const financial = [...tokens].some(key => key.startsWith('salary.'))
    const employee = input.employeeId ? await em.findOne(Employee, { where: { id: input.employeeId }, ...(lock ? { lock: { mode: 'pessimistic_read' as const } } : {}) }) : null
    if (input.employeeId && !employee) throw new NotFoundException('الموظف غير موجود')
    const scope = branchScopeOf(user)
    if (employee && !inBranchScope(scope, employee.branchId)) throw new ForbiddenException(`الموظف خارج نطاق ${scopeWord(scope)}`)
    if (!employee && isEmptyBranchScope(scope)) throw new ForbiddenException('يلزم تحديد فرع الحساب لإصدار مستند عام')
    if (financial && employee && !canReadEmployeeFinance(user, employee.id)) throw new ForbiddenException('هذا القالب يتطلب صلاحية الاطلاع على البيانات المالية للموظف')
    if (!employee && [...tokens].some(key => /^(employee|contract|salary)\./.test(key))) throw new BadRequestException('هذا القالب يستخدم بيانات موظف؛ اختر الموظف أولاً')
    const config = await em.findBy(RequestsConfig, { key: In(['company.name', 'company.name_en', 'company.address', 'company.phone', 'company.commercial_register']) })
    // القيمة المؤقتة (ترحيل الخطوة 9) ليست بيانًا: تُعامل كفارغة فيرفض الرمز المطلوب ولا تُطبع في رأس المستند.
    const company = Object.fromEntries(config.map(item => [item.key, withoutDataPlaceholder(item.value)]))
    const date = localDateOf(new Date())
    const values: Record<string, string> = { ...custom, date, 'document.ref': reference,
      'company.name': company['company.name'] || '', 'company.nameEn': company['company.name_en'] || '', 'company.address': company['company.address'] || '',
      'company.phone': company['company.phone'] || '', 'company.commercialRegister': company['company.commercial_register'] || '' }
    if (employee) {
      for (const key of ['fullName', 'employeeCode', 'jobTitle', 'joinDate', 'nationalId', 'nationality', 'email', 'phone', 'address'] as const) values[`employee.${key}`] = withoutDataPlaceholder(employee[key])
      const typeLabels: Record<string, string> = { permanent: 'غير محدد المدة', fixed_term: 'محدد المدة', part_time: 'دوام جزئي', seasonal: 'موسمي' }
      Object.assign(values, { 'contract.startDate': employee.contractStart || '', 'contract.endDate': employee.contractEnd || '', 'contract.number': employee.contractNumber || '',
        'contract.type': typeLabels[employee.contractType] || employee.contractType || '', 'contract.durationMonths': employee.contractDurationMonths == null ? '' : String(employee.contractDurationMonths) })
      // No salary data is resolved or captured for a template without salary tokens.
      if (financial) {
        if (tokens.has('salary.total') && employee.basicSalary == null) throw new BadRequestException('بيان مطلوب غير متوفر: الراتب الأساسي لحساب إجمالي الراتب')
        const money: Record<string, number | string | null | undefined> = { basic: employee.basicSalary, housing: employee.housingAllowance, transport: employee.transportAllowance,
          phone: employee.phoneAllowance, workNature: employee.workNatureAllowance, other: employee.otherAllowance, total: grossMonthlySalary(employee) }
        for (const [key, amount] of Object.entries(money)) {
          if (!tokens.has(`salary.${key}`)) continue
          if (amount == null || !Number.isFinite(Number(amount)) || Number(amount) < 0) throw new BadRequestException(`بيانات الراتب غير مكتملة أو غير صالحة: salary.${key}`)
          values[`salary.${key}`] = Number(amount).toFixed(2)
        }
        values['salary.currency'] = employee.currency || ''
      }
    }
    for (const key of tokens) if (!key.startsWith('custom.') && !values[key]?.trim()) {
      const label = HR_DOCUMENT_VARIABLES.find(variable => variable.key === key)?.label || key
      throw new BadRequestException(`بيان مطلوب غير متوفر: ${label} (${key})`)
    }
    const snapshot: HrDocumentSnapshot = { content: resolveHrContent(content, values), companyName: values['company.name'], companyNameEn: values['company.nameEn'],
      companyAddress: values['company.address'], companyPhone: values['company.phone'], commercialRegister: values['company.commercialRegister'], issuedDate: date, requestRef: reference,
      templateName: revision.name, category: revision.category, revision: revision.revision,
      values: Object.fromEntries([...tokens].map(key => [key, values[key] || ''])),
    }
    return { snapshot, employee, financial, revision, branchId: employee?.branchId ?? generalDocumentBranch(user, scope) }
  }
  async preview(user: JwtPayload, body: HrDocumentInput) {
    const { snapshot } = await this.prepare(this.ds.manager, user, this.input(body), 'HRD-PREVIEW')
    return this.renderer.pdf(snapshot, true)
  }
  private issuedView(document: HrIssuedDocument) {
    return { id: document.id, reference: document.reference, employeeId: document.employeeId, employeeDocumentId: document.employeeDocumentId,
      fileRef: `file:${document.fileId}`, templateName: document.templateName, category: document.category, createdAt: document.createdAt }
  }
  async issue(user: JwtPayload, body: HrDocumentInput & { idempotencyKey: string }) {
    this.documentsPermission(user)
    if (typeof body.idempotencyKey !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.idempotencyKey)) throw new BadRequestException('مفتاح إصدار المستند يجب أن يكون UUID صالحاً')
    const input = this.input(body), idempotencyKey = body.idempotencyKey.toLowerCase()
    const inputHash = createHash('sha256').update(JSON.stringify(input)).digest('hex')
    let createdPath: string | undefined
    try {
      return await this.ds.transaction(async em => {
        // Serialize this actor's issue attempts before checking the unique UUID.
        // No user/employee field is changed; this avoids duplicate files on retries.
        const actor = await em.findOne(User, { where: { id: user.sub }, lock: { mode: 'pessimistic_write' } })
        if (!actor) throw new ForbiddenException('حساب الإصدار غير موجود')
        const existing = await em.findOneBy(HrIssuedDocument, { issuedByUserId: user.sub, idempotencyKey })
        if (existing) {
          await assertHrDocumentAccess(em, user, existing)
          if (existing.inputHash !== inputHash) throw new ConflictException('استُخدم مفتاح الإصدار مع بيانات أخرى؛ استخدم مفتاحاً جديداً')
          return this.issuedView(existing)
        }
        const reference = `HRD-${new Date().getFullYear()}-${randomUUID()}`
        const prepared = await this.prepare(em, user, input, reference, true)
        const bytes = await this.renderer.pdf(prepared.snapshot)
        if (bytes.length < 5 || Buffer.from(bytes.subarray(0, 5)).toString() !== '%PDF-') throw new BadRequestException('تعذّر توليد ملف PDF صالح')
        const storedName = `hr-documents/${randomUUID()}.pdf`, target = storedPath(storedName)
        await mkdir(dirname(target), { recursive: true })
        createdPath = target
        await writeFile(target, bytes, { flag: 'wx' })
        const file = await em.save(StoredFile, em.create(StoredFile, { originalName: `${prepared.revision.name}-${reference}.pdf`, storedName,
          mime: 'application/pdf', size: bytes.length, entityType: 'hr_document', employeeId: prepared.employee?.id ?? null as any, uploadedBy: user.sub }))
        let employeeDocumentId: number | null = null
        if (prepared.employee) {
          const document = await em.save(EmployeeDocument, em.create(EmployeeDocument, { employeeId: prepared.employee.id, docType: prepared.revision.name.slice(0, 100),
            number: reference, issueDate: prepared.snapshot.issuedDate, fileRef: `file:${file.id}`, notes: prepared.revision.name }))
          employeeDocumentId = document.id
        }
        const issued = await em.save(HrIssuedDocument, em.create(HrIssuedDocument, { reference, templateId: input.templateId, revisionId: input.revisionId,
          employeeId: prepared.employee?.id ?? null, branchId: prepared.branchId, fileId: file.id, employeeDocumentId,
          templateName: prepared.revision.name, category: prepared.revision.category, isFinancial: prepared.financial, issuedByUserId: user.sub,
          idempotencyKey, inputHash, snapshot: prepared.snapshot }))
        await em.update(StoredFile, file.id, { entityId: issued.id })
        return this.issuedView(issued)
      })
    } catch (error) {
      if (createdPath) await unlink(createdPath).catch(() => undefined)
      throw error
    }
  }
  async issued(user: JwtPayload, employeeId?: number) {
    this.documentsPermission(user)
    const scope = branchScopeOf(user)
    if (employeeId !== undefined && (!Number.isSafeInteger(employeeId) || employeeId < 1)) throw new BadRequestException('معرف الموظف غير صالح')
    if (employeeId !== undefined) {
      const employee = await this.ds.manager.findOneBy(Employee, { id: employeeId })
      if (!employee) throw new NotFoundException('الموظف غير موجود')
      if (!inBranchScope(scope, employee.branchId)) throw new ForbiddenException(`الموظف خارج نطاق ${scopeWord(scope)}`)
    }
    const query = this.ds.getRepository(HrIssuedDocument).createQueryBuilder('d').leftJoin(Employee, 'e', 'e.id = d.employeeId')
      .select(['d.id', 'd.reference', 'd.employeeId', 'd.employeeDocumentId', 'd.fileId', 'd.templateName', 'd.category', 'd.createdAt', 'd.isFinancial', 'd.branchId'])
      .where('(d.employeeId IS NULL OR e.id IS NOT NULL)')
    if (employeeId !== undefined) query.andWhere('d.employeeId = :employeeId', { employeeId })
    if (scope !== null) {
      const [employeeBranch, params] = branchScopeQb('e.branchId', scope)
      const [documentBranch] = branchScopeQb('d.branchId', scope)
      query.andWhere(`((d.employeeId IS NOT NULL AND ${employeeBranch}) OR (d.employeeId IS NULL AND ${documentBranch}))`, params)
    }
    const rows = await query.orderBy('d.id', 'DESC').getMany()
    return rows.filter(row => !row.isFinancial || (!!row.employeeId && canReadEmployeeFinance(user, row.employeeId))).map(row => this.issuedView(row))
  }
  async fileFor(user: JwtPayload, id: number) {
    const document = await this.ds.manager.findOneBy(HrIssuedDocument, { id })
    if (!document) throw new NotFoundException('المستند غير موجود')
    await assertHrDocumentAccess(this.ds.manager, user, document)
    const file = await this.ds.manager.findOneBy(StoredFile, { id: document.fileId, entityType: 'hr_document' })
    if (!file) throw new NotFoundException('ملف المستند غير موجود')
    await assertHrDocumentFileAccess(this.ds.manager, user, file)
    const path = storedPath(file.storedName)
    try { await access(path) } catch { throw new NotFoundException('ملف المستند مفقود من التخزين') }
    return { file, path }
  }
}

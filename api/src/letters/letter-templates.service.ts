import { BadRequestException, ConflictException, Injectable, NotFoundException, OnApplicationBootstrap } from '@nestjs/common'
import { DataSource, EntityManager, In, IsNull, Not } from 'typeorm'
import { randomUUID } from 'crypto'
import { LetterTemplate, LetterTemplateBinding, LetterTemplateRevision } from './letter-template.entities'
import { DEFAULT_LETTER_TEMPLATES, LETTER_VARIABLES, resolveLetterContent, validateLetterContent } from './letter-template-content'
import { RequestType } from '../requests/entities/request-type.entity'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { LetterRenderer } from './letter-renderer.service'
import { withoutDataPlaceholder } from '../common/data-placeholders'

@Injectable()
export class LetterTemplatesService implements OnApplicationBootstrap {
  constructor(private readonly ds: DataSource, private readonly renderer: LetterRenderer) {}

  async onApplicationBootstrap() {
    // Only fill missing built-in templates/bindings; never overwrite an administrator's draft or publication.
    for (const def of DEFAULT_LETTER_TEMPLATES) await this.ds.transaction(async em => {
      let template = await em.findOneBy(LetterTemplate, { code: def.code })
      if (!template) {
        template = await em.save(LetterTemplate, em.create(LetterTemplate, { code: def.code, name: def.name, draft: def.content, version: 1, isActive: true }))
        const revision = await em.save(LetterTemplateRevision, em.create(LetterTemplateRevision, { templateId: template.id, revision: 1, content: def.content }))
        template.publishedRevisionId = revision.id
        await em.save(LetterTemplate, template)
      }
      if (!await em.findOneBy(LetterTemplateBinding, { requestTypeCode: def.code })) await em.insert(LetterTemplateBinding, { requestTypeCode: def.code, templateId: template.id })
    })
  }

  private async result(em: EntityManager, template: LetterTemplate) {
    const revision = template.publishedRevisionId ? await em.findOneBy(LetterTemplateRevision, { id: template.publishedRevisionId }) : null
    return { ...template, publishedRevision: revision ? { id: revision.id, revision: revision.revision, ...revision.content, publishedAt: revision.publishedAt } : null }
  }

  async catalog() {
    const em = this.ds.manager
    const templates = await em.find(LetterTemplate, { order: { id: 'ASC' } })
    return {
      templates: await Promise.all(templates.map(t => this.result(em, t))),
      bindings: await em.find(LetterTemplateBinding),
      requestTypes: await em.find(RequestType, { where: { destinationHandler: 'letter_pdf_generator' }, select: { code: true, nameAr: true }, order: { id: 'ASC' } }),
      variables: LETTER_VARIABLES,
      // القيمة المؤقتة لاسم الشركة ليست اسمًا مضبوطًا؛ يبقى تنبيه «أكمل اسم الشركة» ظاهرًا.
      companyNameConfigured: !!withoutDataPlaceholder((await em.findOneBy(RequestsConfig, { key: 'company.name' }))?.value),
    }
  }

  async availableTypeCodes() {
    const active = await this.ds.manager.find(LetterTemplate, { where: { isActive: true, publishedRevisionId: Not(IsNull()) }, select: { id: true } })
    if (!active.length) return new Set<string>()
    const bindings = await this.ds.manager.findBy(LetterTemplateBinding, { templateId: In(active.map(t => t.id)) })
    return new Set(bindings.map(b => b.requestTypeCode))
  }

  async create(body: { name: string; draft: unknown }, actor: number) {
    const draft = validateLetterContent(body.draft)
    const name = body.name?.trim()
    if (!name || name.length > 150) throw new BadRequestException('اسم القالب مطلوب وبحد أقصى 150 حرفاً')
    const template = await this.ds.manager.save(LetterTemplate, this.ds.manager.create(LetterTemplate, { code: `CUSTOM_${randomUUID()}`, name, draft, version: 1, isActive: true, updatedByUserId: actor }))
    return this.result(this.ds.manager, template)
  }

  async update(id: number, body: { version: number; name?: string; draft?: unknown; isActive?: boolean }, actor: number) {
    return this.ds.transaction(async em => {
      const template = await this.lock(em, id, body.version)
      if (body.name !== undefined) {
        if (!body.name.trim() || body.name.trim().length > 150) throw new BadRequestException('اسم القالب مطلوب وبحد أقصى 150 حرفاً')
        template.name = body.name.trim()
      }
      if (body.draft !== undefined) template.draft = validateLetterContent(body.draft)
      if (body.isActive !== undefined) {
        if (!body.isActive) {
          const bindings = await em.findBy(LetterTemplateBinding, { templateId: id })
          if (bindings.length && await em.countBy(RequestType, { code: In(bindings.map(b => b.requestTypeCode)), isActive: true })) throw new ConflictException('اربط أنواع الطلبات الفعالة بقالب منشور آخر قبل تعطيل هذا القالب')
        }
        template.isActive = body.isActive
      }
      template.updatedByUserId = actor
      template.version++
      await em.save(LetterTemplate, template)
      return this.result(em, template)
    })
  }

  async publish(id: number, version: number, actor: number) {
    return this.ds.transaction(async em => {
      const template = await this.lock(em, id, version)
      if (!template.isActive) throw new BadRequestException('فعّل القالب قبل نشره')
      const content = validateLetterContent(template.draft)
      const last = await em.findOne(LetterTemplateRevision, { where: { templateId: id }, order: { revision: 'DESC' } })
      if (last && JSON.stringify(last.content) === JSON.stringify(content)) return this.result(em, template)
      const revision = await em.save(LetterTemplateRevision, em.create(LetterTemplateRevision, { templateId: id, revision: (last?.revision ?? 0) + 1, content, publishedByUserId: actor }))
      template.publishedRevisionId = revision.id
      template.updatedByUserId = actor
      template.version++
      await em.save(LetterTemplate, template)
      return this.result(em, template)
    })
  }

  async bind(requestTypeCode: string, templateId: number) {
    return this.ds.transaction(async em => {
      const type = await em.findOne(RequestType, { where: { code: requestTypeCode, destinationHandler: 'letter_pdf_generator' }, lock: { mode: 'pessimistic_write' } })
      if (!type) throw new BadRequestException('اختر نوع طلب يستخدم توليد الخطابات')
      const template = await em.findOne(LetterTemplate, { where: { id: templateId }, lock: { mode: 'pessimistic_write' } })
      if (!template?.isActive || !template.publishedRevisionId) throw new BadRequestException('اختر قالباً فعالاً له نسخة منشورة')
      const binding = await em.findOneBy(LetterTemplateBinding, { requestTypeCode })
      return em.save(LetterTemplateBinding, { ...binding, requestTypeCode, templateId })
    })
  }

  async publishedFor(em: EntityManager, code: string) {
    const binding = await em.findOneBy(LetterTemplateBinding, { requestTypeCode: code })
    const template = binding ? await em.findOneBy(LetterTemplate, { id: binding.templateId }) : null
    if (!template?.isActive || !template.publishedRevisionId) throw new BadRequestException('هذا الطلب غير مربوط بقالب خطاب فعال ومنشور؛ راجع إعدادات قوالب الخطابات')
    const revision = await em.findOneBy(LetterTemplateRevision, { id: template.publishedRevisionId, templateId: template.id })
    if (!revision) throw new BadRequestException('نسخة القالب المنشورة غير موجودة')
    return { template, revision }
  }

  preview(draft: unknown) {
    const values = Object.fromEntries(LETTER_VARIABLES.map(v => [v.key, v.sample]))
    return this.renderer.pdf({ content: resolveLetterContent(validateLetterContent(draft), values), companyName: values['company.name'], companyNameEn: 'SAMPLE COMPANY | PREVIEW', companyAddress: values['company.address'], companyPhone: values['company.phone'], commercialRegister: '', issuedDate: values.date, requestRef: values['request.ref'] }, true)
  }

  private async lock(em: EntityManager, id: number, version: number) {
    const template = await em.findOne(LetterTemplate, { where: { id }, lock: { mode: 'pessimistic_write' } })
    if (!template) throw new NotFoundException('القالب غير موجود')
    if (template.version !== version) throw new ConflictException('تغير القالب في جلسة أخرى؛ حدّث النسخة قبل الحفظ')
    return template
  }
}

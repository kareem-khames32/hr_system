import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, type EntityManager } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, branchScopeSql, userHasPerm } from '../auth/guards'
import { ModulesService } from '../modules-registry/modules.service'
import {
  buildQuery, BUILDER_SOURCES, DEFINITION_NOT_FOUND, DEFINITION_UNAVAILABLE, definitionColumns, definitionName, definitionOf, DEFINITIONS_MAX, FILTER_OP_LABELS, FILTER_OPS, parseSharedRoles,
  REPORT_BUILDER_MIGRATION_MISSING, ReportDefinition, reportDefinitionsReady, ROWS_MAX, sharedRolesOf, SOURCE_UNAVAILABLE, sourceOf, type BuilderDefinition, type BuilderSource,
} from './report-builder'

// B5.9: بانِي التقارير — التشغيل دايمًا بصلاحيات القارئ ونطاقه هو (حتى لو التقرير متشارك من حد تاني): المصدر بصلاحيته وموديولاته، وكل عمود التعريف
// بيلمسه (معروض أو في فلتر أو تجميع) بصلاحية حقله، والصفوف بفرع الموظف الحالي. التقرير المحفوظ لصاحبه، والمشاركة بأدوار.

const NAME_TAKEN = 'عندك تقرير بنفس الاسم'
const flag = (value: unknown) => value === true || value === 1

@Injectable()
export class ReportBuilderService {
  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly modules: ModulesService) {}

  /** المصدر متاح للقارئ؟ صلاحيته، وكل موديولاته مفعّلة */
  private async sourceOpen(user: JwtPayload, source: BuilderSource): Promise<boolean> {
    if (!userHasPerm(user, source.perm)) return false
    for (const key of source.modules) if (!(await this.modules.isEnabled(key as never))) return false
    return true
  }

  /** التعريف كله متاح للقارئ؟ المصدر، وكل عمود بيلمسه */
  private async allowed(user: JwtPayload, definition: BuilderDefinition): Promise<boolean> {
    const source = sourceOf(definition.source)
    return !!source && await this.sourceOpen(user, source) && definitionColumns(definition).every(column => !column.perm || userHasPerm(user, column.perm))
  }

  private parse(row: ReportDefinition): BuilderDefinition | null {
    try { return definitionOf({ ...(JSON.parse(row.definition) as object), source: row.source }).definition } catch { return null }
  }

  /** القاموس المتاح للقارئ (مصادره وأعمدتها المسموحة له)، وتقاريره المحفوظة والمتشاركة مع دوره، والأدوار للمشاركة */
  async overview(user: JwtPayload) {
    const em = this.ds.manager, sources = []
    for (const source of BUILDER_SOURCES) {
      if (!(await this.sourceOpen(user, source))) continue
      sources.push({ key: source.key, label: source.label, columns: source.columns.filter(column => !column.perm || userHasPerm(user, column.perm))
        .map(column => ({ key: column.key, label: column.label, type: column.type, group: !!column.group, sum: !!column.sum, ops: FILTER_OPS[column.type] })) })
    }
    const canSave = userHasPerm(user, 'reports.save'), ready = await reportDefinitionsReady(em)
    const saved = []
    if (ready) {
      const rows = await em.getRepository(ReportDefinition).find({ order: { name: 'ASC', id: 'ASC' } })
      for (const row of rows) {
        const mine = row.ownerUserId === user.sub
        if (!mine && !parseSharedRoles(row.sharedRoles).includes(user.role)) continue
        const definition = this.parse(row)
        saved.push({ id: row.id, name: row.name, source: row.source, mine, sharedRoles: mine ? parseSharedRoles(row.sharedRoles) : [], available: !!definition && await this.allowed(user, definition),
          // تعريف تقرير حد تاني بيتعرض للي يقدر يشغّله بس
          definition: definition && (mine || await this.allowed(user, definition)) ? definition : null })
      }
    }
    const roles: Array<{ code: string; nameAr: string }> = canSave ? await em.query('SELECT [code], [nameAr] FROM dbo.roles WHERE [isActive] = 1 ORDER BY [nameAr], [id]') : []
    return { ready, canSave, rowsMax: ROWS_MAX, opLabels: FILTER_OP_LABELS, sources, saved, roles: roles.map(row => ({ code: row.code, nameAr: row.nameAr })) }
  }

  /** تشغيل تعريف: بصلاحيات القارئ ونطاقه — والصفوف بفرع الموظف الحالي */
  private async execute(user: JwtPayload, definition: BuilderDefinition, refusal: string) {
    if (!(await this.allowed(user, definition))) throw new ForbiddenException(refusal)
    const params: unknown[] = []
    const query = buildQuery(definition, branchScopeSql('e.[branchId]', branchScopeOf(user), params), params)
    const rows: Array<Record<string, unknown>> = await this.ds.manager.query(query.sql, query.params)
    return { headers: query.headers, truncated: rows.length > ROWS_MAX,
      rows: rows.slice(0, ROWS_MAX).map(row => query.headers.map((header, index) => { const value = row[`c${index}`]; return value === null || value === undefined ? null : header.type === 'number' ? Number(value) : String(value) })) }
  }

  async run(user: JwtPayload, body: unknown) {
    const { definition, error } = definitionOf(body)
    if (!definition) throw new BadRequestException(error)
    return this.execute(user, definition, SOURCE_UNAVAILABLE)
  }

  /** تقرير محفوظ: لصاحبه أو لدور متشارك معاه (غير كده «مش موجود»)، وبيتشغّل بصلاحيات القارئ — عمود مش متاح له = التقرير كله مش متاح */
  async runSaved(user: JwtPayload, id: number) {
    const em = this.ds.manager
    if (!(await reportDefinitionsReady(em))) throw new BadRequestException(REPORT_BUILDER_MIGRATION_MISSING)
    const row = await em.getRepository(ReportDefinition).findOne({ where: { id } })
    if (!row || (row.ownerUserId !== user.sub && !parseSharedRoles(row.sharedRoles).includes(user.role))) throw new NotFoundException(DEFINITION_NOT_FOUND)
    const definition = this.parse(row)
    if (!definition) throw new ForbiddenException(DEFINITION_UNAVAILABLE)
    return { id: row.id, name: row.name, ...await this.execute(user, definition, DEFINITION_UNAVAILABLE) }
  }

  private async assertRoles(em: EntityManager, codes: string[]) {
    if (!codes.length) return
    const found: Array<{ code: string; isActive: unknown }> = await em.query(`SELECT [code], [isActive] FROM dbo.roles WHERE [code] IN (${codes.map((_, index) => `@${index}`).join(', ')})`, codes)
    if (codes.some(code => !found.some(row => row.code === code && flag(row.isActive)))) throw new BadRequestException('دور من أدوار المشاركة مش موجود')
  }

  /** حفظ تعريف (جديد أو تعديل تقرير صاحب الحساب): التعريف لازم يكون متاح لصاحبه، والاسم مايتكررش عنده (تحت قفل مدى)، والمشاركة بأدوار موجودة */
  async save(user: JwtPayload, id: number | null, body: unknown) {
    const input = (body ?? {}) as Record<string, unknown>
    const name = definitionName(input.name)
    if (!name) throw new BadRequestException('اسم التقرير من حرفين لحد 120 حرف')
    const { definition, error } = definitionOf(input.definition)
    if (!definition) throw new BadRequestException(error)
    const roles = sharedRolesOf(input.sharedRoles)
    if (!roles) throw new BadRequestException('أدوار المشاركة مش صحيحة')
    if (!(await this.allowed(user, definition))) throw new ForbiddenException(SOURCE_UNAVAILABLE)
    return this.ds.transaction(async em => {
      if (!(await reportDefinitionsReady(em))) throw new BadRequestException(REPORT_BUILDER_MIGRATION_MISSING)
      const mine: Array<{ id: number; name: string }> = await em.query('SELECT [id], [name] FROM dbo.report_definitions WITH (UPDLOCK, HOLDLOCK) WHERE [ownerUserId] = @0', [user.sub])
      if (id !== null && !mine.some(row => Number(row.id) === id)) throw new NotFoundException(DEFINITION_NOT_FOUND)
      if (mine.some(row => row.name === name && Number(row.id) !== id)) throw new ConflictException(NAME_TAKEN)
      if (id === null && mine.length >= DEFINITIONS_MAX) throw new ConflictException(`${DEFINITIONS_MAX} تقرير محفوظ بالكتير — امسح تقرير قديم الأول`)
      await this.assertRoles(em, roles)
      const now = new Date(), repo = em.getRepository(ReportDefinition)
      const values = { name, source: definition.source, definition: JSON.stringify({ columns: definition.columns, filters: definition.filters, groupBy: definition.groupBy }), sharedRoles: roles.length ? roles.join(',') : null, updatedAt: now }
      if (values.definition.length > 4000 || (values.sharedRoles ?? '').length > 600) throw new BadRequestException('تعريف التقرير أطول من المسموح — قلّل الفلاتر أو الأدوار')
      if (id !== null) { await repo.update({ id, ownerUserId: user.sub }, values); return { id } }
      return { id: (await repo.save(repo.create({ ...values, ownerUserId: user.sub, createdAt: now }))).id }
    })
  }

  async remove(user: JwtPayload, id: number) {
    const em = this.ds.manager
    if (!(await reportDefinitionsReady(em))) throw new BadRequestException(REPORT_BUILDER_MIGRATION_MISSING)
    const result = await em.getRepository(ReportDefinition).delete({ id, ownerUserId: user.sub })
    if (!result.affected) throw new NotFoundException(DEFINITION_NOT_FOUND)
    return { id }
  }
}

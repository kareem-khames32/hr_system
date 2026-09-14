import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, In, IsNull, Repository } from 'typeorm'
import { createHash } from 'node:crypto'
import { CostCenter } from '../assets/assets.entities'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, userHasPerm } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { Branch } from '../org/entities/branch.entity'
import { Department } from '../org/entities/department.entity'
import { Team } from '../org/entities/team.entity'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { configSeed } from '../seed/requests-seed.data'
import type { PayrollScopeType } from './payroll.entities'
import { ClonePayrollPolicyVersionDto, CreatePayrollPolicyDto, PayrollPolicyMutationDto, PayrollPolicyVersionMetadataDto, UpdatePayrollPolicyDto, UpdatePayrollPolicyVersionDto } from './payroll-policy.dto'
import { PayrollPolicy, PayrollPolicyEvent, PayrollPolicyVersion, PayrollPolicyVersionMetadata } from './payroll-policy.entities'
import { inspectPayrollPolicySettings, parsePayrollPolicyConfigValue, patchPayrollPolicySettings, PAYROLL_POLICY_CONFIG_KEYS, PAYROLL_POLICY_SETTING_FIELDS, PayrollPolicySettings, payrollPolicySettingsSnapshot, validatePayrollPolicySettings } from './payroll-policy-settings'
import { TestPayrollFormulaDto, ValidatePayrollComponentOrderDto, ValidatePayrollFormulaDto } from './payroll-formula.dto'
import { payrollFormulaCatalog, testPolicyFormula, validatePolicyComponentOrder, validatePolicyFormula } from './payroll-formula-workbench'
import { PAYROLL_SRS_CATALOG_VERSION } from './payroll-formula-catalog'
import { PAYROLL_FORMULA_ENGINE_VERSION } from './payroll-formula-engine'
import { PayrollPolicyDefinition, PayrollPolicyDefinitionError, validatePayrollPolicyDefinition } from './payroll-policy-definition'
import { readPayrollPolicyDefinition, replacePayrollPolicyDefinition } from './payroll-policy-definition-store'
import { ReplacePayrollPolicyDefinitionDto, ValidatePayrollPolicyDefinitionDto } from './payroll-policy-definition-api.dto'
import { PayrollTierPreviewDto } from './payroll-tier-preview.dto'
import { evaluatePayrollTierPreview, PAYROLL_TIER_ENGINE_VERSION, PayrollTierPreviewError } from './payroll-tier-preview'
import { PreviewPayrollInputFactsDto } from './payroll-input-facts-api.dto'
import { buildPayrollInputFacts, PAYROLL_INPUT_FACTS_VERSION, PayrollInputFactsError } from './payroll-input-facts'
import { PreviewPayrollInstallmentsDto } from './payroll-installment-preview.dto'
import { evaluatePayrollInstallmentPreview, PAYROLL_INSTALLMENT_OPTIONS_VERSION, PayrollInstallmentPreviewError } from './payroll-installment-preview'
import { PAYROLL_INSTALLMENT_ALLOCATION_VERSION, PayrollInstallmentAllocationError } from './payroll-installment-allocation'
import { PAYROLL_INSTALLMENT_BUDGET_VERSION, PayrollInstallmentBudgetError } from './payroll-installment-budget'
import { buildPayrollCollectionNetInput, inspectPayrollCollectionPolicy, PayrollCollectionPolicy, PayrollCollectionPolicyError, validatePayrollCollectionPolicy } from './payroll-collection-policy'
import { PreviewPayrollPolicyExecutionDto, UpdatePayrollCollectionPolicyDto } from './payroll-collection-api.dto'
import { executePayrollPolicy, PAYROLL_POLICY_EXECUTION_VERSION } from './payroll-policy-execution'
import { PayrollComponentExecutionError } from './payroll-component-execution'
import { PayrollNetFinalizationError } from './payroll-net-finalization'
import { ReadPayrollLiveSourcesDto } from './payroll-live-sources.dto'
import { PAYROLL_LIVE_SOURCE_VERSION, payrollLiveSourceContent, payrollLiveSourcePeriod } from './payroll-live-source-contract'
import { readPayrollLiveEmployment } from './payroll-live-employment-provider'
import { readPayrollLiveOvertime } from './payroll-live-overtime-provider'
import { readPayrollLiveLedger } from './payroll-live-ledger-provider'
import { readPayrollLiveCompensation } from './payroll-live-compensation-provider'
import { readPayrollLiveSchedule } from './payroll-live-schedule-provider'
import { readPayrollLiveAttendance } from './payroll-live-attendance-provider'

@Injectable()
export class PayrollPolicyService {
  constructor(@InjectRepository(PayrollPolicy) private readonly policies: Repository<PayrollPolicy>) {}

  private permitted(user: JwtPayload, write = false) {
    if (!userHasPerm(user, write ? 'payroll.calculate' : 'payroll.view')) throw new ForbiddenException('لا تملك صلاحية إدارة سياسات الرواتب')
    if (branchScopeOf(user) === -1) throw new ForbiddenException('حساب المستخدم غير مسند إلى فرع صالح')
  }

  private access(user: JwtPayload, policy: PayrollPolicy, write = false) {
    const scope = branchScopeOf(user)
    if (scope === null) return
    if (scope < 1 || (policy.branchId !== scope && (write || policy.branchId !== null))) {
      throw new ForbiddenException('السياسة خارج نطاق الفرع المسموح؛ السياسة العامة متاحة للقراءة فقط')
    }
  }

  private capabilities(user: JwtPayload, policy: PayrollPolicy) {
    const scope = branchScopeOf(user)
    const canEdit = policy.isActive && userHasPerm(user, 'payroll.calculate') && (scope === null || (scope > 0 && policy.branchId === scope))
    // هذه نواة مسودات فقط؛ لا يتيح وجود صف السياسة تغيير المسير أو نشر معادلة لم تتحقق.
    return { canEdit, canArchive: canEdit, canCloneVersion: canEdit, canPublish: false, canAssign: false, canDelete: false }
  }

  private async policy(em: EntityManager, user: JwtPayload, id: number, write = false) {
    const row = await em.getRepository(PayrollPolicy).findOneBy({ id })
    if (!row) throw new NotFoundException('سياسة الرواتب غير موجودة')
    this.access(user, row, write)
    // أرشفة الهوية تمنع إدارتها كلها؛ أرشفة نسخة داخل هوية نشطة لا تمنع استنساخها.
    if (write && !row.isActive) throw new ConflictException({ code: 'POLICY_ARCHIVED', message: 'هوية السياسة مؤرشفة ومتاحة للقراءة فقط' })
    return row
  }

  private async version(em: EntityManager, policyId: number, id: number) {
    const row = await em.getRepository(PayrollPolicyVersion).findOneBy({ id, policyId })
    if (!row) throw new NotFoundException('نسخة السياسة غير موجودة في السياسة المحددة')
    if (!['DRAFT', 'ACTIVE', 'ARCHIVED'].includes(row.status) || !['LEGACY_V1', 'SRS_V1'].includes(row.contractVersion)) {
      throw new ConflictException({ code: 'POLICY_VERSION_INVALID', message: 'بيانات نسخة السياسة غير صالحة وتحتاج مراجعة' })
    }
    return row
  }

  private expected(actual: number, expected: number) {
    if (!Number.isInteger(expected) || expected < 1) throw new BadRequestException('رقم مراجعة السياسة يجب أن يكون عددًا صحيحًا موجبًا')
    if (actual !== expected) throw new ConflictException({ code: 'POLICY_VERSION_CONFLICT', message: 'تغيرت النسخة منذ فتحها؛ حدّث البيانات قبل الحفظ', currentRevision: actual })
  }

  private text(value: unknown, label: string, max: number) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new BadRequestException(`${label} نص مطلوب بحد أقصى ${max} حرفًا`)
    return value.trim()
  }

  private optionalText(value: unknown, label: string, max: number): string | null {
    if (value == null) return null
    if (typeof value !== 'string' || value.length > max) throw new BadRequestException(`${label} نص بحد أقصى ${max} حرفًا`)
    return value.trim() || null
  }

  private date(value: unknown, label: string) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException(`${label} بصيغة YYYY-MM-DD`)
    const year = Number(value.slice(0, 4)), month = Number(value.slice(5, 7)), day = Number(value.slice(8, 10))
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1]) throw new BadRequestException(`${label} تاريخ تقويمي غير صالح`)
    return value
  }

  private dates(from: unknown, to: unknown) {
    const effectiveFrom = this.date(from, 'بداية السريان')
    const effectiveTo = to == null ? null : this.date(to, 'نهاية السريان')
    if (effectiveTo && effectiveTo < effectiveFrom) throw new BadRequestException('نهاية السريان يجب ألا تسبق بدايته')
    return { effectiveFrom, effectiveTo }
  }

  private metadata(value: PayrollPolicyVersionMetadataDto | null | undefined, previous: PayrollPolicyVersionMetadata | null = null) {
    if (value === undefined) return previous ? { ...previous } : null
    if (value === null) return null
    return { title: value.title === undefined ? previous?.title ?? null : this.optionalText(value.title, 'عنوان النسخة', 200),
      notes: value.notes === undefined ? previous?.notes ?? null : this.optionalText(value.notes, 'ملاحظات النسخة', 2000) }
  }

  private async scope(em: EntityManager, ownerBranch: number | null, type: PayrollScopeType | null, ids: number[] | null) {
    const scopeIds = ids ?? []
    if (!Array.isArray(scopeIds) || scopeIds.length > 1000 || scopeIds.some(id => !Number.isInteger(id) || id < 1) || new Set(scopeIds).size !== scopeIds.length) {
      throw new BadRequestException('معرّفات النطاق يجب أن تكون أعدادًا صحيحة موجبة غير مكررة')
    }
    if (type === null || type === 'COMPANY') {
      if (scopeIds.length) throw new BadRequestException('النطاق العام أو غير المحدد لا يقبل قائمة معرّفات')
      if (type === 'COMPANY' && ownerBranch !== null) throw new ForbiddenException('السياسة المملوكة لفرع لا تقترح نطاق الشركة كلها')
      return { defaultScopeType: type, defaultScopeIds: null }
    }
    if (!scopeIds.length) throw new BadRequestException('اختر معرّفات النطاق المقترح')
    let branchIds: Array<number | null> = []
    if (type === 'BRANCH') {
      const rows = await em.getRepository(Branch).findBy({ id: In(scopeIds), isActive: true })
      if (rows.length !== scopeIds.length) throw new BadRequestException('أحد الفروع غير موجود أو معطل')
      branchIds = rows.map(row => row.id)
    } else if (type === 'DEPARTMENT') {
      const rows = await em.getRepository(Department).findBy({ id: In(scopeIds), isActive: true })
      if (rows.length !== scopeIds.length) throw new BadRequestException('أحد الأقسام غير موجود أو معطل')
      branchIds = rows.map(row => row.branchId)
    } else if (type === 'TEAM') {
      const rows = await em.getRepository(Team).find({ where: { id: In(scopeIds), isActive: true }, relations: { department: true } })
      if (rows.length !== scopeIds.length || rows.some(row => !row.department?.isActive)) throw new BadRequestException('أحد الفرق أو أقسامه غير موجود أو معطل')
      branchIds = rows.map(row => row.department.branchId)
    } else if (type === 'CUSTOM') {
      const rows = await em.getRepository(Employee).findBy({ id: In(scopeIds) })
      if (rows.length !== scopeIds.length) throw new BadRequestException('أحد الموظفين في النطاق المخصص غير موجود')
      branchIds = rows.map(row => row.branchId)
    } else if (type === 'COST_CENTER') {
      // مركز التكلفة كتالوج عام بلا branchId؛ الاقتراح لا يمنحه ملكية مستنتجة من موظفيه.
      const rows = await em.getRepository(CostCenter).findBy({ id: In(scopeIds), isActive: true })
      if (rows.length !== scopeIds.length) throw new BadRequestException('أحد مراكز التكلفة غير موجود أو معطل')
    } else throw new BadRequestException('نوع النطاق المقترح غير صالح')
    if (ownerBranch !== null && branchIds.some(branch => branch !== ownerBranch)) throw new ForbiddenException('النطاق المقترح خارج فرع السياسة')
    return { defaultScopeType: type, defaultScopeIds: [...scopeIds].sort((a, b) => a - b) }
  }

  private async lock(em: EntityManager, key: string) {
    const result = await em.query(`DECLARE @result int;
      EXEC @result = sys.sp_getapplock @Resource = @0, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000;
      SELECT @result AS lockResult;`, [`hr:payroll:policy:${key}`])
    if (!result.length || Number(result[0].lockResult) < 0) throw new ConflictException('يوجد تعديل جارٍ على السياسة؛ حاول مرة أخرى')
  }

  private snapshot(value: unknown): Record<string, unknown> { return JSON.parse(JSON.stringify(value)) }

  private definitionCheck(definition: PayrollPolicyDefinition, settings: PayrollPolicySettings, autoOrder = false) {
    try {
      // DTO المتحقق يصبح بيانات عادية؛ لا يُستنتج كتالوج خصومات من نص المعادلة أو دفتر غير مصنف.
      const initial = validatePayrollPolicyDefinition(JSON.parse(JSON.stringify(definition)), settings, { typedDeductionCodes: [], autoOrder })
      const stable = autoOrder ? validatePayrollPolicyDefinition(initial.definition, settings, { typedDeductionCodes: [], autoOrder: false }) : initial
      const persistentKeys = new Set(stable.warnings.map(warning => warning.key))
      const checked = { definition: stable.definition, warnings: [...stable.warnings, ...initial.warnings.filter(warning => !persistentKeys.has(warning.key))] }
      const canonical = (value: any): any => Array.isArray(value) ? value.map(canonical) : value !== null && typeof value === 'object'
        ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value
      const warnings = checked.warnings.map(warning => ({ ...warning, id: createHash('sha256').update(JSON.stringify(canonical({
        catalogVersion: PAYROLL_SRS_CATALOG_VERSION, engineVersion: PAYROLL_FORMULA_ENGINE_VERSION, warning,
      }))).digest('hex') }))
      return { definition: checked.definition, warnings, requiredAcknowledgements: warnings.map(warning => warning.id) }
    } catch (error) {
      if (error instanceof PayrollPolicyDefinitionError) throw new BadRequestException({ code: error.code, message: error.message, path: error.path, details: error.details })
      throw error
    }
  }

  private definitionSettings(version: PayrollPolicyVersion, patch?: Partial<PayrollPolicySettings>) {
    const stored = patchPayrollPolicySettings(version, patch)
    const inspected = inspectPayrollPolicySettings(stored)
    if (inspected.settingsStatus !== 'COMPLETE') throw new ConflictException({ code: 'POLICY_SETTINGS_INCOMPLETE', message: 'أكمل إعدادات نسخة السياسة قبل حفظ أو تجربة البنود', settingsStatus: inspected.settingsStatus, settingsIssues: inspected.settingsIssues })
    return validatePayrollPolicySettings(stored)
  }

  private requireAcknowledgements(required: string[], supplied: string[] = []) {
    if (!Array.isArray(supplied) || new Set(supplied).size !== supplied.length || supplied.some(value => typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value))) throw new BadRequestException('قائمة الإقرارات غير صالحة')
    const missing = required.filter(id => !supplied.includes(id)), unknown = supplied.filter(id => !required.includes(id))
    if (missing.length || unknown.length) throw new ConflictException({ code: 'POLICY_DEFINITION_ACKNOWLEDGEMENT_REQUIRED', message: 'راجع تحذيرات التعريف الحالي وأقرّ بها صراحة قبل الحفظ؛ الإقرارات السابقة لا تغطي تعريفًا تغيّر', requiredAcknowledgements: required, missingAcknowledgements: missing, unknownAcknowledgements: unknown })
  }

  private collectionCheck(definition: PayrollPolicyDefinition, value: unknown) {
    try { return validatePayrollCollectionPolicy(definition, JSON.parse(JSON.stringify(value))) }
    catch (error) {
      if (error instanceof PayrollCollectionPolicyError) throw new BadRequestException({ code: error.code, message: error.message, path: error.path })
      throw error
    }
  }

  private replacementCollection(definition: PayrollPolicyDefinition, stored: PayrollCollectionPolicy | null, supplied?: unknown) {
    if (supplied !== undefined) return this.collectionCheck(definition, supplied)
    if (stored == null) return null
    const inspected = inspectPayrollCollectionPolicy(definition, stored)
    if (inspected.state !== 'COMPLETE') throw new ConflictException({ code: 'POLICY_COLLECTION_REPAIR_REQUIRED', message: 'تغيير البنود يؤثر على ترتيب التحصيل؛ أرسل الترتيب والتصنيفات المصححة مع التعريف في الحفظ نفسه', collectionIssues: inspected.issues })
    return inspected.collection!
  }

  private async definitionView(em: EntityManager, version: PayrollPolicyVersion) {
    const definition = await readPayrollPolicyDefinition(em, version.id)
    const settingsSnapshot = inspectPayrollPolicySettings(version)
    let definitionStatus: 'MISSING' | 'INVALID' | 'COMPLETE' = 'INVALID'
    let warnings: ReturnType<PayrollPolicyService['definitionCheck']>['warnings'] = []
    const definitionIssues: string[] = []
    const acknowledgedWarnings = version.definitionWarningAcknowledgements ?? []
    if (version.catalogVersion === null && version.engineVersion === null && version.definitionWarningAcknowledgements === null &&
        !definition.parameters.length && !definition.tierSets.length && !definition.components.length) definitionStatus = 'MISSING'
    else if (version.contractVersion !== 'SRS_V1' || version.catalogVersion !== PAYROLL_SRS_CATALOG_VERSION || version.engineVersion !== PAYROLL_FORMULA_ENGINE_VERSION) definitionIssues.push('إصدار تعريف البنود غير مكتمل أو غير مدعوم؛ لا يُستبدل ضمنيًا')
    else {
      try {
        const checked = this.definitionCheck(definition, this.definitionSettings(version))
        warnings = checked.warnings
        this.requireAcknowledgements(checked.requiredAcknowledgements, acknowledgedWarnings)
        definitionStatus = 'COMPLETE'
      } catch (error) {
        if (error instanceof BadRequestException || error instanceof ConflictException) definitionIssues.push(error.message)
        else throw error
      }
    }
    // المنفذ يستهلك إعدادات وتعريفًا من المراجعة نفسها؛ لا يحتاج طلب قراءة ثانٍ قد يسبق تعديلًا متزامنًا.
    const collection = inspectPayrollCollectionPolicy(definition, version.collectionPolicy)
    return { policyId: version.policyId, versionId: version.id, revision: version.revision, contractVersion: version.contractVersion,
      ...settingsSnapshot, definitionStatus, definitionIssues,
      collectionState: collection.state, collection: collection.collection, collectionIssues: collection.issues,
      catalogVersion: version.catalogVersion, engineVersion: version.engineVersion, definition, warnings, acknowledgedWarnings }
  }

  async definitionDetail(user: JwtPayload, policyId: number, versionId: number) {
    this.permitted(user)
    return this.policies.manager.transaction(async em => {
      // قفل قراءة مشترك يمنع جمع نسخة من الترويسة مع أطفال نسخة أخرى أثناء الحفظ المتزامن.
      const lock = await em.query(`DECLARE @result int;
        EXEC @result = sys.sp_getapplock @Resource = @0, @LockMode = 'Shared', @LockOwner = 'Transaction', @LockTimeout = 10000;
        SELECT @result AS lockResult;`, [`hr:payroll:policy:${policyId}`])
      if (!lock.length || Number(lock[0].lockResult) < 0) throw new ConflictException('تعذر قراءة تعريف السياسة أثناء تعديل جارٍ؛ حاول مجددًا')
      await this.policy(em, user, policyId)
      return this.definitionView(em, await this.version(em, policyId, versionId))
    })
  }

  async collectionDetail(user: JwtPayload, policyId: number, versionId: number) {
    this.permitted(user)
    return this.policies.manager.transaction(async em => {
      const lock = await em.query(`DECLARE @result int;
        EXEC @result = sys.sp_getapplock @Resource = @0, @LockMode = 'Shared', @LockOwner = 'Transaction', @LockTimeout = 10000;
        SELECT @result AS lockResult;`, [`hr:payroll:policy:${policyId}`])
      if (!lock.length || Number(lock[0].lockResult) < 0) throw new ConflictException('تعذر قراءة ترتيب التحصيل أثناء تعديل السياسة')
      const policy = await this.policy(em, user, policyId), version = await this.version(em, policyId, versionId)
      return { ...await this.definitionView(em, version), version: this.versionView(version), capabilities: this.capabilities(user, policy) }
    })
  }

  async updateCollection(user: JwtPayload, policyId: number, versionId: number, dto: UpdatePayrollCollectionPolicyDto) {
    this.permitted(user, true)
    const reason = this.text(dto.reason, 'سبب تعديل ترتيب التحصيل', 500)
    return this.policies.manager.transaction(async em => {
      await this.lock(em, String(policyId))
      const policy = await this.policy(em, user, policyId, true), version = await this.version(em, policyId, versionId)
      this.expected(version.revision, dto.expectedRevision)
      const view = await this.definitionView(em, version)
      if (version.contractVersion !== 'SRS_V1' || view.definitionStatus !== 'COMPLETE') throw new ConflictException({ code: 'POLICY_DEFINITION_INCOMPLETE', message: 'أكمل تعريف نسخة السياسة قبل حفظ ترتيب التحصيل', definitionStatus: view.definitionStatus, definitionIssues: view.definitionIssues })
      const collection = this.collectionCheck(view.definition, dto.collection)
      if (version.status !== 'DRAFT' || version.frozenAt !== null || version.publishedAt !== null || version.publishedBy !== null) {
        const cloned = await this.clone(em, user, policy, version, { ...this.dates(version.effectiveFrom, version.effectiveTo), metadata: this.metadata(undefined, version.metadata), ...payrollPolicySettingsSnapshot(version) }, reason, undefined, undefined, collection)
        return { ...await this.definitionView(em, await this.version(em, policyId, cloned.version.id)), ...cloned }
      }
      const before = this.snapshot(version)
      version.collectionPolicy = collection; version.revision += 1; version.updatedBy = user.sub
      await em.getRepository(PayrollPolicyVersion).save(version)
      await this.event(em, user, policyId, versionId, 'COLLECTION_UPDATED', reason, { before, after: this.snapshot(version) })
      return { ...await this.definitionView(em, version), version: this.versionView(version), editKind: 'UPDATED' as const, capabilities: this.capabilities(user, policy) }
    })
  }

  async readLiveSources(user: JwtPayload, policyId: number, versionId: number, dto: ReadPayrollLiveSourcesDto) {
    this.permitted(user, true)
    const period = payrollLiveSourcePeriod(dto.periodStart, dto.periodEnd)
    if (!Number.isSafeInteger(dto.employeeId) || dto.employeeId < 1 || dto.employeeId > 2147483647) throw new BadRequestException('معرف الموظف غير صالح')
    // SERIALIZABLE captures rows and absent ranges consistently. Shared application locks coordinate policy and financial writers without reserving money.
    return this.policies.manager.transaction('SERIALIZABLE', async em => {
      for (const resource of [`hr:payroll:policy:${policyId}`, `hr:employee-finance:${dto.employeeId}`]) {
        const lock = await em.query(`DECLARE @result int;
          EXEC @result = sys.sp_getapplock @Resource = @0, @LockMode = 'Shared', @LockOwner = 'Transaction', @LockTimeout = 10000;
          SELECT @result AS lockResult;`, [resource])
        if (!lock.length || Number(lock[0].lockResult) < 0) throw new ConflictException({ code: 'LIVE_SOURCE_BUSY', message: 'المصادر قيد التعديل؛ حاول قراءة الفترة مجددًا بعد انتهاء العملية' })
      }
      const policy = await this.policy(em, user, policyId), version = await this.version(em, policyId, versionId)
      this.expected(version.revision, dto.expectedRevision)
      const employee = await em.getRepository(Employee).findOne({ where: { id: dto.employeeId }, select: { id: true, employeeCode: true, fullName: true, branchId: true } })
      if (!employee) throw new NotFoundException('الموظف غير موجود')
      const branch = branchScopeOf(user)
      if (branch !== null && employee.branchId !== branch) throw new ForbiddenException('الموظف خارج نطاق الفرع المسموح؛ إتاحة السياسة لا توسع صلاحية قراءة موظفي الفروع الأخرى')
      const view = await this.definitionView(em, version)
      const employment = await readPayrollLiveEmployment(em, employee.id, period.startDate, period.endDate)
      const overtime = await readPayrollLiveOvertime(em, employee.id, period.startDate, period.endDate)
      const ledger = await readPayrollLiveLedger(em, employee.id, period.startDate, period.endDate)
      const compensation = await readPayrollLiveCompensation(em, employee.id, period.startDate, period.endDate, employment.employment, employment.compensation, version.currency)
      const schedule = await readPayrollLiveSchedule(em, employee.id, period.startDate, period.endDate)
      const attendance = await readPayrollLiveAttendance(em, employee.id, period.startDate, period.endDate, schedule, employment.employment)
      const sections = { ...employment, compensation, schedule, attendance, overtime, ...ledger }
      const policyIssues: Array<{ code: string; message: string }> = []
      if (version.contractVersion !== 'SRS_V1' || view.definitionStatus !== 'COMPLETE' || view.collectionState !== 'COMPLETE') policyIssues.push({ code: 'LIVE_POLICY_INCOMPLETE', message: 'إعدادات أو تعريف أو ترتيب تحصيل السياسة غير مكتمل' })
      if (!policy.isActive || version.status !== 'ACTIVE') policyIssues.push({ code: 'LIVE_POLICY_NOT_PUBLISHED', message: 'قراءة المصادر متاحة لهذه النسخة، لكن النشر والإسناد لم يعتمدا' })
      if (version.effectiveFrom > period.startDate || (version.effectiveTo !== null && version.effectiveTo < period.endDate)) policyIssues.push({ code: 'LIVE_POLICY_PERIOD_MISMATCH', message: 'سريان نسخة السياسة لا يغطي الفترة المطلوبة كاملة' })
      const blockers = [
        ...policyIssues.map(issue => ({ section: 'policy', ...issue })),
        ...Object.entries(sections).flatMap(([section, value]) => value.state === 'AVAILABLE' ? [] : value.issues.map(issue => ({ section, ...issue }))),
        { section: 'execution', code: 'LIVE_SOURCE_EXECUTION_NOT_CONNECTED', message: 'هذه قراءة مصادر؛ إسناد السياسة وتثبيت لقطة المسير وتوصيل المدخلات الكاملة للحساب ما زالت مطلوبة' },
      ]
      const content = payrollLiveSourceContent({ providerVersion: PAYROLL_LIVE_SOURCE_VERSION,
        employee: { id: employee.id, employeeCode: employee.employeeCode, fullName: employee.fullName, branchId: employee.branchId }, period,
        policy: { identity: { id: policy.id, branchId: policy.branchId, isActive: policy.isActive }, version: this.versionView(version), ...view }, sections, blockers })
      return { providerVersion: PAYROLL_LIVE_SOURCE_VERSION, readOnly: true, sourceValidation: 'SERVER_READ_PARTIAL' as const,
        consistency: 'SERIALIZABLE_WITH_SHARED_POLICY_AND_EMPLOYEE_FINANCE_LOCKS' as const,
        capturedAt: new Date().toISOString(), capturedBy: user.sub, contentHash: content.contentHash,
        executionReady: false, approvalEligible: false, persisted: false, snapshot: content.snapshot }
    })
  }

  async previewExecution(user: JwtPayload, policyId: number, versionId: number, dto: PreviewPayrollPolicyExecutionDto) {
    this.permitted(user, true)
    return this.policies.manager.transaction(async em => {
      const lock = await em.query(`DECLARE @result int;
        EXEC @result = sys.sp_getapplock @Resource = @0, @LockMode = 'Shared', @LockOwner = 'Transaction', @LockTimeout = 10000;
        SELECT @result AS lockResult;`, [`hr:payroll:policy:${policyId}`])
      if (!lock.length || Number(lock[0].lockResult) < 0) throw new ConflictException('تعذر أخذ لقطة حساب السياسة أثناء تعديل جارٍ')
      await this.policy(em, user, policyId)
      const version = await this.version(em, policyId, versionId)
      this.expected(version.revision, dto.expectedRevision)
      const view = await this.definitionView(em, version)
      if (version.contractVersion !== 'SRS_V1' || view.definitionStatus !== 'COMPLETE') throw new ConflictException({ code: 'POLICY_DEFINITION_INCOMPLETE', message: 'حساب السياسة يتطلب تعريفًا مكتملًا من النسخة المحفوظة', definitionStatus: view.definitionStatus, definitionIssues: view.definitionIssues })
      if (view.collectionState !== 'COMPLETE') throw new ConflictException({ code: 'POLICY_COLLECTION_INCOMPLETE', message: 'احفظ تصنيفات الخصومات وترتيب التحصيل قبل تجربة الحساب', collectionState: view.collectionState, collectionIssues: view.collectionIssues })
      const input: PreviewPayrollPolicyExecutionDto = JSON.parse(JSON.stringify(dto))
      const basis = input.basis
      if (!basis || typeof basis !== 'object' || Array.isArray(basis) || Object.keys(basis).length !== 2 || !Object.prototype.hasOwnProperty.call(basis, 'earnedFixedGross') || !Object.prototype.hasOwnProperty.call(basis, 'sourceRef')) throw new BadRequestException('وعاء الحساب يتطلب earnedFixedGross وsourceRef فقط؛ ترتيب التحصيل يؤخذ من النسخة المحفوظة')
      try {
        const policySourceRef = `payroll-policy:${policyId}:version:${versionId}:revision:${version.revision}`
        const net = buildPayrollCollectionNetInput(view.definition, view.collection, { earnedFixedGross: basis.earnedFixedGross as never, sourceRef: basis.sourceRef as string, policySourceRef })
        const result = executePayrollPolicy(view.definition, this.definitionSettings(version), { components: input.components, sources: input.sources, net })
        // منع لقطة شرائح تحمل مراجعة عميل مختلفة عن النسخة المقفلة المستخدمة في الحساب.
        for (const line of result.execution.components) {
          const tier = line.steps.find(step => step.stage === 'TIER_SOURCE')?.details.normalizedInput as { expectedRevision: number } | undefined
          if (tier && tier.expectedRevision !== version.revision) throw new ConflictException({ code: 'POLICY_SOURCE_REVISION_CONFLICT', message: 'مصدر الشرائح لا يطابق مراجعة السياسة الحالية' })
        }
        const canonical = (value: any): any => Array.isArray(value) ? value.map(canonical) : value !== null && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value
        const metadata = { policyId, versionId, revision: version.revision, contractVersion: version.contractVersion,
          catalogVersion: version.catalogVersion, engineVersion: version.engineVersion, policyExecutionVersion: PAYROLL_POLICY_EXECUTION_VERSION }
        const snapshotHash = createHash('sha256').update(JSON.stringify(canonical({ ...metadata, snapshot: result.snapshot }))).digest('hex')
        return { ...metadata,
          previewOnly: true, sourceValidation: 'CALLER_UNVERIFIED' as const, collectionSource: 'STORED_POLICY_VERSION' as const, snapshotHash, result }
      } catch (error) {
        if (error instanceof PayrollCollectionPolicyError || error instanceof PayrollComponentExecutionError || error instanceof PayrollNetFinalizationError) throw new BadRequestException({ code: error.code, message: error.message, path: error.path })
        throw error
      }
    })
  }

  async previewTiers(user: JwtPayload, policyId: number, versionId: number, dto: PayrollTierPreviewDto) {
    this.permitted(user, true)
    return this.policies.manager.transaction(async em => {
      // القراءة تحت القفل نفسه تعطي تعريفًا وإعدادات من مراجعة واحدة بلا كتابة نتائج المعاينة.
      const lock = await em.query(`DECLARE @result int;
        EXEC @result = sys.sp_getapplock @Resource = @0, @LockMode = 'Shared', @LockOwner = 'Transaction', @LockTimeout = 10000;
        SELECT @result AS lockResult;`, [`hr:payroll:policy:${policyId}`])
      if (!lock.length || Number(lock[0].lockResult) < 0) throw new ConflictException('تعذر أخذ لقطة المعاينة أثناء تعديل السياسة؛ حاول مجددًا')
      await this.policy(em, user, policyId)
      const version = await this.version(em, policyId, versionId)
      this.expected(version.revision, dto.expectedRevision)
      const view = await this.definitionView(em, version)
      if (view.definitionStatus !== 'COMPLETE') throw new ConflictException({ code: 'POLICY_DEFINITION_INCOMPLETE', message: 'المعاينة تحتاج تعريف سياسة مكتملًا ومتحققًا بإقراراته وإصداراته المثبتة', definitionStatus: view.definitionStatus, definitionIssues: view.definitionIssues })
      const settings = this.definitionSettings(version), definition = this.definitionCheck(view.definition, settings).definition
      const input = JSON.parse(JSON.stringify(dto))
      try {
        const result = evaluatePayrollTierPreview(definition, settings, input)
        const canonical = (value: any): any => Array.isArray(value) ? value.map(canonical) : value !== null && typeof value === 'object'
          ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value
        const snapshotHash = createHash('sha256').update(JSON.stringify(canonical({ policyId, versionId, revision: version.revision,
          contractVersion: version.contractVersion, catalogVersion: version.catalogVersion, engineVersion: version.engineVersion,
          tierEngineVersion: PAYROLL_TIER_ENGINE_VERSION, settings, definition, input }))).digest('hex')
        return { policyId, versionId, revision: version.revision, contractVersion: version.contractVersion, catalogVersion: version.catalogVersion,
          engineVersion: version.engineVersion, tierEngineVersion: PAYROLL_TIER_ENGINE_VERSION, previewOnly: true, source: 'EXPLICIT_INPUTS', snapshotHash, result }
      } catch (error) {
        if (error instanceof PayrollTierPreviewError) {
          const body = { code: error.code, message: error.message, path: error.path }
          if (['TIER_PREVIEW_SET_UNAVAILABLE', 'TIER_PREVIEW_SOURCE_UNSUPPORTED'].includes(error.code)) throw new ConflictException(body)
          throw new BadRequestException(body)
        }
        throw error
      }
    })
  }

  async previewInputs(user: JwtPayload, policyId: number, versionId: number, dto: PreviewPayrollInputFactsDto) {
    this.permitted(user, true)
    return this.policies.manager.transaction(async em => {
      const lock = await em.query(`DECLARE @result int;
        EXEC @result = sys.sp_getapplock @Resource = @0, @LockMode = 'Shared', @LockOwner = 'Transaction', @LockTimeout = 10000;
        SELECT @result AS lockResult;`, [`hr:payroll:policy:${policyId}`])
      if (!lock.length || Number(lock[0].lockResult) < 0) throw new ConflictException('تعذر تثبيت إعدادات معاينة المدخلات أثناء تعديل جارٍ')
      await this.policy(em, user, policyId)
      const version = await this.version(em, policyId, versionId)
      this.expected(version.revision, dto.expectedRevision)
      if (version.contractVersion !== 'SRS_V1') throw new ConflictException({ code: 'POLICY_CONTRACT_UNSUPPORTED', message: 'معاينة الحقائق الجديدة تحتاج عقد SRS_V1؛ لا تحول سياسة قديمة ضمنيًا' })
      if ((version.catalogVersion !== null && version.catalogVersion !== PAYROLL_SRS_CATALOG_VERSION) ||
          (version.engineVersion !== null && version.engineVersion !== PAYROLL_FORMULA_ENGINE_VERSION)) {
        throw new ConflictException({ code: 'POLICY_DEFINITION_ENGINE_UNSUPPORTED', message: 'إصدارات نسخة السياسة غير مدعومة في معاينة المدخلات' })
      }
      const settings = this.definitionSettings(version), facts = JSON.parse(JSON.stringify(dto.facts))
      try {
        const result = buildPayrollInputFacts(facts, settings)
        const canonical = (value: any): any => Array.isArray(value) ? value.map(canonical) : value !== null && typeof value === 'object'
          ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value
        // البصمة تثبت المدخل الذي استُخدم؛ لا تحول مرجعًا قدمه المستخدم إلى تاريخ أجر موثق من الخادم.
        const snapshotHash = createHash('sha256').update(JSON.stringify(canonical({ policyId, versionId, revision: version.revision,
          contractVersion: version.contractVersion, inputFactsVersion: PAYROLL_INPUT_FACTS_VERSION, settings, facts: result.normalizedInput }))).digest('hex')
        return { policyId, versionId, revision: version.revision, contractVersion: version.contractVersion, catalogVersion: version.catalogVersion,
          engineVersion: version.engineVersion, inputFactsVersion: PAYROLL_INPUT_FACTS_VERSION, previewOnly: true, source: 'EXPLICIT_INPUTS', snapshotHash, result }
      } catch (error) {
        if (error instanceof PayrollInputFactsError) {
          const body = { code: error.code, message: error.message, path: error.path }
          if (error.code === 'INPUT_FACTS_PERIOD_UNSUPPORTED') throw new ConflictException(body)
          throw new BadRequestException(body)
        }
        throw error
      }
    })
  }

  async previewInstallments(user: JwtPayload, policyId: number, versionId: number, dto: PreviewPayrollInstallmentsDto) {
    this.permitted(user, true)
    return this.policies.manager.transaction(async em => {
      // قراءة المراجعة وإعدادات الحماية وخيار القسط تحت قفل واحد؛ لا تُحفظ نتيجة المعاينة كحركة مالية.
      const lock = await em.query(`DECLARE @result int;
        EXEC @result = sys.sp_getapplock @Resource = @0, @LockMode = 'Shared', @LockOwner = 'Transaction', @LockTimeout = 10000;
        SELECT @result AS lockResult;`, [`hr:payroll:policy:${policyId}`])
      if (!lock.length || Number(lock[0].lockResult) < 0) throw new ConflictException('تعذر تثبيت إعدادات معاينة الأقساط أثناء تعديل جارٍ')
      await this.policy(em, user, policyId)
      const version = await this.version(em, policyId, versionId)
      this.expected(version.revision, dto.expectedRevision)
      if (version.contractVersion !== 'SRS_V1') throw new ConflictException({ code: 'POLICY_CONTRACT_UNSUPPORTED', message: 'معاينة الأقساط الجديدة تتطلب عقد SRS_V1 ولا تعيد تفسير مسير تاريخي' })
      const view = await this.definitionView(em, version)
      if (view.definitionStatus !== 'COMPLETE') throw new ConflictException({ code: 'POLICY_DEFINITION_INCOMPLETE', message: 'معاينة الأقساط تتطلب تعريف سياسة مكتملًا بإصداراته وإقراراته', definitionStatus: view.definitionStatus, definitionIssues: view.definitionIssues })
      const settings = this.definitionSettings(version), definition = this.definitionCheck(view.definition, settings).definition
      const input: PreviewPayrollInstallmentsDto = JSON.parse(JSON.stringify(dto))
      try {
        const result = evaluatePayrollInstallmentPreview(definition, settings, input)
        const canonical = (value: any): any => Array.isArray(value) ? value.map(canonical) : value !== null && typeof value === 'object'
          ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value
        const snapshotHash = createHash('sha256').update(JSON.stringify(canonical({ policyId, versionId, revision: version.revision,
          contractVersion: version.contractVersion, catalogVersion: version.catalogVersion, engineVersion: version.engineVersion,
          installmentOptionsVersion: PAYROLL_INSTALLMENT_OPTIONS_VERSION, budgetVersion: PAYROLL_INSTALLMENT_BUDGET_VERSION,
          allocationVersion: PAYROLL_INSTALLMENT_ALLOCATION_VERSION, settings, definition, input }))).digest('hex')
        return { policyId, versionId, revision: version.revision, contractVersion: version.contractVersion, catalogVersion: version.catalogVersion,
          engineVersion: version.engineVersion, installmentOptionsVersion: PAYROLL_INSTALLMENT_OPTIONS_VERSION,
          budgetVersion: PAYROLL_INSTALLMENT_BUDGET_VERSION, allocationVersion: PAYROLL_INSTALLMENT_ALLOCATION_VERSION,
          previewOnly: true, source: 'EXPLICIT_INPUTS', sourceValidation: 'CALLER_UNVERIFIED', snapshotHash, result }
      } catch (error) {
        if (error instanceof PayrollInstallmentPreviewError || error instanceof PayrollInstallmentBudgetError || error instanceof PayrollInstallmentAllocationError) {
          const body = { code: error.code, message: error.message, path: error.path }
          if (['INSTALLMENT_PREVIEW_COMPONENT_UNAVAILABLE', 'INSTALLMENT_PREVIEW_COMPONENT_UNSUPPORTED', 'INSTALLMENT_PREVIEW_PERIOD_UNSUPPORTED'].includes(error.code)) throw new ConflictException(body)
          throw new BadRequestException(body)
        }
        throw error
      }
    })
  }

  async validateDefinition(user: JwtPayload, policyId: number, versionId: number, dto: ValidatePayrollPolicyDefinitionDto) {
    const version = await this.formulaVersion(user, policyId, versionId)
    const settings = this.definitionSettings(version, dto.settings)
    const checked = this.definitionCheck(dto.definition, settings, dto.autoOrder)
    const collection = this.replacementCollection(checked.definition, version.collectionPolicy, dto.collection)
    return { valid: true, policyId, versionId, revision: version.revision, catalogVersion: PAYROLL_SRS_CATALOG_VERSION,
      engineVersion: PAYROLL_FORMULA_ENGINE_VERSION, ...checked, collection }
  }

  async replaceDefinition(user: JwtPayload, policyId: number, versionId: number, dto: ReplacePayrollPolicyDefinitionDto) {
    this.permitted(user, true)
    const reason = this.text(dto.reason, 'سبب حفظ تعريف السياسة', 500)
    return this.policies.manager.transaction(async em => {
      await this.lock(em, String(policyId))
      const policy = await this.policy(em, user, policyId, true), version = await this.version(em, policyId, versionId)
      this.expected(version.revision, dto.expectedRevision)
      if (version.contractVersion !== 'SRS_V1') throw new ConflictException({ code: 'POLICY_FORMULA_CONTRACT_UNSUPPORTED', message: 'حفظ البنود متاح لعقد SRS_V1 فقط؛ النسخة التاريخية تحتفظ بعقدها' })
      const settings = this.definitionSettings(version, dto.settings), checked = this.definitionCheck(dto.definition, settings, dto.autoOrder)
      const collection = this.replacementCollection(checked.definition, version.collectionPolicy, dto.collection)
      this.requireAcknowledgements(checked.requiredAcknowledgements, dto.acknowledgedWarnings)
      // تحذير تصحيح الترتيب حدث لمرة واحدة؛ لا يبقى شرطًا معلقًا بعد حفظ التسلسل المصحح.
      const persisted = dto.autoOrder ? this.definitionCheck(checked.definition, settings) : checked
      if (version.status !== 'DRAFT' || version.frozenAt !== null || version.publishedAt !== null || version.publishedBy !== null) {
        const cloned = await this.clone(em, user, policy, version, { ...this.dates(version.effectiveFrom, version.effectiveTo), metadata: this.metadata(undefined, version.metadata), ...settings }, reason,
          { definition: checked.definition, acknowledgedWarnings: persisted.requiredAcknowledgements, auditWarnings: checked.warnings, auditAcknowledgements: checked.requiredAcknowledgements }, undefined, collection)
        return { ...await this.definitionView(em, await this.version(em, policyId, cloned.version.id)), ...cloned }
      }
      const before = { version: this.snapshot(version), definition: await readPayrollPolicyDefinition(em, versionId) }
      await replacePayrollPolicyDefinition(em, versionId, checked.definition)
      Object.assign(version, settings, { catalogVersion: PAYROLL_SRS_CATALOG_VERSION, engineVersion: PAYROLL_FORMULA_ENGINE_VERSION,
        definitionWarningAcknowledgements: persisted.requiredAcknowledgements, collectionPolicy: collection, revision: version.revision + 1, updatedBy: user.sub })
      await em.getRepository(PayrollPolicyVersion).save(version)
      await this.event(em, user, policyId, versionId, 'DEFINITION_UPDATED', reason, { before, after: { version: this.snapshot(version), definition: checked.definition }, warnings: checked.warnings, acknowledgedWarnings: checked.requiredAcknowledgements })
      return { ...await this.definitionView(em, version), version: this.versionView(version), editKind: 'UPDATED' as const, capabilities: this.capabilities(user, policy) }
    })
  }

  private versionView(version: PayrollPolicyVersion) {
    // حالة الإعدادات مشتقة للعرض فقط؛ لا تُحفظ داخل الكيان أو سجل التاريخ.
    return { ...version, ...inspectPayrollPolicySettings(version) }
  }

  private async initialSettings(em: EntityManager, patch: Partial<PayrollPolicySettings> | undefined) {
    if (patch === null) throw new BadRequestException('settings يجب أن تكون كائن إعدادات')
    // قراءة واحدة داخل معاملة الإنشاء؛ الغياب يستخدم البذرة، أما القيمة الفاسدة فلا تُستبدل بصمت.
    const rows = await em.getRepository(RequestsConfig).findBy({ key: In(Object.values(PAYROLL_POLICY_CONFIG_KEYS)) })
    const values = new Map(configSeed.map(row => [row.key, row.value]))
    for (const row of rows) values.set(row.key, row.value)
    const defaults = Object.fromEntries(PAYROLL_POLICY_SETTING_FIELDS.map(field => [field, parsePayrollPolicyConfigValue(field, values.get(PAYROLL_POLICY_CONFIG_KEYS[field]))]))
    return validatePayrollPolicySettings({ ...defaults, ...patch })
  }

  private async event(em: EntityManager, user: JwtPayload, policyId: number, versionId: number | null, eventType: string, reason: string | null, payload: Record<string, unknown>) {
    // الحدث والنسخة في المعاملة نفسها؛ فشل التدقيق يمنع حفظ تعديل بلا تاريخ.
    await em.getRepository(PayrollPolicyEvent).save({ policyId, versionId, eventType, actorUserId: user.sub, reason, payload })
  }

  async list(user: JwtPayload) {
    this.permitted(user)
    const scope = branchScopeOf(user)
    const policies = await this.policies.find({ where: scope === null ? {} : [{ branchId: scope }, { branchId: IsNull() }], order: { id: 'DESC' } })
    const versions = policies.length ? await this.policies.manager.getRepository(PayrollPolicyVersion).find({ where: { policyId: In(policies.map(row => row.id)) }, order: { versionNo: 'DESC' } }) : []
    return policies.map(policy => ({ policy, versions: versions.filter(version => version.policyId === policy.id).map(version => this.versionView(version)), capabilities: this.capabilities(user, policy) }))
  }

  async detail(user: JwtPayload, id: number) {
    this.permitted(user)
    const policy = await this.policy(this.policies.manager, user, id)
    const versions = await this.policies.manager.getRepository(PayrollPolicyVersion).find({ where: { policyId: id }, order: { versionNo: 'DESC' } })
    return { policy, versions: versions.map(version => this.versionView(version)), capabilities: this.capabilities(user, policy) }
  }

  async versionDetail(user: JwtPayload, policyId: number, versionId: number) {
    this.permitted(user)
    const policy = await this.policy(this.policies.manager, user, policyId)
    return { policyId, version: this.versionView(await this.version(this.policies.manager, policyId, versionId)), capabilities: this.capabilities(user, policy) }
  }

  formulaCatalog(user: JwtPayload) {
    this.permitted(user)
    return payrollFormulaCatalog()
  }

  private async formulaVersion(user: JwtPayload, policyId: number, versionId: number) {
    this.permitted(user, true)
    // التجربة قراءة بلا أثر مالي؛ يجوز اختبار السياسة العامة أو المؤرشفة داخل نطاق القراءة.
    await this.policy(this.policies.manager, user, policyId)
    const version = await this.version(this.policies.manager, policyId, versionId)
    if (version.contractVersion !== 'SRS_V1') throw new ConflictException({ code: 'POLICY_FORMULA_CONTRACT_UNSUPPORTED', message: 'مختبر المعادلات خاص بعقد SRS_V1؛ النسخة التاريخية تحتفظ بعقدها ولا تُحوّل تلقائيًا' })
    if ((version.catalogVersion != null && version.catalogVersion !== PAYROLL_SRS_CATALOG_VERSION) ||
        (version.engineVersion != null && version.engineVersion !== PAYROLL_FORMULA_ENGINE_VERSION)) throw new ConflictException({ code: 'POLICY_DEFINITION_ENGINE_UNSUPPORTED', message: 'إصدار لغة أو كتالوج هذه النسخة غير مدعوم؛ لا يُستبدل تلقائيًا بإصدار حالي' })
    return version
  }

  async validateFormula(user: JwtPayload, policyId: number, versionId: number, dto: ValidatePayrollFormulaDto) {
    const version = await this.formulaVersion(user, policyId, versionId)
    const inspected = inspectPayrollPolicySettings(version)
    return validatePolicyFormula(dto, inspected.settingsStatus === 'COMPLETE' ? version.roundingMode! : undefined)
  }

  async testFormula(user: JwtPayload, policyId: number, versionId: number, dto: TestPayrollFormulaDto) {
    const version = await this.formulaVersion(user, policyId, versionId)
    const inspected = inspectPayrollPolicySettings(version)
    if (inspected.settingsStatus !== 'COMPLETE') throw new ConflictException({ code: 'POLICY_SETTINGS_INCOMPLETE', message: 'أكمل إعدادات نسخة السياسة قبل تجربة الحساب', settingsStatus: inspected.settingsStatus, settingsIssues: inspected.settingsIssues })
    return testPolicyFormula(dto, validatePayrollPolicySettings(inspected.settings))
  }

  async validateComponentOrder(user: JwtPayload, policyId: number, versionId: number, dto: ValidatePayrollComponentOrderDto) {
    const version = await this.formulaVersion(user, policyId, versionId)
    const inspected = inspectPayrollPolicySettings(version)
    return validatePolicyComponentOrder(dto, inspected.settingsStatus === 'COMPLETE' ? version.roundingMode! : undefined)
  }

  async events(user: JwtPayload, policyId: number) {
    this.permitted(user)
    await this.policy(this.policies.manager, user, policyId)
    return this.policies.manager.getRepository(PayrollPolicyEvent).find({ where: { policyId }, order: { id: 'ASC' } })
  }

  async create(user: JwtPayload, dto: CreatePayrollPolicyDto) {
    this.permitted(user, true)
    const code = this.text(dto.code, 'كود السياسة', 40).toUpperCase()
    if (!/^[A-Z0-9][A-Z0-9_-]*$/.test(code)) throw new BadRequestException('كود السياسة يقبل الحروف الإنجليزية والأرقام والشرطة فقط')
    const name = this.text(dto.name, 'اسم السياسة', 200), dates = this.dates(dto.effectiveFrom, dto.effectiveTo)
    const userBranch = branchScopeOf(user)
    const branchId = dto.branchId === undefined ? userBranch : dto.branchId
    if (branchId !== null && (!Number.isInteger(branchId) || branchId < 1)) throw new BadRequestException('معرّف فرع السياسة غير صالح')
    if (userBranch !== null && branchId !== userBranch) throw new ForbiddenException('إنشاء السياسة متاح داخل فرعك فقط')
    try {
      return await this.policies.manager.transaction(async em => {
        await this.lock(em, `code:${code}`)
        if (await em.getRepository(PayrollPolicy).existsBy({ code })) throw new ConflictException({ code: 'POLICY_CODE_EXISTS', message: 'كود السياسة مستخدم بالفعل' })
        if (branchId !== null && !await em.getRepository(Branch).existsBy({ id: branchId, isActive: true })) throw new BadRequestException('فرع السياسة غير موجود أو معطل')
        const scope = await this.scope(em, branchId, dto.defaultScopeType ?? null, dto.defaultScopeIds ?? null)
        const settings = await this.initialSettings(em, dto.settings)
        const policy = await em.getRepository(PayrollPolicy).save(em.getRepository(PayrollPolicy).create({ code, name,
          description: this.optionalText(dto.description, 'وصف السياسة', 8000), branchId, ...scope,
          isActive: true, revision: 1, createdBy: user.sub, updatedBy: user.sub }))
        const version = await em.getRepository(PayrollPolicyVersion).save(em.getRepository(PayrollPolicyVersion).create({ policyId: policy.id,
          versionNo: 1, sourceVersionId: null, status: 'DRAFT', contractVersion: 'SRS_V1', ...dates, ...settings,
          catalogVersion: null, engineVersion: null, definitionWarningAcknowledgements: null,
          collectionPolicy: null,
          metadata: this.metadata(dto.metadata), revision: 1, publishedAt: null, publishedBy: null, frozenAt: null, createdBy: user.sub, updatedBy: user.sub }))
        await this.event(em, user, policy.id, version.id, 'CREATED', null, { policy: this.snapshot(policy), version: this.snapshot(version) })
        return { policy, versions: [this.versionView(version)], capabilities: this.capabilities(user, policy) }
      })
    } catch (error: any) {
      if (/UX_payroll_policy_code/i.test(String(error?.message)) && [2601, 2627].includes(Number(error?.driverError?.number ?? error?.number))) {
        throw new ConflictException({ code: 'POLICY_CODE_EXISTS', message: 'كود السياسة مستخدم بالفعل' })
      }
      throw error
    }
  }

  async update(user: JwtPayload, id: number, dto: UpdatePayrollPolicyDto) {
    this.permitted(user, true)
    const reason = this.text(dto.reason, 'سبب التعديل', 500)
    return this.policies.manager.transaction(async em => {
      await this.lock(em, String(id))
      const policy = await this.policy(em, user, id, true)
      this.expected(policy.revision, dto.expectedRevision)
      const before = this.snapshot(policy)
      if (dto.name !== undefined) policy.name = this.text(dto.name, 'اسم السياسة', 200)
      if (dto.description !== undefined) policy.description = this.optionalText(dto.description, 'وصف السياسة', 8000)
      if (dto.defaultScopeType !== undefined || dto.defaultScopeIds !== undefined) {
        Object.assign(policy, await this.scope(em, policy.branchId,
          dto.defaultScopeType === undefined ? policy.defaultScopeType : dto.defaultScopeType,
          dto.defaultScopeIds === undefined ? policy.defaultScopeIds : dto.defaultScopeIds))
      }
      policy.revision += 1; policy.updatedBy = user.sub
      await em.getRepository(PayrollPolicy).save(policy)
      await this.event(em, user, id, null, 'IDENTITY_UPDATED', reason, { before, after: this.snapshot(policy) })
      return { policy, capabilities: this.capabilities(user, policy) }
    })
  }

  private async clone(em: EntityManager, user: JwtPayload, policy: PayrollPolicy, source: PayrollPolicyVersion,
    values: Pick<PayrollPolicyVersion, 'effectiveFrom' | 'effectiveTo' | 'metadata'> & ReturnType<typeof payrollPolicySettingsSnapshot>, reason: string,
    replacement?: { definition: PayrollPolicyDefinition; acknowledgedWarnings: string[]; auditWarnings?: unknown[]; auditAcknowledgements?: string[] },
    acknowledgementsOverride?: string[], collectionOverride?: PayrollCollectionPolicy | null) {
    const sourceDefinition = await readPayrollPolicyDefinition(em, source.id)
    const last = await em.getRepository(PayrollPolicyVersion).findOne({ where: { policyId: policy.id }, order: { versionNo: 'DESC' } })
    const version = await em.getRepository(PayrollPolicyVersion).save(em.getRepository(PayrollPolicyVersion).create({
      policyId: policy.id, versionNo: (last?.versionNo ?? 0) + 1, sourceVersionId: source.id, status: 'DRAFT', contractVersion: source.contractVersion,
      catalogVersion: replacement ? PAYROLL_SRS_CATALOG_VERSION : source.catalogVersion,
      engineVersion: replacement ? PAYROLL_FORMULA_ENGINE_VERSION : source.engineVersion,
      definitionWarningAcknowledgements: replacement ? [...replacement.acknowledgedWarnings] : acknowledgementsOverride ?? (source.definitionWarningAcknowledgements === null ? null : JSON.parse(JSON.stringify(source.definitionWarningAcknowledgements))),
      collectionPolicy: collectionOverride === undefined ? (source.collectionPolicy == null ? null : JSON.parse(JSON.stringify(source.collectionPolicy))) : collectionOverride,
      effectiveFrom: values.effectiveFrom, effectiveTo: values.effectiveTo, metadata: values.metadata ? { ...values.metadata } : null,
      ...payrollPolicySettingsSnapshot(values),
      revision: 1, publishedAt: null, publishedBy: null, frozenAt: null, createdBy: user.sub, updatedBy: user.sub,
    }))
    const definition = replacement?.definition ?? sourceDefinition
    await replacePayrollPolicyDefinition(em, version.id, definition)
    await this.event(em, user, policy.id, version.id, 'VERSION_CLONED', reason, { source: this.snapshot(source), after: this.snapshot(version), sourceDefinition, definition,
      ...(collectionOverride === undefined ? {} : { collectionReplaced: true }),
      ...(replacement ? { definitionReplaced: true, warnings: replacement.auditWarnings ?? [], acknowledgedWarnings: replacement.auditAcknowledgements ?? replacement.acknowledgedWarnings } : {}) })
    return { policyId: policy.id, version: this.versionView(version), editKind: 'CLONED' as const, capabilities: this.capabilities(user, policy) }
  }

  async updateVersion(user: JwtPayload, policyId: number, versionId: number, dto: UpdatePayrollPolicyVersionDto) {
    this.permitted(user, true)
    const reason = this.text(dto.reason, 'سبب تعديل النسخة', 500)
    return this.policies.manager.transaction(async em => {
      await this.lock(em, String(policyId))
      const policy = await this.policy(em, user, policyId, true), version = await this.version(em, policyId, versionId)
      this.expected(version.revision, dto.expectedRevision)
      const dates = this.dates(dto.effectiveFrom === undefined ? version.effectiveFrom : dto.effectiveFrom,
        dto.effectiveTo === undefined ? version.effectiveTo : dto.effectiveTo)
      const metadata = this.metadata(dto.metadata, version.metadata)
      const settings = patchPayrollPolicySettings(version, dto.settings)
      let definitionAcknowledgements: string[] | undefined
      if (dto.settings !== undefined && (version.catalogVersion !== null || version.engineVersion !== null)) {
        if (version.catalogVersion !== PAYROLL_SRS_CATALOG_VERSION || version.engineVersion !== PAYROLL_FORMULA_ENGINE_VERSION) throw new ConflictException({ code: 'POLICY_DEFINITION_ENGINE_UNSUPPORTED', message: 'أصلح تعريف البنود كاملًا قبل تغيير إعدادات نسخة ذات إصدار غير مدعوم' })
        const checked = this.definitionCheck(await readPayrollPolicyDefinition(em, version.id), validatePayrollPolicySettings(settings))
        // تغيير الإعدادات قد يغيّر مقامROUND أو تحذير الشرائح؛ يُحفظ التعريف والإعدادات مع إقرار جديد عند الحاجة.
        const acknowledged = version.definitionWarningAcknowledgements ?? []
        const retained = Array.isArray(acknowledged) ? checked.requiredAcknowledgements.filter(id => acknowledged.includes(id)) : []
        this.requireAcknowledgements(checked.requiredAcknowledgements, retained)
        definitionAcknowledgements = checked.requiredAcknowledgements
      }
      // حالة النشر وتاريخ الاستخدام كلاهما يحمي الأصل، حتى لو تغيرت الحالة وحدها خارج المسار.
      if (version.status !== 'DRAFT' || version.frozenAt !== null || version.publishedAt !== null || version.publishedBy !== null) {
        return this.clone(em, user, policy, version, { ...dates, metadata, ...settings }, reason, undefined, definitionAcknowledgements)
      }
      const before = this.snapshot(version)
      Object.assign(version, dates, settings, { metadata, revision: version.revision + 1, updatedBy: user.sub })
      if (definitionAcknowledgements !== undefined) version.definitionWarningAcknowledgements = definitionAcknowledgements
      await em.getRepository(PayrollPolicyVersion).save(version)
      await this.event(em, user, policyId, versionId, 'VERSION_UPDATED', reason, { before, after: this.snapshot(version) })
      return { policyId, version: this.versionView(version), editKind: 'UPDATED' as const, capabilities: this.capabilities(user, policy) }
    })
  }

  async cloneVersion(user: JwtPayload, policyId: number, dto: ClonePayrollPolicyVersionDto) {
    this.permitted(user, true)
    const reason = this.text(dto.reason, 'سبب نسخ السياسة', 500)
    return this.policies.manager.transaction(async em => {
      await this.lock(em, String(policyId))
      const policy = await this.policy(em, user, policyId, true), source = await this.version(em, policyId, dto.sourceVersionId)
      this.expected(source.revision, dto.expectedRevision)
      return this.clone(em, user, policy, source, { ...this.dates(source.effectiveFrom, source.effectiveTo), metadata: this.metadata(undefined, source.metadata), ...payrollPolicySettingsSnapshot(source) }, reason)
    })
  }

  async archive(user: JwtPayload, id: number, dto: PayrollPolicyMutationDto) {
    this.permitted(user, true)
    const reason = this.text(dto.reason, 'سبب أرشفة السياسة', 500)
    return this.policies.manager.transaction(async em => {
      await this.lock(em, String(id))
      const policy = await this.policy(em, user, id, true)
      this.expected(policy.revision, dto.expectedRevision)
      const before = this.snapshot(policy)
      policy.isActive = false; policy.revision += 1; policy.updatedBy = user.sub
      await em.getRepository(PayrollPolicy).save(policy)
      await this.event(em, user, id, null, 'ARCHIVED', reason, { before, after: this.snapshot(policy) })
      return { policy, capabilities: this.capabilities(user, policy) }
    })
  }
}

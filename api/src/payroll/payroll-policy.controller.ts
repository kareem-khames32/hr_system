import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post, UseGuards, ValidationPipe } from '@nestjs/common'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { ClonePayrollPolicyVersionDto, CreatePayrollPolicyDto, PayrollPolicyMutationDto, PublishPayrollPolicyVersionDto, UpdatePayrollPolicyDto, UpdatePayrollPolicyVersionDto } from './payroll-policy.dto'
import { PayrollPolicyService } from './payroll-policy.service'
import { PayrollFormulaBodyPipe, TestPayrollFormulaDto, ValidatePayrollComponentOrderDto, ValidatePayrollFormulaDto } from './payroll-formula.dto'
import { ReplacePayrollPolicyDefinitionDto, ValidatePayrollPolicyDefinitionDto } from './payroll-policy-definition-api.dto'
import { PayrollTierPreviewDto } from './payroll-tier-preview.dto'
import { PreviewPayrollInputFactsDto } from './payroll-input-facts-api.dto'
import { PreviewPayrollInstallmentsDto } from './payroll-installment-preview.dto'
import { PreviewPayrollPolicyExecutionDto, UpdatePayrollCollectionPolicyDto } from './payroll-collection-api.dto'
import { ReadPayrollLiveSourcesDto } from './payroll-live-sources.dto'

// unknown يحافظ على الجسم الخام أمام المرشح العام؛ expectedType يطبق الكلاس ويرفض الحقول الزائدة محليًا.
const strictBody = (expectedType: new () => object) => new ValidationPipe({ expectedType, transform: true, whitelist: true, forbidNonWhitelisted: true })

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payroll/policies')
export class PayrollPolicyController {
  constructor(private readonly service: PayrollPolicyService) {}

  @Perm('payroll.view') @Get()
  list(@CurrentUser() user: JwtPayload) { return this.service.list(user) }

  @Perm('payroll.policy.manage') @Post()
  create(@CurrentUser() user: JwtPayload, @Body(strictBody(CreatePayrollPolicyDto)) body: unknown) {
    return this.service.create(user, body as CreatePayrollPolicyDto)
  }

  @Perm('payroll.view') @Get('formula-catalog')
  formulaCatalog(@CurrentUser() user: JwtPayload) { return this.service.formulaCatalog(user) }

  @Perm('payroll.calculate') @Post(':id/versions/:versionId/formulas/validate') @HttpCode(200)
  validateFormula(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Param('versionId', ParseIntPipe) versionId: number,
    @Body(new PayrollFormulaBodyPipe(), strictBody(ValidatePayrollFormulaDto)) body: unknown) {
    return this.service.validateFormula(user, id, versionId, body as ValidatePayrollFormulaDto)
  }

  @Perm('payroll.calculate') @Post(':id/versions/:versionId/formulas/test') @HttpCode(200)
  testFormula(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Param('versionId', ParseIntPipe) versionId: number,
    @Body(new PayrollFormulaBodyPipe(), strictBody(TestPayrollFormulaDto)) body: unknown) {
    return this.service.testFormula(user, id, versionId, body as TestPayrollFormulaDto)
  }

  @Perm('payroll.calculate') @Post(':id/versions/:versionId/components/validate-order') @HttpCode(200)
  validateComponentOrder(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Param('versionId', ParseIntPipe) versionId: number,
    @Body(new PayrollFormulaBodyPipe(), strictBody(ValidatePayrollComponentOrderDto)) body: unknown) {
    return this.service.validateComponentOrder(user, id, versionId, body as ValidatePayrollComponentOrderDto)
  }

  @Perm('payroll.calculate') @Post(':id/versions/:versionId/tiers/preview') @HttpCode(200)
  previewTiers(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Param('versionId', ParseIntPipe) versionId: number,
    @Body(new PayrollFormulaBodyPipe(30000), strictBody(PayrollTierPreviewDto)) body: unknown) {
    return this.service.previewTiers(user, id, versionId, body as PayrollTierPreviewDto)
  }

  @Perm('payroll.calculate') @Post(':id/versions/:versionId/inputs/preview') @HttpCode(200)
  previewInputs(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Param('versionId', ParseIntPipe) versionId: number,
    @Body(new PayrollFormulaBodyPipe(30000), strictBody(PreviewPayrollInputFactsDto)) body: unknown) {
    return this.service.previewInputs(user, id, versionId, body as PreviewPayrollInputFactsDto)
  }

  @Perm('payroll.calculate') @Post(':id/versions/:versionId/installments/preview') @HttpCode(200)
  previewInstallments(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Param('versionId', ParseIntPipe) versionId: number,
    @Body(new PayrollFormulaBodyPipe(50000), strictBody(PreviewPayrollInstallmentsDto)) body: unknown) {
    return this.service.previewInstallments(user, id, versionId, body as PreviewPayrollInstallmentsDto)
  }

  @Perm('payroll.view') @Get(':id')
  detail(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) { return this.service.detail(user, id) }

  @Perm('payroll.policy.manage') @Patch(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body(strictBody(UpdatePayrollPolicyDto)) body: unknown) {
    return this.service.update(user, id, body as UpdatePayrollPolicyDto)
  }

  @Perm('payroll.view') @Get(':id/events')
  events(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) { return this.service.events(user, id) }

  @Perm('payroll.view') @Get(':id/versions/:versionId')
  version(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Param('versionId', ParseIntPipe) versionId: number) {
    return this.service.versionDetail(user, id, versionId)
  }

  @Perm('payroll.view') @Get(':id/versions/:versionId/definition')
  definition(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Param('versionId', ParseIntPipe) versionId: number) {
    return this.service.definitionDetail(user, id, versionId)
  }

  @Perm('payroll.view') @Get(':id/versions/:versionId/collection')
  collection(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Param('versionId', ParseIntPipe) versionId: number) {
    return this.service.collectionDetail(user, id, versionId)
  }

  @Perm('payroll.policy.manage') @Patch(':id/versions/:versionId/collection')
  updateCollection(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Param('versionId', ParseIntPipe) versionId: number,
    @Body(new PayrollFormulaBodyPipe(50000), strictBody(UpdatePayrollCollectionPolicyDto)) body: unknown) {
    return this.service.updateCollection(user, id, versionId, body as UpdatePayrollCollectionPolicyDto)
  }

  @Perm('payroll.calculate') @Post(':id/versions/:versionId/sources/read') @HttpCode(200)
  readLiveSources(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Param('versionId', ParseIntPipe) versionId: number,
    @Body(new PayrollFormulaBodyPipe(1000), strictBody(ReadPayrollLiveSourcesDto)) body: unknown) {
    return this.service.readLiveSources(user, id, versionId, body as ReadPayrollLiveSourcesDto)
  }

  @Perm('payroll.calculate') @Post(':id/versions/:versionId/execution/preview') @HttpCode(200)
  previewExecution(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Param('versionId', ParseIntPipe) versionId: number,
    @Body(new PayrollFormulaBodyPipe(60000), strictBody(PreviewPayrollPolicyExecutionDto)) body: unknown) {
    return this.service.previewExecution(user, id, versionId, body as PreviewPayrollPolicyExecutionDto)
  }

  @Perm('payroll.calculate') @Post(':id/versions/:versionId/definition/validate') @HttpCode(200)
  validateDefinition(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Param('versionId', ParseIntPipe) versionId: number,
    @Body(new PayrollFormulaBodyPipe(30000), strictBody(ValidatePayrollPolicyDefinitionDto)) body: unknown) {
    return this.service.validateDefinition(user, id, versionId, body as ValidatePayrollPolicyDefinitionDto)
  }

  @Perm('payroll.policy.manage') @Patch(':id/versions/:versionId/definition')
  replaceDefinition(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Param('versionId', ParseIntPipe) versionId: number,
    @Body(new PayrollFormulaBodyPipe(30000), strictBody(ReplacePayrollPolicyDefinitionDto)) body: unknown) {
    return this.service.replaceDefinition(user, id, versionId, body as ReplacePayrollPolicyDefinitionDto)
  }

  @Perm('payroll.policy.manage') @Post(':id/versions')
  clone(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body(strictBody(ClonePayrollPolicyVersionDto)) body: unknown) {
    return this.service.cloneVersion(user, id, body as ClonePayrollPolicyVersionDto)
  }

  @Perm('payroll.policy.manage') @Patch(':id/versions/:versionId')
  updateVersion(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Param('versionId', ParseIntPipe) versionId: number,
    @Body(strictBody(UpdatePayrollPolicyVersionDto)) body: unknown) {
    return this.service.updateVersion(user, id, versionId, body as UpdatePayrollPolicyVersionDto)
  }

  @Perm('payroll.policy.manage') @Post(':id/archive')
  archive(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body(strictBody(PayrollPolicyMutationDto)) body: unknown) {
    return this.service.archive(user, id, body as PayrollPolicyMutationDto)
  }

  // الخطوة 15: مراجعة النشر قراءة فقط (المشكلات المانعة والتحذيرات ومعاينة الفترات والنسخ التي ستُغلق).
  @Perm('payroll.view') @Get(':id/versions/:versionId/publish-check')
  publishCheck(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Param('versionId', ParseIntPipe) versionId: number) {
    return this.service.publishCheck(user, id, versionId)
  }

  @Perm('payroll.policy.manage') @Post(':id/versions/:versionId/publish') @HttpCode(200)
  publish(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Param('versionId', ParseIntPipe) versionId: number,
    @Body(strictBody(PublishPayrollPolicyVersionDto)) body: unknown) {
    return this.service.publish(user, id, versionId, body as PublishPayrollPolicyVersionDto)
  }
}

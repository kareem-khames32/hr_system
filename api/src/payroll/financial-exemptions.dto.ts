import { Type } from 'class-transformer'
import { Allow, IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator'
import { EXEMPTION_DISPOSITIONS, EXEMPTION_ENTRY_TARGETS, EXEMPTION_SCOPE_KINDS, EXEMPTION_STATUSES, EXEMPTION_TYPE_TARGETS } from './financial-exemptions'

// الخطوة 26 (EX-03): الحقول الإلزامية؛ المانح وتاريخ المنح يُلتقطان من الجلسة والخادم ولا يُدخلان.
// السبب والمرفق يُتحقق منهما في الخدمة برموز عربية (EXEMPTION_REASON_*)، لا بنص class-validator.
export class ExemptionInputDto {
  @Type(() => Number) @IsInt() @Min(1) runId: number
  @Type(() => Number) @IsInt() @Min(1) employeeId: number
  @IsIn(EXEMPTION_SCOPE_KINDS as unknown as string[]) scopeKind: string
  @IsOptional() @IsIn([...EXEMPTION_TYPE_TARGETS, ...EXEMPTION_ENTRY_TARGETS]) targetKind?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) deductionTypeId?: number
  @IsOptional() @IsString() @MaxLength(40) targetRef?: string
  @IsOptional() @IsIn(EXEMPTION_DISPOSITIONS as unknown as string[]) disposition?: string
  @Allow() reason?: unknown
  @IsOptional() @IsString() @MaxLength(300) attachmentRef?: string
  // تبرير إضافي لتجاوز حد مسموح (EX-07) لحامل financial_exemption.override_limits
  @IsOptional() @IsString() @MaxLength(1000) overrideReason?: string
  // بصمة المعاينة التي عُرضت للمانح؛ الحفظ يرفض معاينة قديمة
  @IsOptional() @Matches(/^[a-f0-9]{64}$/) previewHash?: string
}

export class ExemptionDecisionDto {
  @Allow() reason?: unknown
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) expectedRevision?: number
}

export class ExemptionAttachmentDto {
  @IsString() @MaxLength(300) attachmentRef: string
}

export class ExemptionListQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) runId?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) employeeId?: number
  @IsOptional() @IsIn(EXEMPTION_STATUSES as unknown as string[]) status?: string
  @IsOptional() @Matches(/^\d{4}-\d{2}$/) period?: string
}

export class ExemptionReportQueryDto {
  @Matches(/^\d{4}-\d{2}$/, { message: 'شهر البداية بصيغة YYYY-MM' }) fromPeriod: string
  @Matches(/^\d{4}-\d{2}$/, { message: 'شهر النهاية بصيغة YYYY-MM' }) toPeriod: string
}

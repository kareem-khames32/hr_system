import { Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf, ValidateNested } from 'class-validator'

export const PAYROLL_DEFINITION_LIMITS = Object.freeze({ components: 200, parameters: 200, tierSets: 50, tiers: 1000 })
export const PAYROLL_COMPONENT_DECIMAL_FIELDS = ['amount', 'multiplier', 'percent', 'minAmount', 'maxAmount', 'capPctOfBase'] as const
export const PAYROLL_PARAMETER_DECIMAL_FIELDS = ['value'] as const
export const PAYROLL_TIER_SET_DECIMAL_FIELDS = ['maxDailyDeductionDayFraction', 'maxPeriodDeductionDayFraction'] as const
export const PAYROLL_TIER_DECIMAL_FIELDS = ['fromValue', 'toValue', 'multiplier', 'dayFraction', 'fixedAmount'] as const
export const PAYROLL_DEFINITION_COMPONENT_UNITS = ['CURRENCY', 'DAYS', 'HOURS', 'MINUTES', 'COUNT', 'FLAG', 'MONTHS'] as const
export const PAYROLL_DEFINITION_PARAMETER_UNITS = [...PAYROLL_DEFINITION_COMPONENT_UNITS, 'SCALAR', 'PERCENT'] as const
export const PAYROLL_DEFINITION_TIER_UNITS = ['MINUTES', 'COUNT', 'HOURS', 'DAYS', 'CURRENCY'] as const
export const PAYROLL_DEFINITION_SOURCE_TYPES = ['FIXED', 'EMPLOYEE_FIELD', 'SYSTEM_VAR', 'PERCENT_OF', 'TIERED', 'FORMULA', 'LEDGER', 'EXTERNAL', 'SYS_NET'] as const
export const PAYROLL_DEFINITION_METHODS = ['NONE', 'MULTIPLIER', 'DAY_FRACTION', 'RATE_1_1', 'FIXED_AMOUNT', 'FORMULA'] as const
export const PAYROLL_DEFINITION_ROUNDING_MODES = ['HALF_UP', 'HALF_EVEN', 'FLOOR', 'CEIL'] as const
const symbol = /^[A-Z][A-Z0-9_]{0,39}$/

// لا تستخدم IsOptional: null خيار صريح للحقول المشروطة، أما غياب المفتاح فلا يكمل التعريف.
export class PayrollPolicyComponentDto {
  @IsString() @Matches(symbol) code: string
  @IsString() @MinLength(1) @MaxLength(200) nameAr: string
  @IsIn(['EARNING', 'DEDUCTION', 'INFO']) componentType: 'EARNING' | 'DEDUCTION' | 'INFO'
  @IsInt() @Min(1) @Max(6) stage: number
  @IsInt() @Min(1) @Max(2147483647) sequence: number
  @IsIn(PAYROLL_DEFINITION_SOURCE_TYPES) valueSource: typeof PAYROLL_DEFINITION_SOURCE_TYPES[number]
  @ValidateIf((_, value) => value !== null) @IsString() @MinLength(1) @MaxLength(500) conditionFormula: string | null
  @IsIn(PAYROLL_DEFINITION_COMPONENT_UNITS) unit: typeof PAYROLL_DEFINITION_COMPONENT_UNITS[number]
  @IsIn(['NONE', 'BY_COVERED_DAYS', 'BY_COVERED_WORKING_DAYS']) prorationMode: 'NONE' | 'BY_COVERED_DAYS' | 'BY_COVERED_WORKING_DAYS'
  @ValidateIf((_, value) => value !== null) @IsString() @MaxLength(80) amount: string | null
  @ValidateIf((_, value) => value !== null) @IsString() @MaxLength(60) fieldPath: string | null
  @ValidateIf((_, value) => value !== null) @IsIn(['ZERO', 'SKIP']) missingFieldBehavior: 'ZERO' | 'SKIP' | null
  @ValidateIf((_, value) => value !== null) @IsString() @Matches(symbol) varCode: string | null
  @ValidateIf((_, value) => value !== null) @IsString() @MaxLength(80) multiplier: string | null
  @ValidateIf((_, value) => value !== null) @IsString() @MaxLength(80) percent: string | null
  @ValidateIf((_, value) => value !== null) @IsString() @MaxLength(48) baseCode: string | null
  @ValidateIf((_, value) => value !== null) @IsString() @Matches(symbol) tierSetCode: string | null
  @ValidateIf((_, value) => value !== null) @IsString() @MinLength(1) @MaxLength(500) formula: string | null
  @ValidateIf((_, value) => value !== null) @IsString() @MinLength(1) @MaxLength(40) ledgerCategory: string | null
  @ValidateIf((_, value) => value !== null) @IsIn(['DEBIT', 'CREDIT']) ledgerDirection: 'DEBIT' | 'CREDIT' | null
  @ValidateIf((_, value) => value !== null) @IsIn(['ALLOW_PARTIAL', 'BLOCK']) ledgerPartialPayment: 'ALLOW_PARTIAL' | 'BLOCK' | null
  @ValidateIf((_, value) => value !== null) @IsString() @MaxLength(80) minAmount: string | null
  @ValidateIf((_, value) => value !== null) @IsString() @MaxLength(80) maxAmount: string | null
  @ValidateIf((_, value) => value !== null) @IsString() @MaxLength(80) capPctOfBase: string | null
  @ValidateIf((_, value) => value !== null) @IsString() @MaxLength(48) capBaseCode: string | null
  @ValidateIf((_, value) => value !== null) @IsIn(PAYROLL_DEFINITION_ROUNDING_MODES) roundingMode: typeof PAYROLL_DEFINITION_ROUNDING_MODES[number] | null
  @ValidateIf((_, value) => value !== null) @IsInt() @Min(0) @Max(6) roundingScale: number | null
  @ValidateIf((_, value) => value !== null) @IsInt() @Min(1) @Max(2147483647) deductionPriority: number | null
  @IsBoolean() carryOverEligible: boolean
  @ValidateIf((_, value) => value !== null) @IsString() @MaxLength(40) rollupTo: string | null
  @IsBoolean() exemptible: boolean
  @IsBoolean() showOnPayslip: boolean
  @IsBoolean() isActive: boolean
}

export class PayrollPolicyParameterDto {
  @IsString() @Matches(symbol) code: string
  @IsString() @MinLength(1) @MaxLength(200) nameAr: string
  @IsString() @MaxLength(80) value: string
  @IsIn(PAYROLL_DEFINITION_PARAMETER_UNITS) unit: typeof PAYROLL_DEFINITION_PARAMETER_UNITS[number]
  @IsBoolean() isActive: boolean
}

export class PayrollPolicyTierDto {
  @IsInt() @Min(1) @Max(2147483647) sequence: number
  @IsString() @MaxLength(80) fromValue: string
  @ValidateIf((_, value) => value !== null) @IsString() @MaxLength(80) toValue: string | null
  @IsIn(PAYROLL_DEFINITION_METHODS) method: typeof PAYROLL_DEFINITION_METHODS[number]
  @ValidateIf((_, value) => value !== null) @IsString() @MaxLength(80) multiplier: string | null
  @ValidateIf((_, value) => value !== null) @IsString() @MaxLength(80) dayFraction: string | null
  @ValidateIf((_, value) => value !== null) @IsString() @MaxLength(80) fixedAmount: string | null
  @ValidateIf((_, value) => value !== null) @IsString() @MinLength(1) @MaxLength(500) formula: string | null
  @ValidateIf((_, value) => value !== null) @IsString() @MaxLength(200) label: string | null
  @IsBoolean() isActive: boolean
}

export class PayrollTierSetDto {
  @IsString() @Matches(symbol) code: string
  @IsString() @MinLength(1) @MaxLength(200) nameAr: string
  @ValidateIf((_, value) => value !== null) @IsString() @MaxLength(2000) description: string | null
  @ValidateIf((_, value) => value !== null) @IsString() @Matches(symbol) inputVar: string | null
  @ValidateIf((_, value) => value !== null) @IsString() @MinLength(1) @MaxLength(500) inputFormula: string | null
  @IsIn(PAYROLL_DEFINITION_TIER_UNITS) inputUnit: typeof PAYROLL_DEFINITION_TIER_UNITS[number]
  @IsIn(['PER_DAY', 'PERIOD_ACCUMULATED', 'OCCURRENCE_COUNT']) applicationBasis: 'PER_DAY' | 'PERIOD_ACCUMULATED' | 'OCCURRENCE_COUNT'
  @IsIn(['WHOLE', 'MARGINAL']) tierApplicationMode: 'WHOLE' | 'MARGINAL'
  @IsIn(['NONE', 'SUBTRACT', 'WAIVE_ALL_OR_NOTHING']) graceMode: 'NONE' | 'SUBTRACT' | 'WAIVE_ALL_OR_NOTHING'
  @IsInt() @Min(0) @Max(2147483647) graceMinutes: number
  @ValidateIf((_, value) => value !== null) @IsInt() @Min(1) @Max(2147483647) graceMaxUsesPerPeriod: number | null
  @IsBoolean() allowGraceOnFlexibleShift: boolean
  @IsBoolean() allowShiftGraceOverride: boolean
  @IsIn(['NO_DEDUCTION', 'FALLBACK_1_1', 'BLOCK']) noMatchBehavior: 'NO_DEDUCTION' | 'FALLBACK_1_1' | 'BLOCK'
  @ValidateIf((_, value) => value !== null) @IsString() @MaxLength(80) maxDailyDeductionDayFraction: string | null
  @ValidateIf((_, value) => value !== null) @IsString() @MaxLength(80) maxPeriodDeductionDayFraction: string | null
  @IsIn(['FLOOR', 'CEIL', 'NEAREST']) secondsRoundingMode: 'FLOOR' | 'CEIL' | 'NEAREST'
  @IsIn(['FLOOR', 'CEIL', 'NEAREST']) minutesRoundingMode: 'FLOOR' | 'CEIL' | 'NEAREST'
  @IsIn([1, 5, 10, 15]) roundingUnitMinutes: 1 | 5 | 10 | 15
  @ValidateIf((_, value) => value !== null) @IsIn(PAYROLL_DEFINITION_ROUNDING_MODES) roundingMode: typeof PAYROLL_DEFINITION_ROUNDING_MODES[number] | null
  @ValidateIf((_, value) => value !== null) @IsInt() @Min(0) @Max(6) roundingScale: number | null
  @IsBoolean() isActive: boolean
  @IsArray() @ArrayMaxSize(PAYROLL_DEFINITION_LIMITS.tiers) @ValidateNested({ each: true }) @Type(() => PayrollPolicyTierDto) tiers: PayrollPolicyTierDto[]
}

export class PayrollPolicyDefinitionDto {
  @IsArray() @ArrayMaxSize(PAYROLL_DEFINITION_LIMITS.parameters) @ValidateNested({ each: true }) @Type(() => PayrollPolicyParameterDto) parameters: PayrollPolicyParameterDto[]
  @IsArray() @ArrayMaxSize(PAYROLL_DEFINITION_LIMITS.tierSets) @ValidateNested({ each: true }) @Type(() => PayrollTierSetDto) tierSets: PayrollTierSetDto[]
  @IsArray() @ArrayMaxSize(PAYROLL_DEFINITION_LIMITS.components) @ValidateNested({ each: true }) @Type(() => PayrollPolicyComponentDto) components: PayrollPolicyComponentDto[]
}

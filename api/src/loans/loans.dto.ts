import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'

// المبالغ والنسب تُرسل نصوصًا دقيقة؛ التحقق الكامل في loan-caps.ts حتى تبقى رسالة واحدة للواجهة والخادم.
export class LoanCapPolicyDto {
  @IsString() @MaxLength(150) name: string
  @IsIn(['COMPANY', 'BRANCH', 'DEPARTMENT', 'TEAM', 'EMPLOYEES']) scopeType: string
  @IsOptional() @IsArray() @ArrayMaxSize(500) @IsInt({ each: true }) scopeIds?: number[] | null
  @IsOptional() @IsIn(['BASIC', 'GROSS']) salaryBase?: string | null
  @IsOptional() percentOfSalary?: string | number | null
  @IsOptional() flatCapAmount?: string | number | null
  @IsOptional() maxRequestsPerMonth?: number | string | null
  @IsOptional() maxAmountPerMonth?: string | number | null
  @IsOptional() maxOutstandingBalance?: string | number | null
  @IsOptional() maxInstallmentMonths?: number | string | null
  @IsOptional() @IsIn(['PAYROLL_PERIOD', 'CALENDAR']) monthDefinition?: string
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) effectiveFrom: string
  @IsOptional() effectiveTo?: string | null
  @IsOptional() priority?: number | string | null
  @IsOptional() @IsString() @MaxLength(500) reason?: string | null
}

export class DeactivateLoanCapPolicyDto {
  @IsString() @MinLength(3) @MaxLength(500) reason: string
}

export class LoanCapPreviewQueryDto {
  @IsOptional() @Matches(/^\d{1,16}(?:\.\d{1,2})?$/) amount?: string
  @IsOptional() @Matches(/^[1-9]\d{0,3}$/) months?: string
  @IsOptional() @Matches(/^[1-9]\d{0,9}$/) employeeId?: string
}

export class LoanRepaymentDto {
  // فارغ = سداد كلي بقيمة الإقفال الدقيقة
  @IsOptional() amount?: string | number | null
  @IsString() @MinLength(1) @MaxLength(100) reference: string
  @IsIn(['CASH', 'BANK_TRANSFER', 'OTHER']) method: 'CASH' | 'BANK_TRANSFER' | 'OTHER'
  @IsIn(['FULL', 'SHORTEN_TERM', 'REDUCE_INSTALLMENT']) mode: 'FULL' | 'SHORTEN_TERM' | 'REDUCE_INSTALLMENT'
  @IsOptional() @IsString() @MaxLength(500) reason?: string
}

export class LoanRecoveryCollectDto {
  amount: string | number
  @IsString() @MinLength(1) @MaxLength(100) reference: string
  @IsOptional() @IsString() @MaxLength(500) reason?: string
}
// class-validator يسقط الحقل بلا مزخرف مع whitelist؛ المبلغ يُتحقق منه في الخدمة.
IsOptional()(LoanRecoveryCollectDto.prototype, 'amount')

export class LoanRecoveryWriteOffDto {
  @IsString() @MinLength(10) @MaxLength(500) reason: string
}

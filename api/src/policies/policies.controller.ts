import { Body, Controller, Get, Logger, Param, ParseIntPipe, Patch, Post, Res, UseGuards } from '@nestjs/common'
import { IsBoolean, IsInt, IsObject, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator'
import type { Response } from 'express'
import { pipeline } from 'node:stream'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { fileStorage } from '../files/storage'
import { STORED_FILE_CHANGED, sha256VerifiedStream } from '../files/stored-file-hash'
import { RequireModule } from '../modules-registry/module.guard'
import { PoliciesService } from './policies.service'
import { AllowDuringPolicyGate } from './policy-gate.decorator'
import { POLICY_BODY_MAX, POLICY_GRACE_MAX } from './policy-rules'

// B2.7-أ: مكتبة السياسات والإقرار.
//  الإدارة والتقرير بصلاحية (policies.manage / policies.report). والموظف لنفسه من غير صلاحية (الفحص في الخدمة): «سياساتي»، و«اللي
//  مستنيني»، وقراءة نسخة سياسة هو في جمهورها، والإقرار بيها. مسارات الموظف دي بتفضل شغالة والحساب مقفول على إقرار، ومعاها سحب
//  السياسة لمديرها.

const DATE = /^\d{4}-\d{2}-\d{2}$/

class PolicyDto {
  @IsString() @MinLength(2) @MaxLength(200) title: string
  @IsOptional() @ValidateIf((_, value) => value !== null) @IsString() @MaxLength(100) category?: string | null
  // «مين + فين» بشكل جمهور أنواع الطلبات؛ null = كل الموظفين. الشكل بيتفحص في الخدمة
  @IsOptional() @ValidateIf((_, value) => value !== null) @IsObject() audience?: Record<string, unknown> | null
  @IsOptional() @IsBoolean() isMandatory?: boolean
  @IsOptional() @IsInt() @Min(0) @Max(POLICY_GRACE_MAX) graceDays?: number
}

class PolicyPatchDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(200) title?: string
  @IsOptional() @ValidateIf((_, value) => value !== null) @IsString() @MaxLength(100) category?: string | null
  @IsOptional() @ValidateIf((_, value) => value !== null) @IsObject() audience?: Record<string, unknown> | null
  @IsOptional() @IsBoolean() isMandatory?: boolean
  @IsOptional() @IsInt() @Min(0) @Max(POLICY_GRACE_MAX) graceDays?: number
}

class PolicyVersionDto {
  // الحد الفعلي في الخدمة بعد توحيد نهايات السطور؛ هنا سقف للنص الخام برسالة مفهومة
  @IsOptional() @ValidateIf((_, value) => value !== null) @IsString()
  @MaxLength(POLICY_BODY_MAX * 2, { message: `نص السياسة بحد أقصى ${POLICY_BODY_MAX} حرف — الأطول يترفع ملف PDF` }) bodyText?: string | null
  @IsOptional() @ValidateIf((_, value) => value !== null) @IsInt() @Min(1) fileId?: number | null
  @Matches(DATE, { message: 'تاريخ السريان بصيغة YYYY-MM-DD' }) effectiveDate: string
  @IsOptional() @IsBoolean() isMaterial?: boolean
}

class AcknowledgeDto {
  // بصمة النسخة اللي اتعرضت للموظف (من رد قراءتها)
  @Matches(/^[a-f0-9]{64}$/, { message: 'بصمة النسخة غير صالحة' }) contentHash: string
}

@RequireModule('policies')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('policies')
export class PoliciesController {
  private readonly logger = new Logger(PoliciesController.name)

  constructor(private readonly policies: PoliciesService) {}

  // ===== الموظف لنفسه (قبل ':id' حتى لا يلتقطها) =====
  @AllowDuringPolicyGate()
  @Get('mine')
  mine(@CurrentUser() user: JwtPayload) {
    return this.policies.mine(user)
  }

  @AllowDuringPolicyGate()
  @Get('pending')
  pending(@CurrentUser() user: JwtPayload) {
    return this.policies.pending(user)
  }

  @AllowDuringPolicyGate()
  @Get('versions/:versionId')
  version(@CurrentUser() user: JwtPayload, @Param('versionId', ParseIntPipe) versionId: number) {
    return this.policies.versionContent(user, versionId)
  }

  @AllowDuringPolicyGate()
  @Get('versions/:versionId/file')
  async versionFile(@CurrentUser() user: JwtPayload, @Param('versionId', ParseIntPipe) versionId: number, @Res() res: Response) {
    // بصمة الملف اتطابقت مع بصمة النسخة في الخدمة. والإرسال بالتدفق وبيتحقق تاني وهو ماشي: ملف اتبدّل بعد التحقق بيقطع الرد قبل ما يكمل،
    // والحجم المعلَن هو حجم الملف المتحقق منه، فالرد المقطوع مابيتحسبش كامل عند أي مستلم (ولا عند وسيط بـHTTP/1.0)
    const { file, stored } = await this.policies.versionFile(user, versionId)
    // العميل قفل الاتصال والتحقق شغال: مفيش مستلم، ومفيش ملف يتفتح من غير حد يقفله
    if (res.destroyed) return
    res.setHeader('Content-Type', file.mime)
    res.setHeader('Content-Length', stored.size)
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.originalName)}`)
    const source = fileStorage().read(file.storedName)
    try {
      // pipeline بتقفل التيارات كلها مع أي خطأ أو انقطاع من العميل
      pipeline(source, sha256VerifiedStream(stored), res, error => {
        if (error?.message === STORED_FILE_CHANGED) this.logger.error(`ملف نسخة السياسة ${versionId} اتبدّل على التخزين بعد التحقق من بصمته — الرد اتقطع قبل ما يكمل`)
      })
    } catch {
      // ماقدرتش تبدأ: الملف اللي اتفتح بيتقفل هنا، والرد بيتقفل (طلب من غير رد كان هيفضل معلّق)
      source.destroy()
      res.destroy()
    }
  }

  @AllowDuringPolicyGate()
  @Post('versions/:versionId/acknowledge')
  acknowledge(@CurrentUser() user: JwtPayload, @Param('versionId', ParseIntPipe) versionId: number, @Body() dto: AcknowledgeDto) {
    return this.policies.acknowledge(user, versionId, dto.contentHash)
  }

  // ===== الإدارة والتقرير =====
  @Perm('policies.manage', 'policies.report')
  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.policies.list(user)
  }

  @Perm('policies.manage')
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: PolicyDto) {
    return this.policies.create(user, dto)
  }

  @Perm('policies.manage', 'policies.report')
  @Get(':id')
  detail(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.policies.detail(user, id)
  }

  @Perm('policies.manage')
  @Patch(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: PolicyPatchDto) {
    return this.policies.update(user, id, dto)
  }

  @Perm('policies.manage')
  @Post(':id/versions')
  publish(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: PolicyVersionDto) {
    return this.policies.publish(user, id, dto)
  }

  // مدير السياسات يقدر يسحب سياسة وهو نفسه مقفول عليها (سياسة اتنشرت غلط، أو ملفها مابيتعرضش): المخرج الوحيد من غير إقرار
  @AllowDuringPolicyGate()
  @Perm('policies.manage')
  @Post(':id/withdraw')
  withdraw(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.policies.withdraw(user, id)
  }

  @Perm('policies.manage', 'policies.report')
  @Get(':id/report')
  report(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.policies.report(user, id)
  }
}

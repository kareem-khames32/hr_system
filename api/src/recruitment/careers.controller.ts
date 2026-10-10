import { Body, Controller, Get, Header, HttpCode, Ip, Param, ParseIntPipe, Post, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { IsOptional } from 'class-validator'
import { memoryStorage } from 'multer'
import { RequireFeature, RequireModule } from '../modules-registry/module.guard'
import { CV_MAX_MB, PUBLIC_CAREERS_FEATURE } from './careers'
import { CareersService } from './careers.service'
import { JobShareService } from './job-share.service'

// القيم كلها بتتفحص في الخدمة برسايلها (النموذج متعدد الأجزاء: كله نصوص)
class PublicApplicationDto {
  @IsOptional() fullName?: unknown
  @IsOptional() email?: unknown
  @IsOptional() phone?: unknown
  @IsOptional() nationalId?: unknown
  @IsOptional() consent?: unknown
  @IsOptional() source?: unknown
}

/**
 * B3.3-ب: صفحة الوظائف العامة والتقديم من اللينك — **من غير دخول عن قصد** (مفيش حارس جلسة): الميزة recruitment.public_careers مقفولة
 * افتراضيًا، والمقفولة (أو موديولها) = 404 كأن المسار مش موجود. اللي بيطلع: الوظائف المنشورة «خارجي» بس، ومن غير راتب ولا قسم.
 * التقديم محدود بالعنوان، والسيرة الذاتية في الذاكرة بسقف ثابت قبل الحكم عليها.
 */
@RequireModule('recruitment')
@RequireFeature(PUBLIC_CAREERS_FEATURE)
@Controller('careers')
export class CareersController {
  constructor(private readonly careers: CareersService, private readonly share: JobShareService) {}

  // B-ADD.6: فيد XML للوظائف المنشورة «خارجي» (indeed.xml وlinkedin.xml) على لينك ثابت — نفس خانات الصفحة العامة بس
  @Get('feed/:name')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  feed(@Param('name') name: string) {
    return this.share.feed(name)
  }

  @Get('jobs')
  @Header('Cache-Control', 'no-store')
  list() {
    return this.careers.list()
  }

  @Get('jobs/:id')
  @Header('Cache-Control', 'no-store')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.careers.detail(id)
  }

  @Post('jobs/:id/apply')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('cv', { storage: memoryStorage(), limits: { fileSize: CV_MAX_MB * 1024 * 1024, files: 1, fields: 12, fieldSize: 4096 } }))
  apply(@Param('id', ParseIntPipe) id: number, @Body() dto: PublicApplicationDto, @UploadedFile() file: Express.Multer.File | undefined, @Ip() ip: string) {
    return this.careers.apply(id, dto, file, ip)
  }
}

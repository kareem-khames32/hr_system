import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import type { Response } from 'express'
import { diskStorage } from 'multer'
import { existsSync, mkdirSync } from 'fs'
import { extname, join } from 'path'
import { randomUUID } from 'crypto'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, RolesGuard, userHasPerm } from '../auth/guards'
import { StoredFile } from './stored-file.entity'

// التخزين المحلي المنظم: uploads/YYYY-MM/
const UPLOADS_ROOT = join(process.cwd(), 'uploads')

const ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

const monthDir = () => {
  const d = new Date()
  const dir = join(
    UPLOADS_ROOT,
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  )
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

// رفع وتحميل الملفات الفعلية — سكانات ومستندات وتقارير طبية
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('files')
export class FilesController {
  constructor(
    @InjectRepository(StoredFile)
    private readonly files: Repository<StoredFile>
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, monthDir()),
        filename: (_req, file, cb) =>
          cb(null, `${randomUUID()}${extname(file.originalname)}`),
      }),
      limits: { fileSize: MAX_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              'نوع الملف غير مسموح — المسموح: صور JPG/PNG وPDF وWord وExcel'
            ) as any,
            false
          )
        }
        cb(null, true)
      },
    })
  )
  async upload(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('employeeId') employeeId?: string
  ) {
    if (!file) throw new BadRequestException('لم يصل ملف — أرسل الحقل file')
    const d = new Date()
    const rel = join(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      file.filename
    )
    const saved = await this.files.save(
      this.files.create({
        originalName: file.originalname,
        storedName: rel,
        mime: file.mimetype,
        size: file.size,
        entityType: entityType || undefined,
        entityId: entityId ? Number(entityId) : undefined,
        // الافتراضي: الملف تبع موظف رافعه — إلا لو الإدارة حددت غيره
        employeeId: employeeId
          ? Number(employeeId)
          : (user.employeeId ?? undefined),
        uploadedBy: user.sub,
      })
    )
    return {
      id: saved.id,
      originalName: saved.originalName,
      size: saved.size,
      mime: saved.mime,
      // المرجع الذي يوضع في fileRef بالسجلات
      ref: `file:${saved.id}`,
    }
  }

  // التحميل/المعاينة — صاحب الملف أو من يملك documents.manage
  @Get(':id')
  async download(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response
  ) {
    const f = await this.files.findOne({ where: { id } })
    if (!f) throw new NotFoundException('الملف غير موجود')
    const isOwner = f.employeeId === user.employeeId || f.uploadedBy === user.sub
    if (!isOwner && !userHasPerm(user, 'documents.manage')) {
      throw new ForbiddenException('لا تملك صلاحية الاطلاع على هذا الملف')
    }
    const abs = join(UPLOADS_ROOT, f.storedName)
    if (!existsSync(abs)) throw new NotFoundException('ملف التخزين مفقود')
    res.setHeader('Content-Type', f.mime)
    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(f.originalName)}`
    )
    res.sendFile(abs)
  }
}

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
import { DataSource, Repository } from 'typeorm'
import type { Response } from 'express'
import { diskStorage } from 'multer'
import { existsSync, mkdirSync, unlinkSync } from 'fs'
import { extname, join, relative } from 'path'
import { randomUUID } from 'crypto'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, CurrentUser, JwtAuthGuard, RolesGuard, userHasPerm } from '../auth/guards'
import { StoredFile } from './stored-file.entity'
import { Employee } from '../employees/employee.entity'
import { Request } from '../requests/entities/request.entity'
import { RequestsService } from '../requests/requests.service'
import { storedPath, uploadsRoot } from './storage'
import { assertHrDocumentFileAccess } from '../hr-documents/hr-document-access'
import { assertLetterFileAccess } from '../letters/letter-access'

// التخزين المحلي المنظم: uploads/YYYY-MM/

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
    uploadsRoot(),
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
    private readonly files: Repository<StoredFile>,
    private readonly ds: DataSource,
    private readonly requests: RequestsService
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
    try {
    if (entityType && !['request', 'employee_photo', 'company_logo', 'document', 'contract', 'leave_attachment'].includes(entityType)) {
      throw new BadRequestException('تصنيف الملف غير صالح')
    }
    for (const value of [entityId, employeeId]) {
      if (value !== undefined && (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1)) {
        throw new BadRequestException('معرّف الملف أو الموظف غير صالح')
      }
    }
    if (entityType === 'company_logo' && (!userHasPerm(user, 'settings.manage') || !file.mimetype.startsWith('image/'))) {
      throw new ForbiddenException('رفع شعار الشركة يتطلب صلاحية الإعدادات وملف صورة')
    }
    const ownerId = employeeId ? Number(employeeId) : user.employeeId
    if (ownerId && ownerId !== user.employeeId) {
      const emp = await this.ds.getRepository(Employee).findOneBy({ id: ownerId })
      const scope = branchScopeOf(user)
      if (!emp || (scope !== null && emp.branchId !== scope)) throw new NotFoundException('الموظف غير موجود')
      if (!userHasPerm(user, 'documents.manage') && !userHasPerm(user, 'employees.edit') && !userHasPerm(user, 'requests.create_on_behalf')) {
        throw new ForbiddenException('لا تملك صلاحية رفع ملفات لهذا الموظف')
      }
    }
    if (entityType === 'employee_photo' && !file.mimetype.startsWith('image/')) throw new BadRequestException('صورة الموظف يجب أن تكون صورة')
    const rel = relative(uploadsRoot(), file.path)
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
    } catch (err) {
      if (existsSync(file.path)) unlinkSync(file.path)
      throw err
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
    if (f.entityType === 'hr_document') {
      await assertHrDocumentFileAccess(this.ds.manager, user, f)
    } else if (f.entityType === 'letter') {
      // نفس سياسة /letters/:id/download — خطاب الراتب يحتاج قراءة المالية (SEC-07)
      await assertLetterFileAccess(this.ds.manager, user, f)
    } else {
    const isOwner = (!!user.employeeId && f.employeeId === user.employeeId) || (!!user.sub && f.uploadedBy === user.sub)
    // صور الموظفين قابلة للعرض لأي مطّلع على الموظفين (ليست مستنداً حساساً)
    const isEmployeePhoto = f.entityType === 'employee_photo'
    const emp = f.employeeId ? await this.ds.getRepository(Employee).findOneBy({ id: f.employeeId }) : null
    const photoOwner = isEmployeePhoto ? await this.ds.getRepository(Employee).findOneBy({ photoFileId: f.id }) : null
    const scope = branchScopeOf(user)
    const inScope = !!emp && (scope === null || scope === emp.branchId)
    const canViewPhoto = isEmployeePhoto && !!photoOwner && (scope === null || scope === photoOwner.branchId) && userHasPerm(user, 'employees.view')
    // شعار الشركة يُطبع في رأس المستندات المولَّدة — ليس مستنداً حساساً
    const isCompanyLogo = f.entityType === 'company_logo' && f.mime.startsWith('image/')
    let requestAccess = false
    if (!isOwner && f.entityType === 'request') {
      const ref = `file:${f.id}`
      const candidates = await this.ds.getRepository(Request).createQueryBuilder('r')
        .where('r.payload LIKE :ref', { ref: `%"${ref}"%` })
        .andWhere('r.status <> :draft', { draft: 'DRAFT' })
        .getMany()
      for (const candidate of candidates) {
        // A reference in a payload is not authority to re-share a file. In
        // particular, legacy or unsubmitted drafts may contain guessed ids.
        if (!(!!f.employeeId && candidate.requesterId === f.employeeId) &&
            !(!!f.uploadedBy && candidate.createdByUserId === f.uploadedBy)) continue
        try {
          const detail = await this.requests.detail(user, candidate.id)
          if (!(detail as any).confidentialMasked) { requestAccess = true; break }
        } catch { /* Access must follow the parent request, including confidential masking. */ }
      }
    }
    const canManage = f.entityType !== 'request' && userHasPerm(user, 'documents.manage') && (inScope || user.role === 'super_admin')
    if (!isOwner && !canViewPhoto && !isCompanyLogo && !requestAccess && !canManage) {
      throw new ForbiddenException('لا تملك صلاحية الاطلاع على هذا الملف')
    }
    }
    const abs = storedPath(f.storedName)
    if (!existsSync(abs)) throw new NotFoundException('ملف التخزين مفقود')
    res.setHeader('Content-Type', f.mime)
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(f.originalName)}`
    )
    res.sendFile(abs)
  }
}

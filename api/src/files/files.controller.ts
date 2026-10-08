import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Logger,
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
import { DataSource, In, Repository } from 'typeorm'
import type { Response } from 'express'
import { memoryStorage } from 'multer'
import { randomUUID } from 'crypto'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, CurrentUser, inBranchScope, JwtAuthGuard, RolesGuard, userHasPerm } from '../auth/guards'
import { AllowPreboarding } from '../auth/preboarding'
import { StoredFile } from './stored-file.entity'
import { Employee } from '../employees/employee.entity'
import { Request } from '../requests/entities/request.entity'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { RequestsService } from '../requests/requests.service'
import { fileStorage } from './storage'
import { assertHrDocumentFileAccess } from '../hr-documents/hr-document-access'
import { documentAckRequest, sendVerifiedFile, verifiedDocumentFile } from '../hr-documents/document-acknowledgements'
import { assertLetterFileAccess } from '../letters/letter-access'
import { assertTaskFileAccess } from '../tasks/task-rules'
import { assertCandidateCvAccess } from '../recruitment/candidate-applications'
import { assertExecutionProofAccess } from '../requests/execution-tasks'
import { CommentsService } from '../comments/comments.service'
import { AnnouncementsService } from '../announcements/announcements.service'
import { RequireModule } from '../modules-registry/module.guard'
import {
  classifyUpload, FILE_TYPE_EXTENSIONS, FILE_TYPE_MIME, FILES_ALLOWED_TYPES_KEY, FILES_MAX_SIZE_KEY, FILES_MAX_SIZE_LIMIT_MB,
  IMAGE_FILE_TYPES, maxFileSizeMb, parseAllowedFileTypes,
} from './file-type'
import { recordStoredFileHash, sha256Hex } from './stored-file-hash'

// التخزين المنظم: YYYY-MM/uuid.ext عن طريق واجهة التخزين (fileStorage — القرص دلوقتي)
const monthFolder = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// رفع وتحميل الملفات الفعلية — سكانات ومستندات وتقارير طبية
@RequireModule('platform')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('files')
export class FilesController {
  private readonly logger = new Logger(FilesController.name)

  constructor(
    @InjectRepository(StoredFile)
    private readonly files: Repository<StoredFile>,
    private readonly ds: DataSource,
    private readonly requests: RequestsService,
    private readonly comments: CommentsService,
    private readonly announcements: AnnouncementsService
  ) {}

  // B2.2: الحد والأنواع من الإعدادات وقت الرفع (files.max_size_mb وfiles.allowed_types)
  private async uploadSettings() {
    const rows = await this.ds.getRepository(RequestsConfig).find({ where: { key: In([FILES_MAX_SIZE_KEY, FILES_ALLOWED_TYPES_KEY]) } })
    const value = (key: string) => rows.find(row => row.key === key)?.value
    return { maxMb: maxFileSizeMb(value(FILES_MAX_SIZE_KEY)), allowed: parseAllowedFileTypes(value(FILES_ALLOWED_TYPES_KEY)) }
  }

  // B2.2: الملف بيتقرا في الذاكرة (بسقف 50 ميجا ثابت)، والحكم عليه قبل أي كتابة: الحد من الإعداد، والنوع الحقيقي من المحتوى
  // ومطابق للامتداد، وبعدين بس بيتكتب على التخزين ويتسجل ببصمته. المرفوض مابيكتبش حاجة على القرص ولا في القاعدة.
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: FILES_MAX_SIZE_LIMIT_MB * 1024 * 1024 } }))
  async upload(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('employeeId') employeeId?: string
  ) {
    if (!file) throw new BadRequestException('لم يصل ملف — أرسل الحقل file')
    if (entityType && !['request', 'employee_photo', 'company_logo', 'document', 'contract', 'policy', 'comment', 'announcement', 'leave_attachment', 'task'].includes(entityType)) {
      throw new BadRequestException('تصنيف الملف غير صالح')
    }
    for (const value of [entityId, employeeId]) {
      if (value !== undefined && (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1)) {
        throw new BadRequestException('معرّف الملف أو الموظف غير صالح')
      }
    }
    // B2.8: مرفق التعليق بيتربط بتعليقه وقت كتابته (CommentsService.add) — العميل مايحددش رقم كيان ولا موظف
    if (entityType === 'comment' && (entityId !== undefined || employeeId !== undefined)) throw new BadRequestException('مرفق التعليق بيترفع من غير رقم كيان أو موظف')
    // B2.16-ب: مرفق الإعلان بيتربط بإعلانه من مسار الإعلانات (تحت قفل صفه) — العميل مايحددش رقم كيان ولا موظف؛ ولصاحب صلاحية الإدارة بس
    if (entityType === 'announcement') {
      if (entityId !== undefined || employeeId !== undefined) throw new BadRequestException('مرفق الإعلان بيترفع من غير رقم كيان أو موظف')
      await this.announcements.assertCanUpload(user)
    }
    const LOGO_RULE = 'رفع شعار الشركة يتطلب صلاحية الإعدادات وملف صورة'
    if (entityType === 'company_logo' && !userHasPerm(user, 'settings.manage')) throw new ForbiddenException(LOGO_RULE)
    // B2.7: ملف سياسة (PDF) — لمدير السياسات بس، ومش تبع موظف. قراءته من مسار السياسات بحق الجمهور، مش من هنا
    const POLICY_RULE = 'رفع ملف سياسة يتطلب صلاحية إدارة السياسات وملف PDF'
    if (entityType === 'policy' && (!userHasPerm(user, 'policies.manage') || employeeId)) throw new ForbiddenException(POLICY_RULE)
    const ownerId = employeeId ? Number(employeeId) : user.employeeId
    if (ownerId && ownerId !== user.employeeId) {
      const emp = await this.ds.getRepository(Employee).findOneBy({ id: ownerId })
      if (!emp || !inBranchScope(branchScopeOf(user), emp.branchId)) throw new NotFoundException('الموظف غير موجود')
      if (!userHasPerm(user, 'documents.manage') && !userHasPerm(user, 'employees.edit') && !userHasPerm(user, 'requests.create_on_behalf')) {
        throw new ForbiddenException('لا تملك صلاحية رفع ملفات لهذا الموظف')
      }
    }
    // الصلاحيات الأول (نفس ترتيب الرفض القديم)، وبعدها المحتوى نفسه
    const settings = await this.uploadSettings()
    if (file.size > settings.maxMb * 1024 * 1024) throw new BadRequestException(`حجم الملف أكبر من الحد (${settings.maxMb} ميجا)`)
    const verdict = classifyUpload(file.buffer, file.originalname, settings.allowed)
    if ('error' in verdict) throw new BadRequestException(verdict.error)
    const image = IMAGE_FILE_TYPES.includes(verdict.type)
    if (entityType === 'company_logo' && !image) throw new ForbiddenException(LOGO_RULE)
    if (entityType === 'employee_photo' && !image) throw new BadRequestException('صورة الموظف لازم تكون صورة (JPG أو PNG أو WEBP)')
    if (entityType === 'policy' && FILE_TYPE_MIME[verdict.type] !== 'application/pdf') throw new ForbiddenException(POLICY_RULE)
    // الاسم على التخزين بامتداد النوع الحقيقي (مش امتداد المستخدم)، والنوع المسجل هو الحقيقي
    const storedName = `${monthFolder()}/${randomUUID()}${FILE_TYPE_EXTENSIONS[verdict.type][0]}`
    const sha256 = sha256Hex(file.buffer)
    const storage = fileStorage()
    await storage.write(storedName, file.buffer)
    try {
      const { saved, hashed } = await this.ds.transaction(async em => {
        const row = await em.save(StoredFile, em.create(StoredFile, {
          originalName: file.originalname,
          storedName,
          mime: FILE_TYPE_MIME[verdict.type],
          size: file.size,
          entityType: entityType || undefined,
          entityId: entityId ? Number(entityId) : undefined,
          // الافتراضي: الملف تبع موظف رافعه — إلا لو الإدارة حددت غيره. ملف السياسة ومرفق الإعلان مش تبع موظف
          employeeId: entityType === 'policy' || entityType === 'announcement' ? undefined : employeeId ? Number(employeeId) : (user.employeeId ?? undefined),
          uploadedBy: user.sub,
        }))
        return { saved: row, hashed: await recordStoredFileHash(em, row.id, sha256) }
      })
      return {
        id: saved.id,
        originalName: saved.originalName,
        size: saved.size,
        mime: saved.mime,
        // بصمة المحتوى (من غير ترحيل 085: null)
        sha256: hashed ? sha256 : null,
        // المرجع الذي يوضع في fileRef بالسجلات
        ref: `file:${saved.id}`,
      }
    } catch (err) {
      await storage.remove(storedName).catch(() => undefined)
      throw err
    }
  }

  // التحميل/المعاينة — صاحب الملف أو من يملك documents.manage
  @AllowPreboarding()
  @Get(':id')
  async download(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response
  ) {
    const f = await this.files.findOne({ where: { id } })
    if (!f) throw new NotFoundException('الملف غير موجود')
    // B2.7-ب: ملف مستند عليه طلب إقرار بيتبعت من هنا بنفس تطابق مسار المستند (بصمته قبل الإرسال وأثناءه): null = مش منهم
    let ackHash: string | null = null
    if (f.entityType === 'hr_document') {
      const document = await assertHrDocumentFileAccess(this.ds.manager, user, f)
      ackHash = (await documentAckRequest(this.ds.manager, document.id))?.contentHash ?? null
    } else if (f.entityType === 'letter') {
      // نفس سياسة /letters/:id/download — خطاب الراتب يحتاج قراءة المالية (SEC-07)
      await assertLetterFileAccess(this.ds.manager, user, f)
    } else if (f.entityType === 'task') {
      // B2.5: إثبات إقفال مهمة — بنفس حكم المهمة (مسؤولها، منشئها، مدير مسؤولها، «عرض كل المهام» في فرعها)، مش بملكية الرفع العامة
      await assertTaskFileAccess(this.ds.manager, user, f)
      // B2.6: إثبات مهمة تنفيذ طلب تبع الطلب (ممكن يكون سري): لرافعه بس
      await assertExecutionProofAccess(this.ds.manager, user, f)
    } else if (f.entityType === 'comment') {
      // B2.8: مرفق تعليق — بحكم التعليق نفسه (حق الكيان، والداخلي مش لصاحب الطلب)، مش بملكية الرفع العامة
      await this.comments.assertFileAccess(user, f)
    } else if (f.entityType === 'announcement') {
      // B2.16-ب: مرفق إعلان — بحكم الإعلان نفسه (اللي بيديره، أو موظف الإعلان ساري له وهو في جمهوره)، مش بملكية الرفع العامة
      await this.announcements.assertFileAccess(user, f)
    } else if (f.entityType === 'candidate_cv') {
      // B3.3-ب: السيرة الذاتية لمتقدّم من اللينك العام — بحكم المرشح (إدارة التوظيف ونطاق فرعه)، مش بملكية الرفع العامة
      await assertCandidateCvAccess(this.ds.manager, user, f)
    } else {
    const isOwner = (!!user.employeeId && f.employeeId === user.employeeId) || (!!user.sub && f.uploadedBy === user.sub)
    // صور الموظفين قابلة للعرض لأي مطّلع على الموظفين (ليست مستنداً حساساً)
    const isEmployeePhoto = f.entityType === 'employee_photo'
    const emp = f.employeeId ? await this.ds.getRepository(Employee).findOneBy({ id: f.employeeId }) : null
    const photoOwner = isEmployeePhoto ? await this.ds.getRepository(Employee).findOneBy({ photoFileId: f.id }) : null
    const scope = branchScopeOf(user)
    const inScope = !!emp && inBranchScope(scope, emp.branchId)
    const canViewPhoto = isEmployeePhoto && !!photoOwner && inBranchScope(scope, photoOwner.branchId) && userHasPerm(user, 'employees.view')
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
    const storage = fileStorage()
    if (!(await storage.exists(f.storedName))) throw new NotFoundException('ملف التخزين مفقود')
    const headers = () => {
      res.setHeader('Content-Type', f.mime)
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('Cache-Control', 'private, no-store')
      res.setHeader(
        'Content-Disposition',
        `inline; filename*=UTF-8''${encodeURIComponent(f.originalName)}`
      )
    }
    if (ackHash !== null) {
      const verified = await verifiedDocumentFile(f.storedName, ackHash)
      sendVerifiedFile(res, f.storedName, verified, headers,
        () => this.logger.error(`ملف المستند ${f.entityId} اتبدّل على التخزين بعد التحقق من بصمته — الرد اتقطع قبل ما يكمل`))
      return
    }
    headers()
    const local = storage.localPath(f.storedName)
    if (local) res.sendFile(local)
    else storage.read(f.storedName).pipe(res)
  }
}

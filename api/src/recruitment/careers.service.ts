import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { randomUUID } from 'crypto'
import { DataSource, In, type EntityManager } from 'typeorm'
import { Candidate } from '../assets/assets.entities'
import {
  FILES_ALLOWED_TYPES_KEY, FILES_MAX_SIZE_KEY, FILE_TYPE_EXTENSIONS, FILE_TYPE_MIME, classifyUpload, maxFileSizeMb, parseAllowedFileTypes,
} from '../files/file-type'
import { fileStorage } from '../files/storage'
import { recordStoredFileHash, sha256Hex } from '../files/stored-file-hash'
import { StoredFile } from '../files/stored-file.entity'
import { Branch } from '../org/entities/branch.entity'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { CandidateApplication } from './candidate-application.entity'
import { assertNotDuplicateOnJob, candidateApplicationsReady, cleanNationalId } from './candidate-applications'
import {
  AttemptLimiter, CAREERS_CV_SIZE, CAREERS_TOO_MANY, CV_ENTITY_TYPE, CV_FILE_TYPES, CV_MAX_MB, assertConsent, cleanApplicantEmail, cleanApplicantName, cleanApplicantPhone, publicSource, uploadedFileName,
} from './careers'
import { RecruitmentJob } from './recruitment-job.entity'
import { jobCode, recruitmentJobsReady } from './recruitment-rules'

export interface PublicApplicationInput { fullName?: unknown; email?: unknown; phone?: unknown; nationalId?: unknown; consent?: unknown; source?: unknown }
export interface PublicCvFile { buffer: Buffer; originalname: string; size: number }

const JOB_NOT_FOUND = 'الوظيفة غير موجودة'
const monthFolder = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` }

// B3.3-ب: صفحة الوظائف العامة والتقديم من اللينك — من غير دخول. اللي بيتعرض: الوظائف المنشورة «خارجي» بس، ومن غير نطاق الراتب ولا القسم.
@Injectable()
export class CareersService {
  // 20 تقديم للعنوان (شبكة شركة أو معرض توظيف ممكن تبقى عنوان واحد) و300 للكل في 10 دقايق. ورا وسيط (proxy): TRUST_PROXY لازم يتضبط
  // عشان العنوان يبقى عنوان المتقدّم مش الوسيط
  readonly limiter = new AttemptLimiter(20, 300, 10 * 60 * 1000)

  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  private async ready(em: EntityManager) {
    return (await recruitmentJobsReady(em)) && (await candidateApplicationsReady(em))
  }

  private view(job: RecruitmentJob, branches: Map<number, string>) {
    return {
      id: job.id, code: jobCode(job.id), title: job.title, branchName: branches.get(job.branchId) ?? null, openings: job.openings,
      description: job.description ?? null, requirements: job.requirements ?? null, startDate: job.startDate ? String(job.startDate).slice(0, 10) : null,
      publishedAt: job.publishedAt ?? null,
    }
  }

  // B-ADD.6: نفس الشكل العام بيتبني عليه بوست «انشر الوظيفة» والفيد (job-share.service.ts) — مفيش خانة بتطلع من غير ما تعدّي من هنا
  async views(em: EntityManager, jobs: RecruitmentJob[]) {
    if (!jobs.length) return []
    const branches = new Map((await em.getRepository(Branch).find({ where: { id: In([...new Set(jobs.map((job) => job.branchId))]) } })).map((row) => [row.id, row.name]))
    return jobs.map((job) => this.view(job, branches))
  }

  async list() {
    const em = this.ds.manager
    return { jobs: await this.published(em) }
  }

  async detail(id: number) {
    const em = this.ds.manager
    const job = (await this.ready(em)) ? await em.getRepository(RecruitmentJob).findOne({ where: { id, status: 'PUBLISHED', external: true } }) : null
    if (!job) throw new NotFoundException(JOB_NOT_FOUND)
    return (await this.views(em, [job]))[0]
  }

  /** B-ADD.6: كل الوظائف المنشورة «خارجي» بشكلها العام — للفيد */
  async published(em: EntityManager) {
    if (!(await this.ready(em))) return []
    return this.views(em, await em.getRepository(RecruitmentJob).find({ where: { status: 'PUBLISHED', external: true }, order: { publishedAt: 'DESC', id: 'DESC' } }))
  }

  private async cvRules() {
    const rows = await this.ds.getRepository(RequestsConfig).find({ where: { key: In([FILES_MAX_SIZE_KEY, FILES_ALLOWED_TYPES_KEY]) } })
    const value = (key: string) => rows.find((row) => row.key === key)?.value
    const allowed = parseAllowedFileTypes(value(FILES_ALLOWED_TYPES_KEY))
    return { maxMb: Math.min(CV_MAX_MB, maxFileSizeMb(value(FILES_MAX_SIZE_KEY))), allowed: CV_FILE_TYPES.filter((type) => allowed.includes(type)) }
  }

  /**
   * تقديم من غير دخول. الحد بالعنوان بيتحسب أول حاجة. القيم كلها بتتفحص قبل أي كتابة، والسيرة الذاتية بتتحكم بنوعها الحقيقي. تحت قفل صف
   * الوظيفة: لسه منشورة خارجيًا، وفحص التكرار. المتقدّم المكرر بياخد نفس رد المقبول (من غير صف ولا ملف) — الرد مابيقولش مين قدّم قبل كده.
   */
  async apply(jobId: number, input: PublicApplicationInput, file: PublicCvFile | undefined, clientKey: string) {
    if (!this.limiter.take(clientKey || 'unknown')) throw new HttpException(CAREERS_TOO_MANY, HttpStatus.TOO_MANY_REQUESTS)
    const fullName = cleanApplicantName(input.fullName), email = cleanApplicantEmail(input.email), phone = cleanApplicantPhone(input.phone)
    const nationalId = cleanNationalId(input.nationalId), source = publicSource(input.source)
    assertConsent(input.consent)
    let cv: { storedName: string; mime: string; size: number; originalName: string } | null = null
    if (file) {
      const rules = await this.cvRules()
      if (file.size > rules.maxMb * 1024 * 1024) throw new BadRequestException(CAREERS_CV_SIZE)
      const verdict = classifyUpload(file.buffer, file.originalname, rules.allowed)
      if ('error' in verdict) throw new BadRequestException(verdict.error)
      cv = { storedName: `${monthFolder()}/${randomUUID()}${FILE_TYPE_EXTENSIONS[verdict.type][0]}`, mime: FILE_TYPE_MIME[verdict.type], size: file.size,
        originalName: uploadedFileName(file.originalname) }
    }
    const storage = fileStorage()
    // الملف بيتكتب بعد ما كل القيم عدّت، وبيتشال لو المعاملة مارجّعتش صف (تكرار أو رفض)
    if (cv && file) await storage.write(cv.storedName, file.buffer)
    const sha256 = cv && file ? sha256Hex(file.buffer) : null
    // الملف اتربط بصف (المعاملة ثبتت بيه)؟ غير كده بيتشال من التخزين
    let kept = false
    try {
      kept = await this.ds.transaction(async (em) => {
        const job = (await this.ready(em)) ? await em.getRepository(RecruitmentJob).findOne({ where: { id: jobId }, lock: { mode: 'pessimistic_write' } }) : null
        if (!job || job.status !== 'PUBLISHED' || job.external !== true) throw new NotFoundException(JOB_NOT_FOUND)
        try {
          await assertNotDuplicateOnJob(em, job.id, { email, phone, nationalId })
        } catch (error) {
          if (error instanceof ConflictException) return false
          throw error
        }
        const candidates = em.getRepository(Candidate)
        const candidate = await candidates.save(candidates.create({ fullName, email, phone, positionTitle: job.title, branchId: job.branchId }))
        let cvFileId: number | null = null
        if (cv) {
          const stored = await em.save(StoredFile, em.create(StoredFile, { originalName: cv.originalName, storedName: cv.storedName, mime: cv.mime, size: cv.size,
            entityType: CV_ENTITY_TYPE, entityId: candidate.id }))
          cvFileId = stored.id
          if (sha256) await recordStoredFileHash(em, stored.id, sha256)
        }
        await em.getRepository(CandidateApplication).insert({
          candidateId: candidate.id, jobId: job.id, source, nationalId, applicantEmployeeId: null, cvFileId, consentAt: new Date(), createdAt: new Date(),
        })
        return cvFileId !== null
      })
    } finally {
      if (cv && !kept) await storage.remove(cv.storedName).catch(() => undefined)
    }
    return { received: true }
  }
}

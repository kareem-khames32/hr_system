import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { DataSource, EntityManager, In } from 'typeorm'
import { mkdir, writeFile, unlink, access } from 'fs/promises'
import { randomUUID } from 'crypto'
import { dirname } from 'path'
import { Employee } from '../employees/employee.entity'
import { StoredFile } from '../files/stored-file.entity'
import { storedPath } from '../files/storage'
import { LetterRequest } from '../requests/entities/letter.entities'
import { Request } from '../requests/entities/request.entity'
import { RequestType } from '../requests/entities/request-type.entity'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, userHasPerm } from '../auth/guards'
import { LetterTemplatesService } from './letter-templates.service'
import { LetterRenderer } from './letter-renderer.service'
import { resolveLetterContent } from './letter-template-content'
import { IssuedLetterSnapshot } from './letter-template.entities'
import { localDateOf } from '../attendance/attendance.service'
import { grossMonthlySalary } from '../employees/compensation'

@Injectable()
export class LettersService {
  constructor(private readonly ds: DataSource, private readonly templates: LetterTemplatesService, private readonly renderer: LetterRenderer) {}

  async generate(em: EntityManager, req: Request, type: RequestType, payload: Record<string, unknown>) {
    const repo = em.getRepository(LetterRequest)
    const existing = await repo.findOneBy({ requestId: req.id })
    if (existing?.generatedPdfRef) {
      const f = await em.getRepository(StoredFile).findOneBy({ id: Number(existing.generatedPdfRef.replace('file:', '')) })
      if (f) {
        try { await access(storedPath(f.storedName)); return { ref: `LTR-${existing.id}`, completed: true } } catch { /* recover from the immutable issuance snapshot below */ }
      }
      if (!existing.contentSnapshot) throw new NotFoundException('ملف الخطاب القديم مفقود؛ استعد نسخته من النسخة الاحتياطية')
    }
    const employee = await em.getRepository(Employee).findOneBy({ id: req.requesterId })
    if (!employee) throw new NotFoundException('الموظف غير موجود')
    const purpose = String(payload.purpose ?? payload.reason ?? '').trim()
    if (purpose.length > 500) throw new BadRequestException('الغرض من الخطاب لا يتجاوز 500 حرف')
    let snapshot: IssuedLetterSnapshot
    let templateId = existing?.templateId ?? null
    let templateRevisionId = existing?.templateRevisionId ?? null
    if (existing?.contentSnapshot) snapshot = existing.contentSnapshot
    else {
      const { template, revision } = await this.templates.publishedFor(em, type.code)
      const config = await em.getRepository(RequestsConfig).findBy({ key: In(['company.name', 'company.name_en', 'company.address', 'company.phone', 'company.commercial_register']) })
      const company = Object.fromEntries(config.map(c => [c.key, c.value.trim()]))
      if (!company['company.name']) throw new BadRequestException('أكمل اسم الشركة في الإعدادات قبل إصدار الخطابات')
      if (!employee.jobTitle || !employee.joinDate) throw new BadRequestException('أكمل المسمى الوظيفي وتاريخ التعيين قبل إصدار الخطاب')
      const salary = grossMonthlySalary(employee)
      if (!Number.isFinite(salary) || salary < 0) throw new BadRequestException('بيانات الراتب غير صالحة')
      const date = localDateOf(new Date())
      const values: Record<string, string> = {
        'employee.fullName': employee.fullName, 'employee.employeeCode': employee.employeeCode,
        'employee.jobTitle': employee.jobTitle, 'employee.joinDate': employee.joinDate,
        'employee.employmentPhrase': ['terminated', 'archived'].includes(employee.status) ? 'سبق أن عمل لدينا' : 'يعمل لدينا',
        'employee.nationalId': employee.nationalId || '', 'company.name': company['company.name'],
        'company.address': company['company.address'] || '', 'company.phone': company['company.phone'] || '',
        date, 'request.ref': `REQ-${req.id}`, purpose, 'salary.total': salary.toFixed(2), 'salary.currency': employee.currency || 'SAR',
      }
      snapshot = { content: resolveLetterContent(revision.content, values), companyName: company['company.name'], companyNameEn: company['company.name_en'] || '', companyAddress: company['company.address'] || '', companyPhone: company['company.phone'] || '', commercialRegister: company['company.commercial_register'] || '', issuedDate: date, requestRef: `REQ-${req.id}` }
      templateId = template.id
      templateRevisionId = revision.id
    }
    const bytes = await this.renderer.pdf(snapshot)
    const storedName = `letters/${randomUUID()}.pdf`
    const target = storedPath(storedName)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, bytes, { flag: 'wx' })
    try {
      const file = await em.getRepository(StoredFile).save({ originalName: `${snapshot.content.title}-${employee.employeeCode}.pdf`, storedName,
        mime: 'application/pdf', size: bytes.length, entityType: 'letter', entityId: req.id, employeeId: employee.id })
      const letter = await repo.save({ ...existing, requestId: req.id, employeeId: employee.id, letterType: type.code.replace(/^LETTER_/, ''), purpose,
        status: 'GENERATED', generatedPdfRef: `file:${file.id}`, templateId, templateRevisionId, contentSnapshot: snapshot })
      return { ref: `LTR-${letter.id}`, completed: true }
    } catch (err) { await unlink(target).catch(() => undefined); throw err }
  }

  async fileFor(user: JwtPayload, id: number) {
    const letter = await this.ds.getRepository(LetterRequest).findOneBy({ id })
    if (!letter) throw new NotFoundException('الخطاب غير موجود')
    const employee = await this.ds.getRepository(Employee).findOneBy({ id: letter.employeeId })
    const owner = !!user.employeeId && user.employeeId === letter.employeeId
    const scope = branchScopeOf(user)
    if (!owner && !(userHasPerm(user, 'documents.manage') && employee && (scope === null || scope === employee.branchId))) throw new ForbiddenException('لا تملك صلاحية الاطلاع على هذا الخطاب')
    const fileId = Number(letter.generatedPdfRef?.replace(/^file:/, ''))
    const file = fileId ? await this.ds.getRepository(StoredFile).findOneBy({ id: fileId }) : null
    if (!file) throw new NotFoundException('لم يُجهّز ملف الخطاب بعد')
    const path = storedPath(file.storedName)
    try { await access(path) } catch { throw new NotFoundException('ملف الخطاب مفقود من التخزين') }
    return { file, path }
  }
}

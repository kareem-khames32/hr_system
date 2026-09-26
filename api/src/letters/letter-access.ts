import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { EntityManager } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, inBranchScope, userHasPerm } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { canReadEmployeeFinance } from '../employees/employee-projection'
import type { StoredFile } from '../files/stored-file.entity'
import { LetterRequest } from '../requests/entities/letter.entities'
import { LetterTemplateRevision } from './letter-template.entities'

// سياسة واحدة لمساري تنزيل الخطاب (/letters/:id/download و/files/:id) — زي مستندات
// الموارد البشرية (hr-document-access): صاحب الخطاب، أو documents.manage في نطاق فرع
// الموظف؛ والخطاب المالي (تعريف راتب/قرض بنكي أو قالب يطبع متغيرات الراتب) يحتاج
// فوق ذلك صلاحية قراءة مالية الموظف (SEC-07). ملكية الرفع ليست صلاحية اطلاع.

// أنواع الخطابات التي يطبع قالبها الافتراضي إجمالي الراتب
const FINANCIAL_LETTER_TYPES = new Set(['SALARY', 'BANK_LOAN'])
const SALARY_VARIABLE = /\{\{\s*salary\./

export async function letterIsFinancial(em: EntityManager, letter: LetterRequest): Promise<boolean> {
  if (FINANCIAL_LETTER_TYPES.has(String(letter.letterType ?? '').toUpperCase())) return true
  // خطاب قديم بلا نسخة قالب لا يُعرف محتواه → يُعامل ماليًا (الرفض أسلم من كشف الراتب)
  if (!letter.templateRevisionId) return true
  const revision = await em.findOneBy(LetterTemplateRevision, { id: letter.templateRevisionId })
  if (!revision?.content) return true
  return Object.values(revision.content).some((part) => SALARY_VARIABLE.test(String(part ?? '')))
}

// لا كاشف وجود (تدقيق الأدوار D6): خطاب موجود خارج نطاق السائل = نفس رد الخطاب الغايب بالحرف — زي ملفات الموظفين
// والسلف. مسار /files/:id بيمرّر رسالة «الملف غير موجود» بتاعته عشان ردّه هو كمان مايفرّقش.
export const LETTER_NOT_FOUND = 'الخطاب غير موجود'
export const LETTER_FILE_NOT_FOUND = 'الملف غير موجود'

export async function assertLetterAccess(em: EntityManager, user: JwtPayload, letter: LetterRequest, missing = LETTER_NOT_FOUND) {
  const employee = await em.findOneBy(Employee, { id: letter.employeeId })
  const owner = !!user.employeeId && user.employeeId === letter.employeeId
  if (owner) return employee
  if (!(userHasPerm(user, 'documents.manage') && employee && inBranchScope(branchScopeOf(user), employee.branchId))) {
    throw new NotFoundException(missing)
  }
  // من هنا السائل مسؤول مستندات في فرع الموظف وشايف خطاباته أصلًا: الرفض المالي بسببه الصريح مش كاشف وجود
  if (await letterIsFinancial(em, letter) && !canReadEmployeeFinance(user, employee.id)) {
    throw new ForbiddenException('الخطاب يحتوي بيانات الراتب ولا تملك صلاحية الاطلاع على البيانات المالية')
  }
  return employee
}

// ملف الخطاب في /files/:id — يُربط بسجل الخطاب نفسه (المرجع + الطلب + الموظف) ثم نفس السياسة
export async function assertLetterFileAccess(em: EntityManager, user: JwtPayload, file: StoredFile) {
  const letter = await em.findOneBy(LetterRequest, { generatedPdfRef: `file:${file.id}` })
  if (!letter || Number(letter.requestId) !== Number(file.entityId) || Number(letter.employeeId) !== Number(file.employeeId)) {
    throw new NotFoundException('سجل الخطاب غير موجود')
  }
  await assertLetterAccess(em, user, letter, LETTER_FILE_NOT_FOUND)
  return letter
}

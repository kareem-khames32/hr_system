import { BadRequestException } from '@nestjs/common'
import { EntityManager, In } from 'typeorm'
import { DocType } from './assets.entities'

// كتالوج أنواع مستندات الموظف (doc_types): الكود هو ما يُحفظ في
// employee_documents.docType، والاسم العربي للعرض. البذرة تُضاف عند الإقلاع لو
// ناقصة (DocTypesDefaultsService) ولا تكتب فوق اسم/حالة عدّلها الأدمن.
// مرآتها في src/lib/doc-types.ts (احتياط التسميات لحين تحميل الكتالوج)
export const DOC_TYPES_SEED: Array<{ code: string; nameAr: string }> = [
  { code: 'contract', nameAr: 'عقد عمل' },
  { code: 'national_id', nameAr: 'هوية وطنية / رقم قومي' },
  { code: 'passport', nameAr: 'جواز سفر' },
  { code: 'qualification_certificate', nameAr: 'شهادة المؤهل' },
  { code: 'cv', nameAr: 'السيرة الذاتية' },
  { code: 'experience_certificate', nameAr: 'شهادة خبرة' },
  { code: 'formal_photo', nameAr: 'صورة شخصية رسمية' },
  { code: 'iqama', nameAr: 'إقامة' },
  { code: 'driver_license', nameAr: 'رخصة قيادة' },
  { code: 'health_certificate', nameAr: 'شهادة صحية' },
  { code: 'letter', nameAr: 'خطاب رسمي' },
  { code: 'other', nameAr: 'أخرى' },
]

// كود النوع: حروف إنجليزية صغيرة وأرقام و_ ويبدأ بحرف (مثل national_id)
export const DOC_TYPE_CODE_RE = /^[a-z][a-z0-9_]{1,49}$/

// نوع المستند لازم يكون كوداً من الكتالوج لا نصاً حراً. activeOnly للمستند الجديد
// أو تغيير النوع (المعطَّل لا يُختار). المطابقة حرفية: القاعدة case-insensitive
// فتعيد national_id لـNational_ID، والمقارنة هنا بالكود كما هو
export async function assertDocTypes(
  manager: EntityManager,
  codes: unknown[],
  opts: { activeOnly?: boolean } = {}
): Promise<void> {
  const wanted = [
    ...new Set(codes.filter((c) => c !== undefined && c !== null && c !== '').map(String)),
  ]
  if (wanted.length === 0) return
  const rows = await manager.find(DocType, { where: { code: In(wanted) } })
  const byCode = new Map(rows.map((r) => [r.code, r]))
  const unknown = wanted.filter((c) => !byCode.has(c))
  if (unknown.length > 0) {
    throw new BadRequestException(
      `نوع المستند غير معروف (${unknown.join('، ')}) — اختر نوعاً من كتالوج أنواع المستندات`
    )
  }
  if (opts.activeOnly) {
    const inactive = wanted
      .map((c) => byCode.get(c) as DocType)
      .filter((t) => !t.isActive)
    if (inactive.length > 0) {
      throw new BadRequestException(
        `نوع المستند معطَّل في الكتالوج: ${inactive.map((t) => t.nameAr).join('، ')}`
      )
    }
  }
}

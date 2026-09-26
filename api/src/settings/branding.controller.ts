import { Controller, Get, Header, NotFoundException, Res } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import type { Response } from 'express'
import { statSync } from 'fs'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { StoredFile } from '../files/stored-file.entity'
import { storedPath } from '../files/storage'
import { withoutDataPlaceholder } from '../common/data-placeholders'

// اسم المنتج ثابت (طلب المالك 26 سبتمبر): «بواسطة Logic Leap HR» في الدخول وآخر القائمة وعنوان التبويب
export const PRODUCT_NAME = 'Logic Leap HR'

const NAME_KEY = 'company.name'
const LOGO_KEY = 'company.logo_file_id'
// صور بس — أي نوع تاني (PDF/Word...) مايتقدمش من نقطة عامة حتى لو اتسجّل شعار بالغلط
const LOGO_MIMES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
// عمود id في stored_files من نوع int — رقم أكبر كان هيوقع الاستعلام بخطأ خادم بدل «مش مضبوط»
const MAX_FILE_ID = 2147483647

interface ConfiguredLogo {
  file: StoredFile
  path: string
}

/**
 * هوية الشركة العامة — بلا تسجيل دخول: صفحة الدخول بتعرض اسم الشركة وشعارها قبل أي جلسة،
 * والقائمة الجانبية بتقرا من نفس المكان. الرد اسم الشركة ورابط الشعار بس — مفيش عنوان ولا هاتف ولا سجل ولا أي رقم تاني.
 * الشعار = الملف المضبوط في company.logo_file_id بالظبط: مفيش مدخل رقم ملف، فمفيش ملف تاني يتوصله من هنا.
 * (الحراس في النظام لكل كنترولر لوحده بـ@UseGuards — مفيش حارس عام، فالكنترولر ده مفتوح زي /auth/login/options)
 */
@Controller('branding')
export class BrandingController {
  constructor(
    @InjectRepository(RequestsConfig)
    private readonly config: Repository<RequestsConfig>,
    @InjectRepository(StoredFile)
    private readonly files: Repository<StoredFile>
  ) {}

  // بعد حفظ الاسم أو الشعار الواجهة بتعيد الجلب فورًا — الرد مايتخزنش في المتصفح
  @Get()
  @Header('Cache-Control', 'no-store')
  async branding() {
    const rows = await this.config.find({ where: { key: In([NAME_KEY, LOGO_KEY]) } })
    const value = (key: string) => (rows.find((row) => row.key === key)?.value ?? '').trim()
    // القيمة المؤقتة (الخطوة 9) = غير مضبوط — نفس قاعدة رأس المستندات
    const companyName = withoutDataPlaceholder(value(NAME_KEY))
    const logo = await this.configuredLogo(value(LOGO_KEY))
    return {
      productName: PRODUCT_NAME,
      companyName: companyName || null,
      // v = رقم الملف للتحديث بعد تغيير الشعار بس (كسر كاش المتصفح) — النقطة نفسها مابتقراهوش
      logoUrl: logo ? `/api/branding/logo?v=${logo.file.id}` : null,
    }
  }

  @Get('logo')
  async logo(@Res() res: Response) {
    const rows = await this.config.find({ where: { key: LOGO_KEY } })
    const logo = await this.configuredLogo((rows[0]?.value ?? '').trim())
    if (!logo) throw new NotFoundException('شعار الشركة غير مضبوط')
    res.setHeader('Content-Type', logo.file.mime)
    res.setHeader('X-Content-Type-Options', 'nosniff')
    // SVG يتفتح لوحده في تبويب = مستند: بلا سكربت ولا موارد خارجية
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox")
    res.setHeader('Cache-Control', 'public, max-age=300')
    res.setHeader('Content-Disposition', 'inline')
    // المسار اتحقق إنه جوه مجلد الرفع (storedPath) — dotfiles: مجلد رفع تحت مسار فيه نقطة (.xyz) مايرجعش 404
    res.sendFile(logo.path, { dotfiles: 'allow' })
  }

  // الشعار المضبوط لو صالح بس: رقم موجب، صف ملف من تصنيف company_logo، نوعه صورة، وموجود فعلًا على القرص
  private async configuredLogo(raw: string): Promise<ConfiguredLogo | null> {
    if (!/^\d+$/.test(raw)) return null
    const id = Number(raw)
    if (!Number.isSafeInteger(id) || id < 1 || id > MAX_FILE_ID) return null
    const file = await this.files.findOne({ where: { id } })
    if (!file || file.entityType !== 'company_logo' || !LOGO_MIMES.includes(file.mime)) return null
    let path: string
    try {
      path = storedPath(file.storedName)
    } catch {
      // اسم تخزين بيطلع برّه مجلد الرفع = مش شعار صالح (مش خطأ للزائر)
      return null
    }
    if (!statSync(path, { throwIfNoEntry: false })?.isFile()) return null
    return { file, path }
  }
}

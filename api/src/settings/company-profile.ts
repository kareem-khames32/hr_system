// ملف الشركة (الإعدادات ← بيانات الشركة): مفاتيح company.* الجديدة وتحقق خفيف من صيغها.
// القيمة الفاضية دايمًا مقبولة = «مش مضبوط». المفاتيح القديمة (الاسم/السجل/العنوان/الهاتف/الشعار) من غير تحقق إضافي عشان القيم الموجودة ما تتكسرش.

export const COMPANY_PROFILE_NEW_KEYS = [
  'company.commercial_register_expiry',
  'company.vat_number',
  'company.unified_number',
  'company.gosi_establishment_number',
  'company.eg_insurance_establishment_number',
  'company.qiwa_establishment_number',
  'company.national_address_building_no',
  'company.national_address_street',
  'company.national_address_district',
  'company.national_address_city',
  'company.national_address_postal_code',
  'company.national_address_additional_no',
  'company.email',
  'company.website',
  'company.payroll_bank_name',
  'company.payroll_iban',
  'company.wps_establishment_id',
] as const

/**
 * اسم الحقل في GET /settings/company لكل مفتاح جديد. المفاتيح القديمة الستة ليها أسماؤها
 * التاريخية في الرد (name, nameEn, commercialRegister, address, phone, logoFileId) وما تتغيرش.
 * النوع Record<...> بيجبر أي مفتاح جديد يتضاف هنا كمان، فما يبقاش مخزَّن وغير مقروء.
 */
export const COMPANY_PROFILE_FIELD_NAMES: Record<typeof COMPANY_PROFILE_NEW_KEYS[number], string> = {
  'company.commercial_register_expiry': 'commercialRegisterExpiry',
  'company.vat_number': 'vatNumber',
  'company.unified_number': 'unifiedNumber',
  'company.gosi_establishment_number': 'gosiEstablishmentNumber',
  'company.eg_insurance_establishment_number': 'egInsuranceEstablishmentNumber',
  'company.qiwa_establishment_number': 'qiwaEstablishmentNumber',
  'company.national_address_building_no': 'nationalAddressBuildingNo',
  'company.national_address_street': 'nationalAddressStreet',
  'company.national_address_district': 'nationalAddressDistrict',
  'company.national_address_city': 'nationalAddressCity',
  'company.national_address_postal_code': 'nationalAddressPostalCode',
  'company.national_address_additional_no': 'nationalAddressAdditionalNo',
  'company.email': 'email',
  'company.website': 'website',
  'company.payroll_bank_name': 'payrollBankName',
  'company.payroll_iban': 'payrollIban',
  'company.wps_establishment_id': 'wpsEstablishmentId',
}

const DIGITS = (min: number, max: number, message: string) => (value: string) => new RegExp(`^\\d{${min},${max}}$`).test(value) ? null : message

const RULES: Record<string, (value: string) => string | null> = {
  'company.commercial_register_expiry': value =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
      ? null : 'تاريخ انتهاء السجل التجاري بصيغة YYYY-MM-DD',
  'company.vat_number': DIGITS(9, 15, 'الرقم الضريبي أرقام بس (من 9 لـ 15 رقم)'),
  'company.unified_number': value => /^7\d{9}$/.test(value) ? null : 'الرقم الموحد 10 أرقام ويبدأ بـ 7',
  'company.gosi_establishment_number': DIGITS(1, 20, 'رقم منشأة التأمينات (GOSI) أرقام بس'),
  'company.eg_insurance_establishment_number': DIGITS(1, 20, 'رقم المنشأة في التأمينات المصرية أرقام بس'),
  'company.qiwa_establishment_number': value => /^[\d-]{1,30}$/.test(value) ? null : 'رقم المنشأة في وزارة الموارد/قوى أرقام (ممكن بشرطة)',
  'company.national_address_building_no': DIGITS(1, 10, 'رقم المبنى أرقام بس'),
  'company.national_address_postal_code': DIGITS(5, 5, 'الرمز البريدي 5 أرقام'),
  'company.national_address_additional_no': DIGITS(1, 10, 'الرقم الإضافي أرقام بس'),
  'company.email': value => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) ? null : 'البريد الإلكتروني مش صحيح',
  'company.website': value => /^(https?:\/\/)?[^\s/.]+(\.[^\s/.]+)+(\/\S*)?$/i.test(value) ? null : 'الموقع الإلكتروني مش صحيح (مثال: www.example.com)',
  'company.payroll_iban': value => /^(SA\d{22}|EG\d{27})$/.test(value) ? null : 'الآيبان يبدأ بـ SA وبعده 22 رقم، أو EG وبعده 27 رقم (من غير مسافات)',
  'company.wps_establishment_id': value => /^[A-Za-z0-9-]{1,30}$/.test(value) ? null : 'رقم المنشأة في حماية الأجور/مدد حروف إنجليزي وأرقام بس',
}

/** رسالة الخطأ لقيمة مفتاح من ملف الشركة، أو null لو سليمة أو المفتاح مش من المفاتيح المتحقق منها. */
export function companyProfileConfigError(key: string, value: string): string | null {
  const rule = RULES[key]
  if (!rule) return null
  const text = (value ?? '').trim()
  if (text === '') return null
  return rule(text)
}

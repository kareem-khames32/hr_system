-- 20260916_051: ملف الشركة الكامل (الإعدادات ← بيانات الشركة).
-- مفاتيح company.* جديدة في dbo.requests_config بقيمة فاضية = «مش مضبوط»: انتهاء السجل التجاري، الرقم الضريبي، الرقم الموحد (700)،
-- رقم منشأة التأمينات السعودية (GOSI)، رقم المنشأة في التأمينات المصرية، رقم المنشأة في وزارة الموارد/قوى، العنوان الوطني (6 خانات)،
-- البريد والموقع، وبنك الرواتب (اسم البنك، الآيبان، رقم المنشأة في حماية الأجور/مدد).
-- الاسم عربي/إنجليزي والسجل والعنوان والهاتف والشعار موجودين من قبل (company.name / name_en / commercial_register / address / phone / logo_file_id).
-- إضافي فقط: INSERT بشرط عدم الوجود، بلا تعديل أو حذف لأي صف قائم. قابل لإعادة التشغيل. بلا تغيير مخطط.
SET NOCOUNT ON;
GO

INSERT INTO dbo.requests_config ([key], [value])
SELECT v.[key], N''
FROM (VALUES
  (N'company.commercial_register_expiry'),
  (N'company.vat_number'),
  (N'company.unified_number'),
  (N'company.gosi_establishment_number'),
  (N'company.eg_insurance_establishment_number'),
  (N'company.qiwa_establishment_number'),
  (N'company.national_address_building_no'),
  (N'company.national_address_street'),
  (N'company.national_address_district'),
  (N'company.national_address_city'),
  (N'company.national_address_postal_code'),
  (N'company.national_address_additional_no'),
  (N'company.email'),
  (N'company.website'),
  (N'company.payroll_bank_name'),
  (N'company.payroll_iban'),
  (N'company.wps_establishment_id')
) AS v([key])
WHERE NOT EXISTS (SELECT 1 FROM dbo.requests_config c WHERE c.[key] = v.[key]);
GO

IF (SELECT COUNT(*) FROM dbo.requests_config WHERE [key] IN (
  N'company.commercial_register_expiry', N'company.vat_number', N'company.unified_number', N'company.gosi_establishment_number',
  N'company.eg_insurance_establishment_number', N'company.qiwa_establishment_number', N'company.national_address_building_no',
  N'company.national_address_street', N'company.national_address_district', N'company.national_address_city',
  N'company.national_address_postal_code', N'company.national_address_additional_no', N'company.email', N'company.website',
  N'company.payroll_bank_name', N'company.payroll_iban', N'company.wps_establishment_id')) <> 17
  THROW 56511, N'20260916_051: مفاتيح ملف الشركة ناقصة بعد الترحيل', 1;
GO

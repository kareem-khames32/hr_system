-- 20260927_073: توسيع قيمة إعدادات المحرك requests_config.value من nvarchar(500) لـ nvarchar(4000) (قرار المالك 27 سبتمبر:
--   «أسباب إنهاء الخدمة» من الإعدادات — قايمة الأسباب المخصصة JSON في صف واحد offboarding.custom_termination_reasons،
--   والـ500 حرف كانت بتكفي حوالي 5 أسباب بس).
-- توسيع حافظ للقيم فقط: نفس النوع nvarchar ونفس NOT NULL ونفس collation (الافتراضي بتاع القاعدة اللي العمود اتعمل بيه، والمُرحّل
--   بيرفض أي تغيير collation) — مفيش UPDATE ولا INSERT ولا حذف، وكل قيمة قائمة زي ما هي بالحرف. المفتاح الأساسي على [key] مش متأثر.
-- آمن للتكرار: الـALTER بيتنفذ بس لو max_length الحالي أقل من 8000 بايت (4000 حرف)، وnvarchar(max) (-1) مايتضيّقش أبدًا.
-- حد PATCH /settings/config العام للقيمة (500) زي ما هو — الطول الأكبر لمسار أسباب الإنهاء بس. متوافق مع SQL Server 2019.
-- hr-migrate: allow-alter-column
SET NOCOUNT ON;
GO

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.requests_config') AND name = N'value'
           AND max_length <> -1 AND max_length < 8000)
  ALTER TABLE dbo.requests_config ALTER COLUMN [value] nvarchar(4000) NOT NULL;
GO

-- تحقق: العمود nvarchar(4000) NOT NULL
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.requests_config') AND name = N'value'
               AND system_type_id = TYPE_ID(N'nvarchar'))
  THROW 73001, N'20260927_073: عمود requests_config.value ناقص أو مش nvarchar', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.requests_config') AND name = N'value'
               AND max_length = 8000)
  THROW 73002, N'20260927_073: requests_config.value لازم nvarchar(4000) (max_length = 8000)', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.requests_config') AND name = N'value'
               AND is_nullable = 0)
  THROW 73003, N'20260927_073: requests_config.value لازم NOT NULL', 1;
GO

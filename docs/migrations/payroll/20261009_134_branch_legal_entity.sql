-- 20261009_134: ربط الفروع بالكيانات القانونية وتعبئتها من بيانات الشركة (خطة التنفيذ — B4.1: الكيان القانوني الأدنى).
-- عمود جديد (يقبل الفراغ ومن غير افتراضي):
--   branches.legalEntityId int: كيان الفرع القانوني (legal_entities.id). الفاضي = فرع مش مربوط (عملته من دولته زي الأول).
-- تعبئة (مرة واحدة، قرار موثّق في docs/plan/batches/B4.1.md):
--   كيان لكل دولة (EG / SA) فيها فرع ومالهاش كيان، باسم الشركة وعملة الدولة. كيان السعودية بياخد السجل التجاري والرقم الضريبي ورقم
--   منشأة التأمينات (GOSI) ورقم قوى ورقم حماية الأجور؛ كيان مصر بياخد رقم المنشأة في التأمينات المصرية؛ وبنك الرواتب وآيبانه بيروحوا
--   لكيان دولة الآيبان. شركة فروعها في دولة واحدة: كيانها بياخد السجل والرقم الضريبي كمان. مفاتيح company.* نفسها مابتتغيّرش.
--   وبعدها كل فرع من غير كيان بيتربط بكيان دولته. فرع من غير دولة (أو بدولة تانية) بيفضل من غير كيان.
-- العملة مابتتغيّرش لأي فرع: عملة الكيان = عملة دولة فروعه (نفس خريطة B1.1).
-- الكود بيشتغل قبل الترحيل ده: العمود برّه قراءة وكتابة كيان الفرع، والعملة من دولة الفرع.
-- إضافي فقط: بلا حذف. آمن للتكرار (الكيان بيتعمل لدولة مالهاش كيان بس، والربط للفرع الفاضي بس).
-- بيتطبق بعد ترحيل 20261009_133 (legal_entities). متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.legal_entities', N'U') IS NULL
  THROW 134001, N'20261009_134: جدول legal_entities مش موجود — طبّق ترحيل 20261009_133 الأول', 1;
IF OBJECT_ID(N'dbo.branches', N'U') IS NULL
  THROW 134002, N'20261009_134: جدول branches مش موجود', 1;
IF COL_LENGTH(N'dbo.branches', N'legalEntityId') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.columns c WHERE c.[object_id] = OBJECT_ID(N'dbo.branches', N'U') AND c.[name] = N'legalEntityId'
    AND c.[system_type_id] = TYPE_ID(N'int') AND c.[user_type_id] = TYPE_ID(N'int') AND c.[max_length] = 4 AND c.[is_nullable] = 1
    AND c.[is_identity] = 0 AND c.[is_computed] = 0 AND c.[default_object_id] = 0)
  THROW 134003, N'20261009_134: عمود branches.legalEntityId موجود وشكله مش int NULL من غير افتراضي', 1;
GO

IF COL_LENGTH(N'dbo.branches', N'legalEntityId') IS NULL
  ALTER TABLE dbo.branches ADD [legalEntityId] int NULL;
GO

-- كيان لكل دولة فيها فرع ومالهاش كيان — من بيانات الشركة (مفاتيح company.*)
INSERT INTO dbo.legal_entities ([name], [nameEn], [country], [currency], [timeZone], [commercialRegister], [taxNumber], [insuranceNumber], [qiwaNumber],
  [payrollBankName], [payrollIban], [wpsNumber], [cycleStartDay], [isActive], [createdAt])
SELECT
  ISNULL(LEFT(cfg.[name], 200), CASE c.[country] WHEN N'SA' THEN N'كيان السعودية' ELSE N'كيان مصر' END),
  LEFT(cfg.[nameEn], 200),
  c.[country],
  CASE c.[country] WHEN N'EG' THEN N'EGP' ELSE N'SAR' END,
  NULL,
  CASE WHEN c.[country] = N'SA' OR one.[single] = 1 THEN LEFT(cfg.[commercialRegister], 100) END,
  CASE WHEN c.[country] = N'SA' OR one.[single] = 1 THEN LEFT(cfg.[vatNumber], 100) END,
  LEFT(CASE c.[country] WHEN N'SA' THEN cfg.[gosiNumber] ELSE cfg.[egInsuranceNumber] END, 100),
  CASE WHEN c.[country] = N'SA' THEN LEFT(cfg.[qiwaNumber], 100) END,
  CASE WHEN LEFT(cfg.[payrollIban], 2) = c.[country] THEN LEFT(cfg.[payrollBankName], 200) END,
  CASE WHEN LEFT(cfg.[payrollIban], 2) = c.[country] THEN LEFT(cfg.[payrollIban], 40) END,
  CASE WHEN c.[country] = N'SA' THEN LEFT(cfg.[wpsNumber], 100) END,
  NULL, 1, SYSDATETIME()
FROM (SELECT DISTINCT UPPER(LTRIM(RTRIM(b.[country]))) AS [country] FROM dbo.branches b WHERE UPPER(LTRIM(RTRIM(b.[country]))) IN (N'EG', N'SA')) c
CROSS JOIN (SELECT CASE WHEN COUNT(DISTINCT UPPER(LTRIM(RTRIM(b.[country])))) = 1 THEN 1 ELSE 0 END AS [single]
  FROM dbo.branches b WHERE UPPER(LTRIM(RTRIM(b.[country]))) IN (N'EG', N'SA')) one
CROSS JOIN (SELECT
    MAX(CASE WHEN [key] = N'company.name' THEN NULLIF(LTRIM(RTRIM([value])), N'') END) AS [name],
    MAX(CASE WHEN [key] = N'company.name_en' THEN NULLIF(LTRIM(RTRIM([value])), N'') END) AS [nameEn],
    MAX(CASE WHEN [key] = N'company.commercial_register' THEN NULLIF(LTRIM(RTRIM([value])), N'') END) AS [commercialRegister],
    MAX(CASE WHEN [key] = N'company.vat_number' THEN NULLIF(LTRIM(RTRIM([value])), N'') END) AS [vatNumber],
    MAX(CASE WHEN [key] = N'company.gosi_establishment_number' THEN NULLIF(LTRIM(RTRIM([value])), N'') END) AS [gosiNumber],
    MAX(CASE WHEN [key] = N'company.eg_insurance_establishment_number' THEN NULLIF(LTRIM(RTRIM([value])), N'') END) AS [egInsuranceNumber],
    MAX(CASE WHEN [key] = N'company.qiwa_establishment_number' THEN NULLIF(LTRIM(RTRIM([value])), N'') END) AS [qiwaNumber],
    MAX(CASE WHEN [key] = N'company.payroll_bank_name' THEN NULLIF(LTRIM(RTRIM([value])), N'') END) AS [payrollBankName],
    MAX(CASE WHEN [key] = N'company.payroll_iban' THEN NULLIF(UPPER(LTRIM(RTRIM([value]))), N'') END) AS [payrollIban],
    MAX(CASE WHEN [key] = N'company.wps_establishment_id' THEN NULLIF(LTRIM(RTRIM([value])), N'') END) AS [wpsNumber]
  FROM dbo.requests_config WHERE [key] LIKE N'company.%') cfg
WHERE NOT EXISTS (SELECT 1 FROM dbo.legal_entities e WHERE e.[country] = c.[country]);
GO

-- كل فرع من غير كيان بيتربط بكيان دولته (أقدم كيان ساري للدولة)
UPDATE b SET b.[legalEntityId] = e.[id]
FROM dbo.branches b
INNER JOIN (SELECT [country], MIN([id]) AS [id] FROM dbo.legal_entities WHERE [isActive] = 1 GROUP BY [country]) e
  ON e.[country] = UPPER(LTRIM(RTRIM(b.[country])))
WHERE b.[legalEntityId] IS NULL;
GO

-- تحقق بعد التنفيذ
IF NOT EXISTS (SELECT 1 FROM sys.columns c WHERE c.[object_id] = OBJECT_ID(N'dbo.branches', N'U') AND c.[name] = N'legalEntityId'
    AND c.[system_type_id] = TYPE_ID(N'int') AND c.[user_type_id] = TYPE_ID(N'int') AND c.[max_length] = 4 AND c.[is_nullable] = 1
    AND c.[is_identity] = 0 AND c.[is_computed] = 0 AND c.[default_object_id] = 0)
  THROW 134011, N'20261009_134: عمود branches.legalEntityId ناقص أو شكله غلط', 1;
IF EXISTS (SELECT 1 FROM dbo.branches b LEFT JOIN dbo.legal_entities e ON e.[id] = b.[legalEntityId] WHERE b.[legalEntityId] IS NOT NULL AND e.[id] IS NULL)
  THROW 134012, N'20261009_134: فرع مربوط بكيان مش موجود', 1;
IF EXISTS (SELECT 1 FROM dbo.branches b INNER JOIN dbo.legal_entities e ON e.[id] = b.[legalEntityId]
    WHERE UPPER(LTRIM(RTRIM(b.[country]))) IN (N'EG', N'SA') AND e.[country] <> UPPER(LTRIM(RTRIM(b.[country]))))
  THROW 134013, N'20261009_134: فرع مربوط بكيان دولة غير دولته', 1;
GO

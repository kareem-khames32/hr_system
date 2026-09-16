-- 20260916_049: التأمينات الاجتماعية (إعداد أولي جاهز) — نظامان: السعودية (GOSI) والمصرية.
-- (1) branches.insuranceSystem: نظام كل فرع NONE / SAUDI / EGYPTIAN (الموجود = NONE، فلا يتغير أي مسير قائم).
-- (2) payroll_items.socialInsuranceDeduction: حصة الموظف سطر خصم مستقل في القسيمة (القديم = 0).
-- (3) مفاتيح الإعدادات في requests_config بالقيم الافتراضية («راجعها»): النسب والحد الأدنى والأقصى للأجر التأميني.
-- إضافي فقط: بلا DROP ولا DELETE ولا UPDATE. أسماء قيود الافتراضي مطابقة لما تولّده TypeORM حتى يبقى فرق المخطط صفرًا.
SET NOCOUNT ON;
GO

IF COL_LENGTH(N'dbo.branches', N'insuranceSystem') IS NULL
  ALTER TABLE dbo.branches ADD [insuranceSystem] nvarchar(20) NOT NULL CONSTRAINT [DF_b7ec4ab9f00f1b07da9a0122edb] DEFAULT 'NONE';
GO

IF COL_LENGTH(N'dbo.payroll_items', N'socialInsuranceDeduction') IS NULL
  ALTER TABLE dbo.payroll_items ADD [socialInsuranceDeduction] decimal(18,2) NOT NULL CONSTRAINT [DF_a204d8fba38e0a52753a058aff5] DEFAULT 0;
GO

INSERT INTO dbo.requests_config ([key], [value])
SELECT v.[key], v.[value] FROM (VALUES
  (N'social_insurance.saudi.saudi_employee_pct', N'9.75'),
  (N'social_insurance.saudi.saudi_employer_pct', N'11.75'),
  (N'social_insurance.saudi.non_saudi_employee_pct', N'0'),
  (N'social_insurance.saudi.non_saudi_employer_pct', N'2'),
  (N'social_insurance.saudi.min_salary', N'1500'),
  (N'social_insurance.saudi.max_salary', N'45000'),
  (N'social_insurance.egyptian.employee_pct', N'11'),
  (N'social_insurance.egyptian.employer_pct', N'18.75'),
  (N'social_insurance.egyptian.min_salary', N'2700'),
  (N'social_insurance.egyptian.max_salary', N'16700'),
  (N'social_insurance.reviewed_at', N'')
) AS v([key], [value])
WHERE NOT EXISTS (SELECT 1 FROM dbo.requests_config c WHERE c.[key] = v.[key]);
GO

-- تحقق: العمودان موجودان بقيودهما، وكل مفاتيح الإعدادات موجودة
IF COL_LENGTH(N'dbo.branches', N'insuranceSystem') IS NULL
  OR NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = N'DF_b7ec4ab9f00f1b07da9a0122edb')
  THROW 56491, N'20260916_049: عمود نظام التأمينات للفرع أو قيده غير موجود', 1;
IF COL_LENGTH(N'dbo.payroll_items', N'socialInsuranceDeduction') IS NULL
  OR NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = N'DF_a204d8fba38e0a52753a058aff5')
  THROW 56492, N'20260916_049: عمود خصم التأمينات في بنود المسير أو قيده غير موجود', 1;
IF (SELECT COUNT(*) FROM dbo.requests_config WHERE [key] LIKE N'social[_]insurance.%') < 11
  THROW 56493, N'20260916_049: مفاتيح إعدادات التأمينات غير مكتملة', 1;
GO

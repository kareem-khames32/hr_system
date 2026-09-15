-- 20260915_033 (مسار B، تبسيط الرواتب — معادلات الرواتب): طريقة الخصم لكل مجموعة معادلات.
-- إضافي فقط: 7 أعمدة nullable على payroll_policies (هوية المجموعة المسماة، لا النسخة) — فالأختام والنسخ والنشر لا تتأثر.
--   lateDeductionEnabled / latenessTierSetId / earlyLeaveDeductionEnabled / shortfallEnabled / shortfallMode / shortfallValue / absencePenaltyDays
-- NULL = تأخذ المجموعة القيمة من الإعدادات العامة (أو من نسخة السياسة المنشورة لحقولها). لا قيم افتراضية ولا تحديث لأي صف قائم.
-- لقطات المسيرات المعتمدة والمصروفة محفوظة كما هي؛ الأعمدة الجديدة لا تدخل اللقطة إلا حين تُملأ.
SET NOCOUNT ON;

IF COL_LENGTH(N'dbo.payroll_policies', N'lateDeductionEnabled') IS NULL
  ALTER TABLE dbo.[payroll_policies] ADD [lateDeductionEnabled] BIT NULL;
GO

IF COL_LENGTH(N'dbo.payroll_policies', N'latenessTierSetId') IS NULL
  ALTER TABLE dbo.[payroll_policies] ADD [latenessTierSetId] INT NULL;
GO

IF COL_LENGTH(N'dbo.payroll_policies', N'earlyLeaveDeductionEnabled') IS NULL
  ALTER TABLE dbo.[payroll_policies] ADD [earlyLeaveDeductionEnabled] BIT NULL;
GO

IF COL_LENGTH(N'dbo.payroll_policies', N'shortfallEnabled') IS NULL
  ALTER TABLE dbo.[payroll_policies] ADD [shortfallEnabled] BIT NULL;
GO

IF COL_LENGTH(N'dbo.payroll_policies', N'shortfallMode') IS NULL
  ALTER TABLE dbo.[payroll_policies] ADD [shortfallMode] NVARCHAR(12) NULL;
GO

IF COL_LENGTH(N'dbo.payroll_policies', N'shortfallValue') IS NULL
  ALTER TABLE dbo.[payroll_policies] ADD [shortfallValue] DECIMAL(9,4) NULL;
GO

IF COL_LENGTH(N'dbo.payroll_policies', N'absencePenaltyDays') IS NULL
  ALTER TABLE dbo.[payroll_policies] ADD [absencePenaltyDays] DECIMAL(6,2) NULL;
GO

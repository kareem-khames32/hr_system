-- سياسة ترتيب التحصيل تخص نسخة الرواتب؛ تبقى النسخ التاريخية NULL دون استنتاج أو تعبئة.
ALTER TABLE dbo.payroll_policy_versions ADD collectionPolicy NVARCHAR(MAX) NULL;

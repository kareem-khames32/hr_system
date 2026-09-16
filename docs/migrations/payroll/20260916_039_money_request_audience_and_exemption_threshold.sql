-- 20260916_039 (مسار money-requests — تصحيح بعد المراجعة): جمهور الطلبين الماليين، ورجوع حد مرفق الإعفاء.
-- (1) القرار ب4 حرفيًا: «الخصم» و«المكافأة» يظهران لمن يختارهم المالك — لا للجميع. الافتراضي المُسلَّم في
--     ترحيل 036 كان {"mode":"all"} أي أن كل موظف يرى الكارت في «طلب جديد»، وهو عكس جملة القرار.
--     يُضبط على الأدوار التي تتعامل مع مال غيرها: مدير النظام والموارد البشرية ومدير الفرع،
--     والمالك يوسّعه أو يضيّقه بنفسه من «بانِي أنواع الطلبات» (نفس الإعداد، شاشة واحدة).
--     أثره المقصود: من كان يُنشئ خصمًا أو مكافأة بصفة هيكلية فقط (قائد فريق أو مدير مباشر بدور employee)
--     لم يعد يراهما حتى يضيفه المالك — وهذا هو معنى «لمن أختاره».
-- (2) رجوع financial_exemptions.attachment_threshold_days إلى 366 (قيمته قبل ترحيل 036): لا قرار للمالك
--     يطلب خفضه، وخفضه إلى 90 كان يضيف اشتراط مرفق لم يكن قائمًا — والموجة تقول «الحذف والإخفاء قبل الإضافة».
-- إضافي فقط: تحديثان مشروطان بالقيمة القديمة بالضبط — بلا DROP ولا DELETE ولا TRUNCATE، ولا مساس بأي
-- صف مسير أو سياسة سقوف أو نوع طلب آخر. قابل لإعادة التشغيل (الشرط يمنع الكتابة فوق ضبط المالك لاحقًا).
SET NOCOUNT ON;
GO

-- (1) جمهور «خصم» و«مكافأة»
UPDATE dbo.request_types
SET [visibleTo] = N'{"mode":"roles","ids":["super_admin","hr_manager","branch_manager"]}'
WHERE [code] IN (N'PAYROLL_DEDUCTION', N'PAYROLL_BONUS')
  AND [visibleTo] = N'{"mode":"all","ids":[]}';
GO

-- (2) حد المبلغ المُعفى بلا مرفق يعود كما كان
UPDATE dbo.requests_config
SET [value] = N'366'
WHERE [key] = N'financial_exemptions.attachment_threshold_days' AND [value] = N'90';
GO

-- تحقق بعد التطبيق (داخل معاملة الملف).
IF EXISTS (SELECT 1 FROM dbo.request_types
           WHERE [code] IN (N'PAYROLL_DEDUCTION', N'PAYROLL_BONUS') AND [visibleTo] = N'{"mode":"all","ids":[]}')
  THROW 56401, N'20260916_039: جمهور نوعي الطلب الماليين ما زال مفتوحًا للجميع بعد الترحيل', 1;
IF EXISTS (SELECT 1 FROM dbo.requests_config
           WHERE [key] = N'financial_exemptions.attachment_threshold_days' AND [value] = N'90')
  THROW 56402, N'20260916_039: حد مرفق الإعفاء المالي ما زال 90 يومًا بعد الترحيل', 1;

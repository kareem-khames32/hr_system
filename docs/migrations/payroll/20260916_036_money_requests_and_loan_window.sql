-- 20260916_036 (مسار money-requests، القرارات ب1/ب2/ب3/ب4/ب5): الفلوس كطلبات.
-- (1) صفّا كتالوج في المجموعة المالية: «خصم» و«مكافأة» — وجهتهما «سجل فقط» لأن الإنشاء الفعلي يبقى في
--     موديولي الخصومات والمكافآت (POST /deductions و/bonuses) بدفترهما وسلسلتهما القائمة؛ الكارت باب دخول فقط.
--     visibleTo يُكتب صراحةً {"mode":"all"} ليملك المالك ضبطه من «بانِي الطلبات» (القرار ب4)، والخدمتان تنفذانه.
-- (2) مفتاح إعداد loan.request_open (الأصل true) — زر «اقفل طلب السلفة الآن» في «سياسات النظام» (القرار ب2).
-- (3) حد المرفق في الإعفاء المالي: 366 يوم راتب تعني «لا مرفق أبدًا»؛ تُضبط على 90 (القرار ب5).
-- إضافي فقط: لا DROP ولا DELETE ولا TRUNCATE، ولا مساس بسياسات سقوف السلف القائمة ولا بأي صف مسير.
-- قابل لإعادة التشغيل بحراسات الوجود وشرط القيمة القديمة بالضبط.
SET NOCOUNT ON;
GO

-- (1) نوعا الطلب الماليان. الكود فريد؛ لا يُلمس صف قائم.
INSERT INTO dbo.request_types ([code], [nameAr], [category], [requiredFields], [requiredAttachments], [approvalChainId],
  [destinationHandler], [affectsBalance], [isSecurityRoute], [isConfidential], [autoGeneratesPdf], [phase], [isActive], [customFields], [visibleTo])
SELECT v.[code], v.[nameAr], N'financial', NULL, NULL, NULL, N'none', 0, 0, 0, 0, N'P1', 1, NULL, N'{"mode":"all","ids":[]}'
FROM (VALUES
  (N'PAYROLL_DEDUCTION', N'خصم'),
  (N'PAYROLL_BONUS', N'مكافأة')
) AS v([code], [nameAr])
WHERE NOT EXISTS (SELECT 1 FROM dbo.request_types t WHERE t.[code] = v.[code]);
GO

-- (2) نافذة طلب السلفة: مفتاح فتح/قفل واحد بجانب يومي البداية والنهاية القائمين.
INSERT INTO dbo.requests_config ([key], [value])
SELECT v.[key], v.[value]
FROM (VALUES (N'loan.request_open', N'true')) AS v([key], [value])
WHERE NOT EXISTS (SELECT 1 FROM dbo.requests_config c WHERE c.[key] = v.[key]);
GO

-- (3) سقف المبلغ المُعفى بلا مرفق: من 366 يوم راتب (≈ لا مرفق أبدًا) إلى 90 يومًا — تبقى «إلغاء خصم»
--     ضغطة واحدة لأي خصم واقعي، ويعود الإعداد ذا معنى. الشرط على القيمة القديمة بالضبط فلا يُلمس ضبط المالك لاحقًا.
UPDATE dbo.requests_config SET [value] = N'90'
WHERE [key] = N'financial_exemptions.attachment_threshold_days' AND [value] = N'366';
GO

-- تحقق بعد التطبيق (داخل معاملة الملف).
IF (SELECT COUNT(*) FROM dbo.request_types WHERE [code] IN (N'PAYROLL_DEDUCTION', N'PAYROLL_BONUS')) <> 2
  THROW 56001, N'20260916_036: نوعا الطلب «خصم» و«مكافأة» غير موجودين بعد الترحيل', 1;
IF EXISTS (SELECT 1 FROM dbo.request_types WHERE [code] IN (N'PAYROLL_DEDUCTION', N'PAYROLL_BONUS')
           AND ([category] <> N'financial' OR [destinationHandler] <> N'none' OR [visibleTo] IS NULL))
  THROW 56002, N'20260916_036: صفا نوعي الطلب الماليين بفئة أو وجهة أو جمهور غير المتوقع', 1;
IF NOT EXISTS (SELECT 1 FROM dbo.requests_config WHERE [key] = N'loan.request_open' AND [value] IN (N'true', N'false'))
  THROW 56003, N'20260916_036: مفتاح فتح طلب السلفة غير موجود أو قيمته غير منطقية', 1;
IF EXISTS (SELECT 1 FROM dbo.requests_config WHERE [key] = N'financial_exemptions.attachment_threshold_days' AND [value] = N'366')
  THROW 56004, N'20260916_036: حد مرفق الإعفاء ما زال 366 يومًا بعد الترحيل', 1;

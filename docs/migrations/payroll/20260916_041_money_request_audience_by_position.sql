-- 20260916_041: جمهور «خصم» و«مكافأة» حسب المنصب، ومدير الفرع يُنشئ الخصم لفرعه.
-- قرار المالك (16 سبتمبر): الطلبان يظهران لكل مديري الأقسام وكل قادة الفرق وكل مديري الفروع،
-- ومعهم الموارد البشرية والإدارة العليا (مدير النظام يرى كل شيء دائمًا). كل واحد يختار من تحته فقط —
-- وهذا يحكمه نطاق المُنشئ في محرك الخصومات والمكافآت، لا هذا الإعداد.
-- (1) الجمهور: من وضع «أدوار» (ترحيل 039) إلى وضع «حسب المنصب» — مشروط بالقيمة القديمة بالضبط
--     حتى لا يكتب فوق ضبط يدوي لاحق من «أنواع الطلبات».
-- (2) مدير الفرع ضمن نطاق مُنشئ كل نوع خصم مفعّل لم يكن فيه (إضافة إلى القائمة، لا حذف منها).
--     أنواع المكافآت تتضمنه أصلًا.
-- إضافي فقط: تحديثات مشروطة، بلا DROP ولا DELETE ولا TRUNCATE. قابل لإعادة التشغيل.
SET NOCOUNT ON;
GO

UPDATE dbo.request_types
SET [visibleTo] = N'{"mode":"positions","ids":["DEPARTMENT_MANAGERS","TEAM_LEADERS","BRANCH_MANAGERS","hr_manager","executive"]}'
WHERE [code] IN (N'PAYROLL_DEDUCTION', N'PAYROLL_BONUS')
  AND [visibleTo] = N'{"mode":"roles","ids":["super_admin","hr_manager","branch_manager"]}';
GO

UPDATE dbo.deduction_types
SET [creatorScopes] = [creatorScopes] + N',BRANCH_MANAGER'
WHERE [creatorScopes] NOT LIKE N'%BRANCH_MANAGER%'
  AND LEN([creatorScopes]) + 15 <= 200;
GO

IF EXISTS (SELECT 1 FROM dbo.request_types
           WHERE [code] IN (N'PAYROLL_DEDUCTION', N'PAYROLL_BONUS')
             AND [visibleTo] = N'{"mode":"roles","ids":["super_admin","hr_manager","branch_manager"]}')
  THROW 56411, N'20260916_041: جمهور نوعي الطلب الماليين ما زال بالأدوار بعد الترحيل', 1;

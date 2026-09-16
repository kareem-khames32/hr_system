-- 20260916_038 (مسار الحساب — القرار أ7): المستثنى من البصمة بلا خصومات إطلاقًا.
-- الإعداد payroll.exempt_unpaid_leave_deductible كان N'true' على قاعدة الشركة، أي أن الإجازة بلا أجر تُخصم للمستثنى.
-- القرار: الاستثناء يعني شيئًا واحدًا — لا خصم ولا إضافي. البذرة والقيمة الافتراضية في الكود صارتا 'false'،
-- لكن بذر الإعدادات لا يكتب فوق صف قائم (يضيف الناقص فقط)، فيلزم تحديث الصف القائم مرة واحدة هنا.
-- المالك يقدر يرجّعه من «سياسات النظام» في أي وقت؛ ولا يتغير أي مسير قائم لأن كل مسير محسوب يقرأ لقطته المحفوظة.
-- إضافي فقط: UPDATE مشروط بالقيمة القديمة بالضبط فهو قابل لإعادة التشغيل. بلا DROP وبلا DELETE وبلا مساس بأي صف آخر.
SET NOCOUNT ON;

UPDATE dbo.[requests_config]
   SET [value] = N'false'
 WHERE [key] = N'payroll.exempt_unpaid_leave_deductible' AND [value] = N'true';
GO

IF EXISTS (SELECT 1 FROM dbo.[requests_config]
            WHERE [key] = N'payroll.exempt_unpaid_leave_deductible' AND [value] <> N'false')
  THROW 56301, N'20260916_038: إعداد خصم الإجازة بلا أجر للمستثنى لم يصبح false', 1;
GO

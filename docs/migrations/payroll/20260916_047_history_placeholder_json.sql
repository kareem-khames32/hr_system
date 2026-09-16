-- 20260916_047: إصلاح فتح ملف الموظف (خطأ 500 في /employees/:id/profile و/history).
-- ترحيلا 021 و024 كتبا نص المسمى المؤقت خامًا في oldValue/newValue بجدول employee_status_history،
-- والعمودان simple-json فـ TypeORM بيفشل وهو بيقرأهم (158 موظف). الإصلاح يحوّل النص نفسه لسلسلة JSON صحيحة
-- (نفس القيمة بالظبط بعد القراءة) — بلا حذف ولا تغيير معنى، وأي قيمة تانية مش بتتلمس.
SET NOCOUNT ON;
GO

UPDATE dbo.employee_status_history
SET oldValue = N'"' + CAST(oldValue AS nvarchar(max)) + N'"'
WHERE oldValue IS NOT NULL AND CAST(oldValue AS nvarchar(max)) = N'مسمى وظيفي غير مُدخل (يُستكمل)';
GO

UPDATE dbo.employee_status_history
SET newValue = N'"' + CAST(newValue AS nvarchar(max)) + N'"'
WHERE newValue IS NOT NULL AND CAST(newValue AS nvarchar(max)) = N'مسمى وظيفي غير مُدخل (يُستكمل)';
GO

IF EXISTS (SELECT 1 FROM dbo.employee_status_history
  WHERE CAST(oldValue AS nvarchar(max)) = N'مسمى وظيفي غير مُدخل (يُستكمل)'
     OR CAST(newValue AS nvarchar(max)) = N'مسمى وظيفي غير مُدخل (يُستكمل)')
  THROW 56471, N'20260916_047: لسه فيه نص مسمى مؤقت خام في سجل الموظف', 1;
GO

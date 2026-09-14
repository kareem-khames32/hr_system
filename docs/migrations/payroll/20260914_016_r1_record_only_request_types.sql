-- 20260914_016 (مسار الانحدارات R1، خطة المراجعة الخطوة 7 بند 3، القرار D12): الأنواع الستة عشر بلا معالج حقيقي.
-- قرار كل نوع «تسجيل فقط»: الطلب المعتمد نفسه هو السجل الدائم بلا أثر آلي؛ لا نوع منها يُعطَّل.
-- وجهاتها القديمة (access_register، er_case، training_register…) لم تُبنَ قط، فأخفاها إصلاح REQ-3 من الشاشات.
-- التحويل إلى «none» مشروط بالوجهة القديمة بالضبط لكل نوع: أي وجهة اختارها المالك لاحقًا لا تُمس، وإعادة التشغيل لا تغير شيئًا.
-- التظلم والإبلاغ والاعتراض على جزاء تبقى سرية (isConfidential = 1). لا حذف ولا تغيير مخطط.
-- الجدول نفسه في الكود: RECORD_ONLY_REQUEST_TYPES (api/src/requests/destinations.service.ts) وقرارها في PAYROLL_DECISIONS_2026-09-14.md.
SET NOCOUNT ON;

UPDATE t SET t.destinationHandler = N'none'
FROM dbo.request_types t
JOIN (VALUES
  (N'ACCESS_REQUEST', N'access_register'),
  (N'APPRAISAL_OBJECTION', N'appraisal_register'),
  (N'CERT_REIMBURSEMENT', N'training_expense'),
  (N'CONFERENCE', N'training_register'),
  (N'DEPENDENTS_UPDATE', N'employee_dependents'),
  (N'DOCUMENT_RENEWAL', N'document_vault'),
  (N'EDUCATION_ASSISTANCE', N'training_register'),
  (N'FACILITY_CARD', N'facilities_register'),
  (N'GRIEVANCE', N'er_case'),
  (N'HR_MEETING', N'meetings_register'),
  (N'IT_EQUIPMENT', N'it_assets'),
  (N'PENALTY_OBJECTION', N'er_case'),
  (N'SECONDMENT', N'assignments_register'),
  (N'SUGGESTION', N'suggestions_register'),
  (N'TRAINING_REQUEST', N'training_register'),
  (N'WHISTLEBLOWING', N'er_case_anonymous')
) AS d(code, legacyHandler) ON d.code = t.code AND d.legacyHandler = t.destinationHandler;

UPDATE dbo.request_types SET isConfidential = 1
WHERE code IN (N'GRIEVANCE', N'WHISTLEBLOWING', N'PENALTY_OBJECTION') AND destinationHandler = N'none' AND isConfidential = 0;
GO

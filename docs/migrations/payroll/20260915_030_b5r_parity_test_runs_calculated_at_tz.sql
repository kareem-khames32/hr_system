-- 20260915_030 (مسار path-core، الجزء B5 — تصحيحات المراجعة للخطوتين 22 و23):
-- إضافي أو حافظ للقيم فقط:
--   (1) payroll_runs: parityExcludedReason/parityExcludedBy/parityExcludedAt — مسير تجريبي «لا يُحتسب» في فترة التكافؤ التشغيلية
--       (الخطوة 23): السبب المكتوب ومن علّمه ومتى؛ NULL = يُحتسب متى استوفى الشروط.
--       كل مسيرات hr_system المنشأة قبل 2026-09-15 03:00 UTC بيانات اختبار بقاعدة المالك («كل بيانات hr_system الحالية اختبارية»)،
--       فتُعلَّم «لا تُحتسب» بسبب مكتوب — لا حذف ولا تغيير لأي قيمة قائمة، والمسير المنشأ بعد ذلك لا يُلمس.
--   (2) تصحيح تعبئة 029: calculatedAt (datetime يكتبه التطبيق ويقرؤه بتوقيت Node المحلي، TZ=Africa/Cairo) نُسخ من
--       payroll_run_events.createdAt (datetime2 بساعة GETDATE في حاوية SQL = UTC) فظهر أبكر بثلاث ساعات.
--       يُحوّل من UTC إلى 'Egypt Standard Time' فقط للصفوف التي تساوي حدث الحساب الأخير حرفيًا ومنفّذه (أي ما كتبته تعبئة 029،
--       لا ما كتبه التطبيق بعدها بالتوقيت المحلي)؛ بعد التحويل لا يتساويان فإعادة التشغيل لا تغيّر شيئًا.
SET NOCOUNT ON;

IF COL_LENGTH(N'dbo.payroll_runs', N'parityExcludedReason') IS NULL
  ALTER TABLE dbo.[payroll_runs] ADD [parityExcludedReason] NVARCHAR(400) NULL;
GO

IF COL_LENGTH(N'dbo.payroll_runs', N'parityExcludedBy') IS NULL
  ALTER TABLE dbo.[payroll_runs] ADD [parityExcludedBy] INT NULL;
GO

IF COL_LENGTH(N'dbo.payroll_runs', N'parityExcludedAt') IS NULL
  ALTER TABLE dbo.[payroll_runs] ADD [parityExcludedAt] DATETIME NULL;
GO

UPDATE dbo.[payroll_runs]
SET [parityExcludedReason] = N'بيانات اختبار سابقة للتشغيل الحي (قاعدة المالك: كل بيانات hr_system الحالية اختبارية) — ترحيل 20260915_030',
    [parityExcludedAt] = CONVERT(datetime, (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Egypt Standard Time')
WHERE [parityExcludedReason] IS NULL AND [createdAt] < CONVERT(datetime2, '2026-09-15T03:00:00', 126);
GO

UPDATE r SET r.[calculatedAt] = CONVERT(datetime, (CAST(e.[createdAt] AS datetime2) AT TIME ZONE 'UTC') AT TIME ZONE 'Egypt Standard Time')
FROM dbo.[payroll_runs] r
CROSS APPLY (
  SELECT TOP 1 ev.[actorUserId], ev.[createdAt]
  FROM dbo.[payroll_run_events] ev
  WHERE ev.[runId] = r.[id] AND ev.[eventType] IN (N'CREATED', N'CALCULATED', N'RECALCULATED')
  ORDER BY ev.[id] DESC
) e
WHERE r.[calculatedAt] = CONVERT(datetime, e.[createdAt]) AND r.[calculatedBy] = e.[actorUserId]
  AND CONVERT(datetime, (CAST(e.[createdAt] AS datetime2) AT TIME ZONE 'UTC') AT TIME ZONE 'Egypt Standard Time') <> CONVERT(datetime, e.[createdAt]);
GO

IF COL_LENGTH(N'dbo.payroll_runs', N'parityExcludedReason') IS NULL OR COL_LENGTH(N'dbo.payroll_runs', N'parityExcludedBy') IS NULL
  OR COL_LENGTH(N'dbo.payroll_runs', N'parityExcludedAt') IS NULL
  THROW 51631, N'20260915_030_b5r: أعمدة استبعاد المسير من فترة التكافؤ غير مكتملة على payroll_runs', 1;
IF EXISTS (SELECT 1 FROM dbo.[payroll_runs] WHERE [createdAt] < CONVERT(datetime2, '2026-09-15T03:00:00', 126) AND [parityExcludedReason] IS NULL)
  THROW 51632, N'20260915_030_b5r: مسير اختبار سابق للتشغيل الحي بقي بلا سبب «لا يُحتسب» في فترة التكافؤ', 1;
IF EXISTS (
  SELECT 1 FROM dbo.[payroll_runs] r
  CROSS APPLY (SELECT TOP 1 ev.[actorUserId], ev.[createdAt] FROM dbo.[payroll_run_events] ev
    WHERE ev.[runId] = r.[id] AND ev.[eventType] IN (N'CREATED', N'CALCULATED', N'RECALCULATED') ORDER BY ev.[id] DESC) e
  WHERE r.[calculatedAt] = CONVERT(datetime, e.[createdAt]) AND r.[calculatedBy] = e.[actorUserId]
    AND CONVERT(datetime, (CAST(e.[createdAt] AS datetime2) AT TIME ZONE 'UTC') AT TIME ZONE 'Egypt Standard Time') <> CONVERT(datetime, e.[createdAt]))
  THROW 51633, N'20260915_030_b5r: calculatedAt ما زال بساعة UTC المنسوخة من حدث الحساب في تعبئة 029', 1;
GO

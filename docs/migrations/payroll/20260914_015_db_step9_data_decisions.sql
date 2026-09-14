-- 20260914_015 (مسار قاعدة البيانات، خطة المراجعة الخطوة 9): قرارات تنظيف بيانات التشغيل على hr_system.
-- قرار المالك 14 سبتمبر: كل بيانات hr_system الحالية بيانات اختبار؛ نصلح التناقضات التي توقف المسير بدل الحذف، ولا مسح جماعي.
-- كل تعديل مشروط بالحالة القديمة بالضبط (إعادة التشغيل لا تغير شيئًا)، ولا يُحذف أي صف، والأثر يُكتب في جدول الأحداث حيث يوجد.
-- البنود التي تحتاج بيانات من المالك (اسم الشركة، المسميات، العقود، راتب الموظفين 1 و154، الأرضية والسقف، منح الأدوار بعد 8-أ)
-- لا تُخترع قيمها هنا؛ قرارها وحالتها في PAYROLL_DECISIONS_2026-09-14.md (قسم الخطوة 9).
SET NOCOUNT ON;

-- (1) شريحة التأخير 10 (من 0 بلا حد، ربع يوم) تُطابَق أولًا بترتيب fromMinutes، فكل يوم تأخير يُحسب ربع يوم
--     ولا تعمل الشريحة 8 (61-120 = نصف يوم) أبدًا. تُعطَّل (الصف باقٍ) فتعمل 6 (1-60 ربع يوم) و8،
--     وما فوق 120 دقيقة يرجع لخصم الدقيقة الافتراضي في الكود (payroll.service latenessForDay).
UPDATE dbo.lateness_tiers SET isActive = 0
WHERE id = 10 AND fromMinutes = 0 AND toMinutes IS NULL AND isActive = 1
  AND EXISTS (SELECT 1 FROM dbo.lateness_tiers t WHERE t.id IN (6, 8) AND t.isActive = 1);
GO

-- (2) قيدا الإضافي 19 و26 ما زالا SUBMITTED بينما طلباهما 157 و210 مرفوضان؛ يظهران في تحذير «الإضافي المعلق».
--     يُغلقان بنفس حالة الطلب، ويُسجَّل حدث لكل قيد.
INSERT INTO dbo.overtime_entry_events (entryId, requestId, actorUserId, eventType, stepOrder, reason, payload)
SELECT o.id, o.requestId, NULL, N'LEGACY_STATUS_ALIGNED', NULL,
  N'ترحيل 20260914_015 (الخطوة 9): القيد كان SUBMITTED وطلبه مرفوض؛ أُغلق بحالة الطلب',
  N'{"from":"SUBMITTED","to":"REJECTED","requestStatus":"REJECTED"}'
FROM dbo.overtime_entries o
JOIN dbo.requests r ON r.id = o.requestId
WHERE o.id IN (19, 26) AND o.status = N'SUBMITTED' AND r.status = N'REJECTED';

UPDATE o SET o.status = N'REJECTED'
FROM dbo.overtime_entries o
JOIN dbo.requests r ON r.id = o.requestId
WHERE o.id IN (19, 26) AND o.status = N'SUBMITTED' AND r.status = N'REJECTED';
GO

-- (3) سبعة قيود إضافي مسبق معتمدة بلا ساعات مستحقة (2, 30, 31, 34, 38, 39, 51) توقف احتساب أي مسير يضمها
--     (OT_LEGACY_HOURS_UNRESOLVED). إعادة تسعير بنفس قاعدة القيود المسبقة المعتمدة الأخرى (21, 27, 28, 40, 41):
--     المستحق = الأقل من الساعات المطلوبة والفعلية، والفعلي = دقائق الخروج بعد نهاية الوردية في يوم الحضور المحسوب
--     الذي له دخول وخروج. لا دليل حضور = 0 ساعة مستحقة (لا نخترع ساعات لم تُثبت). الساعات المطلوبة والاعتماد يبقيان.
SELECT o.id, o.requestId, o.hoursRequested, d.id AS attendanceDayId,
  CASE WHEN d.checkIn IS NOT NULL AND d.checkOut IS NOT NULL AND TRY_CAST(d.shiftEnd AS time) IS NOT NULL
        AND TRY_CAST(d.checkOut AS time) > TRY_CAST(d.shiftEnd AS time)
       THEN DATEDIFF(minute, TRY_CAST(d.shiftEnd AS time), TRY_CAST(d.checkOut AS time)) ELSE 0 END AS afterShiftMinutes
INTO #step9_overtime
FROM dbo.overtime_entries o
LEFT JOIN dbo.attendance_days d ON d.employeeId = o.employeeId AND d.[date] = o.[date]
WHERE o.id IN (2, 30, 31, 34, 38, 39, 51) AND o.source = N'PRE_REQUESTED' AND o.status = N'APPROVED'
  AND o.payableHours IS NULL AND o.hoursActual IS NULL AND o.payrollRunId IS NULL;

INSERT INTO dbo.overtime_entry_events (entryId, requestId, actorUserId, eventType, stepOrder, reason, payload)
SELECT s.id, s.requestId, NULL, N'LEGACY_HOURS_RESOLVED', NULL,
  N'ترحيل 20260914_015 (الخطوة 9): إضافي مسبق معتمد بلا ساعات مستحقة؛ المستحق = الأقل من المطلوب والفعلي من يوم الحضور',
  CONCAT(N'{"from":{"hoursActual":null,"payableHours":null},"to":{"hoursActual":', CONVERT(nvarchar(20), CAST(ROUND(s.afterShiftMinutes / 60.0, 2) AS decimal(5,2))),
    N',"payableHours":', CONVERT(nvarchar(20), CAST(ROUND(IIF(s.afterShiftMinutes < s.hoursRequested * 60, s.afterShiftMinutes, s.hoursRequested * 60) / 60.0, 2) AS decimal(5,2))),
    N'},"evidence":{"attendanceDayId":', ISNULL(CONVERT(nvarchar(20), s.attendanceDayId), N'null'),
    N',"afterShiftMinutes":', CONVERT(nvarchar(20), s.afterShiftMinutes), N',"hoursRequested":', CONVERT(nvarchar(20), s.hoursRequested), N'}}')
FROM #step9_overtime s;

UPDATE o SET
  o.hoursActual = CAST(ROUND(s.afterShiftMinutes / 60.0, 2) AS decimal(5,2)),
  o.payableHours = CAST(ROUND(IIF(s.afterShiftMinutes < s.hoursRequested * 60, s.afterShiftMinutes, s.hoursRequested * 60) / 60.0, 2) AS decimal(5,2))
FROM dbo.overtime_entries o
JOIN #step9_overtime s ON s.id = o.id
WHERE o.payableHours IS NULL AND o.hoursActual IS NULL;

DROP TABLE #step9_overtime;
GO

-- (4) القيد المالي 1 (خصم «غرامة اختبار» 500) حالته APPLIED بلا مسير ولا تاريخ تطبيق، ولا يوجد أي مسير مصروف.
--     إرجاعه PENDING يخصمه في أول مسير قادم؛ القرار إلغاؤه (الصف والمبلغ باقيان) لأنه قيد اختبار لم يُخصم فعليًا.
UPDATE dbo.employee_obligations SET status = N'CANCELLED'
WHERE id = 1 AND status = N'APPLIED' AND appliedPayrollRunId IS NULL AND appliedAt IS NULL
  AND NOT EXISTS (SELECT 1 FROM dbo.payroll_runs WHERE status = N'PAID');
GO

-- (5) دور الاختبار pr_test_42103 نشط وعليه payroll.view/payroll.calculate/reports.view بلا أي مستخدم: يُعطَّل (الصف باقٍ).
UPDATE dbo.roles SET isActive = 0
WHERE code = N'pr_test_42103' AND isSystem = 0 AND isActive = 1
  AND NOT EXISTS (SELECT 1 FROM dbo.users WHERE [role] = N'pr_test_42103');

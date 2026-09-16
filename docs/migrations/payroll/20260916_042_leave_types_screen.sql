-- 20260916_042: شاشة «أنواع الإجازات» (قرار المالك 16 سبتمبر).
-- كل نوع يختلف في: الفئة (برصيد سنوي / بمناسبة / مرضية بأجر متدرج / بدون راتب)، الرصيد، الأجر،
-- شروط الطلب، والمرفق. أعمدة إضافية فقط (قابلة للفراغ أو بقيمة افتراضية) + تعبئة الأنواع القائمة
-- من إعدادها الحالي + نوع «امتحانات» لو غير موجود. بلا DROP ولا DELETE ولا TRUNCATE.
-- أسماء قيود الافتراضي مطابقة لما تولّده TypeORM حتى يبقى فرق المخطط صفرًا.
SET NOCOUNT ON;
GO

ALTER TABLE dbo.leave_types ADD category nvarchar(20) NULL;
ALTER TABLE dbo.leave_types ADD nameEn nvarchar(200) NULL;
ALTER TABLE dbo.leave_types ADD description nvarchar(500) NULL;
ALTER TABLE dbo.leave_types ADD annualDays decimal(6,2) NULL;
ALTER TABLE dbo.leave_types ADD renewalBasis nvarchar(20) NOT NULL CONSTRAINT DF_a7d9508d0d78ea27c48319709d2 DEFAULT 'YEAR_START';
ALTER TABLE dbo.leave_types ADD carryOverEnabled bit NOT NULL CONSTRAINT DF_e35f3211c26de2f817860a646a6 DEFAULT 0;
ALTER TABLE dbo.leave_types ADD carryOverMaxDays decimal(6,2) NULL;
ALTER TABLE dbo.leave_types ADD fixedDays decimal(6,2) NULL;
ALTER TABLE dbo.leave_types ADD maxTimesPerYear int NULL;
ALTER TABLE dbo.leave_types ADD sickPayTiers nvarchar(MAX) NULL;
ALTER TABLE dbo.leave_types ADD minDaysPerRequest decimal(6,2) NULL;
ALTER TABLE dbo.leave_types ADD noticeDays int NOT NULL CONSTRAINT DF_7abb0d7166a88fcc12a8de8ff72 DEFAULT 0;
ALTER TABLE dbo.leave_types ADD backdateAllowed bit NOT NULL CONSTRAINT DF_c8863b3c840be0f0e6617b813f6 DEFAULT 1;
ALTER TABLE dbo.leave_types ADD backdateMaxDays int NULL;
ALTER TABLE dbo.leave_types ADD countingMode nvarchar(20) NOT NULL CONSTRAINT DF_c2f7263e6fa44623cfb67f56ac2 DEFAULT 'WORKING_DAYS';
ALTER TABLE dbo.leave_types ADD halfDayAllowed bit NOT NULL CONSTRAINT DF_4c3d9a0c73d7a2e8db854b883fe DEFAULT 1;
ALTER TABLE dbo.leave_types ADD attachmentRule nvarchar(30) NOT NULL CONSTRAINT DF_176056e46c5e52bcf025e82c673 DEFAULT 'NONE';
ALTER TABLE dbo.leave_types ADD attachmentAboveDays int NULL;
ALTER TABLE dbo.leave_types ADD attachmentTiming nvarchar(20) NOT NULL CONSTRAINT DF_960b7fde97595ce16638831336d DEFAULT 'WITH_REQUEST';
ALTER TABLE dbo.leave_types ADD attachmentDeadlineDays int NOT NULL CONSTRAINT DF_505e149091a97716c576b181eb8 DEFAULT 7;
ALTER TABLE dbo.leaves ADD attachmentStatus nvarchar(20) NULL;
ALTER TABLE dbo.leaves ADD attachmentDueDate date NULL;
ALTER TABLE dbo.leaves ADD attachmentRef nvarchar(300) NULL;
GO

-- الفئة من الإعداد الحالي
UPDATE dbo.leave_types
SET category = CASE WHEN isPaid = 0 THEN N'UNPAID'
                    WHEN balanceType = N'sick' THEN N'SICK'
                    WHEN balanceType = N'annual' THEN N'ANNUAL'
                    ELSE N'OCCASION' END
WHERE category IS NULL;

-- بدون راتب: كل أيام التقويم (نفس ما يخصمه المسير)
UPDATE dbo.leave_types SET countingMode = N'ALL_DAYS' WHERE category = N'UNPAID';

-- المرفق المسمى من قبل = مطلوب
UPDATE dbo.leave_types SET attachmentRule = N'REQUIRED'
WHERE requiredAttachment IS NOT NULL AND LTRIM(RTRIM(requiredAttachment)) <> N'' AND attachmentRule = N'NONE';

-- المناسبة: أيامها الثابتة = حدها الحالي
UPDATE dbo.leave_types SET fixedDays = maxDays
WHERE category = N'OCCASION' AND fixedDays IS NULL AND maxDays IS NOT NULL;

-- السنوية: 21 يومًا في السنة وترحيل حتى 21 يومًا (نظام العمل السعودي)
UPDATE dbo.leave_types SET annualDays = 21, carryOverEnabled = 1, carryOverMaxDays = 21, nameEn = COALESCE(nameEn, N'Annual leave')
WHERE code = N'ANNUAL' AND annualDays IS NULL;

-- المرضية: 120 يومًا في السنة، والأجر على مجموع أيام السنة: 1-30 كامل، 31-90 بـ75%، 91+ بدون أجر؛
-- التقرير الطبي بعد الرجوع خلال 7 أيام
UPDATE dbo.leave_types
SET annualDays = 120,
    sickPayTiers = N'[{"fromDay":1,"toDay":30,"payPercent":100},{"fromDay":31,"toDay":90,"payPercent":75},{"fromDay":91,"toDay":null,"payPercent":0}]',
    attachmentTiming = N'AFTER_RETURN',
    nameEn = COALESCE(nameEn, N'Sick leave')
WHERE category = N'SICK' AND sickPayTiers IS NULL;

UPDATE dbo.leave_types SET nameEn = N'Unpaid leave' WHERE code = N'UNPAID' AND nameEn IS NULL;
UPDATE dbo.leave_types SET nameEn = N'Casual leave' WHERE code = N'CASUAL' AND nameEn IS NULL;
UPDATE dbo.leave_types SET nameEn = N'Maternity leave' WHERE code = N'MATERNITY' AND nameEn IS NULL;
UPDATE dbo.leave_types SET nameEn = N'Newborn leave', nameAr = N'مولود' WHERE code = N'PATERNITY' AND nameAr = N'أبوة';
UPDATE dbo.leave_types SET nameEn = N'Hajj leave' WHERE code = N'HAJJ' AND nameEn IS NULL;
UPDATE dbo.leave_types SET nameEn = N'Marriage leave' WHERE code = N'MARRIAGE' AND nameEn IS NULL;
UPDATE dbo.leave_types SET nameEn = N'Bereavement leave' WHERE code = N'BEREAVEMENT' AND nameEn IS NULL;
GO

-- امتحانات: بمناسبة، مدفوعة، بعدد أيام الامتحان الفعلية (بلا أيام ثابتة)، وجدول الامتحانات مع الطلب
IF NOT EXISTS (SELECT 1 FROM dbo.leave_types WHERE code = N'EXAMS')
  INSERT INTO dbo.leave_types (code, nameAr, nameEn, isPaid, balanceType, requiredAttachment, maxDays, oncePerService, isActive,
                               category, attachmentRule, countingMode)
  VALUES (N'EXAMS', N'امتحانات', N'Exam leave', 1, N'none', N'جدول الامتحانات', 30, 0, 1,
          N'OCCASION', N'REQUIRED', N'WORKING_DAYS');
GO

IF EXISTS (SELECT 1 FROM dbo.leave_types WHERE category IS NULL)
  THROW 56421, N'20260916_042: نوع إجازة بلا فئة بعد الترحيل', 1;

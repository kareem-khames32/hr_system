# ترحيلات الرواتب على نسخة المراجعة

هذا مسار مستقل عن `api/scripts/migrations-run.cjs` وترحيلات 001–007. لا يغيّر قواعد استبعادها، ولا يعيد تنفيذ ترحيلات التسمية السابقة. ملف manifest الموجود في `docs/prepayrollmigration/review-database.json` يحدد نسخة المراجعة الوحيدة المسموحة. المصدر، و`master`، وأي قاعدة أخرى مرفوضة. لا يستخدم `synchronize` ولا يشغّل التطبيق أو خدماته.

## الأوامر

من جذر المشروع:

```powershell
node api/scripts/payroll-migrations.cjs plan
node api/scripts/payroll-migrations.cjs verify
```

`plan` يقارن **جميع كيانات TypeORM بما فيها الرواتب**، ويكتب فرق schema والنسخ غير المطبقة إلى `docs/payrollmigration/plan.json`. لا ينفذ فرق TypeORM. `verify` لا ينجح إلا مع فرق صفر ومطابقة سجل الترحيلات لملفات SQL. غياب سجل الرواتب قبل أول ترحيل مقبول عندما لا توجد ملفات معلقة أو فروق.

بعد مراجعة SQL وإيقاف API والكتّاب، يكون أمر التطبيق:

```powershell
node api/scripts/payroll-migrations.cjs apply
```

`apply` يفحص PID الموجود في حالة المراجعة، ومنافذ API المحلية 4000/4001/4002 ومنفذ الحالة، واتصالات SQL الأخرى على النسخة. ملف حالة قديم وحده لا يعني أن الخدمة حية؛ وجود PID حي أو listener أو اتصال آخر يمنع التطبيق. هذه فحوص احترازية ولا تغني عن إبقاء كتّاب التطبيق متوقفين خلال العملية؛ لا يُقتل أي process تلقائيًا.

عند وجود ترحيل جديد ينشئ runner نسخة checkpoint فريدة بـ`COPY_ONLY,CHECKSUM` ويشغّل `RESTORE VERIFYONLY ... WITH CHECKSUM` قبل أي DDL. يُحفظ وصفها محليًا في `checkpoint-*.json` دون بيانات موظفين أو كلمات مرور. جميع الإضافات المعلقة وسجلها تنفذ في معاملة واحدة، بقفل SQL من نوع `sp_getapplock`. فحص metadata يجري على اتصال المعاملة نفسه في وضع ذاكرة TypeORM، ويرفض أي فرق متبقٍ قبل COMMIT؛ كما يتحقق من ثبات تعريف كل عمود موجود وأعداد صفوف الجداول القديمة. أي فشل قبل COMMIT يتراجع عن الدفعة كلها. يوجد فحص metadata آخر بعد COMMIT.

## صيغة ملفات SQL

المجلد: `docs/migrations/payroll/`، والأسماء: `YYYYMMDD_NNN_description.sql`، مثل `20260912_001_payroll_attendance_exemption.sql`. لا تعدّل ملفًا سبق تطبيقه: سجل `dbo.payroll_schema_migrations` مستقل ويحفظ SHA-256 للنص الأصلي، ويرفض تغييره أو حذفه. إعادة التنفيذ تتخطى النسخ المسجلة وتحفظ بيانات المراجعة الجديدة.

SQL هنا له صيغة ضيقة مقصودة، ويعيد runner بناء الجمل التي اجتازت التحليل فقط:

- `CREATE TABLE dbo.table_name (...)`؛ أعمدة عادية، DEFAULT ثابت أو دالة مدمجة مسموحة، وقيود مسماة PRIMARY KEY/UNIQUE.
- `ALTER TABLE dbo.table_name ADD newColumn int NULL`؛ أو عمود له DEFAULT غير NULL. يجب كتابة `NULL` صراحة عندما لا يوجد DEFAULT. كل جملة تضيف عمودًا واحدًا.
- `CREATE [UNIQUE] INDEX ... ON dbo.table_name (...)`؛ يسمح بمرشح بسيط `WHERE column IS NULL` أو `WHERE column IS NOT NULL`.

لا تكتب `IF` أو `GO` أو `EXEC` أو SQL ديناميكيًا: سجل النسخ يتولى إعادة التنفيذ. لا يدعم المسار تعديل الأعمدة/القيود الموجودة أو computed columns أو user-defined defaults أو FK جديدة في هذه المرحلة. أي احتياج أوسع يحتاج مراجعة منفصلة، وليس توسيع السماح تلقائيًا.

`DROP`، إعادة التسمية، `ALTER COLUMN`، إضافة عمود إلزامي بلا DEFAULT، `UPDATE`، `DELETE`، `INSERT`، `MERGE`، `TRUNCATE`، تعديل الجداول خارج dbo/قاعدة الهدف، وتعديل أي ledger مرفوضة. إعدادات السياسات تظل عبر `configSeed` وفق نمط المشروع؛ لا يضيف المسار سياسة مالية أو يغيرها.

يجب تسمية القيود والفهارس بما يطابق metadata، وإلا تراجع التطبيق عن الدفعة. وجود فرق غير إضافي في metadata يمنع التطبيق حتى لو ملفات الترحيل نفسها إضافية.

## التحقق المعزول

```powershell
node --test api/test/payroll-migration.test.cjs
```

الاختبار ينشئ قاعدة `hr_payroll_migration_test_<16 hex>` جديدة وبيانات صناعية فقط، ثم يحذف هذه القاعدة نفسها بعد التحقق. لا يوجد مسار CLI يقبل قاعدة الاختبار. يغطي رفض DDL ضار، حفظ bytes الأصلية، rollback بعد فشل SQL وبعد اختلاف metadata، مطابقة schema، إعادة التنفيذ مع الاحتفاظ ببيانات أضيفت لاحقًا، ورفض تغير checksum أو اختفاء ملف مطبق.

لا يُعد وجود هذا runner أو نجاح الاختبار تطبيقًا على نسخة المراجعة، ولا تفويضًا لترحيل المصدر. لا تشغّل النسخ القديمة التي تحتوي `sp_rename` على المصدر ضمن هذه المهمة.

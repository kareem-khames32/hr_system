# ترحيلات قاعدة البيانات — المُرحّل المجمّع

كل تغيير في المخطط أو البيانات على قاعدة الشركة `hr_system` يمر من هنا فقط. **`DB_SYNCHRONIZE=false` دائمًا**؛ الإقلاع نفسه يرفض `true` لأي قاعدة ليست قاعدة اختبار مؤقتة (`hr_<اسم>_test_<16 hex>`)، وسكربتا `npm run seed` و`npm run reset` يرفضان قاعدة الشركة قبل أي اتصال (`api/src/seed/seed-guard.ts`).

- المُرحّل: `api/scripts/db-migrate.cjs` (اختباراته: `api/test/db-migrate.test.cjs`).
- الدفتر الوحيد: جدول `dbo.app_schema_migrations` (`version`, `checksum` SHA-256 للملف بعد توحيد نهايات الأسطر, `scope`, `appliedAt`).
- الترتيب: `docs/migrations/*.sql` (ما قبل الرواتب 001–007) ثم `docs/migrations/payroll/*.sql|*.cjs` بترتيب الاسم.
- كل ملف في **معاملة واحدة** مع `SET XACT_ABORT ON` وقفل تطبيق `hr:schema-migrations`؛ فشل أي دفعة أو فحص يرجّع الملف كله ويوقف التشغيل.
- الدفعات تُفصل بسطر `GO` مستقل. استثناء تاريخي: ملفات الرواتب 001–012 تُنفَّذ جملة جملة (نفس دلالة مُرحّل الرواتب القديم).
- المجلد `_superseded/` خارج الاكتشاف (فيه `2026-09-11_leave_balance_adjustments.sql` المكرر لـ001 — لا يُطبَّق). المجلد `runs/` سجلات التشغيل.

## الأوامر (من جذر الريبو)

```bash
# 1) خطة — قراءة فقط: حالة كل ملف، مشاكل التحليل، عدد استعلامات الفرق (TypeORM schema diff)
node api/scripts/db-migrate.cjs plan

# 2) بروفة — نسخة COPY_ONLY جديدة من hr_system الحالية تُستعاد في hr_migrate_rehearsal_* وتُطبق عليها الملفات المعلقة فقط
#    ثم تُقارن الصفوف والأعمدة والفرق وتُحذف القاعدة المؤقتة (--keep للإبقاء عليها). الـAPI يمكن أن يبقى شغالًا.
node api/scripts/db-migrate.cjs rehearse
#    السلسلة كاملة من نقطة ما قبل الرواتب (تاريخي — مابقاش فحص ما قبل التطبيق):
node api/scripts/db-migrate.cjs rehearse --from baseline
#    تنبيه (26 سبتمبر): ملف 013 (.cjs) بيقرا الجداول بكيانات الكود الحالي، فإعادة تشغيله على نقطة الأساس بتقف عنده
#    من أول ما اتضافت أعمدة لكياناته في ترحيلات أحدث (069 work_schedules.weekendExceptions، 070 public_holidays.audience):
#    «Invalid column name». ده مايمسّش التطبيق على القواعد الشغالة (013 متطبق عليها أصلًا وبصمته ثابتة)؛
#    فحص ما قبل التطبيق هو «rehearse» العادي (من النسخة الحالية). ماتعدّلش 013 عشان يعدّي — بصمته في دفاتر القواعد الشغالة.

# 3) تطبيق على hr_system (وضع الشركة) — أوقف الـAPI أولًا
node api/scripts/db-migrate.cjs apply --company

# 4) تحقق — قراءة فقط: الدفتر فيه كل الملفات ببصماتها والفرق = 0 (exit 1 غير ذلك)
node api/scripts/db-migrate.cjs verify

# فحص الفرق المستقل (قراءة فقط، نفس نتيجة plan/verify)
node C:/Users/Kareem/AppData/Local/Temp/claude/D--projects-hr-system/9fd602b1-b1fb-44a3-bd0c-70aac12694f9/scratchpad/schema-log.js
```

`apply --company` بالترتيب:
1. يرفض قبل أي اتصال لو فيه اسم ملف غير مقبول، أو عبارة ممنوعة في SQL أو في سكربت `.cjs`، أو كود `THROW` مكرر بين ملفين، أو ملف مطبق تغيّر محتواه، أو ملف نقطة الأساس غير موجود.
2. **تجميد**: يرفض لو الـAPI يستمع على المنفذ 4000 أو فيه جلسات أخرى متصلة بالقاعدة.
3. يتحقق من **نقطة الأساس قبل الرواتب** `D:/projects/hr_system_backups/pre-payroll-2026-09-14/hr_system_pre_payroll_20260914.bak` (بصمة الجهاز = بصمة ما يراه SQL Server، `HEADERONLY` نسخة كاملة لـ`hr_system`، `VERIFYONLY WITH CHECKSUM`). هذه ليست نقطة رجوع لما طُبق بعدها.
4. **نسخة لحظة التجميد**: `BACKUP ... WITH COPY_ONLY, CHECKSUM` جديدة، تُنسخ للجهاز خارج volume الحاوية إلى `D:/projects/hr_system_backups/freeze/hr_system_freeze_<UTC>_<hex>.bak` وتُتحقق بنفس الإجراء. هذه نقطة الرجوع للتطبيق.
5. **حداثة النسخة**: يرفض لو كان في الدفتر ترحيل أحدث من انتهاء النسخة، أو كتابة مسجلة على القاعدة بعدها (`sys.dm_db_index_usage_stats`)، أو أُعيد تشغيل SQL Server بعدها. `--backup <ملف>` يستعمل نسخة موجودة بنفس الشروط (نسخة 11:27 القديمة تُرفض الآن لأن ترحيل 12:19 أحدث منها).
6. **بروفة داخل معاملة واحدة لكل الملفات المعلقة ثم تراجع** — مع الفحص الفعلي لكل ملف — ثم يتأكد مجددًا أن لا جلسة أخرى اتصلت.
7. يطبق كل ملف معلق في معاملته مع الفحص الفعلي ويسجله في الدفتر، ثم يحسب الصفوف والأعمدة قبل/بعد والفرق النهائي.
8. يكتب سجلًا في `docs/migrations/runs/<UTC>_apply_hr_system.json` (أعداد وأسماء وبصمات فقط، بلا بيانات شخصية) وينتهي بـ`result: OK` فقط لو الدفتر كامل والفرق = 0.

### الحراسة: طبقتان

**الفحص النصي (قبل الاتصال)** — SQL يُفحص كما هو وبعد دمج النصوص الحرفية المتجاورة (`N'DEL' + N'ETE'`):
`DROP TABLE` لأي اسم دائم حتى في قائمة (`DROP TABLE #t, dbo.x`)، `DROP COLUMN`، `TRUNCATE`، `DELETE` (إلا `#مؤقت`/`@متغير`)، `DROP DATABASE/SCHEMA/VIEW/PROC/FUNCTION/TRIGGER/SEQUENCE/TYPE/SYNONYM/ROLE…`، `ALTER DATABASE`، `USE`، `BEGIN TRAN/COMMIT/ROLLBACK`، `BACKUP/RESTORE`، `SET XACT_ABORT OFF`، `SET ANSI_WARNINGS OFF`، `DISABLE TRIGGER`، `NOCHECK CONSTRAINT`، `ALTER INDEX … DISABLE`، `ALTER TABLE … SWITCH`، `ALTER SCHEMA … TRANSFER`، `DBCC/KILL/SHUTDOWN/RECONFIGURE`، `xp_*`، `sp_rename` لغير عمود/فهرس، و`ALTER COLUMN` بلا سطر تصريح `-- hr-migrate: allow-alter-column`.
سكربتات `.cjs`: حذف عبر `manager/repository.delete|remove|clear`، `QueryBuilder.delete()`، `dropTable/dropColumn/changeColumn/renameTable…`، `synchronize`، إدارة المعاملة (`commitTransaction`/`transaction(`)، `child_process/net/http`، `process.exit`، وأي نص حرفي يشبه SQL يُفحص بقواعد SQL نفسها.

**الفحص الفعلي (داخل معاملة كل ملف قبل الالتزام — في البروفة والتطبيق)** — يغطي SQL الديناميكي المبني بـ`CHAR()` وسكربتات `.cjs` التي تبني SQL وقت التشغيل:
- كل جدول قائم ما زال موجودًا بنفس الاسم (لا إسقاط ولا إعادة تسمية جدول).
- كل عمود قائم (بمعرّفه `column_id`) موجود؛ إعادة تسمية العمود مسموحة وتُسجل؛ تغيير النوع مسموح فقط لو توسيع حافظ للقيم (طول أكبر أو `max`، `int→bigint`، دقة/مقياس `decimal` أكبر، `date→datetime2`، `ntext→nvarchar(max)`…)، والتضييق أو تغيير collation أو النوع غير المثبت يُرفض.
- **كل صف قائم ما زال موجودًا بمفتاحه الأساسي** (تُحفظ مفاتيح كل الجداول في جداول مؤقتة للجلسة قبل الملف)؛ الجداول بلا مفتاح: العدد لا ينقص. حذف صف وإضافة بديل بنفس العدد يُكشف.
- لا مشغل أو قيد FK/CHECK أو فهرس عُطّل، ولا مشغل أُسقط.
- بعد كل دفعة: `XACT_ABORT` و`ANSI_WARNINGS` ما زالا ON و`@@TRANCOUNT` لم يتغير.
- الحدود المعروفة: لا يكشف تحديث قيمة داخل صف قائم (UPDATE مسموح بقرار موثق)، ولا حذف صف ثم إعادة إدخاله بنفس المفتاح. مع `--allow-live-api` قد تُسبب كتابات التطبيق المتزامنة رفضًا تحفظيًا.

### إيقاف/تشغيل الـAPI حول التطبيق

من أدوات المعاينة: `preview_list` ثم `preview_stop` للخادم `api`، وبعد التطبيق `preview_start` بالاسم `api`. الويب لا يتصل بالقاعدة ولا يلزم إيقافه.
بدونها: أوقف عملية `npm --prefix api run start:dev` ثم شغّلها مجددًا. `--allow-live-api` يتخطى التجميد (لا نسخة لحظة التجميد تُثبت شيئًا حينها) — ليس الطريق العادي.

## كتابة ترحيل جديد (لكل المسارات)

1. **أعد سرد المجلد قبل الإنشاء مباشرةً**: `ls docs/migrations/payroll/` وخذ الرقم التالي الحر واسمًا فريدًا لمسارك:
   `YYYYMMDD_NNN_<lane>_<وصف>.sql` بحروف إنجليزية صغيرة وأرقام وشرطة سفلية — مثل `20260914_016_c6_loan_caps.sql`. لو تزامن مساران على نفس الرقم فالترتيب بالاسم الكامل.
2. **إضافي أو حافظ للقيم فقط** (القائمة أعلاه). مسموح: `CREATE`، `ALTER TABLE ... ADD`، `sp_rename` لعمود، `DROP CONSTRAINT` لقيمة افتراضية، `ALTER COLUMN` توسيعًا بسطر التصريح، `UPDATE`/`INSERT`/`MERGE` بلا `DELETE` لبيانات بقرار موثق. بدل الحذف: عطّل الصف أو غيّر حالته.
3. **افصل الدفعات بسطر `GO`** كلما استخدمت عمودًا أو جدولًا أضفته في نفس الملف (SQL Server يترجم الدفعة كلها قبل التنفيذ).
4. **اجعل الملف قابلًا لإعادة التشغيل** بحراسات `IF COL_LENGTH(...) IS NULL` / `IF OBJECT_ID(...) IS NULL` / شرط الحالة القديمة بالضبط في `UPDATE`.
5. **أكواد `THROW` فريدة على مستوى كل الملفات** (أعلى المستخدم 50032؛ خذ نطاقًا لمسارك مثل 51xxx). الكود المكرر بين ملفين يوقف التطبيق.
6. **لا تعدّل ملفًا بعد تطبيقه** على `hr_system` — بصمته في الدفتر؛ أضف ملفًا جديدًا. `plan` يعلّم الملف `CHANGED_AFTER_APPLY` و`apply` يرفض.
7. أسماء القيود والفهارس والأنواع يجب أن تطابق الكيانات حرفيًا حتى يبقى الفرق 0. طريقة سريعة: غيّر الكيان، ثم `plan` يعرض استعلامات TypeORM المطلوبة — انسخها لملفك مع الحراسات، ثم `rehearse`.
8. **ترحيل بخدمات الكود (`.cjs`)** — في `docs/migrations/payroll/` فقط، لبيانات تحتاج منطق الخدمات (بصمات، لقطات JSON):
   ```js
   module.exports = {
     description: 'وصف عربي',
     async up({ manager, query, batch, requireApi, log, database, mode }) {
       // manager: EntityManager داخل معاملة الملف (نفس الاتصال) — mode: 'trial' أثناء البروفة
       // query(): عبر sp_executesql (إعدادات SET لا تبقى) — batch(): دفعة حقيقية
       const { someService } = requireApi('src/attendance/attendance-calendar-history')
       return { ملخص: 'يُحفظ في سجل التشغيل — لا أسرار ولا قيم شخصية' }
     },
   }
   ```
   نفس القواعد والفحصين. **تنبيه:** استدعاء خدمات التاريخ مباشرة (مثل `finishCalendarChange` في 013) يتخطى أقفال الشاشات (`assertCalendarPeriodOpen`: تصفية مقفلة ومسير معتمد/مصروف). مسموح فقط لو النسخة المكتوبة = القيم القائمة نفسها، ويُثبت ذلك بفحص بعد التطبيق (مثال: `datedVersionLockProof` في `api/scripts/db-data-invariants.cjs`). أي تغيير قيمة يمر من `beginCalendarChange` أو شاشة التقويم.
9. قبل التطبيق على الشركة: `plan` ثم `rehearse` (يجب `result: OK`) ثم أوقف الـAPI و`apply --company` ثم `verify` وشغّل الـAPI. أضف اختبارًا في `api/test` لأي ملف `.cjs` (مثال: `db-dated-calendar-versions.test.cjs`).
10. لو الفرق ليس 0 بسبب كيانات يعدّلها مسار آخر لم يكتب ترحيله بعد، اذكر ذلك في تقريرك ولا تكتب ترحيلًا لكيانات لا تملكها.

## فحوص الإثبات (قراءة فقط على hr_system)

```bash
# فحوص الحفظ الأربعة عشر (SHA-256) لـ004–006: نقطة الأساس ↔ نسختها بعد الترحيل ↔ hr_system الحالية (صفوف الأساس نفسها)،
# + إثبات أن نسخ 013 المؤرخة = القيم السابقة، + كتابات الإقلاع (أسماء مفاتيح وأكواد). السجل: runs/<UTC>_invariants_hr_system.json
node api/scripts/db-data-invariants.cjs

# قرارات الخطوة 9 بندًا بندًا (SELECT لكل بند)
node api/scripts/db-step9-check.cjs

# بيئة التشغيل: السر، المزامنة، TZ، الملفات، Chrome، الربط المحلي للـAPI والويب، مفتاح جهاز البصمة (بلا طباعة قيم)
node api/scripts/env-check.cjs --launch
```

## اختبارات SQL

الاختبارات تنشئ قواعدها المؤقتة بنفسها (`hr_<اسم>_test_<16 hex>`) وتحذفها؛ المزامنة مسموحة لها فقط. لا يُشغَّل أي اختبار على `hr_system`.
`api/test/db-migrate.test.cjs` (المُرحّل والفحصان ونسخة التجميد)، `api/test/db-dated-calendar-versions.test.cjs` (ترحيل 013)، `api/test/env-guard.test.cjs` (حارس الإقلاع والبذر والتصفير).

## الملفات التاريخية

- `api/scripts/migrations-run.cjs` و`api/scripts/payroll-migrations.cjs` و`api/scripts/migrations-data-check.cjs`: أدوات نسخة المراجعة `hr_review_pre_payroll_*` فقط (مرفوضة على `hr_system`). المُحلل الصارم في الثاني يقرأ ملفات الرواتب 001–012 فقط.
- قاعدة `hr_review_pre_payroll_20260911162404_52ee65ac` لا تُلمس.

## الحالة على hr_system

تغييرات البيانات التي يمنعها الحارسان (حذف صف بقرار موثق) تُسجَّل هنا كملف `.md` بجانب الترحيلات — المُرحّل لا يكتشف إلا `.sql` و`.cjs`:
`payroll/20260916_037_onboarding_task_145_cleanup.md` (حذف مهمة التهيئة 145 وحدها بحارس مركّب، بإثبات قبل/بعد).

آخر تطبيق وتحقق: انظر أحدث `docs/migrations/runs/*_apply_hr_system.json` وناتج `node api/scripts/db-migrate.cjs verify`. نقاط الرجوع: نقطة الأساس قبل الرواتب (قبل 001–013) ونسخ `D:/projects/hr_system_backups/freeze/` (كل واحدة قبل التطبيق الذي أخذها).

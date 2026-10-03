# النسخ الاحتياطي والاسترجاع

الدليل ده لأي حد بيشغّل السيرفر، مش للمبرمج بس. كل الأوامر من مجلد `api` جوه مجلد النظام على السيرفر.

## الفكرة في سطرين

- **كل يوم بالليل:** نسخة كاملة من قاعدة البيانات، متحقق منها، ونسخة منها في مكان برّه السيرفر، ومعاها الملفات المرفوعة (المستندات والصور).
- **كل أسبوع:** تجربة استرجاع على قاعدة تجربة، عشان نتأكد إن النسخ بتترجع فعلًا. قاعدة الشركة مابتتلمسش.

## 1) الإعداد (مرة واحدة)

1. **اختار مكان برّه السيرفر للنسخ:** فولدر على جهاز تاني في الشبكة، أو هارد خارجي. مثال (اسم وهمي): `\\BACKUP-PC\hr-backups`.
   - حساب ويندوز اللي هيشغّل المهمة لازم يقدر يكتب فيه.
2. **ضيف السطور دي في `api/.env`** (الملف نفسه مابيترفعش على git):

   ```ini
   HR_SQL_NATIVE=1
   HR_SQL_BACKUP_DIR=C:\SQLBackup
   HR_BACKUP_DIR=C:\SQLBackup\daily
   HR_BACKUP_OFFSITE=\\BACKUP-PC\hr-backups
   ```

   - `HR_SQL_BACKUP_DIR`: المجلد اللي SQL Server بيكتب فيه (هو نفسه بتاع المُرحّل).
   - `HR_BACKUP_DIR`: مكان النسخ على السيرفر.
   - `HR_BACKUP_OFFSITE`: المكان اللي برّه السيرفر.
   - المرفوعات بتتاخد من `UPLOADS_ROOT` لو متظبط، وإلا من `api/uploads`.
3. **جرّب يدوي مرة:**

   ```bash
   node scripts/ops-backup.cjs
   ```

   - في الآخر بيطبع ملخص. اتأكد إن فيه `"verifyOnly": "passed"`، وإن `offsite.sha256` هو نفسه `full.sha256`.
   - لو طلع «تحذير: HR_BACKUP_OFFSITE مش متظبط» يبقى النسخة على السيرفر بس. صلّح الخطوة 2.

## 2) الجدولة (Task Scheduler في ويندوز)

اعمل مهمتين من «Task Scheduler ← Create Task»:

| المهمة | الميعاد | Program | Arguments | Start in |
|---|---|---|---|---|
| HR يومي | كل يوم 2:30 الصبح | `node` | `scripts/ops-backup.cjs --keep-days 14` | `C:\...\hr_system\api` |
| HR تجربة استرجاع | كل جمعة 4 الصبح | `node` | `scripts/ops-restore-check.cjs` | نفس المجلد |

- **2:30** عشان يبقى بعد مهام الليل (تجسيد الغياب الساعة 1، والتراكم الساعة 2).
- **`--keep-days 14`:** بيمسح من `HR_BACKUP_DIR` بس النسخ اليومية اللي عدّى عليها 14 يوم، وباسمها اللي السكربت كتبه بالظبط. النسخ اللي برّه السيرفر مابتتمسحش أبدًا من السكربت، فراقب مساحتها بنفسك.
- **في المهمتين:**
  - علّم «Run whether user is logged on or not».
  - واختار حساب يقدر يكتب في المكانين.

## 3) إزاي تتأكد إن النسخ شغال

- **كل يوم:** آخر ملف في `HR_BACKUP_DIR` اسمه `hr_system_daily_<التاريخ>_....bak` وتاريخه النهارده، ونفس الملف موجود في المكان اللي برّه.
- **كل أسبوع:** نتيجة «HR تجربة استرجاع» في Task Scheduler = `0` (نجح). لو عايز تشوف التفاصيل، شغّلها يدوي:

  ```bash
  node scripts/ops-restore-check.cjs
  ```

  - بيرجّع آخر نسخة على قاعدة اسمها `hr_migrate_rehearsal_...`، ويعمل `DBCC CHECKDB`، ويعدّ الجداول والصفوف والموظفين والمسيرات، ويقول عدد الترحيلات وآخرها.
  - وبعدها بيمسح قاعدة التجربة.
  - `"checkDb": "passed"` وأرقام قريبة من أرقام النظام = النسخة سليمة.
- **من المتصفح:** `http://<السيرفر>:4000/api/health` بيقول حالة القاعدة (`db`) وحالة المهام المجدولة (`jobs.status`: `ok` أو `failing`).

## 4) الاسترجاع الحقيقي (لما تحصل مشكلة)

> ده بيكتب على قاعدة الشركة. اعمله بس لو القاعدة باظت أو اتمسحت، وبعد ما المالك يوافق.

1. **وقّف الخدمتين:** الـAPI والواجهة. (`update-from-git.ps1` بيوقفهم ببورتاتهم، أو اقفل نوافذ node المخفية من Task Manager.)
2. **جرّب النسخة الأول من غير ما تلمس حاجة:**

   ```bash
   node scripts/ops-restore-check.cjs --file C:\SQLBackup\daily\hr_system_daily_<التاريخ>_<كود>.bak --keep
   ```

   - `--keep` بيسيب قاعدة التجربة عشان تفتحها وتراجع البيانات بنفسك.
3. **لو التجربة تمام، رجّع على قاعدة الشركة** من SQL Server Management Studio:
   - كليك يمين على `hr_system` ← Tasks ← Restore ← Database ← Device ← اختار الملف ← Options ← «Overwrite the existing database».
   - أو بالأمر (`sqlcmd`):

     ```sql
     ALTER DATABASE [hr_system] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
     RESTORE DATABASE [hr_system] FROM DISK = N'C:\SQLBackup\daily\hr_system_daily_<التاريخ>_<كود>.bak' WITH REPLACE, CHECKSUM;
     ALTER DATABASE [hr_system] SET MULTI_USER;
     ```
4. **المرفوعات:** انسخ مجلد `uploads` من المكان اللي برّه (`HR_BACKUP_OFFSITE\uploads`) لمكانه على السيرفر.
5. **امسح قاعدة التجربة** اللي سيبتها بـ`--keep` من Management Studio (اسمها بيبدأ بـ`hr_migrate_rehearsal_`).
6. **شغّل الخدمتين، وافتح `/api/health`.**
7. **اتأكد إن الترحيلات زي ما هي:**

   ```bash
   node scripts/db-migrate.cjs plan
   ```

   لازم يقول `pending: 0`. لو فيه معلّق، يبقى النسخة أقدم من آخر تحديث: شوف `docs/ops/deploy.md` ← «الرجوع».

## 5) نسخ الـlog (الرجوع لأي لحظة) — اختياري، وقرار المالك

- **النسخة اليومية كفاية للرجوع لآخر نسخة** (يعني ممكن تضيع شغل نفس اليوم). عشان ترجع لأي لحظة، القاعدة لازم تتحول `FULL`، ودي بتكبّر ملف الـlog لحد ما يتنسخ.
- **لو المالك وافق:**
  1. `ALTER DATABASE [hr_system] SET RECOVERY FULL;`
  2. مرة واحدة: `node scripts/ops-backup.cjs --log-base` (نسخة كاملة عادية تبدأ سلسلة الـlog).
  3. مهمة تالتة في Task Scheduler كل ساعة: `scripts/ops-backup.cjs --log`.
- **والقاعدة على `SIMPLE`:** `--log` بيقول كده من غير ما يفشل.

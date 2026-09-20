# نقل نظام الموارد البشرية على السيرفر 10.23.0.222

الملف ده مكتوب عشان Claude Code اللي على السيرفر (أو أي حد) ينفّذه خطوة خطوة.
الفرع: `payroll-2026-09-14` على `https://github.com/kareem-khames32/hr_system.git`.

> ممنوع كتابة أي باسورد أو سر (JWT_SECRET، باسورد قاعدة البيانات) في الشات أو في git — بتتكتب في ملفات `.env` على السيرفر بس.

---

## 1) المتطلبات على السيرفر

| الحاجة | الإصدار |
|---|---|
| Node.js | 24.x (أقل حاجة 22.12) |
| Git | أي إصدار حديث |
| SQL Server | 2022 (Docker أو تثبيت عادي) |
| Google Chrome | لتوليد ملفات PDF (الخطابات والقسائم) |
| PM2 | `npm i -g pm2` لتشغيل الخدمتين وإعادة تشغيلهم تلقائيًا |

المنطقة الزمنية للسيرفر أو للخدمة: **Africa/Cairo** (بتحكم تواريخ الحضور ودورة الرواتب).

المنافذ: `3000` (الواجهة) و`4000` (الـAPI) مفتوحين على الشبكة الداخلية.
السيرفر لازم يوصل لأجهزة البصمة على TCP 4370:
`197.44.147.107`، `197.44.147.108`، `197.44.147.109`، `197.44.145.194`، `197.44.145.195`.

---

## 2) الكود

```bash
git clone https://github.com/kareem-khames32/hr_system.git
cd hr_system
git checkout payroll-2026-09-14
```

---

## 3) قاعدة البيانات (البيانات الحقيقية المنقولة)

ملف النسخة الاحتياطية بيتنسخ يدويًا من جهاز التطوير للسيرفر:
`D:/projects/hr_system_backups/deploy/hr_system_deploy_<التاريخ>.bak`

### SQL Server على Docker

```bash
docker run -d --name hr-sqlserver -e ACCEPT_EULA=Y -e MSSQL_SA_PASSWORD='<باسورد قوي بدون # أو $>' \
  -p 1433:1433 --restart always -v hr_sql_data:/var/opt/mssql mcr.microsoft.com/mssql/server:2022-latest
docker exec hr-sqlserver mkdir -p /var/opt/mssql/backup
docker cp hr_system_deploy_<التاريخ>.bak hr-sqlserver:/var/opt/mssql/backup/hr_system.bak
```

الاسترجاع (من sqlcmd أو أي أداة SQL):

```sql
RESTORE FILELISTONLY FROM DISK = N'/var/opt/mssql/backup/hr_system.bak';
-- استخدم الأسماء المنطقية اللي طلعت فوق في MOVE
RESTORE DATABASE [hr_system] FROM DISK = N'/var/opt/mssql/backup/hr_system.bak'
  WITH MOVE N'hr_system' TO N'/var/opt/mssql/data/hr_system.mdf',
       MOVE N'hr_system_log' TO N'/var/opt/mssql/data/hr_system_log.ldf',
       REPLACE, RECOVERY;
```

التحقق إن المخطط مطابق للكود (لازم `pending: 0` و`schema diff: 0`):

```bash
node api/scripts/db-migrate.cjs plan --company
```

---

## 4) الملفات المرفوعة

انسخ فولدر `api/uploads` كله من جهاز التطوير لمسار ثابت على السيرفر (مثلًا `/srv/hr/uploads` أو `D:/hr/uploads`).
المستندات والشعار بيتقروا منه — لازم يتنسخ مع قاعدة البيانات.

---

## 5) إعدادات الـAPI — `api/.env`

انسخ `api/.env.example` باسم `api/.env` وعدّل:

```ini
PORT=4000
NODE_ENV=production
DB_TYPE=mssql
DB_HOST=localhost
DB_PORT=1433
DB_USERNAME=sa
DB_PASSWORD=<باسورد قاعدة البيانات>
DB_DATABASE=hr_system
DB_TRUST_SERVER_CERTIFICATE=true
DB_SYNCHRONIZE=false
JWT_SECRET=<سر جديد: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
JWT_EXPIRES_IN=8h
FRONTEND_URL=http://10.23.0.222:3000
API_HOST=0.0.0.0
TZ=Africa/Cairo
UPLOADS_ROOT=<المسار الثابت لفولدر uploads>
PUPPETEER_EXECUTABLE_PATH=<مسار chrome على السيرفر>
```

> لو هتدخلوا بدومين أو اسم بدل الـIP، غيّر `FRONTEND_URL` و`NEXT_PUBLIC_API_URL` تحت لنفس العنوان.

```bash
cd api
npm ci
npm run build
node scripts/env-check.cjs --launch     # يتأكد من الإعدادات وChrome
cd ..
```

---

## 6) إعدادات الواجهة

ملف `.env.production.local` في جذر المشروع (قيمته بتتحط وقت البناء):

```ini
NEXT_PUBLIC_API_URL=http://10.23.0.222:4000/api
```

```bash
npm ci
npm run build
```

---

## 7) التشغيل الدائم (PM2)

```bash
pm2 start api/dist/main.js --name hr-api --cwd api --time
pm2 start npm --name hr-web -- start -- -H 0.0.0.0 -p 3000
pm2 save
pm2 startup        # نفّذ الأمر اللي بيطبعه عشان يشتغلوا مع إقلاع السيرفر
```

التحقق:

```bash
curl http://10.23.0.222:4000/api/health
```

وافتح `http://10.23.0.222:3000` من أي جهاز على الشبكة.

---

## 8) بعد التشغيل

1. **باسورد مدير النظام** (بيتكتب مخفي على السيرفر):
   ```bash
   cd api && node scripts/set-password.cjs admin@company.com
   ```
   ونفس الأمر لأي مستخدم منقول محتاج باسورد.
2. **أجهزة البصمة:** من «الحضور ← أجهزة البصمة» اضغط «مزامنة» جهاز جهاز، أو من السيرفر:
   ```bash
   cd api && npx ts-node --transpile-only scripts/sync-devices.ts
   ```
   وحدّد «فاصل المزامنة التلقائية» من نفس الشاشة.
3. **جهاز التطوير:** وقّف المزامنة التلقائية على جهاز التطوير عشان الجهازين مايسحبوش مع بعض.

---

## 9) النسخ الاحتياطي على السيرفر

- قاعدة البيانات: `BACKUP DATABASE [hr_system] TO DISK = N'/var/opt/mssql/backup/hr_system_<تاريخ>.bak' WITH COPY_ONLY, CHECKSUM` يوميًا.
- فولدر `uploads` مع نفس النسخة.
- التعديلات على المخطط بعد كده بالمُرحّل بس: `node api/scripts/db-migrate.cjs plan --company` ثم `apply --company` (والـAPI واقف).

---

## 10) الوضع الفعلي على السيرفر (تم التنفيذ 2026-09-17)

| | |
|---|---|
| السيرفر | `OUTLOOK-HQ` — `10.23.0.222` (ويندوز) |
| SQL Server | **2019 Enterprise** (15.0.2000.5)، الـinstance الافتراضي `MSSQLSERVER` على 1433 |
| قاعدة النظام | `hr_system` — 110 جدول، 37,453 صف |
| الـAPI | `http://10.23.0.222:4000/api` |
| الواجهة | `http://10.23.0.222:3001` |
| مجلد المرفوعات | `C:/Users/Kareem.khamis/Documents/hr_system/api/uploads` |
| النسخ الاحتياطية | `C:\SQLBackup\` |

> **بورت 3000 محجوز**: عليه نظام «حصل بلس» شغال على نفس السيرفر (وقاعدته `HasselPlus` على نفس الـinstance).
> عشان كده واجهتنا على **3001** — ولازم `FRONTEND_URL` في `api/.env` يفضل مطابق ليه وإلا CORS هيرفض.

### ملاحظة على نقل البيانات

النسخة الاحتياطية الأصلية (`hr_system_deploy_20260917131043.bak`) اتعملت على **SQL Server 2022**،
والسيرفر ده عليه **2019** — وSQL Server مابيرجّعش نسخة من إصدار أحدث لإصدار أقدم.
الحل اللي اتنفذ: instance مؤقت أحدث اتثبت لقراءة النسخة، اتسحب منه المخطط بـSMO (مولّد لصيغة 2019)،
واتنقلت كل الصفوف، والتحقق كان:

- عدد الصفوف مطابق في كل الـ110 جدول (37,453 صف)،
- مقارنة قيمة بقيمة للجداول اللي اختلفت بصمتها (فرق أنواع `ntext` بس) — كلها متطابقة،
- كل القيود اترجعت بـ`WITH CHECK` من غير أي تعارض،
- `node api/scripts/db-migrate.cjs plan` → `pending: 0` و`schema diff: 0`.

**أي نسخة احتياطية جاية من جهاز تطوير عليه 2022 مش هتترجع هنا** — خد النسخ من السيرفر ده نفسه.

### التحديث من git بعد أي تعديل

من على السيرفر:

```bash
powershell -ExecutionPolicy Bypass -File C:\Users\Kareem.khamis\Documents\hr_system\update-from-git.ps1
```

بيعمل `git pull` ← `npm ci` ← فحص الترحيلات المعلقة (بيقف لو فيه) ← بناء ← إعادة تشغيل الخدمتين ← تحقق.
الأسرار في `api/.env` و`.env.production.local` (الاتنين متجاهلين في git) وماتتلمسش.

### المُرحّل على SQL Server مثبّت أصليًا (بلا Docker)

`db-migrate.cjs` كان مبنيًا على كون SQL Server داخل حاوية Docker (`docker cp`/`docker exec`).
السيرفر ده تثبيت أصلي على ويندوز، فاتضافت طبقة تجريد: الكشف تلقائي (لو `docker` مش موجود)
ويتحكم فيه `HR_SQL_NATIVE=1|0`. سلوك الحاوية زي ما هو لما تكون موجودة.

متغيرات لازمة على السيرفر ده:

```ini
HR_SQL_BACKUP_DIR=C:\SQLBackup                 # مجلد النسخ الافتراضي تحت Program Files غير مقروء لغير المسؤولين
HR_FREEZE_BACKUP_DIR=C:\SQLBackup\freeze
HR_COMPANY_BACKUP=C:\SQLBackup\hr_system_2019_20260917150253.bak
```

`update-from-git.ps1` بيضبطهم لوحده. وقبل أي `apply --company` اعمل `rehearse` الأول.

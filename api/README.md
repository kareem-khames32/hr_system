# HR System API — الباك إند (NestJS)

> القاعدة الأساسية: **SQL Server 2022** في Docker container — ويدعم MySQL بديلاً بمتغير `DB_TYPE` في `.env`

## التشغيل السريع (SQL Server على Docker — الإعداد الحالي)

```powershell
# 1) شغّل Docker Desktop ثم أنشئ الـ container (مرة واحدة):
docker run -d --name hr-sqlserver -e ACCEPT_EULA=Y `
  -e "MSSQL_SA_PASSWORD=<الباسورد>" -e MSSQL_PID=Express `
  -p 1433:1433 --restart always -v hr_sql_data:/var/opt/mssql `
  mcr.microsoft.com/mssql/server:2022-latest
# --restart always → الـ container يقوم تلقائياً مع Docker Desktop
# تحذير: تجنّب # أو $ في الباسورد — بيكسروا قراءة .env

# 2) إعداد وتشغيل الـ API
cd D:\projects\hr_system\api
npm install
Copy-Item .env.example .env
notepad .env   # حط نفس MSSQL_SA_PASSWORD في DB_PASSWORD

# 3) البذر — ينشئ القاعدة والجداول تلقائياً + حساب الأدمن
npm run seed
#    admin@company.com / Admin@123

# 4) تشغيل الـ API
npm run start:dev
# http://localhost:4000/api/health  ← لازم يرجّع db:up
```

> **ملاحظة:** مفيش SQL Server مسطّب مباشرة على الجهاز — الشغل كله على الـ container.
> لو حبيت تسطّب SQL Server Express محلياً لاحقاً: بعد التسطيب غيّر `DB_HOST/DB_PASSWORD` في `.env` فقط.

## أهم الـ Endpoints الحالية (المرحلة 0)

| Method | المسار | الوصف |
|---|---|---|
| GET | `/api/health` | حالة الخدمة والاتصال بقاعدة البيانات |
| POST | `/api/auth/login` | تسجيل الدخول `{email, password}` → JWT |
| GET | `/api/auth/me` | بيانات المستخدم الحالي (Bearer token) |
| GET | `/api/branches` | الفروع — **بنطاق المستخدم** (super_admin يرى الكل) |
| GET | `/api/departments` | الأقسام بنطاق الفرع |
| GET | `/api/teams` | الفرق بنطاق الفرع |
| GET/POST/PATCH | `/api/employees` | الموظفون — العزل بالفرع مفروض في الخدمة |

## قاعدة العزل (Branch Scoping)
- التوكن يحمل `role` و`branchId`.
- `super_admin` → يرى كل الفروع.
- أي دور آخر → كل الاستعلامات تُفلتر تلقائياً بفرعه (شوف `branchScopeOf` في `src/auth/guards.ts`).

## جداول موديول الطلبات
الـ DDL الكامل (55 نوع طلب + محرك الموافقات + الوجهات) في:
`../docs/sql/requests_module.sql` — نفّذه في SSMS بعد استقرار الأساس.

## المراحل القادمة
1. ✅ المرحلة 0: الأساس + Auth + نطاق الفرع (الحالية)
2. محرك الطلبات والموافقات (state machine + destinations)
3. الحضور + مزامنة بصمة ZKTeco
4. الإجازات (الأرصدة بالطبقات)
5. الرواتب (المسير بالدورة 23→22)

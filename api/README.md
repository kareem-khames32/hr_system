# HR System API — الباك إند (NestJS + SQL Server)

## المتطلبات على السيرفر المحلي
1. **Node.js** 18+
2. **SQL Server** (Express يكفي للبداية) + تفعيل تسجيل الدخول بـ `sa` أو مستخدم مخصص
3. تأكد أن خدمة SQL Server تسمع على المنفذ **1433** (SQL Server Configuration Manager → TCP/IP → Enabled)

## خطوات التشغيل أول مرة

```bash
# 1) داخل مجلد api
cd api
npm install

# 2) أنشئ قاعدة البيانات في SQL Server (مرة واحدة)
#    من SSMS نفّذ:  CREATE DATABASE hr_system;

# 3) إعدادات البيئة
copy .env.example .env
#    عدّل DB_PASSWORD وبيانات الاتصال حسب سيرفرك

# 4) البذر — ينشئ الجداول الأساسية + حساب الأدمن
npm run seed
#    admin@company.com / Admin@123

# 5) تشغيل الـ API
npm run start:dev
#    http://localhost:4000/api/health  ← للتأكد
```

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

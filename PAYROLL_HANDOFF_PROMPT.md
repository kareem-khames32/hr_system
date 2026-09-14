# مهمة: إكمال منظومة الرواتب — نظام الموارد البشرية (D:/projects/hr_system)

> **تحديث الاستئناف — 14 سبتمبر 2026:** هذا الملف يحتفظ بالتكليف الأصلي. حالة البداية والأخطاء المذكورة أدناه تاريخية؛ ابدأ من [نقطة الاستئناف الأحدث](D:/projects/hr_system/PAYROLL_HANDOFF_LATEST.md) لمعرفة المنفذ وقرارات المالك والمتبقي وحالة التشغيل قبل أي عمل.

إنت بتكمّل نظام شغّال فيه داتا حقيقية، مش بتبدأ من الصفر. الالتزام بالنسق الموجود أهم من أي اجتهاد شخصي. ممنوع تخترع تصميم أو أسلوب من عندك.

## ١) اقرأ الأول (مصدر الحقيقة)

- `PAYROLL_SPEC_REPORT.md` (3,281 سطر) — التحليل والمواصفة الكاملة. أول 60 سطر فيهم الملخص التنفيذي: الـ13 بند وحالتهم، و5 مخاطر حرجة، وترتيب التنفيذ على 6 دفعات. كل بند له قسم مفصّل بأمثلة رقمية وحالات حدّية.
- `PAYROLL_SRS_VENDOR.md` (5,256 سطر) — كرّاسة المتطلبات بمعرّفات (PR-01 … PR-12، PL-01 … PL-10 …). أي حاجة تنفّذها لازم تشاور على رقم متطلبها.
- `OUR_TECH_DEFECTS.md` و`FIX_REPORT_W12.md` — عيوب النظام وحالة إصلاحها. الرواتب كانت **خارج** نطاق الإصلاح ده.

ما تبدأش تنفيذ بند قبل ما تقرأ قسمه بالكامل في `PAYROLL_SPEC_REPORT.md`.

## ٢) حالة النظام دلوقتي — أول شغلانة قبل أي ميزة

الـAPI **مش بيقوم**. السبب: `synchronize` بيحاول يضيف عمود `toTeamId` إلزامي على جدول `transfers` وفيه 5 صفوف، فبيترفض ويقع الإقلاع. اللي سبب ده تعديل غيّر أسماء أعمدة في:

- `api/src/requests/entities/employment.entities.ts`: `fromTeam` بقى مربوط بعمود `fromTeamId`، و`toTeam` بعمود `toTeamId`. أسماء الأعمدة في قاعدة البيانات لسه `fromTeam` و`toTeam`.
- `api/src/offboarding/offboarding.entities.ts`: `openedBy` و`settlementApprovedBy` بقوا `openedByUserId` و`settlementApprovedByUserId`.

المطلوب: رجّع ربط الخصائص دي لأسماء الأعمدة الموجودة فعلًا (`@Column({ name: 'toTeam' })` وهكذا) عشان ما يتمسحش أي عمود وما تضيعش داتا. لو الأسماء الجديدة مطلوبة، اعملها بـmigration: عمود جديد nullable ← نسخ الداتا ← استعمال الجديد، من غير DROP نهائيًا. بعدها شغّل الـAPI وتأكد إنه قام من غير أخطاء.

التشغيل: SQL Server في Docker باسم `hr-sqlserver` · الـAPI `npm --prefix api run start:dev` على المنفذ 4000 · الواجهة `npm run dev` على 3000.

## ٣) قواعد ملزمة (اتكسرت قبل كده وكلّفت وقت وداتا)

1. **قاعدة البيانات:** `DB_SYNCHRONIZE=true` على داتا حقيقية. ممنوع إعادة تسمية عمود أو مسحه أو تغيير نوعه أو طوله أو إلزاميته. أي عمود جديد لازم يكون nullable أو له DEFAULT. جدول جديد مسموح.
2. ممنوع تغيير سلوك موديولات تانية (الحضور، الإجازات، الطلبات) إلا لو المواصفة طالبة كده صراحة — وساعتها اذكر رقم المتطلب.
3. ممنوع إضافة أي مكتبة npm جديدة من غير ما تسأل صاحب النظام.
4. ممنوع `git commit` أو `push` من غير طلب صريح.
5. ممنوع تخترع شكل شاشة جديد. كل شاشة تمشي على نسق الشاشات الموجودة (القسم ٤).
6. أي قيمة سياسة (نسبة، حد، عدد أيام) تتحط في الإعدادات مش ثابتة في الكود: ضيف المفتاح في `configSeed` داخل `api/src/seed/requests-seed.data.ts` (بيتضاف لوحده عند الإقلاع)، ولو رقم حرج ضيفه كمان في `NUMERIC_MIN` في `api/src/settings/settings.controller.ts`.
7. ما تقولش «تم» من غير رقم أو نداء API يثبت الكلام.

## ٤) النسق اللي تمشي عليه

### الباك (NestJS + TypeORM في `api/src`)

- الكيانات الجديدة تتسجّل في `TypeOrmModule.forFeature` جوه `api/src/payroll/payroll.module.ts`.
- الكنترولر: `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Perm(...)`. صلاحيات الرواتب الموجودة: `payroll.view` و`payroll.calculate` و`payroll.approve`. المثال: `api/src/payroll/payroll.controller.ts`.
- التحقق بـDTO كلاس مع class-validator (`@IsInt`, `@IsIn`, `@Min` …). الـValidationPipe عامة بـwhitelist، فأي مفتاح مش معرّف في الـDTO بيتشال.
- رسائل الأخطاء بالعربي زي الموجود: `throw new BadRequestException('الفترة بصيغة YYYY-MM')`.
- نطاق الفرع من `branchScopeOf(user)` في `api/src/auth/guards.ts`.
- التعليقات في الكود بالعربي زي باقي الملفات، وبتشرح السبب مش الوصف.

### الواجهة (Next.js App Router، عربي RTL، في `src/app`)

- كل صفحة: `'use client'` + `<MainLayout>` + أيقونات `lucide-react` + كلاسات النظام: `card` و`btn-primary` و`btn-secondary` و`input` و`label` و`badge` و`table-header` و`table-row` و`table-cell`.
- كل النداءات من `src/lib/api.ts` (دالة + نوع لكل endpoint). ممنوع `fetch` مباشر جوه الصفحة. أمثلة موجودة: `fetchPayrollRuns` و`calculatePayroll` و`fetchLatenessTiers`.
- إظهار الأزرار بالصلاحية عبر `can('payroll.calculate')`، وبوابات الصفحات في `src/components/layout/MainLayout.tsx`.
- أقرب مثال للنسق المطلوب: `src/app/payroll/formulas/page.tsx` — قلّد شكلها وطريقتها.

## ٥) الموجود فعلًا — ابنِ عليه وما تعيدش كتابته

- `api/src/payroll/payroll.entities.ts`: `payroll_runs` و`payroll_run_members` (لقطة الأعضاء) و`payroll_items`.
- `api/src/payroll/payroll.service.ts`: `periodRange` و`resolveScope` و`calculateDefined` (مسير باسم ونطاق) و`calculate` (غلاف المسار القديم) و`approve` و`pay` و`payslip` و`payMethodReport`.
- `api/src/payroll/safe-formula.ts` و`payroll-variables.ts`: مُقيّم معادلات آمن وكتالوج متغيرات.
- `api/src/payroll/payroll-rules.*`: شرائح التأخير (`lateness_tiers`) ومعامل الغياب، وشاشتها `src/app/payroll/formulas`.
- `api/src/payroll/obligations.*`: دفتر المديونيات اللي المسير بيستهلكه.
- Endpoints جاهزة: `GET /payroll/runs` · `GET /payroll/runs/:id` · `POST /payroll/runs/calculate` · `POST /payroll/runs/calculate-defined` · `POST /payroll/runs/:id/approve` · `POST /payroll/runs/:id/pay` · `GET /payroll/runs/:id/pay-methods` · `GET /payroll/items/:id` · `GET /payroll/my-payslips` · `/payroll/rules/lateness-tiers` · `/obligations`.
- شاشات الرواتب الموجودة: `src/app/payroll` (الرئيسية، المعادلات، البدلات، الخصومات، المكافآت، السلف، التأمينات، كشوف الرواتب، التقارير).
- في 13 خطأ typecheck قديم في `api/src/payroll/payroll.service.ts` — صلّحهم وإنت شغال في الملف.

## ٦) الترتيب المطلوب

**الدفعة 1 قبل أي ميزة جديدة** — دي أخطاء بتصرف أرقام غلط النهارده:

1. موظف انتهت خدمته جوه الفترة بياخد صفر، لأن المسير بيفلتر النشطين بس.
2. موظف اتعيّن جوه الفترة بياخد الشهر كامل — مفيش تناسب (pro-rata) خالص.
3. لقطة أعضاء المسير بتتكتب وما بتتقراش، فنفس الموظف ممكن يتصرف في مسيرين لنفس الفترة.
4. الموظف المستثنى من الحضور بيتخصم عليه غياب — علم الاستثناء نفسه مش موجود.
5. بدل الهاتف وبدل طبيعة العمل ما بيدخلوش المسير.

ومعاهم في نفس الدفعة: الساعة المرنة، وفصل «النقص» عن «التأخير»، والأوفرتايم بطلب الموظف.

بعدها بالترتيب: محرّك السياسات والمعادلات (دفعة 2) ← كتالوجات البدلات والخصومات والإعفاءات والمستثنون (3) ← سقوف السلف والسلفة الاستثنائية (4) ← الشاشات (5) ← التقارير (6).

اشتغل **بند بند**: كود ← typecheck ← اختبار حي ← سطرين تقرير. ما تبدأش البند اللي بعده قبل ما اللي قبله يخلص.

## ٧) التحقق قبل ما تقول «خلصت»

- `cd api && npx tsc --noEmit -p tsconfig.json` → صفر أخطاء.
- `npx tsc --noEmit -p tsconfig.json` في جذر المشروع → صفر أخطاء.
- الـAPI بيقوم من غير أخطاء في اللوج.
- اختبار حي حقيقي: احسب مسير على فترة فيها الحالات الحدّية (موظف انضم جوه الفترة، وموظف انتهت خدمته جواها، وموظف مستثنى من الحضور)، وقارن الأرقام بحساب يدوي من المثال الرقمي في المواصفة. أي داتا اختبار تعملها امسحها بعدها وتأكد إنها اتمسحت.

## ٨) شكل التسليم

بعد كل دفعة: تقرير قصير بالعربي فيه جدول: | البند | اللي اتعمل | الملفات | إزاي اتأكدت | اللي لسه ناقص |. وكل بند بيشاور على رقمه في المواصفة (① … ⑬) أو رقم المتطلب (PR-xx / PL-xx).

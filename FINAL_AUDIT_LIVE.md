# FINAL_AUDIT_LIVE — تدقيق تشغيلي حيّ

جرى هذا التدقيق **حيًّا على قاعدة بيانات التطوير المشتركة `hr_system`** (لا توجد قاعدة `_audit` منفصلة) عبر واجهة NestJS الحقيقية (`http://localhost:4000/api`)، مع تأكيد كل نتيجة بصفٍّ/حالة عبر استعلام SQL مباشر. غُذّي النظام أولًا بنموذج «مُعتمِد واحد شامل» (Model 1) بإضافة خطوة اعتماد `hr` واحدة لكل سلسلة نشطة كانت فارغة (65/65)، فأصبحت كل الطلبات قابلة للإرسال والاعتماد، ثم أُثبت النموذج متعدد المستويات (Model 2) حيًّا على سلسلة الإجازات.

## Executive Summary — جاهزية ما قبل المسير

**الحكم العام: النظام غير جاهز للمسير (payroll) بصيغته الحالية.** المحرّكات الأساسية للطلبات والاعتماد والإجازات والعهد والحضور والأوفرتايم تعمل بدقة ومؤكَّدة حيًّا، لكن **حلقة الوصل بين الالتزامات والمسير مثقوبة**: لا يوجد جدول مستحقات/مديونيات دائم (obligations ledger)، والخصومات تُحسب لحظيًّا من الجداول المصدرية، وأي التزام لا يقرأه `calculate()` يضيع ماليًّا مهما تراكم.

**أبرز الحواجز (CRITICAL أولًا):**

- **[CRITICAL] الغياب بلا إذن لا يُخصم إطلاقًا** — يوم عمل بلا بصمة ولا طلب لا يُنشئ صف حضور أصلًا، وحتى لو سُجِّل `absent` فالمسير يصرف الراتب كاملًا بلا أي خصم غياب (لا عمود `absenceDeduction` ولا منطق تناسب أيام العمل). تسرّب مالي مباشر. (S6/S10)
- **[CRITICAL] عهدة واحدة تُسنَد لموظفَين حتى `ACTIVE`** — الأصل يبقى `AVAILABLE` طوال `PENDING_ACK`، ومسار الطلب الذاتي لا يفحص وجود إسناد مفتوح، فأمكن إسناد نفس الأصل لموظفَين (`activeCount=2`) مع دهس `currentHolderId`. (S3)
- **[HIGH] قيمة العهدة المفقودة لا تُقيَّد كمديونية** — معالج `custody_finance` غير مسجَّل، فبلاغ الفقد المعتمد يسقط على سجل عام ولا تصل قيمة الأصل (3500) للمسير ولا للتصفية. (S10)
- **[HIGH] لا مُضاعِف أوفرتايم للعطلات + أوفرتايم يوم العطلة لا يُكتشف** — المعدل ثابت 1.5 بلا تمييز، وأوفرتايم الجمعة/العطلة لا يُطابَق فتضيع ساعاته. (S8)
- **[HIGH] الموظف المؤرشَف/المنتهي ما زال يسجّل الدخول ويقدّم طلبات** — لا حارس على حالة الموظف عند الإنشاء ولا تعطيل لحساب المستخدم عند الأرشفة. (S9)
- **[HIGH] طلبا إجازة متداخلان يُعتمدان معًا بخصم مضاعَف** — لا فحص تعارض تواريخ، فخُصم 5 أيام مقابل 3 أيام راحة فعلية. (S6)
- **[MEDIUM] مفاتيح إعداد يتيمة** — حدّ الاعتماد المالي للسلف، عتبة الزيادة التنفيذية، ونمط تنفيذ النقل تظهر في الإعدادات ولا تغيّر شيئًا (توهم برقابة غير موجودة). (S11)

النواة الوظيفية قوية، لكن **إغلاق فجوات الغياب والعهدة المزدوجة وربط الالتزامات المالية بالمسير شرطٌ مسبق قبل أي تشغيل رواتب حقيقي.**

## القوائم الأربع

### 🚫 MISSING

| Scenario | Item | Evidence | Severity |
|---|---|---|---|
| S6 / S10 | **خصم الغياب بلا إذن — غير مسجَّل ولا مخصوم** — يوم عمل بلا بصمة لا يُنشئ صف حضور، والمسير لا يخصم يوم الغياب حتى لو وُجد صف `absent`. توصية: دورة يومية تُنشئ صفوف `absent` + قراءتها في `calculate()` وخصمها بـ`dayRate`. | `attendance_days` (147/140، يوم عمل) = 0 صف؛ `recompute → {recomputed:0}`؛ بإدراج `status='absent'` يدويًا: `payroll_items.netPay=6000` كامل (المتوقع خصم ≈300 dayRate) | **CRITICAL** |
| S10 | **قيمة العهدة المفقودة لا تُقيَّد كمستحق** — معالج `custody_finance` غير مسجَّل؛ `CUSTODY_LOSS_REPORT` المعتمد يسقط على سجل `REQ` عام. قيمة الأصل (3500) لا تصل المسير ولا التصفية. توصية: بناء المعالج ليقيّد القيمة في obligations/`settlement_lines`. | `CUSTODY_LOSS_REPORT` → `destinationRef=REQ-2026-000254`؛ `handlers` map (destinations.service.ts:581-611) بلا `custody_finance`؛ `settlement_lines`=[]، `asset 8 value=3500` غير مُقيَّد | **HIGH** |
| S8 / S11 | **لا مُضاعِف أوفرتايم لنهاية الأسبوع/العطلة** — `rate=1.5` ثابت بلا تمييز يوم، ولا مفاتيح إعداد للمعاملات. توصية: مفاتيح `overtime.multiplier_weekday/weekend/holiday` تُطبَّق آليًّا حسب تصنيف اليوم. | كل القيود (أيام عمل + الجمعة id=34) `rate=1.5`؛ `overtimeHandler` rate=payload.rate?:1.5؛ `payroll.service:122` `(r.rate ?? 1.5)` بلا منطق weekend/holiday | **HIGH** |
| S1 / S10 | **لا سجل مديونيات/مستحقات دائم (obligations ledger)** — لا جدول dues/debt/ledger؛ الالتزامات تُحسب لحظيًّا في `payroll_items` (snapshot يُستبدل عند إعادة الحساب). أي التزام لا يقرأه `calculate()` لا يظهر مهما تراكم. توصية: جدول التزامات دائم يُقيَّد فيه كل حدث خصم/إضافة. | INFORMATION_SCHEMA: لا جدول due/debt/ledger؛ الجداول: `payroll_items` (runId FK) + `loans/loan_installments` + `settlement_lines`؛ `payroll_items` للموظف الجديد=0 | **MEDIUM** |
| S11 | **معالجات مالية أخرى غير مسجَّلة** — `payroll_bonus`/`payroll_allowance`/`payroll_adjustment`/`expense_register` تسقط على `REQ` عام؛ مكافآت/بدلات/مطالبات/تسويات يدوية لا تصل المسير. توصية: بناؤها لتقيّد بنودها في obligations ledger يقرأه `calculate()`. | `handlers` map (destinations.service.ts:581-611) لا يسجّل هذه المعالجات؛ `payroll.service` يجمع فقط (gross+ot−late−unpaid−loan) | **MEDIUM** |
| S11 | **نقطة فصل نصف اليوم غير قابلة للضبط** — مثبّتة على منتصف الوردية حسابيًّا (`shiftMid`)، تظلم الورديات غير المتماثلة/الممتدة. توصية: مفتاح `attendance.half_day_cutoff` (وقت أو نسبة). | grep `half_day\|cutoff` = 0؛ غير موجود في 21 مفتاح config؛ `attendance.service.ts:882` `shiftMid=round((start+end)/2)` مثبّت | **MEDIUM** |
| S4 | **الغياب لا يُنشأ تلقائيًّا (materialization)** — لا Cron للغياب؛ `computeDay` لا يُستدعى إلا عند بصمة/طلب؛ يوم عمل بلا لمس لا صف له فلا يظهر غيابًا في التقارير/المسير. توصية: مهمة ليلية تُنشئ `absent` لأيام العمل بلا بصمة (باستثناء العطل/الإجازات). | لا Cron غياب (scheduler به transfers/escalations فقط)؛ `attendance_days` (155، خميس عمل) = 0؛ التقارير تجمع absent من الصفوف الموجودة فقط | **MEDIUM** |
| S10 | **تتبّع الخصومات لمصدرها ناقص** — السلف/الأوفرتايم مرتبطة بمعرّفات مصدرها في `breakdown`، لكن خصم التأخير/الإجازة يخزّن الإجمالي فقط بلا معرّف صف `attendance_days`/`leaves`. توصية: تضمين `attendanceDayIds`/`leaveIds` في `breakdown`. | `breakdown={dayRate,hourRate,overtimeEntryIds:[],installmentIds:[31]}`؛ `latenessDeduction=18.75` و`unpaidLeaveDeduction=600` بلا أي معرّف صف مصدر | **LOW** |

### ⚠️ DEMO_UNVERIFIED

_لا توجد ملاحظات مصنَّفة `DEMO_UNVERIFIED` في نتائج الوكلاء._ (البنود التالية عناصر ثبتها الوكلاء بالكود دون قيادتها حيًّا كاملةً، مذكورة للشفافية:)

| Scenario | Item | Evidence | Severity |
|---|---|---|---|
| S8 | **حالة الأوفرتايم `PAID` لم تُشغَّل حيًّا** — مؤكَّدة بالكود فقط (`payroll finalize` يضبط `status='PAID'`+`payrollRunId` ويحسب `payableHours*rate*hourRate`). توصية: تشغيل مسير اختبار معزول للتحقق النهائي. | تعريف الكيان `DETECTED|SUBMITTED|APPROVED|PAID|REJECTED`؛ شُغّلت الأربع الأخرى حيًّا وبقيت `PAID` بالكود | **LOW** |
| S7 | **النقل المستقبلي التلقائي عند حلول التاريخ لم يُقَد زمنيًّا** — نفس دالة `executeTransfer` المُثبتة حيًّا في المسار الفوري؛ لم يُقفَز الزمن لإثبات التنفيذ التلقائي. | B(151) `effectiveDate=2026-09-01` → `transfers` `SCHEDULED`؛ `run-scheduled-transfers → {executed:0}` (مؤجّل بصح) | **LOW** |
| S9 | **فرع تأجيل الإنهاء (آخر يوم عمل مستقبلي) مقروء من الكود لا مُقاد حيًّا** — قِيد فرع `lastWorkingDay ≤ اليوم` فقط؛ فرع البقاء `SETTLED` حتى `cron finalizeDue` غير مُقاد. | `finalize` (offboarding.service.ts:419-445)؛ قِيد فرع الإنهاء الفوري فقط | **LOW** |

### ❌ BROKEN

| Scenario | Item | Evidence | Severity |
|---|---|---|---|
| S3 | **نفس الأصل يُسنَد لموظفَين حتى `ACTIVE` عبر مسار الطلب الذاتي** — الأصل يبقى `AVAILABLE` طوال `PENDING_ACK`، وتحقق submit/`custodyAssignHandler` يفحص حالة الأصل فقط لا وجود إسناد مفتوح. توصية: فحص الإسناد المفتوح + قفل الأصل فور `PENDING_ACK` + حارس في `managerConfirmCustody` + قيد فريد جزئي على (assetId). | asset 32: `COUNT(status='ACTIVE')=2` [{29,136},{30,135}]؛ `currentHolderId` دُهس 136→135؛ requests.service.ts:242 + destinations.service.ts:469 | **CRITICAL** |
| S3 | **السبب الجذري: الأصل لا يُحجَز طوال `PENDING_ACK`/`PENDING_MANAGER_CONFIRM`** — يظل ظاهرًا في `/assets/available` ويُقبل في طلب آخر، ولا يتحوّل `ASSIGNED` إلا عند اعتماد المدير. توصية: نقل الحجز إلى لحظة إنشاء `PENDING_ACK`. | asset 32 `AVAILABLE`/`null` بينما custody 29=`PENDING_ACK`؛ نفس السلوك للأصول 30/31؛ الحجز يقع في requests.service.ts:846 | **HIGH** |
| S8 | **أوفرتايم يوم العطلة/الجمعة لا يُكتشف ولا يُطابَق** — `computeDay` يستدعي `detectOvertime` فقط عند `!isHoliday`، فحتى الطلب المسبق المعتمد تبقى ساعاته `null` غير قابلة للدفع. توصية: فصل «يوم عطلة بلا دوام» عن «عمل موثّق ببصمة في عطلة». | الجمعة 2026-07-10: `workMinutes=600` فعلي؛ قيد id=34 المعتمد بقي `hoursActual=null,payableHours=null`؛ لا قيد `BIOMETRIC_DETECTED` للعطلة | **HIGH** |
| S9 | **الموظف المؤرشَف/المنتهي ما زال يسجّل الدخول ويقدّم طلبات جديدة** — لا حارس على حالة/نشاط الموظف في `create()`، `JwtStrategy.validate` لا يعيد التحقق من DB، و`finalize()` لا يعطّل صف `users`. توصية: عند الأرشفة عطّل `users.isActive=false` و/أو ارفض `create()` لموظف `terminated`/غير نشط. | emp 153 `terminated`/`isActive=0`؛ `POST /auth/login` → 200 + توكن؛ `POST /requests` → req 251/255 `UNDER_REVIEW`؛ requests.service.ts:109-216، jwt.strategy.ts:18 | **HIGH** |
| S6 | **طلبا إجازة متداخلان لنفس الموظف يُعتمدان معًا بخصم مضاعَف** — لا فحص تعارض تواريخ عند التقديم. توصية: فحص تداخل مع الإجازات/الطلبات السارية ورفض/تنبيه التعارض. | emp 148: leaves id=61 (days=3) + id=62 (days=2) يتداخلان على 09-02/03؛ `annual taken=5` لِ3 أيام راحة فعلية؛ grep overlap = لا شيء | **HIGH** |
| S11 | **`loan.finance_approval_threshold` مفتاح يتيم** — لا يوجّه السلف فوق الحد لأي اعتماد مالي. توصية: ربطه بإضافة خطوة finance آليًّا أو إزالته. | LOAN 6000: `resolvedSteps` متطابقة عند key=5000 و999999 = `[{stepOrder:1,role:'hr'}]`؛ الكود يقرأه في seed فقط | **MEDIUM** |
| S11 | **`salary_increase.executive_threshold_pct` مفتاح يتيم** — لا يضيف اعتماد executive للزيادات فوق النسبة. توصية: ربطه بخطوة executive شرطية أو إزالته. | SALARY_INCREASE 67%: `resolvedSteps` متطابقة عند key=10 و1 = `[{stepOrder:1,role:'hr'}]`؛ يُقرأ في seed فقط | **MEDIUM** |
| S11 | **`transfer.execution_mode` مفتاح يتيم** — تحويله إلى `immediate` لم ينفّذ النقل فورًا. توصية: إزالته أو تفعيل النمط الفوري (السلوك الحالي بتاريخ السريان معقول). | TEAM_TRANSFER مستقبلي: transfers id=4/5 كلاهما `SCHEDULED`/`executedAt=null` عند mode=effective_date وimmediate | **LOW** |

### ✅ WORKS

| Scenario | Item | Evidence | Severity |
|---|---|---|---|
| SETUP | **ضمان خطوة اعتماد واحدة لكل سلسلة نشطة + إثبات دورة كاملة** — 65 سلسلة فارغة نالت خطوة `hr`؛ الطلب أصبح قابلًا للإرسال واعتمده super_admin حتى `COMPLETED`. | `PATCH .../steps` 65/65؛ req 216 `UNDER_REVIEW`→`APPROVE`→`COMPLETED` `LTR-2026-000010`؛ `request_approvals` صف فعلي approverId=1 | NONE |
| SETUP | **بنية تنظيمية جاهزة** — قسمان (1،3)، مركزا تكلفة (1،2)، فرع واحد، مديرو أدوار hr/manager/super_admin. | `departments`[1,3]؛ `cost_centers`[1,2]؛ `branches`[1]؛ emp18/emp21/admin | NONE |
| S1 / S11 | **إنشاء موظف بكل الروابط + تهيئة رصيد إجازات تلقائيًّا (annual 21 + sick 180)** — يُثبت في `employees` و`leave_balances`؛ الاستحقاق العام يُثبَّت لحظة التعيين. | POST /employees ×3 (137-139) 201؛ `leave_balances` 6 صفوف annual=21/sick=180؛ emp165 entitled=30 بعد PATCH | NONE |
| S1 | **رفض الحالات السلبية server-side** — اسم ناقص→400، كود مكرر→409، مدير غير موجود→400. | `POST /employees` بلا fullName→400؛ كود مكرر→409؛ managerId 999999→400 | NONE |
| S2 | **الحُرّاس server-side (ليست UI)** — موظف perms[] صُدّ 403 على `POST /employees`، `PATCH config`، `PUT permissions[*]`، `GET users/employees`، رصيد الغير، والموافقة الذاتية. | جميعها `403 Forbidden`؛ `RolesGuard@Perm` يقرأ `user.permissions` | NONE |
| S2 | **تغيير الصلاحيات وقت التشغيل نافذ (منح/سحب)** — منح `employees.create`→إعادة دخول→201 (أنشأ 154)؛ سحب→403 مجددًا؛ least-privilege محفوظ. | `PUT /users/82/permissions`؛ `user_permission_overrides` count 1→0؛ `PATCH config` بقي 403 | NONE |
| S2 | **[تصلّب أمني] الصلاحيات مضمَّنة في JWT — لا إبطال فوري** — سحب صلاحية/تعطيل مستخدم لا يسري على توكن قائم حتى انتهائه (TTL 8س). توصية: تقصير TTL و/أو قائمة إبطال (jti/token version). | التوكن القديم بقي 403 بعد المنح؛ `exp-iat=28800s`؛ `resolvePermissions` وقت الدخول فقط | MEDIUM |
| S3 / S7 | **دورة العهدة الكاملة (مساري الطلب وإسناد HR) + الإرجاع** — issue→ack→manager-confirm→`ACTIVE` (الأصل `ASSIGNED`)؛ handover→return→`RETURNED` (الأصل يُحرَّر). | custody 27/28 → `ACTIVE`، assets `ASSIGNED`؛ return → `AVAILABLE`/holder=null | NONE |
| S3 | **حواجز العهدة السلبية + منع إعادة إسناد أصل `ACTIVE`** — اعتماد/تأكيد غير مخوّل→403، تأكيد مكرر→400، إعادة إسناد أصل مسلَّم→400 في المسارين. | `403/400` لكل الحالات؛ asset 31 `ACTIVE`: assign→400، طلب جديد→400 عند submit | NONE |
| S4 | **الوردية المسائية: بصمة 14:05 في الميعاد** — التقييم ضد الوردية المسندة (start 14:00) لا 09:00 ثابت؛ `lateMinutes=0`. | `attendance_days` (156, 2026-06-15): `shiftStart=14:00`, `status=present`, `lateMinutes=0` | NONE |
| S4 | **الجدولة الأسبوعية + تصنيف يوم العطلة + الغياب على أيام العمل فقط** — صباحي 08:58 حاضر؛ الجمعة `holiday` بلا عقوبة؛ يوم عمل بلا حضور `absent`. | (155, 2026-06-16) `present`؛ (2026-06-19) `holiday`؛ (2026-06-17) `absent` deductible=0 | NONE |
| S5 | **الأذونات تعذر البداية/النهاية بدقة (كاملة وجزئية)** — إذن مسائي يعذر النهاية كاملة؛ إذن صباحي يعذر التأخير؛ إذن يغطي ساعة من ساعتين انصراف مبكر يعاقب الزائد فقط. | S5.1 `excused=60`؛ S5.3 `late=0,excused=45`؛ S5.4 `earlyLeave=60,excused=60` | NONE |
| S5 | **بلا إذن → المخالفة تُرصد** — انصراف مبكر بلا تغطية `earlyLeave=120`. | (2026-06-02) `early_leave`, `earlyLeaveMinutes=120`, `excused=0` | NONE |
| S5 | **نسيان بصمة الحضور + تصحيح `PUNCH_CORRECTION`** — البصمة الوحيدة تُصنَّف خروجًا (لا تأخير ضخم)؛ التصحيح المعتمد يعيد حساب اليوم كاملًا. | (2026-06-07) `checkIn:null`→بعد التصحيح `09:00`, `workMinutes 0→450` | NONE |
| S5 / S6 | **الإجازة المرضية تغلب الغياب وتخصم الرصيد المرضي؛ الإجازة الكاملة تغلب الإذن** — يوم `absent`→`leave` بخصم مرضي (0→1)؛ عند التعارض تغلب الإجازة ويُتجاهل الإذن. | (2026-06-08) `absent`→`leave`, sick taken 0→1؛ (2026-06-09) `status=leave`, excused=0 | NONE |
| S5 / S8 | **بقاء متأخر بلا اعتماد → لا أوفرتايم قابل للدفع** — `payableHours=null` قبل موافقة المدير؛ التحويل التلقائي لطلب يبقيه غير مدفوع. | `overtime_entries` (2026-06-10) `hoursActual=2, payableHours=null, DETECTED` | NONE |
| S5 / S8 | **حواجز الحضور/الأجهزة/الأوفرتايم** — بصمة يدوية بلا `attendance.manage`→403، عرض حضور الغير→400، `overtime/pending` بلا `overtime.confirm`→403، مفتاح جهاز خاطئ→401. | جميعها ترفض؛ عرض حضور النفس→200 | NONE |
| S6 / S7 | **مسارات الإجازة (سنوية/مرضية/بدون راتب/عارضة/نصف يوم/تجاوز الرصيد)** — خصم من البركة الصحيحة + سجل `leaves` + تعليم التقويم؛ سقوف الأنواع والمرفق الإجباري تُطبَّق؛ تجاوز الرصيد→400 بلا رصيد سالب. | LV refs متعددة؛ sick بلا مرفق→400؛ CASUAL 10>7→400؛ MORNING يومين→400؛ رصيد 0→400 | NONE |
| S6 | **بدون راتب: تسليم فعلي للمسير** — `isUnpaid=1` يُقرأ في `payroll.service` ويتحوّل خصمًا 600 في `payroll_items`. | `leaves` id=58 `isUnpaid=1`؛ run 8: `unpaidLeaveDays=3, unpaidLeaveDeduction=600, netPay=5400` | NONE |
| S6 | **أرصدة حيّة + لا خصم قبل الاعتماد + حارس المعتمِد** — `leave-balances/:id` يتغيّر فور الاعتماد؛ الطلب المعلّق لا يخصم ولا يكتب سجلًا؛ غير المعتمِد المخوّل→403. | 141: 10.5→7.5؛ req 277 معلّق: taken بلا تغيّر، leaves=0؛ ahmed APPROVE→403 | NONE |
| S7 | **كل الأنواع تكتب سجلها الدائم بعد الاعتماد** — LEAVE/OVERTIME/LOAN/PROMOTION/SALARY/TRANSFER/CUSTODY/RESIGNATION، لا اكتمال بلا كتابة. | 18 طلبًا حيًّا بأرقام مرجعية دائمة؛ SQL مؤكَّد لكل نوع (loans 6 أقساط=3000، promotions، transfers EXECUTED/SCHEDULED، offboarding 5 بنود...) | NONE |
| S7 | **LOAN: جدول أقساط دقيق** — 6 أقساط شهرية متساوية (500×6) تبدأ الشهر التالي، المجموع 3000 بالضبط. | `loan_installments` GROUP BY loanId → 6 لكل قرض، 2026-08-01..2027-01-01 | NONE |
| S7 | **SALARY_INCREASE: تحديث الراتب + سجل تاريخ** — `basicSalary` 6000→7000، مسجَّل في `employee_status_history`. توصية: ربطه بقيد رواتب فعلي (لا سجل حالة فقط). | `employees.basicSalary` 6000→7000؛ `{oldStatus:'salary:6000',newStatus:'salary:7000'}` | LOW |
| S7 | **RESIGNATION: فتح إخلاء طرف بخمس جهات + انعكاس العهدة** — `offboarding_cases` `IN_CLEARANCE` + 5 `clearance_items`. ملاحظة تسمية: `notice_period` لا `UNDER_NOTICE`. | OFB refs؛ 5 بنود (manager/custody/it/finance/hr)؛ بند العهدة يذكر «1 عهدة مفتوحة» | LOW |
| S7 | **الدورة العامة: inbox/reject/on-behalf/audit/self-approval/idempotency** — يظهر لصاحب الدور، الرفض لا يكتب وجهة، النيابة تنسب للمستفيد، `request_approvals` يوثّق من+متى، الموافقة الذاتية→403، الاعتماد المكرر→400 بلا ازدواج. | inbox has224؛ reject 273 leaves=0؛ req 224 requesterId=150؛ self→403؛ ثاني APPROVE→400 | NONE |
| S8 | **تقاطع الأوفرتايم `payable=min(المعتمد،الفعلي)`** — 2∩2=2؛ 3 معتمد ∩ 1 فعلي=1؛ البصمة بلا طلب `DETECTED` غير مدفوعة حتى تأكيد المدير؛ الدورة `DETECTED→SUBMITTED→APPROVED`/`REJECTED` مُثبتة. | id=27 payable=2؛ id=28 payable=1؛ id=29 `DETECTED`→confirm→`APPROVED` payable=2؛ id=33 reject→0 | NONE |
| S9 | **الاعتماد لا يُنهي الخدمة + اقتران بند العهدة الحي + قفل التصفية + الإنهاء المتأخر** — يضبط `notice_period` ويفتح الإخلاء آليًّا؛ بند العهدة يقرأ العدد الحي (حتى الأدمن مُنع)؛ التصفية مقفولة حتى اكتمال الإخلاء؛ `terminated`+أرشفة فقط بعد اعتماد التصفية. | emp 153 `notice_period`/`isActive=1`؛ item 57→400 «ماسك 2 عهدة»→بعد الإرجاع DONE؛ approve-settlement قبل الإكمال→400؛ نهايةً `terminated`/`isActive=0`/`archivedAt` set | NONE |
| S9 | **بناء التصفية آليًّا** — نهاية خدمة (3.5س×0.5)=21174.54 + بدل إجازات (10.5 يوم)=4200، net=25374.54. | `settlement_lines` caseId=12؛ `SET-2026-00012`, `CLR-2026-00012` | NONE |
| S10 | **الالتزامات الأربعة الموصولة بالمسير دقيقة** — تأخير (`lateMinutes`×minuteRate)، بدون راتب (`isUnpaid`×dayRate)، أقساط سلف (`loan_installments`)، أوفرتايم؛ والحُرّاس تعمل (إذن يعفي التأخير، سلفة غير معتمدة لا تُخصم، لا ازدواج). | emp 140: late=18.75، unpaid=600، loan=1000، net=7381.25؛ إذن→لا خصم؛ LOAN معلّق→0 صف؛ يوم بدون راتب `status=leave`,late=0 | NONE |
| S11 | **الإعدادات النافذة (7)** — `grace_minutes` العام + سماحية/عتبة أوفرتايم الوردية (تتقدّم على العام)، `annual_entitled`، `accrual_mode`، `late_deduction_enabled`، `detection_threshold_hours`؛ كلها مؤكَّدة before/after مع استرجاع كامل. | إعادة تصنيف حيّة بالاتجاهين لكل مفتاح؛ GET config النهائي=اللقطة الأصلية 1:1 | NONE |
| S11 | **حُرّاس `PATCH config`** — مفتاح مجهول→404، قيمة رقمية سالبة/غير رقمية→400، تعديل من دور بلا `settings.manage`→403 (بلا تغيّر القيمة). | `does_not_exist`→404؛ `-5`/`abc`→400؛ branch_manager PATCH→403، القيمة تبقى '10' | NONE |
| S7-M2 | **التوجيه متعدد المستويات (Model 2) مُثبت حيًّا** — تحويل سلسلة LEAVE إلى `[direct_manager, hr]` أوقف الطلب عند المدير أولًا ثم HR؛ نطاق الصندوق محصور بالمدير المباشر (لا الفرع)؛ الحُرّاس تمنع القفز؛ عكسه Model 1 يذهب مباشرة لـHR. | req 279: currentStep 1(mgr 157)→APPROVE→2(hr)→COMPLETED؛ `request_approvals` صفّان [89,12]؛ mgr B(159) نفس الفرع→لا يراه؛ السلسلة أُعيدت لـ[hr] | NONE |

## Ranked Fix Backlog

| Scenario | Severity | Item | Recommended Fix (Arabic) |
|---|---|---|---|
| S3 | CRITICAL | نفس الأصل يُسنَد لموظفَين حتى `ACTIVE` | أضف فحص الإسناد المفتوح (نفس فحص `/custody/assign`) داخل تحقق submit و`custodyAssignHandler`، واقفل الأصل فور `PENDING_ACK`، وحارس في `managerConfirmCustody`، وقيد فريد جزئي على `(assetId)` للحالات المفتوحة. |
| S6 / S10 | CRITICAL | الغياب بلا إذن لا يُسجَّل ولا يُخصم | دورة يومية تُنشئ صفوف `status='absent'` لأيام العمل بلا بصمة/إجازة، وأضف قراءتها في `calculate()` وخصمها بـ`dayRate` مع سياسة الغياب. |
| S3 | HIGH | الأصل لا يُحجَز طوال `PENDING` | انقل حجز الأصل (`ASSIGNED` أو حالة `RESERVED`) إلى لحظة إنشاء `PENDING_ACK` بدل تأجيله لاعتماد المدير حتى لا يظهر متاحًا. |
| S8 | HIGH | لا مُضاعِف أوفرتايم للعطلات | أضف مضاعِفات قابلة للضبط (`overtime.multiplier_weekday/weekend/holiday`) تُطبَّق آليًّا حسب تصنيف اليوم بدل الثابت 1.5. |
| S8 | HIGH | أوفرتايم العطلة لا يُكتشف/يُطابَق | افصل منطق «يوم عطلة بلا دوام» عن «عمل موثّق ببصمة في يوم عطلة»، ومكّن `detectOvertime` من ملء ساعات الطلب المعتمد في العطلات. |
| S9 | HIGH | الموظف المنتهي ما زال يدخل ويقدّم طلبات | عند الأرشفة عطّل صف `users` (`isActive=false`) و/أو ارفض `create()`/`submit()` لموظف `status='terminated'` أو `isActive=false`. |
| S6 | HIGH | إجازتان متداخلتان بخصم مضاعَف | أضف فحص تداخل التواريخ مع إجازات/طلبات الموظف السارية قبل التقديم ورفض/تنبيه التعارض. |
| S10 | HIGH | قيمة العهدة المفقودة لا تُقيَّد | سجّل معالج `custody_finance` ليقيّد قيمة الأصل (أو المتبقية) كسطر مديونية في obligations/`settlement_lines` يقرأه المسير أو التصفية. |
| S2 | MEDIUM | الصلاحيات في JWT بلا إبطال فوري | قصّر TTL التوكن و/أو أضف قائمة إبطال (`jti`/token version) لإنفاذ السحب والتعطيل فورًا. |
| S1 / S10 | MEDIUM | لا سجل مديونيات دائم | أضف جدول التزامات دائم (obligations ledger) يُقيَّد فيه كل حدث خصم/إضافة عند وقوعه ليكون مصدر الحقيقة قبل المسير. |
| S11 | MEDIUM | معالجات مالية غير مسجَّلة (bonus/allowance/adjustment/expense) | ابنِ هذه المعالجات لتقيّد بنودها (إضافات/خصومات) في obligations ledger يقرأه `calculate()`. |
| S11 | MEDIUM | نقطة فصل نصف اليوم غير قابلة للضبط | أضف مفتاح `attendance.half_day_cutoff` (وقت أو نسبة) بدل منتصف الوردية المثبّت للورديات غير المتماثلة. |
| S4 | MEDIUM | الغياب لا يُنشأ تلقائيًّا | مهمة ليلية تُنشئ صفوف `absent` لأيام العمل بلا بصمة (باستثناء العطل/الإجازات). |
| S11 | MEDIUM | `loan.finance_approval_threshold` يتيم | اربط المفتاح بإضافة خطوة `finance` آليًّا فوق الحد، أو أزِله من الإعدادات لأنه يوهم برقابة مالية غير موجودة. |
| S11 | MEDIUM | `salary_increase.executive_threshold_pct` يتيم | اربطه بخطوة `executive` شرطية فوق النسبة، أو أزِله لأنه يوهم بضابط موافقة تنفيذية غير مفعّل. |
| S7 | LOW | SALARY_INCREASE لا يقيّد رواتب فعلي | اربط زيادة الراتب بقيد رواتب/التزام فعلي حتى تنعكس في المسير لا في سجل الحالة فقط. |
| S7 | LOW | OVERTIME `payableHours=null` حتى المزامنة | تأكّد أن مزامنة البصمة تملأ `payableHours` قبل الرواتب وإلا لن يُصرف الأوفرتايم المعتمَد. |
| S7 | LOW | RESIGNATION يكتب `notice_period` لا `UNDER_NOTICE` | وحّد تسمية الحالة مع نص السياسة/الواجهة (فرق تسمية لا عطل وظيفي). |
| S10 | LOW | تتبّع خصم التأخير/الإجازة ناقص | ضمّن `attendanceDayIds` و`leaveIds` في `payroll_items.breakdown` لتسهيل التدقيق/الاعتراض. |
| S11 | LOW | `transfer.execution_mode` يتيم | أزِل المفتاح أو فعّل النمط الفوري فعليًّا (السلوك الحالي بتاريخ السريان معقول فالأثر منخفض). |

## Payroll-Handoff Readiness

| Handoff Point | Status | Note (Arabic) |
|---|---|---|
| Leave-balance deduction | ✅ | يُخصم من البركة الصحيحة (annual/sick منفصلتان) ويُكتب سجل `leaves` ويُعلَّم التقويم؛ مؤكَّد حيًّا (141: 10.5→7.5). |
| Payable overtime | ✅ | `payable=min(المعتمد،الفعلي)` دقيق ويُقرأ من `overtime_entries` المعتمدة؛ لكن يبقى `null` حتى مزامنة البصمة/اعتماد المدير — تأكّد من ملئه قبل الصرف، وأوفرتايم العطلة لا يُطابَق (خلل منفصل HIGH). |
| Unauthorised-absence deduction | 🚫 | مفقود كليًّا: يوم العمل بلا بصمة لا يُنشئ صف حضور، والمسير لا يخصم الغياب حتى لو وُجد `absent` (لا عمود/منطق). تسرّب مالي CRITICAL. |
| Late/early deduction | ✅ | يُقرأ من `attendance_days.lateMinutes+deductibleMinutes` ويُحسب بـ`minuteRate` بدقة، ويُطفأ/يُشعل بمفتاح `late_deduction_enabled`؛ الإذن يعفيه صحيحًا. |
| Unpaid-leave deduction | ✅ | `leaves.isUnpaid=1 & APPROVED` يُقرأ في `payroll.service` ويتحوّل خصمًا فعليًّا (2×dayRate=600) في `payroll_items`؛ مؤكَّد حيًّا. |
| Loan installments | ✅ | `loan_installments` (paid=false، dueDate داخل الفترة) يُخصم مرة واحدة (`paid` flag يمنع التكرار) وقابل للتتبع (`installmentIds` في breakdown). |
| Custody shortfall | 🚫 | مفقود: معالج `custody_finance` غير مسجَّل، فقيمة الأصل المفقود (3500) لا تُقيَّد في أي جدول يقرأه المسير أو تصفية نهاية الخدمة. HIGH. |
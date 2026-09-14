# تقرير المقارنة الشامل: نظامنا (NestJS + Next) مقابل نظام logic-leap (Laravel + React)

> وثيقة تسليم لمطوّر. تغطّي 8 موديول. الهدف: (1) ما يجب أن يبنيه المطوّر في نظامهم من مزايانا، (2) الفجوات التي يجب أن نسدّها نحن، (3) أوديت أمين لنظامهم.

---

# ملخص تنفيذي

**صورة عامة عن النضج**

نظامهم (Laravel, multi-tenant SaaS) أنضج في **الاتساع**: بنية SaaS متعددة المستأجرين بعزل صفّي، تسع مناطق وظيفية إضافية حقيقية ومُختبَرة (Performance / Recruitment / Training / Messaging / Notification / Calendar / Document / Report / Subscription)، أمان أوسع (2FA, LDAP, ~120 صلاحية `resource:action`, field-level security للراتب/الهوية)، ملف موظف أغنى بكثير، وحدة مؤهلات، استيراد/تصدير Excel، ومزامنة AD.

نظامنا (NestJS + Next) أنضج في **العمق والصحّة المنطقية** لمحرّكات HR الجوهرية: محرك حضور/تأخير/أوفرتايم دقيق، محرك إجازات باستحقاق شهري، محرك طلبات/اعتماد أغنى وظيفياً (شرطي/متوازٍ/SLA/تصعيد)، جرد أصول/عهدة حقيقي، موديول offboarding كامل بآلة حالة، وطبقة أمان تشغيلية نظيفة (per-user overrides + إبطال فوري للجلسة). لكنه أحادي المستأجر وأنحف في الاتساع.

**الخلاصة:** نظامهم أعرض وأجهز للبيع كمنتج SaaS، ونظامنا أعمق وأصحّ في منطق الأعمال. القيمة القصوى للمطوّر أن يحقن عمقنا المنطقي في عرضهم المعماري.

**أبرز 7 مزايا لدينا يجب أن يبنيها المطوّر في نظامهم (بترتيب الأولوية):**

1. **جرد أصول فردية + سلسلة عهدة ثنائية الطرف + خصم فقد/تلف فعلي في التصفية** — نظامهم بلا كيان أصل مُتتبَّع، بلا منع ازدواج، وخصم العهدة المفقودة عندهم *وهمي بالكامل* (لا حقل قيمة أصلاً).
2. **موديول Offboarding بآلة حالة**: `notice_period` بعد الاستقالة، إخلاء طرف متعدد الجهات، تجسيد آلي للأرشفة عند آخر يوم عمل، وتراجع عن الاستقالة. عندهم الاستقالة المعتمدة لا تغيّر حالة الموظف إطلاقاً.
3. **محرك اعتماد أغنى**: خطوات شرطية بعتبات + مجموعات متوازية + SLA زمني وتصعيد آلي + «إرجاع لاستكمال معلومات» + إلغاء + تقديم نيابة. مسارهم تسلسلي بحت بلا أيٍّ منها.
4. **محرك أوفرتايم ناضج**: مُضاعِفات بنوع اليوم (عادي/ويك إند/عطلة)، أوفرتايم كامل ليوم العطلة، نوافذ فتح/قفل بالتواريخ، وأوفرتايم مسبق الطلب `min(المطلوب,الفعلي)`. عندهم دقائق فقط بلا مُضاعِف، والعمل يوم العطلة = صفر أوفرتايم.
5. **تعذير الإذن الاتجاهي المتماثل + تقسيم دقائق الإذن مجاني/بخصم عند الحد الشهري**. عندهم الإذن المسائي لا يعذر الانصراف المبكر (عقوبة مزدوجة).
6. **محرك استحقاق إجازة شهري متراكم + نصف اليوم + «مرة واحدة طوال الخدمة» + ترحيل سنوي جماعي**. عندهم الاستحقاق يُمنح كاملاً مقدماً (يمكن صرف السنة في يناير)، ولا نصف يوم، ولا ترحيل آلي.
7. **تجاوزات صلاحيات لكل مستخدم (GRANT/REVOKE) + إبطال فوري للجلسة عبر `tokenVersion`**. عندهم الصلاحية من الدور فقط، وتعطيل المستخدم **لا يُبطل جلسته القائمة**.

---

# ✅ مميزاتنا التي يجب بناؤها في نظامهم

> مجمّعة بالموديول. الأولوية للأعلى أثراً على صحّة الأعمال.

## Assets & Custody (أعلى أولوية — عندهم مكسور/وهمي)

| الميزة | التفاصيل (قابلة للتنفيذ) | دليلنا |
|---|---|---|
| جرد أصول فردية حقيقي | أنشئ كيان `Asset` لكل قطعة (`id/serialNumber/value/status[AVAILABLE→ASSIGNED→RETIRED]/currentHolderId`) بدل `asset_types` (تصنيفات) + سطر `employee_assets` بحقل نصّي حر. يتيح تتبّع القطعة عبر حياتها ومالكيها. | `custody.entities.ts:14-38` |
| منع إسناد الأصل لموظفين — 3 طبقات | احجب الأصل من قائمة المتاح ما دام له إسناد مفتوح + رفض مبكر عند التقديم + رفض عند التنفيذ + حارس دهس عند اعتماد المدير (فحص `currentHolderId`). | `assets.controller.ts:134-162,246-261`; `requests.service.ts:917-943` |
| سلسلة عهدة ثنائية الطرف ملزِمة | `PENDING_ACK` (إقرار الموظف) → `PENDING_MANAGER_CONFIRM` (اعتماد المدير) → `ACTIVE`. بدل وضع `assigned` أحادياً فوراً بلا إقرار. | `requests.service.ts:811-826,898-977` |
| نقل عهدة حقيقي بين الموظفين | أقفل عهدة الحامل `TRANSFERRED` وافتح `PENDING_ACK` للمستلم، والأصل «قيد النقل». عندهم لا نقل إطلاقاً. | `requests.service.ts:847-896`; `destinations.service.ts:597-634` |
| فقد/تلف بقيمة → خصم فعلي في التصفية | `LOST/DAMAGED` يقفل السجل ويتقاعد الأصل، وقيمته تُخصم كبند DEBIT في التصفية **مع منع الخصم المزدوج** مقابل دفتر المديونيات. | `assets.controller.ts:296-323`; `offboarding.service.ts:345-379` |
| بورتال خدمة ذاتية + طابور اعتماد المدير | «عهدي» + إقرار الاستلام + طلب التسليم للموظف، وطابور «عهد بانتظار اعتمادي» للمدير. عندهم شاشة HR قراءة فقط. | `assets.controller.ts:164-211`; `src/app/my/custody/page.tsx` |

## Offboarding / Clearance

| الميزة | التفاصيل | دليلنا |
|---|---|---|
| استقالة = «فترة إشعار» لا إنهاء فوري | اعتماد الاستقالة → `notice_period` + فتح آلي لحالة إخلاء طرف. عندهم مجرد ختم `last_working_day` والموظف يبقى `active` يسجّل دخولاً. | `destinations.service.ts:417-421,447-483` |
| إخلاء طرف متعدد الجهات (5) بتفويض لكل جهة | مدير/عهدة/IT/مالية/HR، كل بند يعتمده صاحب صلاحيته، والتصفية لا تُبنى إلا بعد اكتمال الجميع. | `offboarding.service.ts:33-39,144-158,182-190` |
| قفل بند العهدة صلباً حتى الإرجاع | لا يكتمل بند العهدة والموظف ماسك إسناداً مفتوحاً. عندهم البوابة عند الأرشفة فقط لا عند اعتماد/صرف التصفية. | `offboarding.service.ts:160-173` |
| تجسيد آلي للإنهاء عند آخر يوم عمل (Cron) | تبقى `SETTLED` حتى يحل آخر يوم عمل ثم Cron يومي: `terminated` + أرشفة + تعطيل الدخول + توثيق. | `offboarding.service.ts:470-472,557-565` |
| «تراجع عن الاستقالة» خلال الإشعار | الموظف نفسه أو HR يلغي الملف ويعيده نشطاً مع توثيق. لا مقابل عندهم. | `offboarding.service.ts:500-536` |
| قفل التصفية عند الاعتماد + مراجع رسمية | توليد `settlementDocRef` + `clearanceCertRef` وتوثيق كل انتقال في `EmployeeStatusHistory`. | `offboarding.service.ts:458-468,488-494` |

## Requests & Approval Engine

| الميزة | التفاصيل | دليلنا |
|---|---|---|
| توجيه شرطي بعتبة | خطوة تُفعَّل عند شرط على حقل من الـpayload (`thresholdField/Op/Value`) — قرض ≥ 5000 يضيف خطوة المالية آلياً. | `requests.service.ts:612-630,578` |
| مجموعات اعتماد متوازية | خطوات بنفس `stepOrder`: كلهم يعتمدون وأي رفض يرفض الطلب كله. | `requests.service.ts:633-712` |
| SLA زمني + تصعيد آلي مجدول | `slaDays`→`dueAt`، وcron كل ساعة يصعّد المتأخرة إلى `escalateTo` بأثر `ESCALATED`. | `requests.service.ts:1124-1157`; `requests-scheduler.service.ts:22-26` |
| إرجاع لاستكمال معلومات + إعادة تقديم | `RETURNED_FOR_INFO` ثم تعديل الـpayload وإعادة الحوسبة. عندهم اعتماد/رفض فقط. | `requests.service.ts:681-686,779-800` |
| إلغاء الطلب من صاحبه | مسار cancel محكوم بآلة الحالات. عندهم `cancelled` حالة ميتة في الـenum بلا مسار. | `requests.service.ts:802-809` |
| تقديم نيابة عن الغير | فصل `requesterId` عن `createdByUserId` بصلاحية. | `requests.service.ts:117-155` |
| سجل خطوات مجمّد (snapshot) | تُحلّ الأدوار لموظف محدد وتُجمّد وقت التقديم فيثبت المعتمِد. عندهم حلّ حيّ في كل نداء inbox. | `requests.service.ts:516-518` |
| بوابة تحقّق غنية عند التقديم | منع تداخل الإجازات + مرة-واحدة-طوال-الخدمة + كفاية الرصيد بالطبقات + توفّر العهدة. | `requests.service.ts:318-514` |
| تنفيذ الوجهة داخل معاملة + `destinationRef` | سجل معالِجات موحّد ينفّذ داخل transaction ثم يعيد حساب الحضور. عندهم مستمعون best-effort خارج معاملة. | `requests.service.ts:714-777`; `destinations.service.ts:720-756` |

## Attendance / Lateness / Overtime

| الميزة | التفاصيل | دليلنا |
|---|---|---|
| تعذير إذن اتجاهي متماثل | `coverage=morning\|evening\|both`: الصباحي يعذر التأخير، المسائي يعذر الانصراف المبكر، بتغطية بالدقيقة. | `attendance.service.ts:1018-1122`; `attendance.entities.ts:91-94` |
| تقسيم دقائق الإذن مجاني/بخصم عند الحد الشهري | حد بالعدد أو الدقائق، «الأسبق أولاً»، وتقسيم النافذة عند نقطة الحد (داخل السقف مجاني، الباقي بخصم×النسبة). | `attendance.service.ts:816-859,1028-1054` |
| مُضاعِفات أوفرتايم بنوع اليوم | `dayKind` + مُضاعِفات (weekday/weekend/holiday) تُخزَّن على القيد. | `attendance.service.ts:1156-1175,163-175` |
| أوفرتايم كامل ليوم العطلة | بصمة دخول/خروج يوم عطلة = كامل الوقت أوفرتايم بمُضاعِف اليوم. عندهم يوم العطلة = صفر أوفرتايم. | `attendance.service.ts:1177-1182` |
| نوافذ فتح/قفل الأوفرتايم بالتواريخ + نطاق فرع | OPEN/CLOSED تتقدّم على المفتاح العام، والقفل الرجعي يحذف المكتشف غير المعتمد. | `attendance.service.ts:342-353`; `attendance.entities.ts:232-254` |
| أوفرتايم مسبق الطلب يُحترم رغم القفل | `payable = min(المطلوب,الفعلي)` والموافقة الصريحة تغلب القفل. | `attendance.service.ts:1186-1202` |
| نوافذ تصنيف البصمة + تصحيح يدوي باتجاه IN/OUT | نوافذ `checkinFrom/To` لتصنيف بصمات متعددة + تصحيح يصرّح باتجاهه. | `assets.entities.ts:105-117`; `attendance.service.ts:897-943` |
| وردية مرنة بساعات مطلوبة | `shiftMode=flexible` + `requiredHours`: الخصم بعجز الساعات لا بوقت البداية. | `attendance.service.ts:1060-1079` |
| تجسيد غياب يعيد الحساب + كشف «بصم رغم الإجازة» | صف `absent` ينقلب آلياً `leave/holiday` لو اعتُمدت إجازة لاحقاً + رفع `leaveConflict`. | `attendance.service.ts:558-563,995-999` |

## Leaves & Balances

| الميزة | التفاصيل | دليلنا |
|---|---|---|
| محرك استحقاق سنوي شهري متراكم | `21÷12` لكل شهر خدمة مكتمل بعد التجربة بحد سنوي. عندهم منح كامل مقدّم. | `leave-balances.service.ts:45-75` |
| إجازة نصف اليوم (صباحي/مسائي) | خصم 0.5 يوم + معالجة الحضور. غائبة عندهم تماماً. | `leave.entities.ts:71-74`; `requests.service.ts:341-368` |
| «مرة واحدة طوال الخدمة» + حارس التزامن | يرفض إن كان هناك سجل معتمد سابق أو طلب in-flight من نفس النوع. | `requests.service.ts:435-480` |
| فرض حد أيام النوع على أيام العمل الفعلية | عندهم `max_consecutive_days` معرّف بلا فرض إطلاقاً. | `requests.service.ts:423-430` |
| المرفق الإجباري مفروض من الطرفين | باك يرفض بلا مرفق + فرونت برفع فعلي وحارس. | `requests.service.ts:482-489` |
| إلغاء HR لإجازة معتمدة + استرجاع بالطبقات + إعادة ترسيم الحضور | يعمل حتى بعد بدء الإجازة. عندهم يُمنع إلغاء ما بدأ ولا مساس بالحضور. | `leaves.controller.ts:60-120` |
| ترحيل سنوي جماعي بضغطة واحدة | يحسب متبقي كل موظف حتى سقف ويحوّله لطبقة افتتاحية بتاريخ انتهاء. عندهم `carry_over_days` ميت. | `leave-balances.service.ts:212-266` |

## Settings / Auth

| الميزة | التفاصيل | دليلنا |
|---|---|---|
| تجاوزات صلاحيات لكل مستخدم (GRANT/REVOKE) | الفعلي = الدور ∪ منح − سحب، بواجهة كاملة. عندهم الصلاحية من الدور فقط. | `role.entity.ts:29-44`; `auth.service.ts:37-70`; `settings/users/page.tsx:679-780` |
| إبطال فوري للجلسة (`tokenVersion`) | يُزاد عند أي تغيير أمني ويُطابَق كل طلب مع فحص `isActive` — تعطيل المستخدم يقتل جلسته لحظياً. | `jwt.strategy.ts:24-38`; `users.controller.ts:215-223` |
| حراسات رقمية على مفاتيح الإعداد الحرجة | `payroll.monthly_days` (مقسوم عليها) تُرفض إن كانت فارغة/غير رقمية/تحت الحد — تمنع القسمة على صفر. | `settings.controller.ts:376-406` |
| مخزن key/value محمي من حقن المفاتيح | `upsertConfig` يعدّل المفاتيح المعرّفة بالكود فقط ويرفض أي مفتاح جديد من الـAPI. | `settings.controller.ts:389-406` |

## Employees + Org Structure

| الميزة | التفاصيل | دليلنا |
|---|---|---|
| فرض تسلسل الهيكل عند الإسناد | `assertRelations`: القسم∈الفرع والفريق∈القسم. عندهم يُفرض اتساق مركز التكلفة مع الفرع فقط. | `employees.service.ts:96-135` |
| سجل حالة وظيفي عند العودة | `reactivate` يكتب `EmployeeStatusHistory`. عندهم قلب `status` بلا أثر تدقيقي. | `employees.service.ts:297-305` |
| إعادة تفعيل تشمل «منتهي الخدمة» | لا مجرد المؤرشف. عندهم لا `terminated` في الـenum أصلاً. | `employees.service.ts:284-307` |
| منع الموظف مديراً لنفسه | رفض `managerEmployeeId===id`. عندهم `exists` فقط (لا حارس ذاتي ولا دورة). | `employees.service.ts:249-251` |
| توحيد كود الموظف = كود البصمة | مفتاح واحد فريد إجبارياً يقلّل ازدواج مزامنة البصمة. عندهم مفتاحان يُواءَمان يدوياً. | `employee.entity.ts:22-25`; `employees.service.ts:60-77` |

## Extras (Notification / Recruitment / Document)

| الميزة | التفاصيل | دليلنا |
|---|---|---|
| إشعارات مشتقة من الأحداث الفعلية | تُبنى لحظياً من الحقائق (قرارات الاعتماد/إلغاء الإجازة/عدّاد المعلّق) بلا جدول يحتاج مزامنة — لا يمكن أن تتأخّر أو تفقد حدثاً. | `portal.controller.ts:70` |
| تنبيه تعارض البصمة/الإجازة قابل للتنفيذ | يُرسَل لحامل `leaves.revoke` مع خيار قرار (إلغاء الإجازة فيرجع الرصيد أو إبقاؤها). | `portal.controller.ts` (leave-conflict) |
| رؤية المستندات مقيّدة بالنطاق والذات | بدون `documents.manage` يرى الموظف مستنداته فقط ومدير الفرع فرعه فقط + احتساب المنتهي/الوشيك. | `docs.controller.ts:73-101` |

---

# ⚠️ فجوات لدينا (عندهم وليس عندنا)

## أولاً: فجوات معمارية شاملة (تظهر في كل الموديولات)

| الفجوة | التفاصيل | دليلهم |
|---|---|---|
| **تعدد المستأجرين (Multi-tenant SaaS)** | `tenant_id` على كل جدول + Global Scope + `TenantResolver` بحارس cross-tenant. نظامنا أحادي المستأجر بالكامل. | `Core/Traits/BelongsToTenant.php`; `Core/Middleware/TenantResolver.php:36-53` |
| اشتراكات + Feature-flags | `CheckFeatureFlag` + `FeatureFlagService` يفعّلان الموديولات حسب خطة المستأجر + routes منصّة. | `Subscription/Services/FeatureFlagService.php`; `Models/Plan.php` |
| صلاحيات دقيقة `resource:action` (~120) + field-level | تقييد قراءة/كتابة الراتب والهوية (`employees:salary:read`, `employees:pii:read`). صلاحياتنا أخشن (~40) بلا تقييد حقلي. | `Core/Authorization/PermissionRegistry.php:34-107`; `SensitiveFields.php` |
| 2FA (TOTP + أكواد استرداد) | سر TOTP + QR + دخول من مرحلتين. غائب لدينا. | `Auth/Services/AuthService.php:89-256` |
| دخول LDAP/Active Directory | `auth_source` local\|ldap مع rebind. غائب لدينا. | `Auth/Services/LdapService.php` |
| استعادة كلمة المرور + قفل الحساب + throttle | forgot/reset + قفل بعد 5 محاولات + `throttle:30,1`. لدينا تعيين من الأدمن فقط. | `AuthService.php:140-153`; `User.php:80-95` |
| إبطال جلسات انتقائي | `PermissionSyncService` يُخرج فقط من نقصت صلاحياته (لا عند المنح). إبطالنا أخشن (أي تغيير يُخرج). | `Auth/Services/PermissionSyncService.php:38-98` |
| نطاق متعدد الفروع لكل مستخدم | `branch_user` (فارغ = كل الفروع). لدينا `branchId` مفرد. | `Auth/Models/User.php:69-73` |

## ثانياً: مناطق وظيفية غائبة عندنا تماماً (mock أو غير موجودة)

| الموديول | التفاصيل | دليلهم |
|---|---|---|
| **Performance** (كامل) | قوالب كفاءات موزونة + دورات تقييم بآلة حالة + أهداف + دورة مراجعة (ذاتي→مدير→HR→معايرة→اعتماد) بحساب موزون. شاشاتنا mock بلا باك. | `Performance/Services/PerformanceReviewService.php`; `Actions/FinalizeReviewAction.php` |
| **Recruitment** (عمق) | `job_postings` + `interviews` (جولات/قرار/no_show) + `job_offers` (تفصيل راتب + send/withdraw/respond/expire) + تحويل لموظف+عقد + ترشيحات. لدينا candidates فقط (المقابلات/العروض mock). | `Recruitment/Actions/ConvertApplicantToEmployeeAction.php` |
| **Training** (كامل) | courses + enrollments + certificates (إصدار تلقائي) + تقارير فجوات. شاشاتنا mock. | `Training/Services/TrainingCertificateService.php` |
| **Messaging** (كامل) | محادثات فردية/جماعية + مرفقات + إيصالات قراءة + كتم/تثبيت/أرشفة. غائب لدينا. | `Messaging/Controllers/ConversationController.php` |
| Notification (بنية دائمة) | جدول notifications + إعدادات قنوات + SMS (Twilio) + Email + AuditLog. إشعاراتنا مشتقة بلا حفظ. | `Notification/Services/*` |
| Calendar (أحداث) | CRUD لأحداث التقويم + تصدير. تقويمنا للقراءة فقط. | `Calendar/Controllers/CalendarController.php` |
| Document (قوالب) | `DocumentTemplate` + generate-from-template بمُصيّر `{{...}}`. لا قوالب لدينا. | `Document/Services/TemplateRenderer.php` |
| Report (عمق) | dashboard widgets + منشئ تقارير مخصص + تصدير PDF/Excel/CSV. تقاريرنا ثابتة بلا تخصيص/تصدير. | `Report/Exports/{PdfExporter,ExcelExporter,CsvExporter}.php` |
| نضج الاختبار | Feature tests + Playwright + Vitest لهذه الوحدات. وحداتنا الوهمية بلا اختبارات. | `hr/tests/Feature/**` |

## ثالثاً: فجوات وظيفية داخل الموديولات المشتركة

| الموديول | الفجوة | دليلهم |
|---|---|---|
| Employees | ملف موظف أغنى (جواز/GOSI/work_location/extension/مصدر توظيف/سياسة إجازات لكل موظف...) | `Employee/Models/Employee.php:23-92` |
| Employees | وحدة المؤهلات (تعليم/شهادات/مهارات/لغات/خبرات). عندنا «غير مدعومة». | `EmployeeQualificationController.php` |
| Employees | طلبات تصحيح البيانات الذاتية باعتماد HR | `ProfileUpdateRequestController.php` |
| Employees | استيراد/تصدير Excel بقالب | `EmployeeImportExportController.php` |
| Employees | مزامنة AD/LDAP للبريد والامتداد | `AdSyncController.php:25-74` |
| Employees | إيقاف/إعادة تفعيل عكسي مستقل + استرجاع جماعي. عندنا `suspended` حالة ميتة بلا endpoint. | `SuspendEmployeeAction.php` |
| Employees | شجرة أقسام بوراثة الفرع + حارس دورة كامل + حُرّاس حذف مرجعية | `Setting/Services/DepartmentService.php:81-85` |
| Employees | التحقق من وجود `costCenterId/workScheduleId` + اتساق المركز مع الفرع. عندنا لا فحص إطلاقاً. | `CostCenterBranchRule.php` |
| Employees | العقود ككيان مستقل (تجديد/إنهاء/قرب الانتهاء). عندنا حقول مضمّنة فقط. | `ContractController.php` |
| Attendance | جدولة مؤسسية متعددة النطاقات بفترات سريان (`ScopeResolver`) | `ScheduleAssignmentService.php:100-124` |
| Attendance | خصم استراحة الوردية من دقائق العمل | `AttendanceCalculationService.php:212-215` |
| Attendance | معالجة الوردية الليلية للورديات الثابتة (`is_overnight`) | `AttendanceCalculationService.php:222-227` |
| Attendance | self check-in بالموقع (GPS/QR + lat/lng) | `CheckInAction.php:29-41` |
| Attendance | إعفاء HR من خصم الإذن بتدوين الفاعل/السبب | `ExitPermitController.php:71-85` |
| Leaves | **دفتر أرصدة افتتاحية بطبقات متعددة** (مصدر/صلاحية/FIFO/تدقيق). عندنا طبقة واحدة. | `OpeningLeaveBalanceService.php:80-134` |
| Leaves | رصيد مستقل لكل نوع إجازة. عندنا دلوان ثابتان (annual/sick). | `Models/LeaveBalance.php` |
| Leaves | تعديل رصيد يدوي (+/−) بسبب إلزامي وتدقيق | `LeaveBalanceService.php:173-188` |
| Leaves | استحقاق سنوي لكل موظف. عندنا قيمة عامة واحدة. | `LeaveBalanceService.php:57-70` |
| Leaves | قفل تشاؤمي `lockForUpdate` على تعديلات الرصيد | `LeaveBalanceService.php:133-168` |
| Leaves | أنواع مقيّدة بالجنس + تحذير تعارض إجازات الفريق (≥30%) | `LeaveService.php:125-162` |
| Requests | تكامل مفصول مبني على الأحداث (`ApprovalFinalized` + مستمعون). ربطنا مركزي أقل قابلية للتوسّع. | `Events/ApprovalFinalized.php` |
| Requests | رؤية بنطاق هرمي (company/branch/department/team/employee). رؤيتنا مسطّحة. | `RequestTypeController.mine:104-133` |
| Assets | حذف ناعم (SoftDeletes) + إعفاء إخلاء طرف رسمي «بلا خصم» (waiver) + أسماء ثنائية اللغة + `requires_approval` لكل نوع | `ClearanceController.php:36-50` |
| Offboarding | محرك اعتماد قابل للتهيئة للعهدة مع rollback + طلب إنهاء يستهدف موظفاً آخر بتفويض بنطاق الفرع | `ApplyTerminationOnApprovalDecision.php:56-67` |

---

# 🔎 أوديت نظامهم (المكسور / الناقص / الوهمي)

> مرتّب HIGH → LOW. دُمجت البنود المتكرّرة (خصوصاً «الاعتماد المباشر يتجاوز السلسلة» و«خصم العهدة الوهمي»).

## 🔴 HIGH

| # | الموديول | العطل | الدليل |
|---|---|---|---|
| 1 | Assets | **لا جرد أصول فردية ولا منع ازدواج**: `asset_types` تصنيفات فقط، و`employee_assets` يقبل نفس `identifier` لعدد لا نهائي من الموظفين بلا فحص تفرّد. يستحيل تتبّع قطعة أو منع ازدواج. | `Migrations/...000007:15-40`; `StoreEmployeeAssetRequest.php:14-22` |
| 2 | Assets | **خصم العهدة المفقودة وهمي بالكامل**: الواجهة تعِد «تُخصم قيمة العهد المفقودة»، لكن لا حقل `value` على الأصل، و`lost` حالة محلية لا تُحفظ، و`calculateTotalDue` يخصم القروض فقط. | `terminate/page.tsx:719-726,759-766` مقابل `:149-154` |
| 3 | Assets | **واجهة تسليم العهدة غير موصولة**: `assetsService.assign()` معرّفة بلا مستدعٍ، و`EmployeeAssetsTab` قراءة فقط. لا مدخل مستخدم للتسليم إلا عبر API المباشر. | `assets.service.ts:70`; `EmployeeAssetsTab.tsx:14-105` |
| 4 | Offboarding | **بوابة إخلاء الطرف تُطبَّق عند الأرشفة فقط لا عند اعتماد/صرف التصفية** — رغم أن تعليق الكود يدّعي أنها بوابة صلبة على التصفية. عملياً تُعتمد تصفية «جاهزة للصرف» والعهدة مفتوحة. | `ClearanceService.php:9-13,41-52` مقابل `SettlementService.php:120-134` |
| 5 | Offboarding | **لا حالة «فترة إشعار» بعد الاستقالة**: الموظف يبقى `active` يسجّل دخولاً ويقدّم طلبات؛ الأثر الوحيد ختم `last_working_day`. لا آلة حالة ولا تجسيد آلي. | `ApplyResignationOnApprovalDecision.php:41-57` |
| 6 | Leaves | **`max_consecutive_days` إعداد وهمي**: يُعرَّف ويُعرض ويُحرَّر لكن لا يُفرَض أبداً — «مرضية 30 يوم» تمرّ بـ300 يوم دون رفض. | `Models/LeaveType.php:20` مقابل `LeaveService.php:52-123` |
| 7 | Leaves | **المرفق الإجباري غير قابل للاستيفاء ولا الفرض**: الباك لا يتحقق، ونموذج الخدمة الذاتية بلا حقل رفع أصلاً — نوع يتطلب تقريراً طبياً يُقدَّم دائماً بلا مرفق. | `StoreLeaveRequestForm.php:11-21`; `request/page.tsx` (بلا input file) |
| 8 | Requests | **قدرات باك موثّقة غير موصولة في شاشة الإعداد**: دورات الفرع (US2) والمعتمِد الاحتياطي (FR-015) والاستهداف بالمسمى الوظيفي (`job_title`) لا يمكن ضبطها من المنتج إطلاقاً. | `settings/pages/approvals/page.tsx:42-50,135,178-184` |
| 9 | Requests | **تناقض حوكمة**: الشاشة تعِد بأن «كل حاملي الصلاحية يجب أن يعتمدوا»، لكن المحرك يتقدّم بأول معتمِد يسجّل قراراً. | `page.tsx:572-574` مقابل `ApprovalEngine.php:145-177` |
| 10 | Settings | **عزل المستأجرين مكسور في الأدوار/الصلاحيات**: جداول Spatie عالمية (`teams=false`, بلا `tenant_id`)، و`RolePermissionController::update` ينفّذ `syncPermissions` على دور مشترك عالمياً — تعديل super_admin لمستأجرٍ دورَ `hr_manager` يغيّره **لكل المستأجرين**، والفهرس يعرض أدوار الجميع. | `config/permission.php:134`; `RolePermissionController.php:26-48` |
| 11 | Settings | **تعطيل المستخدم لا يُبطل جلسته**: `is_active=false` بلا حذف توكنات Sanctum ولا middleware يفحص `is_active` لكل طلب — الجلسة القائمة تبقى صالحة بلا انتهاء. | `UserController.php:80-101` مقابل `destroy:103-115` |

## 🟠 MEDIUM

| # | الموديول | العطل | الدليل |
|---|---|---|---|
| 12 | Employees | شاشة org-chart تتجاهل نطاق الفرع وتسرّب كل الفروع/الموظفين داخل المستأجر (لا استدعاء `EmployeeScopeService`). | `EmployeeOrgChartController.php:13-34` |
| 13 | Attendance | العمل في العطلة لا يُنتج أوفرتايم، ولا مُضاعِف لنوع اليوم (`OvertimeRecord` بلا حقل rate). | `AttendanceCalculationService.php:267`; `OvertimeRecord.php:20-31` |
| 14 | Attendance | الإذن المسائي لا يعذر الانصراف المبكر — احتمال **عقوبة مزدوجة** (دقائق انصراف مبكر + خصم إذن). | `AttendanceCalculationService.php:340-361,207-229` |
| 15 | Attendance | حقول إعداد ميتة على نوع الإذن (`deduction_type/threshold_minutes`) تُخزَّن وتُرجَع بالـAPI بلا أثر على المحرك ولا في النموذج. | `StorePermitTypeRequest.php:26-27` مقابل `ExitPermitService.php:67-104` |
| 16 | Attendance / Leaves | **الإجازة المعتمدة بأثر رجعي لا تصالِح صف الغياب المُجسَّد**: `MarkEmployeeAbsencesAction` يتخطّى أي تاريخ له صف، ووحدة الإجازات لا تلمس الحضور — يبقى اليوم غياباً في التقارير. | `MarkEmployeeAbsencesAction.php:66-72` |
| 17 | Leaves | لا ترحيل سنوي آلي و`carry_over_days` ميت — الترحيل كله يدوي طبقة-بطبقة لكل موظف. | `OpeningLeaveBalanceController.php:44-53` |
| 18 | Leaves | تضارب عدّ الأيام: الواجهة تعرض عدّاً تقويمياً ساذجاً (يشمل العطلات) وتبني عليه تحذير الرصيد، بينما الباك يخصم أيام العمل فقط. | `request/page.tsx:63-69` مقابل `LeaveDayCalculator.php` |
| 19 | Requests | لا SLA زمني ولا تصعيد مؤقّت — خطوة عالقة تبقى معلّقة للأبد؛ «التصعيد» عندهم مجرد احتياطي لحظة التقديم. | `ApprovalEngine.php:264-272` |
| 20 | Requests | لا توجيه شرطي/عتبات — يتعذّر «مبلغ كبير يحتاج موافقة إضافية» دون نوع منفصل يدوي. | `StoreApprovalStepRequest.php` |
| 21 | Requests | الرؤية غير مفروضة على مسار التقديم — `POST /approvals/requests` يفتح أي نوع بلا فحص (الفلترة في `mine()` فقط). | `ApprovalRequestController.store:112-125` |
| 22 | Requests | لا إلغاء ولا «إرجاع لاستكمال معلومات» — القرار اعتماد/رفض فقط، و`cancelled` حالة ميتة. | `ApprovalDecisionRequest.php` |
| 23 | Requests | صندوق الاعتمادات (inbox) يحمّل كل الطلبات المعلّقة ثم يحل المعتمِد في PHP لكل صف (**N+1** بلا صفحات). | `ApprovalRequestController.inbox:55-72` |
| 24 | Assets | نموذج الاعتماد التفاؤلي غير سليم — التسليم يضع `assigned` فوراً ويحجب الإخلاء قبل أي موافقة، والرفض وحده يعكس. | `EmployeeAssetController.php:41-52`; `ApplyAssetDecisionOnApproval.php:28-47` |
| 25 | Assets | الإعفاء الشامل (blanket waiver) دائم وغير مقيّد — يجعل `outstanding()` فارغاً للأبد شاملاً أصولاً تُسنَد لاحقاً. | `ClearanceService.php:19-33` |
| 26 | Assets | لا نقل عهدة بين الموظفين ولا حالة «قيد النقل» — يتطلب إرجاعاً يدوياً ثم سطراً جديداً بلا رابط. | `Asset/Routes/api.php:18-23` |
| 27 | Offboarding | الأرشفة اليدوية لا تحفظ آخر يوم عمل/فترة الإشعار/مقابلة الخروج — الـwizard يجمعها لكن `proceedArchive` يرسل `reason` فقط. | `terminate/page.tsx:196-209`; `ArchiveEmployeeAction.php:19-23` |
| 28 | Offboarding | خطوة «المستحقات» في wizard الإنهاء تقديرية بالعميل ومضلِّلة — `leaveBalance/loanBalance` تظلّان 0 في هذا المسار فتظهر البدلات = 0 دائماً. | `terminate/page.tsx:65-67,143-154` |
| 29 | Settings | التدقيق التلقائي خامل — `LogAuditTrail` معرّف بلا wiring، و`AuditLogService::log` يُستدعى في موضعين فقط؛ فجدول التدقيق شبه فارغ رغم واجهة حقيقية. | `Core/Middleware/LogAuditTrail.php`; `bootstrap/app.php:21-31` |
| 30 | Extras | المراسلة بلا زمن-حقيقي — لا websockets/broadcasting في المشروع كله؛ «الدردشة» polling، والحضور تحديث `last_seen_at`. | grep فارغ في `hr/app`; `PresenceController.php` |
| 31 | Extras | تغطية e2e (Playwright) تتوقف عند phase1-3 — لا مواصفات لـ performance/recruitment/training/messaging/reports/subscription رغم نضج الباك. | `hr-dashboard/e2e/` |

## 🟡 LOW (نمط متكرّر + بنود صغيرة)

- **الاعتماد/الرفض المباشر يتجاوز سلسلة الاعتماد المُهيّأة** (نمط متكرّر عبر الموديولات): حامل `leaves:approve` يعتمد فوراً بينما طلب الدورة مفتوح (`LeaveController.php:54-60`)؛ ونفس الشيء في الأوفرتايم (`ApproveOvertimeAction.php:10-18`). حارس `status!=='pending'` يمنع الخصم المزدوج لا التجاوز.
- **لا معاملة/قفل حول `decide`** في محرك الاعتماد — قراران متزامنان قد يتقدّمان معاً (سباق)، بلا idempotency. (`ApprovalEngine.php:124-186`)
- Employees: لا حارس ذاتي/دورة على `manager_id`، ولا اتساق قسم∈فرع أو فريق∈قسم، وعدم اتساق مرجع «المدير» (Department→User مقابل Employee→Employee)، ومزامنة AD معطّلة افتراضياً (422). (`StoreEmployeeRequest.php:61-67`)
- Attendance: شرائح التأخير (grace/30/60) ثابتة في الكود غير قابلة للضبط لكل tenant/وردية. (`AttendanceCalculationService.php:193-202`)
- Leaves: لا نصف يوم إطلاقاً؛ قيد الجنس ضمني فقط (لا فحص وقت التقديم للأنواع التي لا تخصم رصيداً)؛ غياب الاستحقاق الشهري (منح مقدّم). (`Migrations/...000002:47-68`)
- Assets: الإعفاء لا يتحقق أن `employee_asset_id` يخصّ الموظف موضع الإعفاء؛ وإرجاع أصل مُرجَع سابقاً بلا idempotency؛ وحذف نوع الأصل (SoftDelete) بلا حارس استخدام فتظهر «—». (`WaiveClearanceRequest.php:17`; `EmployeeAssetController.php:56-72`)
- Offboarding: `SyncSettlementOnApprovalDecision` يستخدم `$event->actor->id` بلا حارس null (قد يبقى settlement pending رغم اكتمال الموافقة). (`SyncSettlementOnApprovalDecision.php:30-34`)
- Settings: middleware قفل الحساب `CheckAccountLockout` مسجّل بلا تطبيق (كود ميّت يوهم برقابة)؛ و`resolveTenant` يثق بهيدر `X-Tenant-ID` من العميل في المسارات العامة (تعداد المستأجرين). (`bootstrap/app.php:25`; `TenantResolver.php:56-73`)
- Extras: `unreadCount` يعاني N+1؛ SMS/Email تفشل بصمت عند غياب الإعداد؛ وحساب درجة الأهداف خطّي (100%=5.0) والوزن 40/60 مثبّت غير قابل للضبط. (`ConversationController.php`; `PerformanceReviewService.php`)

---

## جدول مقارنة سريع (موديول × نحن/هم)

| الموديول | نظامنا (NestJS+Next) | نظامهم (Laravel+React) | الغالب |
|---|---|---|---|
| Employees + Org | سلامة هيكل صارمة، كود=بصمة موحّد، سجل حالة، إعادة تفعيل أوسع — لكن ملف أنحف، بلا مؤهلات/import/AD/suspend | ملف غني، مؤهلات، import/export، AD، عقود، شجرة أقسام بوراثة — لكن org-chart يسرّب، لا اتساق قسم∈فرع | **هم** (اتساع) / نحن (سلامة) |
| Attendance / OT | محرك عميق: تعذير اتجاهي، مُضاعِفات يوم، نوافذ قفل، وردية مرنة، تجسيد غياب | ناضج وحقيقي (بصمة/جدولة نطاقات/استراحة/self check-in) لكن OT بدائي، عطلة=صفر أوفرتايم، عقوبة مزدوجة | **نحن** (منطق) / هم (جدولة+بصمة) |
| Leaves | استحقاق شهري، نصف يوم، مرة-واحدة، ترحيل جماعي، إلغاء بالطبقات | دفتر طبقات متعدد، رصيد لكل نوع، قفل تشاؤمي — لكن `max_days`/`attachment`/ترحيل وهمية | **نحن** (منطق) / هم (بنية الرصيد) |
| Requests / Approvals | شرطي/متوازٍ/SLA/تصعيد/إرجاع/إلغاء/نيابة/آلة 9-حالات | محرك عام نظيف مفصول بالأحداث — لكن تسلسلي فقط، بلا SLA/إلغاء/إرجاع، قدرات غير موصولة | **نحن** بوضوح |
| Assets / Custody | جرد فردي، منع ازدواج، سلسلة ثنائية، نقل، فقد→خصم فعلي | تصنيفات فقط، إعفاء موثّق، multi-tenant — لكن لا جرد، لا منع ازدواج، UI غير موصول، خصم وهمي | **نحن** بوضوح |
| Offboarding | موديول كامل بآلة حالة، إخلاء 5 جهات، تجسيد آلي، تراجع | موزّع بلا موديول مستقل؛ استقالة بلا تغيير حالة، بوابة عند الأرشفة فقط | **نحن** بوضوح |
| Settings / Auth | per-user overrides، إبطال فوري للجلسة، حراسات إعداد | multi-tenant، 2FA، LDAP، ~120 صلاحية، field-level — لكن عزل الأدوار مكسور، تعطيل لا يُبطل الجلسة | **هم** (اتساع) / نحن (تشغيل) |
| Extras (9 مناطق) | معظمها mock؛ شرائح حقيقية ضيّقة (candidates/notifications/docs/calendar-RO/reports أساسية) | التسعة حقيقية مُختبَرة multi-tenant — لكن بلا زمن-حقيقي للمراسلة، e2e ناقصة | **هم** بوضوح |

**الخلاصة للمطوّر:** ابنِ في نظامهم — بالترتيب — (1) جرد الأصول الفردي + خصم العهدة الفعلي، (2) موديول offboarding بآلة حالة وبوابة إخلاء على التصفية، (3) محرك الاعتماد الشرطي/المتوازي بـSLA وإلغاء وإرجاع، (4) محرك الأوفرتايم بمُضاعِفات اليوم وأوفرتايم العطلة، (5) تعذير الإذن الاتجاهي، (6) الاستحقاق الشهري والترحيل الآلي وفرض `max_days`/`attachment`، (7) per-user overrides وإبطال الجلسة عند التعطيل. وأصلِح فوراً الحواجز الأمنية HIGH عندهم (عزل الأدوار المكسور + تعطيل لا يُبطل الجلسة).

---

# ملحق: أوديت حيّ للنظام المنشور (hr.logic-leap.ai)

جرى تصفّح النظام الحيّ بجلسة الأدمن (متعدد المستأجرين، شركة co1). تأكيدات وإضافات:

- **النظام حقيقي ومصقول ومنشور**، لكنه **قليل الاستخدام فعلياً**: 7 موظفين (6 نشط)، صفر سجلات حضور، صفر طلبات إجازة/أذونات — يعني لم يُشغَّل بحمل حقيقي بعد.
- **الطلبات مقسّمة بالنوع**: «طلب سلفة» و«طلب قرض» **منفصلان** (ميزة نطلبها نحن)، «طلب استئذان» منفصل؛ الطلبات تحت `/requests/new` و`/requests/mine` و`/approvals` (لا صفحة `/requests` موحّدة — تعطي 404).
- **نموذج إضافة موظف غني (5 أقسام wizard)**: شخصي/وظيفي/مالي/مؤهلات/مستندات، تقسيم الاسم لأربعة (أول/أب/جد/عائلة) عربي+إنجليزي، عنوان مهيكل (دولة/مدينة/حي بإضافة تلقائية)، عدد الأبناء، جواز+انتهاء، جهة طوارئ، «حفظ كمسودة» — **أعمق من نموذجنا**.
- **تفاصيل موظف إضافية**: إدارة العقود، المستندات، **طلبات تعديل بيانات الموظف** (مسار موافقة على تعديل الموظف لبياناته)، الدرجات الوظيفية، الهيكل التنظيمي، المؤرشفين.
- **الإعدادات غنية جداً** (فروع/أقسام/فرق/مسميات/درجات/أيام عمل/اعتمادات/أنواع عهد/مراكز تكلفة/قوائم منسدلة/سياسات إجازات/مستخدمين/أدوار/مستندات/قوالب/اشتراك/أمان/تكاملات) — **لكن حقول كثيرة معلّمة «واجهة فقط»** (غير موصولة بالباك): السجل التجاري، الرقم الضريبي، رقم التأمينات، الاسم المختصر، المدينة، الموقع الإلكتروني... = بقع mock مثل ما كان عندنا.
- **متعدد الدول** (السعودية/الإمارات/مصر) وSaaS باشتراك — اتساع لا نملكه.

الخلاصة الحيّة تطابق أوديت الكود: **نظامهم أعرض (SaaS/اتساع) لكن جوهره قليل الاستخدام وفيه بقع واجهة-فقط؛ نظامنا أعمق منطقياً في محرّكات HR.**

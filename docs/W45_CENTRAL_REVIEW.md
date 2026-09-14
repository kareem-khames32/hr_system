# تدقيق CENTRAL_REVIEW للموجتين 4 و5

التاريخ: 11 سبتمبر 2026. راجعت جميع **36 معرفاً** كانت موسومة CENTRAL_REVIEW في docs/UI_COMPLETION.md، مقابل الصف الأصلي من OUR_TECH_DEFECTS.md والكود الموجود فعلياً. هذه مراجعة قراءة فقط: لم أغير كوداً أو بيانات ولم أشغّل اختبارات UI جديدة فيها. بعض البنود تحركت إلى مهام إصلاح بعد إبلاغ الجذر؛ الجدول يحفظ حالة وقت القراءة ويحتاج تحديثاً بدليل بعد تلك المهام.

النتيجة: **17 FIXED_CODE، 9 PARTIAL_OPEN، 10 OPEN**. FIXED_CODE يعني أن مسار الإصلاح ظاهر في الكود، ولا يساوي اعتماداً بصرياً أو إغلاقاً للاختبارات التي لم تُنفذ. عندما يُذكر اختبار تكامل، فهو اختبار موجود ونتيجته مأخوذة من تقرير المسار المسؤول، لا افتراض من التقرير القديم.

## أولويات مؤكدة أُبلغ عنها فوراً

- SET-4: صفحة الإعدادات تعرض شركة وسجلاً وضريبة وهميين، وحفظاً بلا تنفيذ، وادعاء2FA/تكاملات متصلة. التبويبات قابلة للفتح فعلياً.
- EMP-18: معاينة نص محلية تعرض نجاح إنشاء المستند، ولا تحفظ EmployeeDocument؛ زر PDF بلا تنفيذ. الشركة والطباعة أصلحتا جزئياً.
- ATT-17: جدول الأسبوع يقفل الجمعة/السبت لكل موظف ويحسب ×5، ويجلب الاستثناءات بنطاق المشاهد. الجذر أسند إصلاحه بعد هذه المراجعة.
- خطر متعلق بالشطب: employees/custody/page.tsx:272 يقول «سجّلها خصماً في تصفية إنهاء الخدمة» بعد كتابة/حساب الفقد التلقائي في الباك؛ قد يدفع المستخدم لخصم مضاعف.
- EMP-22 وEMP-26 وREQ-20: أزرار حفظ مسودة/تحميل جماعي/بريد/تصدير بلا handlers.
- REQ-22: صفوف الطلبات ذات النوع غير الفعال تُحذف بصرياً رغم دخولها العدادات.

## مصفوفة الأدلة

تنبيه زمني: الجدول التالي يحفظ نتيجة القراءة الأصلية. إصلاح ATT-17 وNAM-31 اللاحق مثبت في الملحق بعد الجدول، ومصفوفة الإغلاق النهائية المجمعة تكتب في W45_FINAL_MATRIX.md.

| المعرف | الحالة وقت القراءة | الدليل الحالي | الحكم التفصيلي |
|---|---|---|---|
| SET-4 | OPEN | src/app/settings/page.tsx:117,303,415,463,796,1113 | الشركة تبويب افتراضي ببيانات وهمية، اكتمال ثابت، حفظ بلا handler، 2FA وتكاملات connected ثابتة. enginePanels للحضور/الإجازة/الرواتب حقيقية لكن لا تغطي هذه الأقسام. |
| EMP-18 | PARTIAL_OPEN | src/app/employees/[id]/page.tsx:969,983,2167,2180 | الشركة من fetchCompanyInfo والطباعة موصولة. generateDocument ينتج نصاً وpreview فقط؛ لا upload/createDocument، نجاح الإنشاء معلن وPDF بلا handler. |
| ATT-23 | FIXED_CODE | src/lib/attendance.ts (غير موجود)؛ api/src/attendance/attendance.service.ts | Test-Path=false ولا استيراد/lib attendance ولا التعليق القديم بنتائج rg؛ النسخة الميتة حذفت. |
| REQ-21 | PARTIAL_OPEN | src/app/requests/page.tsx:356,1337؛ src/app/requests-console/page.tsx:133,460,471 | الطلبات والأنواع الفعالة من API، لكن سلسلة التقديم def.approvalChain من الثابت، وتبويب الكتالوج في الكونسول لا يزال requestsCatalog. |
| ATT-11 | FIXED_CODE | src/app/attendance/overtime/page.tsx:99,182,449,478؛ api/src/attendance/attendance.service.ts:2935 | overtimeLog يرجع كل الحالات وrequestStatus وrequiresConfirmation؛ الواجهة تحفظ updateConfig وتؤكد DETECTED فقط وتربط SUBMITTED بالصندوق. لم أشغّل UI في التدقيق. |
| ATT-12 | FIXED_CODE | src/app/attendance/manual-entry/page.tsx:81,123,153,431,448؛ api/src/attendance/attendance.controller.ts:210,227,239؛ attendance.entities.ts:37 | السبب والمنشئ والمصدر محفوظة؛ تحميل MANUAL من السيرفر وحذف يعيد الحساب. زر التعديل الميت أزيل، والحالة من اليوم المحسوب. |
| EMP-16 | FIXED_CODE | src/app/employees/onboarding/page.tsx:104,140,741,761,786؛ api/test/integrity.integration.cjs:onboarding persists one checklist | صفحة وقالب ومهام من API مع حفظ التعديل ونافذة توظيف قابلة للإعداد؛ AppModule يسجل OnboardingModule. اختبار التكامل في تقرير الباك يثبت الاستمرار والعزل. |
| SET-5 | FIXED_CODE | src/app/settings/work-days/page.tsx:20,499,1746؛ api/test/recovery.integration.cjs:work schedules persist | CRUD work-schedules والإسناد الفعلي للموظف بدل sampleEmployees؛ اختبار recovery يثبت الحفظ/الإسناد/عزل الفرع. |
| EMP-22 | OPEN | src/components/EmployeeForm.tsx:2368 | زر type=button حفظ كمسودة بلا onClick أو تخزين/استعادة للمسودة. |
| EMP-26 | OPEN | src/app/employees/documents/page.tsx:513,518 | تحميل/إرسال بالبريد عند تحديد عدة مستندات بلا handlers؛ تحميل المستند المفرد يعمل. |
| EMP-28 | FIXED_CODE | src/app/employees/page.tsx:188,231؛ employees/archived/page.tsx:156,159؛ contracts/page.tsx:199؛ org-chart/page.tsx:351 | CSV من الصفوف المعروضة موصل بالأربع شاشات؛ زر الاستيراد غير المبني أزيل؛ قابلون للتفعيل=archived+terminated؛ لا نتيجة بحث لترقيم صفحة1من1 القديم. |
| LEV-13 | FIXED_CODE | src/app/leaves/holidays/page.tsx:41,137,164,278,415,449 | monthsOf يغطي كل الشهور الملموسة؛ حذف حقيقي endpoint؛ min=formDate وفحص المدى قبل الحفظ. |
| REQ-20 | OPEN | src/app/requests-console/page.tsx:233 | زر تصدير بلا onClick أو دالة CSV وقت القراءة. |
| EMP-27 | FIXED_CODE | src/app/employees/[id]/settlement/page.tsx:70,124,140,444 | loadErrorMessage يميز403 و5xx؛ notFound للنتيجة الفارغة فقط؛ الخطأ ظاهر منفصلاً. |
| DSH-20 | FIXED_CODE | src/app/notifications/page.tsx:86,171؛ api/src/assets/portal.controller.ts:notifications | category تأتي صريحة من السيرفر؛ الفلاتر من التصنيفات الموجودة فعلاً، لا استنتاج من الرابط. اختبارات recovery لقراءة/حذف/تجدد الإشعار موجودة. |
| EMP-24 | FIXED_CODE | src/app/employees/custody/page.tsx:161,183,249,674 | قائمة التسليم AVAILABLE وغيرمحجوزة، وحقل قيمة عند الإنشاء، وتنبيه/تعيين قيمة قبل الشطب. خطر مرتبط منفصل: سطر272 ما زال يأمر بإضافة خصم يدوي رغم خصم الباك التلقائي. |
| ATT-17 | OPEN | src/app/attendance/weekly-schedule/page.tsx:195,411,616,621,807,962,1310,1602 | جمعة/سبت ثابتة تقفل الخلايا، ساعات×5، استثناءات بلا نطاق موظف/فرع مع بلع الخطأ، Excel بلا handler وalerts باقية. طلب الجذر بعد هذا التدقيق إصلاحه في مهمة لاحقة. |
| SET-16 | FIXED_CODE | src/app/settings/teams/page.tsx:88,195,422,566 | توضيح أولوية المدير المسجل ثم القائد ثم مدير القسم/الفرع، وتحذير الأعضاء الذين لهم مدير أعلى أولوية من القائد. |
| SET-17 | FIXED_CODE | src/app/settings/approvals/page.tsx:956 | شارة التفويض الوهمية أزيلت؛ canDelegate ما زال حقل تاريخي لكن غير موعود به في الواجهة. |
| REQ-22 | PARTIAL_OPEN | src/app/requests-console/page.tsx:61,361,553,585 | RequestPayload يعرض الحقول، لكن if(!type)return null يحذف الطلبات غيرالفعالة من الصفوف وتبقى بالعداد، وخريطة الأدوار المحلية ناقصة أدوار الأقسام/الفروع. |
| NAM-27 | PARTIAL_OPEN | src/lib/api.ts:184,239,669 | ApiLeave.period أضيف؛ ApiRequestType ما زال بلا customFields/visibleTo/requiredAttachments، وApiCustody.status/ApiLeave.status string وisUnpaid/revokedAt ناقصان. |
| NAM-6 | PARTIAL_OPEN | api/src/requests/destinations.service.ts:812؛ api/src/settings/settings.controller.ts:264,279,280 | تسميات leave_calendar_payroll والوجهة القديمة أوضح، لكن مفاتيح leave_calendar/once/custody_assignments باقية بلا أسماء سلوكية جديدة. once وحده لا يفرض oncePerService. |
| NAM-14 | OPEN | api/src/requests/entities/employment.entities.ts:78؛ api/src/requests/destinations.service.ts:539 | oldStatus/newStatus ما زالا يحملان status/salary/title/team/IBAN؛ IBAN كامل محفوظ، لا changeType/oldValue/newValue ولا إخفاء في سجل البنك. |
| NAM-1 | OPEN | api/src/requests/requests.service.ts:970,981؛ approver-resolver.service.ts:21 | resolvedSteps.action=APPROVE/REJECT/RETURN ونوع string؛ سجل الاعتمادات APPROVED/REJECTED/RETURNED_FOR_INFO؛ لم توحد المفردات. |
| NAM-16 | OPEN | api/src/requests/requests.service.ts:executeDestination؛ destinations.service.ts:leaveHandler | نظاما LEAVE وLEAVE_* وفروع startsWith/replace ما زالا مدعومين؛ لا migration موحدة. |
| NAM-21 | PARTIAL_OPEN | api/src/requests/entities/leave.entities.ts:74,81؛ financial.entities.ts:27؛ employment.entities.ts:34؛ letter.entities.ts:24 | period uppercase union صار موحداً؛ status في Leave/Loan/Transfer/Letter ما زال string ولا shared unions بين الباك والواجهة. |
| NAM-22 | PARTIAL_OPEN | api/src/employees/employees.service.ts:357,398؛ offboarding/offboarding.service.ts:513؛ letters/letters.service.ts | suspended أصبح انتقالاً حقيقياً مع تعليق الحساب؛ BLOCKED لا مسار كتابة، DELIVERED لا مسار كتابة رغم بقاء الوصف. تنزيل الخطاب الحقيقي لا يغيره DELIVERED. |
| NAM-26 | OPEN | api/src/requests/requests.controller.ts:149,172,178,269؛ requests/leaves.controller.ts:25؛ assets/assets.controller.ts:275 | بادئات leaves/requests وcustody/requests-custody وmine/my-leaves ما زالت موزعة؛ لا aliases مجمعة جديدة. |
| NAM-28 | PARTIAL_OPEN | api/src/requests/entities/employment.entities.ts:24؛ offboarding.entities.ts:76,122؛ assets/assets.controller.ts:284؛ custody-execution.ts | fromTeam nullable أصلح absence فقط، وأسماءIDs/By غيرموحدة. نقل العهدة يملأ assignedBy=source employee، لكن direct /custody/assign لا يملأه. |
| NAM-29 | OPEN | api/src/requests/entities/leave.entities.ts:28,60,102؛ request.entity.ts:typeCode | leaveType وtypeCode وbalanceSource وbalanceType باقية؛ لا تغيير أسماء أو نوع balance مشترك. |
| NAM-31 | PARTIAL_OPEN وقت القراءة؛ أصلح لاحقاً | api/src/requests/requests.service.ts:395,409؛ attendance.service.ts:1363,2352؛ attendance.controller.ts:118,154 | الإذن id-first مع تثبيتid. وقت القراءة setDayOverride يتجاهل dto.shiftId؛ أصلح لاحقاً مع الاختبار الموضح في الملحق. |
| SET-13 | FIXED_CODE | src/app/settings/branches/page.tsx:186,188,671؛ api/test/integrity.integration.cjs:SET-13/14 | واجهة weekendDays ومركزتكلفة من catalog؛ اختبارات الباك ترفض الرموز/المراجع غيرالصالحة وتثبت الحفظ. |
| SET-14 | FIXED_CODE | api/src/org/org.service.ts؛ api/test/integrity.integration.cjs:SET-13/14 | التحقق يمنع أباً من فرع آخر والدوائر ونقل أب مع إبقاء أولاده؛ clearing parent محفوظ حسب اختبار التكامل المحدد. |
| SET-15 | FIXED_CODE | api/src/settings/settings.controller.ts:upsertConfig؛ api/test/integrity.integration.cjs:SET-15/18/23 | weekend وaccrual allowlists وقيم الأرقام ذات المسافات مرفوضة؛ الاختبار موثق بتقرير الباك. |
| SET-18 | FIXED_CODE | src/app/settings/grades/page.tsx:79,109,342؛ api/test/integrity.integration.cjs:SET-15/18/23 | الواجهة ترسم النطاق النسبي الحقيقي وتمنع min>max؛ الباك يراجع القيم المدمجة عند التعديل وله اختبار. |
| SET-23 | FIXED_CODE | src/lib/api.ts:827؛ api/test/integrity.integration.cjs:SET-15/18/23 | fetchRoles القديم ومسارsettings/roles غيرموجودين؛ fetchRolesFull يستخدم/roles الحقيقي، والقديم404 في اختبار الباك. |

## حدود الاستنتاج

لم أعتبر وجود اسم الإصلاح في FIX_REPORT أو RECOVERY_REPORT دليلاً كافياً. بحثت عن الاستدعاء الفعلي والـhandler وحارس الحالة/البيانات. لم أنسب الإصلاحات السابقة إلى هذه الجولة. تغييرات الأسماء والـaliases والـschema في NAM تحتاج خطة توافق ومهاجرة؛ بقاء الاسم التاريخي ليس وحده دليلاً على عطل تشغيل، لكن يبقى البند التصميمي غير منجز.

## ملحق إصلاح ATT-17 وNAM-31 والتحقق اللاحق

الحالة النهائية للمسارين: **إصلاح كود واختبار تكامل ناجح**. الواجهة راجعتها في الكود ونجح TypeScript؛ الاعتماد البصري يجري لدى الجذر.

- ATT-17: `weekly-schedule/page.tsx` يحسب تقويم كل موظف عبر `fetchWorkingDays({employeeId})`، بالتوازي المحدود بثمانية طلبات، ويظهر خطأ تحميل التقويم دون افتراض عطلة ثابتة. اليوم والساعات والإحصاء وCSV مشتقة من الخلايا السبعة بعد العطل والقواعد وتجاوزات الأيام. fallback الأوقات من جدول الموظف ثم الجدول الافتراضي، والساعات المرنة من requiredHours. إعداد وردية في يوم راحة لا يلغي تصنيفه كراحة؛ تغيير أيام الراحة من الإعدادات.
- `AttendanceService.employeeWorkingDays` يطبق صلاحية `attendance.view_all` ونطاق الفرع لقراءة موظف آخر، ويعيد weekendDays من نفس سياسة المحرك. الفرع لا يغير جدول عطلات موظف له جدول مستقل، والقواعد الخاصة بفرع لا تنتقل لغيره.
- `DELETE /attendance/schedule/:weekStart/:employeeId` يتحقق من الصلاحية والفرع وعدم تعديل النفس؛ يحذف تعيين الأسبوع ويعيد حساب الأيام المتأثرة وجيرانها، مع إظهار أي فشل إعادة حساب. تجاوزات الأيام تبقى، والواجهة تعرض جدول العمل بعد الحذف. الطباعة وCSV ورابط إعدادات جداول العمل متصلة، وأزيلت alert().
- NAM-31: `AttendanceService.scheduleShift` يتحقق من مرجع كتالوج نشط ويأخذ الاسم والأوقات منه. يستخدمه `setDayOverride` و`setDayOverridesBulk` و`upsertSchedule`. يدعم ID فقط، ويتجاهل اللقطة المزورة عندما يوجد ID، ويرفض المرجع المجهول أو المعطل. المرجع المحفوظ يقرأ الاسم والأوقات الجديدة بعد تعديل الكتالوج.

التحقق المنفذ بعد التعديلات: `node --test api/test/request-execution.integration.cjs` **25/25 PASS** في 23.99 ثانية، يتضمن ثلاثة اختبارات جديدة تحمل ATT-17/NAM-31 بأسمائها. تغطي المرجع اليومي والجماعي والأسبوعي وإعادة التسمية، تقويم الموظف مقابل الفرع والعطلة وقاعدة OFF، رفض القراءة والكتابة خارج النطاق وتعديل النفس، وإلغاء تعيين الأسبوع مع بقاء التجاوز وإعادة حساب `AttendanceDay.scheduleSource`. TypeScript للواجهة والباك ناجحان. لم تتغير قاعدة البيانات الأصلية؛ أنشأت المجموعة قاعدة SQL عشوائية وحذفتها وحدها.

## ملحق إغلاق NAM-1 دون تغيير السجل التاريخي

بعد هذه القراءة، أصبح `ResolvedStep.action` من نوع `ApprovalAction` نفسه المستخدم في `RequestApproval`. فعل الواجهة العام يظل APPROVE/REJECT/RETURN، ويُحوّل مرة واحدة إلى APPROVED/REJECTED/RETURNED_FOR_INFO ثم يُكتب في الخطوة وسجل الاعتماد بنفس القيمة. `approval-actions.ts` يطبع صيغ الخطوات القديمة عند القراءة، وتطبقه تفاصيل الطلب وطلباتي والسجل الكامل والصندوق وكذلك تحليل المحرك. توجد حماية من مفتاح غير معروف في خريطة التطبيع.

طلبات GET لا تغير JSON القديم المخزن ولا سجل التدقيق التاريخي. لا حاجة إلى ترحيل أو UPDATE للتاريخ لإغلاق هذا العيب التشغيلي. واجهتا requests/page وrequests-console/page تقبلان الصيغتين في مقارنات التقدم، والإرجاع لا يُلون كاعتماد ناجح لمجرد وجود actedAt.

النتيجة الأخيرة للمجموعة بعد EMP-14 وNAM-1: **30/30 PASS** في 25.88 ثانية. اختبارا NAM-1 يتحققان من تخزين الأفعال الثلاثة بنوع موحد، وتطبيع GET /requests/:id وmine وall وinbox دون كتابة على قاعدة الاختبار، وإعادة تقديم طلب قديم يحمل RETURN ثم اعتماده مع بقاء سجل الإرجاع التاريخي دون تغيير. TypeScript للواجهة والباك ناجحان. الحالة النهائية لـNAM-1: إصلاح كود + اختبار تكامل، وليست NEEDS_MIGRATION.

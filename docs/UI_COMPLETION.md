# استكمال الواجهة — الموجتان 4 و5

التاريخ: 2026-09-11. هذا تقرير وكيل الواجهة ضمن العمل المتوازي، لا يعلن إغلاق 174 بندًا. مرجع المعرّفات: OUR_TECH_DEFECTS.md. التعديلات السابقة بقيت في شجرة العمل؛ الفحوص الآلية على قواعد اختبار منفصلة؛ هذه الدفعة لا تشمل تطبيق migration أو نشر نسخة.

الحالة المجمعة الأحدث لكل معرّفات الموجتين في docs/W45_FINAL_MATRIX.md؛ الجداول أدناه تحفظ أدلة مسار الواجهة.

## دليل التحقق

- فحص TypeScript الكامل نجح بعد آخر دفعة إزالة الأزرار الوهمية وتصدير الحضور والقوالب: node node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false.
- فحص TypeScript الخلفي نجح بعد أعمدة تقرير الحضور: node node_modules/typescript/bin/tsc -p api/tsconfig.json --noEmit --incremental false --pretty false.
- CODE_REVIEW: مسار الكود راجعناه وعدلناه مع نجاح فحص الأنواع؛ لا يساوي اختبار متصفح/HTTP.
- CODE_REVIEW_EXISTING: إصلاح موجود قبل هذه الدفعة شوهد في الكود؛ لم ننسبه لعمل جديد.
- PARTIAL_OPEN وOPEN: باقي مذكور صراحة. CENTRAL_REVIEW: لا حكم من هذا الوكيل، يُدمج مع نتائج الوكلاء الآخرين.
- الصور واختبارات المتصفح والبناء النهائي واختبارات التكامل يجمعها الوكيل الجذر؛ لا أدعي تنفيذها في هذا التقرير.

## إصلاحات جوهرية خارج قائمتي الموجتين

| المعرف | النتيجة | الدليل |
|---|---|---|
| EMP-1 | CODE_REVIEW: شاشة إنهاء الخدمة أصبحت fetchEmployee → معاينة /offboarding/preview من سياسة الخادم والعهد الفعلية → تأكيد POST /offboarding → رابط/انتقال لملف الإخلاء. أزيلت الديمو والمعادلات المحلية والنجاح الوهمي. تمنع المعاينة القديمة/الممنوعة والحفظ المتكرر أثناء الإنشاء. | src/app/employees/[id]/terminate/page.tsx + createOffboardingCase/fetchOffboardingPreview في api.ts |
| EMP-4 | CODE_REVIEW: otherAllowance مستقل، لا يجمع الهاتف وطبيعة العمل في payload. مجموع الأساسي والسكن والنقل والهاتف وطبيعة العمل وأخرى يظهر في الملف الشخصي وملف الموظف. قوالب الخطابات الرسمية ينشئها الخادم. | src/components/EmployeeForm.tsx + employees/[id]/edit/page.tsx |
| EMP-12 | CODE_REVIEW: optional cleared fields تصل null فقط إذا كانت initial محملة بقيمة؛ Clearable payload مع إزالة الصورة/الجدول كذلك. | src/components/EmployeeForm.tsx |
| REQ-16 | CODE_REVIEW: تفاصيل fetchRequest كاملة في درج الصندوق وفي نافذة القرار قبل تمكين الإرسال؛ المرفقات file:N تُفتح بالتوكن مع خطأ. القيم المرجعية أسماء عند توفر الصلاحية، والمصفوفات والكائنات كاملة. | src/components/RequestPayload.tsx + approvals-inbox/page.tsx |
| ATT-19 | CODE_REVIEW: كروت الأذونات من كتالوج permission-types، عرض نوع الإذن بالـid، العامل في الخطوة وحده يرى رابط مراجعة الطلب في الصندوق. | src/app/attendance/permissions/page.tsx |
| EMP-29 | CODE_REVIEW: النقل من فريق null/0 يظهر بدون فريق بدل #null/#0. | src/app/employees/transfers/page.tsx |
| استلام العهدة | CODE_REVIEW: زر رفض الاستلام في عهدتي بسبب 3–100 حرف، POST /requests/custody/:id/reject، حالة REJECTED ضمن الخرائط. Backend/اختبارات النقل لدى وكيل الطلبات. | src/app/my/custody/page.tsx |
| شاشة الدخول | CODE_REVIEW: إزالة Google SSO غير المنفذ ورابط # الوهمي، نص التواصل مع HR لإعادة كلمة المرور، سنة ديناميكية وحقول autocomplete. | src/app/login/page.tsx |

## حدود البيانات

otherAllowance القديم قد يحتوي مجموع الهاتف وطبيعة العمل بسبب السلوك السابق. لا يمكن تحديد الصفوف المطوية يقينًا من القيمة وحدها، لذلك لم ننفذ migration آلية ولم ننقص مبالغ أصلية. يجب مراجعة هذه الصفوف قبل الاعتماد المالي. أسماء الكتالوج الحالية تتقدم على fallback تاريخي للأنواع القياسية؛ النوع المخصص المعطل قد يظهر بكوده مع وصف واضح عند عدم رجوعه من endpoint الأنواع الفعالة.

## مصفوفة كل معرّفات الموجتين (75)

هذه المصفوفة تحفظ كل IDs الموجتين داخل تقرير174؛ البنود الخلفية أو المملوكة للجذر ليست مغلقة افتراضيًا.

| المعرف | الحالة | نتيجة الواجهة/الباقي | الدليل |
|---|---|---|---|
| DSH-1 | CODE_REVIEW_EXISTING | EmployeeHome مربوط بـAPI مسبقًا. لم تختبر كل كروته في هذا الوكيل. | src/components/dashboard/EmployeeHome.tsx |
| DSH-2 | CODE_REVIEW_EXISTING | AttendanceChart يستخدم fetchAttendanceTrend أسبوعي/شهري فعليًا. | src/components/dashboard/AttendanceChart.tsx |
| DSH-3 | CODE_REVIEW_EXISTING | DepartmentStats يستخدم endpoint الأقسام الفعلي بالصلاحيات. | src/components/dashboard/DepartmentStats.tsx |
| DSH-4 | CODE_REVIEW | استبدال آخر النشاطات المخترعة بآخر التنبيهات الفعلية من /notifications؛ الاسم يعكس المصدر. | src/components/dashboard/RecentActivities.tsx |
| DSH-5 | CODE_REVIEW | أحداث الثلاثين يومًا من التقويم والعقود والمستندات حسب الصلاحية؛ أخطاء المصادر مستقلة. أعياد الميلاد لم تضف. | src/components/dashboard/UpcomingEvents.tsx |
| SET-4 | CENTRAL_REVIEW | يلزم دمج حالة هذا البند مع تقرير الوكيل المسؤول أو مراجعة مستقلة؛ لا ادعاء إغلاق هنا. | OUR_TECH_DEFECTS.md |
| EMP-18 | CODE_REVIEW | أزيل مولد المستندات المحلي والنجاح الوهمي وزر PDF. الخطابات الستة المدعومة تفتح /requests?type=LETTER_*&employeeId=id لطلب رسمي يُنشأ ويُحفظ بعد الاعتماد؛ ربط الطلب نيابة عن موظف لدى الجذر. | src/app/employees/[id]/page.tsx |
| DSH-12 | CODE_REVIEW | إزالة الرسائل3؛ عنوان فعلي حسب المسار؛ بحث الموظف بحقل متحكم به؛ رابط إعدادات حسب الصلاحية. | src/components/layout/Header.tsx |
| ATT-23 | CENTRAL_REVIEW | يلزم دمج حالة هذا البند مع تقرير الوكيل المسؤول أو مراجعة مستقلة؛ لا ادعاء إغلاق هنا. | OUR_TECH_DEFECTS.md |
| REQ-19 | CODE_REVIEW | dueAt المفقود = null، بلا مهلة محددة، لا يدخل عدد المتأخرين. | src/app/approvals-inbox/page.tsx |
| REQ-21 | CENTRAL_REVIEW | يلزم دمج حالة هذا البند مع تقرير الوكيل المسؤول أو مراجعة مستقلة؛ لا ادعاء إغلاق هنا. | OUR_TECH_DEFECTS.md |
| SET-20 | TESTED | محرر قوالب عربي فعلي: قائمة ونسخ جديدة، مسودة منفصلة عن النسخة المنشورة، متغيرات مقروءة، معاينة PDF من الخادم، ربط بالقوالب النشطة المنشورة وتعطيل مضبوط. يحتفظ بالتعديلات عند تعارض الإصدار؛ الخطابات السابقة ثابتة. | src/app/settings/document-templates/page.tsx + api/src/letters/letter-templates.service.ts؛ اختبارا قوالب الخطابات والتخصيص ضمن recovery.integration.cjs لدى الجذر؛ docs/TEMPLATES_CALENDAR_EMPLOYEE_DRAFT_COMPLETION.md |
| DSH-11 | CODE_REVIEW | توصيل أزرار Header فعليًا بدوال الحفظ الموجودة؛ حفظ القراءة قبل الانتقال وإظهار الأخطاء. استمرار backend يرجع للتقرير المركزي. | src/components/layout/Header.tsx |
| ATT-11 | CENTRAL_REVIEW | يلزم دمج حالة هذا البند مع تقرير الوكيل المسؤول أو مراجعة مستقلة؛ لا ادعاء إغلاق هنا. | OUR_TECH_DEFECTS.md |
| ATT-12 | CENTRAL_REVIEW | يلزم دمج حالة هذا البند مع تقرير الوكيل المسؤول أو مراجعة مستقلة؛ لا ادعاء إغلاق هنا. | OUR_TECH_DEFECTS.md |
| EMP-16 | CENTRAL_REVIEW | يلزم دمج حالة هذا البند مع تقرير الوكيل المسؤول أو مراجعة مستقلة؛ لا ادعاء إغلاق هنا. | OUR_TECH_DEFECTS.md |
| SET-5 | CENTRAL_REVIEW | يلزم دمج حالة هذا البند مع تقرير الوكيل المسؤول أو مراجعة مستقلة؛ لا ادعاء إغلاق هنا. | OUR_TECH_DEFECTS.md |
| EMP-22 | CODE_REVIEW | حفظ مسودة إضافة فعلي في sessionStorage لكل مستخدم وإصدار schema؛ استرجاع/حذف صريحان، حفظ الحقول والمؤهلات ومراجع الرفع المكتمل دون ملفات خام أو tokens، ومحوها عند الخروج أو الإنشاء. نجاح إنشاء الموظف مع تحذير المؤهلات يغلق نموذج الإنشاء ويوجه لاستكمال الملف دون إنشاء مكرر. | src/components/EmployeeForm.tsx + src/lib/employee-add-draft.ts + src/app/employees/add/page.tsx + src/lib/api.ts:clearSession؛ اختبارا عزل المسودة/الاسترجاع والمحو في ui-session-calendar.test.cjs ناجحان، وفحص الأنواع ناجح؛ تحقق المتصفح لدى الجذر |
| EMP-26 | CODE_REVIEW | تحميل المرفقات المحددة عبر fetchFileObjectUrl بالتوكن؛ الأخطاء/المستند بلا ملف تظهر بأسمائها. إرسال البريد غير المنفذ أزيل. | src/app/employees/documents/page.tsx |
| EMP-28 | CENTRAL_REVIEW | يلزم دمج حالة هذا البند مع تقرير الوكيل المسؤول أو مراجعة مستقلة؛ لا ادعاء إغلاق هنا. | OUR_TECH_DEFECTS.md |
| DSH-18 | TESTED | التقويم يملك عرض أسبوع حقيقي بسبعة تواريخ محلية وجلب شهري الحدود ودمج دون تكرار. الإحصاءات وCSV والقائمة والخلايا تتبع الفلاتر والنطاق ذاته؛ daysInRange من حاسبة الموظف الفعلية بنطاق صلاحيات التقويم. رابط إضافة عطلة حسب الصلاحية؛ تعديل الملف الشخصي ورفع الصورة عبر المسار الفعلي الموجود. | src/app/calendar/page.tsx + src/lib/calendar-range.ts + api/src/assets/portal.controller.ts:calendar؛ 4 اختبارات SQL/HTTP في calendar-range.integration.cjs ناجحة وحدود الشهر/الأسبوع في ui-session-calendar.test.cjs؛ docs/TEMPLATES_CALENDAR_EMPLOYEE_DRAFT_COMPLETION.md |
| ATT-16 | CODE_REVIEW | تسميات وألوان الأوفرتايم موحدة؛ CSV والطباعة موصولان. أضيف leaveDays/holidayDays/partialLeaveDays بـSUM CASE من الحالات الفعلية في API ثم الجدول وCSV. | api/src/reports/reports.controller.ts + src/app/attendance/reports/page.tsx |
| ATT-18 | CODE_REVIEW | تصدير الحضور CSV للفلاتر الحالية وحذف الترقيم الوهمي؛ بلاطات الوردية تربط بالجدول الأسبوعي؛ ظهر خلال24ساعة يُحسب بالتاريخ؛ خطأ إعداد المزامنة ظاهر. أزرار الأجهزة الفعلية الحالية محفوظة. | src/app/attendance/{page,shifts/page,devices/page,permissions/page}.tsx |
| LEV-13 | CENTRAL_REVIEW | يلزم دمج حالة هذا البند مع تقرير الوكيل المسؤول أو مراجعة مستقلة؛ لا ادعاء إغلاق هنا. | OUR_TECH_DEFECTS.md |
| REQ-20 | CENTRAL_REVIEW | يلزم دمج حالة هذا البند مع تقرير الوكيل المسؤول أو مراجعة مستقلة؛ لا ادعاء إغلاق هنا. | OUR_TECH_DEFECTS.md |
| REQ-30 | CODE_REVIEW | أزيل قسم آخر القرارات من state محلي؛ لا يعرض تاريخاً يختفي بعد التحديث. سجل القرارات داخل تفاصيل الطلب من الخادم؛ قائمة قراراتي المستقلة غير منفذة. | src/app/approvals-inbox/page.tsx |
| LEV-16 | TESTED | CSV وتفاصيل السجل وأعمدة الرصيد الفعلية مكتملة. زر تعديل الرصيد بصلاحية leave_balances.manage يختار نوعًا موجودًا للسنة الحالية وفرق أيام موجب/سالب وسببًا؛ يعرض قبل/بعد ويحدث من الخادم. طبقة adjustmentDays مستقلة وسجل تدقيق بمعاملة واحدة؛ UUID يمنع تكرار المحاولة، expectedRemaining يحمي من رصيد تغير، وتُرفض النتيجة السالبة. يلزم ترحيل SQL المرفق قبل تشغيله على قاعدة قائمة. | src/app/leaves/balance/page.tsx + src/lib/api.ts:adjustLeaveBalance + api/src/requests/leave-balances.service.ts؛ خمسة اختبارات LEV-16 ضمن integrity.integration.cjs: 29/29 ناجحًا، ومخطط SQL اختُبر مرتين على قاعدة منفصلة؛ docs/LEV16_MANUAL_BALANCE_ADJUSTMENTS.md |
| LEV-17 | CODE_REVIEW_EXISTING | سحب المعلق وطلب إلغاء المعتمد موجودان؛ تعديلات هذه الجولة خاصة بأسماء الكتالوج. | src/app/my/leaves/page.tsx |
| DSH-21 | CODE_REVIEW | حالات أخطاء وإعادة محاولة للهيدر والسايدبار وأرصدة/طلبات الملف الشخصي وعهد مدير صندوق الاعتماد. | src/app/profile/page.tsx |
| EMP-27 | CENTRAL_REVIEW | يلزم دمج حالة هذا البند مع تقرير الوكيل المسؤول أو مراجعة مستقلة؛ لا ادعاء إغلاق هنا. | OUR_TECH_DEFECTS.md |
| LEV-23 | CODE_REVIEW_EXISTING | fetchBalancesBulk endpoint واحد، وخطأ الصف ظاهر؛ لم نكرر اختبار endpoint. | src/app/leaves/balance/page.tsx |
| EMP-19 | CODE_REVIEW_EXISTING | الدرجات تقرأ كتالوجًا في الفورم؛ تحقق الخادم في نطاق الوكيل الخلفي. | src/components/EmployeeForm.tsx |
| DSH-19 | CODE_REVIEW | الحفاظ على daysInMonth من الخادم بدل جمع أيام الإجازة خارج الشهر. | src/app/calendar/page.tsx |
| DSH-20 | CENTRAL_REVIEW | يلزم دمج حالة هذا البند مع تقرير الوكيل المسؤول أو مراجعة مستقلة؛ لا ادعاء إغلاق هنا. | OUR_TECH_DEFECTS.md |
| LEV-18 | CODE_REVIEW | أنواع وألوان التقويم من الكتالوج، weekendDays من الخادم. النص يوضح الإجازات المعتمدة؛ المعلق يُراجع في الصندوق ولا يعد التقويم بعرضه. تقاطع العطلات الخلفي لدى الجذر. | src/app/leaves/calendar/page.tsx |
| EMP-24 | CODE_REVIEW | نص فقد/تلف العهدة أصبح يذكر خصم التصفية التلقائي وفق الخادم؛ أزيل توجيه تسجيله يدوياً الذي قد يضاعف الخصم. الأصل صفر القيمة يوجّه لمراجعة قيمته. | src/app/employees/custody/page.tsx |
| EMP-20 | CODE_REVIEW | البنوك والجنسيات نص حر مع اقتراحات؛ حقل الشركة الوهمي أزيل. المسميات من كتالوج موجود مسبقًا. | src/components/EmployeeForm.tsx |
| ATT-17 | CENTRAL_REVIEW | يلزم دمج حالة هذا البند مع تقرير الوكيل المسؤول أو مراجعة مستقلة؛ لا ادعاء إغلاق هنا. | OUR_TECH_DEFECTS.md |
| EMP-17 | CODE_REVIEW_EXISTING | قائمة الموظفين فيها current/notice_period/terminated؛ توحيد الشارات هنا، مراجعة الهيكل السابقة مطلوبة مركزيًا. | src/app/employees/page.tsx |
| SET-7 | CODE_REVIEW_EXISTING | autoApprove ومسار تفعيله ونص السلسلة الفارغة موجود سابقًا. | src/app/settings/approvals/page.tsx |
| EMP-21 | CODE_REVIEW | التلميحات مطابقة للواقع؛ التحقق الإلزامي للاسم الأول والكود/البصمة والفرع وتاريخ التعيين في الخطوة والحفظ. بقية النجوم غير المفروضة أزيلت بما فيها المستندات الاختيارية. | src/components/EmployeeForm.tsx |
| SET-16 | CENTRAL_REVIEW | يلزم دمج حالة هذا البند مع تقرير الوكيل المسؤول أو مراجعة مستقلة؛ لا ادعاء إغلاق هنا. | OUR_TECH_DEFECTS.md |
| SET-17 | CENTRAL_REVIEW | يلزم دمج حالة هذا البند مع تقرير الوكيل المسؤول أو مراجعة مستقلة؛ لا ادعاء إغلاق هنا. | OUR_TECH_DEFECTS.md |
| REQ-22 | CENTRAL_REVIEW | يلزم دمج حالة هذا البند مع تقرير الوكيل المسؤول أو مراجعة مستقلة؛ لا ادعاء إغلاق هنا. | OUR_TECH_DEFECTS.md |
| REQ-25 | CODE_REVIEW | مستنداتي تتطلب employeeId للمستخدم وترسله صراحة إلى fetchDocuments؛ عند غياب الربط يظهر خطأ بدلاً من تحميل القائمة العامة. الأنواع عبر docTypeLabel. | src/app/my/documents/page.tsx |
| REQ-28 | CODE_REVIEW | الحالات موحدة وLOST/DAMAGED حمراء؛ Gregorian؛ عملة الموظف والبدلات المستقلة؛ المقام رصيد متراكم+افتتاحي ساري. | src/app/profile/page.tsx |
| EMP-23 | CODE_REVIEW | إجمالي الستة مكونات وعملة الموظف تستخدم في ملفه. عرض الفريق/مركز التكلفة/الجدول/الاستحقاق موجود من الاستكمال السابق. | src/app/employees/[id]/page.tsx |
| DSH-22 | CODE_REVIEW | نافذة مراجعة كل الحمولة ثم تأكيد القرار؛ رفض بسبب إلزامي trim يرسل للخادم. | src/components/dashboard/PendingApprovals.tsx |
| NAM-27 | CENTRAL_REVIEW | يلزم دمج حالة هذا البند مع تقرير الوكيل المسؤول أو مراجعة مستقلة؛ لا ادعاء إغلاق هنا. | OUR_TECH_DEFECTS.md |
| NAM-4 | CODE_REVIEW | EMPLOYEE_STATUS typed ومشترك في القائمة والملف والفورم والملف الشخصي والتقارير؛ لا resigned وهمية. | src/lib/status-labels.ts |
| NAM-5 | CODE_REVIEW | useLeaveCatalog/leaveTypeLabel يستخدم أسماء الكتالوج الفعّال وألوان احتياطية فقط؛ سجل/تقويم/ملف/إجازاتي/تقارير. شاشتا الطلبات ربطهما الجذر بالمكون. | src/lib/leave-catalog.ts |
| NAM-11 | CODE_REVIEW | خرائط الطلبات من المرجع المشترك؛ العهدة من union حقيقي مع REJECTED الجديد؛ أسماء أنواع الطلبات من API. | src/app/profile/page.tsx |
| NAM-12 | CODE_REVIEW | خرائط العهد موحدة في عهدتي/سجل العهد/ملف الموظف/الملف الشخصي وتغطي TRANSFERRED/REJECTED. | src/lib/status-labels.ts |
| NAM-19 | CODE_REVIEW | OVERTIME_STATUS: DETECTED/SUBMITTED/APPROVED/REJECTED/PAID؛ الأخضر للمعتمد والمدفوع؛ payMethod يدعم visa. | src/lib/status-labels.ts |
| NAM-20 | CODE_REVIEW | الأذونات تستخدم حالات الطلب الفعلية وتجمع الحالات المعلقة/الموافقة في الفلاتر. | src/app/attendance/permissions/page.tsx |
| NAM-18 | CODE_REVIEW | سجل الإجازات المعتمدة/العطلات الرسمية/المؤرشفون ومنتهو الخدمة في السايدبار والعناوين. | src/components/layout/Sidebar.tsx |
| NAM-25 | CODE_REVIEW_EXISTING | شاشة كتالوج doc-types موجودة من الاستكمال السابق. | src/app/settings/documents/page.tsx |
| NAM-34 | CODE_REVIEW | المسميات من الكتالوج والبنوك/الجنسيات نص حر مع اقتراحات. البلد الافتراضي في إضافة عطلة يُقرأ من system.country مع خطأ تحميل واضح؛ لا EG ثابت في الواجهة. مراجعة default الكيان لدى وكيل الخلفية. | src/components/EmployeeForm.tsx + src/app/leaves/holidays/page.tsx |
| NAM-30 | PARTIAL_OPEN | الفورم يكتب full_time/part_time ويقرأ الصيغ التاريخية aliases؛ لم تنفذ migration للداتا الأصلية. | src/components/EmployeeForm.tsx |
| SET-24 | CODE_REVIEW_EXISTING | فورم أيام العمل يستخدم ح للأحد؛ تعديل سابق راجعناه. | src/components/EmployeeForm.tsx |
| NAM-6 | CENTRAL_REVIEW | يلزم دمج حالة هذا البند مع تقرير الوكيل المسؤول أو مراجعة مستقلة؛ لا ادعاء إغلاق هنا. | OUR_TECH_DEFECTS.md |
| NAM-14 | CENTRAL_REVIEW | يلزم دمج حالة هذا البند مع تقرير الوكيل المسؤول أو مراجعة مستقلة؛ لا ادعاء إغلاق هنا. | OUR_TECH_DEFECTS.md |
| NAM-1 | CENTRAL_REVIEW | يلزم دمج حالة هذا البند مع تقرير الوكيل المسؤول أو مراجعة مستقلة؛ لا ادعاء إغلاق هنا. | OUR_TECH_DEFECTS.md |
| NAM-16 | CENTRAL_REVIEW | يلزم دمج حالة هذا البند مع تقرير الوكيل المسؤول أو مراجعة مستقلة؛ لا ادعاء إغلاق هنا. | OUR_TECH_DEFECTS.md |
| NAM-21 | CENTRAL_REVIEW | يلزم دمج حالة هذا البند مع تقرير الوكيل المسؤول أو مراجعة مستقلة؛ لا ادعاء إغلاق هنا. | OUR_TECH_DEFECTS.md |
| NAM-22 | CENTRAL_REVIEW | يلزم دمج حالة هذا البند مع تقرير الوكيل المسؤول أو مراجعة مستقلة؛ لا ادعاء إغلاق هنا. | OUR_TECH_DEFECTS.md |
| NAM-26 | CENTRAL_REVIEW | يلزم دمج حالة هذا البند مع تقرير الوكيل المسؤول أو مراجعة مستقلة؛ لا ادعاء إغلاق هنا. | OUR_TECH_DEFECTS.md |
| NAM-28 | CENTRAL_REVIEW | يلزم دمج حالة هذا البند مع تقرير الوكيل المسؤول أو مراجعة مستقلة؛ لا ادعاء إغلاق هنا. | OUR_TECH_DEFECTS.md |
| NAM-29 | CENTRAL_REVIEW | يلزم دمج حالة هذا البند مع تقرير الوكيل المسؤول أو مراجعة مستقلة؛ لا ادعاء إغلاق هنا. | OUR_TECH_DEFECTS.md |
| NAM-31 | CENTRAL_REVIEW | يلزم دمج حالة هذا البند مع تقرير الوكيل المسؤول أو مراجعة مستقلة؛ لا ادعاء إغلاق هنا. | OUR_TECH_DEFECTS.md |
| SET-13 | CENTRAL_REVIEW | يلزم دمج حالة هذا البند مع تقرير الوكيل المسؤول أو مراجعة مستقلة؛ لا ادعاء إغلاق هنا. | OUR_TECH_DEFECTS.md |
| SET-14 | CENTRAL_REVIEW | يلزم دمج حالة هذا البند مع تقرير الوكيل المسؤول أو مراجعة مستقلة؛ لا ادعاء إغلاق هنا. | OUR_TECH_DEFECTS.md |
| SET-15 | CENTRAL_REVIEW | يلزم دمج حالة هذا البند مع تقرير الوكيل المسؤول أو مراجعة مستقلة؛ لا ادعاء إغلاق هنا. | OUR_TECH_DEFECTS.md |
| SET-18 | CENTRAL_REVIEW | يلزم دمج حالة هذا البند مع تقرير الوكيل المسؤول أو مراجعة مستقلة؛ لا ادعاء إغلاق هنا. | OUR_TECH_DEFECTS.md |
| SET-23 | CENTRAL_REVIEW | يلزم دمج حالة هذا البند مع تقرير الوكيل المسؤول أو مراجعة مستقلة؛ لا ادعاء إغلاق هنا. | OUR_TECH_DEFECTS.md |




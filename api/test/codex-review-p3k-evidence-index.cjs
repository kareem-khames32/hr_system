module.exports = {
  "target": "452454f532b46be55e244ea5e6a87827eda05d56",
  "base": "1338808",
  "report": "D:/projects/hr_system/CODEX_REVIEW_REPORT_P3K.md",
  "counts": {
    "phase3AndMigrations": 65,
    "regression": 118,
    "selectedUnits": 114,
    "independentExperiments": 9
  },
  "results": [
    {
      "file": "codex-review-p3k-results-baseline.cjs",
      "area": "phase3_and_migrations",
      "passed": 65,
      "failed": 0,
      "tests": [
        {
          "file": "onboarding-templates.integration.cjs",
          "name": "OT-01: من غير قالب بنطاق السلوك القايم بالحرف؛ والمدخلات الغلط 400، ومن غير الصلاحية 403، وقالب مش موجود 404"
        },
        {
          "file": "onboarding-templates.integration.cjs",
          "name": "OT-02: القالب بيبدأ بنسخة من العام وبنوده مستقلة؛ الموظف بياخد أدق قالب مفعّل بيطابق ملفه؛ والمعطّل والفاضي = اللي بعده ثم العام"
        },
        {
          "file": "onboarding-templates.integration.cjs",
          "name": "OT-03: حساب الفرع بيشوف ويدير قوالب فرعه بس؛ وقالب لكل الفروع أو لفرع برّه نطاقه وبنوده غير موجود له"
        },
        {
          "file": "preboarding.integration.cjs",
          "name": "PB-01: with the feature closed (the default) an account whose employee has not started yet gets an ordinary session"
        },
        {
          "file": "preboarding.integration.cjs",
          "name": "PB-02: with the feature open the session carries the start date and no permissions, and opens the pre-boarding screens only — whatever the role"
        },
        {
          "file": "preboarding.integration.cjs",
          "name": "PB-03: the mark follows its date — inert from the start day without a new login; the actual start date wins; a later login after the date moved or the feature closed is ordinary"
        },
        {
          "file": "probation.integration.cjs",
          "name": "PR-01: the list follows the reader — HR by branch scope, the direct manager his own reports, nearest end first, with the default duration for a file without an end date"
        },
        {
          "file": "probation.integration.cjs",
          "name": "PR-02: confirm, extend and terminate are recorded in the employee change log, by the direct manager or HR of the employee's branch only, and a row that changed after the judgment is refused"
        },
        {
          "file": "probation.integration.cjs",
          "name": "PR-03: the daily job opens one decision task per end date on the direct manager (or HR), and the recorded decision closes it"
        },
        {
          "file": "recruitment-jobs.integration.cjs",
          "name": "RJ-01: طلب «احتياج توظيف» — حقوله من الخادم، وفحوص التقديم، والقسم المتثبّت، والاعتماد بيعمل وظيفة مسودة بمرجعها"
        },
        {
          "file": "recruitment-jobs.integration.cjs",
          "name": "RJ-02: شاشة الوظائف — بصلاحية إدارة التوظيف وبنطاق فروع الحساب؛ الإنشاء والتعديل بالخانات؛ والوحدة مابتتغيّرش؛ واسم القسم بفرعه الحالي"
        },
        {
          "file": "recruitment-jobs.integration.cjs",
          "name": "RJ-03: الحالة — النشر محتاج وصف ومكان نشر، منشورة ↔ موقوفة، والقفل نهائي، وكل تغيير في سجل التدقيق، والموديول المقفول بيقفل المسارات"
        },
        {
          "file": "candidate-applications.integration.cjs",
          "name": "CA-01: مرشح على وظيفة — المسمى والفرع منها، والنطاق، والحالة، وفحص التكرار، والإضافة من غير وظيفة زي ما هي"
        },
        {
          "file": "candidate-applications.integration.cjs",
          "name": "CA-02: وظائف داخلية — المنشور داخليًا في فرع الموظف الحالي بس، والتقديم مرة واحدة من بيانات الملف، والحكم بالفرع الحالي"
        },
        {
          "file": "candidate-applications.integration.cjs",
          "name": "CA-03: الموديول المقفول بيقفل المسارات، ومن غير دخول 401"
        },
        {
          "file": "candidate-applications.integration.cjs",
          "name": "CA-04: صفحة الوظائف العامة — الميزة المقفولة 404، والمفتوحة بتعرض المنشور «خارجي» بس ومن غير راتب ولا قسم"
        },
        {
          "file": "candidate-applications.integration.cjs",
          "name": "CA-05: التقديم من اللينك — القيم والموافقة والسيرة الذاتية، والمكرر بنفس الرد من غير صف، وغير المنشور خارجيًا غير موجود، والحد 429"
        },
        {
          "file": "candidate-applications.integration.cjs",
          "name": "CA-06: السيرة الذاتية بتتقري بحكم المرشح — مسؤول توظيف فرعه بس"
        },
        {
          "file": "candidate-applications.integration.cjs",
          "name": "CA-07: نقل المراحل — كل نقل سطر في السجل، والجماعي كلهم أو ولا واحد، والسجل بنطاق المرشح واسم اللي نقل بنطاق القارئ"
        },
        {
          "file": "candidate-applications.integration.cjs",
          "name": "CA-08: تحديد مقابلة — القيم، ونطاق المرشح والمحاورين، والبطاقات الفاضية، والدعوة بالبريد"
        },
        {
          "file": "candidate-applications.integration.cjs",
          "name": "CA-09: بطاقات التقييم — المحاور بيسلّم مرة واحدة ومابيشوفش بطاقات غيره قبل ما يسلّم، وبيقرا سيرة المرشح وهو محاور بس"
        },
        {
          "file": "candidate-applications.integration.cjs",
          "name": "CA-10: قفل المقابلة وإلغاؤها وملف الدعوة — من «محددة» بس، والملغاة بتختفي من «مقابلاتي» وبطاقتها مابتتسلّمش"
        },
        {
          "file": "candidate-applications.integration.cjs",
          "name": "CA-11: عرض العمل — القيم والنطاق، وعرض مفتوح واحد، وتحذير النطاق، والاعتماد بصلاحيته ولغير اللي عمله، والإرسال بلينك برمز"
        },
        {
          "file": "candidate-applications.integration.cjs",
          "name": "CA-12: رد المرشح — من اللينك مرة واحدة وبدليله، أو مسجّل من مسؤول التوظيف؛ والمسحوب والمنتهي والميزة المقفولة = اللينك مابيشتغلش"
        },
        {
          "file": "candidate-applications.integration.cjs",
          "name": "CA-13: التعيين من العرض — العرض المقبول مع المرشح في القايمة، والوظيفة بتتقفل لما عدد المُعيَّنين يكمل"
        },
        {
          "file": "candidate-applications.integration.cjs",
          "name": "CA-14: أرقام التوظيف — بنطاق فروع الحساب ومتطابقة مع الصفوف"
        },
        {
          "file": "performance-goals.integration.cjs",
          "name": "PG-01: الموديول مقفول افتراضيًا؛ وبعد الفتح الموظف يقترح، ومديره المباشر يعتمد أو يرفض بسبب، واللي مالوش دور = غير موجود"
        },
        {
          "file": "performance-goals.integration.cjs",
          "name": "PG-02: التقدّم والتعديل بسبب والقفل والمهمة الدليل — وكل حركة سطر في السجل"
        },
        {
          "file": "performance-goals.integration.cjs",
          "name": "PG-03: الموارد البشرية بالصلاحية وبنطاق الفروع — أهداف الأقسام والشركة، و«كل الأهداف» بالفرع الحالي، والقراءة لأصحاب القسم والشركة"
        },
        {
          "file": "performance-reviews.integration.cjs",
          "name": "RV-01: النماذج والدورات — القيم، ونطاق الفروع، والإطلاق بتكليف لكل موظف شغال بمديره ونسخة نموذج متجمّدة"
        },
        {
          "file": "performance-reviews.integration.cjs",
          "name": "RV-02: التقييم الذاتي وتقييم المدير — مرة واحدة، على النموذج المتجمّد وأهداف الفترة، والدرجة بالأوزان، والأدلة بتتجمّد مع الرد"
        },
        {
          "file": "performance-reviews.integration.cjs",
          "name": "RV-03: إدارة الأداء — تكليفات الدورة بدرجاتها بنطاق الفروع، وقفل الدورة بيوقّف التسليم، والموديول المقفول بيقفل المسارات"
        },
        {
          "file": "performance-reviews.integration.cjs",
          "name": "RV-04: الاعتماد والإعلان والإقرار — المدير سلّم ← معتمد ← معلن ← الموظف أقرّ، وتقييم المدير بيظهر للموظف بعد الإعلان بس"
        },
        {
          "file": "performance-reviews.integration.cjs",
          "name": "RV-05: المعايرة والاعتراض — تعديل بسبب قبل الاعتماد بيتسجّل (قبل/بعد/مين)، وتوزيع التقديرات لكل مدير، والاعتراض طلب مربوط بتقييم معلن في مهلته ومرة واحدة، والمعايرة بعد اعتراض اتقبل"
        },
        {
          "file": "performance-rewards.integration.cjs",
          "name": "RW-01: الاقتراح — بقاعدة تقدير ← قيمة، بنطاق الفروع وبصلاحيتين، للي له مدير مباشر وتقدير بقيمة، ومرة واحدة، ومن غير أي أثر مالي"
        },
        {
          "file": "performance-rewards.integration.cjs",
          "name": "RW-02: التقديم — المدير الموجّه له بس، بطلب مكافأة باسمه في سلسلتها ومرة واحدة، ورفض المكافآت بيرجّع الاقتراح، ولا قيد قبل آخر اعتماد، وصرف النظر"
        },
        {
          "file": "training.integration.cjs",
          "name": "TR-01: الموديول مقفول افتراضيًا؛ الكتالوج بقيمه وتعديله بالخانات؛ والجلسات بقيمها ونطاق الفروع"
        },
        {
          "file": "training.integration.cjs",
          "name": "TR-02: التسجيل تحت قفل الجلسة بنطاق الفروع والسعة، والحضور والإكمال، والشهادة مستند موظف بانتهائه، والمقفول مابيتغيّرش"
        },
        {
          "file": "training.integration.cjs",
          "name": "TR-03: الموظف — «دوراتي» بشهادته، وتقييم التدريب مرة واحدة بعد الحضور، ومش لتسجيل غيره"
        },
        {
          "file": "training.integration.cjs",
          "name": "TR-04: «طلب تدريب» — الجلسة من المتاح لفرع مقدّم الطلب، ورقمها بيثبّته الخادم، والاعتماد النهائي بيسجّله تحت قفل الجلسة والسعة، والجلسة اللي راحت بتوقّف الاعتماد"
        },
        {
          "file": "training.integration.cjs",
          "name": "TR-05: ميزانية الأقسام وتقرير التكلفة مقابلها بنطاق الفروع، والتدريب الإلزامي لمسمى أو قسم والناقص منه (لإدارة التدريب، وللمدير عن فريقه)"
        },
        {
          "file": "helpdesk.integration.cjs",
          "name": "HD-01: الاستفسار على محرك الطلبات — اعتماد فوري ومهمة على دوره بمهلة، وحالة الخدمة من المهمة، ورد في التعليقات، وإقفال، وتقييم مرة واحدة من صاحبه"
        },
        {
          "file": "helpdesk.integration.cjs",
          "name": "HD-02: التقرير بالصلاحية وبنطاق الفروع — العدد والمفتوح ومتوسطات الرد والحل والمتجاوز للمهلتين والرضا؛ والموديول المقفول"
        },
        {
          "file": "helpdesk.integration.cjs",
          "name": "HD-03: قاعدة المعرفة — الإدارة بالصلاحية وبنطاق الفروع، والموظف بيشوف المنشور اللي في جمهوره بس (بحث بكلمة أو بنوع استفسار)، ولينك لسياسة من غير تكرار"
        },
        {
          "file": "cases.integration.cjs",
          "name": "CS-01: السرية وتعارض المصالح — فتح قضية بالصلاحية، والملف للمطّلعين عليه بس، والمشكو في حقه أو مديره مايتضافوش"
        },
        {
          "file": "cases.integration.cjs",
          "name": "CS-02: الدورة — محقق، إخطار ودفاع، قرار بشرطه، إقفال؛ والطرف شايف اللي له بس؛ والاعتراض في المهلة ومرة واحدة"
        },
        {
          "file": "cases.integration.cjs",
          "name": "CS-03: من الطلب — «شكوى» بوجهة «فتح ملف قضية»: الاعتماد النهائي بيفتح ملف واحد، مقدّم الطلب شاكي والمعتمد أول مطّلع"
        },
        {
          "file": "cases.integration.cjs",
          "name": "CS-04: مرفق الدليل — رفعه للمطّلعين على قضية بس، وبيتربط بحدثه تحت قفل القضية مرة واحدة، وتحميله بحكم القضية نفسها (حتى لرافعه)"
        },
        {
          "file": "penalties.integration.cjs",
          "name": "PN-01: اللائحة — مخالفة بدرجات تكرارها ونوع خصمها، بالصلاحية، والتعديل بالخانات"
        },
        {
          "file": "penalties.integration.cjs",
          "name": "PN-02: التوقيع — التكرار في المدة ومطابق للمعاينة، وخصم الأيام خصم مصنّف في سلسلته مربوط بالقضية، ورفض الخصومات مابيسيبش جزاء، والملغى مابيتحسبش"
        },
        {
          "file": "surveys.integration.cjs",
          "name": "SV-01: الإدارة — القيم وجمهور حساب الفروع، والمسودة بتتعدّل والمفتوح لأ، والفتح بيعمل دعوة لكل موظف حالي في الجمهور بمجموعته"
        },
        {
          "file": "surveys.integration.cjs",
          "name": "SV-02: السرية الحقيقية — الرد المجهول من غير موظف ولا ساعة ولا رابط بالدعوة ولا سطر تدقيق، ومرة واحدة، والنتايج بالحد الأدنى ومن غير طرح"
        },
        {
          "file": "surveys.integration.cjs",
          "name": "SV-03: الاستبيان بالاسم بيسجّل الموظف؛ والمقفول واللي فات آخر يومه مابيتردّش عليهم؛ والموديول المقفول"
        },
        {
          "file": "dependents.integration.cjs",
          "name": "DP-01: الموارد البشرية — القيم والنطاق بفرع الموظف الحالي، ورقم الهوية المكرر، ومستند الهوية بانتهائه، والتعديل بالمبعوت بس، والحذف بسبب، وسجل التغييرات"
        },
        {
          "file": "dependents.integration.cjs",
          "name": "DP-02: طلب «تحديث المعالين» — الحقول من الخادم، والاعتماد بيضيف المعال بمستند هويته، والتعديل والحذف لمعال صاحب الطلب بس، والمحذوف بعد التقديم بيوقّف الاعتماد"
        },
        {
          "file": "dependents.integration.cjs",
          "name": "DP-03: ضغطتين مع بعض بنفس رقم الهوية — واحدة بتعدّي والتانية 409، وصف واحد ومستند واحد"
        },
        {
          "file": "phase3-migrations.integration.cjs",
          "name": "P3M-1: كل ملف LF من غير BOM ومن غير عبارة ممنوعة، وبكودين THROW بتوعه، والأكواد فريدة بين كل الملفات"
        },
        {
          "file": "phase3-migrations.integration.cjs",
          "name": "P3M-2: على قاعدة synchronize كل ملف بيعدّي من غير تغيير — شكل الكيان = شكل الترحيل"
        },
        {
          "file": "phase3-migrations.integration.cjs",
          "name": "P3M-3: من غير الجدول الملف بيعمله بنفس الشكل، وتشغيله تاني آمن، وجدول بشكل تاني بيوقّف الترحيل قبل أي تغيير"
        },
        {
          "file": "onboarding-templates-migration.integration.cjs",
          "name": "OTM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر"
        },
        {
          "file": "onboarding-templates-migration.integration.cjs",
          "name": "OTM-2: من غير الجدول والعمود التهيئة زي الأول؛ وجدول أو عمود بشكل تاني بيوقّف الترحيل؛ والمُرحّل بيعمل نفس الشكل والفرق صفر"
        },
        {
          "file": "onboarding-templates-migration.integration.cjs",
          "name": "OTM-3: آمن للتكرار"
        },
        {
          "file": "recruitment-jobs-migration.integration.cjs",
          "name": "RJM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر"
        },
        {
          "file": "recruitment-jobs-migration.integration.cjs",
          "name": "RJM-2: من غير الجدول الوظائف بتقول إن الترحيل ناقص والمرشحين زي الأول؛ وجدول بشكل تاني بيوقّف الترحيل؛ والمُرحّل بيعمل نفس الشكل والفرق صفر"
        },
        {
          "file": "recruitment-jobs-migration.integration.cjs",
          "name": "RJM-3: آمن للتكرار"
        }
      ],
      "note": null
    },
    {
      "file": "codex-review-p3k-results-unit-files.cjs",
      "area": "selected_units",
      "passed": 114,
      "failed": 0,
      "tests": [
        {
          "file": "announcements.test.cjs",
          "name": "AU-01: title, body, dates, the audience text and its branch scope, and when an announcement is live"
        },
        {
          "file": "announcements.test.cjs",
          "name": "AU-02: the module, its permission, guarded routes, writes under the row lock, and the «new announcement» event judged at dispatch, at send and in the list"
        },
        {
          "file": "announcements.test.cjs",
          "name": "AU-03: the announcements screen — the board for everyone, management for the permission holder, the sidebar item and the page title"
        },
        {
          "file": "announcements.test.cjs",
          "name": "AU-04: the attachment is bound once under the row lock and read by the announcement's rule; occasions give the next day without the birth year"
        },
        {
          "file": "branch-separation.test.cjs",
          "name": "candidates: a branch user lists only his branch (and unassigned), creates into his branch, and cannot edit another branch"
        },
        {
          "file": "branch-separation.test.cjs",
          "name": "financial exemptions run screen: a run with no member in the user branch is out of scope (snapshot or legacy branch)"
        },
        {
          "file": "branch-separation.test.cjs",
          "name": "financial exemptions service wires the run scope gate into runView and candidates, and filters recalc ids by branch"
        },
        {
          "file": "branch-separation.test.cjs",
          "name": "leave balance rollover: a branch-scoped call touches only that branch employees; null keeps the company-wide job"
        },
        {
          "file": "branch-separation.test.cjs",
          "name": "leave balance rollover: a multi-branch scope touches exactly those branches"
        },
        {
          "file": "branch-separation.test.cjs",
          "name": "payroll draft calculate / recalculate check the run branch scope before revealing its status"
        },
        {
          "file": "candidate-applications.test.cjs",
          "name": "CU-01: phone, e-mail and id normalisation, and the typed id and source"
        },
        {
          "file": "candidate-applications.test.cjs",
          "name": "CU-02: adding and applying run under the job row lock with the judgment after it, and the routes are guarded"
        },
        {
          "file": "candidate-applications.test.cjs",
          "name": "CU-03: public applications — applicant values and consent, the attempt limiter, a closed feature without a session guard on purpose"
        },
        {
          "file": "candidate-applications.test.cjs",
          "name": "CU-04: stage moves — values, rows locked in id order, the stage column only, and the standing edit goes through the same place"
        },
        {
          "file": "candidate-applications.test.cjs",
          "name": "CU-05: interviews — values, the invite file, the judgment order in scheduling and submitting, and the routes"
        },
        {
          "file": "candidate-applications.test.cjs",
          "name": "CU-06: offers — values, the token hash, who may do what, transitions under the offer row lock, and the public answer link"
        },
        {
          "file": "candidate-applications.test.cjs",
          "name": "CU-07: hiring from an offer — the job closes under its row lock when its openings are filled, after the hire is recorded"
        },
        {
          "file": "candidate-applications.test.cjs",
          "name": "CU-08: recruitment numbers — day differences and averages, behind the recruitment permission and the branch scope"
        },
        {
          "file": "candidate-hire-required.test.cjs",
          "name": "POST /candidates/:id/hire بيتحقق من نفس الحقول الإجبارية بتاعة إضافة الموظف"
        },
        {
          "file": "candidate-hire-required.test.cjs",
          "name": "الخدمة نفسها بتفرض الحقول الإجبارية وشكلها على أي مسار إنشاء، قبل أي قراءة أو كتابة"
        },
        {
          "file": "candidate-hire-required.test.cjs",
          "name": "التعيين بيبعت بيانات النموذج كاملة للخدمة بنطاق فرع المستخدم، وبيقفل المرشح؛ والفرع التاني ممنوع"
        },
        {
          "file": "candidate-hire-required.test.cjs",
          "name": "شاشة التعيين: نموذج الإضافة متعبّي من المرشح (الاسم غير العربي في خانات الإنجليزي)، وشاشتا التوظيف بتفتحه"
        },
        {
          "file": "cases.test.cjs",
          "name": "CU-11: case values, the objection window from its setting, and the conflict of interest"
        },
        {
          "file": "cases.test.cjs",
          "name": "CU-12: a new closed module with its permission and request destination, access by case membership under the row lock, the conflict judged inside the transaction, the decision conditions, the objection, and the routes"
        },
        {
          "file": "cases.test.cjs",
          "name": "CU-13: case attachments by membership (upload, one-time conditional attach under the case lock, download by the case rule) and the real screens"
        },
        {
          "file": "cases.test.cjs",
          "name": "CU-14: the penalties catalog steps, the step for a repetition, the counting window, and applying under the employee row lock with the deduction created through the typed-deductions service outside the transaction"
        },
        {
          "file": "dependents.test.cjs",
          "name": "DU-01: values for adding and for editing, the removal reason, and the request form fields"
        },
        {
          "file": "dependents.test.cjs",
          "name": "DU-02: a new closed module in the basic preset with its request handler, writes under the employee row lock then the dependent row, the request destination wiring, the seed untouched, and the card"
        },
        {
          "file": "helpdesk.test.cjs",
          "name": "HU-01: rating and comment, the first-response limit from its setting, the report range and the average"
        },
        {
          "file": "helpdesk.test.cjs",
          "name": "HU-02: a new closed module owning the inquiry types, the category and the seed, the rating under the request row lock, the scoped report, and the routes"
        },
        {
          "file": "helpdesk.test.cjs",
          "name": "HU-03: knowledge base — article values, search matching, the reader limited to published articles in the viewer audience, and management within the branch scope under the row lock"
        },
        {
          "file": "modules-registry.test.cjs",
          "name": "MR-01: السجل سليم — تبعيات مسجّلة ومن غير دايرة، والأساسي مايعتمدش على اختياري"
        },
        {
          "file": "modules-registry.test.cjs",
          "name": "MR-02: الحالة — الصف الغايب افتراضي السجل، والأساسي مايتقفلش، والقفل بينزل على المعتمدين"
        },
        {
          "file": "modules-registry.test.cjs",
          "name": "MR-03: صاحب مسار الواجهة — أطول نمط بيكسب، والنجمة أضعف من الثابت، والشاشات الوهمية ورا ميزتها"
        },
        {
          "file": "modules-registry.test.cjs",
          "name": "MR-04: أنواع الطلبات — بالكود الأول ثم بمعالج التنفيذ، وغير كده محرك الطلبات"
        },
        {
          "file": "modules-registry.test.cjs",
          "name": "MR-05: المهام المجدولة والصلاحيات — كل اسم لموديول واحد"
        },
        {
          "file": "modules-registry.test.cjs",
          "name": "MR-06: الباقات — كل باقة بتشمل اللي قبلها والأساسي دايمًا"
        },
        {
          "file": "modules-registry.test.cjs",
          "name": "MR-07: التبعيات عند القفل والفتح — الناقص والمعتمد"
        },
        {
          "file": "modules-registry.test.cjs",
          "name": "MR-08: كل صلاحية في سجل الصلاحيات لها موديول، وكل صلاحية في سجل الموديولات معروفة"
        },
        {
          "file": "modules-registry.test.cjs",
          "name": "MR-10: صلاحيات تابعة لموديول اختياري ومسار أساسي بيطلبها بتفضل ظاهرة في شاشة الأدوار"
        },
        {
          "file": "modules-registry.test.cjs",
          "name": "MR-09: أنواع الطلبات المزروعة — كل نوع في موديوله، وكل معالج تنفيذ حقيقي متسجّل لموديول"
        },
        {
          "file": "modules-ui.test.cjs",
          "name": "MU-01: كل شاشة لها صاحب (موديول أو ميزة شاشات العرض)، وكل مسار في السجل له صفحة"
        },
        {
          "file": "modules-ui.test.cjs",
          "name": "MU-02: القايمة الجانبية من السجل — الوهمي ورا ميزته، وبنود الموديول المقفول مختفية"
        },
        {
          "file": "modules-ui.test.cjs",
          "name": "MU-03: modules.ts — قراءة واحدة للجلسة بكاش مربوط بيها، وفشل الخادم افتراضي السجل، والمسح بيقرا من جديد"
        },
        {
          "file": "modules-ui.test.cjs",
          "name": "MU-04: حارس المسارات — «الصفحة دي مش متاحة» قبل فحص الصلاحية، والإطار مابيتعرضش قبل ما الحالة تتقري"
        },
        {
          "file": "modules-ui.test.cjs",
          "name": "MU-05: <ModuleGate> — الجزء بيختفي لو الموديول أو الميزة مقفولين"
        },
        {
          "file": "modules-ui.test.cjs",
          "name": "MU-06: شاشة «الإعدادات ← الموديولات» — في القايمة بصلاحيتها، وبتأكد القفل بأثره، وبتعرض فرق الباقة"
        },
        {
          "file": "modules-ui.test.cjs",
          "name": "MU-07: الحالة بتتجدد من غير دخول جديد — القديم بيتعرض والجديد في الخلفية، ومسار «مش موجود» بيجدّد"
        },
        {
          "file": "modules-ui.test.cjs",
          "name": "MU-08: شاشات الأساس مع موديول مقفول — اللينك مابيتعرضش، والجزء مابيتطلبش ولا بيوقّع الشاشة"
        },
        {
          "file": "onboarding-templates.test.cjs",
          "name": "OU-01: a template matches when every written scope field equals the employee file; most specific first, then the oldest"
        },
        {
          "file": "onboarding-templates.test.cjs",
          "name": "OU-02: the link column stays outside entity reads and writes, the copy falls back to the general template, and management is scoped"
        },
        {
          "file": "onboarding-templates.test.cjs",
          "name": "OU-03: the template window offers the scoped templates only after the migration, with the same item table"
        },
        {
          "file": "performance-goals.test.cjs",
          "name": "PU-01: title, kind, weight, values, period, reason and the employee stamp"
        },
        {
          "file": "performance-goals.test.cjs",
          "name": "PU-02: a new closed module with its permission, the judgment before the transaction and the locks inside it, and the routes"
        },
        {
          "file": "performance-reviews.test.cjs",
          "name": "RU-01: sections with weights, items and server keys; cycle kind, dates and audience"
        },
        {
          "file": "performance-reviews.test.cjs",
          "name": "RU-02: answers against the frozen template and the period goals, and the weighted score"
        },
        {
          "file": "performance-reviews.test.cjs",
          "name": "RU-03: launching and submitting under the row lock with the judgment after it, no other service inside the transaction, and the routes"
        },
        {
          "file": "performance-reviews.test.cjs",
          "name": "RU-04: calibration bands, guide distribution and cleaners; the adjustment judged again under the locks in the objection order; the objection staged by the request under the assignment lock"
        },
        {
          "file": "performance-reviews.test.cjs",
          "name": "RU-05: reward suggestions — the rule values, no bonus written by the suggestion, the manager submits through the bonuses service outside any transaction after claiming the row, and the improvement plan kind"
        },
        {
          "file": "policies-ui.test.cjs",
          "name": "PU-01: القواعد الصافية — النسخة السارية والجاية، وأساس الإقرار، وموعد القفل، وحالة الموظف"
        },
        {
          "file": "policies-ui.test.cjs",
          "name": "PU-02: عميل الـAPI على مسارات الخادم نفسها وبنفس الحدود، والمسارات الثابتة قبل ‎:id، والمسارات المسموحة والحساب مقفول"
        },
        {
          "file": "policies-ui.test.cjs",
          "name": "PU-03: ربط البوابة في الواجهة — التحويل بكود الخادم، والفحص مرة مع كل دخول، وشاشة الإقرار والقارئ"
        },
        {
          "file": "policies-ui.test.cjs",
          "name": "PU-04: الشاشات والقايمة الجانبية وصلاحيات المسارات والتقرير"
        },
        {
          "file": "policies-ui.test.cjs",
          "name": "PU-05: ملف السياسة بالتدفق — البصمة والحجم من غير تحميل الملف كله، وتيار الإرسال بيقطع قبل ما يكمل لو الملف مش هو"
        },
        {
          "file": "preboarding.test.cjs",
          "name": "PG-01: the mark closes the session until the start day only; a system admin and an unlinked account stay outside"
        },
        {
          "file": "preboarding.test.cjs",
          "name": "PG-02: the feature is closed by default; the guard, the permission-less session, and the allowed routes"
        },
        {
          "file": "preboarding.test.cjs",
          "name": "PG-03: the web app sends a pre-boarding account to its documents, lists the pre-boarding screens only, and greets it with the start date"
        },
        {
          "file": "probation.test.cjs",
          "name": "PT-01: the effective end date, the reason, the extension date, the task titles and the row stamp"
        },
        {
          "file": "probation.test.cjs",
          "name": "PT-02: the judgment before the transaction and the comparison under the employee row lock; the change log; the daily job and its settings"
        },
        {
          "file": "probation.test.cjs",
          "name": "PT-03: the probation screen, its menu entry and title"
        },
        {
          "file": "recruitment-jobs.test.cjs",
          "name": "RU-01: openings, the salary range, the start date, texts, status transitions and what publishing needs"
        },
        {
          "file": "recruitment-jobs.test.cjs",
          "name": "RU-02: the destination is wired at its seven points, runs with the transaction manager only, and the service is scoped and writes fields"
        },
        {
          "file": "report-day-range-ui.test.cjs",
          "name": "payroll month: cycle 23 → «راتب سبتمبر» = 23 أغسطس → 22 سبتمبر، ويوم 23 يبدأ شهر أكتوبر"
        },
        {
          "file": "report-day-range-ui.test.cjs",
          "name": "the web payroll-month math matches the payroll engine for every cycle day and month (2024–2027)"
        },
        {
          "file": "report-day-range-ui.test.cjs",
          "name": "day range editing, validation, overlap and labels"
        },
        {
          "file": "report-day-range-ui.test.cjs",
          "name": "month quick-pick helpers: options around the current payroll month, labels, optional max length"
        },
        {
          "file": "report-day-range-ui.test.cjs",
          "name": "DayRangeFilter renders the month quick-pick + «من تاريخ / إلى تاريخ» and the payroll-month navigation"
        },
        {
          "file": "report-day-range-ui.test.cjs",
          "name": "DayRangeFilter keeps a partially typed date (year typed digit by digit) instead of resetting the input"
        },
        {
          "file": "report-day-range-ui.test.cjs",
          "name": "PayrollPeriodSelect: a payroll run stays chosen by period but shows its exact days"
        },
        {
          "file": "report-day-range-ui.test.cjs",
          "name": "API range helper: from/to wins, month stays backward compatible, bad ranges are 400"
        },
        {
          "file": "report-day-range-ui.test.cjs",
          "name": "API «تاريخ الطلب» filter: local days → UTC bounds [start, end) for a SYSUTCDATETIME column, both-or-none"
        },
        {
          "file": "report-day-range-ui.test.cjs",
          "name": "API: deductions and bonuses lists filter «من تاريخ / إلى تاريخ» on the server inside every page (before the 500 cap)"
        },
        {
          "file": "report-day-range-ui.test.cjs",
          "name": "API: /attendance/payroll-month, and the attendance reports/sheet/overtime/punches accept from/to (parameterised, month still works)"
        },
        {
          "file": "report-day-range-ui.test.cjs",
          "name": "attendance screens open on the payroll month with «من تاريخ / إلى تاريخ» (no month picker left)"
        },
        {
          "file": "report-day-range-ui.test.cjs",
          "name": "payroll screens: day range on deductions/bonuses/runs report; run period stays a month but shows its exact dates"
        },
        {
          "file": "report-day-range-ui.test.cjs",
          "name": "loans screen: filter by request date or by instalment month, with the month quick-pick and exact days"
        },
        {
          "file": "report-day-range-ui.test.cjs",
          "name": "reports dashboard: attendance and overtime summaries follow the range filter, not the calendar month"
        },
        {
          "file": "report-day-range-ui.test.cjs",
          "name": "attendance fixes: permissions has no unused Calendar import, exemption counters follow the chosen range"
        },
        {
          "file": "report-day-range-ui.test.cjs",
          "name": "payroll-period pickers (GOSI, cost centers, financial reports, leave settlement) open on the payroll month and show its days"
        },
        {
          "file": "report-day-range-ui.test.cjs",
          "name": "no month-only date filter is left in src/: every remaining month input is a form field or a payroll-run period that shows its days"
        },
        {
          "file": "report-day-range-ui.test.cjs",
          "name": "employee-code search, a readable payroll-month placeholder, and every closable leave year"
        },
        {
          "file": "routes-guards.test.cjs",
          "name": "RG-01: كل مسار تابع لموديول مسجّل"
        },
        {
          "file": "routes-guards.test.cjs",
          "name": "RG-02: كل مسار عليه @Perm بحراسه، أو استثناء موثّق"
        },
        {
          "file": "routes-guards.test.cjs",
          "name": "RG-03: قايمة الاستثناءات من غير بنود قديمة، والعام منها بس من غير حارس دخول"
        },
        {
          "file": "routes-guards.test.cjs",
          "name": "RG-04: المسارات اللي بتخدم أكتر من موديول متعلّمة على الـhandler"
        },
        {
          "file": "routes-guards.test.cjs",
          "name": "RG-05: كل مهمة مجدولة بتسأل عن موديولها باسم متسجّل، وكل مهمة في السجل مستخدمة"
        },
        {
          "file": "scheduled-jobs.test.cjs",
          "name": "TZ: الفاضي = توقيت الجهاز، والاسم المعروف مقبول، والغلط بيوقف الإقلاع برسالة واضحة"
        },
        {
          "file": "scheduled-jobs.test.cjs",
          "name": "قايمة المهام: كل مهمة بموعد صالح، وكل موعد في الكود من القايمة ومتسجل مرة واحدة، ومفيش @Cron خارجها"
        },
        {
          "file": "scheduled-jobs.test.cjs",
          "name": "الشاشة: «المهام المجدولة» في الإعدادات بصلاحية إدارة الإعدادات، والخادم بيشترط حساب على كل الفروع"
        },
        {
          "file": "session-cookie.test.cjs",
          "name": "SK-01: cookie attributes from the environment, its name, the Set-Cookie value, reading it, and the CSRF verdict"
        },
        {
          "file": "session-cookie.test.cjs",
          "name": "SK-02: the server reads Bearer first with one reader for both the token and the verdict, checks CSRF after the account, and hands the cookie over"
        },
        {
          "file": "session-cookie.test.cjs",
          "name": "SK-03: the web app keeps no token — nothing in storage, no Authorization header, every call through the session with the CSRF token on writes"
        },
        {
          "file": "surveys.test.cjs",
          "name": "SU-01: title, kind, minimum group, questions keyed by the server, and answers of each question type only"
        },
        {
          "file": "surveys.test.cjs",
          "name": "SU-02: eNPS and the summary, groups shown without one that lets a hidden group be subtracted, and the comment threshold from its setting"
        },
        {
          "file": "surveys.test.cjs",
          "name": "SU-03: a new closed module, a two-stage answer with no link from the response to the invitation, no audit line, the routes and the screens"
        },
        {
          "file": "tasks-ui.test.cjs",
          "name": "TU-01: عميل الـAPI على مسارات الخادم نفسها، والقيم بنفس قيم الخادم"
        },
        {
          "file": "tasks-ui.test.cjs",
          "name": "TU-02: «مهامي» — المهام العامة، والتهيئة والإخلاء بلينك شاشتهم، وتبويب «فريقي»، وفتح مهمة من لينك البريد"
        },
        {
          "file": "tasks-ui.test.cjs",
          "name": "TU-03: كارت المهمة ونموذج التكليف — الأزرار من حكم الخادم، والإثبات والأسباب مطلوبة قبل الإرسال"
        },
        {
          "file": "tasks-ui.test.cjs",
          "name": "TU-04: قايمة المهام والقايمة الجانبية والعناوين والإعدادين"
        },
        {
          "file": "tasks-ui.test.cjs",
          "name": "TU-05: قواعد المالك في الشاشات — الأزرار من حكم الخادم (تمديد، رد، «مش بتاعتي»، رجوع، تقييم)، والمهمة الشخصية وعلامة التقييم في النموذج، وتقرير الالتزام وسجل المهمة"
        },
        {
          "file": "training.test.cjs",
          "name": "TU-01: course and session values, the enrollment marks, the rating and the certificate expiry"
        },
        {
          "file": "training.test.cjs",
          "name": "TU-02: a new closed module with its permission, enrolling under the session row lock, marking under the enrollment row lock, the certificate as an employee document, and the routes"
        },
        {
          "file": "training.test.cjs",
          "name": "TU-03: the training request destination — a selectable handler owned by the module, the session staged by the server, enrollment at final approval under the session row lock, and the real screens"
        },
        {
          "file": "training.test.cjs",
          "name": "TU-04: the department budget written once per department and year under a range lock, the report within the branch scope, and mandatory training judged by scope"
        }
      ],
      "note": null
    },
    {
      "file": "codex-review-p3k-results-regression.cjs",
      "area": "shared_paths",
      "passed": 110,
      "failed": 8,
      "tests": [
        {
          "file": "session-cookie.integration.cjs",
          "name": "SC-01: the plain login is unchanged — the token in the body, no cookie, and a Bearer write needs no CSRF token"
        },
        {
          "file": "session-cookie.integration.cjs",
          "name": "SC-02: a cookie session keeps the token away from the page, and a write through it must carry the session's CSRF token"
        },
        {
          "file": "session-cookie.integration.cjs",
          "name": "SC-03: logout clears the cookie only for a request that carries it"
        },
        {
          "file": "session-cookie.integration.cjs",
          "name": "SC-04: changing the password re-issues the session in the shape the request came in, and the temporary-password gate holds through the cookie"
        },
        {
          "file": "session-cookie.integration.cjs",
          "name": "SC-05: the second login step hands the session over as a cookie when asked, and the pending step never sets one"
        },
        {
          "file": "session-cookie.integration.cjs",
          "name": "SC-06: on HTTPS the cookie is Secure under the __Host- name, and only that name is read"
        },
        {
          "file": "session-cookie.integration.cjs",
          "name": "SC-07 (CRP3D-N02): a cookie logout sent from another site is refused unless it carries the session's CSRF token"
        },
        {
          "file": "user-sessions.integration.cjs",
          "name": "US-01: every login opens a session whose number rides in the token, and the owner sees his own open sessions only"
        },
        {
          "file": "user-sessions.integration.cjs",
          "name": "US-02: ending one session kills its token only; another account's session answers like a missing one"
        },
        {
          "file": "user-sessions.integration.cjs",
          "name": "US-03: logout ends the session on the server — its token no longer passes, in a header or in a cookie"
        },
        {
          "file": "user-sessions.integration.cjs",
          "name": "US-04: a password change closes every session row; a dead or foreign session number never passes; a token without a number keeps the standing rule"
        },
        {
          "file": "totp.integration.cjs",
          "name": "TP-01: an account turns the authenticator on by confirming a code; the secret is shown once and stored sealed"
        },
        {
          "file": "totp.integration.cjs",
          "name": "TP-02: an enrolled account logs in with the app code as the second step — once, with no mail, and wrong codes lock the check for a while"
        },
        {
          "file": "totp.integration.cjs",
          "name": "TP-03: a role named in the setting must turn the authenticator on before anything else, and cannot turn it off"
        },
        {
          "file": "totp.integration.cjs",
          "name": "TP-04: a manager resets an account's authenticator inside his branches; a system admin's only by a system admin"
        },
        {
          "file": "totp.integration.cjs",
          "name": "TP-05 (CRP3D): the reset keeps the password-takeover boundary and is re-judged under the account row lock; a mail code opened before enrolment opens nothing after it"
        },
        {
          "file": "totp.integration.cjs",
          "name": "TP-06 (CRP3E): a reset is refused when the account version moved after the judgment; a mail-code login that the enrolment overtakes opens no session"
        },
        {
          "file": "totp.integration.cjs",
          "name": "TP-07 (CRP3F): a stale account or role save cannot write over a promotion, and a password-only login that the enrolment overtakes opens no session"
        },
        {
          "file": "totp.integration.cjs",
          "name": "TP-08 (CRP3G): a password change issues its session from the account as it is now, and a role being assigned is pinned until the save"
        },
        {
          "file": "totp.integration.cjs",
          "name": "TP-09 (CRP3H): a role without a row is pinned for an assignment, and an override replacement is refused when its basis moved"
        },
        {
          "file": "modules-enforcement.integration.cjs",
          "name": "ME-01: من غير صفوف — كل الموجود مفعّل، و/modules/enabled بيرجّعه لأي مستخدم داخل"
        },
        {
          "file": "modules-enforcement.integration.cjs",
          "name": "ME-02: موديول مقفول — مساراته 404 بنفس رد المسار اللي مالوش وجود، والفتح بيرجّعها"
        },
        {
          "file": "modules-enforcement.integration.cjs",
          "name": "ME-03: التبعيات — قفل معتمد عليه مرفوض، وتفعيل من غير تبعيته مرفوض، والأساسي مايتقفلش"
        },
        {
          "file": "modules-enforcement.integration.cjs",
          "name": "ME-04: أنواع الطلبات — نوع الموديول المقفول مابيتقدمش، والمفتوح منه بيكمّل سلسلته"
        },
        {
          "file": "modules-enforcement.integration.cjs",
          "name": "ME-05: المهام المجدولة — مهمة الموديول المقفول مابتشتغلش، ومهمة الأساسي بتشتغل"
        },
        {
          "file": "modules-enforcement.integration.cjs",
          "name": "ME-06: جمهور التفعيل — الموديول لجمهوره بس، ومدير النظام بيعدّي"
        },
        {
          "file": "modules-enforcement.integration.cjs",
          "name": "ME-07: المزايا الفرعية والباقات"
        },
        {
          "file": "modules-enforcement.integration.cjs",
          "name": "ME-08: الإشعارات والتقويم — بتوع الموديول المقفول مابيظهروش"
        },
        {
          "file": "modules-enforcement.integration.cjs",
          "name": "ME-11: الحضور مقفول — محرك الحضور مابيحسبش غياب عن أيام القفل، ولا بعد ما يتفتح تاني"
        },
        {
          "file": "modules-enforcement.integration.cjs",
          "name": "ME-12: وراثة الجمهور، ومسارات الورديات جوه كنترولر الحضور والكتالوج، والطلب المُرجَع والموديول مقفول"
        },
        {
          "file": "modules-enforcement.integration.cjs",
          "name": "ME-10: مسارات الأساس اللي بتجمّع بيانات موديولات اختيارية — جزء الموديول المقفول بيرجع فاضي، والمسار شغال"
        },
        {
          "file": "modules-enforcement.integration.cjs",
          "name": "ME-09: قبل ترحيل 076 (الجداول مش موجودة) — كل حاجة شغالة على الافتراضي"
        },
        {
          "file": "file-upload-type.integration.cjs",
          "name": "FU-01: PDF متسمي .jpg (والمتصفح قال صورة) = 400 برسالة واضحة، ومفيش صف ولا ملف على القرص"
        },
        {
          "file": "file-upload-type.integration.cjs",
          "name": "FU-02: صورة PNG حقيقية بتتقبل بنوعها الحقيقي وبصمتها، والملف على القرص هو المحتوى"
        },
        {
          "file": "file-upload-type.integration.cjs",
          "name": "FU-03: Word وExcel حقيقيين بيتقبلوا بنوعهم، وWord متسمي .xlsx مرفوض"
        },
        {
          "file": "file-upload-type.integration.cjs",
          "name": "FU-04: نوع مقفول من الإعداد = 400 باسمه، والمسموح شغال"
        },
        {
          "file": "file-upload-type.integration.cjs",
          "name": "FU-05: أكبر من الحد في الإعداد = 400 ومفيش حاجة اتكتبت، والحد من 1 لـ50 بس"
        },
        {
          "file": "file-upload-type.integration.cjs",
          "name": "FU-06: صورة الموظف وشعار الشركة لازم صورة حقيقية — PDF حقيقي أو PDF متسمي صورة مرفوضين"
        },
        {
          "file": "file-upload-type.integration.cjs",
          "name": "FU-07 (CRP2A-B02): النوع من بنية الحاوية — ZIP بتعليق «word/document.xml» مش Word، وExcel قديم متسمي .doc مش Word، ومفيش حاجة اتكتبت"
        },
        {
          "file": "file-upload-type.integration.cjs",
          "name": "FU-08 (CRP2B-A-B01): الرفع الفعلي — نوع ماكرو بتصريح Word جوه تعليق XML مش Word، ومجلد OLE اسمه WordDocument مش Word، والسليم لسه بيتقبل"
        },
        {
          "file": "file-upload-type.integration.cjs",
          "name": "FU-09 (CRP2C-A-B01): الرفع الفعلي — تيار Word من غير بايتات تتقري، أو قطاع بيشاور على نفسه، أو محتواه مش Word = مرفوض؛ وملف تعريف مش XML سليم مرفوض"
        },
        {
          "file": "tasks.integration.cjs",
          "name": "TK-01: مهمة لموظف — في «مهامي» بتاعته بس، ويشوفها أصحاب الحق، وبرّه كده 404"
        },
        {
          "file": "tasks.integration.cjs",
          "name": "TK-02: حدود التكليف — مسؤول واحد، وفرع من النطاق، وموعد حقيقي مش فايت، ومن غير كاشف وجود"
        },
        {
          "file": "tasks.integration.cjs",
          "name": "TK-03: المدير المباشر بيكلّف مرؤوسيه من غير صلاحية — مش غيرهم ولا دور"
        },
        {
          "file": "tasks.integration.cjs",
          "name": "TK-04: الحالة — المسؤول يبدأ ويعلّق ويقفل بإثبات، والمنشئ يلغي ويعيد الفتح، وإقفالين في نفس اللحظة واحد بس"
        },
        {
          "file": "tasks.integration.cjs",
          "name": "TK-05: مهمة الدور — لحاملي الدور اللي فرعها في نطاقهم، ومش مدير النظام في «مهامي» بتاعته"
        },
        {
          "file": "tasks.integration.cjs",
          "name": "TK-06: «مهامي» فيها مهام التهيئة اللي على جهتي وبنود الإخلاء اللي عليّ بنفس حكم شاشاتهم"
        },
        {
          "file": "tasks.integration.cjs",
          "name": "TK-07: «فريقي» لمرؤوسي المدير المباشرين، و«مرؤوسي المدير» بنفس حكم «المدير المباشر» بالحرف"
        },
        {
          "file": "tasks.integration.cjs",
          "name": "TK-08: قايمة كل المهام بصلاحيتها وفي نطاق الفروع، بفلاتر الحالة والمتأخر والمسؤول"
        },
        {
          "file": "tasks.integration.cjs",
          "name": "TK-09: التعديل والتحويل للمنشئ أو صاحب الصلاحية — التحويل تكليف جديد، وتغيير الموعد بيرجّع التذكير"
        },
        {
          "file": "tasks.integration.cjs",
          "name": "TK-10: التذكير والتصعيد مرة واحدة لكل مهمة وموعد، بأيام الإعدادين، والمقفولة برّه"
        },
        {
          "file": "tasks.integration.cjs",
          "name": "TK-11: التهيئة وقت التعيين — المهام بتتعمل من حدث التعيين من غير فتح الشاشة، ومرة واحدة حتى مع نداءات متزامنة"
        },
        {
          "file": "tasks.integration.cjs",
          "name": "TK-12: ملف الإثبات بيتحمّل بنفس حكم المهمة"
        },
        {
          "file": "tasks.integration.cjs",
          "name": "TK-13: حدود الإعدادين"
        },
        {
          "file": "tasks.integration.cjs",
          "name": "TK-14: إشعارات المهام بالبريد — تكليف وتذكير للمسؤول، وتأخير لمديره، بالعنوان والموعد بس وبفحص وقت الإرسال"
        },
        {
          "file": "tasks.integration.cjs",
          "name": "TK-15: اللي كلّف بالمهمة بيديرها بحقه دلوقتي — مدير مابقاش مدير المسؤول، وصلاحية اتشالت، ونطاق اتغيّر؛ والمهمة بتفضل في فرع تكليفها"
        },
        {
          "file": "tasks.integration.cjs",
          "name": "TK-16: طلبات متزامنة أكتر من اتصالات المجمّع — كل طلب على اتصال معاملته، ومحدش بيستنى اتصال تاني"
        },
        {
          "file": "tasks.integration.cjs",
          "name": "TK-17: مدير ليه آلاف المرؤوسين (فوق حد معاملات SQL Server) — «فريقي» وقايمة التكليف و«مهامي» شغالين"
        },
        {
          "file": "tasks.integration.cjs",
          "name": "TK-18: مهمة مسوغات التعيين في «مهامي» حالتها من المستندات دلوقتي — من غير ما شاشة التهيئة تتفتح الأول"
        },
        {
          "file": "policies.integration.cjs",
          "name": "PL-01: إنشاء السياسة وتعديل بياناتها — لصاحب الصلاحية ونطاقه كل الفروع؛ وحدود العنوان والفئة والمهلة والجمهور؛ والقايمة"
        },
        {
          "file": "policies.integration.cjs",
          "name": "PL-02: نشر نسخة — نص أو ملف PDF، وبصمة المحتوى، وتاريخ السريان، وأول نسخة جوهرية، والترقيم؛ ورفع ملف السياسة"
        },
        {
          "file": "policies.integration.cjs",
          "name": "PL-03: «سياساتي» و«اللي مستنيني» — الجمهور «مين + فين»، وحساب من غير موظف، والنسخة اللي لسه ماسرتش، وغير الإلزامية"
        },
        {
          "file": "policies.integration.cjs",
          "name": "PL-04: الإقرار — الموظف لنفسه، وبالنسخة السارية وببصمتها، ومرة واحدة، والدليل"
        },
        {
          "file": "policies.integration.cjs",
          "name": "PL-05: البوابة — جوه المهلة كل حاجة شغالة؛ بعدها كل نداء مرفوض بالكود إلا القايمة المسموحة؛ والإقرار بيفتح فورًا"
        },
        {
          "file": "policies.integration.cjs",
          "name": "PL-06: مين مابيتقفلش — حساب من غير موظف، وبرّه الجمهور، وغير الإلزامية، والمسحوبة؛ والمعيَّن الجديد مهلته من تعيينه"
        },
        {
          "file": "policies.integration.cjs",
          "name": "PL-07: نسخة جديدة — غير الجوهرية مابتطلبش إقرار تاني، والجوهرية بتطلبه من الكل؛ والنسخة القديمة مابيتقرّش بيها"
        },
        {
          "file": "policies.integration.cjs",
          "name": "PL-08: التقرير — مطابق لجدول الإقرارات، ولموظفي نطاق القارئ بس، وبالحالات والعدّ"
        },
        {
          "file": "policies.integration.cjs",
          "name": "PL-09: قراءة النسخة وملفها — للجمهور ولصاحب الصلاحية؛ ولغيرهم نفس رد اللي مش موجودة"
        },
        {
          "file": "policies.integration.cjs",
          "name": "PL-10: من غير سياسة إلزامية مسار الطلب العادي مابينادّيش فحص الإقرار خالص؛ ومعاها الحساب «المش مقفول» بيتفحص مرة في المدة"
        },
        {
          "file": "policies.integration.cjs",
          "name": "PL-11: سجل التدقيق — إنشاء وتعديل ونشر وسحب"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "TITLE_CHANGE updates the employee and writes a complete audit; invalid/no-op titles never submit"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "future title changes wait for their effective date and scheduled execution is idempotent"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "contract renewal and type change update dated contract data with audit and preserve employee tenure"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "contract validation rejects impossible/overlapping dates and future contracts wait without changing the current contract"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "SHIFT_SWAP writes both dates atomically, recalculates both employees, and rejects duplicate employee/date targets"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "SHIFT_SWAP rejects self swaps, unknown/inactive/outside-branch employees, invalid dates, and approved leave"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "a failure after both shift writes rolls back overrides and audit rows together"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "TEAM_TRANSFER checks the target employee custody and enforces on-behalf permission"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "transfer changes team, department, branch, direct manager and login scope in one transaction"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "duplicate scheduled transfers and a second executed transfer on the same date are rejected"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "new handlers reject incompatible request codes instead of silently completing"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "private attachment references cannot grant access through a request; owner and employee attachments are accepted"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "old catalogs expose required contract fields and optional letter purpose without a database seed"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "custody transfer retains the current holder until recipient acceptance and manager confirmation"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "recipient can reject a transfer and the original holder retains the asset; unrelated employees cannot reject"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "incorrect initial custody assignment can be rejected and returns the asset to inventory"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "custody transfer enforces the officer branch and request owner before any write"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "forged attachment references are also rejected when saving drafts"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "an approved custody return cannot bypass a pending transfer or return somebody else's assignment"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "concurrent cancellation of the same leave restores its balance only once"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "personal and emergency request forms expose editable fields mapped to their actual destinations"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "startup catch-up executes overdue transfers and escalations, and concurrent escalation cannot duplicate its audit"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "NAM-31 day and bulk overrides trust the shift ID, retain it after rename, and reject invalid catalog references"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "ATT-17 employee calendars apply their work schedule, branch exceptions and holidays with read scope enforced"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "ATT-17 clearing a week restores the employee schedule, preserves day overrides, recomputes attendance and enforces write scope"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "EMP-14 direct renewal rejects invalid dates, overlaps, missing permission, outside branch and pending contract requests"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "EMP-14 direct renewal records old and new dates, actor and reason and atomically saves the optional owned document"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "EMP-14 a foreign file or a failure after document save cannot leave changed dates, an attached file or a partial audit"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "NAM-1 public decision verbs store identical canonical actions in resolved steps and the immutable approval audit"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "NAM-1 legacy step actions normalize on every read without changing stored history and legacy returned requests resubmit"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "EMP-12 cleared optional fields persist as null across branch, department, team, user and leave type edit and reload"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "concurrent DRAFT submissions execute once and the losing payload cannot overwrite the committed request"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "concurrent RETURNED_FOR_INFO submissions execute once and the losing payload cannot overwrite the committed request"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "REQ-23 team leader receives and confirms custody when the employee has no explicit manager"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "REQ-23 an out-of-branch structural manager sees no custody and cannot confirm it by ID"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "REQ-10 allowed personal fields persist with exact before/after audit and clear with null"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "REQ-10 blank strings sent by the requests screen for untouched fields keep saved personal data (only changed fields are written)"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "REQ-10 empty, unchanged, protected and malformed personal updates cannot complete or append history"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "REQ-10 a missing employee or a failure after data/history writes rolls back the final decision"
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "REQ-10 simultaneous personal requests preserve the committed before/after chain"
        }
      ],
      "note": "Eight original request-decision-race cases were rejected by the temporary database name guard before database creation. New prefixed copy with database prefix only adapted passed all eight in decision-adapted."
    },
    {
      "file": "codex-review-p3k-results-decision-adapted.cjs",
      "area": "decision_races",
      "passed": 8,
      "failed": 0,
      "tests": [
        {
          "file": "codex-review-p3k-decision.integration.cjs",
          "name": "approval holding the request lock wins against REJECT; COMPLETED, audit and issued PDF stay consistent"
        },
        {
          "file": "codex-review-p3k-decision.integration.cjs",
          "name": "REJECT that read the request first holds its lock; a later approval cannot issue a PDF from stale state"
        },
        {
          "file": "codex-review-p3k-decision.integration.cjs",
          "name": "approval holding the request lock wins against RETURN; COMPLETED, audit and issued PDF stay consistent"
        },
        {
          "file": "codex-review-p3k-decision.integration.cjs",
          "name": "RETURN that read the request first holds its lock; a later approval cannot issue a PDF from stale state"
        },
        {
          "file": "codex-review-p3k-decision.integration.cjs",
          "name": "approval holding the request lock wins against CANCEL; COMPLETED, audit and issued PDF stay consistent"
        },
        {
          "file": "codex-review-p3k-decision.integration.cjs",
          "name": "CANCEL that read the request first holds its lock; a later approval cannot issue a PDF from stale state"
        },
        {
          "file": "codex-review-p3k-decision.integration.cjs",
          "name": "REJECT requires a meaningful reason and stores the trimmed comment only"
        },
        {
          "file": "codex-review-p3k-decision.integration.cjs",
          "name": "RETURN requires a meaningful reason and stores the trimmed comment only"
        }
      ],
      "note": null
    },
    {
      "file": "codex-review-p3k-results-final-probes.cjs",
      "area": "independent",
      "passed": 3,
      "failed": 0,
      "tests": [
        {
          "file": "codex-review-p3k-rewards.integration.cjs",
          "name": "P3K-R01: post-commit bonus read failure releases reservation and retry creates another bonus"
        },
        {
          "file": "codex-review-p3k-unit-scope.integration.cjs",
          "name": "P3K-U01: calibration and mandatory-training views expose current foreign department names"
        },
        {
          "file": "codex-review-p3k-privacy.integration.cjs",
          "name": "P3K-S01: live aggregates reveal a single anonymous choice by subtraction; sparse question reveals one answer"
        }
      ],
      "note": null
    },
    {
      "file": "codex-review-p3k-results-knowledge-money.cjs",
      "area": "independent",
      "passed": 3,
      "failed": 0,
      "tests": [
        {
          "file": "codex-review-p3k-knowledge.integration.cjs",
          "name": "P3K-K01: article can reference and expose a policy outside both editor and reader audience"
        },
        {
          "file": "codex-review-p3k-penalties.integration.cjs",
          "name": "P3K-P02: a failing reserved penalty increases the successful concurrent deduction recurrence"
        },
        {
          "file": "codex-review-p3k-penalties.integration.cjs",
          "name": "P3K-P01: unchanged occurrence accepts a different monetary penalty than preview"
        }
      ],
      "note": null
    },
    {
      "file": "codex-review-p3k-results-case-privacy.cjs",
      "area": "independent",
      "passed": 1,
      "failed": 0,
      "tests": [
        {
          "file": "codex-review-p3k-case-privacy.integration.cjs",
          "name": "P3K-C01: handler account rebound to respondent retains full case and complainant identity"
        }
      ],
      "note": null
    },
    {
      "file": "codex-review-p3k-results-preboarding.cjs",
      "area": "independent",
      "passed": 1,
      "failed": 0,
      "tests": [
        {
          "file": "codex-review-p3k-preboarding.integration.cjs",
          "name": "P3K-B01: a preboarding HR manager still reads and completes HR role tasks"
        }
      ],
      "note": null
    },
    {
      "file": "codex-review-p3k-results-dependent-control.cjs",
      "area": "independent",
      "passed": 1,
      "failed": 0,
      "tests": [
        {
          "file": "codex-review-p3k-dependent-control.integration.cjs",
          "name": "P3K-D01: dependent write waits for employee, then applies current branch and serializes duplicate identity"
        }
      ],
      "note": null
    }
  ],
  "findings": {
    "P3K-B01": [
      "codex-review-p3k-preboarding.integration.cjs",
      "P3K-B01"
    ],
    "P3K-B06": [
      "codex-review-p3k-unit-scope.integration.cjs",
      "P3K-U01"
    ],
    "P3K-B08-01": [
      "codex-review-p3k-rewards.integration.cjs",
      "P3K-R01"
    ],
    "P3K-B08-02": [
      "codex-review-p3k-unit-scope.integration.cjs",
      "P3K-U01"
    ],
    "P3K-B09": [
      "codex-review-p3k-unit-scope.integration.cjs",
      "P3K-U01"
    ],
    "P3K-B10": [
      "codex-review-p3k-knowledge.integration.cjs",
      "P3K-K01"
    ],
    "P3K-B11": [
      "codex-review-p3k-case-privacy.integration.cjs",
      "P3K-C01"
    ],
    "P3K-B12-01": [
      "codex-review-p3k-penalties.integration.cjs",
      "P3K-P01"
    ],
    "P3K-B12-02": [
      "codex-review-p3k-penalties.integration.cjs",
      "P3K-P02"
    ],
    "P3K-B13": [
      "codex-review-p3k-privacy.integration.cjs",
      "P3K-S01"
    ]
  },
  "positiveControl": [
    "codex-review-p3k-dependent-control.integration.cjs",
    "P3K-D01"
  ],
  "static": "codex-review-p3k-static-checks.cjs",
  "integrity": "codex-review-p3k-final-verification.cjs",
  "runFrom": "D:/projects/hr_system/.claude/worktrees/review-p02",
  "reproducePowerShell": [
    "$env:REVIEW_PRELOAD='codex-review-p3k-transport-preload.cjs'",
    "$env:REVIEW_PATTERN='P3K'",
    "$env:REVIEW_RESULT_SUFFIX='reproduction'",
    "node api/test/codex-review-p3k-suite.cjs codex-review-p3k-preboarding codex-review-p3k-unit-scope codex-review-p3k-rewards codex-review-p3k-knowledge codex-review-p3k-case-privacy codex-review-p3k-penalties codex-review-p3k-privacy codex-review-p3k-dependent-control"
  ],
  "limitations": [
    "No full integration rerun, browser inspection, or mutation testing.",
    "Failure assertions in independent probes intentionally demonstrate the vulnerable behavior; passing them is not a product acceptance result.",
    "R01 injects an in-memory error at the real financial service post-commit detail read; duplicate window set to valid zero setting.",
    "U01/S01 use direct SQL/entity setup for department transfer and changed private names; observed reads are actual HTTP routes.",
    "C01 changes account binding through actual PATCH /users/:id and uses fresh current identity.",
    "Initial failed infrastructure/fixture runs retained, superseded by final runs listed above."
  ],
  "safety": {
    "http": "in-process only; no listening services",
    "mail": "same instance send/isConfigured stubs before initialization",
    "ldap": "blocked by preload",
    "databases": "guarded temporary names; verified absent at end",
    "productAndExistingTests": "all 4068 tracked file hashes preserved"
  }
}

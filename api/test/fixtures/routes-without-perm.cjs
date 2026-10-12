'use strict'
// مسارات الـAPI اللي من غير @Perm — استثناءات موثّقة (خطة التنفيذ B0.5؛ الجرد في docs/analysis/code-verification.md القسم 10).
// الاختبار routes-guards.test.cjs بيفشل لو مسار جديد نزل من غير @Perm ومش هنا، أو لو بند هنا مابقاش موجود أو اتحط عليه @Perm.
// المفتاح «Controller.method» (الـhandler اللي بمسارين بند واحد). قبل ما تضيف بند: اتأكد إن مفيش مفتاح صلاحية كل مستخدمي المسار
// شايلينه — لو فيه، حط @Perm بدل الاستثناء.
const REASONS = {
  PUBLIC_OK: 'عام عن قصد ومن غير دخول: صفحة الدخول، وهوية الشركة، وفحص الصحة، وبصمات الأجهزة بمفتاح الجهاز',
  SELF: 'خدمة ذاتية: بيشتغل على بيانات صاحب الحساب بس (user.sub / user.employeeId) — دور «موظف» صلاحياته فاضية فمفيش مفتاح ينفع',
  AUTH_ANY_OK: 'أي حساب داخل: كتالوجات ومراجع للنماذج من غير بيانات حساسة',
  SERVICE_CHECK: 'الفحص جوه الخدمة: صلاحية أو دور أو موقع في الهيكل (مدير مباشر، معتمد الخطوة، صاحب الطلب) مايتعبّرش عنه بمفتاح واحد على المسار',
}

const EXCEPTIONS = {
  // ===== PUBLIC_OK (9) — عام عن قصد ومن غير دخول: صفحة الدخول، وهوية الشركة، وفحص الصحة، وبصمات الأجهزة بمفتاح الجهاز =====
  'AttendanceController.ingest': 'PUBLIC_OK', // POST /attendance/punches
  'AuthController.domainLogin': 'PUBLIC_OK', // POST /auth/login/domain
  'AuthController.login': 'PUBLIC_OK', // POST /auth/login
  'AuthController.logout': 'PUBLIC_OK', // POST /auth/logout — B2.17: بيمسح cookie الجلسة (حتى المنتهية)، ولما الطلب نفسه شايلها بس
  'AuthController.loginOptions': 'PUBLIC_OK', // GET /auth/login/options
  'AuthController.resend': 'PUBLIC_OK', // POST /auth/login/resend
  'AuthController.ssoCallback': 'PUBLIC_OK', // POST /auth/login/sso/callback — B6.4: إكمال الدخول المؤسسي (المعاملة الموقّعة والـstate وتحقق الـID token)
  'AuthController.ssoStart': 'PUBLIC_OK', // POST /auth/login/sso/start — B6.4: عنوان صفحة مزوّد الهوية (مقفول لو الـSSO مش مضبوط)
  'AuthController.verify': 'PUBLIC_OK', // POST /auth/login/verify
  'BrandingController.branding': 'PUBLIC_OK', // GET /branding
  'BrandingController.logo': 'PUBLIC_OK', // GET /branding/logo
  'CareersController.apply': 'PUBLIC_OK', // POST /careers/jobs/:id/apply — B3.3-ب: تقديم من اللينك العام (ميزة مقفولة افتراضيًا، وحد بالعنوان)
  'CareersController.detail': 'PUBLIC_OK', // GET /careers/jobs/:id — B3.3-ب: وظيفة منشورة «خارجي» بس
  'CareersController.feed': 'PUBLIC_OK', // GET /careers/feed/:name — B-ADD.6: فيد XML للوظائف المنشورة «خارجي» بس (ورا ميزة الصفحة العامة)
  'CareersController.list': 'PUBLIC_OK', // GET /careers/jobs — B3.3-ب: الوظائف المنشورة «خارجي» بس
  'HealthController.check': 'PUBLIC_OK', // GET /health
  // B6.3: الـAPI العام — من غير جلسة مستخدم: بمفتاح تكامل (حارسه IntegrationKeyGuard: مفتاح صالح، حد طلبات، نطاق قراءة) وموديول مقفول افتراضيًا
  'PublicApiController.attendance': 'PUBLIC_OK', // GET /public/v1/attendance — B6.3 (ب)
  'PublicApiController.employee': 'PUBLIC_OK', // GET /public/v1/employees/:id
  'PublicApiController.employees': 'PUBLIC_OK', // GET /public/v1/employees
  'PublicApiController.leaves': 'PUBLIC_OK', // GET /public/v1/leaves — B6.3 (ب)
  'PublicApiController.openapi': 'PUBLIC_OK', // GET /public/v1/openapi.json
  'PublicApiController.payrollRuns': 'PUBLIC_OK', // GET /public/v1/payroll/runs — B6.3 (ب)
  'PublicApiController.structure': 'PUBLIC_OK', // GET /public/v1/structure
  // ===== SELF (26) — خدمة ذاتية: بيشتغل على بيانات صاحب الحساب بس (user.sub / user.employeeId) — دور «موظف» صلاحياته فاضية فمفيش مفتاح ينفع =====
  // B2.16: لوحة الإعلانات وتسجيل القراءة — الموظف لنفسه (الإعلان ساري وهو في جمهوره؛ الفحص في الخدمة)
  // B6.6: مساعد القراءة — الحساب بيسأل والأدوات بتتنفّذ بهويته هو (موديول ai وميزة ai.read_assistant مقفولين افتراضيًا)
  // B6.10: اقتراحات المساعد — قرار صاحب الاقتراح فيه (لصاحبه بس)، ومسودة ملخص التقييم للمدير المقيِّم (الخدمة بتحكم بنموذج التقييم نفسه)
  'AiAssistController.outcome': 'SELF', // POST /ai/assist/:id/outcome
  'AiAssistController.reviewDraft': 'SERVICE_CHECK', // POST /ai/assist/review/:assignmentId
  'AiController.ask': 'SELF', // POST /ai/ask
  'AiController.confirm': 'SELF', // POST /ai/actions/:id/confirm — B6.7: صاحب الاقتراح بيأكده؛ التنفيذ بدالة مسار الشاشة وصلاحياتها
  'AiController.dismiss': 'SELF', // POST /ai/actions/:id/dismiss
  'AiController.status': 'SELF', // GET /ai/status
  'AiController.suggestions': 'SELF', // GET /ai/suggestions — B6.8: اقتراحات الحساب نفسه المستنية تأكيده
  'AnnouncementsController.board': 'SELF', // GET /announcements/board
  'AnnouncementsController.markRead': 'SELF', // POST /announcements/:id/read
  'AnnouncementsController.occasions': 'SELF', // GET /announcements/occasions — B2.16-ب: زمايل فرع الموظف (الميزة الفرعية مقفولة افتراضيًا)
  'AssetsController.myCustody': 'SELF', // GET /custody/mine
  'AttendanceController.myToday': 'SELF', // GET /attendance/my-today
  // B2.1: تصدير صاحب الحساب نفسه من شاشة في سجل التدقيق (مابيقراش أي بيانات)
  'AuditController.recordExport': 'SELF', // POST /audit/exports
  'AttendanceExemptionsController.mine': 'SELF', // GET /attendance-exemptions/mine
  'AuthController.changePassword': 'SELF', // POST /auth/change-password
  'AuthController.endOtherSessions': 'SELF', // POST /auth/sessions/end-others — B2.17-ب: جلسات صاحب الحساب نفسه
  'AuthController.endSession': 'SELF', // DELETE /auth/sessions/:id
  'AuthController.language': 'SELF', // GET /auth/language — B6.2: لغة عرض الواجهة لصاحب الحساب
  'AuthController.me': 'SELF', // GET /auth/me
  'AuthController.mySessions': 'SELF', // GET /auth/sessions
  'AuthController.totpConfirm': 'SELF', // POST /auth/totp/confirm — B2.17-ج: تطبيق المصادقة لصاحب الحساب نفسه
  'AuthController.totpDisable': 'SELF', // POST /auth/totp/disable
  'AuthController.totpSetup': 'SELF', // POST /auth/totp/setup
  'AuthController.totpStatus': 'SELF', // GET /auth/totp
  'AuthController.session': 'SELF', // GET /auth/session — B2.17: بيانات الحساب ورمز CSRF للجلسة الحالية
  'AuthController.setLanguage': 'SELF', // PUT /auth/language — B6.2: صاحب الحساب بيغيّر لغته
  'BonusesController.mine': 'SELF', // GET /bonuses/mine
  'EmployeeSelfPhotoController.setOwnPhoto': 'SELF', // PUT /employees/me/photo
  'FinancialExemptionsController.mine': 'SELF', // GET /payroll/exemptions/mine
  'HiringDocumentsController.mine': 'SELF', // GET /hiring-documents/mine
  'LoansController.mine': 'SELF', // GET /loans/mine
  'LegalEntitiesController.display': 'SELF', // GET /settings/legal-entities/display — B4.6 (ج): إعداد عرض الحساب نفسه (هجري جنب الميلادي) بفروعه هو
  // B2.4: اختيارات صاحب الحساب لقنوات إشعاراته (user.sub من التوكن — مفيش رقم مستخدم في الطلب)
  'NotificationsController.preferences': 'SELF', // GET /notifications/preferences
  'NotificationsController.setPreference': 'SELF', // PATCH /notifications/preferences
  // B2.5: «مهامي» وعدّادها و«فريقي» وقايمة «مين أقدر أكلّفه» عن صاحب الحساب نفسه
  'TasksController.mine': 'SELF', // GET /tasks/mine
  'TasksController.mineCount': 'SELF', // GET /tasks/mine/count
  'TasksController.team': 'SELF', // GET /tasks/team
  // B2.14: لوحة «فريقي» — الحكم بموقع الحساب في الهيكل (تحته حد ولا لأ)، واللي مالوش فريق مابياخدش بيانات
  'TeamController.overview': 'SERVICE_CHECK', // GET /manager/team
  'TeamController.status': 'SERVICE_CHECK', // GET /manager/status
  'TasksController.assignees': 'SELF', // GET /tasks/assignees
  // B2.7: «سياساتي» و«اللي مستنيني» والإقرار — الموظف لنفسه بس (الإقرار باسم صاحب الحساب، ومحدش بيقرّ عن حد)
  'PoliciesController.mine': 'SELF', // GET /policies/mine
  'PoliciesController.pending': 'SELF', // GET /policies/pending
  'PoliciesController.acknowledge': 'SELF', // POST /policies/versions/:versionId/acknowledge
  'HrDocumentsController.myAcknowledgements': 'SELF', // GET /hr-documents/mine/acknowledgements
  'HrDocumentsController.acknowledgementOf': 'SELF', // GET /hr-documents/issued/:id/acknowledgement
  'HrDocumentsController.acknowledge': 'SELF', // POST /hr-documents/issued/:id/acknowledge
  // التكليف والقراءة والتعديل والحالة: الحق بيتحكم في الخدمة (المسؤول، المنشئ، المدير المباشر، أو صلاحية المهام في فرعها) — برّه كده 404
  'TasksController.create': 'SERVICE_CHECK', // POST /tasks
  'TasksController.createForGroup': 'SERVICE_CHECK', // POST /tasks/group — B-ADD.1: المهمة الجماعية («إدارة المهام» أو «تكليف أي موظف»، بنطاقه)
  'TasksController.detail': 'SERVICE_CHECK', // GET /tasks/:id
  'TasksController.update': 'SERVICE_CHECK', // PATCH /tasks/:id
  'TasksController.setStatus': 'SERVICE_CHECK', // POST /tasks/:id/status
  // B2.5 (إضافة المالك 6 أكتوبر): تقرير الالتزام (صاحب «عرض كل المهام» في نطاقه، وغيره على مهام فريقه واللي كلّف بيه)، وطلب تمديد الميعاد
  // (المسؤول) وقراره (اللي بيدير المهمة)، وتقييم اللي كلّف بيها، وسجل المهمة (للي يشوفها) — الحق في الخدمة زي باقي مسارات المهمة
  'TasksController.report': 'SERVICE_CHECK', // GET /tasks/report
  'TasksController.log': 'SERVICE_CHECK', // GET /tasks/:id/log
  'TasksController.requestExtension': 'SERVICE_CHECK', // POST /tasks/:id/extension
  'TasksController.decideExtension': 'SERVICE_CHECK', // POST /tasks/:id/extension/decision
  'TasksController.rate': 'SERVICE_CHECK', // POST /tasks/:id/rating
  // B2.8: حوار التعليقات على الطلب والمهمة — الحق هو حق قراءة الكيان نفسه (طرف في الطلب أو «عرض كل الطلبات» في فرعه؛ واللي يشوف المهمة)،
  // والفحص في الخدمة (CommentsService.access): مفيش مفتاح صلاحية واحد يعبّر عنه
  'CommentsController.requestThread': 'SERVICE_CHECK', // GET /requests/:id/comments
  'CommentsController.requestComment': 'SERVICE_CHECK', // POST /requests/:id/comments
  'CommentsController.taskThread': 'SERVICE_CHECK', // GET /tasks/:id/comments
  'CommentsController.taskComment': 'SERVICE_CHECK', // POST /tasks/:id/comments
  // B5.1-ب: ورقة المدير في دورة الزيادات — «المدير المباشر» موقع في الهيكل (مرؤوسيه المباشرين بس، تحت قفل صف الموظف)
  'CompensationController.myTeam': 'SERVICE_CHECK', // GET /compensation/my-team
  'CompensationController.propose': 'SERVICE_CHECK', // PUT /compensation/cycles/:id/my-team/:employeeId
  // B5.3-أ: «مصروفاتي» — تقارير الموظف صاحب الحساب وبنودها (الخدمة بتحكم بـuser.employeeId؛ تقرير غيره «مش موجود»)
  'ExpensesController.mine': 'SELF', // GET /expenses/my
  'ExpensesController.createReport': 'SELF', // POST /expenses/my/reports
  'ExpensesController.updateReport': 'SELF', // PATCH /expenses/my/reports/:id
  'ExpensesController.removeReport': 'SELF', // DELETE /expenses/my/reports/:id
  'ExpensesController.addLine': 'SELF', // POST /expenses/my/reports/:id/lines
  'ExpensesController.updateLine': 'SELF', // PATCH /expenses/my/reports/:id/lines/:lineId
  'ExpensesController.removeLine': 'SELF', // DELETE /expenses/my/reports/:id/lines/:lineId
  'ExpensesController.attachAdvance': 'SELF', // PUT /expenses/my/reports/:id/advance
  'ExpensesController.addPerDiem': 'SELF', // POST /expenses/my/reports/:id/per-diem
  // B5.4-أ: المهارات — مصفوفة مرؤوسي المدير المباشرين وتقييم مهاراتهم («المدير المباشر» موقع في الهيكل؛ التقييم كمان لصاحب skills.manage في نطاقه — الحكم في الخدمة تحت قفل صف الموظف)، وفجوة صاحب الحساب
  'SkillsController.myTeam': 'SERVICE_CHECK', // GET /skills/my-team
  'SkillsController.assess': 'SERVICE_CHECK', // PUT /skills/employees/:employeeId/:skillId
  'SkillsController.mine': 'SELF', // GET /skills/my
  // B5.5-ج: موافقة الطرف التاني على تبديل الوردية — طلبات صاحب الحساب هو طرف فيها بس (الخدمة بتحكم بـuser.employeeId؛ غيرها «مش موجود»)
  'SwapConsentsController.mine': 'SELF', // GET /attendance/swap-consents/mine
  'SwapConsentsController.decide': 'SELF', // POST /attendance/swap-consents/:requestId
  // B5.6: بصمة الموبايل — بصمة صاحب الحساب هو (الخدمة بتحكم بـuser.employeeId تحت قفل صفه)
  'MobilePunchController.mine': 'SELF', // GET /attendance/mobile-punch
  'MobilePunchController.punch': 'SELF', // POST /attendance/mobile-punch
  // B5.7: السلامة — بلاغات صاحب الحساب وبلاغ جديد (الخدمة بتحكم بملف الموظف المربوط بالحساب وبفرعه الحالي)
  'SafetyController.mine': 'SELF', // GET /safety/my
  'SafetyController.report': 'SELF', // POST /safety/my
  // B5.8: ساعات المشاريع — ساعات صاحب الحساب (الخدمة بتحكم بملف الموظف المربوط بالحساب)، وأسابيع مرؤوسي المدير المباشرين واعتمادها («المدير المباشر» موقع في
  // الهيكل؛ وكمان لصاحب timesheets.manage في نطاقه — الحكم في الخدمة تحت قفل صف الموظف)
  'TimesheetsController.mine': 'SELF', // GET /timesheets/my
  'TimesheetsController.saveEntry': 'SELF', // PUT /timesheets/my/entries
  'TimesheetsController.submit': 'SELF', // POST /timesheets/my/submit
  'TimesheetsController.recall': 'SELF', // POST /timesheets/my/recall
  'TimesheetsController.team': 'SERVICE_CHECK', // GET /timesheets/team
  'TimesheetsController.decide': 'SERVICE_CHECK', // POST /timesheets/weeks/:id/decision
  // B5.10 (أ): تقييم 360 — ترشيحات الموظف والدعوات اللي عليه (بملف الموظف المربوط بالحساب)، وقرار الترشيح وقراءة النتيجة للمدير المباشر (موقع في الهيكل) أو لصاحب
  // performance.manage في نطاقه — الحكم في الخدمة تحت قفل صف الموظف
  'Feedback360Controller.mine': 'SELF', // GET /performance/feedback360/my
  'Feedback360Controller.nominate': 'SELF', // POST /performance/feedback360/my/nominations
  'Feedback360Controller.respond': 'SELF', // POST /performance/feedback360/invites/:id/respond
  'Feedback360Controller.team': 'SERVICE_CHECK', // GET /performance/feedback360/team
  'Feedback360Controller.decide': 'SERVICE_CHECK', // POST /performance/feedback360/invites/:id/decision
  'Feedback360Controller.results': 'SERVICE_CHECK', // GET /performance/feedback360/results
  // B5.10 (ب): اجتماعات 1:1 — اجتماعات صاحب الحساب؛ والتحديد للمدير المباشر دلوقتي، والتعديل والمهام لطرفي الاجتماع (الحكم في الخدمة تحت قفل الصف)
  'OneOnOnesController.list': 'SELF', // GET /performance/one-on-ones
  'OneOnOnesController.create': 'SERVICE_CHECK', // POST /performance/one-on-ones
  'OneOnOnesController.update': 'SERVICE_CHECK', // PATCH /performance/one-on-ones/:id
  'OneOnOnesController.addAction': 'SERVICE_CHECK', // POST /performance/one-on-ones/:id/actions
  // B5.10 (ج): التقدير — قايمة فرع صاحب الحساب وكلمة شكر لزميل فيه (بملف الموظف المربوط بالحساب)
  'RecognitionsController.feed': 'SELF', // GET /performance/recognitions
  'RecognitionsController.send': 'SELF', // POST /performance/recognitions
  // B2.7: قراءة نسخة سياسة وملفها — لصاحب صلاحية السياسات، أو للموظف اللي السياسة في جمهوره (الحكم في الخدمة)
  'PoliciesController.version': 'SERVICE_CHECK', // GET /policies/versions/:versionId
  'PoliciesController.versionFile': 'SERVICE_CHECK', // GET /policies/versions/:versionId/file
  'OffboardingController.mine': 'SELF', // GET /offboarding/mine
  'PayrollController.myPayslips': 'SELF', // GET /payroll/my-payslips
  // B1.14: مستحق الموظف التقديري عن نفسه (user.employeeId) — ورا الميزة الفرعية payroll.live_employee_view (مقفولة = 404)
  'PayrollLiveController.mine': 'SELF', // GET /payroll/live/mine
  'GoalsController.change': 'SERVICE_CHECK', // PATCH /performance/goals/:id — B3.6: تعديل في نص الفترة بسبب: لمدير صاحب الهدف المباشر أو لإدارة الأداء في نطاقه
  'GoalsController.close': 'SERVICE_CHECK', // POST /performance/goals/:id/status — B3.6: قفل الهدف (والمقترح صاحبه يسحبه)
  'GoalsController.create': 'SERVICE_CHECK', // POST /performance/goals — B3.6: لنفسه مقترح؛ لمرؤوس مباشر أو بالصلاحية ساري؛ لقسم أو للشركة بالصلاحية
  'GoalsController.decide': 'SERVICE_CHECK', // POST /performance/goals/:id/decision — B3.6: اعتماد أو رفض المقترح: للمدير المباشر أو لإدارة الأداء
  'GoalsController.detail': 'SERVICE_CHECK', // GET /performance/goals/:id — B3.6: للي له دور على الهدف، وإلا غير موجود
  'GoalsController.evidence': 'SERVICE_CHECK', // POST /performance/goals/:id/evidence — B3.6: مهمة مسؤولها صاحب الهدف كدليل
  'GoalsController.mine': 'SELF', // GET /performance/goals/mine — B3.6: أهداف الموظف نفسه، وأهداف قسمه والشركة السارية
  'GoalsController.progress': 'SERVICE_CHECK', // POST /performance/goals/:id/progress — B3.6: صاحب الهدف أو مديره أو إدارة الأداء
  'GoalsController.team': 'SERVICE_CHECK', // GET /performance/goals/team — B3.6: أهداف المرؤوسين المباشرين من الهيكل
  'MyInterviewsController.ics': 'SERVICE_CHECK', // GET /recruitment/my-interviews/:id/ics — B3.4-ب: ملف الدعوة لمسؤول التوظيف في نطاق المرشح أو لمحاور في المقابلة
  'MyInterviewsController.mine': 'SELF', // GET /recruitment/my-interviews — B3.4-ب: مقابلات الموظف المحاور نفسه
  'MyInterviewsController.submit': 'SELF', // POST /recruitment/my-interviews/:id/scorecard — B3.4-ب: بطاقة المحاور نفسه، مرة واحدة
  'OfferLinkController.answer': 'PUBLIC_OK', // POST /careers/offers/:token — B3.5-أ: رد المرشح على عرضه برمز اللينك (ميزة مقفولة افتراضيًا، مرة واحدة، وحد بالعنوان)
  'OfferLinkController.view': 'PUBLIC_OK', // GET /careers/offers/:token — B3.5-أ: العرض لصاحب رمز اللينك
  'PortalController.dismissNotification': 'SELF',
  'ReviewRewardsController.dismiss': 'SERVICE_CHECK', // POST /performance/rewards/:id/dismiss — B3.8-ب: المدير الموجّه له الاقتراح، أو إدارة الأداء في نطاقها
  'ReviewRewardsController.mine': 'SERVICE_CHECK', // GET /performance/rewards/mine — B3.8-ب: الاقتراحات الموجّهة للحساب (المدير المباشر)
  'ReviewRewardsController.submit': 'SERVICE_CHECK', // POST /performance/rewards/:id/submit — B3.8-ب: المدير الموجّه له الاقتراح بيقدّم المكافأة (وموديول المكافآت بيحكم)
  'TrainingController.teamMissing': 'SERVICE_CHECK', // GET /training/mandatory/team — B3.9-ج: التدريب الإلزامي الناقص عند مرؤوسين الحساب المباشرين
  // B3.11: ملفات القضايا — بعضوية القضية نفسها (المطّلعين عليها بس)، مش بصلاحية: صاحب الصلاحية اللي مش متضاف = غير موجودة
  'CasesController.addEvent': 'SERVICE_CHECK', // POST /cases/:id/events
  'CasesController.addHandler': 'SERVICE_CHECK', // POST /cases/:id/handlers
  'CasesController.addParty': 'SERVICE_CHECK', // POST /cases/:id/parties
  'CasesController.close': 'SERVICE_CHECK', // POST /cases/:id/close
  'CasesController.decide': 'SERVICE_CHECK', // POST /cases/:id/decision
  'CasesController.detail': 'SERVICE_CHECK', // GET /cases/:id
  'CasesController.investigator': 'SERVICE_CHECK', // POST /cases/:id/investigator
  'CasesController.list': 'SERVICE_CHECK', // GET /cases — القضايا اللي الحساب مطّلع عليها بس
  'DependentsController.mine': 'SELF', // GET /dependents/mine — B3.14: معالين صاحب الحساب نفسه
  'SurveysController.form': 'SERVICE_CHECK', // GET /surveys/:id — B3.13: نموذج استبيان للموظف المدعو له بس
  'SurveysController.mine': 'SELF', // GET /surveys/mine — B3.13: الاستبيانات المفتوحة اللي الموظف نفسه مدعو لها ولسه ماردّش
  'SurveysController.respond': 'SELF', // POST /surveys/:id/respond — B3.13: رد الموظف المدعو نفسه (مرة واحدة)
  'PenaltiesController.mine': 'SELF', // GET /penalties/mine — B3.12: جزاءات الموظف نفسه السارية
  'CasesController.mine': 'SELF', // GET /cases/mine — القضايا اللي الموظف نفسه شاكي أو مشكو في حقه فيها (بعد إخطاره)
  'CasesController.object': 'SELF', // POST /cases/:id/objection — اعتراض المشكو في حقه نفسه
  'HelpdeskController.article': 'SERVICE_CHECK', // GET /helpdesk/articles/:id — B3.10-ب: مقال منشور في جمهور موظف الحساب
  'HelpdeskController.articles': 'SERVICE_CHECK', // GET /helpdesk/articles — B3.10-ب: بحث قاعدة المعرفة (المنشور اللي في جمهور موظف الحساب)
  'HelpdeskController.mine': 'SELF', // GET /helpdesk/mine — B3.10: استفسارات الموظف نفسه بحالة خدمتها
  'HelpdeskController.rate': 'SELF', // POST /helpdesk/:id/rate — B3.10: تقييم الموظف لخدمة استفساره (صاحبه بس)
  'TrainingController.mine': 'SELF', // GET /training/mine — B3.9: تسجيلات الموظف نفسه في التدريب
  'TrainingController.rate': 'SELF', // POST /training/enrollments/:id/rate — B3.9: تقييم الموظف لتدريبه (صاحب التسجيل بس)
  'ReviewsController.acknowledge': 'SELF', // POST /performance/reviews/:id/acknowledge — B3.7-ب: إقرار الموظف نفسه بنتيجته المعلنة
  'ReviewsController.form': 'SERVICE_CHECK', // GET /performance/reviews/:id — B3.7: لصاحب التكليف، أو مقيِّمه، أو إدارة الأداء في نطاقه
  'ReviewsController.mine': 'SELF', // GET /performance/reviews/mine — B3.7: تكليفات الموظف نفسه
  'ReviewsController.submit': 'SERVICE_CHECK', // POST /performance/reviews/:id/submit — B3.7: الموظف لتقييمه الذاتي، أو المدير المقيِّم — مرة واحدة
  'ReviewsController.team': 'SERVICE_CHECK', // GET /performance/reviews/team — B3.7: التكليفات اللي الحساب مقيِّمها // DELETE /notifications/:id
  'PortalController.markNotificationsRead': 'SELF', // PATCH /notifications/read
  'PortalController.notifications': 'SELF', // GET /notifications
  'RecruitmentOpeningsController.apply': 'SELF', // POST /recruitment/openings/:id/apply — B3.3-أ: تقديم الموظف نفسه على وظيفة داخلية في فرعه الحالي
  'RecruitmentOpeningsController.list': 'SELF', // GET /recruitment/openings — B3.3-أ: الوظائف المنشورة داخليًا في فرع الموظف الحالي
  'RequestsController.acknowledge': 'SELF', // POST /requests/custody/:assignmentId/acknowledge · POST /custody/:assignmentId/acknowledge
  'RequestsController.handover': 'SELF', // POST /requests/custody/:assignmentId/handover · POST /custody/:assignmentId/handover
  'RequestsController.mine': 'SELF', // GET /requests/mine
  'RequestsController.myBalances': 'SELF', // GET /requests/leave-balances/mine · GET /leaves/balances/mine
  'RequestsController.myDecisions': 'SELF', // GET /requests/my-decisions
  'TypedDeductionsController.mine': 'SELF', // GET /deductions/mine
  'TypedDeductionsController.object': 'SELF', // POST /deductions/:id/objection
  // B-ADD.15: الاجتماعات — صندوق الحساب نفسه (دعوات بترن، طلبات دخول لاجتماعاته)، واجتماعاته، وإنشاء اجتماعه، واعتذاره، وطلب دخوله
  'MeetController.cancelKnock': 'SELF', // DELETE /meet/rooms/:id/knock
  'MeetController.create': 'SELF', // POST /meet/rooms
  'MeetController.decline': 'SELF', // POST /meet/rooms/:id/decline
  'MeetController.inbox': 'SELF', // GET /meet/inbox
  'MeetController.knock': 'SELF', // POST /meet/rooms/:id/knock
  'MeetController.knockState': 'SELF', // GET /meet/rooms/:id/knock
  'MeetController.list': 'SELF', // GET /meet/rooms
  // ===== AUTH_ANY_OK (11) — أي حساب داخل: كتالوجات ومراجع للنماذج من غير بيانات حساسة =====
  'AssetsController.availableAssets': 'AUTH_ANY_OK', // GET /assets/available
  'AttendanceController.payrollMonth': 'AUTH_ANY_OK', // GET /attendance/payroll-month
  'CatalogsController.list': 'AUTH_ANY_OK', // GET /catalogs/:kind
  'CurrencyContextController.currencyContext': 'AUTH_ANY_OK', // GET /settings/currency-context
  'EmployeesController.directory': 'AUTH_ANY_OK', // GET /employees/directory
  'ModulesController.enabled': 'AUTH_ANY_OK', // GET /modules/enabled
  'OrgController.branches': 'AUTH_ANY_OK', // GET /branches
  'OrgController.departments': 'AUTH_ANY_OK', // GET /departments
  'OrgController.teams': 'AUTH_ANY_OK', // GET /teams
  'RequestsController.activeLeaveTypes': 'AUTH_ANY_OK', // GET /requests/leave-types · GET /leaves/types
  'RequestsController.catalog': 'AUTH_ANY_OK', // GET /requests/types
  'MeetController.directory': 'AUTH_ANY_OK', // GET /meet/directory — B-ADD.15: دليل الدعوة (الحسابات النشطة: الاسم والمسمى الوظيفي بس)
  // ===== SERVICE_CHECK (75) — الفحص جوه الخدمة: صلاحية أو دور أو موقع في الهيكل (مدير مباشر، معتمد الخطوة، صاحب الطلب) مايتعبّرش عنه بمفتاح واحد على المسار =====
  'AssetsController.pendingMyConfirm': 'SERVICE_CHECK', // GET /custody/pending-my-confirm
  'AttendanceController.monthly': 'SERVICE_CHECK', // GET /attendance/monthly
  'AttendanceController.overtimePreview': 'SERVICE_CHECK', // GET /attendance/overtime/preview
  'AttendanceController.workingDays': 'SERVICE_CHECK', // GET /attendance/working-days
  'AttendanceRuleController.history': 'SERVICE_CHECK', // GET /attendance-rules/:sourceType/:sourceId/history
  'BonusesController.approve': 'SERVICE_CHECK', // POST /bonuses/:id/approve
  'BonusesController.bulk': 'SERVICE_CHECK', // POST /bonuses/bulk
  'BonusesController.candidates': 'SERVICE_CHECK', // GET /bonuses/candidates
  'BonusesController.creatable': 'SERVICE_CHECK', // GET /bonuses/creatable
  'BonusesController.create': 'SERVICE_CHECK', // POST /bonuses
  'BonusesController.detail': 'SERVICE_CHECK', // GET /bonuses/:id
  'BonusesController.list': 'SERVICE_CHECK', // GET /bonuses
  'BonusesController.preview': 'SERVICE_CHECK', // POST /bonuses/preview
  'BonusesController.reject': 'SERVICE_CHECK', // POST /bonuses/:id/reject
  'BonusesController.withdraw': 'SERVICE_CHECK', // POST /bonuses/:id/withdraw
  'DocsController.list': 'SERVICE_CHECK', // GET /documents
  // B2.9-ب: قيم الحقول المخصصة — صاحب الملف أو «عرض الموظفين» في نطاقه (قاعدة ملف الموظف، في الخدمة)
  'EmployeeCustomFieldsController.values': 'SERVICE_CHECK', // GET /employees/:id/custom-fields
  'EmployeeExtrasController.employeeHistory': 'SERVICE_CHECK', // GET /employees/:id/history
  'EmployeeExtrasController.profile': 'SERVICE_CHECK', // GET /employees/:id/profile
  'EmployeeLoginAccountController.read': 'SERVICE_CHECK', // GET /employees/:id/login-account
  'EmployeesController.findOne': 'SERVICE_CHECK', // GET /employees/:id
  'EmployeesController.suspensions': 'SERVICE_CHECK', // GET /employees/:id/suspensions
  'FilesController.download': 'SERVICE_CHECK', // GET /files/:id
  'FilesController.upload': 'SERVICE_CHECK', // POST /files/upload
  'FinancialExemptionsController.attach': 'SERVICE_CHECK', // POST /payroll/exemptions/:id/attachment
  'FinancialExemptionsController.candidates': 'SERVICE_CHECK', // GET /payroll/exemptions/runs/:runId/candidates
  'FinancialExemptionsController.create': 'SERVICE_CHECK', // POST /payroll/exemptions
  'FinancialExemptionsController.detail': 'SERVICE_CHECK', // GET /payroll/exemptions/:id
  'FinancialExemptionsController.grantableRuns': 'SERVICE_CHECK', // GET /payroll/exemptions/grantable-runs
  'FinancialExemptionsController.list': 'SERVICE_CHECK', // GET /payroll/exemptions
  'FinancialExemptionsController.preview': 'SERVICE_CHECK', // POST /payroll/exemptions/preview
  'FinancialExemptionsController.revoke': 'SERVICE_CHECK', // POST /payroll/exemptions/:id/revoke
  'FinancialExemptionsController.runView': 'SERVICE_CHECK', // GET /payroll/exemptions/runs/:runId
  'HrDocumentsController.download': 'SERVICE_CHECK', // GET /hr-documents/issued/:id/download
  'LeaveAttachmentsController.attach': 'SERVICE_CHECK', // POST /leaves/:id/attachment
  'LettersController.download': 'SERVICE_CHECK', // GET /letters/:id/download
  'LoansController.capPreview': 'SERVICE_CHECK', // GET /loans/cap-preview
  'LoansController.capReview': 'SERVICE_CHECK', // GET /loans/requests/:requestId/cap-review
  'LoansController.ledger': 'SERVICE_CHECK', // GET /loans/:id/ledger
  'OffboardingController.completeItem': 'SERVICE_CHECK', // POST /offboarding/items/:itemId/complete
  'OffboardingController.detail': 'SERVICE_CHECK', // GET /offboarding/:id
  'OffboardingController.myItems': 'SERVICE_CHECK', // GET /offboarding/my-items
  'OffboardingController.withdraw': 'SERVICE_CHECK', // POST /offboarding/:id/withdraw
  'OnboardingController.list': 'SERVICE_CHECK', // GET /onboarding
  'OnboardingController.updateTask': 'SERVICE_CHECK', // PATCH /onboarding/tasks/:id
  'PayrollApprovalChainController.approveStep': 'SERVICE_CHECK', // POST /payroll/runs/:id/approval-chain/approve
  'PayrollApprovalChainController.myPending': 'SERVICE_CHECK', // GET /payroll/approval-chain/my-pending
  'PayrollApprovalChainController.myPendingCount': 'SERVICE_CHECK', // GET /payroll/approval-chain/my-pending/count
  'PayrollApprovalChainController.rejectStep': 'SERVICE_CHECK', // POST /payroll/runs/:id/approval-chain/reject
  'PayrollApprovalChainController.review': 'SERVICE_CHECK', // GET /payroll/approval-chain/runs/:id/review
  'PayrollApprovalChainController.runChain': 'SERVICE_CHECK', // GET /payroll/runs/:id/approval-chain
  'PayrollController.payslip': 'SERVICE_CHECK', // GET /payroll/items/:id
  'PortalController.calendar': 'SERVICE_CHECK', // GET /calendar
  // B3.1-ج: فترات التجربة — القايمة بعرض الموظفين في نطاق الفروع أو للمدير المباشر، والقرار للمدير المباشر أو الموارد البشرية (الحكم في الخدمة)
  'ProbationController.decide': 'SERVICE_CHECK', // POST /probation/:employeeId/decision
  'ProbationController.list': 'SERVICE_CHECK', // GET /probation
  'QualificationsController.all': 'SERVICE_CHECK', // GET /employees/:id/qualifications
  'RequestsController.act': 'SERVICE_CHECK', // POST /requests/:id/act
  'RequestsController.cancel': 'SERVICE_CHECK', // POST /requests/:id/cancel
  'RequestsController.create': 'SERVICE_CHECK', // POST /requests
  // B2.6-ب: تفويض الاعتمادات — الموظف لنفسه، ولغيره بصلاحية «بانِي دورات الاعتماد» في نطاقه (الفحص في الخدمة)
  'RequestsController.createDelegation': 'SERVICE_CHECK', // POST /requests/delegations
  'RequestsController.delegations': 'SERVICE_CHECK', // GET /requests/delegations
  'RequestsController.detail': 'SERVICE_CHECK', // GET /requests/:id
  'RequestsController.inbox': 'SERVICE_CHECK', // GET /requests/inbox
  'RequestsController.managerConfirm': 'SERVICE_CHECK', // POST /requests/custody/:assignmentId/manager-confirm · POST /custody/:assignmentId/manager-confirm
  'RequestsController.myLeaves': 'SERVICE_CHECK', // GET /requests/my-leaves · GET /leaves/mine
  'RequestsController.rejectCustody': 'SERVICE_CHECK', // POST /requests/custody/:assignmentId/reject · POST /custody/:assignmentId/reject
  'RequestsController.resubmit': 'SERVICE_CHECK', // POST /requests/:id/resubmit
  'RequestsController.revokeDelegation': 'SERVICE_CHECK', // POST /requests/delegations/:id/revoke
  'RequestsController.submit': 'SERVICE_CHECK', // POST /requests/:id/submit
  'RequestsController.transfer': 'SERVICE_CHECK', // POST /requests/custody/:assignmentId/transfer · POST /custody/:assignmentId/transfer
  'TypedDeductionsController.approve': 'SERVICE_CHECK', // POST /deductions/:id/approve
  'TypedDeductionsController.bulk': 'SERVICE_CHECK', // POST /deductions/bulk
  'TypedDeductionsController.candidates': 'SERVICE_CHECK', // GET /deductions/candidates
  'TypedDeductionsController.creatable': 'SERVICE_CHECK', // GET /deductions/creatable
  'TypedDeductionsController.create': 'SERVICE_CHECK', // POST /deductions
  'TypedDeductionsController.detail': 'SERVICE_CHECK', // GET /deductions/:id
  'TypedDeductionsController.list': 'SERVICE_CHECK', // GET /deductions
  'TypedDeductionsController.preview': 'SERVICE_CHECK', // POST /deductions/preview
  'TypedDeductionsController.reject': 'SERVICE_CHECK', // POST /deductions/:id/reject
  'TypedDeductionsController.respondObjection': 'SERVICE_CHECK', // POST /deductions/:id/objection-response
  'TypedDeductionsController.withdraw': 'SERVICE_CHECK', // POST /deductions/:id/withdraw
  // B-ADD.15: الاجتماعات — الحق بالاجتماع نفسه (صاحبه، أو مدعو له، أو من غير غرفة انتظار)، والفحص في الخدمة
  'MeetController.admit': 'SERVICE_CHECK', // POST /meet/rooms/:id/admit — صاحب الاجتماع
  'MeetController.cancel': 'SERVICE_CHECK', // DELETE /meet/rooms/:id — صاحب الاجتماع
  'MeetController.deny': 'SERVICE_CHECK', // POST /meet/rooms/:id/deny — صاحب الاجتماع
  'MeetController.detail': 'SERVICE_CHECK', // GET /meet/rooms/:id — التفاصيل على قد دور الحساب في الاجتماع
  'MeetController.end': 'SERVICE_CHECK', // POST /meet/rooms/:id/end — صاحب الاجتماع
  'MeetController.mute': 'SERVICE_CHECK', // POST /meet/rooms/:id/mute — صاحب الاجتماع
  'MeetController.remove': 'SERVICE_CHECK', // POST /meet/rooms/:id/remove — صاحب الاجتماع
  'MeetController.token': 'SERVICE_CHECK', // POST /meet/rooms/:id/token — صاحبه والمدعوين، أو أي حساب لو من غير غرفة انتظار
  'MeetController.update': 'SERVICE_CHECK', // PATCH /meet/rooms/:id — صاحب الاجتماع
}

module.exports = { EXCEPTIONS, REASONS }

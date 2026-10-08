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
  'AuthController.verify': 'PUBLIC_OK', // POST /auth/login/verify
  'BrandingController.branding': 'PUBLIC_OK', // GET /branding
  'BrandingController.logo': 'PUBLIC_OK', // GET /branding/logo
  'HealthController.check': 'PUBLIC_OK', // GET /health
  // ===== SELF (26) — خدمة ذاتية: بيشتغل على بيانات صاحب الحساب بس (user.sub / user.employeeId) — دور «موظف» صلاحياته فاضية فمفيش مفتاح ينفع =====
  // B2.16: لوحة الإعلانات وتسجيل القراءة — الموظف لنفسه (الإعلان ساري وهو في جمهوره؛ الفحص في الخدمة)
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
  'AuthController.me': 'SELF', // GET /auth/me
  'AuthController.mySessions': 'SELF', // GET /auth/sessions
  'AuthController.totpConfirm': 'SELF', // POST /auth/totp/confirm — B2.17-ج: تطبيق المصادقة لصاحب الحساب نفسه
  'AuthController.totpDisable': 'SELF', // POST /auth/totp/disable
  'AuthController.totpSetup': 'SELF', // POST /auth/totp/setup
  'AuthController.totpStatus': 'SELF', // GET /auth/totp
  'AuthController.session': 'SELF', // GET /auth/session — B2.17: بيانات الحساب ورمز CSRF للجلسة الحالية
  'BonusesController.mine': 'SELF', // GET /bonuses/mine
  'EmployeeSelfPhotoController.setOwnPhoto': 'SELF', // PUT /employees/me/photo
  'FinancialExemptionsController.mine': 'SELF', // GET /payroll/exemptions/mine
  'HiringDocumentsController.mine': 'SELF', // GET /hiring-documents/mine
  'LoansController.mine': 'SELF', // GET /loans/mine
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
  // B2.7: قراءة نسخة سياسة وملفها — لصاحب صلاحية السياسات، أو للموظف اللي السياسة في جمهوره (الحكم في الخدمة)
  'PoliciesController.version': 'SERVICE_CHECK', // GET /policies/versions/:versionId
  'PoliciesController.versionFile': 'SERVICE_CHECK', // GET /policies/versions/:versionId/file
  'OffboardingController.mine': 'SELF', // GET /offboarding/mine
  'PayrollController.myPayslips': 'SELF', // GET /payroll/my-payslips
  // B1.14: مستحق الموظف التقديري عن نفسه (user.employeeId) — ورا الميزة الفرعية payroll.live_employee_view (مقفولة = 404)
  'PayrollLiveController.mine': 'SELF', // GET /payroll/live/mine
  'PortalController.dismissNotification': 'SELF', // DELETE /notifications/:id
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
}

module.exports = { EXCEPTIONS, REASONS }

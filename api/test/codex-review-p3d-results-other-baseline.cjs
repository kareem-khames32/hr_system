module.exports = {
  "selected": [
    "announcements",
    "announcements-migration",
    "document-expiry",
    "document-expiry-migration",
    "team-dashboard",
    "report-metrics",
    "saved-reports",
    "saved-reports-migration",
    "codex-review-p3d-units"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 71,
      "failed": 3,
      "passed": 68,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 71,
      "suites": 0
    },
    "duration_ms": 84993.5394
  },
  "results": [
    {
      "file": "announcements.integration.cjs",
      "name": "AN-01: the module is closed until opened; a draft is judged field by field; a branch account manages announcements of its own branches only",
      "ms": 9597.8603,
      "pass": true,
      "skip": false
    },
    {
      "file": "announcements.integration.cjs",
      "name": "AN-02: an announcement for one branch does not show to another branch; pinned first; reading is recorded once by the employee himself",
      "ms": 986.5788,
      "pass": true,
      "skip": false
    },
    {
      "file": "announcements.integration.cjs",
      "name": "AN-03: the read report lists the announcement audience inside the reader's branches — who read and when, and who has not",
      "ms": 152.641,
      "pass": true,
      "skip": false
    },
    {
      "file": "announcements.integration.cjs",
      "name": "AN-04: publishing notifies the audience accounts once, judged again when the mail leaves and when the list is read",
      "ms": 2214.5175,
      "pass": true,
      "skip": false
    },
    {
      "file": "announcements.integration.cjs",
      "name": "AN-05: an announcement attachment is uploaded by a manager, bound to a draft once, and read by the announcement's own rule",
      "ms": 737.8203,
      "pass": true,
      "skip": false
    },
    {
      "file": "announcements.integration.cjs",
      "name": "AN-06: the occasions feature is closed by default; open, it lists branch colleagues' birthdays and service anniversaries without the birth year",
      "ms": 304.6466,
      "pass": true,
      "skip": false
    },
    {
      "file": "announcements-migration.integration.cjs",
      "name": "ANM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 11034.8548,
      "pass": true,
      "skip": false
    },
    {
      "file": "announcements-migration.integration.cjs",
      "name": "ANM-2: من غير الجدولين اللوحة فاضية والإدارة بتقول الترحيل ناقص؛ وجدول بشكل تاني بيوقّف الترحيل؛ والمُرحّل بيعمل نفس الشكل والفرق صفر",
      "ms": 8610.3811,
      "pass": true,
      "skip": false
    },
    {
      "file": "announcements-migration.integration.cjs",
      "name": "ANM-3: آمن للتكرار",
      "ms": 1172.4123,
      "pass": true,
      "skip": false
    },
    {
      "file": "document-expiry.integration.cjs",
      "name": "DX-01: a document type carries its expiry settings; a type that expires makes the date required",
      "ms": 9590.8454,
      "pass": true,
      "skip": false
    },
    {
      "file": "document-expiry.integration.cjs",
      "name": "DX-02: a document reaching an alert day raises one event, notifies its owner and opens one renewal task on the responsible role",
      "ms": 872.7901,
      "pass": true,
      "skip": false
    },
    {
      "file": "document-expiry.integration.cjs",
      "name": "DX-03: the expiring and expired report follows the branch scope, and renewing a document closes its renewal task",
      "ms": 436.5369,
      "pass": true,
      "skip": false
    },
    {
      "file": "document-expiry.integration.cjs",
      "name": "DX-04: an approved renewal request moves the expiry date of the requester's document and closes its renewal task",
      "ms": 769.8685,
      "pass": true,
      "skip": false
    },
    {
      "file": "document-expiry-migration.integration.cjs",
      "name": "DEM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 11613.6271,
      "pass": true,
      "skip": false
    },
    {
      "file": "document-expiry-migration.integration.cjs",
      "name": "DEM-2: من غير الأعمدة المستندات شغالة والإعدادات على افتراضيها؛ وعمود بشكل تاني بيوقّف الترحيل؛ والمُرحّل بيعمل نفس الشكل والفرق صفر",
      "ms": 5197.4715,
      "pass": true,
      "skip": false
    },
    {
      "file": "document-expiry-migration.integration.cjs",
      "name": "DEM-3: آمن للتكرار",
      "ms": 965.0253,
      "pass": true,
      "skip": false
    },
    {
      "file": "team-dashboard.integration.cjs",
      "name": "TD-01: a team leader with the plain employee role sees his own team only, without salaries; the module is closed until opened",
      "ms": 10942.0859,
      "pass": true,
      "skip": false
    },
    {
      "file": "team-dashboard.integration.cjs",
      "name": "TD-02: a department head sees the whole tree under him, with direct reports marked and today's leave counted",
      "ms": 157.1179,
      "pass": true,
      "skip": false
    },
    {
      "file": "team-dashboard.integration.cjs",
      "name": "TD-03: salaries appear only with the compensation right, and only for members inside the account's branch scope",
      "ms": 141.9435,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-metrics.integration.cjs",
      "name": "RM-01: the active-employees number is the same on the dashboard, in the report, in the metrics and in the export",
      "ms": 11996.3552,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-metrics.integration.cjs",
      "name": "RM-02: turnover, absence and overtime follow the dictionary definitions, inside the reader scope",
      "ms": 113.1307,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-metrics.integration.cjs",
      "name": "RM-03: every report exports from the server as Excel and PDF with the report's own permission and scope, and each export is audited",
      "ms": 2616.1427,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 200\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\report-metrics.integration.cjs:238:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "saved-reports.integration.cjs",
      "name": "SR-01: a saved report is named filters judged by the report's own rules, and it belongs to its owner only",
      "ms": 10971.5402,
      "pass": true,
      "skip": false
    },
    {
      "file": "saved-reports.integration.cjs",
      "name": "SR-02: the owner downloads a saved report with its saved filters, under the permissions held now",
      "ms": 573.5012,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n500 !== 200\n",
      "cause": "Expected values to be strictly equal:\n\n500 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n500 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\saved-reports.integration.cjs:188:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "saved-reports.integration.cjs",
      "name": "SR-03: a scheduled report goes to its owner by mail once when due, built with the owner's identity at send time",
      "ms": 1212.3804,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n0 !== 1\n",
      "cause": "Expected values to be strictly equal:\n\n0 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n0 !== 1\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\saved-reports.integration.cjs:282:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "saved-reports-migration.integration.cjs",
      "name": "SRM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 9808.0364,
      "pass": true,
      "skip": false
    },
    {
      "file": "saved-reports-migration.integration.cjs",
      "name": "SRM-2: من غير الجدول القايمة بتقول الترحيل ناقص والتصدير زي ما هو؛ وجدول بشكل تاني بيوقّف الترحيل؛ والمُرحّل بيعمل نفس الشكل والفرق صفر",
      "ms": 6017.1861,
      "pass": true,
      "skip": false
    },
    {
      "file": "saved-reports-migration.integration.cjs",
      "name": "SRM-3: آمن للتكرار",
      "ms": 986.9128,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.test.cjs",
      "name": "TT-01: the RFC 6238 vectors, base32, the clock window, a code only once, and the app link",
      "ms": 3.7825,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.test.cjs",
      "name": "TT-02: the stored secret opens only with the server secret, and any change to it is caught",
      "ms": 1.3411,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.test.cjs",
      "name": "TT-03: an enrolled account is asked for the app code before the mail gate; the code is judged under the account row lock; the session gate; the application clock",
      "ms": 4.5478,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.test.cjs",
      "name": "TT-04: the login step for the app code, the «turn it on first» screen, the security card, the roles setting and the reset action",
      "ms": 5.8779,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions.test.cjs",
      "name": "UT-01: a readable device name from the User-Agent header, and the limits",
      "ms": 0.4817,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions.test.cjs",
      "name": "UT-02: the session number is random and rides in the token; the guard checks it before CSRF; ending is a conditional write by the row's owner",
      "ms": 1.4337,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions.test.cjs",
      "name": "UT-03: the security screen — my sessions, ending one, and its link and title",
      "ms": 2.5751,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.test.cjs",
      "name": "SK-01: cookie attributes from the environment, its name, the Set-Cookie value, reading it, and the CSRF verdict",
      "ms": 0.7617,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.test.cjs",
      "name": "SK-02: the server reads Bearer first with one reader for both the token and the verdict, checks CSRF after the account, and hands the cookie over",
      "ms": 1.6606,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.test.cjs",
      "name": "SK-03: the web app keeps no token — nothing in storage, no Authorization header, every call through the session with the CSRF token on writes",
      "ms": 180.9904,
      "pass": true,
      "skip": false
    },
    {
      "file": "announcements.test.cjs",
      "name": "AU-01: title, body, dates, the audience text and its branch scope, and when an announcement is live",
      "ms": 2.0579,
      "pass": true,
      "skip": false
    },
    {
      "file": "announcements.test.cjs",
      "name": "AU-02: the module, its permission, guarded routes, writes under the row lock, and the «new announcement» event judged at dispatch, at send and in the list",
      "ms": 2.2324,
      "pass": true,
      "skip": false
    },
    {
      "file": "announcements.test.cjs",
      "name": "AU-03: the announcements screen — the board for everyone, management for the permission holder, the sidebar item and the page title",
      "ms": 3.339,
      "pass": true,
      "skip": false
    },
    {
      "file": "announcements.test.cjs",
      "name": "AU-04: the attachment is bound once under the row lock and read by the announcement's rule; occasions give the next day without the birth year",
      "ms": 4.5481,
      "pass": true,
      "skip": false
    },
    {
      "file": "document-expiry.test.cjs",
      "name": "DE-01: alert days are read and entered safely, and a document reaches the nearest alert day",
      "ms": 0.6564,
      "pass": true,
      "skip": false
    },
    {
      "file": "document-expiry.test.cjs",
      "name": "DE-02: the new columns stay outside the entities; alerts run under the document row lock; the task and the notice follow the type",
      "ms": 3.457,
      "pass": true,
      "skip": false
    },
    {
      "file": "document-expiry.test.cjs",
      "name": "DE-03: the settings sit on the document types screen and the report on the employees documents screen",
      "ms": 2.8269,
      "pass": true,
      "skip": false
    },
    {
      "file": "document-expiry.test.cjs",
      "name": "DE-04: the renewal destination is registered with its own form fields and server-written key",
      "ms": 5.2736,
      "pass": true,
      "skip": false
    },
    {
      "file": "team-dashboard.test.cjs",
      "name": "TM-01: the compensation key adds to the standing rule; every shipped role sees the same money columns before and after",
      "ms": 0.2299,
      "pass": true,
      "skip": false
    },
    {
      "file": "team-dashboard.test.cjs",
      "name": "TM-02: the module and the key are registered",
      "ms": 1.2058,
      "pass": true,
      "skip": false
    },
    {
      "file": "team-dashboard.test.cjs",
      "name": "TM-03: the service only reads, uses the standing team definition, and money leaves only with the right and inside the account scope",
      "ms": 0.7405,
      "pass": true,
      "skip": false
    },
    {
      "file": "team-dashboard.test.cjs",
      "name": "TM-04: the sidebar item shows for a manager only, and the screen gates the salary column",
      "ms": 2.5229,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-metrics.test.cjs",
      "name": "MX-01: the dictionary holds six metrics with one written definition each, and the rules behind them",
      "ms": 0.3697,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-metrics.test.cjs",
      "name": "MX-02: the dashboard and the workforce report read one function, and absence has one condition",
      "ms": 1.5468,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-metrics.test.cjs",
      "name": "MX-03: export tables keep the screen columns, the amount column follows the permission, and dangerous text stays text",
      "ms": 67.7006,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-metrics.test.cjs",
      "name": "MX-04: status and category labels on the server are the labels of the screens",
      "ms": 2.0031,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-metrics.test.cjs",
      "name": "MX-05: the reports screen exports from the server, shows the dictionary strip, and the dashboard shows the active number",
      "ms": 2.0273,
      "pass": true,
      "skip": false
    },
    {
      "file": "saved-reports.test.cjs",
      "name": "SV-01: names, saved filters, due dates and the previous payroll month",
      "ms": 0.5252,
      "pass": true,
      "skip": false
    },
    {
      "file": "saved-reports.test.cjs",
      "name": "SV-02: the job is registered and goes through tick; mail carries the file; the send uses the owner's identity now",
      "ms": 2.3024,
      "pass": true,
      "skip": false
    },
    {
      "file": "saved-reports.test.cjs",
      "name": "SV-03: the reports screen holds the saved reports card with the server's labels",
      "ms": 2.2722,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-01: زرار القائمة في الهيدر (أقل من lg بس) بـaria-label وaria-expanded وبيتحكم في القائمة، والعنوان سطر واحد على الموبايل",
      "ms": 6.3121,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-02: القائمة الجانبية درج تحت lg — مقفول برّه الشاشة ومخفي، مفتوح ظاهر، وكل كلاس جديد max-lg: بس",
      "ms": 3.4648,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-03: AppShell — المحتوى lg:mr-72 وp-4 lg:p-8، خلفية معتمة بتقفل، Esc والانتقال بيقفلوا، وقفل تمرير الصفحة",
      "ms": 0.6879,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-04: CSS المشروع — كل max-lg: جوّه (أقل من 1024px) بس، وlg:mr-72 من 1024 وفوق، وclip للهيدر الثابت على الموبايل بس",
      "ms": 388.5704,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-05: الـviewport: Next بيطلع width=device-width, initial-scale=1 افتراضيًا ومحدش بيغيّره",
      "ms": 75.0538,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-06: شاشات البوابة — مفيش mr-72 ثابت، ولا grid-cols-3+ من غير بديل للشاشة الصغيرة، ولا col-span بيعمل عمود ضمني",
      "ms": 41.997,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-07: الجداول جوّه overflow-x-auto، والنوافذ جوّه الشاشة بهامش وmax-h وتمرير داخلي",
      "ms": 30.4693,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-08: لوحة الإشعارات جوّه الشاشة على الموبايل، ومنتقي الموظف قايمته مقصوصة على عرض الشاشة",
      "ms": 1.1255,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-09: الطباعة — زرار القائمة مابيتطبعش، وطباعة الهيكل التنظيمي بتلغي هامش القائمة الجديد (lg:mr-72)",
      "ms": 193.865,
      "pass": true,
      "skip": false
    },
    {
      "file": "pwa-ui.test.cjs",
      "name": "PW-01: ملف التعريف — اسم المنتج، البداية والنطاق، standalone، عربي RTL، والأيقونات بمقاساتها وأغراضها",
      "ms": 0.6224,
      "pass": true,
      "skip": false
    },
    {
      "file": "pwa-ui.test.cjs",
      "name": "PW-02: الأيقونات PNG سليمة بالمقاس المكتوب — العادية بزوايا شفافة، و«maskable» وأيقونة iOS من غير شفافية، وبلون الأيقونة",
      "ms": 6.5167,
      "pass": true,
      "skip": false
    },
    {
      "file": "pwa-ui.test.cjs",
      "name": "PW-03: زرار التثبيت — مابيترسمش من غير عرض المتصفح، وبيسمع العرض والتثبيت، ومكانه آخر القايمة قبل «بواسطة»",
      "ms": 1.4609,
      "pass": true,
      "skip": false
    },
    {
      "file": "pwa-ui.test.cjs",
      "name": "PW-04: من غير service worker ولا تخزين مؤقت ولا تغيير في viewport — وخطوة HTTPS مكتوبة في دليل التحديث",
      "ms": 189.1159,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "report-metrics.integration.cjs",
      "name": "RM-03: every report exports from the server as Excel and PDF with the report's own permission and scope, and each export is audited",
      "ms": 2616.1427,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 200\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\report-metrics.integration.cjs:238:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "saved-reports.integration.cjs",
      "name": "SR-02: the owner downloads a saved report with its saved filters, under the permissions held now",
      "ms": 573.5012,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n500 !== 200\n",
      "cause": "Expected values to be strictly equal:\n\n500 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n500 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\saved-reports.integration.cjs:188:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "saved-reports.integration.cjs",
      "name": "SR-03: a scheduled report goes to its owner by mail once when due, built with the owner's identity at send time",
      "ms": 1212.3804,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n0 !== 1\n",
      "cause": "Expected values to be strictly equal:\n\n0 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n0 !== 1\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\saved-reports.integration.cjs:282:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "تحقق حذف قاعدة الاختبار: hr_announcements_test_46ddc7558ec20a45",
    "Cleanup verified: hr_announcements_migration_test_5f7277e4c48e0645 is absent from sys.databases.",
    "تحقق حذف قاعدة الاختبار: hr_document_expiry_test_60d9a1f44f66858e",
    "Cleanup verified: hr_docexpiry_migration_test_347ae6c8691b1c8d is absent from sys.databases.",
    "تحقق حذف قاعدة الاختبار: hr_team_dashboard_test_0f2f5e2b1ede3f3e",
    "تحقق حذف قاعدة الاختبار: hr_report_metrics_test_30799397ff0816db",
    "تحقق حذف قاعدة الاختبار: hr_saved_reports_test_c3c389f443e0531e",
    "Cleanup verified: hr_saved_reports_migration_test_ada0750cc97517b5 is absent from sys.databases.",
    "tests 71",
    "suites 0",
    "pass 68",
    "fail 3",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 84993.5394"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_announcements_test_46ddc7558ec20a45\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_announcements_test_46ddc7558ec20a45\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_announcements_migration_test_5f7277e4c48e0645\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_announcements_migration_test_5f7277e4c48e0645\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_document_expiry_test_60d9a1f44f66858e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_document_expiry_test_60d9a1f44f66858e\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_docexpiry_migration_test_347ae6c8691b1c8d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_docexpiry_migration_test_347ae6c8691b1c8d\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_team_dashboard_test_0f2f5e2b1ede3f3e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_team_dashboard_test_0f2f5e2b1ede3f3e\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_report_metrics_test_30799397ff0816db\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_report_metrics_test_30799397ff0816db\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_saved_reports_test_c3c389f443e0531e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_saved_reports_test_c3c389f443e0531e\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_saved_reports_migration_test_ada0750cc97517b5\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_saved_reports_migration_test_ada0750cc97517b5\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n"
  ]
}

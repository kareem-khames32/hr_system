module.exports = {
  "selected": [
    "codex-review-p3j-units",
    "codex-review-p3j-auth-races",
    "codex-review-p3j-auth-independent",
    "codex-review-p3j-session-boundary",
    "codex-review-p3j-factor-paths",
    "codex-review-p3j-password-race",
    "codex-review-p3j-fix-controls",
    "totp",
    "totp-migration",
    "session-cookie",
    "user-sessions",
    "two-factor-race",
    "roles-scope-presets",
    "audit-log",
    "user-temporary-password",
    "domain-users-sync",
    "domain-autoprovision",
    "employee-suspension",
    "employment-periods",
    "attendance-calendar-transfer",
    "integrity"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 178,
      "failed": 0,
      "passed": 178,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 178,
      "suites": 0
    },
    "duration_ms": 162601.0293
  },
  "results": [
    {
      "file": "totp.test.cjs",
      "name": "TT-01: the RFC 6238 vectors, base32, the clock window, a code only once, and the app link",
      "ms": 2.3917,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.test.cjs",
      "name": "TT-02: the stored secret opens only with the server secret, and any change to it is caught",
      "ms": 1.1153,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.test.cjs",
      "name": "TT-03: an enrolled account is asked for the app code before the mail gate; the code is judged under the account row lock; the session gate; the application clock",
      "ms": 9.6201,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.test.cjs",
      "name": "TT-04: the login step for the app code, the «turn it on first» screen, the security card, the roles setting and the reset action",
      "ms": 5.561,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions.test.cjs",
      "name": "UT-01: a readable device name from the User-Agent header, and the limits",
      "ms": 0.4282,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions.test.cjs",
      "name": "UT-02: the session number is random and rides in the token; the guard checks it before CSRF; ending is a conditional write by the row's owner",
      "ms": 1.3599,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions.test.cjs",
      "name": "UT-03: the security screen — my sessions, ending one, and its link and title",
      "ms": 1.9233,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.test.cjs",
      "name": "SK-01: cookie attributes from the environment, its name, the Set-Cookie value, reading it, and the CSRF verdict",
      "ms": 0.6525,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.test.cjs",
      "name": "SK-02: the server reads Bearer first with one reader for both the token and the verdict, checks CSRF after the account, and hands the cookie over",
      "ms": 1.224,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.test.cjs",
      "name": "SK-03: the web app keeps no token — nothing in storage, no Authorization header, every call through the session with the CSRF token on writes",
      "ms": 162.8612,
      "pass": true,
      "skip": false
    },
    {
      "file": "announcements.test.cjs",
      "name": "AU-01: title, body, dates, the audience text and its branch scope, and when an announcement is live",
      "ms": 1.6368,
      "pass": true,
      "skip": false
    },
    {
      "file": "announcements.test.cjs",
      "name": "AU-02: the module, its permission, guarded routes, writes under the row lock, and the «new announcement» event judged at dispatch, at send and in the list",
      "ms": 3.0031,
      "pass": true,
      "skip": false
    },
    {
      "file": "announcements.test.cjs",
      "name": "AU-03: the announcements screen — the board for everyone, management for the permission holder, the sidebar item and the page title",
      "ms": 2.2728,
      "pass": true,
      "skip": false
    },
    {
      "file": "announcements.test.cjs",
      "name": "AU-04: the attachment is bound once under the row lock and read by the announcement's rule; occasions give the next day without the birth year",
      "ms": 5.3608,
      "pass": true,
      "skip": false
    },
    {
      "file": "document-expiry.test.cjs",
      "name": "DE-01: alert days are read and entered safely, and a document reaches the nearest alert day",
      "ms": 0.513,
      "pass": true,
      "skip": false
    },
    {
      "file": "document-expiry.test.cjs",
      "name": "DE-02: the new columns stay outside the entities; alerts run under the document row lock; the task and the notice follow the type",
      "ms": 2.8144,
      "pass": true,
      "skip": false
    },
    {
      "file": "document-expiry.test.cjs",
      "name": "DE-03: the settings sit on the document types screen and the report on the employees documents screen",
      "ms": 2.0762,
      "pass": true,
      "skip": false
    },
    {
      "file": "document-expiry.test.cjs",
      "name": "DE-04: the renewal destination is registered with its own form fields and server-written key",
      "ms": 11.3927,
      "pass": true,
      "skip": false
    },
    {
      "file": "team-dashboard.test.cjs",
      "name": "TM-01: the compensation key adds to the standing rule; every shipped role sees the same money columns before and after",
      "ms": 0.3134,
      "pass": true,
      "skip": false
    },
    {
      "file": "team-dashboard.test.cjs",
      "name": "TM-02: the module and the key are registered",
      "ms": 1.2736,
      "pass": true,
      "skip": false
    },
    {
      "file": "team-dashboard.test.cjs",
      "name": "TM-03: the service only reads, uses the standing team definition, and money leaves only with the right and inside the account scope",
      "ms": 1.0712,
      "pass": true,
      "skip": false
    },
    {
      "file": "team-dashboard.test.cjs",
      "name": "TM-04: the sidebar item shows for a manager only, and the screen gates the salary column",
      "ms": 2.268,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-metrics.test.cjs",
      "name": "MX-01: the dictionary holds six metrics with one written definition each, and the rules behind them",
      "ms": 0.3347,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-metrics.test.cjs",
      "name": "MX-02: the dashboard and the workforce report read one function, and absence has one condition",
      "ms": 1.4915,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-metrics.test.cjs",
      "name": "MX-03: export tables keep the screen columns, the amount column follows the permission, and dangerous text stays text",
      "ms": 35.1936,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-metrics.test.cjs",
      "name": "MX-04: status and category labels on the server are the labels of the screens",
      "ms": 1.6742,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-metrics.test.cjs",
      "name": "MX-05: the reports screen exports from the server, shows the dictionary strip, and the dashboard shows the active number",
      "ms": 1.859,
      "pass": true,
      "skip": false
    },
    {
      "file": "saved-reports.test.cjs",
      "name": "SV-01: names, saved filters, due dates and the previous payroll month",
      "ms": 0.5209,
      "pass": true,
      "skip": false
    },
    {
      "file": "saved-reports.test.cjs",
      "name": "SV-02: the job is registered and goes through tick; mail carries the file; the send uses the owner's identity now",
      "ms": 2.8224,
      "pass": true,
      "skip": false
    },
    {
      "file": "saved-reports.test.cjs",
      "name": "SV-03: the reports screen holds the saved reports card with the server's labels",
      "ms": 1.6286,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-01: زرار القائمة في الهيدر (أقل من lg بس) بـaria-label وaria-expanded وبيتحكم في القائمة، والعنوان سطر واحد على الموبايل",
      "ms": 5.2057,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-02: القائمة الجانبية درج تحت lg — مقفول برّه الشاشة ومخفي، مفتوح ظاهر، وكل كلاس جديد max-lg: بس",
      "ms": 3.0476,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-03: AppShell — المحتوى lg:mr-72 وp-4 lg:p-8، خلفية معتمة بتقفل، Esc والانتقال بيقفلوا، وقفل تمرير الصفحة",
      "ms": 0.6315,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-04: CSS المشروع — كل max-lg: جوّه (أقل من 1024px) بس، وlg:mr-72 من 1024 وفوق، وclip للهيدر الثابت على الموبايل بس",
      "ms": 280.0039,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-05: الـviewport: Next بيطلع width=device-width, initial-scale=1 افتراضيًا ومحدش بيغيّره",
      "ms": 53.6732,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-06: شاشات البوابة — مفيش mr-72 ثابت، ولا grid-cols-3+ من غير بديل للشاشة الصغيرة، ولا col-span بيعمل عمود ضمني",
      "ms": 25.4839,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-07: الجداول جوّه overflow-x-auto، والنوافذ جوّه الشاشة بهامش وmax-h وتمرير داخلي",
      "ms": 19.837,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-08: لوحة الإشعارات جوّه الشاشة على الموبايل، ومنتقي الموظف قايمته مقصوصة على عرض الشاشة",
      "ms": 0.996,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-09: الطباعة — زرار القائمة مابيتطبعش، وطباعة الهيكل التنظيمي بتلغي هامش القائمة الجديد (lg:mr-72)",
      "ms": 132.4263,
      "pass": true,
      "skip": false
    },
    {
      "file": "pwa-ui.test.cjs",
      "name": "PW-01: ملف التعريف — اسم المنتج، البداية والنطاق، standalone، عربي RTL، والأيقونات بمقاساتها وأغراضها",
      "ms": 0.405,
      "pass": true,
      "skip": false
    },
    {
      "file": "pwa-ui.test.cjs",
      "name": "PW-02: الأيقونات PNG سليمة بالمقاس المكتوب — العادية بزوايا شفافة، و«maskable» وأيقونة iOS من غير شفافية، وبلون الأيقونة",
      "ms": 4.6418,
      "pass": true,
      "skip": false
    },
    {
      "file": "pwa-ui.test.cjs",
      "name": "PW-03: زرار التثبيت — مابيترسمش من غير عرض المتصفح، وبيسمع العرض والتثبيت، ومكانه آخر القايمة قبل «بواسطة»",
      "ms": 2.4221,
      "pass": true,
      "skip": false
    },
    {
      "file": "pwa-ui.test.cjs",
      "name": "PW-04: من غير service worker ولا تخزين مؤقت ولا تغيير في viewport — وخطوة HTTPS مكتوبة في دليل التحديث",
      "ms": 130.307,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-auth-races.integration.cjs",
      "name": "P3J-R-role: reset cannot pass a concurrent privilege promotion through role",
      "ms": 5274.1428,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-auth-races.integration.cjs",
      "name": "P3J-R-override: reset cannot pass a concurrent privilege promotion through override",
      "ms": 328.0104,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-auth-races.integration.cjs",
      "name": "P3J-R-direct: reset cannot pass a concurrent privilege promotion through direct",
      "ms": 303.3853,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-auth-races.integration.cjs",
      "name": "P3J-R-mail-1: activation while email verification is at factor check 1",
      "ms": 439.1158,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-auth-races.integration.cjs",
      "name": "P3J-R-mail-2: activation while email verification is at factor check 2",
      "ms": 455.6397,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-auth-races.integration.cjs",
      "name": "P3J-R-disabled: a pending TOTP challenge is rejected after disable",
      "ms": 325.3906,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-auth-independent.integration.cjs",
      "name": "P3J-A01: a delegated users manager cannot reset MFA on a stronger administrative account",
      "ms": 5117.3082,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-auth-independent.integration.cjs",
      "name": "P3J-A02: an email challenge opened before enrollment cannot mint a new unrestricted session after TOTP activation",
      "ms": 414.9001,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-auth-independent.integration.cjs",
      "name": "P3J-A03: required setup gate and current cookie CSRF isolate sessions and mutation routes",
      "ms": 318.7157,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-session-boundary.integration.cjs",
      "name": "P3J-S-before-state: email activation on each side of the post-open factor read",
      "ms": 5342.1843,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-session-boundary.integration.cjs",
      "name": "P3J-S-after-state: email activation on each side of the post-open factor read",
      "ms": 442.7812,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-session-boundary.integration.cjs",
      "name": "P3J-S-password: password-only login cannot open a new full session after TOTP activation committed",
      "ms": 264.2073,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-factor-paths.integration.cjs",
      "name": "P3J-F-domain: domain login rechecks enrollment after opening the new session",
      "ms": 5102.5559,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-factor-paths.integration.cjs",
      "name": "P3J-F-client: a client cannot claim factorProven in a password login",
      "ms": 80.1533,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-password-race.integration.cjs",
      "name": "P3J-P-role: changing a password must not reissue revoked authority with the current version",
      "ms": 5387.6338,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-password-race.integration.cjs",
      "name": "P3J-P-legacy-grant: changing a password must not reissue revoked authority with the current version",
      "ms": 378.1189,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-password-race.integration.cjs",
      "name": "P3J-P-role-bundle: changing a password must not reissue revoked authority with the current version",
      "ms": 408.6393,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-fix-controls.integration.cjs",
      "name": "P3J-F-create: existing proposed role changed before the lock rejects creation with no account row",
      "ms": 5026.4203,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-fix-controls.integration.cjs",
      "name": "P3J-F-temporary: a stale second member rolls back the entire temporary-password batch",
      "ms": 355.2807,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-fix-controls.integration.cjs",
      "name": "P3J-F-reactivate: promotion after the takeover check rejects reactivation and leaves the account inactive",
      "ms": 170.9755,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.integration.cjs",
      "name": "TP-01: an account turns the authenticator on by confirming a code; the secret is shown once and stored sealed",
      "ms": 7732.0825,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.integration.cjs",
      "name": "TP-02: an enrolled account logs in with the app code as the second step — once, with no mail, and wrong codes lock the check for a while",
      "ms": 1494.0407,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.integration.cjs",
      "name": "TP-03: a role named in the setting must turn the authenticator on before anything else, and cannot turn it off",
      "ms": 1132.5295,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.integration.cjs",
      "name": "TP-04: a manager resets an account's authenticator inside his branches; a system admin's only by a system admin",
      "ms": 1279.7903,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.integration.cjs",
      "name": "TP-05 (CRP3D): the reset keeps the password-takeover boundary and is re-judged under the account row lock; a mail code opened before enrolment opens nothing after it",
      "ms": 1532.0291,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.integration.cjs",
      "name": "TP-06 (CRP3E): a reset is refused when the account version moved after the judgment; a mail-code login that the enrolment overtakes opens no session",
      "ms": 1424.1267,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.integration.cjs",
      "name": "TP-07 (CRP3F): a stale account or role save cannot write over a promotion, and a password-only login that the enrolment overtakes opens no session",
      "ms": 1108.4186,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.integration.cjs",
      "name": "TP-08 (CRP3G): a password change issues its session from the account as it is now, and a role being assigned is pinned until the save",
      "ms": 1030.1844,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.integration.cjs",
      "name": "TP-09 (CRP3H): a role without a row is pinned for an assignment, and an override replacement is refused when its basis moved",
      "ms": 2306.4854,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp-migration.integration.cjs",
      "name": "TPM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 7967.6576,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp-migration.integration.cjs",
      "name": "TPM-2: من غير الجدول الدخول زي الأول حتى للدور الإلزامي؛ وجدول بشكل تاني بيوقّف الترحيل؛ والمُرحّل بيعمل نفس الشكل والفرق صفر",
      "ms": 5645.0487,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp-migration.integration.cjs",
      "name": "TPM-3: آمن للتكرار",
      "ms": 838.5757,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-01: the plain login is unchanged — the token in the body, no cookie, and a Bearer write needs no CSRF token",
      "ms": 7527.9535,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-02: a cookie session keeps the token away from the page, and a write through it must carry the session's CSRF token",
      "ms": 479.0858,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-03: logout clears the cookie only for a request that carries it",
      "ms": 91.293,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-04: changing the password re-issues the session in the shape the request came in, and the temporary-password gate holds through the cookie",
      "ms": 896.9557,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-05: the second login step hands the session over as a cookie when asked, and the pending step never sets one",
      "ms": 480.8119,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-06: on HTTPS the cookie is Secure under the __Host- name, and only that name is read",
      "ms": 342.2933,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-07 (CRP3D-N02): a cookie logout sent from another site is refused unless it carries the session's CSRF token",
      "ms": 178.8878,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions.integration.cjs",
      "name": "US-01: every login opens a session whose number rides in the token, and the owner sees his own open sessions only",
      "ms": 7201.003,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions.integration.cjs",
      "name": "US-02: ending one session kills its token only; another account's session answers like a missing one",
      "ms": 655.6758,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions.integration.cjs",
      "name": "US-03: logout ends the session on the server — its token no longer passes, in a header or in a cookie",
      "ms": 205.6561,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions.integration.cjs",
      "name": "US-04: a password change closes every session row; a dead or foreign session number never passes; a token without a number keeps the standing rule",
      "ms": 781.3758,
      "pass": true,
      "skip": false
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R1 — جدول الإعدادات مش موجود لحظيًّا: الدخول مرفوض 503 بلا جلسة ولا بريد ولا حالة معلَّقة",
      "ms": 6916.9922,
      "pass": true,
      "skip": false
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R2 — 12 تحقق متوازي برمز غلط على القاعدة: العدّاد 5 بالظبط، القفل مكتوب، والرمز الصح مرفوض",
      "ms": 798.4325,
      "pass": true,
      "skip": false
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R3 — ونفس الشيء عبر HTTP: 12 طلب تحقق في نفس اللحظة بيقفلوا الحالة عند الحد",
      "ms": 786.9887,
      "pass": true,
      "skip": false
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R4 — الحد المعلن نفسه: 4 غلط متوازية مابتقفلش، والخامسة هي اللي تقفل",
      "ms": 426.6937,
      "pass": true,
      "skip": false
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R5 — إعادة إرسال وسط تحقق جارٍ: الرمز القديم مرفوض، الحالة مش مستهلكة، والجديد شغّال",
      "ms": 333.8399,
      "pass": true,
      "skip": false
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R6 — 6 تحققات متوازية بالرمز الصح: جلسة واحدة بالظبط والباقي 401",
      "ms": 445.2022,
      "pass": true,
      "skip": false
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R7 — 8 إعادات إرسال في نفس اللحظة: رسالة واحدة بالظبط، والعدّاد مش بيضيع، وإجمالي الرسايل = الحد المعلن",
      "ms": 1498.1598,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "migration 064 through the real migrator: adds the column, inserts missing roles, trims only rows that still equal the shipped preset, kills only changed sessions, and re-runs change nothing",
      "ms": 11241.9152,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "migration 064 on a production-shaped database: SQL Server 2019 compatibility level and a database collation that differs from tempdb",
      "ms": 590.0088,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "customised rows: the screen shows exactly what differs from the approved bundle, the row keeps its old power until fixed, and resetting it to the shipped preset lets the migration trim it",
      "ms": 338.7941,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "مسؤول الأصول: registers assets, hands custody over, receives it back and transfers it — and gets 403 on money, employee files, attendance, requests and settings",
      "ms": 441.6251,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "approve.custody finally has a carrier: the asset officer decides the «أمين العهدة» step end to end; the HR officer and the read-only role cannot decide anything",
      "ms": 492.3587,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "مسؤول موارد بشرية: reads every HR module of his branch and cannot edit, cancel, approve or do anything an HR manager does",
      "ms": 517.5132,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "مسؤول صرف الرواتب: sees payroll runs and carries the disbursement permission — cannot calculate, approve, pay, reopen, cancel or touch any other module",
      "ms": 306.7389,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "trimmed presets behave: payroll_manager calculates but never approves or pays; read_only reads and never writes or opens the bank sheet; data_entry edits and never archives",
      "ms": 274.2676,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "«نطاقه: كل الفروع»: entity → JWT → guard. On = every branch and company-wide writes WITH the permission, refused WITHOUT it; off = own branch; the token dies on every change",
      "ms": 430.585,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "only the super admin grants it: an HR manager cannot switch it on or off, cannot create an account with it, and cannot manage an account that has it",
      "ms": 354.9797,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "fail-closed stays: a legacy account with no branch still sees nothing and writes nothing company-wide, whatever permissions it carries",
      "ms": 200.0357,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "permissions screen API: the whole registry with module, description and carriers; orphans flagged; copy a role; effective = role ∪ grants − revokes",
      "ms": 266.6687,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-01 (معيار الخطة): تغيير آيبان (قبل وبعد متخفيين)، وقفل وفتح موديول، وتصدير تقرير رواتب — التلاتة في السجل بمين والـIP",
      "ms": 6864.9838,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-02: الدخول، والإعداد بقيمته قبل وبعد (والمفتاح الحساس نجوم)، والدور بصلاحياته، ومنح الحساب، وحدث المسير — كلهم في السجل",
      "ms": 204.062,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-03: عملية رجعت (rollback) مالهاش سطر",
      "ms": 29.5355,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-04: البحث بصلاحية «سجل التدقيق» وبنطاق الفرع، والاحتفاظ: القديم في «منتهي الاحتفاظ» بس",
      "ms": 179.0781,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-05 (CRP2A-B01): فشل سطر التدقيق بيرجّع التغيير نفسه — منح الحساب وتعديل الدور، ومعاهم إبطال الجلسات",
      "ms": 203.4893,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-temporary-password.integration.cjs",
      "name": "the importer's unusable hash never logs in (no guess works, generic 401)",
      "ms": 10630.0839,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-temporary-password.integration.cjs",
      "name": "users list flags migrated accounts without a password, never leaks hashes, respects branch scope",
      "ms": 77.7556,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-temporary-password.integration.cjs",
      "name": "bulk temporary password: permission, branch scope, takeover and self guards are all-or-nothing",
      "ms": 97.8735,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-temporary-password.integration.cjs",
      "name": "bulk set → forced change on login → new password unlocks the system",
      "ms": 820.9572,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-temporary-password.integration.cjs",
      "name": "single reset is temporary by default, can be made permanent, and the flag needs a password",
      "ms": 562.6164,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-temporary-password.integration.cjs",
      "name": "migration 056 is additive, idempotent, SQL Server 2019-safe and matches the TypeORM schema",
      "ms": 891.9492,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "NOLDAP — أي محاولة لفتح اتصال LDAP حقيقي بتفشّل الاختبار بصوت عالي",
      "ms": 6996.7361,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "A1 — المعاينة مفيش فيها أي كتابة: لقطة جدول المستخدمين قبلها وبعدها متطابقة بالحرف",
      "ms": 28.8717,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "A2 — المعاينة بتقول اللي هيحصل بالظبط: الحسابات الجديدة والربط بالاسم والكود",
      "ms": 11.0101,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "B1 — المطابقة برقم البصمة شغّالة في الاتجاهين حتى مع الأصفار البادئة والمسافات",
      "ms": 10.058,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "B2 — الغموض مرفوض بالاسم والكود، ومفيش تخمين ومفيش حساب",
      "ms": 10.5137,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "B3 — كل سبب تخطّي/تعارض بيطلع على الحساب الصح",
      "ms": 8.8561,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "C1 — التطبيق بيعمل الحسابات المتوقعة بالظبط: بلا كلمة مرور، بالـGUID، بأقل دور، بفرع الموظف",
      "ms": 20504.8869,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "D1 — حساب قائم يُربط ولا يتكرر، ومفيش دور ولا صلاحيات ولا بريد ولا كلمة مرور بتتغيّر",
      "ms": 109.6707,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "E1 — تعارض الـGUID بيتقال ومايتكتبش فوقه، والحساب المعطّل والبريد المحجوز مالهمش أي أثر",
      "ms": 26.6041,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "F1 — تمرير تاني (وثالت): مفيش إنشاء ولا ربط، ولقطة الجدول متطابقة بالحرف",
      "ms": 29.2564,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "G1 — الحساب المتزامن بيدخل بحساب المجال ومفيش حساب تاني بيتعمل",
      "ms": 55.3233,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "G2 — الدخول الحيّ كسب خطوة رقم البصمة: حساب مجال ما اتزامنش بيطابق بالبصمة ويعمل حساب واحد",
      "ms": 170.0181,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "G3 — الدخول الحيّ بيرفض المطابقة الغامضة برسالة عربية ومفيش حساب بيتعمل",
      "ms": 23.0922,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "G4 — حساب المجال المتوقف والموظف الأرشيف لسه مرفوضين في الدخول الحيّ",
      "ms": 36.1446,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "H1 — المسار محروس: بلا توكن، وبلا users.manage، وبحساب مقفول على فرع",
      "ms": 10.8657,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "H2 — التطبيق محتاج apply=true صريحة، وأي قيمة غير منطقية مرفوضة",
      "ms": 38.7831,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "H3 — قائمة المستخدمين بتعلّم حساب الدومين، ومفيش hash بيخرج",
      "ms": 24.198,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "I1 (CRP3H) — الربط مابيتكتبش على حساب اتنقل لموظف تاني بعد المطابقة (مزامنة ودخول حيّ)، وصاحب الهوية مابيدخلش بهوية غيره",
      "ms": 589.1587,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "I2 (CRP3I) — حساب المجال بيتعمل تحت حجز الموظف: حساب ظهر للموظف بعد المطابقة بيتحكم عليه من جديد، ودخولين مع بعض = حساب واحد",
      "ms": 964.5321,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "NOLDAP — أي محاولة لفتح اتصال LDAP حقيقي بتفشّل الاختبار بصوت عالي",
      "ms": 6729.4431,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "A1 — موظف جديد موجود في الدومين: حساب واحد بالظبط اتعمل واتربط، والرد بيقول كده",
      "ms": 3689.2096,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "A2 — موظف جديد مش في الدومين: اتحفظ عادي، مفيش حساب، والسبب عربي صريح",
      "ms": 143.6054,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "B1 — الدليل واقف أو مش مضبوط أو بيرمي استثناء غريب: الموظف اتحفظ والطلب ناجح",
      "ms": 391.5372,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "B2 — الدليل بطيء: الإضافة بتنجح والحساب بيتعمل، ومفيش فشل ولا نصف عملية",
      "ms": 450.6035,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "C1 — المفتاح مبذور في القاعدة عند الإقلاع بقيمته الافتراضية (مفتوح) بلا أي ترحيل",
      "ms": 3.9509,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "C2 — المفتاح مقفول: مفيش تزويد ومفيش نداء دليل خالص، والموظف اتحفظ وبسبب واضح",
      "ms": 138.408,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "C3 — الزرّ شغّال والمفتاح مقفول (ضغطة بإيد المالك على موظف بالاسم)",
      "ms": 73.3274,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "C4 — فتح المفتاح تاني: التزويد التلقائي رجع في نفس اللحظة بلا إعادة تشغيل",
      "ms": 174.8156,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "D1 — الزرّ بيعمل حساب للموظف المطابق، والضغط تاني مابيغيّرش ولا بايت",
      "ms": 102.933,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "D2 — الزرّ بيربط حساب قائم: العمود الناقص بس، ومفيش دور ولا صلاحيات ولا بريد ولا كلمة مرور بتتغيّر",
      "ms": 125.2213,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "D3 — كل سبب تخطّي/تعارض بيتقال بالاسم وبعربي، ومفيش أي حساب بيتعمل لأي واحد منهم",
      "ms": 124.8651,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "D4 — الدليل الواقف على الزرّ: سبب واضح ومفيش أي كتابة، والموظف المفقود 404",
      "ms": 12.073,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "E1 — الزرّ محروس: بلا توكن، وبلا users.manage، وبحساب مقفول على فرع",
      "ms": 16.4997,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "F1 — الكارت بيقول «مفيش حساب» بصراحة، وبيقول «حساب دومين» و«حساب عندنا» لما يكون فيه",
      "ms": 31.049,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "F2 — الكارت بيتقرا بصلاحية عرض الملف نفسها، مش بـusers.manage، وبلا أي hash",
      "ms": 24.203,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "F3 — عزل الفرع: حساب مقفول على فرع مايقراش كارت موظف فرع تاني، والمفتاح المقفول بيبان في الكارت",
      "ms": 34.6263,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "F4 — المزامنة الجماعية لسه شغّالة زي ما هي جنب الزرّ (معاينة افتراضيًّا)",
      "ms": 17.2849,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "إضافة موظف: الحقول الإجبارية برسائل واضحة، الهوية أو الجواز بأي صيغة وفريدة، ورقم البصمة فريد",
      "ms": 7234.0712,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "تعديل ملف قديم ناقص: باقي الحقول تتحفظ، والمسح أو «موقوف» بلا تواريخ مرفوض، وتغيير الجنسية مابيعيدش فحص الهوية",
      "ms": 128.5968,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "الإيقاف عن العمل: «موقوف» من التواريخ في القائمة والملف، السجل، التداخل، الغياب القديم يُشال، والإنهاء المبكر والإلغاء",
      "ms": 353.2009,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "مراجعة 16 سبتمبر: إيقاف منتهي يتلغى، والتداخل مع إجازة معتمدة أو مسير معتمد مرفوض على SQL حقيقية",
      "ms": 382.9225,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "المسير: أيام الإيقاف تُخصم يومًا بيوم بسطر «أيام إيقاف عن العمل» بلا ازدواج مع إجازة بدون راتب",
      "ms": 858.3283,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "CRP2X-N01: تسجيل إيقاف بيتقاطع مع اعتماد طلب بيغيّر ملف نفس الموظف — الإيقاف بيتعاد بعد التقاطع والاتنين بيكمّلوا",
      "ms": 3048.6299,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "CRP2Y-X-N01: تجديد عقد بيتقاطع مع اعتماد طلب بيغيّر ملف نفس الموظف — التجديد بيتعاد بعد التقاطع والاتنين بيكمّلوا",
      "ms": 5001.9918,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-01: الإرجاع القديم — موظف ملفه مُصفّى بيرجع بسبب مكتوب بس والسبب في سجله، ومن غير تصفية زي ما هو",
      "ms": 6891.0849,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-02: إعادة تعيين بعد سنة — الفترة القديمة اتسجّلت، والمكافأة والرصيد ومعاينة التصفية زي موظف جديد بنفس التاريخ، والمسير والحضور من تاريخ المباشرة",
      "ms": 574.2075,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-03: الرفض — مش منتهي، من غير ملف مقفول، ملف مفتوح أو مجهول، أكتر من نهاية، تاريخ أو سبب غلط، بدري أو بعيد، ومن غير الصلاحية أو برّه النطاق",
      "ms": 668.5861,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-04: المسير — المباشرة بعد شهر الرواتب اللي فيه آخر يوم عمل، ومسير الشهر ده معتمد والموظف فيه، ومسير قديم لسه مااتعتمدش بيمنع",
      "ms": 794.739,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-05: رصيد الإجازات بعد إعادة التعيين — إجازة قديمة بتتلغى مابترجعش على الرصيد الجديد، والترحيل والإقفال والتجديد مابيشوفوش صفوف الفترة المقفولة",
      "ms": 1103.672,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-06: إعادة تعيين تانية بتقفل الفترة التانية بمفتاحها، وطلبين في نفس اللحظة واحد بس بينجح",
      "ms": 1724.3105,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-07: إجازة معتمدة بعد آخر يوم عمل بتمنع إعادة التعيين لحد ما تتلغى، وتاريخ جوه فترة مقفولة مالوش خصم، والخصم والإرجاع مابيستنوش صف موظف ممسوك",
      "ms": 490.9291,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-08: الترحيل السنوي والتجديد اليومي بيحكموا ويكتبوا وصف الموظف ممسوك — مُرحّل الفترة القديمة مايوصلش لرصيد الجديدة",
      "ms": 5172.9317,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-09: حساب المسير بيحكم على موظفيه ببيانات اتقرت بعد قفل المالية — إعادة تعيين اتثبّتت قبل القفل مابتتحسبش بحكم قديم",
      "ms": 345.7532,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-10: مرجع مسير مخفي عن القارئ مابيظهرش في قراءة الفترات ولا في رفض إعادة التعيين — لا شهره ولا نهايته",
      "ms": 326.4242,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-11: أثر تعديل الملف على الرصيد جوه معاملة التعديل وتحت صف الموظف — رصيد افتتاحي من الخدمة القديمة مابيوصلش للفترة الجديدة",
      "ms": 5069.7334,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-12: فحص الرصيد مابيكتبش صف، وصفوف السنة الناقصة تحت صف الموظف — صف بمفتاح ذكرى تعيين قديمة مابيتكتبش بعد إعادة التعيين",
      "ms": 2093.9929,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-13: معالج طلب بيحفظ كيان الموظف كله بيقراه وصفه مقفول — اعتماد طلب قديم عبر إعادة التعيين مابيرجّعش تاريخ التعيين القديم",
      "ms": 1633.6399,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-transfer.integration.cjs",
      "name": "a transfer the administrator files on behalf is approved at once and stores the dated branch and its actual approver while past computeDay retains the historical branch",
      "ms": 7255.592,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-transfer.integration.cjs",
      "name": "a future transfer approved at once changes no employee or org version before its date and concurrent scheduler runs apply it once with the instant approver",
      "ms": 209.6895,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-transfer.integration.cjs",
      "name": "owner-configured automatic transfer records an explicit automatic decision used by scheduled org history",
      "ms": 233.7455,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-transfer.integration.cjs",
      "name": "a financially closed day rolls back transfer, employee, account and approval together — at instant approval and at a pending decision alike",
      "ms": 549.0206,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-transfer.integration.cjs",
      "name": "cross-branch creator and approver cannot bypass scope to move the employee or append org history",
      "ms": 121.7276,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "تحقق حذف قاعدة الاختبار: hr_totp_test_674c91d151488afd",
    "Cleanup verified: hr_totp_migration_test_69400165dc64f2ba is absent from sys.databases.",
    "تحقق حذف قاعدة الاختبار: hr_session_cookie_test_df43c363043702db",
    "تحقق حذف قاعدة الاختبار: hr_user_sessions_test_aa6434a3bf71bab4",
    "{\"rejected\":12,\"attempts\":5,\"locked\":true,\"consumed\":false}",
    "{\"statuses\":[401,401,401,401,401,401,401,401,401,401,401,401],\"attempts\":5,\"locked\":true}",
    "{\"oldConsumeGuardMatches\":1,\"newConsumeGuardMatches\":0}",
    "{\"oldCodeStatus\":401}",
    "{\"statuses\":[200,401,401,401,401,401]}",
    "{\"statuses\":[429,429,429,429,429,200,429,429],\"mails\":1,\"resendCount\":1,\"waitedSeconds\":120,\"messages\":[\"استنى 60 ثانية قبل طلب رمز جديد\"]}",
    "{\"statuses\":[429,429,429,429,429,429,429,429],\"resendCount\":3,\"mails\":3}",
    "Cleanup verified: hr_2fa_race_test_fcf3d1c5f1244eba is absent from sys.databases.",
    "collation db=Arabic_100_CS_AS tempdb=SQL_Latin1_General_CP1_CI_AS compatibility=150",
    "Cleanup verified: hr_roles_collation_test_10dad1fa9b1714b6 removed.",
    "مسارات /payroll/disbursement موجودة — اتفحص حارس payroll.disburse عليها",
    "Cleanup verified: hr_roles_scope_test_a697c1ab25ff0f16 removed.",
    "Cleanup verified: hr_audit_log_test_a3bad418e4d8774f is absent from sys.databases.",
    "Cleanup verified: hr_user_temp_pw_test_d681651f18107f8b removed.",
    "Cleanup verified: hr_domain_sync_test_647ba54339e3289b is absent from sys.databases.",
    "Cleanup verified: hr_domain_autoprov_test_500dc4757db71c06 is absent from sys.databases.",
    "Manual: day rate 9000/30 = 300; suspension 5 days minus 09/07 (already unpaid leave) = 4 × 300 = 1200; leave 2 × 300 = 600; net 9000 − 1800 = 7200.",
    "Cleanup verified: hr_employee_suspension_test_03274f91e42aed96 is absent from sys.databases.",
    "Cleanup verified: hr_employment_periods_test_b7646c8f0c8bfcf6 is absent from sys.databases.",
    "تم التحقق من حذف قاعدة الاختبار: hr_calendar_transfer_test_8ab2eee673f54065",
    "تم التحقق من حذف مرفقات الاختبار المؤقتة.",
    "tests 178",
    "suites 0",
    "pass 178",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 162601.0293"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3j_auth_races_test_51ec44f96bc1a644\"}\n",
    "REVIEW_MEASURE {\"case\":\"reset-promotion-role\",\"currentDecision\":403,\"racingReset\":409,\"enabledAfter\":true,\"versionChanged\":true}\n",
    "REVIEW_MEASURE {\"case\":\"reset-promotion-override\",\"currentDecision\":403,\"racingReset\":409,\"enabledAfter\":true,\"versionChanged\":true}\n",
    "REVIEW_MEASURE {\"case\":\"reset-promotion-direct\",\"currentDecision\":403,\"racingReset\":409,\"enabledAfter\":true,\"versionChanged\":true}\n",
    "REVIEW_MEASURE {\"case\":\"email-activation-race\",\"factorCheck\":1,\"activation\":200,\"verification\":401,\"fullSession\":null,\"newSessionAfterActivation\":false,\"issuerSawEnabled\":false}\n",
    "REVIEW_MEASURE {\"case\":\"email-activation-race\",\"factorCheck\":2,\"activation\":200,\"verification\":401,\"fullSession\":null,\"newSessionAfterActivation\":true,\"issuerSawEnabled\":true}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3j_auth_races_test_51ec44f96bc1a644\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3j_auth_races_test_51ec44f96bc1a644\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3j_auth_test_fbeaca11eb4745da\"}\n",
    "REVIEW_MEASURE {\"case\":\"mfa-reset-stronger-account\",\"passwordReset\":403,\"totpReset\":403,\"enabledAfter\":true}\n",
    "REVIEW_MEASURE {\"case\":\"email-challenge-after-totp-enrollment\",\"verifyStatus\":401,\"unrestrictedAccess\":null}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3j_auth_test_fbeaca11eb4745da\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3j_auth_test_fbeaca11eb4745da\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3j_session_boundary_test_db45ba0ab036f083\"}\n",
    "REVIEW_MEASURE {\"case\":\"post-open-boundary\",\"stage\":\"before-state\",\"rowExistedBeforeActivation\":true,\"activation\":200,\"verification\":401,\"fullSession\":null,\"rowRevoked\":true}\n",
    "REVIEW_MEASURE {\"case\":\"post-open-boundary\",\"stage\":\"after-state\",\"rowExistedBeforeActivation\":true,\"activation\":200,\"verification\":200,\"fullSession\":200,\"rowRevoked\":false}\n",
    "REVIEW_MEASURE {\"case\":\"password-activation-race\",\"activation\":200,\"login\":401,\"newRowAfterActivation\":true,\"rowRevoked\":true,\"issuerSawEnrolled\":true,\"fullSession\":null}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3j_session_boundary_test_db45ba0ab036f083\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3j_session_boundary_test_db45ba0ab036f083\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3j_factor_paths_test_8c4e66615387779a\"}\n",
    "REVIEW_MEASURE {\"case\":\"domain-activation-and-client-factor-proven\",\"activation\":200,\"login\":401,\"tokenIssued\":false,\"activeSessions\":1}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3j_factor_paths_test_8c4e66615387779a\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3j_factor_paths_test_8c4e66615387779a\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3j_password_race_test_fd07b87a05212e8a\"}\n",
    "REVIEW_MEASURE {\"case\":\"password-current-version-stale-authority\",\"mode\":\"role\",\"changePassword\":200,\"dbRole\":\"employee\",\"responseRole\":\"employee\",\"currentVersion\":2,\"versionAfterRevocation\":1,\"privilegedAccess\":403}\n",
    "REVIEW_MEASURE {\"case\":\"password-current-version-stale-authority\",\"mode\":\"legacy-grant\",\"changePassword\":200,\"dbRole\":\"employee\",\"responseRole\":\"employee\",\"currentVersion\":2,\"versionAfterRevocation\":1,\"privilegedAccess\":403}\n",
    "REVIEW_MEASURE {\"case\":\"password-current-version-stale-authority\",\"mode\":\"role-bundle\",\"changePassword\":200,\"dbRole\":\"p3j_password_role_2\",\"responseRole\":\"p3j_password_role_2\",\"currentVersion\":2,\"versionAfterRevocation\":1,\"privilegedAccess\":403}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3j_password_race_test_fd07b87a05212e8a\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3j_password_race_test_fd07b87a05212e8a\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3j_fix_controls_test_aa580287d9f65ccc\"}\n",
    "REVIEW_MEASURE {\"case\":\"temporary-password-batch-rollback\",\"status\":409,\"firstVersion\":0,\"secondVersion\":1,\"passwordsUnchanged\":true,\"temporaryPasswordAudits\":0}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3j_fix_controls_test_aa580287d9f65ccc\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3j_fix_controls_test_aa580287d9f65ccc\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_totp_test_674c91d151488afd\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_totp_test_674c91d151488afd\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_totp_migration_test_69400165dc64f2ba\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_totp_migration_test_69400165dc64f2ba\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_session_cookie_test_df43c363043702db\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_session_cookie_test_df43c363043702db\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_user_sessions_test_aa6434a3bf71bab4\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_user_sessions_test_aa6434a3bf71bab4\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_2fa_race_test_fcf3d1c5f1244eba\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_2fa_race_test_fcf3d1c5f1244eba\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_roles_scope_test_a697c1ab25ff0f16\"}\n",
    "✓ أنواع الطلبات: 68 جديد + 65 سلسلة مخصّصة (الإجمالي 68)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_roles_collation_test_10dad1fa9b1714b6\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_roles_collation_test_10dad1fa9b1714b6\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_roles_scope_test_a697c1ab25ff0f16\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_audit_log_test_a3bad418e4d8774f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_audit_log_test_a3bad418e4d8774f\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_user_temp_pw_test_d681651f18107f8b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_user_temp_pw_test_d681651f18107f8b\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_domain_sync_test_647ba54339e3289b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_domain_sync_test_647ba54339e3289b\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_domain_autoprov_test_500dc4757db71c06\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_domain_autoprov_test_500dc4757db71c06\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_suspension_test_03274f91e42aed96\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_suspension_test_03274f91e42aed96\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employment_periods_test_b7646c8f0c8bfcf6\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employment_periods_test_b7646c8f0c8bfcf6\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_calendar_transfer_test_8ab2eee673f54065\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_calendar_transfer_test_8ab2eee673f54065\"}\n"
  ]
}

module.exports = {
  "selected": [
    "codex-review-p3i-units",
    "codex-review-p3i-auth-races",
    "codex-review-p3i-auth-independent",
    "codex-review-p3i-session-boundary",
    "codex-review-p3i-factor-paths",
    "totp",
    "totp-migration",
    "session-cookie",
    "user-sessions",
    "two-factor-race",
    "roles-scope-presets",
    "audit-log",
    "user-temporary-password",
    "domain-users-sync",
    "domain-autoprovision"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 146,
      "failed": 0,
      "passed": 146,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 146,
      "suites": 0
    },
    "duration_ms": 107337.66
  },
  "results": [
    {
      "file": "totp.test.cjs",
      "name": "TT-01: the RFC 6238 vectors, base32, the clock window, a code only once, and the app link",
      "ms": 2.5122,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.test.cjs",
      "name": "TT-02: the stored secret opens only with the server secret, and any change to it is caught",
      "ms": 1.1721,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.test.cjs",
      "name": "TT-03: an enrolled account is asked for the app code before the mail gate; the code is judged under the account row lock; the session gate; the application clock",
      "ms": 5.4043,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.test.cjs",
      "name": "TT-04: the login step for the app code, the «turn it on first» screen, the security card, the roles setting and the reset action",
      "ms": 4.5712,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions.test.cjs",
      "name": "UT-01: a readable device name from the User-Agent header, and the limits",
      "ms": 0.3737,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions.test.cjs",
      "name": "UT-02: the session number is random and rides in the token; the guard checks it before CSRF; ending is a conditional write by the row's owner",
      "ms": 1.6892,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions.test.cjs",
      "name": "UT-03: the security screen — my sessions, ending one, and its link and title",
      "ms": 2.227,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.test.cjs",
      "name": "SK-01: cookie attributes from the environment, its name, the Set-Cookie value, reading it, and the CSRF verdict",
      "ms": 0.7505,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.test.cjs",
      "name": "SK-02: the server reads Bearer first with one reader for both the token and the verdict, checks CSRF after the account, and hands the cookie over",
      "ms": 1.4291,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.test.cjs",
      "name": "SK-03: the web app keeps no token — nothing in storage, no Authorization header, every call through the session with the CSRF token on writes",
      "ms": 147.627,
      "pass": true,
      "skip": false
    },
    {
      "file": "announcements.test.cjs",
      "name": "AU-01: title, body, dates, the audience text and its branch scope, and when an announcement is live",
      "ms": 1.6955,
      "pass": true,
      "skip": false
    },
    {
      "file": "announcements.test.cjs",
      "name": "AU-02: the module, its permission, guarded routes, writes under the row lock, and the «new announcement» event judged at dispatch, at send and in the list",
      "ms": 3.4605,
      "pass": true,
      "skip": false
    },
    {
      "file": "announcements.test.cjs",
      "name": "AU-03: the announcements screen — the board for everyone, management for the permission holder, the sidebar item and the page title",
      "ms": 1.8633,
      "pass": true,
      "skip": false
    },
    {
      "file": "announcements.test.cjs",
      "name": "AU-04: the attachment is bound once under the row lock and read by the announcement's rule; occasions give the next day without the birth year",
      "ms": 3.9835,
      "pass": true,
      "skip": false
    },
    {
      "file": "document-expiry.test.cjs",
      "name": "DE-01: alert days are read and entered safely, and a document reaches the nearest alert day",
      "ms": 0.5224,
      "pass": true,
      "skip": false
    },
    {
      "file": "document-expiry.test.cjs",
      "name": "DE-02: the new columns stay outside the entities; alerts run under the document row lock; the task and the notice follow the type",
      "ms": 5.6983,
      "pass": true,
      "skip": false
    },
    {
      "file": "document-expiry.test.cjs",
      "name": "DE-03: the settings sit on the document types screen and the report on the employees documents screen",
      "ms": 2.0742,
      "pass": true,
      "skip": false
    },
    {
      "file": "document-expiry.test.cjs",
      "name": "DE-04: the renewal destination is registered with its own form fields and server-written key",
      "ms": 4.7935,
      "pass": true,
      "skip": false
    },
    {
      "file": "team-dashboard.test.cjs",
      "name": "TM-01: the compensation key adds to the standing rule; every shipped role sees the same money columns before and after",
      "ms": 0.2086,
      "pass": true,
      "skip": false
    },
    {
      "file": "team-dashboard.test.cjs",
      "name": "TM-02: the module and the key are registered",
      "ms": 0.9591,
      "pass": true,
      "skip": false
    },
    {
      "file": "team-dashboard.test.cjs",
      "name": "TM-03: the service only reads, uses the standing team definition, and money leaves only with the right and inside the account scope",
      "ms": 0.768,
      "pass": true,
      "skip": false
    },
    {
      "file": "team-dashboard.test.cjs",
      "name": "TM-04: the sidebar item shows for a manager only, and the screen gates the salary column",
      "ms": 1.7729,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-metrics.test.cjs",
      "name": "MX-01: the dictionary holds six metrics with one written definition each, and the rules behind them",
      "ms": 0.262,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-metrics.test.cjs",
      "name": "MX-02: the dashboard and the workforce report read one function, and absence has one condition",
      "ms": 2.2773,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-metrics.test.cjs",
      "name": "MX-03: export tables keep the screen columns, the amount column follows the permission, and dangerous text stays text",
      "ms": 34.4755,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-metrics.test.cjs",
      "name": "MX-04: status and category labels on the server are the labels of the screens",
      "ms": 2.3044,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-metrics.test.cjs",
      "name": "MX-05: the reports screen exports from the server, shows the dictionary strip, and the dashboard shows the active number",
      "ms": 1.6929,
      "pass": true,
      "skip": false
    },
    {
      "file": "saved-reports.test.cjs",
      "name": "SV-01: names, saved filters, due dates and the previous payroll month",
      "ms": 0.4546,
      "pass": true,
      "skip": false
    },
    {
      "file": "saved-reports.test.cjs",
      "name": "SV-02: the job is registered and goes through tick; mail carries the file; the send uses the owner's identity now",
      "ms": 2.4635,
      "pass": true,
      "skip": false
    },
    {
      "file": "saved-reports.test.cjs",
      "name": "SV-03: the reports screen holds the saved reports card with the server's labels",
      "ms": 1.2488,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-01: زرار القائمة في الهيدر (أقل من lg بس) بـaria-label وaria-expanded وبيتحكم في القائمة، والعنوان سطر واحد على الموبايل",
      "ms": 4.5707,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-02: القائمة الجانبية درج تحت lg — مقفول برّه الشاشة ومخفي، مفتوح ظاهر، وكل كلاس جديد max-lg: بس",
      "ms": 2.9083,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-03: AppShell — المحتوى lg:mr-72 وp-4 lg:p-8، خلفية معتمة بتقفل، Esc والانتقال بيقفلوا، وقفل تمرير الصفحة",
      "ms": 0.8379,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-04: CSS المشروع — كل max-lg: جوّه (أقل من 1024px) بس، وlg:mr-72 من 1024 وفوق، وclip للهيدر الثابت على الموبايل بس",
      "ms": 245.2825,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-05: الـviewport: Next بيطلع width=device-width, initial-scale=1 افتراضيًا ومحدش بيغيّره",
      "ms": 55.0393,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-06: شاشات البوابة — مفيش mr-72 ثابت، ولا grid-cols-3+ من غير بديل للشاشة الصغيرة، ولا col-span بيعمل عمود ضمني",
      "ms": 34.2505,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-07: الجداول جوّه overflow-x-auto، والنوافذ جوّه الشاشة بهامش وmax-h وتمرير داخلي",
      "ms": 21.3613,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-08: لوحة الإشعارات جوّه الشاشة على الموبايل، ومنتقي الموظف قايمته مقصوصة على عرض الشاشة",
      "ms": 0.6554,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-09: الطباعة — زرار القائمة مابيتطبعش، وطباعة الهيكل التنظيمي بتلغي هامش القائمة الجديد (lg:mr-72)",
      "ms": 130.361,
      "pass": true,
      "skip": false
    },
    {
      "file": "pwa-ui.test.cjs",
      "name": "PW-01: ملف التعريف — اسم المنتج، البداية والنطاق، standalone، عربي RTL، والأيقونات بمقاساتها وأغراضها",
      "ms": 0.4488,
      "pass": true,
      "skip": false
    },
    {
      "file": "pwa-ui.test.cjs",
      "name": "PW-02: الأيقونات PNG سليمة بالمقاس المكتوب — العادية بزوايا شفافة، و«maskable» وأيقونة iOS من غير شفافية، وبلون الأيقونة",
      "ms": 5.9754,
      "pass": true,
      "skip": false
    },
    {
      "file": "pwa-ui.test.cjs",
      "name": "PW-03: زرار التثبيت — مابيترسمش من غير عرض المتصفح، وبيسمع العرض والتثبيت، ومكانه آخر القايمة قبل «بواسطة»",
      "ms": 1.3571,
      "pass": true,
      "skip": false
    },
    {
      "file": "pwa-ui.test.cjs",
      "name": "PW-04: من غير service worker ولا تخزين مؤقت ولا تغيير في viewport — وخطوة HTTPS مكتوبة في دليل التحديث",
      "ms": 145.1276,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3i-auth-races.integration.cjs",
      "name": "P3I-R-role: reset cannot pass a concurrent privilege promotion through role",
      "ms": 5179.7273,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3i-auth-races.integration.cjs",
      "name": "P3I-R-override: reset cannot pass a concurrent privilege promotion through override",
      "ms": 332.1389,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3i-auth-races.integration.cjs",
      "name": "P3I-R-direct: reset cannot pass a concurrent privilege promotion through direct",
      "ms": 293.7213,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3i-auth-races.integration.cjs",
      "name": "P3I-R-mail-1: activation while email verification is at factor check 1",
      "ms": 428.0424,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3i-auth-races.integration.cjs",
      "name": "P3I-R-mail-2: activation while email verification is at factor check 2",
      "ms": 431.4822,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3i-auth-races.integration.cjs",
      "name": "P3I-R-disabled: a pending TOTP challenge is rejected after disable",
      "ms": 280.0795,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3i-auth-independent.integration.cjs",
      "name": "P3I-A01: a delegated users manager cannot reset MFA on a stronger administrative account",
      "ms": 5357.3514,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3i-auth-independent.integration.cjs",
      "name": "P3I-A02: an email challenge opened before enrollment cannot mint a new unrestricted session after TOTP activation",
      "ms": 413.5946,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3i-auth-independent.integration.cjs",
      "name": "P3I-A03: required setup gate and current cookie CSRF isolate sessions and mutation routes",
      "ms": 335.2184,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3i-session-boundary.integration.cjs",
      "name": "P3I-S-before-state: email activation on each side of the post-open factor read",
      "ms": 5817.3658,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3i-session-boundary.integration.cjs",
      "name": "P3I-S-after-state: email activation on each side of the post-open factor read",
      "ms": 500.7642,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3i-session-boundary.integration.cjs",
      "name": "P3I-S-password: password-only login cannot open a new full session after TOTP activation committed",
      "ms": 311.1593,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3i-factor-paths.integration.cjs",
      "name": "P3I-F-domain: domain login rechecks enrollment after opening the new session",
      "ms": 5701.1235,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3i-factor-paths.integration.cjs",
      "name": "P3I-F-client: a client cannot claim factorProven in a password login",
      "ms": 86.4499,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.integration.cjs",
      "name": "TP-01: an account turns the authenticator on by confirming a code; the secret is shown once and stored sealed",
      "ms": 7803.9063,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.integration.cjs",
      "name": "TP-02: an enrolled account logs in with the app code as the second step — once, with no mail, and wrong codes lock the check for a while",
      "ms": 1478.2622,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.integration.cjs",
      "name": "TP-03: a role named in the setting must turn the authenticator on before anything else, and cannot turn it off",
      "ms": 995.1058,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.integration.cjs",
      "name": "TP-04: a manager resets an account's authenticator inside his branches; a system admin's only by a system admin",
      "ms": 1393.7356,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.integration.cjs",
      "name": "TP-05 (CRP3D): the reset keeps the password-takeover boundary and is re-judged under the account row lock; a mail code opened before enrolment opens nothing after it",
      "ms": 1517.5906,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.integration.cjs",
      "name": "TP-06 (CRP3E): a reset is refused when the account version moved after the judgment; a mail-code login that the enrolment overtakes opens no session",
      "ms": 1578.9622,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.integration.cjs",
      "name": "TP-07 (CRP3F): a stale account or role save cannot write over a promotion, and a password-only login that the enrolment overtakes opens no session",
      "ms": 1300.3115,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.integration.cjs",
      "name": "TP-08 (CRP3G): a password change issues its session from the account as it is now, and a role being assigned is pinned until the save",
      "ms": 1105.7268,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.integration.cjs",
      "name": "TP-09 (CRP3H): a role without a row is pinned for an assignment, and an override replacement is refused when its basis moved",
      "ms": 2371.5542,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp-migration.integration.cjs",
      "name": "TPM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 8115.28,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp-migration.integration.cjs",
      "name": "TPM-2: من غير الجدول الدخول زي الأول حتى للدور الإلزامي؛ وجدول بشكل تاني بيوقّف الترحيل؛ والمُرحّل بيعمل نفس الشكل والفرق صفر",
      "ms": 5562.2441,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp-migration.integration.cjs",
      "name": "TPM-3: آمن للتكرار",
      "ms": 855.1105,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-01: the plain login is unchanged — the token in the body, no cookie, and a Bearer write needs no CSRF token",
      "ms": 7154.58,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-02: a cookie session keeps the token away from the page, and a write through it must carry the session's CSRF token",
      "ms": 418.4516,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-03: logout clears the cookie only for a request that carries it",
      "ms": 97.0281,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-04: changing the password re-issues the session in the shape the request came in, and the temporary-password gate holds through the cookie",
      "ms": 948.1112,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-05: the second login step hands the session over as a cookie when asked, and the pending step never sets one",
      "ms": 478.8553,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-06: on HTTPS the cookie is Secure under the __Host- name, and only that name is read",
      "ms": 348.3882,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-07 (CRP3D-N02): a cookie logout sent from another site is refused unless it carries the session's CSRF token",
      "ms": 207.4011,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions.integration.cjs",
      "name": "US-01: every login opens a session whose number rides in the token, and the owner sees his own open sessions only",
      "ms": 6992.5846,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions.integration.cjs",
      "name": "US-02: ending one session kills its token only; another account's session answers like a missing one",
      "ms": 724.7191,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions.integration.cjs",
      "name": "US-03: logout ends the session on the server — its token no longer passes, in a header or in a cookie",
      "ms": 215.5017,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions.integration.cjs",
      "name": "US-04: a password change closes every session row; a dead or foreign session number never passes; a token without a number keeps the standing rule",
      "ms": 791.6059,
      "pass": true,
      "skip": false
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R1 — جدول الإعدادات مش موجود لحظيًّا: الدخول مرفوض 503 بلا جلسة ولا بريد ولا حالة معلَّقة",
      "ms": 7762.5858,
      "pass": true,
      "skip": false
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R2 — 12 تحقق متوازي برمز غلط على القاعدة: العدّاد 5 بالظبط، القفل مكتوب، والرمز الصح مرفوض",
      "ms": 803.2657,
      "pass": true,
      "skip": false
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R3 — ونفس الشيء عبر HTTP: 12 طلب تحقق في نفس اللحظة بيقفلوا الحالة عند الحد",
      "ms": 786.7121,
      "pass": true,
      "skip": false
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R4 — الحد المعلن نفسه: 4 غلط متوازية مابتقفلش، والخامسة هي اللي تقفل",
      "ms": 430.0055,
      "pass": true,
      "skip": false
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R5 — إعادة إرسال وسط تحقق جارٍ: الرمز القديم مرفوض، الحالة مش مستهلكة، والجديد شغّال",
      "ms": 332.3619,
      "pass": true,
      "skip": false
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R6 — 6 تحققات متوازية بالرمز الصح: جلسة واحدة بالظبط والباقي 401",
      "ms": 442.9745,
      "pass": true,
      "skip": false
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R7 — 8 إعادات إرسال في نفس اللحظة: رسالة واحدة بالظبط، والعدّاد مش بيضيع، وإجمالي الرسايل = الحد المعلن",
      "ms": 1517.4763,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "migration 064 through the real migrator: adds the column, inserts missing roles, trims only rows that still equal the shipped preset, kills only changed sessions, and re-runs change nothing",
      "ms": 12060.8534,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "migration 064 on a production-shaped database: SQL Server 2019 compatibility level and a database collation that differs from tempdb",
      "ms": 571.7087,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "customised rows: the screen shows exactly what differs from the approved bundle, the row keeps its old power until fixed, and resetting it to the shipped preset lets the migration trim it",
      "ms": 318.6893,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "مسؤول الأصول: registers assets, hands custody over, receives it back and transfers it — and gets 403 on money, employee files, attendance, requests and settings",
      "ms": 457.5192,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "approve.custody finally has a carrier: the asset officer decides the «أمين العهدة» step end to end; the HR officer and the read-only role cannot decide anything",
      "ms": 445.184,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "مسؤول موارد بشرية: reads every HR module of his branch and cannot edit, cancel, approve or do anything an HR manager does",
      "ms": 569.2215,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "مسؤول صرف الرواتب: sees payroll runs and carries the disbursement permission — cannot calculate, approve, pay, reopen, cancel or touch any other module",
      "ms": 267.5884,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "trimmed presets behave: payroll_manager calculates but never approves or pays; read_only reads and never writes or opens the bank sheet; data_entry edits and never archives",
      "ms": 256.432,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "«نطاقه: كل الفروع»: entity → JWT → guard. On = every branch and company-wide writes WITH the permission, refused WITHOUT it; off = own branch; the token dies on every change",
      "ms": 459.5944,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "only the super admin grants it: an HR manager cannot switch it on or off, cannot create an account with it, and cannot manage an account that has it",
      "ms": 336.0878,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "fail-closed stays: a legacy account with no branch still sees nothing and writes nothing company-wide, whatever permissions it carries",
      "ms": 206.9978,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "permissions screen API: the whole registry with module, description and carriers; orphans flagged; copy a role; effective = role ∪ grants − revokes",
      "ms": 278.0726,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-01 (معيار الخطة): تغيير آيبان (قبل وبعد متخفيين)، وقفل وفتح موديول، وتصدير تقرير رواتب — التلاتة في السجل بمين والـIP",
      "ms": 6820.5117,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-02: الدخول، والإعداد بقيمته قبل وبعد (والمفتاح الحساس نجوم)، والدور بصلاحياته، ومنح الحساب، وحدث المسير — كلهم في السجل",
      "ms": 194.7434,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-03: عملية رجعت (rollback) مالهاش سطر",
      "ms": 31.3228,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-04: البحث بصلاحية «سجل التدقيق» وبنطاق الفرع، والاحتفاظ: القديم في «منتهي الاحتفاظ» بس",
      "ms": 157.5807,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-05 (CRP2A-B01): فشل سطر التدقيق بيرجّع التغيير نفسه — منح الحساب وتعديل الدور، ومعاهم إبطال الجلسات",
      "ms": 206.322,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-temporary-password.integration.cjs",
      "name": "the importer's unusable hash never logs in (no guess works, generic 401)",
      "ms": 10800.4823,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-temporary-password.integration.cjs",
      "name": "users list flags migrated accounts without a password, never leaks hashes, respects branch scope",
      "ms": 53.5212,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-temporary-password.integration.cjs",
      "name": "bulk temporary password: permission, branch scope, takeover and self guards are all-or-nothing",
      "ms": 105.6973,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-temporary-password.integration.cjs",
      "name": "bulk set → forced change on login → new password unlocks the system",
      "ms": 870.9288,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-temporary-password.integration.cjs",
      "name": "single reset is temporary by default, can be made permanent, and the flag needs a password",
      "ms": 533.1954,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-temporary-password.integration.cjs",
      "name": "migration 056 is additive, idempotent, SQL Server 2019-safe and matches the TypeORM schema",
      "ms": 928.0044,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "NOLDAP — أي محاولة لفتح اتصال LDAP حقيقي بتفشّل الاختبار بصوت عالي",
      "ms": 7105.4292,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "A1 — المعاينة مفيش فيها أي كتابة: لقطة جدول المستخدمين قبلها وبعدها متطابقة بالحرف",
      "ms": 26.9197,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "A2 — المعاينة بتقول اللي هيحصل بالظبط: الحسابات الجديدة والربط بالاسم والكود",
      "ms": 11.297,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "B1 — المطابقة برقم البصمة شغّالة في الاتجاهين حتى مع الأصفار البادئة والمسافات",
      "ms": 10.3643,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "B2 — الغموض مرفوض بالاسم والكود، ومفيش تخمين ومفيش حساب",
      "ms": 9.3401,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "B3 — كل سبب تخطّي/تعارض بيطلع على الحساب الصح",
      "ms": 10.5853,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "C1 — التطبيق بيعمل الحسابات المتوقعة بالظبط: بلا كلمة مرور، بالـGUID، بأقل دور، بفرع الموظف",
      "ms": 20499.5661,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "D1 — حساب قائم يُربط ولا يتكرر، ومفيش دور ولا صلاحيات ولا بريد ولا كلمة مرور بتتغيّر",
      "ms": 93.4948,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "E1 — تعارض الـGUID بيتقال ومايتكتبش فوقه، والحساب المعطّل والبريد المحجوز مالهمش أي أثر",
      "ms": 21.2384,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "F1 — تمرير تاني (وثالت): مفيش إنشاء ولا ربط، ولقطة الجدول متطابقة بالحرف",
      "ms": 29.1424,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "G1 — الحساب المتزامن بيدخل بحساب المجال ومفيش حساب تاني بيتعمل",
      "ms": 75.2879,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "G2 — الدخول الحيّ كسب خطوة رقم البصمة: حساب مجال ما اتزامنش بيطابق بالبصمة ويعمل حساب واحد",
      "ms": 149.4185,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "G3 — الدخول الحيّ بيرفض المطابقة الغامضة برسالة عربية ومفيش حساب بيتعمل",
      "ms": 19.4639,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "G4 — حساب المجال المتوقف والموظف الأرشيف لسه مرفوضين في الدخول الحيّ",
      "ms": 31.1878,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "H1 — المسار محروس: بلا توكن، وبلا users.manage، وبحساب مقفول على فرع",
      "ms": 10.4851,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "H2 — التطبيق محتاج apply=true صريحة، وأي قيمة غير منطقية مرفوضة",
      "ms": 36.8342,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "H3 — قائمة المستخدمين بتعلّم حساب الدومين، ومفيش hash بيخرج",
      "ms": 18.4063,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "I1 (CRP3H) — الربط مابيتكتبش على حساب اتنقل لموظف تاني بعد المطابقة (مزامنة ودخول حيّ)، وصاحب الهوية مابيدخلش بهوية غيره",
      "ms": 579.946,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "NOLDAP — أي محاولة لفتح اتصال LDAP حقيقي بتفشّل الاختبار بصوت عالي",
      "ms": 7065.3061,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "A1 — موظف جديد موجود في الدومين: حساب واحد بالظبط اتعمل واتربط، والرد بيقول كده",
      "ms": 3724.2558,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "A2 — موظف جديد مش في الدومين: اتحفظ عادي، مفيش حساب، والسبب عربي صريح",
      "ms": 143.9341,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "B1 — الدليل واقف أو مش مضبوط أو بيرمي استثناء غريب: الموظف اتحفظ والطلب ناجح",
      "ms": 372.3931,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "B2 — الدليل بطيء: الإضافة بتنجح والحساب بيتعمل، ومفيش فشل ولا نصف عملية",
      "ms": 429.3514,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "C1 — المفتاح مبذور في القاعدة عند الإقلاع بقيمته الافتراضية (مفتوح) بلا أي ترحيل",
      "ms": 3.3894,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "C2 — المفتاح مقفول: مفيش تزويد ومفيش نداء دليل خالص، والموظف اتحفظ وبسبب واضح",
      "ms": 128.6721,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "C3 — الزرّ شغّال والمفتاح مقفول (ضغطة بإيد المالك على موظف بالاسم)",
      "ms": 65.6414,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "C4 — فتح المفتاح تاني: التزويد التلقائي رجع في نفس اللحظة بلا إعادة تشغيل",
      "ms": 172.8408,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "D1 — الزرّ بيعمل حساب للموظف المطابق، والضغط تاني مابيغيّرش ولا بايت",
      "ms": 89.624,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "D2 — الزرّ بيربط حساب قائم: العمود الناقص بس، ومفيش دور ولا صلاحيات ولا بريد ولا كلمة مرور بتتغيّر",
      "ms": 130.5901,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "D3 — كل سبب تخطّي/تعارض بيتقال بالاسم وبعربي، ومفيش أي حساب بيتعمل لأي واحد منهم",
      "ms": 123.0412,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "D4 — الدليل الواقف على الزرّ: سبب واضح ومفيش أي كتابة، والموظف المفقود 404",
      "ms": 13.5387,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "E1 — الزرّ محروس: بلا توكن، وبلا users.manage، وبحساب مقفول على فرع",
      "ms": 18.7831,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "F1 — الكارت بيقول «مفيش حساب» بصراحة، وبيقول «حساب دومين» و«حساب عندنا» لما يكون فيه",
      "ms": 34.1726,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "F2 — الكارت بيتقرا بصلاحية عرض الملف نفسها، مش بـusers.manage، وبلا أي hash",
      "ms": 25.4017,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "F3 — عزل الفرع: حساب مقفول على فرع مايقراش كارت موظف فرع تاني، والمفتاح المقفول بيبان في الكارت",
      "ms": 34.6496,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "F4 — المزامنة الجماعية لسه شغّالة زي ما هي جنب الزرّ (معاينة افتراضيًّا)",
      "ms": 19.6564,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "تحقق حذف قاعدة الاختبار: hr_totp_test_47d597f25dffdf54",
    "Cleanup verified: hr_totp_migration_test_cdac046c55ee80f8 is absent from sys.databases.",
    "تحقق حذف قاعدة الاختبار: hr_session_cookie_test_0f1956a921b3b546",
    "تحقق حذف قاعدة الاختبار: hr_user_sessions_test_e6fd5488a43cb1c2",
    "{\"rejected\":12,\"attempts\":5,\"locked\":true,\"consumed\":false}",
    "{\"statuses\":[401,401,401,401,401,401,401,401,401,401,401,401],\"attempts\":5,\"locked\":true}",
    "{\"oldConsumeGuardMatches\":1,\"newConsumeGuardMatches\":0}",
    "{\"oldCodeStatus\":401}",
    "{\"statuses\":[200,401,401,401,401,401]}",
    "{\"statuses\":[429,200,429,429,429,429,429,429],\"mails\":1,\"resendCount\":1,\"waitedSeconds\":120,\"messages\":[\"استنى 60 ثانية قبل طلب رمز جديد\"]}",
    "{\"statuses\":[429,429,429,429,429,429,429,429],\"resendCount\":3,\"mails\":3}",
    "Cleanup verified: hr_2fa_race_test_9ef9046ad1d55af1 is absent from sys.databases.",
    "collation db=Arabic_100_CS_AS tempdb=SQL_Latin1_General_CP1_CI_AS compatibility=150",
    "Cleanup verified: hr_roles_collation_test_f5a387aec5b941e2 removed.",
    "مسارات /payroll/disbursement موجودة — اتفحص حارس payroll.disburse عليها",
    "Cleanup verified: hr_roles_scope_test_5fabe3b1ab4ec509 removed.",
    "Cleanup verified: hr_audit_log_test_cd60ef8f46e07485 is absent from sys.databases.",
    "Cleanup verified: hr_user_temp_pw_test_f0b765dc51095373 removed.",
    "Cleanup verified: hr_domain_sync_test_277f4d4226ba520b is absent from sys.databases.",
    "Cleanup verified: hr_domain_autoprov_test_61ac9f5031155240 is absent from sys.databases.",
    "tests 146",
    "suites 0",
    "pass 146",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 107337.66"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3i_auth_races_test_435782d8488c5459\"}\n",
    "REVIEW_MEASURE {\"case\":\"reset-promotion-role\",\"currentDecision\":403,\"racingReset\":409,\"enabledAfter\":true,\"versionChanged\":true}\n",
    "REVIEW_MEASURE {\"case\":\"reset-promotion-override\",\"currentDecision\":403,\"racingReset\":409,\"enabledAfter\":true,\"versionChanged\":true}\n",
    "REVIEW_MEASURE {\"case\":\"reset-promotion-direct\",\"currentDecision\":403,\"racingReset\":409,\"enabledAfter\":true,\"versionChanged\":true}\n",
    "REVIEW_MEASURE {\"case\":\"email-activation-race\",\"factorCheck\":1,\"activation\":200,\"verification\":401,\"fullSession\":null,\"newSessionAfterActivation\":false,\"issuerSawEnabled\":false}\n",
    "REVIEW_MEASURE {\"case\":\"email-activation-race\",\"factorCheck\":2,\"activation\":200,\"verification\":401,\"fullSession\":null,\"newSessionAfterActivation\":true,\"issuerSawEnabled\":true}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3i_auth_races_test_435782d8488c5459\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3i_auth_races_test_435782d8488c5459\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3i_auth_test_4bb5d63b5cdc61c7\"}\n",
    "REVIEW_MEASURE {\"case\":\"mfa-reset-stronger-account\",\"passwordReset\":403,\"totpReset\":403,\"enabledAfter\":true}\n",
    "REVIEW_MEASURE {\"case\":\"email-challenge-after-totp-enrollment\",\"verifyStatus\":401,\"unrestrictedAccess\":null}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3i_auth_test_4bb5d63b5cdc61c7\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3i_auth_test_4bb5d63b5cdc61c7\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3i_session_boundary_test_087b118d1bcb4760\"}\n",
    "REVIEW_MEASURE {\"case\":\"post-open-boundary\",\"stage\":\"before-state\",\"rowExistedBeforeActivation\":true,\"activation\":200,\"verification\":401,\"fullSession\":null,\"rowRevoked\":true}\n",
    "REVIEW_MEASURE {\"case\":\"post-open-boundary\",\"stage\":\"after-state\",\"rowExistedBeforeActivation\":true,\"activation\":200,\"verification\":200,\"fullSession\":200,\"rowRevoked\":false}\n",
    "REVIEW_MEASURE {\"case\":\"password-activation-race\",\"activation\":200,\"login\":401,\"newRowAfterActivation\":true,\"rowRevoked\":true,\"issuerSawEnrolled\":true,\"fullSession\":null}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3i_session_boundary_test_087b118d1bcb4760\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3i_session_boundary_test_087b118d1bcb4760\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3i_factor_paths_test_e5d38d6a356ffafd\"}\n",
    "REVIEW_MEASURE {\"case\":\"domain-activation-and-client-factor-proven\",\"activation\":200,\"login\":401,\"tokenIssued\":false,\"activeSessions\":1}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3i_factor_paths_test_e5d38d6a356ffafd\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3i_factor_paths_test_e5d38d6a356ffafd\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_totp_test_47d597f25dffdf54\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_totp_test_47d597f25dffdf54\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_totp_migration_test_cdac046c55ee80f8\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_totp_migration_test_cdac046c55ee80f8\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_session_cookie_test_0f1956a921b3b546\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_session_cookie_test_0f1956a921b3b546\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_user_sessions_test_e6fd5488a43cb1c2\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_user_sessions_test_e6fd5488a43cb1c2\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_2fa_race_test_9ef9046ad1d55af1\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_2fa_race_test_9ef9046ad1d55af1\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_roles_scope_test_5fabe3b1ab4ec509\"}\n",
    "✓ أنواع الطلبات: 68 جديد + 65 سلسلة مخصّصة (الإجمالي 68)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_roles_collation_test_f5a387aec5b941e2\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_roles_collation_test_f5a387aec5b941e2\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_roles_scope_test_5fabe3b1ab4ec509\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_audit_log_test_cd60ef8f46e07485\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_audit_log_test_cd60ef8f46e07485\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_user_temp_pw_test_f0b765dc51095373\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_user_temp_pw_test_f0b765dc51095373\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_domain_sync_test_277f4d4226ba520b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_domain_sync_test_277f4d4226ba520b\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_domain_autoprov_test_61ac9f5031155240\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_domain_autoprov_test_61ac9f5031155240\"}\n"
  ]
}

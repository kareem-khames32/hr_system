module.exports = {
  "target": "0f6f37ed6116d80f3f91de2440ffa8e4992bda1a",
  "note": "Latest execution for each unchanged test name; initial setup and interrupted-run failures superseded by the listed later runs.",
  "sources": [
    "regression",
    "closure",
    "auth-races",
    "final-races",
    "reports-final"
  ],
  "counts": {
    "tests": 93,
    "passed": 90,
    "failed": 3
  },
  "results": [
    {
      "file": "totp.integration.cjs",
      "name": "TP-01: an account turns the authenticator on by confirming a code; the secret is shown once and stored sealed",
      "ms": 11165.5305,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "totp.integration.cjs",
      "name": "TP-02: an enrolled account logs in with the app code as the second step — once, with no mail, and wrong codes lock the check for a while",
      "ms": 2013.0776,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "totp.integration.cjs",
      "name": "TP-03: a role named in the setting must turn the authenticator on before anything else, and cannot turn it off",
      "ms": 1208.15,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "totp.integration.cjs",
      "name": "TP-04: a manager resets an account's authenticator inside his branches; a system admin's only by a system admin",
      "ms": 1740.0602,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "totp.integration.cjs",
      "name": "TP-05 (CRP3D): the reset keeps the password-takeover boundary and is re-judged under the account row lock; a mail code opened before enrolment opens nothing after it",
      "ms": 2428.5139,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-01: the plain login is unchanged — the token in the body, no cookie, and a Bearer write needs no CSRF token",
      "ms": 11036.5321,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-02: a cookie session keeps the token away from the page, and a write through it must carry the session's CSRF token",
      "ms": 666.8667,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-03: logout clears the cookie only for a request that carries it",
      "ms": 135.0815,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-04: changing the password re-issues the session in the shape the request came in, and the temporary-password gate holds through the cookie",
      "ms": 1334.9329,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-05: the second login step hands the session over as a cookie when asked, and the pending step never sets one",
      "ms": 697.2506,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-06: on HTTPS the cookie is Secure under the __Host- name, and only that name is read",
      "ms": 458.5409,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-07 (CRP3D-N02): a cookie logout sent from another site is refused unless it carries the session's CSRF token",
      "ms": 249.0023,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "user-sessions.integration.cjs",
      "name": "US-01: every login opens a session whose number rides in the token, and the owner sees his own open sessions only",
      "ms": 11465.7079,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "user-sessions.integration.cjs",
      "name": "US-02: ending one session kills its token only; another account's session answers like a missing one",
      "ms": 1639.7952,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "user-sessions.integration.cjs",
      "name": "US-03: logout ends the session on the server — its token no longer passes, in a header or in a cookie",
      "ms": 629.5317,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "user-sessions.integration.cjs",
      "name": "US-04: a password change closes every session row; a dead or foreign session number never passes; a token without a number keeps the standing rule",
      "ms": 1744.1267,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R1 — جدول الإعدادات مش موجود لحظيًّا: الدخول مرفوض 503 بلا جلسة ولا بريد ولا حالة معلَّقة",
      "ms": 12572.0746,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R2 — 12 تحقق متوازي برمز غلط على القاعدة: العدّاد 5 بالظبط، القفل مكتوب، والرمز الصح مرفوض",
      "ms": 1175.811,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R3 — ونفس الشيء عبر HTTP: 12 طلب تحقق في نفس اللحظة بيقفلوا الحالة عند الحد",
      "ms": 5477.4386,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R4 — الحد المعلن نفسه: 4 غلط متوازية مابتقفلش، والخامسة هي اللي تقفل",
      "ms": 913.5524,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R5 — إعادة إرسال وسط تحقق جارٍ: الرمز القديم مرفوض، الحالة مش مستهلكة، والجديد شغّال",
      "ms": 24091.0931,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R6 — 6 تحققات متوازية بالرمز الصح: جلسة واحدة بالظبط والباقي 401",
      "ms": 949.5126,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R7 — 8 إعادات إرسال في نفس اللحظة: رسالة واحدة بالظبط، والعدّاد مش بيضيع، وإجمالي الرسايل = الحد المعلن",
      "ms": 16758373.0598,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "document-expiry.integration.cjs",
      "name": "DX-01: a document type carries its expiry settings; a type that expires makes the date required",
      "ms": 7065.9442,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-auth-races.cjs"
    },
    {
      "file": "document-expiry.integration.cjs",
      "name": "DX-02: a document reaching an alert day raises one event, notifies its owner and opens one renewal task on the responsible role",
      "ms": 713.076,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-auth-races.cjs"
    },
    {
      "file": "document-expiry.integration.cjs",
      "name": "DX-03: the expiring and expired report follows the branch scope, and renewing a document closes its renewal task",
      "ms": 166.5618,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-auth-races.cjs"
    },
    {
      "file": "document-expiry.integration.cjs",
      "name": "DX-04: an approved renewal request moves the expiry date of the requester's document and closes its renewal task",
      "ms": 534.8004,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-auth-races.cjs"
    },
    {
      "file": "document-expiry.integration.cjs",
      "name": "DX-05 (CRP3D-N01): an alert for a document that a newer one already replaced is neither dispatched nor mailed",
      "ms": 195.5888,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-auth-races.cjs"
    },
    {
      "file": "team-dashboard.integration.cjs",
      "name": "TD-01: a team leader with the plain employee role sees his own team only, without salaries; the module is closed until opened",
      "ms": 9817.3778,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "team-dashboard.integration.cjs",
      "name": "TD-02: a department head sees the whole tree under him, with direct reports marked and today's leave counted",
      "ms": 108.9838,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "team-dashboard.integration.cjs",
      "name": "TD-03: salaries appear only with the compensation right, and only for members inside the account's branch scope",
      "ms": 135.8704,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "team-dashboard.integration.cjs",
      "name": "TD-04 (CRP3D): a unit name follows the unit's current branch — a department moved outside the reader's branches is not named",
      "ms": 170.4289,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "totp.test.cjs",
      "name": "TT-01: the RFC 6238 vectors, base32, the clock window, a code only once, and the app link",
      "ms": 2.2533,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "totp.test.cjs",
      "name": "TT-02: the stored secret opens only with the server secret, and any change to it is caught",
      "ms": 1.6919,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "totp.test.cjs",
      "name": "TT-03: an enrolled account is asked for the app code before the mail gate; the code is judged under the account row lock; the session gate; the application clock",
      "ms": 3.8059,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "totp.test.cjs",
      "name": "TT-04: the login step for the app code, the «turn it on first» screen, the security card, the roles setting and the reset action",
      "ms": 5.3644,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "user-sessions.test.cjs",
      "name": "UT-01: a readable device name from the User-Agent header, and the limits",
      "ms": 0.4066,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "user-sessions.test.cjs",
      "name": "UT-02: the session number is random and rides in the token; the guard checks it before CSRF; ending is a conditional write by the row's owner",
      "ms": 1.752,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "user-sessions.test.cjs",
      "name": "UT-03: the security screen — my sessions, ending one, and its link and title",
      "ms": 1.9426,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "session-cookie.test.cjs",
      "name": "SK-01: cookie attributes from the environment, its name, the Set-Cookie value, reading it, and the CSRF verdict",
      "ms": 0.7252,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "session-cookie.test.cjs",
      "name": "SK-02: the server reads Bearer first with one reader for both the token and the verdict, checks CSRF after the account, and hands the cookie over",
      "ms": 4.986,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "session-cookie.test.cjs",
      "name": "SK-03: the web app keeps no token — nothing in storage, no Authorization header, every call through the session with the CSRF token on writes",
      "ms": 172.0763,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "announcements.test.cjs",
      "name": "AU-01: title, body, dates, the audience text and its branch scope, and when an announcement is live",
      "ms": 1.6436,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "announcements.test.cjs",
      "name": "AU-02: the module, its permission, guarded routes, writes under the row lock, and the «new announcement» event judged at dispatch, at send and in the list",
      "ms": 2.1608,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "announcements.test.cjs",
      "name": "AU-03: the announcements screen — the board for everyone, management for the permission holder, the sidebar item and the page title",
      "ms": 2.4805,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "announcements.test.cjs",
      "name": "AU-04: the attachment is bound once under the row lock and read by the announcement's rule; occasions give the next day without the birth year",
      "ms": 4.4372,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "document-expiry.test.cjs",
      "name": "DE-01: alert days are read and entered safely, and a document reaches the nearest alert day",
      "ms": 0.5656,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "document-expiry.test.cjs",
      "name": "DE-02: the new columns stay outside the entities; alerts run under the document row lock; the task and the notice follow the type",
      "ms": 2.5,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "document-expiry.test.cjs",
      "name": "DE-03: the settings sit on the document types screen and the report on the employees documents screen",
      "ms": 2.1276,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "document-expiry.test.cjs",
      "name": "DE-04: the renewal destination is registered with its own form fields and server-written key",
      "ms": 4.3257,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "team-dashboard.test.cjs",
      "name": "TM-01: the compensation key adds to the standing rule; every shipped role sees the same money columns before and after",
      "ms": 0.1977,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "team-dashboard.test.cjs",
      "name": "TM-02: the module and the key are registered",
      "ms": 0.9311,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "team-dashboard.test.cjs",
      "name": "TM-03: the service only reads, uses the standing team definition, and money leaves only with the right and inside the account scope",
      "ms": 0.7723,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "team-dashboard.test.cjs",
      "name": "TM-04: the sidebar item shows for a manager only, and the screen gates the salary column",
      "ms": 2.0703,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "report-metrics.test.cjs",
      "name": "MX-01: the dictionary holds six metrics with one written definition each, and the rules behind them",
      "ms": 0.3344,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "report-metrics.test.cjs",
      "name": "MX-02: the dashboard and the workforce report read one function, and absence has one condition",
      "ms": 1.5202,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "report-metrics.test.cjs",
      "name": "MX-03: export tables keep the screen columns, the amount column follows the permission, and dangerous text stays text",
      "ms": 35.3041,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "report-metrics.test.cjs",
      "name": "MX-04: status and category labels on the server are the labels of the screens",
      "ms": 1.6764,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "report-metrics.test.cjs",
      "name": "MX-05: the reports screen exports from the server, shows the dictionary strip, and the dashboard shows the active number",
      "ms": 1.4383,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "saved-reports.test.cjs",
      "name": "SV-01: names, saved filters, due dates and the previous payroll month",
      "ms": 0.3915,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "saved-reports.test.cjs",
      "name": "SV-02: the job is registered and goes through tick; mail carries the file; the send uses the owner's identity now",
      "ms": 1.8266,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "saved-reports.test.cjs",
      "name": "SV-03: the reports screen holds the saved reports card with the server's labels",
      "ms": 1.2316,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-01: زرار القائمة في الهيدر (أقل من lg بس) بـaria-label وaria-expanded وبيتحكم في القائمة، والعنوان سطر واحد على الموبايل",
      "ms": 4.3806,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-02: القائمة الجانبية درج تحت lg — مقفول برّه الشاشة ومخفي، مفتوح ظاهر، وكل كلاس جديد max-lg: بس",
      "ms": 2.9059,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-03: AppShell — المحتوى lg:mr-72 وp-4 lg:p-8، خلفية معتمة بتقفل، Esc والانتقال بيقفلوا، وقفل تمرير الصفحة",
      "ms": 0.688,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-04: CSS المشروع — كل max-lg: جوّه (أقل من 1024px) بس، وlg:mr-72 من 1024 وفوق، وclip للهيدر الثابت على الموبايل بس",
      "ms": 261.8162,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-05: الـviewport: Next بيطلع width=device-width, initial-scale=1 افتراضيًا ومحدش بيغيّره",
      "ms": 68.0797,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-06: شاشات البوابة — مفيش mr-72 ثابت، ولا grid-cols-3+ من غير بديل للشاشة الصغيرة، ولا col-span بيعمل عمود ضمني",
      "ms": 30.1957,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-07: الجداول جوّه overflow-x-auto، والنوافذ جوّه الشاشة بهامش وmax-h وتمرير داخلي",
      "ms": 22.2997,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-08: لوحة الإشعارات جوّه الشاشة على الموبايل، ومنتقي الموظف قايمته مقصوصة على عرض الشاشة",
      "ms": 0.9182,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-09: الطباعة — زرار القائمة مابيتطبعش، وطباعة الهيكل التنظيمي بتلغي هامش القائمة الجديد (lg:mr-72)",
      "ms": 128.6319,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "pwa-ui.test.cjs",
      "name": "PW-01: ملف التعريف — اسم المنتج، البداية والنطاق، standalone، عربي RTL، والأيقونات بمقاساتها وأغراضها",
      "ms": 0.481,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "pwa-ui.test.cjs",
      "name": "PW-02: الأيقونات PNG سليمة بالمقاس المكتوب — العادية بزوايا شفافة، و«maskable» وأيقونة iOS من غير شفافية، وبلون الأيقونة",
      "ms": 6.198,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "pwa-ui.test.cjs",
      "name": "PW-03: زرار التثبيت — مابيترسمش من غير عرض المتصفح، وبيسمع العرض والتثبيت، ومكانه آخر القايمة قبل «بواسطة»",
      "ms": 1.1351,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "pwa-ui.test.cjs",
      "name": "PW-04: من غير service worker ولا تخزين مؤقت ولا تغيير في viewport — وخطوة HTTPS مكتوبة في دليل التحديث",
      "ms": 138.1288,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-regression.cjs"
    },
    {
      "file": "codex-review-p3e-auth-independent.integration.cjs",
      "name": "P3E-A01: a delegated users manager cannot reset MFA on a stronger administrative account",
      "ms": 19211.8956,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-closure.cjs"
    },
    {
      "file": "codex-review-p3e-auth-independent.integration.cjs",
      "name": "P3E-A02: an email challenge opened before enrollment cannot mint a new unrestricted session after TOTP activation",
      "ms": 1540.2072,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-closure.cjs"
    },
    {
      "file": "codex-review-p3e-auth-independent.integration.cjs",
      "name": "P3E-A03: required setup gate and current cookie CSRF isolate sessions and mutation routes",
      "ms": 1094.7808,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-closure.cjs"
    },
    {
      "file": "codex-review-p3e-data-independent.integration.cjs",
      "name": "P3E-D01: scheduled report must revalidate its owner after rendering and before sending",
      "ms": 20897.7899,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-closure.cjs"
    },
    {
      "file": "codex-review-p3e-data-independent.integration.cjs",
      "name": "P3E-D02: manager team view cannot reveal a department moved outside the reader branch",
      "ms": 673.4099,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-closure.cjs"
    },
    {
      "file": "codex-review-p3e-data-independent.integration.cjs",
      "name": "P3E-D03: announcements disappear from board, notifications and read route after account rebinding",
      "ms": 2559.9653,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-closure.cjs"
    },
    {
      "file": "codex-review-p3e-documents.integration.cjs",
      "name": "P3E-E01: simultaneous expiry scans create one event and one renewal task",
      "ms": 11288.0399,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-closure.cjs"
    },
    {
      "file": "codex-review-p3e-documents.integration.cjs",
      "name": "P3E-E02: queued document email is suppressed after recipient account is rebound",
      "ms": 302.2454,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-closure.cjs"
    },
    {
      "file": "codex-review-p3e-documents.integration.cjs",
      "name": "P3E-E03: a queued alert must be suppressed when a replacement document already supersedes it",
      "ms": 201.2147,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-closure.cjs"
    },
    {
      "file": "codex-review-p3e-auth-races.integration.cjs",
      "name": "P3E-R-role: reset cannot pass a concurrent privilege promotion through role",
      "ms": 4949.9124,
      "pass": false,
      "error": "promotion must invalidate the earlier reset judgement",
      "cause": "promotion must invalidate the earlier reset judgement",
      "stack": "AssertionError [ERR_ASSERTION]: promotion must invalidate the earlier reset judgement\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3e-auth-races.integration.cjs:34:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)",
      "resultFile": "codex-review-p3e-results-final-races.cjs"
    },
    {
      "file": "codex-review-p3e-auth-races.integration.cjs",
      "name": "P3E-R-override: reset cannot pass a concurrent privilege promotion through override",
      "ms": 291.7136,
      "pass": false,
      "error": "promotion must invalidate the earlier reset judgement",
      "cause": "promotion must invalidate the earlier reset judgement",
      "stack": "AssertionError [ERR_ASSERTION]: promotion must invalidate the earlier reset judgement\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3e-auth-races.integration.cjs:34:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)",
      "resultFile": "codex-review-p3e-results-final-races.cjs"
    },
    {
      "file": "codex-review-p3e-auth-races.integration.cjs",
      "name": "P3E-R-direct: reset cannot pass a concurrent privilege promotion through direct",
      "ms": 271.595,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-final-races.cjs"
    },
    {
      "file": "codex-review-p3e-auth-races.integration.cjs",
      "name": "P3E-R-mail-1: activation while email verification is at factor check 1",
      "ms": 397.6176,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-final-races.cjs"
    },
    {
      "file": "codex-review-p3e-auth-races.integration.cjs",
      "name": "P3E-R-mail-2: activation while email verification is at factor check 2",
      "ms": 418.0999,
      "pass": false,
      "error": "activation completed before the old email verification issued its session\n\n200 !== 401\n",
      "cause": "activation completed before the old email verification issued its session\n\n200 !== 401\n",
      "stack": "AssertionError [ERR_ASSERTION]: activation completed before the old email verification issued its session\n\n200 !== 401\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3e-auth-races.integration.cjs:55:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)",
      "resultFile": "codex-review-p3e-results-final-races.cjs"
    },
    {
      "file": "codex-review-p3e-auth-races.integration.cjs",
      "name": "P3E-R-disabled: a pending TOTP challenge is rejected after disable",
      "ms": 274.7788,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-final-races.cjs"
    },
    {
      "file": "codex-review-p3e-report-controls.integration.cjs",
      "name": "P3E-S-permission: final report identity rejects permission after real rendering",
      "ms": 9654.0031,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-reports-final.cjs"
    },
    {
      "file": "codex-review-p3e-report-controls.integration.cjs",
      "name": "P3E-S-disabled: final report identity rejects disabled after real rendering",
      "ms": 69.097,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-reports-final.cjs"
    },
    {
      "file": "codex-review-p3e-report-controls.integration.cjs",
      "name": "P3E-S-churn: final report identity rejects churn after real rendering",
      "ms": 129.9978,
      "pass": true,
      "skip": false,
      "resultFile": "codex-review-p3e-results-reports-final.cjs"
    }
  ]
}

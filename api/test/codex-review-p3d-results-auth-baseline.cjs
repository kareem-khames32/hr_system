module.exports = {
  "selected": [
    "session-cookie",
    "user-sessions",
    "user-sessions-migration",
    "totp",
    "totp-migration",
    "two-factor-race",
    "user-temporary-password"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 33,
      "failed": 0,
      "passed": 33,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 33,
      "suites": 0
    },
    "duration_ms": 74312.6519
  },
  "results": [
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-01: the plain login is unchanged — the token in the body, no cookie, and a Bearer write needs no CSRF token",
      "ms": 10516.9406,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-02: a cookie session keeps the token away from the page, and a write through it must carry the session's CSRF token",
      "ms": 626.7248,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-03: logout clears the cookie only for a request that carries it",
      "ms": 141.4956,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-04: changing the password re-issues the session in the shape the request came in, and the temporary-password gate holds through the cookie",
      "ms": 1125.1942,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-05: the second login step hands the session over as a cookie when asked, and the pending step never sets one",
      "ms": 612.461,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-06: on HTTPS the cookie is Secure under the __Host- name, and only that name is read",
      "ms": 478.5044,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions.integration.cjs",
      "name": "US-01: every login opens a session whose number rides in the token, and the owner sees his own open sessions only",
      "ms": 10401.9107,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions.integration.cjs",
      "name": "US-02: ending one session kills its token only; another account's session answers like a missing one",
      "ms": 986.6515,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions.integration.cjs",
      "name": "US-03: logout ends the session on the server — its token no longer passes, in a header or in a cookie",
      "ms": 258.1886,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions.integration.cjs",
      "name": "US-04: a password change closes every session row; a dead or foreign session number never passes; a token without a number keeps the standing rule",
      "ms": 957.323,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions-migration.integration.cjs",
      "name": "USM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 10713.7124,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions-migration.integration.cjs",
      "name": "USM-2: من غير الجدول الدخول والخروج وتغيير كلمة المرور شغالين والجلسة من غير رقم؛ وجدول بشكل تاني بيوقّف الترحيل؛ والمُرحّل بيعمل نفس الشكل والفرق صفر",
      "ms": 7060.0574,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions-migration.integration.cjs",
      "name": "USM-3: آمن للتكرار",
      "ms": 1280.938,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.integration.cjs",
      "name": "TP-01: an account turns the authenticator on by confirming a code; the secret is shown once and stored sealed",
      "ms": 10372.2301,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.integration.cjs",
      "name": "TP-02: an enrolled account logs in with the app code as the second step — once, with no mail, and wrong codes lock the check for a while",
      "ms": 1910.056,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.integration.cjs",
      "name": "TP-03: a role named in the setting must turn the authenticator on before anything else, and cannot turn it off",
      "ms": 1348.9397,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.integration.cjs",
      "name": "TP-04: a manager resets an account's authenticator inside his branches; a system admin's only by a system admin",
      "ms": 1902.2821,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp-migration.integration.cjs",
      "name": "TPM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 9310.702,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp-migration.integration.cjs",
      "name": "TPM-2: من غير الجدول الدخول زي الأول حتى للدور الإلزامي؛ وجدول بشكل تاني بيوقّف الترحيل؛ والمُرحّل بيعمل نفس الشكل والفرق صفر",
      "ms": 6435.6593,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp-migration.integration.cjs",
      "name": "TPM-3: آمن للتكرار",
      "ms": 910.8163,
      "pass": true,
      "skip": false
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R1 — جدول الإعدادات مش موجود لحظيًّا: الدخول مرفوض 503 بلا جلسة ولا بريد ولا حالة معلَّقة",
      "ms": 9013.5821,
      "pass": true,
      "skip": false
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R2 — 12 تحقق متوازي برمز غلط على القاعدة: العدّاد 5 بالظبط، القفل مكتوب، والرمز الصح مرفوض",
      "ms": 966.4028,
      "pass": true,
      "skip": false
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R3 — ونفس الشيء عبر HTTP: 12 طلب تحقق في نفس اللحظة بيقفلوا الحالة عند الحد",
      "ms": 998.9466,
      "pass": true,
      "skip": false
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R4 — الحد المعلن نفسه: 4 غلط متوازية مابتقفلش، والخامسة هي اللي تقفل",
      "ms": 612.5731,
      "pass": true,
      "skip": false
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R5 — إعادة إرسال وسط تحقق جارٍ: الرمز القديم مرفوض، الحالة مش مستهلكة، والجديد شغّال",
      "ms": 417.1312,
      "pass": true,
      "skip": false
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R6 — 6 تحققات متوازية بالرمز الصح: جلسة واحدة بالظبط والباقي 401",
      "ms": 532.9483,
      "pass": true,
      "skip": false
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R7 — 8 إعادات إرسال في نفس اللحظة: رسالة واحدة بالظبط، والعدّاد مش بيضيع، وإجمالي الرسايل = الحد المعلن",
      "ms": 1563.1332,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-temporary-password.integration.cjs",
      "name": "the importer's unusable hash never logs in (no guess works, generic 401)",
      "ms": 13421.966,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-temporary-password.integration.cjs",
      "name": "users list flags migrated accounts without a password, never leaks hashes, respects branch scope",
      "ms": 65.0562,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-temporary-password.integration.cjs",
      "name": "bulk temporary password: permission, branch scope, takeover and self guards are all-or-nothing",
      "ms": 107.453,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-temporary-password.integration.cjs",
      "name": "bulk set → forced change on login → new password unlocks the system",
      "ms": 1116.8831,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-temporary-password.integration.cjs",
      "name": "single reset is temporary by default, can be made permanent, and the flag needs a password",
      "ms": 757.6103,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-temporary-password.integration.cjs",
      "name": "migration 056 is additive, idempotent, SQL Server 2019-safe and matches the TypeORM schema",
      "ms": 1155.7586,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "تحقق حذف قاعدة الاختبار: hr_session_cookie_test_2068f3ee4cfa77a0",
    "تحقق حذف قاعدة الاختبار: hr_user_sessions_test_790b3f2c7c96f214",
    "Cleanup verified: hr_user_sessions_migration_test_c959a84eaed31328 is absent from sys.databases.",
    "تحقق حذف قاعدة الاختبار: hr_totp_test_96e95cbb4d681c80",
    "Cleanup verified: hr_totp_migration_test_347785fb3dd81d55 is absent from sys.databases.",
    "{\"rejected\":12,\"attempts\":5,\"locked\":true,\"consumed\":false}",
    "{\"statuses\":[401,401,401,401,401,401,401,401,401,401,401,401],\"attempts\":5,\"locked\":true}",
    "{\"oldConsumeGuardMatches\":1,\"newConsumeGuardMatches\":0}",
    "{\"oldCodeStatus\":401}",
    "{\"statuses\":[200,401,401,401,401,401]}",
    "{\"statuses\":[429,429,429,429,200,429,429,429],\"mails\":1,\"resendCount\":1,\"waitedSeconds\":120,\"messages\":[\"استنى 60 ثانية قبل طلب رمز جديد\"]}",
    "{\"statuses\":[429,429,429,429,429,429,429,429],\"resendCount\":3,\"mails\":3}",
    "Cleanup verified: hr_2fa_race_test_1a617d919b39a53a is absent from sys.databases.",
    "Cleanup verified: hr_user_temp_pw_test_4b777ea7b946327a removed.",
    "tests 33",
    "suites 0",
    "pass 33",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 74312.6519"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_session_cookie_test_2068f3ee4cfa77a0\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_session_cookie_test_2068f3ee4cfa77a0\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_user_sessions_test_790b3f2c7c96f214\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_user_sessions_test_790b3f2c7c96f214\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_user_sessions_migration_test_c959a84eaed31328\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_user_sessions_migration_test_c959a84eaed31328\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_totp_test_96e95cbb4d681c80\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_totp_test_96e95cbb4d681c80\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_totp_migration_test_347785fb3dd81d55\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_totp_migration_test_347785fb3dd81d55\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_2fa_race_test_1a617d919b39a53a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_2fa_race_test_1a617d919b39a53a\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_user_temp_pw_test_4b777ea7b946327a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_user_temp_pw_test_4b777ea7b946327a\"}\n"
  ]
}

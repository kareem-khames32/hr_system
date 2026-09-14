# ملحق قراءة السلف والدفتر — 13 سبتمبر 2026

هذا ملحق تفسير موجز لـ[عقد قراءة المصادر](D:/projects/hr_system/docs/PAYROLL_LIVE_SOURCE_READ_CONTRACT_2026-09-13.md)، خاص بـ`readPayrollLiveLedger`. معنى `AVAILABLE` هو قابلية قراءة المجموعة؛ و`eligible` ترشيح بحسب المصدر والتاريخ والمطالبات فقط. لا يثبتان حق التحصيل أو الاعتماد.

| القيمة | معناها في القراءة |
|---|---|
| `credits/otherDebits.totalPending` | مجموع كل بنود `PENDING` المقروءة، بما فيها المستقبل والمحجوز بمطالبة سابقة. |
| `totalDueInPeriod` | المعلق ذو `effectiveDate=null` أو تاريخ لا يتجاوز نهاية الفترة؛ يشمل المتأخر من فترات سابقة. |
| `totalEligible` | المتبقي للترشيح بعد استبعاد المستقبل والمطالبات. يكون `null` إذا تعذر إثبات المجموعة أو كان تفسيرها غير مدعوم. |
| `installments.totals.remainingAmount` | الدين المفتوح الفعلي، بما فيه المستقبلي والمحجوز. المدفوع منفصل في `paidAmount`، ومرشح الفترة منفصل في `eligibleAmount`. |
| `scheduleTails` | آخر موعد مجدول وآخر موعد ذي رصيد مفتوح لكل سلفة. لا ينشئ القارئ موعد ترحيل جديدًا. عند عدم ثبوت المجموعة يكون رصيد الذيل `null`. |

تبقى البنود المستقبلية في `entries/positions` و`excluded` بسبب `FUTURE_EFFECTIVE_DATE` أو `FUTURE_DUE`. وجود `DEBIT` عام مستحق يجعل قسمه `UNSUPPORTED`، ويظل ظاهرًا بمبلغه؛ لا يتحول إلى قرض. وجود `DEBIT` مستقبلي وحده لا يجعله مستحقًا للفترة الحالية.

تُقرأ أموالSQL كنصوص دقيقة. يُعاد استخدام `readLoanInstallmentPositions` للتحقق من سلسلة الأقساط: أصل `PARTIAL/DEFERRED` يحتفظ بمبلغه ومدفوعه، والدين المفتوح على الابن. مقارنة الجدول بـ`loan.amount` تجمع الجذور فقط (`parentInstallmentId=null`) منعًا لعدّ الطفل مرتين. السلفة المسددة ذات جدول سليم تظل قابلة للقراءة؛ السلفة دون جدول مثبت أو ذات مجموع جذور مخالف لا تُعرض كرصيد صفر.

المطالبات تشمل allocations غير المحررة `HELD/POSTED`، والمسيرات `APPROVED/PAID`، والتصفيات `SETTLED/CLOSED`. حجز خصم صفر يمنع ترشيح المصدر أيضًا. حجز `HELD` يجب أن يطابق حالة `DUE` ومراجعة القسط ورصيده الحالي؛ الحجز القديم المخالف ينتج `LIVE_LOAN_ALLOCATION_STALE`. أما `POSTED` فيُقرأ كتاريخ مطالبة ولا يُشترط أن يساوي مراجعة القسط بعد الصرف. تُحفظ المراجع والنصوص الخام للتدقيق، ولا تستخدم أموال JSON التاريخية لإعادة تسعير الدين.

| الحماية | الأثر أو رموز التشخيص الأساسية |
|---|---|
| نقص جدول أو عمودSQL (`207/208`) | `MISSING` مع `LIVE_LEDGER_SCHEMA_MISSING`. أخطاء الاتصال غير المتوقعة تُرمى، ولا تتحول إلى مصدر فارغ. |
| تجاوز5000صف أو مراجع مطالبات؛ JSON مفقود/فاسد/غير كائن أو أطول من2مليون محرف؛ مراجع غير صالحة أو مكررة | `INVALID`: `LIVE_LEDGER_ROW_LIMIT`, `LIVE_LEDGER_SNAPSHOT_INVALID`, `LIVE_LEDGER_CLAIM_IDS_INVALID`. لا يُنشر مجموع مبتور على أنه كامل. |
| مبلغ غير نصي دقيق، تاريخ غير صالح أو نتيجة قراءة غير صالحة | `LIVE_LEDGER_AMOUNT_INVALID`, `LIVE_LEDGER_DATE_INVALID`, `LIVE_LEDGER_READ_INVALID`. |
| هوية السلفة/القسط أو السلسلة أو الجدول أو حالة التسديد غير متسقة | `LOAN_BALANCE_INVALID`, `LIVE_LOAN_INVALID`, `LIVE_LOAN_POSITION_INVALID`, `LIVE_LOAN_SCHEDULE_MISSING`, `LIVE_LOAN_SCHEDULE_TOTAL_MISMATCH`, `LIVE_LOAN_STATUS_CONFLICT`. |
| هوية الحجز أو أصل رصيده أو مراجعته غير متسقة | `LIVE_LOAN_ALLOCATION_INVALID` أو `LIVE_LOAN_ALLOCATION_STALE`. |
| مطالبة مسير غير صالحة أو خطة لا تطابق مبلغSQL أو مصادر ناقصة/مفقودة | `LIVE_PAYROLL_CLAIM_INVALID`, `LIVE_PAYROLL_INSTALLMENT_PLAN_INVALID`, `LIVE_PAYROLL_INSTALLMENT_SOURCES_MISSING`, `LIVE_PAYROLL_INSTALLMENT_SOURCE_MISSING`, `LIVE_PAYROLL_OBLIGATION_SOURCES_MISSING`. |
| تصفية آلية سابقة دون مصادر مع وجود سلف مفتوحة، أو لقطة/هوية تصفية غير صالحة | `LIVE_SETTLEMENT_SOURCES_MISSING`, `LIVE_SETTLEMENT_SNAPSHOT_INVALID`, `LIVE_SETTLEMENT_INVALID`. |
| دفتر معلق بمبلغ غير موجب أو اتجاه/هوية/حالة مخالفة، ومنها علامات تطبيق سابقة | `LIVE_OBLIGATION_AMOUNT_INVALID` أو `LIVE_OBLIGATION_INVALID`؛ الاتجاه المجهول يبقى في `unclassifiedEntries`. |

قبل أي استعلام يُرفض غياب معاملة القراءة أو معرف الموظف غير الصالح أو الفترة غير الفعلية/الأطول من32يومًا. أولوية حالة المجموعة: نقص مخططها `MISSING`، ثم فسادها `INVALID`، ثم تفسير `DEBIT` المستحق `UNSUPPORTED`. فساد المصدر يمنع ترشيح صفوفه (`SOURCE_UNVERIFIED`) ويجعل الإجمالي غير المحسوم `null`.

**WRITE_NONE:** مسار المزود ست قراءات `SELECT` بمعاملات، ومنها قارئ الأرصدة الحالي بعد تقييده بـ`TOP(5001)` لاكتشاف التجاوز. لا يستدعي حفظًا أو تحديثًا أو إعدادات، ولا ينشئ حجزًا أو حدثًا أو قسطًا، ولا يستخدم `NOLOCK/READUNCOMMITTED`. المعاملة والأقفال العابرة تخص المنسق كما يحدد العقد الأساسي. النص الخام لتاريخ المطالبات يُقرأ دون كيان `simple-json` كي يُعرض فساده بدل فشل التحويل التلقائي.

التحقق النقي: **23/23 ناجحة** في [اختبارات المزود](D:/projects/hr_system/api/test/payroll-live-ledger-provider.test.cjs)، والدليل [سجل النتائج](D:/projects/hr_system/output/payroll-live-ledger-provider-tests.txt) بمدة861.8579ms. تستعمل مديرًا اصطناعيًا وقارئ الأرصدة الحقيقي، وتتحقق من أوامر القراءة والمبالغ القصوى والأصل/الابن والحجوزات والتاريخ التالف والحدود والحتمية. هذا دليل المزود النقي فقط؛ اختباراتSQL/HTTP موثقة مع المنسق.

تظل هذه خطوة قراءة مصادر. لا يصنع هذا المزود تاريخ سريان للأجر من قيمه الحالية، ولا يحسب راتبًا أو صافيًا أو سقف تحصيل، ولا يغيّر مقام الشهر30. ظهور أرصدة قابلة للقراءة لا يزيل نقص مصدر الأجر التاريخي أو جدول العمل ولا يجعل اللقطة جاهزة لتنفيذ مسير.

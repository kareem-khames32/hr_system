# عقد تنفيذ سياسة الرواتب على مدخلات صريحة

تاريخ العقد: 2026-09-13. هذا وصف للنواة الموجودة في الكود، وليس إعلان نشر محرك السياسات في مسيرات الرواتب الفعلية.

## 1. النطاق والإصدارات

المدخل الرئيسي دالة نقية متزامنة:

```ts
executePayrollPolicy(definition, settings, explicitInput)
```

تتحقق الدالة من التعريف والإعدادات والمدخلات، وتحسب البنود ثم توزيع التحصيل والصافي. لا تقرأ موظفًا أو بصمة أو قرضًا من قاعدة البيانات، ولا تحفظ مسيرًا أو تحجز مصدرًا أو تسدد دينًا. لا تتعامل مع صلاحيات مستخدم أو شهادة صحة المصدر؛ ذلك من مسؤولية الربط الخادمي اللاحق.

| الطبقة | الملف | الإصدار |
|---|---|---|
| تنفيذ السياسة الكامل داخل الذاكرة | `api/src/payroll/payroll-policy-execution.ts` | `SRS_POLICY_EXECUTION_V1_20260913` |
| حساب البنود قبل السقوف | `api/src/payroll/payroll-component-execution.ts` | `SRS_COMPONENT_EXECUTION_V1_20260913` |
| ربط مصادر البنود | الملف السابق، `executePayrollComponentsWithSources` | `SRS_COMPONENT_SOURCES_V1_20260913` |
| مصدر الشرائح | `api/src/payroll/payroll-component-tier-source.ts` | `SRS_COMPONENT_TIER_SOURCE_V1_20260913` |
| مصدر الدفتر | `api/src/payroll/payroll-component-ledger-source.ts` | `SRS_COMPONENT_LEDGER_SOURCE_V1_20260913` |
| توزيع التحصيل والصافي | `api/src/payroll/payroll-net-finalization.ts` | `SRS_NET_FINALIZATION_V1_20260913` |

تعريف السياسة هو مجموعات `parameters`, `tierSets`, `components` المحفوظة بالعقد الموثق في `output/payroll-definition-contract.md`. الإعدادات هي الحقول الثمانية عشر الكاملة من `PayrollPolicySettings`؛ لا استكمال لإعدادات ناقصة من الإعدادات الحية. الشهر المالي ثابت على 30 يومًا.

المراجع الوظيفية: PL-03 إلى PL-06 وDD-11 وAD-12 في `PAYROLL_SRS_VENDOR.md`، والقسم 3 من `PAYROLL_SPEC_REPORT.md`. قرار المالك الحالي يسمح باختيار ترتيب التحصيل صراحة بدل تثبيت الحضور أولًا داخل الخوارزمية.

## 2. شكل المدخل الرئيسي

لا تقبل الدالة مفاتيح إضافية على هذا المستوى:

```ts
{
  components: PayrollComponentExplicitInput,
  sources: {
    tiers: Record<ComponentCode, PayrollComponentTierSourceInput>,
    ledger: PayrollLedgerExplicitSources | null
  },
  net: PayrollNetFinalizationInput
}
```

المدخلات JSON صريحة. الحقول غير المعروفة، النماذج الموروثة المخصصة، getters، الخصائص المخفية، أسماء `__proto__` و`constructor` و`prototype`، والقوائم المتقطعة تُرفض. حدود الغلاف 60,000 عقدة وعمق 24؛ لكل طبقة حدود حجم وحساب إضافية. لا تشغّل المعادلات شيفرة JavaScript حرة.

### 2.1 مدخل حساب البنود

```ts
type Exact = { numerator: string; denominator: string };
type Value = string | Exact | null;
type Metadata = { sourceRef: string; alreadyProrated: boolean };

{
  variables: Record<CatalogVariable, Value>,
  employeeFields: {
    basicSalary: Value,
    housingAllowance: Value,
    transportAllowance: Value,
    phoneAllowance: Value,
    workNatureAllowance: Value,
    otherAllowance: Value
  },
  externalValues: Record<ActiveExternalComponentCode, Value>,
  sourceMetadata: {
    variables: Record<CatalogVariable, Metadata>,
    employeeFields: Record<SalaryField, Metadata>,
    externalValues: Record<ActiveExternalComponentCode, Metadata>
  },
  proration: {
    calendar30: { value: string | Exact, sourceRef: string },
    working: { value: Value, sourceRef: string }
  },
  exemptions: [{ code: ComponentCode, sourceRef: string }]
}
```

كل الحاويات المذكورة مطلوبة. حقول الأجر الستة مطلوبة ولو بقيمة `null`. المتغيرات من الكتالوج المغلق، ومفاتيح `externalValues` تخص بنود `EXTERNAL` النشطة فقط. كل قيمة مقدمة غير فارغة تحتاج مرجع مصدر وحالة التناسب السابق. لا يسمح هذا المدخل بتجاوز `COMP` أو معاملات السياسة؛ تأتي المعاملات من التعريف، و`COMP` من نتائج البنود السابقة.

الأموال والأعداد الدقيقة نصوص عشرية أو كسور ذات مقام موجب، وليست أعداد JSON عائمة. عوامل التناسب بين صفر وواحد. `working.value = null` يعني أن عامل أيام العمل غير متاح؛ يتعذر التنفيذ إذا احتاجه بند، ولا يستبدل بعامل آخر. غياب قيمة عادية يفسر بصفر وتحذير عند قراءتها، بينما `missingFieldBehavior = SKIP` يتجاوز البند بلا إحياء قيمته بالحد الأدنى.

### 2.2 مدخل الشرائح

المفتاح داخل `sources.tiers` هو **كود البند** وليس كود طقم الشرائح:

```ts
{
  expectedRevision: number,
  periodStart: "2026-06-01",
  periodEnd: "2026-06-30",
  basicSalary: "900.00",
  grossSalary: "900.00",
  sourceRef: "explicit:attendance-snapshot",
  days: [{
    date: "2026-06-01",
    sourceRef: "explicit:attendance-day", // أو null
    rawLateSeconds: "5400",
    excusedLateSeconds: "0",
    flexibleStartEnabled: false,
    attendanceExempt: false,
    shiftGraceMinutes: null
  }]
}
```

الربط الحالي يدعم أطقم `inputVar = LATE_MINUTES` أو `LATE_INCIDENTS` فقط، دون `inputFormula`. ترتيب الإذن والسماح والمرونة والتقريب وأساليب الشرائح والسقوف الداخلية للطقم يأتي من محرك الشرائح الموجود. قيمة المصدر هي **مجموع مبالغ الأسطر المقربة** بعد سقوف الطقم؛ لا يعاد بناء المجموع من `rawAmount` أو معدلات عرض الست منازل.

مصدر الشرائح ينتج عملة مستحقة للفترة: لا تناسب ثانٍ، ولا تحويل وحدة جديد، ولا حد أدنى موجب قد يعيد خصمًا معفيًا. سياق المعادلات يأخذ `COMP` والمعاملات من التنفيذ الفعلي داخل النواة. لا يقبل المستعمل قاموس نتائج بنود بديلًا داخل مدخل الشرائح.

`expectedRevision` معلومة في المصدر الصريح والتتبع هنا؛ هذه الدالة النقية لا تملك قاعدة بيانات للتحقق من النسخة الفعلية. لا يُعد الرقم أو `sourceRef` تصديقًا خادميًا.

يتحقق الغلاف من أن مصادر `TIERED` التي استُخدمت فعلًا تشترك في `periodStart` و`periodEnd` و`expectedRevision`. عند استعمال مصدر دفتر معها، يجب أن يساوي `ledger.period` شهر `periodEnd`. الاختلاف يرفض بـ`POLICY_SOURCE_PERIOD_CONFLICT`. هذا فحص اتساق داخل المدخل؛ لا يحول أرقام المراجعات أو الفترات إلى إثبات قراءة نسخة موثقة من قاعدة البيانات. المصادر المتجاوزة بسبب تعطيل البند أو شرطه لا تدخل مجموعة المصادر المنفذة لهذا الفحص.

### 2.3 مدخل الدفتر

```ts
{
  period: "2026-06",
  nextPeriod: "2026-07",
  installments: [{
    componentCode: "LOAN_DED",
    category: "loan",
    installmentRef: "explicit:i1",
    loanRef: "explicit:l1",
    sourceRef: "explicit:loan-source",
    sourceRevision: 1,
    sequence: 1,
    originalDuePeriod: "2026-06",
    duePeriod: "2026-06",
    remainingAmount: "1666.00",
    priority: 1,
    extensionPeriod: null
  }],
  obligations: [{
    componentCode: "CREDIT_PAY",
    entryRef: "explicit:o1",
    category: "bonus",
    direction: "CREDIT",
    sourceRef: "explicit:credit-source",
    sourceRevision: 1,
    duePeriod: "2026-06",
    remainingAmount: "50.00",
    priority: 1,
    sequence: 1
  }],
  manualDeferrals: [{
    installmentRef: "explicit:i1",
    toPeriod: "2026-08",
    sourceRef: "explicit:deferral-decision",
    reason: "طلب تأجيل تجريبي"
  }]
}
```

المجموعات الثلاث مطلوبة ولو فارغة، و`nextPeriod` الشهر التالي مباشرة. أقصى مجموع المصادر 1,000، وأقصى قرارات التأجيل 1,000. المبلغ نص غير سالب ضمن `DECIMAL(18,2)` دون تقريب صامت، والتصنيف كود صريح لا `*`. يسمح البند بتصنيف بعينه أو `*`؛ المطابقة حساسة لحالة الأحرف.

كل مصدر مسند صراحة إلى بند واحد. يمنع تكرار هوية `INSTALLMENT:<installmentRef>` أو `OBLIGATION:<entryRef>`، وتوزيع أقساط `loanRef` واحد على بندين. يمكن لطلب واحد أن يكون مرجع عدة أقساط، لذلك اشتراك `sourceRef` وحده ليس دليل تكرار. الهويات ذات النوعين المختلفين يمكنها استعمال النص نفسه.

أقساط الخصم تتطلب `LEDGER / DEDUCTION / DEBIT` في المرحلة 5، و`carryOverEligible = true`، و`CURRENCY` و`prorationMode = NONE`، دون حد أدنى أو أقصى أو سقف نسبي يغير أصل الدين، ودقة تحفظ السنتات. `CREDIT` يتطلب بند إضافة في المرحلة 1 أو 2، ويحفظ مبلغ المصدر كاملًا دون تحويله إلى أصل ثابت لوعاء سقف الخصومات. `obligations` من نوع `DEBIT` غير مدعومة في هذا الربط وتُرفض صراحة.

المصادر المستقبلية تبقى في اللقطة والتفصيل للتحقق من نهاية الجدول، لكنها لا تضاف إلى مبلغ الفترة المستحق. القوائم الفارغة الصريحة تعطي صفرًا مع تحذير المصدر غير الموثق. البند المعطل أو ذو الشرط الخاطئ يتجاوزه core قبل طلب القيمة؛ لا يُفترض سداد مصادره أو ترحيلها.

## 3. ترتيب الحساب وترتيب التحصيل

هناك ثلاثة ترتيبات منفصلة:

| الترتيب | المصدر | الدلالة |
|---|---|---|
| حساب البنود | `stage` ثم `sequence` في التعريف | يحدد متى تتوفر قيمة `COMP`؛ تمنع المراجع الأمامية والدائرية |
| تحصيل الخصومات القابلة للتخفيض | `net.collectionOrder` | ترتيب كامل وصريح يقدمه المالك في المدخل؛ لا تفرض النواة الحضور أولًا |
| أقساط بند دفتر واحد | `priority` ثم `originalDuePeriod` ثم `sequence` ثم المرجع | القيمة الأقل للأولوية تُحصل أولًا، مع حفظ ترتيب حتمي للتعادل |

`deductionPriority` المحفوظ في تعريف البند لا يتحول ضمنيًا إلى `collectionOrder` ولا إلى أولوية مصدر القسط. واجهة لحفظ ترتيب التحصيل على مستوى السياسة لم تنفذ ضمن هذه الخطوة.

مدخل NET:

```ts
{
  earnedFixedGross: "900.00", // يقبل أيضًا كسرًا دقيقًا
  sourceRef: "explicit:earned-fixed-gross",
  classifications: [
    { componentCode: "LATE_DED", kind: "ATTENDANCE",
      sourceRef: "explicit:attendance-classification", carryOverEligible: false },
    { componentCode: "LOAN_DED", kind: "LOAN",
      sourceRef: "explicit:loan-classification", carryOverEligible: true }
  ],
  collectionOrder: ["LOAN_DED", "LATE_DED"],
  collectionOrderSourceRef: "owner:explicit-collection-order"
}
```

كل بند خصم يحتاج تصنيفًا واحدًا، بما فيه البند الصفري أو المتجاوز. التصنيفات المغلقة هي `STATUTORY`, `COURT_ORDER`, `UNPAID_NON_ENTITLEMENT`, `ATTENDANCE`, `RECOVERY`, `TYPED`, `ADMINISTRATIVE`, `LOAN`, `OTHER`. قابلية الترحيل يجب أن تطابق التعريف. `LOAN` مخصص لبند دفتر الخصم؛ لا يقبل بندًا آخر متنكرًا كقسط.

`collectionOrder` يشمل كل خصم قابل للتخفيض مرة واحدة، ولا يحتوي التصنيفات المحمية الثلاثة الأولى. الاستقطاعات المحمية تُحصل قبل هذه القائمة، ولا تغيرها أولوية المستخدم.

مثال مثبت: إيراد 900، أرضية 500، تأخير محسوب 100، قسط مستحق 1,666:

| ترتيب التحصيل | تحصيل التأخير | تحصيل القسط | متبقي القسط | إسقاط زيادة الحضور | الصافي |
|---|---:|---:|---:|---:|---:|
| السلفة ثم الحضور | 0 | 400 | 1,266 | 100 | 500 |
| الحضور ثم السلفة | 100 | 300 | 1,366 | 0 | 500 |

## 4. السقوف والقروش وحفظ الأموال

الحساب الداخلي يستخدم `PayrollDecimal` بكسور دقيقة. `rawValue6` قيمة عرض بست منازل؛ مرجع الحساب هو الكسر الدقيق. تقريب البند يحدث قبل تخزين قيمته لقراءة `COMP`. مرحلة الصافي تحفظ دقة أكبر مبلغ مالي محسوب، بحد أدنى منزلتين. السعة المتاحة تُقرب لأسفل حتى لا يتجاوز التحصيل الأرضية أو السقف بسبب التقريب.

للسلف، الأصل والتحصيل والمتبقي بمنزلتين. مُخصص الأقساط يأخذ السعة بعد قرار NET، ويترك الكسر الأقل من سنت غير مستخدم مع تتبع واضح. لا يحول المتبقي إلى صفر بتقريب أو إعفاء أو حد على البند.

وعاء الأرضية والسقف هو `net.earnedFixedGross` الصريح. لا تستنتجه النواة من `GROSS_SALARY` ولا تضيف إليه مكافأة أو مستحق دفتر أو إضافي. هذه القيمة وتصنيف الخصومات مسؤولية المستدعي؛ يظل مصدرها غير موثق حتى الربط الخادمي.

```text
floor = max(minNetGuarantee أو 0, earnedFixedGross × netFloorPct أو 0)
cap = earnedFixedGross × maxDeductionPctOfGross، أو بلا سقف نسبي
protected = statutory + courtOrders + unpaidNonEntitlement
cashCapacity = max(0, earnings - protected - floor)
capCapacity = max(0, cap - statutory - courtOrders)، إن وُجد cap
available = min(cashCapacity, capCapacity)، أو cashCapacity دون cap
```

الإجازة بلا أجر المصنفة `UNPAID_NON_ENTITLEMENT` تقلل الدخل المتاح، لكنها لا تستهلك السقف النسبي. الحضور يسير في موضعه الصريح بالقائمة، وزيادته لا تُرحّل. باقي الخصومات غير السلف ترحّل الزيادة فقط إذا اجتمع `settings.carryOverExcess` و`classification.carryOverEligible`؛ وإلا تسجل الزيادة كإسقاط. أصل السلفة محفوظ دائمًا عبر محلل الأقساط.

إذا تجاوزت الاستقطاعات المحمية الإيرادات، يعرض الناتج الصافي السالب بدقة مع `blocked = true` و`approvalEligible = false`، وتبقى الخصومات الاختيارية معلقة في التفصيل. إذا تعذر بلوغ الأرضية أصلًا، لا تنشئ النواة دخلًا تعويضيًا؛ تظهر تحذيرًا. `approvalEligible` نتيجة حسابية في الذاكرة، وليست اعتمادًا أو إذن صرف فعليًا.

كل تخصيص يحفظ:

```text
requestedAmount = collectedAmount + carriedAmount + droppedAmount + unallocatedAmount
```

وللقسط المستحق في الحالات غير المحجوبة:

```text
principal = deductedAmount + remainingAmount
```

## 5. سلوك السلفة والتأجيل

الاختيار من تعريف البند المحفوظ، وليس حقل mode قابلًا للحقن في صف المصدر:

| `ledgerPartialPayment` | السلوك المفسر |
|---|---|
| `ALLOW_PARTIAL` | `PARTIAL_THEN_CARRY`: يحصل المتاح ويرجع مقترحًا بالمتبقي للشهر التالي |
| `BLOCK` | `SKIP_AND_EXTEND`: يتخطى القسط كاملًا ويرجع مقترح تمديد، ويترك باقي الراتب متاحًا |

في `BLOCK`، `extensionPeriod` مطلوب ويتجاوز الفترة الحالية وكل مواعيد السلفة المقدمة. يحفظ المحلل أثر التأجيلات اليدوية ونهاية التمديدات السابقة عند تخصيص أكثر من قسط. في الخصم الجزئي يكون `extensionPeriod = null`.

التأجيل اليدوي الصريح يُطبق حتى لو كفت السعة لسداد القسط كاملًا. المبلغ الخام قبل NET يبقى أصل القسط المستحق، ثم يظهر في توزيع التحصيل `DEFERRED_MANUAL` وتحويل كامل الأصل إلى مقترح موعد لاحق. النواة لا تثبت أن طلب التأجيل معتمد، ولا تحفظ الموعد الجديد.

## 6. الإعفاء والحضور ومنع الاستهلاك المكرر

- الإعفاء الكامل يقبل بند خصم قابلًا للإعفاء، ويحفظ الأصل والقرار في `FULL_EXEMPTION`. يمنع إعفاء مستحق إضافة أو استقطاع محمي بهذه الآلية.
- إعفاء بند السلفة مباشرة مرفوض: لا يجوز أن يمحو أصل الدين. التأجيل له مساره الصريح السابق.
- `IS_ATTENDANCE_EXEMPT = 1` أو تعطيل الحضور يصفر متغيرات `LATE_MINUTES`, `SHORT_MINUTES`, `ABSENCE_DAYS`, `LATE_INCIDENTS` والبنود المباشرة ذات الصلة. تعطيل التأخير وحده يعطل التأخير ووقائعه. لا يُسمح لحد أدنى بإحياء خصم حضور معطل.
- القيم المالية السالبة تصبح صفرًا نهائيًا مع تحذير قبل أن تعيدها الحدود إلى قيمة موجبة. الصفر في التناسب أو سعر التحويل لا يخفي أصلًا سالبًا.
- مبلغ الإضافي المباشر من `OT_AMOUNT` يحفظ قيمته ودقة السنتات: لا إعادة تسعير من الساعات، ولا مضاعف أو تناسب أو حدود تغيره، ولا مستهلك مالي مباشر ثانٍ له. لا تعني تسمية المتغير أن النواة وثقت الموافقة من قاعدة البيانات.
- أصل الدفتر لا يُستهلك مرة ثانية عبر بند مالي مشتق من `COMP`، بما في ذلك المرور بسلسلة بنود `INFO` أو مراجع قيمة داخل الشرائح. قراءة الأصل للعرض أو للشرط وحده مسموحة؛ تتبع القيمة المالية يختلف عن تتبع مجرد القراءة.
- يمنع الجمع المالي بين أصل دفتر الخصم ومتغيرات الدين المجملة `ADVANCE_DUE_THIS_PERIOD` و`DEBT_DUE_THIS_PERIOD`. تنفيذ السياسة الكامل يرفض ناتجًا ماليًا غير صفري يحمل أصل متغير دين مجمل بـ`POLICY_LEDGER_SOURCE_REQUIRED`، حتى لو لم يوجد بند `LEDGER` موجب في النتيجة؛ المتغير المجمل وحده لا يكفي لتحصيل يحفظ أصل المتبقي. قراءة العرض أو الشرط وحده ليست تحصيلًا ماليًا.

تفصيل `SOURCE_PROVENANCE` موجود في نتيجة `executePayrollComponentsWithSources` قبل السقوف، ويتتبع أصول الدفتر ومتغيرات الدين عبر النتائج. يستعمله الغلاف الكامل لفحص التحصيل، حتى عند مرور المصدر ببند معلوماتي وسيط. هذه حراسة ضد التكرار داخل اللقطة المقدمة، وليست كشفًا عالميًا لقيود SQL أو شهادة اكتمال مصادر.

## 7. الناتج: الحساب السابق والتحصيل النهائي

```ts
{
  engineVersion,
  sourceValidation: "CALLER_UNVERIFIED",
  preCapsOnly: false,
  approvalEligible,
  execution,     // نتيجة حساب البنود قبل NET، preCapsOnly=true
  finalization,  // allocations, limits, totals, netPay, warnings, trace
  components,    // عرض يجمع calculatedAmount وpayableAmount
  snapshot: { definition, settings, input },
  deferred
}
```

`calculatedAmount` هو ناتج البند قبل تخفيضات المسير. هو المبلغ الذي قرأته البنود اللاحقة عبر `COMP` أثناء الحساب. `payableAmount` هو التحصيل أو المبلغ المستحق بعد NET. لا تعاد المعادلات السابقة بعد تخفيض الخصم؛ كلا الرقمين محفوظ في التفصيل كي يمكن مراجعتهما.

في كل بند عادي، يبقى `amount = calculatedAmount` قبل السقوف، بينما `payableAmount` يعكس المبلغ النهائي القابل للتحصيل. هذا المبلغ النهائي ما زال نتيجة حسابية غير مصروفة في قاعدة البيانات.

في `execution.components` يبقى NET مؤجلًا. في `components` النهائية يحمل NET المبلغ الدقيق النهائي و`payableAmount` وتفصيل `NET_FINALIZATION`؛ حالته `CALCULATED` أو `BLOCKED`. مبلغ NET السابق للتحصيل غير موجود، لذلك `calculatedAmount` له يظل `null`.

كل تخصيص يحتوي `requestedAmount`, `collectedAmount`, `carriedAmount`, `droppedAmount`, `unallocatedAmount`, السعة قبل وبعد، ومراجع المصدر. تخصيص السلفة يضيف `loanDetails` بأسطر الأقساط ومقترحات الاستحقاق التالي. `claimsCreated = false` و`loanResolution = INTERNAL_SYNCHRONOUS_UNPOSTED` يصفان حدود هذه النتيجة.

`snapshot` نسخة عميقة مجمدة في الذاكرة، صالحة لإعادة التشغيل الحتمي مع الإصدارات المناسبة. لا يوجد في هذه الخطوة حفظ لهذه اللقطة داخل `PayrollRun` أو `PayrollItem`، ولا ربط فعلي لسياسة بموظف أو مسير.

## 8. حدود معلنة للربط الحالي

- لا endpoint HTTP لتنفيذ السياسة الكاملة أو full preview لها. الاختبارات تستخدم API التعريف الموجود ثم تستدعي الدالة النقية محليًا.
- لا واجهة لحفظ `collectionOrder` أو ترتيب أولويات المستخدم على سياسة منشورة.
- لا تحميل مصادر موثقة من SQL، ولا إثبات تاريخ راتب أو اكتمال جدول سلف. كل `sourceRef`, `sourceRevision` وتصنيف صريح يظل غير موثق من النواة.
- لا نشر سياسة أو إسنادها، ولا استخدام المحرك الجديد لحساب واعتماد وصرف مسير حقيقي، ولا حفظ مقترحات الترحيل.
- ربط الشرائح في هذه الطبقة خاص بالتأخير ووقائعه؛ باقي مصادر الشرائح تحتاج عقد مصدر مستقلًا.
- `obligations DEBIT` وتفاصيل سدادها الجزئي وترحيلها غير منفذة هنا. `CREDIT` والأقساط المدينة هما المجال الحالي.
- تعليق قسط بعد ثلاث دورات ترحيل، وحد `max_carry_forward_count`، ومهام القرار اليدوي لم تنفذ في هذه النواة.
- لا دليل تطابق ثلاث فترات، ولا shadow run، ولا ادعاء اكتمال هذين البندين.
- مسار الرواتب الفعلي القديم مستمر في محركه وربط أقساطه السابق: calculate/approve/pay والحجوزات والدفتر الحقيقي مستقلة عن هذه النواة الجديدة. نجاح المعاينة لا يعني تحويل ذلك المسار إلى تنفيذ سياسة كاملة.

قيم `deferred` في الناتج: `TRUSTED_SOURCE_LOADING`, `POLICY_ASSIGNMENT`, `PAYROLL_PERSISTENCE`, `CARRY_POSTING`, `THREE_PERIOD_PARITY`, `SHADOW_RUN`.

## 9. دليل التحقق النهائي

ملف الاختبار: `api/test/payroll-component-execution.integration.cjs`.

سجل الجولة النهائية بعد اكتمال حراسات تتبع المصدر والفترة: `output/payroll-policy-execution-integration-final.txt`.

الجولة النهائية نجحت **22/22** في **39,179.668ms**. شملت 16 اختبار توافق سابقًا و6 حالات للتنفيذ الكامل على تعريف وإعدادات محفوظين عبر HTTP حقيقي مع AppModule وJWT وحراسة الفروع:

| الحالة | النتيجة المثبتة |
|---|---|
| أولوية السلفة مقابل الحضور | النتائج المختلفة في جدول القسم 3، مع صافي 500 في الحالتين |
| التأجيل مع كفاية الدخل | راتب 5,000، تحصيل القسط صفر، مقترح كامل 1,666، صافي 5,000 |
| `BLOCK` المحفوظ | تخطي القسط وترحيل 1,666، تحصيل حضور 100، صافي 800 |
| مستحق دفتر 50 ومصدر مستقبلي 200 | استحقاقات 950، وعاء ثابت 900، سقف 360، صافي 590؛ المستقبلي غير مستهلك |
| إعادة تشغيل نسخة قديمة | تحتفظ بأرضية 500 بعد تغيير الإعدادات المحفوظة؛ النسخة الجديدة بأرضية 600 تحصل 300 فقط من القسط |
| أخطاء المصادر والتصنيف والإعفاء | رفض ذري في النواة بلا تغيير بيانات أو أحداث SQL |

تضمنت المقارنة كامل صفوف الرواتب والحضور والسلف والأقساط والمستحقات وحجوزات الأقساط وأحداثها، مع قرض ومستحق فعليين كبيانات حماية. مقارنة السياسة تشمل تعريفها وأحداثها. انتظر الهارنس استدراك الطلبات والحضور الحقيقيين قبل تثبيت بيانات الحماية.

قاعدة الجولة النهائية المؤقتة `hr_payroll_component_execution_test_ccf28b836b1a1042` ثبت حذفها بعد التنظيف، وثبت حذف مجلد الملفات المؤقت. لم تُستخدم قاعدة المصدر أو المراجعة أو خدمة التشغيل الحية في اختبارات SQL/HTTP.

الفحوص النهائية الإضافية التي نفذها الجذر بعد جميع الحراسات:

| الفحص | النتيجة | الدليل |
|---|---|---|
| الاختبارات النقية | **197/197** في **2,101.6969ms** | `output/payroll-policy-execution-pure-final.txt` |
| تكامل SQL/HTTP السابق | **22/22** | `output/payroll-policy-execution-integration-final.txt` |
| بناء API | **PASS** | `output/payroll-policy-execution-build.txt` |
| جاهزية التشغيل القائم، قراءة فقط | عند **15:58:33 UTC**: PID **5552**، health **200**، login **201**، الواجهة **200**، والقسيمة **44** بصافي **12,500** | `output/payroll-policy-execution-runtime-readiness.json` |

مجموع الاختبارات الفريدة في الفحص النهائي **219** = 197 نقيًا + 22 تكاملًا. فحص التشغيل يثبت جاهزية المسار القائم؛ لا يعني نشر endpoint للتنفيذ الكامل أو تحويل مسير فعلي إلى المحرك الجديد.

للتاريخ، سجل الجولة الأولى محفوظ في `output/payroll-policy-execution-integration-tests.txt`: نجحت22/22 في37,877.0182ms، وحُذفت قاعدتها `hr_payroll_component_execution_test_f44cb2c155e9d0b2` وملفاتها المؤقتة. الدليل النهائي أعلاه يحل محلها للتحقق من النسخة بعد تعديلات الحراسة. لم تُشغّل فحوص إضافية من مهمة كتابة هذا العقد.

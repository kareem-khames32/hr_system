# عقد سياسة تحصيل الخصومات المحفوظة — 2026-09-13

## النطاق وقرار المالك

اختار المالك التحكم في ترتيب تحصيل الحضور والاستردادات والسلف بنفسه. لذلك لا توجد أولوية تلقائية لهذه المجموعات، ولا يُستنتج ترتيب التحصيل من `stage` أو `sequence` أو `deductionPriority`. يُحفظ ترتيب صريح على مستوى البنود ضمن نسخة سياسة الرواتب، وتستطيع الواجهة تحويل اختيار المجموعات إلى قائمة بنود كاملة قبل الحفظ.

هذا العقد يثبت قرار التحصيل ويربطه بمعاينة محرك السياسة. المعاينة حساب نقي على مدخلات صريحة، ولا تنشئ `PayrollRun` أو قسيمة رواتب، ولا تحجز موظفًا، ولا تعتمد مصدرًا أو تصرف راتبًا أو تسجل تحصيلًا/ترحيلًا في الدفتر. يظل حجز الموظف عند اعتماد المسير وفق قرار المالك السابق. ولا يغير هذا البند مقام الشهر 30 أو طريقة تسعير الإضافي المعتمد.

المراجع الوظيفية: PL-03 إلى PL-06، DD-11 وAD-12 في `PAYROLL_SRS_VENDOR.md`، وعقدي `PAYROLL_COMPONENT_EXECUTION_CONTRACT_2026-09-13.md` و`PAYROLL_INSTALLMENT_OPTIONS_CONTRACT_2026-09-13.md`.

## الوثيقة المحفوظة

تُحفظ الوثيقة في `payroll_policy_versions.collectionPolicy` كعمود `nvarchar(MAX)` يقبل SQL NULL. لا توجد بذرة تُملأ بها النسخ القديمة، ولا ترتيب افتراضي.

```json
{
  "schemaVersion": "SRS_COLLECTION_V1_20260913",
  "classifications": [
    { "componentCode": "GOSI", "kind": "STATUTORY" },
    { "componentCode": "ATTENDANCE", "kind": "ATTENDANCE" },
    { "componentCode": "RECOVERY", "kind": "RECOVERY" },
    { "componentCode": "LOAN", "kind": "LOAN" }
  ],
  "collectionOrder": ["LOAN", "RECOVERY", "ATTENDANCE"]
}
```

هذا مثال لا يمثل ترتيبًا مقترحًا أو افتراضيًا. يقبل العقد تصنيفات `STATUTORY` و`COURT_ORDER` و`UNPAID_NON_ENTITLEMENT` و`ATTENDANCE` و`RECOVERY` و`TYPED` و`ADMINISTRATIVE` و`LOAN` و`OTHER` فقط.

- كل بند `DEDUCTION` في التعريف، بما فيه غير المفعّل، يجب أن يظهر في `classifications` مرة واحدة. لا تقبل القائمة بند إيراد أو `INFO` أو رمزًا مجهولًا.
- يطبع الحارس ترتيب `classifications` وفق ترتيب `definition.components`. يحتفظ `collectionOrder` بترتيب المالك كما ورد، دون فرز أو استكمال تلقائي.
- يجب أن يشمل `collectionOrder` كل خصم قابل للتخفيض مرة واحدة. التصنيفات المحمية الثلاثة `STATUTORY` و`COURT_ORDER` و`UNPAID_NON_ENTITLEMENT` لا تدخل هذه القائمة.
- `LOAN` يطابق مصدر `LEDGER` باتجاه `DEBIT` حصرًا وبالاتجاهين: كل بند دفتر مدين قرض، وكل تصنيف قرض يحتاج هذا المصدر. دفتر `CREDIT` إيراد ولا يدخل التصنيفات.
- لا تُرسل `carryOverEligible` ضمن الوثيقة؛ تؤخذ من تعريف البند. يلزم أن تكون `false` للحضور والتصنيفات المحمية، و`true` للقرض. بقية التصنيفات تقبل قيمة تعريفها، ويظل الترحيل الفعلي مقيدًا أيضًا بإعداد `carryOverExcess` في مرحلة NET.
- السقوف لا تمحو أصل القرض. الخيارات المقررة للأقساط هي خصم المتاح وترحيل الباقي، أو تأجيل القسط كاملًا وتمديده. `BLOCK` في تعريف مصدر الدفتر يقابل `SKIP_AND_EXTEND`، ولا يعني حظر صرف راتب الموظف كله.

الوثيقة نصية بالكامل؛ رموز البنود حروف كبيرة وأرقام وشرطة سفلية، تبدأ بحرف وبحد أقصى 40 محرفًا. لا تقبل حقولًا إضافية، أو نماذج موروثة مخصصة، أو getters، أو رموز JavaScript، أو مفاتيح خاصة، أو قوائم ذات فراغات. الحدود التقنية للحارس تشمل 200 بند، و200 معامل، و50 طقم شرائح، و1000 شريحة إجمالًا، و100000 عقدة JSON، وعمق 12، و64 مفتاحًا للكائن. هذه حدود تحقق، وليست قيم سياسة مالية.

## القراءة والحالات التاريخية

`GET /api/payroll/policies/:id/versions/:versionId/collection` يتطلب `payroll.view` ونطاق قراءة السياسة. يعيد:

- `policyId` و`versionId` و`revision` و`contractVersion`، وحالة/لقطة الإعدادات.
- `definitionStatus` و`definitionIssues` و`definition` وإصدارات الكتالوج والمحرك وتحذيرات التعريف وإقراراتها.
- `collectionState` و`collection` و`collectionIssues`، بالإضافة إلى `version` و`capabilities`.

قراءة التعريف `GET .../definition` تعرض حقول حالة التحصيل نفسها. تُقرأ النسخة والتعريف والقرار داخل قفل قراءة مشترك على السياسة حتى لا تُجمع ترويسة من مراجعة مع أطفال مراجعة أخرى.

| الحالة | المعنى | السلوك |
| --- | --- | --- |
| `MISSING` | لا توجد وثيقة؛ SQL NULL في التخزين | تبقى دون افتراض، وتمنع معاينة التنفيذ حتى الحفظ الصريح |
| `INVALID` | توجد قيمة غير صالحة أو لا تتوافق مع التعريف الحالي | تعرض `collection:null` مع أسباب، ويجب إصلاحها صراحة |
| `COMPLETE` | الوثيقة كاملة ومتوافقة مع تعريف البنود | تعرض النسخة المطبعة وتتاح للمعاينة وفق الصلاحيات |

الحارس النقي يعامل `undefined` و`null` فقط كغياب. محول التخزين يميز **SQL NULL** عن نص JSON `null`: النص `null`، والقيم المفردة والمصفوفات والصياغة الفاسدة والكائنات التي لا تطابق البنية النصية الدقيقة، تحفظ داخل غلاف داخلي:

```json
{ "storageState": "INVALID_COLLECTION_JSON", "rawValue": "النص المخزن الأصلي" }
```

الغلاف غير صالح كوثيقة تحصيل ولا يقبل ضمن API الحفظ. يعيد محول الكتابة `rawValue` كما هو عند نسخ/إعادة حفظ التاريخ دون إصلاح. وجود كائن مخزن يتشابه مع الغلاف لا يسمح بفك محتواه: يُغلف النص الخارجي نفسه. كذلك لا تمر أرقام JSON غير الآمنة أو `1e400` إلى إعادة التسلسل التي قد تقربها أو تحولها إلى `null`. الوثائق ذات البنية النصية الصحيحة قد تظل `INVALID` دلاليًا، مثل إصدار غير مدعوم أو رمز مجهول، ويكشفها حارس السياسة.

## حفظ القرار وسلوك النسخ

`PATCH /api/payroll/policies/:id/versions/:versionId/collection` يتطلب `payroll.calculate` وملكية الإدارة في نطاق الفرع. جسم الطلب الكامل:

```json
{
  "expectedRevision": 7,
  "reason": "تقديم تحصيل السلفة قبل الاستردادات لهذه النسخة",
  "collection": {
    "schemaVersion": "SRS_COLLECTION_V1_20260913",
    "classifications": [
      { "componentCode": "RECOVERY", "kind": "RECOVERY" },
      { "componentCode": "LOAN", "kind": "LOAN" }
    ],
    "collectionOrder": ["LOAN", "RECOVERY"]
  }
}
```

`expectedRevision` عدد صحيح موجب، و`reason` نص غير فارغ بحد أقصى 500 محرف. يلزم تعريف `SRS_V1` مكتمل بإعداداته وإصداراته وإقراراته قبل حفظ القرار منفردًا. لا يرسل العميل حالة النسخة أو رقمها أو مرجع القرار الخادمي.

يأخذ الحفظ قفلًا حصريًا `hr:payroll:policy:<policyId>` داخل المعاملة، ويتحقق من مراجعة النسخة بعد القفل. على `DRAFT` غير مستخدمة وغير منشورة، يُحدث القرار وتزيد `revision` مرة واحدة ويكتب الحدث `COLLECTION_UPDATED` مع السبب واللقطتين قبل/بعد. فشل الحدث يعيد المعاملة كلها.

إذا كانت النسخة `ACTIVE` أو `ARCHIVED`، أو لها أي من `frozenAt` أو `publishedAt` أو `publishedBy`، ينشئ الحفظ نسخة `DRAFT` جديدة بقرار التحصيل الجديد. تبقى النسخة المصدر دون تغيير، وتنسخ تواريخها وإعداداتها وتعريفها وإقراراتها. تبدأ مراجعة الطفل من 1، ويعود `editKind:"CLONED"` مع النسخة الجديدة؛ يجب أن تنتقل الواجهة إلى `version.id` المعاد. الحفظ المباشر يعيد `editKind:"UPDATED"`.

أرشفة هوية السياسة كلها تمنع الحفظ والاستنساخ؛ أما نسخة مؤرشفة داخل هوية نشطة فتظل قابلة للنسخ. السياسة العامة متاحة للفرع للقراءة والتجربة وفق الصلاحية، وإدارتها لا تتوسع إلى مستخدم الفرع.

## تعديل البنود والقرار في معاملة واحدة

يقبل كل من `POST .../definition/validate` و`PATCH .../definition` حقل `collection` كاملًا اختياريًا إلى جانب تعريف البنود الحالي، ومع الإعدادات وإقرارات التحذيرات عندما تكون مطلوبة.

إذا لم يرسل الحقل وكانت القيمة المخزنة SQL NULL، تبقى مفقودة. إذا كانت هناك وثيقة مخزنة، يعاد التحقق منها مقابل التعريف المقترح. إضافة خصم أو حذفه أو تغيير نوعه أو مصدر دفتره أو أهلية ترحيله قد تتطلب إصلاح التصنيفات/الترتيب. عند التعارض، يُرفض حفظ التعريف بـ`409 POLICY_COLLECTION_REPAIR_REQUIRED` حتى يرسل العميل التعريف والوثيقة المصححة معًا. لا يُحفظ التعريف أولًا ثم يترك القرار فاسدًا.

تعديل ترتيب ظهور البنود وحده يعيد تطبيع ترتيب التصنيفات ويحتفظ بترتيب التحصيل الصريح. لا يتيح هذا المسار مسح الوثيقة بإرسال `null`. قواعد COW والمراجعة والتدقيق الذري تنطبق كذلك على الاستبدال المشترك.

## معاينة التنفيذ بالقرار المحفوظ

`POST /api/payroll/policies/:id/versions/:versionId/execution/preview` يتطلب `payroll.calculate` ونطاق قراءة السياسة، ويعيد HTTP 200 عند نجاح الحساب النقي. جسمه مغلق بالمفاتيح الأربعة:

```text
{
  expectedRevision: positive integer,
  components: explicit component inputs,
  sources: explicit tier/ledger inputs,
  basis: {
    earnedFixedGross: decimal string OR { numerator: string, denominator: string },
    sourceRef: nonempty string, maximum 200 characters
  }
}
```

`components` و`sources` يتبعان عقود المحركات الصارمة الحالية. الأساس المالي غير سالب، ولا يقبل JSON Number؛ الكسور تمر بدقتها الكاملة. وعاء `earnedFixedGross` صريح ولا يستنتج هذا المسار معناه من بيانات موظف حية. مرجعه دليل مقدم لا يُعتمد بمجرد تسميته `sourceRef`.

المعاينة لا تقبل `net` أو `classifications` أو `collectionOrder` أو `carryOverEligible` أو إعدادات بديلة أو `policySourceRef` من العميل. تُشتق التصنيفات والترتيب من الوثيقة المحفوظة، وأهلية الترحيل من تعريف البند. يولد الخادم المرجع:

```text
payroll-policy:<policyId>:version:<versionId>:revision:<revision>
```

ويضعه في مصدر كل تصنيف وفي `collectionOrderSourceRef`. تبقى حقائق الحساب الأخرى موسومة `CALLER_UNVERIFIED`.

تظل المعاينة داخل قفل قراءة مشترك من قراءة النسخة والتعريف والإعدادات والقرار إلى اكتمال الحساب. تتحقق `expectedRevision` مقابل النسخة المقفلة. مصادر الشرائح المستخدمة فعليًا يجب أن تحمل المراجعة نفسها، ولا تُقبل مراجعة عميل أخرى للمصدر المنفذ.

الاستجابة الحالية تتضمن `policyId`, `versionId`, `revision`, `contractVersion`, `catalogVersion`, `engineVersion`, `policyExecutionVersion`, `previewOnly:true`, `sourceValidation:"CALLER_UNVERIFIED"`, `collectionSource:"STORED_POLICY_VERSION"`, `snapshotHash`, و`result`. البصمة SHA-256 تشمل بيانات النسخة والإصدارات ولقطة التنفيذ بعد ترتيب مفاتيح الكائنات بصورة حتمية؛ ترتيب القوائم ذو المعنى يبقى كما هو. النتيجة تتضمن حسابات البنود وتخصيص NET واللقطة، وتظل عمليات التحميل الموثوق للمصادر والإسناد وحفظ المسير وترحيل الدفتر والتكافؤ والتشغيل الظلي مراحل لاحقة.

## التعارضات والأخطاء

| HTTP / الرمز | السبب والإجراء |
| --- | --- |
| `400 COLLECTION_*` | وثيقة أو تصنيف أو ترتيب أو مرجع/أساس غير صالح؛ تتضمن أخطاء الحارس `code/message/path` |
| `400` من تحقق الجسم | حقول زائدة أو ناقصة أو أنواع غير صحيحة؛ الجسم الخام لا يفقد مفاتيحه قبل التحقق الصارم |
| `403` | نقص الصلاحية أو محاولة إدارة سياسة خارج ملكية الفرع |
| `404` | السياسة أو النسخة داخلها غير موجودة |
| `409 POLICY_VERSION_CONFLICT` | تغيرت مراجعة النسخة؛ يعاد `currentRevision` ويجب إعادة القراءة والمراجعة |
| `409 POLICY_DEFINITION_INCOMPLETE` | التعريف/الإعدادات/الإصدارات/الإقرارات لا تسمح بالحفظ أو الحساب المطلوب |
| `409 POLICY_COLLECTION_INCOMPLETE` | القرار مفقود أو فاسد عند طلب معاينة التنفيذ |
| `409 POLICY_COLLECTION_REPAIR_REQUIRED` | التعريف المقترح لا يتوافق مع القرار المخزن؛ أرسل إصلاحهما في الحفظ نفسه |
| `409 POLICY_SOURCE_REVISION_CONFLICT` | مصدر شرائح مستخدم لا يطابق مراجعة النسخة المقفلة |
| `409 POLICY_DEFINITION_ACKNOWLEDGEMENT_REQUIRED` | حفظ التعريف يحتاج إقرارات تحذير مطابقة للمحتوى المقترح |
| `409 POLICY_ARCHIVED` | هوية السياسة مؤرشفة ومتاحة للقراءة فقط |

القراءة تعيد الحالة الفاسدة بدل تحويلها إلى نجاح. المعاينة الناجحة لا تعني صلاحية اعتماد المسير: مثلًا تجاوز الاستقطاعات المحمية للإيرادات يعيد صافيًا سالبًا دقيقًا مع `approvalEligible:false` في نتيجة NET.

## دوال العقد وأدلة التحقق المحددة

```ts
validatePayrollCollectionPolicy(definition, input): PayrollCollectionPolicy
inspectPayrollCollectionPolicy(definition, raw): {
  state: 'MISSING' | 'INVALID' | 'COMPLETE',
  collection: PayrollCollectionPolicy | null,
  issues: Array<{ code: string, message: string, path: string }>
}
buildPayrollCollectionNetInput(definition, collection, {
  earnedFixedGross, sourceRef, policySourceRef
}): PayrollNetFinalizationInput
```

حارس التحصيل يثبت بنية تعريف السياسة وحقول العلاقة المطلوبة للتحصيل، ولا يعيد تشغيل صيغ التعريف المالي دون إعداداته. يستدعي المسار الخدمي تحقق التعريف المالي المختص أولًا. النتائج النقية تعود JSON-safe ومجمدة دون تعديل المدخلات.

- `api/test/payroll-collection-policy.test.cjs`: نجحت 22/22 حالة؛ السجل `output/payroll-collection-policy-pure-tests.txt`. تشمل الترتيب الصريح، جميع التصنيفات، البنود غير المفعلة، تقادم القرار، مصدر/أهلية القرض، الكسور الكبيرة، الحراس، ومرور القرار المحفوظ إلى NET حقيقي.
- `api/test/payroll-collection-storage.test.cjs`: نجحت 8/8 حالات بعد إصلاح محول التخزين؛ السجل `output/payroll-collection-storage-pure-tests.txt`. تستعمل TypeORM metadata الفعلية دون DB وتشمل SQL NULL وJSON null، الأرقام غير الآمنة، التصادم، الفساد، وثيقة صحيحة والنسخ المتكرر.

هذه أدلة محددة للنواة والتخزين، ولا تمثل ادعاء نشر الخدمة أو ترحيل قاعدة المراجعة أو اكتمال منظومة الرواتب.

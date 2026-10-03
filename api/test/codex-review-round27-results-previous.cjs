module.exports = {
  "selected": [
    "codex-review-round26-independent",
    "codex-review-round26-ui",
    "codex-review-round25-boundaries",
    "codex-review-round25-correction-edges",
    "codex-review-round25-exemption-edges",
    "codex-review-round25-ui",
    "codex-review-round24-exemptions",
    "codex-review-round24-mutations"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 64,
      "failed": 0,
      "passed": 64,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 64,
      "suites": 0
    },
    "duration_ms": 97126.402
  },
  "results": [
    {
      "file": "codex-review-round26-independent.integration.cjs",
      "name": "CR26 full-scope correction views preserve the old serialized contract and employee self links",
      "ms": 7986.8659,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round26-independent.integration.cjs",
      "name": "CR26 a transfer between supplementary creation and calculation must not leave the old branch able to read or revoke its exemption",
      "ms": 2253.6289,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round26-independent.integration.cjs",
      "name": "CR26 dated organisation must govern the carried exemption just as it governs supplementary membership",
      "ms": 2188.8583,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round26-independent.integration.cjs",
      "name": "CR26 mixed supplementary header must not expose a foreign carried exemption reference in the parent event",
      "ms": 3602.5919,
      "pass": true,
      "skip": false
    },
    {
      "file": "branch-separation.test.cjs",
      "name": "candidates: a branch user lists only his branch (and unassigned), creates into his branch, and cannot edit another branch",
      "ms": 1.7443,
      "pass": true,
      "skip": false
    },
    {
      "file": "branch-separation.test.cjs",
      "name": "financial exemptions run screen: a run with no member in the user branch is out of scope (snapshot or legacy branch)",
      "ms": 0.6533,
      "pass": true,
      "skip": false
    },
    {
      "file": "branch-separation.test.cjs",
      "name": "financial exemptions service wires the run scope gate into runView and candidates, and filters recalc ids by branch",
      "ms": 0.7153,
      "pass": true,
      "skip": false
    },
    {
      "file": "branch-separation.test.cjs",
      "name": "leave balance rollover: a branch-scoped call touches only that branch employees; null keeps the company-wide job",
      "ms": 1.1893,
      "pass": true,
      "skip": false
    },
    {
      "file": "branch-separation.test.cjs",
      "name": "leave balance rollover: a multi-branch scope touches exactly those branches",
      "ms": 0.8078,
      "pass": true,
      "skip": false
    },
    {
      "file": "branch-separation.test.cjs",
      "name": "payroll draft calculate / recalculate check the run branch scope before revealing its status",
      "ms": 1.1901,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections-ui.test.cjs",
      "name": "النداءات عبر ملف API واحد بمسارات الخادم، ولا fetch مباشر، والمبالغ بالمنسّق الموحد",
      "ms": 1.5423,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections-ui.test.cjs",
      "name": "اللوحة: الإنشاء يرسل بصمة المعاينة، ومعطل قبل معاينة حالية غير ممنوعة وسبب مستوفٍ، وموانع الخادم تُعرض",
      "ms": 0.822,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections-ui.test.cjs",
      "name": "شاشة المسير (تبسيط الرواتب): لوحات العكس والتكميلي ولقطة السياسة ومحرك الحساب و«بلا مسير» والإعفاء المالي لا تُعرض، وملفاتها وأنواع الـAPI باقية",
      "ms": 1.4306,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections-ui.test.cjs",
      "name": "القسيمة وقسائمي (تبسيط الرواتب): بلا شريط عكس الصرف ولا قسيمة التكميلي ولا علامتيهما، وسجل المسير (غير المعروض) يبقى يسمي أحداث التصحيح",
      "ms": 0.5725,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections-ui.test.cjs",
      "name": "السلف وتقارير الرواتب: القسط المُلغى بعكس الصرف وحركة REVERSAL بتسميات عربية، وتقرير المسيرات (تبسيط الرواتب) بلا مسيرات العكس والتكميلي وسطورها، والـAPI يبقى يسميها",
      "ms": 1.4192,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "تنبيهات الإعفاء عند العكس: إعفاء الحضور يُنقل للتكميلي، و«كل الخصومات» لا يُنقل، والإسقاط أو التأجيل المنفذ يبقى؛ بلا إعفاء لا تنبيه",
      "ms": 0.3379,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "نقل الإعفاء للتكميلي: خصومات الحضور (التأخير والنقص والغياب نوعًا أو يومًا) فقط",
      "ms": 0.0838,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "حالة السلفة عند إعادة فتحها بالعكس: المسجلة في حركة الصرف أولًا، وللحركات القديمة من تاريخ الصرف، والتعارض مانع",
      "ms": 0.0992,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "نوع المسير: null وأي قيمة أخرى = أصلي؛ العكس والتكميلي بأسمائهما العربية",
      "ms": 0.063,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "سبب التصحيح: 20 حرفًا على الأقل وثلاث كلمات مختلفة، والرفض برمز PAYRUN-CORRECTION-REASON",
      "ms": 0.1081,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "لقطة البند المعكوس: مبالغ بخانتين، والبصمة ثابتة وتتغير بأي مبلغ أو تفصيل",
      "ms": 0.3429,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "تقرير التسويات: المصروف − المعكوس المنفذ = الصافي الفعلي، وفرق التسوية = التكميلي المصروف − المعكوس المنفذ",
      "ms": 0.5422,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "شرط SQL للبند المعكوس: سطر منفذ للمسير والموظف، ويرفض أي تعبير غير عمود أو معامل",
      "ms": 0.1402,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "رصيد الأقساط: الأصل المستحق بعد العكس مع ابن ترحيل مُلغى (REVERSED) صالح بلا رصيد للابن",
      "ms": 0.49,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "رصيد الأقساط: ترحيل جديد بعد العكس يعيد تفعيل الابن نفسه؛ الابن المُلغى لا يُحتسب ابنًا حيًا، ويُرفض المُلغى بلا أصل أو المدفوع",
      "ms": 0.3947,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-boundaries.integration.cjs",
      "name": "CR25 preview hides amounts and hash, retains identical allowed rows, and preserves full internal event",
      "ms": 7354.4642,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-boundaries.integration.cjs",
      "name": "CR25 forward membership skips foreign definitions, updates own empty drafts, and bulk exclusions hide origins",
      "ms": 2312.9697,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-boundaries.integration.cjs",
      "name": "CR25 monthly overview metadata and waiver references follow recorded branches, including after transfer",
      "ms": 1548.9746,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-boundaries.integration.cjs",
      "name": "CR25 obligation cancellation hides amounts on first and repeated cancel while payroll reader retains them",
      "ms": 192.5969,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-correction-edges.integration.cjs",
      "name": "CR25 shared-root reconciliation retains only reader items and identical company totals",
      "ms": 6889.1351,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-correction-edges.integration.cjs",
      "name": "CR25 correction children must not expose a later payroll recorded wholly in another branch",
      "ms": 1899.974,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-correction-edges.integration.cjs",
      "name": "CR25 forward update must not modify a calculated foreign snapshot after a profile moves into scope",
      "ms": 1748.5697,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-correction-edges.integration.cjs",
      "name": "CR25 an old payslip must not reveal a paid supplementary item recorded in another branch",
      "ms": 2412.2714,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-exemption-edges.integration.cjs",
      "name": "CR25 account without a grant basis is denied identically before payroll reads and application locks",
      "ms": 5033.7297,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-exemption-edges.integration.cjs",
      "name": "CR25 a foreign member, foreign non-member and missing employee give identical exemption denials",
      "ms": 118.2651,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-exemption-edges.integration.cjs",
      "name": "CR25 payroll approval keeps attachment rejection but discloses its amount only to payroll readers",
      "ms": 2123.9231,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-exemption-edges.integration.cjs",
      "name": "CR25 an own historical grant remains readable after scope change without granting new candidates",
      "ms": 691.4756,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "linked filters: departments follow chosen branches, teams follow chosen departments (with sub-departments), and pruning drops broken links",
      "ms": 1.0887,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "only published policy versions are offered for a run, labelled by the set name (dates only when one set has two)",
      "ms": 0.2841,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "membership preview view shows the read-only notice, coverage, the formula set name and plain Arabic exclusion reasons, without codes, day basis, factor or the other run number",
      "ms": 3.9451,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "exclusion candidates: employees the preview already excludes (data problems first) can get a written exclusion; transferred-out and manual exclusions cannot",
      "ms": 0.8588,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "stored draft: the membership card says an employee with incomplete employment data is left out of the calculation, and offers the written exclusion on those rows",
      "ms": 5.1957,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "definition panel: name, formula set, month, linked filters or list, exclusions with a reason, preview and save as draft",
      "ms": 1.9645,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "payroll page: «مسير جديد» is separate from «احتساب المسودة» / «إعادة حساب المسير», and approval no longer waits for an unassigned acknowledgement",
      "ms": 1.3888,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "scope sentence: an empty department or team list reads «كل الأقسام»/«كل الفرق», sub-departments are said out loud, and an empty selection says nobody joins",
      "ms": 0.292,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "exclusion scope check mirrors the engine: an empty department list covers the whole branch, sub-departments included, and nothing selected covers nobody",
      "ms": 0.1647,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "definition panel: the live scope sentence, «كل الأقسام» selected by default, and an exclusion picker that works before any preview",
      "ms": 1.7808,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "no new endpoint: the exclusion picker reuses the employees the screen already loads (or the scoped directory)",
      "ms": 0.4388,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.test.cjs",
      "name": "قراءة الاستعلام: القيم غير الصالحة تسقط، والحالات من نص مفصول بفاصلة، ومن/إلى المقلوبين يتصححوا",
      "ms": 0.3065,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.test.cjs",
      "name": "البحث بالاسم أو الكود بلا حساسية لحالة الحروف، والباقي مطابقة دقيقة",
      "ms": 0.4038,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.test.cjs",
      "name": "مدى تاريخ التعيين شامل الطرفين، وبلا تاريخ = خارج المدى، و«كل التواريخ» ما بتفلترش",
      "ms": 0.1025,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.test.cjs",
      "name": "المنظور: الكل / المدرجين في مسير / بلا مسير على نفس الصفوف",
      "ms": 0.1013,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.test.cjs",
      "name": "الفلاتر بتشتغل مع بعض (AND)، والعدّاد بيعد المفعّل بس والمنظور مش فلتر",
      "ms": 0.0946,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.test.cjs",
      "name": "الموقوف بيدخل التقرير بس لما يتفلتر بالاسم",
      "ms": 0.0622,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.test.cjs",
      "name": "تقسيم الاختيار المختلط: مين ينتقل من أنهي مسير، مين يتضاف، ومين يتخطى وليه",
      "ms": 0.6457,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round24-exemptions.integration.cjs",
      "name": "CR24 exemption candidate response is the union of legitimate bases, and unlinked users have no implicit role",
      "ms": 7058.2112,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round24-exemptions.integration.cjs",
      "name": "CR24 owning a deduction type must not reveal an employee outside the viewer branch through candidates",
      "ms": 45.451,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round24-exemptions.integration.cjs",
      "name": "CR24 both structural bases reject foreign preview and direct grant without identifying data",
      "ms": 166.9549,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round24-exemptions.integration.cjs",
      "name": "CR24 authorized structural grants keep amounts, and foreign exemptions stay outside lists and mine",
      "ms": 893.8009,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round24-exemptions.integration.cjs",
      "name": "CR24 foreign-only run metadata must not pass an out-of-scope structural department relationship",
      "ms": 75.2997,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round24-mutations.integration.cjs",
      "name": "CR24 all run mutations preserve permissions and exact 13-field operation-only responses",
      "ms": 11173.9754,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round24-mutations.integration.cjs",
      "name": "CR24 all run mutations preserve permissions and payroll viewer details",
      "ms": 7310.6421,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round24-mutations.integration.cjs",
      "name": "CR24 scoped operation permission cannot act on a foreign run or return identifiers in the rejection",
      "ms": 210.7095,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round24-mutations.integration.cjs",
      "name": "CR24 membership mutation responses cannot bypass the run read permission",
      "ms": 2050.0954,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"full-contract\",\"fullCorrectionDeepEqual\":true,\"fullItemDeepEqual\":true,\"readers\":[\"branch\",\"company\",\"admin\",\"employee-own\"],\"net\":7319.17}",
    "{\"case\":\"carry-before-transfer\",\"savedExemptionBranch\":1,\"memberBranch\":2,\"oldBranchRunStatus\":403,\"oldBranchExemptionStatus\":403,\"newBranchExemptionStatus\":200,\"revokeStatus\":403,\"storedExemptionStatus\":\"ACTIVE\",\"netBefore\":9000,\"netAfter\":9000}",
    "{\"case\":\"dated-carry-organisation\",\"effectiveTransfer\":\"2026-09-01\",\"payrollPeriod\":\"2026-07\",\"currentBranch\":2,\"memberBranch\":1,\"exemptionBranch\":1,\"rightfulStatus\":200,\"foreignStatus\":403}",
    "{\"case\":\"mixed-supplementary-event\",\"headerVisible\":true,\"headerNet\":null,\"foreignExemptionDirectStatus\":403,\"individualEventForeignId\":null,\"nearCopyId\":7,\"foreignCopyId\":8,\"scopedCarriedExemptions\":[{\"fromExemptionId\":5,\"exemptionId\":7,\"employeeId\":4}],\"companyCopies\":2}",
    "{\"case\":\"preview-and-ack\",\"monthlyGross\":7319.17,\"blindGross\":null,\"previewEqualExceptMoney\":true,\"eventRetainedMoney\":true,\"foreignRunNameHidden\":true,\"companyAcknowledgementRedacted\":true}",
    "{\"case\":\"forward-and-bulk\",\"foreignFutureUnchanged\":true,\"ownDraftUpdated\":true,\"unknownEqualsForeign\":true,\"hiddenSourceId\":null,\"added\":1}",
    "{\"case\":\"overview-recorded-branches\",\"visibleRuns\":1,\"foreignRunHidden\":true,\"currentProfilesSwapped\":true}",
    "{\"case\":\"cancel-obligation\",\"repeatedLimitedResponse\":true,\"readerAmount\":871.26,\"foreignStatus\":403}",
    "{\"case\":\"correction-shared-root\",\"branchOriginal\":\"6321.19\",\"companyOriginal\":\"24700.80\",\"hiddenTotal\":null,\"knownParentHeader\":true,\"reversalId\":2}",
    "{\"case\":\"correction-child-after-transfer\",\"parentSnapshotBranch\":1,\"childSnapshotBranch\":2,\"childDirectGet\":403,\"childNet\":9876.54,\"reconciliationHidesChild\":true,\"returnedChildren\":[null,null]}",
    "{\"case\":\"forward-calculated-foreign\",\"beforeStatus\":\"CALCULATED\",\"readStatus\":403,\"forwardSnapshotBranch\":2,\"profileNowBranch\":1,\"beforeDefinition\":\"{\\\"version\\\":1,\\\"filters\\\":{\\\"branchIds\\\":[],\\\"departmentIds\\\":[],\\\"teamIds\\\":[],\\\"costCenterIds\\\":[],\\\"employeeIds\\\":[5],\\\"allEmployees\\\":false,\\\"includeSubDepartments\\\":true,\\\"includeEmployeeIds\\\":[]},\\\"exclusions\\\":[],\\\"emptyScope\\\":null}\",\"afterDefinition\":\"{\\\"version\\\":1,\\\"filters\\\":{\\\"branchIds\\\":[],\\\"departmentIds\\\":[],\\\"teamIds\\\":[],\\\"costCenterIds\\\":[],\\\"employeeIds\\\":[5],\\\"allEmployees\\\":false,\\\"includeSubDepartments\\\":true,\\\"includeEmployeeIds\\\":[]},\\\"exclusions\\\":[],\\\"emptyScope\\\":null}\",\"eventsAdded\":0,\"returnedRecalculateRuns\":[]}",
    "{\"case\":\"old-payslip-foreign-supplementary\",\"oldItem\":10,\"newItem\":11,\"directNewItemStatus\":404,\"branchReaderSupplementary\":[],\"employeeOwnSupplementaryVisible\":true}",
    "{\"case\":\"early-exemption-refusal\",\"probes\":8,\"payrollRead\":false,\"applicationLock\":false,\"noEmployeeId\":true,\"all403\":true}",
    "{\"case\":\"foreign-exemption-membership\",\"routes\":3,\"eachCompared\":3,\"all403\":true,\"identicalBodies\":true}",
    "{\"case\":\"attachment-approval-refusal\",\"readerAmount\":\"600.00\",\"readerThreshold\":\"300.00\",\"limited409\":true,\"limitedHasAmounts\":false,\"netAfterExemption\":9000}",
    "{\"case\":\"historical-own-grant\",\"retainedOwnAmount\":\"300.00\",\"retainedRunHeader\":true,\"newCandidates\":0,\"newGrant403\":true}",
    "{\"case\":\"exemption-basis-union\",\"hrTypes\":3,\"dualTypes\":1,\"ownerTypes\":1,\"hrDayRate\":\"300.00\",\"noEmployeeStatus\":403}",
    "{\"case\":\"function-owner-foreign-candidates\",\"listStatus\":200,\"foreignEmployees\":[],\"detailStatus\":403,\"expectedBranch\":1,\"employeeBranch\":2}",
    "{\"case\":\"foreign-mutations-denied\",\"evidence\":[{\"actor\":\"department-manager\",\"statuses\":[403,403,403]},{\"actor\":\"function-owner\",\"statuses\":[403,403,403]}],\"rowsInserted\":0}",
    "{\"case\":\"authorized-grants-and-read-scope\",\"ownerAmount\":\"147.89\",\"departmentAmount\":\"37.50\",\"companyOwnerAmount\":\"147.89\",\"ownRows\":2,\"sharedCandidates\":1}",
    "{\"case\":\"foreign-only-exemption-run\",\"viewerBranch\":1,\"employeeBranch\":2,\"viewerPermissions\":[],\"ownHistoricalGrants\":0,\"results\":[{\"route\":\"/candidates\",\"status\":403,\"body\":{}},{\"route\":\"run-view\",\"status\":403,\"body\":{}}],\"withoutStructuralRelationship\":[{\"route\":\"/candidates\",\"status\":403,\"body\":{\"code\":\"EXEMPTION_RUN_OUT_OF_SCOPE\",\"message\":\"المسير خارج نطاق فرعك\"}},{\"route\":\"run-view\",\"status\":403,\"body\":{\"code\":\"EXEMPTION_RUN_OUT_OF_SCOPE\",\"message\":\"المسير خارج نطاق فرعك\"}}]}",
    "{\"case\":\"mutation-matrix\",\"viewer\":false,\"actions\":[{\"label\":\"create-draft\",\"viewer\":false,\"runType\":null,\"status\":\"DRAFT\",\"keys\":13,\"storedTotal\":0},{\"label\":\"update-draft\",\"viewer\":false,\"runType\":null,\"status\":\"DRAFT\",\"keys\":13,\"storedTotal\":0},{\"label\":\"calculate-draft\",\"viewer\":false,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":13,\"storedTotal\":23341.37},{\"label\":\"recalculate\",\"viewer\":false,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":13,\"storedTotal\":23341.37},{\"label\":\"approve\",\"viewer\":false,\"runType\":null,\"status\":\"APPROVED\",\"keys\":13,\"storedTotal\":23341.37},{\"label\":\"reopen\",\"viewer\":false,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":13,\"storedTotal\":23341.37},{\"label\":\"approve-again\",\"viewer\":false,\"runType\":null,\"status\":\"APPROVED\",\"keys\":13,\"storedTotal\":23341.37},{\"label\":\"pay\",\"viewer\":false,\"runType\":null,\"status\":\"PAID\",\"keys\":13,\"storedTotal\":23341.37},{\"label\":\"create-reversal\",\"viewer\":false,\"runType\":\"REVERSAL\",\"status\":\"CALCULATED\",\"keys\":13,\"storedTotal\":-23341.37},{\"label\":\"approve-reversal\",\"viewer\":false,\"runType\":\"REVERSAL\",\"status\":\"APPROVED\",\"keys\":13,\"storedTotal\":-23341.37},{\"label\":\"pay-reversal\",\"viewer\":false,\"runType\":\"REVERSAL\",\"status\":\"PAID\",\"keys\":13,\"storedTotal\":-23341.37},{\"label\":\"create-supplementary\",\"viewer\":false,\"runType\":\"SUPPLEMENTARY\",\"status\":\"DRAFT\",\"keys\":13,\"storedTotal\":0},{\"label\":\"calculate-supplementary\",\"viewer\":false,\"runType\":\"SUPPLEMENTARY\",\"status\":\"CALCULATED\",\"keys\":13,\"storedTotal\":23341.37},{\"label\":\"approve-supplementary\",\"viewer\":false,\"runType\":\"SUPPLEMENTARY\",\"status\":\"APPROVED\",\"keys\":13,\"storedTotal\":23341.37},{\"label\":\"pay-supplementary\",\"viewer\":false,\"runType\":\"SUPPLEMENTARY\",\"status\":\"PAID\",\"keys\":13,\"storedTotal\":23341.37},{\"label\":\"create-cancel-target\",\"viewer\":false,\"runType\":null,\"status\":\"DRAFT\",\"keys\":13,\"storedTotal\":0},{\"label\":\"cancel-draft\",\"viewer\":false,\"runType\":null,\"status\":\"CANCELLED\",\"keys\":13,\"storedTotal\":0},{\"label\":\"legacy-calculate-defined\",\"viewer\":false,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":13,\"storedTotal\":8123.45},{\"label\":\"cancel-calculated\",\"viewer\":false,\"runType\":null,\"status\":\"CANCELLED\",\"keys\":13,\"storedTotal\":8123.45},{\"label\":\"legacy-calculate-branch\",\"viewer\":false,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":13,\"storedTotal\":7319.17},{\"label\":\"cancel-branch-calculated\",\"viewer\":false,\"runType\":null,\"status\":\"CANCELLED\",\"keys\":13,\"storedTotal\":7319.17}],\"netBeforeAndAfter\":23341.37,\"reversalTotal\":-23341.37,\"nextDrafts\":1}",
    "{\"case\":\"mutation-matrix\",\"viewer\":true,\"actions\":[{\"label\":\"create-draft\",\"viewer\":true,\"runType\":null,\"status\":\"DRAFT\",\"keys\":45,\"storedTotal\":0},{\"label\":\"update-draft\",\"viewer\":true,\"runType\":null,\"status\":\"DRAFT\",\"keys\":45,\"storedTotal\":0},{\"label\":\"calculate-draft\",\"viewer\":true,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":45,\"storedTotal\":23341.37},{\"label\":\"recalculate\",\"viewer\":true,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":45,\"storedTotal\":23341.37},{\"label\":\"approve\",\"viewer\":true,\"runType\":null,\"status\":\"APPROVED\",\"keys\":32,\"storedTotal\":23341.37},{\"label\":\"reopen\",\"viewer\":true,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":45,\"storedTotal\":23341.37},{\"label\":\"approve-again\",\"viewer\":true,\"runType\":null,\"status\":\"APPROVED\",\"keys\":32,\"storedTotal\":23341.37},{\"label\":\"pay\",\"viewer\":true,\"runType\":null,\"status\":\"PAID\",\"keys\":32,\"storedTotal\":23341.37},{\"label\":\"create-reversal\",\"viewer\":true,\"runType\":\"REVERSAL\",\"status\":\"CALCULATED\",\"keys\":45,\"storedTotal\":-23341.37},{\"label\":\"approve-reversal\",\"viewer\":true,\"runType\":\"REVERSAL\",\"status\":\"APPROVED\",\"keys\":32,\"storedTotal\":-23341.37},{\"label\":\"pay-reversal\",\"viewer\":true,\"runType\":\"REVERSAL\",\"status\":\"PAID\",\"keys\":32,\"storedTotal\":-23341.37},{\"label\":\"create-supplementary\",\"viewer\":true,\"runType\":\"SUPPLEMENTARY\",\"status\":\"DRAFT\",\"keys\":45,\"storedTotal\":0},{\"label\":\"calculate-supplementary\",\"viewer\":true,\"runType\":\"SUPPLEMENTARY\",\"status\":\"CALCULATED\",\"keys\":45,\"storedTotal\":23341.37},{\"label\":\"approve-supplementary\",\"viewer\":true,\"runType\":\"SUPPLEMENTARY\",\"status\":\"APPROVED\",\"keys\":32,\"storedTotal\":23341.37},{\"label\":\"pay-supplementary\",\"viewer\":true,\"runType\":\"SUPPLEMENTARY\",\"status\":\"PAID\",\"keys\":32,\"storedTotal\":23341.37},{\"label\":\"create-cancel-target\",\"viewer\":true,\"runType\":null,\"status\":\"DRAFT\",\"keys\":45,\"storedTotal\":0},{\"label\":\"cancel-draft\",\"viewer\":true,\"runType\":null,\"status\":\"CANCELLED\",\"keys\":45,\"storedTotal\":0},{\"label\":\"legacy-calculate-defined\",\"viewer\":true,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":45,\"storedTotal\":8123.45},{\"label\":\"cancel-calculated\",\"viewer\":true,\"runType\":null,\"status\":\"CANCELLED\",\"keys\":45,\"storedTotal\":8123.45},{\"label\":\"legacy-calculate-branch\",\"viewer\":true,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":45,\"storedTotal\":7319.17},{\"label\":\"cancel-branch-calculated\",\"viewer\":true,\"runType\":null,\"status\":\"CANCELLED\",\"keys\":45,\"storedTotal\":7319.17}],\"netBeforeAndAfter\":23341.37,\"reversalTotal\":-23341.37,\"nextDrafts\":1}",
    "{\"case\":\"scope-before-state\",\"responses\":[{\"method\":\"PATCH\",\"tail\":\"\",\"status\":403},{\"method\":\"POST\",\"tail\":\"/calculate\",\"status\":403},{\"method\":\"POST\",\"tail\":\"/recalculate\",\"status\":403},{\"method\":\"POST\",\"tail\":\"/reopen\",\"status\":403},{\"method\":\"POST\",\"tail\":\"/cancel\",\"status\":403},{\"method\":\"POST\",\"tail\":\"/approve\",\"status\":403},{\"method\":\"POST\",\"tail\":\"/pay\",\"status\":403}],\"storedStatus\":\"DRAFT\"}",
    "{\"case\":\"membership-mutation-run-leak\",\"permissions\":[\"payroll.calculate\"],\"getStatus\":403,\"bulkDidNotChangeMembership\":true,\"bulk\":{\"kind\":\"bulk\",\"status\":201,\"runKeys\":[\"id\",\"name\",\"period\",\"startDate\",\"endDate\",\"status\",\"branchId\",\"paidAt\",\"payChannel\",\"payReference\",\"runType\",\"parentRunId\",\"correctionReason\"],\"hasEngine\":false},\"single\":{\"kind\":\"single\",\"status\":201,\"runKeys\":[\"id\",\"name\",\"period\",\"startDate\",\"endDate\",\"status\",\"branchId\",\"paidAt\",\"payChannel\",\"payReference\",\"runType\",\"parentRunId\",\"correctionReason\"],\"hasEngine\":false},\"storedTotal\":31464.82,\"authorizedViewerContractMatched\":true}",
    "tests 64",
    "suites 0",
    "pass 64",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 97126.402"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r26_independent_test_5417e52878435c0f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r26_independent_test_5417e52878435c0f\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r26_independent_test_5417e52878435c0f\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r25_boundaries_test_ac0beebf737e178e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r25_boundaries_test_ac0beebf737e178e\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r25_boundaries_test_ac0beebf737e178e\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r25_correction_edges_test_dc5a248082876f68\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r25_correction_edges_test_dc5a248082876f68\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r25_correction_edges_test_dc5a248082876f68\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r25_exemption_edges_test_031a5ea22077777d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r25_exemption_edges_test_031a5ea22077777d\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r25_exemption_edges_test_031a5ea22077777d\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r24_exemptions_test_d5b48d1332c5f2e9\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r24_exemptions_test_d5b48d1332c5f2e9\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r24_mutations_test_4c79090f8e9b7102\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r24_mutations_test_4c79090f8e9b7102\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r24_mutations_test_4c79090f8e9b7102\"}\n"
  ]
}

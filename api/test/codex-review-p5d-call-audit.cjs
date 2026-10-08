module.exports = {
  "requests/requests.service.ts": {
    "assertNotLegacyBonusRoute": [],
    "catalog": [
      {
        "line": 261,
        "expression": "this.chains.find",
        "args": ""
      },
      {
        "line": 262,
        "expression": "this.letterTemplates.availableTypeCodes",
        "args": ""
      },
      {
        "line": 263,
        "expression": "this.types.findOneBy",
        "args": "{ code: 'LOAN' }"
      },
      {
        "line": 265,
        "expression": "this.types.count",
        "args": "{ where: { isActive: true, destinationHandler: POSITION_REQUEST_HANDLER } }"
      },
      {
        "line": 267,
        "expression": "this.types.count",
        "args": "{ where: { isActive: true, destinationHandler: REQUISITION_HANDLER } }"
      },
      {
        "line": 269,
        "expression": "this.types.count",
        "args": "{ where: { isActive: true, destinationHandler: DOCUMENT_RENEWAL_HANDLER } }"
      },
      {
        "line": 271,
        "expression": "this.types.count",
        "args": "{ where: { isActive: true, destinationHandler: TRAINING_REQUEST_HANDLER } }"
      },
      {
        "line": 273,
        "expression": "this.types.count",
        "args": "{ where: { isActive: true, destinationHandler: DEPENDENTS_REQUEST_HANDLER } }"
      },
      {
        "line": 275,
        "expression": "this.types.find",
        "args": "{\r\n        where: { isActive: true },\r\n        order: { category: 'ASC', id: 'ASC' },\r\n      }"
      },
      {
        "line": 291,
        "expression": "this.destinations.supports",
        "args": "t"
      },
      {
        "line": 293,
        "expression": "this.destinations.executionModeOf",
        "args": "t"
      },
      {
        "line": 294,
        "expression": "this.destinations.executionLabelOf",
        "args": "t"
      },
      {
        "line": 298,
        "expression": "this.executionFormFields",
        "args": "t"
      },
      {
        "line": 311,
        "expression": "this.moduleGate.allowedFor",
        "args": "moduleOfRequestType(type), user"
      },
      {
        "line": 311,
        "expression": "this.typeFeatureOpen",
        "args": "type"
      },
      {
        "line": 314,
        "expression": "this.employees.findOne",
        "args": "{ where: { id: user.employeeId } }"
      },
      {
        "line": 328,
        "expression": "this.audienceAllows",
        "args": "t, user, emp, 'catalog', positions, customValues"
      }
    ],
    "assertTypeModuleEnabled": [
      {
        "line": 334,
        "expression": "this.modules.allowedForIn",
        "args": "em, moduleOfRequestType(type), user"
      },
      {
        "line": 334,
        "expression": "this.moduleGate.allowedFor",
        "args": "moduleOfRequestType(type), user"
      },
      {
        "line": 335,
        "expression": "this.typeFeatureOpen",
        "args": "type, em"
      }
    ],
    "typeFeatureOpen": [
      {
        "line": 341,
        "expression": "this.modules.isFeatureEnabledIn",
        "args": "em, EXPENSE_REPORTS_FEATURE"
      },
      {
        "line": 341,
        "expression": "this.modules.isFeatureEnabled",
        "args": "EXPENSE_REPORTS_FEATURE"
      }
    ],
    "audienceAllows": [],
    "create": [
      {
        "line": 365,
        "expression": "this.types.findOne",
        "args": "{\r\n      where: { code: dto.definitionCode || dto.typeCode, isActive: true },\r\n    }"
      },
      {
        "line": 369,
        "expression": "this.assertTypeModuleEnabled",
        "args": "type, user"
      },
      {
        "line": 373,
        "expression": "this.leavePayload",
        "args": "type, dto.payload ?? {}"
      },
      {
        "line": 374,
        "expression": "this.isOvertimeDefinition",
        "args": "type"
      },
      {
        "line": 375,
        "expression": "this.assertOvertimeClientPayload",
        "args": "dto.payload ?? {}"
      },
      {
        "line": 380,
        "expression": "this.destinations.supports",
        "args": "type"
      },
      {
        "line": 381,
        "expression": "this.destinations.unsupportedMessage",
        "args": "type, branchScopeOf(user)"
      },
      {
        "line": 411,
        "expression": "this.employees.findOne",
        "args": "{\r\n        where: { id: dto.onBehalfEmployeeId },\r\n      }"
      },
      {
        "line": 428,
        "expression": "this.employees.findOne",
        "args": "{\r\n      where: { id: requesterId },\r\n    }"
      },
      {
        "line": 448,
        "expression": "this.audienceAllows",
        "args": "type, user, requester, 'submit', positions, customValues"
      },
      {
        "line": 454,
        "expression": "this.requiredRequestFields",
        "args": "type"
      },
      {
        "line": 493,
        "expression": "this.assertPayloadKeys",
        "args": "type, JSON.stringify(payload), branchScopeOf(user)"
      },
      {
        "line": 497,
        "expression": "this.assertSubmitValues",
        "args": "type, JSON.stringify(payload)"
      },
      {
        "line": 499,
        "expression": "this.letterTemplates.publishedFor",
        "args": "this.ds.manager, type.code"
      },
      {
        "line": 506,
        "expression": "this.requests.create",
        "args": "{\r\n      typeCode: isLeaveDefinition(type) ? 'LEAVE' : type.code,\r\n      definitionCode: isLeaveDefinition(type) ? type.code : null,\r\n      requesterId,\r\n      createdByUserId: user.sub,\r\n      branchId: emp?.branchId ??"
      },
      {
        "line": 515,
        "expression": "this.assertAttachmentOwnership",
        "args": "req, user"
      },
      {
        "line": 516,
        "expression": "this.requests.save",
        "args": "req"
      },
      {
        "line": 521,
        "expression": "this.submit",
        "args": "user, req.id, true"
      },
      {
        "line": 525,
        "expression": "this.requests.delete",
        "args": "{ id: req.id, status: 'DRAFT' }"
      }
    ],
    "submit": [
      {
        "line": 534,
        "expression": "this.ds.transaction",
        "args": "em => this.submitLocked(user, id, em, false, audienceJudged)"
      },
      {
        "line": 534,
        "expression": "this.submitLocked",
        "args": "user, id, em, false, audienceJudged"
      },
      {
        "line": 535,
        "expression": "this.afterSubmission",
        "args": "saved"
      }
    ],
    "assertFirstSubmission": [
      {
        "line": 555,
        "expression": "this.audienceAllows",
        "args": "type, user, requester, 'submit', positions, customValues"
      }
    ],
    "submitLocked": [
      {
        "line": 561,
        "expression": "this.owned",
        "args": "user, id, em"
      },
      {
        "line": 567,
        "expression": "this.assertTypeModuleEnabled",
        "args": "type, user, em"
      },
      {
        "line": 569,
        "expression": "this.assertFirstSubmission",
        "args": "user, req, type, em"
      },
      {
        "line": 571,
        "expression": "this.leavePayload",
        "args": "type, JSON.parse(req.payload || '{}')"
      },
      {
        "line": 577,
        "expression": "this.destinations.supports",
        "args": "type"
      },
      {
        "line": 578,
        "expression": "this.destinations.unsupportedMessage",
        "args": "type, branchScopeOf(user)"
      },
      {
        "line": 579,
        "expression": "this.assertPayloadKeys",
        "args": "type, req.payload, branchScopeOf(user)"
      },
      {
        "line": 581,
        "expression": "this.assertSubmitValues",
        "args": "type, req.payload"
      },
      {
        "line": 589,
        "expression": "this.attendance.batchScope(em).calendarDay",
        "args": "req.requesterId, date"
      },
      {
        "line": 589,
        "expression": "this.attendance.batchScope",
        "args": "em"
      },
      {
        "line": 598,
        "expression": "this.letterTemplates.publishedFor",
        "args": "em, type.code"
      },
      {
        "line": 602,
        "expression": "this.assertAttachmentOwnership",
        "args": "req, user, em"
      },
      {
        "line": 605,
        "expression": "this.modules.isFeatureEnabledIn",
        "args": "em, SWAP_CONSENT_FEATURE"
      },
      {
        "line": 864,
        "expression": "this.leaveBalances.maxBackdateDays",
        "args": ""
      },
      {
        "line": 880,
        "expression": "this.actorIsRequester",
        "args": "em, user, req"
      },
      {
        "line": 881,
        "expression": "this.leaveTypeShown",
        "args": "leaveTypeDef, branchScopeOf(user)"
      },
      {
        "line": 905,
        "expression": "this.attendance.batchScope(em).workingDaysForEmployee",
        "args": "req.requesterId, String(p.fromDate), String(p.toDate)"
      },
      {
        "line": 905,
        "expression": "this.attendance.batchScope",
        "args": "em"
      },
      {
        "line": 928,
        "expression": "this.attendance.batchScope(em).workingDaysForEmployee",
        "args": "req.requesterId, y === y1 ? String(p.fromDate) : `${y}-01-01`, y === y2 ? String(p.toDate) : `${y}-12-31`"
      },
      {
        "line": 928,
        "expression": "this.attendance.batchScope",
        "args": "em"
      },
      {
        "line": 998,
        "expression": "this.leaveTimesInYear",
        "args": "em, req, leaveTypeDef.code, year"
      },
      {
        "line": 1000,
        "expression": "this.leaveTypeShown",
        "args": "leaveTypeDef, branchScopeOf(user)"
      },
      {
        "line": 1047,
        "expression": "this.leaveTypeShown",
        "args": "leaveTypeDef, branchScopeOf(user)"
      },
      {
        "line": 1053,
        "expression": "this.leaveTimesInYear",
        "args": "em, req, leaveTypeDef.code, null"
      },
      {
        "line": 1055,
        "expression": "this.leaveTypeShown",
        "args": "leaveTypeDef, branchScopeOf(user)"
      },
      {
        "line": 1067,
        "expression": "this.assertLeaveBalance",
        "args": "req, type, payload, em"
      },
      {
        "line": 1084,
        "expression": "this.resolveChain",
        "args": "type, req, em, branchScopeOf(user)"
      },
      {
        "line": 1085,
        "expression": "this.isOvertimeDefinition",
        "args": "type"
      },
      {
        "line": 1087,
        "expression": "this.stageOvertimeSubmission",
        "args": "em, req, resolved, user.sub, resubmission"
      },
      {
        "line": 1093,
        "expression": "this.typeRef",
        "args": "type, branchScopeOf(user)"
      },
      {
        "line": 1093,
        "expression": "this.chainRef",
        "args": "inactiveChain, branchScopeOf(user)"
      },
      {
        "line": 1109,
        "expression": "this.resolver.hasHrOverride",
        "args": "user"
      },
      {
        "line": 1111,
        "expression": "this.actorIsRequester",
        "args": "em, user, req"
      },
      {
        "line": 1114,
        "expression": "this.approveInstantlyOnBehalf",
        "args": "em, req, type, resolved, user"
      },
      {
        "line": 1122,
        "expression": "this.typeRef",
        "args": "type, branchScopeOf(user)"
      },
      {
        "line": 1129,
        "expression": "this.typeRef",
        "args": "type, branchScopeOf(user)"
      },
      {
        "line": 1130,
        "expression": "this.chainRef",
        "args": "chain, branchScopeOf(user)"
      },
      {
        "line": 1142,
        "expression": "this.recordDecisionEvent",
        "args": "em, req, 'APPROVED'"
      },
      {
        "line": 1143,
        "expression": "this.executeDestinationLocked",
        "args": "em, req"
      },
      {
        "line": 1149,
        "expression": "this.recordStepPendingEvent",
        "args": "em, pending"
      }
    ],
    "leaveTimesInYear": [],
    "balanceTypeOf": [],
    "assertLeaveBalance": [
      {
        "line": 1209,
        "expression": "this.balanceTypeOf",
        "args": "type, payload, em"
      },
      {
        "line": 1231,
        "expression": "this.balanceTypeOf",
        "args": "rt, rp, em"
      },
      {
        "line": 1232,
        "expression": "this.leaveBalances.splitByYear",
        "args": "rp, String(rp.fromDate), Number(rp.days)"
      },
      {
        "line": 1239,
        "expression": "this.leaveBalances.splitByYear",
        "args": "payload, fromDate, Number(payload.days)"
      },
      {
        "line": 1247,
        "expression": "this.leaveBalances.balanceGateDate",
        "args": "year, fromDate"
      },
      {
        "line": 1248,
        "expression": "this.leaveBalances.assertSufficient",
        "args": "req.requesterId, balanceType, d, onDate, pending[year] ?? 0"
      }
    ],
    "resolveChain": [
      {
        "line": 1315,
        "expression": "this.thresholdMet",
        "args": "step, payload"
      },
      {
        "line": 1322,
        "expression": "this.resolver.managerOfDirectManagerOf",
        "args": "req.requesterId"
      },
      {
        "line": 1326,
        "expression": "this.resolver.administrationManagerOf",
        "args": "req.requesterId, viewer"
      },
      {
        "line": 1332,
        "expression": "this.resolver.resolveApproverEmployee",
        "args": "s.approverRole, req.requesterId, payload, s.specificEmployeeId"
      },
      {
        "line": 1347,
        "expression": "this.skipLevelMissingMessage",
        "args": "skipLevel.directManagerId, viewer"
      },
      {
        "line": 1360,
        "expression": "this.resolver.reportsTo",
        "args": "approverEmployeeId, req.requesterId"
      }
    ],
    "skipLevelMissingMessage": [
      {
        "line": 1399,
        "expression": "this.employees.findOne",
        "args": "{ where: { id: directManagerId }, select: { id: true, fullName: true, branchId: true } }"
      }
    ],
    "thresholdMet": [],
    "act": [
      {
        "line": 1434,
        "expression": "this.ds.transaction",
        "args": "async em => {\r\n      const req = await this.scoped(user, id, em)\r\n      if (req.status !== 'UNDER_REVIEW') {\r\n        throw new BadRequestException('الطلب ليس قيد المراجعة')\r\n      }\r\n      const resolved = this.parseSte"
      },
      {
        "line": 1435,
        "expression": "this.scoped",
        "args": "user, id, em"
      },
      {
        "line": 1439,
        "expression": "this.parseSteps",
        "args": "req.resolvedSteps"
      },
      {
        "line": 1446,
        "expression": "this.isOwnRequestFor",
        "args": "user, req"
      },
      {
        "line": 1449,
        "expression": "this.delegationContext",
        "args": "user, [req], em"
      },
      {
        "line": 1451,
        "expression": "this.resolver.satisfies",
        "args": "user, s, { hrUnblock, selfRequest, actingFor }"
      },
      {
        "line": 1462,
        "expression": "this.resolver.holdsStep",
        "args": "user, mine"
      },
      {
        "line": 1462,
        "expression": "this.resolver.holdsStep",
        "args": "user, mine, actingFor"
      },
      {
        "line": 1475,
        "expression": "this.isOvertimeRequest",
        "args": "req, em"
      },
      {
        "line": 1477,
        "expression": "this.reviewOvertimeApproval",
        "args": "em, req, user, dto"
      },
      {
        "line": 1479,
        "expression": "this.overtimeEntryForRequest",
        "args": "em, req"
      },
      {
        "line": 1490,
        "expression": "this.resolver.hasHrOverride",
        "args": "user"
      },
      {
        "line": 1513,
        "expression": "this.assertLeaveBalance",
        "args": "req, t, ap, em"
      },
      {
        "line": 1536,
        "expression": "this.releaseRequestOvertime",
        "args": "em, req, 'REJECTED', user.sub, comment"
      },
      {
        "line": 1542,
        "expression": "this.recordDecisionEvent",
        "args": "em, rejected, 'REJECTED'"
      },
      {
        "line": 1577,
        "expression": "this.recordStepPendingEvent",
        "args": "em, advanced"
      },
      {
        "line": 1588,
        "expression": "this.isOvertimeRequest",
        "args": "req, em"
      },
      {
        "line": 1588,
        "expression": "this.finalizeOvertimeApproval",
        "args": "em, req, user.sub"
      },
      {
        "line": 1590,
        "expression": "this.recordDecisionEvent",
        "args": "em, req, 'APPROVED'"
      },
      {
        "line": 1591,
        "expression": "this.executeDestinationLocked",
        "args": "em, req"
      },
      {
        "line": 1601,
        "expression": "this.afterSubmission",
        "args": "saved"
      }
    ],
    "executeDestination": [
      {
        "line": 1611,
        "expression": "this.ds.transaction",
        "args": "async (em) => {\r\n      await this.lockFinancialRequestPrelude(em, requestId)\r\n      const locked = await em.getRepository(Request).findOne({ where: { id: requestId }, lock: { mode: 'pessimistic_write' } })\r\n      if (!lo"
      },
      {
        "line": 1612,
        "expression": "this.lockFinancialRequestPrelude",
        "args": "em, requestId"
      },
      {
        "line": 1623,
        "expression": "this.executeDestinationLocked",
        "args": "em, req"
      },
      {
        "line": 1626,
        "expression": "this.afterDestination",
        "args": "saved"
      }
    ],
    "executeDestinationLocked": [
      {
        "line": 1635,
        "expression": "this.destinations\r\n      .execute(em, req, type)\r\n      .catch",
        "args": "(e: unknown) => this.executionFailure(req.id, e)"
      },
      {
        "line": 1635,
        "expression": "this.destinations\r\n      .execute",
        "args": "em, req, type"
      },
      {
        "line": 1637,
        "expression": "this.executionFailure",
        "args": "req.id, e"
      },
      {
        "line": 1642,
        "expression": "this.destinations.executionModeOf",
        "args": "type"
      }
    ],
    "recordDecisionEvent": [],
    "recordStepPendingEvent": [],
    "stepAwaitsAccount": [
      {
        "line": 1674,
        "expression": "this.isOwnRequestFor",
        "args": "user, req"
      },
      {
        "line": 1676,
        "expression": "this.waitingSteps(req).some",
        "args": "step => (!role || step.role === role) && this.resolver.holdsStep(user, step, actingFor)"
      },
      {
        "line": 1676,
        "expression": "this.waitingSteps",
        "args": "req"
      },
      {
        "line": 1676,
        "expression": "this.resolver.holdsStep",
        "args": "user, step, actingFor"
      }
    ],
    "delegationContext": [
      {
        "line": 1729,
        "expression": "this.parseSteps(req.resolvedSteps).some",
        "args": "step => !step.actedAt && this.resolver.holdsStep(user, step)"
      },
      {
        "line": 1729,
        "expression": "this.parseSteps",
        "args": "req.resolvedSteps"
      },
      {
        "line": 1729,
        "expression": "this.resolver.holdsStep",
        "args": "user, step"
      }
    ],
    "waitingSteps": [
      {
        "line": 1740,
        "expression": "this.parseSteps(req.resolvedSteps).filter",
        "args": "step => step.stepOrder === req.currentStep && !step.actedAt"
      },
      {
        "line": 1740,
        "expression": "this.parseSteps",
        "args": "req.resolvedSteps"
      }
    ],
    "afterSubmission": [
      {
        "line": 1744,
        "expression": "this.afterDestination",
        "args": "saved"
      }
    ],
    "afterDestination": [
      {
        "line": 1763,
        "expression": "this.ds\r\n          .getRepository(Leave)\r\n          .findOne",
        "args": "{ where: { id: Number(payload.leaveId) } }"
      },
      {
        "line": 1763,
        "expression": "this.ds\r\n          .getRepository",
        "args": "Leave"
      },
      {
        "line": 1779,
        "expression": "this.attendance.computeDay",
        "args": "saved.requesterId, ds"
      },
      {
        "line": 1780,
        "expression": "this.logger.error",
        "args": "`تعذّرت إعادة حساب حضور ${ds} للموظف #${saved.requesterId} بعد تنفيذ الطلب #${saved.id}`, (e as Error)?.stack"
      },
      {
        "line": 1789,
        "expression": "this.attendance.computeDay",
        "args": "saved.requesterId, String(payload.date)"
      },
      {
        "line": 1792,
        "expression": "this.attendance.computeDay",
        "args": "saved.requesterId, String(payload.date)"
      },
      {
        "line": 1799,
        "expression": "this.attendance.computeDay",
        "args": "employeeId, localDateOf(day)"
      },
      {
        "line": 1800,
        "expression": "this.logger.error",
        "args": "`تعذّرت إعادة حساب يوم مبادلة الوردية للموظف #${employeeId}`, (error as Error).stack"
      },
      {
        "line": 1804,
        "expression": "this.types.findOne",
        "args": "{ where: { code: definitionCodeOf(saved) } }"
      },
      {
        "line": 1809,
        "expression": "this.attendance.computeDay",
        "args": "saved.requesterId, date"
      },
      {
        "line": 1810,
        "expression": "this.logger.error",
        "args": "`تعذّرت إعادة حساب يوم دوام العطلة ${date} للموظف #${saved.requesterId}`, (error as Error).stack"
      },
      {
        "line": 1813,
        "expression": "this.logger.error",
        "args": "`تعذّرت إعادة حساب الحضور بعد تنفيذ الطلب #${saved.id}`, (e as Error)?.stack"
      }
    ],
    "executionFailure": [
      {
        "line": 1830,
        "expression": "this.logger.warn",
        "args": "`تعذّر تنفيذ وجهة الطلب #${requestId}: ${(e as Error).message}`"
      },
      {
        "line": 1831,
        "expression": "this.logger.error",
        "args": "`تعذّر تنفيذ وجهة الطلب #${requestId}`, (e as Error)?.stack"
      }
    ],
    "retryExecution": [
      {
        "line": 1839,
        "expression": "this.ds.transaction",
        "args": "async em => {\r\n      const req = await this.scoped(user, id, em)\r\n      if (req.status !== 'APPROVED') {\r\n        throw new BadRequestException('إعادة التنفيذ للطلب المعتمد اللي تعذّر تنفيذه بس')\r\n      }\r\n      // الرصي"
      },
      {
        "line": 1840,
        "expression": "this.scoped",
        "args": "user, id, em"
      },
      {
        "line": 1853,
        "expression": "this.assertLeaveBalance",
        "args": "req, t, ap, em"
      },
      {
        "line": 1855,
        "expression": "this.executeDestinationLocked",
        "args": "em, req"
      },
      {
        "line": 1857,
        "expression": "this.afterDestination",
        "args": "saved"
      }
    ],
    "rejectFailedExecution": [
      {
        "line": 1865,
        "expression": "this.ds.transaction",
        "args": "async em => {\r\n      const req = await this.scoped(user, id, em)\r\n      // الإغلاق الإداري يلتزم بفرع الطلب حتى لو كان المستخدم صاحبه أو منشئه.\r\n      const scope = branchScopeOf(user)\r\n      if (!inBranchScope(scope, re"
      },
      {
        "line": 1866,
        "expression": "this.scoped",
        "args": "user, id, em"
      },
      {
        "line": 1877,
        "expression": "this.seesConfidential",
        "args": "user, req, true, (await em.getRepository(RequestApproval).count({ where: { requestId: req.id, approverId: user.sub } })) > 0 || (await executionAwaitsAccount(em, user, req.id))"
      },
      {
        "line": 1887,
        "expression": "this.parseSteps",
        "args": "req.resolvedSteps"
      },
      {
        "line": 1898,
        "expression": "this.releaseRequestOvertime",
        "args": "em, req, 'REJECTED', user.sub, reason"
      },
      {
        "line": 1900,
        "expression": "this.recordDecisionEvent",
        "args": "em, rejected, 'REJECTED'"
      }
    ],
    "resubmit": [
      {
        "line": 1911,
        "expression": "this.ds.transaction",
        "args": "async em => {\r\n      const req = await this.owned(user, id, em)\r\n      assertTransition(req.status, 'SUBMITTED')\r\n      if (req.status !== 'RETURNED_FOR_INFO') {\r\n        throw new BadRequestException('الطلب ليس مُرجَعاً"
      },
      {
        "line": 1912,
        "expression": "this.owned",
        "args": "user, id, em"
      },
      {
        "line": 1928,
        "expression": "this.isOvertimeRequest",
        "args": "req, em"
      },
      {
        "line": 1928,
        "expression": "this.assertOvertimeClientPayload",
        "args": "payload"
      },
      {
        "line": 1948,
        "expression": "this.leavePayload",
        "args": "type, JSON.parse(req.payload || '{}')"
      },
      {
        "line": 1951,
        "expression": "this.destinations.supports",
        "args": "type"
      },
      {
        "line": 1952,
        "expression": "this.destinations.unsupportedMessage",
        "args": "type, branchScopeOf(user)"
      },
      {
        "line": 1953,
        "expression": "this.assertPayloadKeys",
        "args": "type, req.payload, branchScopeOf(user)"
      },
      {
        "line": 1954,
        "expression": "this.assertSubmitValues",
        "args": "type, req.payload"
      },
      {
        "line": 1957,
        "expression": "this.assertAttachmentOwnership",
        "args": "req, user, em"
      },
      {
        "line": 1960,
        "expression": "this.submitLocked",
        "args": "user, id, em, true"
      },
      {
        "line": 1962,
        "expression": "this.afterSubmission",
        "args": "saved"
      }
    ],
    "cancel": [
      {
        "line": 1967,
        "expression": "this.ds.transaction",
        "args": "async em => {\r\n      const req = await this.owned(user, id, em)\r\n      assertTransition(req.status, 'CANCELLED')\r\n      await this.releaseRequestOvertime(em, req, 'CANCELLED', user.sub, 'إلغاء صاحب الطلب قبل اكتمال الاعت"
      },
      {
        "line": 1968,
        "expression": "this.owned",
        "args": "user, id, em"
      },
      {
        "line": 1970,
        "expression": "this.releaseRequestOvertime",
        "args": "em, req, 'CANCELLED', user.sub, 'إلغاء صاحب الطلب قبل اكتمال الاعتماد'"
      }
    ],
    "assertCustodyInScope": [
      {
        "line": 1984,
        "expression": "this.ds.getRepository(Employee).findOne",
        "args": "{ where: { id: row.employeeId }, select: { id: true, branchId: true } }"
      },
      {
        "line": 1984,
        "expression": "this.ds.getRepository",
        "args": "Employee"
      }
    ],
    "custodyRowBranchProblem": [],
    "acknowledgeCustody": [
      {
        "line": 1999,
        "expression": "this.ds.getRepository(CustodyAssignment).findOne",
        "args": "{\r\n      where: { id: assignmentId },\r\n    }"
      },
      {
        "line": 1999,
        "expression": "this.ds.getRepository",
        "args": "CustodyAssignment"
      },
      {
        "line": 2003,
        "expression": "this.assertCustodyInScope",
        "args": "user, found"
      },
      {
        "line": 2004,
        "expression": "this.ds.transaction",
        "args": "async em => {\r\n      const asset = await em.getRepository(Asset).findOne({ where: { id: found.assetId }, lock: { mode: 'pessimistic_write' } })\r\n      if (!asset || asset.status === 'RETIRED') throw new BadRequestExcepti"
      },
      {
        "line": 2011,
        "expression": "this.custodyRowBranchProblem",
        "args": "em, row, asset, recipient"
      }
    ],
    "requestCustodyHandover": [
      {
        "line": 2021,
        "expression": "this.ds.getRepository(CustodyAssignment).findOne",
        "args": "{\r\n      where: { id: assignmentId },\r\n    }"
      },
      {
        "line": 2021,
        "expression": "this.ds.getRepository",
        "args": "CustodyAssignment"
      },
      {
        "line": 2025,
        "expression": "this.assertCustodyInScope",
        "args": "user, row"
      },
      {
        "line": 2032,
        "expression": "this.ds.getRepository(CustodyAssignment).count",
        "args": "{ where: {\r\n      assetId: row.assetId, id: Not(row.id), status: In(['PENDING_ACK', 'PENDING_MANAGER_CONFIRM']),\r\n    } }"
      },
      {
        "line": 2032,
        "expression": "this.ds.getRepository",
        "args": "CustodyAssignment"
      },
      {
        "line": 2037,
        "expression": "this.ds.getRepository(CustodyAssignment).save",
        "args": "row"
      },
      {
        "line": 2037,
        "expression": "this.ds.getRepository",
        "args": "CustodyAssignment"
      }
    ],
    "transferCustody": [
      {
        "line": 2050,
        "expression": "this.ds.transaction",
        "args": "async em => {\r\n      const created = await startCustodyTransfer(em, assignmentId, toEmployeeId, undefined, user)\r\n      if (note?.trim()) {\r\n        created.condition = note.trim()\r\n        await em.getRepository(Custody"
      }
    ],
    "managerConfirmCustody": [
      {
        "line": 2062,
        "expression": "this.ds.getRepository(CustodyAssignment).findOneBy",
        "args": "{ id: assignmentId }"
      },
      {
        "line": 2062,
        "expression": "this.ds.getRepository",
        "args": "CustodyAssignment"
      },
      {
        "line": 2064,
        "expression": "this.assertCustodyInScope",
        "args": "user, found"
      },
      {
        "line": 2065,
        "expression": "this.resolver.directManagerOf",
        "args": "found.employeeId"
      },
      {
        "line": 2068,
        "expression": "this.ds.transaction",
        "args": "async em => {\r\n      const asset = await em.getRepository(Asset).findOne({ where: { id: found.assetId }, lock: { mode: 'pessimistic_write' } })\r\n      const repo = em.getRepository(CustodyAssignment)\r\n      const row = a"
      },
      {
        "line": 2078,
        "expression": "this.custodyRowBranchProblem",
        "args": "em, row, asset, employee"
      }
    ],
    "rejectCustody": [
      {
        "line": 2104,
        "expression": "this.ds.getRepository(CustodyAssignment).findOneBy",
        "args": "{ id: assignmentId }"
      },
      {
        "line": 2104,
        "expression": "this.ds.getRepository",
        "args": "CustodyAssignment"
      },
      {
        "line": 2106,
        "expression": "this.assertCustodyInScope",
        "args": "user, found"
      },
      {
        "line": 2107,
        "expression": "this.ds.transaction",
        "args": "async em => {\r\n      const asset = await em.getRepository(Asset).findOne({ where: { id: found.assetId }, lock: { mode: 'pessimistic_write' } })\r\n      const repo = em.getRepository(CustodyAssignment)\r\n      const row = a"
      }
    ],
    "listAll": [
      {
        "line": 2144,
        "expression": "this.types.findOneBy",
        "args": "{ code: filters.typeCode }"
      },
      {
        "line": 2148,
        "expression": "this.requests.find",
        "args": "{\r\n      where: where as any,\r\n      order: { createdAt: 'DESC' },\r\n      take: 500,\r\n    }"
      },
      {
        "line": 2156,
        "expression": "this.types.find",
        "args": "{ where: { isConfidential: true } }"
      },
      {
        "line": 2159,
        "expression": "this.withExecutionInfo",
        "args": "rows.map(r => this.withCanonicalStepActions(r))"
      },
      {
        "line": 2159,
        "expression": "this.withCanonicalStepActions",
        "args": "r"
      },
      {
        "line": 2162,
        "expression": "this.approvals.find",
        "args": "{\r\n          where: { requestId: In(confIds), approverId: user.sub },\r\n        }"
      },
      {
        "line": 2170,
        "expression": "this.delegationContext",
        "args": "user, rows.filter((r) => confidential.has(definitionCodeOf(r)))"
      },
      {
        "line": 2171,
        "expression": "this.withExecutionInfo",
        "args": "rows.map((r) =>\r\n      !confidential.has(definitionCodeOf(r)) ||\r\n      this.seesConfidential(user, r, true, acted.has(r.id) || executing.has(r.id), acting?.(r))\r\n        ? this.withCanonicalStepActions(r)\r\n        : thi"
      },
      {
        "line": 2172,
        "expression": "this.seesConfidential",
        "args": "user, r, true, acted.has(r.id) || executing.has(r.id), acting?.(r)"
      },
      {
        "line": 2174,
        "expression": "this.withCanonicalStepActions",
        "args": "r"
      },
      {
        "line": 2175,
        "expression": "this.maskConfidential",
        "args": "r"
      }
    ],
    "withExecutionInfo": [],
    "myApprovedLeaves": [
      {
        "line": 2195,
        "expression": "this.employees.findOne",
        "args": "{ where: { id: onBehalfEmployeeId } }"
      },
      {
        "line": 2202,
        "expression": "this.ds.getRepository(Leave).find",
        "args": "{\r\n      where: { employeeId, status: 'APPROVED' },\r\n      order: { fromDate: 'DESC' },\r\n      take: 50,\r\n    }"
      },
      {
        "line": 2202,
        "expression": "this.ds.getRepository",
        "args": "Leave"
      }
    ],
    "mine": [
      {
        "line": 2219,
        "expression": "this.requests.find",
        "args": "{\r\n      where: where as any,\r\n      order: { createdAt: 'DESC' },\r\n      take: 200,\r\n    }"
      },
      {
        "line": 2228,
        "expression": "this.employees.find",
        "args": "{ where: { id: In(onBehalfIds) }, select: ['id', 'fullName'] }"
      },
      {
        "line": 2232,
        "expression": "this.withCanonicalStepActions",
        "args": "r"
      }
    ],
    "myDecisions": [
      {
        "line": 2246,
        "expression": "this.approvals.createQueryBuilder('decision')\r\n      .innerJoin(Request, 'request', 'request.id = decision.requestId')\r\n      .where('decision.approverId = :actor', { actor: user.sub })\r\n      .andWhere('decision.action IN (:...actions)', { actions: ['APPROVED', 'APPROVE', 'APPPROVE', 'REJECTED', 'REJECT', 'RETURNED_FOR_INFO', 'RETURN'] })\r\n      .orderBy('decision.id', 'DESC').take",
        "args": "51"
      },
      {
        "line": 2246,
        "expression": "this.approvals.createQueryBuilder('decision')\r\n      .innerJoin(Request, 'request', 'request.id = decision.requestId')\r\n      .where('decision.approverId = :actor', { actor: user.sub })\r\n      .andWhere('decision.action IN (:...actions)', { actions: ['APPROVED', 'APPROVE', 'APPPROVE', 'REJECTED', 'REJECT', 'RETURNED_FOR_INFO', 'RETURN'] })\r\n      .orderBy",
        "args": "'decision.id', 'DESC'"
      },
      {
        "line": 2246,
        "expression": "this.approvals.createQueryBuilder('decision')\r\n      .innerJoin(Request, 'request', 'request.id = decision.requestId')\r\n      .where('decision.approverId = :actor', { actor: user.sub })\r\n      .andWhere",
        "args": "'decision.action IN (:...actions)', { actions: ['APPROVED', 'APPROVE', 'APPPROVE', 'REJECTED', 'REJECT', 'RETURNED_FOR_INFO', 'RETURN'] }"
      },
      {
        "line": 2246,
        "expression": "this.approvals.createQueryBuilder('decision')\r\n      .innerJoin(Request, 'request', 'request.id = decision.requestId')\r\n      .where",
        "args": "'decision.approverId = :actor', { actor: user.sub }"
      },
      {
        "line": 2246,
        "expression": "this.approvals.createQueryBuilder('decision')\r\n      .innerJoin",
        "args": "Request, 'request', 'request.id = decision.requestId'"
      },
      {
        "line": 2246,
        "expression": "this.approvals.createQueryBuilder",
        "args": "'decision'"
      },
      {
        "line": 2254,
        "expression": "this.requests.findBy",
        "args": "{ id: In([...new Set(page.map(row => row.requestId))]) }"
      },
      {
        "line": 2255,
        "expression": "this.types.findBy",
        "args": "{ code: In([...new Set(requests.map(definitionCodeOf))]) }"
      }
    ],
    "stuckRequestIds": [
      {
        "line": 2271,
        "expression": "this.parseSteps(req.resolvedSteps).filter",
        "args": "(s) => s.stepOrder === req.currentStep && !s.actedAt"
      },
      {
        "line": 2271,
        "expression": "this.parseSteps",
        "args": "req.resolvedSteps"
      },
      {
        "line": 2286,
        "expression": "this.employees.find",
        "args": "{ where: { id: In(ids) }, select: ['id', 'isActive'] }"
      },
      {
        "line": 2287,
        "expression": "this.ds.getRepository(User).find",
        "args": "{\r\n        where: { employeeId: In(ids), isActive: true },\r\n        select: { id: true, employeeId: true },\r\n      }"
      },
      {
        "line": 2287,
        "expression": "this.ds.getRepository",
        "args": "User"
      }
    ],
    "inbox": [
      {
        "line": 2308,
        "expression": "this.requests.find",
        "args": "{\r\n      where: where as any,\r\n      order: { submittedAt: 'ASC' },\r\n      take: 500,\r\n    }"
      },
      {
        "line": 2315,
        "expression": "this.resolver.hasHrOverride",
        "args": "user"
      },
      {
        "line": 2316,
        "expression": "this.stuckRequestIds",
        "args": "candidates"
      },
      {
        "line": 2319,
        "expression": "this.delegationContext",
        "args": "user, candidates"
      },
      {
        "line": 2321,
        "expression": "this.parseSteps",
        "args": "req.resolvedSteps"
      },
      {
        "line": 2322,
        "expression": "this.isOwnRequestFor",
        "args": "user, req"
      },
      {
        "line": 2328,
        "expression": "this.resolver.satisfies",
        "args": "user, s, { hrUnblock, selfRequest, actingFor: acting?.(req) }"
      },
      {
        "line": 2335,
        "expression": "this.isOwnRequestFor",
        "args": "user, req"
      },
      {
        "line": 2336,
        "expression": "this.waitingSteps(req).find",
        "args": "s => !this.resolver.holdsStep(user, s) && this.resolver.holdsStep(user, s, acting(req))"
      },
      {
        "line": 2336,
        "expression": "this.waitingSteps",
        "args": "req"
      },
      {
        "line": 2336,
        "expression": "this.resolver.holdsStep",
        "args": "user, s"
      },
      {
        "line": 2336,
        "expression": "this.resolver.holdsStep",
        "args": "user, s, acting(req)"
      },
      {
        "line": 2342,
        "expression": "this.employees.find",
        "args": "{\r\n          where: { id: In(ids) },\r\n          select: ['id', 'fullName', 'employeeCode', 'jobTitle', 'branchId'],\r\n        }"
      },
      {
        "line": 2351,
        "expression": "this.withCanonicalStepActions",
        "args": "req"
      }
    ],
    "readable": [
      {
        "line": 2378,
        "expression": "this.seesConfidential",
        "args": "user, req, inScope, approvals.some((a) => a.approverId === user.sub) || (await executionAwaitsAccount(em, user, req.id)), (await this.delegationContext(user, [req], em))?.(req)"
      },
      {
        "line": 2385,
        "expression": "this.delegationContext",
        "args": "user, [req], em"
      }
    ],
    "requesterSide": [],
    "detail": [
      {
        "line": 2408,
        "expression": "this.readable",
        "args": "user, id"
      },
      {
        "line": 2410,
        "expression": "this.maskConfidential",
        "args": "{ ...this.withCanonicalStepActions(req), approvals }"
      },
      {
        "line": 2410,
        "expression": "this.withCanonicalStepActions",
        "args": "req"
      },
      {
        "line": 2412,
        "expression": "this.attachOnBehalf",
        "args": "approvals, party"
      },
      {
        "line": 2414,
        "expression": "this.requestPeople",
        "args": "req, user"
      },
      {
        "line": 2415,
        "expression": "this.withCanonicalStepActions",
        "args": "req"
      },
      {
        "line": 2415,
        "expression": "this.resignationTerms",
        "args": "req, type, people.requester"
      },
      {
        "line": 2416,
        "expression": "this.isOvertimeDefinition",
        "args": "type"
      },
      {
        "line": 2417,
        "expression": "this.overtimeEntries.find",
        "args": "{ where: { requestId: req.id, employeeId: req.requesterId } }"
      },
      {
        "line": 2420,
        "expression": "this.ds.getRepository(OvertimeEntryEvent).find",
        "args": "{ where: { entryId: entry.id }, order: { id: 'ASC' } }"
      },
      {
        "line": 2420,
        "expression": "this.ds.getRepository",
        "args": "OvertimeEntryEvent"
      },
      {
        "line": 2424,
        "expression": "this.ds.query",
        "args": "`SELECT [id],[displayName] FROM [users] WHERE [id] IN (${actorIds.map((_, index) => `@${index}`).join(', ')})`, actorIds"
      },
      {
        "line": 2441,
        "expression": "this.ds.transaction(em => overtimeWageEvidence(em, entry.employeeId, entry.date)).catch",
        "args": "() => null"
      },
      {
        "line": 2441,
        "expression": "this.ds.transaction",
        "args": "em => overtimeWageEvidence(em, entry.employeeId, entry.date)"
      }
    ],
    "resignationTerms": [
      {
        "line": 2474,
        "expression": "this.ds.query",
        "args": "'SELECT [value] FROM [requests_config] WHERE [key] = @0', [RESIGNATION_LEGAL_TERMS_KEY]"
      },
      {
        "line": 2476,
        "expression": "this.ds.query",
        "args": "'SELECT b.[country] FROM [employees] e INNER JOIN [branches] b ON b.[id] = e.[branchId] WHERE e.[id] = @0', [requester.employeeId]"
      }
    ],
    "requestPeople": [
      {
        "line": 2487,
        "expression": "this.employees.findOne",
        "args": "{ where: { id: req.requesterId },\r\n      select: { id: true, fullName: true, employeeCode: true, jobTitle: true, branchId: true, departmentId: true, teamId: true } }"
      },
      {
        "line": 2500,
        "expression": "this.ds.getRepository(Department).findOne",
        "args": "{ where: { id: employee.departmentId }, select: { id: true, name: true } }"
      },
      {
        "line": 2500,
        "expression": "this.ds.getRepository",
        "args": "Department"
      },
      {
        "line": 2501,
        "expression": "this.ds.getRepository(Branch).findOne",
        "args": "{ where: { id: employee.branchId }, select: { id: true, name: true } }"
      },
      {
        "line": 2501,
        "expression": "this.ds.getRepository",
        "args": "Branch"
      },
      {
        "line": 2502,
        "expression": "this.ds.getRepository(Team).findOne",
        "args": "{ where: { id: employee.teamId }, select: { id: true, name: true } }"
      },
      {
        "line": 2502,
        "expression": "this.ds.getRepository",
        "args": "Team"
      },
      {
        "line": 2502,
        "expression": "this.resolver.directManagerOf",
        "args": "employee.id"
      },
      {
        "line": 2503,
        "expression": "this.resolver.unitChainOf",
        "args": "employee.departmentId"
      },
      {
        "line": 2506,
        "expression": "this.employees.findOne",
        "args": "{ where: { id: managerId }, select: { id: true, fullName: true } }"
      },
      {
        "line": 2518,
        "expression": "this.ds.getRepository(User).findOne",
        "args": "{ where: { id: req.createdByUserId }, select: { id: true, displayName: true, employeeId: true } }"
      },
      {
        "line": 2518,
        "expression": "this.ds.getRepository",
        "args": "User"
      }
    ],
    "reconcileAutoOvertime": [
      {
        "line": 2528,
        "expression": "this.moduleGate.jobEnabled",
        "args": "'overtime.reconcile-auto'"
      },
      {
        "line": 2529,
        "expression": "this.routeDetectedOvertime",
        "args": ""
      }
    ],
    "dispatchDetectedOvertime": [
      {
        "line": 2538,
        "expression": "this.routeDetectedOvertime",
        "args": "ids.slice(offset, offset + 100)"
      }
    ],
    "routeDetectedOvertime": [
      {
        "line": 2553,
        "expression": "this.moduleGate.isEnabled",
        "args": "'overtime'"
      },
      {
        "line": 2554,
        "expression": "this.types.findOneBy",
        "args": "{ code: 'OVERTIME_AUTO' }"
      },
      {
        "line": 2556,
        "expression": "this.attendance.autoApproveOvertimePeriodIds",
        "args": ""
      },
      {
        "line": 2558,
        "expression": "this.overtimeEntries.find",
        "args": "{ where: { source: 'BIOMETRIC_DETECTED', status: 'DETECTED', requestId: IsNull(),\r\n      ...(entryIds ? { id: In(entryIds) } : {}) }, take: 100 }"
      },
      {
        "line": 2573,
        "expression": "this.ds.transaction",
        "args": "async (em): Promise<'ROUTED' | 'AUTO_APPROVED' | null> => {\r\n          await lockPayrollEmployees(em, [found.employeeId])\r\n          em.queryRunner!.data.requestFinanceEmployeeIds = new Set([found.employeeId])\r\n         "
      },
      {
        "line": 2591,
        "expression": "this.attendance.overtimeEvidence",
        "args": "entry.employeeId, entry.date, em"
      },
      {
        "line": 2594,
        "expression": "this.attendance.overtimeAutoApproval",
        "args": "entry.employeeId, entry.date, evidence, em"
      },
      {
        "line": 2599,
        "expression": "this.approveDetectedOvertimeAutomatically",
        "args": "inner, entry.id, employee, evidence, auto.periods"
      },
      {
        "line": 2605,
        "expression": "this.executionFailureText",
        "args": "error"
      },
      {
        "line": 2605,
        "expression": "this.logger.warn",
        "args": "`تعذّر الاعتماد التلقائي لسجل إضافي مكتشف #${entry.id}؛ بيتوجه لسلسلة الاعتماد: ${attempt.refusal.reason}`"
      },
      {
        "line": 2612,
        "expression": "this.recordOvertimeAutoApprovalFallback",
        "args": "em, entry.id, null, attempt.refusal"
      },
      {
        "line": 2618,
        "expression": "this.resolveChain",
        "args": "type, req, em"
      },
      {
        "line": 2620,
        "expression": "this.recordOvertimeAutoApprovalFallback",
        "args": "em, entry.id, null, attempt.refusal"
      },
      {
        "line": 2628,
        "expression": "this.recordStepPendingEvent",
        "args": "em, req"
      },
      {
        "line": 2635,
        "expression": "this.recordOvertimeAutoApprovalFallback",
        "args": "em, entry.id, req.id, attempt.refusal"
      },
      {
        "line": 2636,
        "expression": "this.stageOvertimeSubmission",
        "args": "em, req, steps, null"
      },
      {
        "line": 2641,
        "expression": "this.logger.warn",
        "args": "'تعذر توجيه سجل إضافي مكتشف #' + found.id + '؛ بقي للمراجعة: ' + (error as Error).message"
      },
      {
        "line": 2646,
        "expression": "this.ds.transaction(em => this.recordOvertimeAutoApprovalFallback(em, found.id, null, refusal))\r\n            .catch",
        "args": "recordError => this.logger.warn(`تعذر تسجيل سبب رفض الاعتماد التلقائي لسجل الإضافي #${found.id}: ${(recordError as Error).message}`)"
      },
      {
        "line": 2646,
        "expression": "this.ds.transaction",
        "args": "em => this.recordOvertimeAutoApprovalFallback(em, found.id, null, refusal)"
      },
      {
        "line": 2646,
        "expression": "this.recordOvertimeAutoApprovalFallback",
        "args": "em, found.id, null, refusal"
      },
      {
        "line": 2647,
        "expression": "this.logger.warn",
        "args": "`تعذر تسجيل سبب رفض الاعتماد التلقائي لسجل الإضافي #${found.id}: ${(recordError as Error).message}`"
      }
    ],
    "approveDetectedOvertimeAutomatically": [
      {
        "line": 2674,
        "expression": "this.stageOvertimeSubmission",
        "args": "em, req, steps, null"
      },
      {
        "line": 2687,
        "expression": "this.finalizeOvertimeApproval",
        "args": "em, req, SYSTEM_APPROVER_ID, { periodIds }"
      },
      {
        "line": 2689,
        "expression": "this.recordDecisionEvent",
        "args": "em, req, 'APPROVED'"
      },
      {
        "line": 2690,
        "expression": "this.executeDestinationLocked",
        "args": "em, req"
      }
    ],
    "recordOvertimeAutoApprovalFallback": [],
    "autoCancelledAwaiting": [
      {
        "line": 2711,
        "expression": "this.approvals.find",
        "args": "{\r\n      where: { action: 'CANCELLED', approverId: 0, actedAt: MoreThanOrEqual(since) },\r\n      order: { actedAt: 'DESC' },\r\n      take: 50,\r\n    }"
      },
      {
        "line": 2717,
        "expression": "this.requests.find",
        "args": "{\r\n      where: { id: In([...new Set(acts.map((a) => a.requestId))]) },\r\n    }"
      },
      {
        "line": 2729,
        "expression": "this.parseSteps",
        "args": "request.resolvedSteps"
      },
      {
        "line": 2737,
        "expression": "this.resolver.satisfies",
        "args": "user, s, {\r\n              selfRequest: this.isOwnRequestFor(user, request),\r\n            }"
      },
      {
        "line": 2739,
        "expression": "this.isOwnRequestFor",
        "args": "user, request"
      }
    ],
    "runEscalations": [
      {
        "line": 2751,
        "expression": "this.requests.find",
        "args": "{ where: { status: 'UNDER_REVIEW' } }"
      },
      {
        "line": 2755,
        "expression": "this.ds.transaction",
        "args": "async em => {\r\n          await this.lockFinancialRequestPrelude(em, candidate.id)\r\n          const req = await em.getRepository(Request).findOne({ where: { id: candidate.id }, lock: { mode: 'pessimistic_write' } })\r\n    "
      },
      {
        "line": 2756,
        "expression": "this.lockFinancialRequestPrelude",
        "args": "em, candidate.id"
      },
      {
        "line": 2759,
        "expression": "this.parseSteps",
        "args": "req.resolvedSteps"
      },
      {
        "line": 2765,
        "expression": "this.escalationApprover",
        "args": "em, req, current.escalateTo as ApproverRole"
      },
      {
        "line": 2771,
        "expression": "this.isOvertimeRequest",
        "args": "req, em"
      },
      {
        "line": 2772,
        "expression": "this.overtimeEntryForRequest",
        "args": "em, req"
      },
      {
        "line": 2784,
        "expression": "this.recordStepPendingEvent",
        "args": "em, req, current.role"
      },
      {
        "line": 2788,
        "expression": "this.logger.error",
        "args": "`تعذّر تصعيد الطلب #${candidate.id} — لم يتوقف فحص بقية الطلبات`, (error as Error).stack"
      }
    ],
    "escalationApprover": [],
    "runScheduledTransfers": [
      {
        "line": 2821,
        "expression": "this.ds.getRepository(Transfer).find",
        "args": "{\r\n      where: { status: 'SCHEDULED' },\r\n      order: { id: 'ASC' },\r\n    }"
      },
      {
        "line": 2821,
        "expression": "this.ds.getRepository",
        "args": "Transfer"
      },
      {
        "line": 2835,
        "expression": "this.ds.transaction",
        "args": "em => this.cancelDuplicateTransfer(em, t.id, first.id)"
      },
      {
        "line": 2835,
        "expression": "this.cancelDuplicateTransfer",
        "args": "em, t.id, first.id"
      },
      {
        "line": 2836,
        "expression": "this.logger.error",
        "args": "`تعذّر إلغاء النقل المجدول المكرر #${t.id}`, (error as Error).stack"
      },
      {
        "line": 2843,
        "expression": "this.ds.transaction",
        "args": "async (em) => {\r\n        const changed = await this.destinations.executeTransfer(em, t.id)\r\n        if (!changed) return false\r\n        if (t.requestId) {\r\n          const req = await em.getRepository(Request).findOne({\r"
      },
      {
        "line": 2844,
        "expression": "this.destinations.executeTransfer",
        "args": "em, t.id"
      },
      {
        "line": 2863,
        "expression": "this.logger.warn",
        "args": "`النقل المجدول #${t.id} ما زال بانتظار التنفيذ: ${(error as Error).message}`"
      },
      {
        "line": 2864,
        "expression": "this.logger.error",
        "args": "`تعذّر تنفيذ النقل المجدول #${t.id} — ما زال بانتظار التنفيذ`, (error as Error).stack"
      },
      {
        "line": 2865,
        "expression": "this.recordScheduledExecutionFailure",
        "args": "t.requestId, t.employeeId, `تعذّر تنفيذ النقل المجدول #${t.id} بتاريخ ${t.effectiveDate} — ما زال بانتظار التنفيذ: ${this.executionFailureText(error)}`"
      },
      {
        "line": 2866,
        "expression": "this.executionFailureText",
        "args": "error"
      },
      {
        "line": 2869,
        "expression": "this.types.find",
        "args": "{ where: { destinationHandler: In([...SCHEDULED_EMPLOYMENT_HANDLERS, SALARY_CHANGE_HANDLER]) } }"
      },
      {
        "line": 2873,
        "expression": "this.requests.find",
        "args": "{ where: { typeCode: In([...byCode.keys()]), status: 'IN_EXECUTION' }, order: { id: 'ASC' } }"
      },
      {
        "line": 2883,
        "expression": "this.executeDestination",
        "args": "req.id"
      },
      {
        "line": 2884,
        "expression": "this.logger.error",
        "args": "`تعذّر تنفيذ التغيير الوظيفي المجدول #${req.id} — ما زال بانتظار التنفيذ`, (error as Error).stack"
      },
      {
        "line": 2886,
        "expression": "this.recordScheduledExecutionFailure",
        "args": "req.id, req.requesterId, `تعذّر تنفيذ التغيير المجدول — ما زال بانتظار التنفيذ: ${this.executionFailureText(error)}`"
      },
      {
        "line": 2887,
        "expression": "this.executionFailureText",
        "args": "error"
      }
    ],
    "executionFailureText": [],
    "cancelDuplicateTransfer": [],
    "recordScheduledExecutionFailure": [
      {
        "line": 2935,
        "expression": "this.ds.transaction",
        "args": "async em => {\r\n        await lockPayrollEmployees(em, [employeeId])\r\n        const req = await em.getRepository(Request).findOne({ where: { id: requestId }, lock: { mode: 'pessimistic_write' } })\r\n        if (!req || req"
      },
      {
        "line": 2943,
        "expression": "this.logger.error",
        "args": "`تعذّر تسجيل فشل التنفيذ المجدول على الطلب #${requestId}`, (error as Error).stack"
      }
    ],
    "scheduledExecutionAlerts": [
      {
        "line": 2952,
        "expression": "this.approvals.find",
        "args": "{\r\n      where: [\r\n        { action: 'EXECUTION_FAILED', approverId: 0 },\r\n        { action: 'CANCELLED', approverId: 0, step: 0, actedAt: MoreThanOrEqual(since) },\r\n      ],\r\n      order: { id: 'DESC' },\r\n      take: 20"
      },
      {
        "line": 2962,
        "expression": "this.requests.find",
        "args": "{ where: { id: In(ids) } }"
      },
      {
        "line": 2963,
        "expression": "this.ds.getRepository(Transfer).find",
        "args": "{\r\n      where: { requestId: In(ids), status: 'CANCELLED' }, select: { id: true, requestId: true },\r\n    }"
      },
      {
        "line": 2963,
        "expression": "this.ds.getRepository",
        "args": "Transfer"
      }
    ],
    "isOvertimeDefinition": [],
    "isOvertimeRequest": [],
    "lockFinancialRequestPrelude": [
      {
        "line": 3002,
        "expression": "this.isOvertimeDefinition",
        "args": "type"
      }
    ],
    "assertOvertimeClientPayload": [],
    "overtimeEntryForRequest": [],
    "assertOvertimeChain": [],
    "stageOvertimeSubmission": [
      {
        "line": 3051,
        "expression": "this.overtimeEntryForRequest",
        "args": "em, req"
      },
      {
        "line": 3056,
        "expression": "this.attendance.overtimeEvidence",
        "args": "req.requesterId, date, em"
      },
      {
        "line": 3067,
        "expression": "this.assertOvertimeChain",
        "args": "steps, evidence.evidenceMode === 'EXEMPT_APPROVAL'"
      }
    ],
    "currentOvertimeEvidence": [
      {
        "line": 3098,
        "expression": "this.attendance.overtimeEvidence",
        "args": "entry.employeeId, entry.date, em"
      },
      {
        "line": 3101,
        "expression": "this.assertOvertimeChain",
        "args": "this.parseSteps(req.resolvedSteps), evidence.evidenceMode === 'EXEMPT_APPROVAL'"
      },
      {
        "line": 3102,
        "expression": "this.parseSteps",
        "args": "req.resolvedSteps"
      }
    ],
    "overtimeComputedAtApproval": [],
    "approvalTimeOvertimeEvidence": [
      {
        "line": 3116,
        "expression": "this.attendance.overtimeEvidence",
        "args": "entry.employeeId, entry.date, em"
      },
      {
        "line": 3124,
        "expression": "this.assertOvertimeChain",
        "args": "this.parseSteps(req.resolvedSteps), false"
      },
      {
        "line": 3125,
        "expression": "this.parseSteps",
        "args": "req.resolvedSteps"
      }
    ],
    "reviewOvertimeApproval": [
      {
        "line": 3130,
        "expression": "this.overtimeEntryForRequest",
        "args": "em, req"
      },
      {
        "line": 3134,
        "expression": "this.overtimeComputedAtApproval",
        "args": "entry"
      },
      {
        "line": 3137,
        "expression": "this.assertOvertimeChain",
        "args": "this.parseSteps(req.resolvedSteps), false"
      },
      {
        "line": 3138,
        "expression": "this.parseSteps",
        "args": "req.resolvedSteps"
      },
      {
        "line": 3141,
        "expression": "this.approvalTimeOvertimeEvidence",
        "args": "em, req, entry"
      },
      {
        "line": 3141,
        "expression": "this.currentOvertimeEvidence",
        "args": "em, req, entry"
      }
    ],
    "finalizeOvertimeApproval": [
      {
        "line": 3164,
        "expression": "this.overtimeEntryForRequest",
        "args": "em, req"
      },
      {
        "line": 3166,
        "expression": "this.overtimeComputedAtApproval",
        "args": "entry"
      },
      {
        "line": 3169,
        "expression": "this.finalizeApprovalTimeOvertime",
        "args": "em, req, entry, actorUserId"
      },
      {
        "line": 3171,
        "expression": "this.currentOvertimeEvidence",
        "args": "em, req, entry"
      },
      {
        "line": 3172,
        "expression": "this.parseSteps",
        "args": "req.resolvedSteps"
      }
    ],
    "finalizeApprovalTimeOvertime": [
      {
        "line": 3189,
        "expression": "this.approvalTimeOvertimeEvidence",
        "args": "em, req, entry"
      },
      {
        "line": 3190,
        "expression": "this.parseSteps",
        "args": "req.resolvedSteps"
      }
    ],
    "releaseRequestOvertime": [
      {
        "line": 3226,
        "expression": "this.isOvertimeRequest",
        "args": "req, em"
      },
      {
        "line": 3227,
        "expression": "this.overtimeEntryForRequest",
        "args": "em, req"
      }
    ],
    "owned": [
      {
        "line": 3240,
        "expression": "this.lockFinancialRequestPrelude",
        "args": "em, id"
      }
    ],
    "approveInstantlyOnBehalf": [
      {
        "line": 3278,
        "expression": "this.isOvertimeDefinition",
        "args": "type"
      },
      {
        "line": 3278,
        "expression": "this.approveOvertimeInstantly",
        "args": "em, req, resolved, user, comment"
      },
      {
        "line": 3281,
        "expression": "this.recordDecisionEvent",
        "args": "em, req, 'APPROVED'"
      },
      {
        "line": 3282,
        "expression": "this.executeDestinationLocked",
        "args": "em, req"
      }
    ],
    "approveOvertimeInstantly": [
      {
        "line": 3291,
        "expression": "this.reviewOvertimeApproval",
        "args": "em, req, user, { action: 'APPROVE' }"
      },
      {
        "line": 3293,
        "expression": "this.overtimeEntryForRequest",
        "args": "em, req"
      },
      {
        "line": 3297,
        "expression": "this.finalizeOvertimeApproval",
        "args": "em, req, user.sub"
      }
    ],
    "isOwnRequestFor": [
      {
        "line": 3310,
        "expression": "this.resolver.hasHrOverride",
        "args": "user"
      }
    ],
    "actorIsRequester": [],
    "seesConfidential": [
      {
        "line": 3338,
        "expression": "this.waitingSteps(req).some",
        "args": "(s) => this.resolver.holdsStep(user, s, actingFor)"
      },
      {
        "line": 3338,
        "expression": "this.waitingSteps",
        "args": "req"
      },
      {
        "line": 3338,
        "expression": "this.resolver.holdsStep",
        "args": "user, s, actingFor"
      },
      {
        "line": 3341,
        "expression": "this.parseSteps(req.resolvedSteps).some",
        "args": "(s) =>\r\n        (inScope ||\r\n          (s.approverEmployeeId != null && s.approverEmployeeId === user.employeeId)) &&\r\n        // بلا مخرج الموارد البشرية: فكّ الانسداد حقّ تصرّف لا إذن اطلاع —\r\n        // المحتوى السرّي"
      },
      {
        "line": 3341,
        "expression": "this.parseSteps",
        "args": "req.resolvedSteps"
      },
      {
        "line": 3344,
        "expression": "this.resolver.satisfies",
        "args": "user, s"
      }
    ],
    "attachOnBehalf": [
      {
        "line": 3358,
        "expression": "this.employees.find",
        "args": "{ where: { id: In([...new Set(delegatorOf.values())]) }, select: ['id', 'fullName'] }"
      },
      {
        "line": 3361,
        "expression": "this.ds.getRepository(User).find",
        "args": "{ where: { id: In([...new Set(approvals.filter((row) => delegatorOf.has(row.id)).map((row) => row.approverId))]) }, select: { id: true, displayName: true } }"
      },
      {
        "line": 3361,
        "expression": "this.ds.getRepository",
        "args": "User"
      }
    ],
    "maskConfidential": [
      {
        "line": 3379,
        "expression": "this.parseSteps(r.resolvedSteps).map",
        "args": "(s) => ({ ...s, approverEmployeeId: null })"
      },
      {
        "line": 3379,
        "expression": "this.parseSteps",
        "args": "r.resolvedSteps"
      }
    ],
    "parseSteps": [],
    "withCanonicalStepActions": [
      {
        "line": 3401,
        "expression": "this.parseSteps",
        "args": "request.resolvedSteps"
      }
    ],
    "leavePayload": [],
    "executionFormFields": [
      {
        "line": 3419,
        "expression": "this.requiredRequestFields",
        "args": "type"
      },
      {
        "line": 3428,
        "expression": "this.requiredRequestFields",
        "args": "type"
      }
    ],
    "assertAttachmentOwnership": [],
    "leaveTypeShown": [],
    "typeRef": [],
    "chainRef": [],
    "assertPayloadKeys": [
      {
        "line": 3514,
        "expression": "this.isOvertimeDefinition",
        "args": "type"
      },
      {
        "line": 3515,
        "expression": "this.assertOvertimeClientPayload",
        "args": "payload ?? {}, type.code === 'OVERTIME_AUTO'"
      },
      {
        "line": 3537,
        "expression": "this.ds.getMetadata(Employee).columns.map",
        "args": "column => column.propertyName"
      },
      {
        "line": 3537,
        "expression": "this.ds.getMetadata",
        "args": "Employee"
      },
      {
        "line": 3547,
        "expression": "this.typeRef",
        "args": "type, viewer"
      },
      {
        "line": 3570,
        "expression": "this.ds.getMetadata",
        "args": "Employee"
      }
    ],
    "assertSubmitValues": [
      {
        "line": 3624,
        "expression": "this.requiredRequestFields",
        "args": "type"
      }
    ],
    "requiredRequestFields": [],
    "scoped": [
      {
        "line": 3673,
        "expression": "this.lockFinancialRequestPrelude",
        "args": "em, id"
      }
    ]
  },
  "requests/destinations.service.ts": {
    "handlerKeys": [],
    "supports": [],
    "executionModeOf": [
      {
        "line": 237,
        "expression": "this.supports",
        "args": "type"
      }
    ],
    "executionLabelOf": [
      {
        "line": 242,
        "expression": "this.executionModeOf",
        "args": "type"
      }
    ],
    "unsupportedMessage": [],
    "execute": [
      {
        "line": 262,
        "expression": "this.supports",
        "args": "type"
      },
      {
        "line": 277,
        "expression": "this.logger.warn",
        "args": "`لا يوجد handler لـ ${type.destinationHandler} — رُفض تنفيذ الطلب #${req.id}`"
      },
      {
        "line": 279,
        "expression": "this.unsupportedMessage",
        "args": "type"
      },
      {
        "line": 281,
        "expression": "this.assertRequesterInRequestBranch",
        "args": "em, req"
      },
      {
        "line": 282,
        "expression": "this.handlers[type.destinationHandler]",
        "args": "em, req, type, payload"
      }
    ],
    "assertRequesterInRequestBranch": [],
    "loanRequestActor": [],
    "executeTransfer": []
  },
  "expenses/expense-reports.ts": {
    "expenseAmount": [
      {
        "line": 221,
        "expression": "String",
        "args": "raw"
      },
      {
        "line": 221,
        "expression": "raw.trim",
        "args": ""
      },
      {
        "line": 222,
        "expression": "/^\\d{1,9}(\\.\\d{1,2})?$/.test",
        "args": "text"
      },
      {
        "line": 223,
        "expression": "Number",
        "args": "text"
      }
    ],
    "categoryFields": [
      {
        "line": 231,
        "expression": "cleanText",
        "args": "input.name, 120"
      },
      {
        "line": 235,
        "expression": "expenseAmount",
        "args": "input.limitPerLine"
      },
      {
        "line": 239,
        "expression": "(LIMIT_MODES as readonly unknown[]).includes",
        "args": "mode"
      }
    ],
    "reportFields": [
      {
        "line": 250,
        "expression": "cleanText",
        "args": "input.title, 200"
      },
      {
        "line": 253,
        "expression": "blank",
        "args": "input.tripFrom"
      },
      {
        "line": 253,
        "expression": "blank",
        "args": "input.tripTo"
      },
      {
        "line": 254,
        "expression": "validYmd",
        "args": "input.tripFrom"
      },
      {
        "line": 254,
        "expression": "validYmd",
        "args": "input.tripTo"
      }
    ],
    "lineFields": [
      {
        "line": 263,
        "expression": "Number.isSafeInteger",
        "args": "input.categoryId"
      },
      {
        "line": 264,
        "expression": "validYmd",
        "args": "input.expenseDate"
      },
      {
        "line": 266,
        "expression": "expenseAmount",
        "args": "input.amount"
      },
      {
        "line": 268,
        "expression": "cleanText",
        "args": "input.note, 300"
      },
      {
        "line": 272,
        "expression": "Number.isSafeInteger",
        "args": "input.receiptFileId"
      }
    ],
    "gradeLimitsOf": [
      {
        "line": 281,
        "expression": "Array.isArray",
        "args": "raw"
      },
      {
        "line": 284,
        "expression": "expenseAmount",
        "args": "item?.limitPerLine"
      },
      {
        "line": 285,
        "expression": "Number.isSafeInteger",
        "args": "gradeId"
      },
      {
        "line": 286,
        "expression": "limits.some",
        "args": "(row) => row.gradeId === gradeId"
      },
      {
        "line": 286,
        "expression": "limits.push",
        "args": "{ gradeId, limitPerLine }"
      }
    ],
    "rateFields": [
      {
        "line": 296,
        "expression": "cleanText",
        "args": "input.destination, 80"
      },
      {
        "line": 298,
        "expression": "Number.isSafeInteger",
        "args": "input.categoryId"
      },
      {
        "line": 301,
        "expression": "Number.isSafeInteger",
        "args": "input.gradeId"
      },
      {
        "line": 304,
        "expression": "expenseAmount",
        "args": "input.dailyAmount, 99_999.99"
      }
    ],
    "perDiemFields": [
      {
        "line": 314,
        "expression": "cleanText",
        "args": "input.destination, 80"
      },
      {
        "line": 316,
        "expression": "Number.isInteger",
        "args": "input.days"
      },
      {
        "line": 317,
        "expression": "validYmd",
        "args": "input.expenseDate"
      },
      {
        "line": 319,
        "expression": "cleanText",
        "args": "input.note, 300"
      }
    ],
    "pickRate": [
      {
        "line": 327,
        "expression": "rates.filter",
        "args": "(rate) => flag(rate.isActive) && rate.destination === destination"
      },
      {
        "line": 327,
        "expression": "flag",
        "args": "rate.isActive"
      },
      {
        "line": 328,
        "expression": "open.find",
        "args": "(rate) => rate.gradeId != null && Number(rate.gradeId) === gradeId"
      },
      {
        "line": 328,
        "expression": "Number",
        "args": "rate.gradeId"
      },
      {
        "line": 328,
        "expression": "open.find",
        "args": "(rate) => rate.gradeId == null"
      }
    ],
    "perDiemIssue": [
      {
        "line": 337,
        "expression": "rates.find",
        "args": "(row) => row.id === line.perDiemRateId"
      },
      {
        "line": 339,
        "expression": "pickRate",
        "args": "rates, rate.destination, gradeId"
      },
      {
        "line": 340,
        "expression": "Number",
        "args": "line.perDiemDays"
      },
      {
        "line": 341,
        "expression": "Number.isInteger",
        "args": "days"
      },
      {
        "line": 341,
        "expression": "perDiemCents",
        "args": "days, rate.dailyAmount"
      },
      {
        "line": 341,
        "expression": "cents",
        "args": "line.amount"
      },
      {
        "line": 341,
        "expression": "perDiemChanged",
        "args": "rate.destination"
      }
    ],
    "lineIssue": [
      {
        "line": 352,
        "expression": "flag",
        "args": "category.isActive"
      },
      {
        "line": 354,
        "expression": "cents",
        "args": "line.amount"
      },
      {
        "line": 354,
        "expression": "cents",
        "args": "limit"
      },
      {
        "line": 355,
        "expression": "money",
        "args": "cents(line.amount)"
      },
      {
        "line": 355,
        "expression": "cents",
        "args": "line.amount"
      },
      {
        "line": 355,
        "expression": "money",
        "args": "cents(limit)"
      },
      {
        "line": 355,
        "expression": "cents",
        "args": "limit"
      },
      {
        "line": 356,
        "expression": "flag",
        "args": "category.receiptRequired"
      },
      {
        "line": 357,
        "expression": "money",
        "args": "cents(limit)"
      },
      {
        "line": 357,
        "expression": "cents",
        "args": "limit"
      }
    ],
    "reportPhase": [
      {
        "line": 369,
        "expression": "RELEASED.includes",
        "args": "linkedStatus"
      }
    ],
    "expenseReportsReady": [
      {
        "line": 379,
        "expression": "em.query",
        "args": "`SELECT CASE WHEN OBJECT_ID(N'dbo.expense_categories', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.expense_reports', N'U') IS NOT NULL\r\n    AND OBJECT_ID(N'dbo.expense_lines', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.expense_cate"
      },
      {
        "line": 382,
        "expression": "Number",
        "args": "row?.ready"
      }
    ],
    "resetExpenseReportsCache": [],
    "lockReport": [
      {
        "line": 393,
        "expression": "em.query",
        "args": "'SELECT [requestId] FROM dbo.expense_reports WHERE [id] = @0', [reportId]"
      },
      {
        "line": 395,
        "expression": "Number",
        "args": "peek.requestId"
      },
      {
        "line": 399,
        "expression": "em.query",
        "args": "'SELECT [status] FROM dbo.requests WITH (UPDLOCK, ROWLOCK) WHERE [id] = @0', [linkedId]"
      },
      {
        "line": 400,
        "expression": "String",
        "args": "linked.status"
      },
      {
        "line": 402,
        "expression": "em.getRepository(ExpenseReport).findOne",
        "args": "{ where: { id: reportId }, lock: { mode: 'pessimistic_write' } }"
      },
      {
        "line": 402,
        "expression": "em.getRepository",
        "args": "ExpenseReport"
      },
      {
        "line": 404,
        "expression": "Number",
        "args": "report.requestId"
      }
    ],
    "gradePolicy": [
      {
        "line": 411,
        "expression": "em.query",
        "args": "'SELECT [gradeId] FROM dbo.employees WHERE [id] = @0', [employeeId]"
      },
      {
        "line": 412,
        "expression": "Number",
        "args": "person.gradeId"
      },
      {
        "line": 414,
        "expression": "em.getRepository(ExpenseCategoryLimit).find",
        "args": "{ where: { gradeId } }"
      },
      {
        "line": 414,
        "expression": "em.getRepository",
        "args": "ExpenseCategoryLimit"
      },
      {
        "line": 414,
        "expression": "limits.set",
        "args": "row.categoryId, Number(row.limitPerLine)"
      },
      {
        "line": 414,
        "expression": "Number",
        "args": "row.limitPerLine"
      },
      {
        "line": 415,
        "expression": "em.getRepository(PerDiemRate).find",
        "args": "{ order: { id: 'ASC' } }"
      },
      {
        "line": 415,
        "expression": "em.getRepository",
        "args": "PerDiemRate"
      }
    ],
    "judgeLines": [
      {
        "line": 421,
        "expression": "em.getRepository(ExpenseLine).find",
        "args": "{ where: { reportId: report.id }, order: { expenseDate: 'ASC', id: 'ASC' } }"
      },
      {
        "line": 421,
        "expression": "em.getRepository",
        "args": "ExpenseLine"
      },
      {
        "line": 422,
        "expression": "(await em.getRepository(ExpenseCategory).find()).map",
        "args": "(row) => [row.id, row]"
      },
      {
        "line": 422,
        "expression": "em.getRepository(ExpenseCategory).find",
        "args": ""
      },
      {
        "line": 422,
        "expression": "em.getRepository",
        "args": "ExpenseCategory"
      },
      {
        "line": 423,
        "expression": "gradePolicy",
        "args": "em, report.employeeId"
      },
      {
        "line": 427,
        "expression": "categories.get",
        "args": "line.categoryId"
      },
      {
        "line": 430,
        "expression": "perDiemIssue",
        "args": "policy.rates, line, policy.gradeId"
      },
      {
        "line": 431,
        "expression": "cents",
        "args": "line.amount"
      },
      {
        "line": 431,
        "expression": "staged.push",
        "args": "{ category: category?.name ?? '—', date: ymd(line.expenseDate), amount: cents(line.amount) / 100, note: line.note ?? null, receipt: null, warning: null,\r\n        perDiem: perDiemText(line.perDiemDays, policy.rates.find(("
      },
      {
        "line": 432,
        "expression": "ymd",
        "args": "line.expenseDate"
      },
      {
        "line": 432,
        "expression": "cents",
        "args": "line.amount"
      },
      {
        "line": 433,
        "expression": "perDiemText",
        "args": "line.perDiemDays, policy.rates.find((rate) => rate.id === line.perDiemRateId)"
      },
      {
        "line": 433,
        "expression": "policy.rates.find",
        "args": "(rate) => rate.id === line.perDiemRateId"
      },
      {
        "line": 436,
        "expression": "lineIssue",
        "args": "category, line, true, policy.limits.get(line.categoryId) ?? null"
      },
      {
        "line": 436,
        "expression": "policy.limits.get",
        "args": "line.categoryId"
      },
      {
        "line": 438,
        "expression": "cents",
        "args": "line.amount"
      },
      {
        "line": 438,
        "expression": "staged.push",
        "args": "{ category: category?.name ?? '—', date: ymd(line.expenseDate), amount: cents(line.amount) / 100, note: line.note ?? null, receipt: line.receiptFileId ? `file:${line.receiptFileId}` : null, warning: issue.warn }"
      },
      {
        "line": 439,
        "expression": "ymd",
        "args": "line.expenseDate"
      },
      {
        "line": 439,
        "expression": "cents",
        "args": "line.amount"
      }
    ],
    "stageExpenseReport": [
      {
        "line": 458,
        "expression": "payloadOf",
        "args": "req.payload"
      },
      {
        "line": 460,
        "expression": "reportIdOf",
        "args": "payload.reportId"
      },
      {
        "line": 462,
        "expression": "expenseReportsReady",
        "args": "em"
      },
      {
        "line": 463,
        "expression": "lockReport",
        "args": "em, reportId, { id: req.id, status: req.status }"
      },
      {
        "line": 468,
        "expression": "Number",
        "args": "report.requestId"
      },
      {
        "line": 469,
        "expression": "reportPhase",
        "args": "report.status, linkedStatus"
      },
      {
        "line": 470,
        "expression": "reportPhase",
        "args": "report.status, linkedStatus"
      },
      {
        "line": 471,
        "expression": "judgeLines",
        "args": "em, report"
      },
      {
        "line": 473,
        "expression": "attachedAdvance",
        "args": "em, report.id"
      },
      {
        "line": 477,
        "expression": "em.getRepository(ExpenseReport).update",
        "args": "{ id: report.id }, { status: 'SUBMITTED', requestId: req.id, totalAmount: judged.totalCents / 100, submittedAt: now, updatedAt: now }"
      },
      {
        "line": 477,
        "expression": "em.getRepository",
        "args": "ExpenseReport"
      },
      {
        "line": 478,
        "expression": "ymd",
        "args": "report.tripFrom"
      },
      {
        "line": 479,
        "expression": "ymd",
        "args": "report.tripTo"
      },
      {
        "line": 480,
        "expression": "cents",
        "args": "advance.amount"
      },
      {
        "line": 480,
        "expression": "cents",
        "args": "advance.amount"
      }
    ],
    "executeExpenseReport": [
      {
        "line": 490,
        "expression": "expenseReportsReady",
        "args": "em"
      },
      {
        "line": 491,
        "expression": "reportIdOf",
        "args": "payload.reportId"
      },
      {
        "line": 492,
        "expression": "lockReport",
        "args": "em, reportId, { id: req.id, status: req.status }"
      },
      {
        "line": 493,
        "expression": "Number",
        "args": "locked.report.requestId"
      },
      {
        "line": 495,
        "expression": "reportCode",
        "args": "report.id"
      },
      {
        "line": 497,
        "expression": "assertHumanApproval",
        "args": "em, req"
      },
      {
        "line": 498,
        "expression": "judgeLines",
        "args": "em, report"
      },
      {
        "line": 499,
        "expression": "attachedAdvance",
        "args": "em, report.id"
      },
      {
        "line": 500,
        "expression": "Number.isFinite",
        "args": "value"
      },
      {
        "line": 500,
        "expression": "cents",
        "args": "value"
      },
      {
        "line": 501,
        "expression": "centsOf",
        "args": "payload.advanceAmount"
      },
      {
        "line": 502,
        "expression": "cents",
        "args": "advance.amount"
      },
      {
        "line": 503,
        "expression": "centsOf",
        "args": "payload.amount"
      },
      {
        "line": 503,
        "expression": "cents",
        "args": "report.totalAmount"
      },
      {
        "line": 507,
        "expression": "Math.abs",
        "args": "netCents"
      },
      {
        "line": 509,
        "expression": "advanceCode",
        "args": "advance.id"
      },
      {
        "line": 509,
        "expression": "reportCode",
        "args": "report.id"
      },
      {
        "line": 509,
        "expression": "money",
        "args": "judged.totalCents"
      },
      {
        "line": 509,
        "expression": "money",
        "args": "advanceCents ?? 0"
      },
      {
        "line": 510,
        "expression": "reportCode",
        "args": "report.id"
      },
      {
        "line": 511,
        "expression": "em.getRepository(EmployeeObligation).save",
        "args": "{\r\n    employeeId: req.requesterId, type: netCents > 0 ? 'CREDIT' : 'DEBIT', category: netCents > 0 ? 'expense' : SETTLEMENT_CATEGORY, amount, label: label.slice(0, 300), status: 'PENDING',\r\n    sourceRequestId: req.id, "
      },
      {
        "line": 511,
        "expression": "em.getRepository",
        "args": "EmployeeObligation"
      },
      {
        "line": 512,
        "expression": "label.slice",
        "args": "0, 300"
      },
      {
        "line": 516,
        "expression": "em.getRepository(TravelAdvance).update",
        "args": "{ id: advance.id }, { status: 'SETTLED', closedAt: now }"
      },
      {
        "line": 516,
        "expression": "em.getRepository",
        "args": "TravelAdvance"
      },
      {
        "line": 517,
        "expression": "em.getRepository(ExpenseReport).update",
        "args": "{ id: report.id }, { status: 'APPROVED', obligationId: entry ? entry.id : null, approvedAt: now, updatedAt: now }"
      },
      {
        "line": 517,
        "expression": "em.getRepository",
        "args": "ExpenseReport"
      },
      {
        "line": 519,
        "expression": "reportCode",
        "args": "report.id"
      },
      {
        "line": 519,
        "expression": "reportCode",
        "args": "report.id"
      },
      {
        "line": 519,
        "expression": "advanceCode",
        "args": "advance.id"
      }
    ],
    "expenseReportFields": [
      {
        "line": 524,
        "expression": "JSON.parse",
        "args": "raw || '[]'"
      },
      {
        "line": 524,
        "expression": "Array.isArray",
        "args": "parsed"
      },
      {
        "line": 526,
        "expression": "listOf(type.customFields).filter",
        "args": "(field): field is { key: string } => !!field && typeof field === 'object' && typeof (field as { key?: unknown }).key === 'string'\r\n    && !reserved.includes((field as { key: string }).key)"
      },
      {
        "line": 526,
        "expression": "listOf",
        "args": "type.customFields"
      },
      {
        "line": 527,
        "expression": "reserved.includes",
        "args": "(field as { key: string }).key"
      },
      {
        "line": 528,
        "expression": "listOf(type.requiredFields).filter",
        "args": "(key): key is string => typeof key === 'string' && !reserved.includes(key)"
      },
      {
        "line": 528,
        "expression": "listOf",
        "args": "type.requiredFields"
      },
      {
        "line": 528,
        "expression": "reserved.includes",
        "args": "key"
      },
      {
        "line": 529,
        "expression": "JSON.stringify",
        "args": "required"
      },
      {
        "line": 529,
        "expression": "JSON.stringify",
        "args": "[{ key: 'reportId', label: 'رقم تقرير المصروفات (من شاشة «مصروفاتي»)', type: 'number', required: true }, ...extra]"
      }
    ]
  },
  "expenses/travel-advances.ts": {
    "advanceValues": [
      {
        "line": 72,
        "expression": "String",
        "args": "payload.amount"
      },
      {
        "line": 72,
        "expression": "payload.amount.trim",
        "args": ""
      },
      {
        "line": 73,
        "expression": "/^\\d{1,6}(\\.\\d{1,2})?$/.test",
        "args": "text"
      },
      {
        "line": 73,
        "expression": "Number",
        "args": "text"
      },
      {
        "line": 75,
        "expression": "payload.reason.trim().replace",
        "args": "/\\s+/g, ' '"
      },
      {
        "line": 75,
        "expression": "payload.reason.trim",
        "args": ""
      }
    ],
    "travelAdvancesReady": [
      {
        "line": 84,
        "expression": "em.query",
        "args": "`SELECT CASE WHEN OBJECT_ID(N'dbo.travel_advances', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`"
      },
      {
        "line": 85,
        "expression": "Number",
        "args": "row?.ready"
      }
    ],
    "resetTravelAdvancesCache": [],
    "stageTravelAdvance": [
      {
        "line": 97,
        "expression": "travelAdvancesReady",
        "args": "em"
      },
      {
        "line": 98,
        "expression": "payloadOf",
        "args": "req.payload"
      },
      {
        "line": 99,
        "expression": "advanceValues",
        "args": "payload"
      }
    ],
    "executeTravelAdvance": [
      {
        "line": 107,
        "expression": "travelAdvancesReady",
        "args": "em"
      },
      {
        "line": 108,
        "expression": "em.getRepository",
        "args": "TravelAdvance"
      },
      {
        "line": 109,
        "expression": "advances.findOne",
        "args": "{ where: { requestId: req.id } }"
      },
      {
        "line": 110,
        "expression": "advanceCode",
        "args": "made.id"
      },
      {
        "line": 112,
        "expression": "assertHumanApproval",
        "args": "em, req"
      },
      {
        "line": 113,
        "expression": "advanceValues",
        "args": "payload"
      },
      {
        "line": 114,
        "expression": "advances.save",
        "args": "advances.create({ employeeId: req.requesterId, amount: values.amount, purpose: values.purpose, status: 'OPEN', requestId: req.id, paidAt: null, paidByUserId: null,\r\n    reportId: null, closedAt: null, closedByUserId: nul"
      },
      {
        "line": 114,
        "expression": "advances.create",
        "args": "{ employeeId: req.requesterId, amount: values.amount, purpose: values.purpose, status: 'OPEN', requestId: req.id, paidAt: null, paidByUserId: null,\r\n    reportId: null, closedAt: null, closedByUserId: null, closeNote: nu"
      },
      {
        "line": 116,
        "expression": "advanceCode",
        "args": "advance.id"
      },
      {
        "line": 116,
        "expression": "advanceCode",
        "args": "advance.id"
      }
    ],
    "attachedAdvance": [
      {
        "line": 121,
        "expression": "travelAdvancesReady",
        "args": "em"
      },
      {
        "line": 122,
        "expression": "em.getRepository(TravelAdvance).findOne",
        "args": "{ where: { reportId, status: 'OPEN' }, order: { id: 'ASC' }, lock: { mode: 'pessimistic_write' } }"
      },
      {
        "line": 122,
        "expression": "em.getRepository",
        "args": "TravelAdvance"
      }
    ],
    "openAdvancesOf": [
      {
        "line": 127,
        "expression": "travelAdvancesReady",
        "args": "em"
      },
      {
        "line": 128,
        "expression": "em.query",
        "args": "`SELECT COUNT(*) AS [n], SUM([amount]) AS [total] FROM dbo.travel_advances WHERE [employeeId] = @0 AND [status] = N'OPEN'`, [employeeId]"
      },
      {
        "line": 129,
        "expression": "Number",
        "args": "row?.n ?? 0"
      },
      {
        "line": 129,
        "expression": "Math.round",
        "args": "Number(row?.total ?? 0) * 100"
      },
      {
        "line": 129,
        "expression": "Number",
        "args": "row?.total ?? 0"
      }
    ]
  },
  "expenses/human-approval.ts": {
    "assertHumanApproval": [
      {
        "line": 18,
        "expression": "em.query",
        "args": "`SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\r\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' AND a.[step] > 0 AND a.[approverId] > 0 AND (u.[employeeId"
      }
    ]
  }
}

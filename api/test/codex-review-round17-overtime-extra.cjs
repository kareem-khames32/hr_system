// Independent cases inserted into a copy of the product fixture by round17-build-overtime.cjs.
test('CR17 overtime: exact overnight settlement boundary and fresh conflicting periods',async t=>{
  const f=await fixture({shift:{startTime:'22:00',endTime:'06:00',requiredWorkMinutes:480,checkinFrom:'21:00',checkinTo:'23:30',checkoutFrom:'05:00',checkoutTo:'16:00'}})
  await period(f.hr,{name:'حد الاستقرار الليلي',branchId:f.branch.id,autoApprove:true})
  let waiting
  await configDuring({'attendance.sync_interval_minutes':LONG_SYNC_INTERVAL},async()=>{
    const r=await request(admin,'POST','/attendance/punches/manual',{reason:'اختبار مستقل: وردية تعبر منتصف الليل',punches:[
      {employeeCode:f.emp.employeeCode,timestamp:new Date(`${f.day}T22:00:00`).toISOString()},
      {employeeCode:f.emp.employeeCode,timestamp:new Date(`${dateAfter(f.day,1)}T08:35:00`).toISOString()}]})
    assert.equal(r.status,201,JSON.stringify(r.body));[waiting]=await entriesOf(f);assert.equal(waiting.status,'DETECTED')
  })
  const evidence=await attendance.overtimeEvidence(f.emp.id,f.day)
  assert.equal(evidence.detectedMinutes,150)
  await configDuring({'attendance.sync_interval_minutes':'60'},async()=>{
    const end=await attendance.overtimeWorkdayEnd(f.emp.id,f.day)
    const expected=new Date(`${dateAfter(f.day,1)}T17:10:00`).getTime()
    assert.equal(end.settledAt.getTime(),expected)
    const before=await attendance.overtimeAutoApproval(f.emp.id,f.day,evidence,undefined,new Date(expected-1))
    const at=await attendance.overtimeAutoApproval(f.emp.id,f.day,evidence,undefined,new Date(expected))
    assert.equal(before.finished,false);assert.equal(at.finished,true)
    t.diagnostic(JSON.stringify({case:'night-boundary',endsAt:end.endsAt.toISOString(),settledAt:end.settledAt.toISOString(),before:before.finished,at:at.finished}))
  })
  // A changed period must invalidate a previously open evidence object, even before recompute.
  const closed=await repo('OvertimePeriod').save({name:'قفل مستقل متداخل',fromDate:f.day,toDate:f.day,effect:'CLOSED',branchId:f.branch.id,isActive:true,autoApprove:false})
  assert.equal(await attendance.overtimeAutoApproval(f.emp.id,f.day,evidence),null)
  await requests.dispatchDetectedOvertime([waiting.id])
  assert.equal((await repo('OvertimeEntry').findOneByOrFail({id:waiting.id})).requestId,null)
  await repo('OvertimePeriod').delete(closed.id)
  await requests.dispatchDetectedOvertime([waiting.id])
  const paid=await repo('OvertimeEntry').findOneByOrFail({id:waiting.id})
  assert.equal(paid.status,'APPROVED');assert.equal(Number(paid.amountSnapshot),140.62)
})

test('CR17 overtime: concurrent dispatch creates exactly one financial approval',async t=>{
  const f=await fixture()
  await period(f.hr,{name:'اعتماد متزامن',branchId:f.branch.id,autoApprove:true})
  await configDuring({'attendance.sync_interval_minutes':LONG_SYNC_INTERVAL},()=>punches(f))
  const [waiting]=await entriesOf(f);assert.equal(waiting.status,'DETECTED')
  const responses=await Promise.all(Array.from({length:4},()=>requests.dispatchDetectedOvertime([waiting.id])))
  const entry=await repo('OvertimeEntry').findOneByOrFail({id:waiting.id})
  assert.equal(entry.status,'APPROVED');assert.equal(Number(entry.amountSnapshot),140.62)
  assert.equal(await repo('Request').count({where:{requesterId:f.emp.id}}),1)
  assert.equal((await decisionsOf(entry.requestId)).length,1)
  assert.equal((await eventsOf(entry.id)).filter(e=>e.eventType==='AUTO_APPROVED').length,1)
  assert.equal((await repo('OvertimeDayClaim').findBy({employeeId:f.emp.id,workDate:f.day})).filter(c=>c.releasedAt===null).length,1)
  t.diagnostic(JSON.stringify({case:'concurrent-auto-approval',responses,requests:1,decisions:1,amount:Number(entry.amountSnapshot)}))
})

test('CR17 overtime: monthly cap rollback leaves no system decision and ordinary chain can approve later',async t=>{
  const f=await fixture()
  await period(f.hr,{name:'سقف شهري',branchId:f.branch.id,autoApprove:true})
  await configDuring({'overtime.max_hours_per_month':'2'},()=>punches(f))
  const [entry]=await entriesOf(f)
  assert.equal(entry.status,'SUBMITTED');assert.equal(entry.amountSnapshot,null)
  const req=await repo('Request').findOneByOrFail({id:entry.requestId})
  assert.equal(req.status,'UNDER_REVIEW');assert.deepEqual(await decisionsOf(req.id),[])
  const events=await eventsOf(entry.id)
  assert.equal(events.filter(e=>e.eventType==='AUTO_APPROVAL_FALLBACK').length,1)
  assert.equal(events.filter(e=>e.eventType==='AUTO_APPROVED').length,0)
  assert.equal(await repo('Request').count({where:{requesterId:f.emp.id}}),1)
  // Restoring the monthly policy changes the evidence; approval must first refuse the stale snapshot.
  const stale=await decide(f.manager,req.id)
  assert.equal(stale.status,409);assert.equal(stale.body.code,'OVERTIME_EVIDENCE_CHANGED')
  const returned=await request(f.manager,'POST',`/requests/${req.id}/act`,{action:'RETURN',comment:'تغير سقف السياسة؛ أعد تقديم الأدلة'})
  assert.equal(returned.status,201,JSON.stringify(returned.body))
  const submitted=await request(f.owner,'POST',`/requests/${req.id}/resubmit`,{payload:{date:f.day,hours:2.5,reason:'تجديد الأدلة بعد تعديل السياسة'}})
  assert.equal(submitted.status,201,JSON.stringify(submitted.body))
  for(const actor of[f.manager,f.head,f.hr]){const r=await decide(actor,req.id);assert.equal(r.status,201,JSON.stringify(r.body))}
  const approved=await repo('OvertimeEntry').findOneByOrFail({id:entry.id})
  assert.equal(approved.status,'APPROVED');assert.equal(Number(approved.amountSnapshot),140.62)
  assert.equal(toObject(approved.calculationSnapshot).approval.autoApproval,undefined)
  t.diagnostic(JSON.stringify({case:'monthly-fallback',systemDecisions:0,manualDecisions:3,amount:Number(approved.amountSnapshot)}))
})

test('CR17 overtime: missing punch after detection blocks automatic approval',async()=>{
  const f=await fixture()
  await period(f.hr,{name:'دليل تغير',branchId:f.branch.id,autoApprove:true})
  await configDuring({'attendance.sync_interval_minutes':LONG_SYNC_INTERVAL},()=>punches(f))
  const [entry]=await entriesOf(f)
  // Alter only synthetic raw evidence in our disposable DB; a null correction is intentionally not a punch deletion.
  const raw=await repo('AttendancePunch').find({where:{employeeId:f.emp.id},order:{punchTime:'ASC'}})
  assert.equal(raw.length,2);await repo('AttendancePunch').delete(raw[1].id)
  const evidence=await attendance.overtimeEvidence(f.emp.id,f.day)
  assert.ok(evidence.blockers.length>0)
  await requests.dispatchDetectedOvertime([entry.id])
  const unchanged=await repo('OvertimeEntry').findOneByOrFail({id:entry.id})
  assert.equal(unchanged.requestId,null);assert.equal(unchanged.amountSnapshot,null)
})

test('CR17 SQL engine and compatibility recorded without company database access',async t=>{
  const rows=await ds.query("SELECT CONVERT(varchar(100),SERVERPROPERTY('ProductVersion')) AS version, compatibility_level AS compatibility FROM sys.databases WHERE name=DB_NAME()")
  assert.equal(rows[0].compatibility,150);t.diagnostic(JSON.stringify({case:'sql-version',...rows[0]}))
})

test('CR17 overtime: automatic and manual amounts survive real payroll approval and payment exactly once',async t=>{
  const item=await repo('PayrollItem').findOneByOrFail({employeeId:D.auto.f.emp.id})
  const runId=item.runId
  const finance=await repo('User').save({email:'round17-finance@review.invalid',displayName:'معتمد مالي مستقل',passwordHash:'test-only',role:'super_admin',permissions:'["*"]'})
  const {writeParityReasonsBeforeApproval}=require('./fixtures/payroll-parity-reasons.cjs')
  await writeParityReasonsBeforeApproval(request,finance,'POST',`/payroll/runs/${runId}/approve`)
  const missing=await request(finance,'GET',`/payroll/runs/${runId}/unassigned`)
  assert.equal(missing.status,200,JSON.stringify(missing.body))
  const ack=await request(finance,'POST',`/payroll/runs/${runId}/unassigned-ack`,{reportHash:missing.body.reportHash})
  assert.equal(ack.status,201,JSON.stringify(ack.body))
  const approve=await request(finance,'POST',`/payroll/runs/${runId}/approve`)
  assert.equal(approve.status,201,JSON.stringify(approve.body))
  const pay=await request(finance,'POST',`/payroll/runs/${runId}/pay`,{channel:'CASH',reference:'CR17-INDEPENDENT-PAYMENT'})
  assert.equal(pay.status,201,JSON.stringify(pay.body));assert.equal(pay.body.status,'PAID')
  const items=await repo('PayrollItem').findBy({runId})
  assert.equal(items.length,2);assert.deepEqual(items.map(i=>Number(i.overtimeAmount)),[140.62,140.62])
  for(const {entry} of [D.auto,D.manual])assert.equal((await repo('OvertimeEntry').findOneByOrFail({id:entry.id})).status,'PAID')
  const second=await request(finance,'POST',`/payroll/runs/${runId}/pay`,{channel:'CASH',reference:'CR17-DUPLICATE'})
  assert.ok(second.status>=400,JSON.stringify(second.body))
  assert.deepEqual((await repo('PayrollItem').findBy({runId})).map(i=>Number(i.overtimeAmount)),[140.62,140.62])
  t.diagnostic(JSON.stringify({case:'auto-manual-payroll-paid',approve:approve.status,pay:pay.status,repeatPay:second.status,overtimeAmounts:[140.62,140.62],overtimeTotal:281.24}))
})

test('CR17 branch: transferred employee automatic overtime does not expose the former branch period name to new branch reader',async t=>{
  const old=await fixture(),current=await fixture(),hidden='R17-A-PRIVATE-PERIOD'
  const change=async from=>{
    const context=await request(admin,'GET',`/attendance/calendar-context?scope=EMPLOYEE&sourceId=${old.emp.id}`)
    assert.equal(context.status,200,JSON.stringify(context.body))
    return {effectiveFrom:from,reason:'قرار نقل مؤرخ للاختبار المستقل',expectedRevision:context.body.revision,expectedCurrentSourceHash:context.body.currentSourceHash}
  }
  const baseline=await request(admin,'POST','/attendance/calendar-context/confirm',{scope:'EMPLOYEE',sourceId:old.emp.id,calendarChange:await change(dateAfter(old.day,-20))})
  assert.equal(baseline.status,201,JSON.stringify(baseline.body))
  const p=await period(old.hr,{name:hidden,branchId:old.branch.id,autoApprove:true})
  await configDuring({'attendance.sync_interval_minutes':LONG_SYNC_INTERVAL},()=>punches(old))
  const [entry]=await entriesOf(old);assert.equal(entry.status,'DETECTED')
  const moveDate=dateAfter(old.day,1)
  const transfer=await request(admin,'PATCH',`/employees/${old.emp.id}`,{branchId:current.branch.id,departmentId:current.emp.departmentId,managerEmployeeId:null,
    attendanceEffectiveFrom:moveDate,attendanceChangeReason:'قرار نقل مؤرخ للاختبار المستقل',calendarChange:await change(moveDate)})
  assert.equal(transfer.status,200,JSON.stringify(transfer.body))
  await requests.dispatchDetectedOvertime([entry.id])
  const approved=await repo('OvertimeEntry').findOneByOrFail({id:entry.id})
  assert.equal(approved.status,'APPROVED')
  const r=await repo('Request').findOneByOrFail({id:approved.requestId});assert.equal(r.branchId,current.branch.id)
  const periods=await request(current.hr,'GET','/attendance/overtime-periods')
  assert.equal(periods.status,200);assert.ok(!periods.body.some(row=>row.id===p.id))
  const detail=await request(current.hr,'GET',`/requests/${r.id}`)
  assert.equal(detail.status,200,JSON.stringify(detail.body))
  assert.doesNotMatch(detail.body.approvals[0].comment,new RegExp(hidden))
  const leaked=JSON.stringify(detail.body).includes(hidden)
  t.diagnostic(JSON.stringify({case:'transferred-auto-period-scope',transfer:transfer.status,detail:detail.status,periodHiddenInList:true,comment:detail.body.approvals[0].comment,
    storedEvidenceReason:detail.body.overtime?.calculationSnapshot?.submission?.evidence?.window?.reason,leaked}))
  assert.equal(leaked,false,'A new-branch reader must not receive the private old-branch period name through stored submission evidence')
})

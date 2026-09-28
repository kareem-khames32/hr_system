// Independent round19 cases, using the disposable real-SQL scaffold.
test('CR19 marker-only and nested references use real period lookup and preserve snapshots for every scope',async t=>{
  const {collectOvertimeWindowIds,overtimeWindowRedactor}=require('../src/attendance/overtime-window-view')
  const local=await repo('Branch').save({code:'R19L',name:'فرع محلي'}),foreign=await repo('Branch').save({code:'R19F',name:'فرع آخر'})
  const general=await period(admin,{name:'R19-GENERAL',branchId:null,autoApprove:true})
  const own=await period(admin,{name:'R19-LOCAL',branchId:local.id,autoApprove:true})
  const hidden=await period(admin,{name:'R19-HIDDEN',branchId:foreign.id,autoApprove:true})
  const deleted=await period(admin,{name:'R19-DELETED',branchId:foreign.id,autoApprove:true})
  await repo('OvertimePeriod').delete(deleted.id)
  const ids=[general.id,own.id,hidden.id,deleted.id]
  const markerOnly={approval:{autoApproval:{periodIds:ids},amount:140.62,approverId:0}}
  const nested={review:[markerOnly,{approval:{autoApproval:{periodIds:[hidden.id]}}}],evidence:{window:{open:true,reason:'R19-HIDDEN',governingWindowIds:ids}}}
  const before=JSON.stringify([markerOnly,nested]),evidence=[]
  assert.deepEqual([...collectOvertimeWindowIds(markerOnly)],ids)
  for(const [scope,expected] of [[[local.id],[general.id,own.id]],[[local.id,foreign.id],[general.id,own.id,hidden.id]],[[],[general.id]],[null,[general.id,own.id,hidden.id]]]){
    const view=await overtimeWindowRedactor(ds.manager,scope,[markerOnly,nested]),a=view(markerOnly),b=view(nested)
    assert.deepEqual(a.approval.autoApproval.periodIds,expected)
    assert.deepEqual(b.review[0].approval.autoApproval.periodIds,expected)
    assert.deepEqual(b.evidence.window.governingWindowIds,expected)
    assert.deepEqual(b.review[1].approval.autoApproval.periodIds,scope===null||scope.includes(foreign.id)?[hidden.id]:[])
    assert.equal(a.approval.amount,140.62);assert.equal(a.approval.approverId,0)
    if(scope!==null&&!scope.includes(foreign.id))assert.ok(!JSON.stringify(b).includes('R19-HIDDEN'))
    assert.equal(JSON.stringify([markerOnly,nested]),before)
    a.approval.autoApproval.periodIds.push(9999);assert.equal(JSON.stringify([markerOnly,nested]),before)
    evidence.push({scope,visible:expected})
  }
  // No active test-wide periods are left for the following real attendance flow.
  await repo('OvertimePeriod').delete([general.id,own.id,hidden.id])
  t.diagnostic(JSON.stringify({case:'marker-only-and-nested-real-sql',evidence,storedInputUnchanged:true}))
})

test('CR19 real transfer retains only global marker IDs for new branch without losing pending or approved flags or money',async t=>{
  const old=await fixture(),current=await fixture(),hiddenName='R19-FOREIGN-AUTO'
  const viewer=await repo('User').save({email:'r19-branch@review.invalid',displayName:'قارئ الفرع الجديد',passwordHash:'test-only',role:'employee',branchId:current.branch.id,
    permissions:JSON.stringify(['attendance.view_all','attendance.manage','overtime.confirm','payroll.view','requests.view_all','requests.create_on_behalf'])})
  const change=async from=>{
    const r=await request(admin,'GET',`/attendance/calendar-context?scope=EMPLOYEE&sourceId=${old.emp.id}`);assert.equal(r.status,200)
    return {effectiveFrom:from,reason:'نقل مؤرخ مستقل',expectedRevision:r.body.revision,expectedCurrentSourceHash:r.body.currentSourceHash}
  }
  let r=await request(admin,'POST','/attendance/calendar-context/confirm',{scope:'EMPLOYEE',sourceId:old.emp.id,calendarChange:await change(dateAfter(old.day,-20))});assert.equal(r.status,201,JSON.stringify(r.body))
  const globalPeriod=await period(admin,{name:'R19-GLOBAL-AUTO',branchId:null,autoApprove:true})
  const hiddenPeriod=await period(old.hr,{name:hiddenName,branchId:old.branch.id,autoApprove:true})
  await configDuring({'attendance.sync_interval_minutes':LONG_SYNC_INTERVAL},()=>punches(old))
  const [entry]=await entriesOf(old);assert.equal(entry.status,'DETECTED')
  r=await request(admin,'PATCH',`/employees/${old.emp.id}`,{branchId:current.branch.id,departmentId:current.emp.departmentId,managerEmployeeId:null,
    attendanceEffectiveFrom:dateAfter(old.day,1),attendanceChangeReason:'نقل مؤرخ مستقل',calendarChange:await change(dateAfter(old.day,1))});assert.equal(r.status,200,JSON.stringify(r.body))
  const monthRoute=`/attendance/overtime?from=${old.day}&to=${old.day}`
  const month=async actor=>{const response=await request(actor,'GET',monthRoute);assert.equal(response.status,200);const row=response.body.entries.find(x=>x.id===entry.id);assert.ok(row);return row}
  const checkForeignAbsent=value=>{
    assert.ok(!JSON.stringify(value).includes(hiddenName))
    const visit=x=>{if(!x||typeof x!=='object')return
      for(const ids of [x.governingWindowIds,x.autoApproval?.periodIds])if(Array.isArray(ids))assert.ok(!ids.includes(hiddenPeriod.id))
      for(const item of Object.values(x))visit(item)
    };visit(value)
  }
  const detectedSaved=JSON.stringify((await repo('OvertimeEntry').findOneByOrFail({id:entry.id})).calculationSnapshot)
  const waiting=await month(viewer);assert.equal(waiting.autoApprovalPending,true);assert.equal(waiting.autoApproved,false);checkForeignAbsent(waiting)
  assert.equal(JSON.stringify((await repo('OvertimeEntry').findOneByOrFail({id:entry.id})).calculationSnapshot),detectedSaved)
  await requests.dispatchDetectedOvertime([entry.id])
  const approved=await repo('OvertimeEntry').findOneByOrFail({id:entry.id});assert.equal(approved.status,'APPROVED')
  assert.deepEqual([...approved.calculationSnapshot.approval.autoApproval.periodIds].sort((a,b)=>a-b),[globalPeriod.id,hiddenPeriod.id].sort((a,b)=>a-b))
  const saved=JSON.stringify(approved.calculationSnapshot)
  const branchRow=await month(viewer),companyRow=await month(admin)
  assert.deepEqual(branchRow.calculationSnapshot.approval.autoApproval.periodIds,[globalPeriod.id]);checkForeignAbsent(branchRow)
  assert.deepEqual(companyRow.calculationSnapshot.approval.autoApproval.periodIds,approved.calculationSnapshot.approval.autoApproval.periodIds)
  assert.equal(branchRow.autoApproved,true);assert.equal(branchRow.autoApprovalPending,false)
  assert.equal(Number(branchRow.amountSnapshot),140.62);assert.equal(Number(companyRow.amountSnapshot),140.62)
  const detail=await request(viewer,'GET',`/requests/${approved.requestId}`);assert.equal(detail.status,200);checkForeignAbsent(detail.body)
  assert.equal(detail.body.overtime.calculationSnapshot.approval.autoApproved,true)
  assert.equal(JSON.stringify((await repo('OvertimeEntry').findOneByOrFail({id:entry.id})).calculationSnapshot),saved)
  t.diagnostic(JSON.stringify({case:'mixed-marker-live-transfer',branchMarker:branchRow.calculationSnapshot.approval.autoApproval,companyMarker:companyRow.calculationSnapshot.approval.autoApproval,
    pendingBefore:waiting.autoApprovalPending,approvedAfter:branchRow.autoApproved,pendingAfter:branchRow.autoApprovalPending,amount:140.62,storedSnapshotUnchanged:true}))
})

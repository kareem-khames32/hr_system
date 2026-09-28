// Appended to the disposable in-process overtime fixture by the review builder.
test('CR18 all overtime read surfaces hide historical foreign window names and governing IDs without modifying stored evidence',async t=>{
  const old=await fixture(),current=await fixture(),hidden='R18-FOREIGN-PERIOD'
  const viewer=await repo('User').save({email:'r18-branch@review.invalid',displayName:'قارئ الفرع الجديد',passwordHash:'test-only',role:'employee',branchId:current.branch.id,
    permissions:JSON.stringify(['attendance.view_all','attendance.manage','overtime.confirm','payroll.view','requests.view_all','requests.create_on_behalf'])})
  const change=async from=>{
    const r=await request(admin,'GET',`/attendance/calendar-context?scope=EMPLOYEE&sourceId=${old.emp.id}`);assert.equal(r.status,200)
    return {effectiveFrom:from,reason:'نقل مؤرخ مستقل',expectedRevision:r.body.revision,expectedCurrentSourceHash:r.body.currentSourceHash}
  }
  let r=await request(admin,'POST','/attendance/calendar-context/confirm',{scope:'EMPLOYEE',sourceId:old.emp.id,calendarChange:await change(dateAfter(old.day,-20))});assert.equal(r.status,201,JSON.stringify(r.body))
  const p=await period(old.hr,{name:hidden,branchId:old.branch.id,autoApprove:true})
  await configDuring({'attendance.sync_interval_minutes':LONG_SYNC_INTERVAL},()=>punches(old))
  const [entry]=await entriesOf(old);assert.equal(entry.status,'DETECTED')
  r=await request(admin,'PATCH',`/employees/${old.emp.id}`,{branchId:current.branch.id,departmentId:current.emp.departmentId,managerEmployeeId:null,
    attendanceEffectiveFrom:dateAfter(old.day,1),attendanceChangeReason:'نقل مؤرخ مستقل',calendarChange:await change(dateAfter(old.day,1))})
  assert.equal(r.status,200,JSON.stringify(r.body))
  const windows=value=>{const out=[];const walk=x=>{if(!x||typeof x!=='object')return;if(Array.isArray(x.governingWindowIds)&&typeof x.reason==='string'&&typeof x.open==='boolean')out.push(x);for(const v of Object.values(x))walk(v)};walk(value);return out}
  const checked=[]
  const check=(name,body)=>{
    assert.ok(windows(body).length>0,name);assert.ok(!JSON.stringify(body).includes(hidden),name)
    for(const win of windows(body)){assert.ok(!win.governingWindowIds.includes(p.id),name);assert.match(win.reason,/فترة إضافي في فرع تاني/)}
    checked.push(name)
  }
  const before=JSON.stringify((await repo('OvertimeEntry').findOneByOrFail({id:entry.id})).calculationSnapshot)
  const pending=await request(viewer,'GET','/attendance/overtime/pending');assert.equal(pending.status,200);check('pending',pending.body.find(x=>x.id===entry.id))
  const month=await request(viewer,'GET',`/attendance/overtime?from=${old.day}&to=${old.day}`);assert.equal(month.status,200)
  const waiting=month.body.entries.find(x=>x.id===entry.id);check('monthly-detected',waiting)
  const preview=await request(viewer,'GET',`/attendance/overtime/preview?employeeId=${old.emp.id}&date=${old.day}`);assert.equal(preview.status,200,JSON.stringify(preview.body));check('preview',preview.body)
  const company=await request(admin,'GET',`/attendance/overtime?from=${old.day}&to=${old.day}`);assert.equal(company.status,200)
  const companyWaiting=company.body.entries.find(x=>x.id===entry.id);assert.ok(JSON.stringify(companyWaiting).includes(hidden))
  assert.equal(JSON.stringify((await repo('OvertimeEntry').findOneByOrFail({id:entry.id})).calculationSnapshot),before)
  D.waitingFlags={branch:waiting.autoApprovalPending,company:companyWaiting.autoApprovalPending,status:waiting.status}
  await requests.dispatchDetectedOvertime([entry.id])
  const approved=await repo('OvertimeEntry').findOneByOrFail({id:entry.id});assert.equal(approved.status,'APPROVED')
  const saved=JSON.stringify(approved.calculationSnapshot)
  const detail=await request(viewer,'GET',`/requests/${approved.requestId}`);assert.equal(detail.status,200);check('request-detail',detail.body)
  const approvedMonth=await request(viewer,'GET',`/attendance/overtime?from=${old.day}&to=${old.day}`);assert.equal(approvedMonth.status,200)
  const shown=approvedMonth.body.entries.find(x=>x.id===entry.id);check('monthly-approved',shown)
  assert.equal(JSON.stringify((await repo('OvertimeEntry').findOneByOrFail({id:entry.id})).calculationSnapshot),saved)
  assert.equal(Number(shown.amountSnapshot),140.62)
  D.marker={periodId:p.id,shownMarker:shown.calculationSnapshot.approval.autoApproval,storedMarker:approved.calculationSnapshot.approval.autoApproval}
  t.diagnostic(JSON.stringify({case:'all-window-surfaces',checked,storedSnapshotsUnchanged:true,amount:Number(shown.amountSnapshot),waitingFlags:D.waitingFlags,marker:D.marker}))
})

test('CR18 foreign period ID must also be absent from automatic approval marker in monthly response',async t=>{
  assert.ok(D.marker);t.diagnostic(JSON.stringify({case:'foreign-approval-marker',...D.marker}))
  assert.ok(!(D.marker.shownMarker?.periodIds||[]).includes(D.marker.periodId),'Redacted financial view must not expose the hidden period ID through autoApproval.periodIds')
})

test('CR18 redaction must preserve automatic pending status for branch reader',async t=>{
  assert.ok(D.waitingFlags);t.diagnostic(JSON.stringify({case:'pending-status',...D.waitingFlags}))
  assert.equal(D.waitingFlags.status,'DETECTED');assert.equal(D.waitingFlags.company,true);assert.equal(D.waitingFlags.branch,true)
})

test('CR18 recursive projection preserves input and handles mixed scopes deleted periods and nested review evidence',()=>{
  const {redactOvertimeWindows,collectOvertimeWindowIds}=require('../src/attendance/overtime-window-view')
  const periods=new Map([[1,{id:1,name:'عام',branchId:null}],[2,{id:2,name:'محلي',branchId:2}],[3,{id:3,name:'خارج النطاق',branchId:3}]])
  const input={submission:{evidence:{window:{open:true,governingWindowIds:[1,2,3,99],reason:'أسماء قديمة'}}},review:[{window:{open:false,governingWindowIds:[3],reason:'اسم محجوب'}}]}
  const before=JSON.stringify(input)
  for(const [scope,expected] of [[[2],[1,2]],[[2,3],[1,2,3]],[[],[1]],[null,[1,2,3]]]){
    const shown=redactOvertimeWindows(input,periods,scope)
    assert.deepEqual(shown.submission.evidence.window.governingWindowIds,expected)
    assert.ok(!JSON.stringify(shown).includes('أسماء قديمة'))
    if(scope&& !scope.includes(3))assert.ok(!JSON.stringify(shown).includes('خارج النطاق'))
    assert.equal(JSON.stringify(input),before)
  }
  assert.deepEqual([...collectOvertimeWindowIds(input)],[1,2,3,99])
})

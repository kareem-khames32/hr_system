// Appended to a copy of the proven payroll-overtime fixture. All evidence below is created by real APIs.
const expectOK=r=>{assert.ok(r.status>=200&&r.status<300,JSON.stringify(r.body));return r.body}
const requestOK=async(user,method,url,body)=>expectOK(await request(user,method,url,body))
async function realDeferredPayroll(){
 const f=await fixture({day:'2026-07-08'})
 await punches(f,'07:52','19:20')
 const pending=expectOK(await submit(f));const original=await payroll(f,'2026-07')
 assert.equal(Number(original.item.overtimeAmount),0);await payPayroll(original.run)
 const approved=await complete(f,pending);assert.equal(approved.deferredFromRunId,original.run.id)
 assert.equal(Number(approved.amountSnapshot),126.56)
 const later=await payroll(f,'2026-08');assert.equal(Number(later.item.overtimeAmount),126.56)
 await payPayroll(later.run)
 const entry=await repo('OvertimeEntry').findOneByOrFail({id:approved.id})
 assert.equal(entry.status,'PAID');assert.equal(entry.payrollRunId,later.run.id)
 return {...f,pending,original,later,entry}
}
async function transferAndRestrict(f){
 const A=await repo('Branch').save({code:'R37A'+sequence,name:'CR37 receiving A '+sequence,country:f.branch.country})
 const department=await repo('Department').save({branchId:A.id,name:'CR37 receiving department '+sequence})
 const c=await requestOK(admin,'GET',`/attendance/calendar-context?scope=EMPLOYEE&sourceId=${f.emp.id}`)
 await requestOK(admin,'PATCH',`/employees/${f.emp.id}`,{branchId:A.id,departmentId:department.id,teamId:null,calendarChange:{effectiveFrom:today,reason:'نقل فعلي لمراجعة عزل مرجع المسير',expectedRevision:c.revision,expectedCurrentSourceHash:c.currentSourceHash}})
 // A former approver remains a party to the request after their account scope changes.
 f.hr.branchId=A.id;f.hr.permissions=JSON.stringify(['requests.view_all','attendance.view_all','payroll.view','reports.view'])
 await repo('User').update(f.hr.id,{branchId:A.id,permissions:f.hr.permissions})
 Object.assign(f.owner,await repo('User').findOneByOrFail({id:f.owner.id}))
 for(const run of [f.original.run,f.later.run])assert.equal((await request(f.hr,'GET',`/payroll/runs/${run.id}`)).status,403)
 return A
}
const logFor=async(f,actor)=> (await requestOK(actor,'GET','/attendance/overtime?from=2026-07-01&to=2026-07-31')).entries.find(x=>x.id===f.entry.id)
async function stored(f){return {entry:await repo('OvertimeEntry').findOneByOrFail({id:f.entry.id}),events:await repo('OvertimeEntryEvent').find({where:{entryId:f.entry.id},order:{id:'ASC'}}),request:await repo('Request').findOneByOrFail({id:f.pending.id})}}
test('CR37 real paid/deferred overtime: log and request references scoped; permitted rows, dates, amounts and stored history preserved',{timeout:300000},async t=>{
 const f=await realDeferredPayroll()
 f.hr.permissions=JSON.stringify(['requests.view_all','attendance.view_all','payroll.view','reports.view']);await repo('User').update(f.hr.id,{permissions:f.hr.permissions})
 const allowed=await logFor(f,f.hr),company=await logFor(f,admin)
 assert.deepEqual(allowed,company);assert.equal(allowed.payrollRunId,f.later.run.id);assert.equal(allowed.deferredFromRunId,f.original.run.id)
 const allowedRequest=await requestOK(f.hr,'GET',`/requests/${f.pending.id}`)
 assert.equal(allowedRequest.overtime.deferredFromRunId,f.original.run.id)
 await transferAndRestrict(f);const before=await stored(f)
 const hidden=await logFor(f,f.hr),stillCompany=await logFor(f,admin),detail=await requestOK(f.hr,'GET',`/requests/${f.pending.id}`),self=await requestOK(f.owner,'GET',`/requests/${f.pending.id}`)
 assert.equal(hidden.payrollRunId,null);assert.equal(hidden.deferredFromRunId,null)
 assert.equal(hidden.calculationSnapshot.approval.deferredFromRunId,null)
 assert.equal(detail.overtime.deferredFromRunId,null);assert.equal(self.overtime.deferredFromRunId,f.original.run.id)
 for(const row of [hidden,stillCompany,detail.overtime,self.overtime]){assert.equal(Number(row.amountSnapshot),126.56);assert.equal(Number(row.approvedMinutes),135);assert.equal(row.status,'PAID')}
 assert.equal(stillCompany.payrollRunId,f.later.run.id);assert.equal(stillCompany.deferredFromRunId,f.original.run.id)
 assert.equal(hidden.calculationSnapshot.approval.approvedAt,company.calculationSnapshot.approval.approvedAt)
 assert.equal(detail.overtime.events[0].createdAt,allowedRequest.overtime.events[0].createdAt);assert.ok(Number.isFinite(Date.parse(detail.overtime.events[0].createdAt)))
 assert.deepEqual(await stored(f),before)
 t.diagnostic(JSON.stringify({case:'overtime-read-closure',originalRun:f.original.run.id,paidRun:f.later.run.id,foreignRead:403,hidden:[hidden.payrollRunId,hidden.deferredFromRunId,hidden.calculationSnapshot.approval.deferredFromRunId,detail.overtime.deferredFromRunId],allowedBeforeTransfer:true,companyAndSelfVisible:true,minutes:135,hourlyRate:37.5,multiplier:1.5,amount:126.56,timestampsPreserved:true,storedHistoryUnchanged:true}))
})
test('CR37 overtime request reversal event must not expose foreign original and reversal payroll numbers',{timeout:300000},async t=>{
 const f=await realDeferredPayroll()
 const preview=await requestOK(admin,'POST',`/payroll/runs/${f.later.run.id}/reversal-preview`,{employeeIds:[f.emp.id]});assert.equal(preview.blocked,false)
 const reversal=await requestOK(admin,'POST',`/payroll/runs/${f.later.run.id}/reversals`,{employeeIds:[f.emp.id],reason:'مراجعة أثر عكس الإضافي',previewHash:preview.previewHash})
 await requestOK(financeApprover,'POST',`/payroll/runs/${reversal.id}/approve`,{})
 await requestOK(financeApprover,'POST',`/payroll/runs/${reversal.id}/pay`,{channel:'CASH',reference:'CR37 reversal'})
 assert.equal(Number((await repo('PayrollRun').findOneByOrFail({id:reversal.id})).totalNet),-Number(f.later.run.totalNet))
 const allowed=await requestOK(f.hr,'GET',`/requests/${f.pending.id}`),allowedEvent=allowed.overtime.events.find(x=>x.eventType==='PAYROLL_REVERSED');assert.ok(allowedEvent)
 for(const id of [f.later.run.id,reversal.id])assert.ok(allowedEvent.reason.includes('#'+id))
 await transferAndRestrict(f);assert.equal((await request(f.hr,'GET',`/payroll/runs/${reversal.id}`)).status,403)
 const before=await stored(f),detail=await requestOK(f.hr,'GET',`/requests/${f.pending.id}`),company=await requestOK(admin,'GET',`/requests/${f.pending.id}`),self=await requestOK(f.owner,'GET',`/requests/${f.pending.id}`)
 const event=detail.overtime.events.find(x=>x.eventType==='PAYROLL_REVERSED'),companyEvent=company.overtime.events.find(x=>x.id===event.id),selfEvent=self.overtime.events.find(x=>x.id===event.id)
 assert.equal(detail.overtime.status,'APPROVED');assert.equal(Number(detail.overtime.amountSnapshot),126.56)
 assert.equal(companyEvent.reason,allowedEvent.reason);assert.equal(selfEvent.reason,companyEvent.reason)
 assert.deepEqual(await stored(f),before)
 t.diagnostic(JSON.stringify({case:'overtime-request-event-run-reference',directRunStatus:403,requestStatus:200,originalRun:f.later.run.id,reversalRun:reversal.id,branchReason:event.reason,companyReason:companyEvent.reason,selfReason:selfEvent.reason,amount:126.56,status:'APPROVED',storedHistoryUnchanged:true}))
 for(const id of [f.later.run.id,reversal.id])assert.equal(new RegExp('#'+id+'(?![0-9])').test(event.reason),false,'Request event reason must conceal foreign payroll references')
})
test('CR37 payroll overtime report must not expose foreign payment and deferred payroll references',{timeout:300000},async t=>{
 const f=await realDeferredPayroll();await transferAndRestrict(f);const before=await stored(f)
 const url='/reports/payroll/overtime?from=2026-07-01&to=2026-07-31'
 const report=await requestOK(f.hr,'GET',url),company=await requestOK(admin,'GET',url)
 const row=report.rows.find(x=>x.id===f.entry.id),companyRow=company.rows.find(x=>x.id===f.entry.id);assert.ok(row&&companyRow)
 assert.equal(Number(row.amount),126.56);assert.equal(Number(companyRow.amount),126.56)
 assert.equal(companyRow.run.id,f.later.run.id);assert.equal(companyRow.deferredFromRunId,f.original.run.id)
 assert.deepEqual(await stored(f),before)
 t.diagnostic(JSON.stringify({case:'overtime-report-run-reference',directRunStatus:403,reportStatus:200,branchRun:row.run,branchDeferredFromRunId:row.deferredFromRunId,companyRun:companyRow.run,companyDeferredFromRunId:companyRow.deferredFromRunId,amount:126.56,storedHistoryUnchanged:true}))
 assert.equal(row.deferredFromRunId,null,'Payroll overtime report must conceal a foreign deferred payroll ID')
 assert.equal(row.run?.status??null,null,'Payroll overtime report must conceal the foreign payroll status')
})

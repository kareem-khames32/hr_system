'use strict'
const fixture=require('./codex-review-round25-fixture.cjs')
const assert=require('node:assert/strict')
const {writeParityReasonsBeforeApproval}=require('./fixtures/payroll-parity-reasons.cjs')
module.exports=async label=>{
 const f=await fixture(label);let seq=0
 f.A=await f.repo('Branch').save({code:'R25-A',name:'فرع ألف'})
 f.B=await f.repo('Branch').save({code:'R25-B',name:'فرع باء المحجوب'})
 f.version=await f.policy()
 f.actor=(name,perms=[],branch=f.A,extra={})=>f.repo('User').save({email:name+'@r25.invalid',displayName:name,passwordHash:'review-only',role:'employee',branchId:branch?.id??null,scopeAllBranches:!branch,permissions:JSON.stringify(perms),...extra})
 f.employee=async(salary=6000,branch=f.A,extra={})=>{
  const e=await f.repo('Employee').save({employeeCode:'R25-'+(++seq),fullName:'موظف اختبار مستقل '+seq,branchId:branch.id,joinDate:'2020-01-01',basicSalary:salary,housingAllowance:0,transportAllowance:0,otherAllowance:0,payMethod:'transfer',isActive:true,status:'active',...extra})
  await f.attendance(e,'2026-07');return e
 }
 f.attendance=async(e,period,absent=[])=>{
  const end=period+'-22',start=new Date(end+'T12:00:00Z');start.setUTCMonth(start.getUTCMonth()-1);start.setUTCDate(23)
  const rows=[];for(let t=start.getTime();t<=Date.parse(end+'T12:00:00Z');t+=86400000){const date=new Date(t).toISOString().slice(0,10),missing=absent.includes(date);rows.push({employeeId:e.id,branchId:e.branchId,date,status:missing?'absent':'present',checkIn:missing?null:'08:00',checkOut:missing?null:'16:00',shiftName:'وردية الاختبار',shiftStart:'08:00',shiftEnd:'16:00',scheduleSource:'override',workMinutes:missing?0:480,lateMinutes:0,deductibleMinutes:0,earlyLeaveMinutes:0})}
  const old=await f.repo('AttendanceDay').findBy({employeeId:e.id});const byDate=new Map(old.map(d=>[d.date,d.id]));await f.repo('AttendanceDay').save(rows.map(r=>({...r,...(byDate.has(r.date)?{id:byDate.get(r.date)}:{})})),{chunk:50})
 }
 f.draft=(name,ids,period='2026-07',actor=f.admin,extra={})=>f.ok('POST','/payroll/runs',{name,period,policyVersionId:f.version,filters:{employeeIds:ids},...extra},actor)
 f.calculate=(run,actor=f.admin)=>f.ok('POST',`/payroll/runs/${run.id}/calculate`,{},actor)
 f.ready=async run=>{
  await writeParityReasonsBeforeApproval((u,m,p,b)=>f.request(m,p,b,u),f.approver,'POST',`/payroll/runs/${run.id}/approve`)
  const report=await f.ok('GET',`/payroll/runs/${run.id}/unassigned`)
  await f.ok('POST',`/payroll/runs/${run.id}/unassigned-ack`,{reportHash:report.reportHash})
 }
 f.pay=async run=>{await f.ready(run);await f.ok('POST',`/payroll/runs/${run.id}/approve`,{},f.approver);return f.ok('POST',`/payroll/runs/${run.id}/pay`,{channel:'CASH',reference:'R25-PAID-'+run.id},f.approver)}
 f.reverse=async(run,ids)=>{
  const preview=await f.ok('POST',`/payroll/runs/${run.id}/reversal-preview`,{employeeIds:ids})
  assert.equal(preview.blocked,false)
  const reversal=await f.ok('POST',`/payroll/runs/${run.id}/reversals`,{employeeIds:ids,reason:'تصحيح مستقل لاختبار عزل الرد',previewHash:preview.previewHash})
  await f.ok('POST',`/payroll/runs/${reversal.id}/approve`,{},f.approver)
  await f.ok('POST',`/payroll/runs/${reversal.id}/pay`,{channel:'CASH',reference:'R25-REV-'+reversal.id},f.approver)
  return reversal
 }
 return f
}

'use strict'
// Benchmark old/new cache paths against the SAME copied company rows and SQL savepoint.
// Uses current packet size for BOTH. Only disposable data is cleared. No company credentials copied.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm')
const {AttendanceService}=require('../src/attendance/attendance.service')
const {EntityManager}=require('../node_modules/typeorm')
const source=fs.readFileSync(path.join(__dirname,'codex-review-round3-strict-shadow.cjs'),'utf8')
const library=source.slice(source.indexOf('const clockColumns='),source.indexOf('PayrollDailyAccrualService.prototype.accrueEmployeeRange='))
const {raw,canonical,normalize}=vm.runInNewContext(library+';({raw,canonical,normalize})',{assert,Date,Map,Set,JSON,Object,Array,String})
const leaves=v=>{
 if(typeof v==='string'&&/^[\[{]/.test(v)){try{return leaves(JSON.parse(v))}catch{}}
 return Array.isArray(v)?v.reduce((s,x)=>s+leaves(x),0):v&&typeof v==='object'?Object.values(v).reduce((s,x)=>s+leaves(x),0):1
}
module.exports=async({f,measure,t})=>{
 f.assertDisposable()
 // Remove only copied payroll state, so no prior closed run or daily accrual short-circuits September.
 for(const table of ['payroll_item_disbursements','payroll_period_claims','payroll_run_members','payroll_items','payroll_daily_accrual','payroll_financial_exemptions','payroll_runs'])await f.ds.query(`DELETE FROM dbo.[${table}]`)
 const ids=(await f.ds.query("SELECT TOP (20) id FROM employees WHERE isActive=1 AND basicSalary>0 AND COALESCE(actualStartDate,joinDate)<='2026-08-23' ORDER BY id")).map(r=>r.id)
 assert.equal(ids.length,20)
 const policyVersionId=await f.policy(),draft=await f.ok('POST','/payroll/runs',{name:'Independent real-data 20 comparison',policyVersionId,period:'2026-09',filters:{employeeIds:ids}})
 assert.equal(await f.repo('PayrollDailyAccrual').count(),0)
 const qr=f.ds.createQueryRunner();await qr.connect();await qr.startTransaction()
 const rootTransaction=EntityManager.prototype.transaction,batchScope=AttendanceService.prototype.batchScope
 const before=new Map();for(const id of ids)before.set(id,await raw(qr.manager,id))
 // Payroll's own transaction callbacks stay in this outer disposable transaction. Production code is unmodified.
 EntityManager.prototype.transaction=function(...args){
  if(this.connection===f.ds&&!this.queryRunner)return args.at(-1)(qr.manager)
  return rootTransaction.apply(this,args)
 }
 const snapshot=async()=>{
  const records={};let fields=0
  for(const id of ids){
   const normalized=canonical(await raw(qr.manager,id),before.get(id))
   records[id]={...normalized.rows}
   for(const [table,entity] of [['items','PayrollItem'],['members','PayrollRunMember']]){
    const rows=await qr.manager.getRepository(entity).findBy({runId:draft.id,employeeId:id})
    const strip=value=>{
     if(Array.isArray(value))return value.map(strip)
     if(value&&typeof value==='object'&&!(value instanceof Date))return Object.fromEntries(Object.entries(value).filter(([k])=>k!=='capturedAt').map(([k,v])=>[k,strip(v)]))
     if(typeof value==='string'&&/^[\[{]/.test(value)){let v;try{v=JSON.parse(value)}catch{return value};return JSON.stringify(strip(v))}
     return value
    }
    records[id][table]=rows.map(r=>strip(normalize(Object.fromEntries(Object.entries(r).filter(([k])=>k!=='id')),normalized.refs)))
   }
   fields+=leaves(records[id])
  }
  return {records,fields}
 }
 try{
  await qr.query('SAVE TRANSACTION cr3_real20')
  const savedQueue=qr.data.overtimeDispatchAfterCommit?structuredClone(qr.data.overtimeDispatchAfterCommit):undefined
  AttendanceService.prototype.batchScope=function(em){return this.inManager(em)}
  const off=await measure('real 20 September cold accrual cache OFF',`/payroll/runs/${draft.id}/calculate`,'POST',{})
  const old=await snapshot()
  await qr.query('ROLLBACK TRANSACTION cr3_real20')
  if(savedQueue)qr.data.overtimeDispatchAfterCommit=structuredClone(savedQueue);else delete qr.data.overtimeDispatchAfterCommit
  AttendanceService.prototype.batchScope=batchScope
  assert.equal(await qr.manager.getRepository('PayrollDailyAccrual').count(),0)
  const on=await measure('real 20 September cold accrual cache ON',`/payroll/runs/${draft.id}/calculate`,'POST',{})
  const current=await snapshot()
  // Compare without dumping employee identities, names or copied company content on failure.
  const differences=[]
  for(const id of ids)for(const table of Object.keys(old.records[id]))if(JSON.stringify(old.records[id][table])!==JSON.stringify(current.records[id][table]))differences.push({employeeIndex:ids.indexOf(id),table})
  assert.equal(differences.length,0,JSON.stringify({differentTables:differences}))
  assert.equal(Number(on.totalNet),Number(off.totalNet))
  const [count]=await qr.query('SELECT COUNT(*) days FROM payroll_daily_accrual')
  const result={employees:ids.length,period:'2026-09',initialAccrualRows:0,accrualRows:count.days,totalNet:Number(on.totalNet),comparedValues:current.fields,differences,excluded:['new identities normalized; existing identities preserved','generated calculation/audit clocks','member snapshot capturedAt'],packetUnchanged:true,sourceTablesCopied:39,fullCompanyBackup:false}
  fs.writeFileSync(path.join(__dirname,'codex-review-round3-real20-results.cjs'),'module.exports = '+JSON.stringify(result,null,2)+'\n')
  t.diagnostic(JSON.stringify(result))
 }finally{
  AttendanceService.prototype.batchScope=batchScope;EntityManager.prototype.transaction=rootTransaction
  try{await qr.rollbackTransaction()}finally{await qr.release()}
 }
}

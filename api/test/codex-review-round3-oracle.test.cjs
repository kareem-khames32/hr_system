'use strict'
require('./codex-review-round2-harness.cjs')
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm')
const {canonical}=require('./codex-review-round3-strict-shadow.cjs')
// الأداة الأولى (اللي الاختبار ده بيثبت ثغرتها) اتشالت من helpers بعد الجولة التالتة واتحفظت نصًا بلا تشغيل في fixtures;
const source=fs.readFileSync(path.join(__dirname,'fixtures/attendance-batch-shadow-v1.cjs.txt'),'utf8')
const functions=source.slice(source.indexOf('const dateKey ='),source.indexOf('PayrollDailyAccrualService.prototype.accrueEmployeeRange ='))
const supplied=vm.runInNewContext(functions+';({snapshot,difference})',{Date,Map,JSON,Object,Array,String})
const empty=()=>({days:[],overtime:[],accruals:[],claims:[],events:[],requests:[]})
test('CR3 oracle catches real minutes/money, new row omission and business timestamps',()=>{
 const base=empty(),a=empty();a.days=[{id:10,employeeId:3,date:'2026-08-31',lateMinutes:10,net:100,suspendedAt:'2026-08-20'}]
 for(const patch of [{lateMinutes:11},{net:101},{suspendedAt:'2026-08-21'}]){
  const b=structuredClone(a);Object.assign(b.days[0],patch);assert.notDeepEqual(canonical(a,base).rows,canonical(b,base).rows)
 }
 assert.notDeepEqual(canonical(a,base).rows,canonical(empty(),base).rows)
 const renamed=structuredClone(a);renamed.days[0].id=999
 assert.deepEqual(canonical(a,base).rows,canonical(renamed,base).rows,'Only newly allocated identities may differ')
})
test('CR3 oracle preserves an existing ID even when two legacy overtime rows share the supplied natural key',async()=>{
 const before=empty();before.overtime=[7,8].map(id=>({id,employeeId:1,date:'2026-08-31',source:'BIOMETRIC_DETECTED',requestId:null}))
 const a=structuredClone(before),b=structuredClone(before)
 a.accruals=[{id:100,employeeId:1,period:'2026-08',components:JSON.stringify({overtimeIds:[7]})}]
 b.accruals=[{id:101,employeeId:1,period:'2026-08',components:JSON.stringify({overtimeIds:[8]})}]
 assert.notDeepEqual(canonical(a,before).rows,canonical(b,before).rows)
 const fake=rows=>({query:async sql=>sql.includes('FROM attendance_days')?rows.days:sql.includes('FROM overtime_entries WHERE employeeId')?rows.overtime:sql.includes('FROM payroll_daily_accrual')?rows.accruals:[]})
 const input={employeeId:1,period:'2026-08',from:'2026-08-31',to:'2026-08-31'}
 assert.equal(supplied.difference(await supplied.snapshot(fake(a),input),await supplied.snapshot(fake(b),input)),null,'Supplied helper masks this legacy-link mutation; independent helper must not')
})
test('CR3 oracle refuses ambiguous new overtime keys and dangling references',()=>{
 const base=empty(),a=empty();a.overtime=[7,8].map(id=>({id,employeeId:1,date:'2026-08-31',source:'BIOMETRIC_DETECTED',requestId:null}))
 assert.throws(()=>canonical(a,base),/Ambiguous/)
 const b=empty();b.accruals=[{id:1,components:'{"attendanceDayId":999}'}]
 assert.throws(()=>canonical(b,base),/Dangling/)
})

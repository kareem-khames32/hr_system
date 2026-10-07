'use strict'
module.exports=async(label,options={})=>{
 const f=await require('./codex-review-p2x-comments-fixture.cjs')(label,options)
 const year=String(new Date().getFullYear()),last=String(Number(year)-1),next=String(Number(year)+1)
 const hirer=await f.account(null,['employees.view','employees.create']),archiver=await f.account(null,['employees.view','employees.archive'])
 const leaves=f.app.get(require('../src/requests/leave-balances.service').LeaveBalancesService)
 for(const [k,v] of [['payroll.cycle_start_day','1'],['leave.accrual_mode','monthly'],['leave.probation_months','0'],['leave.annual_entitled','21'],['leave.sick_entitled','180'],['leave.carryover_max_days','10'],['leave.carryover_expiry_months','3']])await f.setting(k,v)
 const annual=await f.repo('LeaveType').save({code:'ANNUAL',nameAr:'Synthetic annual',category:'ANNUAL',balanceType:'annual',isActive:true,isPaid:true,annualDays:21,renewalBasis:'YEAR_START',carryOverEnabled:true,carryOverMaxDays:10,entitlementStartMonths:0,firstYearProrated:true})
 const ended=async(day=last+'-06-30',status='CLOSED',extra={})=>{const emp=await f.employee(f.A,{joinDate:'2020-01-01',status:'terminated',isActive:false,basicSalary:6000,...extra});const kase=status?await f.repo('OffboardingCase').save({employeeId:emp.id,lastWorkingDay:day,status,terminationReason:'resignation'}):null;return{emp,kase}}
 const balance=(emp,period,extra={})=>f.repo('LeaveBalance').save({employeeId:emp.id,balanceType:'annual',period,entitled:21,taken:0,openingDays:0,openingTaken:0,adjustmentDays:0,...extra})
 const rehire=(emp,start=year+'-02-01',actor=hirer)=>f.request('POST',`/employees/${emp.id}/rehire`,{startDate:start,reason:'Synthetic new service period'},actor)
 const rows=emp=>f.repo('LeaveBalance').find({where:{employeeId:emp.id},order:{id:'ASC'}})
 const run=extra=>f.repo('PayrollRun').save({name:'Synthetic '+require('node:crypto').randomUUID(),period:last+'-06',startDate:last+'-06-01',endDate:last+'-06-30',status:'PAID',runType:'REGULAR',branchId:f.A.id,...extra})
 return{...f,year,last,next,hirer,archiver,leaves,annual,ended,balance,rehire,rows,run}
}

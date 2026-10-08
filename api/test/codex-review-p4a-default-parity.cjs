'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),cp=require('node:child_process'),Module=require('node:module')
const root=path.resolve(__dirname,'../..'),ts=require('../node_modules/typescript')
require('../node_modules/ts-node').register({project:path.join(root,'api/tsconfig.json'),transpileOnly:true})
function baseline(file){const name=path.join(root,file),source=cp.execFileSync('git',['show','456e544:'+file],{cwd:root,encoding:'utf8'});const m=new Module(name,module);m.filename=name;m.paths=Module._nodeModulePaths(path.dirname(name));m._compile(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2021,module:ts.ModuleKind.CommonJS,esModuleInterop:true,experimentalDecorators:true}}).outputText,name);return m.exports}
test('P4A-C01: 500 line projections match actual pre-phase-4 code, byte for byte',()=>{
 const old=baseline('api/src/payroll/payroll-item-lines.ts'),now=require('../src/payroll/payroll-item-lines'),{generate,digest}=require('./fixtures/salary-items-parity.cjs'),data=generate(),seed=new Map(require('../src/payroll/salary-items').SALARY_ITEM_SEED.map(x=>[x.code,x.sortOrder]))
 assert.equal(data.items.length,500);assert.equal(digest(now.projectPayrollItemLines,now.payrollLineColumns,data),digest(old.projectPayrollItemLines,old.payrollLineColumns,data))
 assert.equal(digest((i,f)=>now.projectPayrollItemLines(i,f,seed),r=>now.payrollLineColumns(r,seed),data),digest(old.projectPayrollItemLines,old.payrollLineColumns,data))
})
test('P4A-C02: old statutory seed rows and existing insurance inputs unchanged',()=>{
 const old=baseline('api/src/statutory/statutory-data.ts'),now=require('../src/statutory/statutory-data');for(const row of old.STATUTORY_SEED)assert.deepEqual(now.STATUTORY_SEED.find(x=>x.country===row.country&&x.key===row.key&&x.effectiveFrom===row.effectiveFrom),row)
})
test('P4A-C03: employee projection with masking off is identical to pre-phase-4 for owner, payroll, editor and ordinary viewer',()=>{
 const old=baseline('api/src/employees/employee-projection.ts'),now=require('../src/employees/employee-projection');const emp={id:2,fullName:'Synthetic',nationalId:'1234567890',passportNo:'SYNTHETIC',iban:'SA0000000000000000000000',basicSalary:9000,branchId:1}
 for(const user of [{sub:1,role:'employee',employeeId:2,permissions:[]},{sub:1,role:'employee',permissions:['payroll.view']},{sub:1,role:'employee',permissions:['employees.edit']},{sub:1,role:'employee',permissions:['employees.view']}])assert.deepEqual(now.projectEmployee(emp,user,false),old.projectEmployee(emp,user))
})
for(const file of ['legal-entities','statutory-pack','salary-items','eg-salary-tax','payroll-statutory','eos-policy','overtime-legal-minimum','leave-entitlement-tiers','suspension-paid','penalty-fine-cap','resignation-legal-terms','saudization-report','banks','hijri-display','employee-privacy','data-protection'])require('./'+file+'.test.cjs')

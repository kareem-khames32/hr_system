'use strict'
// اختبارات واجهة خالصة وfetch معزول؛ لا SQL أو خدمة أو تغييرات بملف موظف.
const { test } = require('node:test'), assert = require('node:assert/strict'), path = require('node:path')
require('../node_modules/ts-node').register({project:path.join(__dirname,'..','tsconfig.json'),transpileOnly:true,compilerOptions:{jsx:'react-jsx',module:'commonjs',moduleResolution:'node'}})
const ui = require('../../src/lib/employee-salary-change-api')
const { ApiError } = require('../../src/lib/api')
const current = () => ({basicSalary:'9000.00',housingAllowance:'1000.00',transportAllowance:'500.00',phoneAllowance:'0.00',workNatureAllowance:'0.00',otherAllowance:'250.00',currency:'EGP'})
const context = () => ({employeeId:9,current:current(),historyRevision:3,currentSourceHash:'a'.repeat(64)})
const evidence = () => ({effectiveDate:'2026-09-01',reason:'  قرار زيادة معتمد  ',evidenceReference:'  قرار123  ',previousEffectiveFrom:''})
const today = '2026-09-13'
const copy = value => JSON.parse(JSON.stringify(value))
const root = path.resolve(__dirname, '../..')
const change = (form = {...current(),basicSalary:'10000'},ctx = context(),meta = evidence()) => ui.buildEmployeeSalaryChange(ctx,form,meta,today)
async function fetched(response,fn) { const original=global.fetch;let calls=[];global.fetch=async(url,options)=>{calls.push({url,options});return{ok:true,text:async()=>JSON.stringify(response)}};try{return await fn(calls)}finally{global.fetch=original} }

function financialStep(extra = {}) {
 const React = require('../../node_modules/react'), Module = require('node:module')
 const {renderToStaticMarkup} = require('../../node_modules/react-dom/server')
 const load = Module._load, useState = React.useState
 let first = true
 Module._load = function(request,parent,isMain) {
  if(request === '@/components/layout') return {MainLayout:({children})=>React.createElement('main',{className:'max-w-6xl mx-auto p-4 sm:p-6'},children)}
  if(request === 'next/link') return ({children,...props})=>React.createElement('a',props,children)
  return load.call(this,request.startsWith('@/') ? path.join(root,'src',request.slice(2)) : request,parent,isMain)
 }
 React.useState = initial => {if(first){first=false;return useState(3)}return useState(initial)}
 try {
  const Form = require('../../src/components/EmployeeForm').default
  return renderToStaticMarkup(React.createElement(Form,{mode:'edit',employeeId:9,initial:{...current(),basicSalary:'10000.29'},salaryChangeContext:{...context(),historyRevision:0},onSubmit:async()=>{},...extra}))
 } finally { Module._load=load;React.useState=useState }
}

test('context API binds employee and revision/hash while preserving all six exact strings and NULL currency', async()=>{
 const response=context();response.current.basicSalary='9999999999999999.99';response.current.phoneAllowance=null;response.current.currency=null
 const controller=new AbortController()
 await fetched(response,async calls=>{assert.deepEqual(await ui.fetchEmployeeSalaryChangeContext(9,controller.signal),response);assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/employees/9/salary-change-context');assert.equal(calls[0].options.signal,controller.signal)})
})
test('foreign employee, bad revision/hash, lossy money and missing current fields cannot initialize an editable salary',async()=>{
 for(const mutate of [r=>r.employeeId=10,r=>r.historyRevision=-1,r=>r.historyRevision=1.5,r=>r.historyRevision=2147483648,r=>r.currentSourceHash='bad',r=>r.current.basicSalary=9000,r=>r.current.phoneAllowance=undefined,r=>r.current.basicSalary='1e3',r=>r.current.currency={},r=>r.current=null]){
  const response=context();mutate(response);await fetched(response,async()=>assert.rejects(ui.fetchEmployeeSalaryChangeContext(9)))
 }
 const response=context();response.current.basicSalary='-1.00';await fetched(response,async()=>assert.deepEqual(await ui.fetchEmployeeSalaryChangeContext(9),response))
})
test('invalid employee ID fails before fetch and permission/conflict errors are not retried',async()=>{
 await fetched(context(),async calls=>{for(const id of [0,-1,1.5,2147483648,NaN,'9'])await assert.rejects(ui.fetchEmployeeSalaryChangeContext(id));assert.equal(calls.length,0)})
 const previous=global.fetch
 try{for(const status of [403,409,503]){let calls=0;global.fetch=async()=>{calls++;return{ok:false,status,json:async()=>({message:'راجع المصدر'})}};await assert.rejects(ui.fetchEmployeeSalaryChangeContext(9),error=>error instanceof ApiError&&error.status===status);assert.equal(calls,1)}}finally{global.fetch=previous}
})
test('formatting-only changes do not require date/evidence or create a salary command',()=>{
 const form={...current(),basicSalary:'09000',housingAllowance:'1000.0',phoneAllowance:'00.00'}
 assert.equal(ui.employeeSalaryChanged(context(),form),false);assert.equal(change(form,context(),{effectiveDate:'',reason:'',evidenceReference:''}),undefined)
})
test('NULL is not zero and missing currency never becomes SAR on nonfinancial edit',()=>{
 const ctx=context();ctx.current.phoneAllowance=null;ctx.current.currency=null
 const form={...current(),phoneAllowance:'',currency:''}
 assert.equal(ui.employeeSalaryChanged(ctx,form),false)
 assert.equal(ui.employeeSalaryChanged(ctx,{...form,phoneAllowance:'0'}),true)
 assert.equal(ui.employeeSalaryChanged(ctx,{...form,currency:'SAR'}),true)
 assert.deepEqual(ui.employeeSalaryEditPayload({phone:'010',currency:'SAR',phoneAllowance:null},ctx,form,evidence(),today),{phone:'010'})
})
test('a genuine amount change emits only an exact frozen command and preserves all other components',()=>{
 const ctx=context(),form={...current(),basicSalary:'9999999999999999.99'},original=copy({ctx,form})
 assert.deepEqual(change(form,ctx),{expectedRevision:3,expectedCurrentSourceHash:'a'.repeat(64),effectiveDate:'2026-09-01',reason:'قرار زيادة معتمد',evidenceReference:'قرار123',salary:form})
 assert.deepEqual({ctx,form},original)
})
test('nonfinancial PATCH drops all monetary fields/currency including stale top-level null or number values',()=>{
 const payload={fullName:'اسم جديد',phone:'010',basicSalary:9000,housingAllowance:null,transportAllowance:500,phoneAllowance:0,workNatureAllowance:0,otherAllowance:250,currency:'EGP',salaryChange:{forged:true}}
 const original=copy(payload)
 assert.deepEqual(ui.employeeSalaryEditPayload(payload,context(),current(),evidence(),today),{fullName:'اسم جديد',phone:'010'})
 assert.deepEqual(payload,original)
})
test('changed salary PATCH contains nested command only and preserves unrelated bank/contact fields',()=>{
 const result=ui.employeeSalaryEditPayload({phone:'010',bankName:'بنك',basicSalary:1,currency:'SAR'},context(),{...current(),basicSalary:'10000'},evidence(),today)
 assert.deepEqual(Object.keys(result).sort(),['bankName','phone','salaryChange']);assert.equal(result.salaryChange.salary.basicSalary,'10000.00')
})
test('context failure permits a nonfinancial PATCH but cannot leak partial or rounded salary data',()=>{
 assert.deepEqual(ui.employeeSalaryEditPayload({phone:'010',basicSalary:1e16,currency:'SAR',otherAllowance:null,salaryChange:{}},null,current(),evidence(),today),{phone:'010'})
})
test('all six changed-salary values must be explicit nonnegative cents; no blank/null/fractional-cent defaults',()=>{
 for(const key of ui.EMPLOYEE_SALARY_FIELDS)for(const value of ['',null,'-0.01','0.001','1e3','10000000000000000.00'])assert.throws(()=>change({...current(),basicSalary:'10000',[key]:value}),/مكونات الأجر/)
 for(const currency of ['', 'AED', 'USD'])assert.throws(()=>change({...current(),currency}),/عملة الأجر/)
 const ctx=context();ctx.current.basicSalary='-1.00';assert.equal(change({...current(),basicSalary:'-1.00'},ctx),undefined,'unchanged legacy negative does not block personal edits')
})
test('date/reason/reference are required only for real salary changes and future direct edits route to requests',()=>{
 for(const meta of [{effectiveDate:''},{effectiveDate:'2026-02-29'},{effectiveDate:'0000-01-01'},{reason:''},{reason:'س'.repeat(501)},{evidenceReference:''},{evidenceReference:'م'.repeat(201)}])assert.throws(()=>change(undefined,context(),{...evidence(),...meta}))
 assert.throws(()=>change(undefined,context(),{...evidence(),effectiveDate:'2026-09-14'}),/المستقبلي.*طلب زيادة/)
 assert.equal(change(undefined,context(),{...evidence(),effectiveDate:today}).effectiveDate,today)
 assert.equal(change(undefined,context(),{...evidence(),effectiveDate:'2024-02-29'}).effectiveDate,'2024-02-29')
})
test('previous-date confirmation is optional and only legal for first history with a strictly earlier explicit date',()=>{
 const ctx={...context(),historyRevision:0}
 assert.equal(change(undefined,ctx).previousEffectiveFrom,undefined)
 assert.equal(change(undefined,ctx,{...evidence(),previousEffectiveFrom:'2026-01-01'}).previousEffectiveFrom,'2026-01-01')
 for(const previousEffectiveFrom of ['2026-09-01','2026-09-02','2025-02-29'])assert.throws(()=>change(undefined,ctx,{...evidence(),previousEffectiveFrom}))
 assert.throws(()=>change(undefined,context(),{...evidence(),previousEffectiveFrom:'2026-01-01'}))
})
test('display total sums exact cents beyond Number without treating absent components as zero',()=>{
 const form=Object.fromEntries(ui.EMPLOYEE_SALARY_FIELDS.map(key=>[key,'0.00']));form.basicSalary='9999999999999999.99';form.housingAllowance='0.01'
 assert.equal(ui.employeeSalaryTotal(form),'10,000,000,000,000,000.00');form.phoneAllowance='';assert.equal(ui.employeeSalaryTotal(form),null)
 form.phoneAllowance='0.00';form.basicSalary='-1.00';assert.equal(ui.employeeSalaryTotal(form),'-0.99')
})
test('salary increase/resubmit body strips computed percentage and protected basis while allowing future date as exact text',()=>{
 const input={newSalary:'9999999999999999.99',effectiveDate:'2027-01-01',reason:'  زيادة موثقة  ',increase_pct:'999',salaryChangeBasis:'forged',salaryChangeApproval:'forged',employeeId:'88'}
 assert.deepEqual(ui.salaryIncreaseRequestPayload(input),{newSalary:'9999999999999999.99',effectiveDate:'2027-01-01',reason:'زيادة موثقة'})
 assert.equal(input.increase_pct,'999')
 for(const extra of [{newSalary:'0.001'},{newSalary:'1e4'},{newSalary:'-1'},{effectiveDate:'2025-02-29'},{reason:''}])assert.throws(()=>ui.salaryIncreaseRequestPayload({...input,...extra}))
})

test('custom salary workflows retain required attachment and customer fields while core money bypasses numeric conversion',()=>{
 const configured=[{key:'attachmentUrl',label:'قرار الزيادة المرفق',type:'file'},{key:'justification',label:'مبرر إضافي',type:'text'},
  {key:'reviewCount',label:'عدد المراجعات',type:'number'}, {key:'toTeamId',label:'الفريق',type:'select'},
  {key:'newSalary',label:'قديم',type:'number'}, {key:'increase_pct',type:'number'}, {key:'salaryChangeBasis',type:'text'}, {key:'salaryChangeApproval',type:'text'}]
 const fields=ui.salaryIncreaseRequestFields(configured,[{key:'attachmentUrl',label:'مرفق',type:'text'},{key:'requiredOnly',label:'توضيح مطلوب',type:'text'}])
 assert.deepEqual(fields.slice(0,3).map(f=>[f.key,f.type,f.required]),[['newSalary','text',true],['effectiveDate','date',true],['reason','text',true]])
 assert.deepEqual(fields.find(f=>f.key==='attachmentUrl'),{key:'attachmentUrl',label:'قرار الزيادة المرفق',type:'file',required:true})
 assert.equal(fields.find(f=>f.key==='requiredOnly').required,true)
 assert.equal(fields.some(f=>['increase_pct','salaryChangeBasis','salaryChangeApproval'].includes(f.key)),false)
 const values={newSalary:'9999999999999999.99',effectiveDate:'2027-01-01',reason:'زيادة',attachmentUrl:' upload:123 ',justification:' توضيح ',reviewCount:'2',toTeamId:'7',requiredOnly:'مستند إضافي',increase_pct:'forged',salaryChangeBasis:'forged',salaryChangeApproval:'forged'}
 assert.deepEqual(ui.salaryIncreaseRequestPayload(values,fields,['toTeamId']),{newSalary:'9999999999999999.99',effectiveDate:'2027-01-01',reason:'زيادة',attachmentUrl:'upload:123',justification:'توضيح',reviewCount:2,toTeamId:7,requiredOnly:'مستند إضافي'})
 assert.throws(()=>ui.salaryIncreaseRequestPayload({...values,attachmentUrl:''},fields),/قرار الزيادة المرفق/)
})

test('real financial-step SSR keeps six exact text fields and initially blank effective dates for genuine change only',()=>{
 const html=financialStep()
 assert.match(html,/موعد تطبيق تعديل الراتب/);assert.match(html,/يسري من/);assert.match(html,/value="10000.29"/)
 assert.equal((html.match(/inputMode="decimal"/g)??[]).length,6)
 assert.equal((html.match(/type="date"/g)??[]).length,2)
 for(const input of html.match(/<input[^>]*type="date"[^>]*>/g)??[])assert.match(input,/value=""/)
 assert.match(html,/الأجر الحالي لا يتغير قبل موعد السريان واعتماد الطلب/)
 assert.doesNotMatch(financialStep({initial:current()}),/موعد تطبيق تعديل الراتب/)
 assert.doesNotMatch(financialStep({salaryChangeContext:context()}),/أؤكد سريان الأجر الحالي السابق/)
 assert.match(html,/القيم السابقة التي ستُوثّق/);assert.match(html,/9000.00/)
})

test('previous salary confirmation displays exact old values and rejects incomplete/unsupported old evidence',()=>{
 const ctx={...context(),historyRevision:0};ctx.current.basicSalary='9999999999999999.99'
 assert.equal(ui.employeePreviousSalaryCanBeConfirmed(ctx),true)
 assert.match(financialStep({salaryChangeContext:ctx}),/9999999999999999.99/)
 for(const mutate of [c=>c.current.phoneAllowance=null,c=>c.current.currency=null,c=>c.current.currency='AED',c=>c.current.basicSalary='-1.00']){
  const invalid=copy(ctx);mutate(invalid);assert.equal(ui.employeePreviousSalaryCanBeConfirmed(invalid),false)
  assert.throws(()=>change(undefined,invalid,{...evidence(),previousEffectiveFrom:'2026-01-01'}),/الأجر السابق/)
  const html=financialStep({salaryChangeContext:invalid})
  assert.match(html,/لا يمكن إثبات فترة سابقة منها/);assert.match(html,/<input type="date" disabled=""/)
 }
})

test('context failure SSR locks six salaries and currency while preserving bank edits and explaining recovery',()=>{
 const html=financialStep({salaryChangeContext:null,salaryContextError:'تعذر تحميل الأجر من الخدمة.'})
 assert.match(html,/يمكنك حفظ البيانات غير المالية/);assert.match(html,/تعذر تحميل الأجر من الخدمة/)
 assert.equal((html.match(/<input[^>]*inputMode="decimal"[^>]*disabled=""/g)??[]).length,6)
 assert.match(html,/<select[^>]*disabled=""/)
 assert.match(html,/<input class="input" list="employee-bank-options"/)
 assert.doesNotMatch(html,/موعد تطبيق تعديل الراتب/)
})

test('execution recovery sends only reason and request ID, permits scheduled reference, and accepts a server-confirmed rejection',async()=>{
 const request={id:81,typeCode:'CUSTOM_SALARY',status:'IN_EXECUTION',requesterId:9,createdAt:'2026-09-13',destinationRef:'salary-schedule:81'}
 const response={...request,status:'REJECTED'}
 assert.equal(ui.canCancelSalaryIncreaseExecution(request,'salary_update_history',true),true)
 await fetched(response,async calls=>{
  assert.deepEqual(await ui.cancelSalaryIncreaseExecution(request,'salary_update_history',true,'  تغير أساس الطلب  '),response)
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/requests/81/reject-execution')
  assert.equal(calls[0].options.method,'POST');assert.deepEqual(JSON.parse(calls[0].options.body),{comment:'تغير أساس الطلب'})
 })
})

test('execution recovery never sends for denied/completed/non-salary requests or empty reason; stale 409 is not retried',async()=>{
 const request={id:81,typeCode:'SALARY_INCREASE',status:'IN_EXECUTION',requesterId:9,createdAt:'2026-09-13'}
 await fetched({},async calls=>{
  for(const [row,handler,permission,comment]of[[request,undefined,false,'سبب'],[{...request,status:'COMPLETED'},undefined,true,'سبب'],[{...request,completedAt:'2026-09-13'},undefined,true,'سبب'],[{...request,typeCode:'LOAN'},'loan_create',true,'سبب'],[{...request,confidentialMasked:true},undefined,true,'سبب'],[request,undefined,true,'  '],[request,undefined,true,'س'.repeat(901)]])await assert.rejects(ui.cancelSalaryIncreaseExecution(row,handler,permission,comment))
  assert.equal(calls.length,0)
 })
 const previous=global.fetch;let calls=0
 try{global.fetch=async()=>{calls++;return{ok:false,status:409,json:async()=>({message:'الزيادة منفذة بالفعل'})}};await assert.rejects(ui.cancelSalaryIncreaseExecution(request,undefined,true,'تغير المصدر'),error=>error instanceof ApiError&&error.status===409);assert.equal(calls,1)}finally{global.fetch=previous}
 await fetched({...request,status:'REJECTED',id:82},async()=>assert.rejects(ui.cancelSalaryIncreaseExecution(request,undefined,true,'تغير المصدر'),/رد إلغاء التنفيذ/))
})

if(process.env.EMPLOYEE_SALARY_UI_RENDER==='1')test('desktop/mobile financial-step SSR uses actual form and project CSS without live requests',async()=>{
 const fs=require('node:fs'),postcss=require('../../node_modules/postcss'),tailwind=require('../../node_modules/tailwindcss')
 const {chromium}=require('C:/Users/Kareem/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
 const config=require('../../tailwind.config.js')
 const css=await postcss([tailwind({...config,content:[path.join(root,'src/components/EmployeeForm.tsx'),{raw:'max-w-6xl mx-auto p-4 sm:p-6 text-sm text-gray-500'}]})]).process(fs.readFileSync(path.join(root,'src/app/globals.css'),'utf8').replace(/^@import[^\n]+\n/m,''),{from:undefined})
 const html=`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>تعديل الراتب — عرض اختبار SSR</title><style>${css.css}</style><body><p class="text-sm text-gray-500 p-4">عرض SSR ببيانات اختبار؛ ليس بيانات الشركة أو الخدمة الحية. خطوة البيانات المالية من النموذج الفعلي.</p>${financialStep()}</body></html>`
 fs.writeFileSync(path.join(root,'output/employee-salary-change-ui-ssr.html'),html)
 const browser=await chromium.launch({channel:'msedge',headless:true})
 try{const page=await browser.newPage();await page.route('**/*',route=>route.abort());await page.setContent(html,{waitUntil:'domcontentloaded'})
  for(const [name,width,height]of[['desktop',1280,1000],['mobile',390,844]]){await page.setViewportSize({width,height});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false,name+' overflow');await page.screenshot({path:path.join(root,`output/employee-salary-change-ui-${name}.png`),fullPage:true})}
 }finally{await browser.close()}
 console.log('SSR actual EmployeeForm financial step + project CSS. MainLayout shell mocked; step3 initialized. No mounted-interaction or live-service claim; network disabled.')
},{timeout:60000})

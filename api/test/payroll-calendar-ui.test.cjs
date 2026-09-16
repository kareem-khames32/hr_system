'use strict'
// واجهة حقيقية مع SSR وfetch معزول؛ لا خدمة أو SQL أو بيانات شركة.
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),Module=require('node:module')
require('../node_modules/ts-node').register({project:path.join(__dirname,'..','tsconfig.json'),transpileOnly:true,compilerOptions:{jsx:'react-jsx',module:'commonjs',moduleResolution:'node'}})
const ui=require('../../src/lib/payroll-calendar-api'),api=require('../../src/lib/api')
const React=require('../../node_modules/react'),{renderToStaticMarkup}=require('../../node_modules/react-dom/server')
const load=Module._load,root=path.resolve(__dirname,'../..')
Module._load=function(request,parent,isMain){return load.call(this,request.startsWith('@/')?path.join(root,'src',request.slice(2)):request,parent,isMain)}
const components=require('../../src/components/PayrollCalendarChange')
Module._load=load
const {PayrollLiveSourceDetails}=require('../../src/components/PayrollLiveSourcesPanel')
const copy=value=>JSON.parse(JSON.stringify(value))
const context=(scope='GLOBAL',sourceId=0)=>({scope,sourceId,revision:2,currentSourceHash:'a'.repeat(64),effectiveFrom:'2026-09-01',legacyBaseline:false,currentMatchesHistory:true,current:scope==='GLOBAL'?{weekendDays:null,holidays:[{id:4,name:'عطلة اختبار',date:'2026-10-01',endDate:null,country:null}],exceptions:[{id:8,name:'أول سبت',weekday:'SAT',occurrence:'1ST',effect:'WORK',isActive:true}]}:scope==='BRANCH'?{id:sourceId,country:'EG',weekendDays:null,exceptions:[]}:{branchId:5}})
const evidence=()=>({effectiveFrom:'2026-09-13',reason:'  تأكيد تقويم موثق  '})
async function fetched(response,fn,status=200){const old=global.fetch,calls=[];global.fetch=async(url,options)=>{calls.push({url,options});return{ok:status<400,status,text:async()=>JSON.stringify(response)}};try{return await fn(calls)}finally{global.fetch=old}}
const render=(component,props)=>renderToStaticMarkup(React.createElement(component,props))
const detail=(name,data,state='AVAILABLE')=>render(PayrollLiveSourceDetails,{name,section:{state,data,issues:[],sourceRefs:[]}})
function employmentStep(props){
 const originalLoad=Module._load,originalState=React.useState;let first=true
 Module._load=function(request,parent,isMain){if(request==='@/components/layout')return{MainLayout:({children})=>React.createElement('main',null,children)};if(request==='next/link')return({children,...attributes})=>React.createElement('a',attributes,children);return originalLoad.call(this,request.startsWith('@/')?path.join(root,'src',request.slice(2)):request,parent,isMain)}
 React.useState=initial=>{if(first){first=false;return originalState(2)}return originalState(initial)}
 try{return render(require('../../src/components/EmployeeForm').default,{onSubmit:async()=>{},...props})}finally{Module._load=originalLoad;React.useState=originalState}
}

test('context binds scope/id and AbortSignal, preserving nullable global/branch values',async()=>{
 for(const [scope,id]of[['GLOBAL',0],['BRANCH',5],['EMPLOYEE',9]]){const ctx=context(scope,id),signal=new AbortController().signal;await fetched(ctx,async calls=>{assert.deepEqual(await ui.fetchPayrollCalendarContext(scope,id,signal),ctx);assert.equal(calls.length,1);const url=new URL(calls[0].url);assert.equal(url.pathname,'/api/attendance/calendar-context');assert.equal(url.searchParams.get('scope'),scope);assert.equal(url.searchParams.get('sourceId'),String(id));assert.equal(calls[0].options.signal,signal)})}
})
test('foreign/stale identity and malformed scope rows cannot initialize mutation',async()=>{
 for(const mutate of[r=>r.sourceId=4,r=>r.scope='BRANCH',r=>r.revision=-1,r=>r.currentSourceHash='x',r=>r.currentMatchesHistory=undefined,r=>r.current.holidays=[null],r=>r.current.holidays[0].date='2026-02-30',r=>r.current.exceptions[0].weekday=6,r=>r.current.exceptions[0].effect='UNKNOWN',r=>r.current.weekendDays=0]){const ctx=context();mutate(ctx);await fetched(ctx,()=>assert.rejects(ui.fetchPayrollCalendarContext('GLOBAL',0)))}
})
test('branchless employee context is readable and does not invent an assignment',()=>{const ctx=context('EMPLOYEE',9);ctx.current.branchId=null;assert.equal(ui.validatePayrollCalendarContext(ctx,'EMPLOYEE',9).current.branchId,null)})
test('scope guard does not treat star permissions as unlimited branch scope',()=>{
 const scoped={role:'hr',branchId:5,permissions:['*']};assert.equal(ui.calendarScopeWritable('GLOBAL',0,scoped),false);assert.equal(ui.calendarScopeWritable('BRANCH',5,scoped),true);assert.equal(ui.calendarScopeWritable('BRANCH',6,scoped),false);assert.equal(ui.calendarScopeWritable('GLOBAL',0,{...scoped,role:'super_admin'}),true);assert.equal(ui.calendarScopeWritable('GLOBAL',0,{...scoped,branchId:null}),true);assert.equal(ui.calendarScopeWritable('GLOBAL',0,null),false)
})
test('metadata requires explicit actual date, ordered history and bounded reason; same-date correction allowed',()=>{
 assert.deepEqual(ui.emptyCalendarEvidence(),{effectiveFrom:'',reason:''})
 for(const effectiveFrom of['','2026-02-29','2026-09-00','0000-01-01','2026-08-31'])assert.throws(()=>ui.buildCalendarChange(context(),{...evidence(),effectiveFrom}))
 assert.equal(ui.buildCalendarChange(context(),{...evidence(),effectiveFrom:'2026-09-01'}).effectiveFrom,'2026-09-01')
 const legacy={...context(),revision:0,effectiveFrom:null,legacyBaseline:true};assert.equal(ui.buildCalendarChange(legacy,{...evidence(),effectiveFrom:'2028-02-29'}).expectedRevision,0)
 for(const reason of['  ','ab','x'.repeat(501)])assert.throws(()=>ui.buildCalendarChange(context(),{...evidence(),reason}))
 assert.throws(()=>ui.buildCalendarChange(null,evidence()));assert.throws(()=>ui.buildCalendarChange({...context(),currentMatchesHistory:false},evidence()))
})
test('forged evidence revision/hash/extra keys are discarded in favor of read server context',()=>{
 const value=ui.buildCalendarChange(context(),{...evidence(),expectedRevision:99,expectedCurrentSourceHash:'b'.repeat(64),employeeId:7});assert.deepEqual(value,{effectiveFrom:'2026-09-13',reason:'تأكيد تقويم موثق',expectedRevision:2,expectedCurrentSourceHash:'a'.repeat(64)})
})
test('whole-scope unchanged confirmation sends only scope identity and metadata; verifies new revision',async()=>{
 const ctx=context(),response={...copy(ctx),revision:3,effectiveFrom:'2026-09-13'};await fetched(response,async calls=>{assert.deepEqual(await ui.confirmPayrollCalendarContext(ctx,evidence()),response);assert.equal(calls[0].options.method,'POST');assert.deepEqual(JSON.parse(calls[0].options.body),{scope:'GLOBAL',sourceId:0,calendarChange:ui.buildCalendarChange(ctx,evidence())})})
})
test('confirmation rejects stale revision/effective date/current drift/changed hash without automatic retry',async()=>{
 for(const mutate of[r=>r.revision=2,r=>r.effectiveFrom='2026-09-14',r=>r.currentSourceHash='b'.repeat(64),r=>r.currentMatchesHistory=false,r=>r.legacyBaseline=true]){const response={...copy(context()),revision:3,effectiveFrom:'2026-09-13'};mutate(response);await fetched(response,async calls=>{await assert.rejects(ui.confirmPayrollCalendarContext(context(),evidence()));assert.equal(calls.length,1)})}
 await fetched({message:'تغيرت نسخة التقويم'},async calls=>{await assert.rejects(ui.confirmPayrollCalendarContext(context(),evidence()),e=>e instanceof api.ApiError&&e.status===409);assert.equal(calls.length,1)},409)
})
test('holiday and exceptional-rule DELETE retain dated body and URL',async()=>{
 const change=ui.buildCalendarChange(context(),evidence());await fetched({deleted:false},async calls=>{await api.deleteCatalogItem('holidays',4,change);await api.deleteScheduleRule(8,change);for(const call of calls){assert.equal(call.options.method,'DELETE');assert.deepEqual(JSON.parse(call.options.body),{calendarChange:change})}assert.equal(new URL(calls[0].url).pathname,'/api/catalogs/holidays/4');assert.equal(new URL(calls[1].url).pathname,'/api/attendance/schedule-rules/8')})
})
test('rule toggle cannot bind a stale list decision to a newer calendar hash',()=>{
 assert.deepEqual(ui.calendarRuleToggle(context(),8,true),{isActive:false});assert.throws(()=>ui.calendarRuleToggle(context(),8,false));assert.throws(()=>ui.calendarRuleToggle(context(),99,true));assert.throws(()=>ui.calendarRuleToggle(context('BRANCH',5),8,true))
})
test('existing config/branch writes preserve narrow nested metadata without polluting other config values',async()=>{
 const change=ui.buildCalendarChange(context(),evidence());await fetched({},async calls=>{await api.updateConfig('attendance.weekend_days','FRI',change);await api.updateConfig('system.company_name','اختبار');await api.updateBranch(5,{name:'اسم جديد'});assert.deepEqual(JSON.parse(calls[0].options.body),{key:'attendance.weekend_days',value:'FRI',calendarChange:change});assert.deepEqual(JSON.parse(calls[1].options.body),{key:'system.company_name',value:'اختبار'});assert.deepEqual(JSON.parse(calls[2].options.body),{name:'اسم جديد'})})
})
test('unchanged employee branch omits branch and forged command despite missing context, preserving noncalendar changes',()=>{
 const input={branchId:5,fullName:'اسم جديد',phone:'123',calendarChange:{forged:true}},before=copy(input);assert.deepEqual(ui.employeeCalendarPayload(input,'5','5',null,ui.emptyCalendarEvidence(),false),{fullName:'اسم جديد',phone:'123'});assert.deepEqual(input,before)
})
test('employee change and explicit unchanged confirmation require EMPLOYEE context and dated evidence',()=>{
 const ctx=context('EMPLOYEE',9);assert.throws(()=>ui.employeeCalendarPayload({branchId:6},'5','6',null,evidence(),false));assert.throws(()=>ui.employeeCalendarPayload({branchId:6},'5','6',context(),evidence(),false));assert.throws(()=>ui.employeeCalendarPayload({branchId:6},'5','6',ctx,ui.emptyCalendarEvidence(),false));assert.deepEqual(ui.employeeCalendarPayload({branchId:6,phone:'123'},'5','6',ctx,evidence(),false),{branchId:6,phone:'123',calendarChange:ui.buildCalendarChange(ctx,evidence())});assert.deepEqual(ui.employeeCalendarPayload({branchId:5},'5','5',ctx,evidence(),true),{calendarChange:ui.buildCalendarChange(ctx,evidence())})
})
test('actual calendar fields SSR starts blank, has date lower bound, and disables missing/drift context',()=>{
 const props={context:context(),value:ui.emptyCalendarEvidence(),onChange:()=>{}};const html=render(components.CalendarChangeFields,props);assert.match(html,/value=""/);assert.match(html,/min="2026-09-01"/);assert.match(html,/سبب التغيير/);assert.match(html,/ليس مدة العطلة/);for(const ctx of[null,{...context(),currentMatchesHistory:false}])assert.match(render(components.CalendarChangeFields,{...props,context:ctx}),/<fieldset disabled=""/)
})
test('actual calendar summary displays counts/undated status and drift without fabricated history',()=>{
 const html=render(components.CalendarContextSummary,{context:{...context(),revision:0,effectiveFrom:null,legacyBaseline:true}});assert.match(html,/لم يُثبت تاريخ سريانها/);assert.match(html,/العطلات: 1/);assert.match(html,/القواعد الاستثنائية: 1/);assert.doesNotMatch(html,/1900|undefined|\[object Object\]/);assert.match(render(components.CalendarContextSummary,{context:{...context(),currentMatchesHistory:false}}),/الحفظ متوقف/)
})
test('whole-scope confirmation summary exposes every holiday range and inactive exceptional rule for review',()=>{
 const ctx=context();ctx.current.holidays.push({id:5,name:'عطلة ممتدة',date:'2026-10-03',endDate:'2026-10-05',country:'EG'});ctx.current.exceptions[0].isActive=false;const html=render(components.CalendarContextSummary,{context:ctx});for(const text of['مراجعة جميع قيم التقويم','عطلة اختبار','عطلة ممتدة','2026-10-03','2026-10-05','أول سبت','السبت','الأول','معطلة'])assert.ok(html.includes(text));assert.match(html,/<details/);assert.doesNotMatch(html,/\[object Object\]|undefined/)
})
test('employee edit shows the branch/schedule change line only when branch or schedule actually changes (no version text, no confirmation box)',()=>{
 const ctx=context('EMPLOYEE',9),html=employmentStep({mode:'edit',employeeId:9,initial:{branchId:'5'},calendarContext:ctx});assert.doesNotMatch(html,/أؤكد سريان الفرع الحالي|الفرع المسجل|التغيير يبدأ من/);assert.doesNotMatch(html,/value="1900-/)
 const missing=employmentStep({mode:'edit',employeeId:9,initial:{branchId:'5'},calendarContext:null,calendarContextError:'تعذر تحميل السياق'});assert.doesNotMatch(missing,/أؤكد سريان الفرع الحالي|التغيير يبدأ من/)
 const source=require('fs').readFileSync(require('path').join(__dirname,'..','..','src','components','EmployeeForm.tsx'),'utf8')
 assert.ok(source.includes("{mode === 'edit' && orgChanged && ("),'the line appears only on a real change')
 assert.ok(source.includes("effectiveFrom: form.attendanceEffectiveFrom || localToday()"),'date defaults to today')
 assert.ok(source.includes("reason: form.attendanceChangeReason?.trim() || 'تغيير الفرع أو جدول العمل'"),'reason is optional with a default')
})
test('employee creation shows no branch/schedule date box and keeps the server creation fallback without joinDate inference',()=>{
 const html=employmentStep({mode:'add',initial:{branchId:'5'}});assert.doesNotMatch(html,/سريان الدوام والفرع معًا|التغيير يبدأ من/)
 const source=require('fs').readFileSync(require('path').join(__dirname,'..','..','src','components','EmployeeForm.tsx'),'utf8')
 assert.ok(source.includes('الإنشاء بلا تاريخ: الخادم يسجّل من يوم إنشاء الملف'),'creation sends no effective date')
})
test('schedule separates dated calendar classification from timing and shows daily blocker/source reference',()=>{
 const html=detail('schedule',{days:[{date:'2026-09-01',calendarState:'AVAILABLE',dayKind:'HOLIDAY',timingState:'MISSING',timing:null,sourceRefs:['calendar:global:1'],issues:[]},{date:'2026-09-02',calendarState:'MISSING',dayKind:'WORKING',timingState:'AVAILABLE',timing:{startTime:'09:00',endTime:'18:00',requiredWorkMinutes:540,flexEnabled:false},sourceRefs:[],issues:[{message:'لم يثبت تقويم الفرع لهذا اليوم'}]}]});for(const text of['عطلة رسمية','نوع اليوم غير مثبت','لم يثبت تقويم الفرع لهذا اليوم','calendar:global:1','540'])assert.ok(html.includes(text));assert.doesNotMatch(html,/undefined|\[object Object\]/)
})
const proof=()=>({basis:'UNIQUE_RAW_PUNCH_PAIR_VERIFIED',computedAt:'2026-09-01T19:00:00Z',firstIn:'2026-09-01T09:00:01Z',lastOut:'2026-09-01T18:00:01Z',punchIds:[3,4],tierDay:{rawLateSeconds:'1',excusedLateSeconds:'0',flexibleStartEnabled:true,shiftGraceMinutes:0},shortfallMinutes:0,countedWorkMinutes:540})
test('attendance proof renders verified exact seconds and source refs; missing proof never supplies zero',()=>{
 const html=detail('attendance',{totals:null,days:[{date:'2026-09-01',state:'AVAILABLE',status:'late',proof:proof(),sourceRefs:['attendance:1','punch:3'],issues:[]},{date:'2026-09-02',state:'MISSING',status:null,proof:null,sourceRefs:[],issues:[{message:'سجل اليوم غير موجود'}]}]});for(const text of['بصمتا دخول وخروج مثبتتان','1 / 0','540','punch:3','سجل اليوم غير موجود','غير مثبت / غير مثبت'])assert.ok(html.includes(text));assert.doesNotMatch(html,/undefined|\[object Object\]/)
})
test('unavailable or unknown proof cannot expose stale financial facts; nonworking proof says not applicable',()=>{
 const missing=detail('attendance',{totals:null,days:[{date:'2026-09-01',state:'INVALID',proof:{...proof(),tierDay:{rawLateSeconds:'987654',excusedLateSeconds:'0'}},sourceRefs:[],issues:[]}]});assert.doesNotMatch(missing,/987654/);assert.match(missing,/الدليل غير مثبت/)
 const holiday=detail('attendance',{totals:null,days:[{date:'2026-09-01',state:'AVAILABLE',proof:{basis:'DATED_NON_WORKING_DAY',attendanceNotRequired:true},sourceRefs:[],issues:[]}]});assert.match(holiday,/لا ينطبق/);assert.match(holiday,/يوم راحة أو عطلة مثبت/)
})
test('confirmed zero totals remain zero while absent totals stay unproved',()=>{
 const data={days:[],totals:{workedDays:0,absentDays:0,shortfallMinutes:0,paidPermissionDeductibleMinutes:0}};assert.equal((detail('attendance',data).match(/font-semibold mt-1">0</g)||[]).length,4);assert.equal((detail('attendance',{...data,totals:null}).match(/font-semibold mt-1">غير مثبت</g)||[]).length,4)
})

'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('../node_modules/typescript'),Module=require('node:module')
const audience=require('../src/requests/request-audience')
test('P2U malformed known condition values must be rejected as a whole by the evaluator',t=>{
 const cases=[
  {condition:{field:'nationality',values:['UNKNOWN']},attributes:{nationality:null}},
  {condition:{field:'joinDate',op:'before',value:'2026-99-99'},attributes:{joinDate:'2020-01-01'}},
  {condition:{field:'joinDate',op:'before',value:'2026-10-10 trailing junk'},attributes:{joinDate:'2020-01-01'}},
  {condition:{field:'nationality',values:['SAUDI','broken']},attributes:{nationality:'سعودي'}},
 ]
 const actual=cases.map(({condition,attributes})=>audience.requestAudienceAllows(JSON.stringify({mode:'all',ids:[],conditions:[condition]}),{role:'employee',employeeId:9,permissions:[],attributes},'submit'))
 t.diagnostic(JSON.stringify({case:'malformed-runtime-conditions',actual}));assert.deepEqual(actual,cases.map(()=>false))
})
test('P2U constructor is a valid field key and must not crash the actual audience-editor JSX',()=>{
 const api=require('../src/employees/employee-custom-fields');assert.equal(api.CUSTOM_FIELD_KEY.test('constructor'),true)
 const file=path.resolve(__dirname,'../../src/app/settings/request-types/page.tsx'),source=fs.readFileSync(file,'utf8')
 // Compile the exact mapping rendered by the existing editor, rather than a duplicate implementation.
 const start=source.indexOf('{customFields.map((field) => ('),end=source.indexOf('{/* شرط متخزّن على حقل',start)
 assert.ok(start>0&&end>start)
 const helper=source.split(/\r?\n/).find(line=>line.startsWith('const customCondOf ='));assert.ok(helper);
 const exact=source.slice(start,end),script=`${helper}
const React=require('react');const customFields=[{fieldKey:'constructor',label:'Valid object-name field',type:'YESNO',options:['yes','no']}];const form={customConds:Object.fromEntries([])};const audienceValueLabel=(t,v)=>v;const setForm=()=>{};const toggleId=()=>[];exports.View=()=> <div>${exact}</div>`
 const compiled=ts.transpileModule(script,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022}}).outputText
 const mod=new Module(file,module);mod.filename=file;mod.paths=Module._nodeModulePaths(path.dirname(file));mod._compile(compiled,file)
 const React=require('../../node_modules/react'),render=require('../../node_modules/react-dom/server').renderToStaticMarkup
 assert.doesNotThrow(()=>render(React.createElement(mod.exports.View)))
})

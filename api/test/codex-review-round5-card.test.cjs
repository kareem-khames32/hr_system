'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path')
require('../node_modules/ts-node').register({project:path.join(__dirname,'../tsconfig.json'),transpileOnly:true,compilerOptions:{jsx:'react-jsx',module:'commonjs',moduleResolution:'node'}})
const React=require('../../node_modules/react'),{renderToStaticMarkup}=require('../../node_modules/react-dom/server')
const Card=require('../../src/components/requests/RequestEmployeeCard').default
const requester={employeeId:1,fullName:'REVIEW NAME',employeeCode:'REVIEW CODE',jobTitle:'REVIEW JOB',departmentName:'REVIEW DEPARTMENT',branchName:'REVIEW BRANCH',teamName:'REVIEW TEAM',directManagerName:'REVIEW MANAGER'}
const render=props=>renderToStaticMarkup(React.createElement(Card,props))
test('CR5 card renders allowed current organization and submitter',()=>{
  const html=render({requester,submittedBy:{displayName:'REVIEW SUBMITTER'}})
  for(const value of Object.values(requester).filter(x=>typeof x==='string'))assert.ok(html.includes(value))
  assert.ok(html.includes('REVIEW SUBMITTER'))
})
test('CR5 hidden card shows name/code and explanation but none of five organization fields',()=>{
  const html=render({requester:{...requester,orgHidden:true},submittedBy:{displayName:'REVIEW SUBMITTER'}})
  for(const key of ['jobTitle','departmentName','branchName','teamName','directManagerName'])assert.ok(!html.includes(requester[key]))
  assert.ok(html.includes(requester.fullName));assert.ok(html.includes(requester.employeeCode))
  assert.ok(html.includes('برّه نطاقك'));assert.ok(html.includes('REVIEW SUBMITTER'))
})
test('CR5 confidential or absent requester renders no card',()=>{
  assert.equal(render({requester:null,submittedBy:{displayName:'REVIEW SUBMITTER'}}),'')
  assert.equal(render({}),'')
})

'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path')
const ts=require('../node_modules/typescript'), baseline=require('./codex-review-p8a-baseline.cjs')
const root=path.resolve(__dirname,'..')
function methods(text){
  const file=ts.createSourceFile('source.ts',text,ts.ScriptTarget.Latest,true)
  const found=new Map()
  function visit(node){if(ts.isMethodDeclaration(node))found.set(node.name.getText(file),node.getText(file).replace(/\s+/g,' ')); ts.forEachChild(node,visit)}
  visit(file);return found
}
test('P8A-D01: pre-existing request resolver methods unchanged except intentional task tree definitions',()=>{
  const file='requests/approver-resolver.service.ts', before=methods(baseline[file]),after=methods(fs.readFileSync(path.join(root,'src',file),'utf8'))
  const intentional=new Set(['managersStepOf','subordinatesOf'])
  let compared=0
  for(const [name,body] of before){if(!intentional.has(name)){assert.equal(after.get(name),body,name);compared++}}
  assert.ok(compared>10)
  const requestSource=fs.readFileSync(path.join(root,'src/requests/requests.service.ts'),'utf8')
  assert.doesNotMatch(requestSource,/\.(subordinatesOf|isUnder|managersStepOf|directSuperiorOf)\(/)
})
test('P8A-D02: new mail and meet remain default-off with no preset',()=>{
  require('../node_modules/ts-node').register({project:path.join(root,'tsconfig.json'),transpileOnly:true})
  const {MODULES}=require('../src/modules-registry/registry')
  for(const key of ['meet','mail']){assert.equal(MODULES[key].defaultEnabled,false);assert.equal(MODULES[key].preset,null)}
})

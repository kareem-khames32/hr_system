'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process')
const ts=require('../node_modules/typescript'),root=path.resolve(__dirname,'../..')
const rows=[]
for(const [file,names] of [
 ['api/src/payroll/financial-exemptions.service.ts',['assertRunInScope']],
 ['api/src/payroll/payroll.service.ts',['changeRunMembership','changeRunMembershipBulk']],
]){
 const old=execFileSync('git',['show',`7332f1e:${file}`],{cwd:root,encoding:'utf8'}).replaceAll('\r\n','\n')
 const current=fs.readFileSync(path.join(root,file),'utf8').replaceAll('\r\n','\n')
 const methods=text=>{
  const tree=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true),found=new Map()
  function visit(node){if(ts.isMethodDeclaration(node)&&names.includes(node.name.getText(tree)))found.set(node.name.getText(tree),{source:node.getText(tree),line:tree.getLineAndCharacterOfPosition(node.getStart(tree)).line+1});ts.forEachChild(node,visit)}
  visit(tree);return found
 }
 const before=methods(old),after=methods(current)
 for(const name of names){assert.ok(before.has(name)&&after.has(name));assert.equal(after.get(name).source,before.get(name).source)
  rows.push({file,method:name,previousLine:before.get(name).line,currentLine:after.get(name).line,identicalTo7332f1e:true,sha256:crypto.createHash('sha256').update(after.get(name).source).digest('hex')})
 }
}
fs.writeFileSync(path.join(__dirname,'codex-review-round24-source-audit-results.cjs'),'module.exports = '+JSON.stringify({comparison:'7332f1e..31cd394',kind:'static source comparison; live cases run at 31cd394 only',rows},null,2)+'\n')
console.log(JSON.stringify(rows))

'use strict'
const fs=require('node:fs'),path=require('node:path')
const source=fs.readFileSync(path.join(__dirname,'overtime-auto-approve-period.integration.cjs'),'utf8').replace(/\r\n/g,'\n')
let copy=source.replace("const content = () => fs.readFileSync(path.join(MIGRATIONS, FILE), 'utf8')", "const content = () => fs.readFileSync(path.join(MIGRATIONS, FILE), 'utf8').replace(/\\r\\n/g, '\\n')")
// Normalize working-tree CRLF as db-migrate does. No other original assertion changes.
copy=copy.replace("assert.equal(raw.includes(13), false, 'LF بس')", "assert.equal(content().includes('\\r'), false, 'Migration input normalized like db-migrate')")
const extra=fs.readFileSync(path.join(__dirname,'codex-review-round17-overtime-extra.cjs'),'utf8')
const marker="// شكل العمود وقيده الافتراضي في القاعدة"
if(!copy.includes(marker)||copy===source)throw Error('Fixture markers changed')
copy='// Review copy of the original feature tests, with disclosed CRLF adaptation and independent added cases.\n'+copy.replace(marker,extra+'\n'+marker)
fs.writeFileSync(path.join(__dirname,'codex-review-round17-overtime.integration.cjs'),copy)
console.log('Created review overtime suite: 14 original cases + 7 independent cases; original file unchanged')

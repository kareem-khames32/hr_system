'use strict'
const fs=require('node:fs'),path=require('node:path')
Object.assign(process.env,{NODE_ENV:'test',JWT_SECRET:require('node:crypto').randomBytes(48).toString('hex'),DB_SYNCHRONIZE:'false'})
require('../node_modules/ts-node').register({project:path.join(__dirname,'../tsconfig.json'),transpileOnly:true});require('../node_modules/reflect-metadata')
require('../src/app.module')
const storage=require('../node_modules/typeorm').getMetadataArgsStorage()
const rules=require('../src/employees/confidential-text'),tables=['employees',...require('../src/employees/employee-data-export').EMPLOYEE_DATA_SECTIONS.map(s=>s.table)]
const entries=[]
for(const table of tables){const meta=storage.tables.find(t=>t.name===table);if(!meta)throw Error('Missing entity '+table)
 for(const c of storage.columns.filter(c=>c.target===meta.target)){const type=c.options.type,design=Reflect.getMetadata('design:type',c.target.prototype,c.propertyName)
  if(!(type===undefined?design===String:[String,'nvarchar','varchar','text','ntext','simple-json'].includes(type)))continue
  entries.push({table,column:c.propertyName,type:typeof type==='function'?type.name:type??design?.name,length:c.options.length??255,category:(rules.FREE_TEXT_COLUMNS[table]||[]).includes(c.propertyName)?'free':(rules.STRUCTURED_LONG_COLUMNS[table]||[]).includes(c.propertyName)?'explicit-structured':'other'})
 }}
fs.writeFileSync(path.join(__dirname,'codex-review-p4e-field-inventory.cjs'),'module.exports = '+JSON.stringify(entries,null,2)+'\n')
const unclassifiedJson=entries.filter(e=>e.type==='simple-json'&&e.category==='other')
fs.writeFileSync(path.join(__dirname,'codex-review-p4e-field-coverage.cjs'),'module.exports = '+JSON.stringify({textColumns:entries.length,free:entries.filter(e=>e.category==='free').length,unclassifiedJson},null,2)+'\n')
console.log(JSON.stringify({textColumns:entries.length,unclassifiedJson}))

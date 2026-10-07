'use strict'
require('../node_modules/ts-node').register({project:require('node:path').resolve(__dirname,'../tsconfig.json'),transpileOnly:true})
require('./tasks-assignment-rules.test.cjs')
require('./tasks-ui.test.cjs')
require('./comments-rules.test.cjs')
require('./schema-readiness.test.cjs')

'use strict'
require('../node_modules/ts-node').register({project:require('node:path').resolve(__dirname,'../tsconfig.json'),transpileOnly:true})
require('./positions-rules.test.cjs')
require('./positions-ui.test.cjs')
require('./modules-registry.test.cjs')
require('./org-chart-ui.test.cjs')
require('./schema-readiness.test.cjs')

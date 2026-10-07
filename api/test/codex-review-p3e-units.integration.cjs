'use strict'
for(const name of ['totp','user-sessions','session-cookie','announcements','document-expiry','team-dashboard','report-metrics','saved-reports','mobile-shell-ui','pwa-ui']) require('./'+name+'.test.cjs')

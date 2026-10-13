'use strict';
require('./codex-review-p8b-local-preload.cjs');
// A PDF-only child browser uses pipes: no DevTools listener or network connection.
// Product PDF rendering, authorization and file content stay unchanged.
const puppeteer = require('../node_modules/puppeteer');
const object = puppeteer.default || puppeteer, launch = object.launch.bind(object);
object.launch = async options => {
  try {
    return await launch({ ...options, pipe: true, args: [...(options.args || []), '--disable-background-networking', '--disable-component-update', '--disable-domain-reliability', '--host-resolver-rules=MAP * ~NOTFOUND', '--proxy-server=http://127.0.0.1:9', '--proxy-bypass-list=<-loopback>'] });
  } catch (error) { console.log('REVIEW_PROGRESS PDF launch failure ' + error.message); throw error; }
};
const { ReportPdfRenderer } = require('../src/reports/report-pdf.renderer');
const pdf = ReportPdfRenderer.prototype.pdf;
ReportPdfRenderer.prototype.pdf = async function(...args) { try { return await pdf.apply(this, args); } catch (error) { console.log('REVIEW_PROGRESS PDF render failure ' + error.message); throw error; } };

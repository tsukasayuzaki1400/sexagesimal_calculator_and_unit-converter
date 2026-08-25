/* Bundle engine.js + ui.js into the single shareable HTML file. */
'use strict';
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const tpl = fs.readFileSync(path.join(dir, 'template.html'), 'utf8');
const eng = fs.readFileSync(path.join(dir, 'engine.js'), 'utf8');
const ui = fs.readFileSync(path.join(dir, 'ui.js'), 'utf8');

const out = tpl
  .replace('//__ENGINE__', () => eng)
  .replace('//__UI__', () => ui);

const dest = path.join(dir, 'SexagesimalCalculator.html');
fs.writeFileSync(dest, out);
console.log('Wrote ' + dest + ' (' + (out.length / 1024).toFixed(1) + ' KB)');

/* Headless smoke test: drives ui.js keyboard flow through a tiny DOM shim. */
'use strict';

function makeEl(id) {
  return {
    id: id,
    innerHTML: '',
    textContent: '',
    hidden: false,
    title: '',
    className: '',
    style: {},
    children: [],
    listeners: {},
    classSet: new Set(),
    classList: {
      toggle: function (c, force) {
        const on = force === undefined ? !this._s.has(c) : !!force;
        this._s[on ? 'add' : 'delete'](c);
        return on;
      },
      add: function (c) { this._s.add(c); },
      remove: function (c) { this._s.delete(c); },
      contains: function (c) { return this._s.has(c); },
      _s: null
    },
    appendChild(child) { this.children.push(child); return child; },
    addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); },
    getAttribute() { return null; },
    setAttribute(k, v) { this['attr_' + k] = v; }
  };
}
// wire classList._s
const _origMake = makeEl;
makeEl = function (id) {
  const el = _origMake(id);
  el.classList._s = el.classSet;
  return el;
};

const registry = {};
['expr', 'cuneiEcho', 'result', 'brandMark', 'digitPad', 'sciPad', 'opPad',
  'eqBtn', 'angleBtn', 'styleBtn', 'clearHist', 'helpBtn', 'helpClose',
  'helpOverlay', 'history', 'histEmpty',
  'calcView', 'convertView', 'tabCalc', 'tabConvert', 'convCats', 'convAmtDisp', 'convAmtDec',
  'convRadix', 'convDel', 'convClr', 'padZone',
  'convFrom', 'convTo', 'convSwap', 'convOut', 'convCunei', 'convRateNote',
  'themeBtn', 'copyBtn', 'convCopy'
].forEach(id => { registry[id] = makeEl(id); });
registry.helpOverlay.hidden = true; // mirrors the HTML attribute
registry.convertView.hidden = true;

global.document = {
  readyState: 'complete',
  getElementById: id => registry[id] || (registry[id] = makeEl(id)),
  createElement: tag => makeEl('<' + tag + '>'),
  addEventListener() {}
};
global.window = global;
global.window.listeners = {};
global.window.addEventListener = function (type, fn) {
  (window.listeners[type] = window.listeners[type] || []).push(fn);
};

// browser-ish globals for the currency cache layer
let storeData = {
  // fiat rates fetched 1 hour ago (well inside the 6 h TTL)
  'sexconv.rates.v1': JSON.stringify({
    fetchedAt: Date.now() - 3600e3,
    rates: { USD: 1, EUR: 0.9, GBP: 0.8, JPY: 150, IRR: 1465128.141251 }
  }),
  // crypto prices fetched 30 minutes ago
  'sexconv.crypto.v1': JSON.stringify({
    fetchedAt: Date.now() - 1800e3,
    rates: { BTC: 64000, ETH: 3000, SOL: 150 }
  }),
  // stock prices fetched 30 minutes ago
  'sexconv.stocks.v1': JSON.stringify({
    fetchedAt: Date.now() - 1800e3,
    rates: { AAPL: 310.34, MSFT: 500, NVDA: 180 }
  })
};
global.localStorage = {
  getItem: k => (k in storeData ? storeData[k] : null),
  setItem: (k, v) => { storeData[k] = String(v); },
  removeItem: k => { delete storeData[k]; }
};
let clipText = null;
function clipGet() { return clipText; }
try {
  Object.defineProperty(global, 'navigator', {
    value: {
      onLine: true,
      clipboard: {
        writeText: t => { clipText = t; return Promise.resolve(); }
      }
    },
    configurable: true
  });
} catch (err) { /* navigator not overridable: ui guards handle it */ }
let fetchCalls = 0;
global.fetch = function () {
  fetchCalls++;
  return new Promise(() => {}); // never resolves: any fetch attempt is observable
};

global.SexagesimalEngine = require('./engine.js'); // same global the app's engine script sets
require('./ui.js');

let failures = 0;
function expect(name, cond) {
  console.log((cond ? '  ok  ' : 'FAIL  ') + name);
  if (!cond) failures++;
}

function typeKeys(str) {
  for (const k of str) keydown(k);
}
function keydown(key) {
  window.listeners.keydown.forEach(fn =>
    fn({ key: key, ctrlKey: false, metaKey: false, altKey: false, preventDefault() {} }));
}

// initial render state
expect('expr shows empty placeholder class', registry.expr.classList.contains('empty'));

// 1;30 + 2;45 =
typeKeys('1');
keydown(';');
typeKeys('30');
expect('echo rendered for 1;30', registry.cuneiEcho.innerHTML.includes('<svg'));
keydown('+');
expect('echo shows full equation with operator', registry.cuneiEcho.innerHTML.includes('opglyph') &&
  registry.cuneiEcho.innerHTML.includes('<svg'));
typeKeys('2');
keydown(';');
typeKeys('45');
keydown('Enter');
expect('result 4.25 shown in decimal', registry.result.innerHTML.includes('4.25'));
expect('expr now holds decimal answer', registry.expr.textContent === '4.25');
expect('history has 1 entry', registry.history.children.length === 1);
expect('cuneiform of answer still rendered', registry.cuneiEcho.innerHTML.includes('<svg'));

// copy button copies the displayed answer
registry.copyBtn.listeners.click[0]();
expect('copy button put 4.25 on clipboard', clipGet() === '4.25');

// continue from answer: ×2 =
keydown('*');
typeKeys('2');
keydown('Enter');
expect('ans chaining 4.25*2 -> 8.5', registry.result.innerHTML.includes('8.5'));

// error path: 1/0
keydown('Escape');
typeKeys('1/0'); // '/' becomes ÷ via mapping
keydown('Enter');
expect('division by zero shows error', registry.result.classList.contains('err'));
expect('error message text present', registry.result.innerHTML.includes('Undefined or infinite'));

// DMS typing: 12°34'56" * 2
keydown('Escape');
for (const k of "12\u00B034'56\"*2") keydown(k);
keydown('Enter');
expect('DMS expression evaluates (~25.16 decimal)', registry.result.innerHTML.includes('25.16'));

// style cycle updates result notation: dec -> semi -> dms -> hms -> dec
registry.styleBtn.listeners.click[0]();
expect('cycle 1: sexagesimal label', registry.styleBtn.textContent === '1;34');
expect('sexagesimal result rendered', registry.result.innerHTML.includes(';'));
registry.styleBtn.listeners.click[0]();
expect('cycle 2: dms label', registry.styleBtn.textContent === '\u00B0\u2032\u2033');
expect('dms result rendered', registry.result.innerHTML.includes('\u00B0'));
registry.styleBtn.listeners.click[0]();
registry.styleBtn.listeners.click[0]();
expect('cycle back to decimal', registry.styleBtn.textContent === '94');

// deg/rad toggle
registry.angleBtn.listeners.click[0].call(registry.angleBtn);
expect('angle toggled to RAD', registry.angleBtn.textContent === 'RAD');

// trig in rad: sin(pi/6) = 0.5
keydown('Escape');
typeKeys('sin(pi/6)');
keydown('Enter');
expect('sin(pi/6)=0.5 in rad mode', registry.result.innerHTML.includes('0.5'));

// factorial + implicit mult
keydown('Escape');
typeKeys('5!2');
keydown('Enter');
expect('5!·2 = 240 in decimal', registry.result.innerHTML.includes('240'));

// backspace removes last place group
keydown('Escape');
typeKeys('1');
keydown(';');
typeKeys('30,50');
expect('entry echo exists', registry.cuneiEcho.innerHTML !== '');
keydown('Backspace');
expect('backspace removed ",50"', registry.expr.textContent === '1;30');
keydown('Backspace');
keydown('Backspace');
keydown('Backspace');
expect('backspace empties entry', registry.expr.textContent === '');

// copy mirrors whatever result is currently displayed
const shown = (registry.result.innerHTML.match(/res-ok">([^<]*)</) || [])[1];
registry.copyBtn.listeners.click[0]();
expect('copy mirrors the displayed result', !!shown && clipGet() === shown);

// history insert via click on first item
keydown('Escape');
typeKeys('2;30');
keydown('Enter');
registry.history.children[0].listeners.click[0]();
expect('history click inserted decimal value', /^2\.5/.test(registry.expr.textContent));

// ---------- unit converter ----------
registry.tabConvert.listeners.click[0]();
expect('convert opens on Crypto', registry.convFrom.value === 'BTC' && registry.convTo.value === 'USD');
expect('crypto pill first', registry.convCats.innerHTML.indexOf('>Crypto</button>') < registry.convCats.innerHTML.indexOf('>Stocks</button>'));
pickCat('length');
expect('rail hidden in convert mode', registry.padZone.classList.contains('conv'));

function tapPad(v) {
  registry.digitPad.listeners.click[0]({
    target: { closest: function () {
      return { getAttribute: function (k) { return k === 'data-v' ? String(v) : null; } };
    } }
  });
}

tapPad(5);
expect('pad tap enters amount 5', registry.convAmtDisp.textContent === '5');
expect('5 km -> mi decimal result', registry.convOut.innerHTML.includes('3.10685'));
tapPad(1);
expect('second tap dials next place: 5,1', registry.convAmtDisp.textContent === '5,1');
expect('decimal echo shows = 301', registry.convAmtDec.textContent === '= 301');
expect('5,1 km (= 301) -> mi result', registry.convOut.innerHTML.includes('187.03'));

registry.convRadix.listeners.click[0]();
tapPad(30);
expect('radix then 30 -> 5,1;30 = 301.5', registry.convAmtDec.textContent === '= 301.5');
registry.convDel.listeners.click[0]();
registry.convDel.listeners.click[0]();
registry.convDel.listeners.click[0]();
expect('backspace strips to 5,1', registry.convAmtDisp.textContent === '5,1');
registry.convClr.listeners.click[0]();
expect('C clears amount', registry.convAmtDisp.textContent === '0');

function pickCat(catName) {
  registry.convCats.listeners.click[0]({
    target: { closest: function () {
      return { getAttribute: function (k) { return k === 'data-cat' ? catName : null; } };
    } }
  });
}

pickCat('data');
expect('data defaults GB -> MB', registry.convFrom.value === 'GB' && registry.convTo.value === 'MB');
tapPad(1);
expect('1 GB -> 1000 MB', registry.convOut.innerHTML.includes('1000'));

pickCat('energy');
expect('energy defaults kcal -> kJ', registry.convFrom.value === 'kcal' && registry.convTo.value === 'kJ');
tapPad(2);
tapPad(0);
expect('2,0 (= 120) kcal -> 502.08 kJ', registry.convOut.innerHTML.includes('502.08'));

// currency: cached rates, no fetch spam
const callsBeforeCurrency = fetchCalls;
pickCat('currency');
expect('currency pill is labeled Currency', registry.convCats.innerHTML.includes('>Currency</button>'));
expect('currency defaults USD -> EUR', registry.convFrom.value === 'USD' && registry.convTo.value === 'EUR');
expect('fresh cache: no fetch fired', fetchCalls === callsBeforeCurrency);
tapPad(1);
expect('1 USD -> 0.9 EUR from cache', registry.convOut.innerHTML.startsWith('0.9 '));
registry.convCopy.listeners.click[0]();
expect('converter copy includes value and unit', clipGet() === '0.9 euro (EUR)');
expect('rate note says cached', registry.convRateNote.textContent.includes('cached'));

registry.convTo.value = 'GBP';
registry.convTo.listeners.change[0].call(registry.convTo);
expect('changing To select to GBP converts 1 USD -> 0.8 GBP', registry.convOut.innerHTML.startsWith('0.8 '));
expect('result label follows the new unit', registry.convOut.innerHTML.includes('British pound'));
registry.convSwap.listeners.click[0]();
expect('swap GBP -> USD gives 1.25', registry.convOut.innerHTML.startsWith('1.25'));

// crypto tab: cached prices, coin -> USD / fiat
const callsBeforeCrypto = fetchCalls;
pickCat('crypto');
expect('crypto pill labeled Crypto', registry.convCats.innerHTML.includes('>Crypto</button>'));
expect('crypto defaults BTC -> USD', registry.convFrom.value === 'BTC' && registry.convTo.value === 'USD');
expect('fresh caches: no fetch fired for crypto', fetchCalls === callsBeforeCrypto);
tapPad(1);
expect('1 BTC -> 64000 USD from cache', registry.convOut.innerHTML.startsWith('64000'));
expect('note says crypto cached', registry.convRateNote.textContent.includes('crypto prices'));

registry.convSwap.listeners.click[0]();
expect('swap USD -> BTC shows tiny amount', registry.convOut.innerHTML.startsWith('0.000015625'));

registry.convFrom.value = 'ETH';
registry.convFrom.listeners.change[0].call(registry.convFrom);
registry.convTo.value = 'EUR';
registry.convTo.listeners.change[0].call(registry.convTo);
expect('1 ETH -> 2700 EUR cross-route', registry.convOut.innerHTML.startsWith('2700'));

// stocks tab: cached prices, share -> USD / fiat
const callsBeforeStocks = fetchCalls;
pickCat('stocks');
expect('stocks pill labeled Stocks', registry.convCats.innerHTML.includes('>Stocks</button>'));
expect('stocks defaults AAPL -> USD', registry.convFrom.value === 'AAPL' && registry.convTo.value === 'USD');
expect('fresh caches: no fetch fired for stocks', fetchCalls === callsBeforeStocks);
tapPad(1);
expect('1 AAPL -> 310.34 USD from cache', registry.convOut.innerHTML.startsWith('310.34'));
expect('note says stock prices cached', registry.convRateNote.textContent.includes('stock prices'));

registry.convSwap.listeners.click[0]();
expect('swap USD -> AAPL shows tiny amount', registry.convOut.innerHTML.startsWith('0.00322'));

registry.convFrom.value = 'MSFT';
registry.convFrom.listeners.change[0].call(registry.convFrom);
registry.convTo.value = 'EUR';
registry.convTo.listeners.change[0].call(registry.convTo);
expect('1 MSFT -> 450 EUR cross-route', registry.convOut.innerHTML.startsWith('450'));

// choosing an uncached ticker fires exactly one on-demand fetch
const beforeTsla = fetchCalls;
registry.convFrom.value = 'TSLA';
registry.convFrom.listeners.change[0].call(registry.convFrom);
expect('all 25 tickers listed', (registry.convFrom.innerHTML.match(/<option/g) || []).length === 25);
expect('tickers alphabetical', registry.convFrom.innerHTML.indexOf('Alphabet') < registry.convFrom.innerHTML.indexOf('Apple') &&
  registry.convFrom.innerHTML.indexOf('Apple') < registry.convFrom.innerHTML.indexOf('Tesla'));
expect('uncached TSLA fires exactly 1 fetch', fetchCalls === beforeTsla + 1);
expect('note says fetching the price of TSLA', registry.convRateNote.textContent.includes('fetching the price of TSLA'));
expect('result shows loading message', /loading the price of TSLA/i.test(registry.convOut.innerHTML));

pickCat('temperature');

pickCat('temperature');
expect('temp defaults c -> f', registry.convFrom.value === 'c' && registry.convTo.value === 'f');
tapPad(1);
tapPad(40);
expect('1,40 = 100 C -> 212 F via pad', registry.convOut.innerHTML.includes('212'));
registry.convSwap.listeners.click[0]();
expect('swap gives 100 F -> 37.7… C', registry.convOut.innerHTML.includes('37.77'));

const exprBeforeInputGuard = registry.expr.textContent;
window.listeners.keydown.forEach(fn => fn({ key: '7', ctrlKey: false, metaKey: false, altKey: false,
  target: { tagName: 'SELECT' }, preventDefault() {} }));
expect('select keystrokes ignored by calculator', registry.expr.textContent === exprBeforeInputGuard);

registry.tabCalc.listeners.click[0]();
expect('back to calculator view', registry.calcView.hidden === false && registry.convertView.hidden === true);
expect('rail restored in calc mode', !registry.padZone.classList.contains('conv'));

// theme toggle
expect('theme starts dark (sun shown)', registry.themeBtn.textContent === '\u2600');
registry.themeBtn.listeners.click[0]();
expect('light mode shows moon', registry.themeBtn.textContent === '\u263D');
expect('preference persisted', storeData['sexconv.theme'] === 'light');
registry.themeBtn.listeners.click[0]();
expect('back to dark', registry.themeBtn.textContent === '\u2600');

// help overlay open/close via Escape
registry.helpBtn.listeners.click[0]();
expect('help opened', registry.helpOverlay.hidden === false);
keydown('Escape');
expect('help closed by Esc', registry.helpOverlay.hidden === true);

// price categories show long plain decimals (up to 32 places, no exponent)
registry.tabConvert.listeners.click[0]();
pickCat('currency');
registry.convTo.value = 'IRR';
registry.convTo.listeners.change[0].call(registry.convTo);
tapPad(1);
expect('USD -> IRR full digits', registry.convOut.innerHTML.startsWith('1465128.141251'));
expect('no exponent in money output', !/[eE][+-]\d/.test(registry.convOut.innerHTML));
pickCat('crypto');
registry.convSwap.listeners.click[0]();
tapPad(1);
expect('tiny BTC amount shows many decimals', registry.convOut.innerHTML.startsWith('0.000015625'));

// ---------- new calculator keys: nCr nPr % 1/x x2 x3 mod abs ----------
function tapSci(label) {
  var b = registry.sciPad.children.find(function (c) { return c.textContent === label; });
  if (b) b.listeners.click[0]();
}
function pressOpPad(label) {
  var b = registry.opPad.children.find(function (c) { return c.textContent === label; });
  if (b) b.listeners.click[0]();
}

function resIs(v) {
  var m = registry.result.innerHTML.match(/res-(?:ok|err)">([^<]*)</);
  return m && m[1] === v;
}

registry.tabCalc.listeners.click[0]();

pressOpPad('C'); tapPad(5); tapSci('nCr'); tapPad(2); keydown('Enter');
expect('5 nCr 2 = 10', resIs('10'));

pressOpPad('C'); tapPad(5); tapSci('nPr'); tapPad(2); keydown('Enter');
expect('5 nPr 2 = 20', resIs('20'));

pressOpPad('C'); tapPad(7); tapSci('mod'); tapPad(3); keydown('Enter');
expect('7 mod 3 = 1', resIs('1'));

pressOpPad('C'); tapPad(9); tapSci('x\u00B2'); keydown('Enter');
expect('x2 wraps: 9^2 = 81', resIs('81'));

pressOpPad('C'); tapPad(2); tapSci('x\u00B3'); keydown('Enter');
expect('x3 wraps: 2^3 = 8', resIs('8'));

pressOpPad('C'); tapPad(4); tapSci('1/x'); keydown('Enter');
expect('1/x gives 0.25', resIs('0.25'));

pressOpPad('C'); tapPad(5); tapSci('%'); keydown('Enter');
expect('50% = 0.05 via key', resIs('0.05'));

// pad dials one base-60 digit per tap: -2;4,5 = -(2 + 4/60 + 5/3600)
pressOpPad('C'); tapSci('abs'); pressOpPad('\u2212'); tapPad(2); pressOpPad(';');
tapPad(4); tapPad(5); pressOpPad(')'); keydown('Enter');
expect('abs(-2;4,5) = 2.0680…', resIs('2.06805555555556'));

pressOpPad('C'); typeKeys('3'); keydown('+'); typeKeys('4'); tapSci('x\u00B2');
expect('x2 wraps whole expression', registry.expr.textContent === '(3+4)^2');
keydown('Enter');
expect('(3+4)^2 = 49 whole-expression wrap', resIs('49'));

console.log('\n' + (failures ? failures + ' FAILURES' : 'all smoke checks passed'));
process.exit(failures ? 1 : 0);

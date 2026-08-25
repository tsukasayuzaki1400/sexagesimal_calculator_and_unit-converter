/* Sexagesimal engine: parsing, formatting, evaluation, cuneiform glyph SVG.
   UMD-ish so it runs in Node (tests) and the browser (app). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SexagesimalEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class CalcError extends Error {
    constructor(msg) { super(msg); this.name = 'CalcError'; }
  }

  /* ---------------- literal parsing ---------------- */

  function splitGroups(part) {
    if (part === '') return [];
    const out = [];
    for (const g of part.split(',')) {
      if (!/^\d+$/.test(g)) throw new CalcError('Bad place value "' + g + '"');
      out.push(parseInt(g, 10));
    }
    return out;
  }

  function groupsToValue(groups /* written order: most -> least significant */) {
    let v = 0;
    for (const g of groups) {
      if (g > 59) throw new CalcError('Place value ' + g + ' out of range (0-59)');
      v = v * 60 + g;
    }
    return v;
  }

  // Accepts: "1;30,25"  ";30"  "1,30,25"  "12°34'56\""  "3h25m10s"  "12d34m56s"  "1.5075"
  function parseLiteral(raw) {
    const s = String(raw).trim().replace(/\s+/g, '');
    if (!s) throw new CalcError('Empty number');

    const dms = s.match(/^(\d+(?:\.\d+)?)(?:\u00B0|[dh])(?:(\d+(?:\.\d+)?)(?:['\u2032]|m))?(?:(\d+(?:\.\d+)?)?(?:["\u2033]|s))?$/);
    if (dms && (dms[2] !== undefined || dms[3] !== undefined || /[°dh]/.test(s))) {
      const a = parseFloat(dms[1]);
      const b = dms[2] !== undefined ? parseFloat(dms[2]) : 0;
      const c = dms[3] !== undefined ? parseFloat(dms[3]) : 0;
      return a + b / 60 + c / 3600;
    }

    if (/[,;]/.test(s)) {
      if (s.includes('.')) throw new CalcError('Do not mix "." with sexagesimal separators');
      const halves = s.split(';');
      if (halves.length > 2) throw new CalcError('Only one ";" allowed');
      const intG = splitGroups(halves[0]);
      const fracG = halves.length === 2 ? splitGroups(halves[1]) : [];
      let v = groupsToValue(intG);
      let sc = 1 / 60;
      for (const g of fracG) {
        if (g > 59) throw new CalcError('Place value ' + g + ' out of range (0-59)');
        v += g * sc;
        sc /= 60;
      }
      return v;
    }

    const v = Number(s);
    if (!isFinite(v)) throw new CalcError('Bad number "' + raw + '"');
    return v;
  }

  /* ---------------- formatting ---------------- */

  function effectiveFracPlaces(ax, wanted) {
    const lim = Math.floor(
      (Math.log2(Number.MAX_SAFE_INTEGER) - Math.log2(Math.max(ax, 1e-9))) / Math.log2(60)
    );
    return Math.max(0, Math.min(wanted, lim));
  }

  // Convert to {neg, int:[places], frac:[places]} with FP-noise snapping.
  function toPlaces(x, fracPlaces) {
    const wantFrac = fracPlaces === undefined ? 8 : fracPlaces;
    if (typeof x !== 'number' || !isFinite(x)) throw new CalcError('Result is not finite');
    const neg = x < 0;
    const ax = Math.abs(x);
    const useFrac = effectiveFracPlaces(ax, wantFrac);
    const scaled = Math.round(ax * Math.pow(60, useFrac));
    const digits = []; // least -> most significant
    let m = scaled;
    for (let i = 0; i < useFrac; i++) { digits.push(m % 60); m = Math.floor(m / 60); }
    do { digits.push(m % 60); m = Math.floor(m / 60); } while (m > 0);
    const intP = digits.slice(useFrac).reverse();
    const fracP = digits.slice(0, useFrac).reverse();
    while (fracP.length && fracP[fracP.length - 1] === 0) fracP.pop();
    return { neg: neg, int: intP, frac: fracP };
  }

  function placesToString(p, style) {
    style = style || 'semi';
    const sign = p.neg ? '-' : '';
    if (style === 'semi') {
      let out = p.int.join(',');
      if (p.frac.length) out += ';' + p.frac.join(',');
      if (out === '') out = '0';
      return sign + out;
    }
    const marks = style === 'hms' ? ['h', 'm', 's'] : ['\u00B0', '\u2032', '\u2033'];
    let h = 0;
    for (const g of p.int) h = h * 60 + g; // all integer places are hours
    let mn = p.frac.length > 0 ? p.frac[0] : 0;
    let sec = p.frac.length > 1 ? p.frac[1] : 0;
    for (let i = 2; i < p.frac.length; i++) sec += p.frac[i] / Math.pow(60, i - 1);
    sec = Math.round(sec * 1e9) / 1e9;
    let carryH = 0;
    if (sec >= 59.999999999) { sec = 0; mn += 1; }
    if (mn >= 60) { carryH = Math.floor(mn / 60); mn = mn % 60; }
    const secTxt = Number.isInteger(sec) ? String(sec) : String(parseFloat(sec.toFixed(9)));
    return sign + (h + carryH) + marks[0] + mn + marks[1] + secTxt + marks[2];
  }

  function formatValue(x, fracPlaces, style) {
    return placesToString(toPlaces(x, fracPlaces), style);
  }

  /* ---------------- cuneiform glyph SVG ---------------- */

  var GLYPHS = {};

  function unitWedge(cx, y) {
    return '<path d="M' + (cx - 5) + ',' + (y + 7) + ' L' + (cx + 5) + ',' + (y + 7) +
      ' L' + cx + ',' + (y + 16) + ' Z" fill="currentColor"/>' +
      '<rect x="' + (cx - 1.4) + '" y="' + y + '" width="2.8" height="8" fill="currentColor"/>';
  }

  function tenWedge(cx, cy) {
    return '<path d="M' + (cx + 6) + ',' + (cy - 7.5) + ' L' + (cx - 6) + ',' + cy +
      ' L' + (cx + 6) + ',' + (cy + 7.5) + '" fill="none" stroke="currentColor"' +
      ' stroke-width="3.6" stroke-linejoin="round" stroke-linecap="round"/>';
  }

  function phWedge(cx, cy) {
    return '<g transform="translate(' + cx + ',' + cy + ') rotate(-40)">' +
      '<path d="M-4.5,3 L4.5,3 L0,11 Z" fill="currentColor"/>' +
      '<rect x="-1.3" y="-7" width="2.6" height="10" fill="currentColor"/></g>';
  }

  // n: 0..59. 0 renders as the Babylonian empty-place placeholder.
  function glyphSVG(n) {
    if (GLYPHS[n]) return GLYPHS[n];
    let body = '';
    if (n === 0) {
      body = phWedge(15, 34) + phWedge(29, 44);
    } else {
      const tens = Math.floor(n / 10);
      const units = n % 10;
      const tGap = 13.5;
      const tX0 = 22 - ((tens - 1) * tGap) / 2;
      for (let i = 0; i < tens; i++) body += tenWedge(tX0 + i * tGap, 13);
      const rows = [];
      let rem = units;
      while (rem > 0) { const c = Math.min(3, rem); rows.push(c); rem -= c; }
      const rowH = 17.5;
      const uTop0 = 26 + ((3 - rows.length) * rowH) / 2;
      rows.forEach(function (cnt, r) {
        const cGap = 12.5;
        const cx0 = 22 - ((cnt - 1) * cGap) / 2;
        for (let c = 0; c < cnt; c++) body += unitWedge(cx0 + c * cGap, uTop0 + r * rowH);
      });
    }
    const svg = '<svg viewBox="0 0 44 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + body + '</svg>';
    GLYPHS[n] = svg;
    return svg;
  }

  /* Authentic Unicode cuneiform numeral text.
     Units 1-9: the precomposed NUMBER n ASH signs (one ASH lives in the main block).
     Tens: repetitions of the "U" winkelhaken sign U+1230B, glossed "TEN" in Unicode. */
  var TEXT_UNITS = { 1: '\u{12038}' };
  for (var tu = 2; tu <= 9; tu++) TEXT_UNITS[tu] = String.fromCodePoint(0x12400 + tu - 2);
  var TEXT_TEN = '\u{1230B}';

  function glyphText(n) {
    n = Number(n);
    if (!(n >= 0 && n <= 59 && Math.floor(n) === n)) throw new CalcError('Digit out of range (0-59)');
    if (n === 0) return ''; // placeholder is drawn separately
    var t = Math.floor(n / 10);
    var u = n % 10;
    var s = '';
    while (t-- > 0) s += TEXT_TEN;
    if (u > 0) s += TEXT_UNITS[u];
    return s;
  }

  /* ---------------- expression tokenizer ---------------- */

  var FUNCS1 = { sin: 1, cos: 1, tan: 1, asin: 1, acos: 1, atan: 1, sqrt: 1, log: 1, ln: 1, exp: 1, abs: 1 };
  var ALIAS = { arcsin: 'asin', arccos: 'acos', arctan: 'atan', root: 'sqrt' };
  var CONSTS = { pi: Math.PI, e: Math.E };

  function normalize(src) {
    return src
      .replace(/[\u00D7\u2715]/g, '*')
      .replace(/[\u00F7\u2215]/g, '/')
      .replace(/[\u2013\u2014\u2212]/g, '-')
      .replace(/\u221A/g, 'sqrt')
      .replace(/\u03C0/g, 'pi')
      .replace(/\u00B7/g, '*');
  }

  function tokenize(src) {
    const s = normalize(String(src));
    const toks = [];
    let i = 0;
    let m;
    while (i < s.length) {
      const ch = s[i];
      if (ch === ' ' || ch === '\t') { i++; continue; }
      const rest = s.slice(i);

      // DMS / HMS literals
      m = rest.match(/^\d+(?:\.\d+)?(?:\u00B0|[dh])(?:(?:\d+(?:\.\d+)?)(?:['\u2032]|m))?(?:(?:\d+(?:\.\d+)?)(?:["\u2033]|s))?/);
      if (m && /[\u00B0dh](?:\d|$)/.test(m[0].replace(/^\d+(?:\.\d+)?/, ''))) {
        toks.push({ t: 'num', v: parseLiteral(m[0]) });
        i += m[0].length;
        continue;
      }

      // decimals
      m = rest.match(/^\d*\.\d+/);
      if (m) {
        toks.push({ t: 'num', v: parseLiteral(m[0]) });
        i += m[0].length;
        continue;
      }

      // sexagesimal (groups + optional radix)
      m = rest.match(/^\d[\d,]*(?:;\d[\d,]*)?|^;\d[\d,]*/);
      if (m) {
        const lit = m[0].replace(/[,;]+$/, '');
        toks.push({ t: 'num', v: parseLiteral(lit) });
        i += m[0].length;
        continue;
      }

      // bare integers
      m = rest.match(/^\d+/);
      if (m) {
        toks.push({ t: 'num', v: parseInt(m[0], 10) });
        i += m[0].length;
        continue;
      }

      // names
      m = rest.match(/^[a-zA-Z]+/);
      if (m) {
        let name = m[0].toLowerCase();
        name = ALIAS[name] || name;
        if (name === 'mod') { toks.push({ t: 'op', v: 'mod' }); i += m[0].length; continue; }
        if (name === 'ncr' || name === 'npr') { toks.push({ t: 'comb', v: name }); i += m[0].length; continue; }
        if (FUNCS1[name]) { toks.push({ t: 'fn', v: name }); i += m[0].length; continue; }
        if (name in CONSTS || name === 'ans') { toks.push({ t: 'const', v: name }); i += m[0].length; continue; }
        throw new CalcError('Unknown name "' + m[0] + '"');
      }

      if ('+-*/^()!%'.includes(ch)) {
        const t = ch === '(' ? 'lp' : ch === ')' ? 'rp' :
          ch === '!' ? 'bang' : ch === '%' ? 'pct' : 'op';
        toks.push({ t: t, v: ch });
        i++;
        continue;
      }

      throw new CalcError('Unexpected character "' + ch + '"');
    }
    return toks;
  }

  /* ---------------- expression evaluator ---------------- */

  function evaluate(src, opts) {
    opts = opts || {};
    const angle = opts.angle === 'rad' ? 'rad' : 'deg';
    const ans = typeof opts.ans === 'number' && isFinite(opts.ans) ? opts.ans : undefined;

    function toRad(x) { return angle === 'deg' ? x * Math.PI / 180 : x; }
    function fromRad(x) { return angle === 'deg' ? x * 180 / Math.PI : x; }

    function applyFn(name, x) {
      switch (name) {
        case 'sin': return Math.sin(toRad(x));
        case 'cos': return Math.cos(toRad(x));
        case 'tan': return Math.tan(toRad(x));
        case 'asin':
          if (x < -1 || x > 1) throw new CalcError('asin needs input in [-1, 1]');
          return fromRad(Math.asin(x));
        case 'acos':
          if (x < -1 || x > 1) throw new CalcError('acos needs input in [-1, 1]');
          return fromRad(Math.acos(x));
        case 'atan': return fromRad(Math.atan(x));
        case 'sqrt':
          if (x < 0) throw new CalcError('Square root of a negative number');
          return Math.sqrt(x);
        case 'log':
          if (x <= 0) throw new CalcError('log needs a positive input');
          return Math.log10(x);
        case 'ln':
          if (x <= 0) throw new CalcError('ln needs a positive input');
          return Math.log(x);
        case 'exp': return Math.exp(x);
        case 'abs': return Math.abs(x);
        default: throw new CalcError('Unknown function ' + name);
      }
    }

    function factorial(n) {
      if (n < 0 || Math.floor(n) !== n) throw new CalcError('Factorial needs a non-negative integer');
      if (n > 170) throw new CalcError('Factorial too large');
      let r = 1;
      for (let i = 2; i <= n; i++) r *= i;
      return r;
    }

    function combCheck(which, n, k) {
      if (!isFinite(n) || !isFinite(k) || Math.floor(n) !== n || Math.floor(k) !== k || n < 0 || k < 0)
        throw new CalcError(which + ' needs non-negative integers');
    }

    function nCr(n, k) {
      combCheck('nCr', n, k);
      if (k > n) return 0;
      let r = 1;
      for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; // stays integral stepwise
      if (!isFinite(r)) throw new CalcError('nCr result too large');
      return Math.round(r);
    }

    function nPr(n, k) {
      combCheck('nPr', n, k);
      if (k > n) throw new CalcError('nPr needs k \u2264 n');
      let r = 1;
      for (let i = 0; i < k; i++) r *= n - i;
      if (!isFinite(r)) throw new CalcError('nPr result too large');
      return Math.round(r);
    }

    const toks = tokenize(src);
    let pos = 0;
    function peek() { return toks[pos]; }
    function eat() { return toks[pos++]; }
    function expectRp() {
      const t = eat();
      if (!t || t.t !== 'rp') throw new CalcError('Missing ")"');
    }

    function primary() {
      const t = eat();
      if (!t) throw new CalcError('Unexpected end of expression');
      if (t.t === 'num') return t.v;
      if (t.t === 'const') {
        if (t.v === 'ans') {
          if (ans === undefined) throw new CalcError('No previous answer (Ans)');
          return ans;
        }
        return CONSTS[t.v];
      }
      if (t.t === 'lp') { const v = expr(); expectRp(); return v; }
      if (t.t === 'fn') {
        const nt = peek();
        let arg;
        if (nt && nt.t === 'lp') { eat(); arg = expr(); expectRp(); }
        else arg = pow();
        return applyFn(t.v, arg);
      }
      throw new CalcError('Unexpected token in expression');
    }

    function postfix() {
      let v = primary();
      for (;;) {
        const t = peek();
        if (t && t.t === 'bang') { eat(); v = factorial(v); }
        else if (t && t.t === 'pct') { eat(); v = v / 100; }
        else break;
      }
      return v;
    }

    function pow() {
      const t = peek();
      if (t && t.t === 'op' && (t.v === '+' || t.v === '-')) {
        eat();
        const v = pow();
        return t.v === '-' ? -v : v;
      }
      const base = postfix();
      const t2 = peek();
      if (t2 && t2.t === 'op' && t2.v === '^') {
        eat();
        return Math.pow(base, pow());
      }
      return base;
    }

    function startsValue(t) {
      return t && (t.t === 'num' || t.t === 'const' || t.t === 'lp' || t.t === 'fn');
    }

    /* nCr / nPr bind tighter than * and /, looser than ^ and postfix */
    function combTier() {
      let v = pow();
      for (;;) {
        const t = peek();
        if (t && t.t === 'comb') {
          eat();
          const r = pow();
          v = t.v === 'ncr' ? nCr(v, r) : nPr(v, r);
        } else break;
      }
      return v;
    }

    function muldiv() {
      let v = combTier();
      for (;;) {
        const t = peek();
        if (!t) break;
        if (t.t === 'op' && (t.v === '*' || t.v === '/' || t.v === 'mod')) {
          eat();
          const r = combTier();
          if (t.v === '*') v = v * r;
          else if (t.v === '/') v = v / r;
          else v = v % r; // JS remainder semantics
          continue;
        }
        if (startsValue(t)) { v = v * combTier(); continue; } // implicit multiplication: 2pi, (1;2)(3;4)
        break;
      }
      return v;
    }

    function expr() {
      let v = muldiv();
      for (;;) {
        const t = peek();
        if (t && t.t === 'op' && (t.v === '+' || t.v === '-')) {
          eat();
          const r = muldiv();
          v = t.v === '+' ? v + r : v - r;
        } else break;
      }
      return v;
    }

    if (toks.length === 0) throw new CalcError('Empty expression');
    const result = expr();
    if (pos < toks.length) throw new CalcError('Unexpected extra input in expression');
    if (!isFinite(result)) throw new CalcError('Undefined or infinite result (division by zero?)');
    return result;
  }

  /* ---------------- helpers for live UI echo ---------------- */

  function trailingNumber(exprStr) {
    const m = String(exprStr).match(/[\d.,;'’"\u00B0\u2032\u2033dhms]+$/);
    if (!m || !/^[0-9;.]/.test(m[0])) return '';
    return m[0];
  }

  function cleanTail(tail) {
    return tail.replace(/[;,]+$/, '');
  }

  /* ---------------- unit conversion ---------------- */

  /* Linear categories: value in `to` = value * from.factor / to.factor.
     Temperature is special-cased (non-linear). Volume uses metric kitchen
     units: cup = 250 ml, tbsp = 15 ml, tsp = 5 ml. */
  var CONVERT = {
    length: {
      base: 'm',
      units: [
        { id: 'mm', name: 'millimeters', factor: 0.001 },
        { id: 'cm', name: 'centimeters', factor: 0.01 },
        { id: 'm', name: 'meters', factor: 1 },
        { id: 'km', name: 'kilometers', factor: 1000 },
        { id: 'in', name: 'inches', factor: 0.0254 },
        { id: 'ft', name: 'feet', factor: 0.3048 },
        { id: 'yd', name: 'yards', factor: 0.9144 },
        { id: 'mi', name: 'miles', factor: 1609.344 }
      ]
    },
    mass: {
      base: 'kg',
      units: [
        { id: 'mg', name: 'milligrams', factor: 1e-6 },
        { id: 'g', name: 'grams', factor: 0.001 },
        { id: 'kg', name: 'kilograms', factor: 1 },
        { id: 't', name: 'tonnes', factor: 1000 },
        { id: 'oz', name: 'ounces', factor: 0.028349523125 },
        { id: 'lb', name: 'pounds', factor: 0.45359237 },
        { id: 'st', name: 'stone', factor: 6.35029318 }
      ]
    },
    volume: {
      base: 'l',
      units: [
        { id: 'ml', name: 'milliliters', factor: 0.001 },
        { id: 'l', name: 'liters', factor: 1 },
        { id: 'tsp', name: 'teaspoons', factor: 0.005 },
        { id: 'tbsp', name: 'tablespoons', factor: 0.015 },
        { id: 'cup', name: 'cups (250 ml)', factor: 0.25 },
        { id: 'floz', name: 'fluid ounces', factor: 0.0284130625 },
        { id: 'gal', name: 'gallons (US)', factor: 3.785411784 }
      ]
    },
    temperature: {
      base: 'c',
      special: true,
      units: [
        { id: 'c', name: 'Celsius' },
        { id: 'f', name: 'Fahrenheit' },
        { id: 'k', name: 'Kelvin' }
      ]
    },
    time: {
      base: 's',
      units: [
        { id: 's', name: 'seconds', factor: 1 },
        { id: 'min', name: 'minutes', factor: 60 },
        { id: 'h', name: 'hours', factor: 3600 },
        { id: 'day', name: 'days', factor: 86400 },
        { id: 'wk', name: 'weeks', factor: 604800 }
      ]
    },
    speed: {
      base: 'm/s',
      units: [
        { id: 'ms', name: 'meters/second', factor: 1 },
        { id: 'kmh', name: 'km/hour', factor: 1000 / 3600 },
        { id: 'mph', name: 'miles/hour', factor: 1609.344 / 3600 },
        { id: 'kn', name: 'knots', factor: 1852 / 3600 },
        { id: 'fts', name: 'feet/second', factor: 0.3048 }
      ]
    },
    area: {
      base: 'm\u00B2',
      units: [
        { id: 'mm2', name: 'mm\u00B2', factor: 1e-6 },
        { id: 'cm2', name: 'cm\u00B2', factor: 1e-4 },
        { id: 'm2', name: 'm\u00B2', factor: 1 },
        { id: 'a', name: 'ares', factor: 100 },
        { id: 'ha', name: 'hectares', factor: 1e4 },
        { id: 'km2', name: 'km\u00B2', factor: 1e6 },
        { id: 'in2', name: 'in\u00B2', factor: 0.00064516 },
        { id: 'ft2', name: 'ft\u00B2', factor: 0.09290304 },
        { id: 'yd2', name: 'yd\u00B2', factor: 0.83612736 },
        { id: 'ac', name: 'acres', factor: 4046.8564224 },
        { id: 'mi2', name: 'sq miles', factor: 2589988.110336 }
      ]
    },
    data: {
      base: 'byte',
      units: [
        { id: 'bit', name: 'bits', factor: 0.125 },
        { id: 'B', name: 'bytes', factor: 1 },
        { id: 'KB', name: 'KB (1000 B)', factor: 1e3 },
        { id: 'MB', name: 'MB (1000 KB)', factor: 1e6 },
        { id: 'GB', name: 'GB (1000 MB)', factor: 1e9 },
        { id: 'TB', name: 'TB (1000 GB)', factor: 1e12 },
        { id: 'PB', name: 'PB (1000 TB)', factor: 1e15 },
        { id: 'EB', name: 'EB (1000 PB)', factor: 1e18 },
        { id: 'ZB', name: 'ZB (1000 EB)', factor: 1e21 },
        { id: 'YB', name: 'YB (1000 ZB)', factor: 1e24 },
        { id: 'RB', name: 'RB (1000 YB)', factor: 1e27 },
        { id: 'QB', name: 'QB (1000 RB)', factor: 1e30 },
        { id: 'KiB', name: 'KiB (1024 B)', factor: 1024 },
        { id: 'MiB', name: 'MiB (1024 KiB)', factor: 1048576 },
        { id: 'GiB', name: 'GiB (1024 MiB)', factor: 1073741824 },
        { id: 'TiB', name: 'TiB (1024 GiB)', factor: 1099511627776 },
        { id: 'PiB', name: 'PiB (1024 TiB)', factor: 1125899906842624 },
        { id: 'EiB', name: 'EiB (1024 PiB)', factor: 1152921504606846976 },
        { id: 'ZiB', name: 'ZiB (1024 EiB)', factor: 1180591620717411303424 },
        { id: 'YiB', name: 'YiB (1024 ZiB)', factor: 1208925819614629174706176 },
        { id: 'RiB', name: 'RiB (1024 YiB)', factor: 1237940039285380274899124224 },
        { id: 'QiB', name: 'QiB (1024 RiB)', factor: 1267650600228229401496703205376 }
      ]
    },
    energy: {
      base: 'joule',
      units: [
        { id: 'J', name: 'joules', factor: 1 },
        { id: 'kJ', name: 'kilojoules', factor: 1000 },
        { id: 'cal', name: 'calories', factor: 4.184 },
        { id: 'kcal', name: 'food Calories (kcal)', factor: 4184 },
        { id: 'Wh', name: 'watt-hours', factor: 3600 },
        { id: 'kWh', name: 'kilowatt-hours', factor: 3.6e6 },
        { id: 'btu', name: 'BTU', factor: 1055.05585262 }
      ]
    },
    currency: {
      base: 'USD',
      dynamic: true,
      units: []
    },
    crypto: {
      base: 'USD',
      dynamic: true,
      units: []
    },
    stocks: {
      base: 'USD',
      dynamic: true,
      units: []
    }
  };

  /* Live exchange rates (USD-based), injected by the UI layer after fetching
     them from open.er-api.com. The app caches them locally for a few hours
     and falls back to the last known values when offline. */
  var CURRENCY_RATES = null;

  function setCurrencyRates(rates) {
    if (!rates || typeof rates !== 'object' || !rates.USD) {
      throw new CalcError('Invalid currency rates');
    }
    CURRENCY_RATES = rates;
  }

  function currencyRate(code) {
    if (!CURRENCY_RATES) throw new CalcError('No exchange rates loaded');
    var r = CURRENCY_RATES[String(code).toUpperCase()];
    if (!r) throw new CalcError('Unknown currency: ' + code);
    return r;
  }

  /* Crypto prices in USD per 1 coin (BTC, ETH, ...), injected by the UI layer
     after fetching them from the CoinGecko simple-price API. */
  var CRYPTO_RATES = null;

  function setCryptoRates(rates) {
    if (!rates || typeof rates !== 'object' || Object.keys(rates).length === 0) {
      throw new CalcError('Invalid crypto rates');
    }
    CRYPTO_RATES = rates;
  }

  /* Stock prices in USD per 1 share (AAPL, MSFT, ...) from Yahoo Finance. */
  var STOCK_RATES = null;

  function setStockRates(rates) {
    if (!rates || typeof rates !== 'object' || Object.keys(rates).length === 0) {
      throw new CalcError('Invalid stock rates');
    }
    STOCK_RATES = rates;
  }

  /* Price of one unit of `id` (stock ticker, crypto symbol or fiat code) in USD. */
  function unitPriceInUsd(id) {
    id = String(id).toUpperCase();
    if (STOCK_RATES && STOCK_RATES[id]) return STOCK_RATES[id];
    if (CRYPTO_RATES && CRYPTO_RATES[id]) return CRYPTO_RATES[id];
    if (CURRENCY_RATES && CURRENCY_RATES[id]) return 1 / CURRENCY_RATES[id];
    throw new CalcError('No price for ' + id);
  }

  function tempToBase(v, u) { // -> Celsius
    if (u === 'f') return (v - 32) * 5 / 9;
    if (u === 'k') return v - 273.15;
    return v;
  }

  function tempFromBase(c, u) {
    if (u === 'f') return c * 9 / 5 + 32;
    if (u === 'k') return c + 273.15;
    return c;
  }

  function findUnit(cat, id) {
    var cat_ = CONVERT[cat];
    for (var i = 0; i < cat_.units.length; i++) {
      if (cat_.units[i].id === id) return cat_.units[i];
    }
    throw new CalcError('Unknown unit: ' + id);
  }

  function convertUnits(value, fromId, toId, cat) {
    var x = Number(value);
    if (!isFinite(x)) throw new CalcError('Enter a valid number');
    if (cat === 'currency') {
      // rates are quoted per 1 USD: multiply by target rate, divide by source
      return x * currencyRate(toId) / currencyRate(fromId);
    }
    if (cat === 'crypto' || cat === 'stocks') {
      // prices are quoted in USD per coin/share; fiat codes route via currency rates
      return x * unitPriceInUsd(fromId) / unitPriceInUsd(toId);
    }
    var u1 = findUnit(cat, fromId), u2 = findUnit(cat, toId);
    if (CONVERT[cat].special) {
      if ((fromId === 'k' || toId === 'k')) {
        var c = tempToBase(x, fromId);
        if (c < -273.15) throw new CalcError('Below absolute zero');
      }
      return tempFromBase(tempToBase(x, u1.id), u2.id);
    }
    return x * u1.factor / u2.factor;
  }

  return {
    CalcError: CalcError,
    parseLiteral: parseLiteral,
    toPlaces: toPlaces,
    placesToString: placesToString,
    formatValue: formatValue,
    glyphSVG: glyphSVG,
    glyphText: glyphText,
    tokenize: tokenize,
    evaluate: evaluate,
    trailingNumber: trailingNumber,
    cleanTail: cleanTail,
    CONSTS: CONSTS,
    CONVERT: CONVERT,
    convertUnits: convertUnits,
    setCurrencyRates: setCurrencyRates,
    setCryptoRates: setCryptoRates,
    setStockRates: setStockRates
  };
});

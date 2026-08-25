'use strict';
const E = require('./engine.js');
const assert = require('assert');

let pass = 0, fail = 0;
function ok(name, fn) {
  try { fn(); pass++; console.log('  ok  ' + name); }
  catch (e) { fail++; console.log('FAIL  ' + name + '\n      ' + e.message); }
}
function approx(a, b, eps) {
  const e = eps === undefined ? 1e-9 : eps;
  assert.ok(Math.abs(a - b) <= e, 'expected ~' + b + ', got ' + a);
}
function throws(name, fn) {
  assert.throws(fn, function (err) { return err.name === 'CalcError'; });
}

/* ---------- literal parsing ---------- */
ok('parse 1;30', () => approx(E.parseLiteral('1;30'), 1.5));
ok('parse ;30', () => approx(E.parseLiteral(';30'), 0.5));
ok('parse 1;30,25', () => approx(E.parseLiteral('1;30,25'), 1 + 30 / 60 + 25 / 3600));
ok('parse 1,30,25 = integer places (radix at right)', () =>
  approx(E.parseLiteral('1,30,25'), 1 * 3600 + 30 * 60 + 25));
ok('parse 12°34\'56"', () => approx(E.parseLiteral("12\u00B034'56\""), 12 + 34 / 60 + 56 / 3600));
ok('parse 3h25m10s', () => approx(E.parseLiteral('3h25m10s'), 3 + 25 / 60 + 10 / 3600));
ok('parse 1.5075 decimal', () => approx(E.parseLiteral('1.5075'), 1.5075));
ok('parse bare int', () => approx(E.parseLiteral('59'), 59));
ok('reject place 75', () => throws('', () => E.parseLiteral('1,75')));
ok('reject double radix', () => throws('', () => E.parseLiteral('1;;2')));
ok('reject mixed . ;', () => throws('', () => E.parseLiteral('1.5;30')));
ok('reject garbage', () => throws('', () => E.parseLiteral('abc')));

/* ---------- formatting ---------- */
ok('format 1.5 -> 1;30', () => assert.strictEqual(E.formatValue(1.5), '1;30'));
ok('format 0.5 -> 0;30', () => assert.strictEqual(E.formatValue(0.5), '0;30'));
ok('format 1+30/60+25/3600 -> 1;30,25', () =>
  assert.strictEqual(E.formatValue(1 + 30 / 60 + 25 / 3600), '1;30,25'));
ok('format -1.5 -> -1;30', () => assert.strictEqual(E.formatValue(-1.5), '-1;30'));
ok('format 1/3 -> 0;20', () => assert.strictEqual(E.formatValue(1 / 3), '0;20'));
ok('format (1/3)*3 -> 1 (snap)', () => assert.strictEqual(E.formatValue((1 / 3) * 3), '1'));
ok('format 0.1+0.2 -> 0;18 (snap)', () => assert.strictEqual(E.formatValue(0.1 + 0.2), '0;18'));
ok('format 3600 -> 1,0,0', () => assert.strictEqual(E.formatValue(3600), '1,0,0'));
ok('format 0 -> 0', () => assert.strictEqual(E.formatValue(0), '0'));
ok('format dms style', () =>
  assert.strictEqual(E.formatValue(12 + 34 / 60 + 56 / 3600, 8, 'dms'), "12\u00B034\u203256\u2033"));
ok('format hms style', () =>
  assert.strictEqual(E.formatValue(1.5, 8, 'hms'), '1h30m0s'));
ok('format hms fractional seconds', () =>
  assert.strictEqual(E.formatValue(1.5 / 3600, 8, 'hms'), '0h0m1.5s'));
ok('format hms big hours', () =>
  assert.strictEqual(E.formatValue(3661, 8, 'hms'), '3661h0m0s'));

/* ---------- evaluation ---------- */
ok('eval 1;30+2;45', () => approx(E.evaluate('1;30+2;45'), 4.25));
ok('eval (1;30+2;45)*2', () => approx(E.evaluate('(1;30+2;45)*2'), 8.5));
ok('eval 1;30,25-1;30', () => approx(E.evaluate('1;30,25-1;30'), 25 / 3600, 1e-12));
ok('eval 2^10', () => approx(E.evaluate('2^10'), 1024));
ok('eval -2^2 = -4', () => approx(E.evaluate('-2^2'), -4));
ok('eval 2^-3', () => approx(E.evaluate('2^-3'), 0.125));
ok('eval sqrt(1;7,30)', () => approx(E.evaluate('\u221A(1;7,30)'), Math.sqrt(1.125)));
ok('eval 5!', () => approx(E.evaluate('5!'), 120));
ok('eval sin(30) deg', () => approx(E.evaluate('sin(30)', { angle: 'deg' }), 0.5, 1e-12));
ok('eval tan(45) deg', () => approx(E.evaluate('tan(45)', { angle: 'deg' }), 1, 1e-9));
ok('eval sin(pi/6) rad', () => approx(E.evaluate('sin(pi/6)', { angle: 'rad' }), 0.5, 1e-12));
ok('eval asin(0;30) deg', () => approx(E.evaluate('asin(0;30)', { angle: 'deg' }), 30, 1e-9));
ok('eval implicit mult 2pi', () => approx(E.evaluate('2pi'), 2 * Math.PI));
ok('eval implicit parens (0;30)(2)', () => approx(E.evaluate('(0;30)(2)'), 1));
ok('eval log(100)', () => approx(E.evaluate('log(100)'), 2));
ok('eval ln(e)', () => approx(E.evaluate('ln(e)'), 1));
ok('eval ans', () => approx(E.evaluate('ans*2', { ans: 5 }), 10));
ok('eval DMS in expr 12°34\'56"*2', () =>
  approx(E.evaluate("12\u00B034'56\"*2"), 2 * (12 + 34 / 60 + 56 / 3600)));
ok('eval division by zero throws', () => throws('', () => E.evaluate('1/0')));
ok('eval stray ) throws', () => throws('', () => E.evaluate('2+3)')));
ok('eval unknown name throws', () => throws('', () => E.evaluate('foo(2)')));
ok('eval ans missing throws', () => throws('', () => E.evaluate('ans')));

/* ---------- trailing-number helper ---------- */
ok('trailing of "1;30,25+" is empty (no active number)', () =>
  assert.strictEqual(E.trailingNumber('1;30,25+'), ''));
ok('trailing of "1;30,25"', () => assert.strictEqual(E.trailingNumber('1;30,25'), '1;30,25'));
ok('trailing of "(2"', () => assert.strictEqual(E.trailingNumber('(2'), '2'));
ok('trailing of "sin(" none', () => assert.strictEqual(E.trailingNumber('sin('), ''));
ok('cleanTail strips separators', () => assert.strictEqual(E.cleanTail('1;30,'), '1;30'));

/* ---------- glyphs ---------- */
for (let n = 0; n <= 59; n++) {
  const svg = E.glyphSVG(n);
  if (typeof svg !== 'string' || !svg.includes('<svg') || !svg.includes('</svg>')) {
    ok('glyph ' + n, () => { throw new Error('bad glyph'); });
  }
}
ok('glyphs 0-59 generated', () => {
  for (let n = 0; n <= 59; n++) {
    const svg = E.glyphSVG(n);
    assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'), 'glyph ' + n);
    assert.ok(svg.includes('currentColor'), 'glyph color ' + n);
  }
});

/* ---------- Unicode cuneiform text glyphs ---------- */
ok('glyphText 1 = one ASH (main block)', () =>
  assert.strictEqual(E.glyphText(1), '\u{12038}'));
ok('glyphText 5 = five ASH', () =>
  assert.strictEqual(E.glyphText(5), '\u{12403}'));
ok('glyphText 9 = nine ASH', () =>
  assert.strictEqual(E.glyphText(9), '\u{12407}'));
ok('glyphText 10 = single U ten-sign', () =>
  assert.strictEqual(E.glyphText(10), '\u{1230B}'));
ok('glyphText 30 = three U signs', () =>
  assert.strictEqual(E.glyphText(30), '\u{1230B}'.repeat(3)));
ok('glyphText 36 composes tens+units', () =>
  assert.strictEqual(E.glyphText(36), '\u{1230B}'.repeat(3) + '\u{12404}'));
ok('glyphText 59', () =>
  assert.strictEqual(E.glyphText(59), '\u{1230B}'.repeat(5) + '\u{12407}'));
ok('glyphText 0 empty (placeholder drawn)', () =>
  assert.strictEqual(E.glyphText(0), ''));
ok('glyphText rejects 60 and -1', () => {
  throws('', () => E.glyphText(60));
  throws('', () => E.glyphText(-1));
});

/* ---------- unit conversion ---------- */
ok('length: 1 mi = 1609.344 m', () =>
  assert.strictEqual(E.convertUnits(1, 'mi', 'm', 'length'), 1609.344));
ok('length: 5 km = 3.10686... mi (round-trip)', () =>
  assert.ok(Math.abs(E.convertUnits(5, 'km', 'mi', 'length') - 3.106856) < 1e-5));
ok('length: 12 in = 1 ft', () =>
  assert.ok(Math.abs(E.convertUnits(12, 'in', 'ft', 'length') - 1) < 1e-12));
ok('length: cm -> inches', () =>
  assert.ok(Math.abs(E.convertUnits(2.54, 'cm', 'in', 'length') - 1) < 1e-12));
ok('mass: 1 lb = 453.59237 g exactly', () =>
  assert.ok(Math.abs(E.convertUnits(1, 'lb', 'g', 'mass') - 453.59237) < 1e-9));
ok('mass: 16 oz = 1 lb', () =>
  assert.ok(Math.abs(E.convertUnits(16, 'oz', 'lb', 'mass') - 1) < 1e-12));
ok('mass: kg <-> stone round-trip', () =>
  assert.ok(Math.abs(E.convertUnits(E.convertUnits(70, 'kg', 'st', 'mass'), 'st', 'kg', 'mass') - 70) < 1e-9));
ok('volume: 1 cup = 250 ml (metric kitchen)', () =>
  assert.strictEqual(E.convertUnits(1, 'cup', 'ml', 'volume'), 250));
ok('volume: 1 tbsp = 15 ml, 1 tsp = 5 ml, 3 tsp = 1 tbsp', () => {
  assert.strictEqual(E.convertUnits(1, 'tbsp', 'ml', 'volume'), 15);
  assert.strictEqual(E.convertUnits(1, 'tsp', 'ml', 'volume'), 5);
  assert.strictEqual(E.convertUnits(3, 'tsp', 'tbsp', 'volume'), 1);
});
ok('volume: 1 gal = 3.785411784 L', () =>
  assert.ok(Math.abs(E.convertUnits(1, 'gal', 'l', 'volume') - 3.785411784) < 1e-9));
ok('temperature: 100 C = 212 F = 373.15 K', () => {
  assert.strictEqual(E.convertUnits(100, 'c', 'f', 'temperature'), 212);
  assert.ok(Math.abs(E.convertUnits(100, 'c', 'k', 'temperature') - 373.15) < 1e-9);
});
ok('temperature: -40 C = -40 F', () =>
  assert.ok(Math.abs(E.convertUnits(-40, 'c', 'f', 'temperature') + 40) < 1e-12));
ok('temperature: 32 F -> C and K chain', () => {
  assert.strictEqual(E.convertUnits(32, 'f', 'c', 'temperature'), 0);
  assert.ok(Math.abs(E.convertUnits(32, 'f', 'k', 'temperature') - 273.15) < 1e-9);
});
ok('temperature: rejects below absolute zero (-300 C -> K)', () =>
  throws('', () => E.convertUnits(-300, 'c', 'k', 'temperature')));
ok('time: 90 min = 1.5 h; 1 wk = 7 days', () => {
  assert.strictEqual(E.convertUnits(90, 'min', 'h', 'time'), 1.5);
  assert.strictEqual(E.convertUnits(1, 'wk', 'day', 'time'), 7);
});
ok('conversion rejects unknown unit / non-finite value', () => {
  throws('', () => E.convertUnits(1, 'mi', 'parsec', 'length'));
  throws('', () => E.convertUnits(NaN, 'mi', 'km', 'length'));
});

/* ---------- speed / area / data / energy ---------- */
ok('speed: 100 km/h = 27.7778 m/s; 1 kn = 1.852 km/h', () => {
  assert.ok(Math.abs(E.convertUnits(100, 'kmh', 'ms', 'speed') - 27.7777778) < 1e-6);
  assert.ok(Math.abs(E.convertUnits(1, 'kn', 'kmh', 'speed') - 1.852) < 1e-9);
});
ok('speed: 60 mph = 96.56064 km/h exactly', () =>
  assert.ok(Math.abs(E.convertUnits(60, 'mph', 'kmh', 'speed') - 96.56064) < 1e-9));
ok('area: 1 ha = 10,000 m2; 1 acre = 4046.8564224 m2', () => {
  assert.strictEqual(E.convertUnits(1, 'ha', 'm2', 'area'), 10000);
  assert.ok(Math.abs(E.convertUnits(1, 'ac', 'm2', 'area') - 4046.8564224) < 1e-9);
});
ok('area: 1 mi2 = 640 acres (approx)', () =>
  assert.ok(Math.abs(E.convertUnits(1, 'mi2', 'ac', 'area') - 640) < 1e-6));
ok('data: 1 GB = 1000 MB; 1 GiB = 1024 MiB', () => {
  assert.strictEqual(E.convertUnits(1, 'GB', 'MB', 'data'), 1000);
  assert.strictEqual(E.convertUnits(1, 'GiB', 'MiB', 'data'), 1024);
});
ok('data: 1 GiB in MB is 1073.741824', () =>
  assert.ok(Math.abs(E.convertUnits(1, 'GiB', 'MB', 'data') - 1073.741824) < 1e-9));
ok('data: full SI ladder up to Quettabyte (QB)', () => {
  assert.strictEqual(E.convertUnits(1, 'QB', 'RB', 'data'), 1000);
  assert.strictEqual(E.convertUnits(1, 'QB', 'B', 'data'), 1e30);
  assert.strictEqual(E.convertUnits(1, 'YB', 'ZB', 'data'), 1000);
  assert.strictEqual(E.convertUnits(2, 'PB', 'TB', 'data'), 2000);
});
ok('data: binary ladder up to Quebibyte (exact powers of two)', () => {
  assert.strictEqual(E.convertUnits(1, 'QiB', 'RiB', 'data'), 1024);
  assert.strictEqual(E.convertUnits(1, 'YiB', 'TiB', 'data'), 1099511627776); // 2^40
});
ok('energy: 1 kcal = 4184 J; 1 kWh = 3.6 MJ', () => {
  assert.strictEqual(E.convertUnits(1, 'kcal', 'J', 'energy'), 4184);
  assert.strictEqual(E.convertUnits(1, 'kWh', 'kJ', 'energy'), 3600);
});
ok('energy: 2000 food Calories = 8368 kJ', () =>
  assert.strictEqual(E.convertUnits(2000, 'kcal', 'kJ', 'energy'), 8368));

/* ---------- currency (injected rates) ---------- */
ok('currency: no rates loaded -> throws', () =>
  throws('', () => E.convertUnits(1, 'USD', 'EUR', 'currency')));
ok('currency: injected USD-based rates convert correctly', () => {
  E.setCurrencyRates({ USD: 1, EUR: 0.9, GBP: 0.8, JPY: 150 });
  assert.strictEqual(E.convertUnits(100, 'USD', 'EUR', 'currency'), 90);
  assert.strictEqual(E.convertUnits(72, 'GBP', 'USD', 'currency'), 90);
});
ok('currency: cross rate GBP -> EUR via USD base', () =>
  assert.strictEqual(E.convertUnits(80, 'GBP', 'EUR', 'currency'), 90));
ok('currency: rejects unknown code / invalid rates object', () => {
  throws('', () => E.convertUnits(1, 'USD', 'XYZ', 'currency'));
  throws('', () => E.setCurrencyRates({ EUR: 0.9 }));
});

/* ---------- percent / mod / nCr / nPr ---------- */
ok('percent: postfix divide by 100', () => {
  assert.strictEqual(E.evaluate('50%'), 0.5);
  assert.strictEqual(E.evaluate('200+10%'), 200.1);
  assert.strictEqual(E.evaluate('50%%'), 0.005);
  assert.strictEqual(E.evaluate('(1;30)%'), 1.5 / 100);
});
ok('percent: chains with factorial', () =>
  assert.strictEqual(E.evaluate('3!%'), 6 / 100));
ok('mod: remainder with JS semantics', () => {
  assert.strictEqual(E.evaluate('7 mod 3'), 1);
  assert.strictEqual(E.evaluate('-7 mod 3'), -1);
  assert.strictEqual(E.evaluate('7.5 mod 2'), 1.5);
});
ok('mod: precedence same tier as * and /', () => {
  assert.strictEqual(E.evaluate('2+3 mod 2'), 3);       // (2+(3 mod 2))
  assert.strictEqual(E.evaluate('100/5 mod 3'), 2);     // ((100/5) mod 3)
});
ok('mod: zero divisor rejected', () =>
  throws('', () => E.evaluate('7 mod 0')));
ok('nCr: combinations', () => {
  assert.strictEqual(E.evaluate('5 nCr 2'), 10);
  assert.strictEqual(E.evaluate('10 nCr 0'), 1);
  assert.strictEqual(E.evaluate('10 nCr 10'), 1);
  assert.strictEqual(E.evaluate('5 nCr 7'), 0);
  assert.strictEqual(E.evaluate('40 nCr 20'), 137846528820);
  assert.strictEqual(E.evaluate('5 nCr 2*2'), 20);      // binds tighter than *
});
ok('nPr: permutations', () => {
  assert.strictEqual(E.evaluate('5 nPr 2'), 20);
  assert.strictEqual(E.evaluate('5 nPr 5'), 120);
  assert.strictEqual(E.evaluate('2 * 5 nPr 2'), 40);
});
ok('nCr/nPr: rejects bad inputs', () => {
  throws('', () => E.evaluate('5 nPr 7'));              // k > n
  throws('', () => E.evaluate('2.5 nCr 2'));
  throws('', () => E.evaluate('-1 nCr 2'));
  throws('', () => E.evaluate('170 nPr 171'));
});
ok('abs: works via sexagesimal input', () =>
  assert.strictEqual(E.evaluate('abs(-3;30)'), 3.5));

/* ---------- crypto (injected prices) ---------- */
ok('crypto: no prices loaded -> throws', () =>
  throws('', () => E.convertUnits(1, 'BTC', 'USD', 'crypto')));
ok('crypto: injected USD prices convert BTC -> USD', () => {
  E.setCryptoRates({ BTC: 64000, ETH: 3000, SOL: 150 });
  assert.strictEqual(E.convertUnits(2, 'BTC', 'USD', 'crypto'), 128000);
  assert.strictEqual(E.convertUnits(1, 'SOL', 'ETH', 'crypto'), 0.05);
});
ok('crypto: coin -> fiat routes through currency rates', () => {
  assert.strictEqual(E.convertUnits(3, 'ETH', 'EUR', 'crypto'), 8100);
});
ok('crypto: rejects unknown symbol / empty price table', () => {
  throws('', () => E.convertUnits(1, 'BTC', 'DOGE', 'crypto'));
  throws('', () => E.setCryptoRates({}));
});

/* ---------- stocks (injected prices) ---------- */
ok('stocks: no prices loaded -> throws', () =>
  throws('', () => E.convertUnits(1, 'AAPL', 'USD', 'stocks')));
ok('stocks: injected USD prices convert share -> USD / share -> share', () => {
  E.setStockRates({ AAPL: 250, MSFT: 500 });
  assert.strictEqual(E.convertUnits(2, 'AAPL', 'USD', 'stocks'), 500);
  assert.strictEqual(E.convertUnits(1, 'MSFT', 'AAPL', 'stocks'), 2);
});
ok('stocks: share -> fiat routes through currency rates', () => {
  assert.strictEqual(E.convertUnits(1, 'MSFT', 'EUR', 'stocks'), 450);
});
ok('stocks: rejects unknown ticker / empty price table', () => {
  throws('', () => E.convertUnits(1, 'AAPL', 'TSLA', 'stocks'));
  throws('', () => E.setStockRates({}));
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);

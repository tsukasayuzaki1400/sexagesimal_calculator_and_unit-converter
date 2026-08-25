/* UI layer for the Babylonian sexagesimal calculator. */
(function () {
  'use strict';
  var E = window.SexagesimalEngine;
  function $(id) { return document.getElementById(id); }

  var STYLES = [
    { key: 'dec', btn: '94' },
    { key: 'semi', btn: '1;34' },
    { key: 'dms', btn: '\u00B0\u2032\u2033' },
    { key: 'hms', btn: 'h m s' }
  ];

  var state = {
    expr: '',
    ans: undefined,
    justEvaluated: false,
    angle: 'deg',
    styleIdx: 0,
    history: [],
    view: 'calc',
    light: false
  };

  var exprEl, echoEl, resultEl;
  var lastResultText = '';

  /* Authentic Unicode glyphs when the device has a cuneiform font, else drawn SVG. */
  var useTextGlyphs = false;

  function detectCuneiformFont() {
    try {
      var probe = E.glyphText(59);
      var missing = '\uE01C';
      var c1 = document.createElement('canvas');
      c1.width = 60; c1.height = 40;
      var x1 = c1.getContext('2d');
      x1.font = '24px serif';
      x1.fillText(probe, 4, 30);
      var w1 = x1.measureText(probe).width;
      var c2 = document.createElement('canvas');
      c2.width = 60; c2.height = 40;
      var x2 = c2.getContext('2d');
      x2.font = '24px serif';
      x2.fillText(missing, 4, 30);
      var w2 = x2.measureText(missing).width;
      if (w1 === 0) return false;
      // A real font draws wider than a single .notdef tofu box; identical
      // pixels/widths mean both are fallback boxes.
      return Math.abs(w1 - w2) > 0.5 || c1.toDataURL() !== c2.toDataURL();
    } catch (err) {
      return false;
    }
  }

  function glyphHTML(n) {
    if (useTextGlyphs && n !== 0) return '<span class="gtext">' + E.glyphText(n) + '</span>';
    return E.glyphSVG(n);
  }

  /* ---------- rendering ---------- */

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function placesGlyphHTML(places) {
    var html = '';
    if (places.neg) html += '<span class="negsign">\u2212</span>';
    var seq = places.int.concat(places.frac);
    for (var i = 0; i < seq.length; i++) {
      html += '<span class="gbox" title="' + seq[i] + '">' + glyphHTML(seq[i]) + '</span>';
    }
    return html;
  }

  /* Render the ENTIRE expression as cuneiform: every number becomes
     Babylonian glyphs, operators stay as text between them. */
  var NUM_MATCHERS = [
    /^\d+(?:\.\d+)?(?:\u00B0|[dh])(?:\d+(?:\.\d+)?(?:['\u2032]|m))?(?:\d+(?:\.\d+)?(?:["\u2033]|s))?/,
    /^\d*\.\d+/,
    /^\d[\d,]*(?:;\d[\d,]*)?/,
    /^;\d[\d,]*/,
    /^\d+/
  ];

  function matchNumberAt(rest) {
    for (var k = 0; k < NUM_MATCHERS.length; k++) {
      var m = rest.match(NUM_MATCHERS[k]);
      if (m) return m[0];
    }
    return null;
  }

  function renderEcho() {
    var s = state.expr;
    if (!s) { echoEl.innerHTML = ''; return; }
    var html = '';
    var buf = '';
    var i = 0;
    function flushBuf() {
      if (buf) {
        html += '<span class="opglyph">' + escapeHtml(buf) + '</span>';
        buf = '';
      }
    }
    while (i < s.length) {
      var lit = matchNumberAt(s.slice(i));
      if (lit) {
        flushBuf();
        var drawn = false;
        try {
          var v = E.parseLiteral(E.cleanTail(lit));
          html += '<span class="numgrp">' + placesGlyphHTML(E.toPlaces(v)) + '</span>';
          drawn = true;
        } catch (err) { drawn = false; }
        if (!drawn) html += '<span class="opglyph">' + escapeHtml(lit) + '</span>';
        i += lit.length;
      } else {
        buf += s[i];
        i++;
      }
    }
    flushBuf();
    echoEl.innerHTML = html;
    fitEcho();
  }

  /* Shrink glyphs stepwise when a very long equation would bloat the display. */
  function fitEcho() {
    echoEl.classList.remove('compact', 'tiny');
    var h = echoEl.offsetHeight;
    if (h > 210) { echoEl.classList.add('compact'); h = echoEl.offsetHeight; }
    if (h > 260) { echoEl.classList.add('tiny'); }
  }

  function render() {
    exprEl.textContent = state.expr;
    exprEl.classList.toggle('empty', state.expr === '');
    renderEcho();
  }

  function decimalText(v) {
    if (!isFinite(v)) return String(v);
    if (v === 0) return '0';
    var a = Math.abs(v);
    if (a >= 1e15 || a < 1e-6) {
      return v.toExponential(8).replace(/\.?0+e/, 'e');
    }
    return String(parseFloat(v.toPrecision(15)));
  }

  function currentText(v) {
    var style = STYLES[state.styleIdx].key;
    if (style === 'dec') return decimalText(v);
    return E.formatValue(v, 8, style);
  }

  function showResult(text, isErr) {
    lastResultText = text;
    resultEl.classList.toggle('err', !!isErr);
    resultEl.innerHTML = '<span class="' + (isErr ? 'res-err' : 'res-ok') + '">' +
      escapeHtml(text) + '</span>';
  }

  /* ---------- entry logic ---------- */

  function freshIfDone() {
    if (state.justEvaluated) { state.expr = ''; state.justEvaluated = false; }
  }

  function pressDigit(v) {
    if (state.view === 'convert') { convPressDigit(v); return; }
    freshIfDone();
    var tail = E.trailingNumber(state.expr);
    if (tail === '') {
      state.expr += String(v);
    } else if (/[;,]$/.test(tail)) {
      state.expr += String(v);            // right after radix or place separator
    } else if (/\./.test(E.cleanTail(tail)) || /[\u00B0dh]/.test(E.cleanTail(tail))) {
      state.expr += String(v);            // decimal or DMS continuation
    } else {
      state.expr += ',' + String(v);      // open the next place
    }
    render();
  }

  function pressRadix() {
    freshIfDone();
    var tail = E.trailingNumber(state.expr);
    var cleaned = E.cleanTail(tail);
    if (/;$/.test(tail) || /\./.test(cleaned) || /;/.test(cleaned)) return;
    state.expr += (tail === '' ? '0;' : ';');
    render();
  }

  function pressDot() {
    freshIfDone();
    var tail = E.trailingNumber(state.expr);
    var cleaned = E.cleanTail(tail);
    if (/\./.test(cleaned) || /;/.test(cleaned)) return;
    state.expr += (tail === '' ? '0.' : '.');
    render();
  }

  function pressComma() {
    var tail = E.trailingNumber(state.expr);
    if (tail === '' || /[;,]$/.test(tail) || /\./.test(E.cleanTail(tail))) return;
    state.expr += ',';
    render();
  }

  function pressOp(op) {
    if (state.justEvaluated) state.justEvaluated = false;
    if (state.expr === '') {
      if (op !== '\u2212') return;
      state.expr += op;
      render();
      return;
    }
    var last = state.expr.slice(-1);
    if ('+-\u2212\u00D7\u00F7^*/'.indexOf(last) >= 0) {
      state.expr = state.expr.slice(0, -1) + op;
    } else if (last !== '(') {
      state.expr += op;
    }
    render();
  }

  var WORD_END = /(sin\(|cos\(|tan\(|asin\(|acos\(|atan\(|log\(|ln\(|exp\(|abs\(|sqrt\(|\u221A\(|pi|ans|Ans)$/;

  function pressBack() {
    if (state.view === 'convert') { convBack(); return; }
    if (!state.expr) return;
    if (state.justEvaluated) { state.expr = ''; state.justEvaluated = false; render(); return; }
    var tail = E.trailingNumber(state.expr);
    if (tail && /\d$/.test(state.expr)) {
      var stripped = tail.replace(/\d+$/, '').replace(/[;,]+$/, '');
      var removed = tail.length - stripped.length;
      state.expr = state.expr.slice(0, state.expr.length - Math.max(removed, 1));
    } else {
      var m = state.expr.match(WORD_END);
      state.expr = m ? state.expr.slice(0, state.expr.length - m[0].length)
                     : state.expr.slice(0, -1);
    }
    render();
  }

  function insert(text) {
    state.justEvaluated = false;
    state.expr += text;
    render();
  }

  function clearAll() {
    if (state.view === 'convert') { convClear(); return; }
    state.expr = '';
    state.justEvaluated = false;
    render();
  }

  /* ---------- evaluation ---------- */

  function pressEquals() {
    var src = state.expr.trim();
    if (!src) return;
    try {
      var v = E.evaluate(src, { angle: state.angle, ans: state.ans });
      state.ans = v;
      showResult(currentText(v), false);
      state.history.unshift({ expr: src, v: v });
      if (state.history.length > 60) state.history.pop();
      renderHistory();
      state.expr = decimalText(v);
      state.justEvaluated = true;
      render();
    } catch (err) {
      showResult(err && err.message ? err.message : 'Error', true);
      render();
    }
  }

  /* ---------- history ---------- */

  function renderHistory() {
    var ol = $('history');
    ol.innerHTML = '';
    $('histEmpty').style.display = state.history.length ? 'none' : '';
    state.history.forEach(function (item) {
      var li = document.createElement('li');
      var ex = document.createElement('div');
      ex.className = 'h-exp';
      ex.textContent = item.expr;
      var re = document.createElement('div');
      re.className = 'h-res';
      re.textContent = currentText(item.v);
      li.appendChild(ex);
      li.appendChild(re);
      li.title = 'Click to insert this result';
      li.addEventListener('click', function () {
        state.justEvaluated = false;
        state.expr += decimalText(item.v);
        render();
      });
      ol.appendChild(li);
    });
  }

  function cycleStyle() {
    state.styleIdx = (state.styleIdx + 1) % STYLES.length;
    $('styleBtn').textContent = STYLES[state.styleIdx].btn;
    if (state.justEvaluated && typeof state.ans === 'number') {
      showResult(currentText(state.ans), false);
    }
    renderHistory();
  }

  /* ---------- pads ---------- */

  function buildDigitPad() {
    var pad = $('digitPad');
    var html = '';
    for (var n = 1; n <= 59; n++) {
      var cls = 'dkey';
      if (useTextGlyphs && n !== 0) {
        var count = Math.floor(n / 10) + (n % 10 ? 1 : 0);
        if (count >= 5) cls += ' wide5';
        else if (count >= 4) cls += ' wide4';
      }
      html += '<button class="' + cls + '" data-v="' + n + '" title="' + n + '">' +
        glyphHTML(n) + '<span class="klabel">' + n + '</span></button>';
    }
    html += '<button class="dkey zero" data-v="0" title="empty place (zero)">' +
      glyphHTML(0) + '<span class="klabel">0</span></button>';
    pad.innerHTML = html;
    pad.addEventListener('click', function (ev) {
      var b = ev.target.closest('button.dkey');
      if (b) pressDigit(parseInt(b.getAttribute('data-v'), 10));
    });
  }

  var SCI = [
    ['(', '('], [')', ')'], ['x!', '!'], ['\u03C0', 'pi'],
    ['sin', 'sin('], ['cos', 'cos('], ['tan', 'tan('], ['e', 'e'],
    ['asin', 'asin('], ['acos', 'acos('], ['atan', 'atan('], ['Ans', 'ans'],
    ['log', 'log('], ['ln', 'ln('], ['exp', 'exp('], ['\u221A', '\u221A('],
    ['x\u00B2', '^2', 'wrap'], ['x\u00B3', '^3', 'wrap'],
    ['1/x', '1/', 'recip'], ['%', '%', 'wrap'],
    ['nCr', ' nCr ', 'infix'], ['nPr', ' nPr ', 'infix'],
    ['mod', ' mod ', 'infix'], ['abs', 'abs(', 'ins']
  ];

  /* Avoid needless parentheses when a quick key wraps the expression */
  function atom(e) {
    if (/^[0-9.,;\s]+$/.test(e)) return e;
    if (balancedGroup(e)) return e;
    return '(' + e + ')';
  }

  function balancedGroup(e) {
    if (e[0] !== '(' || e[e.length - 1] !== ')') return false;
    var d = 0;
    for (var i = 0; i < e.length; i++) {
      if (e[i] === '(') d++;
      else if (e[i] === ')') { d--; if (d === 0 && i < e.length - 1) return false; }
      if (d < 0) return false;
    }
    return d === 0;
  }

  function sciPress(item) {
    var kind = item[2] || 'ins';
    var e = state.expr.trim();
    state.justEvaluated = false;
    if (kind === 'wrap') state.expr = (e ? atom(e) : 'Ans') + item[1];
    else if (kind === 'recip') state.expr = '1/' + (e ? atom(e) : 'Ans');
    else if (kind === 'infix') state.expr = (e ? e : 'Ans') + item[1];
    else state.expr += item[1];
    render();
  }

  function buildSciPad() {
    var pad = $('sciPad');
    SCI.forEach(function (item) {
      var b = document.createElement('button');
      b.textContent = item[0];
      b.title = item[1];
      b.addEventListener('click', function () { sciPress(item); });
      pad.appendChild(b);
    });
  }

  var OPS = [
    ['C', 'clear-all', null], ['\u232B', 'back', null],
    [';', 'radix', null], ['^', 'op', '^'],
    ['(', 'ins', '('], [')', 'ins', ')'],
    ['\u00F7', 'op', '\u00F7'], ['\u00D7', 'op', '\u00D7'],
    ['\u2212', 'op', '\u2212'], ['+', 'op', '+']
  ];

  function buildOpPad() {
    var pad = $('opPad');
    OPS.forEach(function (item) {
      var b = document.createElement('button');
      b.textContent = item[0];
      if (item[0] === 'C') b.className = 'danger';
      b.addEventListener('click', function () {
        switch (item[1]) {
          case 'clear-all': clearAll(); break;
          case 'back': pressBack(); break;
          case 'radix': pressRadix(); break;
          case 'op': pressOp(item[2]); break;
          case 'ins': insert(item[2]); break;
        }
      });
      pad.appendChild(b);
    });
  }

  /* ---------- keyboard ---------- */

  window.addEventListener('keydown', function (ev) {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    var k = ev.key;

    // Let the converter's selects handle their own keys; Escape still closes help.
    var tag = ev.target && ev.target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
      if (k === 'Escape' && !$('helpOverlay').hidden) toggleHelp(false);
      return;
    }

    if (state.view === 'convert') {
      var handledC = true;
      if (/^[0-9]$/.test(k)) convPressDigit(Number(k));
      else if (k === '.' || k === ',' || k === ';') convRadix();
      else if (k === 'Backspace') convBack();
      else if (k === 'Escape') convClear();
      else handledC = false;
      if (handledC) ev.preventDefault();
      return;
    }

    var overlayOpen = !$('helpOverlay').hidden;
    var handled = true;

    if (overlayOpen) {
      if (k === 'Escape' || k === 'Enter') toggleHelp(false);
      else handled = false;
      if (handled) ev.preventDefault();
      return;
    }

    // Raw typing concatenates characters (e.g. "30" is the number thirty),
    // unlike keypad taps which enter whole place values.
    function typeRaw(ch) { freshIfDone(); state.expr += ch; render(); }

    if (/^[0-9]$/.test(k)) typeRaw(k);
    else if (k === '.') pressDot();
    else if (k === ';') pressRadix();
    else if (k === ',') pressComma();
    else if (k === '\u00B0' || k === "'" || k === '"' || k === '\u2032' || k === '\u2033') typeRaw(k);
    else if (k === '+') pressOp('+');
    else if (k === '-') pressOp('\u2212');
    else if (k === '*') pressOp('\u00D7');
    else if (k === '/') pressOp('\u00F7');
    else if (k === '^') pressOp('^');
    else if (k === '(') insert('(');
    else if (k === ')') insert(')');
    else if (k === '!') insert('!');
    else if (k === '%') sciPress(['%', '%', 'wrap']);
    else if (k === 'Enter' || k === '=') pressEquals();
    else if (k === 'Backspace') pressBack();
    else if (k === 'Escape') clearAll();
    else if (/^[a-zA-Z]$/.test(k)) { state.expr += k.toLowerCase(); render(); }
    else handled = false;

    if (handled) ev.preventDefault();
  });

  /* ---------- clipboard ---------- */

  function legacyCopy(t) {
    if (!document.body) return;
    var ta = document.createElement('textarea');
    ta.value = t;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (err) { }
    document.body.removeChild(ta);
  }

  function flashCopied(btn) {
    btn.classList.add('ok');
    var old = btn.innerHTML;
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M20 6L9 17l-5-5"/></svg>';
    setTimeout(function () {
      btn.classList.remove('ok');
      btn.innerHTML = old;
    }, 1200);
  }

  function bindCopy(btnId, getText) {
    var btn = $(btnId);
    btn.addEventListener('click', function () {
      var t = getText();
      if (!t) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t).catch(function () { legacyCopy(t); });
      } else {
        legacyCopy(t);
      }
      flashCopied(btn);
    });
  }

  /* ---------- theme ---------- */

  function setTheme(light) {
    state.light = light;
    if (document.body) document.body.classList.toggle('light', light);
    $('themeBtn').textContent = light ? '\u263D' : '\u2600'; // moon shown in light mode
    try { localStorage.setItem('sexconv.theme', light ? 'light' : 'dark'); } catch (err) { }
  }

  /* ---------- help ---------- */

  function toggleHelp(open) {
    $('helpOverlay').hidden = !open;
  }

  /* ---------- unit converter ---------- */

  var conv = { cat: 'crypto', from: 'BTC', to: 'USD', amt: '' };
  var convLast = '';
  var CAT_NAMES = {
    length: 'Length', mass: 'Weight', volume: 'Volume', temperature: 'Temp',
    time: 'Time', speed: 'Speed', area: 'Area', data: 'Data', energy: 'Energy',
    currency: 'Currency', crypto: 'Crypto', stocks: 'Stocks'
  };
  var CAT_DEFAULTS = {
    length: ['km', 'mi'], mass: ['kg', 'lb'], volume: ['cup', 'ml'],
    temperature: ['c', 'f'], time: ['h', 'min'],
    speed: ['kmh', 'mph'], area: ['m2', 'ft2'],
    data: ['GB', 'MB'], energy: ['kcal', 'kJ'],
    currency: ['USD', 'EUR'],
    crypto: ['BTC', 'USD'],
    stocks: ['AAPL', 'USD']
  };

  /* ---------- price/rate fetching (fiat + crypto + stocks) ---------- */

  var RATES_URL = 'https://open.er-api.com/v6/latest/USD';
  var RATES_KEY = 'sexconv.rates.v1';
  var CRYPTO_IDS = ['bitcoin', 'ethereum', 'tether', 'binancecoin', 'solana',
    'ripple', 'cardano', 'dogecoin', 'tron', 'polkadot'];
  var CRYPTO_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=' +
    CRYPTO_IDS.join(',') + '&vs_currencies=usd';
  var CRYPTO_KEY = 'sexconv.crypto.v1';
  var STOCK_KEY = 'sexconv.stocks.v1';
  /* Yahoo's chart API has no CORS headers, so every quote must detour through
     a public CORS relay. Relays are slow and flaky, so: no direct attempt
     (it can never succeed in a browser), the winning route is remembered in
     localStorage, each attempt is cut off after 8 s, and failures auto-retry. */
  var STOCK_TRANSPORTS = [
    {
      url: function (u) {
        return 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u);
      }
    },
    {
      url: function (u) {
        return 'https://api.allorigins.win/get?url=' + encodeURIComponent(u);
      },
      parse: function (d) { // response is { contents: "<json string>" }
        if (!d || typeof d.contents !== 'string') throw new Error('bad payload');
        return JSON.parse(d.contents);
      }
    },
    {
      url: function (u) { return 'https://r.jina.ai/' + u; },
      text: true, // reader returns "Markdown Content:\n{...}"
      parse: function (s) {
        var k = s.indexOf('{');
        return JSON.parse(k >= 0 ? s.slice(k) : s);
      }
    }
  ];
  var ROUTE_KEY = 'sexconv.stockroute.v1';
  var stockTransportIdx = 0;

  function loadStockRoute() {
    if (typeof localStorage === 'undefined') return;
    try {
      var v = parseInt(localStorage.getItem(ROUTE_KEY), 10);
      if (v >= 0 && v < STOCK_TRANSPORTS.length) stockTransportIdx = v;
    } catch (err) { /* corrupt value -> default */ }
  }

  function persistStockRoute() {
    if (typeof localStorage === 'undefined') return;
    try { localStorage.setItem(ROUTE_KEY, String(stockTransportIdx)); } catch (err) { }
  }
  var RATES_TTL = 6 * 60 * 60 * 1000;      // refresh after 6 hours
  var RATES_RETRY = 10 * 60 * 1000;        // wait 10 min before retrying a failed fetch
  var convRates = { rates: null, fetchedAt: 0, fetching: false, failedAt: 0 };
  var convCrypto = { rates: null, fetchedAt: 0, fetching: false, failedAt: 0 };
  var convStocks = { rates: null, fetchedAt: 0, fetching: false, failedAt: 0, fetchingSym: null };
  var COIN_BY_ID = {
    bitcoin: ['BTC', 'Bitcoin'], ethereum: ['ETH', 'Ethereum'], tether: ['USDT', 'Tether'],
    binancecoin: ['BNB', 'BNB'], solana: ['SOL', 'Solana'], ripple: ['XRP', 'XRP'],
    cardano: ['ADA', 'Cardano'], dogecoin: ['DOGE', 'Dogecoin'], tron: ['TRX', 'TRON'],
    polkadot: ['DOT', 'Polkadot']
  };
  var CRYPTO_LIST = [
    ['BTC', 'Bitcoin'], ['ETH', 'Ethereum'], ['USDT', 'Tether'], ['BNB', 'BNB'],
    ['SOL', 'Solana'], ['XRP', 'XRP'], ['ADA', 'Cardano'], ['DOGE', 'Dogecoin'],
    ['TRX', 'TRON'], ['DOT', 'Polkadot']
  ];
  var STOCK_LIST = [
    ['AAPL', 'Apple'], ['MSFT', 'Microsoft'], ['NVDA', 'NVIDIA'],
    ['GOOGL', 'Alphabet'], ['AMZN', 'Amazon'], ['META', 'Meta'],
    ['AVGO', 'Broadcom'], ['TSLA', 'Tesla'], ['BRK-B', 'Berkshire Hathaway'],
    ['JPM', 'JPMorgan Chase'], ['V', 'Visa'], ['LLY', 'Eli Lilly'],
    ['WMT', 'Walmart'], ['MA', 'Mastercard'], ['XOM', 'Exxon Mobil'],
    ['UNH', 'UnitedHealth'], ['JNJ', 'Johnson & Johnson'],
    ['PG', 'Procter & Gamble'], ['ORCL', 'Oracle'], ['HD', 'Home Depot'],
    ['COST', 'Costco'], ['NFLX', 'Netflix'], ['ABBV', 'AbbVie'],
    ['BAC', 'Bank of America'], ['KO', 'Coca-Cola']
  ];
  var POPULAR_CCY = [
    ['USD', 'US dollar'], ['EUR', 'euro'], ['GBP', 'British pound'],
    ['JPY', 'Japanese yen'], ['CHF', 'Swiss franc'], ['CNY', 'Chinese yuan'],
    ['CAD', 'Canadian dollar'], ['AUD', 'Australian dollar'], ['NZD', 'New Zealand dollar'],
    ['INR', 'Indian rupee'], ['SGD', 'Singapore dollar'], ['HKD', 'Hong Kong dollar'],
    ['KRW', 'South Korean won'], ['THB', 'Thai baht'], ['IDR', 'Indonesian rupiah'],
    ['MYR', 'Malaysian ringgit'], ['PHP', 'Philippine peso'], ['VND', 'Vietnamese dong'],
    ['PKR', 'Pakistani rupee'], ['AED', 'UAE dirham'], ['SAR', 'Saudi riyal'],
    ['EGP', 'Egyptian pound'], ['ZAR', 'South African rand'], ['NGN', 'Nigerian naira'],
    ['KES', 'Kenyan shilling'], ['BRL', 'Brazilian real'], ['MXN', 'Mexican peso'],
    ['ARS', 'Argentine peso'], ['CLP', 'Chilean peso'], ['COP', 'Colombian peso'],
    ['SEK', 'Swedish krona'], ['NOK', 'Norwegian krone'], ['DKK', 'Danish krone'],
    ['PLN', 'Polish zloty'], ['CZK', 'Czech koruna'], ['HUF', 'Hungarian forint'],
    ['RON', 'Romanian leu'], ['TRY', 'Turkish lira'], ['RUB', 'Russian ruble'],
    ['UAH', 'Ukrainian hryvnia'], ['ILS', 'Israeli shekel'],
    ['IRR', 'Iranian rial'], ['IQD', 'Iraqi dinar']
  ];

  function loadCachedRates() {
    if (typeof localStorage === 'undefined') return;
    try {
      var raw = localStorage.getItem(RATES_KEY);
      if (!raw) return;
      var obj = JSON.parse(raw);
      if (obj && obj.rates && obj.rates.USD) {
        convRates.rates = obj.rates;
        convRates.fetchedAt = obj.fetchedAt || 0;
        E.setCurrencyRates(obj.rates);
      }
    } catch (err) { /* corrupt cache -> ignore */ }
  }

  function persistRates() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(RATES_KEY, JSON.stringify({
        rates: convRates.rates, fetchedAt: convRates.fetchedAt
      }));
    } catch (err) { /* storage full/unavailable -> cache stays in memory */ }
  }

  function loadCachedCrypto() {
    if (typeof localStorage === 'undefined') return;
    try {
      var raw = localStorage.getItem(CRYPTO_KEY);
      if (!raw) return;
      var obj = JSON.parse(raw);
      if (obj && obj.rates) {
        convCrypto.rates = obj.rates;
        convCrypto.fetchedAt = obj.fetchedAt || 0;
        E.setCryptoRates(obj.rates);
      }
    } catch (err) { /* corrupt cache -> ignore */ }
  }

  function persistCrypto() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(CRYPTO_KEY, JSON.stringify({
        rates: convCrypto.rates, fetchedAt: convCrypto.fetchedAt
      }));
    } catch (err) { }
  }

  function loadCachedStocks() {
    if (typeof localStorage === 'undefined') return;
    try {
      var raw = localStorage.getItem(STOCK_KEY);
      if (!raw) return;
      var obj = JSON.parse(raw);
      if (obj && obj.rates) {
        convStocks.rates = obj.rates;
        convStocks.fetchedAt = obj.fetchedAt || 0;
        E.setStockRates(obj.rates);
      }
    } catch (err) { /* corrupt cache -> ignore */ }
  }

  function persistStocks() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STOCK_KEY, JSON.stringify({
        rates: convStocks.rates, fetchedAt: convStocks.fetchedAt
      }));
    } catch (err) { }
  }

  function applyRates(rates, ts) {
    convRates.rates = rates;
    convRates.fetchedAt = ts;
    convRates.fetching = false;
    E.setCurrencyRates(rates);
    persistRates();
    fillUnitSelects();
    renderConv();
  }

  function applyCryptoRates(rates, ts) {
    convCrypto.rates = rates;
    convCrypto.fetchedAt = ts;
    convCrypto.fetching = false;
    E.setCryptoRates(rates);
    persistCrypto();
    fillUnitSelects();
    renderConv();
  }

  function applyStockRates(rates, ts) {
    // merge: flaky sources may deliver tickers in dribbles — keep old prices
    convStocks.rates = convStocks.rates
      ? Object.assign({}, convStocks.rates, rates) : rates;
    convStocks.fetchedAt = ts;
    convStocks.fetching = false;
    E.setStockRates(convStocks.rates);
    persistStocks();
    fillUnitSelects();
    renderConv();
  }

  function fetchJson(url, onOk, onErr) {
    fetch(url).then(function (r) { return r.json(); }).then(function (d) {
      try { onOk(d); } catch (err) { if (onErr) onErr(); }
    }).catch(function () { if (onErr) onErr(); });
  }

  /* Shared TTL/throttle logic for both price stores. */
  function refreshStore(store, force, url, transform, apply) {
    if (typeof fetch !== 'function') return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    if (store.fetching) return;
    var now = Date.now();
    if (!force && store.rates && now - store.fetchedAt < RATES_TTL) return; // fresh cache
    if (!force && now - store.failedAt < RATES_RETRY) return;               // recently failed
    store.fetching = true;
    renderRateNote();
    fetchJson(url, function (d) {
      var out = transform(d, now);
      if (!out) throw new Error('bad payload');
      apply(out.rates, out.ts);
      renderRateNote();
    }, function () {
      store.fetching = false;
      store.failedAt = Date.now();
      renderRateNote();
    });
  }

  function fiatTransform(d, now) {
    if (!d || !d.rates || !d.rates.USD) return null;
    return {
      rates: d.rates,
      ts: d.time_last_update_unix ? d.time_last_update_unix * 1000 : now
    };
  }

  function cryptoTransform(d) {
    if (!d) return null;
    var out = {};
    CRYPTO_IDS.forEach(function (id) {
      if (d[id] && d[id].usd) out[COIN_BY_ID[id][0]] = d[id].usd;
    });
    if (Object.keys(out).length === 0) return null;
    return { rates: out, ts: Date.now() };
  }

  function ensureRates(force) {
    refreshStore(convRates, force, RATES_URL, fiatTransform, applyRates);
  }

  function ensureCryptoRates(force) {
    refreshStore(convCrypto, force, CRYPTO_URL, cryptoTransform, applyCryptoRates);
  }

  /* One fetch with a hard 8 s cutoff so hung relays fall through fast. */
  function stockFetch(url, wantText, onOk, onErr) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var done = false;
    var timer = setTimeout(function () {
      if (done) return;
      done = true;
      if (ctrl) ctrl.abort();
      onErr();
    }, 8000);
    fetch(url, ctrl ? { signal: ctrl.signal } : undefined).then(function (r) {
      return wantText ? r.text() : r.json();
    }).then(function (body) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      onOk(body);
    }).catch(function () {
      if (done) return;
      done = true;
      clearTimeout(timer);
      onErr();
    });
  }

  /* Stocks need per-symbol requests (Yahoo chart API); each tries the
     transport chain starting from the last known-good route. */
  function fetchStockSymbol(sym, onOk, onFail) {
    var yurl = 'https://query2.finance.yahoo.com/v8/finance/chart/' +
      encodeURIComponent(sym) + '?interval=1d&range=1d';
    (function go(i) {
      if (i >= STOCK_TRANSPORTS.length) return onFail();
      var t = STOCK_TRANSPORTS[i];
      stockFetch(t.url(yurl), !!t.text, function (body) {
        try {
          if (t.parse) body = t.parse(body);
          var meta = body && body.chart && body.chart.result &&
            body.chart.result[0] && body.chart.result[0].meta;
          if (!meta || !meta.regularMarketPrice) throw new Error('bad payload');
          stockTransportIdx = i;
          persistStockRoute();
          onOk(meta.regularMarketPrice);
        } catch (err) { go(i + 1); }
      }, function () { go(i + 1); });
    })(stockTransportIdx);
  }

  /* Stocks are fetched lazily, one ticker at a time: Yahoo rate-limits hard,
     so we never burst-request the whole list. The dropdown always shows all
     tickers; choosing one without a cached price fetches just that symbol. */
  var stockBusy = {};
  var stockAutoRetry = {};

  function ensureStockSymbol(sym, force) {
    if (typeof fetch !== 'function') return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    if (!sym || stockBusy[sym]) return;
    if (!force && convStocks.rates && convStocks.rates[sym]) return; // priced already
    if (!force && Date.now() - convStocks.failedAt < RATES_RETRY) return;
    stockBusy[sym] = true;
    convStocks.fetchingSym = sym;
    renderRateNote();
    fetchStockSymbol(sym, function (price) {
      delete stockBusy[sym];
      delete stockAutoRetry[sym];
      convStocks.fetchingSym = null;
      var patch = {};
      patch[sym] = price;
      applyStockRates(patch, Date.now());
    }, function () {
      delete stockBusy[sym];
      convStocks.fetchingSym = null;
      convStocks.failedAt = Date.now();
      renderRateNote();
      // one silent second chance 3 s later instead of dead-ending
      if (!force && !stockAutoRetry[sym]) {
        stockAutoRetry[sym] = true;
        setTimeout(function () { ensureStockSymbol(sym, true); }, 3000);
      }
    });
  }

  function fmtClock(ts) {
    var d = new Date(ts);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ' ' +
      d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  var PRICE_STORE_LABEL = {
    currency: ['market rates', 'live exchange rates', 'exchange rates'],
    crypto: ['crypto prices', 'crypto prices', 'crypto prices'],
    stocks: ['stock prices', 'stock prices', 'stock prices']
  };

  function renderRateNote() {
    var el = $('convRateNote');
    var cfg = PRICE_STORE_LABEL[conv.cat];
    if (!cfg) { el.hidden = true; el.textContent = ''; return; }
    var store = conv.cat === 'stocks' ? convStocks
      : conv.cat === 'crypto' ? convCrypto : convRates;
    el.hidden = false;
    if (conv.cat === 'stocks') {
      if (store.fetchingSym) {
        el.textContent = 'fetching the price of ' + store.fetchingSym + '\u2026';
        return;
      }
      if (!(store.rates && store.rates[conv.from])) {
        el.textContent = convStocks.fetchingSym
          ? 'fetching the price of ' + conv.from + '\u2026'
          : conv.from + ' price not loaded \u2014 tap to fetch';
        return;
      }
    }
    if (!store.rates) {
      el.textContent = store.fetching ? 'fetching ' + cfg[1] + '\u2026'
        : 'no ' + cfg[2] + ' available (offline?) \u2014 tap to retry';
      return;
    }
    var age = Date.now() - store.fetchedAt;
    el.textContent = cfg[0] + ' \u00B7 saved ' + fmtClock(store.fetchedAt) +
      (age > RATES_TTL ? ' \u00B7 offline \u2014 using last known'
        : ' \u00B7 cached (\u2248 6 h)');
  }

  var CAT_ORDER = ['crypto', 'stocks', 'currency', 'length', 'mass', 'volume',
    'temperature', 'time', 'speed', 'area', 'data', 'energy'];

  function buildCatPills() {
    var html = '';
    CAT_ORDER.forEach(function (c) {
      html += '<button class="pill' + (c === conv.cat ? ' on' : '') + '" data-cat="' + c + '">' +
        CAT_NAMES[c] + '</button>';
    });
    $('convCats').innerHTML = html;
  }

  function optHtml(pairs) { // [value, label] pairs -> alphabetically sorted options
    return pairs.slice().sort(function (a, b) {
      return a[1].toLowerCase().localeCompare(b[1].toLowerCase());
    }).map(function (p) {
      return '<option value="' + p[0] + '">' + p[1] + '</option>';
    }).join('');
  }

  function fillUnitSelects() {
    var opts;
    if (conv.cat === 'currency') {
      if (!convRates.rates) {
        opts = '<option value="">(no rates yet)</option>';
        $('convFrom').innerHTML = opts;
        $('convTo').innerHTML = opts;
        return;
      }
      opts = optHtml(POPULAR_CCY.filter(function (p) { return convRates.rates[p[0]]; })
        .map(function (p) { return [p[0], p[1] + ' (' + p[0] + ')']; }));
      $('convFrom').innerHTML = opts;
      $('convTo').innerHTML = opts;
    } else if (conv.cat === 'crypto' || conv.cat === 'stocks') {
      // from-side: coins/tickers; to-side: fiat currencies
      var isStock = conv.cat === 'stocks';
      var list = isStock ? STOCK_LIST : CRYPTO_LIST;
      var store = isStock ? convStocks : convCrypto;
      // stocks list every ticker (fetched lazily); crypto filters by batch result
      var items = isStock ? list
        : (store.rates ? list.filter(function (c) { return store.rates[c[0]]; }) : []);
      $('convFrom').innerHTML = items.length
        ? optHtml(items.map(function (c) { return [c[0], c[1] + ' (' + c[0] + ')']; }))
        : '<option value="">(no ' + (isStock ? 'tickers' : 'prices') + ' yet)</option>';
      $('convTo').innerHTML = convRates.rates
        ? optHtml(POPULAR_CCY.filter(function (p) { return convRates.rates[p[0]]; })
          .map(function (p) { return [p[0], p[1] + ' (' + p[0] + ')']; }))
        : '<option value="">(no rates yet)</option>';
    } else {
      var units = E.CONVERT[conv.cat].units;
      opts = optHtml(units.map(function (u) { return [u.id, u.name]; }));
      $('convFrom').innerHTML = opts;
      $('convTo').innerHTML = opts;
    }
    $('convFrom').value = conv.from;
    $('convTo').value = conv.to;
  }

  function unitName(id) {
    var lists = [STOCK_LIST, CRYPTO_LIST, POPULAR_CCY];
    for (var l = 0; l < lists.length; l++) {
      for (var i = 0; i < lists[l].length; i++) {
        if (lists[l][i][0] === id) return lists[l][i][1] + ' (' + id + ')';
      }
    }
    var us = E.CONVERT[conv.cat] ? E.CONVERT[conv.cat].units : [];
    for (var j = 0; j < us.length; j++) if (us[j].id === id) return us[j].name;
    return id;
  }

  function fmtConv(x) {
    if (!isFinite(x)) return String(x);
    var a = Math.abs(x);
    if (a !== 0 && (a >= 1e12 || a < 1e-6)) return x.toExponential(6).replace(/\.?0+e/, 'e');
    return String(parseFloat(x.toPrecision(10)));
  }

  /* Prices get plain decimals with up to 32 places. Doubles only carry ~15
     honest digits, so we render from toExponential(14) — that keeps every
     meaningful digit while never exposing binary-rounding junk (...9997). */
  function fmtMoney(x) {
    if (!isFinite(x)) return String(x);
    if (x === 0) return '0';
    var a = Math.abs(x);
    if (a >= 1e21 || a < 1e-30) return fmtConv(x); // extremes stay scientific
    var parts = a.toExponential(14).split('e');
    var digits = parts[0].replace('.', '').replace(/0+$/, '');
    var pos = parseInt(parts[1], 10) + 1; // digits left of the decimal point
    var out;
    if (pos <= 0) out = '0.' + new Array(1 - pos).join('0') + digits;
    else if (pos >= digits.length) out = digits + new Array(pos - digits.length + 1).join('0');
    else out = digits.slice(0, pos) + '.' + digits.slice(pos);
    return (x < 0 ? '-' : '') + out;
  }

  function renderConv() {
    var outEl = $('convOut'), cuneiEl = $('convCunei');
    convLast = '';
    $('convAmtDisp').textContent = conv.amt === '' ? '0' : conv.amt;
    var num = NaN;
    if (conv.amt !== '') {
      try { num = E.parseLiteral(E.cleanTail(conv.amt)); }
      catch (err) { num = Number(conv.amt); }
    }
    $('convAmtDec').textContent = isFinite(num) ? '= ' + fmtConv(num) : '';
    cuneiEl.innerHTML = '';
    if (!isFinite(num)) { outEl.textContent = ''; return; }
    try {
      var v = E.convertUnits(num, conv.from, conv.to, conv.cat);
      var isPrice = conv.cat === 'stocks' || conv.cat === 'crypto' ||
        conv.cat === 'currency';
      var txt = isPrice ? fmtMoney(v) : fmtConv(v);
      outEl.innerHTML = escapeHtml(txt) + ' <span class="unit">' + escapeHtml(unitName(conv.to)) + '</span>';
      cuneiEl.innerHTML = placesGlyphHTML(E.toPlaces(v, 4));
      convLast = txt + ' ' + unitName(conv.to);
    } catch (err) {
      if (conv.cat === 'stocks' && !(convStocks.rates && convStocks.rates[conv.from])) {
        outEl.innerHTML = '<span class="cwait">' + (convStocks.fetchingSym
          ? 'Loading the price of ' + escapeHtml(conv.from) + '\u2026'
          : escapeHtml(conv.from) + ' price not loaded \u2014 tap the line below to fetch it') +
          '</span>';
        return;
      }
      outEl.innerHTML = '<span class="cerr">' + escapeHtml(err.message) + '</span>';
    }
  }

  /* Sexagesimal place-dialing, same as the calculator keypad:
     first tap = sixties place, next tap opens the units place, etc. */
  function convPressDigit(v) {
    if (conv.amt.length >= 15) return;
    var s = String(v);
    if (conv.amt === '') conv.amt = s;
    else if (/[;,]$/.test(conv.amt)) conv.amt += s;
    else conv.amt += ',' + s;
    renderConv();
  }

  function convRadix() {
    if (conv.amt === '') { conv.amt = '0;'; renderConv(); return; }
    if (/[;,]$/.test(conv.amt) || /;/.test(conv.amt)) return;
    conv.amt += ';';
    renderConv();
  }

  function convBack() {
    conv.amt = conv.amt.slice(0, -1);
    renderConv();
  }

  function convClear() {
    conv.amt = '';
    renderConv();
  }

  function setCategory(c) {
    conv.cat = c;
    conv.from = CAT_DEFAULTS[c][0];
    conv.to = CAT_DEFAULTS[c][1];
    conv.amt = '';
    buildCatPills();
    fillUnitSelects();
    renderConv();
    renderRateNote();
    if (c === 'currency') ensureRates(false);
    if (c === 'crypto') { ensureCryptoRates(false); ensureRates(false); }
    if (c === 'stocks') { ensureStockSymbol(conv.from, false); ensureRates(false); }
  }

  function swapConv() {
    var t = conv.from;
    conv.from = conv.to;
    conv.to = t;
    fillUnitSelects();
    renderConv();
    renderRateNote();
    if (conv.cat === 'stocks') ensureStockSymbol(conv.from, false);
  }

  function showView(name) {
    state.view = name;
    $('calcView').hidden = name !== 'calc';
    $('convertView').hidden = name !== 'convert';
    $('tabCalc').classList.toggle('on', name === 'calc');
    $('tabConvert').classList.toggle('on', name === 'convert');
    $('padZone').classList.toggle('conv', name === 'convert');
    if (name === 'convert') {
      if (conv.cat === 'currency') ensureRates(false);
      if (conv.cat === 'crypto') { ensureCryptoRates(false); ensureRates(false); }
      if (conv.cat === 'stocks') { ensureStockSymbol(conv.from, false); ensureRates(false); }
      renderRateNote();
    }
  }


  /* ---------- init ---------- */

  /* App logo: tablet tile + the cuneiform sign that means both 1 and 60. */
  var LOGO_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true">' +
    '<defs>' +
    '<linearGradient id="lbg" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#242d3d"/><stop offset="1" stop-color="#141924"/></linearGradient>' +
    '<linearGradient id="lclay" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#eec079"/><stop offset="1" stop-color="#c08436"/></linearGradient>' +
    '</defs>' +
    '<rect x="2" y="2" width="60" height="60" rx="14" fill="url(#lbg)" stroke="#3a4356" stroke-width="3"/>' +
    '<path d="M40 11 l9 -4.5 -2.2 10 z" fill="#8a6c33" opacity="0.55"/>' +
    '<path d="M32 8 C27.5 16 23.5 23.5 22.5 31.5 C21.5 41 26.5 49.5 31 54.5 L33 54.5 ' +
    'C37.5 49.5 42.5 41 41.5 31.5 C40.5 23.5 36.5 16 32 8 Z" fill="url(#lclay)"/>' +
    '<path d="M44 37 l9.5 4 -7.5 7 z" fill="url(#lclay)" opacity="0.9"/>' +
    '<path d="M47.5 49 l8.5 2.5 -4.5 8" fill="none" stroke="url(#lclay)" stroke-width="4" stroke-linecap="round" opacity="0.65"/>' +
    '</svg>';

  function init() {
    exprEl = $('expr');
    echoEl = $('cuneiEcho');
    resultEl = $('result');

    useTextGlyphs = detectCuneiformFont();
    $('brandMark').innerHTML = LOGO_SVG;

    buildDigitPad();
    buildSciPad();
    buildOpPad();

    $('eqBtn').addEventListener('click', pressEquals);
    $('angleBtn').addEventListener('click', function () {
      state.angle = state.angle === 'deg' ? 'rad' : 'deg';
      this.textContent = state.angle.toUpperCase();
      this.classList.toggle('on', state.angle === 'deg');
    });
    $('styleBtn').addEventListener('click', cycleStyle);
    $('clearHist').addEventListener('click', function () {
      state.history = [];
      renderHistory();
    });

    $('helpBtn').addEventListener('click', function () { toggleHelp(true); });
    $('helpClose').addEventListener('click', function () { toggleHelp(false); });
    $('helpOverlay').addEventListener('click', function (ev) {
      if (ev.target === this) toggleHelp(false);
    });

    /* converter */
    $('tabCalc').addEventListener('click', function () { showView('calc'); });
    $('tabConvert').addEventListener('click', function () { showView('convert'); });
    $('convCats').addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('button[data-cat]') : null;
      if (b) setCategory(b.getAttribute('data-cat'));
    });
    $('convRadix').addEventListener('click', convRadix);
    $('convDel').addEventListener('click', convBack);
    $('convClr').addEventListener('click', convClear);
    $('convFrom').addEventListener('change', function () {
      conv.from = this.value;
      renderConv();
      renderRateNote();
      if (conv.cat === 'stocks') ensureStockSymbol(conv.from, false);
    });
    $('convTo').addEventListener('change', function () {
      conv.to = this.value;
      renderConv();
      renderRateNote();
    });
    $('convSwap').addEventListener('click', swapConv);
    $('convRateNote').addEventListener('click', function () {
      if (conv.cat === 'crypto') { ensureCryptoRates(true); ensureRates(true); }
      else if (conv.cat === 'stocks') { ensureStockSymbol(conv.from, true); ensureRates(true); }
      else ensureRates(true);
    });
    loadCachedRates();
    loadCachedCrypto();
    loadCachedStocks();
    loadStockRoute();
    buildCatPills();
    fillUnitSelects();
    renderConv();

    $('themeBtn').addEventListener('click', function () { setTheme(!state.light); });

    bindCopy('copyBtn', function () { return lastResultText; });
    bindCopy('convCopy', function () { return convLast; });

    var savedTheme = null;
    try { savedTheme = localStorage.getItem('sexconv.theme'); } catch (err) { }
    setTheme(savedTheme === 'light');

    renderHistory();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

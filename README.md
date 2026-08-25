# Babylonian Calculator — Complete Documentation

**Version:** 1.1 · **Format:** single-file web app (`SexagesimalCalculator.html`)
**Platform:** any modern browser (Chrome, Edge, Firefox, Safari) · **Install:** none required

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [The Calculator Tab](#2-the-calculator-tab)
3. [Number Input Formats](#3-number-input-formats)
4. [Keyboard Shortcuts](#4-keyboard-shortcuts)
5. [The Convert Tab](#5-the-convert-tab)
6. [Conversion Categories](#6-conversion-categories)
7. [Advanced Topics](#7-advanced-topics)
8. [History Panel](#8-history-panel)
9. [Theme & Appearance](#9-theme--appearance)
10. [How Base‑60 Works](#10-how-base60-works)
11. [Troubleshooting](#11-troubleshooting)
12. [Technical Details](#12-technical-details)

---

## 1. Getting Started

### 1.1 What is this?

The **Babylonian Calculator** is a working calculator that counts in **base 60** (sexagesimal) — the number system used in Mesopotamia about 4,000 years ago, and still living on today inside our clocks (`60 minutes`, `60 seconds`) and geometry (`360°`). Every number you type is echoed as real **cuneiform** glyphs, rendered either with your device's Unicode cuneiform font or with built-in vector wedge art.

It is also a fully capable scientific calculator and a 12-category unit converter (including live crypto, stock, and currency prices).

### 1.2 Opening it

1. Unzip the file if needed.
2. Double-click **`SexagesimalCalculator.html`** — it opens in your default browser.
3. That's it. There is no installation, no server, and no internet requirement for calculating. Internet is only used to refresh exchange rates in the Convert tab.

> **Tip:** You can keep the HTML file anywhere (Desktop, USB stick, email attachment). Everything is contained in that single file.

### 1.3 Your first calculation (60-second tour)

1. Tap the big gold digit keys — notice each key shows a cuneiform glyph plus its value.
2. Press `=`. The result appears in gold, and the top strip shows your number drawn in cuneiform wedges.
3. Press the **`94`** button in the side rail — watch the result cycle through four notations:
   `94` (decimal) → `1;34` (base-60) → `°′″` (degrees) → `h m s` (time).
4. Open the **Convert** tab, type an amount on the same digit pad, pick two units, done.

---

## 2. The Calculator Tab

The main screen is divided into a **display**, three **keypads**, an **equals button**, and a small **toggle rail**.

### 2.1 The Display (top area)

| Element | What it does |
|---|---|
| **Cuneiform echo** | Live rendering of the number currently being typed, in authentic wedge glyphs. Long numbers automatically shrink (normal → compact → tiny) so they always fit. |
| **Expression line** | Shows the exact text of your expression, e.g. `(3+4)^2`. When empty it hints: *"type or tap cuneiform digits"*. |
| **Result line** | Gold-colored result after pressing `=`. |
| **Copy button** | One click copies the displayed result to the clipboard. The icon flashes green with a checkmark (~1.2 s) to confirm. |

### 2.2 The Digit Pad — how place-value tapping works

The large grid holds **60 keys**: every possible base-60 digit from **1 to 59**, plus a special **zero key**.

Each key shows:

- the **cuneiform glyph(s)** for that digit, and
- a small **decimal label** underneath (e.g. the key showing `𒐕𒌋𒌋` reads *25*).

**The golden rule:** one tap enters **one whole base-60 place**, left to right.

Example — to enter **1;30,25** (which equals 1.50694…):

1. Tap key `1` → ones place.
2. Press `;` (radix point).
3. Tap key `30` → sixtieths place.
4. Tap key `25` → thirty-six-hundredths place.

You do **not** type "three-zero" for thirty — you tap the single key labeled 30. This mirrors how a Babylonian scribe would have written it: one glyph cluster per place.

**The dashed zero key** represents an *empty place*. The Babylonians had no true zero; they eventually used a slanted-wedge placeholder. Tapping the dashed key inserts such an empty position (e.g. `1,0,30` = one 60² + zero 60s + 30).

Keys whose glyphs need more room (digits with many wedges, like 45–59) are automatically wider.

### 2.3 The Operator Pad

Ten keys in the lower-right grid:

| Key | Action |
|---|---|
| `C` | Clear everything (red) |
| `⌫` | Delete last character / last entry |
| `;` | Radix point — start fractional places (`2;30` = 2½) |
| `^` | Raise to a power |
| `(` `)` | Grouping parentheses |
| `÷` `×` `−` `+` | The four arithmetic operators |

### 2.4 The Scientific Pad — all 24 keys explained

| Key | What it does | Example |
|---|---|---|
| `( )` | Insert parentheses | `2×(3+4)` |
| `x!` | Factorial (non-negative integers up to 170!) | `5!` → `120` |
| `π` | Constant pi | `2π` |
| `e` | Euler's number | `e^2` |
| `sin cos tan` | Trigonometry — honors the DEG/RAD switch | `sin(30)` → `0.5` in DEG |
| `asin acos atan` | Inverse trigonometry (domain ±1 for asin/acos) | |
| `log` | Base-10 logarithm | `log(1000)` → `3` |
| `ln` | Natural logarithm | `ln(e)` → `1` |
| `exp` | e raised to the given power | `exp(1)` ≈ 2.71828… |
| `√` | Square root (input must be ≥ 0) | `√9` → `3` |
| `Ans` | Inserts the previous result | `Ans×2` |
| `abs` | Absolute value | `abs(0−5)` → `5` |
| `x²` / `x³` | Square / cube. Smart wrap: if your expression already contains operators, the *whole* expression is wrapped in parentheses first | type `3+4`, press `x²` → `(3+4)^2` → `49`; but `9 x²` stays `9^2` |
| `1/x` | Reciprocal — wraps the current expression under `1/…` | `4` then `1/x` → `0.25`; empty input uses Ans |
| `%` | Percent — divides by 100 | `50%` → `0.5`; `200+10%` → `200.1`; chainable: `50%%` → `0.005` |
| `nCr` | Combinations (infix word operator) | `5 nCr 2` → `10` |
| `nPr` | Permutations (infix word operator) | `5 nPr 2` → `20` |
| `mod` | Remainder after division (infix) | `7 mod 3` → `1` |

**Smart wrapping:** the `x²`, `x³`, `1/x` and `%` keys look at what you've typed. A bare number gets a clean suffix (`9^2`); anything compound gets parenthesized (`(3+4)^2`) so precedence can't surprise you. If nothing is entered yet, they operate on **Ans**.

### 2.5 Equals & the Toggle Rail

- **`=`** — the big gold button evaluates the expression. Afterwards the result is copied into the input line, so you can keep calculating with it directly.

The vertical rail beside the pads holds two toggles:

| Button | Meaning |
|---|---|
| **DEG / RAD** | Angle mode for trig functions. **DEG** treats arguments as degrees (`sin(90)=1`), **RAD** as radians (`sin(pi/6)=0.5`). Default is DEG. |
| **`94` ⇄ `1;34` ⇄ `°′″` ⇄ `h m s`** | Result **notation**. Tap repeatedly to cycle how results are displayed (see §3.4). History entries re-render too. |

---

## 3. Number Input Formats

You can mix all of these freely inside one expression — the parser understands each literal on its own terms.

### 3.1 Base-60 with radix point — `1;30,25`

| Symbol | Role |
|---|---|
| `;` | the radix ("decimal") point — separates whole places from fractional places |
| `,` | separator between successive places |

Value = `1 + 30/60 + 25/3600` = **1.50694…**

Fraction-only forms work too: `;30` means **0.5**.

### 3.2 Integer places only — `1,30,25`

If there's no `;`, commas simply separate whole places:
`1,30,25` = 1×60² + 30×60 + 25 = **5,625**. So typing `3600` gives back `1,0,0`.

### 3.3 Angles & time — DMS / HMS

All of these mean twelve and a half degrees (or hours):

| Format | Example |
|---|---|
| Degree signs | `12°30'0"` |
| Letters | `12d30m0s` · `3h25m10s` |

This is exactly why the notation cycler offers `°′″` and `h m s` output styles — minutes and seconds **are** base-60 fractions.

### 3.4 Plain decimals — `1.5`

Ordinary decimal numbers are accepted everywhere. Note: you cannot mix `.` with `,` or `;` inside the same number, and only one `;` is allowed per number. Each place must be within **0–59**.

### 3.5 Choosing the output style

Press the notation button in the rail to cycle:

| Mode label | Style | Example (85.4166…) |
|---|---|---|
| `94` | plain decimal (default) | `85.4166666666667` |
| `1;34` | sexagesimal | `1,25;25` |
| `°′″` | degrees-minutes-seconds | `85°25'0"` |
| `h m s` | hours-minutes-seconds | `85h25m0s` |

Non-terminating base-60 fractions display to **8 places**. Floating-point noise is suppressed — `1÷3×3` shows exactly **1**.

---

## 4. Keyboard Shortcuts

The app is fully keyboard-driven. Modifier combos (Ctrl/Cmd/Alt) are ignored so browser shortcuts keep working. While focus is in a dropdown or text field, keys pass through normally.

### 4.1 Calculator view

| Key | Action |
|---|---|
| `0`–`9` | Type characters literally (**raw mode**) |
| `.` | Decimal point |
| `;` / `,` | Base-60 radix / place separator |
| `°` `'` `"` `′` `″` | DMS/HMS marks, typed verbatim |
| `+` `-` `*` `/` `^` | Add, subtract, multiply, divide, power |
| `(` `)` `!` | Parentheses, factorial |
| `%` | Percent (wraps expression) |
| letters `a`–`z` | Inserted as-is — so you can literally type `sin(`, `pi`, `ans`, `ncr`, `mod` … |
| `Enter` or `=` | Evaluate |
| `Backspace` | Delete last character |
| `Esc` | Clear |

> ⚠️ **Pad vs keyboard:** the on-screen digit pad dials **whole base-60 places** (one tap = one place), but physical keyboard digits are **raw characters** — pressing `3` then `0` yields the two-character chunk `30`. Both paths produce valid numbers; they're just different philosophies (scribe's stylus vs typewriter).

### 4.2 Converter view

| Key | Action |
|---|---|
| `0`–`9` | Dial amount digits |
| `.` `,` `;` | Radix point |
| `Backspace` | Delete |
| `Esc` | Clear amount |

### 4.3 Help overlay

Open with the **`? help`** button. Close with its **close** button, clicking the dark backdrop, or `Esc` / `Enter`.

---

## 5. The Convert Tab

Switch tabs with the two buttons at the top: **Calculator** ⇄ **Convert**.

### 5.1 Layout

```
[ Crypto ] [ Stocks ] [ Currency ] [ Length ] [ Weight ] [ Volume ] …   ← category pills
┌──────────────────────────────────────────────┐
│  AMOUNT (sexagesimal display)      = decimal │
│  [ ; ]  [ ⌫ ]  [ C ]                          │
├──────────────────────────────────────────────┤
│  [ unit ▾ ]   ⇄   [ unit ▾ ]                  │
├──────────────────────────────────────────────┤
│  rate status note (clickable)                 │
│  RESULT ──────────────────────── [copy]       │
│  𒁹𒌋𒌋 cuneiform result                        │
└──────────────────────────────────────────────┘
```

- **Category pills** — tap to switch category. The tab **opens on Crypto** (BTC → USD) by default.
- **Amount field** — dial with the shared digit pad (same place-value rules as the calculator, max 15 characters). The decimal equivalent shows beneath.
- **Unit dropdowns** — every list is sorted alphabetically for fast scanning.
- **⇄** — instantly swaps the two units.
- **Rate note** — the dashed box reports where your price data came from and how old it is; **tap it to force-refresh** all rates.
- **Results** — shown twice: normal text (with a **copy** button) and in cuneiform (fractional places rounded to 4 positions).

### 5.2 Entering amounts

Type `2`, press `;`, type `30` → amount displays `2;30` with `= 2.5` below. Then read/convert as usual. Fractions of units (half a kilo, 1;30 hours) are natural here.

---

## 6. Conversion Categories

Twelve categories. The first three are **live-priced** and need internet for fresh data; everything else works offline forever.

### 6.1 Crypto (default)

| Code | Coin |
|---|---|
| BTC | Bitcoin |
| ETH | Ethereum |
| USDT | Tether |
| BNB | BNB |
| SOL | Solana |
| XRP | XRP |
| ADA | Cardano |
| DOGE | Dogecoin |
| TRX | TRON |
| DOT | Polkadot |

Prices come from the **CoinGecko** simple-price API (batched, quoted in USD). Cross-conversion works both ways: BTC → EUR, or JPY → SOL.

*Data source:* `api.coingecko.com` · *cache:* `sexconv.crypto.v1`

### 6.2 Stocks

25 large-cap US tickers, priced in USD per share:

`AAPL` Apple · `MSFT` Microsoft · `NVDA` NVIDIA · `GOOGL` Alphabet · `AMZN` Amazon · `META` Meta · `AVGO` Broadcom · `TSLA` Tesla · `BRK-B` Berkshire Hathaway · `JPM` JPMorgan Chase · `V` Visa · `LLY` Eli Lilly · `WMT` Walmart · `MA` Mastercard · `XOM` Exxon Mobil · `UNH` UnitedHealth · `JNJ` Johnson & Johnson · `PG` Procter & Gamble · `ORCL` Oracle · `HD` Home Depot · `COST` Costco · `NFLX` Netflix · `ABBV` AbbVie · `BAC` Bank of America · `KO` Coca-Cola

Prices are fetched **on demand** — selecting a ticker triggers its fetch (the result area shows *"Loading the price of TSLA…"* until resolved). Three network routes are tried automatically, each with an 8-second timeout, and one silent retry follows a failure. All 25 tickers always appear in the dropdown regardless of load state.

*Data source:* Yahoo Finance chart API via public CORS relay · *caches:* `sexconv.stocks.v1`, route memory `sexconv.stockroute.v1`

### 6.3 Currency

42 fiat currencies against any other, including some rarely supported ones:

USD, EUR, GBP, JPY, CHF, CNY, CAD, AUD, NZD, INR, SGD, HKD, KRW, THB, IDR, MYR, PHP, VND, PKR, **AED, SAR, EGP, ZAR, NGN, KES, BRL, MXN, ARS, CLP, COP**, SEK, NOK, DKK, PLN, CZK, HUF, RON, TRY, RUB, UAH, ILS, **IRR** (Iranian rial), **IQD** (Iraqi dinar)

Rates are quoted per 1 USD from the **open.er-api.com** feed.

*Caching:* fresh data is kept **~6 hours**; after a failed fetch the app retries after 10 minutes; offline it silently uses the last known rates and says so in the note.

### 6.4 Length

millimeters · centimeters · meters · kilometers · inches · feet · yards · miles

### 6.5 Weight (Mass)

milligrams · grams · kilograms · tonnes (metric) · ounces · pounds · stone

### 6.6 Volume

milliliters · liters · teaspoons (5 ml) · tablespoons (15 ml) · cups (250 ml metric kitchen cup) · fluid ounces · gallons (US)

### 6.7 Temperature

Celsius ⇄ Fahrenheit ⇄ Kelvin, converted correctly through absolute zero (values below −273.15 °C are refused with an error).

### 6.8 Time

seconds · minutes · hours · days · weeks

### 6.9 Speed

meters/second · kilometers/hour · miles/hour · knots · feet/second

### 6.10 Area

mm² · cm² · m² · ares · hectares · km² · in² · ft² · yd² · acres · square miles

### 6.11 Data Storage — the full ladder to Quettabyte

**Decimal (SI) ladder** — each step ×1000:

bit · B · **KB** · MB · GB · TB · **PB · EB · ZB · YB · RB · QB**

…ending at **QB, the quettabyte (10³⁰ bytes)** — the newest SI prefix (adopted 2022). One QB ≈ a trillion terabytes.

**Binary (IEC) ladder** — each step ×1024, exact powers of two:

KiB · MiB · GiB · TiB · PiB · EiB · ZiB · YiB · **RiB · QiB**

…ending at **QiB, the quebibyte (2¹⁰⁰ bytes)**. Conversions between binary units are computed with exact power-of-two factors, so even `1 QiB → RiB = 1024` is bit-exact.

### 6.12 Energy

joules · kilojoules · calories · kilocalories (food Calories) · watt-hours · kilowatt-hours · BTU

---

## 7. Advanced Topics

### 7.1 Operator precedence (what evaluates first)

From loosest binding to tightest:

1. `+ −` addition & subtraction
2. `× ÷ mod` multiplication, division, remainder — plus **implicit multiplication**
3. `nCr nPr` combinations & permutations
4. `^` powers (**right-associative**: `2^3^2` = 2^(3²) = 512) and unary minus (`−2^2` = −4)
5. Postfix `!` factorial and `%` percent
6. Numbers, constants, parentheses, functions

So `5 nCr 2 × 10` groups as `((5 nCr 2) × 10)`? No — combinatorics bind *tighter* than ×: it's `(5 nCr 2)×10` because tier 3 sits above tier 2. And `50%+1` is `(50%)+1` since postfix binds tightest of all.

### 7.2 Implicit multiplication

Two values touching are multiplied automatically: `2pi` → 2π, `(1;30)(2)` → 3, `3(4+5)` → 27.

### 7.3 Word operators & validation

- `nCr`: requires non-negative integers; `k > n` yields 0 by convention; computed with an overflow-safe iterative product (no intermediate gigantic factorials).
- `nPr`: errors if `k > n`.
- `!`: capped at 170! (beyond that even doubles overflow to infinity).
- `mod`: JavaScript remainder semantics — `-7 mod 3` → `-1`.

### 7.4 Function aliases

`arcsin` = `asin`, `arccos` = `acos`, `arctan` = `atan`, `root` = `sqrt`. Domain violations (like `asin(2)` or `sqrt(0−4)`) raise a visible error instead of returning NaN.

### 7.5 Precision model

- Internal math is IEEE-754 double precision.
- Displayed results are cleaned of floating-point dust (`toPrecision(15)` for decimals, 8 places for sexagesimal, 10 significant figures in the converter).
- Very large/small magnitudes switch to scientific notation automatically (calculator: ≥10¹⁵ or <10⁻⁶; money values: ≥10²¹ or <10⁻³⁰).

---

## 8. History Panel

- Every evaluated calculation lands in the right-hand **History** card (most recent first, capped at **60 entries**).
- Each row shows the expression (small) and the result (gold).
- **Click any row** to paste that result into the current input — instant reuse.
- **clear** wipes the list.
- Changing the notation style re-renders all history entries in the new format.
- On narrow screens the history card stacks below the calculator.

---

## 9. Theme & Appearance

- The **sun/moon button** in the header toggles between the default **dark** theme (deep navy + warm gold, tablet-stone aesthetic) and a **light** theme (paper-white + bronze ink).
- Your choice is remembered across sessions (`localStorage` key `sexconv.theme`).
- The layout is responsive: below ~1020 px the side column moves under the calculator, and the keypads reflow for touch.

---

## 10. How Base-60 Works

*A short primer — also found inside the app under “About these numerals.”*

### 10.1 Positional, like ours — but sixty-fold

In base 10 each leftward step multiplies value by ten. In base 60 each step multiplies by **sixty**:

```
1 , 25 ; 25
│   │    └─ twenty-five sixtieths          = 25/60
│   └────── twenty-five units              = 25
└────────── one "sixties" place            = 1×60
                     total                 = 85.4166…
```

Why sixty? It divides evenly by **1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30** — making fractions effortless in a world without calculators. The Sumerians developed it around 3000 BCE; the Old Babylonian period (≈1900–1600 BCE) refined it into the positional system we imitate here.

### 10.2 Only two strokes

Every digit 1–59 is built from just two wedge types, pressed into clay with a cut reed:

- **Vertical wedge** (𒁹-style) = **1** — units stack in rows of three
- **Corner wedge** (𒌋, the *winkelhaken*) = **10**

So **24** = two corner wedges + four verticals; **59** = five corners + nine verticals. The word *cuneiform* itself comes from Latin *cuneus*, "wedge."

### 10.3 The missing zero

Early scribes left a **blank gap** for an empty place — ambiguous at the edges of numbers. Later a **placeholder sign** (two slanted wedges) appeared; it marked emptiness but was never a true number. The dashed key on the digit pad plays this role.

### 10.4 Why your clock speaks Babylonian

Greek astronomers adopted base-60 for angles and time. Latin chroniclers called the first fraction the *pars minuta prima* ("first diminished part") and the second *pars minuta secunda* — hence **minute** and **second**. Every time you read 3:25:10 or 12°34′56″, you are reading base-60 fractions — which is why this calculator offers `°′″` and `h m s` as native output formats.

---

## 11. Troubleshooting

| Symptom | Explanation & fix |
|---|---|
| **Converter shows stale prices** | Rates cache for ~6 h. Tap the dashed **rate note** to force a refresh. Check your connection. |
| **"offline — using last known"** | You're disconnected; the app fell back to its most recent cached rates. Everything else keeps working. |
| **A stock never loads** | Its price is fetched through public CORS relays which occasionally rate-limit. Wait a moment and tap the rate note to refetch; another relay route is tried automatically. |
| **Cuneiform shows as boxes/tofu** | Your device lacks a cuneiform font. No action needed — the app detects this at startup and draws its own vector wedge glyphs instead. |
| **Error text instead of a result** | Usually a domain issue (`asin(2)`, `sqrt(−9)`, division by zero, `nPr` with k>n) or malformed input (two `;` in one number, mixing `.` with `,`). Fix the expression and retry. |
| **Huge numbers show like `1.5e+21`** | Intentional scientific notation beyond 10¹⁵ to keep the display honest. |
| **Want a fresh start** | `Esc` clears the expression; the red `C` does the same; history clears via its **clear** link. |

---

## 12. Technical Details

### 12.1 Packaging

Everything ships in **one HTML file** (~90 KB): markup, CSS, engine, and UI are bundled together. No build step, no server, no external assets, no tracking. Works from a plain `file://` double-click.

Two zip variants are distributed:

| Zip | Contents |
|---|---|
| `SexagesimalCalculator-mac.zip` | App + this README, with a custom Finder icon |
| `SexagesimalCalculator-window.zip` | Same files, clean metadata (for Windows/Linux) |

### 12.2 Data stored on your device

Only preferences and caches, all in `localStorage`:

| Key | Holds |
|---|---|
| `sexconv.theme` | light/dark preference |
| `sexconv.rates.v1` | fiat exchange rates + timestamp |
| `sexconv.crypto.v1` | crypto prices + timestamp |
| `sexconv.stocks.v1` | fetched stock prices + timestamps |
| `sexconv.stockroute.v1` | which relay route worked last |

Clearing site data resets everything; nothing ever leaves your device except the rate queries themselves.

### 12.3 Network endpoints used (Convert tab only)

| Purpose | Endpoint |
|---|---|
| Fiat rates | `open.er-api.com/v6/latest/USD` |
| Crypto prices | `api.coingecko.com/api/v3/simple/price` (batched, vs USD) |
| Stock quotes | Yahoo Finance chart API via CORS relays (`allorigins.win`, `r.jina.ai`) |

All requests are plain GETs with timeouts; failures degrade gracefully to cached values.

### 12.4 Engine quick reference

| Feature | Detail |
|---|---|
| Constants | `pi`, `e`, plus `Ans` (last result) |
| Functions | `sin cos tan asin acos atan sqrt log ln exp abs` (+ aliases `arcsin arccos arctan root`) |
| Operators | `+ − × ÷ ^ ! % mod nCr nPr` with implicit multiplication |
| Literal styles | `1;30,25` · `1,30,25` · `;30` · `1.5` · `12°34'56"` · `12d34m56s` · `3h25m10s` |
| Angle modes | DEG (default) / RAD |
| Output styles | decimal · `1;34` semicolon · `°′″` · `h m s` |
| Glyph rendering | Unicode cuneiform (U+124xx number signs) with automatic SVG fallback |

---

*Documentation generated for Babylonian Calculator v1.1 — the base-60 machine that fits in a single file.*

# Griddle — project notes

Griddle is a stats-guessing game: given a named entry (a player, a country, etc.)
and two numeric stat categories, you drag a marker onto an X/Y grid to guess where
that entry's real numbers land. 5 guesses per batch, scored by distance from the
true point.

This file is for whoever (human or AI) works on the code next. `BACKLOG.md` tracks
*what's planned and why it's sequenced that way*; this file explains *why the current
code looks the way it does*, so decisions don't get silently re-litigated or
accidentally undone.

## Files

- `index.html` / `app.js` / `style.css` — the whole app. No build step, no
  dependencies — deliberately static so it can be served as-is from GitHub Pages.
- `lib/pure.js` — the DOM-free half of the game's logic (pack config, scoring math,
  stat-pair sampling, snark), extracted from `app.js` so it's unit-testable. See
  "Testing" below for why this split exists and why it's structured this way.
- `package.json` / `test/` — exist ONLY for the test suite (`npm test`). They don't
  change how the app itself is built or deployed — GitHub Pages still serves
  `index.html`/`app.js`/`lib/pure.js`/`style.css`/the pack JSON files directly, with
  no install or build step. See "Testing" below.
- `players.json`, `wnba_players.json`, `ncaam_players.json`, `mlb_hitters.json`,
  `nhl_skaters.json`, `football_cfb_players.json`, `football_nfl_players.json`,
  `geo_countries.json`, `us_states.json`, `movies.json`, `space_planets.json`,
  `animals.json`, `music_artists.json`, `presidents.json`, `nba_teams.json`,
  `wnba_teams.json`, `mlb_teams.json`, `nhl_teams.json`, `nfl_teams.json` — one
  JSON array per pack, fetched at load. The two football files each pool QB/RB/WR
  together (one file per league, not per position — see below).
- `archive-v0/` — the original prototype (continuous running-average scoring, no
  batches). Kept for reference, not wired into `index.html`. If you're tempted to
  bring back "session average" style scoring (backlog #17), this is where the old
  approach lived.
- `BACKLOG.md` — planned work, with reasoning for priority/sequencing.

## Testing — why `lib/pure.js` exists, and why the tooling looks the way it does

Backlog #9 ("build an automated test suite, then move to TDD") is done as of the
`lib/pure.js` extraction + `test/` suite. Before this, the whole project had zero
committed tests — every fix this whole session shipped with was verified via
`node --check app.js` (syntax only) plus disposable Playwright scripts written
fresh in a scratchpad each time and thrown away. That's how the corner-click dead
zone, the invalid-forced-stat-pair crash, and the silent zoom bug all *originally*
shipped unnoticed — nothing regression-tested them afterward, so the same class
of bug could've come back with no warning.

**Why `app.js` got split into two files.** `app.js` was one big IIFE with no
exports at all: on load, it immediately calls `document.getElementById(...)`
dozens of times, so requiring it from plain Node throws instantly (no `document`).
None of its logic — not even the fully pure math like `computeScore` or
`pluralize` — was reachable from a test without a real browser. `lib/pure.js`
pulls out everything that doesn't touch the DOM (`PACKS` and both shared
`statDefs` objects, `clamp`/`capitalize`/`pluralize`/`randomKey`/`randomItem`,
`axisRangeForStat`, `eligibleEntries`, `hasEligiblePair`/`pickEligiblePair`,
`pickEntry`, `computeScore`, `packClauseText`/`poolSummary`, `snarkFor`/
`guessSnarkFor`, and the `SNARK_TIERS`/`GUESS_SNARK_TIERS`/`READY_MESSAGES` data)
into one module. `app.js` keeps only DOM refs, event wiring, and orchestration
(`pickRoundContext`, `beginNextGuess`, `finalizeGuess`, `setZoom`, etc.) — it
destructures everything it needs from `window.GriddleLogic` in one line at the
top rather than redefining any of it locally, so there's exactly one copy of
each function.

**Why a hand-rolled UMD wrapper instead of ES modules or a bundler.**
`lib/pure.js` needs to work two ways at once: as a plain `<script>` tag
`index.html` loads before `app.js` (attaching `window.GriddleLogic`), and as a
`require()`-able CommonJS module from `test/`. A tiny UMD wrapper (`typeof module
=== 'object' && module.exports ? ... : root.GriddleLogic = ...`) does both with
zero build step and zero dependencies — the same "no build step, no dependencies"
rule the rest of the app follows (see the top of this file's Files section).
ES modules (`import`/`export`) were deliberately avoided here: `<script
type="module">` would work for the browser half, but `index.html` still couldn't
stay a `file://`-openable, build-step-free static page without a bundler if
`app.js` also needed to import it, and Node's ESM/CJS interop for a plain `.js`
file is one more thing that can silently break — the UMD wrapper sidesteps both
problems for a handful of extra lines.

**Why the parameterized functions in `lib/pure.js` don't match `app.js`'s old
call sites 1:1.** Several extracted functions used to close over `app.js`'s
module-level mutable state instead of taking it as an argument — e.g.
`axisRangeForStat(key)` read the module's `entries`/`STAT_DEFS` directly;
`hasEligiblePair(pack, x, y)` read `dataCache`; `packClauseText()`/`poolSummary()`
read `enabledPacks`/`PACKS`. None of that is reachable from a test that only has
`lib/pure.js` loaded, so each of these now takes that state as an explicit
parameter (`axisRangeForStat(entries, statDefs, key)`,
`hasEligiblePair(dataCache, pack, x, y)`, etc.). `app.js`'s call sites were
updated to pass its own module state in explicitly — this is strictly a
call-site change, not a behavior change.

**Why `node --test` instead of Jest/Vitest/Mocha, and plain `playwright` instead
of `@playwright/test`.** Both choices are the same reasoning as the UMD wrapper:
minimize what has to be installed to verify this project. `node:test` and
`node:assert/strict` ship with Node itself — `test/pure.test.js` needs zero
devDependencies to run. `playwright` (the bare browser-automation library, not
its own opinionated test-runner-plus-reporter framework) is the *only*
devDependency in `package.json`, used the same way the scratchpad verification
scripts used it all session — `chromium.launch()`, drive it, assert with
`node:assert`. One test runner, one dependency, for both unit and integration
tests, rather than mixing two frameworks with two different assertion styles.

**What's unit-tested vs. data-tested vs. integration-tested.** (Counts below
are a snapshot, not a promise to keep updated forever — run `npm test` for
the real current numbers rather than trusting a stale count here; this
section itself was caught stale once already, see the full-review note near
the end of this file.)
`test/pure.test.js` (~60 tests) covers `lib/pure.js` directly — fast, no browser,
this is what a TDD loop should run against for new pure logic. It includes
tier-boundary checks for both snark systems (every tier's own `min` should select
*that* tier, not the one below it — an off-by-one here would be easy to miss by
eye), an exact-formula regression test for `computeScore` (not just "score A >
score B" but the literal expected number, so a change to `SCORE_DECAY_RATE` or
the distance formula gets caught), object-*identity* checks (`===`, not deep-
equality) confirming `HOOPS_STAT_DEFS`/`FOOTBALL_STAT_DEFS`/`TEAM_STAT_DEFS` are
genuinely shared across the packs CLAUDE.md says share them, not accidentally
forked copies, and `pickReferenceEntries`/`pickEligiblePairForEntry` coverage
for the difficulty-mode and forced-entry-pair logic added later.
`test/data.test.js` (95 tests) is a different kind of check entirely — it reads
all 19 pack JSON files directly off disk (no `lib/pure.js` logic involved beyond
using `PACKS`/`eligibleEntries` as the source of truth for what "valid" means)
and verifies structural integrity: no duplicate names within a file, no stray
fields outside that pack's `statDefs`, every present stat field is a finite
number, and the `defaultPair` isn't degenerate (at least one entry has both
stats). This is NOT a fact-checking pass (backlog #13 — pack-data accuracy — is
tracked separately, partially done); it only catches malformed data, which is
exactly the kind of mistake a manual data-entry pass is prone to and a computer
is good at catching for free. `test/integration.test.js` (~24 tests) drives the
real page via Playwright (own local server, spun up in a `before()` hook — no
manual setup needed) and specifically encodes real regressions found through
playtesting: a literal-corner drag, an invalid forced debug stat pair, the
Kitchen Prep badge and its `?debug=1` gate, zoom auto-recentering,
pack-toggle-mid-batch not resetting the round, the last-active-pack guard,
"Copy My Batch" actually writing to the clipboard, "lock this stat pair"
actually holding for a whole batch, a failed `setPointerCapture` not stranding
a guess, a pinch-zoom gesture ending one finger at a time not submitting a
stale guess, the round-summary scrolling into view (and back to top on a new
batch), and axis labels not overflowing a narrow phone's viewport. These are
the bugs that *should* have been caught automatically the first time; now they
are.

**Gotcha if you add a clipboard-related test:** reading back `navigator.clipboard
.readText()` after a `writeText()` round-trip normalizes `\n` to `\r\n` on
Windows — that's the OS clipboard doing it, not `app.js`, and not something worth
working around in the app itself. Normalize line endings in the test's assertion
(`clipboardText.replace(/\r\n/g, '\n')`) rather than chasing it as a bug.

**Going forward, new pure logic should be written test-first.** Add the test to
`test/pure.test.js` (it'll fail, since `lib/pure.js` doesn't have the function
yet), then implement in `lib/pure.js` until it passes. DOM-wiring changes in
`app.js` are harder to do strictly test-first (integration tests are slower and
coarser-grained), but should still get an integration test added for any new
user-facing interaction, not just a scratchpad script that gets thrown away.

## Data schema — why it's shaped this way

Every stat category is stored as a plain number sized so that `Math.floor`/`Math.ceil`
on the pool's min/max produces a *useful* axis range. This is the one rule that
explains several otherwise-odd-looking numbers in the data:

- **Rate stats that are naturally 0–1 (shooting/batting percentages) are stored as
  whole numbers, not decimals.** `fg_pct: 47.1`, not `0.471`. `avg: 305` (baseball's
  ".305"), not `0.305`. `literacy_pct: 99.0` (countries), same reasoning. If these
  were stored as decimals, `axisRangeForStat` would floor/ceil them to a 0–1 range
  and every entry would land in the same tiny sliver of the grid.
- **NBA per-game stats (pts, reb, ast, ...) are career *per-game averages*, not
  single-season snapshots.** This was a V1 decision so the pool doesn't need
  refreshing every season and so a player's number doesn't swing based on which
  season happened to get picked.
- **Sports stat pools mix rate stats (per-game/percentage averages) with counting
  stats (career totals), on purpose.** MLB shipped with this mix from the start
  (AVG/OBP/SLG are rates, HR/RBI/SB are career totals, because that's how baseball
  fans actually talk about them — "714 home runs," not "34.2 HR/season"). NBA
  originally shipped as *all* rate stats — a real gap, not a deliberate choice, fixed
  by adding `games`/`career_pts`/`career_reb`/`career_ast`. Two reasons this matters
  beyond variety: (1) a stat pool that's 100% per-game rates produces
  oddly-similar-looking axes guess after guess; mixing in career totals gives
  genuinely different-shaped rounds. (2) it mirrors how fans actually discuss each
  sport. **When adding a new sports pack, include both kinds of stat from the
  start** — retrofitting counting stats onto an existing large pool (as happened for
  NBA) means re-researching the entire roster instead of just the new additions.
  **This rule is sports-specific and doesn't transfer to every pack.** The
  `geo_countries` pack has no rate-vs-counting split at all — population, area, GDP
  per capita, etc. are all snapshot-in-time facts about a country, not something a
  country does "per game" or accumulates "over a career." Don't force a rate/
  counting split onto a pack where the underlying domain has no such distinction;
  ask what the domain's numbers are actually like before reusing a sports pattern.
- **Fields are omitted (not zeroed) when the underlying stat wasn't tracked in a
  player's era**, rather than guessing or defaulting to 0 (which would be a fabricated
  data point, not a missing one). Concretely for NBA: steals/blocks weren't official
  stats before 1973-74, turnovers weren't tracked before 1977-78, and the three-point
  line didn't exist before 1979-80. For NHL: individual shots-on-goal (and shooting %)
  weren't reliably tracked before 1959-60. For NCAA men's basketball: steals/blocks/
  turnovers weren't official before 1985-86, and the 3-point line didn't exist before
  1986-87 — researching `ncaam_players.json` also turned up two fields the omission
  rule hadn't anticipated (some pre-1986 players have no recorded `ast` or `mpg` at
  all). `eligibleEntries()` filters on `Number.isFinite`, so a missing key correctly
  removes an entry from any round that needs it, rather than corrupting the axis
  range with a fake 0 — and this is genuinely generic: it coped with the unanticipated
  `ast`/`mpg` gaps with zero code changes, because it doesn't need to know in advance
  which fields might be missing for which pack. **This pattern will keep recurring**
  for era-spanning packs — always ask what didn't exist yet, or wasn't tracked, for
  the earliest/most extreme entries in a new pool. **It looks different for
  non-time-series packs.** `geo_countries` has no "era" to speak of, but it has an
  analogous case: `coastline: 0` for a landlocked country is a *real* value (not a
  gap — don't omit it), whereas an actually-unreliable figure (e.g. North Korea's
  GDP per capita, Cuba's — both driven by non-market currency/reporting distortions)
  genuinely should be omitted. The underlying principle is the same either way: only
  ever omit a field when the real number is unknown/unreliable, never when it's
  legitimately zero or small.
- **`animals.json` has its own version of the era-gap omission pattern: `gestation_days`
  is omitted (not zeroed) for every non-mammal entry** — birds, reptiles, fish, and
  insects/arachnids lay eggs and genuinely have no gestation period, so the field is
  left off those rows entirely rather than faked as 0 or "N/A". This is the same
  principle as NBA's pre-1973-74 steals/blocks gap, just triggered by biology instead
  of a stat-tracking era boundary — a reminder that "was this ever tracked/does this
  concept even apply" is the real question, not "is this pack sports" or "is this pack
  time-series." A byproduct worth knowing: because `gestation_days` only applies to
  a subset of the pool, a round that randomly lands on "Gestation vs. X" will only ever
  surface a mammal as the target (rejection-sampled the same way football's
  position-specific stats are — see `pickEligiblePair()` below). This was expected and
  handled for free by that fix rather than requiring pack-specific code.
- **`animals.json` also spans a much wider numeric range per stat than any prior
  pack** — `weight_kg` alone runs from a honeybee's 0.0001kg to a blue whale's
  150,000kg, roughly nine orders of magnitude (versus, say, country population's
  ~2,800x spread). This is an accepted characteristic of the "animals" domain, not a
  bug to fix: `axisRangeForStat`'s `Math.floor`/`Math.ceil` still produces a valid
  (if extremely wide) axis, and a truly degenerate axis would be a *0–1* range problem
  (the rate-stat-scaling issue described above), not a wide-range problem. No field
  needed splitting or re-scaling to avoid it.

- **`music_artists.json`'s `number_one_hits` field isn't measured on one single chart** —
  it's Billboard Hot 100 #1s for most artists, but Hot Country Songs/Country Airplay
  #1s for country acts (Garth Brooks, Dolly Parton, Johnny Cash, Willie Nelson,
  Shania Twain) and Hot Latin Songs #1s for Latin acts (Luis Miguel, Julio Iglesias,
  Vicente Fernández), since the Hot 100 alone would undercount or misrepresent an
  artist whose career centers on a different chart. This is the same judgment call as
  football's rushing-vs-passing-vs-receiving stats living in one merged `statDefs` —
  the field name is generic ("#1 Hits") but what it measures is picked per-entry to
  be the most representative number for that artist, not a literal single metric
  applied uniformly. No fields are omitted for any artist in this pack (every artist
  has a well-defined sales/hits/awards/career-length figure, unlike the animal or
  sports era-gap cases) — the open question for this pack isn't missing data, it's
  *reliability* of the data that is there.
- **`music_artists.json` is the least-verified pack in the repo.** All five research
  batches that built it hit their WebSearch session budget before running a single
  query, so every figure — sales, chart #1s, Grammy wins, career dates — is drawn
  from trained-knowledge estimates rather than a live-checked source, more
  pervasively than any earlier pack (which each had only partial WebSearch
  interruptions). Backlog item 12 (verify pack-data accuracy) already covers this
  generally, but `music_artists.json` specifically should be first in line for that
  pass before real players start scrutinizing it — "records sold" in particular is
  industry-wide contested/claimed even in the best sources, so treat that field as
  the least trustworthy of the five even after a verification pass.

- **`presidents.json`'s `popular_vote_pct` is omitted for two genuinely different
  reasons, both following the same omit-don't-fake principle.** Washington through
  Monroe (the first 5) predate any nationwide popular-vote tally worth reporting —
  most electors were chosen by state legislatures before 1824, the same
  "didn't exist yet" reasoning as NBA's pre-1973-74 steals/blocks gap. Separately,
  five presidents (John Tyler, Millard Fillmore, Andrew Johnson, Chester A. Arthur,
  Gerald Ford) reached office purely by succession and never won a presidential
  election in their own right — there's no winning election to report a share *from*,
  regardless of era, so the field is omitted for them too. Both cases hit the same
  `Number.isFinite`-driven filtering every other pack's omissions rely on; no special
  code was needed for the second case just because its cause (never won an election)
  differs from the first (election predates the data).
- **Grover Cleveland and Donald Trump each get ONE row, not two, despite serving two
  non-consecutive terms** — their `years_served`, `terms_elected`, and
  `popular_vote_pct` are combined/first-term figures covering their whole career,
  the same way a real person is represented once per file everywhere else in this
  codebase. This is a different situation from the football merge's "(College)"/
  "(NFL)" tagging: that was two *separate, simultaneously-tracked* careers (a person
  who played college ball, then separately played in the NFL) being pooled into one
  file, which is what made the within-file name collision real. Cleveland/Trump are
  one continuous political career with a gap in the middle, told as one data point —
  there was never a duplicate-name risk here to fix.

When adding a new pack/stat, ask "does this need scaling to avoid a degenerate 0–1
axis?", "is there a stat-tracking-era gap I need to omit rather than fake?", and (for
non-sports packs) "does the rate-vs-counting split even apply here?" before wiring up
data.

- **Packs that track identical categories share one `statDefs` object instead of each
  getting a copy.** `HOOPS_STAT_DEFS` covers NBA/WNBA/NCAA men's basketball.
  `FOOTBALL_STAT_DEFS` covers both `football_cfb` and `football_nfl` — one object,
  since both packs pool the same QB+RB+WR stat categories, just for a different
  league's rosters. (This object used to be three separate `QB_STAT_DEFS`/
  `RB_STAT_DEFS`/`WR_STAT_DEFS` objects, back when football was split by position
  instead of by league — see the pack-architecture section below for why it was
  consolidated into one.) If one of these shared objects ever needs to diverge for
  one pack but not another, give that pack its own object at that point — don't
  speculatively split them apart now. `TEAM_STAT_DEFS` covers all 5 team packs
  (`nba_teams`/`wnba_teams`/`mlb_teams`/`nhl_teams`/`nfl_teams`) for a different
  reason than the other two: it's not "same categories, different rosters" like
  football, it's that franchise-level facts (championships, founding year,
  all-time win/loss record, home venue capacity) mean the same thing regardless
  of which sport the team plays — unlike *player* stats, which differ completely
  by sport (there's no `HOOPS_STAT_DEFS`-style overlap between a basketball
  player's PPG and a quarterback's passer rating). Team-level stats turned out to
  be sport-agnostic in a way individual player stats never are.

## Pack architecture — from "sports" to a general framework

The `PACKS` config (defined in `lib/pure.js`, destructured into `app.js`) holds one
entry per pack (`label`, `noun`, `article`, `emoji`, `file`, `defaultPair`,
`statDefs`) pointing at a JSON array of `{name, ...numeric fields}`. This was
originally called `SPORTS` — it was renamed
once a non-sports pack (`geo_countries`) proved the engine never actually needed the
entries to be sports. The core loop's "player" terminology (`pickPlayer()` →
`pickEntry()`, `eligiblePlayers()` → `eligibleEntries()`, the `playerName` field on
`guessResults` → `entryName`, `#player-select` → `#entry-select`) was renamed at the
same time for the same reason — nothing in the loop actually requires the pool to be
people.

- **No two packs' stats are ever plotted on the same axis.** There's no unit in
  common between "Points/Game" and "Batting Average" (or "Points/Game" and
  "Population"), so a "combined" stat pair across packs would be meaningless.
  Instead, "combined mode" means each of the 5 guesses in a batch independently
  rolls which *enabled* pack it draws from, then proceeds exactly like single-pack
  mode for that guess (its own stat pair, its own axis range, its own entry pool).
  `enabledPacks` (a `Set`) is what the header's toggle buttons control — it's
  deliberately allowed to have 1 or many members, never zero (the toggle handler
  blocks deselecting the last active pack).
- **`label` is optional on a `PACKS` entry.** `poolSummary()` and the single-pack
  instructions clause both do `${label} ${noun}` when a label exists (e.g. "NBA
  player") but just `${noun}` when it doesn't (e.g. "country," not "null country").
  Sports packs have a label because "NBA" vs. "WNBA" vs. "NCAA" genuinely
  disambiguates leagues that otherwise share a noun; a domain pack like
  `geo_countries` doesn't need one — there's only one kind of "country" here.
- **Plurals are computed, not just `+ 's'`.** `poolSummary()` originally did
  `noun + 's'`, which produced "85 countrys." `pluralize()` special-cases the
  consonant-+-y case ("country" → "countries") — the one English plural
  irregularity common enough among plausible pack nouns to be worth handling
  generically rather than special-casing per pack.
- **Each `PACKS` entry carries its own grammatical `article` ('a' or 'an').** The
  single-pack instructions text ("You'll be given {article} {label} {noun}'s name")
  can't derive the right article from the label programmatically — NBA/MLB/NHL/NFL
  all happen to start with a letter-name that begins with a vowel sound, so
  hardcoding "an" worked by coincidence until WNBA ("double-u") broke it, producing
  "an WNBA player." Fixed by making `article` an explicit field per pack.
- **When multiple enabled packs don't share a noun, the instructions fall back to
  "an entry," not "a name."** `packClauseText()` first tries the shared noun if every
  enabled pack agrees (e.g. NBA+WNBA+NCAA all say "player"); only when nouns genuinely
  differ (e.g. MLB "hitter" + NHL "skater" + `geo_countries` "country") does it fall
  back to something generic. The obvious-looking generic choice, "a name," reads fine
  on its own but breaks the sentence template ("You'll be given {clause}'s name")
  into "a name's name" — caught by testing the actual rendered sentence, not just the
  clause in isolation. "an entry" doesn't have this problem. The bare-noun fallback
  path also always uses the article "a" — correct for every noun in use today (all
  consonant-sound-first), but would need a real per-noun article lookup if a future
  pack's noun needs "an" (e.g. "element"); there's a comment at the call site.
- **Pack-toggle/Kitchen-Prep-dropdown button text says "Players" for every
  player pack (NBA/WNBA/NCAA/MLB/NHL/CFB/NFL), mirroring "Teams" on the 5 team
  packs — added once team packs existed, since before that there was nothing
  to disambiguate from.** This is UI copy only, in `index.html`'s button/option
  text — the `PACKS` config's own `label` field (`'NBA'`, etc.) is unchanged,
  since that field feeds `packClauseText()`'s generated sentences ("an NBA
  player"), where appending "Players" would double up into "an NBA Players
  player." NCAA's emoji also changed from 🎓 (a graduation cap — reads as
  "cap," not "basketball," when scanning the pack list) to 🏀, matching NBA's —
  intentionally the same icon as NBA rather than a distinct one; the pack
  identity is already disambiguated by the "Players" text and the `label`
  field's "NCAA" in generated sentences, not by the emoji alone.
- **The debug "Kitchen Prep" panel has its own `debugPack`, independent of
  `enabledPacks`.** Forcing a specific stat pair or a specific entry only makes sense
  pinned to one pack (you can't force "Points/Game vs Home Runs"), so the
  practice-pack selector exists so debug overrides stay predictable regardless of
  what real gameplay has toggled on. Its "Player"-labeled entry dropdown is now a
  dynamic label (`updateEntryLabel()`, capitalizing the current debug pack's `noun`
  — "Country," "Quarterback," "Player") rather than a hardcoded word, for the same
  reason the rest of this section exists.
- **Kitchen Prep is gated behind `?debug=1` (backlog #12), not visible by
  default.** The whole point of the panel — force a stat pair, force a specific
  entry, jump to any pack independent of `enabledPacks` — is developer/QA
  tooling; a playtester who idly opens the `<details>` gets confusing controls
  with no explanation of what they do or why the "real" game ignores their pack
  toggles while one is set. There's no server and no real auth on a static
  GitHub Pages site, so this is a visibility gate, not a security boundary — it
  just keeps the panel out of a casual player's way, the same threat model as
  the collapsed-by-default `<details>` it was already inside. Visiting with
  `?debug=1` in the URL sets `localStorage['griddle-debug-unlocked'] = '1'` and
  unhides `.practice-settings`; the unlock persists across reloads so a
  dev/tester doesn't need to keep re-adding the query param. `app.js` checks this
  once at load (`debugUnlocked`) and reuses it in `beginRound()`'s unhide call
  (previously unconditional `practiceSettingsEl.hidden = false`) so starting a
  new batch can't silently re-reveal a locked-out panel.
- **Forcing a specific entry and locking the stat pair are two genuinely
  independent toggles, on purpose** — forcing one entry while letting stat pairs
  keep rotating (e.g. "always give me LeBron, but vary the stat pair each guess")
  is a real, useful combination, not a bug to prevent. But playtesting found that
  unchecking "lock this stat pair" doesn't clear a forced entry, and nothing in the
  UI showed a forced entry was still active — easy to get stuck re-guessing the
  same person without realizing why. Fixed with a visible reminder, not a behavior
  change: `#forced-entry-badge` (`updateForcedEntryIndicator()` in `app.js`) shows
  a small "forced 🔒" badge next to the entry dropdown whenever it's not set to
  "Random," and hides again the moment it's reset. Selecting "Random" already
  clears the forced state instantly (it always did) — the badge just makes it
  obvious when it hasn't been.
- Every `guessResults` entry stores which pack it came from (not just the stat keys),
  because `STAT_DEFS` is a single mutable module-level binding reassigned each guess
  — by the time the round summary is built, it only reflects the *last* guess's pack.
  Looking up labels via `PACKS[r.pack].statDefs` at render time (rather than relying
  on the ambient `STAT_DEFS`) is what keeps the breakdown/share text correct for
  every guess in a mixed batch, not just the final one.
- **Toggling a pack mid-batch must never reset the in-progress round.** An earlier
  version called a full `resetRoundUI()` from the toggle click handler, which silently
  discarded `guessIndex`/`guessResults` — a player who toggled a pack off after 2
  guesses ended up needing 7 total instead of 5, with no indication anything had been
  reset. The toggle handler now *only* mutates `enabledPacks`; `updatePackUI()` is
  written to leave `#round-progress` alone whenever a round is active (`guessIndex
  !== 0 && !roundOver`), so a toggle only affects which pack the *next* guess draws
  from.
- **Football is split by league (`football_cfb`, `football_nfl`), not by position** —
  each pack pools QB/RB/WR together for that league, rather than three
  position-specific packs per league (the original shape) or six league×position
  packs (an intermediate shape, briefly shipped, that merged college+NFL *per
  position* instead). The by-league split is what a "CFB tab" / "NFL tab" mental
  model actually wants: click NFL, get an NFL player (any position), guessed on
  stats relevant to *that* player. This still costs zero new architecture — it's the
  same insight as the position-groups era, just applied along a different axis of
  the same `PACKS` entries — but it does surface a real correctness issue the
  per-position split never had: **not every stat pair has an eligible entry.**
  Passer Rating (QB-only) vs. Yards per Reception (WR-only) has zero players with
  both fields — no quarterback catches passes, no receiver throws them. The old
  per-position packs never hit this because every entry in a `football_qb` pack
  *was* a quarterback, so every QB stat applied to every entry. Fixed by
  `hasEligiblePair()`/`pickEligiblePair()` (now in `lib/pure.js`, unit-tested —
  see "Testing" above): instead of picking any two
  random stat keys, rounds rejection-sample from the pack's stat keys until landing
  on a pair at least one entry in that pack's pool actually has both fields for
  (bounded at 200 tries, falling back to the first two keys if that somehow never
  succeeds — cheap insurance, not expected to trigger given how the math works out).
  Without this, `pickEntry()`'s eligible pool could come back empty and the crash
  surfaced as `Cannot read properties of undefined (reading 'rush_td')` — the
  round tried to read a stat off a target entry that didn't exist. `pickEntry()`
  also has a one-line defensive fallback (`entries[0]`) for the one remaining case
  this can't rejection-sample around: the Kitchen Prep debug panel's "lock this stat
  pair" checkbox lets a developer force an explicit, potentially-invalid pair
  directly — that's a deliberate user choice, not something to silently override,
  so it's guarded against crashing rather than retried.
- Because football is now split by league rather than merged across leagues, a
  player who played both college and the NFL (Troy Aikman, Ja'Marr Chase, and
  others) simply appears once in `football_cfb_players.json` and once in
  `football_nfl_players.json` — two different files, like Michael Jordan appearing
  in both `players.json` (NBA) and `ncaam_players.json` (NCAA). No name-disambiguation
  tagging is needed for this split (unlike the earlier per-position merge, which
  *did* need "(College)"/"(NFL)" suffixes because it put both leagues' data for the
  same position in one file) — cross-file duplication of the same real person is the
  ordinary, harmless case throughout this codebase; only *within-one-file* duplicate
  names ever need disambiguating.
- **Team statistics (backlog #1: "support guessing team-level stats... as an
  additional mode alongside the existing player-based one") needed zero new
  architecture, same as every content addition before it.** The backlog item's own
  wording assumed team stats would need a separate "mode" — but a team is just
  another named entry with numeric stats, exactly like a player, a country, or a
  president. `nba_teams`/`wnba_teams`/`mlb_teams`/`nhl_teams`/`nfl_teams` are five
  more `PACKS` entries in the same flat toggle list, not a new switch or game
  state. This is the same lesson CLAUDE.md keeps re-learning (position groups,
  then geography, then the football re-split): **check whether the existing pack
  framework already resolves a backlog item's stated blocker before building
  anything new for it.** It usually does.
- **Packs stay in one flat, combinable toggle list — no separate "sports" vs.
  "trivia" mode**, even with team packs added alongside player packs (see below).
  This matches how the backlog itself frames packs (peers, not a hierarchy), and
  the architecture supports it for free. 19 toggle buttons already wrap to
  multiple rows — right at the "~15-20+" count this section used to flag as
  "probably worth a grouping/category UI eventually." Still not solved
  speculatively ahead of time, but worth actually revisiting the next time a pack
  gets added rather than continuing to defer it.

**Sizing note:** `.pack-switch` needs `flex-wrap: wrap` — it didn't originally, which
was fine at 2-5 buttons but started overflowing its container as more packs were
added (19 today). If you add another pack, this is why the buttons wrap to a new
row instead of running off the edge of the screen.

**The pack toggles moved out of the header, into their own collapsed `<details
class="pack-settings">`, below `.controls`.** They used to live directly in
`.app-header`, always expanded, meaning a first-time visitor saw a 14-button wall
of toggles before any actual game content — playtesting a novice persona
specifically flagged this as reading like "a settings screen," not a game. Moving
`.pack-switch` into a `<details>` (same collapsed-by-default pattern as `.practice-
settings`/"Kitchen Prep") after the drag grid and action button means the game
board is the first thing on screen, and pack selection is available but out of the
way. At the time this shipped, `<summary>` showed a live `(N/14 active)` count
directly (`updatePackUI()` sets `packCountSummary.textContent`) so a player
didn't lose visibility into which packs were enabled just because the section
was collapsed. **That count's location has since moved** — the panel was
later renamed `.settings` and consolidated with the difficulty toggle (see the
"Round-completion 'reset' feel, unified Settings..." section), and
`#pack-count-summary` now lives in a "Packs" sub-heading inside the panel body,
not in `<summary>` itself (which just reads "⚙️ Settings"). Unlike the
sports-era header placement, this is a genuinely player-facing setting (not a
debug tool like Kitchen Prep) — it just doesn't need to be the *first* thing
visible.
**`.app`'s `max-width` and `.viewport`'s size cap were both raised** (560px→680px,
and the grid from `min(420px, 88vw)` to `min(600px, 88vw)`) at the same time —
playtesting also found that at wider ("tablet"-ish) viewports the old 560px cap
left most of the screen as dead space with no bigger board to show for it. The
`88vw` factor is unchanged, so phone-width layouts render essentially identically
to before; only the px ceiling moved, so the extra size only kicks in where there's
actually room for it.

## Snark — commentary happens per-guess, not just per-batch

`SNARK_TIERS` (batch-level, judged on the 5000-point total) originally had exactly
one fixed line of text per tier. Two things changed after playtesting, explicitly
modeled on *Dungeon Crawler Carl*'s constantly-narrating, escalating-mockery
"System" voice rather than a single end-of-run report card:

- **Every tier now holds 2-4 candidate lines** (`texts: [...]`), and `snarkFor()`
  picks one at random each time via the shared `randomItem()` helper — so replaying
  several batches at the same skill level doesn't surface the exact same sentence
  every time. The worst tier in particular was rewritten to be genuinely more
  cutting ("The griddle is embarrassed for you") rather than just mildly
  disappointed, matching Carl's tendency to get *more* savage at the low end, not
  less.
- **`GUESS_SNARK_TIERS`/`guessSnarkFor(score)` is a second, separate tier system**
  for a single guess's score (out of 1000), shown immediately in the results panel
  (`#result-snark`) after every guess — not just once at the end of a 5-guess
  batch. This is the core of the DCC-inspired change: the game reacts to every
  action, not just the final tally, the same way Carl's announcer never goes
  quiet between events. It intentionally has its own shorter, punchier copy
  (`"🎯 Nailed it!"`, `"Did you even look at the board?"`) rather than reusing
  `SNARK_TIERS`' longer batch-level lines, since it needs to read at a glance
  immediately after a single guess, not as a batch-ending summary.

`READY_MESSAGES` (the idle "Order up:" text shown once data finishes loading,
before the first guess of a session) got the same treatment for the same
reason — it used to be a single hardcoded "Ready when you are!" every time.

## Round lifecycle — the board disappears when "Fully Cooked"

Once the 5th guess is scored, `finalizeGuess()` hides `.target-panel`, `.axis-grid`
(the waffle board), `.legend`, and `.controls`, so `#round-summary` ("Fresh Off the
Griddle") becomes the only thing on screen besides the header — the board has no
reason to stay visible once there's nothing left to guess, and leaving it up
competed with the summary for attention. `beginRound()` un-hides all of them again
when a new batch starts.

**Gotcha if you touch this:** setting `.hidden = true` in JS only works if nothing in
`style.css` sets an explicit `display` on that element — the browser's default
`[hidden] { display: none }` rule loses to an author-stylesheet rule of equal
specificity (a plain class selector) later in the cascade. `.axis-grid`, `.controls`,
and `.legend` all declare `display: grid`/`display: flex`, so hiding them silently did
nothing until `style.css` got an explicit `.axis-grid[hidden], .controls[hidden],
.legend[hidden] { display: none; }` override. `.target-panel` never needed this
because it doesn't set `display` itself. If you add a new element to this hide/show
list, check whether its selector sets `display` before assuming `.hidden = true`
will work.

**`.practice-settings` (the "Kitchen Prep" debug panel) is deliberately excluded
from this hide list**, unlike the sports-era version of this feature. A round of
playtesting found that hiding it at round-summary time meant a Kitchen Prep user
had no way to adjust debug settings (force a different stat pair, switch practice
pack, etc.) between batches — clicking "Cook Another Batch" un-hides everything
*and* immediately starts guess 1 in the same call (`beginRound()` calls
`beginNextGuess()` synchronously), so the panel would reappear only after the next
batch's first guess had already locked in whatever settings were left over from
before. Leaving `.practice-settings` visible through the round-summary gives a
debug user a window to change settings before starting the next batch. This
doesn't conflict with the "only the summary matters" intent behind hiding the
other four elements — Kitchen Prep is a debug drawer, not part of the board being
guessed on, so it was never really part of that visual-competition problem.

## Drag-to-guess grid — pointer events live on `.viewport`, not `#grid-svg`

The drag/pinch pointer listeners (`pointerdown`/`pointermove`/`pointerup`/
`pointercancel`) are attached to `#viewport` (the bordered, rounded, scrollable
container), not `#grid-svg` (the SVG element itself) — this looks backwards since
the SVG is what actually renders the grid, but it's the correct binding.

**Why:** `.viewport` has `border-radius: 16px` plus `overflow: auto`, which clips
its children (including `#grid-svg`) to the rounded rectangle shape — and that clip
also governs hit-testing, not just painting. A pointerdown at the *literal* square
corner of the SVG's bounding box (e.g. the exact top-left pixel) lands inside the
region `.viewport` has visually rounded away, so the browser's hit-test resolves
that point to `.viewport` itself, not to the (clipped-away-there) SVG or any of its
children. When the listener lived on `#grid-svg`, a guess dragged to a literal grid
corner would silently never fire `pointerdown` at all — no marker, no error, and
the round stuck on "Cooking…" forever, since nothing had started the drag in the
first place. Confirmed via `elementFromPoint()` at the exact corner pixel: it
resolved to `viewport`, not `grid-svg` or any gridline. Moving the listeners up to
`.viewport` fixes this for free, because `clientToData()` already reads
`svg.getBoundingClientRect()` (not `evt.target`) to convert a click to a data
point, and already clamps the result to the axis min/max — so it doesn't matter
which specific element within `.viewport` actually received the pointer event.
`touch-action` moved from `#grid-svg` (`none`) to `.viewport` (also `none`, replacing
its old `pan-x pan-y`) to match — the corner dead-zone was also a place native touch
panning could unexpectedly compete with the custom drag gesture, since `#grid-svg`'s
`touch-action: none` never covered that clipped-away area either.

**The zoom slider's waffle-pattern background is deliberately resynced in
`setZoom()`.** `viewport.style.backgroundSize` is set to `36 * zoomLevel` px
(matching the SVG's own `baseSize * zoomLevel` scaling) every time zoom changes.
Without this, only the SVG grid (gridlines, markers) visibly grew when zooming —
the `.viewport`'s CSS `background-image` waffle texture stayed a fixed 36px tile
regardless of zoom level, so cranking the zoom slider to 4× looked like nothing had
happened even though the underlying grid really had scaled. The waffle texture is
purely decorative and was never wired to the zoom level until this was caught in
playtesting.

**`setZoom()` also re-centers the viewport's scroll position on whatever was
centered before the zoom change.** Pinch-zoom already tracked this itself (the
`pointermove` 'pinch' branch sets `viewport.scrollLeft`/`scrollTop` from the pinch
centroid right after calling `setZoom()`, overriding whatever `setZoom()` set —
no conflict, just redundant-but-harmless for that path). The zoom *slider* had no
such tracking at all: since a range input isn't a two-finger gesture with a
centroid, nothing adjusted scroll when it fired, so zooming in via the slider
could strand whatever you were looking at off-screen with no way back to it short
of manually scrolling. `setZoom()` now computes the current viewport center as a
fraction of the (pre-resize) scrollable content size, then re-applies that same
fraction against the new size — so the visual center of the board stays roughly
fixed regardless of which zoom control triggered the change.

**`pointerdown`'s `setPointerCapture()` call is wrapped in `try`/`catch`, silently
swallowing a failed capture** — a real playtester hit the exact same symptom as
the corner-click dead zone above (stuck on "Cooking…" forever, no marker, no
visible error) but from a different cause. `setPointerCapture` can throw for
pointer-lifecycle reasons outside this app's control (platform/browser quirks
around pointerId timing), and that call sat unguarded *before*
`pointers.set(evt.pointerId, ...)` — so a throw aborted the rest of the handler
and the pointer was never added to the tracking `Map` at all. The drag that
followed then hit every downstream guard that assumes a tracked pointer
(`pointermove`'s `!pointers.has(...)` early-return, `handlePointerEnd`'s
`wasPlacing` check) and silently did nothing, with the exception logged only to
the console — invisible to a player, and with no in-game way to recover short of
reloading (which also throws away the whole batch). Reproduced by monkey-patching
`viewport.setPointerCapture` to throw once and confirming the pre-fix build got
stuck exactly this way; see `test/integration.test.js`'s "a failed pointer
capture does not strand a guess" for the regression test. The fix is deliberately
minimal: catch-and-ignore, since capture is a nice-to-have (keeps receiving
move/up events if the drag leaves `.viewport`'s bounds) and losing it doesn't
break `clientToData()`'s hit-testing math, which never depended on capture
succeeding in the first place.

**Axis min/max are the pool's own extremes, not the real-world record — and
playtesting found this wasn't obvious.** `axisRangeForStat()` floors/ceils across
whatever's in `dataCache[currentPack]` for that guess, so e.g. "Population max"
is the most populous *country Griddle tracks*, not the world's actual most
populous country — correct behavior (there's no other sane way to build a finite
axis from a finite pool), but a playtester read the axis labels as claims about
the real world. First attempt fixed this via the `title` tooltip alone (plus a
matching info-modal sentence) without touching the visible label text —
`.axis-top`/`.axis-bottom`/`.axis-left`/`.axis-right` are short, `white-space:
nowrap`, and `.axis-left`/`.axis-right` render sideways (`writing-mode:
vertical-rl`), so there's no room to append a clarifying clause without either
overflowing or making the vertical labels comically tall. **That wasn't enough**
— the same playtester came back still not seeing any context, because a hover
tooltip is invisible on a phone (no cursor to hover with, and `title` isn't
reliably reachable via touch at all) and an info-modal sentence requires
deliberately tapping the ℹ️ button first. `#axis-note` (`.axis-note` in
`style.css`, `axisNoteEl` in `app.js`) is the actual fix: a short caption below
the legend, always visible with no interaction required, set alongside the axis
labels in `beginNextGuess()` ("Ranges shown are the highest/lowest among
{pluralized pack noun} in Griddle's pool — not real-world records"). It's in the
same hide/show list as `.legend` (hidden at round-completion, shown again in
`beginRound()`) for the same reason `.legend`/`.axis-grid`/`.controls` are —
it's contextual to the grid being guessed on, not something to show once the
board's gone. The `title` tooltip and info-modal sentence stay too, as a
secondary/redundant path for desktop users — removing them wouldn't fix anything
new, and they cost nothing to keep.

## Difficulty — Regular (default) plots reference entries, Hard is the original blind guess

Backlog #19 ("Difficulty modes") plus direct playtesting feedback ("the game is
too hard") led to a `difficulty` toggle (`.difficulty-switch`). It originally
lived directly in the header, always visible — that placement is now stale;
see the later "Round-completion 'reset' feel, unified Settings..." section for
why it moved into the collapsed Settings `<details>` alongside pack selection.
**Regular** (default) plots `REFERENCE_COUNT` (5 — bumped from 3, see the
full-project-review section below) other real entries from the
same guess's pack/stat-pair pool on the grid — name only, no stat values — as
visual calibration points. **Hard** is today's original behavior, unchanged:
no reference points, a truly blind guess.

**No scoring change.** Reference entries are a rendering-only aid; a guess is
still scored purely against `target`, exactly as before this feature existed.

**State is session-only** — same precedent as `enabledPacks` (always resets to
"all packs on" on reload) rather than the `localStorage`-persisted precedent
used for the Kitchen Prep unlock (see backlog #12 above). Switching difficulty
mid-batch never resets the round (the same rule this file already establishes
for pack toggles).

**Unlike pack toggles, switching difficulty takes effect immediately on the
guess already in progress, not just the next one — this was the wrong call the
first time and a real playtester hit it.** The first version only re-read
`difficulty` at the top of `beginNextGuess()` (mirroring how
`pickRoundContext()`'s pack choice is re-read every guess), deferring the
effect to the next guess. That's the right call for pack toggles because
`enabledPacks` has no on-screen representation of the *current* guess to leave
stale — but reference markers are already sitting on the grid, visible, when
the toggle is clicked. Clicking "Hard" while 3 dots are on screen and having
them just sit there until the *next* guess reads exactly like a dead button —
reported verbatim as "the Regular/Hard buttons don't work." Fixed by promoting
the raw pool/entry (`currentPool`/`currentEntry` — distinct from `target`,
which is already reshaped into `{x, y, name}` and has lost the object identity
`pickReferenceEntries` excludes by) to module-level state, and adding
`updateReferenceMarkers()` — a shared helper called from both
`beginNextGuess()` (new guess) and the difficulty buttons' click handler
(toggle mid-guess) — so both paths redraw from the same current pool/entry.
The lesson generalizes: "does this setting change something already visible
right now, or only something about the next draw" is the actual question,
not "is this a toggle like the other toggles."

**`pickReferenceEntries(pool, target, count)` lives in `lib/pure.js`**, not
`app.js` — a Fisher-Yates sample of up to `count` entries from `pool` excluding
`target` by reference. Same parameterization philosophy as
`axisRangeForStat`/`hasEligiblePair`: explicit inputs, no closing over `app.js`
module state, so it's reachable from `test/pure.test.js` without a browser. It
takes the *pool* and *target entry*, not `statX`/`statY` — the caller
(`app.js`) already has those in scope and extracts `entry[statX]`/
`entry[statY]` itself, the same way it already does for `target`. Naturally
returns fewer than `count` if the pool doesn't have enough others (e.g. a small
pack) rather than crashing — the same graceful-degradation approach as
`pickEligiblePair`'s bounded-retry-then-fallback.

**Rendering (`renderReferenceMarkers()` in `app.js`) needs no round-completion
cleanup.** `#reference-markers` is a `<g>` inside `#grid-svg`, redrawn via
`updateReferenceMarkers()` from both `beginNextGuess()` (new guess) and the
difficulty toggle (see above) — added to the DOM *before* `#guide-x`/
`#guess-marker`/`#target-marker` so reference dots always render behind those,
never on top. Unlike the guess/target markers (which get explicitly hidden and
reset each guess because they show the *previous* guess's result),
`#grid-svg` itself lives inside `.axis-grid`, which is already hidden wholesale
at round-completion (`gameBoard.hidden = true`) — so reference markers
disappear for free along with the rest of the board; no new entry was needed
in the round-completion hide list. `#reference-markers` gets `pointer-events:
none` in CSS as a defensive measure, though the actual drag listeners already
live on `.viewport`, not any SVG child (see the drag-to-guess section above),
so this doesn't change hit-testing — it just documents intent.

**Each reference label gets a measured background chip, not a fixed-size
one** — entry names vary wildly in length ("LeBron James" vs. "Minnesota
Lynx" vs. "Oklahoma City Thunder"), unlike the guess/target markers, which are
always the same fixed shape. `renderReferenceMarkers()` appends the `<text>`
first, calls `text.getBBox()` (only reliable once the element is actually in
the DOM), then inserts a `<rect>` sized to the measured width — same
measure-then-draw idea as the fixed-size markers, just applied to
variable-width text. The label's `x` is clamped so it doesn't run past the
grid's 0–1000 `viewBox` edges.

## Axis labels — made loud on purpose, and a pre-existing sizing tension that surfaced doing it

Playtesting: the X/Y axis min/max labels (the actual scale a guess is placed
against) read as visually secondary — `.axis-label` was `font-size: 0.8rem;
color: var(--muted);`, no border, no background, easy to skim past. Bumped to
`font-weight: 700`, `color: var(--ink)` (high-contrast, not muted), and a
background+border chip — but only on `.axis-top`/`.axis-bottom`. `.axis-left`/
`.axis-right` (the vertical `writing-mode: vertical-rl` labels) initially kept
the bigger/bolder/brighter text but skipped the chip and used a slightly
smaller `0.9rem` instead of `1rem` — **this was superseded in a later pass**
(see "The X-axis chip reuses a cheaper technique..." further down): left/right
now also get a chip, just built from `box-shadow`+asymmetric padding instead of
`border`, so this paragraph's specific font-size/no-chip claim is historical,
not current — read on for why the split existed at all, then skip to the later
section for what's actually shipped today.

**Why the split:** `.axis-top`/`.axis-bottom` sit in the grid's `1fr` "view"
column, whose width is already capped independently (`max-width: min(600px,
88vw)`) — a chip there costs nothing extra, it's within a budget that's already
accounted for. `.axis-left`/`.axis-right` sit in the grid's `auto` *columns*,
whose width comes directly out of the same horizontal budget `.viewport` (`min(
600px, 88vw)`) is already drawing from on a narrow phone screen, with barely
any slack (this file's "Sizing note" on `.pack-switch` and the `88vw` tuning
history describe the same tight-phone-width constraint). A chip's padding+
border in that direction was enough to push the left label off a narrow
phone's screen entirely.

**This surfaced a pre-existing bug, not a new one.** Measuring
`document.documentElement.scrollWidth` vs. `clientWidth` on a 390px-wide
viewport with the *original* (pre-difficulty-feature, pre-chip) axis CSS still
showed a few px of horizontal overflow — `.axis-left`'s bounding box already
started at a negative `x` before any of this session's changes. `.viewport`'s
`88vw` sizing was tuned (per this file's "Sizing note") without accounting for
the `auto` label columns' own width demand alongside it, on the narrowest
phones. Making the left/right labels bigger unavoidably adds a few more px to
that pre-existing tension (mitigated by the `0.9rem` trim above, but not
eliminated) — full elimination would mean re-deriving the `88vw`/label-column
sizing math together, which is a separate, more invasive fix than "make the
axis labels more noticeable" asked for and risks new regressions in sizing
that was already deliberately tuned. Flagging here rather than silently
shipping it unnoticed; revisit if it ever visibly clips real content (so far
it hasn't — the overhang is sub-pixel-of-content, not a truncated label).

## Pack-data verification pass (2026-08-17) — scoped down from "verify everything," and why it stayed incomplete

Backlog #13 covers all 19 pack files — realistically ~1,000+ entries, thousands of
individual stat values. A full exhaustive check of everything in one pass isn't a
reasonable scope for a single session; this pass deliberately targeted only what
CLAUDE.md/BACKLOG already flagged as highest-risk (Music/Artists, Presidents, the
5 team packs, and the specific suspicious Adrian Dantley stat pair), leaving the
rest of #13 open rather than pretending a shallow full-file skim was equivalent
to real verification.

**Parallel research agents share one WebSearch budget for the whole session, not
one each.** Six agents were launched (one each for Presidents, two Music/Artists
halves, and three team-pack groupings). Several of those agents, on discovering
their assigned batch was too large for one pass, spawned their *own* child agents
to split the work further — a reasonable instinct, but it meant far more than six
agents ended up racing against the same session-wide 200-call WebSearch cap and
a shared API rate limit. Several agents (all of WNBA, all of NHL, all of NFL, one
NBA batch, one MLB batch, most of Music/Artists) got cut off mid-task with zero
usable output once the shared budget ran dry — this is why backlog #13's "done"
list is uneven (Presidents fully checked, Music/Artists only 20/80, some team
packs 0% checked) rather than uniformly partial. Lesson for next time: either cap
subagents from spawning further children for a research fan-out like this, or
budget for it explicitly up front (fewer, larger batches; one agent per pack file
rather than splitting further) — the failure mode isn't bad data, it's silently
incomplete coverage that looks like it was assigned evenly but wasn't.

**A live WebFetch to Wikipedia was used to resolve one flagged uncertainty
directly** (whether the New York Knicks' `championships: 3` legitimately
includes a 2026 title) after the session's WebSearch budget was exhausted —
confirmed real, `en.wikipedia.org/wiki/New_York_Knicks`'s infobox lists 1970/
1973/2026. This is the same pattern as the Adrian Dantley spot-check earlier in
this file: when a specific, narrow fact needs checking, a single targeted
fetch/search from the main loop is often more reliable and far cheaper than
spinning up a whole subagent for it.

**Corrections applied only where confidence was high; genuinely contested
figures were left alone on purpose.** Music-artist sales figures in particular
(Metallica, Michael Jackson, Prince, Cher, Post Malone) are contested
industry-wide even in good sources — swapping the file's number for a
different agent-reported number wouldn't have made the pack more accurate, just
replaced one guess with another. Only fixed: clear miscounts corroborated by a
specific authoritative source (Grammy.com's own award database, a chart
discography page) and sales figures where an artist's own Wikipedia page states
one specific "more than X million" figure the file was clearly off from (not a
range dispute). Metallica's `number_one_hits` was the most clear-cut error in
the whole pass: the file had 6, but Metallica has zero Billboard Hot 100 #1s —
no metal song ever has — so 6 was almost certainly conflating a different chart
(Billboard 200 #1 *albums*, which Metallica does have ~6-7 of) with the
Hot-100-#1-*singles* the field is supposed to measure.

**An unresolved `years_active` methodology question surfaced, and no fixes were
applied for it.** Some pack entries appear to measure `years_active` as
(current or death year) − `debut_year` (e.g. Bruce Springsteen: 2026 − 1973 =
53, matching the file); others reflect the artist's true performing-career span
starting from when they actually began performing/touring, which can predate
their first *recorded* release (`debut_year`) by several years (e.g. Aerosmith:
formed 1970, `debut_year` in the file is 1973 for their first album, and
`years_active`=54 in the file matches the 1970-based span, not a 1973-based
one). Since the pack doesn't consistently pick one definition, "correcting"
individual artists toward whichever span an agent happened to find would make
the pack *less* internally consistent, not more — this needs a deliberate
decision on which definition `years_active` is supposed to mean before touching
it further, not a quiet fix.

## Round-completion "reset" feel, unified Settings, and the X-axis chip (2026-08-17)

**Batch-completion getting an entrance animation + scroll-into-view wasn't
fixing a broken feature — it was fixing an unnoticed one.** A live playtest
(Playwright against the deployed site) confirmed `#round-summary` rendered
correctly with zero console errors when a playtester reported "no recap after
5 rounds" — the actual issue was that the instant, no-transition swap from
board to summary is easy to miss entirely if you're scrolled anywhere but the
very top when the last guess lands. `#round-summary`'s CSS now plays a
`round-summary-in` keyframe (scale+fade) every time, because toggling the
`hidden` attribute is a fresh `display: none` → `block` insertion into the
render tree each time, not a one-shot "first paint" animation. `app.js`'s
`finalizeGuess()` also calls `roundSummary.scrollIntoView(...)` right after
un-hiding it, and `beginRound()` calls `window.scrollTo({top: 0, ...})` — the
same "make the state change undeniable" fix applied symmetrically to both
ends of a batch, not just completion.

**Settings consolidation:** the pack toggles (`<details class="pack-settings">`)
and the difficulty toggle (previously a standalone always-visible
`.difficulty-switch` in the header) are now one `<details class="settings">`
with two `.settings-section`s inside — "make A settings area where people can
choose packs, set difficulty, maybe other things" was explicit about wanting
one consolidated entry point, not the difficulty toggle duplicated in two
places. Collapsed by default, same reasoning this file already documents for
why `.pack-switch` moved out of the header in the first place (game board
first, settings available but out of the way) — difficulty defaulting to
Regular means most players never need to open it anyway. Every button/ID the
JS touches (`.difficulty-btn`, `.pack-btn`, `#pack-count-summary`,
`.pack-switch`) kept its exact class/ID, so `app.js` needed zero changes —
only the wrapping `<details>`/`<summary>` moved. **Kitchen Prep stays a
separate panel, not folded in** — it's gated behind `?debug=1` (backlog #12)
specifically so playtesters don't see debug-only controls; merging it into
the player-facing Settings panel would mean either exposing those controls to
everyone or teaching Settings to conditionally hide part of itself, both
worse than two panels for two different audiences.

**The X-axis (`.axis-left`/`.axis-right`) chip reuses a cheaper technique to
avoid the overflow problem the Y-axis (`.axis-top`/`.axis-bottom`) chip
already ran into — but the first attempt at the cheaper technique still
wasn't cheap enough, caught by re-measuring rather than assuming.** The
previous pass gave top/bottom a `border` + `padding: 4px 10px` chip but
explicitly skipped it for left/right, because `border`+padding there directly
costs horizontal width in the grid's tight "auto" columns on a narrow phone
(see the axis-label section above) — a chip that size pushed the left label
off-screen entirely. `box-shadow: inset 0 0 0 1px var(--accent)` reads as an
outline but, unlike `border`, adds **zero** to the element's layout size — the
right instinct, but the first attempt paired it with a symmetric `padding: 2px
3px` and restored the full `1rem` font, and measuring afterward
(`getBoundingClientRect` on a 390px viewport, same method that caught the
original regression) showed the label had grown from 20px to 27px wide and
was now **visibly clipping actual characters**, not just the harmless few-px
sub-pixel overhang documented elsewhere in this file. The fix that actually
worked: asymmetric `padding: 3px 1px` — nearly all the padding's cost goes into
the *vertical* direction (where these labels have plenty of room, being tall
vertical-rl text blocks), leaving only ~2px of real horizontal cost instead of
~4px, landing at 23px wide with no visible clipping across several different
stat-pair labels of varying length (label string length doesn't affect a
vertical label's horizontal footprint at all — only font metrics do, confirmed
by measuring identical width across four different random guesses). The
general lesson: when a visual treatment needs to fit a genuinely tight layout
dimension, reach for properties that paint without consuming layout space
(`box-shadow`, `outline` with a negative offset, `background`) before reaching
for ones that do (`border`, `padding`, `margin`) — but *re-measure after*,
because "should be cheap" and "is actually cheap enough" are different claims.

## The "no recap" reports were never a bug — they were a missing "drag now" cue

Every prior "I don't see the recap after 5 guesses" report this session turned
out to be something else once actually reproduced (a real pointer-capture bug,
once — see the drag-to-guess section — but otherwise nothing): a screenshot a
playtester sent showed "Guess 5 of 5" with the action button correctly reading
"Cooking…" and the full board still visible — the perfectly normal state
*between* clicking the action button and dragging to place that guess, not a
stuck or broken one. The playtester confirmed they hadn't dragged yet when the
screenshot was taken. The actual gap: nothing on screen said "you still need
to drag" — clicking "Flip It (N/5)" *starts* a guess, it doesn't submit one,
and that two-step shape (click to start, drag to submit) isn't obvious from
the button label alone, especially on the last guess where a player
reasonably expects *something* to happen right after clicking.

Fixed with `#drag-hint`, an SVG `<text>` centered in the grid (`index.html`),
shown by `beginNextGuess()` right when a guess starts and hidden by
`showGuessPreview()` the instant a drag begins (whether via pointerdown-only,
a tap, or a real drag — all of them call `showGuessPreview()`). Gets
`pointer-events: none` for the same reason `#reference-markers` does — it must
never compete with the drag gesture for hit-testing, and the real drag
listeners live on `.viewport` regardless (see the drag-to-guess section).

**The hint's accent-orange fill was illegible against the waffle background on
first pass** — both are warm/orange tones, so the text nearly vanished into
the pattern despite being technically "shown." Fixed with `paint-order:
stroke` plus a thick syrup-colored stroke underneath the fill — a cheap way to
guarantee legibility over a background whose color can't be predicted (the
waffle texture varies by position via its radial gradient), same idea as the
reference-label background chips but implemented as a text outline instead of
a backing rect, since a two-line `<tspan>` block doesn't have one clean
rectangle to size a `getBBox()`-measured backing shape to.

## Full-project review (2026-08-18) — backlog #11/#13/#15

Requested as "a full review," which turned out to mean more than code
correctness: code review, continued pack-data verification, an accessibility
pass, a test-coverage gap analysis, and a CLAUDE.md staleness check, run as
parallel agents/forks. Two real, user-facing bugs surfaced this way that
hadn't been caught by any of the (extensive) manual playtesting earlier in
this same session:

**A pinch-zoom gesture ending one finger at a time silently submitted a stale
guess.** Found by an end-to-end playtest sweep, not by hand-testing — the bug
only manifests with a genuine two-finger gesture where the fingers lift at
different instants (the normal way a pinch ends; both lifting in the exact
same instant essentially never happens on real hardware). `handlePointerEnd()`
transitioned back to `mode = 'placing'` the moment only one finger remained,
but never refreshed `previewData` — a lift of that remaining finger looked
identical to completing a legitimate single-finger drag, and `finalizeGuess()`
used whatever position was recorded from *before the pinch started*. Fixed by
calling `showGuessPreview()` with the remaining pointer's actual current
position at the moment a pinch ends (2→1 pointers), so the guess reflects
where that finger actually is, not stale data. Confirmed via `test/
integration.test.js`'s pinch-zoom regression test, which checks the finalized
guess coordinates land near the *second* finger's position, not the first's.

**`pickEligiblePairForEntry` (added during this same review pass to fix a
different bug — see below) was exported from `lib/pure.js` but never added to
`app.js`'s destructure of `window.GriddleLogic`, throwing `ReferenceError` and
preventing any round from completing whenever a forced entry was in play.**
Also caught by the same playtest sweep, within minutes of the fix landing —
a reminder that adding a function to `lib/pure.js`'s return object and to
`app.js`'s destructure are two separate edits, and it's easy to do one and
forget the other. No test caught this either, since `test/pure.test.js` only
imports `lib/pure.js` directly (`require('../lib/pure.js')`), never through
`app.js`'s destructure — a mismatch there is only visible to something that
actually loads `app.js` in a browser, which is what the integration suite is
for.

**The bug `pickEligiblePairForEntry` itself fixes:** forcing a specific entry
in Kitchen Prep without also checking "lock this stat pair" could silently
swap in a *different* entry than the one forced. `pickRoundContext()`'s
override path used `pickEligiblePair()` (pack-wide: "does *any* entry have
this pair"), not "does *the forced entry specifically* have this pair" — so
on a mixed-position pack like `football_cfb`, forcing a WR and leaving the
pair unlocked could roll a QB-only pair, which the forced WR doesn't have,
causing `pickEntry()` to fall through to a random different entry while
`#forced-entry-badge` kept showing the WR as if it were still in effect.
`pickEligiblePairForEntry(entry, keys, avoid)` mirrors `pickEligiblePair`'s
exact rejection-sampling shape but checks one specific entry's own fields
instead of "any entry in the pack."

**Other findings applied:** `test/server.js`'s path-containment check used a
bare `filePath.startsWith(ROOT)`, which a sibling directory sharing ROOT as a
string prefix (not just a path ancestor) could have bypassed — fixed to check
`ROOT + path.sep`. Pack-toggle buttons weren't disabled during the initial
`Promise.all` fetch, so clicking one before data loaded wrote a "0 loaded"
message to `#round-progress` while `#target-display` still said
"Preheating…" — two adjacent elements telling the player contradictory
things; fixed by disabling `.pack-btn`s for the duration of `loadAllData()`.
`beginNextGuess()`'s four near-identical axis-label `textContent`+`title`
assignments were collapsed into one `setAxisLabel()` helper, since editing 3
of 4 near-duplicate call sites and missing the 4th was a real risk, not a
hypothetical one. Several CSS classes (`.mode-link`, `.custom-target*`,
`.version`, `.session-stats`) had zero references anywhere in `index.html`/
`app.js` — dead code from an earlier UI iteration, removed. `aria-pressed` was
added to the 19 `.pack-btn` toggles (both the static HTML default and
`updatePackUI()`'s live sync) and the `#info-btn`/`.settings summary` touch
targets were grown toward the 44px minimum (`#info-btn` was 28×28, `.settings
summary` was ~18px tall) — backlog #15's accessibility pass. Color contrast
was also checked (computed WCAG ratios for every text/background pairing in
`style.css`) and found already well above the AA minimum everywhere — no
changes needed there, the muted-text-on-dark-background concern backlog #15
originally flagged turned out to be a non-issue once actually measured.

**One finding investigated and deliberately left as-is:** `axisRangeForStat()`
producing `Infinity`/`NaN` when a stat key has zero finite values across a
pack's entries is a real theoretical gap, and is already explicitly
documented and tested as accepted, degenerate-but-non-crashing behavior (see
the "Testing" section above) rather than something to guard against — the
existing test's own comment says "not expected to be hit in real
gameplay... this pins down what happens if that guarantee is ever broken."
The `pickEligiblePairForEntry` fix above closes the one path that could have
made it reachable (a forced debug entry/pair combination), so this is now
better-guarded than it was, without touching a deliberate, already-tested
design decision on a hypothetical that isn't currently reachable.

**Pack-data verification (backlog #13) made further progress but is still
incomplete.** This pass covered all 32 NHL teams (uncovering a systemic
issue — `all_time_wins`/`win_pct` were wrong for at least 11 of 32 teams,
several with suspiciously identical placeholder-looking values across
unrelated franchises like `2300` for both Dallas Stars and St. Louis Blues;
fixed the 11 confirmed teams plus Utah Mammoth, but the remaining ~20 weren't
individually re-verified and the pattern suggests they're worth a dedicated
re-derivation pass, not a spot-check), all 32 NFL teams (a similar systemic
issue in `championships` — the field was counting Super Bowl wins only for
about half the league, silently dropping pre-Super-Bowl-era NFL titles and
pre-merger AFL titles the schema's own definition says should count; ~15
teams fixed), the remaining ~10 NBA teams and all 15 WNBA teams (mostly
`arena_capacity` staleness — post-renovation seating changes the file hadn't
caught up to — plus one real Sacramento Kings `championships` miss, 0 vs. the
correct 1 for their 1951 Rochester Royals title), the remaining 15 MLB teams
(one real `arena_capacity` fix — the Athletics' temporary Sacramento home),
and 60 more music artists (spanning classic rock through hip-hop, pop, and
country/Latin acts — dozens of Grammy-count and #1-hit-count corrections,
several sourced to an artist's own Wikipedia page directly contradicting the
file). Presidents (fully verified previously) and the Adrian Dantley spot-
check remain the only fully-closed-out pieces of #13; Animals and the older
sports-roster packs (players.json, ncaam/cfb/nfl player files, geography,
movies, space, etc.) still haven't been touched by any verification pass.

## Making Regular difficulty easier (2026-08-18) — two cheap levers before a bigger one

A playtester's exact words: "cool, but way too hard." Two low-risk levers were
tried first, in order of how invasive they are, before reaching for a genuinely
new mode:

**`SCORE_DECAY_RATE` softened from 4 to 2.5.** This constant controls how fast
`computeScore()`'s `exp(-rate * dist)` curve falls off — at the old rate, a
guess just 25% of an axis's range off in *each* direction already scored only
~368/1000, which reads as brutal even for a "pretty close" guess. Lowering it
doesn't change what a player *sees* or how they *guess* — same grid, same
reference points — it only changes how forgivingly closeness gets converted to
points. `test/pure.test.js`'s exact-formula regression test already derives
its expected value from `G.SCORE_DECAY_RATE` itself rather than a hardcoded
number, so it didn't need updating — a nice side effect of that test being
written to guard the *formula*, not one specific constant's output.

**`REFERENCE_COUNT` bumped from 3 to 5.** Cheaper than it sounds — `app.js`
and `lib/pure.js`'s `pickReferenceEntries()` already handle "fewer than N
available" gracefully (small-pool packs just show fewer dots, no crash), so
this was a one-line constant change plus updating the couple of places that
hardcoded the old number in prose (the info modal, a CLAUDE.md mention, one
test assertion's range check).

**Deliberately not built yet: an "Easy" tier**, with three candidate mechanics
(revealing reference points' exact stat values — the biggest lever, turning
the guess into interpolating between two known values rather than pure
estimation; a live score preview while dragging, so a guess can be adjusted
before it locks in rather than finding out after; an on-demand per-guess hint
at a small score penalty). All three are real, larger difficulty/UX levers —
but each is new mode/UI work, not a tweak, and the two cheap levers above
hadn't been tried yet when the report came in. Tracked in `BACKLOG.md` as
conditional: build this tier (and pick which mechanic(s)) only if playtesting
still says "too hard" after the softer curve + more reference points ship,
not preemptively.

## Deployment

Static site served by GitHub Pages directly from `main` branch root (no Actions
workflow, no build step) — `https://mattmanne.github.io/griddle`. Pushing to `main`
is the entire deploy process; Pages rebuilds automatically within a minute or two.

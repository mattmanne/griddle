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
- `players.json`, `wnba_players.json`, `ncaam_players.json`, `mlb_hitters.json`,
  `nhl_skaters.json`, `football_qb_players.json`, `football_rb_players.json`,
  `football_wr_players.json`, `geo_countries.json`, `us_states.json`, `movies.json`,
  `space_planets.json` — one JSON array per pack (or per position group, for
  football, which spans both college and pro — see below), fetched at load.
- `archive-v0/` — the original prototype (continuous running-average scoring, no
  batches). Kept for reference, not wired into `index.html`. If you're tempted to
  bring back "session average" style scoring (backlog #15), this is where the old
  approach lived.
- `BACKLOG.md` — planned work, with reasoning for priority/sequencing.

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

When adding a new pack/stat, ask "does this need scaling to avoid a degenerate 0–1
axis?", "is there a stat-tracking-era gap I need to omit rather than fake?", and (for
non-sports packs) "does the rate-vs-counting split even apply here?" before wiring up
data.

- **Packs that track identical categories share one `statDefs` object instead of each
  getting a copy.** `HOOPS_STAT_DEFS` covers NBA/WNBA/NCAA men's basketball.
  `QB_STAT_DEFS`/`RB_STAT_DEFS`/`WR_STAT_DEFS` cover `football_qb`/`football_rb`/
  `football_wr` (these objects predate the college+NFL merge described below — they
  were originally shared *between* a `cfb_x` and an `nfl_x` entry, and are now used
  by a single merged entry each, which is a fine outcome of the same principle:
  identical shape, one object). If one of them ever needs to diverge, give that pack
  its own object at that point — don't speculatively split them apart now.

## Pack architecture — from "sports" to a general framework

`app.js`'s `PACKS` config holds one entry per pack (`label`, `noun`, `article`,
`emoji`, `file`, `defaultPair`, `statDefs`) pointing at a JSON array of
`{name, ...numeric fields}`. This was originally called `SPORTS` — it was renamed
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
- **The debug "Kitchen Prep" panel has its own `debugPack`, independent of
  `enabledPacks`.** Forcing a specific stat pair or a specific entry only makes sense
  pinned to one pack (you can't force "Points/Game vs Home Runs"), so the
  practice-pack selector exists so debug overrides stay predictable regardless of
  what real gameplay has toggled on. Its "Player"-labeled entry dropdown is now a
  dynamic label (`updateEntryLabel()`, capitalizing the current debug pack's `noun`
  — "Country," "Quarterback," "Player") rather than a hardcoded word, for the same
  reason the rest of this section exists. See backlog #11 — this panel is debug-only
  and not yet gated from playtesters.
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
- **Position groups (football's QB/RB/WR) are just more `PACKS` entries, not a new
  sub-feature** — and this same insight is what made adding a non-sports domain like
  geography a rename-and-data-file exercise rather than a rewrite. Backlog item 7
  originally assumed football needed "the position-group feature" as real new
  architecture, because QB/RB/WR stats share almost nothing. But the multi-pack
  toggle system already solved exactly that problem — each position is its own entry
  with its own file and `statDefs`, toggled independently like any other pack.
  **The lesson**: before treating a backlog note's stated blocker as still true,
  check whether something built since then already resolves it.
- **College and pro football were later merged into one pack per position**
  (`football_qb`/`football_rb`/`football_wr`), each pooling both the college and NFL
  rosters together rather than staying six separate toggles (`cfb_qb`+`nfl_qb`,
  etc.). The catch: ~5-13 players per position played both levels and are real
  entries in both source lists (Troy Aikman, Ja'Marr Chase, Barry Sanders, and
  others) — concatenating the arrays as-is would put two rows named "Troy Aikman" in
  one pool with no way to tell them apart (the debug entry-picker in particular would
  only ever resolve to whichever one `Array.prototype.find` hits first). Fixed by
  tagging *only the overlapping names*, and only in the merged file — `Troy Aikman
  (College)` / `Troy Aikman (NFL)` — while every non-overlapping player keeps their
  plain name. This is the correct place to fix it: a merge script run once while
  building the combined JSON files, not a runtime dedup check, since the ambiguity is
  a data-shape fact about these three specific files, not a general property of
  `PACKS` entries. Everywhere else in this codebase, the *same* real person
  legitimately appearing more than once with different (correct) stat lines across
  *different* files (Michael Jordan in both `players.json` and `ncaam_players.json`)
  is still fine and shouldn't be "deduplicated" — the football merge is a narrower
  case where the duplication moved from across-files (harmless) to within-one-file
  (actually ambiguous), which is what made tagging necessary there specifically.
- **Packs stay in one flat, combinable toggle list — no separate "sports" vs.
  "trivia" mode.** This matches how the backlog itself frames packs (peers, not a
  hierarchy), and the architecture supports it for free. Not solved yet, and not
  being designed for speculatively: 12 toggle buttons already wrap to 4 rows: once
  several more non-sports packs exist (~15-20+), a grouping/category UI will likely
  be worth revisiting.

**Sizing note:** `.pack-switch` needs `flex-wrap: wrap` — it didn't originally, which
was fine at 2-5 buttons but started overflowing the header as more packs were added
(12 today). If you add another pack, this is why the buttons wrap to a new row
instead of running off the edge of the screen.

## Round lifecycle — the board disappears when "Fully Cooked"

Once the 5th guess is scored, `finalizeGuess()` hides `.target-panel`, `.axis-grid`
(the waffle board), `.legend`, `.controls`, and `.practice-settings`, so `#round-
summary` ("Fresh Off the Griddle") becomes the only thing on screen besides the
header — the board has no reason to stay visible once there's nothing left to guess,
and leaving it up competed with the summary for attention. `beginRound()` un-hides
all of them again when a new batch starts.

**Gotcha if you touch this:** setting `.hidden = true` in JS only works if nothing in
`style.css` sets an explicit `display` on that element — the browser's default
`[hidden] { display: none }` rule loses to an author-stylesheet rule of equal
specificity (a plain class selector) later in the cascade. `.axis-grid`, `.controls`,
and `.legend` all declare `display: grid`/`display: flex`, so hiding them silently did
nothing until `style.css` got an explicit `.axis-grid[hidden], .controls[hidden],
.legend[hidden] { display: none; }` override. `.target-panel` and `.practice-settings`
never needed this because they don't set `display` themselves. If you add a new
element to this hide/show list, check whether its selector sets `display` before
assuming `.hidden = true` will work.

## Deployment

Static site served by GitHub Pages directly from `main` branch root (no Actions
workflow, no build step) — `https://mattmanne.github.io/griddle`. Pushing to `main`
is the entire deploy process; Pages rebuilds automatically within a minute or two.

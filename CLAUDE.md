# Griddle — project notes

Griddle is a stats-guessing game: given a player's name and two stat categories, the
player drags a marker onto an X/Y grid to guess where that player's real stats land.
5 guesses per batch, scored by distance from the true point.

This file is for whoever (human or AI) works on the code next. `BACKLOG.md` tracks
*what's planned and why it's sequenced that way*; this file explains *why the current
code looks the way it does*, so decisions don't get silently re-litigated or
accidentally undone.

## Files

- `index.html` / `app.js` / `style.css` — the whole app. No build step, no
  dependencies — deliberately static so it can be served as-is from GitHub Pages.
- `players.json`, `mlb_hitters.json` — one JSON array per sport, fetched at load.
- `archive-v0/` — the original prototype (continuous running-average scoring, no
  batches). Kept for reference, not wired into `index.html`. If you're tempted to
  bring back "session average" style scoring (backlog #13), this is where the old
  approach lived.
- `BACKLOG.md` — planned work, with reasoning for priority/sequencing.

## Data schema — why it's shaped this way

Every stat category is stored as a plain number sized so that `Math.floor`/`Math.ceil`
on the pool's min/max produces a *useful* axis range. This is the one rule that
explains several otherwise-odd-looking numbers in the data:

- **Rate stats that are naturally 0–1 (shooting/batting percentages) are stored as
  whole numbers, not decimals.** `fg_pct: 47.1`, not `0.471`. `avg: 305` (baseball's
  ".305"), not `0.305`. If these were stored as decimals, `axisRangeForStat` would
  floor/ceil them to a 0–1 range and every player would land in the same tiny sliver
  of the grid.
- **NBA per-game stats (pts, reb, ast, ...) are career *per-game averages*, not
  single-season snapshots.** This was a V1 decision so the pool doesn't need
  refreshing every season and so a player's number doesn't swing based on which
  season happened to get picked.
- **Every sport's stat pool mixes rate stats (per-game/percentage averages) with
  counting stats (career totals), on purpose.** MLB shipped with this mix from the
  start (AVG/OBP/SLG are rates, HR/RBI/SB are career totals, because that's how
  baseball fans actually talk about them — "714 home runs," not "34.2 HR/season").
  NBA originally shipped as *all* rate stats (pts/reb/ast/... are all per-game
  averages) — a real gap, not a deliberate choice, fixed by adding `games`,
  `career_pts`, `career_reb`, `career_ast` (career totals, all teams combined). Two
  reasons this matters beyond variety: (1) a stat pool that's 100% per-game rates
  produces oddly-similar-looking axes guess after guess (most players cluster in a
  narrow per-game band); mixing in career totals gives genuinely different-shaped
  rounds. (2) it mirrors how fans actually discuss each sport — some numbers are
  naturally "per game," others are naturally "in a career." **When adding a new
  sport, include both kinds of stat from the start** — retrofitting counting stats
  onto an existing 100+-player pool (as happened here for NBA) means re-researching
  the entire roster instead of just the new additions.
- **Fields are omitted (not zeroed) when the underlying stat wasn't tracked in a
  player's era**, rather than guessing or defaulting to 0 (which would be a fabricated
  data point, not a missing one). Concretely for NBA: steals/blocks weren't official
  stats before 1973-74, turnovers weren't tracked before 1977-78, and the three-point
  line didn't exist before 1979-80 — players whose careers predate these (Russell,
  Wilt, Robertson, West, Baylor, Pettit, Cousy) simply don't have those keys.
  `eligiblePlayers()` filters on `Number.isFinite`, so a missing key correctly removes
  a player from any round that needs it, rather than corrupting the axis range with a
  fake 0.

When adding a new sport/stat, ask "does this need scaling to avoid a degenerate
0–1 axis?" and "is there a stat-tracking-era gap I need to omit rather than fake?"
before wiring up data.

## Multi-sport architecture — why per-guess random sport, not merged axes

`app.js`'s `SPORTS` config holds one entry per sport (label, emoji, noun, data file,
default stat pair, and its own `statDefs`). Two things follow from this that aren't
obvious from reading the functions in isolation:

- **NBA and MLB stats are never plotted on the same axis.** There's no unit in common
  between "Points/Game" and "Batting Average," so a "combined" stat pair would be
  meaningless. Instead, "combined mode" means each of the 5 guesses in a batch
  independently rolls which *enabled* sport it draws from, then proceeds exactly like
  single-sport mode for that guess (its own stat pair, its own axis range, its own
  player pool). `enabledSports` (a `Set`) is what the NBA/MLB header buttons toggle —
  it's deliberately allowed to have 1 or many members, never zero (the toggle handler
  blocks deselecting the last active sport).
- **The debug "Kitchen Prep" panel has its own `debugSport`, independent of
  `enabledSports`.** Forcing a specific stat pair or a specific player only makes
  sense pinned to one sport (you can't force "Points/Game vs Home Runs"), so the
  practice-sport selector exists so debug overrides stay predictable regardless of
  what real gameplay has toggled on. See backlog #12 — this panel is debug-only and
  not yet gated from playtesters.
- Every `guessResults` entry stores which sport it came from (not just the stat
  keys), because `STAT_DEFS` is a single mutable module-level binding reassigned each
  guess — by the time the round summary is built, it only reflects the *last* guess's
  sport. Looking up labels via `SPORTS[r.sport].statDefs` at render time (rather than
  relying on the ambient `STAT_DEFS`) is what keeps the breakdown/share text correct
  for every guess in a mixed batch, not just the final one.
- **Toggling a sport mid-batch must never reset the in-progress round.** An earlier
  version called a full `resetRoundUI()` from the toggle click handler, which silently
  discarded `guessIndex`/`guessResults` — a player who toggled MLB off after 2 guesses
  ended up needing 7 total instead of 5, with no indication anything had been reset.
  The toggle handler now *only* mutates `enabledSports`; `updateSportUI()` is written
  to leave `#round-progress` alone whenever a round is active (`guessIndex !== 0 &&
  !roundOver`), so a toggle only affects which sport the *next* guess draws from.

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

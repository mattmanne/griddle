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
- `players.json`, `wnba_players.json`, `ncaam_players.json`, `mlb_hitters.json`,
  `nhl_skaters.json`, `cfb_qb_players.json`, `cfb_rb_players.json`,
  `cfb_wr_players.json`, `nfl_qb_players.json`, `nfl_rb_players.json`,
  `nfl_wr_players.json` — one JSON array per sport (or per position group, for
  football), fetched at load.
- `archive-v0/` — the original prototype (continuous running-average scoring, no
  batches). Kept for reference, not wired into `index.html`. If you're tempted to
  bring back "session average" style scoring (backlog #14), this is where the old
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
  the entire roster instead of just the new additions. NHL was built with this rule
  already in place (Goals/Assists/Points/PIM/Shots per game, plus Games Played and
  career Goals/Assists/Points) — no retrofit needed, confirming it's worth following
  up front rather than fixing after the fact.
- **Fields are omitted (not zeroed) when the underlying stat wasn't tracked in a
  player's era**, rather than guessing or defaulting to 0 (which would be a fabricated
  data point, not a missing one). Concretely for NBA: steals/blocks weren't official
  stats before 1973-74, turnovers weren't tracked before 1977-78, and the three-point
  line didn't exist before 1979-80 — players whose careers predate these (Russell,
  Wilt, Robertson, West, Baylor, Pettit, Cousy) simply don't have those keys. For NHL:
  individual shots-on-goal (and therefore shooting %) weren't reliably tracked before
  1959-60, so `sog`/`sh_pct` are omitted for the handful of skaters whose careers
  predate or straddle that (Howe, Richard, Beliveau, B. Hull, Mahovlich, Mikita). For
  NCAA men's basketball: steals/blocks/turnovers weren't official NCAA stats before
  1985-86, and the 3-point line wasn't adopted nationally until 1986-87, so those
  fields are omitted for the many pre-1986 legends in `ncaam_players.json` (Maravich,
  Walton, Alcindor, Robertson, Baylor, West, Bradley, Carr, Thompson, Bird, Magic,
  Sampson, Ewing, Olajuwon, Jordan). `eligiblePlayers()` filters on `Number.isFinite`,
  so a missing key correctly removes a player from any round that needs it, rather
  than corrupting the axis range with a fake 0. **This pattern will keep recurring**
  — any new sport/era-spanning pool needs the same check: what stat categories didn't
  exist yet, or weren't officially tracked, for the earliest players in the pool?
  **It can also show up in fields you didn't anticipate**: researching
  `ncaam_players.json` turned up several pre-1986 players missing `ast` (assists
  weren't recorded at all at some schools/eras) or `mpg` (minutes weren't kept before
  the shot-clock era) — outside the two fields the omission rule was written for.
  `eligiblePlayers()`'s generic `Number.isFinite` check handled both correctly with
  zero code changes, which is the actual payoff of that design: it doesn't need to
  know in advance which fields might be missing for which sport.

When adding a new sport/stat, ask "does this need scaling to avoid a degenerate
0–1 axis?" and "is there a stat-tracking-era gap I need to omit rather than fake?"
before wiring up data.

- **Sports that track identical categories share one `statDefs` object instead of each
  getting a copy.** `HOOPS_STAT_DEFS` covers NBA/WNBA/NCAA men's basketball.
  `QB_STAT_DEFS`/`RB_STAT_DEFS`/`WR_STAT_DEFS` each cover a college *and* NFL entry
  (`cfb_qb`+`nfl_qb`, etc.) — a college and pro quarterback's stat line has the same
  shape, so `cfb_qb.statDefs === nfl_qb.statDefs` by reference. Duplicating any of
  these would just be more copies to keep in sync by hand. If one of them ever needs
  to diverge (e.g. the NFL adds a stat college doesn't track), give that one sport its
  own object at that point — don't speculatively split them apart now.

## Multi-sport architecture — why per-guess random sport, not merged axes

`app.js`'s `SPORTS` config holds one entry per sport (label, emoji, noun, data file,
default stat pair, and its own `statDefs`). Two things follow from this that aren't
obvious from reading the functions in isolation:

- **No two sports' stats are ever plotted on the same axis.** There's no unit in
  common between "Points/Game" and "Batting Average" (or even between NBA's
  "Points/Game" and NHL's "Points/Game" — different games, different scales), so a
  "combined" stat pair across sports would be meaningless. Instead, "combined mode"
  means each of the 5 guesses in a batch independently rolls which *enabled* sport it
  draws from, then proceeds exactly like single-sport mode for that guess (its own
  stat pair, its own axis range, its own player pool). `enabledSports` (a `Set`) is
  what the header's sport toggle buttons control — it's deliberately allowed to have
  1 or many members, never zero (the toggle handler blocks deselecting the last
  active sport).
- **Each `SPORTS` entry carries its own grammatical `article` ('a' or 'an').** The
  single-sport instructions text ("You'll be given {article} {label} {noun}'s name")
  can't derive the right article from the label programmatically — NBA/MLB/NHL all
  happen to start with a letter-name that begins with a vowel sound ("en," "em," "en"),
  so hardcoding "an" worked by coincidence until WNBA ("double-u") broke it, producing
  "an WNBA player." Fixed by making `article` an explicit field per sport rather than
  guessing from the label — the earlier sports couldn't have taught this lesson since
  NBA/MLB/NHL all happen to be vowel-sound-first.
- **The debug "Kitchen Prep" panel has its own `debugSport`, independent of
  `enabledSports`.** Forcing a specific stat pair or a specific player only makes
  sense pinned to one sport (you can't force "Points/Game vs Home Runs"), so the
  practice-sport selector exists so debug overrides stay predictable regardless of
  what real gameplay has toggled on. See backlog #10 — this panel is debug-only and
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
- **Position groups (college football's QB/RB/WR) are just more `SPORTS` entries, not
  a new sub-feature.** Backlog item 6 originally assumed college/NFL football needed
  "the position-group feature" as real new architecture, because QB/RB/WR stats share
  almost nothing (you can't plot "Passing Yards" against "Receptions" meaningfully any
  more than you can plot NBA against MLB). But the multi-sport toggle system already
  solves exactly that problem — each position is its own `SPORTS` entry (`cfb_qb`,
  `cfb_rb`, `cfb_wr`) with its own file and `statDefs`, toggled independently like any
  other sport. No position-aware logic was added anywhere; `pickRoundContext()`,
  `eligiblePlayers()`, etc. don't know or care that six of the eleven `SPORTS` entries
  happen to represent two real-world sports (college and pro football) split by
  position. **The lesson**: before treating a backlog note's stated blocker as still
  true, check whether something built since then already resolves it — item 6's
  premise was written before the multi-sport toggle system existed. NFL confirmed the
  prediction directly: adding it after college football was zero new code, just three
  more `SPORTS` entries pointing at the same `QB_STAT_DEFS`/`RB_STAT_DEFS`/
  `WR_STAT_DEFS` objects college football already used.
- **The same real person can legitimately appear once per league they played in.**
  Ja'Marr Chase, CeeDee Lamb, Troy Aikman, and others show up in both a `cfb_*` and
  an `nfl_*` file with different (correct) stat lines — one row is their college
  career, the other their pro career. This isn't a duplicate-data bug to clean up; it's
  the same pattern as Michael Jordan appearing in both `players.json` (NBA) and
  `ncaam_players.json` (UNC) already. Don't "deduplicate" these across files.

**Sizing note:** `.sport-switch` needs `flex-wrap: wrap` — it didn't originally, which
was fine at 2-5 buttons but started overflowing the header once college football added
3 more toggles (8 total) and NFL added 3 more on top of that (11 total). If you add
another sport, this is why the buttons wrap to a new row instead of running off the
edge of the screen.

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

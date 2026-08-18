# Griddle Backlog

1. ~~**Deepen the NBA player pool.**~~ **Done.** Expanded 28 → 108 players spanning 1950s–2020s, all positions, stars and role players (matters because a small pool makes repeat batches predictable/stale). See `CLAUDE.md` for the era-appropriate-fields rule this surfaced (pre-1973-74 steals/blocks, pre-1977-78 turnovers, pre-1979-80 three-point stats don't exist and are omitted rather than faked as 0).
2. ~~**Add MLB (hitters only).**~~ **Done** — and taken further than originally scoped. Added 73 hitters (`mlb_hitters.json`) plus a full multi-sport architecture (`SPORTS` config in `app.js`) rather than a one-time stat-defs swap, because the natural next ask was mixing sports in one batch, not just switching between them. NBA/MLB are now independent multi-select toggles: each of the 5 guesses in a batch randomly draws from whichever sport(s) are enabled, so a single batch can mix leagues. See `CLAUDE.md` for why counting stats (HR/RBI/SB) are career totals while rate stats (AVG/OBP/SLG) are scaled whole numbers. NBA originally launched as *all* rate stats with no counting stats — a gap, not a choice — since fixed by retrofitting `games`/`career_pts`/`career_reb`/`career_ast` onto all 108 players; see the schema rule in `CLAUDE.md` so future sports don't repeat the retrofit.
   - ~~*Later:* add MLB pitchers (ERA, WHIP, K/9, etc.) — separate stat set from hitters.~~ **Done (2026-08-18).** 72 pitchers (`mlb_pitchers.json`), Cy Young through 2026's active staff — `era`/`whip`/`k9`/`wins`/`strikeouts`/`saves`. Existing "MLB Players" button renamed to "MLB Hitters" now that there are two MLB player packs to disambiguate. See `CLAUDE.md` for why `era`/`whip`/`k9` stay plain decimals (unlike batting average) rather than getting the whole-number scaling treatment.
3. ~~**Add NHL (skaters only).**~~ **Done.** Added 75 skaters (`nhl_skaters.json`) spanning Original Six-era legends through current stars, plus a handful of enforcers (McSorley, Probert, Domi, Laraque) for the same low-points/high-PIM stat variety Rodman/Wallace give the NBA pool. Shipped with the rate+counting mix from day one (Goals/Assists/Points/PIM/Shots per game, plus Games Played and career Goals/Assists/Points) — no retrofit needed this time. Shots-on-goal/shooting % are omitted for the 6 players whose careers predate reliable individual shot tracking (pre-1959-60), same reasoning as NBA's pre-1973-74 steals/blocks gap.
   - *Later:* add NHL goalies (save %, GAA, shutouts) — separate stat set from skaters.
4. ~~**Add WNBA.**~~ **Done.** Added 75 players (`wnba_players.json`) spanning the league's 1997 founding through current rookies (Clark, Reese, Cardoso), reusing NBA's exact `statDefs` object (`HOOPS_STAT_DEFS` in `app.js`) since the schema is identical — a true near-direct port, no retrofit or era-omission needed (WNBA has tracked steals/blocks/turnovers/3PT since day one). Surfaced one real bug: the "an {sport} {noun}" instructions text was hardcoded with "an", which is wrong for WNBA ("a WNBA player," not "an WNBA player" — W's letter-name starts with a consonant sound). Fixed by giving each sport an explicit `article` field rather than guessing grammar from the label.
5. ~~**Add college basketball (men's).**~~ **Done.** Added 75 NCAA D1 players (`ncaam_players.json`) spanning 1950s legends through current one-and-dones, reusing `HOOPS_STAT_DEFS`. Scoped to men's only for this pass — see item 18. Surfaced a *third* instance of the era-tracking-gap pattern from `CLAUDE.md`: the NCAA didn't officially track steals/blocks/turnovers until 1985-86, or adopt the 3-point line until 1986-87, so those fields are omitted for players whose careers predate them (most of the 1950s-80s batch). Also turned up two gaps the omission rule hadn't anticipated — some pre-1986 players have no recorded `ast` (assists weren't tracked at all at some schools/eras) or `mpg` (minutes not recorded pre-shot-clock-era) — handled the same way, by omitting rather than guessing, which the existing `Number.isFinite` filtering in `eligiblePlayers()` already coped with correctly with zero code changes needed.
6. ~~**Add college football.**~~ **Done** — scoped to QB, RB, and WR (skill positions with the richest fan-familiar stats); defense/OL/etc. deferred. The "position-group feature" this item worried about turned out to already exist: the multi-sport toggle system built for item 2 handles it for free — each position group (`cfb_qb`/`cfb_rb`/`cfb_wr`) is just another independent `SPORTS` entry with its own file/stat set, exactly like NBA vs. MLB. No new architecture was needed, which means the reasoning in item 7 below (that NFL needs "a real feature not a data swap") was written before that system existed and is now stale — see `CLAUDE.md`. 25 players per position (`cfb_qb_players.json`/`cfb_rb_players.json`/`cfb_wr_players.json`), 1970s-2020s.
7. ~~**Add NFL.**~~ **Done.** Scoped to the same QB/RB/WR positions as college football, 25 players per position, 1980s legends (Montana, Marino, Jim Brown, Jerry Rice) through current stars (Mahomes, Ja'Marr Chase, Bijan Robinson). Confirmed the item 6 prediction: zero new code, just three more `SPORTS` entries. Also extracted `QB_STAT_DEFS`/`RB_STAT_DEFS`/`WR_STAT_DEFS` as shared objects (same `HOOPS_STAT_DEFS` reuse pattern as WNBA/NCAA) since NFL and college quarterbacks/backs/receivers track identical categories. *Restructured twice since* (both 2026-08-14): first merged into three position-pooling packs (`football_qb`/`football_rb`/`football_wr`, each spanning both college and NFL, with "(College)"/"(NFL)" name tags for the ~5-13 players who played both levels); then, per explicit request, re-split the other way — one pack per **league** instead of per position (`football_cfb`/`football_nfl`, `football_cfb_players.json`/`football_nfl_players.json`), each pooling that league's QB+RB+WR together under one merged `FOOTBALL_STAT_DEFS`. The league split matches the "click NFL, get an NFL player" mental model better, but it surfaced a real bug the position-based split never could: a randomly-picked stat pair can have zero eligible entries (a QB-only stat vs. a WR-only stat — no player has both), which crashed the round. Fixed with `hasEligiblePair()`/`pickEligiblePair()` rejection-sampling in `app.js` — see `CLAUDE.md` for the full writeup. Cross-college/NFL name overlap no longer needs disambiguation tags now that the two leagues are separate files again (same harmless cross-file-duplicate pattern as Michael Jordan in NBA vs. NCAA).

**Reprioritized 2026-08-14** — remaining items, in order:

8. ~~**Other trivia domains beyond sports.**~~ **Done**, and expanded past the original single-pack scope. Renamed the `SPORTS` config to `PACKS` (and the core loop's "player" terminology to generic "entry" terminology — `pickPlayer`→`pickEntry`, etc.) since the engine never actually required sports-shaped data. Shipped seven non-sports packs so far: **Geography — Countries** (`geo_countries.json`, 85 countries: `population`, `area`, `gdp_per_capita`, `coastline`, `life_expectancy`, `literacy_pct`, `elevation`), **Geography — US States** (`us_states.json`, 50 states: `population`, `area`, `median_household_income`, `counties`, `elevation`, `electoral_votes`), **Movies** (`movies.json`, 80 films: `box_office_worldwide`, `budget`, `runtime_minutes`, `imdb_rating`, `rt_score`, `release_year`), **Space — Planets** (`space_planets.json`, 11 bodies spanning the 8 planets plus Pluto/Ceres/Eris: `distance_from_sun`, `diameter`, `moons_count`, `day_length_hours`, `orbital_period_days`, `surface_gravity`), **Animals** (`animals.json`, 80 animals spanning mammals/birds/reptiles/marine life/insects: `top_speed_kmh`, `weight_kg`, `lifespan_years`, `gestation_days`, `length_cm`), **Music/Artists** (`music_artists.json`, 80 artists spanning rock/pop/hip-hop/country/Latin/legacy acts: `records_sold_millions`, `number_one_hits`, `grammy_wins`, `years_active`, `debut_year`), and **U.S. Presidents** (`presidents.json`, all 45 distinct individuals who've served: `age_at_inauguration`, `years_served`, `height_cm`, `terms_elected`, `birth_year`, `popular_vote_pct`). See `CLAUDE.md` for the architecture writeup, including two real bugs the Countries pack surfaced (a `noun + 's'` pluralization bug — "countrys" — and an "a name's name" grammar bug in the mixed-pack instructions text), why the rate-vs-counting-stat schema rule doesn't apply to snapshot domains like these, how Animals' `gestation_days` (omitted for non-mammals — egg-layers don't have one) and Presidents' `popular_vote_pct` (omitted pre-1824 *and* for succession-only presidents who never won an election) both reuse the same eligible-stat-pair rejection sampling built for the football re-split (item 7), why Music/Artists' `number_one_hits` is measured on a different chart per artist (Hot 100 vs. Country vs. Latin) depending on which is actually representative of that artist's career, and why Grover Cleveland/Donald Trump each get one combined row rather than the football-style two-entries-with-name-tags treatment.

   Candidate packs for later (not building yet — for future prioritization):

   | Pack | Why it fits | Notes |
   |---|---|---|
   | Video Games | copies sold, Metacritic, budget, release year | strong fan recognition — up next |
   | Elements (periodic table) | atomic number/mass, melting/boiling point | fixed set of 118, very factual/verifiable |
   | Companies | market cap, employees, founding year, revenue | numbers shift often, needs an "as of" note |
9. ~~**Build an automated test suite, then transition to TDD.**~~ **Done** (the suite; TDD itself is an ongoing discipline, not a one-time deliverable — see below). `app.js` was one large IIFE with no exports, so none of its logic — not even fully pure math — was reachable from a test without a browser. Split the DOM-free half (pack config, scoring math, stat-pair sampling, snark, etc.) out into `lib/pure.js`, a small hand-rolled UMD module that works both as a plain `<script>` tag (`index.html`) and via `require()` (tests) — no bundler, no ES modules, matching the app's existing "no build step, no dependencies" rule. `app.js` now destructures everything it needs from `window.GriddleLogic` instead of keeping its own copies. Added `package.json` + `test/` (Node's built-in `node --test`/`node:assert` for both suites — zero devDependencies needed for unit tests; `playwright`, the bare browser-automation library rather than `@playwright/test`, is the *only* devDependency) — none of this touches how the app itself is built or deployed, GitHub Pages still serves the same static files with no install step. `test/pure.test.js` (50 tests) covers `lib/pure.js`'s functions — including tier-boundary checks for the snark systems, an exact-formula regression test for `computeScore`, and object-identity checks confirming `HOOPS_STAT_DEFS`/`FOOTBALL_STAT_DEFS` are genuinely shared, not copied, across the packs that are supposed to share them; `test/data.test.js` (70 tests) reads all 14 pack JSON files directly off disk and checks structural integrity against each pack's own `statDefs` (no duplicate names within a file, no stray fields, every present stat is a finite number, the `defaultPair` isn't degenerate) — a first automated pass at backlog #13's concerns, though it checks shape, not factual accuracy; `test/integration.test.js` (12 tests) drives the real page via Playwright and specifically encodes the exact regressions found this session (the corner-click dead zone, the invalid-forced-stat-pair crash, the Kitchen Prep badge, zoom auto-recentering, pack-toggle-mid-batch not resetting the round, the last-active-pack guard, Copy My Batch, and "lock this stat pair" actually holding for a full batch) — the bugs that should have been caught automatically the first time. See `CLAUDE.md`'s "Testing" section for the full reasoning, including why the parameterized function signatures in `lib/pure.js` don't match `app.js`'s old call sites 1:1 (they used to close over module-level mutable state; now that state is passed in explicitly). **Going forward:** new pure logic in `lib/pure.js` should be written test-first (add the failing test, then implement); DOM-wiring changes in `app.js` should get an integration test added, not a scratchpad script that gets thrown away.
10. ~~**Team statistics.**~~ **Done.** Turned out to need zero new architecture, same as every content addition before it — a team is just another named entry with numeric stats, exactly like a player or a country. Five new packs (`nba_teams`/`wnba_teams`/`mlb_teams`/`nhl_teams`/`nfl_teams`, 30+15+30+32+32 = 139 teams) sharing one `TEAM_STAT_DEFS` schema (`championships`, `founding_year`, `all_time_wins`, `win_pct`, `arena_capacity`) since franchise-level facts mean the same thing regardless of sport, unlike player stats. No separate "mode" was built — they're five more entries in the same flat, combinable toggle list every other pack already uses. See `CLAUDE.md` for why the backlog item's own "additional mode" framing was stale before this was even built (same lesson as position groups and the football re-split: check whether the existing pack framework already resolves a stated blocker before building anything new for it). Pack-toggle count is now 19, right at the threshold CLAUDE.md previously flagged as worth a grouping/category UI — see new item 24 below.
11. ~~**Full code review of the Griddle codebase.**~~ **Done (2026-08-18, second pass).** A prior pass (see history) surfaced a crash bug and a missing-data gap. This pass ran a broader "full review" — code review, a test-coverage gap analysis, and a CLAUDE.md staleness check as parallel agents, alongside continued work on #13/#15. Two real bugs found and fixed, both only caught by an end-to-end playtest sweep (not manual testing): a pinch-zoom gesture ending one finger at a time could silently submit a stale guess from before the pinch started, and a `ReferenceError` (a function exported from `lib/pure.js` but never added to `app.js`'s destructure) broke every round with a forced Kitchen Prep entry. Also fixed: a Kitchen-Prep-only bug where forcing an entry without locking the stat pair could silently swap in a different entry; a minor path-traversal check weakness in the test server; pack-toggle buttons not being disabled during initial data load; dead CSS cleanup; and an axis-label code-duplication refactor. See `CLAUDE.md`'s "Full-project review" section for the complete writeup. Re-open if more changes accumulate before this becomes a standing habit rather than a periodic catch-up.
12. ~~**Hide or gate the "Kitchen Prep" debug panel.**~~ **Done.** `.practice-settings` is now hidden unless the page is visited with `?debug=1`, which persists the unlock in `localStorage` so a dev doesn't need the query param on every reload. Since this is a static GitHub Pages site with no server/auth, it's a visibility gate for casual playtesters, not a real security boundary — see `CLAUDE.md`. Integration tests that exercise Kitchen Prep now opt into `newPage({ debug: true })`; added a dedicated test confirming the panel is hidden by default, revealed by `?debug=1`, and stays unlocked across a reload.
13. **Verify all pack-data JSON files' stat accuracy/sourcing** before wider release. ~~Partially done (2026-08-17)~~ — a prioritized pass (not the full 19-file sweep) targeted the packs flagged as highest-risk: Music/Artists, Presidents, and the 5 team packs, plus the specific suspicious NBA stat pair. **Adrian Dantley (NBA) MPG-vs-GP spot-check: confirmed correct** (24.3/5.7/3.0/955 games/35.8 MPG all match Basketball-Reference-sourced figures) — the "suspiciously easy" scoring playtesting flagged was an axis-range coincidence, not bad data. **Presidents: fully verified, 40/45 rows confirmed clean**, remaining 5 are low/medium-confidence `height_cm` disputes (Washington, J.Q. Adams, Clinton, Obama, Trump — genuinely contested across sources by 1-2cm/1 inch, not clear errors) left as-is rather than guess-swapping one figure for another. **Music/Artists: only 20 of 80 entries got a full check** before the session's shared WebSearch budget (200 calls, pooled across every agent) ran out; of those 20, 13 confirmed numeric errors were fixed directly in `music_artists.json` (wrong `grammy_wins`/`number_one_hits` counts for Bon Jovi/Mariah Carey/Bowie/Cher/The Weeknd/Post Malone/Maroon 5, Metallica's `number_one_hits` measuring the wrong chart entirely — Metallica has zero Hot 100 #1s, that "6" was conflating Billboard 200 #1 *albums* — and clear-cut `records_sold_millions` gaps for Whitney Houston/Coldplay/OneRepublic/Backstreet Boys sourced to each artist's own Wikipedia-stated figure). Genuinely contested sales figures (Metallica, Michael Jackson, Prince, Cher, Post Malone — real reputable sources disagree by tens of millions) were left alone rather than replacing one guess with another. **The remaining 60 artists are still unverified** — resume with the same per-artist-batch approach once the session's WebSearch budget resets. A `years_active` methodology question surfaced but wasn't resolved: some entries appear to measure from first *recording* (`debut_year`), others from when the artist/band actually started performing/touring (which can predate `debut_year` by several years) — no fixes applied for this field pending a clear ruling on which definition the pack should use. **Team packs: NBA got 2 of ~3 batches** (20 of 30 teams checked, 9 real `arena_capacity` fixes applied — several were stale pre-renovation figures, e.g. Boston's TD Garden capacity increased in a 2019 reconfiguration the file hadn't caught up to; the 10 remaining teams, roughly Oklahoma City through Washington alphabetically, are unverified). **MLB got 1 of ~2 batches** (teams 16-30, 1 fix — Atlanta Braves' arena capacity was off by 24 seats vs. Truist Park's own listed figure; teams 1-15 unverified). **WNBA and NHL got zero completed batches** — both failed outright when the session hit its API limit, so all 15 WNBA teams (including the flagged Toronto Tempo/Portland Fire expansion-team figures) and all 32 NHL teams (including the flagged Utah Mammoth franchise-lineage question) remain exactly as unverified as before this pass. **NFL got zero completed batches** — unverified. See `CLAUDE.md` for the full writeup, including why the "prioritized pass" scope choice was made over a full 19-file sweep.

    **Update (2026-08-18):** the previously-unverified pieces above are now
    covered. **NHL: all 32 teams checked — systemic issue found.**
    `all_time_wins`/`win_pct` were wrong for 11 of 32 teams (Anaheim, Florida,
    Dallas, St. Louis, New Jersey, Washington, Boston, Montreal, Detroit,
    Chicago, NY Rangers, Toronto), several with suspiciously identical
    placeholder-looking values across unrelated franchises (e.g. `2300` for
    both Dallas Stars and St. Louis Blues) — all 11 fixed, plus Utah Mammoth
    (77→81 wins; `founding_year`/`championships` convention was already
    correct — it's a genuine 2024 expansion team, not a continuation of the
    Coyotes lineage, same as the Browns/Ravens 1996 split). The remaining ~20
    teams weren't individually re-verified; given how consistent and large
    the error pattern was, this pack is worth a dedicated re-derivation pass
    from Hockey-Reference rather than trusting the rest, not just a spot-check.
    **NFL: all 32 teams checked — a different systemic issue.** `championships`
    was counting Super Bowl wins only for roughly half the league, dropping
    pre-Super-Bowl-era NFL titles and pre-merger AFL titles the schema's own
    definition says should count (e.g. Green Bay Packers: file said 4, real
    total is 13 including 9 pre-SB NFL titles) — ~15 teams fixed, plus several
    `arena_capacity` fixes (Kansas City's was a digit-transposition typo).
    **NBA/WNBA: all previously-unverified teams checked** — mostly stale
    `arena_capacity` post-renovation figures, plus one real miss (Sacramento
    Kings `championships`: 0 vs. correct 1, for their 1951 Rochester Royals
    title) and a Portland Fire (WNBA) win/loss correction. **MLB: remaining 15
    teams checked** — one fix (Athletics' arena capacity, reflecting their
    temporary Sacramento home). **Music/Artists: all 80 artists now checked**
    — the remaining 60 added dozens more `grammy_wins`/`number_one_hits`
    corrections (Kendrick Lamar, Alicia Keys, Shania Twain, Simon & Garfunkel,
    and many more), several sourced directly to an artist's own Wikipedia page
    contradicting the file. The `years_active` methodology question from the
    prior update is still unresolved. **Not yet touched by any verification
    pass:** `ncaam_players.json`, `football_cfb_players.
    json`, `football_nfl_players.json`,
    `geo_countries.json`, `us_states.json`, `movies.json`, `space_planets.json`,
    `animals.json` — see `CLAUDE.md`'s "Full-project review" section.

    **Update (2026-08-18, `players.json`/NBA):** all 108 NBA players checked —
    the flagship, most-played pack. 108/108 confirmed correct on career-shape
    fields (career-long per-game averages, shooting %s), with a handful of
    fixes: Jerry West's `career_reb` (off by 10 — a data-entry slip, not a
    disagreement), three players missing a real, knowable `three_pct` that had
    been omitted rather than recorded (Robert Parish, Kevin McHale, Buck
    Williams — all three played entirely within the 3-point era, so 0%/26.1%/
    16.7% are real values, not unknowns; Walt Frazier's similar gap was left
    omitted since his career barely overlaps the 3-point line's 1979-80
    introduction and the "correct" value is a near-zero-attempt small sample,
    not a meaningful stat), and two real internal-consistency bugs — Russell
    Westbrook's and Kawhi Leonard's per-game `pts`/`reb` hadn't been
    recalculated after their `career_*`/`games` totals were last updated
    (`career_pts ÷ games` didn't reproduce the file's own stored average).
    **A broader, not-yet-fixed pattern surfaced: 13 active/recently-retired
    players' `games`/`career_*` totals lag their real current numbers by
    roughly a season or more** (Klay Thompson, Draymond Green, DeMar DeRozan,
    Al Horford, Paul George, Jimmy Butler, Kyle Lowry, Devin Booker, Donovan
    Mitchell, Ja Morant, Anthony Edwards, Domantas Sabonis, Jalen Brunson) —
    in two cases (Edwards, Brunson) severe enough to miss a real 10,000-career-
    point milestone. This is different from the small day-to-day snapshot lag
    CLAUDE.md already accepts as fine (per-game rate stats staying accurate
    even as `games`/career totals drift a bit) — these are large enough gaps
    that a full re-verification (not a single-field patch) is warranted before
    trusting them, and the exact replacement numbers weren't independently
    double-checked with high confidence, so no edits were made for these 13
    pending a dedicated follow-up. **This is also a preview of a maintenance
    problem, not just a one-time data-entry problem**: any pack containing
    still-active people/teams will keep drifting every season — see the new
    note in `CLAUDE.md` about this.

    **Update (2026-08-18, `nhl_skaters.json`):** all 75 skaters checked.
    57 confirmed clean (38 long-retired legends with zero issues; 5 active
    players — Kane, Toews, Stamkos, Karlsson, Doughty — already current; 14
    more long-retired). **18 active players had the exact same stale-season
    pattern flagged as a risk in `players.json`'s update above** (Ovechkin,
    Crosby, Malkin, McDavid, MacKinnon, Matthews, Draisaitl, Kucherov,
    Pastrnak, Hedman, Makar, Josi, Panarin, Rantanen, Kaprizov, Marner,
    Marchand, Tavares) — but this time both `games`/`career_*` totals *and*
    the derived per-game rates were fixed, because two independent sources
    (Wikipedia + StatMuse) agreed on every single one, a higher bar than the
    NBA pass's AI-summarized single-source numbers that were deliberately
    left unfixed. Confirms backlog #25 isn't a one-off — every active-roster
    pack checked so far has needed this exact correction.

    **Update (2026-08-18, `mlb_hitters.json`):** all 73 hitters checked — a
    third sport, same pattern, and this time it hit harder than NBA/NHL did.
    56 long-retired legends fully clean. **All 17 currently-active players
    had stale stats — not just counting totals (`hr`/`rbi`/`sb`), but `avg`/
    `obp`/`slg` too**, which the NBA/NHL passes found to be comparatively
    stable season-to-season. All 17 fixed (Trout, Judge, Ohtani, Betts,
    Acuña, Freeman, Soto, Altuve, Machado, Arenado, Goldschmidt, Yelich,
    Harper, Devers, Guerrero Jr., Ramírez, Alvarez) — high confidence, two
    independent sources agreeing on every value, same bar as the NHL fixes.
    **100% of active players checked across all three sports so far (NBA,
    NHL, MLB) needed a correction** — this is no longer a "sometimes"
    pattern, it's the expected default state of any active-roster pack that
    hasn't been touched recently.

    **Update (2026-08-18, `geo_countries.json`):** all 85 countries checked
    (two batches of ~43). 6 population fixes applied, all high/medium-high
    confidence against current Wikipedia infoboxes: Cuba (11.0M to 9.43M — a
    real mass-emigration decline since the 2022 census, not just a stale
    estimate-year drift), Bolivia (12.2M to 11.4M, 2024 census), Paraguay
    (6.84M to 6.46M — file exceeded even the highest current estimate),
    Nigeria (227.9M to 242.7M), Ethiopia (128.7M to 138.9M), DR Congo (105.8M
    to 116.5M) — the latter three are fast-growing countries where a
    ~2023-vintage estimate now lags by 6.5-9.2%; several other high-growth
    countries checked in the same pass (Kenya, Tanzania, South Africa,
    Zambia) turned out fine, so this isn't a uniform "whole file is stale"
    problem, just specific to the highest-growth-rate entries — the same
    "actively-changing entity needs periodic refresh" pattern as sports
    rosters, just for population instead of player stats. Coastline (85/85),
    GDP per capita (all except the flag below), and area were essentially
    clean. Left unfixed as contested/low-confidence: Mexico and Panama
    population (source-dependent, file within or near the plausible range),
    Madagascar population (2.4% gap, low-medium confidence), Egypt
    population (a methodology difference — UN total vs. domestic
    census-agency count — not a staleness error), Romania/Monaco GDP per
    capita, Monaco/Ghana elevation (both have a genuine "which peak counts"
    ambiguity), US area (CIA vs. UN measurement convention), and 9 countries'
    literacy_pct where the comparison source's own cited year was a decade
    or more stale (Saudi Arabia, UAE, Israel, Jordan, Qatar, Iran, Pakistan,
    Malaysia, Nepal) — the file's higher figures are plausibly more
    current, not wrong, but couldn't be independently confirmed via infobox.
    **One flag needs a deliberate decision, not a fix:** Venezuela's
    `gdp_per_capita` ($4,140) matches its standard cited IMF figure, but per
    Wikipedia's own Economy-of-Venezuela article the government has
    documented a history of manipulating economic statistics, and the IMF
    suspended relations with Venezuela from 2019-2026 specifically over data
    reliability — the same non-market-currency/reporting-distortion category
    the schema already uses to justify omitting this field for Cuba and
    North Korea. Not omitted this pass (that's a schema/design change, not a
    factual correction) — worth a deliberate call next time this pack comes
    up.

    **Update (2026-08-18, `us_states.json`):** all 50 states checked (two
    batches of 25). Population, median household income, area, and
    electoral votes were 100% clean across every state — the file was built
    directly from each state's own Wikipedia infobox, which stays
    internally consistent even where a separate aggregate cross-state list
    page (verified stale/rounding-inconsistent for several states, e.g.
    Oklahoma/Tennessee area) would have produced false positives. 6 fixes
    applied: 3 elevation off-by-ones sourced to the specific peak's own
    infobox (Minnesota 2300→2301 ft, Missouri 1770→1772 ft, Michigan 1978→
    1979 ft — Michigan's fix carries a footnote that a 2025 resurvey found
    neighboring Mount Curwood may sit a sub-foot amount higher than Mount
    Arvon, genuinely contested but not yet an official redesignation),
    Connecticut's `counties` (9→8 — CT has never had 9), and Maryland/
    Missouri's `counties` (23→24, 114→115). The Maryland/Missouri fix isn't
    a simple factual error so much as an **internal-consistency catch**:
    Virginia (133 = 95 counties + 38 independent cities) and Nevada (17 = 16
    counties + Carson City) were both already confirmed correct in this same
    pass, and both count independent cities toward the total — Maryland
    (missing Baltimore City) and Missouri (missing St. Louis City) simply
    hadn't been counted the same way as the rest of the file. Same lesson as
    the Westbrook/Kawhi per-game-vs-career-total mismatch in `players.json`:
    a field can be individually plausible and still wrong relative to how
    every *other* row in the same file was built.

    **Update (2026-08-18, `movies.json`):** first non-roster pack checked —
    deliberately picked to get off the "active roster drift" pattern above,
    and it confirmed this pack has a genuinely different risk profile, not
    the same bug in new clothes. All 80 films checked. 10 fixes applied:
    6 IMDb-rating drifts (Titanic 7.9→8.0, Pulp Fiction 8.9→8.8, Independence
    Day 6.9→7.0, Home Alone 7.7→7.8, The Sixth Sense 8.1→8.2, Good Will
    Hunting 8.3→8.4 — the same "drifts slightly as more votes come in"
    behavior the schema already anticipates, just never checked before), 2
    Rotten Tomatoes score corrections (Inception 86→87, Slumdog Millionaire
    92→91), and 2 worldwide-box-office corrections sourced to current
    Wikipedia infoboxes (La La Land $523.1M→$504.6M, Parasite $263.4M→
    $258.1M — both look like they were originally recorded against a
    domestic-heavy or since-revised gross). Several `budget` figures were
    flagged as genuinely contested rather than fixed — Alien, Ghostbusters,
    Good Will Hunting, Saving Private Ryan, Guardians of the Galaxy, Star
    Wars: The Force Awakens, and Mad Max: Fury Road all have real sources
    citing meaningfully different numbers (often "originally estimated" vs.
    "later-disclosed actual cost," e.g. Guardians' publicized $170M vs.
    Disney's own 2015 UK filing showing ~$196M net) — same principle as the
    Presidents' `height_cm` disputes: don't swap one guess for another
    guess. Oppenheimer and Top Gun: Maverick box-office figures and The Wolf
    of Wall Street's runtime were flagged only medium/low confidence (single-
    source WebFetch, no second source to corroborate) and left unfixed. RT
    scores were the most stable field checked — all 80 matched current
    sources with zero discrepancies outside the 2 fixed above.
14. **"Easy" difficulty tier.** Conditional, not scheduled: only build this if playtesting still says the game is too hard after the two cheaper levers shipped 2026-08-18 (`SCORE_DECAY_RATE` softened 4→2.5, `REFERENCE_COUNT` bumped 3→5 — see `CLAUDE.md`). Don't build it preemptively just because it's the next idea on the list; wait for signal that the cheap levers weren't enough. Candidate mechanics for this tier, roughly in order of how big a lever each is:
    - **Reveal reference points' exact stat values**, not just name/position — turns the guess into interpolating between two known values instead of pure estimation. The biggest single lever of the three, and the original idea behind this item.
    - **Live score preview while dragging** — show an estimated score as the marker moves, before the guess locks in, so a player can adjust instead of committing blind. Doesn't change the underlying difficulty of estimating the right spot, but removes the "find out after" anxiety.
    - **On-demand hint** — reveal one axis's rough quartile at a small score penalty, available per-guess rather than a blanket mode change. Keeps some skill/tradeoff in play rather than just handing out free information.
    These don't have to ship together — could pick just one, or layer several, once this tier is actually greenlit.
15. ~~**Accessibility pass.**~~ **Done (2026-08-18).** `aria-pressed` added to all 19 `.pack-btn` toggles (static HTML default + `updatePackUI()`'s live sync) — the gap playtesting originally flagged. Color contrast measured (computed WCAG ratios for every text/background color pairing in `style.css`) and found already well above the AA minimum everywhere (muted-on-dark was ~8:1, nowhere close to a real problem) — the concern turned out to be a non-issue once actually measured, not something needing a fix. Touch targets: `#info-btn` grown from 28×28px to 44×44px (the widely-used minimum), `.settings summary` given padding to grow its ~18px-tall tap area toward the same minimum. See `CLAUDE.md`'s "Full-project review" section.
16. **Soccer — deferred, phased rollout:** start with **EPL**, then **Champions League**, then **World Cup**. Leagues/competitions aren't apples-to-apples (goals/90, competition-level differences), needs a normalization decision first — likely handle each competition as its own pool rather than merging them.
17. **Personal best / score history** via localStorage — V0 had rounds-played/average, dropped in the V1 batch model.
18. **Add women's college basketball.** Deferred from the men's-only pass at item 5 above — same near-direct-port reasoning as WNBA vs. NBA.
19. ~~**Difficulty modes.**~~ **Done** — shipped as a Regular (default) / Hard
    toggle rather than the tighter-ranges/larger-pool/timed-mode ideas
    originally sketched here. Regular plots 3 other real entries from the same
    pool on the grid (name only, no stats) as visual reference points; Hard is
    the original blind guess, unchanged. Driven directly by playtesting ("the
    game is too hard"), not the axis-range/pool-size angle this item
    originally floated — those remain open if a *second* difficulty axis is
    wanted later (e.g. Hard could additionally shrink the pool or the axis
    range, on top of dropping reference points). See `CLAUDE.md` for why the
    setting is session-only (same precedent as pack toggles) and why
    `pickReferenceEntries()` lives in `lib/pure.js` rather than `app.js`.
20. **Shareable leaderboard** — right now friends compare scores by manually pasting the copied text; a lightweight shared leaderboard would remove that friction. A 4-persona playtesting round separately floated a "daily griddle" idea (a shared, seeded batch so friends' scores are directly comparable, not just similarly-formatted) — related enough to fold into this item rather than track separately. **Update (2026-08-17): this is now the stated long-term direction, not just a floated idea** — while still in the testing phase, the plan is for Griddle to eventually be a daily game where every player gets the same 5 clues on a given day. Today's per-session fully-random batch (`randomKey`/`pickEligiblePair`'s `Math.random()`) is a deliberate testing-phase placeholder, not a decision to casually revisit later — building the real version means a seeded RNG keyed off the date (so the same day always produces the same 5 guesses for everyone) rather than `Math.random()`, which is a genuinely separate, larger design effort from a UI tweak. Worth designing deliberately (server-side seed vs. a deterministic client-side date-seeded shuffle, how "same day" is defined across timezones) rather than bolted on ad hoc when this gets picked up.
21. **Sound/haptics** — griddle sizzle or button-press feedback, in keeping with the fuller re-skin direction.
22. **Add-to-home-screen / PWA manifest** — makes it feel more like an app when friends play repeatedly on their phones.
23. **Footer stat-source disclaimer** — e.g. "Stats: 2023–24 season averages," for credibility once real players are looking closely.
24. ~~**Pack grouping/category UI.**~~ **Done (2026-08-18).** The 19 pack buttons inside Settings are now grouped under 8 category headers by sport/domain — Basketball, Baseball, Hockey, Football, Geography, Entertainment, Science, History — pairing a sport's player pack with its team pack (e.g. NBA + NBA Teams together) rather than separating "player packs" from "team packs." Visual grouping only, no bulk select-all per category. Needed zero `app.js` changes — pack toggling already keys off `.pack-btn`'s class/`data-pack` attribute, not DOM structure, so nesting the buttons one level deeper for the group headers didn't touch any JS logic. See `CLAUDE.md` for the full writeup.
25. **Periodic refresh habit for active-roster packs.** Surfaced 2026-08-18 while verifying `players.json`: 13 of 108 NBA players' `games`/`career_*` totals had drifted a season or more out of date (two badly enough to miss a real 10,000-career-point milestone), and the prior pass found a similar concentration of NHL/NFL current-figure staleness. Every pack with still-active people/teams (NBA/WNBA/NHL/NFL/MLB rosters, all 5 team packs) will keep drifting every season — this isn't a one-time data-entry bug item 13 can ever fully "finish," it's a recurring maintenance need. Worth deciding on a cadence (e.g. revisit active-roster packs once a season) rather than re-discovering the same staleness pattern from scratch on the next verification pass. See `CLAUDE.md`'s `players.json` write-up for the full reasoning.

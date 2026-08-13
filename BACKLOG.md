# Griddle Backlog

1. ~~**Deepen the NBA player pool.**~~ **Done.** Expanded 28 → 108 players spanning 1950s–2020s, all positions, stars and role players (matters because a small pool makes repeat batches predictable/stale). See `CLAUDE.md` for the era-appropriate-fields rule this surfaced (pre-1973-74 steals/blocks, pre-1977-78 turnovers, pre-1979-80 three-point stats don't exist and are omitted rather than faked as 0).
2. ~~**Add MLB (hitters only).**~~ **Done** — and taken further than originally scoped. Added 73 hitters (`mlb_hitters.json`) plus a full multi-sport architecture (`SPORTS` config in `app.js`) rather than a one-time stat-defs swap, because the natural next ask was mixing sports in one batch, not just switching between them. NBA/MLB are now independent multi-select toggles: each of the 5 guesses in a batch randomly draws from whichever sport(s) are enabled, so a single batch can mix leagues. See `CLAUDE.md` for why counting stats (HR/RBI/SB) are career totals while rate stats (AVG/OBP/SLG) are scaled whole numbers.
   - *Later:* add MLB pitchers (ERA, WHIP, K/9, etc.) — separate stat set from hitters.
3. **Add NHL (skaters only).** Same reasoning as MLB — universal stats across skaters (G, A, P, PIM, SOG), clean port of the existing pattern.
   - *Later:* add NHL goalies (save %, GAA, shutouts) — separate stat set from skaters.
4. **Add WNBA.** Same schema/stat model as NBA — should be a near-direct port.
5. **Add college basketball.** Same schema/stat model as NBA/WNBA — straightforward port.
6. **Add college football — with the same caveat as NFL below.** Position-specific stats (QB vs. WR vs. LB), so this needs the position-group feature, not just new data.
7. **NFL — deferred.** Stats aren't universal across positions (QB vs. WR vs. LB share almost nothing); needs separate stat sets per position group, a real feature not a data swap.
8. **Soccer — deferred, phased rollout:** start with **EPL**, then **Champions League**, then **World Cup**. Leagues/competitions aren't apples-to-apples (goals/90, competition-level differences), needs a normalization decision first — likely handle each competition as its own pool rather than merging them.
9. **Other trivia domains beyond sports** — e.g. geography facts, and more generally a framework that can plot any numerical trivia pair (not just player/team stats). Sports stats would become one "pack" among several.
10. **Team statistics** — support guessing team-level stats (not just individual players) as an additional mode alongside the existing player-based one.
11. **Verify `players.json`/`mlb_hitters.json` stat accuracy/sourcing** before wider release — both were populated via research agents cross-checking Basketball-Reference/Baseball-Reference-style sources, not manually verified figure-by-figure, so worth a pass to confirm before real players are scrutinizing the numbers.
12. **Hide or gate the "Kitchen Prep" debug panel** (practice-sport selector, force stat pair, specific-player picker) for general playtesters — currently visible to anyone who opens the `<details>`. Higher priority now that the panel has grown (adding the practice-sport control alongside MLB), since more debug surface area means more for a playtester to stumble into.
13. **Personal best / score history** via localStorage — V0 had rounds-played/average, dropped in the V1 batch model.
14. **Shareable leaderboard** — right now friends compare scores by manually pasting the copied text; a lightweight shared leaderboard would remove that friction.
15. **Difficulty modes** — e.g. tighter axis ranges, larger player pool, or a timed mode once the roster is deeper.
16. **Sound/haptics** — griddle sizzle or button-press feedback, in keeping with the fuller re-skin direction.
17. **Add-to-home-screen / PWA manifest** — makes it feel more like an app when friends play repeatedly on their phones.
18. **Accessibility pass** — spot-check color contrast (muted text on dark background) and touch target sizes.
19. **Footer stat-source disclaimer** — e.g. "Stats: 2023–24 season averages," for credibility once real players are looking closely.

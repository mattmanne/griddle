# Griddle Backlog

1. **Deepen the NBA player pool.** Currently 28 players — too small, repeat batches will feel stale. Target 75–150, spanning eras/positions (not just stars), same `players.json` schema.
2. **Add MLB (hitters only).** Structurally closest fit — universal per-game/season rate stats (AVG, HR, RBI, OBP, SLG, SB) apply to every hitter, same as basketball's stat model. Mostly new data + a stat-defs swap, minimal architecture change.
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
11. **Verify players.json stat accuracy/sourcing** before wider release — worth a pass to confirm season and figures per player.
12. **Hide or gate the "Kitchen Prep" debug panel** (force stat pair, specific-player picker) for general playtesters — currently visible to anyone who opens the `<details>`.
13. **Personal best / score history** via localStorage — V0 had rounds-played/average, dropped in the V1 batch model.
14. **Shareable leaderboard** — right now friends compare scores by manually pasting the copied text; a lightweight shared leaderboard would remove that friction.
15. **Difficulty modes** — e.g. tighter axis ranges, larger player pool, or a timed mode once the roster is deeper.
16. **Sound/haptics** — griddle sizzle or button-press feedback, in keeping with the fuller re-skin direction.
17. **Add-to-home-screen / PWA manifest** — makes it feel more like an app when friends play repeatedly on their phones.
18. **Accessibility pass** — spot-check color contrast (muted text on dark background) and touch target sizes.
19. **Footer stat-source disclaimer** — e.g. "Stats: 2023–24 season averages," for credibility once real players are looking closely.

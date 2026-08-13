# Griddle 🧇

A stats-guessing game. You're given a player's name and two stat categories — drag a
marker onto an X/Y grid to place where you think their real stats land. 5 guesses per
batch, scored by how close you get.

**Play it:** https://mattmanne.github.io/griddle

Currently covers NBA (108 players) and MLB hitters (73 players) — pick one league or
mix both in the same batch.

## Running locally

No build step or dependencies — it's a static site. Serve the folder with any static
file server and open it, e.g.:

```
npx http-server .
```

(Opening `index.html` directly via `file://` won't work — the browser blocks the
`fetch()` calls that load `players.json`/`mlb_hitters.json` under the `file://`
protocol.)

## Contributing / project notes

See `CLAUDE.md` for the reasoning behind non-obvious data/architecture decisions, and
`BACKLOG.md` for planned work.

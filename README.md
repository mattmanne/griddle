# Griddle 🧇

A stats-guessing game. You're given a name and two stat categories — drag a marker
onto an X/Y grid to place where you think the real numbers land. 5 guesses per batch,
scored by how close you get.

**Play it:** https://mattmanne.github.io/griddle

Twelve packs so far, individually toggleable and mixable in the same batch:

- **Basketball:** NBA, WNBA, NCAA men's
- **Baseball:** MLB hitters
- **Hockey:** NHL skaters
- **Football:** CFB and NFL, each pack pooling QB/RB/WR together
- **Geography:** countries, US states
- **Movies**
- **Space:** planets (plus Pluto, Ceres, and Eris)
- **Animals:** mammals, birds, reptiles, marine life, and insects

## Running locally

No build step or dependencies — it's a static site. Serve the folder with any static
file server and open it, e.g.:

```
npx http-server .
```

(Opening `index.html` directly via `file://` won't work — the browser blocks the
`fetch()` calls that load each pack's JSON file under the `file://` protocol.)

## Contributing / project notes

See `CLAUDE.md` for the reasoning behind non-obvious data/architecture decisions, and
`BACKLOG.md` for planned work.

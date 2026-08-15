// Griddle's DOM-free game logic — the "what would the answer be" half of the
// app, kept separate from app.js's "wire it up to the page" half so it can be
// unit-tested with plain Node (no browser, no build step) and still loaded as
// a plain <script> tag by index.html. See CLAUDE.md's "Testing" section for why
// this split exists and why it's a UMD-style export rather than an ES module.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GriddleLogic = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const GRID = 1000;
  const SCORE_MAX = 1000;
  const SCORE_DECAY_RATE = 4;

  const HOOPS_STAT_DEFS = {
    pts: { label: 'Points/Game', short: 'PPG' },
    reb: { label: 'Rebounds/Game', short: 'RPG' },
    ast: { label: 'Assists/Game', short: 'APG' },
    stl: { label: 'Steals/Game', short: 'SPG' },
    blk: { label: 'Blocks/Game', short: 'BPG' },
    mpg: { label: 'Minutes/Game', short: 'MPG' },
    fg_pct: { label: 'Field Goal %', short: 'FG%' },
    three_pct: { label: '3-Point %', short: '3P%' },
    ft_pct: { label: 'Free Throw %', short: 'FT%' },
    tov: { label: 'Turnovers/Game', short: 'TOV' },
    games: { label: 'Games Played', short: 'GP' },
    career_pts: { label: 'Career Points', short: 'PTS' },
    career_reb: { label: 'Career Rebounds', short: 'REB' },
    career_ast: { label: 'Career Assists', short: 'AST' },
  };

  const FOOTBALL_STAT_DEFS = {
    pass_yds: { label: 'Passing Yards/Game', short: 'PASS YD/G' },
    pass_td: { label: 'Passing TDs/Game', short: 'PASS TD/G' },
    int: { label: 'Interceptions/Game', short: 'INT/G' },
    comp_pct: { label: 'Completion %', short: 'COMP%' },
    rating: { label: 'Passer Rating', short: 'RTG' },
    rush_yds: { label: 'Rushing Yards/Game', short: 'RUSH YD/G' },
    rush_td: { label: 'Rushing TDs/Game', short: 'RUSH TD/G' },
    ypc: { label: 'Yards per Carry', short: 'YPC' },
    rec: { label: 'Receptions/Game', short: 'REC/G' },
    rec_yds: { label: 'Receiving Yards/Game', short: 'REC YD/G' },
    rec_td: { label: 'Receiving TDs/Game', short: 'REC TD/G' },
    ypr: { label: 'Yards per Reception', short: 'YPR' },
    games: { label: 'Games Played', short: 'GP' },
    career_pass_yds: { label: 'Career Passing Yards', short: 'PASS YDS' },
    career_pass_td: { label: 'Career Passing TDs', short: 'PASS TD' },
    career_rush_yds: { label: 'Career Rushing Yards', short: 'RUSH YDS' },
    career_rush_td: { label: 'Career Rushing TDs', short: 'RUSH TD' },
    career_rec: { label: 'Career Receptions', short: 'REC' },
    career_rec_yds: { label: 'Career Receiving Yards', short: 'REC YDS' },
    career_rec_td: { label: 'Career Receiving TDs', short: 'REC TD' },
  };

  // Shared across all 5 team packs (nba_teams/wnba_teams/mlb_teams/nhl_teams/
  // nfl_teams) — unlike player stats, which differ wildly by sport, these
  // franchise-level facts (championships, founding year, all-time record, home
  // venue capacity) mean the same thing regardless of which sport the team
  // plays, so one shared object is the right call (same reasoning as
  // HOOPS_STAT_DEFS/FOOTBALL_STAT_DEFS — see CLAUDE.md).
  const TEAM_STAT_DEFS = {
    championships: { label: 'Championships Won', short: 'TITLES' },
    founding_year: { label: 'Founding Year', short: 'FOUNDED' },
    all_time_wins: { label: 'All-Time Wins', short: 'WINS' },
    win_pct: { label: 'All-Time Win %', short: 'WIN%' },
    arena_capacity: { label: 'Arena Capacity', short: 'CAP' },
  };

  const PACKS = {
    nba: {
      label: 'NBA',
      noun: 'player',
      article: 'an',
      emoji: '🏀',
      file: 'players.json',
      defaultPair: ['pts', 'reb'],
      statDefs: HOOPS_STAT_DEFS,
    },
    wnba: {
      label: 'WNBA',
      noun: 'player',
      article: 'a',
      emoji: '⛹️‍♀️',
      file: 'wnba_players.json',
      defaultPair: ['pts', 'reb'],
      statDefs: HOOPS_STAT_DEFS,
    },
    ncaam: {
      label: 'NCAA',
      noun: 'player',
      article: 'an',
      emoji: '🎓',
      file: 'ncaam_players.json',
      defaultPair: ['pts', 'reb'],
      statDefs: HOOPS_STAT_DEFS,
    },
    mlb: {
      label: 'MLB',
      noun: 'hitter',
      article: 'an',
      emoji: '⚾',
      file: 'mlb_hitters.json',
      defaultPair: ['avg', 'hr'],
      statDefs: {
        avg: { label: 'Batting Average', short: 'AVG' },
        hr: { label: 'Home Runs', short: 'HR' },
        rbi: { label: 'RBIs', short: 'RBI' },
        obp: { label: 'On-Base %', short: 'OBP' },
        slg: { label: 'Slugging %', short: 'SLG' },
        sb: { label: 'Stolen Bases', short: 'SB' },
      },
    },
    nhl: {
      label: 'NHL',
      noun: 'skater',
      article: 'an',
      emoji: '🏒',
      file: 'nhl_skaters.json',
      defaultPair: ['g', 'a'],
      statDefs: {
        g: { label: 'Goals/Game', short: 'G/GP' },
        a: { label: 'Assists/Game', short: 'A/GP' },
        p: { label: 'Points/Game', short: 'P/GP' },
        pim: { label: 'Penalty Minutes/Game', short: 'PIM/GP' },
        sog: { label: 'Shots on Goal/Game', short: 'SOG/GP' },
        sh_pct: { label: 'Shooting %', short: 'S%' },
        games: { label: 'Games Played', short: 'GP' },
        career_g: { label: 'Career Goals', short: 'G' },
        career_a: { label: 'Career Assists', short: 'A' },
        career_p: { label: 'Career Points', short: 'PTS' },
      },
    },
    football_cfb: {
      label: 'CFB',
      noun: 'player',
      article: 'a',
      emoji: '🏈',
      file: 'football_cfb_players.json',
      defaultPair: ['pass_yds', 'rush_yds'],
      statDefs: FOOTBALL_STAT_DEFS,
    },
    football_nfl: {
      label: 'NFL',
      noun: 'player',
      article: 'an',
      emoji: '🏈',
      file: 'football_nfl_players.json',
      defaultPair: ['pass_yds', 'rush_yds'],
      statDefs: FOOTBALL_STAT_DEFS,
    },
    geo_countries: {
      label: null,
      noun: 'country',
      article: 'a',
      emoji: '🌍',
      file: 'geo_countries.json',
      defaultPair: ['population', 'area'],
      statDefs: {
        population: { label: 'Population', short: 'POP' },
        area: { label: 'Area (km²)', short: 'AREA' },
        gdp_per_capita: { label: 'GDP per Capita', short: 'GDP/CAP' },
        coastline: { label: 'Coastline (km)', short: 'COAST' },
        life_expectancy: { label: 'Life Expectancy', short: 'LIFE' },
        literacy_pct: { label: 'Literacy Rate %', short: 'LIT%' },
        elevation: { label: 'Highest Elevation (m)', short: 'ELEV' },
      },
    },
    geo_states: {
      label: null,
      noun: 'US state',
      article: 'a',
      emoji: '🗽',
      file: 'us_states.json',
      defaultPair: ['population', 'area'],
      statDefs: {
        population: { label: 'Population', short: 'POP' },
        area: { label: 'Area (sq mi)', short: 'AREA' },
        median_household_income: { label: 'Median Household Income', short: 'INCOME' },
        counties: { label: 'Counties', short: 'CNTYS' },
        elevation: { label: 'Highest Elevation (ft)', short: 'ELEV' },
        electoral_votes: { label: 'Electoral Votes', short: 'EV' },
      },
    },
    movies: {
      label: null,
      noun: 'movie',
      article: 'a',
      emoji: '🎬',
      file: 'movies.json',
      defaultPair: ['box_office_worldwide', 'imdb_rating'],
      statDefs: {
        box_office_worldwide: { label: 'Worldwide Box Office', short: 'GROSS' },
        budget: { label: 'Production Budget', short: 'BUDGET' },
        runtime_minutes: { label: 'Runtime (minutes)', short: 'RUNTIME' },
        imdb_rating: { label: 'IMDb Rating', short: 'IMDB' },
        rt_score: { label: 'Rotten Tomatoes %', short: 'RT%' },
        release_year: { label: 'Release Year', short: 'YEAR' },
      },
    },
    space_planets: {
      label: null,
      noun: 'planet',
      article: 'a',
      emoji: '🪐',
      file: 'space_planets.json',
      defaultPair: ['distance_from_sun', 'diameter'],
      statDefs: {
        distance_from_sun: { label: 'Distance from Sun (million km)', short: 'DIST' },
        diameter: { label: 'Diameter (km)', short: 'DIAM' },
        moons_count: { label: 'Number of Moons', short: 'MOONS' },
        day_length_hours: { label: 'Day Length (hours)', short: 'DAY' },
        orbital_period_days: { label: 'Orbital Period (days)', short: 'ORBIT' },
        surface_gravity: { label: 'Surface Gravity (m/s²)', short: 'GRAV' },
      },
    },
    animals: {
      label: null,
      noun: 'animal',
      article: 'an',
      emoji: '🐾',
      file: 'animals.json',
      defaultPair: ['top_speed_kmh', 'weight_kg'],
      statDefs: {
        top_speed_kmh: { label: 'Top Speed (km/h)', short: 'SPEED' },
        weight_kg: { label: 'Weight (kg)', short: 'WEIGHT' },
        lifespan_years: { label: 'Lifespan (years)', short: 'LIFE' },
        gestation_days: { label: 'Gestation (days)', short: 'GEST' },
        length_cm: { label: 'Body Length (cm)', short: 'LEN' },
      },
    },
    music_artists: {
      label: null,
      noun: 'artist',
      article: 'an',
      emoji: '🎤',
      file: 'music_artists.json',
      defaultPair: ['records_sold_millions', 'number_one_hits'],
      statDefs: {
        records_sold_millions: { label: 'Records Sold (millions)', short: 'SOLD' },
        number_one_hits: { label: '#1 Hits', short: '#1s' },
        grammy_wins: { label: 'Grammy Wins', short: 'GRAMMYS' },
        years_active: { label: 'Years Active', short: 'YRS' },
        debut_year: { label: 'Debut Year', short: 'DEBUT' },
      },
    },
    presidents: {
      label: null,
      noun: 'US president',
      article: 'a',
      emoji: '🎩',
      file: 'presidents.json',
      defaultPair: ['age_at_inauguration', 'years_served'],
      statDefs: {
        age_at_inauguration: { label: 'Age at Inauguration', short: 'AGE' },
        years_served: { label: 'Years Served', short: 'YRS' },
        height_cm: { label: 'Height (cm)', short: 'HEIGHT' },
        terms_elected: { label: 'Elections Won', short: 'WINS' },
        birth_year: { label: 'Birth Year', short: 'BORN' },
        popular_vote_pct: { label: 'Popular Vote %', short: 'VOTE%' },
      },
    },
    nba_teams: {
      label: 'NBA',
      noun: 'team',
      article: 'an',
      emoji: '🏀',
      file: 'nba_teams.json',
      defaultPair: ['win_pct', 'championships'],
      statDefs: TEAM_STAT_DEFS,
    },
    wnba_teams: {
      label: 'WNBA',
      noun: 'team',
      article: 'a',
      emoji: '⛹️‍♀️',
      file: 'wnba_teams.json',
      defaultPair: ['win_pct', 'championships'],
      statDefs: TEAM_STAT_DEFS,
    },
    mlb_teams: {
      label: 'MLB',
      noun: 'team',
      article: 'an',
      emoji: '⚾',
      file: 'mlb_teams.json',
      defaultPair: ['win_pct', 'championships'],
      statDefs: TEAM_STAT_DEFS,
    },
    nhl_teams: {
      label: 'NHL',
      noun: 'team',
      article: 'an',
      emoji: '🏒',
      file: 'nhl_teams.json',
      defaultPair: ['win_pct', 'championships'],
      statDefs: TEAM_STAT_DEFS,
    },
    nfl_teams: {
      label: 'NFL',
      noun: 'team',
      article: 'an',
      emoji: '🏈',
      file: 'nfl_teams.json',
      defaultPair: ['win_pct', 'championships'],
      statDefs: TEAM_STAT_DEFS,
    },
  };

  const PACK_KEYS = Object.keys(PACKS);

  const SNARK_TIERS = [
    { min: 0.9, emoji: "🧇", texts: [
      "Golden-brown perfection. Chef's kiss.",
      "Absolutely cooked, no notes.",
      "The judges are speechless. Frame this batch.",
    ] },
    { min: 0.75, emoji: "🔥", texts: [
      "Cooked to perfection. Restaurant-quality guessing.",
      "Michelin-star nonsense right there.",
      "You clearly know your numbers.",
    ] },
    { min: 0.6, emoji: "😎", texts: [
      "Nicely browned. Respectable griddle work.",
      "Solid batch. No complaints from the kitchen.",
      "Decent spread today.",
    ] },
    { min: 0.45, emoji: "🙂", texts: [
      "A little undercooked in spots, but edible.",
      "Mixed bag. Some winners, some questionable choices.",
      "Edible. Barely.",
    ] },
    { min: 0.3, emoji: "😬", texts: [
      "Getting a bit soggy. Turn up the heat.",
      "This batch needs some real work.",
      "Rough morning at the griddle.",
    ] },
    { min: 0.15, emoji: "💀", texts: [
      "Burnt. Someone left the griddle on too long.",
      "This should be sent back to the kitchen.",
      "Yikes. Just... yikes.",
    ] },
    { min: 0, emoji: "🤡", texts: [
      "Raw batter. Didn't even hit the griddle.",
      "Genuinely impressive how wrong that was.",
      "The griddle is embarrassed for you.",
      "Someone alert the health inspector.",
    ] },
  ];

  const GUESS_SNARK_TIERS = [
    { min: 0.9, texts: ["🎯 Nailed it!", "Bullseye.", "Chef's kiss.", "Unreal guess."] },
    { min: 0.75, texts: ["Really close!", "Nice read.", "Sharp guess."] },
    { min: 0.6, texts: ["Not bad.", "Decent guess.", "Respectable."] },
    { min: 0.45, texts: ["Eh, close enough?", "Mid. Very mid.", "Could be worse."] },
    { min: 0.3, texts: ["Rough one.", "Way off.", "That's a swing and a miss."] },
    { min: 0.15, texts: ["Yikes.", "Oof.", "That's not close."] },
    { min: 0, texts: ["Did you even look at the board?", "That's borderline impressive.", "The numbers are right there!"] },
  ];

  const READY_MESSAGES = [
    'Ready when you are!',
    'Griddle is hot. Let\'s see what you\'ve got.',
    'Batter\'s up.',
    'The griddle awaits your genius (or lack thereof).',
  ];

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function pluralize(noun) {
    if (/[^aeiou]y$/i.test(noun)) return noun.slice(0, -1) + 'ies';
    return noun + 's';
  }

  function randomKey(keys, exclude) {
    const pool = exclude ? keys.filter((k) => k !== exclude) : keys;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function axisRangeForStat(entries, statDefs, key) {
    const values = entries.map((e) => e[key]).filter(Number.isFinite);
    const min = Math.floor(Math.min(...values));
    const max = Math.ceil(Math.max(...values));
    return { min, max: max > min ? max : min + 1, label: statDefs[key].label };
  }

  function eligibleEntries(entries, statX, statY) {
    return entries.filter((e) => Number.isFinite(e[statX]) && Number.isFinite(e[statY]));
  }

  function hasEligiblePair(dataCache, pack, x, y) {
    return (dataCache[pack] || []).some((e) => Number.isFinite(e[x]) && Number.isFinite(e[y]));
  }

  // Packs whose entries share one stat schema (e.g. HOOPS_STAT_DEFS) always have every
  // field on every entry, so any random pair works. Packs pooling entries with only
  // partially-overlapping fields (e.g. football_cfb/football_nfl mixing QB/RB/WR stats)
  // can randomly land on a pair no entry has both of (a QB stat vs. a WR-only stat) —
  // rejection-sample until a pair with at least one eligible entry turns up.
  // `avoid` (optional) excludes specific keys from the sample — used to keep the very
  // next guess in the same pack from repeating the previous guess's exact stat pair.
  // Falls back to the unrestricted key list if avoiding would leave too few keys to
  // pair (not expected in practice — every pack has at least 5 stat keys).
  function pickEligiblePair(dataCache, pack, keys, avoid) {
    const preferred = avoid ? keys.filter((k) => !avoid.includes(k)) : keys;
    const pool = preferred.length >= 2 ? preferred : keys;
    for (let i = 0; i < 200; i++) {
      const x = randomKey(pool);
      const y = randomKey(pool, x);
      if (hasEligiblePair(dataCache, pack, x, y)) return { x, y };
    }
    return { x: keys[0], y: keys[1] };
  }

  // pool can be empty only via an explicitly forced debug stat pair that no entry
  // in a mixed-position pack (e.g. football_cfb) actually has both fields for —
  // allEntries[0] is the last-resort fallback for that edge case (see CLAUDE.md).
  function pickEntry(pool, chosenName, allEntries) {
    if (chosenName) {
      const found = pool.find((e) => e.name === chosenName);
      if (found) return found;
    }
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : allEntries[0];
  }

  function computeScore(guess, targetPoint, axisX, axisY) {
    const nx = (guess.x - targetPoint.x) / (axisX.max - axisX.min);
    const ny = (guess.y - targetPoint.y) / (axisY.max - axisY.min);
    const dist = Math.sqrt(nx * nx + ny * ny);
    const score = Math.round(SCORE_MAX * Math.exp(-SCORE_DECAY_RATE * dist));
    return { dist, score };
  }

  function packClauseText(enabledPacks, packs) {
    const list = Array.from(enabledPacks);
    if (list.length === 1) {
      const pack = packs[list[0]];
      const label = pack.label ? `${pack.label} ` : '';
      return `${pack.article} ${label}${pack.noun}`;
    }
    const nouns = new Set(list.map((k) => packs[k].noun));
    // Bare-noun fallback always uses 'a' — fine while every noun is consonant-sound-first;
    // revisit if a future pack's noun needs 'an' (e.g. "element").
    if (nouns.size === 1) return `a ${[...nouns][0]}`;
    // "an entry" (not "a name") because the template appends "'s name" —
    // "a name's name" reads badly, "an entry's name" doesn't.
    return 'an entry';
  }

  function poolSummary(enabledPacks, dataCache, packs) {
    return Array.from(enabledPacks)
      .map((k) => {
        const pack = packs[k];
        const count = (dataCache[k] || []).length;
        const noun = count === 1 ? pack.noun : pluralize(pack.noun);
        const label = pack.label ? `${pack.label} ` : '';
        return `${count} ${label}${noun}`;
      })
      .join(' + ');
  }

  function snarkFor(total, max) {
    const pct = total / max;
    const tier = SNARK_TIERS.find((t) => pct >= t.min) || SNARK_TIERS[SNARK_TIERS.length - 1];
    return { emoji: tier.emoji, text: randomItem(tier.texts) };
  }

  function guessSnarkFor(score) {
    const pct = score / SCORE_MAX;
    const tier = GUESS_SNARK_TIERS.find((t) => pct >= t.min) || GUESS_SNARK_TIERS[GUESS_SNARK_TIERS.length - 1];
    return randomItem(tier.texts);
  }

  return {
    GRID, SCORE_MAX, SCORE_DECAY_RATE,
    HOOPS_STAT_DEFS, FOOTBALL_STAT_DEFS, TEAM_STAT_DEFS, PACKS, PACK_KEYS,
    SNARK_TIERS, GUESS_SNARK_TIERS, READY_MESSAGES,
    clamp, capitalize, pluralize, randomKey, randomItem,
    axisRangeForStat, eligibleEntries, hasEligiblePair, pickEligiblePair, pickEntry,
    computeScore, packClauseText, poolSummary, snarkFor, guessSnarkFor,
  };
});

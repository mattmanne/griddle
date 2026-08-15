(() => {
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
  };

  const PACK_KEYS = Object.keys(PACKS);
  let enabledPacks = new Set(PACK_KEYS);
  let debugPack = PACK_KEYS[0];
  let dataCache = {};

  let currentPack = debugPack;
  let STAT_DEFS = PACKS[currentPack].statDefs;

  const GRID = 1000;
  const SCORE_MAX = 1000;
  const SCORE_DECAY_RATE = 4;
  const ZOOM_MIN = 1;
  const ZOOM_MAX = 4;
  const ROUND_SIZE = 5;
  const ROUND_MAX = SCORE_MAX * ROUND_SIZE;

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

  function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
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

  const svg = document.getElementById('grid-svg');
  const viewport = document.getElementById('viewport');
  const gridlinesGroup = document.getElementById('gridlines');
  const guessMarker = document.getElementById('guess-marker');
  const targetMarker = document.getElementById('target-marker');
  const guideX = document.getElementById('guide-x');
  const guideY = document.getElementById('guide-y');
  const resultLine = document.getElementById('result-line');
  const zoomSlider = document.getElementById('zoom-slider');
  const actionBtn = document.getElementById('action-btn');
  const statXSelect = document.getElementById('stat-x-select');
  const statYSelect = document.getElementById('stat-y-select');
  const entrySelect = document.getElementById('entry-select');
  const forceStatPairCheckbox = document.getElementById('force-stat-pair');
  const targetDisplay = document.getElementById('target-display');
  const roundProgress = document.getElementById('round-progress');
  const axisTop = document.getElementById('axis-top');
  const axisBottom = document.getElementById('axis-bottom');
  const axisLeft = document.getElementById('axis-left');
  const axisRight = document.getElementById('axis-right');
  const resultsSection = document.getElementById('results');
  const resultGuess = document.getElementById('result-guess');
  const resultTargetName = document.getElementById('result-target-name');
  const resultTarget = document.getElementById('result-target');
  const resultDistance = document.getElementById('result-distance');
  const resultScore = document.getElementById('result-score');
  const resultSnarkEl = document.getElementById('result-snark');
  const roundSummary = document.getElementById('round-summary');
  const roundTotalScoreEl = document.getElementById('round-total-score');
  const roundSnarkEl = document.getElementById('round-snark');
  const roundBreakdownEl = document.getElementById('round-breakdown');
  const shareTextArea = document.getElementById('share-text');
  const copyResultsBtn = document.getElementById('copy-results-btn');
  const replayBtn = document.getElementById('replay-btn');
  const packButtons = Array.from(document.querySelectorAll('.pack-btn'));
  const packCountSummary = document.getElementById('pack-count-summary');
  const infoBtn = document.getElementById('info-btn');
  const infoModal = document.getElementById('info-modal');
  const infoCloseBtn = document.getElementById('info-close-btn');
  const packClause = document.getElementById('pack-clause');
  const debugPackSelect = document.getElementById('debug-pack-select');
  const entryLabelEl = document.getElementById('entry-label');
  const targetPanel = document.querySelector('.target-panel');
  const gameBoard = document.querySelector('.axis-grid');
  const legendEl = document.querySelector('.legend');
  const gameControls = document.querySelector('.controls');
  const practiceSettingsEl = document.querySelector('.practice-settings');

  const BUTTER_W = 34;
  const BUTTER_H = 26;

  let baseSize = viewport.clientWidth;
  let entries = [];
  let [statX, statY] = PACKS[currentPack].defaultPair;
  let AXIS_X = { min: 0, max: 100, label: '' };
  let AXIS_Y = { min: 0, max: 100, label: '' };
  let target = null;
  let locked = false;
  let previewData = null;
  const pointers = new Map();
  let mode = 'idle';
  let pinchStart = null;
  let guessIndex = 0;
  let guessResults = [];
  let roundOver = false;

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function axisRangeForStat(key) {
    const values = entries.map((e) => e[key]).filter(Number.isFinite);
    const min = Math.floor(Math.min(...values));
    const max = Math.ceil(Math.max(...values));
    return { min, max: max > min ? max : min + 1, label: STAT_DEFS[key].label };
  }

  function eligibleEntries() {
    return entries.filter((e) => Number.isFinite(e[statX]) && Number.isFinite(e[statY]));
  }

  function randomKey(keys, exclude) {
    const pool = exclude ? keys.filter((k) => k !== exclude) : keys;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function hasEligiblePair(pack, x, y) {
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
  function pickEligiblePair(pack, keys, avoid) {
    const preferred = avoid ? keys.filter((k) => !avoid.includes(k)) : keys;
    const pool = preferred.length >= 2 ? preferred : keys;
    for (let i = 0; i < 200; i++) {
      const x = randomKey(pool);
      const y = randomKey(pool, x);
      if (hasEligiblePair(pack, x, y)) return { x, y };
    }
    return { x: keys[0], y: keys[1] };
  }

  function pickRoundContext() {
    const forcedEntry = entrySelect.value;
    if (forceStatPairCheckbox.checked || forcedEntry) {
      const pack = debugPack;
      const keys = Object.keys(PACKS[pack].statDefs);
      const avoid = pack === currentPack ? [statX, statY] : null;
      let x, y;
      if (forceStatPairCheckbox.checked) {
        x = statXSelect.value;
        y = statYSelect.value === x ? randomKey(keys, x) : statYSelect.value;
        if (!hasEligiblePair(pack, x, y)) {
          ({ x, y } = pickEligiblePair(pack, keys, avoid));
        }
      } else {
        ({ x, y } = pickEligiblePair(pack, keys, avoid));
      }
      return { pack, x, y };
    }
    const pack = randomKey(Array.from(enabledPacks));
    const keys = Object.keys(PACKS[pack].statDefs);
    const avoid = pack === currentPack ? [statX, statY] : null;
    const { x, y } = pickEligiblePair(pack, keys, avoid);
    return { pack, x, y };
  }

  function dataToSvg(x, y) {
    const sx = ((x - AXIS_X.min) / (AXIS_X.max - AXIS_X.min)) * GRID;
    const sy = GRID - ((y - AXIS_Y.min) / (AXIS_Y.max - AXIS_Y.min)) * GRID;
    return { sx, sy };
  }

  function clientToData(clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const sx = vb.x + ((clientX - rect.left) / rect.width) * vb.width;
    const sy = vb.y + ((clientY - rect.top) / rect.height) * vb.height;
    const x = clamp(AXIS_X.min + (sx / GRID) * (AXIS_X.max - AXIS_X.min), AXIS_X.min, AXIS_X.max);
    const y = clamp(AXIS_Y.min + ((GRID - sy) / GRID) * (AXIS_Y.max - AXIS_Y.min), AXIS_Y.min, AXIS_Y.max);
    return { x, y };
  }

  function drawGridlines() {
    gridlinesGroup.innerHTML = '';
    for (let i = 1; i < 10; i++) {
      const pos = (i / 10) * GRID;
      const v = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      v.setAttribute('x1', pos); v.setAttribute('y1', 0);
      v.setAttribute('x2', pos); v.setAttribute('y2', GRID);
      v.setAttribute('class', 'gridline');
      gridlinesGroup.appendChild(v);

      const h = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      h.setAttribute('x1', 0); h.setAttribute('y1', pos);
      h.setAttribute('x2', GRID); h.setAttribute('y2', pos);
      h.setAttribute('class', 'gridline');
      gridlinesGroup.appendChild(h);
    }
  }

  function setZoom(level) {
    const z = clamp(level, ZOOM_MIN, ZOOM_MAX);
    const px = Math.round(baseSize * z);
    svg.style.width = px + 'px';
    svg.style.height = px + 'px';
    const wafflePx = Math.round(36 * z);
    viewport.style.backgroundSize = `${wafflePx}px ${wafflePx}px`;
    zoomSlider.value = z;
  }

  function showGuessPreview(dataPoint) {
    previewData = dataPoint;
    const { sx, sy } = dataToSvg(dataPoint.x, dataPoint.y);
    guessMarker.setAttribute('x', sx - BUTTER_W / 2);
    guessMarker.setAttribute('y', sy - BUTTER_H / 2);
    guessMarker.setAttribute('visibility', 'visible');
    guideX.setAttribute('x1', sx); guideX.setAttribute('x2', sx);
    guideX.setAttribute('visibility', 'visible');
    guideY.setAttribute('y1', sy); guideY.setAttribute('y2', sy);
    guideY.setAttribute('visibility', 'visible');
  }

  function computeScore(guess, targetPoint) {
    const nx = (guess.x - targetPoint.x) / (AXIS_X.max - AXIS_X.min);
    const ny = (guess.y - targetPoint.y) / (AXIS_Y.max - AXIS_Y.min);
    const dist = Math.sqrt(nx * nx + ny * ny);
    const score = Math.round(SCORE_MAX * Math.exp(-SCORE_DECAY_RATE * dist));
    return { dist, score };
  }

  function finalizeGuess(dataPoint) {
    if (locked || !target) return;
    locked = true;

    const { dist, score } = computeScore(dataPoint, target);
    guessResults.push({ pack: currentPack, statX, statY, score, entryName: target.name });

    const targetSvg = dataToSvg(target.x, target.y);
    targetMarker.setAttribute('transform', `translate(${targetSvg.sx}, ${targetSvg.sy})`);
    targetMarker.setAttribute('visibility', 'visible');

    const guessSvg = dataToSvg(dataPoint.x, dataPoint.y);
    resultLine.setAttribute('x1', guessSvg.sx);
    resultLine.setAttribute('y1', guessSvg.sy);
    resultLine.setAttribute('x2', targetSvg.sx);
    resultLine.setAttribute('y2', targetSvg.sy);
    resultLine.setAttribute('visibility', 'visible');

    guideX.setAttribute('visibility', 'hidden');
    guideY.setAttribute('visibility', 'hidden');

    const xLabel = STAT_DEFS[statX].label;
    const yLabel = STAT_DEFS[statY].label;
    resultGuess.textContent = `${dataPoint.x.toFixed(1)} ${xLabel}, ${dataPoint.y.toFixed(1)} ${yLabel}`;
    resultTargetName.textContent = `${PACKS[currentPack].emoji} ${target.name}`;
    resultTarget.textContent = `${target.x.toFixed(1)} ${xLabel}, ${target.y.toFixed(1)} ${yLabel}`;
    resultDistance.textContent = Math.round((dist / Math.SQRT2) * 100);
    resultScore.textContent = score;
    resultSnarkEl.textContent = guessSnarkFor(score);
    resultsSection.hidden = false;

    if (guessIndex < ROUND_SIZE) {
      actionBtn.disabled = false;
      actionBtn.textContent = `Flip It (${guessIndex + 1}/${ROUND_SIZE})`;
    } else {
      roundOver = true;
      resultsSection.hidden = true;
      targetPanel.hidden = true;
      gameBoard.hidden = true;
      legendEl.hidden = true;
      gameControls.hidden = true;
      const total = guessResults.reduce((a, r) => a + r.score, 0);
      const snark = snarkFor(total, ROUND_MAX);
      roundTotalScoreEl.textContent = total;
      roundSnarkEl.textContent = `${snark.emoji} ${snark.text}`;
      roundBreakdownEl.textContent = guessResults
        .map((r) => {
          const defs = PACKS[r.pack].statDefs;
          return `${PACKS[r.pack].emoji}${defs[r.statX].short} vs ${defs[r.statY].short}: ${r.score}`;
        })
        .join(' · ');
      shareTextArea.value = buildShareText(total, snark);
      roundSummary.hidden = false;

      actionBtn.disabled = true;
      actionBtn.textContent = 'Fully Cooked';
    }
  }

  function buildShareText(total, snark) {
    const lines = [`Griddle 🧇 — Batch score ${total}/${ROUND_MAX} ${snark.emoji}`];
    guessResults.forEach((r, i) => {
      const defs = PACKS[r.pack].statDefs;
      lines.push(`${i + 1}. ${PACKS[r.pack].emoji}${defs[r.statX].short} vs ${defs[r.statY].short} (${r.entryName}) — ${r.score}`);
    });
    return lines.join('\n');
  }

  function pickEntry() {
    const pool = eligibleEntries();
    const chosenName = entrySelect.value;
    if (chosenName) {
      const found = pool.find((e) => e.name === chosenName);
      if (found) return found;
    }
    // pool can be empty only via an explicitly forced debug stat pair that no entry
    // in a mixed-position pack (e.g. football_cfb) actually has both fields for.
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : entries[0];
  }

  function beginNextGuess() {
    guessIndex += 1;

    const ctx = pickRoundContext();
    currentPack = ctx.pack;
    STAT_DEFS = PACKS[currentPack].statDefs;
    entries = dataCache[currentPack];
    statX = ctx.x;
    statY = ctx.y;
    AXIS_X = axisRangeForStat(statX);
    AXIS_Y = axisRangeForStat(statY);
    axisTop.textContent = `${AXIS_Y.label} max: ${AXIS_Y.max}`;
    axisTop.title = axisTop.textContent;
    axisBottom.textContent = `${AXIS_Y.label} min: ${AXIS_Y.min}`;
    axisBottom.title = axisBottom.textContent;
    axisLeft.textContent = `${AXIS_X.label} min: ${AXIS_X.min}`;
    axisLeft.title = axisLeft.textContent;
    axisRight.textContent = `${AXIS_X.label} max: ${AXIS_X.max}`;
    axisRight.title = axisRight.textContent;

    const entry = pickEntry();
    target = { x: entry[statX], y: entry[statY], name: entry.name };

    locked = false;
    previewData = null;
    mode = 'idle';
    pointers.clear();

    guessMarker.setAttribute('visibility', 'hidden');
    targetMarker.setAttribute('visibility', 'hidden');
    resultLine.setAttribute('visibility', 'hidden');
    guideX.setAttribute('visibility', 'hidden');
    guideY.setAttribute('visibility', 'hidden');
    resultsSection.hidden = true;

    targetDisplay.textContent = `${PACKS[currentPack].emoji} ${entry.name} — ${STAT_DEFS[statX].label} vs ${STAT_DEFS[statY].label}`;
    roundProgress.textContent = `Guess ${guessIndex} of ${ROUND_SIZE}`;

    actionBtn.disabled = true;
    actionBtn.textContent = 'Cooking…';
  }

  function beginRound() {
    guessIndex = 0;
    guessResults = [];
    roundOver = false;
    roundSummary.hidden = true;
    targetPanel.hidden = false;
    gameBoard.hidden = false;
    legendEl.hidden = false;
    gameControls.hidden = false;
    practiceSettingsEl.hidden = false;

    beginNextGuess();
  }

  function centroidOf(points) {
    const arr = Array.from(points.values());
    const x = arr.reduce((a, p) => a + p.clientX, 0) / arr.length;
    const y = arr.reduce((a, p) => a + p.clientY, 0) / arr.length;
    return { x, y };
  }

  function distanceBetween(a, b) {
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  viewport.addEventListener('pointerdown', (evt) => {
    if (locked) return;
    evt.preventDefault();
    viewport.setPointerCapture(evt.pointerId);
    pointers.set(evt.pointerId, { clientX: evt.clientX, clientY: evt.clientY });

    if (pointers.size === 1) {
      mode = 'placing';
      showGuessPreview(clientToData(evt.clientX, evt.clientY));
    } else if (pointers.size === 2) {
      mode = 'pinch';
      const [a, b] = Array.from(pointers.values());
      pinchStart = {
        distance: distanceBetween(a, b),
        centroid: centroidOf(pointers),
        zoom: parseFloat(zoomSlider.value),
        scrollLeft: viewport.scrollLeft,
        scrollTop: viewport.scrollTop,
      };
    }
  });

  viewport.addEventListener('pointermove', (evt) => {
    if (!pointers.has(evt.pointerId)) return;
    pointers.set(evt.pointerId, { clientX: evt.clientX, clientY: evt.clientY });

    if (mode === 'placing' && pointers.size === 1) {
      showGuessPreview(clientToData(evt.clientX, evt.clientY));
    } else if (mode === 'pinch' && pointers.size === 2 && pinchStart) {
      const [a, b] = Array.from(pointers.values());
      const newDistance = distanceBetween(a, b);
      const newCentroid = centroidOf(pointers);
      const scaleRatio = newDistance / pinchStart.distance;
      setZoom(pinchStart.zoom * scaleRatio);
      viewport.scrollLeft = pinchStart.scrollLeft - (newCentroid.x - pinchStart.centroid.x);
      viewport.scrollTop = pinchStart.scrollTop - (newCentroid.y - pinchStart.centroid.y);
    }
  });

  function handlePointerEnd(evt) {
    const wasPlacing = mode === 'placing' && pointers.has(evt.pointerId);
    pointers.delete(evt.pointerId);

    if (wasPlacing && pointers.size === 0 && previewData) {
      finalizeGuess(previewData);
      mode = 'idle';
    } else if (pointers.size < 2) {
      mode = pointers.size === 1 ? 'placing' : 'idle';
      pinchStart = null;
    }
  }

  viewport.addEventListener('pointerup', handlePointerEnd);
  viewport.addEventListener('pointercancel', handlePointerEnd);

  zoomSlider.addEventListener('input', () => setZoom(parseFloat(zoomSlider.value)));
  actionBtn.addEventListener('click', () => {
    if (roundOver) return;
    if (guessIndex === 0) {
      beginRound();
    } else {
      beginNextGuess();
    }
  });

  replayBtn.addEventListener('click', () => beginRound());

  copyResultsBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(shareTextArea.value);
      copyResultsBtn.textContent = 'Copied!';
      setTimeout(() => { copyResultsBtn.textContent = 'Copy My Batch'; }, 1500);
    } catch (err) {
      shareTextArea.select();
    }
  });

  window.addEventListener('resize', () => {
    baseSize = viewport.clientWidth;
    setZoom(parseFloat(zoomSlider.value));
  });

  infoBtn.addEventListener('click', () => infoModal.showModal());
  infoCloseBtn.addEventListener('click', () => infoModal.close());
  infoModal.addEventListener('click', (evt) => {
    if (evt.target === infoModal) infoModal.close();
  });

  function populateStatSelects() {
    const defs = PACKS[debugPack].statDefs;
    const keys = Object.keys(defs);
    [statXSelect, statYSelect].forEach((select, i) => {
      select.innerHTML = '';
      keys.forEach((key) => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = defs[key].label;
        select.appendChild(opt);
      });
      select.value = PACKS[debugPack].defaultPair[i];
    });
  }

  function populateEntrySelect() {
    entrySelect.innerHTML = '<option value="">Random</option>';
    (dataCache[debugPack] || []).forEach((e) => {
      const opt = document.createElement('option');
      opt.value = e.name;
      opt.textContent = e.name;
      entrySelect.appendChild(opt);
    });
  }

  function updateEntryLabel() {
    entryLabelEl.textContent = capitalize(PACKS[debugPack].noun);
  }

  function pluralize(noun) {
    if (/[^aeiou]y$/i.test(noun)) return noun.slice(0, -1) + 'ies';
    return noun + 's';
  }

  function poolSummary() {
    return Array.from(enabledPacks)
      .map((k) => {
        const pack = PACKS[k];
        const count = (dataCache[k] || []).length;
        const noun = count === 1 ? pack.noun : pluralize(pack.noun);
        const label = pack.label ? `${pack.label} ` : '';
        return `${count} ${label}${noun}`;
      })
      .join(' + ');
  }

  function packClauseText() {
    const list = Array.from(enabledPacks);
    if (list.length === 1) {
      const pack = PACKS[list[0]];
      const label = pack.label ? `${pack.label} ` : '';
      return `${pack.article} ${label}${pack.noun}`;
    }
    const nouns = new Set(list.map((k) => PACKS[k].noun));
    // Bare-noun fallback always uses 'a' — fine while every noun is consonant-sound-first;
    // revisit if a future pack's noun needs 'an' (e.g. "element").
    if (nouns.size === 1) return `a ${[...nouns][0]}`;
    // "an entry" (not "a name") because the template appends "'s name" —
    // "a name's name" reads badly, "an entry's name" doesn't.
    return 'an entry';
  }

  function updatePackUI() {
    packButtons.forEach((btn) => btn.classList.toggle('active', enabledPacks.has(btn.dataset.pack)));
    packClause.textContent = packClauseText();
    packCountSummary.textContent = `(${enabledPacks.size}/${PACK_KEYS.length} active)`;
    if (guessIndex === 0 && !roundOver) {
      roundProgress.textContent = `${poolSummary()} loaded — press "Fire Up the Griddle" to begin.`;
    }
  }

  function loadAllData() {
    actionBtn.disabled = true;
    actionBtn.textContent = 'Preheating…';
    targetDisplay.textContent = 'Preheating…';

    Promise.all(
      PACK_KEYS.map((pack) =>
        fetch(PACKS[pack].file)
          .then((res) => res.json())
          .then((data) => { dataCache[pack] = data; })
      )
    )
      .then(() => {
        populateStatSelects();
        populateEntrySelect();
        updateEntryLabel();
        actionBtn.disabled = false;
        actionBtn.textContent = 'Fire Up the Griddle';
        targetDisplay.textContent = randomItem(READY_MESSAGES);
        updatePackUI();
      })
      .catch((err) => {
        targetDisplay.textContent = 'Failed to load pack data — check the console.';
        console.error(err);
      });
  }

  packButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const pack = btn.dataset.pack;
      if (enabledPacks.has(pack)) {
        if (enabledPacks.size === 1) return;
        enabledPacks.delete(pack);
      } else {
        enabledPacks.add(pack);
      }
      updatePackUI();
    });
  });

  debugPackSelect.addEventListener('change', () => {
    debugPack = debugPackSelect.value;
    populateStatSelects();
    populateEntrySelect();
    updateEntryLabel();
  });

  drawGridlines();
  setZoom(1);
  loadAllData();
})();

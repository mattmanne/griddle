(() => {
  const STAT_DEFS = {
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
  };

  const GRID = 1000;
  const SCORE_MAX = 1000;
  const SCORE_DECAY_RATE = 4;
  const ZOOM_MIN = 1;
  const ZOOM_MAX = 4;
  const ROUND_SIZE = 5;
  const ROUND_MAX = SCORE_MAX * ROUND_SIZE;

  const SNARK_TIERS = [
    { min: 0.9, text: "Golden-brown perfection. Chef's kiss.", emoji: "🧇" },
    { min: 0.75, text: "Cooked to perfection. Restaurant-quality guessing.", emoji: "🔥" },
    { min: 0.6, text: "Nicely browned. Respectable griddle work.", emoji: "😎" },
    { min: 0.45, text: "A little undercooked in spots, but edible.", emoji: "🙂" },
    { min: 0.3, text: "Getting a bit soggy. Turn up the heat.", emoji: "😬" },
    { min: 0.15, text: "Burnt. Someone left the griddle on too long.", emoji: "💀" },
    { min: 0, text: "Raw batter. Didn't even hit the griddle.", emoji: "🤡" },
  ];

  function snarkFor(total, max) {
    const pct = total / max;
    return SNARK_TIERS.find((tier) => pct >= tier.min) || SNARK_TIERS[SNARK_TIERS.length - 1];
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
  const playerSelect = document.getElementById('player-select');
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
  const roundSummary = document.getElementById('round-summary');
  const roundTotalScoreEl = document.getElementById('round-total-score');
  const roundSnarkEl = document.getElementById('round-snark');
  const roundBreakdownEl = document.getElementById('round-breakdown');
  const shareTextArea = document.getElementById('share-text');
  const copyResultsBtn = document.getElementById('copy-results-btn');
  const replayBtn = document.getElementById('replay-btn');

  const BUTTER_W = 34;
  const BUTTER_H = 26;

  let baseSize = viewport.clientWidth;
  let players = [];
  let statX = 'pts';
  let statY = 'reb';
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

  function axisRangeForStat(key) {
    const values = players.map((p) => p[key]).filter(Number.isFinite);
    const min = Math.floor(Math.min(...values));
    const max = Math.ceil(Math.max(...values));
    return { min, max: max > min ? max : min + 1, label: STAT_DEFS[key].label };
  }

  function eligiblePlayers() {
    return players.filter((p) => Number.isFinite(p[statX]) && Number.isFinite(p[statY]));
  }

  function randomStatKey(exclude) {
    const keys = Object.keys(STAT_DEFS).filter((k) => k !== exclude);
    return keys[Math.floor(Math.random() * keys.length)];
  }

  function pickStatPair() {
    if (forceStatPairCheckbox.checked) {
      const x = statXSelect.value;
      const y = statYSelect.value === x ? randomStatKey(x) : statYSelect.value;
      return [x, y];
    }
    const x = randomStatKey();
    const y = randomStatKey(x);
    return [x, y];
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
    guessResults.push({ statX, statY, score, playerName: target.name });

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

    const xShort = STAT_DEFS[statX].short;
    const yShort = STAT_DEFS[statY].short;
    resultGuess.textContent = `${dataPoint.x.toFixed(1)} ${xShort}, ${dataPoint.y.toFixed(1)} ${yShort}`;
    resultTargetName.textContent = target.name;
    resultTarget.textContent = `${target.x.toFixed(1)} ${xShort}, ${target.y.toFixed(1)} ${yShort}`;
    resultDistance.textContent = Math.round((dist / Math.SQRT2) * 100);
    resultScore.textContent = score;
    resultsSection.hidden = false;

    if (guessIndex < ROUND_SIZE) {
      actionBtn.disabled = false;
      actionBtn.textContent = `Flip It (${guessIndex + 1}/${ROUND_SIZE})`;
    } else {
      roundOver = true;
      resultsSection.hidden = true;
      const total = guessResults.reduce((a, r) => a + r.score, 0);
      const snark = snarkFor(total, ROUND_MAX);
      roundTotalScoreEl.textContent = total;
      roundSnarkEl.textContent = `${snark.emoji} ${snark.text}`;
      roundBreakdownEl.textContent = guessResults
        .map((r) => `${STAT_DEFS[r.statX].short} vs ${STAT_DEFS[r.statY].short}: ${r.score}`)
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
      lines.push(`${i + 1}. ${STAT_DEFS[r.statX].short} vs ${STAT_DEFS[r.statY].short} (${r.playerName}) — ${r.score}`);
    });
    return lines.join('\n');
  }

  function pickPlayer() {
    const pool = eligiblePlayers();
    const chosenName = playerSelect.value;
    if (chosenName) {
      const found = pool.find((p) => p.name === chosenName);
      if (found) return found;
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function beginNextGuess() {
    guessIndex += 1;

    [statX, statY] = pickStatPair();
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

    const player = pickPlayer();
    target = { x: player[statX], y: player[statY], name: player.name };

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

    targetDisplay.textContent = `${player.name} — ${STAT_DEFS[statX].label} vs ${STAT_DEFS[statY].label}`;
    roundProgress.textContent = `Guess ${guessIndex} of ${ROUND_SIZE}`;

    actionBtn.disabled = true;
    actionBtn.textContent = 'Cooking…';
  }

  function beginRound() {
    guessIndex = 0;
    guessResults = [];
    roundOver = false;
    roundSummary.hidden = true;

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

  svg.addEventListener('pointerdown', (evt) => {
    if (locked) return;
    evt.preventDefault();
    svg.setPointerCapture(evt.pointerId);
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

  svg.addEventListener('pointermove', (evt) => {
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

  svg.addEventListener('pointerup', handlePointerEnd);
  svg.addEventListener('pointercancel', handlePointerEnd);

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

  drawGridlines();
  setZoom(1);

  fetch('players.json')
    .then((res) => res.json())
    .then((data) => {
      players = data;
      players.forEach((p) => {
        const opt = document.createElement('option');
        opt.value = p.name;
        opt.textContent = p.name;
        playerSelect.appendChild(opt);
      });
      actionBtn.disabled = false;
      actionBtn.textContent = 'Fire Up the Griddle';
      targetDisplay.textContent = 'Ready when you are!';
      roundProgress.textContent = `${players.length} players loaded — press "Fire Up the Griddle" to begin.`;
    })
    .catch((err) => {
      targetDisplay.textContent = 'Failed to load players.json — check the console.';
      console.error(err);
    });
})();

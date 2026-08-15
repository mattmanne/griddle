(() => {
  // DOM-free game logic (pack config, scoring math, stat-pair sampling, snark
  // tiers, etc.) lives in lib/pure.js so it can be unit-tested with plain Node —
  // see CLAUDE.md's "Testing" section. Everything below is the DOM-wiring half.
  const {
    PACKS, PACK_KEYS, GRID, SCORE_MAX, READY_MESSAGES,
    clamp, capitalize, randomKey, randomItem,
    axisRangeForStat, eligibleEntries, hasEligiblePair, pickEligiblePair, pickEntry,
    computeScore, packClauseText, poolSummary, snarkFor, guessSnarkFor,
  } = window.GriddleLogic;

  let enabledPacks = new Set(PACK_KEYS);
  let debugPack = PACK_KEYS[0];
  let dataCache = {};

  let currentPack = debugPack;
  let STAT_DEFS = PACKS[currentPack].statDefs;

  const ZOOM_MIN = 1;
  const ZOOM_MAX = 4;
  const ROUND_SIZE = 5;
  const ROUND_MAX = SCORE_MAX * ROUND_SIZE;

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
  const forcedEntryBadge = document.getElementById('forced-entry-badge');
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
        if (!hasEligiblePair(dataCache, pack, x, y)) {
          ({ x, y } = pickEligiblePair(dataCache, pack, keys, avoid));
        }
      } else {
        ({ x, y } = pickEligiblePair(dataCache, pack, keys, avoid));
      }
      return { pack, x, y };
    }
    const pack = randomKey(Array.from(enabledPacks));
    const keys = Object.keys(PACKS[pack].statDefs);
    const avoid = pack === currentPack ? [statX, statY] : null;
    const { x, y } = pickEligiblePair(dataCache, pack, keys, avoid);
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

    // Keep whatever point was centered in the viewport still centered after the
    // resize below, expressed as a fraction of the (old) scrollable content size —
    // otherwise zooming via the slider (unlike pinch-zoom, which tracks the pinch
    // centroid itself) leaves the scroll position untouched and can strand the
    // area you were looking at off-screen.
    const oldWidth = svg.clientWidth || Math.round(baseSize * parseFloat(zoomSlider.value));
    const oldHeight = svg.clientHeight || oldWidth;
    const centerFracX = oldWidth ? (viewport.scrollLeft + viewport.clientWidth / 2) / oldWidth : 0.5;
    const centerFracY = oldHeight ? (viewport.scrollTop + viewport.clientHeight / 2) / oldHeight : 0.5;

    const px = Math.round(baseSize * z);
    svg.style.width = px + 'px';
    svg.style.height = px + 'px';
    const wafflePx = Math.round(36 * z);
    viewport.style.backgroundSize = `${wafflePx}px ${wafflePx}px`;
    zoomSlider.value = z;

    viewport.scrollLeft = centerFracX * px - viewport.clientWidth / 2;
    viewport.scrollTop = centerFracY * px - viewport.clientHeight / 2;
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

  function finalizeGuess(dataPoint) {
    if (locked || !target) return;
    locked = true;

    const { dist, score } = computeScore(dataPoint, target, AXIS_X, AXIS_Y);
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

  function beginNextGuess() {
    guessIndex += 1;

    const ctx = pickRoundContext();
    currentPack = ctx.pack;
    STAT_DEFS = PACKS[currentPack].statDefs;
    entries = dataCache[currentPack];
    statX = ctx.x;
    statY = ctx.y;
    AXIS_X = axisRangeForStat(entries, STAT_DEFS, statX);
    AXIS_Y = axisRangeForStat(entries, STAT_DEFS, statY);
    axisTop.textContent = `${AXIS_Y.label} max: ${AXIS_Y.max}`;
    axisTop.title = axisTop.textContent;
    axisBottom.textContent = `${AXIS_Y.label} min: ${AXIS_Y.min}`;
    axisBottom.title = axisBottom.textContent;
    axisLeft.textContent = `${AXIS_X.label} min: ${AXIS_X.min}`;
    axisLeft.title = axisLeft.textContent;
    axisRight.textContent = `${AXIS_X.label} max: ${AXIS_X.max}`;
    axisRight.title = axisRight.textContent;

    const pool = eligibleEntries(entries, statX, statY);
    const entry = pickEntry(pool, entrySelect.value, entries);
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
    updateForcedEntryIndicator();
  }

  // A forced entry (anything but "Random") stays in effect independently of the
  // "lock stat pair" checkbox — a real, useful combination (same entry, rotating
  // stat pairs), not a bug. But playtesting found it's easy to forget it's still
  // set after unchecking "lock stat pair," since nothing else in the UI showed it
  // was active. This badge is the fix: a visible reminder, not a behavior change.
  function updateForcedEntryIndicator() {
    const forced = entrySelect.value !== '';
    forcedEntryBadge.hidden = !forced;
  }

  function updateEntryLabel() {
    entryLabelEl.textContent = capitalize(PACKS[debugPack].noun);
  }

  function updatePackUI() {
    packButtons.forEach((btn) => btn.classList.toggle('active', enabledPacks.has(btn.dataset.pack)));
    packClause.textContent = packClauseText(enabledPacks, PACKS);
    packCountSummary.textContent = `(${enabledPacks.size}/${PACK_KEYS.length} active)`;
    if (guessIndex === 0 && !roundOver) {
      roundProgress.textContent = `${poolSummary(enabledPacks, dataCache, PACKS)} loaded — press "Fire Up the Griddle" to begin.`;
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

  entrySelect.addEventListener('change', updateForcedEntryIndicator);

  drawGridlines();
  setZoom(1);
  loadAllData();
})();

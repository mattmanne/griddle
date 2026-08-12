(() => {
  const AXIS_X = { min: 0, max: 100, label: 'X' };
  const AXIS_Y = { min: 0, max: 100, label: 'Y' };
  const GRID = 1000;
  const SCORE_MAX = 1000;
  const SCORE_DECAY_RATE = 4;
  const ZOOM_MIN = 1;
  const ZOOM_MAX = 4;

  const svg = document.getElementById('grid-svg');
  const viewport = document.getElementById('viewport');
  const gridlinesGroup = document.getElementById('gridlines');
  const guessMarker = document.getElementById('guess-marker');
  const targetMarker = document.getElementById('target-marker');
  const guideX = document.getElementById('guide-x');
  const guideY = document.getElementById('guide-y');
  const resultLine = document.getElementById('result-line');
  const zoomSlider = document.getElementById('zoom-slider');
  const newRoundBtn = document.getElementById('new-round-btn');
  const useCustomBtn = document.getElementById('use-custom-btn');
  const customX = document.getElementById('custom-x');
  const customY = document.getElementById('custom-y');
  const targetDisplay = document.getElementById('target-display');
  const resultsSection = document.getElementById('results');
  const resultGuess = document.getElementById('result-guess');
  const resultTarget = document.getElementById('result-target');
  const resultDistance = document.getElementById('result-distance');
  const resultScore = document.getElementById('result-score');
  const roundsPlayedEl = document.getElementById('rounds-played');
  const averageScoreEl = document.getElementById('average-score');

  let baseSize = viewport.clientWidth;
  let target = null;
  let locked = false;
  let previewData = null;
  const pointers = new Map();
  let mode = 'idle';
  let pinchStart = null;
  const scores = [];

  function randomInRange(axis) {
    return Math.round((axis.min + Math.random() * (axis.max - axis.min)) * 10) / 10;
  }

  function randomTarget() {
    return { x: randomInRange(AXIS_X), y: randomInRange(AXIS_Y) };
  }

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
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
      v.setAttribute('stroke', 'var(--grid-line)');
      gridlinesGroup.appendChild(v);

      const h = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      h.setAttribute('x1', 0); h.setAttribute('y1', pos);
      h.setAttribute('x2', GRID); h.setAttribute('y2', pos);
      h.setAttribute('class', 'gridline');
      h.setAttribute('stroke', 'var(--grid-line)');
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
    guessMarker.setAttribute('cx', sx);
    guessMarker.setAttribute('cy', sy);
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
    scores.push(score);

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

    targetDisplay.textContent = `X = ${target.x}, Y = ${target.y}`;
    resultGuess.textContent = `X = ${dataPoint.x.toFixed(1)}, Y = ${dataPoint.y.toFixed(1)}`;
    resultTarget.textContent = `X = ${target.x}, Y = ${target.y}`;
    resultDistance.textContent = Math.round((dist / Math.SQRT2) * 100);
    resultScore.textContent = score;
    resultsSection.hidden = false;

    roundsPlayedEl.textContent = scores.length;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    averageScoreEl.textContent = avg.toFixed(0);
  }

  function startRound(customTarget) {
    target = customTarget || randomTarget();
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
    targetDisplay.textContent = `X = ${target.x}, Y = ${target.y}`;
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

  newRoundBtn.addEventListener('click', () => startRound());

  useCustomBtn.addEventListener('click', () => {
    const x = clamp(parseFloat(customX.value), AXIS_X.min, AXIS_X.max);
    const y = clamp(parseFloat(customY.value), AXIS_Y.min, AXIS_Y.max);
    if (Number.isNaN(x) || Number.isNaN(y)) return;
    startRound({ x, y });
  });

  window.addEventListener('resize', () => {
    baseSize = viewport.clientWidth;
    setZoom(parseFloat(zoomSlider.value));
  });

  document.getElementById('y-max-label').textContent = AXIS_Y.max;
  document.getElementById('y-min-label').textContent = AXIS_Y.min;
  document.getElementById('x-min-label').textContent = AXIS_X.min;
  document.getElementById('x-max-label').textContent = AXIS_X.max;

  drawGridlines();
  setZoom(1);
  startRound();
})();

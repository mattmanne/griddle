// Browser-driven integration tests — the regression suite for bugs a unit test
// can't reach (real DOM hit-testing, pointer events, CSS layout). Each test gets
// its own fresh page (so game state never leaks between tests) but they all
// share one Chromium instance and one static server for speed.
// Run with `npm test` or `node --test test/`.
'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const testServer = require('./server.js');

let browser;
let baseUrl;
let stopServer;

before(async () => {
  const { server, url } = await testServer.start();
  baseUrl = url;
  stopServer = () => new Promise((resolve) => server.close(resolve));
  browser = await chromium.launch();
});

after(async () => {
  await browser.close();
  await stopServer();
});

async function newPage({ debug = false } = {}) {
  // Own browser context per page (not just browser.newPage()) so we can grant
  // clipboard permissions for the "Copy My Batch" test without affecting others.
  const context = await browser.newContext({ viewport: { width: 480, height: 1300 } });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: baseUrl });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));
  // Kitchen Prep is gated behind ?debug=1 (backlog #12) — tests that need to
  // open it opt in explicitly rather than relying on it being visible by default.
  await page.goto(debug ? `${baseUrl}?debug=1` : baseUrl);
  await page.waitForSelector('#target-display', { timeout: 10000 });
  return { page, consoleErrors };
}

async function dragAt(page, fx, fy) {
  const box = await page.locator('#grid-svg').boundingBox();
  const x = box.x + box.width * fx;
  const y = box.y + box.height * fy;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 2, y + 2);
  await page.mouse.up();
  await page.waitForTimeout(120);
}

async function doGuess(page, fx = 0.4, fy = 0.4) {
  await page.locator('#action-btn').click();
  await page.waitForTimeout(120);
  await dragAt(page, fx, fy);
}

describe('a full 5-guess batch', () => {
  test('completes and shows the round summary with no console errors', async () => {
    const { page, consoleErrors } = await newPage();
    for (let i = 0; i < 5; i++) {
      await doGuess(page);
    }
    assert.equal(await page.locator('#round-summary').isHidden(), false);
    const total = await page.locator('#round-total-score').textContent();
    assert.ok(Number(total) >= 0 && Number(total) <= 5000);
    assert.deepEqual(consoleErrors, []);
    await page.close();
  });
});

describe('drag hint', () => {
  test('shows after starting a guess and hides once the drag begins', async () => {
    // A playtester repeatedly mistook "clicked the action button" for "guess
    // submitted," not realizing the drag itself is the required second step —
    // most visibly on the 5th guess, where they expected the recap right after
    // clicking "Flip It (5/5)". This on-grid hint is the fix.
    const { page } = await newPage();
    await page.locator('#action-btn').click();
    await page.waitForTimeout(150);
    assert.equal(await page.locator('#drag-hint').isHidden(), false);

    await dragAt(page, 0.4, 0.4);
    assert.equal(await page.locator('#drag-hint').isHidden(), true);
    await page.close();
  });
});

describe('difficulty: Regular reference markers', () => {
  test('Regular is active by default and plots reference entries (name only, never the target)', async () => {
    const { page } = await newPage();
    assert.equal(await page.locator('.difficulty-btn[data-difficulty="regular"]').getAttribute('class'), 'difficulty-btn active');

    await page.locator('#action-btn').click();
    await page.waitForTimeout(150);

    const dotCount = await page.locator('#reference-markers .reference-dot').count();
    assert.ok(dotCount >= 1 && dotCount <= 5, `expected 1-5 reference dots, saw ${dotCount}`);
    const labelCount = await page.locator('#reference-markers .reference-label').count();
    assert.equal(labelCount, dotCount);

    const targetName = (await page.locator('#target-display').textContent()).split('—')[0].trim();
    const labels = await page.locator('#reference-markers .reference-label').allTextContents();
    assert.ok(labels.every((l) => !targetName.endsWith(l) && l.length > 0));
    await page.close();
  });

  test('switching to Hard clears reference markers immediately, mid-guess', async () => {
    // A playtester reported "the Regular/Hard buttons don't work" — root cause
    // was that the effect used to be deferred to the NEXT guess (matching the
    // pack-toggle precedent), but reference markers are already visible on
    // screen, so clicking Hard while dots are showing and having nothing
    // happen reads exactly like a dead button. Fixed to apply immediately.
    const { page } = await newPage();
    await page.locator('#action-btn').click();
    await page.waitForTimeout(150);
    assert.ok((await page.locator('#reference-markers .reference-dot').count()) > 0);

    await page.locator('.settings summary').click();
    await page.locator('.difficulty-btn[data-difficulty="hard"]').click();
    assert.equal(await page.locator('.difficulty-btn[data-difficulty="hard"]').getAttribute('class'), 'difficulty-btn active');
    assert.equal(await page.locator('#reference-markers .reference-dot').count(), 0);

    await page.locator('.difficulty-btn[data-difficulty="regular"]').click();
    assert.ok((await page.locator('#reference-markers .reference-dot').count()) > 0);
    await page.close();
  });

  test('switching to Hard clears reference markers on the next guess too', async () => {
    const { page } = await newPage();
    await doGuess(page); // guess 1, Regular (default) — has reference markers

    await page.locator('.settings summary').click();
    await page.locator('.difficulty-btn[data-difficulty="hard"]').click();
    assert.equal(await page.locator('.difficulty-btn[data-difficulty="hard"]').getAttribute('class'), 'difficulty-btn active');

    await page.locator('#action-btn').click(); // start guess 2 under Hard
    await page.waitForTimeout(150);
    assert.equal(await page.locator('#reference-markers .reference-dot').count(), 0);
    await page.close();
  });

  test('switching difficulty mid-batch does not reset the round', async () => {
    const { page } = await newPage();
    await doGuess(page); // guess 1 of 5
    assert.equal(await page.locator('#round-progress').textContent(), 'Guess 1 of 5');
    await page.locator('.settings summary').click();
    await page.locator('.difficulty-btn[data-difficulty="hard"]').click();
    assert.equal(await page.locator('#round-progress').textContent(), 'Guess 1 of 5');
    await page.close();
  });
});

describe('regression: a failed pointer capture does not strand a guess', () => {
  test('the drag still registers even if setPointerCapture throws', async () => {
    // setPointerCapture can throw for pointer-lifecycle reasons outside our
    // control (platform/browser quirks) — a real playtester hit this and got
    // stuck mid-batch with the action button frozen on "Cooking..." and no way
    // to recover short of reloading, since the unguarded throw aborted the
    // pointerdown handler before the pointer was ever added to the tracking
    // Map. See CLAUDE.md's drag-to-guess section.
    const { page, consoleErrors } = await newPage();
    await page.evaluate(() => {
      const vp = document.getElementById('viewport');
      const orig = vp.setPointerCapture.bind(vp);
      let armed = true;
      vp.setPointerCapture = (id) => {
        if (armed) { armed = false; throw new DOMException('forced failure for test', 'NotFoundError'); }
        return orig(id);
      };
    });

    await page.locator('#action-btn').click();
    await page.waitForTimeout(120);
    await dragAt(page, 0.4, 0.4);

    assert.equal(await page.locator('#action-btn').textContent(), 'Flip It (2/5)');
    assert.equal(await page.locator('#results').isHidden(), false);
    assert.deepEqual(consoleErrors, []);
    await page.close();
  });
});

describe('regression: pinch-zoom ending one finger at a time does not submit a stale guess', () => {
  test('the finalized guess uses the remaining finger\'s current position, not the pre-pinch one', async () => {
    // A real two-finger pinch almost never ends with both fingers lifting at
    // the exact same instant — one lifts first, leaving one still down.
    // Before this fix, that remaining finger's eventual release finalized the
    // guess using whatever position was recorded before the pinch even
    // started, silently submitting a guess nowhere near where the player was
    // actually looking. See CLAUDE.md's drag-to-guess section.
    const { page, consoleErrors } = await newPage();
    await page.locator('#action-btn').click();
    await page.waitForTimeout(150);

    const axisLeftText = await page.locator('#axis-left').textContent();
    const axisRightText = await page.locator('#axis-right').textContent();
    const min = Number(axisLeftText.match(/-?[\d.]+$/)[0]);
    const max = Number(axisRightText.match(/-?[\d.]+$/)[0]);

    const box = await page.locator('#grid-svg').boundingBox();
    const x1 = box.x + box.width * 0.2, y1 = box.y + box.height * 0.2;
    const x2 = box.x + box.width * 0.8, y2 = box.y + box.height * 0.8;

    await page.evaluate(({ x1, y1, x2, y2 }) => {
      const vp = document.getElementById('viewport');
      const fire = (type, id, cx, cy, isPrimary) => {
        vp.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: cx, clientY: cy, isPrimary, pointerType: 'touch', bubbles: true, cancelable: true }));
      };
      fire('pointerdown', 1, x1, y1, true);  // finger 1 starts a single-finger drag
      fire('pointerdown', 2, x2, y2, false); // finger 2 touches down (pinch begins)
      fire('pointerup', 1, x1, y1, true);    // finger 1 lifts first (natural pinch end)
      fire('pointerup', 2, x2, y2, false);   // finger 2 (still down) lifts last
    }, { x1, y1, x2, y2 });

    await page.waitForTimeout(200);
    assert.equal(await page.locator('#action-btn').textContent(), 'Flip It (2/5)');

    const guessText = await page.locator('#result-guess').textContent();
    const guessedX = Number(guessText.match(/^-?[\d.]+/)[0]);
    const fractionGuessed = (guessedX - min) / (max - min);
    // x2 was at 80% across the grid; x1 (the stale pre-pinch position) was at
    // 20% — a wide enough gap that landing near 80% confirms the fix, not
    // pixel-rounding noise.
    assert.ok(fractionGuessed > 0.6, `expected guess near the x2 (80%) position, landed at fraction ${fractionGuessed.toFixed(2)}`);
    assert.deepEqual(consoleErrors, []);
    await page.close();
  });
});

describe('regression: round-completion is unmissable', () => {
  test('the summary scrolls into view even when the batch finished off-screen', async () => {
    // A playtester repeatedly reported "no recap after 5 guesses" — turned out
    // the transition was real but easy to miss if scrolled away from the top.
    const { page } = await newPage();
    for (let i = 0; i < 5; i++) {
      await doGuess(page);
    }
    await page.waitForTimeout(500); // let the smooth scroll settle
    const summaryBox = await page.locator('#round-summary').boundingBox();
    const viewportSize = page.viewportSize();
    assert.ok(summaryBox.y >= 0 && summaryBox.y < viewportSize.height,
      `expected #round-summary within the viewport without manual scrolling, got y=${summaryBox.y}`);
    await page.close();
  });

  test('starting a new batch scrolls back to the top', async () => {
    const { page } = await newPage();
    for (let i = 0; i < 5; i++) {
      await doGuess(page);
    }
    await page.waitForTimeout(300);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.locator('#replay-btn').click();
    await page.waitForTimeout(500);
    assert.equal(await page.evaluate(() => window.scrollY), 0);
    await page.close();
  });
});

describe('regression: axis labels stay within the viewport on a narrow phone', () => {
  test('no horizontal overflow after starting a guess on a 390px-wide screen', async () => {
    // The X-axis chip went through two attempts — the first visibly clipped
    // text on a narrow viewport, caught only by manual inspection, not by any
    // test. Pins the tolerance down so a future CSS change gets a fast signal.
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(baseUrl);
    await page.waitForSelector('#target-display', { timeout: 10000 });
    await page.locator('#action-btn').click();
    await page.waitForTimeout(200);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    assert.ok(scrollWidth - clientWidth <= 15,
      `expected at most ~15px of overflow, got ${scrollWidth - clientWidth}px (scrollWidth=${scrollWidth}, clientWidth=${clientWidth})`);
    await page.close();
  });
});

describe('pack toggling', () => {
  test('does not reset an in-progress round', async () => {
    const { page } = await newPage();
    await doGuess(page); // guess 1 of 5
    assert.equal(await page.locator('#round-progress').textContent(), 'Guess 1 of 5');

    await page.locator('.settings summary').click();
    await page.locator('.pack-btn[data-pack="nhl"]').click(); // toggle a pack off mid-batch

    // still on guess 1's progress text — toggling shouldn't have reset guessIndex
    assert.equal(await page.locator('#round-progress').textContent(), 'Guess 1 of 5');
    await page.close();
  });
});

describe('regression: corner-click dead zone (fixed by moving drag listeners to .viewport)', () => {
  test('a drag starting at the literal top-left corner of the grid registers', async () => {
    const { page, consoleErrors } = await newPage();
    await page.locator('#action-btn').click();
    await page.waitForTimeout(120);
    const box = await page.locator('#grid-svg').boundingBox();
    await page.mouse.move(box.x, box.y); // the exact corner pixel
    await page.mouse.down();
    await page.mouse.move(box.x + 3, box.y + 3);
    await page.mouse.up();
    await page.waitForTimeout(200);
    // if the drag didn't register, the button stays stuck on "Cooking…"
    assert.equal(await page.locator('#action-btn').textContent(), 'Flip It (2/5)');
    assert.deepEqual(consoleErrors, []);
    await page.close();
  });

  test('a drag starting at the literal bottom-right corner also registers', async () => {
    const { page, consoleErrors } = await newPage();
    await page.locator('#action-btn').click();
    await page.waitForTimeout(120);
    const box = await page.locator('#grid-svg').boundingBox();
    await page.mouse.move(box.x + box.width, box.y + box.height);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 3, box.y + box.height - 3);
    await page.mouse.up();
    await page.waitForTimeout(200);
    assert.equal(await page.locator('#action-btn').textContent(), 'Flip It (2/5)');
    assert.deepEqual(consoleErrors, []);
    await page.close();
  });
});

describe('Kitchen Prep gating (backlog #12)', () => {
  test('is hidden from a normal visit and revealed by ?debug=1', async () => {
    const { page } = await newPage();
    assert.equal(await page.locator('.practice-settings').isHidden(), true);
    await page.close();

    const { page: debugPage } = await newPage({ debug: true });
    assert.equal(await debugPage.locator('.practice-settings').isHidden(), false);
    await debugPage.close();
  });

  test('unlock persists across reloads without the query param', async () => {
    const { page } = await newPage({ debug: true });
    await page.goto(baseUrl);
    await page.waitForSelector('#target-display', { timeout: 10000 });
    assert.equal(await page.locator('.practice-settings').isHidden(), false);
    await page.close();
  });
});

describe('regression: invalid forced debug stat pair no longer crashes the round', () => {
  test('forcing a QB-only stat against a WR-only stat in football_cfb falls back to a valid pair', async () => {
    const { page, consoleErrors } = await newPage({ debug: true });

    // No need to isolate football_cfb via the pack toggles first — forcing a
    // stat pair in Kitchen Prep always draws from #debug-pack-select's chosen
    // pack directly, ignoring enabledPacks entirely (see pickRoundContext()).
    await page.locator('.practice-settings summary').click();
    await page.selectOption('#debug-pack-select', 'football_cfb');
    await page.check('#force-stat-pair');
    await page.selectOption('#stat-x-select', { label: 'Passer Rating' });
    await page.selectOption('#stat-y-select', { label: 'Yards per Reception' });

    await page.locator('#action-btn').click();
    await page.waitForTimeout(200);
    await dragAt(page, 0.4, 0.4);
    await page.waitForTimeout(150);

    assert.equal(await page.locator('#results').isHidden(), false);
    const resultTarget = await page.locator('#result-target').textContent();
    assert.ok(resultTarget.length > 0);
    assert.deepEqual(consoleErrors, []);
    await page.close();
  });
});

describe('Kitchen Prep forced-entry badge', () => {
  test('appears when a specific entry is forced and disappears when reset to Random', async () => {
    const { page } = await newPage({ debug: true });
    await page.locator('.practice-settings summary').click();
    assert.equal(await page.locator('#forced-entry-badge').isHidden(), true);

    await page.selectOption('#entry-select', { index: 1 });
    assert.equal(await page.locator('#forced-entry-badge').isHidden(), false);

    await page.selectOption('#entry-select', '');
    assert.equal(await page.locator('#forced-entry-badge').isHidden(), true);
    await page.close();
  });
});

describe('zoom slider', () => {
  test('re-centers the viewport scroll position when zoom changes', async () => {
    const { page } = await newPage();
    await page.locator('#action-btn').click();
    await page.waitForTimeout(120);
    await page.locator('#viewport').evaluate((el) => { el.scrollLeft = 0; el.scrollTop = 0; });

    const before_ = await page.locator('#viewport').evaluate((el) => ({ l: el.scrollLeft, t: el.scrollTop }));
    await page.locator('#zoom-slider').evaluate((el) => { el.value = '3'; el.dispatchEvent(new Event('input')); });
    await page.waitForTimeout(100);
    const after_ = await page.locator('#viewport').evaluate((el) => ({ l: el.scrollLeft, t: el.scrollTop }));

    assert.ok(before_.l !== after_.l || before_.t !== after_.t, 'scroll position should shift to keep the same area centered');
    await page.close();
  });

  test('visibly scales the waffle background pattern along with the grid', async () => {
    const { page } = await newPage();
    const before_ = await page.locator('#viewport').evaluate((el) => getComputedStyle(el).backgroundSize);
    await page.locator('#zoom-slider').evaluate((el) => { el.value = '4'; el.dispatchEvent(new Event('input')); });
    await page.waitForTimeout(100);
    const after_ = await page.locator('#viewport').evaluate((el) => getComputedStyle(el).backgroundSize);
    assert.notEqual(before_, after_);
    await page.close();
  });
});

describe('info modal', () => {
  test('opens on info-button click and closes on backdrop click', async () => {
    const { page } = await newPage();
    assert.equal(await page.locator('#info-modal').evaluate((d) => d.open), false);
    await page.locator('#info-btn').click();
    assert.equal(await page.locator('#info-modal').evaluate((d) => d.open), true);

    const box = await page.locator('#info-modal').boundingBox();
    await page.mouse.click(box.x - 5, box.y - 5);
    await page.waitForTimeout(100);
    assert.equal(await page.locator('#info-modal').evaluate((d) => d.open), false);
    await page.close();
  });
});

describe('Copy My Batch', () => {
  test('copies the share text to the clipboard and confirms with button text', async () => {
    const { page, consoleErrors } = await newPage();
    for (let i = 0; i < 5; i++) {
      await doGuess(page);
    }
    const shareText = await page.locator('#share-text').inputValue();
    assert.ok(shareText.startsWith('Griddle 🧇'));

    await page.locator('#copy-results-btn').click();
    await page.waitForTimeout(100);
    assert.equal(await page.locator('#copy-results-btn').textContent(), 'Copied!');

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    // The OS clipboard round-trip normalizes line endings to CRLF on Windows —
    // that's a platform quirk in the read-back, not something app.js controls or
    // should try to counteract, so normalize before comparing content.
    assert.equal(clipboardText.replace(/\r\n/g, '\n'), shareText);
    assert.deepEqual(consoleErrors, []);
    await page.close();
  });
});

describe('Kitchen Prep "lock this stat pair"', () => {
  test('holds the same stat pair across all 5 guesses in a batch', async () => {
    const { page } = await newPage({ debug: true });
    await page.locator('.practice-settings summary').click();
    await page.selectOption('#debug-pack-select', 'space_planets');
    await page.check('#force-stat-pair');
    await page.selectOption('#stat-x-select', { label: 'Diameter (km)' });
    await page.selectOption('#stat-y-select', { label: 'Number of Moons' });

    const pairsSeen = new Set();
    for (let i = 0; i < 5; i++) {
      await page.locator('#action-btn').click();
      await page.waitForTimeout(120);
      const target = await page.locator('#target-display').textContent();
      pairsSeen.add(target.split('—')[1].trim());
      await dragAt(page, 0.4, 0.4);
    }
    assert.equal(pairsSeen.size, 1, `expected one locked pair across all 5 guesses, saw: ${[...pairsSeen]}`);
    assert.ok([...pairsSeen][0].includes('Diameter') && [...pairsSeen][0].includes('Number of Moons'));
    await page.close();
  });
});

describe('pack toggles', () => {
  test('the last active pack cannot be deselected', async () => {
    const { page } = await newPage();
    await page.locator('.settings summary').click();
    // Read the pack list from the page itself rather than hardcoding it, so
    // this test doesn't need updating every time a pack is added or removed.
    const allPacks = await page.locator('.pack-btn').evaluateAll((els) => els.map((el) => el.dataset.pack));
    const total = allPacks.length;
    const lastPack = allPacks[allPacks.length - 1];
    for (const p of allPacks.slice(0, -1)) {
      await page.locator(`.pack-btn[data-pack="${p}"]`).click();
    }
    // all but one turned off — the last one should remain active no matter what
    assert.equal(await page.locator('#pack-count-summary').textContent(), `(1/${total} active)`);
    await page.locator(`.pack-btn[data-pack="${lastPack}"]`).click(); // try to deselect the last one
    assert.equal(await page.locator('#pack-count-summary').textContent(), `(1/${total} active)`);
    assert.ok((await page.locator(`.pack-btn[data-pack="${lastPack}"]`).getAttribute('class')).includes('active'));
    await page.close();
  });
});

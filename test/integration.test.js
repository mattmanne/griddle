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

async function newPage() {
  const page = await browser.newPage({ viewport: { width: 480, height: 1300 } });
  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));
  await page.goto(baseUrl);
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

describe('pack toggling', () => {
  test('does not reset an in-progress round', async () => {
    const { page } = await newPage();
    await doGuess(page); // guess 1 of 5
    assert.equal(await page.locator('#round-progress').textContent(), 'Guess 1 of 5');

    await page.locator('.pack-settings summary').click();
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

describe('regression: invalid forced debug stat pair no longer crashes the round', () => {
  test('forcing a QB-only stat against a WR-only stat in football_cfb falls back to a valid pair', async () => {
    const { page, consoleErrors } = await newPage();

    // isolate football_cfb
    await page.locator('.pack-settings summary').click();
    const packs = ['nba', 'wnba', 'ncaam', 'mlb', 'nhl', 'football_cfb', 'football_nfl', 'geo_countries', 'geo_states', 'movies', 'space_planets', 'animals', 'music_artists', 'presidents'];
    for (const p of packs) {
      if (p !== 'football_cfb') {
        const cls = await page.locator(`.pack-btn[data-pack="${p}"]`).getAttribute('class');
        if (cls.includes('active')) await page.locator(`.pack-btn[data-pack="${p}"]`).click();
      }
    }

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
    const { page } = await newPage();
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

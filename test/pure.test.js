// Unit tests for lib/pure.js — the DOM-free half of Griddle's logic.
// Run with `npm test` or `node --test test/`.
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const G = require('../lib/pure.js');

describe('clamp', () => {
  test('passes values already inside the range through unchanged', () => {
    assert.equal(G.clamp(5, 0, 10), 5);
  });

  test('clamps below the minimum up to the minimum', () => {
    assert.equal(G.clamp(-5, 0, 10), 0);
  });

  test('clamps above the maximum down to the maximum', () => {
    assert.equal(G.clamp(15, 0, 10), 10);
  });
});

describe('capitalize', () => {
  test('uppercases only the first character', () => {
    assert.equal(G.capitalize('quarterback'), 'Quarterback');
  });
});

describe('pluralize', () => {
  test('appends a plain "s" by default', () => {
    assert.equal(G.pluralize('movie'), 'movies');
    assert.equal(G.pluralize('planet'), 'planets');
  });

  test('converts a consonant + "y" ending to "ies"', () => {
    assert.equal(G.pluralize('country'), 'countries');
  });

  test('does not treat a vowel + "y" ending as the consonant-y case', () => {
    // "day" ends in a vowel ("a") + y, so the regular +s rule applies, not +ies.
    assert.equal(G.pluralize('day'), 'days');
  });
});

describe('computeScore', () => {
  const axisX = { min: 0, max: 100 };
  const axisY = { min: 0, max: 100 };

  test('an exact guess scores the maximum (1000) with zero distance', () => {
    const { dist, score } = G.computeScore({ x: 50, y: 50 }, { x: 50, y: 50 }, axisX, axisY);
    assert.equal(dist, 0);
    assert.equal(score, G.SCORE_MAX);
  });

  test('score decreases as normalized distance increases', () => {
    const near = G.computeScore({ x: 51, y: 50 }, { x: 50, y: 50 }, axisX, axisY);
    const far = G.computeScore({ x: 90, y: 90 }, { x: 50, y: 50 }, axisX, axisY);
    assert.ok(near.score > far.score);
  });

  test('never returns a negative score, even for an extreme miss', () => {
    const { score } = G.computeScore({ x: 0, y: 0 }, { x: 100, y: 100 }, axisX, axisY);
    assert.ok(score >= 0);
  });
});

describe('axisRangeForStat', () => {
  const entries = [{ pts: 10 }, { pts: 25.4 }, { pts: 3 }, { pts: NaN }, {}];
  const statDefs = { pts: { label: 'Points/Game', short: 'PPG' } };

  test('floors the min and ceils the max of finite values', () => {
    const range = G.axisRangeForStat(entries, statDefs, 'pts');
    assert.equal(range.min, 3);
    assert.equal(range.max, 26);
    assert.equal(range.label, 'Points/Game');
  });

  test('ignores missing/NaN fields rather than treating them as 0', () => {
    const range = G.axisRangeForStat(entries, statDefs, 'pts');
    assert.ok(range.min > 0, 'a missing/NaN entry should not drag the min down to 0');
  });

  test('widens a degenerate (all-identical) range by 1 instead of min===max', () => {
    const range = G.axisRangeForStat([{ pts: 7 }, { pts: 7 }], statDefs, 'pts');
    assert.equal(range.min, 7);
    assert.equal(range.max, 8);
  });
});

describe('eligibleEntries', () => {
  const entries = [
    { name: 'A', x: 1, y: 2 },
    { name: 'B', x: 1 }, // missing y
    { name: 'C', y: 2 }, // missing x
    { name: 'D', x: 1, y: NaN },
  ];

  test('keeps only entries with a finite value for both stats', () => {
    const pool = G.eligibleEntries(entries, 'x', 'y');
    assert.deepEqual(pool.map((e) => e.name), ['A']);
  });
});

describe('hasEligiblePair', () => {
  const dataCache = {
    football_cfb: [
      { name: 'QB Guy', pass_yds: 250 },
      { name: 'WR Guy', rec_yds: 80 },
    ],
  };

  test('true when at least one entry has both fields', () => {
    assert.equal(G.hasEligiblePair(dataCache, 'football_cfb', 'pass_yds', 'pass_yds'), true);
  });

  test('false when no single entry has both fields (QB-only vs. WR-only stat)', () => {
    assert.equal(G.hasEligiblePair(dataCache, 'football_cfb', 'pass_yds', 'rec_yds'), false);
  });

  test('false for a pack with no cached data at all', () => {
    assert.equal(G.hasEligiblePair(dataCache, 'nonexistent_pack', 'a', 'b'), false);
  });
});

describe('pickEligiblePair', () => {
  // Mirrors the real football_cfb shape closely enough to exercise rejection
  // sampling: pass_yds/pass_td are QB-only, rec_yds/rec_td are WR-only, games
  // is shared by everyone.
  const dataCache = {
    mixed: [
      { name: 'QB', pass_yds: 250, pass_td: 2, games: 16 },
      { name: 'WR', rec_yds: 80, rec_td: 1, games: 16 },
    ],
  };
  const keys = ['pass_yds', 'pass_td', 'rec_yds', 'rec_td', 'games'];

  test('always returns a pair at least one entry actually has both fields for', () => {
    for (let i = 0; i < 50; i++) {
      const { x, y } = G.pickEligiblePair(dataCache, 'mixed', keys);
      assert.equal(
        G.hasEligiblePair(dataCache, 'mixed', x, y),
        true,
        `${x} vs ${y} should have had an eligible entry`
      );
    }
  });

  test('respects an avoid list when enough keys remain', () => {
    // Force every "coin flip" (Math.random) to land on the same two keys unless
    // avoided, by checking across many trials that the avoided keys never appear
    // together as long as the pool minus avoid still has 2+ options.
    for (let i = 0; i < 50; i++) {
      const { x, y } = G.pickEligiblePair(dataCache, 'mixed', keys, ['pass_yds', 'pass_td']);
      assert.ok(!(x === 'pass_yds' && y === 'pass_td') && !(x === 'pass_td' && y === 'pass_yds'));
    }
  });

  test('falls back to the full key list if avoiding would leave fewer than 2 keys', () => {
    const twoKeys = ['pass_yds', 'pass_td'];
    // Avoiding both of only two keys leaves nothing to sample from — should not throw.
    const { x, y } = G.pickEligiblePair(dataCache, 'mixed', twoKeys, twoKeys);
    assert.ok(twoKeys.includes(x) && twoKeys.includes(y));
  });
});

describe('pickEntry', () => {
  const pool = [{ name: 'Alice' }, { name: 'Bob' }];
  const allEntries = [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Zed', missingStat: true }];

  test('prefers the chosen name when it is in the eligible pool', () => {
    assert.deepEqual(G.pickEntry(pool, 'Bob', allEntries), { name: 'Bob' });
  });

  test('falls back to a random entry from the pool when no name is chosen', () => {
    const picked = G.pickEntry(pool, '', allEntries);
    assert.ok(pool.includes(picked));
  });

  test('falls back to a random pool entry when the chosen name is not eligible', () => {
    const picked = G.pickEntry(pool, 'Zed', allEntries);
    assert.ok(pool.includes(picked));
  });

  test('falls back to allEntries[0] when the eligible pool is empty (the debug edge case)', () => {
    assert.deepEqual(G.pickEntry([], 'anything', allEntries), allEntries[0]);
  });
});

describe('packClauseText', () => {
  test('uses the single pack\'s article + label + noun when only one pack is enabled', () => {
    const packs = { nba: { article: 'an', label: 'NBA', noun: 'player' } };
    assert.equal(G.packClauseText(new Set(['nba']), packs), 'an NBA player');
  });

  test('omits the label entirely for a labelless pack', () => {
    const packs = { geo_countries: { article: 'a', label: null, noun: 'country' } };
    assert.equal(G.packClauseText(new Set(['geo_countries']), packs), 'a country');
  });

  test('uses the shared noun when every enabled pack agrees', () => {
    const packs = {
      nba: { article: 'an', label: 'NBA', noun: 'player' },
      wnba: { article: 'a', label: 'WNBA', noun: 'player' },
    };
    assert.equal(G.packClauseText(new Set(['nba', 'wnba']), packs), 'a player');
  });

  test('falls back to "an entry" when enabled packs have different nouns', () => {
    const packs = {
      mlb: { article: 'an', label: 'MLB', noun: 'hitter' },
      nhl: { article: 'an', label: 'NHL', noun: 'skater' },
    };
    assert.equal(G.packClauseText(new Set(['mlb', 'nhl']), packs), 'an entry');
  });
});

describe('poolSummary', () => {
  test('formats count + label + pluralized noun, joined by " + "', () => {
    const packs = {
      nba: { label: 'NBA', noun: 'player' },
      geo_countries: { label: null, noun: 'country' },
    };
    const dataCache = { nba: new Array(108).fill({}), geo_countries: new Array(85).fill({}) };
    const summary = G.poolSummary(new Set(['nba', 'geo_countries']), dataCache, packs);
    assert.equal(summary, '108 NBA players + 85 countries');
  });

  test('keeps a singular noun for a pool of exactly 1', () => {
    const packs = { space_planets: { label: null, noun: 'planet' } };
    const dataCache = { space_planets: [{}] };
    assert.equal(G.poolSummary(new Set(['space_planets']), dataCache, packs), '1 planet');
  });
});

describe('snarkFor', () => {
  test('picks a tier whose text is one of that tier\'s own candidates, and the matching emoji', () => {
    const { emoji, text } = G.snarkFor(4500, 5000); // 90% -> top tier
    const topTier = G.SNARK_TIERS[0];
    assert.equal(emoji, topTier.emoji);
    assert.ok(topTier.texts.includes(text));
  });

  test('the worst tier is used for a near-zero batch', () => {
    const { text } = G.snarkFor(0, 5000);
    const worstTier = G.SNARK_TIERS[G.SNARK_TIERS.length - 1];
    assert.ok(worstTier.texts.includes(text));
  });
});

describe('guessSnarkFor', () => {
  test('returns text from the top tier for a perfect guess', () => {
    const text = G.guessSnarkFor(G.SCORE_MAX);
    assert.ok(G.GUESS_SNARK_TIERS[0].texts.includes(text));
  });

  test('returns text from the worst tier for a score of 0', () => {
    const text = G.guessSnarkFor(0);
    const worstTier = G.GUESS_SNARK_TIERS[G.GUESS_SNARK_TIERS.length - 1];
    assert.ok(worstTier.texts.includes(text));
  });
});

describe('PACKS data consistency', () => {
  test('every pack\'s defaultPair keys exist in its own statDefs', () => {
    for (const key of G.PACK_KEYS) {
      const pack = G.PACKS[key];
      for (const statKey of pack.defaultPair) {
        assert.ok(
          Object.prototype.hasOwnProperty.call(pack.statDefs, statKey),
          `${key}'s defaultPair references missing stat "${statKey}"`
        );
      }
    }
  });

  test('every pack has the required shape (label, noun, article, emoji, file, defaultPair, statDefs)', () => {
    for (const key of G.PACK_KEYS) {
      const pack = G.PACKS[key];
      assert.ok('label' in pack, `${key} missing label`);
      assert.equal(typeof pack.noun, 'string');
      assert.ok(pack.article === 'a' || pack.article === 'an', `${key} has an invalid article`);
      assert.equal(typeof pack.emoji, 'string');
      assert.ok(pack.file.endsWith('.json'), `${key}'s file should be a .json path`);
      assert.equal(pack.defaultPair.length, 2);
      assert.ok(Object.keys(pack.statDefs).length >= 2, `${key} needs at least 2 stat keys`);
    }
  });

  test('no two packs accidentally share the same data file', () => {
    const files = G.PACK_KEYS.map((k) => G.PACKS[k].file);
    assert.equal(new Set(files).size, files.length);
  });
});

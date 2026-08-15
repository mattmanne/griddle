// Structural integrity checks for the pack-data JSON files themselves — every
// file `PACKS` points at, cross-checked against that pack's own statDefs. This
// does NOT verify the stat *values* are factually accurate (that's backlog #13,
// a research/sourcing question) — only that the files are well-formed in the
// ways the game engine actually depends on.
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const G = require('../lib/pure.js');

const ROOT = path.join(__dirname, '..');

function loadPack(key) {
  const filePath = path.join(ROOT, G.PACKS[key].file);
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

describe('every pack file referenced by PACKS', () => {
  for (const key of G.PACK_KEYS) {
    describe(key, () => {
      test('exists and parses as a non-empty JSON array', () => {
        const data = loadPack(key);
        assert.ok(Array.isArray(data));
        assert.ok(data.length > 0, `${key}'s data file has no entries`);
      });

      test('every entry has a non-empty string name, and no two entries share a name', () => {
        const data = loadPack(key);
        const names = data.map((e) => e.name);
        for (const name of names) {
          assert.equal(typeof name, 'string');
          assert.ok(name.length > 0);
        }
        assert.equal(
          new Set(names).size,
          names.length,
          `${key} has duplicate entry names — see CLAUDE.md's within-file-duplicate-name rule`
        );
      });

      test('every non-name field on every entry is a real stat key for this pack (no stray fields)', () => {
        const data = loadPack(key);
        const validKeys = new Set(Object.keys(G.PACKS[key].statDefs));
        for (const entry of data) {
          for (const field of Object.keys(entry)) {
            if (field === 'name') continue;
            assert.ok(validKeys.has(field), `${key} entry "${entry.name}" has unexpected field "${field}"`);
          }
        }
      });

      test('every present stat field is a finite number (omitted, never null/NaN/a string)', () => {
        const data = loadPack(key);
        const validKeys = Object.keys(G.PACKS[key].statDefs);
        for (const entry of data) {
          for (const field of validKeys) {
            if (field in entry) {
              assert.ok(
                Number.isFinite(entry[field]),
                `${key} entry "${entry.name}"'s "${field}" should be a finite number or omitted entirely, not ${JSON.stringify(entry[field])}`
              );
            }
          }
        }
      });

      test('the default stat pair is not degenerate — at least one entry has both fields', () => {
        const data = loadPack(key);
        const [x, y] = G.PACKS[key].defaultPair;
        const eligible = G.eligibleEntries(data, x, y);
        assert.ok(eligible.length > 0, `${key}'s defaultPair (${x}, ${y}) has zero eligible entries`);
      });
    });
  }
});

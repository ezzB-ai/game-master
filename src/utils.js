'use strict';

const crypto = require('crypto');

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function pickMany(list, count) {
  const pool = [...list];
  const result = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}

function makeId(prefix) {
  return `${prefix}-${crypto.randomBytes(4).toString('hex')}`;
}

function normalize(str) {
  return String(str || '').trim().toLowerCase();
}

// Jaccard-ish overlap between two arrays of strings (case-insensitive).
function overlapCount(a, b) {
  const setB = new Set(b.map(normalize));
  return a.map(normalize).filter((x) => setB.has(x)).length;
}

function levenshtein(a, b) {
  a = normalize(a);
  b = normalize(b);
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

// Similarity ratio in [0,1], 1 = identical.
function nameSimilarity(a, b) {
  const dist = levenshtein(a, b);
  const maxLen = Math.max(normalize(a).length, normalize(b).length) || 1;
  return 1 - dist / maxLen;
}

module.exports = { pick, pickMany, makeId, normalize, overlapCount, levenshtein, nameSimilarity };

'use strict';

const { STAT_LIST } = require('./statBlock');

// Not a sourced ICRPG mechanic — a house heuristic for scaling encounters to
// the actual party, built from real player data (HEARTS, stat totals).
// Thresholds are a GM-facing convenience, not rulebook content.
const POWER_TIERS = [
  { id: 'Early', max: 50 },
  { id: 'Mid', max: 75 },
  { id: 'Late', max: 100 },
  { id: 'Heroic', max: Infinity },
];

function computePartyPowerLevel(players) {
  if (!players.length) {
    return { totalHearts: 0, averageStatBonus: 0, powerScore: 0, powerId: 'Early', playerCount: 0 };
  }
  const totalHearts = players.reduce((sum, p) => sum + (p.hearts || 0), 0);
  const totalStatPoints = players.reduce(
    (sum, p) => sum + STAT_LIST.reduce((s, stat) => s + ((p.stats && p.stats[stat]) || 0), 0),
    0
  );
  const averageStatBonus = totalStatPoints / (players.length * STAT_LIST.length);
  const powerScore = totalHearts + averageStatBonus * 5;
  const powerId = POWER_TIERS.find((t) => powerScore < t.max).id;
  return { totalHearts, averageStatBonus, powerScore, powerId, playerCount: players.length };
}

module.exports = { computePartyPowerLevel, POWER_TIERS };

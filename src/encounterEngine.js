'use strict';

const { pick } = require('./utils');
const { loadMechanicsRef } = require('./statBlock');
const { NPC_SPECIES, NPC_FIRST_NAMES, NPC_SURNAMES } = require('./data/wordbanks');

// House weighting per party power level — NOT a sourced rule. The actual
// mechanical content per tier (stat bonus, EFFORT bonus, actions, HEARTS)
// comes straight from mechanics-reference.json monsters.tiers.
const TIER_WEIGHTS_BY_POWER = {
  Early: { I: 85, II: 15, III: 0, IV: 0 },
  Mid: { I: 40, II: 50, III: 10, IV: 0 },
  Late: { I: 20, II: 40, III: 35, IV: 5 },
  Heroic: { I: 0, II: 10, III: 40, IV: 45, Unique: 5 },
};

function pickWeightedTier(powerId, excludeTiers = []) {
  const baseWeights = TIER_WEIGHTS_BY_POWER[powerId] || TIER_WEIGHTS_BY_POWER.Early;
  const weights = Object.fromEntries(
    Object.entries(baseWeights).filter(([tier]) => !excludeTiers.includes(tier))
  );
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  if (total <= 0) return excludeTiers.includes('I') ? 'II' : 'I'; // fallback if a filter zeroed everything out
  let roll = Math.random() * total;
  for (const [tier, weight] of Object.entries(weights)) {
    if (roll < weight) return tier;
    roll -= weight;
  }
  return 'I';
}

function flavorName() {
  return `${pick(NPC_FIRST_NAMES)} ${pick(NPC_SURNAMES)}`;
}

/**
 * Build `count` enemy stat blocks weighted by party power level, using the
 * real Tier I-IV Monster Maker framework (mechanics-reference.json
 * monsters.tiers). A "Unique" roll (Heroic power only) is flagged for the GM
 * to hand-build rather than auto-generating a trivial stat block for it.
 */
function generateEnemies(count, powerId, { excludeTiers = [] } = {}) {
  const ref = loadMechanicsRef();
  const enemies = [];
  for (let i = 0; i < count; i++) {
    const tierKey = pickWeightedTier(powerId, excludeTiers);
    if (tierKey === 'Unique') {
      enemies.push({
        name: `${flavorName()} (campaign-unique)`,
        tier: 'Unique',
        note: 'Heroic-tier roll landed on a campaign-unique encounter — hand-build this one rather than using a generic Tier IV block.',
        source: 'gmToolkit / GM discretion',
      });
      continue;
    }
    const tierData = ref.monsters.tiers[tierKey];
    const species = pick(NPC_SPECIES);
    enemies.push({
      name: flavorName(),
      species: species.name,
      tier: tierKey,
      label: tierData.label,
      statBonus: tierData.statBonus,
      effortBonus: tierData.effortBonus,
      actionsPerTurn: tierData.actionsPerTurn,
      hearts: tierData.hearts,
      notes: tierData.notes,
      source: `mechanics-reference.json monsters.tiers.${tierKey}`,
    });
  }
  return enemies;
}

/**
 * Roll `count` distinct items from a real loot table (sciFi or epic),
 * citing the table and roll number so nothing is invented.
 */
function rollLoot(tableName, count) {
  const ref = loadMechanicsRef();
  const table = ref.lootTables[tableName];
  if (!table) throw new Error(`Unknown loot table "${tableName}". Valid: sciFi, epic`);
  const pool = [...table.items];
  const results = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const item = pool.splice(idx, 1)[0];
    results.push({
      name: item.name,
      effect: item.effect,
      source: `${tableName === 'sciFi' ? 'Sci-Fi Loot' : 'Epic Loot'} #${item.roll}`,
    });
  }
  return results;
}

module.exports = { generateEnemies, rollLoot, pickWeightedTier, TIER_WEIGHTS_BY_POWER };

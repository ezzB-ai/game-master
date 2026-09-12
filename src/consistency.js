'use strict';

const { normalize, overlapCount, nameSimilarity } = require('./utils');
const { validateHeroStatBlock } = require('./statBlock');

const NAME_SIMILARITY_WARN = 0.82; // near-duplicate names, not exact
const TRAIT_OVERLAP_WARN = 2; // shared traits + same role => flag

function checkNpcConsistency(npcs) {
  const issues = [];

  // Exact duplicate names
  const byName = new Map();
  for (const npc of npcs) {
    const key = normalize(npc.name);
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(npc);
  }
  for (const [key, group] of byName) {
    if (group.length > 1) {
      issues.push({
        severity: 'error',
        type: 'duplicate-name',
        message: `Duplicate NPC name "${group[0].name}" used ${group.length} times (ids: ${group.map((n) => n.id).join(', ')})`,
      });
    }
  }

  // Near-duplicate names (typo-distance close but not identical)
  for (let i = 0; i < npcs.length; i++) {
    for (let j = i + 1; j < npcs.length; j++) {
      const a = npcs[i];
      const b = npcs[j];
      if (normalize(a.name) === normalize(b.name)) continue;
      const sim = nameSimilarity(a.name, b.name);
      if (sim >= NAME_SIMILARITY_WARN) {
        issues.push({
          severity: 'warning',
          type: 'similar-name',
          message: `NPC names "${a.name}" and "${b.name}" are very similar (${Math.round(sim * 100)}% match) — risk of confusion at the table`,
        });
      }
    }
  }

  // Same role + faction + location combo (already blocked by generator, but
  // manual entries or edits can still collide)
  const byCombo = new Map();
  for (const npc of npcs) {
    const key = `${normalize(npc.role)}|${normalize(npc.faction)}|${normalize(npc.location)}`;
    if (!byCombo.has(key)) byCombo.set(key, []);
    byCombo.get(key).push(npc);
  }
  for (const group of byCombo.values()) {
    if (group.length > 1) {
      issues.push({
        severity: 'warning',
        type: 'duplicate-combo',
        message: `${group.length} NPCs share role "${group[0].role}" + faction "${group[0].faction}" + location "${group[0].location || 'unset'}": ${group.map((n) => n.name).join(', ')} — consider differentiating traits or location`,
      });
    }
  }

  // Same role with heavy trait overlap
  const byRole = new Map();
  for (const npc of npcs) {
    const key = normalize(npc.role);
    if (!byRole.has(key)) byRole.set(key, []);
    byRole.get(key).push(npc);
  }
  for (const group of byRole.values()) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const shared = overlapCount(group[i].traits || [], group[j].traits || []);
        if (shared >= TRAIT_OVERLAP_WARN) {
          issues.push({
            severity: 'warning',
            type: 'trait-overlap',
            message: `"${group[i].name}" and "${group[j].name}" are both ${group[i].role} with ${shared} overlapping traits — differentiate them`,
          });
        }
      }
    }
  }

  // Role saturation (informational — not an error, just a hint)
  const roleCounts = new Map();
  for (const npc of npcs) {
    const key = npc.role || 'unset';
    roleCounts.set(key, (roleCounts.get(key) || 0) + 1);
  }
  for (const [role, count] of roleCounts) {
    if (count >= 4) {
      issues.push({
        severity: 'info',
        type: 'role-saturation',
        message: `Role "${role}" now has ${count} NPCs — consider a distinguishing hook or faction split so they don't blur together`,
      });
    }
  }

  return issues;
}

// Validates NPCs that carry a mechanical stat block (heroType set) against
// the rules in mechanics-reference.json: stat ranges/sums, EFFORT bonus
// totals, HEARTS, DEFENSE math, and that starting ability/loot actually
// belong to that hero type.
function checkMechanicsConsistency(npcs) {
  const issues = [];
  for (const npc of npcs) {
    if (!npc.heroType) continue;
    for (const message of validateHeroStatBlock(npc)) {
      issues.push({ severity: 'error', type: 'mechanics-violation', message });
    }
  }
  return issues;
}

function checkLocationConsistency(locations) {
  const issues = [];

  const byName = new Map();
  for (const loc of locations) {
    const key = normalize(loc.name);
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(loc);
  }
  for (const group of byName.values()) {
    if (group.length > 1) {
      issues.push({
        severity: 'error',
        type: 'duplicate-name',
        message: `Duplicate location name "${group[0].name}" used ${group.length} times (ids: ${group.map((l) => l.id).join(', ')})`,
      });
    }
  }

  for (let i = 0; i < locations.length; i++) {
    for (let j = i + 1; j < locations.length; j++) {
      const a = locations[i];
      const b = locations[j];
      if (normalize(a.name) === normalize(b.name)) continue;
      const sim = nameSimilarity(a.name, b.name);
      if (sim >= NAME_SIMILARITY_WARN) {
        issues.push({
          severity: 'warning',
          type: 'similar-name',
          message: `Location names "${a.name}" and "${b.name}" are very similar (${Math.round(sim * 100)}% match) — risk of confusion at the table`,
        });
      }
    }
  }

  const bySignature = new Map();
  for (const loc of locations) {
    const key = normalize(loc.signatureElement);
    if (!bySignature.has(key)) bySignature.set(key, []);
    bySignature.get(key).push(loc);
  }
  for (const group of bySignature.values()) {
    if (group.length > 1) {
      issues.push({
        severity: 'error',
        type: 'duplicate-signature',
        message: `Signature element reused across ${group.length} locations: ${group.map((l) => l.name).join(', ')} — each location should have a unique identity hook`,
      });
    }
  }

  const byTypeAndDanger = new Map();
  for (const loc of locations) {
    const key = `${normalize(loc.type)}|${normalize(loc.framework && loc.framework.danger)}`;
    if (!byTypeAndDanger.has(key)) byTypeAndDanger.set(key, []);
    byTypeAndDanger.get(key).push(loc);
  }
  for (const [key, group] of byTypeAndDanger) {
    if (group.length >= 4) {
      const [type] = key.split('|');
      issues.push({
        severity: 'info',
        type: 'type-saturation',
        message: `${group.length} locations are type "${type}" — consider varying type or emphasizing signature elements more heavily`,
      });
    }
  }

  return issues;
}

function runConsistencyCheck(npcs, locations) {
  const npcIssues = checkNpcConsistency(npcs);
  const mechanicsIssues = checkMechanicsConsistency(npcs);
  const locationIssues = checkLocationConsistency(locations);
  return { npcIssues, mechanicsIssues, locationIssues };
}

module.exports = {
  checkNpcConsistency, checkMechanicsConsistency, checkLocationConsistency, runConsistencyCheck,
};

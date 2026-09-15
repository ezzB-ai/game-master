'use strict';

const { pick, pickWeighted } = require('./utils');

const DELIVERY_METHODS = [
  { method: 'Overheard / ask a contact', weight: 40 },
  { method: 'Wanted poster or newsie broadcast', weight: 30 },
  { method: 'Comm from a cultivated informer', weight: 30 },
];

function pickDeliveryMethod() {
  return pickWeighted(DELIVERY_METHODS.map((d) => ({ ...d }))).method;
}

/**
 * Build a flat pool of candidate intel items from live faction state + the
 * world-pulse flavor content. Each item carries only what's SAFE to show a
 * player (the rumor text and, for delivery flavor, a contact name) — GM-only
 * fields (truth tags, agendas, dark truths, ground truth) are deliberately
 * left out of the returned pool items themselves and must be looked up
 * separately by the GM from the source faction data if needed.
 */
function buildIntelPool(factions, worldPulse) {
  const pool = [];

  for (const faction of factions) {
    if (!faction.arc) continue; // only the 6 main tracked factions have arcs
    const stage = faction.arc.find((s) => s.stage === faction.currentStage);
    if (!stage || !stage.rumors || !stage.rumors.length) continue;
    for (const rumor of stage.rumors) {
      pool.push({
        weight: 5,
        faction: faction.name,
        topic: stage.title,
        text: rumor.text,
        suggestedContact: faction.contacts ? (pick([faction.contacts.local, faction.contacts.distant].filter(Boolean)) || null) : null,
      });
    }
  }

  for (const group of (worldPulse.otherNotableGroups && worldPulse.otherNotableGroups.groups) || []) {
    if (!group.rumor) continue;
    pool.push({
      weight: 3,
      faction: group.name,
      topic: group.disposition || 'notable group',
      text: group.rumor.text,
      suggestedContact: null,
    });
  }

  for (const rumor of (worldPulse.otherWarpShells && worldPulse.otherWarpShells.rumors) || []) {
    pool.push({
      weight: 1,
      faction: 'Other WARP SHELLs',
      topic: 'sighting',
      text: rumor.text,
      suggestedContact: null,
    });
  }

  // Merchant guilds surface only as background texture — their public face,
  // never the dark truth, and rarely.
  for (const faction of factions) {
    if (faction.type !== 'merchantGuild') continue;
    pool.push({
      weight: 1,
      faction: faction.name,
      topic: faction.specialty || 'commerce',
      text: faction.description,
      suggestedContact: faction.contacts ? faction.contacts.local : null,
    });
  }

  return pool;
}

/**
 * Sample `count` distinct intel hooks, each tagged with a delivery method.
 * Weighted so main-faction current-events dominate, with occasional flavor
 * from smaller groups, rare Warp Shell sightings, and merchant guild texture.
 */
function sampleIntelHooks(factions, worldPulse, count = 4) {
  const pool = buildIntelPool(factions, worldPulse);
  const results = [];
  const working = [...pool];
  const n = Math.min(count, working.length);
  for (let i = 0; i < n; i++) {
    const totalWeight = working.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * totalWeight;
    let idx = 0;
    for (; idx < working.length; idx++) {
      if (roll < working[idx].weight) break;
      roll -= working[idx].weight;
    }
    const item = working.splice(idx, 1)[0];
    const delivery = pickDeliveryMethod();
    const contactNote = item.suggestedContact && delivery === 'Overheard / ask a contact'
      ? ` (via ${item.suggestedContact.name}, ${item.suggestedContact.role})`
      : '';
    results.push({
      faction: item.faction,
      topic: item.topic,
      delivery: delivery + contactNote,
      text: item.text,
    });
  }
  return results;
}

module.exports = { sampleIntelHooks, buildIntelPool, pickDeliveryMethod };

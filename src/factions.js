'use strict';

const { normalize } = require('./utils');

function findFaction(factions, nameOrId) {
  const key = normalize(nameOrId);
  return factions.find((f) => normalize(f.name) === key) ||
    factions.find((f) => normalize(f.name).includes(key));
}

/**
 * Adjust a faction's reputation and log why (mutates and returns the faction).
 * Reputation has no fixed scale in the rulebook — this is campaign bookkeeping,
 * not a sourced mechanic, so it's just a running integer the GM interprets.
 */
function applyFactionChange(faction, delta, { session, action } = {}) {
  faction.reputation = (faction.reputation || 0) + delta;
  if (action) {
    faction.recentActions = faction.recentActions || [];
    faction.recentActions.push({ session: session || null, action, reputationDelta: delta });
  }
  return faction;
}

module.exports = { findFaction, applyFactionChange };

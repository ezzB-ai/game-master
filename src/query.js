'use strict';

const { normalize } = require('./utils');

function matchField(value, term) {
  return normalize(value).includes(normalize(term));
}

function searchNpcs(npcs, { term, role, location, faction } = {}) {
  return npcs.filter((n) => {
    if (term && !(matchField(n.name, term) || matchField(n.role, term) ||
        matchField(n.location, term) || matchField(n.faction, term) ||
        (n.traits || []).some((t) => matchField(t, term)))) {
      return false;
    }
    if (role && !matchField(n.role, role)) return false;
    if (location && !matchField(n.location, location)) return false;
    if (faction && !matchField(n.faction, faction)) return false;
    return true;
  });
}

function searchLocations(locations, { term, type, faction } = {}) {
  return locations.filter((l) => {
    if (term && !(matchField(l.name, term) || matchField(l.type, term) ||
        matchField(l.signatureElement, term) || matchField(l.faction, term))) {
      return false;
    }
    if (type && !matchField(l.type, type)) return false;
    if (faction && !matchField(l.faction, faction)) return false;
    return true;
  });
}

function findNpcByNameOrId(npcs, nameOrId) {
  const key = normalize(nameOrId);
  return npcs.find((n) => normalize(n.id) === key) ||
    npcs.find((n) => normalize(n.name) === key) ||
    npcs.find((n) => matchField(n.name, nameOrId));
}

function findLocationByNameOrId(locations, nameOrId) {
  const key = normalize(nameOrId);
  return locations.find((l) => normalize(l.id) === key) ||
    locations.find((l) => normalize(l.name) === key) ||
    locations.find((l) => matchField(l.name, nameOrId));
}

function getRelationships(npcs, nameOrId) {
  const npc = findNpcByNameOrId(npcs, nameOrId);
  if (!npc) return null;
  const resolved = (npc.relationships || []).map((rel) => {
    const target = npcs.find((n) => n.id === rel.npcId);
    return { type: rel.type, npc: target ? target.name : `(unknown: ${rel.npcId})`, npcId: rel.npcId };
  });
  return { npc, relationships: resolved };
}

function usedSummary(npcs, locations) {
  const roles = new Set(npcs.map((n) => n.role).filter(Boolean));
  const factions = new Set([...npcs, ...locations].map((x) => x.faction).filter(Boolean));
  const signatureElements = new Set(locations.map((l) => l.signatureElement).filter(Boolean));
  const locationTypes = new Set(locations.map((l) => l.type).filter(Boolean));
  const traits = new Set(npcs.flatMap((n) => n.traits || []));
  return {
    roles: [...roles],
    factions: [...factions],
    signatureElements: [...signatureElements],
    locationTypes: [...locationTypes],
    traits: [...traits],
  };
}

module.exports = {
  searchNpcs, searchLocations, findNpcByNameOrId, findLocationByNameOrId,
  getRelationships, usedSummary,
};

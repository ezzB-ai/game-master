'use strict';

const {
  LOCATION_TYPES, LOCATION_NAME_PREFIXES, LOCATION_NAME_SUFFIXES,
  LOCATION_SIGNATURE_ELEMENTS, LOCATION_DANGER, LOCATION_RESOURCES, FACTIONS,
} = require('./data/wordbanks');
const { pick, makeId, normalize } = require('./utils');

const MAX_ATTEMPTS = 100;

function randomLocationName() {
  return `${pick(LOCATION_NAME_PREFIXES)} ${pick(LOCATION_NAME_SUFFIXES)}`;
}

/**
 * Generate a location. All locations share the same framework (type, danger,
 * resources, faction) but each gets a distinct signature element so no two
 * places read the same at the table.
 */
function generateLocation(existingLocations, overrides = {}) {
  const existingNames = new Set(existingLocations.map((l) => normalize(l.name)));
  const usedSignatures = new Set(existingLocations.map((l) => normalize(l.signatureElement)));

  let location = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const name = randomLocationName();
    if (existingNames.has(normalize(name))) continue;

    const signatureElement = pick(LOCATION_SIGNATURE_ELEMENTS);
    if (usedSignatures.has(normalize(signatureElement))) continue;

    location = {
      id: makeId('loc'),
      name,
      type: overrides.type || pick(LOCATION_TYPES),
      signatureElement,
      framework: {
        danger: overrides.danger || pick(LOCATION_DANGER),
        resources: overrides.resources || pick(LOCATION_RESOURCES),
      },
      faction: overrides.faction || pick(FACTIONS),
      notes: '',
      createdAt: new Date().toISOString(),
    };
    break;
  }

  if (!location) {
    throw new Error(
      `Could not generate a unique location after ${MAX_ATTEMPTS} attempts. ` +
      `Every signature element may already be in use — widen the word bank or free some up.`
    );
  }

  return location;
}

module.exports = { generateLocation, randomLocationName };

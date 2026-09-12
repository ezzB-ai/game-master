'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

const FILES = {
  npcs: path.join(DATA_DIR, 'npcs.json'),
  locations: path.join(DATA_DIR, 'locations.json'),
  campaignState: path.join(DATA_DIR, 'campaign-state.json'),
  players: path.join(DATA_DIR, 'players.json'),
};

const DEFAULTS = {
  npcs: { npcs: [] },
  locations: { locations: [] },
  campaignState: {
    sessionCount: 0,
    currentSession: null,
    sessionLog: [],
  },
  players: { players: [] },
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function load(key) {
  ensureDataDir();
  const file = FILES[key];
  if (!fs.existsSync(file)) {
    save(key, DEFAULTS[key]);
    return JSON.parse(JSON.stringify(DEFAULTS[key]));
  }
  const raw = fs.readFileSync(file, 'utf8').trim();
  if (!raw) {
    return JSON.parse(JSON.stringify(DEFAULTS[key]));
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to parse ${file}: ${err.message}`);
  }
}

function save(key, data) {
  ensureDataDir();
  const file = FILES[key];
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

module.exports = { load, save, FILES, DATA_DIR };

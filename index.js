#!/usr/bin/env node
'use strict';

const { run } = require('./src/cli');

try {
  run(process.argv);
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exitCode = 1;
}

#!/usr/bin/env node
import { runCli } from './src/cli/main.js';
import { toCliExit } from './src/errors/cliError.js';

runCli().catch((error) => {
  const { message, code } = toCliExit(error);
  console.error(`CLI failed: ${message}`);
  process.exitCode = code;
});

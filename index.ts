#!/usr/bin/env node
import { runCli } from './src/cli/main.js';

runCli().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`CLI failed: ${message}`);
  process.exitCode = 1;
});

import { initConfig } from '../config/init.js';
import { ClaudeClient } from '../llm/client.js';
import { initTools } from '../tools/init.js';
import { createRunner } from './runner.js';

export async function initAgent() {
  const config = await initConfig();
  initTools();

  const client = ClaudeClient.newClaudeClient(
    config.claudeBaseUrl as string,
    config.claudeApiKey as string,
  );

  const runner = createRunner(client, {
    model: config.claudeModel,
    maxTokens: 1024,
    maxTurns: 8,
  });

  return {
    client,
    config,
    run: runner.run,
    runStream: runner.runStream,
  };
}

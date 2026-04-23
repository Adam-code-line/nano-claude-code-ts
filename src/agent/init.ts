import { initConfig } from '../config/init.ts';
import { ClaudeClient } from '../llm/client.ts';
import { initTools } from '../tools/init.ts';
import { createRunner } from './runner.ts';

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

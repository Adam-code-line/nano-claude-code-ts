import { initConfig } from '../config/init.ts';
import { ClaudeClient } from '../llm/client.ts';
import { callWithTools, callStreamWithTools } from './callTool.ts';
import { initTools } from '../tools/init.ts';

export async function initAgent() {
  const config = await initConfig();
  initTools();

  const client = ClaudeClient.newClaudeClient(config.claudeBaseUrl, config.claudeApiKey);

  return {
    client,
    config,
    async run(userText: string) {
      return callWithTools(client, {
        model: config.claudeModel,
        messages: [{ role: 'user', content: userText }],
        max_tokens: 1024,
      });
    },
    async runStream(userText: string, onData: (chunk: string) => void) {
      return callStreamWithTools(
        client,
        {
          model: config.claudeModel,
          messages: [{ role: 'user', content: userText }],
          max_tokens: 1024,
        },
        onData,
      );
    },
  };
}


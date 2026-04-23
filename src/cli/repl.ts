import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { initAgent } from '../agent/init.ts';
import { Conversation } from '../models/conversation.ts';
import { getToolsForRequest } from '../tools/registry.ts';
import type { Tool } from '../types/tools.ts';

function printHelp(): void {
  console.log(`
Commands:
  /help           Show help
  /tools          List registered tools
  /stream on      Enable stream mode
  /stream off     Disable stream mode
  /reset          Reset conversation
  /exit           Exit REPL
`);
}

function getToolLabel(tool: Tool): string {
  if ('name' in tool && tool.name) return tool.name;
  if ('type' in tool && tool.type) return tool.type;
  return 'unknown';
}

async function startRepl() {
  const { run, runStream } = await initAgent();
  const rl = readline.createInterface({ input, output });

  let conversation = new Conversation();
  let streamEnabled = true;

  console.log('Nano Claude Code REPL');
  console.log('Type /help to see commands.');

  while (true) {
    const line = (await rl.question('> ')).trim();
    if (!line) continue;

    if (line.startsWith('/')) {
      if (line === '/exit') {
        rl.close();
        break;
      }

      if (line === '/help') {
        printHelp();
        continue;
      }

      if (line === '/reset') {
        conversation = new Conversation();
        console.log('Conversation reset.');
        continue;
      }

      if (line === '/tools') {
        const tools = getToolsForRequest();
        if (!tools.length) {
          console.log('No tools registered.');
          continue;
        }
        console.log('Registered tools:');
        for (const tool of tools) {
          console.log(`- ${getToolLabel(tool)}`);
        }
        continue;
      }

      if (line === '/stream on') {
        streamEnabled = true;
        console.log('Stream mode enabled.');
        continue;
      }

      if (line === '/stream off') {
        streamEnabled = false;
        console.log('Stream mode disabled.');
        continue;
      }

      console.log('Unknown command. Use /help.');
      continue;
    }

    try {
      if (streamEnabled) {
        output.write('assistant> ');
        await runStream(
          line,
          (chunk) => {
            output.write(chunk);
          },
          { conversation },
        );
        output.write('\n');
      } else {
        const result = await run(line, { conversation });
        console.log(`assistant> ${result.text}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error: ${message}`);
    }
  }
}

startRepl().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to start REPL: ${message}`);
  process.exitCode = 1;
});

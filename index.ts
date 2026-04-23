import { initAgent } from './src/agent/init.ts';

async function main() {
  const { run } = await initAgent();
  const input = process.argv.slice(2).join(' ').trim() || 'Hello, Claude!';
  const result = await run(input);
  console.log(result.text);
}

main().catch((error) => {
  console.error('Agent run failed:', error);
  process.exitCode = 1;
});

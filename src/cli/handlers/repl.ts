import { startRepl } from '../repl.js';
import type { CliContext, CliExitCode, ReplCommandOptions } from '../types.js';
import { CLI_EXIT_CODE } from '../types.js';

export async function runRepl(options: ReplCommandOptions, ctx: CliContext): Promise<CliExitCode> {
  try {
    return await startRepl({
      model: options.model,
      streamEnabled: options.stream,
      printer: ctx.printer,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.printer.error(`repl failed: ${message}`);
    return CLI_EXIT_CODE.RUNTIME_ERROR;
  }
}

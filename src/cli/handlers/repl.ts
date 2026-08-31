import { startRepl } from '../repl.js';
import type { CliContext, CliExitCode, ReplCommandOptions } from '../types.js';
import { toCliExit } from '../../errors/cliError.js';

export async function runRepl(options: ReplCommandOptions, ctx: CliContext): Promise<CliExitCode> {
  try {
    return await startRepl({
      model: options.model,
      streamEnabled: options.stream,
      printer: ctx.printer,
    });
  } catch (error) {
    const { message, code } = toCliExit(error);
    ctx.printer.error(`repl failed: ${message}`);
    return code as CliExitCode;
  }
}

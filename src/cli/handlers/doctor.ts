import { initConfig, loadEnv } from '../../config/init.js';
import { initTools } from '../../tools/init.js';
import type { CliContext, CliExitCode, DoctorCommandOptions } from '../types.js';
import { CLI_EXIT_CODE } from '../types.js';
import { CliError, toCliExit } from '../../errors/cliError.js';

const REQUIRED_ENV_KEYS = ['CLAUDE_BASE_URL', 'CLAUDE_API_KEY'] as const;

export async function runDoctor(
  options: DoctorCommandOptions,
  ctx: CliContext,
): Promise<CliExitCode> {
  loadEnv();
  const missing = REQUIRED_ENV_KEYS.filter((key) => !process.env[key]);

  try {
    if (missing.length > 0) {
      throw new CliError(
        `Missing required environment variables: ${missing.join(', ')}`,
        CLI_EXIT_CODE.CONFIG_ERROR,
      );
    }

    await initConfig();
    initTools();

    if (options.json) {
      ctx.printer.json({ ok: true });
    } else {
      ctx.printer.info('OK: configuration and tool initialization are valid.');
    }
    return CLI_EXIT_CODE.OK;
  } catch (error) {
    const { message } = toCliExit(error);
    // doctor 的本质是校验配置：非 CliError 的失败也统一视为配置错误
    const code = error instanceof CliError ? error.exitCode : CLI_EXIT_CODE.CONFIG_ERROR;
    if (options.json) {
      ctx.printer.json({ ok: false, error: message });
    } else {
      ctx.printer.error(`doctor failed: ${message}`);
    }
    return code as CliExitCode;
  }
}

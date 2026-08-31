// CLI 专用错误类与统一错误处理工具
import { CLI_EXIT_CODE } from '../cli/types.js';

/**
 * CLI 专用错误：携带退出码，便于入口处统一映射为进程退出码。
 * 业务代码可 throw new CliError('缺少配置', CLI_EXIT_CODE.CONFIG_ERROR)
 */
export class CliError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number = CLI_EXIT_CODE.RUNTIME_ERROR,
  ) {
    super(message);
    this.name = 'CliError';
  }
}

/**
 * 将任意未知错误统一转换为 { message, code }：
 * CliError 直接使用其自带的退出码
 * 其它 Error 取其 message，退出码为 RUNTIME_ERROR
 * 非 Error 值（如字符串/对象）转为字符串
 */
export function toCliExit(error: unknown): { message: string; code: number } {
  if (error instanceof CliError) {
    return { message: error.message, code: error.exitCode };
  }
  const message = error instanceof Error ? error.message : String(error);
  return { message, code: CLI_EXIT_CODE.RUNTIME_ERROR };
}

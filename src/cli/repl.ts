/**
 * 在这里实现一个简单的 REPL（Read-Eval-Print Loop）界面，并且且支持一些基本的命令，例如查看帮助、列出工具、开启/关闭流式输出等。
 * 这个 REPL 将会使用 readline 模块来处理用户输入，并且调用 initAgent 来获取 run 和 runStream 方法来执行用户的输入。
 * 用户可以通过输入 /help 来查看可用的命令，通过输入 /tools 来查看注册的工具，通过输入 /stream on/off 来开启或关闭流式输出，通过输入 /reset 来重置对话，或者输入 /exit 来退出 REPL。
 * 在执行用户输入时，如果启用了流式输出，则会逐步打印助手的响应；如果没有启用流式输出，则会一次性打印完整的响应。
 * 同时，REPL 还会捕获并打印任何执行过程中发生的错误。
 */

import readline from 'node:readline/promises'; // 使用node原生的readline模块的promise版本来处理用户输入
import { stdin as input, stdout as output } from 'node:process';
import { initAgent } from '../agent/init.ts';
import { Conversation } from '../models/conversation.ts';
import { getToolsForRequest } from '../tools/registry.ts';
import type { Tool } from '../types/tools.ts';
import { createPrinter } from './printer.ts';
import { CLI_EXIT_CODE } from './types.ts';
import type { CliExitCode, Printer } from './types.ts';
import { FileSessionStore, SessionManager } from './session.ts';
import { resolve } from 'node:path';

export interface ReplStartOptions {
  model?: string;
  streamEnabled?: boolean;
  printer?: Printer;
}

function printHelp(printer: Printer): void {
  printer.info(`
Commands:
  /help               Show help
  /tools              List registered tools
  /stream on          Enable stream mode
  /stream off         Disable stream mode
  /reset              Reset conversation
  /session            Show current session and list all
  /session list       List all sessions
  /session new <id>   Create a new session and switch to it
  /session use <id>   Switch to an existing session
  /exit               Exit REPL
`);
}

function getToolLabel(tool: Tool): string {
  if ('name' in tool && tool.name) return tool.name;
  if ('type' in tool && tool.type) return tool.type;
  return 'unknown';
}

// REPL 主循环，处理用户输入并调用 run 或 runStream 来执行输入
export async function startRepl(options: ReplStartOptions = {}): Promise<CliExitCode> {
  const { run, runStream } = await initAgent(); // 这里复用了agent的逻辑，保持cli和agent的核心逻辑一致
  const rl = readline.createInterface({ input, output }); // 创建 readline 接口，接收用户输入并输出到控制台

  const printer = options.printer ?? createPrinter(); // 创建一个printer，用于在REPL中输出信息、警告、错误等

  // 会话持久化：启动时从磁盘恢复历史对话（如果没有则新建）
  const sessionManager = new SessionManager(
    new FileSessionStore(resolve(process.cwd(), '.nano-claude', 'history')),
  );
  let conversation = (await sessionManager.loadSession()) ?? new Conversation();
  if (conversation.history.length > 0) {
    printer.info(
      `Restored session "${sessionManager.currentSession}" (${conversation.history.length} messages).`,
    );
  }

  let streamEnabled = options.streamEnabled ?? true;

  printer.info('Nano Claude Code REPL');
  printer.info('Type /help to see commands.');

  while (true) {
    const line = (await rl.question('> ')).trim();
    if (!line) continue;

    // 处理以 / 开头的命令
    if (line.startsWith('/')) {
      if (line === '/exit') {
        await sessionManager.saveSession(conversation);
        rl.close();
        break;
      }

      if (line === '/help') {
        printHelp(printer);
        continue;
      }

      if (line === '/reset') {
        conversation = new Conversation();
        await sessionManager.saveSession(conversation);
        printer.info('Conversation reset.');
        continue;
      }

      if (line === '/tools') {
        const tools = getToolsForRequest();
        if (!tools.length) {
          printer.info('No tools registered.');
          continue;
        }
        printer.info('Registered tools:');
        for (const tool of tools) {
          printer.info(`- ${getToolLabel(tool)}`);
        }
        continue;
      }

      if (line === '/stream on') {
        streamEnabled = true;
        printer.info('Stream mode enabled.');
        continue;
      }

      if (line === '/stream off') {
        streamEnabled = false;
        printer.info('Stream mode disabled.');
        continue;
      }

      // 查看当前会话与所有会话
      if (line === '/session' || line === '/session list') {
        const sessions = await sessionManager.listSessions();
        printer.info(`Current session: ${sessionManager.currentSession}`);
        if (sessions.length === 0) {
          printer.info('No sessions yet.');
        } else {
          printer.info('Sessions:');
          for (const id of sessions) {
            printer.info(`- ${id}${id === sessionManager.currentSession ? ' (current)' : ''}`);
          }
        }
        continue;
      }

      // 新建会话并切换
      const sessionNewMatch = line.match(/^\/session new\s+(\S+)$/);
      if (sessionNewMatch) {
        const id = sessionNewMatch[1];
        await sessionManager.saveSession(conversation); // 先保存当前会话
        conversation = await sessionManager.createSession(id);
        printer.info(`Created and switched to session: ${id}`);
        continue;
      }

      // 切换到已有会话
      const sessionUseMatch = line.match(/^\/session use\s+(\S+)$/);
      if (sessionUseMatch) {
        const id = sessionUseMatch[1];
        await sessionManager.saveSession(conversation); // 先保存当前会话
        const loaded = await sessionManager.useSession(id);
        if (loaded) {
          conversation = loaded;
          printer.info(`Switched to session: ${id} (${conversation.history.length} messages).`);
        } else {
          printer.warn(`Session not found: ${id}`);
        }
        continue;
      }

      printer.warn('Unknown command. Use /help.');
      continue;
    }

    try {
      // 根据 streamEnabled 的值决定是调用 run 还是 runStream 来执行用户输入
      if (streamEnabled) {
        await runStream(
          line,
          (chunk) => {
            printer.assistantChunk(chunk);
          },
          {
            conversation,
            model: options.model,
            onDebug: (event) => {
              printer.debug('stream_debug', event);
            },
          },
        );
        printer.newline();
        await sessionManager.saveSession(conversation);
      } else {
        const result = await run(line, { conversation, model: options.model });
        printer.assistant(result.text);
        await sessionManager.saveSession(conversation);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      printer.error(`Error: ${message}`);
    }
  }

  return CLI_EXIT_CODE.OK;
}

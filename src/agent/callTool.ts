// tool loop：让 Claude 触发 tool_use -> 本地执行 -> 回传 tool_result -> 继续对话

import type { MessageParam, RequestBody } from '../types/request.ts';
import type { ToolResultBlock, ToolUseBlock } from '../types/response.ts';
import type { Tool } from '../types/tools.ts';
import { ClaudeClient } from '../client.ts';
import { Conversation } from '../models/conversation.ts';
import { executeTool } from '../tools/execute.ts';
import { getToolsForRequest, sanitizeToolsForRequest } from '../tools/registry.ts';

export interface ToolLoopOptions {
  conversation?: Conversation;
  maxTurns?: number;
  tools?: Tool[];
  tool_choice?: RequestBody['tool_choice'];
}

export interface ToolLoopResult {
  text: string;
  conversation: Conversation;
  turns: number;
}

function getLatestToolUses(conversation: Conversation): ToolUseBlock[] {
  const latest = conversation.rawResponses[conversation.rawResponses.length - 1];
  if (!latest) return [];
  return latest.content.filter((b: any) => b?.type === 'tool_use') as ToolUseBlock[];
}

function normalizeToolResultContent(result: any): string {
  if (typeof result === 'string') return result;
  try {
    return JSON.stringify(result);
  } catch {
    return String(result);
  }
}

async function buildToolResults(toolUses: ToolUseBlock[]): Promise<ToolResultBlock[]> {
  const results: ToolResultBlock[] = [];

  for (const toolUse of toolUses) {
    try {
      const output = await executeTool(toolUse.name, toolUse.input);
      results.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: normalizeToolResultContent(output),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: message,
        is_error: true,
      });
    }
  }

  return results;
}

function resolveTools(request: RequestBody, options: ToolLoopOptions): Tool[] {
  if (request.tools) return sanitizeToolsForRequest(request.tools);
  if (options.tools) return sanitizeToolsForRequest(options.tools);
  return getToolsForRequest();
}

function resolveToolChoice(
  request: RequestBody,
  options: ToolLoopOptions,
): RequestBody['tool_choice'] {
  return request.tool_choice ?? options.tool_choice ?? { type: 'auto' };
}

export async function callWithTools(
  client: ClaudeClient,
  request: RequestBody,
  options: ToolLoopOptions = {},
): Promise<ToolLoopResult> {
  const conversation = options.conversation ?? new Conversation();
  const tools = resolveTools(request, options);
  const tool_choice = resolveToolChoice(request, options);
  const maxTurns = options.maxTurns ?? 8;

  let latestText = '';
  let messagesToSync: MessageParam[] = request.messages;

  for (let turn = 1; turn <= maxTurns; turn++) {
    latestText = await client.call(
      {
        ...request,
        messages: messagesToSync,
        tools,
        tool_choice,
      },
      conversation,
    );

    const toolUses = getLatestToolUses(conversation);
    if (toolUses.length === 0) {
      return { text: latestText, conversation, turns: turn };
    }

    const toolResults = await buildToolResults(toolUses);
    messagesToSync = [{ role: 'user', content: toolResults }];
  }

  throw new Error(`tool-loop 超过最大轮数（maxTurns=${maxTurns}），可能出现循环调用`);
}

export async function callStreamWithTools(
  client: ClaudeClient,
  request: RequestBody,
  onData: (chunk: string) => void,
  options: ToolLoopOptions = {},
): Promise<ToolLoopResult> {
  const conversation = options.conversation ?? new Conversation();
  const tools = resolveTools(request, options);
  const tool_choice = resolveToolChoice(request, options);
  const maxTurns = options.maxTurns ?? 8;

  let messagesToSync: MessageParam[] = request.messages;

  for (let turn = 1; turn <= maxTurns; turn++) {
    await client.callStream(
      {
        ...request,
        messages: messagesToSync,
        tools,
        tool_choice,
      },
      onData,
      conversation,
    );

    const toolUses = getLatestToolUses(conversation);
    if (toolUses.length === 0) {
      return { text: conversation.getLatestTextContent(), conversation, turns: turn };
    }

    const toolResults = await buildToolResults(toolUses);
    messagesToSync = [{ role: 'user', content: toolResults }];
  }

  throw new Error(`tool-loop 超过最大轮数（maxTurns=${maxTurns}），可能出现循环调用`);
}

/**
 * 仅执行本地工具（不走 Claude）
 * 保留这个函数，方便你在单测里直接验证 handler/executeTool。
 */
export async function callTool(toolName: string, input: any): Promise<any> {
  return executeTool(toolName, input);
}

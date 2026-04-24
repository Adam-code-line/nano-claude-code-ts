/**
 * 在这里单独设计tool loop的逻辑，主要是为了让agent的核心逻辑更清晰，同时也方便后续对tool loop进行独立的测试和优化
 */
import type { MessageParam, RequestBody } from '../types/request.ts';
import type { Tool } from '../types/tools.ts';
import type { ToolResultBlock, ToolUseBlock } from '../types/response.ts';
import type { ToolLoopResult } from './types.ts';
import type { ClaudeClient } from '../llm/client.ts';
import type { ClaudeStreamDebugEvent } from '../llm/call.ts';
import { Conversation } from '../models/conversation.ts';
import { executeTool } from '../tools/execute.ts';

// ToolLoop需要传递ClaudeClient实例、当前的Conversation对象、工具列表、初始的工具选择参数，以及一些可选的回调函数用于处理流式数据和调试事件。ToolLoop的核心逻辑是一个循环，在每一轮中根据最新的对话状态构建请求，调用ClaudeClient进行交互，并处理工具使用块来执行工具并将结果同步回对话中，直到达到最大轮数或者没有新的工具使用块为止。
export interface ToolLoopParams {
  client: ClaudeClient;
  request: RequestBody;
  conversation: Conversation;
  tools: Tool[];
  initialToolChoice: RequestBody['tool_choice'];
  maxTurns: number;
  onData?: (chunk: string) => void;
  onDebug?: (event: ClaudeStreamDebugEvent) => void;
}

// 获取对话中最新的工具使用块，利用到了conversation.rawResponses，这些是原始的LLM响应内容，包含了工具使用的详细信息
function getLatestToolUses(conversation: Conversation): ToolUseBlock[] {
  const latest = conversation.rawResponses[conversation.rawResponses.length - 1];
  if (!latest) return [];
  return latest.content.filter((block): block is ToolUseBlock => block?.type === 'tool_use');
}

// 将工具执行结果规范化为字符串，方便后续作为消息内容同步回LLM，如果结果是对象则尝试JSON.stringify，如果无法转换则直接转换为字符串
function normalizeToolResultContent(result: unknown): string {
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
      const output = await executeTool(toolUse.name, toolUse.input); // executeTool函数会根据工具使用块中的工具名称和输入参数执行对应的工具，并返回结果
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

// 调用ClaudeClient进行交互，根据是否提供了onData回调函数来决定是使用流式调用还是普通调用，最终返回最新的文本内容
async function callTurn(
  params: ToolLoopParams,
  turnRequest: RequestBody,
): Promise<string | undefined> {
  if (params.onData) {
    await params.client.callStream(turnRequest, params.onData, params.conversation, params.onDebug);
    return params.conversation.getLatestTextContent();
  }

  return params.client.call(turnRequest, params.conversation);
}

// ToolLoop的核心函数，负责整个工具循环的执行逻辑，包括构建请求、调用ClaudeClient、处理工具使用块以及同步结果，直到达到最大轮数或者没有新的工具使用块为止
export async function runToolLoop(params: ToolLoopParams): Promise<ToolLoopResult> {
  const maxTurns = params.maxTurns ?? 8;
  let latestText = '';
  let messagesToSync: MessageParam[] = params.request.messages;

  for (let turn = 1; turn <= maxTurns; turn++) {
    const tool_choice = turn === 1 ? params.initialToolChoice : ({ type: 'auto' } as const);

    const turnRequest: RequestBody = {
      ...params.request,
      messages: messagesToSync,
      tools: params.tools,
      tool_choice,
    };

    const outputText = await callTurn(params, turnRequest);
    if (typeof outputText === 'string') {
      latestText = outputText;
    }

    const toolUses = getLatestToolUses(params.conversation);
    if (toolUses.length === 0) {
      return {
        text: latestText || params.conversation.getLatestTextContent(),
        conversation: params.conversation,
        turns: turn,
      };
    }

    const toolResults = await buildToolResults(toolUses);
    messagesToSync = [{ role: 'user', content: toolResults }];
  }

  throw new Error(`tool-loop exceeded max turns (maxTurns=${maxTurns})`);
}

import { describe, it, expect, vi, afterEach } from 'vitest';
import type { ClaudeClient } from '../src/llm/client.js';
import { Conversation } from '../src/models/conversation.js';
import { runToolLoop } from '../src/agent/toolLoop.js';
import type { ResponseBody, ContentBlock } from '../src/types/response.js';
import type { RequestBody } from '../src/types/request.js';
import * as executeModule from '../src/tools/execute.js';

function makeResponse(
  content: ContentBlock[],
  stopReason: ResponseBody['stop_reason'],
): ResponseBody {
  return {
    id: 'resp-1',
    type: 'message',
    role: 'assistant',
    content,
    model: 'claude-sonnet-4-6',
    stop_reason: stopReason,
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 },
  };
}

describe('runToolLoop', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should execute tool and continue next turn with tool_result', async () => {
    const executeSpy = vi.spyOn(executeModule, 'executeTool').mockResolvedValue({ ok: true });
    const conversation = new Conversation();
    const turnRequests: RequestBody[] = [];

    const call = vi
      .fn()
      .mockImplementationOnce(async (request: RequestBody, conv: Conversation) => {
        turnRequests.push(request);
        conv.rawResponses.push(
          makeResponse(
            [{ type: 'tool_use', id: 'tool-1', name: 'weather', input: { city: 'Beijing' } }],
            'tool_use',
          ),
        );
        return '';
      })
      .mockImplementationOnce(async (request: RequestBody, conv: Conversation) => {
        turnRequests.push(request);
        conv.rawResponses.push(makeResponse([{ type: 'text', text: 'done' }], 'end_turn'));
        return 'done';
      });

    const client = { call, callStream: vi.fn() } as unknown as ClaudeClient;

    const result = await runToolLoop({
      client,
      request: {
        model: 'claude-sonnet-4-6',
        messages: [{ role: 'user', content: 'check weather' }],
        max_tokens: 256,
      },
      conversation,
      tools: [],
      initialToolChoice: { type: 'tool', name: 'weather' },
      maxTurns: 4,
    });

    expect(result.text).toBe('done');
    expect(result.turns).toBe(2);
    expect(executeSpy).toHaveBeenCalledWith('weather', { city: 'Beijing' });

    expect(turnRequests[0].tool_choice).toEqual({ type: 'tool', name: 'weather' });
    expect(turnRequests[1].tool_choice).toEqual({ type: 'auto' });
    expect(turnRequests[1].messages[0].role).toBe('user');
    expect(Array.isArray(turnRequests[1].messages[0].content)).toBe(true);
  });
});

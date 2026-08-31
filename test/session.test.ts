import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Conversation } from '../src/models/conversation.ts';
import { Message } from '../src/models/message.ts';
import { FileSessionStorage, SessionManager } from '../src/cli/session.ts';

describe('Conversation serialization', () => {
  it('should round-trip history and rawResponses via toJSON/fromJSON', () => {
    const original = new Conversation();
    original.addMessage(new Message('user', 'hello'));
    original.addMessage(new Message('assistant', 'hi there' ));
    original.rawResponses.push({
      id: 'resp-1',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: 'hi there' }],
      model: 'claude-sonnet-4-6', 
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: { input_tokens: 1, output_tokens: 1 },
    });

    const restored = Conversation.fromJSON(original.toJSON());
    expect(restored.history.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(restored.history.map((m) => m.content)).toEqual(['hello', 'hi there']);
    expect(restored.rawResponses).toHaveLength(1);
    expect(restored.getLatestTextContent()).toBe('hi there');
  });
});

describe('FileSessionStorage', () => {
  let dir: string;
  let storage: FileSessionStorage;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'nano-session-'));
    storage = new FileSessionStorage(join(dir, 'history', 'default.json'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('should return null when no session file exists', async () => {
    expect(await storage.loadSession()).toBeNull();
  });

  it('should persist and restore a conversation', async () => {
    const conversation = new Conversation();
    conversation.addMessage(new Message('user', 'remember this'));

    await storage.saveSession(conversation);
    const restored = await storage.loadSession();

    expect(restored).not.toBeNull();
    expect(restored!.getAllTextContent()).toBe('remember this');

    // 磁盘上确实写入了可解析的 JSON
    const raw = await readFile(join(dir, 'history', 'default.json'), 'utf8');
    expect(JSON.parse(raw).history).toHaveLength(1);
  });

  it('should work through SessionManager', async () => {
    const manager = new SessionManager(storage);
    const conversation = new Conversation();
    conversation.addMessage(new Message('assistant', 'persisted via manager'));

    await manager.saveSession(conversation);
    const restored = await manager.loadSession();
    expect(restored?.getLatestTextContent()).toBe('persisted via manager');
  });
});

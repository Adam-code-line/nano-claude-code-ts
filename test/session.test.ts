import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Conversation } from '../src/models/conversation.js';
import { Message } from '../src/models/message.js';
import { FileSessionStorage, FileSessionStore, SessionManager } from '../src/cli/session.js';

describe('Conversation serialization', () => {
  it('should round-trip history and rawResponses via toJSON/fromJSON', () => {
    const original = new Conversation();
    original.addMessage(new Message('user', 'hello'));
    original.addMessage(new Message('assistant', 'hi there'));
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
    const manager = new SessionManager(new FileSessionStore(dir));
    const conversation = new Conversation();
    conversation.addMessage(new Message('assistant', 'persisted via manager'));

    await manager.saveSession(conversation);
    const restored = await manager.loadSession();
    expect(restored?.getLatestTextContent()).toBe('persisted via manager');
  });
});

describe('FileSessionStore / SessionManager multi-session', () => {
  let dir: string;
  let store: FileSessionStore;
  let manager: SessionManager;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'nano-sessions-'));
    store = new FileSessionStore(dir);
    manager = new SessionManager(store, 'default');
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('should list sessions and report the current one', async () => {
    expect(await manager.listSessions()).toEqual([]);
    expect(manager.currentSession).toBe('default');
  });

  it('should create, switch, and isolate multiple sessions', async () => {
    // 默认会话写入一条消息
    const defaultConv = new Conversation();
    defaultConv.addMessage(new Message('user', 'in default'));
    await manager.saveSession(defaultConv);

    // 新建并切换到 project-a
    const a = await manager.createSession('project-a');
    a.addMessage(new Message('user', 'in project-a'));
    await manager.saveSession(a);
    expect(manager.currentSession).toBe('project-a');

    // 新建并切换到 project-b
    const b = await manager.createSession('project-b');
    b.addMessage(new Message('user', 'in project-b'));
    await manager.saveSession(b);
    expect(manager.currentSession).toBe('project-b');

    // 三个会话都存在于磁盘
    expect(await manager.listSessions()).toEqual(['default', 'project-a', 'project-b']);

    // 切回 project-a，上下文独立不串扰
    const loadedA = await manager.useSession('project-a');
    expect(loadedA?.getAllTextContent()).toBe('in project-a');
    expect(manager.currentSession).toBe('project-a');
  });

  it('should return null when switching to a non-existent session', async () => {
    expect(await manager.useSession('nope')).toBeNull();
    expect(manager.currentSession).toBe('default');
  });

  it('should persist each session to its own file', async () => {
    const a = await manager.createSession('alpha');
    a.addMessage(new Message('user', 'alpha content'));
    await manager.saveSession(a);

    const raw = await readFile(join(dir, 'alpha.json'), 'utf8');
    expect(JSON.parse(raw).history).toHaveLength(1);
  });
});

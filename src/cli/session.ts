// CLI会话持久化：对conversation进行存储和恢复，支持多轮对话的上下文保持
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { Conversation, type SerializedConversation } from '../models/conversation.ts';

// 存储会话的接口，定义了保存和加载会话的方法
export interface SessionStorage {
  /**
   * 保存会话
   * @param conversation 要保存的会话
   */
  saveSession(conversation: Conversation): Promise<void>;
  /**
   * 加载会话
   * @returns 加载的会话，如果没有找到则返回 null
   */
  loadSession(): Promise<Conversation | null>;
}

// 基于文件系统的会话存储实现：把 Conversation 序列化为 JSON 写入磁盘
export class FileSessionStorage implements SessionStorage {
  constructor(private readonly filePath: string) {}

  async saveSession(conversation: Conversation): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(conversation.toJSON(), null, 2), 'utf8');
  }

  async loadSession(): Promise<Conversation | null> {
    let raw: string;
    try {
      raw = await readFile(this.filePath, 'utf8');
    } catch (error) {
      // 首次运行还没有会话文件，返回 null 表示"没有历史"
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }

    try {
      const data = JSON.parse(raw) as SerializedConversation;
      return Conversation.fromJSON(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`failed to parse session file at ${this.filePath}: ${message}`);
    }
  }
}

// 目录级会话存储：把一个目录下的多个会话文件，按 id 管理
export class FileSessionStore {
  constructor(private readonly dir: string) {}

  // 某个会话 id 对应的文件路径
  pathFor(id: string): string {
    return resolve(this.dir, `${id}.json`);
  }

  // 列出所有会话 id（按文件名排序）
  async listSessions(): Promise<string[]> {
    try {
      const entries = await readdir(this.dir, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
        .map((entry) => entry.name.replace(/\.json$/, ''))
        .sort();
    } catch (error) {
      // 目录还没创建过，等价于"没有任何会话"
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }

  // 指定会话是否存在
  async hasSession(id: string): Promise<boolean> {
    const sessions = await this.listSessions();
    return sessions.includes(id);
  }

  // 返回指定会话的底层存储（复用单会话的 FileSessionStorage）
  storageFor(id: string): FileSessionStorage {
    return new FileSessionStorage(this.pathFor(id));
  }
}

// 会话管理器类：负责"当前会话指针"和多个会话的切换/新建/列出
export class SessionManager {
  private readonly store: FileSessionStore;
  private currentId: string;

  constructor(store: FileSessionStore, initialSession = 'default') {
    this.store = store;
    this.currentId = initialSession;
  }

  // 当前会话 id
  get currentSession(): string {
    return this.currentId;
  }

  // 列出所有会话
  async listSessions(): Promise<string[]> {
    return this.store.listSessions();
  }

  // 指定会话是否存在
  async hasSession(id: string): Promise<boolean> {
    return this.store.hasSession(id);
  }

  // 保存当前会话
  async saveSession(conversation: Conversation): Promise<void> {
    await this.store.storageFor(this.currentId).saveSession(conversation);
  }

  // 加载当前会话；没有则返回 null
  async loadSession(): Promise<Conversation | null> {
    return this.store.storageFor(this.currentId).loadSession();
  }

  // 切换到指定会话（不存在则返回 null）
  async useSession(id: string): Promise<Conversation | null> {
    if (!(await this.store.hasSession(id))) return null;
    this.currentId = id;
    return this.loadSession();
  }

  // 新建会话并切换过去（已存在则直接切换）
  async createSession(id: string): Promise<Conversation> {
    this.currentId = id;
    const conversation = new Conversation();
    await this.saveSession(conversation);
    return conversation;
  }
}

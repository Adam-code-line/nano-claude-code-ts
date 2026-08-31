// CLI会话持久化：对conversation进行存储和恢复，支持多轮对话的上下文保持
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
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

// 会话管理器类，负责管理会话的保存和加载
export class SessionManager {
  private storage: SessionStorage;

  constructor(storage: SessionStorage) {
    this.storage = storage;
  }

  // 保存会话函数
  async saveSession(conversation: Conversation): Promise<void> {
    await this.storage.saveSession(conversation);
  }

  // 加载会话函数
  async loadSession(): Promise<Conversation | null> {
    return await this.storage.loadSession();
  }
}

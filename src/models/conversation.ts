// 引入响应体
import type { ContentBlock, ResponseBody, TextBlock } from '../types/response.js';
import { Message } from './message.js';

// 可序列化的会话结构，用于持久化到磁盘
export interface SerializedConversation {
  history: Array<{ role: 'user' | 'assistant'; content: string | ContentBlock[] }>;
  rawResponses: ResponseBody[];
}

export class Conversation {
  history: Message[] = [];
  rawResponses: ResponseBody[] = [];

  // 添加消息
  addMessage(message: Message) {
    this.history.push(message);
  }

  // 序列化为可存盘的 JSON 结构（history 中的 Message 是类实例，需转成纯数据）
  toJSON(): SerializedConversation {
    return {
      history: this.history.map((msg) => ({ role: msg.role, content: msg.content })),
      rawResponses: this.rawResponses,
    };
  }

  // 从磁盘 JSON 结构重建会话
  static fromJSON(data: SerializedConversation): Conversation {
    const conversation = new Conversation();
    conversation.history = (data.history ?? []).map((item) => new Message(item.role, item.content));
    conversation.rawResponses = data.rawResponses ?? [];
    return conversation;
  }

  //获取所有历史消息的文本内容
  getAllTextContent(): string {
    return this.history.map((msg) => this.extractTextFromMessage(msg)).join('\n');
  }

  // 获取最新消息的文本内容
  getLatestTextContent(): string {
    if (this.history.length === 0) {
      return '';
    }
    const latestMessage = this.history[this.history.length - 1];
    if (latestMessage.content) {
      return this.extractTextFromMessage(latestMessage);
    }
    return '';
  }

  // 封装私有方法提取文本内容，供其他方法调用
  private extractTextFromMessage(message: Message): string {
    const content = message.content;
    if (typeof content === 'string') {
      return content;
    } else if (Array.isArray(content)) {
      const isTextBlock = (block: ContentBlock): block is TextBlock =>
        block.type === 'text' && typeof (block as any).text === 'string' && !!(block as any).text;

      return content
        .filter(isTextBlock)
        .map((block) => block.text)
        .join('\n');
    }
    return '';
  }
}

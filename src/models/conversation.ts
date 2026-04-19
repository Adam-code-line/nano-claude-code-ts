// 引入响应体
import type { ContentBlock, ResponseBody, TextBlock } from '../types/response.ts';
import { Message } from './message.ts';

export class Conversation {
  history: Message[] = [];
  rawResponses: ResponseBody[] = [];

  //添加消息
  addMessage(message: Message) {
    this.history.push(message);
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

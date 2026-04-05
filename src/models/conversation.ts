// 引入响应体
import { ResponseBody } from '../types/response';

export class Conversation {
  resMessages: ResponseBody[];
  constructor() {
    this.resMessages = [];
  }

  //获取所有历史消息的文本内容
  getAllTextContent(): string {
    return this.resMessages.map((message) => this.extractTextContent(message)).join('\n');
  }

  // 获取最新消息的文本内容
  getLatestTextContent(): string {
    if (this.resMessages.length === 0) {
      return '';
    }
    const latestMessage = this.resMessages[this.resMessages.length - 1];
    return this.extractTextContent(latestMessage);
  }

  // 封装私有方法提取文本内容，供其他方法调用
  private extractTextContent(messages: ResponseBody): string {
    return messages.content
      .filter((block) => block.type === 'text' && block.text)
      .map((block) => block.text)
      .join('\n');
  }
}

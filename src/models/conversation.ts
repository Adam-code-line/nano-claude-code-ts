// 引入响应体
import { ResponseBody } from '../types/response';

export class Conversation {
  resMessages: ResponseBody[];
  constructor() {
    this.resMessages = [];
  }

  // 提取文本内容
  getTextContent(): string {
    return this.resMessages
      .map((message) =>
        message.content
          .filter((block) => block.type === 'text' && block.text)
          .map((block) => block.text)
          .join('\n'),
      )
      .join('\n');
  }
}

// 定义 claude 消息类
import { MessageParam } from '../types/request.js';
import { ContentBlock, ResponseBody } from '../types/response.js';

export class Message {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];

  constructor(role: 'user' | 'assistant', content: string | ContentBlock[]) {
    this.role = role;
    this.content = content;
  }

  //静态工具，将ResponseBody转换为Message对象
  static fromResponseContent(res: ResponseBody): Message {
    return new Message(res.role, res.content);
  }

  toAPIFormat(): MessageParam {
    return {
      role: this.role,
      content: this.content,
    };
  }
}

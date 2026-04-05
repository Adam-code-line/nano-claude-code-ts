// 将请求头等封装在此处
import { Message } from './models/message.ts';
import { HttpClient } from './httpClient.ts';
import { RequestBody, RequestHeader } from './types/request.ts';
import { ResponseBody } from './types/response.ts';
import { Conversation } from './models/conversation.ts';

export class ClaudeCall {
  private httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async callClaude(
    url: string,
    apiKey: string,
    requestBody: RequestBody,
    conversation: Conversation,
  ): Promise<ResponseBody> {
    const headers: RequestHeader = {
      'x-api-key': apiKey,
      'anthropic-version': '2024-06-01',
    };

    const apiMessage = requestBody.messages.map((msg) => {
      return msg instanceof Message ? msg.toAPIFormat() : new Message('user', msg).toAPIFormat();
    });

    const body = {
      model: requestBody.model || 'claude-sonnet-4.6',
      messages: apiMessage,
      max_tokens: requestBody.max_tokens,
      system: requestBody.system || '',
    };

    try {
      const response = await this.httpClient.post(url, body, headers);
      // 接收repsponse并提取文本内容,在httpclient中已经处理了json解析和错误处理
      const responseData = response as ResponseBody;
      conversation.resMessages.push(responseData);
      return conversation.getLatestTextContent();
    } catch (error) {
      console.error('Error calling Claude API:', error);
      throw error;
    }
  }
}

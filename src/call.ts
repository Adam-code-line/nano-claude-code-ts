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
  ): Promise<string> {
    const headers: RequestHeader = {
      'x-api-key': apiKey,
      'anthropic-version': '2024-06-01',
    };

    requestBody.messages.forEach((msg) => {
      const messageInstance = msg instanceof Message ? msg : new Message(msg.role, msg.content);
      conversation.addMessage(messageInstance);
    });

    const messageForAPI = conversation.history.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const body = {
      model: requestBody.model || 'claude-sonnet-4.6',
      messages: messageForAPI,
      max_tokens: requestBody.max_tokens,
      system: requestBody.system || '',
    };

    try {
      const response = await this.httpClient.post(url, body, headers);
      // 接收repsponse并提取文本内容,在httpclient中已经处理了json解析和错误处理
      const responseData = response as ResponseBody;
      conversation.rawResponses.push(responseData);

      const assistantMessage = new Message(responseData.role, responseData.content);
      conversation.addMessage(assistantMessage);

      return conversation.getLatestTextContent();
    } catch (error) {
      console.error('Error calling Claude API:', error);
      throw error;
    }
  }
}

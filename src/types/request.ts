// 定义请求头类型
export interface RequestHeader {
  'x-api-key': string;
  'anthropic-version': string;
  'Content-Type': 'application/json';
}

// 定义请求体类型
export interface RequestBody {
  model: string;
  max_tokens: number;
  messages: Message[];
  system?: string;
}

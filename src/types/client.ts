export interface ClaudeClientOptions {
  /**
   * 默认使用 anthropic-version: 2023-06-01
   */
  apiVersion?: string;

  /**
   * 对应 HTTP Header: anthropic-beta
   * 多个 beta feature 用逗号分隔。
   */
  betas?: string[];

  /**
   * 追加/覆盖默认请求头（例如自建网关需要的 header）。
   */
  defaultHeaders?: Record<string, string>;

  /**
   * 是否额外发送 Authorization: Bearer <apiKey>。
   * 官方文档只要求 x-api-key，但部分网关可能需要 Authorization。
   */
  sendAuthorizationHeader?: boolean;
}

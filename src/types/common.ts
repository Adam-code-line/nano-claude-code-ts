export interface CacheControl {
  type: 'ephemeral';
  /**
   * 可选缓存 TTL，比如 "5m" / "1h"。
   * 具体支持的取值以 Claude API 文档为准。
   */
  ttl?: string;
}

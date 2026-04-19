// 定义 content block 类型（会持续演进，这里保留 Unknown 兜底）
export type ContentBlock =
  | TextBlock
  | ThinkingBlock
  | ToolUseBlock
  | ToolResultBlock
  | ServerToolUseBlock
  | UnknownContentBlock;

/** 标准文本块 */
export interface TextBlock {
  type: 'text';
  text: string;
  citations?: Array<Citation>;
}

/** * [2026 核心更新] 思维块
 * 当 RequestBody 开启了 thinking 模式时，模型会先输出此块。
 */
export interface ThinkingBlock {
  type: 'thinking';
  /** 模型的推理逻辑 */
  thinking: string;
  /** 某些安全合规场景下的签名校验 */
  signature?: string;
}

/** 工具调用块 */
export interface ToolUseBlock {
  type: 'tool_use';
  /** 工具调用的唯一 ID，后续提交 tool_result 时必须引用 */
  id: string;
  /** 工具名称 */
  name: string;
  /** 工具输入参数（JSON 对象） */
  input: Record<string, any>;
}

/** 工具结果块（由你执行工具后回传给 Claude） */
export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string | Array<ContentBlock>;
  is_error?: boolean;
}

/** Server tools 调用块（由 Claude 平台执行） */
export interface ServerToolUseBlock {
  type: 'server_tool_use';
  id: string;
  name: string;
  input: Record<string, any>;
}

/** 兜底：兼容新/未建模的 block 类型（例如某些 server tool 的 result block） */
export interface UnknownContentBlock {
  type: string;
  [key: string]: any;
}

// 定义引用类型
export interface Citation {
  type: 'char_location' | 'page_location';
  cited_text: string;
  document_index: number;
  document_title: string;
  start_char_index: number;
  end_char_index: number;
  file_id?: string;
}

// 定义响应体类型

export interface ResponseBody {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<ContentBlock>;
  model: string;
  stop_reason:
    | 'end_turn'
    | 'max_tokens'
    | 'stop_sequence'
    | 'tool_use'
    | 'pause_turn'
    | 'refusal'
    | 'model_context_window_exceeded'
    | null;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_creation_output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_read_output_tokens?: number;
  };
  container?: {
    id: string;
    expires_at: string;
  };
}

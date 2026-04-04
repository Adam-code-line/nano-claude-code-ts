//定义content类型
export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  citations?: Citation[];
  tool_name?: string;
  tool_id?: string;
  tool_results?: string;
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
  content: ContentBlock[];
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_creation_output_tokens?: number;
  };
  container?: {
    id: string;
    expires_at: string;
  };
}

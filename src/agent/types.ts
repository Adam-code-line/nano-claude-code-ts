import type { Conversation } from '../models/conversation.ts';

export interface RunOptions {
  model?: string;
  maxTurns?: number;
  maxTokens?: number;
  conversation?: Conversation;
}

export interface RunResult {
  text: string;
  conversation: Conversation;
  turns: number;
}

export interface Agent {
  run(userText: string, options?: RunOptions): Promise<RunResult>;
  runStream(
    userText: string,
    onData: (chunk: string) => void,
    options?: RunOptions,
  ): Promise<RunResult>;
}

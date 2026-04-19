// 工具注册（schema + handler）
import { ToolManager } from '../toolManager.ts';
import type { ClientTool } from '../types/tools.ts';

import { weatherTool } from './schemas/weather.ts';
import { weatherHandler } from './handlers/weather.ts';

export type ToolHandler = (input: any) => any | Promise<any>;

/**
 * toolRegistry 只存放「发给模型看的」工具 schema（ClientTool / ServerTool）。
 * handler 则存放在单独的映射里，避免把运行时代码塞进 schema 类型。
 */
export const toolRegistry = new ToolManager();
export const toolHandlers = new Map<string, ToolHandler>();

export function registerClientTool(tool: ClientTool, handler: ToolHandler): void {
  toolRegistry.register(tool);
  toolHandlers.set(tool.name, handler);
}

// 注册工具
registerClientTool(weatherTool, weatherHandler);

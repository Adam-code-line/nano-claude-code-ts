import { registerClientTool } from './registry.ts';
import { weatherTool } from './schemas/weather.ts';
import { weatherHandler } from './handlers/weather.ts';

let initialized = false;

export function initTools(): void {
  if (initialized) return;

  registerClientTool(weatherTool, weatherHandler);
  initialized = true;
}

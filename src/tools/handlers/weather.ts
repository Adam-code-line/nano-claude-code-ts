// 工具的handler，负责处理工具的调用逻辑

export async function weatherHandler(input: any): Promise<string> {
  const city = typeof input?.city === 'string' ? input.city.trim() : '';
  if (!city) {
    throw new Error('weather 工具缺少必填参数：city（string）');
  }

  // 这里可以替换为实际的天气API调用
  const weatherInfo = `当前${city}的天气是晴朗，温度25°C。`;
  return weatherInfo;
}

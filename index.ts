//入口文件

// 导入 ClaudeClient 类
import { ClaudeClient } from './src/client.ts';

// 创建 ClaudeClient 实例

const client = ClaudeClient.newClaudeClient(BASEURL, APIKEY);

// 发起一个简单的请求，获取 Claude 的版本信息

client.httpClient
  .get(`${client.baseURL}/version`, {
    Authorization: `Bearer ${client.apiKey}`,
  })
  .then((data) => {
    console.log('Claude version:', data.version);
  })
  .catch((error) => {
    console.error('Error fetching Claude version:', error);
  });


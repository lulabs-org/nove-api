/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-29 10:47:50
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-12-29 11:19:49
 * @FilePath: /lulab_backend/docs/developer/integrations/mcp/examples/sse-client-example.ts
 * @Description: 
 * 
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved. 
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

const SERVER_URL = 'http://localhost:3000/sse';

async function main() {
  const client = new Client(
    {
      name: 'lulab-sse-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    },
  );

  try {
    console.log('Connecting to MCP Server via SSE...');
    const transport = new SSEClientTransport(new URL(SERVER_URL));
    await client.connect(transport);
    console.log('Connected successfully!');

    const tools = await client.listTools();
    console.log('\nAvailable tools:');
    tools.tools.forEach((tool) => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });

    console.log('\nCalling greeting-tool...');
    const greetingResult = await client.callTool({
      name: 'greeting-tool',
      arguments: {
        name: 'World',
        language: 'en',
      },
    });
    console.log('Result:', greetingResult);

    console.log('\nCalling get-user-info...');
    const userInfoResult = await client.callTool({
      name: 'get-user-info',
      arguments: {
        userId: 'user-123',
      },
    });
    console.log('Result:', userInfoResult);

    console.log('\nCalling get-meeting-stats...');
    const meetingStatsResult = await client.callTool({
      name: 'get-meeting-stats',
      arguments: {
        startDate: '2025-12-01',
        endDate: '2025-12-31',
      },
    });
    console.log('Result:', meetingStatsResult);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nConnection closed.');
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

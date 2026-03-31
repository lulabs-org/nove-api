# MCP Server 连接配置指南

## 支持的传输方式

`@rekog/mcp-nest` 支持以下三种传输方式：

### 1. HTTP + SSE (Server-Sent Events)
适用于 Web 应用和需要实时更新的场景。

### 2. Streamable HTTP
适用于流式响应的场景。

### 3. STDIO
适用于命令行工具和本地开发环境。

---

## 连接方式配置

### 方式一: 使用 Claude Desktop (推荐)

Claude Desktop 是最简单的 MCP 客户端，支持 STDIO 传输方式。

#### 配置步骤

1. **启动你的 NestJS 应用**
   ```bash
   pnpm start:dev
   ```

2. **找到 Claude Desktop 配置文件**
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

3. **添加 MCP Server 配置**

   对于 **STDIO** 方式，需要创建一个启动脚本：

   ```json
   {
     "mcpServers": {
       "lulab-backend": {
         "command": "node",
         "args": [
           "/Users/yangshiming/code/by-framework/backend/nodejs/nest/lulab_backend/dist/main.js"
         ]
       }
     }
   }
   ```

   注意：需要先构建项目 `pnpm build`，确保 `dist/main.js` 存在。

---

### 方式二: 使用 HTTP + SSE 传输 (推荐用于 Web 应用)

SSE (Server-Sent Events) 传输方式适用于 Web 应用和需要实时更新的场景。

#### SSE 端点说明

当启用 SSE 传输后，MCP Server 会自动创建以下端点：

- **GET** `/sse` - 建立 SSE 连接，返回事件流
- **POST** `/messages?sessionId=xxx` - 向服务器发送消息

#### 配置说明

在 [mcp-server.module.ts](file:///Users/yangshiming/code/by-framework/backend/nodejs/nest/lulab_backend/src/mcp-server/mcp-server.module.ts) 中，SSE 传输已默认启用：

```typescript
McpModule.forRoot({
  name: 'lulab-mcp-server',
  version: '1.0.0',
  transport: [
    McpTransportType.SSE,
    McpTransportType.STREAMABLE_HTTP,
    McpTransportType.STDIO,
  ],
  sseEndpoint: 'sse',
  messagesEndpoint: 'messages',
  sse: {
    pingEnabled: true,
    pingIntervalMs: 30000,
  },
})
```

#### 使用 MCP Inspector 测试

MCP Inspector 是一个用于测试 MCP Server 的工具：

```bash
# 安装 MCP Inspector
npm install -g @modelcontextprotocol/inspector

# 启动你的应用
pnpm start:dev

# 在另一个终端运行 Inspector
mcp-inspector
```

然后在 Inspector 中配置连接到你的 MCP Server。

#### 自定义 SSE 客户端示例

如果你需要创建自定义的 SSE 客户端，可以使用以下代码：

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

// 创建客户端
const client = new Client({
  name: "my-sse-client",
  version: "1.0.0"
}, {
  capabilities: {}
});

// 连接到 SSE 传输
const transport = new SSEClientTransport(
  new URL("http://localhost:3000/sse")
);

await client.connect(transport);

// 列出可用的工具
const tools = await client.listTools();
console.log(tools);

// 调用工具
const result = await client.callTool({
  name: "greeting-tool",
  arguments: {
    name: "World",
    language: "en"
  }
});

console.log(result);
```

#### 使用原生 EventSource API

你也可以使用浏览器的原生 EventSource API 来连接：

```javascript
// 建立 SSE 连接
const eventSource = new EventSource('http://localhost:3000/sse');

// 监听消息
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

// 监听错误
eventSource.onerror = (error) => {
  console.error('SSE Error:', error);
  eventSource.close();
};

// 发送消息到服务器
async function sendMessage(sessionId, message) {
  const response = await fetch(
    `http://localhost:3000/messages?sessionId=${sessionId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    }
  );

  return response.json();
}

// 示例：调用工具
await sendMessage(sessionId, {
  method: 'tools/call',
  params: {
    name: 'greeting-tool',
    arguments: {
      name: 'World',
      language: 'en'
    }
  }
});
```

#### SSE 连接流程

1. **建立连接**: 客户端发送 GET 请求到 `/sse` 端点
2. **接收 Session ID**: 服务器返回 SSE 连接，包含唯一的 session ID
3. **发送消息**: 客户端通过 POST 请求到 `/messages?sessionId=xxx` 发送消息
4. **接收响应**: 服务器通过 SSE 流推送响应消息
5. **保持连接**: 服务器每 30 秒发送一次 ping 消息保持连接活跃

---

### 方式三: 自定义 MCP 客户端

如果你需要自定义客户端，可以使用 `@modelcontextprotocol/sdk`：

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// 创建客户端
const client = new Client({
  name: "my-client",
  version: "1.0.0"
}, {
  capabilities: {}
});

// 连接到 STDIO 传输
const transport = new StdioClientTransport({
  command: "node",
  args: ["/path/to/your/dist/main.js"]
});

await client.connect(transport);

// 列出可用的工具
const tools = await client.listTools();
console.log(tools);

// 调用工具
const result = await client.callTool({
  name: "greeting-tool",
  arguments: {
    name: "World",
    language: "en"
  }
});

console.log(result);
```

---

## 当前 MCP Server 提供的工具

### 1. greeting-tool
返回多语言问候语

**参数:**
- `name` (string, 默认: "World"): 名称
- `language` (enum: "en"|"zh"|"es"|"fr", 默认: "en"): 语言

**示例:**
```json
{
  "name": "Alice",
  "language": "zh"
}
```

### 2. get-user-info
根据 ID 获取用户信息

**参数:**
- `userId` (string): 用户 ID

**示例:**
```json
{
  "userId": "user-123"
}
```

### 3. list-users
分页列出所有用户

**参数:**
- `page` (number, 默认: 1): 页码
- `limit` (number, 默认: 10): 每页数量

**示例:**
```json
{
  "page": 1,
  "limit": 10
}
```

### 4. get-meeting-stats
获取指定时间段的会议统计数据

**参数:**
- `startDate` (string): 开始日期 (YYYY-MM-DD)
- `endDate` (string): 结束日期 (YYYY-MM-DD)

**示例:**
```json
{
  "startDate": "2025-12-01",
  "endDate": "2025-12-31"
}
```

### 5. get-meeting-details
获取特定会议的详细信息

**参数:**
- `meetingId` (string): 会议 ID

**示例:**
```json
{
  "meetingId": "meeting-123"
}
```

---

## 快速开始

### 1. 构建项目
```bash
pnpm build
```

### 2. 启动应用
```bash
pnpm start:prod
```

### 3. 配置 Claude Desktop
编辑 `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

```json
{
  "mcpServers": {
    "lulab-backend": {
      "command": "node",
      "args": [
        "/Users/yangshiming/code/by-framework/backend/nodejs/nest/lulab_backend/dist/main.js"
      ]
    }
  }
}
```

### 4. 重启 Claude Desktop
重启 Claude Desktop，它将自动连接到你的 MCP Server。

### 5. 在 Claude 中使用
现在你可以在 Claude 中直接调用这些工具了！

---

## 认证配置

### 开发环境: 绕过认证

在开发环境中，MCP Server 端点默认使用 `Public` 装饰器绕过全局的 JWT 认证守卫。这允许你在不提供认证令牌的情况下测试 MCP 连接。

在 [mcp-server.module.ts](file:///Users/yangshiming/code/by-framework/backend/nodejs/nest/lulab_backend/src/mcp-server/mcp-server.module.ts) 中配置：

```typescript
import { Public } from '@/auth/decorators/public.decorator';

@Module({
  imports: [
    McpModule.forRoot({
      name: 'lulab-mcp-server',
      version: '1.0.0',
      transport: [
        McpTransportType.SSE,
        McpTransportType.STREAMABLE_HTTP,
        McpTransportType.STDIO,
      ],
      decorators: [Public()],  // 绕过全局认证守卫
      // ... 其他配置
    }),
  ],
  providers: [GreetingTool, UserInfoTool, MeetingStatsTool],
})
export class McpServerModule {}
```

### 生产环境: 启用认证

在生产环境中，你应该移除 `decorators: [Public()]` 配置，让 MCP 端点使用全局的 JWT 认证守卫。客户端需要在请求头中提供有效的 JWT 令牌：

```typescript
// 使用 JWT 令牌连接
const transport = new SSEClientTransport(new URL('http://localhost:3000/sse'), {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
});
```

---

## 故障排查

### 问题: Claude Desktop 无法连接
- 确保应用已经构建 (`pnpm build`)
- 确保 `dist/main.js` 路径正确
- 检查应用是否正常运行

### 问题: SSE 连接返回 401 Unauthorized
- 检查是否在 `McpModule.forRoot` 中配置了 `decorators: [Public()]` (开发环境)
- 如果在生产环境，确保客户端提供了有效的 JWT 令牌
- 检查全局认证守卫配置是否正确

### 问题: 工具调用失败
- 检查参数是否符合 Zod schema 定义
- 查看应用日志获取错误信息

### 问题: 进度通知不工作
- 确保工具方法中正确调用了 `context.reportProgress()`

---

## 更多资源

- [@rekog/mcp-nest 文档](https://www.npmjs.com/package/@rekog/mcp-nest)
- [MCP 协议规范](https://modelcontextprotocol.io/)
- [Claude Desktop 文档](https://claude.ai/download)

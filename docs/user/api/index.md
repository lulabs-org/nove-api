# API 文档

Nove API 提供完整的 OpenAPI (Swagger) 和 Redoc 交互式文档，包含了所有端点的详细说明、请求/响应模型和鉴权要求。

请在本地启动项目后（例如运行 `pnpm start:dev`），直接通过以下本地地址访问：

| 文档类型 | 地址 | 说明 |
|----------|------|------|
| 📚 **Swagger 交互文档** | `http://localhost:3000/api` | 支持在线调试（Try it out），推荐日常使用 |
| 📖 **Redoc 文档** | `http://localhost:3000/docs` | 纯阅读式参考文档，排版更美观 |
| 📄 **Swagger API JSON** | `http://localhost:3000/api-json` | OpenAPI JSON 格式，可导入 Postman 等工具 |
| 🎯 **GraphQL 端点** | `http://localhost:3000/graphql` | GraphQL Playground，支持交互式查询 |

*(如果 `process.env.PORT` 配置了不同的端口，请将 `3000` 替换为实际端口)*

## 如何在 Swagger UI 中认证

1. 点击页面右上角的 🔒 **Authorize** 按钮
2. 在弹出框中输入：`Bearer <your-access-token>`
3. 点击 **Authorize** 确认
4. 之后所有需要认证的接口均会自动携带令牌

## 如何使用 GraphQL

开发环境访问 `http://localhost:3000/graphql` 打开 GraphQL Playground。在左侧编辑器中编写查询，点击运行按钮即可查看结果。生产环境默认关闭 Playground 和 introspection。

> [!NOTE]
> 为了保持接口说明与代码的绝对一致，所有接口定义均由 NestJS 代码中的注解自动生成，本目录不再维护手写的 Markdown API 端点文档。

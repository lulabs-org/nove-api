# API 文档

Nove API 提供完整的 OpenAPI (Swagger) 和 Redoc 交互式文档，包含了所有端点的详细说明、请求/响应模型和鉴权要求。

请在本地启动项目后（例如运行 `pnpm start:dev`），直接通过以下本地地址访问：

- 📚 **Swagger 交互文档**: [http://localhost:3000/api](http://localhost:3000/api)
- 📖 **Redoc 文档**: [http://localhost:3000/docs](http://localhost:3000/docs)
- 📄 **Swagger API JSON**: [http://localhost:3000/api-json](http://localhost:3000/api-json)
- 🎯 **GraphQL 端点**: [http://localhost:3000/graphql](http://localhost:3000/graphql)

*(如果 `process.env.PORT` 配置了不同的端口，请将 `3000` 替换为实际端口)*

> **注意**：为了保持接口说明与代码的绝对一致，所有接口定义均由 NestJS 代码中的注解自动生成，本目录不再维护手写的 Markdown API 端点文档。

# 部署

部署模块负责应用程序的部署、环境配置和容器化等。

## 📚 文档列表

- [部署指南](guide.md) - 开发、测试与生产环境详细部署指南

## 🏗️ 部署架构

```
deployment/
├── environments/         # 环境配置
│   ├── development/
│   ├── staging/
│   └── production/
├── container/            # 容器化配置
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── nginx/
└── scripts/              # 部署脚本
```

## 🔧 环境配置

### 开发环境
```bash
# 启动开发服务器
pnpm start:dev

# 运行数据库迁移
pnpm db:migrate

# 生成Prisma客户端
pnpm db:generate
```

### 生产环境
```bash
# 构建应用
pnpm build

# 启动生产服务器
pnpm start:prod

# 运行生产环境迁移
pnpm db:migrate:prod
```

## 🐳 容器化部署

### Dockerfile
```dockerfile
FROM node:18-alpine
# 安装 pnpm
RUN npm install -g pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build
EXPOSE 3000
CMD ["pnpm", "run", "start:prod"]
```

### Docker Compose
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - db
  db:
    image: postgres:14
    environment:
      - POSTGRES_DB=lulab_db
      - POSTGRES_USER=lulab_user
      - POSTGRES_PASSWORD=lulab_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
volumes:
  postgres_data:
```

## 🚀 部署流程

1. 准备部署环境
2. 配置环境变量
3. 构建应用
4. 运行数据库迁移
5. 启动应用服务
6. 配置负载均衡和反向代理
7. 设置监控和日志

## 📊 监控

- 应用性能监控
- 数据库性能监控
- 服务器资源监控
- 错误日志监控
- 用户行为监控

## 🛡️ 安全考虑

- 使用HTTPS加密传输
- 配置防火墙规则
- 定期更新依赖包
- 实施访问控制
- 备份重要数据

## 🔄 CI/CD

使用GitHub Actions实现持续集成和部署：

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      - name: Run tests
        run: pnpm test
      - name: Build
        run: pnpm run build
      - name: Deploy
        run: ./scripts/deploy.sh
```
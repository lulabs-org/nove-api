# 部署指南

## 概述

本文档详细说明了如何在不同环境中部署本应用，包括开发环境、测试环境和生产环境的部署步骤。

## 环境要求

### 系统要求

- **操作系统**: Linux (推荐Ubuntu 20.04+) / macOS / Windows (WSL2)
- **Node.js**: v18.x 或 v20.x
- **pnpm**: v8.x 或更高版本
- **PostgreSQL**: v13+ (推荐v15+)
- **内存**: 最小4GB (推荐8GB+)
- **存储**: 最小20GB可用空间

### 第三方服务

- 腾讯会议开发者账号
- 飞书开发者账号
- 阿里云账号（短信服务）
- 邮件服务SMTP配置

## 开发环境部署

### 1. 克隆代码库

```bash
git clone <repository-url>
cd nove_api
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

复制环境配置文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置环境变量。详细配置说明和所有可用参数请参考项目根目录下的 `.env.example` 文件。

关键配置项包括：
- 数据库连接配置（DATABASE_URL）
- JWT 认证配置（JWT_SECRET 等）
- 腾讯会议 API 配置（TENCENT_MEETING_*）
- 飞书集成配置（LARK_*）
- 阿里云短信服务配置（ALIYUN_SMS_*）
- 邮件服务配置（SMTP_*）
- Redis 配置（REDIS_*）
- OpenAI API 配置（OPENAI_*）

请确保所有必需的配置项都已正确填写，特别是密钥和凭证信息。

### 4. 数据库设置

#### 安装PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS (Homebrew):**
```bash
brew install postgresql
brew services start postgresql
```

#### 创建数据库

```bash
# 切换到postgres用户
sudo -u postgres psql

# 创建数据库用户
CREATE USER lulab_user WITH PASSWORD 'your_password';
ALTER USER lulab_user CREATEDB;

# 创建数据库
CREATE DATABASE nove_api OWNER lulab_user;

# 退出
\q
```

#### 运行数据库初始化

```bash
# 生成Prisma客户端
pnpm db:generate

# 运行数据库推送（开发环境）
pnpm db:push

# 或者运行迁移（生产环境）
pnpm db:migrate

# 初始化种子数据（可选）
pnpm db:seed
```

### 5. 启动应用

```bash
# 开发模式启动
pnpm start:dev

# 或者构建后启动
pnpm build
pnpm start:prod
```

### 6. 验证部署

访问以下URL验证应用是否正常运行：

- 主页: `http://localhost:3000`
- API文档: `http://localhost:3000/api`
- GraphQL Playground: `http://localhost:3000/graphql`
- 会议健康检查: `http://localhost:3000/meetings/health`

## 测试环境部署

### 1. Docker部署（推荐）

创建 `docker-compose.test.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=test
      - DATABASE_URL=postgresql://lulab_user:password@postgres:5432/nove_api
    depends_on:
      - postgres
    volumes:
      - ./logs:/app/logs

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=nove_api
      - POSTGRES_USER=lulab_user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data_test:/var/lib/postgresql/data
    ports:
      - "5433:5432"

volumes:
  postgres_data_test:
```

启动测试环境：

```bash
docker-compose -f docker-compose.test.yml up -d
```

### 2. 运行测试

```bash
# 运行单元测试
pnpm test

# 运行集成测试
pnpm test:integration

# 运行系统测试
pnpm test:system

# 运行端到端测试
pnpm test:e2e

# 运行所有测试
pnpm test:all

# 生成测试覆盖率报告
pnpm test:cov

# CI 环境下的测试
pnpm test:ci
```

## 生产环境部署

### 1. 服务器准备

#### 系统优化

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装必要工具
sudo apt install -y git curl wget nginx supervisor

# 安装Node.js (使用NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装pnpm
sudo npm install -g pnpm
```

### 2. 应用部署

#### 克隆代码

```bash
# 创建应用目录
sudo mkdir -p /opt/nove_api
sudo chown $USER:$USER /opt/nove_api

# 克隆代码
cd /opt/nove_api
git clone <repository-url> .
```

#### 安装依赖和构建

```bash
# 安装依赖（生产模式）
pnpm install --prod

# 构建应用
pnpm build

# 验证构建结果
node dist/main.js --version
```

#### 配置环境变量

创建生产环境配置文件：

```bash
# 创建配置目录
sudo mkdir -p /etc/nove_api

# 复制配置文件
sudo cp .env.example /etc/nove_api/.env

# 编辑生产配置
sudo nano /etc/nove_api/.env
```

### 3. 数据库设置

#### 运行生产迁移

```bash
# 运行生产数据库迁移
pnpm db:migrate

# 或者使用 Prisma CLI
npx prisma migrate deploy

# 初始化生产数据（可选）
pnpm db:seed
```

### 4. 进程管理

#### 使用PM2管理应用

```bash
# 安装PM2
sudo npm install -g pm2

# 启动应用
pm2 start dist/main.js --name "lulab-backend" --env production

# 设置开机自启
pm2 startup
pm2 save
```

#### 使用Systemd管理应用

创建服务文件 `/etc/systemd/system/lulab-backend.service`:

```ini
[Unit]
Description=Lulab Backend Application
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/nove_api
Environment=NODE_ENV=production
EnvironmentFile=/etc/nove_api/.env
ExecStart=/opt/nove_api/node_modules/.bin/node dist/main.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

启用服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable lulab-backend
sudo systemctl start lulab-backend
```

### 5. 反向代理配置

配置Nginx作为反向代理：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # 启用HTTPS重定向
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
}
```

配置SSL证书（使用Let's Encrypt）：

```bash
# 安装certbot
sudo apt install certbot python3-certbot-nginx

# 获取SSL证书
sudo certbot --nginx -d your-domain.com
```

### 6. 监控和日志

#### 日志管理

```bash
# 查看应用日志
journalctl -u lulab-backend -f

# 或者使用PM2日志
pm2 logs lulab-backend
```

#### 监控配置

安装监控工具：

```bash
# 安装htop用于系统监控
sudo apt install htop

# 安装logwatch用于日志分析
sudo apt install logwatch
```

### 7. 备份策略

#### 数据库备份

创建备份脚本 `/opt/nove_api/scripts/backup.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/opt/nove_api/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="nove_api_$DATE"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 数据库备份
pg_dump -h localhost -U lulab_user -d nove_api > $BACKUP_DIR/${BACKUP_NAME}.sql

# 压缩备份文件
gzip $BACKUP_DIR/${BACKUP_NAME}.sql

# 删除7天前的备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_NAME.sql.gz"
```

设置定时备份：

```bash
# 编辑crontab
crontab -e

# 添加每日凌晨2点备份
0 2 * * * /opt/nove_api/scripts/backup.sh
```

## 环境变量详解

### 必需配置

| 变量名 | 描述 | 示例值 |
|--------|------|--------|
| DATABASE_URL | 数据库连接字符串 | postgresql://user:pass@host:port/db |
| JWT_SECRET | JWT密钥 | your_jwt_secret_key |
| JWT_EXPIRES_IN | JWT过期时间 | 24h |

### 腾讯会议配置

| 变量名 | 描述 | 示例值 |
|--------|------|--------|
| TENCENT_MEETING_APP_ID | 应用ID | your_app_id |
| TENCENT_MEETING_SDK_ID | SDK ID | your_sdk_id |
| TENCENT_MEETING_SECRET_ID | 密钥ID | your_secret_id |
| TENCENT_MEETING_SECRET_KEY | 密钥 | your_secret_key |
| TENCENT_MEETING_TOKEN | Webhook令牌 | your_webhook_token |
| TENCENT_MEETING_ENCODING_AES_KEY | AES密钥 | your_encoding_aes_key |

### 飞书配置

| 变量名 | 描述 | 示例值 |
|--------|------|--------|
| LARK_APP_ID | 飞书应用ID | your_app_id |
| LARK_APP_SECRET | 飞书应用密钥 | your_app_secret |
| LARK_BITABLE_APP_TOKEN | 多维表格应用令牌 | your_app_token |
| LARK_TABLE_MEETING | 会议表格ID | your_meeting_table_id |
| LARK_TABLE_MEETING_RECORD_FILE | 录制文件表格ID | your_recording_file_table_id |

## 故障排除

### 常见问题

#### 1. 数据库连接失败

**问题**: 应用无法连接到数据库

**解决方案**:
```bash
# 检查数据库服务状态
sudo systemctl status postgresql

# 检查连接字符串
echo $DATABASE_URL

# 测试数据库连接
psql $DATABASE_URL
```

#### 2. 环境变量未加载

**问题**: 配置未正确加载

**解决方案**:
```bash
# 检查环境变量
printenv | grep YOUR_PREFIX

# 验证配置文件路径
ls -la /etc/nove_api/.env
```

#### 3. 端口被占用

**问题**: 应用启动失败，端口被占用

**解决方案**:
```bash
# 查找占用端口的进程
lsof -i :3000

# 终止进程
kill -9 <PID>

# 或者更改应用端口
export PORT=3001
```

### 日志查看

```bash
# PM2日志
pm2 logs lulab-backend

# Systemd日志
journalctl -u lulab-backend -f

# 应用日志文件
tail -f /opt/nove_api/logs/app.log
```

## 性能调优

### Node.js调优

```bash
# 设置Node.js内存限制
export NODE_OPTIONS="--max-old-space-size=4096"

# 启用生产环境优化
export NODE_ENV=production
```

### 数据库调优

在 `postgresql.conf` 中调整以下参数：

```conf
# 连接设置
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
```

### Nginx调优

在Nginx配置中添加：

```nginx
# 启用gzip压缩
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

# 设置连接超时
keepalive_timeout 65;
```

## 安全加固

### 应用安全

```bash
# 设置文件权限
chmod 600 /etc/nove_api/.env
chown www-data:www-data /etc/nove_api/.env

# 限制目录访问
find /opt/nove_api -type d -exec chmod 755 {} \;
find /opt/nove_api -type f -exec chmod 644 {} \;
```

### 网络安全

配置防火墙：

```bash
# 安装ufw
sudo apt install ufw

# 设置规则
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## 升级和维护

### 应用升级

```bash
# 停止应用
pm2 stop lulab-backend

# 拉取最新代码
cd /opt/nove_api
git pull

# 安装新依赖
pnpm install --prod

# 构建应用
pnpm run build

# 运行数据库迁移
npx prisma migrate deploy

# 启动应用
pm2 start lulab-backend
```

### 数据库维护

```bash
# 数据库统计信息更新
psql -d nove_api -c "ANALYZE;"

# 数据库清理
psql -d nove_api -c "VACUUM ANALYZE;"
```
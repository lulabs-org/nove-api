# 腾讯会议集成功能

本项目已成功集成腾讯会议API，可以接收腾讯会议的webhook事件并将会议数据存储到PostgreSQL数据库中。

## 功能特性

- ✅ 腾讯会议Webhook验证和事件接收
- ✅ 录制完成事件处理
- ✅ 会议录制文件下载和存储
- ✅ 会议参与者信息获取
- ✅ 转录文本和会议纪要处理
- ✅ PostgreSQL数据库存储
- ✅ RESTful API查询接口

## 项目结构

```text
src/
└── tencent-meeting/                        # 腾讯会议模块（业务侧）
    ├── controllers/
    │   ├── tencent-meeting.controller.ts   # 会议管理API控制器
    │   └── tencent-webhook.controller.ts   # Webhook 控制器（路由：/webhooks/tencent）
    ├── decorators/
    │   └── tencent-webhook.decorators.ts   # API文档装饰器
    ├── dto/
    │   └── tencent-webhook-body.dto.ts     # Webhook请求体DTO
    ├── interceptors/
    │   └── webhook-logging.interceptor.ts  # Webhook日志拦截器
    ├── services/
    │   ├── event-handlers/                 # 事件处理器
    │   │   ├── base-event.handler.ts       # 基础事件处理器
    │   │   ├── event-handler.factory.ts    # 事件处理器工厂
    │   │   ├── meeting-ended.handler.ts    # 会议结束处理器
    │   │   ├── meeting-started.handler.ts  # 会议开始处理器
    │   │   └── recording-completed.handler.ts # 录制完成处理器
    │   ├── tencent-config.service.ts       # Webhook 配置读取与校验
    │   ├── tencent-event-handler.service.ts # 事件分发服务
    │   └── tencent-meeting.service.ts      # 业务聚合服务
    ├── types/
    │   └── types/                        # Webhook 事件类型
    │       ├── index.ts                  # 统一导出
    │       ├── tencent-base.types.ts     # 基础类型和枚举
    │       └── tencent-event.types.ts    # 事件类型定义
    ├── utils/
    │   └── tencent-event.utils.ts        # 工具类
    └── tencent-meeting.module.ts           # 模块装配

src/integrations/
└── tencent-meeting/                    # 腾讯会议集成（通用层）
    ├── tencent.module.ts               # 导出 TencentApiService
    ├── tencent-api.service.ts          # 腾讯会议 API 客户端
    ├── crypto.util.ts                  # 加解密/签名工具
    ├── exceptions.ts                   # Webhook/Platform 异常
    ├── types.ts                        # API 响应/实体类型
    └── index.ts                        # Barrel 导出

src/common/
└── utils/
    └── http-file.ts                    # HTTP 文件下载工具
```

测试位置说明：
- 腾讯会议集成相关的单元测试就近放置于 `src/integrations/tencent-meeting/*.spec.ts`
- 集成测试放置于 `test/integration/tencent-meeting.int-spec.ts`

## 环境配置

复制 `.env.example` 到 `.env` 并配置以下环境变量：

```bash
# 数据库配置
DATABASE_URL="postgresql://username:password@localhost:5432/lulab_backend?schema=public"

# 腾讯会议配置
TENCENT_MEETING_APP_ID="your_app_id"
TENCENT_MEETING_SDK_ID="your_sdk_id"
TENCENT_MEETING_SECRET_ID="your_secret_id"
TENCENT_MEETING_SECRET_KEY="your_secret_key"
TENCENT_MEETING_TOKEN="your_webhook_token"
TENCENT_MEETING_ENCODING_AES_KEY="your_encoding_aes_key"
```

## API端点

### Webhook端点

#### 1. Webhook验证 (GET)

```text
GET /webhooks/tencent
```

用于腾讯会议平台验证webhook URL的有效性。

#### 2. Webhook事件接收 (POST)

```text
POST /webhooks/tencent
```

接收腾讯会议的事件通知，目前支持：

- `recording.completed` - 录制完成事件

### 查询端点

#### 3. 获取会议记录列表

```text
GET /meetings
```

查询参数：

- `platform` - 会议平台 (可选)
- `startDate` - 开始日期 (可选)
- `endDate` - 结束日期 (可选)
- `page` - 页码 (可选，默认1)
- `limit` - 每页数量 (可选，默认20)

#### 4. 获取会议记录详情

```text
GET /meetings/:id
```

#### 5. 会议统计信息

```text
GET /meetings/stats
```

#### 6. 重新处理会议记录

```text
POST /meetings/:id/reprocess
```

#### 7. 健康检查

```text
GET /meetings/health
```

## 数据库模型

### MeetingRecord (会议记录)

- 会议基本信息（标题、描述、会议号等）
- 主持人和参与者信息
- 时间信息（开始时间、结束时间、时长）
- 录制和处理状态
- AI处理结果（转录、总结、关键要点等）

### MeetingFile (会议文件)

- 文件基本信息（文件名、类型、大小等）
- 存储信息（存储方式、路径、URL等）
- 文件内容（适用于文本文件）
- 处理状态

## 使用流程

1. **配置腾讯会议Webhook**
   - 在腾讯会议开放平台配置webhook URL: `https://your-domain.com/meeting/tencent/webhook`
   - 设置相应的Token和EncodingAESKey

2. **启动应用**

   ```bash
   # 安装依赖
   pnpm install

   # 生成Prisma客户端
   npx prisma generate

   # 运行数据库迁移
   npx prisma db push

   # 启动应用
   pnpm run start:dev
   ```

3. **接收事件**
   - 当腾讯会议录制完成时，系统会自动接收webhook事件
   - 系统会获取录制文件详情、下载文件内容、处理参与者信息
   - 所有数据会存储到PostgreSQL数据库中

4. **查询数据**
   - 使用REST API查询会议记录和文件信息
   - 支持分页、筛选等功能

## 安全特性

- ✅ Webhook签名验证
- ✅ AES加密数据解密
- ✅ 环境变量配置敏感信息
- ✅ 错误处理和日志记录

## 扩展功能

系统设计支持多平台扩展，可以轻松添加其他会议平台的集成：

- Zoom
- Microsoft Teams
- 钉钉
- 飞书
- Cisco Webex

## 故障排除

1. **Webhook验证失败**
   - 检查Token和EncodingAESKey配置
   - 确认时间戳和签名计算正确

2. **数据库连接失败**
   - 检查DATABASE_URL配置
   - 确认PostgreSQL服务运行正常

3. **API调用失败**
   - 检查腾讯会议API密钥配置
   - 确认网络连接正常

## 开发说明

本实现参考了原有的Next.js API代码，并完全迁移到NestJS框架。经过若干次重构，形成如下边界与依赖：

### 模块依赖与分层

- libs/integrations/tencent-meeting（通用集成层）
  - 提供 TencentModule（导出 TencentApiService），以及 crypto.util、exceptions、types。
  - 不依赖 src；供业务模块（src/…）直接复用，利于共享与测试。
- src/tencent-meeting（业务层）
  - 通过依赖 `TencentModule` 使用 API 客户端；通过 `@libs/integrations/tencent-meeting` 直接复用异常、加解密与类型。
  - Webhook 配置读取集中在 `TencentMeetingConfigService`，控制器不再直接拼装配置。
- 数据访问与共享
  - `PrismaModule` 统一提供 `PrismaService`；`MeetingModule` 导出 `MeetingRepository`。
  - `TencentMeetingModule` 通过导入 `MeetingModule` 获取仓储，避免跨域直接提供者注入。
- 工具与别名
  - `HttpFileUtil` 上移到 `libs/common/utils/http-file.ts`，统一通过 `@libs/common/utils` 引用。
  - 统一使用路径别名：`@libs/*`、`@/*`。

### 主要改进点

1. **模块化架构** - 使用NestJS的模块系统组织代码
2. **依赖注入** - 更好的代码解耦和测试支持
3. **类型安全** - 完整的TypeScript类型定义（统一在 libs）
4. **错误处理** - 统一的异常处理（统一在 libs）
5. **日志记录** - 结构化的日志输出
6. **配置管理** - Webhook 配置集中服务 + 环境变量统一管理

项目已通过TypeScript编译检查，可以直接部署使用。

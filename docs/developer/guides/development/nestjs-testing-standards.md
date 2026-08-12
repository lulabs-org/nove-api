# NestJS 测试规范（Unit / Integration / System / E2E）

## 1. 目标与原则

### 目标
- 用最小成本获得最大信心：越靠近业务核心的逻辑越需要高覆盖、快反馈的测试。
- 明确分层：不同测试类型解决不同风险，避免“全靠 E2E”或“只有 Unit”。

### 基本原则
- **可重复**：测试不依赖随机、时间、外部网络（除非明确为 E2E/System）。
- **可定位**：失败能快速定位到模块与原因。
- **可维护**：测试结构与命名一致，避免过度耦合实现细节。
- **快慢分离**：Unit 极快；Integration 次之；System/E2E 稳定优先。

---

## 2. 测试分层定义

| 类型 | 目的 | 依赖 | 速度 | 覆盖重点 | 典型场景 |
|---|---|---|---|---|---|
| Unit | 验证单个类/函数逻辑 | Mock外部依赖 | 极快 | Service、UseCase、Util、Pipe、Guard、Controller | 业务逻辑计算、数据转换、验证规则 |
| Integration | 验证模块与基础设施协作 | 真实DB/Redis等 | 中 | Repository + DB、Service + DB、多Service协作 | 数据库操作、缓存读写、第三方API调用 |
| System | 验证跨模块业务链路 | 多组件 + 基础设施 | 慢 | Webhook处理、MQ消息、缓存一致性、跨模块事务 | Webhook接收→处理→存储、定时任务执行 |
| E2E | 验证完整HTTP请求链路 | HTTP + 全量依赖 | 最慢 | API契约、鉴权流程、错误处理、性能 | 完整API调用、认证授权、端到端业务流程 |

### 测试边界说明

- **Controller测试**：
  - Unit测试：单独测试Controller逻辑（验证、路由、响应格式）
  - E2E测试：测试完整HTTP请求链路（包括中间件、Guard、异常处理）

- **Module wiring**：
  - Integration测试：验证模块依赖注入、Provider配置
  - System测试：验证模块间协作、跨模块调用

- **幂等性测试**：
  - 作为测试关注点，可在Integration/System中验证
  - 不是独立的测试类型

---

## 3. 技术栈约定

- 测试框架：Jest
- HTTP 测试：supertest
- 容器依赖：Testcontainers / docker compose
- Mock：jest.mock / 手写 stub
- 覆盖率：jest --coverage

---

## 4. 目录结构

```
src/
  *.spec.ts                    # Unit测试（与源码放在一起）
test/
  integration/
    *.int-spec.ts              # Integration测试
  system/
    *.spec.ts                  # System测试
  e2e/
    *.e2e-spec.ts               # E2E测试
  fixtures/
    *.ts                       # 测试数据工厂
  helpers/
    *.ts                       # 测试辅助工具
```

---

## 5. Unit 测试规范

### 范围
- Service / UseCase（强制）
- Util、Pipe、Guard、Controller（推荐）

### 规则
- 不访问真实 DB / Redis / 网络
- 只测试行为，不测试实现细节
- Mock 依赖必须显式声明
- Controller测试只验证路由、验证、响应格式，不测试完整HTTP链路

### 示例
```ts
describe('UserService (unit)', () => {
  let service: UserService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should throw when user not found', async () => {
    prismaService.user.findUnique.mockResolvedValue(null);
    await expect(service.findById('123')).rejects.toThrow(NotFoundException);
  });
});
```

---

## 6. Integration 测试规范

### 范围
- Repository + DB
- Service + DB
- 多个Service协作
- 第三方API集成（真实API调用）
- Module依赖关系验证

### 规则
- 使用真实基础设施（容器化DB/Redis）
- 不mock DB，但可mock外部网络依赖（如第三方API）
- 每个suite独立数据隔离
- 使用真实配置（通过.env.test）

### 示例
```ts
describe('MeetingRepository (integration)', () => {
  let prismaService: PrismaService;

  beforeAll(async () => {
    prismaService = new PrismaService();
    await prismaService.$connect();
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });

  beforeEach(async () => {
    await prismaService.meeting.deleteMany();
  });

  it('should create and retrieve meeting', async () => {
    const meeting = await prismaService.meeting.create({
      data: {
        platform: MeetingPlatform.TENCENT_MEETING,
        meetingId: 'test-123',
        title: 'Test Meeting',
      },
    });

    const found = await prismaService.meeting.findUnique({
      where: { id: meeting.id },
    });

    expect(found).toBeDefined();
    expect(found?.title).toBe('Test Meeting');
  });
});
```

---

## 7. System 测试规范

### 定义
验证多个内部组件协作完成一条完整业务链路，包括：
- Webhook接收 → 签名验证 → 业务处理 → 数据存储
- MQ消息消费 → 业务处理 → 状态更新
- 定时任务触发 → 数据处理 → 结果存储
- 跨模块事务与数据一致性
- 缓存与数据库同步

### 规则
- 用例数量少但关键，只覆盖核心业务流程
- 关注业务结果与副作用，不关注内部实现
- 明确异步超时与重试机制
- 验证幂等性与事务完整性

### 示例
```ts
describe('Tencent Webhook System Test', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    prismaService = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should process meeting started webhook end-to-end', async () => {
    const payload = {
      event_type: 'meeting.started',
      meeting_id: 'test-meeting-123',
      start_time: Date.now(),
    };

    const signature = generateSignature(payload);

    const response = await request(app.getHttpServer())
      .post('/webhooks/tencent')
      .set('X-TC-Signature', signature)
      .send(payload)
      .expect(200);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const meeting = await prismaService.meeting.findUnique({
      where: { meetingId: payload.meeting_id },
    });

    expect(meeting).toBeDefined();
    expect(meeting?.status).toBe('STARTED');
  });
});
```

---

## 8. E2E 测试规范

### 范围
- 完整HTTP请求链路（Controller → Service → Repository → DB）
- API契约验证（请求/响应格式）
- 鉴权与授权流程
- 错误处理与异常映射
- 性能指标（响应时间、并发）

### 规则
- 每个接口至少覆盖成功 + 常见失败场景
- 断言HTTP状态码、响应结构、业务数据
- 不断言内部实现细节
- 使用真实认证流程（JWT）
- 验证幂等性（POST/PUT/PATCH）

### 示例
```ts
describe('Auth API (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user).not.toHaveProperty('password');
        });
    });

    it('should return 401 with invalid credentials', async () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 401);
          expect(res.body).toHaveProperty('message');
        });
    });
  });

  describe('GET /users/profile', () => {
    it('should return user profile with valid token', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      accessToken = loginRes.body.accessToken;

      return request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('email');
        });
    });

    it('should return 401 without token', async () => {
      return request(app.getHttpServer())
        .get('/users/profile')
        .expect(401);
    });
  });
});
```

---

## 9. 数据与环境隔离

### 隔离策略
推荐方案（三选一）：
1. **事务回滚**：测试在事务中执行，测试后自动回滚
2. **清空表**：每个suite前清空相关表（truncate）
3. **重建schema**：每个suite前重建测试数据库

### 数据管理
- 不依赖已有数据，每个测试自给自足
- 使用Factory模式统一生成测试数据
- 使用唯一标识避免数据冲突（如时间戳、UUID）

### Factory示例
```ts
// test/factories/user.factory.ts
export class UserFactory {
  static create(overrides = {}) {
    return {
      email: `test${Date.now()}@example.com`,
      password: 'hashedPassword',
      name: 'Test User',
      ...overrides,
    };
  }

  static async createInDb(prisma: PrismaService, overrides = {}) {
    return prisma.user.create({
      data: this.create(overrides),
    });
  }
}

// test/factories/meeting.factory.ts
export class MeetingFactory {
  static create(overrides = {}) {
    return {
      platform: MeetingPlatform.TENCENT_MEETING,
      meetingId: `meeting-${Date.now()}`,
      title: 'Test Meeting',
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
      ...overrides,
    };
  }
}

// 在测试中使用
describe('MeetingService (integration)', () => {
  it('should create meeting', async () => {
    const meetingData = MeetingFactory.create({ title: 'Custom Meeting' });
    const meeting = await service.create(meetingData);
    expect(meeting.title).toBe('Custom Meeting');
  });
});
```

---

## 10. 覆盖率与 CI 门禁

### 覆盖率要求
- **Unit测试**：branches ≥ 80%, functions ≥ 80%, lines ≥ 80%, statements ≥ 80%
- **Integration测试**：核心模块必须覆盖，无强制覆盖率要求
- **System/E2E测试**：关键业务链路必须覆盖，无强制覆盖率要求

### CI 门禁
- **PR阶段**：运行 Unit + Integration 测试
- **main分支**：运行所有测试（Unit + Integration + System + E2E）
- **Nightly构建**：运行完整测试套件 + 覆盖率报告

### 测试命令
```bash
# 运行所有测试
pnpm test:all

# 运行特定测试类型
pnpm test:unit          # Unit测试
pnpm test:integration   # Integration测试
pnpm test:system        # System测试
pnpm test:e2e           # E2E测试

# 生成覆盖率报告
pnpm test:cov

# CI模式（所有测试 + 覆盖率）
pnpm test:ci
```

---

## 11. 用例风格

- 统一 AAA（Arrange / Act / Assert）
- 命名清晰：
  - `should [do something] when [condition]`

---

## 12. 禁止反模式

- 用 E2E 替代 Unit
- Integration 中大量 mock
- 测试依赖执行顺序
- 依赖真实外部服务

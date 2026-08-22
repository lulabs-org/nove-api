import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { jwtConfig } from '@/configs/jwt.config';
import { TokenService } from './token.service';
import { TokenBlacklistService } from './token-blacklist.service';
import { PasswordService } from './password.service';
import { JwtUserLookupService } from './jwt-user-lookup.service';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { UserQueryRepository } from '@/user/repositories/user-query.repository';
import { UserCommandRepository } from '@/user/repositories/user-command.repository';
import { VerificationService } from '@/verification/verification.service';
import { AuthPolicyService } from './auth-policy.service';
import { MailService } from '@/mail/services/mail.service';
import {
  JWT_TOKEN_BLACKLIST,
  JWT_USER_LOOKUP,
  type JwtPayload,
} from '../types/jwt.types';

/**
 * 回归测试：密码重置必须使所有历史签发的 access token 失效。
 *
 * 覆盖 review 指出的两个缺口：
 * 1. "先 refresh 再 reset"——refresh rotation 只撤销旧 refresh token，
 *    轮换前的旧 access token 仍在 TTL 内，且其 JTI 不在活跃记录中、不会被拉黑；
 * 2. 存量 jti=null 的 refresh token 记录（本功能上线前创建），
 *    对应 access token 的 JTI 从未持久化，无法通过 JTI 黑名单覆盖。
 *
 * 两者均由用户级 tokenVersion 失效边界兜底：
 * 密码重置原子递增 users.token_version，JWT 校验时比对 payload.ver。
 */

const ACCESS_SECRET = 'test-access-secret-for-token-version-regression';
const USER_ID = 'user-1';
const EMAIL = 'regression@example.com';
const NEW_PASSWORD = 'NewPassw0rd';

interface FakeRefreshTokenRow {
  id: string;
  userId: string;
  tokenHash: string;
  jti: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedBy: string | null;
  deviceInfo: string | null;
  deviceId: string | null;
  userAgent: string | null;
  ip: string | null;
  tokenVersion: number;
}

interface FakeUserRow {
  id: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  countryCode: string | null;
  passwordHash: string | null;
  tokenVersion: number;
  active: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  lastLoginAt: Date | null;
  profile: unknown;
  orgMembers: Array<Record<string, unknown>>;
}

// ---- 内存版 Prisma 的参数类型（仅覆盖本测试涉及的最小操作集合） ----

interface UserFindUniqueArgs {
  where: { id?: string };
}

interface UserFindFirstArgs {
  where: { OR?: Array<Record<string, unknown>> };
}

interface UserUpdateArgs {
  where: { id?: string };
  data: {
    passwordHash?: string;
    tokenVersion?: { increment: number };
  };
}

interface RefreshCreateArgs {
  data: {
    userId: string;
    tokenHash: string;
    jti?: string | null;
    expiresAt: Date;
    deviceInfo?: string | null;
    deviceId?: string | null;
    userAgent?: string | null;
    ip?: string | null;
    tokenVersion?: number;
  };
}

interface RefreshFindUniqueArgs {
  where: { tokenHash?: string; jti?: string };
}

interface RefreshFindManyArgs {
  where: {
    userId: string;
    revokedAt?: null;
    jti?: { not: string | null };
  };
}

interface RefreshUpdateArgs {
  where: { tokenHash?: string; jti?: string };
  data: { revokedAt?: Date; replacedBy?: string };
}

interface RefreshUpdateManyArgs {
  where: {
    userId?: string;
    tokenHash?: string;
    revokedAt?: null;
    jti?: { not: string | null };
  };
  data: { revokedAt?: Date; replacedBy?: string };
}

interface UserWithRelations extends FakeUserRow {
  emailVerifiedAt: Date;
  phoneVerifiedAt: null;
  updatedAt: Date;
}

/**
 * 可控并发门闩：在指定 fake 操作执行前挂起，
 * 让测试精确编排 reset 与 refresh 两条流程的交错顺序（而非依赖真实计时）
 */
interface FakeGates {
  /** consumeToken（按 tokenHash 条件更新）执行前触发 */
  beforeConsume?: () => Promise<void> | void;
  /** refreshToken.create 执行前触发 */
  beforeCreate?: () => Promise<void> | void;
}

/**
 * 内存版 Prisma：模拟 user 与 refreshToken 两张表被本测试触达的读写
 */
function createFakePrisma(user: FakeUserRow) {
  const refreshTokens: FakeRefreshTokenRow[] = [];
  const gates: FakeGates = {};
  let seq = 0;

  const userWithRelations = (): UserWithRelations => ({
    ...user,
    emailVerifiedAt: new Date(),
    phoneVerifiedAt: null,
    updatedAt: new Date(),
  });

  const prisma = {
    user: {
      findUnique: ({ where }: UserFindUniqueArgs) =>
        Promise.resolve(where?.id === user.id ? userWithRelations() : null),

      findFirst: ({ where }: UserFindFirstArgs) => {
        const conditions = where?.OR ?? [];
        const matched = conditions.some((raw) => {
          const c = raw as {
            username?: string;
            email?: string;
            phone?: string;
          };
          return (
            (c.username !== undefined && c.username === user.username) ||
            (c.email !== undefined && c.email === user.email) ||
            (c.phone !== undefined && c.phone === user.phone)
          );
        });
        return Promise.resolve(matched ? userWithRelations() : null);
      },

      update: ({ where, data }: UserUpdateArgs) => {
        if (where?.id !== user.id) {
          return Promise.reject(new Error('user not found'));
        }
        if (data.passwordHash !== undefined) {
          user.passwordHash = data.passwordHash;
        }
        if (data.tokenVersion?.increment !== undefined) {
          user.tokenVersion += data.tokenVersion.increment;
        }
        return Promise.resolve(userWithRelations());
      },
    },
    refreshToken: {
      create: async ({ data }: RefreshCreateArgs) => {
        if (gates.beforeCreate) await gates.beforeCreate();
        const row: FakeRefreshTokenRow = {
          id: `rt-${++seq}`,
          userId: data.userId,
          tokenHash: data.tokenHash,
          jti: data.jti ?? null,
          expiresAt: data.expiresAt,
          revokedAt: null,
          replacedBy: null,
          deviceInfo: data.deviceInfo ?? null,
          deviceId: data.deviceId ?? null,
          userAgent: data.userAgent ?? null,
          ip: data.ip ?? null,
          tokenVersion: data.tokenVersion ?? 0,
        };
        refreshTokens.push(row);
        return { ...row };
      },

      findUnique: ({ where }: RefreshFindUniqueArgs) => {
        let row: FakeRefreshTokenRow | undefined;
        if (where?.tokenHash) {
          row = refreshTokens.find((r) => r.tokenHash === where.tokenHash);
        } else if (where?.jti) {
          row = refreshTokens.find((r) => r.jti === where.jti);
        }
        return Promise.resolve(row ? { ...row } : null);
      },

      findMany: ({ where }: RefreshFindManyArgs) =>
        Promise.resolve(
          refreshTokens
            .filter((r) => r.userId === where.userId)
            .filter((r) =>
              where.revokedAt === null ? r.revokedAt === null : true,
            )
            .filter((r) =>
              where.jti?.not !== undefined ? r.jti !== null : true,
            )
            .map((r) => ({ jti: r.jti })),
        ),

      update: ({ where, data }: RefreshUpdateArgs) => {
        const row = refreshTokens.find(
          (r) => r.tokenHash === where.tokenHash || r.jti === where.jti,
        );
        if (!row) {
          return Promise.reject(new Error('refresh token not found'));
        }
        if (data.revokedAt !== undefined) row.revokedAt = data.revokedAt;
        if (data.replacedBy !== undefined) row.replacedBy = data.replacedBy;
        return Promise.resolve({ ...row });
      },

      updateMany: async ({ where, data }: RefreshUpdateManyArgs) => {
        // consumeToken 的调用特征：按 tokenHash 定位单行；revokeAll 按 userId 定位
        if (where.tokenHash !== undefined && gates.beforeConsume) {
          await gates.beforeConsume();
        }
        let count = 0;
        for (const r of refreshTokens) {
          if (where.userId !== undefined && r.userId !== where.userId) continue;
          if (where.tokenHash !== undefined && r.tokenHash !== where.tokenHash)
            continue;
          if (where.revokedAt === null && r.revokedAt !== null) continue;
          if (where.jti?.not !== undefined && r.jti === where.jti.not) continue;
          r.revokedAt = data.revokedAt ?? new Date();
          r.replacedBy = data.replacedBy ?? r.replacedBy;
          count += 1;
        }
        return { count };
      },
    },
    // 交互式事务：单文件内存 fake 无需真隔离，直接以同一 client 执行回调
    $transaction: (fn: (txClient: unknown) => Promise<unknown>) => fn(prisma),
  };

  return {
    prisma: prisma as unknown as PrismaService,
    user,
    refreshTokens,
    gates,
  };
}

/**
 * 内存版 Redis：记录黑名单 key
 */
function createFakeRedis() {
  const store = new Map<string, number>();
  const client = {
    set: (
      key: string,
      _value: string,
      _mode: string,
      ttlSec: number,
    ): Promise<string> => {
      store.set(key, ttlSec);
      return Promise.resolve('OK');
    },
    exists: (key: string): Promise<number> =>
      Promise.resolve(store.has(key) ? 1 : 0),
  };
  return {
    isReady: () => true,
    getClient: () => client,
    store,
  };
}

describe('密码重置会话失效（tokenVersion 回归测试）', () => {
  let tokenService: TokenService;
  let passwordService: PasswordService;
  let strategy: JwtStrategy;
  let jwtService: JwtService;
  let fakePrisma: ReturnType<typeof createFakePrisma>;
  let fakeRedis: ReturnType<typeof createFakeRedis>;

  const buildModule = async () => {
    const user: FakeUserRow = {
      id: USER_ID,
      username: 'regression_user',
      email: EMAIL,
      phone: null,
      countryCode: null,
      passwordHash: 'old-hash',
      tokenVersion: 0,
      active: true,
      deletedAt: null,
      createdAt: new Date(),
      lastLoginAt: null,
      profile: null,
      orgMembers: [],
    };
    fakePrisma = createFakePrisma(user);
    fakeRedis = createFakeRedis();

    const module: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: ACCESS_SECRET })],
      providers: [
        TokenService,
        PasswordService,
        TokenBlacklistService,
        JwtUserLookupService,
        JwtStrategy,
        RefreshTokenRepository,
        UserQueryRepository,
        UserCommandRepository,
        { provide: PrismaService, useValue: fakePrisma.prisma },
        { provide: RedisService, useValue: fakeRedis },
        {
          provide: jwtConfig.KEY,
          useValue: {
            accessSecret: ACCESS_SECRET,
            accessExpiresIn: '15m',
            refreshExpiresIn: '7d',
          },
        },
        { provide: JWT_USER_LOOKUP, useExisting: JwtUserLookupService },
        { provide: JWT_TOKEN_BLACKLIST, useExisting: TokenBlacklistService },
        {
          provide: VerificationService,
          useValue: {
            verifyCode: jest.fn().mockResolvedValue({ valid: true }),
          },
        },
        {
          provide: AuthPolicyService,
          useValue: { createLoginLog: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: MailService,
          useValue: { sendSimpleEmail: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    tokenService = module.get(TokenService);
    passwordService = module.get(PasswordService);
    strategy = module.get(JwtStrategy);
    jwtService = module.get(JwtService);
  };

  const decode = (token: string): JwtPayload =>
    jwtService.decode<JwtPayload>(token);

  const resetPassword = () =>
    passwordService.resetPassword(
      { target: EMAIL, code: '123456', newPassword: NEW_PASSWORD },
      '127.0.0.1',
    );

  beforeEach(() => buildModule());

  describe('场景一：先 refresh 再 reset', () => {
    it('轮换前的旧 access token：JTI 未被拉黑，但 reset 后因版本不一致被拒绝', async () => {
      // 登录 → A1（ver=0, jti=J1）
      const login = await tokenService.generateTokens(USER_ID, {
        ip: '127.0.0.1',
      });
      const a1 = decode(login.accessToken);

      // refresh 轮换 → A2（ver=0, jti=J2），旧 refresh 记录被撤销
      const rotated = await tokenService.refreshToken(login.refreshToken, {
        ip: '127.0.0.1',
      });
      const a2 = decode(rotated.accessToken);
      expect(a1.jti).not.toBe(a2.jti);

      // 密码重置
      const result = await resetPassword();

      // tokenVersion 被原子递增
      expect(fakePrisma.user.tokenVersion).toBe(1);

      // JTI 黑名单只覆盖了轮换后的 J2；轮换前的 J1 因记录已撤销而漏出——
      // 这正是 review 指出的缺口，必须由版本边界兜底
      expect(fakeRedis.store.has(`jwt:blacklist:access:${a2.jti}`)).toBe(true);
      expect(fakeRedis.store.has(`jwt:blacklist:access:${a1.jti}`)).toBe(false);

      // 旧 access token（A1）：未进黑名单，但 ver=0 ≠ 1 → 拒绝
      await expect(strategy.validate(a1)).rejects.toThrow(
        UnauthorizedException,
      );

      // 轮换后的 access token（A2）：JTI 黑名单命中 → 拒绝
      await expect(strategy.validate(a2)).rejects.toThrow(
        UnauthorizedException,
      );

      // 重置后签发的新 token 携带新版本号，可正常通过校验
      const a3 = decode(result.accessToken);
      expect(a3.ver).toBe(1);
      await expect(strategy.validate(a3)).resolves.toBeDefined();
    });

    it('reset 后所有 refresh token 均被撤销（含轮换产生的新记录）', async () => {
      const login = await tokenService.generateTokens(USER_ID, {
        ip: '127.0.0.1',
      });
      await tokenService.refreshToken(login.refreshToken, {
        ip: '127.0.0.1',
      });

      await resetPassword();

      // reset 自身为当前设备新签发的记录除外（在撤销之后创建）
      const active = fakePrisma.refreshTokens.filter((r) => !r.revokedAt);
      expect(active).toHaveLength(1);
      expect(active[0].userId).toBe(USER_ID);
    });
  });

  describe('场景二：存量 jti=null 会话（本功能上线前的记录）', () => {
    it('JTI 从未持久化、无法拉黑，reset 后仍被版本边界拒绝', async () => {
      // 模拟上线前的行为：签发 access token 但 JTI 未持久化、refresh 记录 jti=null
      const legacyToken = jwtService.sign(
        { sub: USER_ID },
        {
          secret: ACCESS_SECRET,
          expiresIn: '15m',
          jwtid: 'legacy-jti-never-persisted',
        },
      );
      const legacyPayload = decode(legacyToken);
      expect(legacyPayload.ver).toBeUndefined();

      // 部署后、reset 前：缺失 ver 按 0 处理，存量会话不受影响（平滑迁移）
      await expect(strategy.validate(legacyPayload)).resolves.toBeDefined();

      // 密码重置：findActiveJtisByUserId 过滤 jti=null → 无任何 JTI 被拉黑
      await resetPassword();

      expect(fakeRedis.store.size).toBe(0);
      expect(fakePrisma.user.tokenVersion).toBe(1);

      // 存量 token（无 ver → 0 ≠ 1）被拒绝
      await expect(strategy.validate(legacyPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('场景三：竞态穿透防护（review 指出的 refresh/reset 竞态）', () => {
    it('漏网未撤销的旧版本 refresh token：被轮换版本护栏拒绝，无法换发新会话', async () => {
      // 登录 → R1（记录 tokenVersion=0）
      const login = await tokenService.generateTokens(USER_ID, {
        ip: '127.0.0.1',
      });

      // 密码重置：R1 被事务内 revokeAll 撤销，tokenVersion 0→1
      await resetPassword();
      expect(fakePrisma.user.tokenVersion).toBe(1);

      // 模拟极端竞态漏网：旧记录"逃脱"了 revokeAll 的评估范围
      //（等价于并发轮换在 revokeAll 行锁评估之后才落库的新记录）
      const leaked = fakePrisma.refreshTokens.find(
        (r) => r.tokenHash.length > 0 && r.tokenVersion === 0,
      );
      expect(leaked).toBeDefined();
      if (!leaked) throw new Error('leaked record not found');
      leaked.revokedAt = null;

      // 旧会话用漏网的 R1 尝试轮换：
      // 预检通过（revokedAt=null），但记录版本 0 ≠ 当前版本 1 → 版本护栏拒绝
      await expect(
        tokenService.refreshToken(login.refreshToken, { ip: '127.0.0.1' }),
      ).rejects.toThrow(UnauthorizedException);

      // 漏网记录不会被消费，也无法产生任何新 access token
      expect(leaked.revokedAt).toBeNull();
      const recordsAfterAttempt = fakePrisma.refreshTokens.length;
      expect(recordsAfterAttempt).toBe(2); // 登录 R1 + reset 自签记录，无新增
    });

    it('正常路径：版本一致时轮换不受版本护栏影响', async () => {
      // reset 后本设备拿到新会话（tokenVersion=1）
      const result = await resetPassword();
      if (!result.refreshToken) throw new Error('refreshToken missing');

      // 立即轮换：记录版本 1 === 用户版本 1 → 正常换发
      const rotated = await tokenService.refreshToken(result.refreshToken, {
        ip: '127.0.0.1',
      });
      const rotatedPayload = decode(rotated.accessToken);
      expect(rotatedPayload.ver).toBe(1);

      // 新 access token 通过策略校验
      await expect(strategy.validate(rotatedPayload)).resolves.toBeDefined();
    });
  });

  describe('场景四：可控并发（reset 执行期间的并发 refresh）', () => {
    /** 统计"可用活跃会话"：未撤销且版本与当前用户版本一致（即真正可兑换 access 的记录） */
    const countUsableSessions = () =>
      fakePrisma.refreshTokens.filter(
        (r) =>
          r.revokedAt === null &&
          r.tokenVersion === fakePrisma.user.tokenVersion,
      ).length;

    it('交错A：refresh 预检通过后、消费前 reset 提交 → 消费失败，无任何新会话落库', async () => {
      const login = await tokenService.generateTokens(USER_ID, {
        ip: '127.0.0.1',
      });

      // 门闩：让 refresh 恰好停在 consumeToken 执行前（此时预检/护栏均已通过）
      let releaseConsume!: () => void;
      const consumeGate = new Promise<void>(
        (resolve) => (releaseConsume = resolve),
      );
      let reachedConsume!: () => void;
      const reached = new Promise<void>(
        (resolve) => (reachedConsume = resolve),
      );
      fakePrisma.gates.beforeConsume = () => {
        reachedConsume();
        return consumeGate;
      };

      // 启动并发 refresh，等待其抵达消费点
      const refreshPromise = tokenService.refreshToken(login.refreshToken, {
        ip: '127.0.0.1',
      });
      await reached;

      // reset 完整提交：版本 0→1 + revokeAll（真实库中对应事务持行锁后提交）
      await resetPassword();
      expect(fakePrisma.user.tokenVersion).toBe(1);

      // 放行 refresh：consumeToken 的条件（revokedAt IS NULL）已被 reset 破坏
      releaseConsume();
      await expect(refreshPromise).rejects.toThrow(UnauthorizedException);

      // 断言：refresh 未产生任何新记录（登录 R1 已撤销 + reset 自签，共 2 条）
      expect(fakePrisma.refreshTokens).toHaveLength(2);
      // 唯一可用活跃会话 = reset 为本设备签发的那条
      expect(countUsableSessions()).toBe(1);
    });

    it('交错B：refresh 消费成功后、落库前 reset 提交 → 幽灵会话被护栏+ver 双重拒绝', async () => {
      const login = await tokenService.generateTokens(USER_ID, {
        ip: '127.0.0.1',
      });

      // 一次性门闩：仅拦截 refresh 的首次 create（reset 自签记录不触发）
      let releaseCreate!: () => void;
      const createGate = new Promise<void>(
        (resolve) => (releaseCreate = resolve),
      );
      let reachedCreate!: () => void;
      const reached = new Promise<void>((resolve) => (reachedCreate = resolve));
      let armed = true;
      fakePrisma.gates.beforeCreate = () => {
        if (!armed) return Promise.resolve();
        armed = false;
        reachedCreate();
        return createGate;
      };

      // 启动并发 refresh：预检→护栏（版本 0===0 通过）→消费成功（旧行标记 revoked）→ 落库前挂起
      // （等价于真实库中"新记录 INSERT 尚未提交、reset 的 updateMany 不可见"的交错）
      const refreshPromise = tokenService.refreshToken(login.refreshToken, {
        ip: '127.0.0.1',
      });
      await reached;

      // reset 提交：版本 0→1；revokeAll 撤销不到尚未落库的新记录 → 幽灵记录漏网
      await resetPassword();
      expect(fakePrisma.user.tokenVersion).toBe(1);

      // 放行 refresh：幽灵记录（tokenVersion=0）落库，refresh 调用本身"成功"返回
      releaseCreate();
      const ghost = await refreshPromise;

      // 但幽灵会话完全不可用——
      // ① 其 access token（ver=0 ≠ 1）被策略拒绝
      const ghostPayload = decode(ghost.accessToken);
      expect(ghostPayload.ver).toBe(0);
      await expect(strategy.validate(ghostPayload)).rejects.toThrow(
        UnauthorizedException,
      );

      // ② 幽灵 refresh token 被轮换版本护栏拒绝，永远无法续命
      await expect(
        tokenService.refreshToken(ghost.refreshToken, { ip: '127.0.0.1' }),
      ).rejects.toThrow(UnauthorizedException);

      // 唯一可用活跃会话仍是 reset 本设备会话
      expect(countUsableSessions()).toBe(1);
    });
  });
});

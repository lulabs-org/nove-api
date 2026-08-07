# 第三方会议集成插件化架构规划

## 1. 背景与痛点

目前系统内的腾讯会议集成（位于 `src/integrations/tencent-meeting`）深度依赖了 Nest.js 框架（如 `@Injectable`, `@Inject`, `Logger` 等），这在当前阶段能够快速跑通业务，但在系统未来长期的发展中会面临以下挑战：
1. **耦合度高，难以复用**：代码无法轻易移植到非 Nest.js 的 Node.js 项目或独立脚本中。
2. **多平台接入成本高**：如果未来需要接入 Zoom、飞书会议、钉钉会议等，如果依然在核心业务逻辑里写 `if/else`，会导致代码急剧膨胀，维护极其困难。
3. **扩展封闭**：目前仅支持团队内部硬编码集成，无法优雅地让第三方开发者或外部团队贡献新的会议平台集成能力。

## 2. 远期规划目标

将现有的具体会议平台实现**SDK 化**，并在核心业务侧建立一套**插件化（Plugin Architecture）**的标准接入机制。

核心目标：
- 业务侧（如会议纪要拉取、定时同步任务）对具体的会议提供商（Provider）**完全无感知**，只面向抽象接口编程。
- 支持新会议平台的**即插即用**，最理想状态下，甚至支持在不重启系统的情况下进行**热插拔（Hot-plugging）**。

---

## 3. 核心架构设计思路

### 3.1 制定标准契约 (Contract / Interface)
我们需要在 `libs/meeting-core` 等基础库中定义一套所有“会议插件”都必须遵守的 TypeScript 接口。用于抹平不同会议平台之间 API 和数据结构的差异。

```typescript
// 统一的会议数据结构
export interface NormalizedMeeting {
  id: string;
  topic: string;
  startTime: Date;
  endTime: Date;
  provider: 'TENCENT' | 'ZOOM' | 'FEISHU';
  // ... 其他公共字段
}

// 所有插件必须实现的接口规范
export interface IMeetingProvider {
  /** 插件唯一标识 */
  readonly providerName: string; 

  /** 获取会议详情 */
  getMeetingDetail(meetingId: string): Promise<NormalizedMeeting>;
  
  /** 获取参会人员 */
  getParticipants(meetingId: string): Promise<any[]>;
  
  /** 获取会议转写/纪要 */
  getTranscript(recordFileId: string): Promise<any>;
}
```

### 3.2 纯 SDK 化的独立插件
剥离对 Nest.js 的依赖，让每个插件（如 `TencentMeetingPlugin`）成为纯粹的 TypeScript 类，它们负责调用原生 API，并将原生数据映射（Map）为上述的 `NormalizedMeeting` 标准格式。

### 3.3 插件管理器 (Plugin Manager / Factory)
在 Nest.js 核心代码中构建一个统一的管理者来注册和路由这些插件：

```typescript
@Injectable()
export class MeetingProviderFactory {
  private providers = new Map<string, IMeetingProvider>();

  registerProvider(provider: IMeetingProvider) {
    this.providers.set(provider.providerName, provider);
  }

  getProvider(providerName: string): IMeetingProvider {
    const provider = this.providers.get(providerName);
    if (!provider) throw new Error(`不支持的会议类型: ${providerName}`);
    return provider;
  }
}
```

---

## 4. 进阶能力规划：运行时热插拔 (Dynamic Hot-plugging)

为了允许第三方开发者随时向运行中的系统添加新插件，同时避免系统重启影响线上服务，计划未来引入**Node.js 动态运行时加载机制**。

### 4.1 实现原理
得益于我们将插件实现了**纯 SDK 化（剥离了 Nest 容器依赖）**，插件实例可以随时被 `new` 出来并推入 `MeetingProviderFactory` 的字典中，无需修改 Nest.js 底层的 IoC 容器。

通过开放管理后台上传接口或监听指定的 `/data/plugins/` 目录：
1. **加载**：收到新的 JS 插件文件，使用 Node.js 原生的 `import(pluginFilePath)` 动态将其载入进程内存。
2. **实例化**：提取暴露的类，传递数据库中读取的平台配置（如 AppKey）并实例化。
3. **注册**：调用 `factory.registerProvider(instance)` 完成注入。
4. **生效**：系统的下一次业务调用即可无缝路由至该新插件，全程服务 0 中断。

### 4.2 潜在风险防范
在落地该高级特性时，需重点解决以下问题：
1. **沙箱隔离 (Sandbox & Security)**：防止不可信的第三方代码读取系统环境变量或进行恶意的文件/数据库读写。必要时应考虑使用 WebAssembly 或独立的 V8 Isolate 进行隔离，或改用 HTTP 微服务调用的模式。
2. **内存溢出**：控制频繁的热重载导致的模块堆叠和内存泄漏。

## 5. 总结

本规划旨在为系统提供高度的扩展性和灵活性。第一阶段，我们会先将现有 `tencent-meeting` 解耦为纯 SDK 并沉淀出 `libs/meeting-core` 规范接口；第二阶段，基于此规范适配更多已知会议平台；最终阶段，探索并开放第三方开发者的热插拔式接入能力。

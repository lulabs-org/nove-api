# 飞书多维表格集成指南

本文档说明如何将腾讯会议事件与飞书多维表格集成，实现会议数据自动记录。

## 项目结构

```text
src/integrations/lark/                  # 飞书集成库
├── lark.client.ts                  # 飞书SDK客户端
├── lark.module.ts                  # 模块配置
├── index.ts                        # 导出文件
├── config/                         # 配置文件
│   ├── lark.config.ts              # 飞书配置
│   └── index.ts
├── exceptions/                     # 异常处理
│   └── lark.exceptions.ts          # 飞书相关异常
├── services/                       # 服务层
│   └── bitable.service.ts          # 多维表格核心服务
├── repositories/                   # 数据访问层
│   ├── index.ts                    # 导出文件
│   ├── meeting-bitable.repository.ts # 会议记录仓库
│   ├── meeting-user-bitable.repository.ts # 会议用户仓库
│   └── recording-file-bitable.repository.ts # 录制文件仓库
├── types/                          # 类型定义
│   ├── index.ts
│   ├── lark.types.ts               # 飞书相关类型
│   ├── meeting.types.ts            # 会议类型
│   ├── meeting-user.types.ts       # 会议用户类型
│   └── recording-file.types.ts     # 录制文件类型
└── validators/                     # 验证器
    └── field.validator.ts          # 字段验证器
```

## 测试配置

```text
test/integration/
└── bitable.service.int-spec.ts     # Bitable 服务集成测试
```

## 功能概述

当腾讯会议开始时，系统会自动在飞书多维表格中创建一条会议记录，包含以下信息：

- 会议编号（腾讯会议ID）
- 会议标题
- 开始时间
- 持续时间
- 参会人员
- 会议状态

## 配置步骤

### 1. 飞书开发者配置

1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 创建企业自建应用
3. 获取以下配置：
   - `LARK_APP_ID`: 应用ID
   - `LARK_APP_SECRET`: 应用密钥

### 2. 多维表格配置

1. 在飞书中创建多维表格
2. 创建会议记录表，需要包含以下字段：
   - `会议编号`（文本）
   - `会议标题`（文本）
   - `开始时间`（日期）
   - `持续时间`（数字）
   - `参会人员`（多选文本）
   - `会议状态`（单选）
   - `录制链接`（超链接，可选）

3. 获取表格信息：
   - `LARK_BITABLE_APP_TOKEN`: 多维表格的App Token
   - `LARK_TABLE_MEETING`: 会议记录表的Table ID

### 3. 应用权限配置

在飞书开放平台中，为应用添加以下权限：

- `bitable:app` - 多维表格权限
- `bitable:app:readonly` - 多维表格只读权限

### 4. 环境变量配置

在 `.env` 文件中添加以下配置：

```bash
# 飞书集成配置
LARK_APP_ID=your_lark_app_id
LARK_APP_SECRET=your_lark_app_secret
LARK_BITABLE_APP_TOKEN=your_bitable_app_token
LARK_TABLE_MEETING=your_meeting_table_id
```

## 使用说明

### 测试功能

1. 启动应用：

```bash
pnpm run start:dev
```

2. 触发腾讯会议开始事件
3. 检查飞书多维表格中是否自动创建了会议记录

### 故障排查

#### 常见问题

1. **权限错误**
   - 确认应用已获取多维表格权限
   - 检查应用是否已发布上线

2. **字段不匹配**
   - 确认多维表格字段名称与代码中一致
   - 检查字段类型是否正确

3. **配置错误**
   - 验证App Token和Table ID是否正确
   - 检查环境变量是否已正确加载

#### 日志查看

查看应用日志，搜索关键词：

- `飞书多维表格` - 相关操作日志
- `LARK` - 飞书集成相关日志
- `会议记录` - 会议记录创建相关日志

## 扩展功能

### 添加录制完成记录

如需在录制完成时也创建记录，可以扩展 `handleRecordingCompleted` 方法，添加类似的逻辑。

### 自定义字段

可以根据需要修改 `createMeetingRecord` 调用中的字段映射，添加更多会议信息。

## 技术支持

如有问题，请检查：

1. 飞书开放平台文档：<https://open.feishu.cn/>
2. 多维表格API文档：<https://open.feishu.cn/document/server-docs/docs/bitable-v1/bitable-overview>
3. 应用运行日志

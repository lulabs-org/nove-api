# 录制文件记录表使用说明

## 概述

录制文件记录表用于存储会议录制文件的相关信息，包括录制文件ID、参与者、时间信息、会议摘要以及AI生成的会议记录。

## 表结构

### 字段说明

| 字段名 | 类型 | 描述 | 是否必填 |
|--------|------|------|----------|
| record_file_id | 字符串 | 录制文件的唯一标识符 | 是 |
| participants | 数组/多选 | 会议参与者列表 | 否 |
| start_time | 数字 | 录制开始时间（Unix时间戳） | 否 |
| end_time | 数字 | 录制结束时间（Unix时间戳） | 否 |
| meeting_summary | 文本 | 会议摘要信息 | 否 |
| ai_meeting_transcripts | 文本 | AI生成的会议转录内容 | 否 |
| ai_minutes | 文本 | AI生成的会议纪要 | 否 |

### 字段详细说明

1. **record_file_id** (文本)
   - 唯一标识符，通常使用腾讯会议或其他平台提供的录制文件ID
   - 用于upsert操作的匹配字段

2. **participants** (多选)
   - 存储会议参与者信息
   - 支持多个参与者

3. **start_time** (数字)
   - 录制开始时间，使用Unix时间戳（毫秒）
   - 可用于时间范围查询

4. **end_time** (数字)
   - 录制结束时间，使用Unix时间戳（毫秒）
   - 与start_time配合可计算会议时长

5. **meeting_summary** (长文本)
   - 会议主题和简要描述
   - 支持文本搜索

6. **ai_meeting_transcripts** (长文本)
   - 完整的AI转录内容
   - 可能包含时间戳和说话人信息

7. **ai_minutes** (长文本)
   - 结构化的会议纪要
   - 通常包含要点、行动项等

## 使用方法

### 1. 环境变量配置

在 `.env` 文件中添加以下配置：

```bash
LARK_TABLE_MEETING_RECORD_FILE=your_recording_file_table_id
```

### 2. 在代码中使用

```typescript
import { RecordingFileBitableRepository } from '@libs/integrations-lark/repositories';

// 注入服务
constructor(private readonly recordingFileRepo: RecordingFileBitableRepository) {}

// 创建录制文件记录
async createRecordingFile() {
  const recordingData = {
    record_file_id: 'rec_123456789',
    participants: ['user1@example.com', 'user2@example.com'],
    start_time: Date.now(),
    end_time: Date.now() + 3600000, // 1小时后
    meeting_summary: '项目进度讨论会议',
    ai_meeting_transcripts: '完整的会议转录内容...',
    ai_minutes: '会议纪要：1. 确定了下一阶段目标...'
  };

  const result = await this.recordingFileRepo.createRecordingFileRecord(recordingData);
  return result;
}

// 更新或创建录制文件记录
async upsertRecordingFile() {
  const recordingData = {
    record_file_id: 'rec_123456789',
    meeting_summary: '更新后的会议摘要'
  };

  const result = await this.recordingFileRepo.upsertRecordingFileRecord(recordingData);
  return result;
}

// 根据录制文件ID搜索
async searchByRecordFileId(recordFileId: string) {
  const result = await this.recordingFileRepo.searchRecordingFileById(recordFileId);
  return result;
}

// 根据时间范围搜索
async searchByTimeRange(startTime: number, endTime: number) {
  const result = await this.recordingFileRepo.searchRecordingFileByTimeRange(startTime, endTime);
  return result;
}

// 根据会议摘要内容搜索
async searchBySummary(keyword: string) {
  const result = await this.recordingFileRepo.searchRecordingFileBySummary(keyword);
  return result;
}
```

### 3. 字段类型说明

- **record_file_id**: 字符串类型，建议使用腾讯会议或其他平台提供的录制文件ID
- **participants**: 数组类型，可以存储多个参与者信息
- **start_time/end_time**: Unix时间戳（毫秒），可以使用 `Date.now()` 获取
- **meeting_summary**: 长文本类型，适合存储会议主题和简要描述
- **ai_meeting_transcripts**: 长文本类型，存储完整的AI转录内容
- **ai_minutes**: 长文本类型，存储结构化的会议纪要

## 飞书多维表格配置

1. 在飞书多维表格中创建新表
2. 添加以下字段并设置对应类型：
   - record_file_id：文本
   - participants：多选或文本
   - start_time：数字
   - end_time：数字
   - meeting_summary：长文本
   - ai_meeting_transcripts：长文本
   - ai_minutes：长文本
3. 获取表格ID并配置到环境变量中

## 示例数据

```json
{
  "record_file_id": "rec_20241201_project_review",
  "participants": ["张三", "李四", "王五"],
  "start_time": 1701436800000,
  "end_time": 1701440400000,
  "meeting_summary": "12月项目进度评审会议",
  "ai_meeting_transcripts": "[09:00] 张三：今天我们主要讨论...",
  "ai_minutes": "1. 项目进度：前端开发完成80%，后端完成90%\n2. 问题讨论：接口文档需要更新\n3. 下一步计划：本周完成测试用例"
}
```
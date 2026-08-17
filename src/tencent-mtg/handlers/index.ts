/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-20 22:01:42
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-12-23 02:40:57
 * @FilePath: /lulab_backend/src/hook-tencent-mtg/handlers/index.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

// 基础事件处理器
export { BaseEventHandler } from './base/base-event.handler';

// 事件处理器工厂
export { EventHandlerFactory } from './factories/event-handler.factory';

// 具体事件处理器
export { MeetingStartedHandler } from './events/meeting-started.handler';
export { MeetingEndedHandler } from './events/meeting-ended.handler';
export { MeetingParticipantJoinedHandler } from './events/meeting-participant-joined.handler';
export { RecordingCompletedHandler } from './events/recording-completed.handler';
export { SmartFullsummaryHandler } from './events/smart-fullsummary.handler';
export { SmartTranscriptsHandler } from './events/smart-transcripts.handler';
export { SmartMinutesHandler } from './events/smart-minutes.handler';

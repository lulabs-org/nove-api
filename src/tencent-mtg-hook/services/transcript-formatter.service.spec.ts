/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-24 00:00:00
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-03 22:33:13
 * @FilePath: /lulab_backend/src/hook-tencent-mtg/services/transcript-formatter.service.spec.ts
 * @Description: 转写格式化服务测试
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { TranscriptFormatterService } from './transcript-formatter.service';

describe('TranscriptFormatterService', () => {
  let service: TranscriptFormatterService;

  beforeEach(() => {
    service = new TranscriptFormatterService();
  });

  describe('formatTranscript', () => {
    it('should return empty string when transcript is null or undefined', () => {
      expect(service.formatTranscript(undefined)).toEqual({
        formattedText: '',
        speakerInfos: [],
      });
    });

    it('should return empty string when transcript has no minutes or paragraphs', () => {
      expect(service.formatTranscript([])).toEqual({
        formattedText: '',
        speakerInfos: [],
      });
    });

    it('should format transcript with single paragraph and single sentence', () => {
      const transcript = [
        {
          pid: 'p1',
          start_time: 3600000,
          end_time: 3610000,
          speaker_info: {
            userid: 'user1',
            openId: 'open1',
            username: '张三',
            ms_open_id: 'ms1',
            tm_xid: 'tm1',
          },
          sentences: [
            {
              sid: 's1',
              start_time: 3600000,
              end_time: 3605000,
              words: [
                {
                  wid: 'w1',
                  start_time: 3600000,
                  end_time: 3600500,
                  text: '大家',
                },
                {
                  wid: 'w2',
                  start_time: 3600500,
                  end_time: 3601000,
                  text: '好',
                },
                {
                  wid: 'w3',
                  start_time: 3601000,
                  end_time: 3601500,
                  text: '，',
                },
                {
                  wid: 'w4',
                  start_time: 3601500,
                  end_time: 3602000,
                  text: '今天',
                },
                {
                  wid: 'w5',
                  start_time: 3602000,
                  end_time: 3602500,
                  text: '我们',
                },
                {
                  wid: 'w6',
                  start_time: 3602500,
                  end_time: 3603000,
                  text: '讨论',
                },
                {
                  wid: 'w7',
                  start_time: 3603000,
                  end_time: 3603500,
                  text: '项目',
                },
                {
                  wid: 'w8',
                  start_time: 3603500,
                  end_time: 3604000,
                  text: '进展',
                },
              ],
            },
          ],
        },
      ];

      const result = service.formatTranscript(transcript);
      expect(result.formattedText).toBe(
        '张三(01:00:00)：大家好，今天我们讨论项目进展',
      );
      expect(result.speakerInfos).toHaveLength(1);
      expect(result.speakerInfos[0].username).toBe('张三');
    });

    it('should format transcript with single paragraph and multiple sentences', () => {
      const transcript = [
        {
          pid: 'p1',
          start_time: 3665000,
          end_time: 3675000,
          speaker_info: {
            userid: 'user2',
            openId: 'open2',
            username: '李四',
            ms_open_id: 'ms2',
            tm_xid: 'tm2',
          },
          sentences: [
            {
              sid: 's1',
              start_time: 3665000,
              end_time: 3670000,
              words: [
                {
                  wid: 'w1',
                  start_time: 3665000,
                  end_time: 3665500,
                  text: '首先',
                },
                {
                  wid: 'w2',
                  start_time: 3665500,
                  end_time: 3666000,
                  text: '，',
                },
                {
                  wid: 'w3',
                  start_time: 3666000,
                  end_time: 3666500,
                  text: '我',
                },
                {
                  wid: 'w4',
                  start_time: 3666500,
                  end_time: 3667000,
                  text: '来',
                },
                {
                  wid: 'w5',
                  start_time: 3667000,
                  end_time: 3667500,
                  text: '介绍',
                },
              ],
            },
            {
              sid: 's2',
              start_time: 3670000,
              end_time: 3675000,
              words: [
                {
                  wid: 'w6',
                  start_time: 3670000,
                  end_time: 3670500,
                  text: '一下',
                },
                {
                  wid: 'w7',
                  start_time: 3670500,
                  end_time: 3671000,
                  text: '这个',
                },
                {
                  wid: 'w8',
                  start_time: 3671000,
                  end_time: 3671500,
                  text: '功能',
                },
                {
                  wid: 'w9',
                  start_time: 3671500,
                  end_time: 3672000,
                  text: '。',
                },
              ],
            },
          ],
        },
      ];

      const result = service.formatTranscript(transcript);
      expect(result.formattedText).toBe(
        '李四(01:01:05)：首先，我来介绍一下这个功能。',
      );
      expect(result.speakerInfos).toHaveLength(1);
      expect(result.speakerInfos[0].username).toBe('李四');
    });

    it('should format transcript with multiple paragraphs', () => {
      const transcript = [
        {
          pid: 'p1',
          start_time: 1800000,
          end_time: 1805000,
          speaker_info: {
            userid: 'user3',
            openId: 'open3',
            username: '王五',
            ms_open_id: 'ms3',
            tm_xid: 'tm3',
          },
          sentences: [
            {
              sid: 's1',
              start_time: 1800000,
              end_time: 1805000,
              words: [
                {
                  wid: 'w1',
                  start_time: 1800000,
                  end_time: 1801000,
                  text: '项目',
                },
                {
                  wid: 'w2',
                  start_time: 1801000,
                  end_time: 1802000,
                  text: '目前',
                },
                {
                  wid: 'w3',
                  start_time: 1802000,
                  end_time: 1803000,
                  text: '进展',
                },
                {
                  wid: 'w4',
                  start_time: 1803000,
                  end_time: 1804000,
                  text: '顺利',
                },
              ],
            },
          ],
        },
        {
          pid: 'p2',
          start_time: 1860000,
          end_time: 1865000,
          speaker_info: {
            userid: 'user4',
            openId: 'open4',
            username: '赵六',
            ms_open_id: 'ms4',
            tm_xid: 'tm4',
          },
          sentences: [
            {
              sid: 's2',
              start_time: 1860000,
              end_time: 1865000,
              words: [
                {
                  wid: 'w5',
                  start_time: 1860000,
                  end_time: 1861000,
                  text: '下一',
                },
                {
                  wid: 'w6',
                  start_time: 1861000,
                  end_time: 1862000,
                  text: '阶段',
                },
                {
                  wid: 'w7',
                  start_time: 1862000,
                  end_time: 1863000,
                  text: '计划',
                },
                {
                  wid: 'w8',
                  start_time: 1863000,
                  end_time: 1864000,
                  text: '是',
                },
              ],
            },
          ],
        },
      ];

      const result = service.formatTranscript(transcript);
      expect(result.formattedText).toBe(
        '王五(00:30:00)：项目目前进展顺利\n\n赵六(00:31:00)：下一阶段计划是',
      );
      expect(result.speakerInfos).toHaveLength(2);
    });

    it('should handle missing speaker_info', () => {
      const transcript = [
        {
          pid: 'p1',
          start_time: 60000,
          end_time: 65000,
          speaker_info: {
            userid: '',
            openId: '',
            username: '',
            ms_open_id: '',
            tm_xid: '',
          },
          sentences: [
            {
              sid: 's1',
              start_time: 60000,
              end_time: 65000,
              words: [
                {
                  wid: 'w1',
                  start_time: 60000,
                  end_time: 61000,
                  text: '没有',
                },
                {
                  wid: 'w2',
                  start_time: 61000,
                  end_time: 62000,
                  text: '发言人',
                },
                {
                  wid: 'w3',
                  start_time: 62000,
                  end_time: 63000,
                  text: '信息',
                },
              ],
            },
          ],
        },
      ];

      const result = service.formatTranscript(transcript);
      expect(result.formattedText).toBe('未知发言人(00:01:00)：没有发言人信息');
    });

    it('should handle missing username in speaker_info', () => {
      const transcript = [
        {
          pid: 'p1',
          start_time: 120000,
          end_time: 125000,
          speaker_info: {
            userid: 'user5',
            openId: 'open5',
            username: '',
            ms_open_id: 'ms5',
            tm_xid: 'tm5',
          },
          sentences: [
            {
              sid: 's1',
              start_time: 120000,
              end_time: 125000,
              words: [
                {
                  wid: 'w1',
                  start_time: 120000,
                  end_time: 121000,
                  text: '用户名',
                },
                {
                  wid: 'w2',
                  start_time: 121000,
                  end_time: 122000,
                  text: '为空',
                },
              ],
            },
          ],
        },
      ];

      const result = service.formatTranscript(transcript);
      expect(result.formattedText).toBe('未知发言人(00:02:00)：用户名为空');
    });

    it('should handle empty sentences array', () => {
      const transcript = [
        {
          pid: 'p1',
          start_time: 0,
          end_time: 0,
          speaker_info: {
            userid: 'user6',
            openId: 'open6',
            username: '测试用户',
            ms_open_id: 'ms6',
            tm_xid: 'tm6',
          },
          sentences: [],
        },
      ];

      const result = service.formatTranscript(transcript);
      expect(result.formattedText).toBe('');
    });

    it('should handle empty words array in sentence', () => {
      const transcript = [
        {
          pid: 'p1',
          start_time: 30000,
          end_time: 35000,
          speaker_info: {
            userid: 'user7',
            openId: 'open7',
            username: '测试用户',
            ms_open_id: 'ms7',
            tm_xid: 'tm7',
          },
          sentences: [
            {
              sid: 's1',
              start_time: 30000,
              end_time: 35000,
              words: [],
            },
          ],
        },
      ];

      const result = service.formatTranscript(transcript);
      expect(result.formattedText).toBe('测试用户(00:00:30)：');
    });
  });
});

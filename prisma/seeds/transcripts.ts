import { PrismaClient } from '@prisma/client';

// 模拟对话数据，格式完全仿照 transcripts_demo.json
const TRANSCRIPT_DIALOGUE = [
  {
    pid: '0',
    start_time: 5301,
    end_time: 6281,
    sentences: [
      {
        sid: '0',
        start_time: 5301,
        end_time: 6281,
        words: [
          {
            wid: '0',
            start_time: 5301,
            end_time: 6281,
            text: '大家好，能听到我说话吗？',
          },
        ],
      },
    ],
    speaker_info: {
      userid: 'user_001',
      openId: '',
      username: '用户001',
      ms_open_id: '',
    },
  },
  {
    pid: '1',
    start_time: 8470,
    end_time: 9820,
    sentences: [
      {
        sid: '1',
        start_time: 8470,
        end_time: 9820,
        words: [
          {
            wid: '1',
            start_time: 8470,
            end_time: 9820,
            text: '嗯，老师也来了。',
          },
        ],
      },
    ],
    speaker_info: {
      userid: 'user_002',
      openId: '',
      username: '用户002',
      ms_open_id: '',
    },
  },
  {
    pid: '2',
    start_time: 9206,
    end_time: 11336,
    sentences: [
      {
        sid: '2',
        start_time: 9206,
        end_time: 11336,
        words: [
          {
            wid: '2',
            start_time: 9206,
            end_time: 11336,
            text: 'Ok 我们待会儿那个八点钟开始啊！',
          },
        ],
      },
    ],
    speaker_info: {
      userid: 'user_001',
      openId: '',
      username: '用户001',
      ms_open_id: '',
    },
  },
  {
    pid: '3',
    start_time: 12000,
    end_time: 13470,
    sentences: [
      {
        sid: '3',
        start_time: 12000,
        end_time: 13470,
        words: [
          {
            wid: '3',
            start_time: 12000,
            end_time: 13470,
            text: '声音，声音可以吗？声音？',
          },
        ],
      },
    ],
    speaker_info: {
      userid: 'user_001',
      openId: '',
      username: '用户001',
      ms_open_id: '',
    },
  },
  {
    pid: '4',
    start_time: 14000,
    end_time: 15890,
    sentences: [
      {
        sid: '4',
        start_time: 14000,
        end_time: 15890,
        words: [
          {
            wid: '4',
            start_time: 14000,
            end_time: 15890,
            text: 'Ok 可以，能听到的哈！',
          },
        ],
      },
    ],
    speaker_info: {
      userid: 'user_002',
      openId: '',
      username: '用户002',
      ms_open_id: '',
    },
  },
  {
    pid: '5',
    start_time: 18000,
    end_time: 23000,
    sentences: [
      {
        sid: '5',
        start_time: 18000,
        end_time: 23000,
        words: [
          {
            wid: '5',
            start_time: 18000,
            end_time: 23000,
            text: '大家好，欢迎来到今天的周例会。首先我们来同步一下各项目的进展情况。',
          },
        ],
      },
    ],
    speaker_info: {
      userid: 'user_001',
      openId: '',
      username: '用户001',
      ms_open_id: '',
    },
  },
  {
    pid: '6',
    start_time: 24000,
    end_time: 28000,
    sentences: [
      {
        sid: '6',
        start_time: 24000,
        end_time: 28000,
        words: [
          {
            wid: '6',
            start_time: 24000,
            end_time: 28000,
            text: '项目A目前进展顺利，预计可以在下周完成开发工作。',
          },
        ],
      },
    ],
    speaker_info: {
      userid: 'user_002',
      openId: '',
      username: '用户002',
      ms_open_id: '',
    },
  },
];

/**
 * 创建模拟转录记录 (Transcript -> Paragraph -> Sentence -> Word)
 */
export async function createSimulatedTranscript(
  prisma: PrismaClient,
  meetingRecordingId: string,
  speakerId: string,
) {
  // 模拟对话数据 (参考真实 JSON 结构)
  const dialogue = TRANSCRIPT_DIALOGUE;

  // 1. Create Transcript
  const transcript = await prisma.transcript.create({
    data: {
      recordingId: meetingRecordingId,
      language: 'zh-CN',
      status: 1, // completed
    },
  });

  // 2. Process Dialogue
  for (const paragraph of dialogue) {
    // Create Paragraph
    const paragraphRecord = await prisma.paragraph.create({
      data: {
        transcriptId: transcript.id,
        pid: parseInt(paragraph.pid, 10),
        startTimeMs: BigInt(paragraph.start_time),
        endTimeMs: BigInt(paragraph.end_time),
        speakerId: speakerId,
      },
    });

    // 3. Process Sentences
    for (const sentence of paragraph.sentences) {
      // Create Sentence
      const sentenceRecord = await prisma.sentence.create({
        data: {
          paragraphId: paragraphRecord.id,
          sid: parseInt(sentence.sid, 10),
          startTimeMs: BigInt(sentence.start_time),
          endTimeMs: BigInt(sentence.end_time),
          text: sentence.words.map((w) => w.text).join(''),
        },
      });

      // 4. Process Words
      const wordsData = sentence.words.map((word) => ({
        sentenceId: sentenceRecord.id,
        wid: parseInt(word.wid, 10),
        startTimeMs: BigInt(word.start_time),
        endTimeMs: BigInt(word.end_time),
        text: word.text,
      }));

      await prisma.word.createMany({
        data: wordsData,
      });
    }
  }

  return transcript;
}

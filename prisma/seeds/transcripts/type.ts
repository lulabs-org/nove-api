export interface TranscriptDialogueConfig {
  pid: string;
  start_time: number;
  end_time: number;
  sentences: readonly SentenceConfig[];
  speaker_info: SpeakerInfoConfig;
}

export interface SentenceConfig {
  sid: string;
  start_time: number;
  end_time: number;
  words: readonly WordConfig[];
}

export interface WordConfig {
  wid: string;
  start_time: number;
  end_time: number;
  text: string;
}

export interface SpeakerInfoConfig {
  userid: string;
  openId: string;
  username: string;
  ms_open_id: string;
}

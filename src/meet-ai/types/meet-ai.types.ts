export interface MeetAiAnalysisResult {
  meetingId: string;
  status: string;
  message: string;
}

export interface MeetAiSummary {
  meetingId: string;
  summary: string;
  keyPoints: string[];
  actionItems: string[];
}

export type SummarySegment = {
  startTimeMs: bigint;
  speakerName: string | null;
  text: string;
  speaker: { id: string; displayName: string | null } | null;
};

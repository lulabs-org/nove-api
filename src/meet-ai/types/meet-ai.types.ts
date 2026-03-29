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

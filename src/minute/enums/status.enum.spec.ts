import {
  deriveProcessingStatus,
  deriveRecordingStatus,
  ProcessingStatus,
  RecordingStatus,
} from './status.enum';

describe('derived minute statuses', () => {
  it('treats a meeting without minutes as pending', () => {
    expect(deriveRecordingStatus([])).toBe(RecordingStatus.PENDING);
    expect(deriveProcessingStatus([])).toBe(ProcessingStatus.PENDING);
  });

  it('derives resource progress without persisted status columns', () => {
    expect(deriveRecordingStatus([{ files: [{}] }])).toBe(
      RecordingStatus.COMPLETED,
    );
    expect(deriveProcessingStatus([{ transcripts: [{}] }])).toBe(
      ProcessingStatus.PROCESSING,
    );
    expect(deriveProcessingStatus([{ summary: { id: 'summary-1' } }])).toBe(
      ProcessingStatus.COMPLETED,
    );
  });

  it('gives errors precedence over generated resources', () => {
    const minutes = [
      { files: [{}], summary: { id: 'summary-1' } },
      { errorMessage: 'recording failed' },
    ];

    expect(deriveRecordingStatus(minutes)).toBe(RecordingStatus.FAILED);
    expect(deriveProcessingStatus(minutes)).toBe(ProcessingStatus.FAILED);
  });
});

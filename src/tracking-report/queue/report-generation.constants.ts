export const REPORT_GENERATION_QUEUE = 'report-generation';
export const REPORT_GENERATION_JOB = 'generate_periodic_report';

/** BullMQ job 去重 key 前缀，格式: report-gen:{cadence} */
export const REPORT_GEN_JOB_ID_PREFIX = 'report-gen';

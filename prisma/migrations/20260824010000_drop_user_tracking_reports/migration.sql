-- The generic tracking report hub supersedes the legacy user-specific report storage.
-- Source tables must be dropped first because they reference user_tracking_reports.
DROP TABLE "tracking_report_minute_summary_sources";
DROP TABLE "tracking_report_source_reports";
DROP TABLE "user_tracking_reports";

DROP TYPE "TrackingCadence";
DROP TYPE "TrackingReportType";

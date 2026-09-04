ALTER TABLE "meetings" ADD COLUMN "org_id" TEXT;

ALTER TABLE "minute_files" ADD COLUMN "file_binding_id" TEXT;

CREATE TYPE "DriveSpaceType" AS ENUM ('PERSONAL', 'ORG', 'SYSTEM_UNASSIGNED');
CREATE TYPE "DriveSpaceStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "DriveNodeType" AS ENUM ('FILE', 'FOLDER');
CREATE TYPE "DriveFileManagedBy" AS ENUM ('USER', 'SYSTEM');
CREATE TYPE "FileVersionStatus" AS ENUM ('VERIFYING', 'ACTIVE', 'REJECTED');
CREATE TYPE "UploadSessionStatus" AS ENUM ('CREATED', 'UPLOADING', 'VERIFYING', 'ACTIVE', 'REJECTED', 'EXPIRED');
CREATE TYPE "DrivePrincipalType" AS ENUM ('ORG', 'USER', 'ORG_MEMBER', 'DEPARTMENT', 'ROLE');
CREATE TYPE "DriveGrantEffect" AS ENUM ('ALLOW', 'DENY');
CREATE TYPE "DriveAction" AS ENUM ('VIEW', 'DOWNLOAD', 'UPLOAD', 'RENAME', 'MOVE', 'SHARE', 'DELETE', 'MANAGE_ACL');
CREATE TYPE "FileBindingTargetType" AS ENUM ('MINUTE', 'PROJECT', 'CUSTOM_RECORD', 'OTHER');
CREATE TYPE "DriveAuditAction" AS ENUM ('CREATE_FOLDER', 'CREATE_FILE', 'DOWNLOAD', 'RENAME', 'MOVE', 'GRANT', 'REVOKE', 'TRASH', 'RESTORE', 'PURGE', 'BIND', 'UNBIND');

CREATE TABLE "drive_spaces" (
    "id" TEXT NOT NULL,
    "type" "DriveSpaceType" NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "status" "DriveSpaceStatus" NOT NULL DEFAULT 'ACTIVE',
    "owner_user_id" TEXT,
    "org_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    CONSTRAINT "drive_spaces_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "drive_spaces_owner_check" CHECK (
      ("type" = 'PERSONAL' AND "owner_user_id" IS NOT NULL AND "org_id" IS NULL) OR
      ("type" = 'ORG' AND "owner_user_id" IS NULL AND "org_id" IS NOT NULL) OR
      ("type" = 'SYSTEM_UNASSIGNED' AND "owner_user_id" IS NULL AND "org_id" IS NULL)
    )
);

CREATE TABLE "drive_files" (
    "id" TEXT NOT NULL,
    "managed_by" "DriveFileManagedBy" NOT NULL DEFAULT 'USER',
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "drive_files_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "drive_nodes" (
    "id" TEXT NOT NULL,
    "space_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "type" "DriveNodeType" NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "inherit_acl" BOOLEAN NOT NULL DEFAULT true,
    "file_id" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    "purge_after" TIMESTAMPTZ(6),
    CONSTRAINT "drive_nodes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "drive_nodes_type_check" CHECK (
      ("type" = 'FILE' AND "file_id" IS NOT NULL) OR
      ("type" = 'FOLDER' AND "file_id" IS NULL)
    )
);

CREATE TABLE "file_versions" (
    "id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "storage_object_id" UUID NOT NULL,
    "status" "FileVersionStatus" NOT NULL DEFAULT 'VERIFYING',
    "original_name" VARCHAR(255) NOT NULL,
    "content_type" VARCHAR(255) NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "checksum_sha256" VARCHAR(64),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "file_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "upload_sessions" (
    "id" TEXT NOT NULL,
    "space_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "created_by" TEXT NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "declared_content_type" VARCHAR(255) NOT NULL,
    "declared_size_bytes" BIGINT NOT NULL,
    "object_key" VARCHAR(1024) NOT NULL,
    "provider_upload_id" VARCHAR(255) NOT NULL,
    "status" "UploadSessionStatus" NOT NULL DEFAULT 'CREATED',
    "completed_parts" JSONB NOT NULL DEFAULT '[]',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "upload_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "drive_grants" (
    "id" TEXT NOT NULL,
    "space_id" TEXT NOT NULL,
    "node_id" TEXT,
    "principal_type" "DrivePrincipalType" NOT NULL,
    "principal_id" TEXT NOT NULL,
    "effect" "DriveGrantEffect" NOT NULL DEFAULT 'ALLOW',
    "actions" "DriveAction"[] NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "drive_grants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "file_bindings" (
    "id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "target_type" "FileBindingTargetType" NOT NULL,
    "target_id" TEXT NOT NULL,
    "field_key" VARCHAR(100) NOT NULL DEFAULT '',
    "purpose" VARCHAR(100) NOT NULL DEFAULT '',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "file_bindings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "drive_audit_logs" (
    "id" TEXT NOT NULL,
    "space_id" TEXT NOT NULL,
    "node_id" TEXT,
    "file_id" TEXT,
    "actor_id" TEXT,
    "action" "DriveAuditAction" NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "drive_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "drive_spaces_personal_owner_key" ON "drive_spaces"("owner_user_id") WHERE "type" = 'PERSONAL' AND "deleted_at" IS NULL;
CREATE UNIQUE INDEX "drive_spaces_org_key" ON "drive_spaces"("org_id") WHERE "type" = 'ORG' AND "deleted_at" IS NULL;
CREATE UNIQUE INDEX "drive_spaces_unassigned_key" ON "drive_spaces"("type") WHERE "type" = 'SYSTEM_UNASSIGNED' AND "deleted_at" IS NULL;
CREATE INDEX "drive_spaces_owner_user_id_idx" ON "drive_spaces"("owner_user_id");
CREATE INDEX "drive_spaces_org_id_idx" ON "drive_spaces"("org_id");
CREATE INDEX "drive_spaces_type_status_idx" ON "drive_spaces"("type", "status");
CREATE UNIQUE INDEX "drive_nodes_file_id_key" ON "drive_nodes"("file_id");
CREATE UNIQUE INDEX "drive_nodes_active_sibling_name_key" ON "drive_nodes"("space_id", COALESCE("parent_id", ''), lower("name")) WHERE "deleted_at" IS NULL;
CREATE INDEX "drive_nodes_space_id_parent_id_deleted_at_idx" ON "drive_nodes"("space_id", "parent_id", "deleted_at");
CREATE INDEX "drive_nodes_parent_id_idx" ON "drive_nodes"("parent_id");
CREATE INDEX "drive_nodes_purge_after_idx" ON "drive_nodes"("purge_after");
CREATE INDEX "drive_files_created_by_idx" ON "drive_files"("created_by");
CREATE UNIQUE INDEX "file_versions_file_id_version_key" ON "file_versions"("file_id", "version");
CREATE INDEX "file_versions_storage_object_id_idx" ON "file_versions"("storage_object_id");
CREATE INDEX "file_versions_status_idx" ON "file_versions"("status");
CREATE UNIQUE INDEX "upload_sessions_object_key_key" ON "upload_sessions"("object_key");
CREATE INDEX "upload_sessions_space_id_status_idx" ON "upload_sessions"("space_id", "status");
CREATE INDEX "upload_sessions_expires_at_status_idx" ON "upload_sessions"("expires_at", "status");
CREATE UNIQUE INDEX "drive_grants_scope_principal_effect_key" ON "drive_grants"("space_id", COALESCE("node_id", ''), "principal_type", "principal_id", "effect");
CREATE INDEX "drive_grants_node_id_idx" ON "drive_grants"("node_id");
CREATE INDEX "drive_grants_principal_type_principal_id_idx" ON "drive_grants"("principal_type", "principal_id");
CREATE UNIQUE INDEX "file_bindings_file_id_target_type_target_id_field_key_purpose_key" ON "file_bindings"("file_id", "target_type", "target_id", "field_key", "purpose");
CREATE INDEX "file_bindings_target_type_target_id_active_idx" ON "file_bindings"("target_type", "target_id", "active");
CREATE INDEX "drive_audit_logs_space_id_created_at_idx" ON "drive_audit_logs"("space_id", "created_at");
CREATE INDEX "drive_audit_logs_node_id_idx" ON "drive_audit_logs"("node_id");
CREATE INDEX "drive_audit_logs_file_id_idx" ON "drive_audit_logs"("file_id");
CREATE UNIQUE INDEX "minute_files_file_binding_id_key" ON "minute_files"("file_binding_id");
CREATE INDEX "meetings_org_id_idx" ON "meetings"("org_id");
CREATE INDEX "meetings_org_id_start_at_idx" ON "meetings"("org_id", "start_at");

ALTER TABLE "meetings" ADD CONSTRAINT "meetings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "drive_spaces" ADD CONSTRAINT "drive_spaces_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "drive_spaces" ADD CONSTRAINT "drive_spaces_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "drive_files" ADD CONSTRAINT "drive_files_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "drive_nodes" ADD CONSTRAINT "drive_nodes_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "drive_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "drive_nodes" ADD CONSTRAINT "drive_nodes_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "drive_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "drive_nodes" ADD CONSTRAINT "drive_nodes_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "drive_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "drive_nodes" ADD CONSTRAINT "drive_nodes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "file_versions" ADD CONSTRAINT "file_versions_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "drive_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "file_versions" ADD CONSTRAINT "file_versions_storage_object_id_fkey" FOREIGN KEY ("storage_object_id") REFERENCES "storage_objects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "drive_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "drive_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "drive_grants" ADD CONSTRAINT "drive_grants_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "drive_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "drive_grants" ADD CONSTRAINT "drive_grants_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "drive_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "drive_grants" ADD CONSTRAINT "drive_grants_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "file_bindings" ADD CONSTRAINT "file_bindings_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "drive_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "drive_audit_logs" ADD CONSTRAINT "drive_audit_logs_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "drive_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "drive_audit_logs" ADD CONSTRAINT "drive_audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "minute_files" ADD CONSTRAINT "minute_files_file_binding_id_fkey" FOREIGN KEY ("file_binding_id") REFERENCES "file_bindings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

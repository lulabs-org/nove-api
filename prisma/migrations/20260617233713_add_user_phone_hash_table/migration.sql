-- CreateTable
CREATE TABLE "user_phone_hashes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "hash_value" VARCHAR(255) NOT NULL,
    "platform" "Platform" NOT NULL DEFAULT 'TENCENT_MEETING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_phone_hashes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_phone_hashes_hash_value_key" ON "user_phone_hashes"("hash_value");

-- CreateIndex
CREATE INDEX "user_phone_hashes_user_id_idx" ON "user_phone_hashes"("user_id");

-- AddForeignKey
ALTER TABLE "user_phone_hashes" ADD CONSTRAINT "user_phone_hashes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

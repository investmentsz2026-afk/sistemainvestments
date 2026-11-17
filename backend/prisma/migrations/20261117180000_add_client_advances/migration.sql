-- CreateTable
CREATE TABLE "client_advances" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "used_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remaining_amount" DOUBLE PRECISION NOT NULL,
    "payment_method" TEXT NOT NULL DEFAULT 'EFECTIVO',
    "reference" TEXT,
    "description" TEXT,
    "evidence_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DISPONIBLE',
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_advances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_advance_usages" (
    "id" TEXT NOT NULL,
    "advance_id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "payment_id" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_advance_usages_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "sale_payments" ADD COLUMN IF NOT EXISTS "advance_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "client_advances_code_key" ON "client_advances"("code");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_advances_client_id_fkey') THEN
        ALTER TABLE "client_advances" ADD CONSTRAINT "client_advances_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_advances_created_by_id_fkey') THEN
        ALTER TABLE "client_advances" ADD CONSTRAINT "client_advances_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_advance_usages_advance_id_fkey') THEN
        ALTER TABLE "client_advance_usages" ADD CONSTRAINT "client_advance_usages_advance_id_fkey" FOREIGN KEY ("advance_id") REFERENCES "client_advances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_advance_usages_sale_id_fkey') THEN
        ALTER TABLE "client_advance_usages" ADD CONSTRAINT "client_advance_usages_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

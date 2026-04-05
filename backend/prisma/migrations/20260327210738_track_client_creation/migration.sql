-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "created_by_id" TEXT,
ADD COLUMN     "zone" TEXT;

-- AlterTable
ALTER TABLE "product_samples" ADD COLUMN     "admin_op_approval_status" TEXT NOT NULL DEFAULT 'PENDIENTE';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "op" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "zone" TEXT;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the column `quantity_per_unit` on the `sample_materials` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "sample_materials" DROP CONSTRAINT "sample_materials_product_id_fkey";

-- AlterTable
ALTER TABLE "product_samples" ADD COLUMN     "admin_material_notes" TEXT,
ADD COLUMN     "logistics_material_date" TIMESTAMP(3),
ADD COLUMN     "material_receipt_status" TEXT DEFAULT 'PENDIENTE_ADMIN',
ADD COLUMN     "udp_material_received_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "sample_materials" DROP COLUMN "quantity_per_unit",
ADD COLUMN     "custom_material" TEXT,
ADD COLUMN     "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
ALTER COLUMN "product_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "sample_materials" ADD CONSTRAINT "sample_materials_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

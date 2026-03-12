/*
  Warnings:

  - Added the required column `category` to the `purchase_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `purchase_items` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "purchase_items" DROP CONSTRAINT "purchase_items_product_id_fkey";

-- AlterTable
ALTER TABLE "movements" ALTER COLUMN "quantity" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "previous_stock" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "new_stock" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "product_variants" ALTER COLUMN "stock" SET DEFAULT 0,
ALTER COLUMN "stock" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "min_stock" SET DEFAULT 5,
ALTER COLUMN "min_stock" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "purchase_items" ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "unit" TEXT,
ALTER COLUMN "product_id" DROP NOT NULL,
ALTER COLUMN "quantity" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "purchases" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'PURCHASE';

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

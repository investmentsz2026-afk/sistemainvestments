/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `product_samples` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "product_samples" ADD COLUMN     "code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "product_samples_code_key" ON "product_samples"("code");

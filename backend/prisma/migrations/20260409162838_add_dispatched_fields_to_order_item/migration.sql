-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "disp_l32" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "disp_m30" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "disp_quantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "disp_s28" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "disp_size38" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "disp_size40" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "disp_size42" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "disp_size44" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "disp_size46" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "disp_xl34" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "disp_xxl36" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "agencies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "zone" TEXT NOT NULL,
    "ruc" TEXT,
    "contact_name" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agencies_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "agencies" ADD CONSTRAINT "agencies_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

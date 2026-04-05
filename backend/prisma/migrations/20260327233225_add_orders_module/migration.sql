-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "order_number" TEXT,
    "client_id" TEXT,
    "condition" TEXT,
    "agency" TEXT,
    "observations" TEXT,
    "total_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_quantity" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "seller_id" TEXT NOT NULL,
    "zone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "s28" INTEGER NOT NULL DEFAULT 0,
    "m30" INTEGER NOT NULL DEFAULT 0,
    "l32" INTEGER NOT NULL DEFAULT 0,
    "xl34" INTEGER NOT NULL DEFAULT 0,
    "xxl36" INTEGER NOT NULL DEFAULT 0,
    "size38" INTEGER NOT NULL DEFAULT 0,
    "size40" INTEGER NOT NULL DEFAULT 0,
    "size42" INTEGER NOT NULL DEFAULT 0,
    "size44" INTEGER NOT NULL DEFAULT 0,
    "size46" INTEGER NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "unit_price" DOUBLE PRECISION NOT NULL,
    "total_price" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

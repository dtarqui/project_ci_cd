-- Indices de las claves foraneas y de la fecha de las ventas, y clave de
-- idempotencia del registro de ventas. Solo agrega: la version en servicio sigue
-- funcionando con el esquema ampliado (ADR-08 de la tesis).

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "idempotency_key" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "sales_idempotency_key_key" ON "sales"("idempotency_key");

-- CreateIndex
CREATE INDEX "sales_customer_id_idx" ON "sales"("customer_id");

-- CreateIndex
CREATE INDEX "sales_created_at_idx" ON "sales"("created_at");

-- CreateIndex
CREATE INDEX "sale_items_sale_id_idx" ON "sale_items"("sale_id");

-- CreateIndex
CREATE INDEX "sale_items_product_id_idx" ON "sale_items"("product_id");

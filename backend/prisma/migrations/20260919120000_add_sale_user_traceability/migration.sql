-- Trazabilidad de vendedor por venta (RF del modelo de datos: sales.user_id -> users.id).
-- Nullable a proposito: las ventas cargadas antes de este cambio no tienen
-- vendedor asociado y deben seguir siendo validas.
ALTER TABLE "sales" ADD COLUMN "user_id" INTEGER;
ALTER TABLE "sales" ADD COLUMN "user_name" TEXT;

ALTER TABLE "sales"
  ADD CONSTRAINT "sales_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "sales_user_id_idx" ON "sales"("user_id");

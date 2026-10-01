-- Borrado logico de clientes y productos.
--
-- Motivo: sales.customer_id y sale_items.product_id referencian estas tablas sin
-- ON DELETE, es decir con RESTRICT, asi que borrar un cliente o un producto que
-- aparece en alguna venta fallaba con P2003 (foreign key constraint violated).
-- La restriccion es correcta -- protege el historico -- de modo que lo que
-- cambia es la aplicacion: marca la fila en vez de destruirla.
--
-- Nullable y sin valor por defecto: null significa activo, y todas las filas
-- existentes quedan activas.
ALTER TABLE "customers" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "products" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- Los listados filtran por esta columna en cada consulta.
CREATE INDEX "customers_deleted_at_idx" ON "customers"("deleted_at");
CREATE INDEX "products_deleted_at_idx" ON "products"("deleted_at");

-- Catalogos administrables desde la pantalla de configuracion.
--
-- Hasta ahora las ciudades vivian en una constante del codigo
-- (src/config/constants.js) y las categorias no existian como entidad: el
-- desplegable de productos se armaba con los valores distintos de los productos
-- cargados, de modo que una categoria solo existia mientras algun producto la
-- usara y un error de tipeo creaba una categoria nueva sin que nada lo advirtiera.
--
-- No hay tabla de paises: el caso de estudio opera unicamente en Bolivia, segun
-- los limites declarados en el perfil, de modo que un catalogo de paises seria
-- una tabla de una sola fila que nadie consultaria.
--
-- Las dos tablas usan borrado logico (deleted_at), por el mismo motivo que
-- clientes y productos: las filas quedan referenciadas desde datos historicos y
-- destruirlas dejaria registros sin resolver.

-- CreateTable
CREATE TABLE "cities" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "postal_prefix" TEXT,
    "area_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cities_name_key" ON "cities"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

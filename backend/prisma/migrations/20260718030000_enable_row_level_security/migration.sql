-- Activa Row Level Security en todas las tablas de la app.
-- El backend se conecta como dueño de las tablas (rol de DATABASE_URL) y
-- sigue teniendo acceso completo vía Prisma. Esto solo bloquea el acceso
-- público a través de la API REST/GraphQL automática de Supabase
-- (PostgREST, usada con anon/service key), que este proyecto no utiliza.
-- Sin políticas definidas, RLS deniega todo acceso vía esos roles restringidos
-- (anon/authenticated), lo cual es el comportamiento deseado aquí.

ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."sales" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."sale_items" ENABLE ROW LEVEL SECURITY;

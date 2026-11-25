-- Alertas de seguridad (reutilizacion de un token de renovacion, cuenta bloqueada,
-- rafagas de accesos denegados). Solo agrega una tabla: la version en servicio
-- sigue funcionando con el esquema ampliado (ADR-08 de la tesis).

-- CreateTable
CREATE TABLE "security_alerts" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "user_id" INTEGER,
    "username" TEXT,
    "ip" TEXT,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "security_alerts_created_at_idx" ON "security_alerts"("created_at");

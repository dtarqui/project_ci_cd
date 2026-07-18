FROM node:18-alpine

WORKDIR /app

# El motor de consultas de Prisma requiere OpenSSL en Alpine (musl).
RUN apk add --no-cache openssl

# Instala TODAS las dependencias (incluye el CLI "prisma", necesario para el
# postinstall "prisma generate"); prisma/schema.prisma debe existir antes de
# npm ci para que ese hook encuentre el schema.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci && npm cache clean --force

# Copy only runtime source files needed to launch the API.
COPY index.js app.js ./
COPY src ./src

# Elimina devDependencies (incluye el CLI de prisma) pero conserva el
# cliente ya generado en node_modules/@prisma/client y node_modules/.prisma.
RUN npm prune --omit=dev

ENV NODE_ENV=production
ENV PORT=4000

# Run as a non-root user for better container security.
USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
	CMD wget -qO- "http://127.0.0.1:${PORT}/health" >/dev/null || exit 1

CMD ["node", "index.js"]

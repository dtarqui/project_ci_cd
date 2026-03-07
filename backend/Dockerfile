FROM node:18-alpine

WORKDIR /app

# Ensure production-only dependency install is deterministic.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy only runtime source files needed to launch the API.
COPY index.js app.js ./
COPY src ./src

ENV NODE_ENV=production
ENV PORT=4000

# Run as a non-root user for better container security.
USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
	CMD wget -qO- "http://127.0.0.1:${PORT}/health" >/dev/null || exit 1

CMD ["node", "index.js"]

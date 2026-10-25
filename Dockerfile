# -------------------------------------------------------------
# Stage 1: Build Frontend Client (Offline SPA Bundle)
# -------------------------------------------------------------
FROM node:22-bookworm-slim AS client-builder
WORKDIR /app
COPY package.json ./
COPY shared ./shared
COPY client ./client
WORKDIR /app/client
RUN npm install
RUN npm run build

# -------------------------------------------------------------
# Stage 2: Build Backend Server (TypeScript & SQLite Bindings)
# -------------------------------------------------------------
FROM node:22-bookworm-slim AS server-builder
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ sqlite3 && rm -rf /var/lib/apt/lists/*
COPY package.json ./
COPY shared ./shared
COPY server ./server
WORKDIR /app/server
RUN npm install
RUN npm run build

# -------------------------------------------------------------
# Stage 3: Production Runtime
# -------------------------------------------------------------
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Install runtime tools for health checks
RUN apt-get update && apt-get install -y sqlite3 curl && rm -rf /var/lib/apt/lists/*

COPY --from=server-builder /app/package.json ./package.json
COPY --from=server-builder /app/shared ./shared
COPY --from=server-builder /app/server/package.json ./server/package.json
COPY --from=server-builder /app/server/node_modules ./server/node_modules
COPY --from=server-builder /app/server/dist ./server/dist
COPY --from=server-builder /app/server/src/db/schema.sql ./server/src/db/schema.sql
COPY --from=client-builder /app/client/dist ./client/dist

# Ensure persistence directories exist
RUN mkdir -p /app/server/data /app/server/uploads

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "server/dist/server/src/index.js"]

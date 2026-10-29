# ----------------------------------------------------
# Stage 1: Build Stage
# ----------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --legacy-peer-deps

COPY tsconfig*.json nest-cli.json ./
COPY src ./src/

RUN npx prisma generate
RUN npm run build

# Prune dev dependencies for lean production image
RUN npm prune --production --legacy-peer-deps

# ----------------------------------------------------
# Stage 2: Production Runtime
# ----------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Security: Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

# Switch to unprivileged user
USER appuser

EXPOSE 3000

CMD ["node", "dist/main"]

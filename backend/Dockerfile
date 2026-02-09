FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache curl && \
    addgroup -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nestjs

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/src/main"]

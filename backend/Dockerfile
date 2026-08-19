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
# --omit=optional 도 함께 준다. typeorm이 sqlite3를 optional peer로 선언해 두어
# --omit=dev 만으로는 테스트 전용 드라이버(sqlite3/better-sqlite3/sql.js)와 그
# 네이티브 빌드 체인(node-gyp -> tar)이 런타임 이미지에 그대로 실린다.
# 런타임은 Postgres만 쓰므로 필요 없고, tar CRITICAL 등이 딸려 온다.
# 제외되는 나머지 optional(pg-cloudflare/msgpackr-extract/encoding)은 전부
# 폴백이 있는 가속기·플랫폼 전용 패키지다.
RUN npm ci --omit=dev --omit=optional

COPY --from=builder /app/dist ./dist

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/src/main"]

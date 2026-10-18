# CryptoTracker - Produktions-Image (Next.js Standalone)
#
# Hinweise zu den Fallstricken, die hier bewusst behandelt sind:
#  * `apk add --no-cache` (frueher stand hier `--no-exe`, das ist keine
#    gueltige apk-Option und brach den Build sofort ab).
#  * `npm ci --legacy-peer-deps`: next-auth@5.0.0-beta verlangt nodemailer ^7,
#    das Projekt nutzt ^8. Die Lock-Datei loest die Versionen bereits auf.
#  * `mkdir -p public`: Das Repo hat kein public/-Verzeichnis, der Runner
#    kopiert es aber.
#  * Build-Zeit-Datenbank: Seiten, die schon beim Build auf Prisma zugreifen,
#    sollen nicht an einer leeren Datei scheitern.
#  * Prisma-CLI im Runner plus `db push` beim Start: eine frische
#    Volume-Datenbank hat sonst keine Tabellen.

FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci --legacy-peer-deps

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Platzhalter nur fuer den Build; die echten Werte setzt der Betreiber.
ENV AUTH_SECRET=build-time-placeholder
ENV AUTH_TRUST_HOST=true
ENV DATABASE_URL=file:/tmp/build.db

RUN npx prisma generate \
 && npx prisma db push --skip-generate \
 && npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOME=/tmp
# Ueberschreibbar per Compose. Absoluter Pfad, damit die Datei im Volume liegt.
ENV DATABASE_URL=file:/data/cryptotracker.db

RUN apk add --no-cache libc6-compat \
 && npm install -g prisma@6.19.3

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

RUN mkdir -p /data && chown -R nextjs:nodejs /data /app/prisma

USER nextjs
EXPOSE 3000

# `db push` ist idempotent: fehlende Tabellen werden angelegt, Daten bleiben.
CMD ["sh", "-c", "prisma db push --skip-generate --schema=/app/prisma/schema.prisma && node server.js"]

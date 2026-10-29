# MamaCare AI web PWA - production image.
# Build context MUST be the monorepo root:  docker build -f apps/web-pwa/Dockerfile .

# ---- Stage 1: build the PWA with Node + pnpm ----------------------------------------------
FROM node:22-alpine AS build
ENV PNPM_HOME=/pnpm CI=true
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

# Dependency layer (cached until a manifest or the lockfile changes).
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web-pwa/package.json apps/web-pwa/
COPY packages/dhis2-connector/package.json packages/dhis2-connector/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter web-pwa...

COPY apps/web-pwa apps/web-pwa
RUN pnpm --filter web-pwa build \
 && node apps/web-pwa/scripts/precompress.mjs apps/web-pwa/dist

# ---- Stage 2: serve with a small Alpine nginx -----------------------------------------------
FROM alpine:3.20 AS runtime
# nginx from Alpine's own repo so the brotli dynamic module matches its version. If the brotli module
# is unavailable the image still works (gzip only).
RUN apk add --no-cache nginx \
 && (apk add --no-cache nginx-mod-http-brotli && echo "brotli: enabled" || echo "brotli: NOT available, serving gzip only") \
 && mkdir -p /etc/nginx/extra /etc/nginx/snippets /etc/nginx/tls /etc/nginx/certs /run/nginx /var/lib/nginx/tmp \
 && rm -f /etc/nginx/http.d/default.conf

COPY apps/web-pwa/nginx/nginx.conf /etc/nginx/nginx.conf
COPY apps/web-pwa/nginx/snippets/ /etc/nginx/snippets/
COPY apps/web-pwa/nginx/tls.conf /etc/nginx/tls/tls.conf
COPY apps/web-pwa/nginx/brotli.conf /tmp/brotli.conf
COPY apps/web-pwa/nginx/docker-entrypoint.sh /docker-entrypoint.sh
# Only enable the brotli directives when the module actually installed.
RUN if ls /etc/nginx/modules/*brotli* >/dev/null 2>&1 || ls /usr/lib/nginx/modules/*brotli* >/dev/null 2>&1; then \
      cp /tmp/brotli.conf /etc/nginx/extra/brotli.conf; \
    fi \
 && rm /tmp/brotli.conf \
 && chmod +x /docker-entrypoint.sh \
 && : > /etc/nginx/snippets/http-redirect.conf

COPY --from=build /repo/apps/web-pwa/dist /usr/share/nginx/html

EXPOSE 80 443
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
ENTRYPOINT ["/docker-entrypoint.sh"]

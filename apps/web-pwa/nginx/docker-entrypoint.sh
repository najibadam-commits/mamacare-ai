#!/bin/sh
# Chooses HTTP-only or HTTP+HTTPS at start-up, validates the config, then runs nginx in the foreground.
set -eu

mkdir -p /etc/nginx/extra
: > /etc/nginx/snippets/http-redirect.conf

if [ -r /etc/nginx/certs/fullchain.pem ] && [ -r /etc/nginx/certs/privkey.pem ]; then
  echo "TLS certificates found: enabling HTTPS on :443"
  cp /etc/nginx/tls/tls.conf /etc/nginx/extra/tls.conf
  if [ "${FORCE_HTTPS:-false}" = "true" ]; then
    echo 'if ($request_uri != "/healthz") { return 301 https://$host$request_uri; }' > /etc/nginx/snippets/http-redirect.conf
  fi
else
  rm -f /etc/nginx/extra/tls.conf
  if [ "${FORCE_HTTPS:-false}" = "true" ]; then
    echo "FORCE_HTTPS=true but no certificates mounted at /etc/nginx/certs - refusing to start" >&2
    exit 1
  fi
  echo "No TLS certificates mounted: serving HTTP only (terminate TLS at a load balancer, or mount certs)"
fi

nginx -t
exec nginx -g 'daemon off;'

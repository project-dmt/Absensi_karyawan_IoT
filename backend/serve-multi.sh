#!/usr/bin/env bash
# Multi-worker local server: nginx LB + 3x artisan serve
# Fix: SSE realtime nahan 1 worker → ESP tap ngantri.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
CONF="/tmp/absensi-nginx.conf"
PIDFILE="/tmp/absensi-nginx.pid"

pkill -f "artisan serve --host=127.0.0.1 --port=800" 2>/dev/null || true
pkill -f "artisan serve --host=0.0.0.0 --port=800" 2>/dev/null || true
if [[ -f "$PIDFILE" ]]; then
  nginx -c "$CONF" -s stop 2>/dev/null || true
  rm -f "$PIDFILE"
fi
fuser -k 8000/tcp 2>/dev/null || true
sleep 0.5

cd "$ROOT"
php artisan serve --host=127.0.0.1 --port=8001 >/tmp/absensi-w1.log 2>&1 &
php artisan serve --host=127.0.0.1 --port=8002 >/tmp/absensi-w2.log 2>&1 &
php artisan serve --host=127.0.0.1 --port=8003 >/tmp/absensi-w3.log 2>&1 &
sleep 1

cat > "$CONF" <<'EOF'
worker_processes 1;
error_log /tmp/absensi-nginx-error.log warn;
pid /tmp/absensi-nginx.pid;
events { worker_connections 64; }
http {
  access_log /tmp/absensi-nginx-access.log;
  client_body_temp_path /tmp/absensi-nginx-body;
  proxy_temp_path /tmp/absensi-nginx-proxy;
  fastcgi_temp_path /tmp/absensi-nginx-fastcgi;
  uwsgi_temp_path /tmp/absensi-nginx-uwsgi;
  scgi_temp_path /tmp/absensi-nginx-scgi;
  upstream absensi_php {
    least_conn;
    server 127.0.0.1:8001;
    server 127.0.0.1:8002;
    server 127.0.0.1:8003;
  }
  server {
    listen 8000;
    location / {
      proxy_pass http://absensi_php;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header Connection "";
      proxy_buffering off;
      proxy_cache off;
      proxy_read_timeout 3600s;
    }
  }
}
EOF

mkdir -p /tmp/absensi-nginx-body /tmp/absensi-nginx-proxy /tmp/absensi-nginx-fastcgi /tmp/absensi-nginx-uwsgi /tmp/absensi-nginx-scgi
nginx -c "$CONF"
echo "Backend multi-worker di http://0.0.0.0:8000 (workers 8001-8003)"

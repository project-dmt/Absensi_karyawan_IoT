#!/bin/bash
# Backend serve script — auto-detect IP lokal untuk akses LAN
# Biar temen bisa akses dari laptop lain di WiFi yang sama

set -e

# Deteksi IP lokal dari default route (lebih akurat kalau ada docker/VPN)
LOCAL_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src"){print $(i+1); exit}}')
[ -z "$LOCAL_IP" ] && LOCAL_IP=$(hostname -I | awk '{print $1}')

if [ -z "$LOCAL_IP" ]; then
    echo "Gagal deteksi IP lokal. Pastikan terhubung ke WiFi."
    exit 1
fi

echo "========================================"
echo "  Absensi IoT - Backend Server"
echo "========================================"
echo "  IP Lokal   : $LOCAL_IP"
echo "  Backend    : http://$LOCAL_IP:8000"
echo "  Frontend   : http://$LOCAL_IP:5173"
echo "========================================"
echo ""

# Hapus config cache biar baca .env baru
php artisan config:clear 2>/dev/null || true

# Start server — bind ke 0.0.0.0 biar bisa diakses dari LAN
FRONTEND_URL="http://$LOCAL_IP:5173" \
APP_URL="http://$LOCAL_IP:8000" \
SANCTUM_STATEFUL_DOMAINS="$LOCAL_IP:5173,$LOCAL_IP:8000,localhost:5173,localhost:8000,127.0.0.1:5173,127.0.0.1:8000" \
PHP_CLI_SERVER_WORKERS=4 \
    php artisan serve --host=0.0.0.0 --port=8000 --no-reload

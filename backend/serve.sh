#!/bin/bash
# Backend serve script — auto-detect IP lokal untuk akses LAN
# Biar temen bisa akses dari laptop lain di WiFi yang sama

set -e

# Deteksi IP lokal (ambil IP pertama yang bukan 127.0.0.1)
LOCAL_IP=$(hostname -I | awk '{print $1}')

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
    php artisan serve --host=0.0.0.0 --port=8000

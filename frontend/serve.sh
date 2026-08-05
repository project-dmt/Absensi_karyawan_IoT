#!/bin/bash
# Frontend serve script — auto-detect IP lokal
# Biar temen bisa akses dari laptop lain di WiFi yang sama

set -e

LOCAL_IP=$(hostname -I | awk '{print $1}')

if [ -z "$LOCAL_IP" ]; then
    echo "Gagal deteksi IP lokal. Pastikan terhubung ke WiFi."
    exit 1
fi

echo "========================================"
echo "  Absensi IoT - Frontend Server"
echo "========================================"
echo "  IP Lokal   : $LOCAL_IP"
echo "  Frontend   : http://$LOCAL_IP:5173"
echo "  Backend    : http://$LOCAL_IP:8000"
echo "========================================"
echo ""

# Update API URL biar指向 backend di IP lokal
export VITE_API_URL="http://$LOCAL_IP:8000/api"

# Start Vite dev server — bind 0.0.0.0 biar bisa diakses LAN
npx vite --host 0.0.0.0 --port 5173

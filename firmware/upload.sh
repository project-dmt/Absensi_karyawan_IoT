#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="${1:-/dev/ttyUSB0}"
BOOTLOADER="$DIR/.pio/build/esp32dev/bootloader.bin"
PARTITIONS="$DIR/.pio/build/esp32dev/partitions.bin"
FIRMWARE="$DIR/.pio/build/esp32dev/firmware.bin"

if [ ! -f "$FIRMWARE" ]; then
    echo "Build firmware dulu: pio run"
    exit 1
fi

echo "Uploading to $PORT ..."
echo "  Bootloader  (0x1000) : $BOOTLOADER"
echo "  Partitions  (0x8000) : $PARTITIONS"
echo "  Firmware    (0x10000): $FIRMWARE"

python3 -m esptool --port "$PORT" --baud 115200 \
    --before default_reset --connect-attempts 1 \
    write_flash \
    0x1000 "$BOOTLOADER" \
    0x8000 "$PARTITIONS" \
    0x10000 "$FIRMWARE"

#ifndef CONFIG_H
#define CONFIG_H

// =====================================================
// WiFi Configuration
// =====================================================
#define WIFI_SSID       "YOUR_WIFI_SSID"
#define WIFI_PASSWORD   "YOUR_WIFI_PASSWORD"

// =====================================================
// Mode
// =====================================================
// true  = Offline mode (tanpa backend, untuk testing hardware)
// false = Online mode (butuh backend Laravel)
#define OFFLINE_MODE    true

// =====================================================
// Backend Server (hanya untuk OFFLINE_MODE = false)
// =====================================================
#define API_BASE_URL    "http://192.168.1.100:8000"
#define API_KEY         "YOUR_API_KEY_HERE"

// Generate API Key: php artisan api:generate-key

// =====================================================
// Pin RC522 RFID (SPI)
// =====================================================
#define RC522_SS_PIN    5
#define RC522_RST_PIN   4
// SCK  = GPIO 18 (default ESP32 SPI)
// MOSI = GPIO 23 (default ESP32 SPI)
// MISO = GPIO 19 (default ESP32 SPI)

// =====================================================
// Pin LCD 16x2 I2C
// =====================================================
#define LCD_SDA_PIN     21
#define LCD_SCL_PIN     22
#define LCD_ADDRESS     0x27  // Ganti ke 0x3F kalau LCD gak terdeteksi

// =====================================================
// Pin Buzzer
// =====================================================
#define BUZZER_PIN      15

// =====================================================
// Timing
// =====================================================
#define WIFI_TIMEOUT_MS         15000
#define HTTP_TIMEOUT_MS         10000
#define DISPLAY_DELAY_MS        3000
#define DEBOUNCE_DELAY_MS       2000
#define WIFI_RECONNECT_MS       5000

#endif

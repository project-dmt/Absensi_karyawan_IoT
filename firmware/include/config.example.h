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

// ================= RFID (RC522) - SPI - SISI KANAN =================
#define RC522_SS_PIN    5     // GPIO 5  (kanan)
#define RC522_RST_PIN   4     // GPIO 4  (kanan)
// SCK=18, MISO=19, MOSI=23 otomatis (kanan)

// ================= LCD I2C - SISI KIRI =================
#define LCD_SDA_PIN     32    // GPIO 32 (kiri)
#define LCD_SCL_PIN     33    // GPIO 33 (kiri)
#define LCD_ADDRESS     0x27  // Ganti ke 0x3F kalau LCD gak terdeteksi

// ================= Buzzer - SISI KIRI =================
#define BUZZER_PIN      26    // GPIO 26 (kiri)

// =====================================================
// Timing
// =====================================================
#define WIFI_TIMEOUT_MS         15000
#define HTTP_TIMEOUT_MS         10000
#define DISPLAY_DELAY_MS        1500
#define DEBOUNCE_DELAY_MS       2000
#define WIFI_RECONNECT_MS       5000

#endif

#ifndef CONFIG_H
#define CONFIG_H

// =====================================================
// MODE KONFIGURASI
// =====================================================
// true  = Offline mode (tanpa backend, untuk testing hardware)
// false = Online mode (butuh backend Laravel)
#define OFFLINE_MODE    true

// Nama Access Point saat konfigurasi web (captive portal)
// Browser konek ke WiFi "AbsensiRFID-Config" lalu buka http://192.168.4.1
#define CONFIG_AP_NAME          "AbsensiRFID-Config"
// Timeout portal (detik), 0 = tanpa batas tapi disarankan 240
#define CONFIG_PORTAL_TIMEOUT_S 240

// =====================================================
// FALLBACK Backend Server
// =====================================================
// Dipakai HANYA kalau belum pernah diset lewat web portal.
// Kosongkan ("") biar ESP selalu memaksa konfigurasi lewat web.
// Isi contoh: "http://192.168.1.100:8000"
#define FALLBACK_API_BASE_URL   ""
#define FALLBACK_API_KEY        ""

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
// Pin LCD 16x2 I2C (SISI KIRI)
// =====================================================
#define LCD_SDA_PIN     32    // GPIO 32 (kiri)
#define LCD_SCL_PIN     33    // GPIO 33 (kiri)
#define LCD_ADDRESS     0x27
// #define LCD_ADDRESS     0x3F  // Ganti kalo pake backpack lain

// =====================================================
// Pin Buzzer (SISI KIRI)
// =====================================================
#define BUZZER_PIN      26

// =====================================================
// Timing
// =====================================================
#define WIFI_TIMEOUT_MS         15000
#define HTTP_TIMEOUT_MS         10000
#define DISPLAY_DELAY_MS        3000
#define DEBOUNCE_DELAY_MS       2000
#define WIFI_RECONNECT_MS       5000
#define PORTAL_AUTO_MS          180000   // auto buka portal kalau WiFi putus > 3 menit

#endif
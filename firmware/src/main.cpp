#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <MFRC522.h>
#include <LiquidCrystal_I2C.h>
#include <Wire.h>
#include <WebServer.h>
#include <DNSServer.h>
#include "config.h"
#include "AppConfig.h"

// =====================================================
// Globals
// =====================================================
MFRC522 mfrc522(RC522_SS_PIN, RC522_RST_PIN);
LiquidCrystal_I2C lcd(LCD_ADDRESS, 16, 2);

AppConfig appConfig;
WebServer portalServer(80);
WebServer configSrv(8080);
DNSServer dnsServer;
const IPAddress portalIP(192, 168, 4, 1);

String apiBaseUrl;
String apiKey;
unsigned long wifiLostStart = 0;

bool portalActive = false;

bool lastCardPresent = false;
unsigned long lastWifiAttempt = 0;
String lastDisplayedUID = "";
bool rfidDetected = false;
bool lcdPresent = false;

// =====================================================
// Buzzer Helpers
// =====================================================
#ifndef BUZZER_ACTIVE_LOW
#define BUZZER_ACTIVE_LOW 0
#endif

void buzzerOn() {
#if BUZZER_ACTIVE_LOW
    digitalWrite(BUZZER_PIN, LOW);
#else
    digitalWrite(BUZZER_PIN, HIGH);
#endif
}

void buzzerOff() {
#if BUZZER_ACTIVE_LOW
    digitalWrite(BUZZER_PIN, HIGH);
#else
    digitalWrite(BUZZER_PIN, LOW);
#endif
}

void beep(int count, int onMs = 150, int offMs = 100) {
    for (int i = 0; i < count; i++) {
        buzzerOn();
        delay(onMs);
        buzzerOff();
        if (i < count - 1) delay(offMs);
    }
}

void beepSuccess()  { beep(1, 150, 0); }
void beepCheckout() { beep(2, 120, 80); }
void beepError()    { beep(3, 80, 60); }

// =====================================================
// LCD Helpers (16x2 — tiap baris max 16 karakter)
// =====================================================
void lcdLine(int row, const String &text) {
    if (!lcdPresent) return;
    lcd.setCursor(0, row);
    lcd.print("                ");
    lcd.setCursor(0, row);
    lcd.print(text.substring(0, 16));
}

// Tampilkan teks di 2 baris (max 32 karakter total)
void lcdFit2(const String &msg) {
    if (!lcdPresent) return;
    lcd.clear();
    lcdLine(0, msg.substring(0, 16));
    lcdLine(1, msg.length() > 16 ? msg.substring(16, 32) : "");
}

// Singkat pesan error API biar muat & terbaca
String lcdShortError(const String &msg) {
    String m = msg;
    m.toLowerCase();
    if (m.indexOf("tidak terdaftar") >= 0) return "Kartu tidak     terdaftar"; // 16+9 → 2 baris
    if (m.indexOf("tidak aktif") >= 0)     return "Karyawan nonaktif";
    if (m.indexOf("sudah checkout") >= 0)  return "Sudah checkout";
    if (m.indexOf("belum bisa") >= 0 || m.indexOf("jam pulang") >= 0)
        return "Belum jam pulang";
    if (m.indexOf("tidak bisa checkout") >= 0) return "Tak bisa checkout";
    if (m.indexOf("invalid api") >= 0 || m.indexOf("unauthorized") >= 0)
        return "API key salah";
    if (m.indexOf("server offline") >= 0)  return "Server offline";
    if (m.indexOf("tidak merespon") >= 0 || m.indexOf("timeout") >= 0)
        return "Server timeout";
    if (m.indexOf("response invalid") >= 0) return "Resp. invalid";
    // potong rapi ke 32 char (2 baris)
    return msg.substring(0, 32);
}

String lcdShortStatus(const String &status) {
    if (status.indexOf("Checkout") >= 0) return "Pulang";
    if (status == "Terlambat") return "Telat";
    if (status == "Hadir") return "Hadir";
    return status.substring(0, 8);
}

// Jam "14:30:05" -> "14:30"
String lcdShortJam(const String &jam) {
    if (jam.length() >= 5) return jam.substring(0, 5);
    return jam;
}

void lcdShowReady() {
    Serial.println("[LCD] Ready - Tempel Kartu RFID");
    if (!lcdPresent) return;
    lcd.clear();
    lcdLine(0, "Sistem Absensi");
    lcdLine(1, "IoT RFID");
    delay(400);
    lcd.clear();
    lcdLine(0, "Tempel Kartu");
    lcdLine(1, "RFID Anda...");
}

void lcdShowProcessing() {
    Serial.println("[LCD] Processing...");
    if (!lcdPresent) return;
    lcd.clear();
    lcdLine(0, "Memproses...");
    lcdLine(1, "Mohon tunggu");
}

void lcdShowResult(const String &nama, const String &status, const String &jam) {
    Serial.printf("[LCD] %s - %s %s\n", nama.c_str(), status.c_str(), jam.c_str());
    if (!lcdPresent) return;
    lcd.clear();
    lcdLine(0, nama);  // lcdLine potong 16
    String detail = lcdShortStatus(status) + " " + lcdShortJam(jam);
    lcdLine(1, detail);
}

void lcdShowError(const String &msg) {
    Serial.printf("[LCD] ERROR: %s\n", msg.c_str());
    if (!lcdPresent) return;
    lcdFit2(lcdShortError(msg));
}

void lcdShowOfflineResult(const String &uid) {
    Serial.printf("[LCD] Offline - UID: %s\n", uid.c_str());
    if (!lcdPresent) return;
    lcd.clear();
    lcdLine(0, "Offline OK");
    lcdLine(1, uid);  // lcdLine potong 16
}

void lcdShowSuccess(const String &msg) {
    Serial.printf("[LCD] SUCCESS: %s\n", msg.c_str());
    if (!lcdPresent) return;
    lcd.clear();
    lcdLine(0, "Scan OK");
    lcdLine(1, msg);
}

void lcdShowWifiStatus(bool connected) {
    if (!lcdPresent) return;
    lcd.clear();
    if (connected) {
        lcdLine(0, "WiFi Terhubung");
        lcdLine(1, WiFi.SSID());
    } else {
        lcdLine(0, "WiFi Gagal!");
        lcdLine(1, "Cek koneksi");
    }
}

// =====================================================
// Config Portal (Web - captive portal sendiri)
// =====================================================

const char PORTAL_HTML[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Konfigurasi Absensi RFID</title>
<style>
body{font-family:sans-serif;max-width:420px;margin:24px auto;padding:0 14px;color:#111}
h1{font-size:20px}code{background:#f3f4f6;padding:2px 6px;border-radius:4px}
label{font-weight:600;font-size:13px}
input{width:100%;box-sizing:border-box;padding:11px;margin:5px 0 12px;border:1px solid #ccc;border-radius:6px;font-size:15px}
button{width:100%;padding:13px;background:#2563eb;color:#fff;border:0;border-radius:6px;font-size:16px}
small{color:#666}
</style>
</head>
<body>
<h1>Konfigurasi Absensi RFID</h1>
<form method="POST" action="/save">
  <label>WiFi SSID</label>
  <input name="ssid" required placeholder="Nama WiFi">
  <label>WiFi Password</label>
  <input name="pass" type="password" placeholder="Password WiFi">
  <label>Server URL</label>
  <input name="server" required placeholder="http://192.168.1.100:8000">
  <label>API Key</label>
  <input name="apikey" required placeholder="API Key backend">
  <button type="submit">Simpan &amp; Restart</button>
</form>
<small>Setelah disimpan, alat restart sendiri dan langsung terkoneksi. LCD akan menampilkan status.</small>
</body>
</html>
)rawliteral";

void loadAppConfig() {
    apiBaseUrl = appConfig.serverUrl();
    apiKey     = appConfig.apiKey();
    Serial.printf("[CFG] WiFi: %s | Server: %s | Key: %s%s\n",
        appConfig.ssid().length() > 0 ? appConfig.ssid().c_str() : "(kosong)",
        apiBaseUrl.length() > 0 ? apiBaseUrl.c_str() : "(kosong)",
        apiKey.length() > 0 ? apiKey.c_str() : "(kosong)",
        appConfig.isConfigured() ? "" : " [BELUM DIKONFIGURASI]");
}

void handlePortalRoot() {
    Serial.println("[PORTAL] HTTP GET / diterima");
    portalServer.send(200, "text/html", FPSTR(PORTAL_HTML));
}

void handlePortalSave() {
    appConfig.setAll(
        portalServer.arg("ssid").c_str(),
        portalServer.arg("pass").c_str(),
        portalServer.arg("server").c_str(),
        portalServer.arg("apikey").c_str());
    Serial.println("[CFG] Konfigurasi disimpan. Restart...");
    portalServer.send(200, "text/html",
        "<html><body style='font-family:sans-serif;text-align:center;margin-top:80px'>"
        "<h2>Tersimpan</h2><p>Alat akan restart & terhubung ke backend...</p></body></html>");
    delay(600);
    ESP.restart();
}

// Aktifkan captive portal (idempotent). Server terus hidup sampai
// config tersimpan (restart) atau WiFi berhasil connect.
void startConfigPortal() {
    if (portalActive) return;

    Serial.println("[CFG] AP: '" CONFIG_AP_NAME "' -> http://192.168.4.1");
    if (lcdPresent) {
        lcd.clear();
        lcdLine(0, "SET KONFIG");
        lcdLine(1, "192.168.4.1");
    }
    beep(2, 150, 120);

    WiFi.mode(WIFI_AP);
    WiFi.softAP(CONFIG_AP_NAME);

    dnsServer.start(53, "*", portalIP);
    portalServer.on("/", HTTP_GET, handlePortalRoot);
    portalServer.on("/save", HTTP_POST, handlePortalSave);
    portalServer.begin();
    portalActive = true;
    Serial.println("[PORTAL] WebServer siap di port 80");
}

// Dipanggil terus di loop(): service HTTP + DNS selama portal aktif
void servicePortal() {
    if (!portalActive) return;
    dnsServer.processNextRequest();
    portalServer.handleClient();
}

// =====================================================
// Listener Admin LAN (port 8080)
// Dipanggil backend/web admin buat set config tanpa portal.
// GET  /status -> info device
// POST /config -> terima {server_url, api_key} lalu restart
// =====================================================
void handleConfigStatus() {
    JsonDocument doc;
    doc["device"] = "AbsensiRFID-ESP32";
    doc["chip"] = String(ESP.getChipModel());
    doc["mac"] = WiFi.macAddress();
    doc["ip"] = WiFi.localIP().toString();
    doc["uptime_s"] = millis() / 1000;
    doc["configured"] = appConfig.isConfigured();
    doc["server"] = appConfig.serverUrl();
    doc["key_set"] = appConfig.apiKey().length() > 0;
    String out;
    serializeJson(doc, out);
    configSrv.send(200, "application/json", out);
}

void handleConfigSet() {
    // otorisasi: header X-API-Key harus cocok dengan key yang tersimpan
    String real = appConfig.apiKey();
    if (real.length() > 0) {
        String clientKey = configSrv.hasHeader("X-API-Key") ? configSrv.header("X-API-Key") : "";
        if (clientKey != real) {
            configSrv.send(403, "application/json",
                "{\"success\":false,\"message\":\"API key salah.\"}");
            return;
        }
    }

    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, configSrv.arg("plain"));
    if (err) {
        configSrv.send(400, "application/json",
            "{\"success\":false,\"message\":\"JSON body tidak valid.\"}");
        return;
    }

    const char* server = doc["server_url"] | "";
    const char* key    = doc["api_key"] | "";

    if (String(server).length() == 0) {
        configSrv.send(400, "application/json",
            "{\"success\":false,\"message\":\"server_url wajib diisi.\"}");
        return;
    }

    appConfig.setServer(server, key);
    Serial.printf("[CFG] Konfigurasi dari admin LAN: server=%s key=%s -> restart\n",
        server, String(key).length() > 0 ? "OK" : "kosong");

    configSrv.send(200, "application/json",
        "{\"success\":true,\"message\":\"Konfigurasi diterima, restart...\"}");
    delay(500);
    ESP.restart();
}

bool connectStoredWiFi() {
    if (WiFi.status() == WL_CONNECTED) return true;
    String ssid = appConfig.ssid();
    if (ssid.length() == 0) return false;

    Serial.printf("Menghubungkan WiFi: %s\n", ssid.c_str());
    WiFi.mode(WIFI_STA);
    int scanCount = WiFi.scanNetworks();
    Serial.printf("[WIFI] scan=%d\n", scanCount);
    for (int i = 0; i < scanCount; i++) {
        if (WiFi.SSID(i) == ssid) {
            Serial.printf("[WIFI] target rssi=%d ch=%d enc=%d\n",
                WiFi.RSSI(i), WiFi.channel(i), (int)WiFi.encryptionType(i));
        }
    }
    WiFi.scanDelete();
    Serial.printf("[WIFI] begin ssid=%s pass_len=%u\n", ssid.c_str(), appConfig.password().length());
    WiFi.begin(ssid.c_str(), appConfig.password().c_str());

    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_TIMEOUT_MS) {
        delay(250);
        Serial.print(".");
    }
    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("WiFi connected! IP: %s\n", WiFi.localIP().toString().c_str());
        return true;
    }
    Serial.println("WiFi connection failed!");
    return false;
}

void ensureWifi() {
    if (WiFi.status() == WL_CONNECTED) {
        // WiFi konek -> matikan portal, biar device fokus ke absensi
        if (portalActive) {
            dnsServer.stop();
            portalServer.stop();
            portalActive = false;
            WiFi.mode(WIFI_STA);
            Serial.println("[CFG] WiFi terhubung, portal dimatikan");
        }
        wifiLostStart = 0;
        return;
    }

    // Portal aktif: jangan WiFi.mode(WIFI_STA) / reconnect — itu mematikan softAP
    // padahal portalActive masih true, jadi AP tidak pernah hidup lagi.
    if (portalActive) return;

    if (millis() - lastWifiAttempt < WIFI_RECONNECT_MS) return;
    lastWifiAttempt = millis();

    // Kalau config belum lengkap, jangan spam connect WiFi
    if (appConfig.isConfigured()) {
        connectStoredWiFi();
    }

    // WiFi putus -> hidupkan portal lagi biar bisa isi/ubah konfigurasi
    if (WiFi.status() != WL_CONNECTED && !portalActive) {
        Serial.println("[CFG] WiFi gagal/putus, aktifkan portal konfigurasi");
        startConfigPortal();
    }
}

// =====================================================
// UID to Hex String
// =====================================================
String uidToString(byte *uid, byte size) {
    String result = "";
    for (byte i = 0; i < size; i++) {
        if (uid[i] < 0x10) result += "0";
        result += String(uid[i], HEX);
    }
    result.toUpperCase();
    return result;
}

// =====================================================
// POST to Backend
// =====================================================
String sendAttendance(const String &uid) {
    HTTPClient http;
    String url = apiBaseUrl + "/api/absensi";

    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-API-Key", apiKey);
    http.setTimeout(HTTP_TIMEOUT_MS);

    JsonDocument doc;
    doc["uid"] = uid;
    String body;
    serializeJson(doc, body);

    Serial.printf("POST %s | UID: %s\n", url.c_str(), uid.c_str());
    int httpCode = http.POST(body);

    if (httpCode <= 0) {
        String error = http.errorToString(httpCode);
        Serial.printf("HTTP error: %s\n", error.c_str());
        http.end();
        return "";
    }

    String response = http.getString();
    http.end();

    Serial.printf("HTTP %d: %s\n", httpCode, response.c_str());
    return response;
}

// =====================================================
// Parse & Display Response
// =====================================================
void handleResponse(const String &json) {
    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, json);

    if (err) {
        Serial.printf("JSON parse error: %s\n", err.c_str());
        lcdShowError("Resp. invalid");
        beepError();
        return;
    }

    bool success = doc["success"] | false;
    String message = doc["message"] | "";

    if (!success) {
        lcdShowError(message);
        beepError();
        return;
    }

    String nama    = doc["data"]["nama"] | "";
    String status  = doc["data"]["status"] | "";
    String jamMasuk  = doc["data"]["jam_masuk"] | "";
    String jamPulang = doc["data"]["jam_pulang"] | "";

    // Registrasi kartu murni (admin nunggu tap, kartu belum dikenal) — tidak ada data absensi
    const char *mode = doc["data"]["mode"] | "";
    if (strcmp(mode, "register") == 0 && nama.length() == 0) {
        lcdShowSuccess("UID tersimpan");
        beepSuccess();
        return;
    }

    // Kalau mode=register TAPI kartu sudah milik karyawan -> tetep tampilkan hasil absensinya
    String jam = jamMasuk.length() > 0 ? jamMasuk : jamPulang;

    lcdShowResult(nama, status, jam);

    if (status == "Checkout Berhasil" || status.indexOf("Checkout") >= 0) {
        beepCheckout();
    } else {
        beepSuccess();
    }
}

// =====================================================
// Setup
// =====================================================
void setup() {
    Serial.begin(115200);
    WiFi.onEvent([](WiFiEvent_t event, WiFiEventInfo_t info) {
        if (event == ARDUINO_EVENT_WIFI_STA_DISCONNECTED) {
            Serial.printf("[WIFI] Disconnected reason=%u\n", info.wifi_sta_disconnected.reason);
        } else if (event == ARDUINO_EVENT_WIFI_STA_CONNECTED) {
            Serial.println("[WIFI] Associated");
        } else if (event == ARDUINO_EVENT_WIFI_STA_GOT_IP) {
            Serial.printf("[WIFI] Got IP: %s\n", WiFi.localIP().toString().c_str());
        }
    });
    Serial.println("\n=== Sistem Absensi Karyawan IoT RFID ===");

    appConfig.begin();
    loadAppConfig();

    // Buzzer init — pastikan OFF sesuai tipe trigger (active HIGH/LOW)
    pinMode(BUZZER_PIN, OUTPUT);
    buzzerOff();

    // Tombol BOOT (GPIO0) dipakai buat reset konfigurasi & buka portal
    pinMode(CONFIG_BUTTON_PIN, INPUT_PULLUP);

    Wire.begin(LCD_SDA_PIN, LCD_SCL_PIN);
    Wire.setTimeOut(50);
    delay(200);

    // LCD init (I2C) -> scan full bus biar ketemu address yang benar
    Serial.printf("[I2C] SDA=%d SCL=%d scan 0x03-0x77:\n", LCD_SDA_PIN, LCD_SCL_PIN);
    int found = 0;
    for (byte a = 0x03; a < 0x78; a++) {
        Wire.beginTransmission(a);
        if (Wire.endTransmission() == 0) {
            Serial.printf("  -> 0x%02X FOUND\n", a);
            found++;
        }
    }
    if (!found) Serial.println("  -> tidak ada device");

    Wire.beginTransmission(LCD_ADDRESS);
    lcdPresent = (Wire.endTransmission() == 0);
    Serial.printf("LCD 0x%02X: %s\n", LCD_ADDRESS, lcdPresent ? "Ditemukan" : "Tidak Ada");
    if (!lcdPresent) {
        // coba alamat alternatif 0x3F
        Wire.beginTransmission(0x3F);
        if (Wire.endTransmission() == 0) Serial.println("[HINT] LCD di 0x3F FOUND, ganti LCD_ADDRESS ke 0x3F");
        Wire.beginTransmission(0x3C);
        if (Wire.endTransmission() == 0) Serial.println("[HINT] OLED 0x3C FOUND");
    }
    if (lcdPresent) {
        lcd.init();
        delay(200);
        lcd.backlight();
        delay(100);
        lcd.clear();
        delay(50);
        lcdLine(0, "Sistem Absensi");
        lcdLine(1, "IoT RFID v1.0");
        Serial.println("[LCD] Init OK");
    } else {
        Serial.println("[WARN] LCD tidak terdeteksi, lanjut tanpa LCD");
    }
    delay(1000);

    // Buzzer test
    beep(1, 100, 0);

    // RC522 init
    SPI.begin();
    mfrc522.PCD_Init();
    delay(200);

    byte v = mfrc522.PCD_ReadRegister(mfrc522.VersionReg);
    rfidDetected = (v == 0x91 || v == 0x92 || v == 0x93 || v == 0x82);
    Serial.printf("MFRC522 Version: 0x%02X", v);
    if (v == 0x91 || v == 0x92) {
        Serial.println(" (v2.0)");
    } else if (v == 0x93) {
        Serial.println(" (v3.0)");
    } else {
        Serial.println(" (unknown)");
    }
    if (!rfidDetected) {
        Serial.println("[WARN] RFID tidak terdeteksi, lanjut tanpa RFID");
    }

    // WiFi / Config
    if (OFFLINE_MODE) {
        Serial.println("[MODE] Offline - WiFi skipped");
        lcd.clear();
        lcdLine(0, "Mode OFFLINE");
        lcdLine(1, "Tanpa Server");
        delay(1000);
    } else {
        lcd.clear();
        lcdLine(0, "Hubungkan WiFi");
        lcdLine(1, "AP: AbsensiRFID");  // SSID penuh: AbsensiRFID-Config

        bool wifiOk = false;
        if (!appConfig.isConfigured()) {
            // Config belum diset -> BUKA portal, tetap hidup sampai disimpan
            Serial.println("[CFG] Config belum diset, buka portal web...");
            startConfigPortal();
        } else {
            wifiOk = connectStoredWiFi();
            if (!wifiOk) {
                Serial.println("[CFG] WiFi gagal, buka portal web...");
                startConfigPortal();
            }
        }

        if (portalActive) {
            lcd.clear();
            lcdLine(0, "SET KONFIG");
            lcdLine(1, "192.168.4.1");
        } else if (WiFi.status() == WL_CONNECTED) {
            lcd.clear();
            lcdLine(0, "WiFi Terhubung");
            lcdLine(1, WiFi.localIP().toString());
        } else {
            lcdShowWifiStatus(false);
        }

        delay(1500);
    }

    // Listener konfigurasi via LAN (dipanggil web admin) - cuma mode online
    if (!OFFLINE_MODE) {
        configSrv.on("/status", HTTP_GET, handleConfigStatus);
        configSrv.on("/config", HTTP_POST, handleConfigSet);
        const char* espConfigHeaders[] = {"X-API-Key"};
        configSrv.collectHeaders(espConfigHeaders, 1);
        configSrv.begin();
        Serial.println("[CONF] Listener admin LAN: port 8080 (/status, /config)");
    }
    // Portal aktif: biarkan LCD tetap "SET KONFIGURASI / 192.168.4.1"
    if (!portalActive) {
        lcdShowReady();
    }
}

// =====================================================
// Loop
// =====================================================
void loop() {
    static unsigned long lastPrint = 0;
    if (millis() - lastPrint > 5000) {
        lastPrint = millis();
        Serial.printf("[ALIVE] Uptime: %lus | WiFi: %s | RFID: %s | LCD: %s\n",
            millis() / 1000,
            WiFi.status() == WL_CONNECTED ? "OK" : "NO",
            rfidDetected ? "OK" : "NO",
            lcdPresent ? "OK" : "NO");
    }

    // Tahan tombol BOOT (GPIO0) 5 detik -> reset config & buka portal
    static unsigned long bootBtnHoldStart = 0;
    static bool configResetTriggered = false;
    if (digitalRead(CONFIG_BUTTON_PIN) == LOW) {
        if (bootBtnHoldStart == 0) bootBtnHoldStart = millis();
        if (!configResetTriggered && millis() - bootBtnHoldStart > CONFIG_RESET_HOLD_MS) {
            configResetTriggered = true;
            Serial.println("[CFG] Tombol BOOT 5s -> RESET KONFIGURASI, buka portal");
            if (lcdPresent) {
                lcd.clear();
                lcdLine(0, "RESET CONFIG");
                lcdLine(1, "Buka portal...");
            }
            beep(3, 200, 150);
            appConfig.reset();
            WiFi.disconnect(true);
            delay(300);
            ESP.restart();
        }
    } else {
        bootBtnHoldStart = 0;
    }

    if (!OFFLINE_MODE) {
        servicePortal();
        configSrv.handleClient();
        ensureWifi();
    }

    // Wait for new card
    bool cardPresent = false;
    if (rfidDetected) {
        cardPresent = mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial();
    }

    if (cardPresent && !lastCardPresent) {
        String uid = uidToString(mfrc522.uid.uidByte, mfrc522.uid.size);
        Serial.printf("Card detected: %s\n", uid.c_str());

        lastDisplayedUID = uid;

        if (OFFLINE_MODE) {
            lcdShowOfflineResult(uid);
            beepSuccess();
            Serial.printf("[OFFLINE] Absensi tercatat: %s\n", uid.c_str());
            delay(DISPLAY_DELAY_MS);
            lcdShowReady();
        } else {
            if (WiFi.status() != WL_CONNECTED) {
                lcdShowError("Server offline");
                beepError();
                mfrc522.PICC_HaltA();
                mfrc522.PCD_StopCrypto1();
                delay(DEBOUNCE_DELAY_MS);
                lastCardPresent = false;
                lcdShowReady();
                return;
            }

            lcdShowProcessing();

            String response = sendAttendance(uid);

            if (response.length() > 0) {
                handleResponse(response);
            } else {
                lcdShowError("Server timeout");
                beepError();
            }

            delay(DISPLAY_DELAY_MS);
            lcdShowReady();
        }
    }

    if (!cardPresent && lastCardPresent) {
        delay(DEBOUNCE_DELAY_MS);
    }

    lastCardPresent = cardPresent;

    if (cardPresent && rfidDetected) {
        mfrc522.PICC_HaltA();
        mfrc522.PCD_StopCrypto1();
    }

    delay(50);
}
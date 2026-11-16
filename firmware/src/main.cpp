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
volatile uint8_t wifiLastReason = 0;

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

String wifiReasonText(uint8_t reason) {
    switch (reason) {
        case 200: return "Beacon timeout / sinyal lemah";
        case 201: return "SSID tidak ditemukan / 5GHz";
        case 202: return "Auth gagal / password salah";
        case 203: return "Assoc gagal / router menolak";
        case 204: return "Handshake timeout / WPA3";
        case 205: return "Koneksi gagal";
        case 15:  return "Handshake timeout / password";
        case 2:   return "Auth expired";
        case 3:   return "Auth leave";
        case 4:   return "Assoc expired";
        case 5:   return "Terlalu banyak client";
        case 6:   return "Belum authenticated";
        case 7:   return "Belum associated";
        case 8:   return "Assoc leave";
        case 9:   return "Assoc belum auth";
        case 10:  return "Power capability";
        case 11:  return "Channel tidak didukung";
        case 12:  return "IE invalid";
        case 13:  return "MIC failure";
        case 14:  return "Handshake timeout";
        case 16:  return "Group key timeout";
        case 17:  return "IE 4-way mismatch";
        case 18:  return "IE group key mismatch";
        case 19:  return "IE 4-way invalid";
        default:  return "Kode " + String((unsigned int)reason);
    }
}

String wifiReasonShort(uint8_t reason) {
    switch (reason) {
        case 200: return "Sinyal lemah";
        case 201: return "SSID/5GHz?";
        case 202: return "Password salah";
        case 203: return "Router menolak";
        case 204: return "WPA3/Password";
        case 15:  return "Password/WPA3";
        case 5:   return "Client penuh";
        case 11:  return "Channel?";
        default:  return "Kode " + String((unsigned int)reason);
    }
}

String wifiReasonHint(uint8_t reason) {
    switch (reason) {
        case 200: return "Sinyal lemah atau router tidak merespons. Dekatkan ESP ke router.";
        case 201: return "SSID tidak ditemukan. Pastikan nama WiFi benar dan pakai band 2.4GHz.";
        case 202:
        case 203: return "Auth/assoc gagal. Cek password dan gunakan WPA2, bukan WPA3/enterprise.";
        case 204:
        case 15:  return "Handshake gagal. Coba WPA2 dan pastikan password benar.";
        case 5:   return "Router menolak client baru. Cek batas client atau MAC filtering.";
        default:  return "Cek SSID, password, dan pastikan WiFi 2.4GHz dengan WPA2.";
    }
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
        uint8_t reason = wifiLastReason;
        lcdLine(0, "WiFi Gagal");
        lcdLine(1, reason ? wifiReasonShort(reason) : "Cek koneksi");
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
.err{background:#fee2e2;border:1px solid #fca5a5;color:#991b1b;padding:10px 12px;border-radius:6px;font-size:13px;margin:0 0 14px;line-height:1.45}
.err b{display:block;margin-bottom:4px}
</style>
</head>
<body>
<h1>Konfigurasi Absensi RFID</h1>
{{ERROR}}
<form method="POST" action="/save">
  <label>WiFi SSID</label>
  <input name="ssid" required value="{{SSID}}" placeholder="Nama WiFi">
  <label>WiFi Password</label>
  <input name="pass" type="password" placeholder="Kosongkan jika WiFi tanpa password">
  <label>Server URL</label>
  <input name="server" value="{{SERVER}}" placeholder="http://192.168.1.100:8000">
  <label>API Key</label>
  <input name="apikey" placeholder="Kosongkan untuk memakai API key tersimpan">
  <button type="submit">Simpan &amp; Restart</button>
</form>
<small>Server URL dan API Key cukup diisi sekali. Kosongkan saat ganti WiFi untuk memakai nilai yang sudah tersimpan.</small>
</body>
</html>
)rawliteral";

void loadAppConfig() {
    apiBaseUrl = appConfig.serverUrl();
    apiKey     = appConfig.apiKey();
    Serial.printf("[CFG] WiFi: %s | Server: %s | Key: %s%s\n",
        appConfig.ssid().length() > 0 ? appConfig.ssid().c_str() : "(kosong)",
        apiBaseUrl.length() > 0 ? apiBaseUrl.c_str() : "(kosong)",
        apiKey.length() > 0 ? "OK" : "(kosong)",
        appConfig.isConfigured() ? "" : " [BELUM DIKONFIGURASI]");
}

String htmlEscape(const String &value) {
    String out = value;
    out.replace("&", "&amp;");
    out.replace("<", "&lt;");
    out.replace(">", "&gt;");
    out.replace("\"", "&quot;");
    return out;
}

void handlePortalRoot() {
    Serial.println("[PORTAL] HTTP GET / diterima");

    String page = FPSTR(PORTAL_HTML);
    page.replace("{{SSID}}", htmlEscape(appConfig.ssid()));
    page.replace("{{SERVER}}", htmlEscape(appConfig.serverUrl()));

    uint8_t reason = wifiLastReason;
    String error = "";
    if (reason != 0) {
        String currentSsid = appConfig.ssid();
        if (currentSsid.length() == 0) currentSsid = "(belum diset)";
        error = "<div class='err'><b>Gagal konek WiFi terakhir</b>";
        error += "SSID: " + htmlEscape(currentSsid) + "<br>";
        error += "Kode: " + String((unsigned int)reason) + " - " + wifiReasonText(reason) + "<br>";
        error += "<small>" + wifiReasonHint(reason) + "</small></div>";
    }
    page.replace("{{ERROR}}", error);
    portalServer.send(200, "text/html", page);
}

void handlePortalSave() {
    String ssid = portalServer.arg("ssid");
    String pass = portalServer.arg("pass");
    String server = portalServer.arg("server");
    String key = portalServer.arg("apikey");
    ssid.trim(); server.trim(); key.trim();

    if (ssid.length() == 0) {
        portalServer.send(400, "text/html",
            "<html><body style='font-family:sans-serif;text-align:center;margin-top:80px'>"
            "<h2>SSID wajib diisi</h2></body></html>");
        return;
    }
    if (server.length() == 0 && appConfig.serverUrl().length() == 0) {
        portalServer.send(400, "text/html",
            "<html><body style='font-family:sans-serif;text-align:center;margin-top:80px'>"
            "<h2>Server URL wajib diisi pertama kali</h2></body></html>");
        return;
    }
    if (key.length() == 0 && appConfig.apiKey().length() == 0) {
        portalServer.send(400, "text/html",
            "<html><body style='font-family:sans-serif;text-align:center;margin-top:80px'>"
            "<h2>API Key wajib diisi pertama kali</h2></body></html>");
        return;
    }

    appConfig.setAll(ssid.c_str(), pass.c_str(), server.c_str(), key.c_str());
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
        uint8_t reason = wifiLastReason;
        if (reason != 0) {
            lcd.clear();
            lcdLine(0, "WiFi Gagal");
            lcdLine(1, wifiReasonShort(reason));
            delay(2000);
        }
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
    doc["wifi_ssid"] = appConfig.ssid();
    doc["wifi_status"] = (int)WiFi.status();
    doc["wifi_reason"] = (unsigned int)wifiLastReason;
    doc["wifi_error"] = wifiLastReason ? wifiReasonText(wifiLastReason) : "";
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
    if (WiFi.status() == WL_CONNECTED) {
        wifiLastReason = 0;
        return true;
    }
    String ssid = appConfig.ssid();
    if (ssid.length() == 0) return false;

    wifiLastReason = 0;
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
        wifiLastReason = 0;
        Serial.printf("WiFi connected! IP: %s\n", WiFi.localIP().toString().c_str());
        return true;
    }

    // Event callback biasanya sudah mengisi reason. Ini fallback kalau event
    // tidak sempat tercatat.
    if (wifiLastReason == 0) {
        switch (WiFi.status()) {
            case WL_NO_SSID_AVAIL:  wifiLastReason = 201; break;
            case WL_CONNECT_FAILED: wifiLastReason = 202; break;
            case WL_CONNECTION_LOST: wifiLastReason = 200; break;
            default:                wifiLastReason = 205; break;
        }
    }
    Serial.printf("WiFi connection failed! reason=%u (%s)\n",
        (unsigned int)wifiLastReason, wifiReasonText(wifiLastReason).c_str());
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
            uint8_t reason = info.wifi_sta_disconnected.reason;
            // 3/8 = leave, biasanya muncul saat kita sendiri pindah ke mode AP.
            // Jangan timpa error handshake/password yang sudah tercatat.
            if (!((reason == 3 || reason == 8) && wifiLastReason != 0)) {
                wifiLastReason = reason;
            }
            Serial.printf("[WIFI] Disconnected reason=%u (%s)\n",
                (unsigned int)reason, wifiReasonText(reason).c_str());
        } else if (event == ARDUINO_EVENT_WIFI_STA_CONNECTED) {
            wifiLastReason = 0;
            Serial.println("[WIFI] Associated");
        } else if (event == ARDUINO_EVENT_WIFI_STA_GOT_IP) {
            wifiLastReason = 0;
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

    // Tahan tombol BOOT (GPIO0) 5 detik -> reset WiFi saja & buka portal
    static unsigned long bootBtnHoldStart = 0;
    static bool configResetTriggered = false;
    if (digitalRead(CONFIG_BUTTON_PIN) == LOW) {
        if (bootBtnHoldStart == 0) bootBtnHoldStart = millis();
        if (!configResetTriggered && millis() - bootBtnHoldStart > CONFIG_RESET_HOLD_MS) {
            configResetTriggered = true;
            Serial.println("[CFG] Tombol BOOT 5s -> RESET WIFI (API key tetap), buka portal");
            if (lcdPresent) {
                lcd.clear();
                lcdLine(0, "RESET WIFI");
                lcdLine(1, "Buka portal...");
            }
            beep(3, 200, 150);
            appConfig.clearWifi();
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
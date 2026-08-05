#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <MFRC522.h>
#include <LiquidCrystal_I2C.h>
#include "config.h"

// =====================================================
// Globals
// =====================================================
MFRC522 mfrc522(RC522_SS_PIN, RC522_RST_PIN);
LiquidCrystal_I2C lcd(LCD_ADDRESS, 16, 2);

bool lastCardPresent = false;
unsigned long lastWifiAttempt = 0;
String lastDisplayedUID = "";
bool rfidDetected = false;
bool lcdPresent = false;

// =====================================================
// Buzzer Helpers
// =====================================================
void beep(int count, int onMs = 150, int offMs = 100) {
    for (int i = 0; i < count; i++) {
        digitalWrite(BUZZER_PIN, HIGH);
        delay(onMs);
        digitalWrite(BUZZER_PIN, LOW);
        if (i < count - 1) delay(offMs);
    }
}

void beepSuccess()  { beep(1, 150, 0); }
void beepCheckout() { beep(2, 120, 80); }
void beepError()    { beep(3, 80, 60); }

// =====================================================
// LCD Helpers
// =====================================================
void lcdLine(int row, const String &text) {
    if (!lcdPresent) return;
    lcd.setCursor(0, row);
    lcd.print("                ");
    lcd.setCursor(0, row);
    lcd.print(text.substring(0, 16));
}

void lcdShowReady() {
    Serial.println("[LCD] Ready - Tempel Kartu RFID");
    if (!lcdPresent) return;
    lcd.clear();
    lcdLine(0, "Sistem Absensi");
    lcdLine(1, "IoT RFID");
    delay(800);
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
    String displayName = nama.length() > 16 ? nama.substring(0, 16) : nama;
    lcdLine(0, displayName);
    String detail = status + " " + jam;
    lcdLine(1, detail.length() > 16 ? detail.substring(0, 16) : detail);
}

void lcdShowError(const String &msg) {
    Serial.printf("[LCD] ERROR: %s\n", msg.c_str());
    if (!lcdPresent) return;
    lcd.clear();
    lcdLine(0, "GAGAL");
    lcdLine(1, msg.length() > 16 ? msg.substring(0, 16) : msg);
}

void lcdShowOfflineResult(const String &uid) {
    Serial.printf("[LCD] Offline - UID: %s\n", uid.c_str());
    if (!lcdPresent) return;
    lcd.clear();
    lcdLine(0, "Terkoneksi!");
    String shortUid = uid.length() > 16 ? uid.substring(0, 16) : uid;
    lcdLine(1, shortUid);
}

void lcdShowWifiStatus(bool connected) {
    if (!lcdPresent) return;
    lcd.clear();
    if (connected) {
        lcdLine(0, "WiFi Terhubung");
        lcdLine(1, WiFi.SSID());
    } else {
        lcdLine(0, "WiFi Gagal!");
        lcdLine(1, "Cek Koneksi...");
    }
}

// =====================================================
// WiFi
// =====================================================
bool connectWifi() {
    Serial.printf("Connecting to WiFi: %s\n", WIFI_SSID);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

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
    if (WiFi.status() == WL_CONNECTED) return;
    if (millis() - lastWifiAttempt < WIFI_RECONNECT_MS) return;
    lastWifiAttempt = millis();
    connectWifi();
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
    String url = String(API_BASE_URL) + "/api/absensi";

    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-API-Key", API_KEY);
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
        lcdShowError("Response Invalid");
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
    Serial.println("\n=== Sistem Absensi Karyawan IoT RFID ===");

    // Buzzer init
    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, LOW);

    // LCD init
    Wire.begin(LCD_SDA_PIN, LCD_SCL_PIN);
    delay(200);
    Wire.beginTransmission(LCD_ADDRESS);
    lcdPresent = (Wire.endTransmission() == 0);
    Serial.printf("LCD 0x%02X: %s\n", LCD_ADDRESS, lcdPresent ? "Ditemukan" : "Tidak Ada");
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

    // WiFi
    if (OFFLINE_MODE) {
        Serial.println("[MODE] Offline - WiFi skipped");
        lcd.clear();
        lcdLine(0, "Mode OFFLINE");
        lcdLine(1, "Tanpa Server");
        delay(1000);
    } else {
        lcd.clear();
        lcdLine(0, "Hubungkan WiFi");
        lcdLine(1, WIFI_SSID);

        bool wifiOk = connectWifi();
        lcdShowWifiStatus(wifiOk);

        if (!wifiOk) {
            lcd.clear();
            lcdLine(0, "WiFi Gagal!");
            lcdLine(1, "Retrying...");
        }

        delay(1000);
    }
    lcdShowReady();
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

    if (!OFFLINE_MODE) {
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
                lcdShowError("Server Offline");
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
                lcdShowError("Server Tidak Merespon");
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

#pragma once
#include <Arduino.h>
#include <Preferences.h>
#include "config.h"

// =====================================================
// AppConfig - Config Manager (NVS)
// Menyimpan SSID WiFi, password, Server URL & API Key
// di flash ESP32 (tahan reboot).
// =====================================================

class AppConfig {
public:
    void begin() {
        _prefs.begin("appcfg", false);
        _ssid      = _prefs.getString("ssid", "");
        _password  = _prefs.getString("pass", "");
        _serverUrl = _prefs.getString("server", "");
        _apiKey    = _prefs.getString("apikey", "");
        _prefs.end();

        // Bersihkan placeholder biar dianggap belum diatur
        if (_serverUrl == "http://192.168.4.1") _serverUrl = "";
        if (_apiKey == "YOUR_API_KEY_HERE")     _apiKey = "";

        // Fallback (kosong = wajib set lewat portal web)
        if (_serverUrl.length() == 0) _serverUrl = String(FALLBACK_API_BASE_URL);
        if (_apiKey.length() == 0)    _apiKey    = String(FALLBACK_API_KEY);
    }

    // Lengkap = ada WiFi, server URL, dan API key
    bool isConfigured() const {
        return _ssid.length() > 0 && _serverUrl.length() > 0 && _apiKey.length() > 0;
    }

    String ssid()      const { return _ssid; }
    String password()  const { return _password; }
    String serverUrl() const { return _serverUrl; }
    String apiKey()    const { return _apiKey; }

    void setAll(const char* ssid, const char* pass, const char* server, const char* key) {
        String s = String(ssid);
        String p = String(pass);
        String u = String(server);
        String k = String(key);
        s.trim(); p.trim(); u.trim(); k.trim();

        _ssid = s; _password = p; _serverUrl = u; _apiKey = k;

        _prefs.begin("appcfg", false);
        if (_ssid.length() > 0)      _prefs.putString("ssid", _ssid);
        if (_password.length() > 0)  _prefs.putString("pass", _password);
        if (_serverUrl.length() > 0) _prefs.putString("server", _serverUrl);
        if (_apiKey.length() > 0)    _prefs.putString("apikey", _apiKey);
        _prefs.end();
    }

    // Update hanya server URL & API key (WiFi tidak berubah)
    void setServer(const char* url, const char* key) {
        String u = String(url);
        String k = String(key);
        u.trim(); k.trim();

        if (u.length() > 0) _serverUrl = u;
        if (k.length() > 0) _apiKey = k;

        _prefs.begin("appcfg", false);
        if (u.length() > 0) _prefs.putString("server", _serverUrl);
        if (k.length() > 0) _prefs.putString("apikey", _apiKey);
        _prefs.end();
    }

    void reset() {
        _prefs.begin("appcfg", false);
        _prefs.clear();
        _prefs.end();
        _ssid = _password = _serverUrl = _apiKey = "";
    }

private:
    Preferences _prefs;
    String _ssid;
    String _password;
    String _serverUrl;
    String _apiKey;
};
/*
 * SEERS earthquake sensor — ESP8266 (NodeMCU) + MPU6050
 *
 * Reads acceleration from the MPU6050 and POSTs a JSON reading to the SEERS
 * Node backend every ~500 ms:
 *   POST http://<SERVER_IP>:4000/ingest/reading
 *   Header: x-device-token: <DEVICE_TOKEN>
 *   Body:   {"deviceId":"esp8266-01","x":0.01,"y":-0.02,"z":1.00}
 *
 * Values are in g (1 g ~= 9.81 m/s^2). Z rests near 1.0 due to gravity; the
 * server derives peak deviation and magnitude.
 *
 * Libraries (install via Arduino Library Manager):
 *   - Adafruit MPU6050
 *   - Adafruit Unified Sensor
 * Board: "NodeMCU 1.0 (ESP-12E Module)" via the ESP8266 board package.
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

// ---- CONFIGURE THESE ----
const char* WIFI_SSID     = "Arjay";
const char* WIFI_PASSWORD = "Arjay1217!";
const char* SERVER_URL    = "http://10.59.101.41:4000/ingest/reading";
const char* DEVICE_TOKEN  = "seers-device-token";  // must match server/.env
const char* DEVICE_ID     = "esp8266-01";
const unsigned long POST_INTERVAL_MS = 500;
// -------------------------

Adafruit_MPU6050 mpu;
unsigned long lastPost = 0;
const float G = 9.80665f;  // m/s^2 per g

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }
  Serial.print("\nConnected. IP: ");
  Serial.println(WiFi.localIP());
}

void setup() {
  Serial.begin(115200);
  Wire.begin(D2, D1); // SDA=D2, SCL=D1 on NodeMCU
  if (!mpu.begin()) {
    Serial.println("MPU6050 not found! Check wiring.");
    while (true) delay(1000);
  }
  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  connectWiFi();
}

void postReading(float x, float y, float z) {
  if (WiFi.status() != WL_CONNECTED) { connectWiFi(); return; }
  WiFiClient client;
  HTTPClient http;
  http.begin(client, SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-token", DEVICE_TOKEN);

  char body[128];
  snprintf(body, sizeof(body),
           "{\"deviceId\":\"%s\",\"x\":%.4f,\"y\":%.4f,\"z\":%.4f}",
           DEVICE_ID, x, y, z);

  int code = http.POST((uint8_t*)body, strlen(body));
  if (code <= 0) Serial.printf("POST failed: %s\n", http.errorToString(code).c_str());
  http.end();
}

void loop() {
  unsigned long now = millis();
  if (now - lastPost < POST_INTERVAL_MS) return;
  lastPost = now;

  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  // Convert m/s^2 -> g
  float x = a.acceleration.x / G;
  float y = a.acceleration.y / G;
  float z = a.acceleration.z / G;

  postReading(x, y, z);
}

import React, { useState, useEffect, useRef } from "react";
import { 
  Database, Code, Cpu, Wifi, AlertTriangle, Bluetooth,
  CheckCircle, Bell, Clock, Copy, Shield, Sparkles, AlertCircle, RefreshCw
} from "lucide-react";
import { Device } from "../types";
import { subscribeToGasSensor } from "../firebase";

interface FirebaseBridgeProps {
  devices: Device[];
  lang: "ar" | "en";
  activeDevice: Device;
}

export default function FirebaseBridge({ devices, lang, activeDevice }: FirebaseBridgeProps) {
  const isAr = lang === "ar";
  const [copiedCode, setCopiedCode] = useState(false);
  
  // Realtime States (Firebase WiFi)
  const [liveData, setLiveData] = useState<{ level: number; status: string; lastUpdate: number } | null>(null);
  const [connState, setConnState] = useState<"connecting" | "connected" | "error">("connecting");
  const [errMessage, setErrMessage] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [localToast, setLocalToast] = useState<{ message: string; type: "safe" | "warning" | "danger" } | null>(null);

  // BLE Direct Link States
  const [bleState, setBleState] = useState<"disconnected" | "scanning" | "connected" | "unsupported">("disconnected");
  const [bleDevice, setBleDevice] = useState<any>(null);
  const [bleGasLevel, setBleGasLevel] = useState<number | null>(null);
  const [bleCharacteristic, setBleCharacteristic] = useState<any>(null);

  // Selected Channel Tab - either "firebase" or "ble"
  const [activeChannel, setActiveChannel] = useState<"firebase" | "ble">("firebase");

  // Monitor level shifts to send notifications
  const lastLevelRef = useRef<number | null>(null);

  // Check if Web Bluetooth is supported
  useEffect(() => {
    if (typeof navigator !== "undefined" && !(navigator as any).bluetooth) {
      setBleState("unsupported");
    }
  }, []);

  // HTML5 Notification Permission Check
  useEffect(() => {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        setNotificationsEnabled(true);
      }
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      alert(isAr ? "متصفحك لا يدعم الإشعارات البرمجية" : "This browser does not support notifications.");
      return;
    }
    
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setNotificationsEnabled(true);
        triggerLocalToast(
          isAr ? "تم تفعيل الإشعارات الفورية بنجاح! 🔔" : "Instant notifications activated successfully! 🔔",
          "safe"
        );
      } else {
        setNotificationsEnabled(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const triggerLocalToast = (message: string, type: "safe" | "warning" | "danger") => {
    setLocalToast({ message, type });
    setTimeout(() => setLocalToast(null), 5000);
  };

  // Web BLE connect function
  const connectToBle = async () => {
    if (typeof navigator === "undefined" || !(navigator as any).bluetooth) {
      alert(isAr ? "متصفحك الحالي لا يدعم البلوتوث (يرجى استعمال متصفح Chrome أو Edge)" : "Web Bluetooth is not supported on this browser (Please use Chrome or Edge)");
      return;
    }

    try {
      setBleState("scanning");
      // Use exact credentials matches the new ESP32 source code
      const serviceUuid = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
      const txCharUuid = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ name: "SmartSaver ESP32" }],
        optionalServices: [serviceUuid]
      });

      setBleDevice(device);

      device.addEventListener("gattserverdisconnected", () => {
        setBleState("disconnected");
        setBleGasLevel(null);
        triggerLocalToast(
          isAr ? "⚠️ انقطع اتصال البلوتوث بجهاز SmartSaver" : "⚠️ Bluetooth connection to SmartSaver was lost",
          "warning"
        );
      });

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(serviceUuid);
      const characteristic = await service.getCharacteristic(txCharUuid);

      setBleCharacteristic(characteristic);
      await characteristic.startNotifications();

      setBleState("connected");
      setActiveChannel("ble"); // Switch view to BLE immediately for optimal UX

      triggerLocalToast(
        isAr ? "✅ تم الاتصال المباشر بجهازك عبر البلوتوث بنجاح!" : "✅ Direct Bluetooth connection to device successful!",
        "safe"
      );

      characteristic.addEventListener("characteristicvaluechanged", (event: any) => {
        const valueDecoder = new TextDecoder().decode(event.target.value);
        // ESP32 sends: "Gas: 5.5" or similar
        const gasMatch = valueDecoder.match(/Gas:\s*([0-9.]+)/i);
        if (gasMatch) {
          const parsedLevel = parseFloat(gasMatch[1]);
          setBleGasLevel(parsedLevel);

          // Trigger notifications for crucial updates similar to Firebase
          let currentCat: "safe" | "warning" | "danger" = "safe";
          if (parsedLevel > 50.0) currentCat = "danger";
          else if (parsedLevel >= 6.0) currentCat = "warning";

          const prevLevel = lastLevelRef.current;
          let prevCat: "safe" | "warning" | "danger" = "safe";
          if (prevLevel !== null) {
            if (prevLevel > 50.0) prevCat = "danger";
            else if (prevLevel >= 6.0) prevCat = "warning";
          }

          if (prevLevel === null || currentCat !== prevCat) {
            const msg = isAr 
              ? (currentCat === "danger" 
                 ? `🚨 تسريب خطر جداً (عبر Bluetooth)! القيمة: ${parsedLevel.toFixed(1)}%` 
                 : (currentCat === "warning" ? `⚠️ قراءة مرتفعة للغاز (عبر Bluetooth): ${parsedLevel.toFixed(1)}%` : `✅ قراءة الغاز طبيعية وآمنة.`))
              : (currentCat === "danger"
                 ? `🚨 Severe gas leak (via BLE)! Value: ${parsedLevel.toFixed(1)}%`
                 : (currentCat === "warning" ? `⚠️ Heavy gas alert (via BLE): ${parsedLevel.toFixed(1)}%` : `✅ Air Quality is safe.`));
            
            triggerLocalToast(msg, currentCat);

            if (Notification.permission === "granted") {
              new Notification(isAr ? "تنبيه بلوتوث - المنقذ الذكي" : "BLE Alert - Smart Savior", {
                body: msg,
                tag: "gas_leak_sensor_ble"
              });
            }
          }
          lastLevelRef.current = parsedLevel;
        }
      });

    } catch (err: any) {
      console.error("Bluetooth connection failed", err);
      setBleState("disconnected");
      setBleGasLevel(null);
      // Don't show cancel alert to clutter UI
      if (err.name !== "NotFoundError") {
        alert(isAr ? `خطأ اتصال بلوتوث: ${err.message || err}` : `Bluetooth Error: ${err.message || err}`);
      }
    }
  };

  const disconnectBle = () => {
    if (bleDevice && bleDevice.gatt.connected) {
      bleDevice.gatt.disconnect();
    }
    setBleState("disconnected");
    setBleGasLevel(null);
  };

  // Realtime Database subscription listener
  useEffect(() => {
    setConnState("connecting");
    const unsubscribe = subscribeToGasSensor(
      (data) => {
        setLiveData(data);
        setConnState("connected");
        setErrMessage("");
        
        // Match newly adjusted thresholds:
        // danger: level > 50.0
        // warning: level >= 6.0 && <= 50.0
        // safe: level < 6.0
        const level = data.level;
        const prevLevel = lastLevelRef.current;
        
        let currentCat: "safe" | "warning" | "danger" = "safe";
        if (level > 50.0) currentCat = "danger";
        else if (level >= 6.0) currentCat = "warning";
        
        let prevCat: "safe" | "warning" | "danger" = "safe";
        if (prevLevel !== null) {
          if (prevLevel > 50.0) prevCat = "danger";
          else if (prevLevel >= 6.0) prevCat = "warning";
        }

        // Trigger notification on change
        if (prevLevel === null || currentCat !== prevCat) {
          let msgAr = "";
          let msgEn = "";
          
          if (currentCat === "danger") {
            msgAr = `🚨 تسريب خطر جداً (تجاوز 50%)! القيمة: ${level.toFixed(1)}% - يرجى تهوية الغرف فوراً!`;
            msgEn = `🚨 Severe gas leak (above 50%)! Value: ${level.toFixed(1)}% - Ventilate rooms immediately!`;
          } else if (currentCat === "warning") {
            msgAr = `⚠️ تنبيه تحذيري (تجاوز 6.0%): ارتفاع طفيف بالغاز. القيمة: ${level.toFixed(1)}%`;
            msgEn = `⚠️ Orange advisory (above 6.0%): Mild gas elevation. Value: ${level.toFixed(1)}%`;
          } else {
            msgAr = `✅ الوضع آمن ومستقر: نسبة التلوث طبيعية وآمنة (${level.toFixed(1)}%).`;
            msgEn = `✅ Status is safe and stable: Gas levels normal (${level.toFixed(1)}%).`;
          }

          const notificationMsg = isAr ? msgAr : msgEn;
          triggerLocalToast(notificationMsg, currentCat);

          // Web Push Notification Trigger
          if (Notification.permission === "granted") {
            new Notification(isAr ? "نظام المنقذ الذكي للأمان" : "Smart Savior Air Guard", {
              body: notificationMsg,
              icon: "/favicon.ico",
              tag: "gas_leak_sensor"
            });
          }
        }
        
        // Only update Firebase ref if active tab isn't showing active BLE data to prevent conflict
        if (activeChannel === "firebase") {
          lastLevelRef.current = level;
        }
      },
      (err) => {
        console.error("Firebase subscription error in UI:", err);
        setConnState("error");
        setErrMessage(err.message || String(err));
      }
    );

    return () => {
      unsubscribe();
    };
  }, [lang, activeChannel]);

  // Copy C++ Sketch helper matches the new code exactly!
  const arduinoCode = `// --- إعدادات ومكتبات مشروع المنقذ الذكي للاكتشاف والإنذار المبكر ---
#include <WiFi.h>
#include <FirebaseESP32.h>
#include <WiFiManager.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// --- إعدادات Firebase ---
#define API_KEY "AIzaSyDo09di_vPt-rRSYbg9K_cV-mND0dZ6Sd0"
#define DATABASE_URL "https://smartsaver-7d551-default-rtdb.firebaseio.com/"
#define USER_EMAIL "esp32@smartsaver.com"
#define USER_PASSWORD "12345678"

// --- إعدادات BLE ---
// هذه القيم متطابقة مع تطبيق ذكاء المنقذ الذكي
#define SERVICE_UUID           "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
#define CHARACTERISTIC_UUID_TX "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"

// --- الدبابيس (Pins) ---
#define BUTTON_PIN 32
const int gasPin = 34; // منفذ المستشعر AQ135
const int buzzerPin = 25; // جرس الإنذار الصوتي
const int greenLed = 12; // المؤشر الآمن (أقل من 6%)
const int orangeLed = 14; // المؤشر التنبيهي (من 6% للمتوسط)
const int redLed = 27; // المؤشر الخطير (أعلى من 50%)

// --- المتغيرات العامة ---
FirebaseData firebaseData;
FirebaseAuth auth;
FirebaseConfig config;

BLEServer* pServer = NULL;
BLECharacteristic* pTxCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;

unsigned long buttonPressTime = 0;
bool isMuted = false;
unsigned long lastFirebaseSendTime = 0;
unsigned long lastBLESendTime = 0;
float lastSentGas = -1.0;
float currentGas = 0.0;

// --- كلاس بلوتوث لإدارة اتصال الأجهزة ---
class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
    };

    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
    }
};

void tokenStatusCallback(TokenInfo info) {
  if (info.status == token_status_error) {
    Serial.println("Firebase Token Error!");
  }
}

void setup() {
  Serial.begin(115200);

  // 1. إعداد المنافذ للخرج والدخل
  pinMode(buzzerPin, OUTPUT);
  pinMode(greenLed, OUTPUT); 
  pinMode(orangeLed, OUTPUT); 
  pinMode(redLed, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  
  // إعداد زر الإيقاظ من النوم العميق
  esp_sleep_enable_ext0_wakeup((gpio_num_t)BUTTON_PIN, 0);

  // 2. إعداد الواي فاي اللاسلكي التلقائي
  WiFiManager wm;
  wm.setConfigPortalTimeout(180); // مهلة البوابة 3 دقائق
  if (!wm.autoConnect("Gas_Sensor_Setup")) {
    Serial.println("Failed to connect and hit timeout");
    ESP.restart();
  }

  // 3. إعداد الاتصال مع Firebase RTDB
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;
  config.token_status_callback = tokenStatusCallback;
  
  Firebase.reconnectWiFi(true);
  firebaseData.setResponseSize(1024);
  Firebase.begin(&config, &auth);

  // 4. إعداد البلوتوث منخفض الطاقة BLE للاتصال المباشر مع صفحة الويب
  BLEDevice::init("SmartSaver ESP32");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());
  
  BLEService *pService = pServer->createService(SERVICE_UUID);
  pTxCharacteristic = pService->createCharacteristic(
                        CHARACTERISTIC_UUID_TX,
                        BLECharacteristic::PROPERTY_NOTIFY
                      );
                      
  pTxCharacteristic->addDescriptor(new BLE2902());
  pService->start();
  
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);  
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("System Ready! WiFi & BLE Active.");
}

void loop() {
  // --- أ- قراءة الحساس وتحديث ليدات الحالة فوراً ---
  int val = analogRead(gasPin);
  currentGas = (val / 4095.0) * 100.0;

  // منطق ليدات الحالة الجديد والألوان (<6% آمن، 6%-50% تحذير، >50% خطر)
  if (currentGas > 50.0) { 
    digitalWrite(redLed, HIGH); 
    digitalWrite(orangeLed, LOW); 
    digitalWrite(greenLed, LOW);
  } else if (currentGas >= 6.0) {
    digitalWrite(redLed, LOW); 
    digitalWrite(orangeLed, HIGH); 
    digitalWrite(greenLed, LOW);
  } else {
    digitalWrite(redLed, LOW); 
    digitalWrite(orangeLed, LOW); 
    digitalWrite(greenLed, HIGH);
  }

  // --- ب- منطق جرس الإنذار (الصوت) المتقطع ---
  if (currentGas >= 6.0 && !isMuted) {
    int rate = (currentGas > 50.0) ? 150 : 600;
    if ((millis() % rate) < (rate / 2)) {
      digitalWrite(buzzerPin, HIGH);
    } else {
      digitalWrite(buzzerPin, LOW);
    }
  } else { 
    digitalWrite(buzzerPin, LOW); 
  }

  // --- ج- إرسال البيانات المجمعة إلى Firebase كل 5 ثواني أو تغير حاد ---
  if (millis() - lastFirebaseSendTime > 5000 || abs(currentGas - lastSentGas) > 2.0) {
    lastFirebaseSendTime = millis();
    lastSentGas = currentGas;
    
    FirebaseJson json;
    json.set("level", currentGas);
    json.set("status", currentGas > 50.0 ? "danger" : (currentGas >= 6.0 ? "warning" : "safe"));
    json.set("last_update", millis());
    
    if (Firebase.set(firebaseData, "/home/gas_sensor", json)) {
       Serial.println("Firebase updated successfully");
    } else {
       Serial.println(firebaseData.errorReason());
    }
  }

  // --- د- إرسال البيانات فوراً عبر الـ BLE للبلوتوث المباشر ---
  if (deviceConnected) {
      if (millis() - lastBLESendTime > 500) {
        lastBLESendTime = millis();
        // صيغة ترميز الرسالة: "Gas: 12.3"
        String dataStr = "Gas: " + String(currentGas, 1);
        pTxCharacteristic->setValue((uint8_t*)dataStr.c_str(), dataStr.length());
        pTxCharacteristic->notify();
        Serial.print("BLE Stream Sent: "); Serial.println(dataStr);
      }
  }

  // --- هـ- إدارة حالة اتصال البلوتوث وخمول الأجهزة ---
  if (!deviceConnected && oldDeviceConnected) {
      delay(500); 
      pServer->startAdvertising(); 
      Serial.println("BLE advertising restarted.");
      oldDeviceConnected = deviceConnected;
  }
  
  if (deviceConnected && !oldDeviceConnected) {
      oldDeviceConnected = deviceConnected;
      Serial.println("BLE Companion linked!");
  }

  // --- و- فحص حالة الزر المادي (كتم المؤشر أو النوم العميق) ---
  if (digitalRead(BUTTON_PIN) == LOW) {
    if (buttonPressTime == 0) buttonPressTime = millis();
    if (millis() - buttonPressTime > 3000) {
      Serial.println("Going to Sleep mode...");
      digitalWrite(greenLed, LOW); digitalWrite(orangeLed, LOW); digitalWrite(redLed, LOW);
      esp_deep_sleep_start();
    }
  } else {
    if (buttonPressTime > 0 && (millis() - buttonPressTime < 1000)) {
      isMuted = !isMuted;
      Serial.println(isMuted ? "Audio Muted" : "Audio Unmuted");
    }
    buttonPressTime = 0;
  }

  delay(20);
}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(arduinoCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  // Determine current display value based on selected tab
  const isBleActive = activeChannel === "ble" && bleGasLevel !== null;
  const displayLevel = isBleActive ? (bleGasLevel ?? 0) : (liveData?.level ?? 0);
  const displayStatus = isBleActive 
    ? (displayLevel > 50.0 ? "danger" : (displayLevel >= 6.0 ? "warning" : "safe"))
    : (liveData?.status ?? "unknown");
  
  // Custom metadata matches the values
  const currentLastUpdate = liveData?.lastUpdate ?? 0;

  // Compute colors, alerts, levels based on the new ESP32 thresholds logic
  // Safe: < 6.0%, Warning: 6.0% - 50.0%, Danger: > 50.0%
  let statusColorClass = "text-emerald-400 border-emerald-500/20 bg-emerald-500/5";
  let statusRingClass = "border-emerald-500";
  let statusTextAr = "الوضع آمن ومستقر جداً (< 6%)";
  let statusTextEn = "Safe & Clear (< 6%)";
  let cardClass = "border-emerald-500/20 shadow-emerald-950/20";
  let statusTextDescAr = "نسب الغاز طبيعية تماماً. الأجواء منعشة وصحية داخل الغرفة.";
  let statusTextDescEn = "Gas levels are perfectly safe. Free of pollutants.";

  if (displayLevel > 50.0) {
    statusColorClass = "text-red-500 border-red-500/30 bg-red-500/5 animate-pulse";
    statusRingClass = "border-red-500 shadow-[0_0_18px_rgba(239,68,68,0.3)] animate-pulse";
    statusTextAr = "تسريب غاز خطير🚨 (أعلى من 50%)";
    statusTextEn = "Dangerous Leak🚨 (Above 50%)";
    cardClass = "border-red-500/30 shadow-red-950/30 shadow-lg ring-1 ring-red-500/20";
    statusTextDescAr = "خطر شديد! يرجى تهوية المكان فوراً، وإخلاء الغرف، والتحقق من مصادر الغاز.";
    statusTextDescEn = "CRITICAL LIMIT! Ventilate rooms immediately and leave the premises.";
  } else if (displayLevel >= 6.0) {
    statusColorClass = "text-amber-500 border-amber-500/20 bg-amber-500/5";
    statusRingClass = "border-amber-500 shadow-[0_0_12px_rgba(244,117,43,0.2)]";
    statusTextAr = "تحذير: تسريب غاز متوسط (6% - 50%)";
    statusTextEn = "Advisory: Moderate Gas (6% - 50%)";
    cardClass = "border-amber-500/20 shadow-amber-950/20";
    statusTextDescAr = "مؤشر تحذيري برتقالي. جرس الصوت مفعّل ببطء، راقب وصفت الجو أو افتح نافذة.";
    statusTextDescEn = "Advisory Orange alarm. Slow warning beeps. We suggest ventilating.";
  }

  return (
    <div className="space-y-4">
      {/* Local floating notifications to enhance real-time responsiveness */}
      {localToast && (
        <div className={`p-4 border rounded-2xl flex items-center gap-3 transition-all duration-300 shadow-xl border-t-4 ${
          localToast.type === "danger" 
            ? "bg-red-950/95 border-red-500 text-red-100" 
            : localToast.type === "warning"
              ? "bg-amber-950/95 border-amber-500 text-amber-100"
              : "bg-emerald-950/95 border-emerald-500 text-emerald-100"
        }`}>
          {localToast.type === "danger" ? (
            <AlertTriangle className="w-5 h-5 animate-bounce text-red-400" />
          ) : (
            <Bell className="w-5 h-5 animate-bounce text-amber-400" />
          )}
          <div className="flex-1 text-xs font-bold leading-relaxed">{localToast.message}</div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-slate-900/40 p-4 border border-slate-800/80 rounded-2xl font-sans relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
          <div>
            <h3 className="text-sm font-sans font-bold text-white flex items-center gap-1.5 leading-none">
              <Database className="w-4 h-4 text-sky-400" />
              <span>{isAr ? "رابط الجسر الثنائي: Firebase & BLE" : "Dual-Link Bridge: Firebase & BLE"}</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-2">
              {isAr 
                ? "تكامل ذكي كامل يتناسب مع الكود البرمجي الجديد لجهازك المادي، لمزامنة وقراءة البيانات بالوقت الفعلي عبر السحاب أو البلوتوث مباشرة." 
                : "Full system integration completely tailored to your new ESP32 C++ source code supporting WiFi or direct BLE link."}
            </p>
          </div>
          
          <span className="text-[9px] px-2.5 py-0.5 rounded-full font-mono bg-sky-500/10 text-sky-400 font-bold tracking-widest self-start sm:self-center">
            ESP32 COMPANION
          </span>
        </div>
      </div>

      {/* Dual Channel Switch Tabs */}
      <div className="p-1 bg-slate-950 border border-slate-900 rounded-xl grid grid-cols-2 text-center text-xs font-sans font-semibold mb-2">
        <button
          onClick={() => setActiveChannel("firebase")}
          className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeChannel === "firebase" 
              ? "bg-slate-900 text-white shadow-md border-b-2 border-indigo-500" 
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Wifi className="w-4 h-4 text-indigo-400" />
          <span>{isAr ? "قناة السحاب (Firebase WiFi)" : "Cloud Channel (WiFi)"}</span>
        </button>

        <button
          onClick={() => setActiveChannel("ble")}
          className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeChannel === "ble" 
              ? "bg-slate-900 text-white shadow-md border-b-2 border-sky-500" 
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Bluetooth className="w-4 h-4 text-sky-400" />
          <span>{isAr ? "قناة الاتصال القريب (Bluetooth BLE)" : "Direct Local (Bluetooth BLE)"}</span>
        </button>
      </div>

      {/* Connection management banner for selected channel */}
      {activeChannel === "ble" ? (
        <div className="p-4 bg-slate-900/60 rounded-2xl border border-sky-900/40 font-sans flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              bleState === "connected" ? "bg-sky-500/25 text-sky-400 animate-pulse" : "bg-slate-950 text-slate-500"
            }`}>
              <Bluetooth className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">
                {bleState === "connected" 
                  ? (isAr ? "متصل بالبلوتوث حياً بجهازك" : "Linked Direct over BLE")
                  : bleState === "scanning"
                    ? (isAr ? "جاري مسح البلوتوث والربط..." : "Scanning for BLE broadcast...")
                    : (isAr ? "اتصال البلوتوث المباشر معلق" : "Local Direct BLE offline")}
              </h4>
              <p className="text-[10px] text-slate-400 mt-1">
                {isAr 
                  ? "قم بالاقتران بجهازك ESP32 لتحديث العداد حياً وبسرعة كل 500 ملي ثانية بدون إنترنت!"
                  : "Connect to receive immediate sub-second telemetry feed without internet access."}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {bleState === "connected" ? (
              <button
                onClick={disconnectBle}
                className="py-1.5 px-3 bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-500/30 text-xs rounded-xl font-bold cursor-pointer transition-all"
              >
                {isAr ? "قطع الاتصال" : "Disconnect"}
              </button>
            ) : (
              <button
                onClick={connectToBle}
                className="py-1.5 px-4 bg-sky-500 hover:bg-sky-600 text-slate-950 text-xs rounded-xl font-extrabold flex items-center gap-1 cursor-pointer transition-all shadow-lg"
              >
                <RefreshCw className={`w-3 h-3 ${bleState === "scanning" ? "animate-spin" : ""}`} />
                <span>{isAr ? "ابحث عن الحساس (SmartSaver ESP32)" : "Scan SmartSaver ESP32"}</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 bg-slate-900/60 rounded-2xl border border-indigo-900/40 font-sans flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              connState === "connected" ? "bg-indigo-500/25 text-indigo-400 animate-pulse" : "bg-slate-950 text-slate-500"
            }`}>
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">
                {connState === "connected" 
                  ? (isAr ? "موصول بقاعدة البيانات الحية Firebase" : "Subscribed to Firebase Stream")
                  : connState === "connecting"
                    ? (isAr ? "جاري التحقق من اتصال قاعدة البيانات..." : "Validating database channels...")
                    : (isAr ? "قناة الاتصال السحابي معطلة" : "Cloud channel offline")}
              </h4>
              <p className="text-[10px] text-slate-400 mt-1">
                {isAr 
                  ? "يقوم الحساس بإرسال وتعبئة البيانات حياً للمنزل بالكامل عبر شبكة الواي فاي للإنترنت."
                  : "Device transmits raw values from MQ135 to Firebase Realtime node continuously."}
              </p>
            </div>
          </div>

          <button
            onClick={requestNotificationPermission}
            className={`py-1.5 px-3 rounded-xl transition-all shrink-0 flex items-center gap-1.5 ${
              notificationsEnabled 
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" 
                : "bg-slate-950 text-slate-400 border border-slate-800"
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span className="text-[10px] font-sans font-bold">
              {notificationsEnabled 
                 ? (isAr ? "الإشعارات نشطة ✓" : "Alerts Allowed") 
                 : (isAr ? "سماح بإشعارات المتصفح" : "Enable Web Alerts")}
            </span>
          </button>
        </div>
      )}

      {/* Main Stream Realtime Metrics Panel */}
      <div className={`p-5 bg-slate-900/70 backdrop-blur-md rounded-3xl border transition-all duration-300 ${cardClass}`}>
        
        {/* Error notification banner in case Firebase experiences issues */}
        {activeChannel === "firebase" && connState === "error" && (
          <div className="p-3 bg-red-950/40 border border-red-500/20 rounded-xl text-red-300 text-xs font-sans mb-4 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <div>
              <p className="font-bold">{isAr ? "خطأ مزامنة السحاب Firebase:" : "Firebase Synchronization Error:"}</p>
              <p className="text-[10px] font-mono mt-0.5 leading-relaxed">{errMessage}</p>
              <p className="text-[10px] text-slate-400 mt-2">
                {isAr 
                  ? "تأكد من إعداد مستخدم المصادقة ببريد esp32@smartsaver.com مع تفعيل قواعد القراءة والكتابة."
                  : "Ensure Firebase Auth with credentials matches database configurations."}
              </p>
            </div>
          </div>
        )}

        {/* Dashboard grid metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Circular dial tracker */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center py-4 bg-slate-950/50 rounded-2xl border border-slate-950/40">
            <div className={`relative w-36 h-36 rounded-full border-[6px] flex flex-col items-center justify-center transition-all duration-300 ${statusRingClass}`}>
              <span className="text-[10px] text-slate-500 font-bold font-mono tracking-wider">LEVEL</span>
              <span className="text-3xl font-black text-white font-mono mt-1 leading-none">
                {displayLevel.toFixed(1)}%
              </span>
              <span className="text-[9px] text-slate-400 font-mono mt-1.5 font-bold tracking-wider">
                {Math.round((displayLevel / 100) * 4095)} / 4095 ADC
              </span>
              
              {/* Animated pulses when high danger */}
              {displayLevel > 50.0 && (
                <span className="absolute inset-0 border-4 border-red-600 rounded-full animate-ping scale-105 opacity-20" />
              )}
            </div>
            
            <div className={`mt-4 py-1.5 px-4 border rounded-full text-xs font-extrabold font-sans flex items-center gap-1.5 ${statusColorClass}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              <span>{isAr ? statusTextAr : statusTextEn}</span>
            </div>
          </div>

          {/* Contextual telemetry information description */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-950/60 font-sans">
              <h5 className="text-xs font-bold text-white mb-1.5 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-sky-400" />
                <span>{isAr ? "تحليل جودة العينات والمخاطر" : "Air Quality Risk Analysis"}</span>
              </h5>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {isAr ? statusTextDescAr : statusTextDescEn}
              </p>
            </div>

            {/* Threshold limits cheat guide progress bar */}
            <div className="space-y-1.5 font-sans">
              <div className="flex justify-between items-center text-[10px] text-slate-400">
                <span>{isAr ? "لائحة الحدود والألوان والإنذار (ESP32)" : "ESP32 Hardware Threshold Rules"}</span>
                <span className="font-mono text-white text-[9px] font-bold">100% MAX</span>
              </div>
              
              <div className="h-3.5 bg-slate-950 rounded-full flex overflow-hidden border border-slate-900 font-mono text-[9px] text-center font-bold text-black select-none">
                <div className="bg-emerald-500 h-full flex items-center justify-center transition-all shrink-0" style={{ width: "6%" }} title="Safe < 6.0%">
                  &lt;6%
                </div>
                <div className="bg-orange-500 h-full flex items-center justify-center transition-all shrink-0" style={{ width: "44%" }} title="Warning 6.0% - 50.0%">
                  6% - 50%
                </div>
                <div className="bg-red-500 h-full flex items-center justify-center text-white transition-all shrink-0" style={{ width: "50%" }} title="Danger > 50.0%">
                  &gt;50%
                </div>
              </div>

              <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono mt-1">
                <span>🟢 (Led Green)</span>
                <span>🟠 (Led Orange + Buzzer Slow)</span>
                <span>🔴 (Led Red + Buzzer Fast)</span>
              </div>
            </div>

            {/* General Technical Logs Info */}
            <div className="grid grid-cols-2 gap-3 text-xs font-sans font-semibold font-mono">
              <div className="bg-slate-950/30 p-2 border border-slate-900/60 rounded-xl flex flex-col">
                <span className="text-slate-500 text-[10px]">{isAr ? "قناة التوصيل النشطة" : "Active Channel"}:</span>
                <span className="text-white text-[11px] mt-1 flex items-center gap-1 font-sans">
                  {activeChannel === "ble" ? (
                    <>
                      <Bluetooth className="w-3.5 h-3.5 text-sky-400" />
                      <span>Direct BLE Link</span>
                    </>
                  ) : (
                    <>
                      <Wifi className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Firebase WiFi</span>
                    </>
                  )}
                </span>
              </div>

              <div className="bg-slate-950/30 p-2 border border-slate-900/60 rounded-xl flex flex-col">
                <span className="text-slate-500 text-[10px]">{isAr ? "معلومات الوقت والاتصال" : "Pulse / Heartbeat"}:</span>
                <span className="text-slate-300 text-[11px] mt-1 flex items-center gap-1 font-sans">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  {activeChannel === "ble" ? (
                    <span>{bleState === "connected" ? (isAr ? "تغذية مستمرة" : "Live Stream") : (isAr ? "غير متصل" : "Disconnected")}</span>
                  ) : (
                    <span>
                      {currentLastUpdate > 0 
                        ? new Date(currentLastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        : "No updates"}
                    </span>
                  )}
                </span>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Arduino Code Copier instructions */}
      <div className="bg-slate-900/40 p-4 border border-slate-800/80 rounded-2xl text-right font-sans">
        <div className="flex justify-between items-center mb-3">
          <button
            onClick={copyToClipboard}
            className="py-1.5 px-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl text-xs text-sky-400 flex items-center gap-1.5 transition-all cursor-pointer select-none"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold font-sans">
              {copiedCode ? (isAr ? "تم نسخ كود الـ C++" : "C++ Sketch Copied!") : (isAr ? "نسخ كود الـ ESP32 الجديد" : "Copy New C++ Sketch")}
            </span>
          </button>
          
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5 select-none">
            <Code className="w-4 h-4 text-sky-400" />
            <span>{isAr ? "الرمز البرمجي الأصلي للـ ESP32 (WiFi & BLE)" : "Native ESP32 Sketch (WiFi & BLE)"}</span>
          </h4>
        </div>

        <p className="text-[10px] text-slate-400 mb-3.5 leading-relaxed">
          {isAr 
            ? "هذا هو أفضل شفرة C++ برمجية لقطعة ESP32 الخاصة بك مدمجاً بها بلوتوث وواي فاي. يتطابق الكود تماماً مع الحساس المادي، ويقوم بتغذية ليدات الألوان وتوجيه البوق، ومزامنة البيانات في الوقت الحقيقي."
            : "Compilable, production-ready full-stack ESP32 C++ sketch. Built with automatic captive portal configuration, secure Firebase client write procedures, and BLE advertisement profiles."}
        </p>

        <div className="relative max-h-64 overflow-y-auto rounded-xl border border-slate-950 select-text font-mono text-[9px] text-slate-300 p-3.5 text-left bg-black/80 whitespace-pre scrollbar-thin">
          {arduinoCode}
        </div>
      </div>
    </div>
  );
}

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { 
  Device, 
  Reading, 
  SystemAlert, 
  AutomationRule, 
  SystemLog, 
  calculateAqi, 
  getAqiCategory,
  AirStatus
} from "./src/types.js";

// Firebase RTDB imports for live ESP32 integration
import { initializeApp as initFirebase, getApps as getFirebaseApps } from "firebase/app";
import { getAuth as getFirebaseAuth, signInWithEmailAndPassword as signInFirebase } from "firebase/auth";
import { getDatabase as getFirebaseDb, ref as refFirebase, onValue as onValueFirebase } from "firebase/database";

// Initialize Gemini Client
const geminiApiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (geminiApiKey) {
  ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

const app = express();
const PORT = 3000;

app.use(express.json());

// In-Memory Database State
const devices: Device[] = [
  {
    id: "living-room",
    name: "مستشعر المعيشة",
    location: "الصالة الرئيسية",
    roomName: "غرفة الجلوس",
    status: "online",
    lastSeen: new Date().toISOString(),
    sensorValue: 145,
    aqi: calculateAqi(145),
    wifiSignal: "excellent",
    wifiRssi: -45,
    batteryLevel: 88,
    uptime: 12450,
    firmwareVersion: "v2.1.4-beta",
    macAddress: "24:0A:C4:B3:11:0C",
    sensorHealth: "healthy",
    dataTransmission: "active"
  },
  {
    id: "poultry-farm",
    name: "مستشعر العنبر 1",
    location: "مزرعة الدواجن كفر الصالحين",
    roomName: "مستودع الحضانة",
    status: "online",
    lastSeen: new Date().toISOString(),
    sensorValue: 420,
    aqi: calculateAqi(420),
    wifiSignal: "good",
    wifiRssi: -68,
    batteryLevel: 55,
    uptime: 432900,
    firmwareVersion: "v2.1.2",
    macAddress: "4C:11:AE:03:99:AA",
    sensorHealth: "warning",
    dataTransmission: "active"
  },
  {
    id: "warehouse",
    name: "مستشعر المخزن",
    location: "مستودع الشحن الرئيسي",
    roomName: "منطقة فرز الأدوية",
    status: "online",
    lastSeen: new Date().toISOString(),
    sensorValue: 85,
    aqi: calculateAqi(85),
    wifiSignal: "weak",
    wifiRssi: -82,
    batteryLevel: 95,
    uptime: 86400,
    firmwareVersion: "v2.1.3",
    macAddress: "30:AE:A4:07:FF:21",
    sensorHealth: "healthy",
    dataTransmission: "active"
  },
  {
    id: "office-main",
    name: "مستشعر الإدارة",
    location: "مجمع المكاتب",
    roomName: "المكتب الإداري",
    status: "offline",
    lastSeen: new Date(Date.now() - 17 * 60 * 1000).toISOString(), // 17 mins ago
    sensorValue: 0,
    aqi: 0,
    wifiSignal: "none",
    wifiRssi: -100,
    batteryLevel: 0,
    uptime: 0,
    firmwareVersion: "v2.1.3",
    macAddress: "A0:2B:B3:F8:88:99",
    sensorHealth: "critical",
    dataTransmission: "stopped"
  },
  {
    id: "firebase-gas-sensor",
    name: "مستشعر الغاز الفعلي (ESP32)",
    location: "منزل العميل الذكي",
    roomName: "منزلي - شبكة Firebase النشطة",
    status: "offline",
    lastSeen: new Date().toISOString(),
    sensorValue: 0,
    aqi: 0,
    wifiSignal: "good",
    wifiRssi: -55,
    batteryLevel: 100,
    uptime: 0,
    firmwareVersion: "v1.0.0-rtdb",
    macAddress: "32:B4:EF:22:90:DA",
    sensorHealth: "healthy",
    dataTransmission: "active"
  }
];

// Historical Readings Seeding
let readingsHist: Reading[] = [];
const nowTime = Date.now();

// helper to populate historic records for all active devices
devices.forEach(dev => {
  if (dev.status === "offline") return;
  
  // Seed past 24 hours of readings
  for (let i = 24; i > 0; i--) {
    const time = new Date(nowTime - i * 60 * 60 * 1000);
    const baseVal = dev.id === "poultry-farm" ? 380 : dev.id === "warehouse" ? 80 : 130;
    const randOffset = Math.floor(Math.random() * 80) - 40;
    const finalVal = Math.max(20, baseVal + randOffset);
    const calculated = calculateAqi(finalVal);
    
    let state: "safe" | "warning" | "danger" = "safe";
    if (finalVal > 500) state = "danger";
    else if (finalVal > 200) state = "warning";

    readingsHist.push({
      id: `${dev.id}-hist-${i}`,
      deviceId: dev.id,
      sensorValue: finalVal,
      aqi: calculated,
      airStatus: state,
      timestamp: time.toISOString(),
      wifiStatus: dev.wifiSignal,
      deviceStatus: dev.status
    });
  }
});

let systemLogs: SystemLog[] = [
  {
    id: "log-1",
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    level: "info",
    message: "أقلاع ناجح لنظام المنقذ الذكي وبدء مزامنة القنوات وتلقي بيانات ESP32.",
    source: "System"
  },
  {
    id: "log-2",
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    level: "info",
    message: "تم تحديث إعدادات الشبكة ومواءمة معايير أجهزة الاستشعار بنجاح.",
    source: "Admin"
  },
  {
    id: "log-3",
    timestamp: new Date(Date.now() - 17 * 60 * 1000).toISOString(),
    level: "error",
    message: "تحجيم اتصال مستمر لـ مستشعر الإدارة بسبب فقدان تغطية Wi-Fi.",
    source: "System"
  }
];

let alerts: SystemAlert[] = [
  {
    id: "alert-1",
    deviceId: "office-main",
    deviceName: "مستشعر الإدارة",
    type: "device_offline",
    severity: "danger",
    value: 0,
    message: "انقطع الاتصال بجهاز ESP32 في المكتب الإداري تماماً لأكثر من 15 دقيقة.",
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    resolved: false
  },
  {
    id: "alert-2",
    deviceId: "poultry-farm",
    deviceName: "مستشعر العنبر 1",
    type: "air_quality",
    severity: "warning",
    value: 420,
    message: "تجاوز جودة الهواء العتبة المقبولة، مستوى خطر متوسط في مستودع الحضانة.",
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    resolved: false
  }
];

let automationRules: AutomationRule[] = [
  {
    id: "rule-1",
    name: "تنبيه الطوارئ للحالات الحرجة",
    field: "aqi",
    operator: ">",
    value: 200,
    actionType: "emergency",
    actionValue: "تفعيل صفارات الإنذار وإرسال إشعارات طارئة",
    active: true
  },
  {
    id: "rule-2",
    name: "إشعار تفصيلي عند انقطاع الخدمة",
    field: "status",
    operator: "==",
    value: "offline",
    actionType: "notify",
    actionValue: "إرسال إشعار فوري بفقدان إشارة الجهاز",
    active: true
  }
];

// Offline Tracker Helper (Simulation: we keep track of when device was last modified)
const lastUpdatedTimeMap = new Map<string, number>();
devices.forEach(d => lastUpdatedTimeMap.set(d.id, Date.now()));

// SIMULATION SYSTEM ENGINE Run inside server to simulate ESP32 data shifts every 3 seconds
setInterval(() => {
  const acceleratedMinuteRate = 60 * 1000; // 1 actual minute = 60 seconds (accelerated for robust testing!)
  
  devices.forEach(dev => {
    if (dev.status === "offline") {
      // Check if offline recovery simulator is running
      return;
    }
    
    // We only update if simulation is active (not manually frozen)
    const lastUpdate = lastUpdatedTimeMap.get(dev.id) || Date.now();
    const idleSeconds = Date.now() - lastUpdate;
    
    // OFFLINE DETECTIONS (simulated with standard time but allows quick validation)
    // 5 minutes of no payload = Warning Alert
    // 10 minutes of no payload = Critical Alert
    // 15 minutes of no payload = Mark Offline
    // To allow testers to experience this, if developer turns off ESP32 power,
    // we use a test rate of 10s = 5m simulated, 20s = 10m simulated, 30s = 15m offline!
    // We will support a flag on the simulator called "testTimeAcceleration"
    
    // Standard simulation behavior for continuous devices:
    const randomShift = Math.floor(Math.random() * 16) - 8;
    let targetBase = 120;
    if (dev.id === "poultry-farm") targetBase = 390 + Math.floor(Math.random() * 40);
    if (dev.id === "warehouse") targetBase = 70;
    if (dev.id === "living-room") targetBase = 135;

    // Drifting sensor value
    const val = Math.round(Math.max(10, Math.min(1023, dev.sensorValue + randomShift)));
    dev.sensorValue = val;
    dev.aqi = calculateAqi(val);
    dev.uptime += 3;
    dev.lastSeen = new Date().toISOString();
    
    // Log live update
    if (Math.random() < 0.15) {
      systemLogs.unshift({
        id: `sys-log-${Date.now()}-${Math.random()}`,
        timestamp: new Date().toISOString(),
        level: "info",
        message: `تحديث دوري: قراءة ممتصة لمستشعر ${dev.name} بقيمة ${val} PPM.`,
        source: "ESP32"
      });
      if (systemLogs.length > 50) systemLogs.pop();
    }

    // Keep historic reading array trimmed
    readingsHist.push({
      id: `${dev.id}-${Date.now()}`,
      deviceId: dev.id,
      sensorValue: dev.sensorValue,
      aqi: dev.aqi,
      airStatus: dev.sensorValue > 500 ? "danger" : dev.sensorValue > 200 ? "warning" : "safe",
      timestamp: new Date().toISOString(),
      wifiStatus: dev.wifiSignal,
      deviceStatus: dev.status
    });
    if (readingsHist.length > 1000) {
      readingsHist.shift();
    }
  });
}, 3000);


// API Endpoints
app.get("/api/devices", (req, res) => {
  res.json(devices);
});

// Update device configurations / Simulated Controls
app.post("/api/devices/:id/restart", (req, res) => {
  const { id } = req.params;
  const dev = devices.find(d => d.id === id);
  if (!dev) {
    return res.status(404).json({ error: "الجهاز غير موجود" });
  }
  
  dev.status = "offline";
  dev.uptime = 0;
  dev.dataTransmission = "stopped";
  
  systemLogs.unshift({
    id: `log-restart-${Date.now()}`,
    timestamp: new Date().toISOString(),
    level: "warning",
    message: `جاري إعادة تشغيل جهاز ESP32 البشري (${dev.name})...`,
    source: "Admin"
  });

  // Reconnect in 4 seconds
  setTimeout(() => {
    const liveDev = devices.find(d => d.id === id);
    if (liveDev) {
      liveDev.status = "online";
      liveDev.dataTransmission = "active";
      liveDev.lastSeen = new Date().toISOString();
      liveDev.sensorValue = id === "office-main" ? 110 : liveDev.sensorValue || 120;
      liveDev.aqi = calculateAqi(liveDev.sensorValue);
      lastUpdatedTimeMap.set(id, Date.now());
      systemLogs.unshift({
        id: `log-restart-complete-${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: "info",
        message: `تمت إعادة إقلاع جهاز (${liveDev.name}) وعاد للخدمة والمزامنة التلقائية.`,
        source: "System"
      });
    }
  }, 4000);

  res.json({ success: true, message: "تم إرسال أمر إعادة التشغيل للجهاز بنجاح" });
});

app.post("/api/devices/:id/reconnect", (req, res) => {
  const { id } = req.params;
  const dev = devices.find(d => d.id === id);
  if (!dev) {
    return res.status(404).json({ error: "الجهاز غير موجود" });
  }

  dev.wifiSignal = "excellent";
  dev.wifiRssi = -38;
  
  systemLogs.unshift({
    id: `log-recon-${Date.now()}`,
    timestamp: new Date().toISOString(),
    level: "info",
    message: `تم إعادة تهيئة وتحسين اتصال Wi-Fi للجهاز (${dev.name}) بنجاح.`,
    source: "Admin"
  });

  res.json({ success: true, message: "تم إعادة توجيه الاتصال بالشبكة" });
});

// Update Simulated ESP32 via UI Controllers
app.post("/api/devices/update-sensor", (req, res) => {
  const { deviceId, sensorValue, status, wifiSignal, batteryLevel } = req.body;
  const dev = devices.find(d => d.id === deviceId);
  if (!dev) {
    return res.status(404).json({ error: "الجهاز غير موجود" });
  }

  if (status !== undefined) {
    dev.status = status;
    if (status === "offline") {
      dev.dataTransmission = "stopped";
    } else {
      dev.dataTransmission = "active";
      dev.lastSeen = new Date().toISOString();
      lastUpdatedTimeMap.set(deviceId, Date.now());
    }
  }

  if (sensorValue !== undefined && dev.status === "online") {
    dev.sensorValue = Number(sensorValue);
    dev.aqi = calculateAqi(Number(sensorValue));
    dev.lastSeen = new Date().toISOString();
    lastUpdatedTimeMap.set(deviceId, Date.now());
    
    // Auto trigger alert logic if thresholds crossed
    if (dev.sensorValue > 500) {
      // Danger Event
      const hasDanger = alerts.some(a => a.deviceId === dev.id && a.type === "air_quality" && a.severity === "danger" && !a.resolved);
      if (!hasDanger) {
        alerts.unshift({
          id: `alert-dang-${Date.now()}`,
          deviceId: dev.id,
          deviceName: dev.name,
          type: "air_quality",
          severity: "danger",
          value: dev.sensorValue,
          message: `تنبيه أحمر: جودة هواء خطيرة للغاية تم كشفها بواسطة ${dev.name}. نسبة التلوث تقتضي تهوية فورية للمكان!`,
          timestamp: new Date().toISOString(),
          resolved: false
        });
        systemLogs.unshift({
          id: `log-dang-${Date.now()}`,
          timestamp: new Date().toISOString(),
          level: "error",
          message: `خطورة عالية: تم تفعيل صفارة الإنذار لارتفاع قراءة ${dev.name} إلى ${dev.sensorValue} PPM.`,
          source: "System"
        });
      }
    } else if (dev.sensorValue > 200) {
      // Warning Event
      const hasWarning = alerts.some(a => a.deviceId === dev.id && a.type === "air_quality" && a.severity === "warning" && !a.resolved);
      if (!hasWarning) {
        alerts.unshift({
          id: `alert-warn-${Date.now()}`,
          deviceId: dev.id,
          deviceName: dev.name,
          type: "air_quality",
          severity: "warning",
          value: dev.sensorValue,
          message: `تحذير برتقالي: جودة الهواء في مستوى غير مستقر وصحي آخذ في الزيادة لـ ${dev.name}.`,
          timestamp: new Date().toISOString(),
          resolved: false
        });
        systemLogs.unshift({
          id: `log-warn-${Date.now()}`,
          timestamp: new Date().toISOString(),
          level: "warning",
          message: `تحذير: القراءة المتصاعدة في ${dev.name} بلغت ${dev.sensorValue} PPM.`,
          source: "System"
        });
      }
    }
  }

  if (wifiSignal !== undefined) {
    dev.wifiSignal = wifiSignal;
    if (wifiSignal === "none") {
      dev.wifiRssi = -100;
    } else if (wifiSignal === "weak") {
      dev.wifiRssi = -80;
    } else if (wifiSignal === "good") {
      dev.wifiRssi = -65;
    } else {
      dev.wifiRssi = -42;
    }
  }

  if (batteryLevel !== undefined) {
    dev.batteryLevel = Number(batteryLevel);
  }

  res.json({ success: true, device: dev });
});

// Create New ESP32 Device Endpoint
app.post("/api/devices/add", (req, res) => {
  const { name, location, roomName, macAddress, firmwareVersion } = req.body;
  if (!name || !location) {
    return res.status(400).json({ error: "اسم الجهاز والموقع مطلوبان" });
  }

  const id = `esp32-${Date.now().toString().slice(-6)}`;
  const newDevice: Device = {
    id,
    name,
    location,
    roomName: roomName || "غير محدد",
    status: "online",
    lastSeen: new Date().toISOString(),
    sensorValue: 120,
    aqi: calculateAqi(120),
    wifiSignal: "good",
    wifiRssi: -60,
    batteryLevel: 100,
    uptime: 100,
    firmwareVersion: firmwareVersion || "v1.0.0",
    macAddress: macAddress || "ESP32-MAC-" + Math.floor(Math.random() * 10000),
    sensorHealth: "healthy",
    dataTransmission: "active"
  };

  devices.push(newDevice);
  lastUpdatedTimeMap.set(id, Date.now());

  systemLogs.unshift({
    id: `log-add-${Date.now()}`,
    timestamp: new Date().toISOString(),
    level: "info",
    message: `جهاز ESP32 جديد تم ربطه بالنظام: [${name}] في موقع [${location}].`,
    source: "Admin"
  });

  res.json({ success: true, device: newDevice });
});

// Log Endpoints
app.get("/api/logs", (req, res) => {
  res.json(systemLogs);
});

// Alert Endpoints
app.get("/api/alerts", (req, res) => {
  res.json(alerts);
});

app.post("/api/alerts/clear", (req, res) => {
  alerts = [];
  res.json({ success: true });
});

app.post("/api/alerts/:id/resolve", (req, res) => {
  const { id } = req.params;
  const alert = alerts.find(a => a.id === id);
  if (alert) {
    alert.resolved = true;
    systemLogs.unshift({
      id: `log-resolve-${Date.now()}`,
      timestamp: new Date().toISOString(),
      level: "info",
      message: `تم وضع علامة 'تم الحل' على التنبيه: ${alert.message.slice(0, 40)}...`,
      source: "Admin"
    });
  }
  res.json({ success: true, alerts });
});

// Automation Rules Endpoints
app.get("/api/rules", (req, res) => {
  res.json(automationRules);
});

app.post("/api/rules", (req, res) => {
  const { name, field, operator, value, actionType, actionValue } = req.body;
  const rule: AutomationRule = {
    id: `rule-${Date.now()}`,
    name,
    field,
    operator,
    value: isNaN(Number(value)) ? value : Number(value),
    actionType,
    actionValue,
    active: true
  };
  automationRules.push(rule);
  res.json({ success: true, rule });
});

app.post("/api/rules/toggle", (req, res) => {
  const { id } = req.body;
  const rule = automationRules.find(r => r.id === id);
  if (rule) {
    rule.active = !rule.active;
  }
  res.json({ success: true, rules: automationRules });
});

// Detailed History for charts
app.get("/api/history", (req, res) => {
  const { deviceId, range } = req.query;
  const filterId = deviceId || "living-room";
  
  // Return simulated history based on range: last_hour, last_24h, last_7d, last_30d
  const devReadings = readingsHist.filter(r => r.deviceId === filterId);
  
  // Make sure we have enough readings by filling them in if too small
  let filteredReadings = [...devReadings];
  const maxCap = range === "last_hour" ? 20 : range === "last_24h" ? 24 : range === "last_7d" ? 7 : 30;
  
  if (filteredReadings.length === 0) {
    return res.json([]);
  }

  // Sample or return nicely chunked values to client to look highly professional
  res.json(filteredReadings.slice(-maxCap));
});

// GET statistics summary
app.get("/api/stats", (req, res) => {
  const { deviceId } = req.query;
  const idStr = deviceId ? String(deviceId) : "living-room";
  const devReadings = readingsHist.filter(r => r.deviceId === idStr && r.sensorValue > 0);
  
  if (devReadings.length === 0) {
    return res.json({
      highestValue: 145,
      lowestValue: 85,
      averageValue: 112,
      dangerCount: 0,
      warningCount: 1,
    });
  }

  const vals = devReadings.map(r => r.sensorValue);
  const highest = Math.max(...vals);
  const lowest = Math.min(...vals);
  const average = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  const danger = devReadings.filter(r => r.sensorValue > 500).length;
  const warning = devReadings.filter(r => r.sensorValue > 200 && r.sensorValue <= 500).length;

  res.json({
    highestValue: highest,
    lowestValue: lowest,
    averageValue: average,
    dangerCount: danger,
    warningCount: warning,
  });
});

// Post device health diagnostics
app.get("/api/device-health", (req, res) => {
  const data = devices.map(d => {
    let healthState: "healthy" | "warning" | "critical" = "healthy";
    if (d.status === "offline") {
      healthState = "critical";
    } else if (d.sensorValue > 500) {
      healthState = "warning";
    }
    return {
      deviceId: d.id,
      name: d.name,
      health: healthState,
      wifiRssi: d.wifiRssi,
      uptime: d.uptime,
      uptimeFormatted: `${Math.floor(d.uptime / 3600)} ساعة و ${Math.floor((d.uptime % 3600) / 60)} دقيقة`,
      sensorHealth: d.sensorHealth,
      transmission: d.dataTransmission,
      lastSeen: d.lastSeen
    };
  });
  res.json(data);
});

// EXTERNAL HARDWARE RECEIVE API - EXCELLENT FOR GENUINE INTEGRATION
// Any ESP32 hardware client can do an HTTP POST to this endpoint over local network/internet
app.post("/api/esp32/data", (req, res) => {
  const { device_id, sensor_value, wifi_status, battery, uptime } = req.body;
  
  if (!device_id || sensor_value === undefined) {
    return res.status(400).json({ error: "خطأ: المعطيات المطلوبة غير مكتملة. يرجى توفير device_id و sensor_value" });
  }

  let dev = devices.find(d => d.id === device_id);
  let isNew = false;
  
  if (!dev) {
    // Dynamically spawn new device upon real HW connection
    isNew = true;
    dev = {
      id: device_id,
      name: `ESP32_${device_id.slice(-4)}`,
      location: "موقع جديد تلقائي",
      roomName: "ساحة مضافة",
      status: "online",
      lastSeen: new Date().toISOString(),
      sensorValue: Number(sensor_value),
      aqi: calculateAqi(Number(sensor_value)),
      wifiSignal: wifi_status || "good",
      wifiRssi: -62,
      batteryLevel: battery !== undefined ? Number(battery) : 100,
      uptime: uptime !== undefined ? Number(uptime) : 0,
      firmwareVersion: "v1.2.0-esp32-hw",
      macAddress: "FF:EE:DD:CC:BB:AA",
      sensorHealth: "healthy",
      dataTransmission: "active"
    };
    devices.push(dev);
  } else {
    // Update existing
    dev.status = "online";
    dev.sensorValue = Number(sensor_value);
    dev.aqi = calculateAqi(Number(sensor_value));
    dev.lastSeen = new Date().toISOString();
    if (wifi_status) dev.wifiSignal = wifi_status as any;
    if (battery !== undefined) dev.batteryLevel = Number(battery);
    if (uptime !== undefined) dev.uptime = Number(uptime);
    dev.dataTransmission = "active";
  }

  lastUpdatedTimeMap.set(device_id, Date.now());

  // Record history
  readingsHist.push({
    id: `${device_id}-${Date.now()}`,
    deviceId: device_id,
    sensorValue: dev.sensorValue,
    aqi: dev.aqi,
    airStatus: dev.sensorValue > 500 ? "danger" : dev.sensorValue > 200 ? "warning" : "safe",
    timestamp: new Date().toISOString(),
    wifiStatus: dev.wifiSignal,
    deviceStatus: "online"
  });

  // Keep records trimmed
  if (readingsHist.length > 1000) readingsHist.shift();

  // Rules triggering
  let actionTriggered = "";
  if (dev.aqi > 200) {
    const hasDanger = alerts.some(a => a.deviceId === dev!.id && a.type === "air_quality" && a.severity === "danger" && !a.resolved);
    if (!hasDanger) {
      alerts.unshift({
        id: `alert-dang-${Date.now()}`,
        deviceId: dev.id,
        deviceName: dev.name,
        type: "air_quality",
        severity: "danger",
        value: dev.sensorValue,
        message: `تنبيه أحمر عاجل: تسريب غيار أو غاز خطير تم كشفه بـ ${dev.name} داخل المنزل! يرجى تهوية المكان، القيمة: ${dev.sensorValue} PPM.`,
        timestamp: new Date().toISOString(),
        resolved: false
      });
      actionTriggered = "Emergency Siren Action Activated!";
    }
  }

  // Diagnostic log
  systemLogs.unshift({
    id: `log-hw-${Date.now()}`,
    timestamp: new Date().toISOString(),
    level: "info",
    message: `${isNew ? "تم ربط جهاز مادي جديد: " : "قراءة قادمة من ESP32 مادي: "} (${dev.name}) قيمة القراءة: ${sensor_value} (${getAqiCategory(dev.aqi).nameAr})`,
    source: "ESP32"
  });

  res.json({ 
    success: true, 
    deviceId: device_id, 
    air_status: dev.sensorValue > 500 ? "dangerous" : dev.sensorValue > 200 ? "warning" : "safe",
    aqi: dev.aqi,
    timestamp: dev.lastSeen,
    action: actionTriggered || "Logged successfully"
  });
});

// GEMINI AI - ADVANCED HEALTH RECOMMENDATION REPORT WRITER
app.post("/api/reports/ai-gen", async (req, res) => {
  const { deviceId } = req.body;
  const dev = devices.find(d => d.id === deviceId);
  
  if (!dev) {
    return res.status(404).json({ error: "الجهاز غير موجود لتحليل البيانات" });
  }

  // Gather stats for the prompt
  const devReadings = readingsHist.filter(r => r.deviceId === deviceId && r.sensorValue > 0);
  const avg = devReadings.length > 0 ? Math.round(devReadings.reduce((a, b) => a + b.sensorValue, 0) / devReadings.length) : dev.sensorValue;
  const aqiCategory = getAqiCategory(dev.aqi);

  if (!ai) {
    // Deliver beautiful, informative fallback Arabic report when API key is not configured yet
    const fallbackReport = `## 📊 تقرير تشخيص جودة الهواء الذكي (نمط المحاكاة الفورية)
### جهاز المراقبة: ${dev.name} [${dev.roomName}]
**تاريخ التحليل:** 2026-06-01  
**حالة الاتصال للوحدة:** ${dev.status === "online" ? "متصل بالإنترنت ✅" : "خارج التغطية ⚠️"}

---

### 🔍 تفاصيل الحالة الراهنة لجودة الهواء:
*   **القيمة اللحظية للمستشعر (MQ135):** ${dev.sensorValue} PPM
*   **مؤشر جودة الهواء المحسوب (AQI):** ${dev.aqi} (${aqiCategory.nameAr})
*   **سلامة المستشعر العادية:** ${dev.sensorHealth === "healthy" ? "سليم ومعاير بنشاط" : "يحتاج لمعايرة سريعة"}

---

### 🛡️ التوصيات الصيدلانية والصحية الموصى بها:
1.  **حالة التهوية:** ${aqiCategory.id === "excellent" || aqiCategory.id === "good" ? "التهوية ممتازة والظروف آمنة تماماً ولا تتطلب إجراءات إضافية." : "يُنصح بفتح النوافذ فوراً وتشغيل عادم الهواء لتهوية الغرفة والحد من تزايد الغازات المركبة."}
2.  **الأشخاص ذوو الحساسية:** ${aqiCategory.id === "moderate" || aqiCategory.id === "unhealthy" ? "يجب على المصابين بحساسية الغبار والربو الحد من التعرض والجلوس في غرف مجهزة بفلاتر كربونية." : "لا توجد مخاطر صحية تذكر لمختلف الفئات العمرية في هذه الظروف."}
3.  **إرشادات الصيانة للجهاز (ESP32):** تأكد من نظافة غطاء شبكة المستشعر المعدنية من أي رطوبة أو شوارد تؤثر على توازن الشمعة البلاتينية للمستشعر الداخلي MQ135.

---
*هذا التقرير تم تجميعه تلقائياً بواسطة وحدة الذكاء الاصطناعي المساندة لـ **المنقذ الذكي**.*`;
    return res.json({ report: fallbackReport, isMockDemo: true });
  }

  try {
    const prompt = `أنت خبير كيميائي واستشاري بيئي تقود نظام الرعاية الصحية الذكي "المنقذ الذكي".
قم بكتابة تقرير تحليلي طبي وبيئي احترافي باللغة العربية وجهاً لوجه بالاعتماد على بيانات تلوّ المراقبة التالية لجهاز استشعار ESP32:

معلومات المستشعر:
- الاسم: ${dev.name}
- الموقع: ${dev.location} - ${dev.roomName}
- القيمة الحالية للمستشعر (MQ135): ${dev.sensorValue} PPM
- مؤشر جودة الهواء (AQI): ${dev.aqi}
- التصنيف البيئي الحالي: ${aqiCategory.nameAr}
- سلامة الشريحة: ${dev.sensorHealth}
- متوسط القراءة التقريبي: ${avg} PPM

التقرير يجب أن يتضمن:
1. مقدمة علمية أنيقة حول نتائج المراقبة للمستشعرات.
2. تحليل معمق لمؤشر جودة الهواء (AQI) ذي القيمة الحالية ومستوى خطورة المواد العضوية المتطايرة (VOCs) أو أول أكسيد الكربون التي يكتشفها MQ135.
3. التوصيات الصحية والخطوات الواجب اتخاذها في هذا التصنيف بشكل مباشر وقابل للتطبيق فوراً.
4. جدول نصي للمقارنة والنصائح.
5. خاتمة وتوقيع إداري لنظام المنقذ الذكي.
اكتب بلغة عربية فصحى احترافية للغاية ممثلة لعلامة تجارية كبرى لإنترنت الأشياء (IoT) المنزلية الذكية. لا تستخدم لغة مطولّة بل نظّم التقرير بعناوين فرعية جذابة واستخدم علامات Markdown للتنسيق والخط العريض لتسهيل القراءة.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ report: response.text, isMockDemo: false });
  } catch (error) {
    console.error("Gemini AI Report Error:", error);
    res.status(500).json({ error: "فشل إنشاء تقرير الذكاء الاصطناعي بسبب مشاكل بالاتصال بالنموذج." });
  }
});

// Serve frontend build static files in production
const distPath = path.join(process.cwd(), 'dist');
if (process.env.NODE_ENV === "production") {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // Setup Vite middleware for development
  const startDevServer = async () => {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  };
  startDevServer();
}

// Background Firebase Realtime Database Listener for real-time ESP32 device integration
const fbConfig = {
  apiKey: "AIzaSyDo09di_vPt-rRSYbg9K_cV-mND0dZ6Sd0",
  databaseURL: "https://smartsaver-7d551-default-rtdb.firebaseio.com/",
  authDomain: "smartsaver-7d551.firebaseapp.com",
  projectId: "smartsaver-7d551",
};

const fbAuthCreds = {
  email: "esp32@smartsaver.com",
  password: "12345678",
};

function startFirebaseBackgroundListener() {
  try {
    const app = initFirebase(fbConfig);
    const auth = getFirebaseAuth(app);
    const db = getFirebaseDb(app);

    signInFirebase(auth, fbAuthCreds.email, fbAuthCreds.password)
      .then((userCred) => {
        console.log("Backend signed in successfully to ESP32 Firebase RTDB.");
        
        systemLogs.unshift({
          id: `sys-rfb-init-${Date.now()}`,
          timestamp: new Date().toISOString(),
          level: "info",
          message: "تم ربط الخادم بنجاح بقاعدة بيانات Firebase ومزامنة حساس الغاز (ESP32) في الوقت الفعلي.",
          source: "System"
        });

        const sensorRef = refFirebase(db, "home/gas_sensor");
        onValueFirebase(
          sensorRef,
          (snapshot) => {
            const val = snapshot.val();
            if (val) {
              const level = typeof val.level === "number" ? val.level : 0;
              const status = val.status || "safe"; // can be safe, warning, danger
              const lastUpdate = typeof val.last_update === "number" ? val.last_update : Math.floor(Date.now() / 1000);

              // Update devices array for 'firebase-gas-sensor'
              const sensorDev = devices.find(d => d.id === "firebase-gas-sensor");
              if (sensorDev) {
                // Since we are actively receiving bytes, the device is online
                sensorDev.status = "online";
                // Convert percentage back to 10-bit raw range (0 - 1023)
                const rawVal = Math.round((level / 100) * 1023);
                sensorDev.sensorValue = rawVal;
                sensorDev.aqi = calculateAqi(rawVal);
                sensorDev.lastSeen = new Date().toISOString(); // use fresh web server timestamp for precision
                sensorDev.uptime = Math.max(0, Math.floor(lastUpdate / 1000)); // C++ posts millis()
                sensorDev.dataTransmission = "active";
                
                const airStatus: AirStatus = level > 50.0 ? "danger" : (level >= 6.0 ? "warning" : "safe");

                // Add readings back into historic data
                readingsHist.push({
                  id: `firebase-${Date.now()}`,
                  deviceId: "firebase-gas-sensor",
                  sensorValue: rawVal,
                  aqi: sensorDev.aqi,
                  airStatus,
                  timestamp: new Date().toISOString(),
                  wifiStatus: sensorDev.wifiSignal,
                  deviceStatus: "online"
                });
                if (readingsHist.length > 1000) readingsHist.shift();

                // Raise alarms if in warning or danger levels based on new ESP32 threshold rules!
                if (level > 50.0) {
                  const alreadyHasDanger = alerts.some(a => a.deviceId === "firebase-gas-sensor" && a.severity === "danger" && !a.resolved);
                  if (!alreadyHasDanger) {
                    alerts.unshift({
                      id: `alert-firebase-dang-${Date.now()}`,
                      deviceId: "firebase-gas-sensor",
                      deviceName: sensorDev.name,
                      type: "air_quality",
                      severity: "danger",
                      value: rawVal,
                      message: `تنبيه أحمر عاجل خطير جداً🚨 (أعلى من 50%): تم كشف تسريب غاز مرتفع بـ ${sensorDev.name} في المنزل! القيمة الحالية لقراءة الغاز: ${level.toFixed(1)}% - يرجى تهوية الغرف فوراً!`,
                      timestamp: new Date().toISOString(),
                      resolved: false
                    });
                  }
                } else if (level >= 6.0) {
                  const alreadyHasWarning = alerts.some(a => a.deviceId === "firebase-gas-sensor" && a.severity === "warning" && !a.resolved);
                  if (!alreadyHasWarning) {
                    alerts.unshift({
                      id: `alert-firebase-warn-${Date.now()}`,
                      deviceId: "firebase-gas-sensor",
                      deviceName: sensorDev.name,
                      type: "air_quality",
                      severity: "warning",
                      value: rawVal,
                      message: `تنبيه برتقالي تحذيري⚠️ (أعلى من 6.0%): تم كشف ارتفاع طفيف في قراءة الغاز بجهاز ${sensorDev.name}. القيمة الحالية: ${level.toFixed(1)}% - يرجى المراقبة المستمرة.`,
                      timestamp: new Date().toISOString(),
                      resolved: false
                    });
                  }
                }
              }
            }
          },
          (err) => {
            console.error("Firebase value listen error in backend:", err);
          }
        );
      })
      .catch((err) => {
        console.warn("Could not sign in to Firebase in backend (possibly missing credentials or locked RTDB):", err.message);
      });
  } catch (err: any) {
    console.warn("Firebase initialization skipped in backend:", err.message);
  }
}

startFirebaseBackgroundListener();

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Air Guard Server is listening on port ${PORT}`);
});
